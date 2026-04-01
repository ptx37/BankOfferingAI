"""Admin router — user management, product catalog, audit trail."""
from __future__ import annotations

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import text

from services.api.middleware.auth import require_admin
from services.worker.catalog import PRODUCT_CATALOG

logger = logging.getLogger(__name__)
router = APIRouter(redirect_slashes=False)

CATALOG_DISABLED_KEY = "catalog:disabled"


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users", summary="List all users")
async def list_users(
    request: Request,
    _: dict = Depends(require_admin),
):
    engine = request.app.state.db_engine
    async with engine.connect() as conn:
        result = await conn.execute(
            text("SELECT user_id, role, display_name, is_active FROM users ORDER BY role, user_id")
        )
        rows = result.fetchall()
    return {
        "users": [
            {
                "user_id": r.user_id,
                "role": r.role,
                "display_name": r.display_name,
                "is_active": r.is_active,
            }
            for r in rows
        ]
    }


class UpdateUserRequest(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


@router.put("/users/{user_id}", summary="Update user role or active status")
async def update_user(
    user_id: str,
    body: UpdateUserRequest,
    request: Request,
    admin: dict = Depends(require_admin),
):
    if body.role is None and body.is_active is None:
        raise HTTPException(status_code=400, detail="Provide at least one field to update")
    if body.role and body.role not in ("customer", "employee", "admin"):
        raise HTTPException(status_code=400, detail="role must be customer, employee, or admin")

    engine = request.app.state.db_engine
    async with engine.begin() as conn:
        # Confirm user exists
        result = await conn.execute(
            text("SELECT user_id FROM users WHERE user_id = :uid"), {"uid": user_id}
        )
        if not result.fetchone():
            raise HTTPException(status_code=404, detail=f"User not found: {user_id}")

        if body.role is not None:
            await conn.execute(
                text("UPDATE users SET role = :role WHERE user_id = :uid"),
                {"role": body.role, "uid": user_id},
            )
        if body.is_active is not None:
            await conn.execute(
                text("UPDATE users SET is_active = :active WHERE user_id = :uid"),
                {"active": body.is_active, "uid": user_id},
            )

    logger.info("ADMIN %s updated user %s: role=%s active=%s", admin["user_id"], user_id, body.role, body.is_active)
    return {"user_id": user_id, "updated": True}


# ── Product Catalog ────────────────────────────────────────────────────────────

@router.get("/products", summary="List product catalog with enabled/disabled status")
async def list_products(
    request: Request,
    _: dict = Depends(require_admin),
):
    redis = request.app.state.redis
    disabled: set[str] = set(await redis.smembers(CATALOG_DISABLED_KEY))
    return {
        "products": [
            {
                "product_id": p["product_id"],
                "product_name": p["product_name"],
                "category": p["category"],
                "description": p["description"],
                "recommended_channel": p.get("recommended_channel", "in-app"),
                "enabled": p["product_id"] not in disabled,
            }
            for p in PRODUCT_CATALOG
        ]
    }


@router.post("/products/{product_id}/toggle", summary="Enable or disable a product")
async def toggle_product(
    product_id: str,
    request: Request,
    admin: dict = Depends(require_admin),
):
    valid_ids = {p["product_id"] for p in PRODUCT_CATALOG}
    if product_id not in valid_ids:
        raise HTTPException(status_code=404, detail=f"Product not found: {product_id}")

    redis = request.app.state.redis
    is_disabled = await redis.sismember(CATALOG_DISABLED_KEY, product_id)
    if is_disabled:
        await redis.srem(CATALOG_DISABLED_KEY, product_id)
        enabled = True
    else:
        await redis.sadd(CATALOG_DISABLED_KEY, product_id)
        enabled = False

    logger.info("ADMIN %s toggled product %s → enabled=%s", admin["user_id"], product_id, enabled)
    return {"product_id": product_id, "enabled": enabled}


# ── Audit Trail ───────────────────────────────────────────────────────────────

@router.get("/audit", summary="Search audit trail by customer_id")
async def search_audit(
    request: Request,
    customer_id: str = Query(..., description="Customer ID to search audit records for"),
    _: dict = Depends(require_admin),
):
    redis = request.app.state.redis
    audit_ids = await redis.lrange(f"audit:customer:{customer_id}", 0, 99)
    if not audit_ids:
        return {"customer_id": customer_id, "total": 0, "audit_records": []}

    records = []
    for aid in audit_ids:
        raw = await redis.get(f"audit:{aid}")
        if raw:
            records.append(json.loads(raw))

    return {"customer_id": customer_id, "total": len(records), "audit_records": records}


# ── Agent Management ──────────────────────────────────────────────────────────

REGISTERED_AGENTS = [
    {
        "agent_id": "etf_top5",
        "name": "ETF Top 5 Performance",
        "description": "Scrapes top 5 performing ETFs over 6 months and notifies eligible customers with hypothetical 1,000 EUR gain.",
        "schedule": "Monthly",
    },
]


@router.get("/agents")
async def list_agents(
    request: Request,
    admin: dict = Depends(require_admin),
):
    """List all registered agents with their latest run info."""
    engine = request.app.state.db_engine
    agents = []
    for agent_def in REGISTERED_AGENTS:
        agent_id = agent_def["agent_id"]
        async with engine.connect() as conn:
            # Latest run
            row = await conn.execute(text(
                "SELECT id, status, started_at, completed_at, users_notified, result_summary, triggered_by "
                "FROM agent_runs WHERE agent_id = :aid ORDER BY started_at DESC LIMIT 1"
            ), {"aid": agent_id})
            last_run = row.fetchone()

            # Run history (last 20)
            rows = await conn.execute(text(
                "SELECT id, status, started_at, completed_at, users_notified, result_summary, triggered_by "
                "FROM agent_runs WHERE agent_id = :aid ORDER BY started_at DESC LIMIT 20"
            ), {"aid": agent_id})
            history = [
                {
                    "id": str(r[0]),
                    "status": r[1],
                    "started_at": r[2].isoformat() if r[2] else None,
                    "completed_at": r[3].isoformat() if r[3] else None,
                    "users_notified": r[4],
                    "result_summary": r[5],
                    "triggered_by": r[6],
                }
                for r in rows.fetchall()
            ]

        agents.append({
            **agent_def,
            "last_run": {
                "id": str(last_run[0]),
                "status": last_run[1],
                "started_at": last_run[2].isoformat() if last_run[2] else None,
                "completed_at": last_run[3].isoformat() if last_run[3] else None,
                "users_notified": last_run[4],
                "triggered_by": last_run[6],
            } if last_run else None,
            "history": history,
        })

    return {"agents": agents}


@router.post("/agents/{agent_id}/run")
async def trigger_agent(
    agent_id: str,
    request: Request,
    admin: dict = Depends(require_admin),
):
    """Manually trigger an agent run."""
    known_ids = [a["agent_id"] for a in REGISTERED_AGENTS]
    if agent_id not in known_ids:
        raise HTTPException(status_code=404, detail=f"Unknown agent: {agent_id}")

    admin_id = admin.get("user_id", "unknown")
    engine = request.app.state.db_engine

    if agent_id == "etf_top5":
        from services.worker.agents.etf_agent import run as run_etf_agent
        result = await run_etf_agent(engine, triggered_by=admin_id)

        # If successful, push notifications via the frontend notification store pattern
        # The result contains eligible_customers and message — the frontend will
        # read this from the run history and push to notificationStore
        logger.info("ADMIN %s triggered agent %s: %s", admin_id, agent_id, result.get("status"))
        return result

    raise HTTPException(status_code=400, detail=f"Agent {agent_id} has no run handler")
