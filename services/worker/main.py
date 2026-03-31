from __future__ import annotations

import json
import logging
import os
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from services.worker.profiler import ProfileResult, build_profile
from services.worker.ranker import RankedOffer, RankingConfig, rank_offers
from services.worker.scorer import AnthropicLLMClient, AuditTrail, score_products

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="BankOffer AI Worker",
    description="Customer profiling, product scoring, and offer ranking service.",
    version="1.0.0",
)


def _get_llm_client() -> AnthropicLLMClient | None:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key or api_key.startswith("sk-test"):
        logger.warning("ANTHROPIC_API_KEY not set or is a test key — using rule-based explanations")
        return None
    return AnthropicLLMClient(api_key=api_key)


class ScoreAndRankRequest(BaseModel):
    customer_id: str = Field(..., description="Unique customer identifier")
    features: dict[str, Any] = Field(..., description="Customer feature dictionary (must NOT contain 'city')")


class RankedOfferResponse(BaseModel):
    offer_id: str
    product_id: str
    product_name: str
    category: str
    relevance_score: float
    confidence_score: float
    personalization_reason: str
    recommended_channel: str
    rank: int
    boosted: bool


class ScoreAndRankResponse(BaseModel):
    profile: dict[str, Any]
    offers: list[RankedOfferResponse]
    audit_trail: dict[str, Any]


@app.post("/score-and-rank", response_model=ScoreAndRankResponse)
async def score_and_rank(request: ScoreAndRankRequest) -> ScoreAndRankResponse:
    logger.info("Processing score-and-rank for customer %s", request.customer_id)

    # Extract compliance fields from features before profiling
    features = dict(request.features)
    existing_products: list[str] = features.pop("existing_products", [])
    profiling_consent: bool = bool(features.pop("profiling_consent", True))

    try:
        profile: ProfileResult = build_profile(request.customer_id, features)
    except ValueError as exc:
        # Compliance violation (e.g. city in features)
        logger.error("COMPLIANCE ERROR for %s: %s", request.customer_id, exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Profiling failed for customer %s", request.customer_id)
        raise HTTPException(status_code=422, detail=f"Profiling error: {exc}") from exc

    llm_client = _get_llm_client()

    try:
        scored, audit = score_products(
            profile=profile,
            llm_client=llm_client,
            existing_products=existing_products,
            profiling_consent=profiling_consent,
        )
    except Exception as exc:
        logger.exception("Scoring failed for customer %s", request.customer_id)
        raise HTTPException(status_code=500, detail=f"Scoring error: {exc}") from exc

    try:
        ranked: list[RankedOffer] = rank_offers(
            scored_products=scored,
            profile=profile,
            config=RankingConfig(),
        )
    except Exception as exc:
        logger.exception("Ranking failed for customer %s", request.customer_id)
        raise HTTPException(status_code=500, detail=f"Ranking error: {exc}") from exc

    profile_dict = {
        "customer_id": profile.customer_id,
        "life_stage": profile.life_stage,
        "risk_score": profile.risk_score,
        "financial_health": profile.financial_health,
        "lifestyle_segment": profile.lifestyle_segment,
        "investor_readiness": profile.investor_readiness,
        "risk_bucket": profile.risk_bucket,
        "context_signals": profile.context_signals,
        "family_context": profile.family_context,
        "housing_context": profile.housing_context,
        "investment_gap": profile.investment_gap,
        "inflation_exposed": profile.inflation_exposed,
        "eligible": profile.eligible,
    }

    offers_resp = [
        RankedOfferResponse(
            offer_id=o.offer_id,
            product_id=o.product_id,
            product_name=o.product_name,
            category=o.category,
            relevance_score=o.relevance_score,
            confidence_score=o.confidence_score,
            personalization_reason=o.personalization_reason,
            recommended_channel=o.recommended_channel,
            rank=o.rank,
            boosted=o.boosted,
        )
        for o in ranked
    ]

    audit_dict = {
        "audit_id": audit.audit_id,
        "timestamp": audit.timestamp,
        "customer_id": audit.customer_id,
        "profiling": audit.profiling,
        "compliance": audit.compliance,
        "top_recommendations": audit.recommendations[:5],
    }

    logger.info("Completed score-and-rank for %s: %d offers", request.customer_id, len(offers_resp))
    return ScoreAndRankResponse(profile=profile_dict, offers=offers_resp, audit_trail=audit_dict)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("services.worker.main:app", host="0.0.0.0", port=8001, reload=False)
