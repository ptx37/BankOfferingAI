#!/usr/bin/env bash
# deploy-local.sh — full local stack deploy
#
# Called by .github/workflows/local-deploy.yaml on the self-hosted runner.
# Works around docker-compose v1.29.2 ContainerConfig bug by using `docker run`
# directly for application services. Infrastructure services (postgres, redis,
# kafka, zookeeper) are managed via docker-compose.
#
# Usage: ./deploy-local.sh [--skip-build] [--skip-seed]

set -euo pipefail

SKIP_BUILD=${SKIP_BUILD:-false}
SKIP_SEED=${SKIP_SEED:-false}
NETWORK="bankofferingai_bankoffer-network"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
REDIS_PASSWORD="${REDIS_PASSWORD:-redis123}"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-sk-test}"
LOG_LEVEL="${LOG_LEVEL:-info}"

log() { echo "[deploy] $*"; }

# ── Parse args ────────────────────────────────────────────────────────────────
for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --skip-seed)  SKIP_SEED=true  ;;
  esac
done

# ── 1. Ensure .env exists ─────────────────────────────────────────────────────
if [ ! -f .env ]; then
  log "No .env found — copying from .env.example"
  cp .env.example .env
fi

# ── 2. Build Docker images ────────────────────────────────────────────────────
if [ "$SKIP_BUILD" = false ]; then
  log "Building Docker images (context: repo root)..."
  docker build -t bankofferingai_api:latest          -f services/api/Dockerfile          .
  docker build -t bankofferingai_worker:latest       -f services/worker/Dockerfile       .
  docker build -t bankofferingai_notification:latest -f services/notification/Dockerfile .
  docker build -t bankofferingai_frontend:latest     -f frontend/Dockerfile              .
  log "All images built."
fi

# ── 3. Start infrastructure services ─────────────────────────────────────────
log "Starting infrastructure services (postgres, redis, zookeeper, kafka)..."
docker-compose up -d postgres redis zookeeper kafka

# ── 4. Wait for postgres and redis to be healthy ──────────────────────────────
log "Waiting for postgres and redis to be healthy..."
for i in $(seq 1 36); do
  pg=$(docker inspect --format='{{.State.Health.Status}}' bankoffer-postgres 2>/dev/null || echo "missing")
  rd=$(docker inspect --format='{{.State.Health.Status}}' bankoffer-redis    2>/dev/null || echo "missing")
  if [ "$pg" = "healthy" ] && [ "$rd" = "healthy" ]; then
    log "Infrastructure healthy."
    break
  fi
  if [ "$i" -eq 36 ]; then
    log "ERROR: Infrastructure did not become healthy after 3 minutes."
    exit 1
  fi
  sleep 5
done

# ── 5. Ensure Docker network exists ──────────────────────────────────────────
if ! docker network inspect "$NETWORK" &>/dev/null; then
  log "Creating network $NETWORK..."
  docker network create "$NETWORK"
fi

# ── 6. Remove old app containers ─────────────────────────────────────────────
log "Removing old application containers..."
docker rm -f bankoffer-api bankoffer-worker bankoffer-notification bankoffer-frontend 2>/dev/null || true

# ── 7. Start API ──────────────────────────────────────────────────────────────
log "Starting bankoffer-api..."
docker run -d \
  --name bankoffer-api \
  --hostname api \
  --network "$NETWORK" \
  --network-alias api \
  -p 0.0.0.0:8000:8000 \
  -e DATABASE_URL="postgresql+asyncpg://postgres:${POSTGRES_PASSWORD}@postgres:5432/bankofferingai" \
  -e REDIS_URL="redis://:${REDIS_PASSWORD}@redis:6379/0" \
  -e KAFKA_BROKER="kafka:9092" \
  -e ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}" \
  -e LOG_LEVEL="${LOG_LEVEL}" \
  --restart unless-stopped \
  bankofferingai_api:latest

# ── 8. Start Worker ───────────────────────────────────────────────────────────
log "Starting bankoffer-worker..."
docker run -d \
  --name bankoffer-worker \
  --hostname worker \
  --network "$NETWORK" \
  --network-alias worker \
  -p 0.0.0.0:8001:8001 \
  -e DATABASE_URL="postgresql+asyncpg://postgres:${POSTGRES_PASSWORD}@postgres:5432/bankofferingai" \
  -e REDIS_URL="redis://:${REDIS_PASSWORD}@redis:6379/0" \
  -e KAFKA_BROKER="kafka:9092" \
  -e ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}" \
  -e LOG_LEVEL="${LOG_LEVEL}" \
  --restart unless-stopped \
  bankofferingai_worker:latest \
  uvicorn services.worker.main:app --host 0.0.0.0 --port 8001

# ── 9. Start Notification service ─────────────────────────────────────────────
log "Starting bankoffer-notification..."
docker run -d \
  --name bankoffer-notification \
  --hostname notification \
  --network "$NETWORK" \
  --network-alias notification \
  -e DATABASE_URL="postgresql+asyncpg://postgres:${POSTGRES_PASSWORD}@postgres:5432/bankofferingai" \
  -e REDIS_URL="redis://:${REDIS_PASSWORD}@redis:6379/0" \
  -e KAFKA_BROKER="kafka:9092" \
  -e LOG_LEVEL="${LOG_LEVEL}" \
  --restart unless-stopped \
  bankofferingai_notification:latest

# ── 10. Start Frontend ────────────────────────────────────────────────────────
log "Starting bankoffer-frontend..."
docker run -d \
  --name bankoffer-frontend \
  --hostname frontend \
  --network "$NETWORK" \
  --network-alias frontend \
  -p 0.0.0.0:3000:3000 \
  -e API_URL="http://api:8000" \
  -e NEXT_PUBLIC_API_URL="http://api:8000" \
  --restart unless-stopped \
  bankofferingai_frontend:latest

# ── 11. Start Observability (docker-compose) ──────────────────────────────────
log "Starting prometheus and grafana..."
docker-compose up -d prometheus grafana 2>/dev/null || true

# ── 12. Seed demo data into Redis ─────────────────────────────────────────────
if [ "$SKIP_SEED" = false ]; then
  log "Waiting for API to be ready..."
  for i in $(seq 1 24); do
    if docker exec bankoffer-api python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" &>/dev/null; then
      break
    fi
    sleep 5
  done

  log "Seeding demo customer profiles into Redis..."
  docker exec bankoffer-redis redis-cli -a "${REDIS_PASSWORD}" SET "profile:demo-001" \
    '{"customer_id":"demo-001","age":35,"city":"New York","income":85000,"savings":24000,"debt":12000,"risk_profile":"moderate","marital_status":"married","dependents_count":2,"homeowner_status":"mortgage","existing_products":["checking","savings"],"life_stage":"mid_career","financial_health":"good","lifestyle_segment":"family_focused","investor_readiness":0.65,"risk_bucket":"moderate","context_signals":["idle_cash_high","investment_gap","monthly_savings_consistent","family_context","high_income"],"family_context":{}}' \
    EX 86400 2>/dev/null
  log "Demo data seeded."
fi

# ── 13. Final health check ────────────────────────────────────────────────────
log "Running health checks..."
sleep 5

API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null || echo "000")
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")

if [ "$API_STATUS" = "200" ]; then
  log "✓ API is healthy (http://localhost:8000)"
else
  log "✗ API health check failed (HTTP $API_STATUS)"
fi

if [ "$FRONTEND_STATUS" = "200" ]; then
  log "✓ Frontend is healthy (http://localhost:3000)"
else
  log "✗ Frontend health check failed (HTTP $FRONTEND_STATUS)"
fi

echo ""
echo "─────────────────────────────────────────────"
echo " BankOffer AI — Deployment Complete"
echo "─────────────────────────────────────────────"
echo " App:        http://localhost:3000"
echo " API:        http://localhost:8000/docs"
echo " Grafana:    http://localhost:3001  (admin / admin123)"
echo " pgAdmin:    http://localhost:5050  (admin@example.com / admin123)"
echo "─────────────────────────────────────────────"
