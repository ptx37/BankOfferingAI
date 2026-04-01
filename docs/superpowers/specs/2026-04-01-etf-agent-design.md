# ETF Performance Agent — Design Spec

## Overview

A standalone Python agent that monthly scrapes the top 5 performing ETFs over the last 6 months, identifies eligible bank customers, and sends each a rich notification highlighting hypothetical gains on a 1,000 EUR investment. Admins can also trigger the agent manually from a new "Scheduled Agents" tab in the admin portal.

## Components

### 1. ETF Data Scraper

- **Location:** `services/worker/agents/etf_scraper.py`
- **Source:** Free public API (Yahoo Finance, Alpha Vantage, or similar)
- **Output:** List of top 5 ETFs by 6-month return, each containing:
  - ETF name
  - Ticker symbol
  - 6-month return percentage
  - Hypothetical gain on 1,000 EUR (e.g., +12% = +120 EUR)
- **Standalone function** — testable and reusable independently.

### 2. User Eligibility Filter

- **Location:** `services/worker/agents/etf_agent.py`
- **Criteria:** ETF Starter Portfolio eligibility rules:
  - age >= 18
  - income > 3,000
  - active account
- **Data source:** Joins `users`, `customers`, and `customer_profiles` tables.
- **Output:** List of eligible user IDs.

### 3. Notification Composer

- **Location:** `services/worker/agents/etf_agent.py`
- **Per eligible user**, builds a notification with this structure:

  > **Top 5 ETFs — Last 6 Months**
  >
  > Had you invested **1,000 EUR**, here's what you could have gained:
  >
  > 1. **iShares Core MSCI World** (IWDA) — +14.2% | +142 EUR
  > 2. **Vanguard S&P 500** (VUSA) — +12.8% | +128 EUR
  > 3. **Xtrackers MSCI USA** (XMUS) — +11.5% | +115 EUR
  > 4. **iShares Nasdaq 100** (SXRV) — +10.3% | +103 EUR
  > 5. **Amundi MSCI Europe** (CEU) — +8.7% | +87 EUR
  >
  > *Start your ETF Starter Portfolio today.*

- **Delivery:** Calls the existing notification service/store.

### 4. Agent Runner & API

- **Agent entry point:** `services/worker/agents/etf_agent.py` with a `run()` function that orchestrates scrape -> filter -> compose -> send.
- **New API endpoints** (in `services/api/routers/admin.py`):
  - `GET /admin/agents` — lists all registered agents with status, last run, next run.
  - `POST /admin/agents/{agent_id}/run` — triggers an agent manually.
- **Database table:** `agent_runs`
  - `id` UUID PK
  - `agent_id` TEXT (e.g., "etf_top5")
  - `status` TEXT (pending, running, completed, failed)
  - `started_at` TIMESTAMP
  - `completed_at` TIMESTAMP
  - `users_notified` INT
  - `result_summary` TEXT (JSON — ETF names, returns, error messages)
  - `triggered_by` TEXT (admin user ID or "scheduler")

### 5. Admin "Scheduled Agents" Tab

- **New tab** in the admin portal sidebar: "Scheduled Agents"
- **Agent table** showing:
  - Agent name and description
  - Schedule (e.g., "Monthly")
  - Last run timestamp and status
  - Next scheduled run
  - "Run Now" button
- **Run history** (expandable per agent):
  - Timestamp, status, users notified, triggered by
- **Data fetched from** `GET /admin/agents` and agent_runs table.

### 6. Scheduling

- Monthly execution via cron or Airflow DAG hitting `POST /admin/agents/etf_top5/run`.
- For the hackathon, the admin "Run Now" button is the primary trigger.
- Future: generic scheduler that reads agent definitions and runs them on their configured cadence.

## File Structure

```
services/
  worker/
    agents/
      __init__.py
      etf_scraper.py      # Scrapes ETF performance data
      etf_agent.py         # Orchestrator: filter users, compose, send
  api/
    routers/
      admin.py             # Add agent endpoints (GET /admin/agents, POST /admin/agents/{id}/run)
frontend/
  src/
    pages/
      admin.tsx            # Add "Scheduled Agents" tab
```

## Database Migration

Add to `init.sql` or run as migration:

```sql
CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    users_notified INT DEFAULT 0,
    result_summary JSONB,
    triggered_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_id ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_started_at ON agent_runs(started_at);
```

## Eligibility Source of Truth

Uses criteria from the ETF Starter Portfolio product definition in `frontend/src/lib/products.ts`:
- `eligibility`: age >= 18, income > 3,000, active account
- `suitability`: savings > 5,000, monthly_savings > 300, debt_to_income < 1, risk = moderate/high
- `triggerSignals`: idle_cash_high, salary_increase, monthly_savings_consistent

Only eligibility criteria are used for filtering (not suitability or triggers).

## Out of Scope

- Multiple agent types (future work — only ETF agent for now)
- Agent configuration UI (edit schedule, criteria)
- Email/push delivery channel selection (uses existing notification service default)
