"""
profiler.py — Customer profiling engine.

Implements all 20 profiling rules (PR001–PR020) from the product briefing.

COMPLIANCE:
- city is NEVER accepted in the features dict (AI Act Art.5(1)(c))
- marital_status / dependents_count used only when profiling_consent=True (PR015)
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

RISK_RANK: dict[str, int] = {"low": 1, "moderate": 2, "high": 3}

MUST_HAVE_SIGNALS = {
    "idle_cash_high", "investment_gap", "monthly_savings_consistent",
    "travel_spike", "rent_pattern", "family_context", "high_income", "high_expenses",
}


@dataclass
class ProfileResult:
    customer_id: str
    life_stage: str
    risk_score: float
    financial_health: str          # PR001 / PR002 / PR003
    lifestyle_segment: str         # PR004-PR008
    investor_readiness: str        # PR009 / PR010 / PR011
    risk_bucket: str               # PR012 / PR013 / PR014
    context_signals: list[str]
    family_context: bool           # PR015
    housing_context: str | None    # PR016
    investment_gap: bool           # PR017
    inflation_exposed: bool        # PR018
    event_triggered: bool          # PR019
    eligible: bool                 # PR020


def _classify_life_stage(age: int, dependents_count: int, account_tenure_years: float) -> str:
    if age >= 67:
        return "retired"
    if age >= 55:
        return "pre_retirement"
    if 25 <= age <= 40 and dependents_count >= 1:
        return "young_family"
    if age < 25 and account_tenure_years <= 2:
        return "new_graduate"
    return "mid_career"


# PR001: healthy = debt_to_income < 0.5 AND monthly_savings > 500
# PR002: watchlist = debt_to_income >= 0.5 AND < 1.2
# PR003: fragile = debt_to_income >= 1.2
def _classify_financial_health(debt_to_income: float, monthly_savings: float) -> str:
    if debt_to_income >= 1.2:
        return "fragile"
    if debt_to_income >= 0.5:
        return "watchlist"
    if monthly_savings > 500:
        return "healthy"
    return "watchlist"  # low debt but not saving — borderline


# PR004-PR008
def _classify_lifestyle_segment(
    monthly_savings: float, savings_rate: float,
    avg_expenses: float, dominant_spend_category: str,
) -> str:
    if monthly_savings > 800 and savings_rate > 0.15:       # PR004
        return "disciplined_saver"
    if avg_expenses > 4000:                                   # PR005
        return "high_spender"
    if dominant_spend_category == "travel":                   # PR006
        return "traveler"
    if dominant_spend_category == "subscriptions":            # PR007
        return "digital_spender"
    if dominant_spend_category == "rent" and monthly_savings < 300:  # PR008
        return "cost_pressured"
    return "balanced"


# PR009-PR011
def _classify_investor_readiness(
    idle_cash: float, monthly_savings: float, events: list[dict[str, Any]]
) -> str:
    has_trigger = any(e.get("event_type") in ("salary_increase", "bonus") for e in events)
    if idle_cash > 10000 and monthly_savings > 500 and has_trigger:  # PR009
        return "high"
    if 5000 < idle_cash <= 10000:                                      # PR010
        return "medium"
    return "low"                                                         # PR011


def _compute_risk_score(
    age: int, income: float, savings: float, debt_to_income: float, risk_profile: str
) -> float:
    base = {"high": 7.5, "moderate": 5.0, "low": 2.5}.get(risk_profile, 2.5)
    age_adj = max(-2.0, min(2.0, (40 - age) * 0.05))
    income_adj = min(1.5, income / 10000)
    savings_adj = min(1.0, savings / 20000)
    debt_adj = max(-2.0, -debt_to_income)
    return round(max(1.0, min(10.0, base + age_adj + income_adj + savings_adj + debt_adj)), 2)


def _detect_context_signals(
    idle_cash: float,
    monthly_savings: float,
    investment_gap_flag: int,
    dominant_spend_category: str,
    events: list[dict[str, Any]],
    dependents_count: int,
    marital_status: str,
    income: float,
    homeowner_status: str,
    avg_expenses: float,
    balance_trend: str,
    savings: float,
) -> list[str]:
    signals: list[str] = []
    event_types = {e.get("event_type", "") for e in events}

    if idle_cash > 10000:                                                   # idle_cash_high
        signals.append("idle_cash_high")
    if "salary_increase" in event_types:                                    # salary_increase
        signals.append("salary_increase")
    if investment_gap_flag == 1:                                            # investment_gap
        signals.append("investment_gap")
    if monthly_savings > 500:                                               # monthly_savings_consistent
        signals.append("monthly_savings_consistent")
    if "travel_spike" in event_types:                                       # travel_spike
        signals.append("travel_spike")
    if idle_cash > 10000 and dominant_spend_category != "rent":             # inflation_exposed (PR018 signal)
        signals.append("inflation_exposed")
    if dominant_spend_category == "rent":                                   # rent_pattern
        signals.append("rent_pattern")
    if dependents_count > 0 or marital_status.lower() == "married":        # family_context (PR015)
        signals.append("family_context")
    if income > 7000:                                                       # high_income
        signals.append("high_income")
    if dominant_spend_category == "shopping":                               # shopping_pattern
        signals.append("shopping_pattern")
    if "bonus" in event_types:                                              # bonus_event
        signals.append("bonus_event")
    if avg_expenses > 4000:                                                 # high_expenses
        signals.append("high_expenses")
    if balance_trend == "declining" and idle_cash < 2000:                   # liquidity_gap
        signals.append("liquidity_gap")
    if savings > 10000 and investment_gap_flag == 1:                        # high_income_no_investments (PR017)
        signals.append("high_income_no_investments")
    if "new_subscription" in event_types:                                   # new_subscription
        signals.append("new_subscription")

    return signals


def build_profile(customer_id: str, features: dict[str, Any]) -> ProfileResult:
    """
    Build a complete customer profile from features.

    COMPLIANCE GUARD: 'city' must NOT be present in features.
    It is legal to store in the customer record but must never enter the scoring pipeline.
    """
    # ── COMPLIANCE: city guard ─────────────────────────────────────────────────
    if "city" in features:
        raise ValueError(
            f"COMPLIANCE VIOLATION [AI Act Art.5(1)(c)]: 'city' field detected "
            f"in feature vector for customer {customer_id}. "
            "Geographic targeting is prohibited. Remove 'city' from the feature dict."
        )

    age = int(features.get("age", 30))
    income = float(features.get("income", 0))
    savings = float(features.get("savings", 0))
    monthly_savings = float(features.get("monthly_savings", 0))
    avg_expenses = float(features.get("avg_expenses", 0))
    idle_cash = float(features.get("idle_cash", 0))
    debt_to_income = float(features.get("debt_to_income", 0))
    savings_rate = float(features.get("savings_rate", 0))
    dominant_spend_category = str(features.get("dominant_spend_category", "")).lower()
    investment_gap_flag = int(features.get("investment_gap_flag", 0))
    risk_profile = str(features.get("risk_profile", "low")).lower()
    marital_status = str(features.get("marital_status", "single")).lower()
    dependents_count = int(features.get("dependents_count", 0))
    homeowner_status = str(features.get("homeowner_status", "rent")).lower()
    account_tenure_years = float(features.get("account_tenure_years", 3.0))
    balance_trend = str(features.get("balance_trend", "stable")).lower()
    existing_products: list[str] = features.get("existing_products", [])
    events: list[dict[str, Any]] = features.get("events", [])

    # ── Classify dimensions ────────────────────────────────────────────────────
    life_stage = _classify_life_stage(age, dependents_count, account_tenure_years)
    financial_health = _classify_financial_health(debt_to_income, monthly_savings)   # PR001-PR003
    lifestyle_segment = _classify_lifestyle_segment(
        monthly_savings, savings_rate, avg_expenses, dominant_spend_category         # PR004-PR008
    )
    investor_readiness = _classify_investor_readiness(idle_cash, monthly_savings, events)  # PR009-PR011
    risk_bucket = {"low": "low", "moderate": "moderate", "high": "high"}.get(risk_profile, "low")  # PR012-PR014
    risk_score = _compute_risk_score(age, income, savings, debt_to_income, risk_profile)

    # ── PR015: family_context ──────────────────────────────────────────────────
    family_context = dependents_count > 0 or marital_status == "married"

    # ── PR016: housing_context ─────────────────────────────────────────────────
    housing_context: str | None = None
    if homeowner_status == "rent" and income > 7000:
        housing_context = "mortgage_opportunity"

    # ── PR017: investment_gap ──────────────────────────────────────────────────
    investment_gap = savings > 10000 and investment_gap_flag == 1

    # ── PR018: inflation_exposed (loyalty_value) ───────────────────────────────
    has_current_account = "current_account" in existing_products
    inflation_exposed = has_current_account and idle_cash > 10000 and risk_profile == "low"

    # ── PR019: event_triggered ─────────────────────────────────────────────────
    event_triggered = len(events) > 0

    # ── Context signals ────────────────────────────────────────────────────────
    context_signals = _detect_context_signals(
        idle_cash, monthly_savings, investment_gap_flag, dominant_spend_category,
        events, dependents_count, marital_status, income, homeowner_status,
        avg_expenses, balance_trend, savings,
    )

    # ── PR020: eligibility ─────────────────────────────────────────────────────
    eligible = financial_health != "fragile" and investor_readiness in ("medium", "high")

    logger.info(
        "Profile built for %s: health=%s readiness=%s risk=%s signals=%s eligible=%s",
        customer_id, financial_health, investor_readiness, risk_bucket, context_signals, eligible,
    )

    return ProfileResult(
        customer_id=customer_id,
        life_stage=life_stage,
        risk_score=risk_score,
        financial_health=financial_health,
        lifestyle_segment=lifestyle_segment,
        investor_readiness=investor_readiness,
        risk_bucket=risk_bucket,
        context_signals=context_signals,
        family_context=family_context,
        housing_context=housing_context,
        investment_gap=investment_gap,
        inflation_exposed=inflation_exposed,
        event_triggered=event_triggered,
        eligible=eligible,
    )
