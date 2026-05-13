# Trading Intelligence — CLAUDE.md

## The Thesis

**The supply chain of markets moves before prices do.**

Upstream companies are leading indicators. TSMC capex rises → ASML order intake follows in 8 weeks. NVDA datacenter revenue beats → MU HBM demand accelerates in 6–10 weeks. Hyperscaler capex grows → DELL/HPE AI server backlog builds in 4–8 weeks. These lags are structural, measurable, and repeatable. No retail tool maps them and surfaces them as live, timestamped signals.

That gap is the product.

---

## What We Are

A **propagation intelligence platform**. We track where signals originate in the supply chain, how far they've traveled, and how much runway remains before the market fully prices them in.

Every feature exists to answer one question: **is the chain aligned right now, and is the window still open?**

We are not a news aggregator. Not a screener. Not a Bloomberg clone. Not a social trading app. We are the one tool that tells a retail investor — in plain English, before 8am — whether an upstream event that happened last week has finished propagating downstream or still has room to run.

---

## What We Are Not

- **Not a real-time trading terminal** — we surface intelligence, not execution. We tell users *when* to look, not *how* to trade.
- **Not a data dump** — 175 stocks, 5 signal layers, news, insider data, supply chain graphs. All of it is noise unless it serves the thesis. Features that don't contribute to chain intelligence are deprioritized.
- **Not a replacement for due diligence** — we are the morning filter. The first layer. The thing that narrows 175 stocks to 1 or 2 worth investigating today.

---

## The Feature Map — Every Tab Serves the Thesis

| Tab | What it does | Why it earns its place |
|---|---|---|
| **Morning Brief** | Daily synthesis — which chains fired, which windows are open, one Sage pick | Front door. Habit formation. Must be different and timestamped every morning. |
| **Convergence Score** | 5-layer score per stock — market structure, insider, corporate intel, supply chain, macro | The core intelligence product. Score + velocity (7-day trend) is more actionable than score alone. |
| **Supply Chain** | Visual map of upstream→downstream relationships with lag times and live status | The irreplaceable differentiator. No other retail tool has this. Must show which nodes just fired. |
| **Deep Edge** | Signal cards with real timestamps — insider clusters, analyst cascades, chain propagation events | Evidence layer. Every card is a data point for or against today's convergence score. |
| **News** | Filtered for upstream events — earnings beats, capex announcements, supply disruptions | Not general market news. Only news that could trigger or confirm a chain signal. |
| **Smart Money** | Insider buying before lag windows close — the highest-conviction chain confirmation signal | Insider buying *while* a supply chain window is open is historically the strongest combined signal. |
| **Sectors** | Which sectors have the most chains converging simultaneously | Useful for users who don't have a specific stock in mind. Entry point to the thesis. |
| **Earnings Calendar** | Upcoming anchor events that will open or close downstream lag windows | Forward-looking chain trigger map. Not a generic earnings list. |
| **Portfolio / My Intel** | Personal watchlist filtered through the chain lens | Personalization layer. Makes the thesis relevant to what the user already owns. |

---

## Architecture

- **Single-file HTML app** — `index.html` (~920KB). No build step. All CSS and JS inline.
  - *Architectural debt noted: needs a proper build pipeline before 50k users. Current structure is fast to iterate, slow to scale.*
- **Vercel deployment** — `https://www.everythingisjustoneclickaway.com` (also `trading-intelligence-eta.vercel.app`)
- **GitHub** — `github.com/jaronguggenheim-arch/trading-intelligence` (main branch = production)
- **API proxy** — Vercel serverless: `api/fh.js` (Finnhub), `api/td.js` (Twelvedata)
- **`IS_VERCEL`** = `window.location.protocol !== 'file:'` — proxy active on Vercel, direct key locally
- **APIs in use** — Finnhub (quotes, news, financials, insider), Twelvedata (price chart), EDGAR (Form 4), FRED (macro)
- **State** — `S` object in localStorage. `S.focusTicker` = currently focused stock.
- **Tab switching** — `gT(n, btn)` with per-tab init hooks
- **Stock modal** — `window._tkSym` = current ticker open in modal
- **Live cache** — `TICKER_LIVE_CACHE` (5-min TTL), `INSIDER_CACHE` (30-min TTL)
- **Server-side** — Nightly cron at `/api/scores` pre-computes signals → stores in Vercel KV → client reads KV on load

### Deploy process
**Always use GitHub Contents API** — git lock files block commits in the sandbox.
```python
import base64, json, urllib.request
TOKEN = "ghp_xxxx...xxxx"  # stored in local env, not committed
REPO  = "jaronguggenheim-arch/trading-intelligence"
# GET current SHA → PUT with base64-encoded content
```
Push to main → Vercel auto-deploys in ~30 seconds.

---

## Key Data Structures

| Structure | Status | Description |
|---|---|---|
| `TICKER_DATA` / `EDGAR_COMPANY_NAMES` | ✓ Live (175 stocks) | Fallback price/stats/verdicts. `fillTickerLive()` overrides on modal open. |
| `SCORES` | ✓ Partial live | Hardcoded base; L1 momentum overlaid from Finnhub via `initLiveScores()`. Nightly cron updates KV. |
| `LAYER_DATA` | ✓ 175 stocks | External file `data/layer_data.js`. 5-layer signal arrays. `window.LAYER_DATA`. |
| `CHAIN_GRAPH` | Hardcoded | External file `data/chain_graph.js`. Supply chain for anchor stocks. `window.CHAIN_GRAPH`. |
| `SECTOR_DATA` | ✓ 175 stocks | 10 sectors × all stocks for heatmap. |
| `_tickerStripTickers` | ✓ 175 stocks | Drives live scrolling strip. First 40 get live Finnhub prices on Vercel. |
| `OUR_TICKERS` | ✓ Focus bar | The stocks users can focus on via the focus bar. |

---

## Stock Coverage — 175 Stocks

**Core AI/Semi cluster (30):** NVDA, ASML, AMD, TSM, SMCI, AVGO, MRVL, INTC, AMAT, LRCX, MU, KLAC, ENTG, TER, MKSI, ONTO, ARM, QCOM, ON, SNDK, MCHP, TXN, MPWR, ADI, NXPI, WOLF, ANET, PSTG, NTAP, WDC

**Hyperscaler/Cloud (15):** META, MSFT, GOOGL, AMZN, ORCL, NET, DELL, HPE, CRM, NOW, SNOW, WDAY, ADBE, HUBS, CFLT

**AI/Platform (10):** PLTR, APP, DDOG, MDB, ZS, ESTC, NFLX, TSLA, SHOP, RBLX

**Energy/Power (17):** VST, CEG, GEV, NEE, ETN, PWR, OKLO, CCJ, UEC, XOM, FSLR, ENPH, VRT, ALB, SQM, LTHM, CHPT

**Defense/Space (10):** LMT, NOC, RTX, GD, LHX, RKLB, KTOS, LDOS, BA, SAIC, HII, GE

**Fintech (15):** COIN, V, MA, PYPL, SQ, HOOD, JPM, GS, INTU, SOFI, AFRM, NU, MELI, SE, FLUT

**Biotech/Health (15):** LLY, ABBV, MRK, UNH, HIMS, MRNA, REGN, DXCM, ISRG, VEEV, RXRX, AMGN, TDOC, ILMN, BNTX

**Consumer (20):** AAPL, WMT, COST, NKE, SBUX, TGT, CVNA, TSLA, UBER, SPOT, ABNB, DIS, ROKU, SNAP, PINS, ZM, NIO, XPEV, F, GM

**GrowthTech/Other (20+):** ACHR, PDD, CSCO, HON, IBM, SAP, BABA, AXON, GTLB, TWLO, UPST, LMND, DUOL, IONQ, SOUN, MNDY, TOST, BILL, PATH, TTD

**Supply chain clusters wired in CHAIN_GRAPH:**
- AI silicon: NVDA → TSM, SMCI, MU, AMAT, LRCX, ASML, KLAC
- Hyperscaler capex: META/MSFT/GOOGL/AMZN → NVDA, AVGO, ORCL, NET, DELL, HPE
- Power demand: AI datacenters → VST, CEG, GEV, NEE, ETN, PWR, OKLO, CCJ, UEC
- Defense electronics: LMT, NOC, RTX, GD, LHX, RKLB, GE
- Enterprise software: CRM, NOW, SNOW, WDAY, ADBE, ORCL, NET

---

## Design Principles — Non-Negotiable

### 1. Every feature serves the propagation thesis
Before building anything, ask: does this help the user know whether a chain signal has fired, how far it has traveled, and whether the window is still open? If not, it doesn't ship.

### 2. Foresight over reaction
Every signal tells the user something that is not yet fully priced in. Never surface information that is already priced in without explicitly contextualizing the remaining lead-lag. "TSMC reported strong capex 6 weeks ago — ASML enters the historical window next week" is foresight. "NVDA is up today" is noise.

### 3. Timestamps on everything
Any signal card, score, or event that claims to be current must show exactly when it was computed or fetched. A timestamp missing = a trust failure. Stale signals presented as live destroy the product faster than any competitor could.

### 4. Plain English, always
"3 ASML executives bought $2.4M this week — rare, and historically bullish. The supply chain window from TSMC's capex report is also open" is the target. "L2 insider cluster detected, bullish divergence" is a failure. If a user needs to Google a term to understand the signal, the signal failed.

### 5. Everything clickable, everything real
Every visible element — score badge, signal card, ticker mention, supply chain node, insider name, chain arrow — must be clickable and open something meaningful. No decorative UI.

### 6. Mobile-first, 7am use case
The target user is on their phone before work. One clear decision, two sentences of why, everything behind it one tap away. Every layout decision must work at 390px. The Morning Brief must be readable in under 2 minutes.

### 7. Velocity over magnitude
A score moving from 52→71 in 7 days is more actionable than a score sitting at 78. Show the direction of travel, not just the position. Trend arrows and score deltas are first-class information.

---

## What Success Looks Like

A retail investor opens the app at 7am. The Morning Brief shows one stock — not because it is trending on X, but because TSMC reported strong capex guidance 6 weeks ago and the historical lag window is now active. Three analysts upgraded the downstream stock this week. An executive bought $1.2M of shares yesterday. The convergence score moved from 61 to 74 in 5 days.

The user reads two sentences. Taps through to the supply chain view. Sees the chain lit up in sequence: TSMC → event → lag counter → this stock. Checks the insider tab. Makes one decision before their commute.

They did not open Yahoo Finance. They did not open EDGAR. They did not open a Bloomberg terminal. They had everything — timestamped, sourced, contextualized — in one place.

That is the product. At 1 million users, it becomes the Bloomberg Terminal for people with a day job, who trade with conviction rather than noise.

---

## The Track Record Imperative

The single highest-leverage thing we can build — worth more than all UX polish combined — is a **published signal backtest**.

Format: "The TSMC capex → ASML lag signal has fired 8 times since 2020. ASML outperformed SPY by an average of 11.2% in the subsequent 6–8 week window. It fired again last Tuesday."

This single data point transforms the product from "interesting dashboard" to "evidence-based intelligence." It is the foundation of paid conversion, press coverage, and word-of-mouth growth. Nothing else on the roadmap matters as much.

---

## Files

```
index.html              — entire app (~920KB, single file, no build step)
api/fh.js               — Finnhub proxy (Vercel serverless)
api/td.js               — Twelvedata proxy (Vercel serverless)
api/scores.js           — Nightly cron: compute scores → store in Vercel KV
api/markets.js          — Live index prices for market overview
api/funds.js            — Hedge fund 13F positions
api/insider.js          — EDGAR Form 4 server-side fetch
api/alerts.js           — Price and score alert system
vercel.json             — Vercel config (framework: null)
data/layer_data.js      — LAYER_DATA for all 175 stocks (window.LAYER_DATA)
data/chain_graph.js     — Supply chain relationships (window.CHAIN_GRAPH)
CLAUDE.md               — this file
```
