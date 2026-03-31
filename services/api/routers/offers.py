"""Offers router - serves ranked product offers for a customer."""

import logging
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from services.api.middleware.auth import get_current_customer_id
from services.api.models import CustomerProfile, Offer, OfferResponse

logger = logging.getLogger(__name__)

router = APIRouter()

WORKER_BASE_URL = "http://worker:8001"


async def _fetch_customer_profile(
    customer_id: str, request: Request
) -> CustomerProfile:
    """Retrieve customer profile from the database or cache."""
    redis = request.app.state.redis

    # Try cache first
    cached = await redis.get(f"profile:{customer_id}")
    if cached:
        return CustomerProfile.model_validate_json(cached)

    # Fall back to DB
    session_factory = request.app.state.db_session_factory
    async with session_factory() as session:
        from sqlalchemy import text

        result = await session.execute(
            text("SELECT data FROM customer_profiles WHERE customer_id = :cid"),
            {"cid": customer_id},
        )
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Customer profile not found")

        profile = CustomerProfile.model_validate_json(row[0])

        # Warm cache (TTL 15 min)
        await redis.set(
            f"profile:{customer_id}",
            profile.model_dump_json(),
            ex=900,
        )
        return profile


def _profile_to_features(profile: CustomerProfile) -> dict:
    """Map CustomerProfile to the flat features dict expected by the worker."""
    return {
        "age": profile.age,
        "income": profile.income,
        "savings": profile.savings,
        "monthly_savings": profile.savings / 12 if profile.savings else 0,
        "avg_expenses": profile.income / 12 * 0.6 if profile.income else 0,
        "idle_cash": max(0, profile.savings - profile.debt),
        "debt_to_income": profile.debt / profile.income if profile.income else 0,
        "savings_rate": (profile.savings / 12) / (profile.income / 12) if profile.income else 0,
        "dominant_spend_category": "general",
        "investment_gap_flag": 1 if profile.investor_readiness > 0.5 else 0,
        "risk_profile": profile.risk_profile,
        "marital_status": profile.marital_status,
        "dependents_count": profile.dependents_count,
        "homeowner_status": profile.homeowner_status,
        "account_tenure_years": 3.0,
        "events": [],
    }


_CHANNEL_MAP = {"push": "push", "email": "email", "in_app": "in_app"}
_TYPE_MAP = {
    "credit_card": "credit_card", "personal_loan": "personal_loan",
    "mortgage": "mortgage", "savings_account": "savings_account",
    "investment": "investment", "insurance": "insurance", "overdraft": "overdraft",
}


async def _call_worker_scoring(profile: CustomerProfile) -> list[Offer]:
    """Call the worker service scorer/ranker pipeline and return ranked offers."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{WORKER_BASE_URL}/score-and-rank",
            json={"customer_id": profile.customer_id, "features": _profile_to_features(profile)},
        )
        response.raise_for_status()
        data = response.json()

    offers = []
    for o in data.get("offers", []):
        product_type = _TYPE_MAP.get(o.get("category", ""), "investment")
        channel = _CHANNEL_MAP.get(o.get("recommended_channel", "in_app"), "in_app")
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
    return offers


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
    authenticated_customer: str = Depends(get_current_customer_id),
):
    """Return top-N ranked offers for the given customer."""
    # Authorization check: customers can only access their own offers
    if authenticated_customer != customer_id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to access offers for this customer",
        )

    try:
        profile = await _fetch_customer_profile(customer_id, request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to fetch profile for %s: %s", customer_id, e)
        raise HTTPException(status_code=500, detail="Failed to retrieve customer profile")

    try:
        ranked_offers = await _call_worker_scoring(profile)
    except httpx.HTTPStatusError as e:
        logger.error("Worker scoring failed for %s: %s", customer_id, e)
        raise HTTPException(status_code=502, detail="Scoring service unavailable")
    except httpx.RequestError as e:
        logger.error("Worker connection error for %s: %s", customer_id, e)
        raise HTTPException(status_code=503, detail="Scoring service unreachable")

    return OfferResponse(
        customer_id=customer_id,
        offers=ranked_offers[:top_n],
        generated_at=datetime.utcnow(),
        model_version="1.0.0",
    )
