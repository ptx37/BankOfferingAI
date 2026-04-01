"""ETF Top-5 Agent: scrape ETFs, filter eligible users, send notifications."""

from __future__ import annotations

import json
import logging
from dataclasses import asdict
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from services.worker.agents.etf_scraper import ETFResult, fetch_top_etfs

logger = logging.getLogger(__name__)


def compose_notification(etfs: list[ETFResult]) -> str:
    """Build a rich notification message from ETF results."""
    lines = [
        "Top 5 ETFs — Last 6 Months\n",
        "Had you invested 1,000 EUR, here's what you could have gained:\n",
    ]
    for i, etf in enumerate(etfs, 1):
        sign = "+" if etf.return_pct >= 0 else ""
        gain_sign = "+" if etf.gain_eur >= 0 else ""
        lines.append(
            f"{i}. {etf.name} ({etf.ticker}) — "
            f"{sign}{etf.return_pct}% | {gain_sign}{etf.gain_eur} EUR"
        )
    lines.append("\nStart your ETF Starter Portfolio today.")
    return "\n".join(lines)


async def get_eligible_customers(engine: AsyncEngine) -> list[str]:
    """Return customer IDs eligible for ETF Starter Portfolio.

    Criteria: age >= 18, income > 3000, active account.
    """
    query = text("""
        SELECT u.user_id
        FROM users u
        JOIN customers c ON c.customer_id = u.user_id
        JOIN customer_profiles cp ON cp.customer_id = c.id
        WHERE u.is_active = true
          AND u.role = 'customer'
          AND cp.avg_monthly_income > 3000
          AND c.date_of_birth <= CURRENT_DATE - INTERVAL '18 years'
    """)
    async with engine.connect() as conn:
        result = await conn.execute(query)
        rows = result.fetchall()
    customer_ids = [row[0] for row in rows]
    logger.info("Found %d eligible customers for ETF notifications.", len(customer_ids))
    return customer_ids


async def record_run(
    engine: AsyncEngine,
    agent_id: str,
    status: str,
    triggered_by: str,
    users_notified: int = 0,
    result_summary: dict | None = None,
    started_at: datetime | None = None,
) -> str:
    """Insert or update an agent_runs record. Returns the run ID."""
    now = datetime.now(timezone.utc)
    async with engine.begin() as conn:
        row = await conn.execute(text("""
            INSERT INTO agent_runs (agent_id, status, started_at, completed_at, users_notified, result_summary, triggered_by)
            VALUES (:agent_id, :status, :started_at, :completed_at, :users_notified, :result_summary, :triggered_by)
            RETURNING id
        """), {
            "agent_id": agent_id,
            "status": status,
            "started_at": started_at or now,
            "completed_at": now if status in ("completed", "failed") else None,
            "users_notified": users_notified,
            "result_summary": json.dumps(result_summary) if result_summary else None,
            "triggered_by": triggered_by,
        })
        run_id = str(row.fetchone()[0])
    return run_id


async def update_run(
    engine: AsyncEngine,
    run_id: str,
    status: str,
    users_notified: int = 0,
    result_summary: dict | None = None,
) -> None:
    """Update an existing agent_runs record."""
    now = datetime.now(timezone.utc)
    async with engine.begin() as conn:
        await conn.execute(text("""
            UPDATE agent_runs
            SET status = :status,
                completed_at = :completed_at,
                users_notified = :users_notified,
                result_summary = :result_summary
            WHERE id = CAST(:run_id AS uuid)
        """), {
            "run_id": run_id,
            "status": status,
            "completed_at": now,
            "users_notified": users_notified,
            "result_summary": json.dumps(result_summary) if result_summary else None,
        })


async def run(engine: AsyncEngine, triggered_by: str = "scheduler") -> dict:
    """Main entry point: scrape ETFs, filter users, compose & record notifications.

    Returns a summary dict with etfs, eligible_count, and message.
    """
    agent_id = "etf_top5"
    started_at = datetime.now(timezone.utc)

    # Record run as started
    run_id = await record_run(engine, agent_id, "running", triggered_by, started_at=started_at)

    try:
        # 1. Scrape top ETFs
        etfs = fetch_top_etfs(top_n=5)
        if not etfs:
            await update_run(engine, run_id, "failed", result_summary={"error": "No ETF data returned"})
            return {"status": "failed", "error": "No ETF data returned"}

        # 2. Filter eligible customers
        eligible = await get_eligible_customers(engine)

        # 3. Compose notification
        message = compose_notification(etfs)

        # 4. Record notifications in agent_runs (actual sending is via the frontend notificationStore or notification service)
        summary = {
            "etfs": [asdict(e) for e in etfs],
            "message": message,
            "eligible_customers": eligible,
        }

        await update_run(engine, run_id, "completed", users_notified=len(eligible), result_summary=summary)

        logger.info("ETF agent run completed: %d users notified, run_id=%s", len(eligible), run_id)
        return {"status": "completed", "run_id": run_id, "users_notified": len(eligible), "etfs": [asdict(e) for e in etfs], "message": message, "eligible_customers": eligible}

    except Exception as exc:
        logger.exception("ETF agent run failed: %s", exc)
        await update_run(engine, run_id, "failed", result_summary={"error": str(exc)})
        return {"status": "failed", "error": str(exc)}
