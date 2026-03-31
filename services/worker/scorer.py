"""
scorer.py — 6-step rule-based product scoring engine with compliance hard filters.

Step 1: Context signals (from ProfileResult)
Step 2: Filter by financial_health
Step 3: Filter by risk_bucket (product risk must not exceed customer risk)
Step 4: Filter by investor_readiness
Step 5: Hard compliance filters (fragile, existing_products, profiling_consent, city guard)
Step 6: Score and rank by signal match + priority

LLM is used ONLY for generating personalization_reason text.
All filtering and scoring is deterministic and rule-based.
"""
from __future__ import annotations

import json
import logging
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Protocol

import anthropic

from services.worker.catalog import PRODUCT_CATALOG
from services.worker.profiler import ProfileResult

logger = logging.getLogger(__name__)

MODEL_ID = "claude-sonnet-4-20250514"
MAX_TOKENS = 800
SCORING_ENGINE_VERSION = "1.0.0"  # bump on every model/rule change

RISK_RANK: dict[str, int] = {"low": 1, "moderate": 2, "high": 3}

# Products in these categories are EXCLUDED for 'fragile' customers
CREDIT_CATEGORIES = {"Lending", "Cards"}
INVESTMENT_CATEGORIES = {"Investments", "Retirement"}

EXPLANATION_SYSTEM = """\
You are a bank advisor assistant generating brief, professional explanations for product recommendations.
For each product, write ONE sentence (max 25 words) explaining why it fits this customer.
Use formal, non-salesy language. Focus on the customer's specific financial situation.
Return a JSON array of strings, one per product, in the same order.
Output only valid JSON."""


class LLMClient(Protocol):
    def create_message(self, prompt: str, system: str, max_tokens: int) -> str: ...


class AnthropicLLMClient:
    def __init__(self, api_key: str) -> None:
        self._client = anthropic.Anthropic(api_key=api_key)

    def create_message(self, prompt: str, system: str, max_tokens: int) -> str:
        message = self._client.messages.create(
            model=MODEL_ID,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text


@dataclass
class ScoredProduct:
    product_id: str
    product_name: str
    category: str
    relevance_score: float
    confidence_score: float
    personalization_reason: str
    trigger_signals: list[str]
    recommended_channel: str
    signals_matched: list[str] = field(default_factory=list)
    rules_applied: list[str] = field(default_factory=list)


@dataclass
class AuditTrail:
    audit_id: str
    timestamp: str
    customer_id: str
    model_version: str                  # Art. 11 — version traceability
    profiling: dict[str, Any]
    features_snapshot: dict[str, Any]   # Art. 12 — raw inputs used for decision
    compliance: dict[str, Any]
    recommendations: list[dict[str, Any]]
    llm_used: bool                      # Section 6 — LLM usage disclosure
    llm_model: str | None               # Section 6 — which LLM model if used


def _is_risk_eligible(customer_risk: str, product_risk: Any) -> bool:
    """
    Return True if the product's risk level does not exceed the customer's risk tolerance.
    Rule: IF risk_bucket(product) > risk_bucket(customer) → exclude
    """
    if product_risk is None:
        return True
    if isinstance(product_risk, list):
        if "any" in product_risk:
            return True
        # Product accepts these specific risk levels
        return customer_risk in product_risk
    if product_risk == "any":
        return True
    # Single string: product carries this risk level
    # Customer must be able to tolerate it (customer risk >= product risk)
    return RISK_RANK.get(customer_risk, 1) >= RISK_RANK.get(str(product_risk), 1)


def _compute_score(
    product: dict[str, Any],
    profile: ProfileResult,
    customer_signals: set[str],
) -> tuple[float, float, list[str], list[str]]:
    """
    Compute relevance and confidence scores based on signal matching and priority.
    Returns: (relevance_score, confidence_score, signals_matched, rules_applied)
    """
    product_signals = set(product.get("trigger_signals", []))
    matched = list(customer_signals & product_signals)

    # Base score from signal overlap
    base = 0.25 + min(0.55, len(matched) * 0.18)

    # Priority boost (1–4 scale → +0 to +0.12)
    priority = int(product.get("priority", 1))
    priority_boost = (priority - 1) * 0.04

    # Investor readiness alignment
    ir_required = product.get("investor_readiness_required", [])
    ir_boost = 0.08 if profile.investor_readiness in ir_required else 0.0

    relevance = round(min(1.0, base + priority_boost + ir_boost), 4)
    # Confidence is slightly lower — reflects rule certainty vs LLM certainty
    confidence = round(min(1.0, relevance * 0.88 + 0.05), 4)

    rules: list[str] = []
    if "idle_cash_high" in matched:
        rules.append("PR009")
    if "monthly_savings_consistent" in matched:
        rules.append("PR001")
    if "family_context" in matched:
        rules.append("PR015")
    if "rent_pattern" in matched:
        rules.append("PR016")
    if "investment_gap" in matched:
        rules.append("PR017")

    return relevance, confidence, matched, rules


def _template_reason(product: dict[str, Any], profile: ProfileResult, signals_matched: list[str]) -> str:
    """Generate a template-based personalization reason when LLM is unavailable."""
    templates: dict[str, str] = {
        "ETF Starter Portfolio": f"Idle savings of €{int(profile.risk_score * 1000):,} can generate consistent returns with moderate risk exposure.",
        "ETF Growth Portfolio": "High income and strong savings profile support an aggressive growth investment strategy.",
        "Mutual Funds": "Guided investment approach suits your savings discipline and moderate risk appetite.",
        "Managed Portfolio": "High savings and income level qualify for personalised advisory portfolio management.",
        "State Bonds / Treasury Bills": "Idle cash is losing value to inflation — capital-protected bonds offer stable, safe returns.",
        "Savings Deposit": "Fixed-term deposit provides guaranteed returns on idle balances with no market risk.",
        "Private Pension": "Consistent monthly savings and income trajectory make this the right time to build pension provisions.",
        "Personal Loan": "Stable income profile supports a flexible loan to address current liquidity needs.",
        "Mortgage": "Rental payment pattern and income level indicate strong mortgage affordability.",
        "Credit Card": "Transaction volume and spending pattern qualify for cashback and rewards.",
        "Life Insurance": "Family responsibilities create a financial protection need that aligns with this coverage.",
        "Travel Insurance": "Frequent travel transactions make annual comprehensive coverage cost-effective.",
    }
    return templates.get(product["product_name"], f"{product['product_name']} matches your current financial profile.")


def _generate_reasons(
    products: list[dict[str, Any]],
    profile: ProfileResult,
    llm_client: LLMClient | None,
    signals_per_product: list[list[str]],
) -> tuple[list[str], bool]:
    """
    Call LLM for explanations; fall back to templates on any error.
    Returns (reasons, llm_was_used).

    AI Act Section 6 compliance:
    - Prompt contains ONLY anonymized financial features (no name, no CNP, no IBAN)
    - Prompt and raw response are logged at INFO level for 90-day retention audit
    - LLM generates explanation text ONLY — does not influence score or filtering
    """
    if not llm_client:
        return [_template_reason(p, profile, s) for p, s in zip(products, signals_per_product)], False

    # NOTE: customer_id is a pseudonymous UUID-style ID (CUST-NNN) — no direct identifier
    # City and geographic data are intentionally excluded (AI Act Art. 5(1)(c))
    prompt = (
        f"Customer financial profile (anonymised):\n"
        f"- Financial health: {profile.financial_health}\n"
        f"- Risk bucket: {profile.risk_bucket}\n"
        f"- Investor readiness: {profile.investor_readiness}\n"
        f"- Lifestyle: {profile.lifestyle_segment}\n"
        f"- Context signals: {', '.join(profile.context_signals)}\n\n"
        f"Products to explain ({len(products)}):\n"
        + "\n".join(
            f"{i+1}. {p['product_name']} (category: {p['category']}, signals matched: {', '.join(s or ['none'])})"
            for i, (p, s) in enumerate(zip(products, signals_per_product))
        )
        + "\n\nReturn a JSON array of strings, one explanation per product."
    )

    # AI Act Section 6 — log prompt for minimum 90-day retention (captured by log aggregator)
    logger.info(
        "LLM_AUDIT_PROMPT customer=%s model=%s products=%s prompt=%s",
        profile.customer_id, MODEL_ID,
        [p["product_id"] for p in products],
        prompt,
    )

    try:
        raw = llm_client.create_message(prompt=prompt, system=EXPLANATION_SYSTEM, max_tokens=MAX_TOKENS)

        # AI Act Section 6 — log raw response for minimum 90-day retention
        logger.info(
            "LLM_AUDIT_RESPONSE customer=%s model=%s response=%s",
            profile.customer_id, MODEL_ID, raw,
        )

        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            reasons = json.loads(match.group())
            if isinstance(reasons, list) and len(reasons) == len(products):
                return [str(r) for r in reasons], True
    except Exception as exc:
        logger.warning("LLM reason generation failed: %s — using templates", exc)

    return [_template_reason(p, profile, s) for p, s in zip(products, signals_per_product)], False


def score_products(
    profile: ProfileResult,
    llm_client: LLMClient | None,
    products: list[dict[str, Any]] | None = None,
    existing_products: list[str] | None = None,
    profiling_consent: bool = True,
    features_snapshot: dict[str, Any] | None = None,
) -> tuple[list[ScoredProduct], AuditTrail]:
    """
    Run the 6-step rule engine and return scored products + audit trail.

    Hard compliance filters applied:
    - profiling_consent == False → return empty (skip customer)
    - city in features → already blocked at profiler level
    - financial_health == 'fragile' → exclude Lending, Cards, Investments, Retirement
    - product in existing_products → exclude
    - risk_bucket(product) > risk_bucket(customer) → exclude
    """
    if products is None:
        products = PRODUCT_CATALOG
    if existing_products is None:
        existing_products = []

    audit_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    # ── Step 0: Consent check ──────────────────────────────────────────────────
    if not profiling_consent:
        logger.warning("No profiling consent for %s — returning empty results", profile.customer_id)
        audit = AuditTrail(
            audit_id=audit_id, timestamp=timestamp, customer_id=profile.customer_id,
            model_version=SCORING_ENGINE_VERSION,
            profiling={},
            features_snapshot=features_snapshot or {},
            compliance={"profiling_consent": False, "action": "skipped_no_consent"},
            recommendations=[],
            llm_used=False,
            llm_model=None,
        )
        return [], audit

    customer_signals = set(profile.context_signals)
    compliance_log: dict[str, Any] = {
        "profiling_consent": True,
        "city_excluded": True,
        "fragile_exclusion_applied": profile.financial_health == "fragile",
        "products_excluded_fragile": [],
        "products_excluded_existing": [],
        "products_excluded_risk": [],
        "products_excluded_health": [],
        "products_excluded_readiness": [],
    }

    # ── Steps 2-5: Hard filtering ──────────────────────────────────────────────
    eligible: list[dict[str, Any]] = []
    for p in products:
        pid = p["product_id"]
        cat = p.get("category", "")

        # Hard filter: fragile → no credit or investment products
        if profile.financial_health == "fragile" and cat in (CREDIT_CATEGORIES | INVESTMENT_CATEGORIES):
            compliance_log["products_excluded_fragile"].append(pid)
            continue

        # Hard filter: already owned
        if pid in existing_products:
            compliance_log["products_excluded_existing"].append(pid)
            continue

        # Step 2: financial_health required
        fh_required = p.get("financial_health_required", [])
        if fh_required and profile.financial_health not in fh_required:
            compliance_log["products_excluded_health"].append(pid)
            continue

        # Step 3: risk_bucket filter
        if not _is_risk_eligible(profile.risk_bucket, p.get("risk_bucket")):
            compliance_log["products_excluded_risk"].append(pid)
            continue

        # Step 4: investor_readiness filter
        ir_required = p.get("investor_readiness_required", [])
        if ir_required and profile.investor_readiness not in ir_required:
            compliance_log["products_excluded_readiness"].append(pid)
            continue

        eligible.append(p)

    logger.info(
        "Compliance filters for %s: %d eligible of %d (fragile_excl=%d, owned_excl=%d, risk_excl=%d)",
        profile.customer_id, len(eligible), len(products),
        len(compliance_log["products_excluded_fragile"]),
        len(compliance_log["products_excluded_existing"]),
        len(compliance_log["products_excluded_risk"]),
    )

    # ── Step 5: Score eligible products ───────────────────────────────────────
    scored_data: list[tuple[dict, float, float, list[str], list[str]]] = []
    for p in eligible:
        relevance, confidence, matched, rules = _compute_score(p, profile, customer_signals)
        scored_data.append((p, relevance, confidence, matched, rules))

    # Sort by relevance desc for LLM prompt ordering
    scored_data.sort(key=lambda x: x[1], reverse=True)

    # ── Step 6: Generate explanations ─────────────────────────────────────────
    products_for_llm = [sd[0] for sd in scored_data]
    signals_for_llm = [sd[3] for sd in scored_data]
    reasons, llm_was_used = _generate_reasons(products_for_llm, profile, llm_client, signals_for_llm)

    # ── Assemble ScoredProduct list ────────────────────────────────────────────
    scored_products: list[ScoredProduct] = []
    audit_recs: list[dict[str, Any]] = []
    for (p, relevance, confidence, matched, rules), reason in zip(scored_data, reasons):
        sp = ScoredProduct(
            product_id=p["product_id"],
            product_name=p["product_name"],
            category=p["category"],
            relevance_score=relevance,
            confidence_score=confidence,
            personalization_reason=reason,
            trigger_signals=p.get("trigger_signals", []),
            recommended_channel=p.get("recommended_channel", "in_app"),
            signals_matched=matched,
            rules_applied=rules,
        )
        scored_products.append(sp)
        audit_recs.append({
            "product_id": p["product_id"],
            "product_name": p["product_name"],
            "relevance_score": relevance,
            "confidence_score": confidence,
            "trigger_signal": matched,        # Art. 12 — which signals triggered this product
            "signals_matched": matched,
            "rules_applied": rules,
            "channel": p.get("recommended_channel", "in_app"),
            "suitability_passed": True,       # Art. 12 — passed all compliance filters
            "outcome": None,                  # Art. 12 — updated post-interaction via override API
        })

    # ── Build audit trail ──────────────────────────────────────────────────────
    audit = AuditTrail(
        audit_id=audit_id,
        timestamp=timestamp,
        customer_id=profile.customer_id,
        model_version=SCORING_ENGINE_VERSION,
        profiling={
            "financial_health": profile.financial_health,
            "risk_bucket": profile.risk_bucket,
            "investor_readiness": profile.investor_readiness,
            "lifestyle_segment": profile.lifestyle_segment,
            "context_signals": profile.context_signals,
            "family_context": profile.family_context,
            "investment_gap": profile.investment_gap,
            "inflation_exposed": profile.inflation_exposed,
            "eligible_pr020": profile.eligible,
        },
        features_snapshot=features_snapshot or {},  # Art. 12 — raw input snapshot
        compliance=compliance_log,
        recommendations=audit_recs,
        llm_used=llm_was_used,                      # Section 6 — LLM usage flag
        llm_model=MODEL_ID if llm_was_used else None,
    )

    return scored_products, audit
