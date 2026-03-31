# BankOffer AI

> **BETA_RC_1.0.0** — Real-time, AI-powered financial product personalization platform.  
> Bank agents use the **Customer Offer Center** to view customer spending patterns and send personalized product recommendations.

---

## Quick Start

Get the full stack running in under 5 minutes.

### Prerequisites

| Tool | Minimum version | Check |
|------|----------------|-------|
| Docker | 24+ | `docker --version` |
| Docker Compose | 1.29+ or v2 | `docker-compose --version` |
| Git | any | `git --version` |

> **Windows users:** run everything inside WSL 2. Docker Desktop with WSL backend works out of the box.

### 1. Clone

```bash
git clone https://github.com/ptx37/BankOfferingAI.git
cd BankOfferingAI
```

### 2. Configure environment

```bash
cp .env.example .env
# Optional: add your ANTHROPIC_API_KEY to .env for AI-powered scoring.
# Without it the worker falls back to rule-based scoring automatically.
```

### 3. Deploy

```bash
chmod +x .github/scripts/deploy-local.sh
./.github/scripts/deploy-local.sh
```

The script builds all images (context = repo root), starts infra, waits for health checks, deploys app services with correct network aliases, and seeds demo data.

### 4. Open the app

| Service | URL | Credentials |
|---------|-----|-------------|
| **Customer Offer Center** | http://localhost:3000 | Agent ID: `demo-001` |
| API docs (Swagger) | http://localhost:8000/docs | — |
| Worker health | http://localhost:8001/health | — |
| Grafana | http://localhost:3001 | admin / admin123 |
| pgAdmin | http://localhost:5050 | admin@example.com / admin123 |
| Redis Commander | http://localhost:8081 | — |

> **WSL / Windows access:** use the WSL IP instead of `localhost`.  
> Find it with: `ip addr show eth0 | grep 'inet '`

---

## GitOps with Self-Hosted Runner

Every push to `main` triggers an automatic re-deploy on your local machine via GitHub Actions.

### Install the runner (one-time)

1. Go to your GitHub repo → **Settings → Actions → Runners → New self-hosted runner**
2. Follow the Linux/Windows instructions to download and configure the runner
3. Start it: `./run.sh` (or install as a service with `./svc.sh install && ./svc.sh start`)

Once running, every `git push origin main` will:
- Build all Docker images with the correct repo-root build context
- Stop old app containers
- Start new containers with proper network aliases (`api`, `worker`, `frontend`)
- Seed demo data into Redis
- Post a deployment summary to the Actions tab

### Required runner secrets

Set these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic key (optional — fallback works without it) |
| `POSTGRES_PASSWORD` | Override default `postgres` |
| `REDIS_PASSWORD` | Override default `redis123` |

### Custom runner Docker image

A reproducible runner image is defined in `.github/runner-image/Dockerfile`.  
It includes Docker CLI, Python 3.11, Node.js 20, Helm, and Terraform.

Build and push it via:
```bash
# Trigger manually or push a change to .github/runner-image/
# GitHub Actions → build-runner-image workflow
```

Use it in CI jobs:
```yaml
jobs:
  my-job:
    runs-on: self-hosted
    container:
      image: ghcr.io/ptx37/bankofferingai/runner:latest
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser / Agent UI  (Next.js · port 3000)                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │ /api/* proxy
┌───────────────────────────▼─────────────────────────────────────┐
│  Offer API  (FastAPI · port 8000)                                │
│  POST /auth/token   GET /offers/{customer_id}   POST /webhooks  │
└──────┬──────────────────────────┬───────────────────────────────┘
       │ score-and-rank            │ events
┌──────▼──────────┐    ┌──────────▼──────────────┐
│ Worker / Scorer  │    │ Kafka · Zookeeper        │
│ (FastAPI · 8001) │    │ (topic: bank.transactions│
│ Rule-based + LLM │    └──────────┬───────────────┘
└──────────────────┘               │
                         ┌─────────▼──────────┐
                         │ Notification Service│
                         └────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│  Data Layer                                                     │
│  PostgreSQL 16 (port 5432)  ·  Redis 7 (port 6379)            │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│  Observability                                                  │
│  Prometheus (9090)  ·  Grafana (3001)                          │
└────────────────────────────────────────────────────────────────┘
```

### Request flow

1. **Agent opens app** → frontend (Next.js) proxies `/api/*` to the FastAPI offer service
2. **Login** → `POST /auth/token?customer_id=demo-001` returns a 24-hour JWT
3. **Dashboard** → `GET /offers/{customer_id}` fetches the customer profile from Redis, calls the worker to score products, returns top-5 ranked offers
4. **Worker scores** → builds a profile signal vector, calls Claude claude-sonnet-4-20250514 (or falls back to rule-based scoring), ranks offers by relevance
5. **Agent sends offer** → "Send" button on offer card (notification routing in progress)

---

## Repository Structure

```
/
├── services/
│   ├── api/              # FastAPI offer service (port 8000)
│   ├── worker/           # Scoring + ranking service (port 8001)
│   └── notification/     # Push / email / in-app router
├── frontend/             # Next.js agent dashboard (port 3000)
├── data/                 # Airflow DAGs, dbt models, Kafka schemas
├── ml/                   # Customer profiler, product scorer, ranker
├── infra/                # Terraform, Helm charts, ArgoCD apps
├── gitops/               # ArgoCD Application CRDs, Kustomize overlays
├── observability/        # Prometheus rules, Grafana dashboards
├── security/             # OPA policies, SBOM, secret rotation
├── tests/                # Unit, integration, e2e, load, contract
├── docs/                 # Architecture docs, runbooks, ADRs
├── .github/
│   ├── runner-image/     # Dockerfile for the CI/CD runner image
│   ├── scripts/          # deploy-local.sh and other automation
│   └── workflows/        # GitHub Actions pipelines
├── docker-compose.yml
├── .env.example
└── CHANGELOG.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Python 3.11+, TypeScript |
| API | FastAPI + Uvicorn |
| ML / AI | scikit-learn, XGBoost, Anthropic Claude |
| Data Pipeline | Apache Kafka, Airflow, dbt |
| Feature Store | Feast (Redis + PostgreSQL) |
| Database | PostgreSQL 16, Redis 7 |
| Infrastructure | Terraform, Helm, Kubernetes (EKS) |
| GitOps | ArgoCD, Kustomize, GitHub Actions |
| Observability | Prometheus, Grafana |
| Security | OPA/Gatekeeper, Trivy, Gitleaks |
| Frontend | Next.js 14 / React 18 |

---

## Development

### Run a single service

```bash
# API only (with hot reload)
uvicorn services.api.main:app --reload --port 8000

# Worker only
uvicorn services.worker.main:app --reload --port 8001
```

### Build images manually

```bash
# Always use repo root as the build context
docker build -f services/api/Dockerfile          -t bankoffer-api:dev     .
docker build -f services/worker/Dockerfile       -t bankoffer-worker:dev  .
docker build -f services/notification/Dockerfile -t bankoffer-notify:dev  .
docker build -f frontend/Dockerfile              -t bankoffer-frontend:dev .
```

### Seed demo data

If you restart containers and Redis data is lost:

```bash
docker exec bankoffer-redis redis-cli -a redis123 SET "profile:demo-001" \
  '{"customer_id":"demo-001","age":35,"city":"New York","income":85000,"savings":24000,"debt":12000,"risk_profile":"moderate","marital_status":"married","dependents_count":2,"homeowner_status":"mortgage","existing_products":["checking","savings"],"life_stage":"mid_career","financial_health":"good","lifestyle_segment":"family_focused","investor_readiness":0.65,"risk_bucket":"moderate","context_signals":["idle_cash_high","investment_gap","monthly_savings_consistent","family_context","high_income"],"family_context":{}}' \
  EX 86400
```

### Stop everything

```bash
docker rm -f bankoffer-api bankoffer-worker bankoffer-notification bankoffer-frontend
docker-compose down
```

---

## Pipelines

| Workflow | Trigger | Runner | Purpose |
|----------|---------|--------|---------|
| `ci.yaml` | push / PR | `ubuntu-latest` | Lint, test, Docker build validation, secret scan |
| `local-deploy.yaml` | push to `main`, tags | `self-hosted` | Full stack build + deploy on local machine |
| `build-runner-image.yaml` | changes to `.github/runner-image/` | `ubuntu-latest` | Build and push CI runner Docker image to GHCR |
| `cd-staging.yaml` | push to `main` | `ubuntu-latest` | ArgoCD sync to staging (requires `ARGOCD_ENABLED=true`) |
| `cd-prod.yaml` | tag `v*` | `ubuntu-latest` | ArgoCD sync to production |

---

## Known Limitations (BETA_RC_1.0.0)

- The `customer_profiles` PostgreSQL table schema does not match the `CustomerProfile` model. Profiles are served from Redis in demo mode. A migration is planned for RC_1.1.0.
- `docker-compose` v1.29.2 cannot recreate containers after image updates (`ContainerConfig` bug). The deploy script uses `docker run` directly as a workaround.
- The notification service restarts on startup (missing Kafka topic). Offer API and frontend are unaffected.
- Anthropic API calls require a funded key. The worker automatically falls back to rule-based scoring when the API is unavailable.

---

## License

Internal use only — Accesa / BankOffer AI project.
