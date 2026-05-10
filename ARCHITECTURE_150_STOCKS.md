# Architecture Plan — 150-Stock Backend

**Date:** May 2026  
**Current state:** 12 stocks, single-file HTML app, all data hardcoded  
**Target:** 150 stocks with live signals, scalable backend, user accounts

---

## The Problem at Scale

At 12 stocks, hardcoding TICKER_DATA, LAYER_DATA, SCORES, and CHAIN_GRAPH in `index.html` works. At 150 stocks it breaks in three ways:

1. **File size.** Each stock adds ~8KB of hardcoded data. 150 stocks = ~1.2MB inline JS. Page load becomes unusable on mobile.
2. **API rate limits.** Finnhub free tier = 60 req/min. 150 stocks × 5 API calls each = 750 calls per user session. At 100 concurrent users, this collapses immediately.
3. **Data freshness.** Manually updating TICKER_DATA for 150 stocks is untenable. Scores drift stale. Users lose trust.

---

## Target Architecture

```
User Browser
    │
    ▼
Vercel Edge (index.html — static, ~50KB)
    │
    ▼
Vercel Serverless API  (/api/stock, /api/scores, /api/chain)
    │
    ├── Upstash Redis (cache layer — 2hr TTL per ticker)
    │
    └── Finnhub + Twelvedata (upstream APIs — called server-side only)
```

The single-file app becomes a thin shell. All data moves to the API layer.

---

## System 1: Data Ingestion (Nightly Jobs)

Run as Vercel cron jobs (or GitHub Actions on a schedule).

### What gets refreshed nightly
- **Prices + technicals** — Finnhub `stock/candle`, `quote`
- **Insider transactions** — Finnhub `stock/insider-transactions` (Form 4 filings)
- **Analyst estimates** — Finnhub `stock/recommendation`, `stock/price-target`
- **News** — Finnhub `company-news` (past 7 days)
- **Financial metrics** — Finnhub `stock/metric` (P/E, revenue, margins)

### Signal score computation (server-side)
Move `computeLiveScore()` out of the browser and into a nightly batch job:
- L1 score: price/vol metrics from Finnhub
- L2 score: Form 4 insider cluster detection (buy cluster in past 30 days?)
- L3 score: analyst consensus + estimate revision direction
- L4 score: CHAIN_GRAPH upstream event detection (hardcoded lag logic, applied to live upstream data)
- L5 score: FRED macro data (VIX, DXY, 10yr yield)

Output: one JSON blob per ticker, written to Redis. TTL = 23 hours.

### Why nightly and not real-time?
The core insight of the product is *daily signals*, not tick-by-tick noise. A retail investor opening the app at 7am needs yesterday's close plus any overnight events. Real-time would cost 10–50× more in API spend and give users false precision.

---

## System 2: Cache Layer (Upstash Redis)

Upstash is serverless Redis — pay per request, zero ops.

### Key structure
```
ticker:NVDA:data       → { price, stats, news, insider, revenue }   TTL 2h
ticker:NVDA:scores     → { total, L1, L2, L3, L4, L5 }             TTL 23h
ticker:NVDA:layer      → [ { id, name, pts, max, desc, signals[] } ] TTL 23h
chain:NVDA             → { upstream[], events[], windowStatus }      TTL 23h
scores:all             → { NVDA:78, ASML:91, AMD:31, ... }          TTL 1h
```

### Cache invalidation
- Prices: 2h TTL (short — user expects reasonably fresh)
- Scores/signals: 23h TTL (refreshed by nightly job)
- On nightly job completion: flush all ticker keys, repopulate

### Cost estimate (Upstash free tier)
- 10,000 requests/day free
- 150 tickers × ~8 reads/user × 100 daily users = 120,000 req/day
- Paid tier: $0.20 per 100,000 requests → ~$0.24/day at 100 users

---

## System 3: Serving Layer (Vercel Serverless)

Replace `api/fh.js` and `api/td.js` with proper stock API endpoints.

### New endpoints
```
GET /api/stock?ticker=NVDA
    → { name, price, change, stats, synopsis, news[], insider[], revenue[] }
    Source: Redis cache → Finnhub fallback

GET /api/scores
    → { NVDA:78, ASML:91, AMD:31, ... }  (all 150 tickers)
    Source: Redis (refreshed nightly)

GET /api/layer?ticker=NVDA
    → [ { id, pts, max, desc, signals[] } ]  (L1–L5 breakdown)
    Source: Redis (refreshed nightly)

GET /api/chain?ticker=NVDA
    → { upstream[], windowStatus, events[] }
    Source: Redis (refreshed nightly, events wired to SIGNAL_EVENTS logic)

GET /api/news?limit=20
    → Latest news across all covered tickers, sorted by date
    Source: Redis (nightly refresh)
```

### Rate limit handling (Finnhub)
- All Finnhub calls happen server-side in the nightly job only
- During nightly job: 150 tickers × 5 calls = 750 calls, spaced at 1.5s each = ~18 minutes
- During the day: all serving comes from Redis, zero Finnhub calls per user request
- Fallback: if Redis miss (new ticker added mid-day), call Finnhub once, cache result

---

## Frontend Changes

The app stays single-file HTML. Changes are minimal:

1. **Remove hardcoded data objects.** Delete TICKER_DATA, LAYER_DATA, SCORES, CHAIN_GRAPH from the HTML. These become ~400KB of removed JS.

2. **Add lazy-loading.** On `openTicker('NVDA')`, fetch `/api/stock?ticker=NVDA`. Show skeleton loader while waiting (< 200ms for Redis cache hit).

3. **Add scores on boot.** On app init, fetch `/api/scores` once. This gives all 150 scores in one request (~2KB JSON). Populate all score rings and sort cards.

4. **Keep SIGNAL_EVENTS logic in-browser.** The `computeWindowStatus()` and `refreshChainStatuses()` logic is pure JS using known dates — no API needed. Keep it.

5. **Remove user API key input.** The "Enter Finnhub API key" flow goes away. Users see live data immediately with no setup.

---

## Data Pipeline for 150 Stocks

Adding stocks at scale requires a structured process to maintain data quality.

### Stock record format (JSON, stored in /data/stocks/)
Each stock gets a file like `NVDA.json` containing:
```json
{
  "ticker": "NVDA",
  "name": "NVIDIA Corporation",
  "sector": "Semis",
  "synopsis": "...",
  "chainUpstream": ["TSM", "MSFT", "META", "GOOGL"],
  "chainDownstream": ["SMCI", "DELL", "CRWD", "ANET"],
  "signalEvents": [ { "upstream": "TSM", "date": "2026-01-15", "lagMin": 24, "lagMax": 36 } ],
  "upcomingCatalysts": [ { "date": "2026-05-22", "label": "Q1 2026 earnings" } ],
  "layerWeights": { "L1": 0.25, "L2": 0.35, "L3": 0.25, "L4": 0.10, "L5": 0.05 }
}
```

The nightly job reads these files and generates scores + layer data for each ticker. Signal events and catalyst dates are human-curated (they encode intelligence that APIs don't have).

### Expansion order (phased)
| Phase | Tickers | Total |
|-------|---------|-------|
| Current | NVDA, ASML, AMD, TSM, SMCI, META, MSFT, GOOGL, PLTR, RKLB, VST, CEG | 12 |
| Phase 2 | AMAT, LRCX, MU, ANET, CRWD, DELL, LMT, NOC, RTX | 21 |
| Phase 3 | AMZN, CRM, NOW, SNOW, OKLO, NEE, CEG, SMCI (expansion) | 29 |
| Phase 4 | Add 30 stocks/quarter | 150 by end of year |

Rule: never add a stock without wiring its supply chain. Each stock's L4 score requires upstream data — orphaned stocks score low and mislead users.

---

## Migration Path

### Step 1 — Set up Redis + endpoints (1 session)
- Create Upstash account, get Redis URL
- Build `/api/stock`, `/api/scores`, `/api/layer` with Redis cache + Finnhub fallback
- Keep hardcoded data as fallback during migration

### Step 2 — Move nightly job to Vercel cron (1 session)
- `vercel.json` cron: `{ "path": "/api/cron/refresh", "schedule": "0 6 * * *" }` (6am UTC)
- Cron hits all ticker APIs, computes scores, writes to Redis

### Step 3 — Remove hardcoded data from HTML (1 session)
- Strip TICKER_DATA, LAYER_DATA, SCORES from index.html
- Add fetch calls with skeleton loaders
- Validate on 12 existing tickers before expanding

### Step 4 — Add user accounts (behind Google login)
- Vercel KV or Supabase for user watchlists
- "My Intel" tab becomes personalized
- Gate premium features (real-time alerts, full 150-stock access)

---

## Cost at 1,000 Daily Active Users

| Service | Free tier | Paid at 1K DAU |
|---------|-----------|----------------|
| Vercel serverless | 100GB bandwidth | ~$20/mo (Pro) |
| Upstash Redis | 10K req/day | ~$2.40/day → $72/mo |
| Finnhub | 60 req/min | API key: $79/mo (Growth) |
| Twelvedata | 800 req/day | API key: $29/mo |
| **Total** | | **~$200/mo** |

At 1,000 users × $10/mo subscription = $10,000 MRR → infrastructure is ~2% of revenue.

---

## What Not to Build Yet

- Real-time WebSocket price updates (overkill for a daily-signals product)
- ML-based score generation (LAYER_DATA logic is the moat; black-box models erode trust)
- Mobile app (PWA from the browser is sufficient; saves 3–6 months)
- Self-hosted servers (Vercel + Upstash is fine to 10K users)

---

## Decision Trigger: When to Start

Start this migration when **any** of these happen:
1. App coverage exceeds 30 stocks (file size > 500KB degraded mobile load)
2. User count exceeds 50 concurrent (API rate limits start getting hit)
3. First paid user signs up (server-side keys are required to hide API credentials)

Current position: approaching trigger #1 (12 stocks, ~600KB file). **Recommend starting Step 1 (Redis + endpoints) in the next 2–3 sessions while the file is still manageable.**
