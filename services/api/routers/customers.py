"""Customers router — agent sidebar and spending pattern endpoints."""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from services.api.middleware.auth import get_current_customer_id, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(redirect_slashes=False)


@router.get("/")
@router.get("")
async def list_customers(
    request: Request,
    _: str = Depends(get_current_customer_id),
):
    """Return all customers for the agent sidebar."""
    redis = request.app.state.redis
    raw = await redis.get("customers:list")
    if not raw:
        raise HTTPException(status_code=503, detail="Customer data not available — seed may be pending")
    return {"customers": json.loads(raw)}


@router.get("/{customer_id}/spending")
async def get_spending(
    customer_id: str,
    request: Request,
    _: str = Depends(get_current_customer_id),
):
    """Return top-5 spending categories for a customer."""
    redis = request.app.state.redis
    raw = await redis.get(f"spending:{customer_id}")
    if not raw:
        raise HTTPException(status_code=404, detail=f"Spending data not found for {customer_id}")
    return {"customer_id": customer_id, "spending": json.loads(raw)}


@router.get("/{customer_id}/profile")
async def get_profile(
    customer_id: str,
    request: Request,
    _: str = Depends(get_current_customer_id),
):
    """Return raw customer profile (for debugging)."""
    redis = request.app.state.redis
    raw = await redis.get(f"profile:{customer_id}")
    if not raw:
        raise HTTPException(status_code=404, detail=f"Profile not found for {customer_id}")
    return json.loads(raw)


class ConsentUpdate(BaseModel):
    profiling_consent: bool


@router.patch("/{customer_id}/consent")
async def update_consent(
    customer_id: str,
    body: ConsentUpdate,
    request: Request,
    user: dict = Depends(get_current_user),
):
    """Update profiling consent for a customer.
    Customers can only update their own consent; admins can update any.
    """
    if user["role"] == "customer" and user["user_id"] != customer_id:
        raise HTTPException(status_code=403, detail="Customers can only update their own consent")

    redis = request.app.state.redis
    raw = await redis.get(f"profile:{customer_id}")
    if not raw:
        raise HTTPException(status_code=404, detail=f"Profile not found for {customer_id}")

    profile = json.loads(raw)
    profile["profiling_consent"] = body.profiling_consent
    await redis.set(f"profile:{customer_id}", json.dumps(profile))

    logger.info(
        "Consent updated for %s → %s (by %s)", customer_id, body.profiling_consent, user["user_id"]
    )
    return {"customer_id": customer_id, "profiling_consent": body.profiling_consent}
