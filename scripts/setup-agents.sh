#!/bin/bash
# Setup script for BankOffer AI multi-agent system

set -e

echo "=========================================="
echo "BankOffer AI — Agent System Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "→ Checking prerequisites..."

if ! command -v git &> /dev/null; then
    echo -e "${RED}✗ git not found${NC}"
    exit 1
fi

if ! command -v gh &> /dev/null; then
    echo -e "${RED}✗ GitHub CLI (gh) not found${NC}"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ python3 not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites met${NC}"
echo ""

# Setup git config for GitHub Actions bot
echo "→ Configuring git for agent operations..."
git config user.name "github-actions[bot]" || true
git config user.email "github-actions[bot]@users.noreply.github.com" || true
echo -e "${GREEN}✓ Git configured${NC}"
echo ""

# Install Python dependencies
echo "→ Installing Python dependencies..."
python3 -m pip install pyyaml -q
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Verify audit.yaml exists
echo "→ Verifying audit.yaml..."
if [ ! -f "audit.yaml" ]; then
    echo -e "${RED}✗ audit.yaml not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ audit.yaml found${NC}"
echo ""

# Verify GitHub workflows
echo "→ Verifying GitHub workflows..."
WORKFLOW_DIR=".github/workflows"
REQUIRED_WORKFLOWS=(
    "ci.yaml"
    "agent-infra.yaml"
    "agent-data.yaml"
    "agent-aiml.yaml"
    "agent-api.yaml"
    "agent-notifications.yaml"
    "agent-gitops-sub.yaml"
    "agent-security-sub.yaml"
    "agent-observability-sub.yaml"
    "agent-testqa-sub.yaml"
)

MISSING_WORKFLOWS=()
for workflow in "${REQUIRED_WORKFLOWS[@]}"; do
    if [ ! -f "$WORKFLOW_DIR/$workflow" ]; then
        MISSING_WORKFLOWS+=("$workflow")
    fi
done

if [ ${#MISSING_WORKFLOWS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠ Missing workflows:${NC}"
    for workflow in "${MISSING_WORKFLOWS[@]}"; do
        echo "  - $workflow"
    done
    echo ""
fi

echo -e "${GREEN}✓ Workflow verification complete${NC}"
echo ""

# Make scripts executable
echo "→ Making scripts executable..."
chmod +x scripts/*.py scripts/*.sh || true
echo -e "${GREEN}✓ Scripts ready${NC}"
echo ""

# Summary
echo "=========================================="
echo "Setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Ensure ANTHROPIC_API_KEY is set:"
echo "     export ANTHROPIC_API_KEY=sk-..."
echo ""
echo "  2. Start orchestration:"
echo "     python3 scripts/orchestrator.py"
echo ""
echo "  3. Monitor PRs and audit.yaml for agent progress"
echo ""
