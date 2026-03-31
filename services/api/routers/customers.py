"""Customers router — agent sidebar and spending pattern endpoints."""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from services.api.middleware.auth import get_current_customer_id

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
