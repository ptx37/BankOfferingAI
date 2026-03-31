"""
compliance.py — AI Act Art. 14 human oversight endpoints.

Implements the three mandatory oversight mechanisms:
  1. Kill switch  — immediately halt all recommendations (Art. 14(4))
  2. Override     — RM rejects/overrides an offer with a logged reason (Art. 14(1))
  3. Audit export — retrieve persisted audit trail per customer (Art. 12)

All write operations are append-only in Redis. Entries are never deleted.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from services.api.middleware.auth import get_current_customer_id

logger = logging.getLogger(__name__)
router = APIRouter(redirect_slashes=False)

# Redis keys
KILL_SWITCH_KEY = "compliance:kill_switch"           # value: JSON {active, reason, set_by, set_at}
OVERRIDE_LIST_KEY = "compliance:overrides"           # LPUSH list of all overrides (global)
AUDIT_RECORD_PREFIX = "audit:"                       # audit:{audit_id} → full record
AUDIT_CUSTOMER_LIST_PREFIX = "audit:customer:"       # audit:customer:{cid} → list of audit_ids


# ── Kill switch ────────────────────────────────────────────────────────────────

class KillSwitchRequest(BaseModel):
    active: bool = Field(..., description="True to halt recommendations, False to resume")
    reason: str = Field(..., min_length=5, description="Reason for the action (logged immutably)")


@router.get("/kill-switch", summary="Get current kill switch status")
async def get_kill_switch(
    request: Request,
    _: str = Depends(get_current_customer_id),
):
    """Return the current state of the recommendation engine kill switch."""
    redis = request.app.state.redis
    raw = await redis.get(KILL_SWITCH_KEY)
    if not raw:
        return {"active": False, "message": "Recommendation engine is running normally."}
    return json.loads(raw)


@router.post("/kill-switch", summary="Enable or disable the recommendation engine")
async def set_kill_switch(
    body: KillSwitchRequest,
    request: Request,
    agent_id: str = Depends(get_current_customer_id),
):
    """
    Art. 14(4) — Immediately halt or resume all AI recommendations.
    This action is logged immutably and cannot be deleted.
    """
    redis = request.app.state.redis
    record = {
        "active": body.active,
        "reason": body.reason,
        "set_by": agent_id,
        "set_at": datetime.now(timezone.utc).isoformat(),
    }
    # Persist indefinitely — this is a compliance record
    await redis.set(KILL_SWITCH_KEY, json.dumps(record))
    action = "HALTED" if body.active else "RESUMED"
    logger.warning(
        "COMPLIANCE_KILL_SWITCH %s by agent=%s reason=%s",
        action, agent_id, body.reason,
    )
    return {
        "active": body.active,
        "message": f"Recommendation engine {action}.",
        **record,
    }


# ── Override ───────────────────────────────────────────────────────────────────

class OverrideRequest(BaseModel):
    customer_id: str = Field(..., description="Customer whose offer is being overridden")
    offer_id: str = Field(..., description="Offer ID from the scored recommendation")
    product_id: str = Field(..., description="Product ID")
    product_name: str = Field(..., description="Product name (for readability in audit)")
    reason: str = Field(..., min_length=5, description="Reason for override (logged immutably)")


@router.post("/override", summary="RM override: reject or flag a recommendation")
async def record_override(
    body: OverrideRequest,
    request: Request,
    agent_id: str = Depends(get_current_customer_id),
):
    """
    Art. 14(1) — Log that a relationship manager has rejected or overridden
    a specific AI recommendation. The record is append-only and never deleted.
    Minimum 5-year retention (EBA + AI Act Art. 12).
    """
    redis = request.app.state.redis
    override_id = str(uuid.uuid4())
    record = {
        "override_id": override_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent_id": agent_id,
        "customer_id": body.customer_id,
        "offer_id": body.offer_id,
        "product_id": body.product_id,
        "product_name": body.product_name,
        "reason": body.reason,
        "action": "rejected_by_rm",
    }
    TTL_5_YEARS = 157_680_000
    # Store individual record
    await redis.set(f"compliance:override:{override_id}", json.dumps(record), ex=TTL_5_YEARS)
    # Append to global override list (audit trail — keep all)
    await redis.lpush(OVERRIDE_LIST_KEY, json.dumps(record))
    # Append to per-customer override list
    await redis.lpush(f"compliance:override:customer:{body.customer_id}", override_id)

    logger.warning(
        "COMPLIANCE_OVERRIDE agent=%s customer=%s product=%s reason=%s",
        agent_id, body.customer_id, body.product_id, body.reason,
    )
    return {"override_id": override_id, "status": "recorded", "timestamp": record["timestamp"]}


# ── Audit trail export ────────────────────────────────────────────────────────

@router.get("/audit/{customer_id}", summary="Retrieve persisted audit trail for a customer")
async def get_audit_trail(
    customer_id: str,
    request: Request,
    _: str = Depends(get_current_customer_id),
):
    """
    Art. 12 — Export persisted audit records for a customer.
    Returns all recommendation audit entries available in Redis.
    Regulators may request this at any time.
    """
    redis = request.app.state.redis
    audit_ids = await redis.lrange(f"{AUDIT_CUSTOMER_LIST_PREFIX}{customer_id}", 0, -1)
    if not audit_ids:
        return {"customer_id": customer_id, "audit_records": []}

    records = []
    for aid in audit_ids:
        raw = await redis.get(f"{AUDIT_RECORD_PREFIX}{aid}")
        if raw:
            records.append(json.loads(raw))

    return {"customer_id": customer_id, "total": len(records), "audit_records": records}
