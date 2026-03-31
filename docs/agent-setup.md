# BankOffer AI — Multi-Agent System Setup & Operation

This document describes how to initialize, manage, and monitor the multi-agent CI/CD system for BankOffer AI.

## Architecture Overview

The system consists of a **depth-2 agent hierarchy**:

```
Orchestrator (Depth 0)
├── Infra Agent (Depth 1)
│   ├── GitOps Subagent (Depth 2)
│   └── Observability Subagent (Depth 2)
├── Data Pipeline Agent (Depth 1)
├── AI/ML Agent (Depth 1)
├── API Agent (Depth 1)
│   ├── Security Subagent (Depth 2)
│   └── Test/QA Subagent (Depth 2)
└── Notification Agent (Depth 1)
```

- **Depth 0 (Orchestrator)**: Main coordinator. Owns `audit.yaml`. Dispatches depth-1 agents.
- **Depth 1 (Domain Agents)**: Own their domains (infra, data, ML, API, notifications). Dispatch depth-2 subagents.
- **Depth 2 (Subagents)**: Specialize in cross-cutting concerns (GitOps, security, observability, testing). Cannot spawn further agents.

## Agents and Responsibilities

### Orchestrator (Depth 0)

**Owner:** Human operator or automated trigger  
**Files:** `scripts/orchestrator.py`, `audit.yaml`  
**Responsibilities:**
- Read current state from `audit.yaml`
- Dispatch depth-1 agents via `repository_dispatch`
- Monitor PR queue and merge in dependency order
- Append audit entries for all state changes
- Ensure max depth = 2 constraint

### Depth-1 Agents

#### Infra Agent

**Branch:** `agent/infra`  
**Tasks:**
1. `provision_k8s_namespaces` → `infra/terraform/modules/eks/namespaces.tf`
2. `write_terraform_modules` → `infra/terraform/{main,variables,outputs}.tf`
3. `write_helm_charts` → `infra/helm/bankoffer-{api,worker,frontend}/`
4. `configure_argocd_app_of_apps` → `gitops/argocd/app-of-apps.yaml`
5. `write_github_actions_infra_workflow` → `.github/workflows/agent-infra.yaml`
6. `open_pr_infra` → Creates PR #infra → main

**After task 4, dispatches:** `gitops_sub`, `observability_sub`

**Model:** Claude Haiku 4.5 (default) or Opus for complex Terraform

---

#### Data Pipeline Agent

**Branch:** `agent/data`  
**Tasks:**
1. `write_kafka_consumer` → `data/kafka/consumers/transaction_consumer.py`
2. `write_transaction_normalizer` → `data/kafka/consumers/normalizer.py`
3. `write_feature_store_loader` → `data/feature_store/feature_definitions.py`
4. `write_airflow_dags` → `data/airflow/dags/customer_profile_dag.py`
5. `write_dbt_models` → `data/dbt/models/marts/customer_features.sql`
6. `open_pr_data` → Creates PR #data → main

**Model:** Claude Haiku 4.5

---

#### AI/ML Agent

**Branch:** `agent/aiml`  
**Tasks:**
1. `write_customer_profiler` → `services/worker/profiler.py`
2. `write_product_scorer` → `services/worker/scorer.py`
3. `write_offer_ranker` → `services/worker/ranker.py`
4. `write_model_registry_config` → `ml/registry/mlflow_config.yaml`
5. `write_ab_test_config` → `ml/ab_testing/experiment_config.yaml`
6. `open_pr_aiml` → Creates PR #aiml → main

**Special:** Scorer uses Claude API (claude-sonnet-4-20250514) with structured output for model predictions.

**Model:** Claude Haiku 4.5

---

#### API Agent

**Branch:** `agent/api`  
**Tasks:**
1. `write_fastapi_app` → `services/api/main.py`
2. `write_auth_middleware` → `services/api/middleware/auth.py`
3. `write_offer_endpoint` → `services/api/routers/offers.py`
4. `write_webhook_receiver` → `services/api/routers/webhooks.py`
5. `write_openapi_spec` → `docs/openapi.yaml`
6. `open_pr_api` → Creates PR #api → main

**After task 4, dispatches:** `security_sub`, `test_qa_sub`

**Model:** Claude Haiku 4.5

---

#### Notification Agent

**Branch:** `agent/notifications`  
**Tasks:**
1. `write_notification_router` → `services/notification/router.py`
2. `write_push_adapter` → `services/notification/adapters/push.py`
3. `write_email_adapter` → `services/notification/adapters/email.py`
4. `write_in_app_adapter` → `services/notification/adapters/inapp.py`
5. `write_preference_service` → `services/notification/preference_service.py`
6. `open_pr_notifications` → Creates PR #notifications → main

**Model:** Claude Haiku 4.5

---

### Depth-2 Subagents

#### GitOps Subagent

**Parent:** Infra Agent  
**Branch:** `sub/gitops`  
**Tasks:**
1. Write ArgoCD Application CRDs → `gitops/argocd/applications/{api,worker,frontend}.yaml`
2. Write Kustomize overlays → `gitops/kustomize/{base,overlays/{staging,prod}}/`
3. Configure ArgoCD Image Updater
4. Write Argo Rollouts canary strategy (10% → 30% → 100%)
5. Validate all manifests with `kubectl --dry-run=client`
6. Create PR with agent-result block

---

#### Security Subagent

**Parent:** API Agent  
**Branch:** `sub/security`  
**Tasks:**
1. `run_gitleaks_scan` — Fail if secrets detected
2. `run_trivy_image_scan` → `security/sbom/trivy-report.json`
3. `write_opa_policies` → `security/opa/policies/{rbac,data-access}.rego`
4. `generate_sbom` → `security/sbom/sbom.json` (CycloneDX format)
5. `write_secret_rotation_job` → Kubernetes CronJob for Vault credential rotation
6. Create PR with agent-result block

---

#### Observability Subagent

**Parent:** Infra Agent  
**Branch:** `sub/observability`  
**Tasks:**
1. Write Prometheus rules → Alert on offer_scoring_latency_p99 > 500ms
2. Write Grafana dashboards → Offer acceptance rate, profile coverage, notification funnel
3. Write Alertmanager config → PagerDuty + Slack routing
4. Instrument FastAPI metrics → prometheus_fastapi_instrumentator
5. Write Loki config → Structured JSON logging
6. Create PR with agent-result block

---

#### Test/QA Subagent

**Parent:** API Agent  
**Branch:** `sub/testqa`  
**Tasks:**
1. `write_pytest_unit_tests` → ≥80% coverage for profiler, scorer, ranker
2. `write_pytest_integration_tests` → End-to-end API tests against test Postgres
3. `write_cypress_e2e_tests` → Dashboard smoke test (login → view offer → click CTA)
4. `write_k6_load_tests` → GET /offers/{id} at 500 RPS for 60s; p99 < 300ms
5. `write_contract_tests` → Pact contracts between API and notification service
6. Create PR with agent-result block

---

## Execution Workflow

### Step 1: Initialize Environment

```bash
# Clone repo
git clone https://github.com/{ORG}/bankoffer-ai
cd bankoffer-ai

# Install prerequisites
brew install gh                    # macOS
# or
apt-get install gh -y             # Ubuntu

# Setup Python environment
python3 -m venv venv
source venv/bin/activate
pip install -r scripts/requirements.txt

# Configure git
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

# Run setup script
bash scripts/setup-agents.sh
```

### Step 2: Set API Keys

```bash
export ANTHROPIC_API_KEY="sk-..."
export GITHUB_TOKEN="ghp_..."
```

### Step 3: Dispatch Orchestrator

```bash
# Verify audit.yaml state
cat audit.yaml | head -20

# Start orchestration
python3 scripts/orchestrator.py
```

The orchestrator will:
1. Read `audit.yaml`
2. Dispatch infra_agent, data_pipeline_agent, aiml_agent, api_agent, notification_agent
3. Append audit entries for each dispatch
4. Exit

### Step 4: Monitor Agent Progress

GitHub Actions will trigger workflows:

```bash
# Watch workflow runs
gh run list --limit 20

# Watch a specific workflow
gh run watch <run-id>

# Check PR queue
gh pr list --state open

# View audit history
cat audit.yaml | grep -A 100 "history:"
```

### Step 5: Merge PRs in Dependency Order

Agents open PRs when complete. **Merge in this order:**

```
data → aiml → api → notifications → infra
```

This ensures ML models are ready before API, API is ready before notifications, etc.

```bash
# Merge a PR
gh pr merge <pr-number> --squash

# Or via web UI:
# https://github.com/{ORG}/bankoffer-ai/pulls
```

### Step 6: Monitor Subagent Dispatch

Once depth-1 agents merge, they dispatch subagents:
- After infra PR merges → gitops_sub, observability_sub are triggered
- After api PR merges → security_sub, test_qa_sub are triggered

Monitor with:

```bash
gh run list --workflow=agent-gitops-sub.yaml
gh run list --workflow=agent-security-sub.yaml
```

### Step 7: Final Verification

```bash
# Check ArgoCD sync status
kubectl get applications -n argocd

# Verify audit history is complete
python3 -c "import yaml; print(yaml.safe_load(open('audit.yaml'))['history'][-5:])"
```

## Troubleshooting

### Agent Blocked

If an agent status is `blocked`, check:

```bash
# Read audit history for error
grep -A 5 "blocked" audit.yaml

# Create a GitHub Issue to report
gh issue create --title "Agent blocked: {agent_name}" \
  --body "See audit.yaml history section"
```

### Agent Not Triggering

1. Check API key: `echo $ANTHROPIC_API_KEY | head -c 10`
2. Check GitHub token: `gh auth status`
3. Check repo access: `gh repo view`
4. Manually trigger via web UI:
   ```bash
   gh workflow run agent-infra.yaml
   ```

### Merge Conflicts

If a PR has conflicts:

```bash
# Checkout the agent branch
git checkout agent/infra
git merge main --no-edit

# Resolve conflicts manually
# Then force-push (agent branches allow this)
git push -f origin agent/infra
```

## Audit Trail

All actions are recorded in `audit.yaml` in append-only `history` section:

```yaml
history:
  - timestamp: "2026-03-31T12:00:00Z"
    agent: orchestrator
    action: dispatch_infra_agent
    ref: "HEAD"
    sha: "abc123def456"
    details: "Dispatched with 6 tasks"
```

This creates a **100% auditable** record of:
- What happened
- When it happened
- Which agent did it
- The exact git SHA

## Agent Communication Flow

```
Orchestrator reads audit.yaml
    ↓
Orchestrator dispatches depth-1 agents via repository_dispatch
    ↓
GitHub Actions triggers agent-{name}.yaml workflows
    ↓
Agent reads audit.yaml (audit-first pattern)
    ↓
Agent performs tasks, writes code
    ↓
Agent commits, pushes to agent/{name} branch
    ↓
Agent opens PR with agent-result YAML block
    ↓
Human (or automation) merges PR
    ↓
Orchestrator detects merged PR, appends history
    ↓
Agent marks complete, next phase begins
```

## Key Constraints

1. **Max Depth = 2** — Depth-2 subagents cannot spawn further agents
2. **Max 6 Tasks per Agent** — Larger tasks split into new subagents (requires approval)
3. **Append-only History** — Never delete history entries, only append
4. **GitHub-only Comms** — No direct function calls between agents
5. **Branch Naming** — `agent/{name}` for depth-1, `sub/{name}` for depth-2
6. **No kubectl apply** — All infrastructure changes via ArgoCD
7. **No Secrets in Code** — Use Kubernetes Secrets + External Secrets Operator

## References

- **Prompt:** Claude Code — Multi-Agent GitOps Prompt (PDF)
- **CLAUDE.md:** Project instructions for agents
- **audit.yaml:** Single source of truth for agent state
- **.github/workflows/:** GitHub Actions triggers for each agent
