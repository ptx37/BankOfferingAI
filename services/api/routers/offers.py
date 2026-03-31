"""Offers router - serves ranked product offers for a customer."""

import json
import logging
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from services.api.middleware.auth import get_current_customer_id
from services.api.models import Channel, Offer, OfferResponse, ProductType
from services.api.routers.compliance import AUDIT_CUSTOMER_LIST_PREFIX, AUDIT_RECORD_PREFIX, KILL_SWITCH_KEY

logger = logging.getLogger(__name__)

router = APIRouter()

WORKER_BASE_URL = "http://worker:8001"

_CHANNEL_MAP: dict[str, Channel] = {
    "push": Channel.PUSH,
    "email": Channel.EMAIL,
    "in_app": Channel.IN_APP,
    "in-app": Channel.IN_APP,
}

_CATEGORY_TO_TYPE: dict[str, ProductType] = {
    "investments": ProductType.INVESTMENT,
    "investment": ProductType.INVESTMENT,
    "savings": ProductType.SAVINGS_ACCOUNT,
    "lending": ProductType.PERSONAL_LOAN,
    "cards": ProductType.CREDIT_CARD,
    "insurance": ProductType.INSURANCE,
    "retirement": ProductType.INVESTMENT,
    "credit_card": ProductType.CREDIT_CARD,
    "personal_loan": ProductType.PERSONAL_LOAN,
    "mortgage": ProductType.MORTGAGE,
    "savings_account": ProductType.SAVINGS_ACCOUNT,
    "overdraft": ProductType.OVERDRAFT,
}


async def _fetch_customer_raw(customer_id: str, request: Request) -> dict:
    """Load raw customer profile from Redis (seeded by data_seeder)."""
    redis = request.app.state.redis
    cached = await redis.get(f"profile:{customer_id}")
    if cached:
        return json.loads(cached)
    raise HTTPException(status_code=404, detail=f"Customer profile not found: {customer_id}")


def _build_features(raw: dict) -> dict:
    """
    Build worker feature dict from raw seeded profile.
    COMPLIANCE: 'city' is intentionally excluded (AI Act Art.5(1)(c)).
    """
    return {
        "age": raw.get("age", 30),
        "income": float(raw.get("income", 0)),
        "savings": float(raw.get("savings", 0)),
        "monthly_savings": float(raw.get("monthly_savings", float(raw.get("savings", 0)) / 12)),
        "avg_expenses": float(raw.get("avg_expenses", 0)),
        "idle_cash": float(raw.get("idle_cash", max(0.0, float(raw.get("savings", 0)) - float(raw.get("debt", 0))))),
        "debt_to_income": float(raw.get("debt_to_income", 0)),
        "savings_rate": float(raw.get("savings_rate", 0)),
        "dominant_spend_category": str(raw.get("dominant_spend_category", "")),
        "investment_gap_flag": int(raw.get("investment_gap_flag", 0)),
        "risk_profile": str(raw.get("risk_profile", "low")).lower(),
        "marital_status": str(raw.get("marital_status", "single")).lower(),
        "dependents_count": int(raw.get("dependents_count", 0)),
        "homeowner_status": str(raw.get("homeowner_status", "rent")).lower(),
        "account_tenure_years": float(raw.get("account_tenure_years", 3.0)),
        "balance_trend": str(raw.get("balance_trend", "stable")).lower(),
        "events": raw.get("events", []),
        "existing_products": raw.get("existing_products", []),
        "profiling_consent": bool(raw.get("profiling_consent", True)),
        # NOTE: 'city' is intentionally excluded — geographic targeting prohibited
    }


async def _call_worker_scoring(customer_id: str, features: dict) -> tuple[list[Offer], dict]:
    """Call the worker scorer/ranker and return (ranked Offer objects, audit_trail dict)."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{WORKER_BASE_URL}/score-and-rank",
            json={"customer_id": customer_id, "features": features},
        )
        response.raise_for_status()
        data = response.json()

    offers: list[Offer] = []
    for o in data.get("offers", []):
        cat_key = o.get("category", "").lower()
        product_type = _CATEGORY_TO_TYPE.get(cat_key, ProductType.INVESTMENT)
        channel = _CHANNEL_MAP.get(o.get("recommended_channel", "in_app"), Channel.IN_APP)
        offers.append(Offer(
            offer_id=o["offer_id"],
            product_id=o["product_id"],
            product_name=o["product_name"],
            product_type=product_type,
            relevance_score=o["relevance_score"],
            confidence_score=o["confidence_score"],
            personalization_reason=o["personalization_reason"],
            rank=o["rank"],
            channel=channel,
            cta_url=f"/products/{o['product_id']}",
        ))
    return offers, data.get("audit_trail", {})


@router.get(
    "/{customer_id}",
    response_model=OfferResponse,
    summary="Get ranked offers for a customer",
    description="Fetches the customer profile, runs AI scoring/ranking, and returns personalized offers.",
)
async def get_offers(
    customer_id: str,
    request: Request,
    top_n: int = Query(default=5, ge=1, le=20, description="Number of offers to return"),
    _authenticated: str = Depends(get_current_customer_id),
):
    """Return top-N ranked offers for the given customer.

    Any authenticated user (including bank agents logged in as demo-001)
    may fetch offers for any customer profile.
    """
    redis = request.app.state.redis

    # ── Art. 14(4): Kill switch check ─────────────────────────────────────────
    ks_raw = await redis.get(KILL_SWITCH_KEY)
    if ks_raw:
        ks = json.loads(ks_raw)
        if ks.get("active"):
            logger.warning("KILL_SWITCH_ACTIVE: blocking offers for %s", customer_id)
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "recommendation_engine_halted",
                    "message": "The AI recommendation engine has been temporarily suspended by compliance.",
                    "reason": ks.get("reason", ""),
                    "set_by": ks.get("set_by", ""),
                    "set_at": ks.get("set_at", ""),
                },
            )

    try:
        raw_profile = await _fetch_customer_raw(customer_id, request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to fetch profile for %s: %s", customer_id, e)
        raise HTTPException(status_code=500, detail="Failed to retrieve customer profile")

    features = _build_features(raw_profile)

    try:
        ranked_offers, audit_trail = await _call_worker_scoring(customer_id, features)
    except httpx.HTTPStatusError as e:
        logger.error("Worker scoring failed for %s: %s", customer_id, e)
        raise HTTPException(status_code=502, detail="Scoring service unavailable")
    except httpx.RequestError as e:
        logger.error("Worker connection error for %s: %s", customer_id, e)
        raise HTTPException(status_code=503, detail="Scoring service unreachable")

    # ── Art. 12: Persist audit trail (immutable, 5-year TTL) ──────────────────
    if audit_trail:
        TTL_5_YEARS = 157_680_000
        audit_id = audit_trail.get("audit_id", "")
        if audit_id:
            await redis.set(
                f"{AUDIT_RECORD_PREFIX}{audit_id}",
                json.dumps(audit_trail),
                ex=TTL_5_YEARS,
            )
            await redis.lpush(f"{AUDIT_CUSTOMER_LIST_PREFIX}{customer_id}", audit_id)
            # Cap list at 10 000 entries per customer to prevent unbounded growth
            await redis.ltrim(f"{AUDIT_CUSTOMER_LIST_PREFIX}{customer_id}", 0, 9_999)

    return OfferResponse(
        customer_id=customer_id,
        offers=ranked_offers[:top_n],
        generated_at=datetime.utcnow(),
        model_version=audit_trail.get("model_version", "1.0.0") if audit_trail else "1.0.0",
    )
