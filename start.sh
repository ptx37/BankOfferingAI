#!/bin/bash
# BankOffer AI — One-Command Startup Script
# Usage: bash start.sh <ANTHROPIC_API_KEY>

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  BankOffer AI — Docker Startup                               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if API key provided
if [ -z "$1" ]; then
    echo "❌ ERROR: ANTHROPIC_API_KEY not provided"
    echo ""
    echo "Usage:"
    echo "  bash start.sh sk-your-api-key-here"
    echo ""
    echo "Example:"
    echo "  bash start.sh sk-proj-1234567890abcdef"
    echo ""
    exit 1
fi

API_KEY="$1"

# Verify API key format
if [[ ! "$API_KEY" =~ ^sk- ]]; then
    echo "⚠️  WARNING: API key should start with 'sk-'"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "🔧 Setting up BankOffer AI..."
echo ""

# Step 1: Copy environment file
echo "→ Creating .env file..."
cp .env.local .env
echo "✓ Created .env"

# Step 2: Set API key
echo "→ Setting ANTHROPIC_API_KEY..."
sed -i "s|ANTHROPIC_API_KEY=sk-your-key-here|ANTHROPIC_API_KEY=$API_KEY|" .env
echo "✓ API key configured"

# Step 3: Start services
echo ""
echo "🚀 Starting services..."
docker-compose down 2>/dev/null || true
docker-compose up -d

# Step 4: Wait for services
echo ""
echo "⏳ Waiting for services to start (60 seconds)..."
sleep 60

# Step 5: Check status
echo ""
echo "📋 Service Status:"
docker-compose ps

# Step 6: Verify API
echo ""
echo "🧪 Testing API..."
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo "✓ API is healthy"
else
    echo "⚠️  API not responding yet, may still be starting..."
fi

# Step 7: Display access info
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ SETUP COMPLETE                                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📱 Access from Windows Browser:"
echo "   Frontend:    http://172.24.208.80:3000"
echo "   API Docs:    http://172.24.208.80:8000/docs"
echo "   pgAdmin:     http://172.24.208.80:5050"
echo "   Grafana:     http://172.24.208.80:3001"
echo ""
echo "📊 Database Credentials:"
echo "   PostgreSQL:  localhost:5432 (postgres / postgres)"
echo "   Redis:       localhost:6379 (password: redis123)"
echo ""
echo "🔧 Useful Commands:"
echo "   docker-compose ps              Show running services"
echo "   docker-compose logs -f api     View API logs"
echo "   docker-compose stop            Stop services"
echo "   docker-compose down -v         Reset everything"
echo ""
echo "📚 Documentation:"
echo "   See: FIX_WSL_WINDOWS_ACCESS.md"
echo "   See: WSL_SETUP_GUIDE.md"
echo ""
