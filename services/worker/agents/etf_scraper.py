"""Scrape top-performing ETFs over the last 6 months using yfinance."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import yfinance as yf

logger = logging.getLogger(__name__)

# Popular European-listed ETFs (UCITS) tracked on major exchanges.
# Tickers use Yahoo Finance format.
ETF_UNIVERSE: list[dict[str, str]] = [
    {"ticker": "IWDA.AS", "name": "iShares Core MSCI World"},
    {"ticker": "VUSA.AS", "name": "Vanguard S&P 500"},
    {"ticker": "CSPX.AS", "name": "iShares Core S&P 500"},
    {"ticker": "EUNL.DE", "name": "iShares Core MSCI World (DE)"},
    {"ticker": "SXR8.DE", "name": "iShares Core S&P 500 (DE)"},
    {"ticker": "VWCE.DE", "name": "Vanguard FTSE All-World"},
    {"ticker": "SXRV.DE", "name": "iShares Nasdaq 100"},
    {"ticker": "IS3N.DE", "name": "iShares Core MSCI EM IMI"},
    {"ticker": "XDWD.DE", "name": "Xtrackers MSCI World"},
    {"ticker": "CEU.PA", "name": "Amundi MSCI Europe"},
    {"ticker": "MEUD.PA", "name": "Amundi STOXX Europe 600"},
    {"ticker": "PANX.DE", "name": "Amundi Nasdaq 100"},
    {"ticker": "EXSA.DE", "name": "iShares STOXX Europe 600"},
    {"ticker": "DBXD.DE", "name": "Xtrackers DAX"},
    {"ticker": "IUSQ.DE", "name": "iShares MSCI ACWI"},
]

INVESTMENT_AMOUNT = 1000.0  # EUR


@dataclass
class ETFResult:
    """One ETF's 6-month performance summary."""

    ticker: str
    name: str
    return_pct: float  # e.g. 14.2 means +14.2%
    gain_eur: float    # hypothetical gain on INVESTMENT_AMOUNT


def fetch_top_etfs(top_n: int = 5) -> list[ETFResult]:
    """Return the top N ETFs by 6-month return from ETF_UNIVERSE.

    Uses yfinance to pull 6-month price history. ETFs that fail to
    download are silently skipped.
    """
    results: list[ETFResult] = []

    tickers_str = " ".join(e["ticker"] for e in ETF_UNIVERSE)
    logger.info("Downloading 6-month history for %d ETFs...", len(ETF_UNIVERSE))

    data = yf.download(tickers_str, period="6mo", interval="1d", group_by="ticker", progress=False)

    for etf in ETF_UNIVERSE:
        ticker = etf["ticker"]
        try:
            if len(ETF_UNIVERSE) == 1:
                close = data["Close"]
            else:
                close = data[ticker]["Close"]

            close = close.dropna()
            if len(close) < 2:
                logger.warning("Not enough data for %s, skipping.", ticker)
                continue

            start_price = close.iloc[0]
            end_price = close.iloc[-1]
            return_pct = round(((end_price - start_price) / start_price) * 100, 2)
            gain_eur = round(INVESTMENT_AMOUNT * (return_pct / 100), 2)

            results.append(ETFResult(
                ticker=ticker,
                name=etf["name"],
                return_pct=return_pct,
                gain_eur=gain_eur,
            ))
        except (KeyError, IndexError, TypeError) as exc:
            logger.warning("Failed to process %s: %s", ticker, exc)
            continue

    results.sort(key=lambda r: r.return_pct, reverse=True)
    top = results[:top_n]
    logger.info("Top %d ETFs: %s", top_n, [(r.ticker, r.return_pct) for r in top])
    return top
