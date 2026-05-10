# Trading Intelligence — CLAUDE.md

## What We're Building

**"Everything Is Just One Click Away"** — a market intelligence platform for retail investors who want institutional-grade signals without a Bloomberg terminal.

The core insight: hedge funds read signals (insider clusters, dark pool prints, options flow, supply chain shifts) hours or days before they reach headlines. We translate those signals into plain English, scored 0–100, updated daily. One stock. Everything filters to it. One decision every morning.

**Long-term target: 1 million users.** This is a real product, not a demo. Every decision should be made with that scale in mind — architecture, UX, data quality, and the trust it takes to get someone to act on what we show them.

---

## The Three Things That Make This Different

1. **5-layer convergence score** — market structure (L1) + insider/regulatory (L2) + corporate intel (L3) + supply chain (L4) + macro/structural (L5) rolled into one 0–100 number. No retail tool does this.

2. **Supply chain as a signal** — upstream companies are leading indicators. TSMC capex → ASML order intake 2 quarters out. NVDA datacenter revenue → SMCI earnings 2–4 weeks out. This lag-based intelligence is genuinely novel for retail investors.

3. **Focus-first UX** — one stock, and everything in the entire app filters to it simultaneously. No noise from tickers you don't care about right now.

---

## Architecture

- **Single-file HTML app** — `index.html` (~370KB). No build step. All CSS and JS inline.
- **Vercel deployment** — `https://www.everythingisjustoneclickaway.com` (also `trading-intelligence-eta.vercel.app`)
- **GitHub** — `github.com/jaronguggenheim-arch/trading-intelligence` (main branch = production)
- **API proxy** — Vercel serverless functions: `api/fh.js` (Finnhub), `api/td.js` (Twelvedata). Routes through proxy on Vercel, direct with user key locally.
- **APIs in use** — Finnhub (news, financials, insider), Twelvedata (price, chart), EDGAR (SEC filings), SAM.gov (government contracts), FRED (macro)
- **State** — `S` object in localStorage. `S.focusTicker` = the currently focused stock.
- **Tab switching** — `gT(n, btn)` with per-tab init hooks
- **Stock modal** — `window._tkSym` = current ticker open in modal

### Key Data Structures (currently hardcoded → being made dynamic)
- `TICKER_DATA` — price/stats/news/insider/revenue per ticker
- `SCORES` — signal scores per ticker
- `LAYER_DATA` — 5-layer signal data per ticker
- `CHAIN_GRAPH` — supply chain relationships: upstream ticker, metric, lag in weeks, direction

### Deploy process
Push to `main` on GitHub → Vercel auto-deploys. To update `index.html`, either push via git or use the GitHub Contents API (base64 PUT to `/contents/index.html`).

---

## Design Principles — Non-Negotiable

### 1. Everything is clickable with something real behind it
Every signal card, score badge, news headline, ticker mention, supply chain node, insider name, analyst name, chart label — if it's visible, it must be clickable and open something meaningful. Before shipping any feature, audit every element. No dead UI.

### 2. Depth before breadth
We add stocks one at a time, but each new stock arrives with its full correlated network. If we add SMCI, NVDA and TSM come with it — because without them, SMCI's supply chain signal is hollow. A stock with real intelligence beats 10 stocks with placeholder data.

### 3. Plain English over jargon
Signal cards should read like a colleague explaining a trade, not a Bloomberg terminal. "3 ASML executives bought $2.4M this week — rare and historically bullish" beats "L2 insider cluster detected, bullish divergence."

### 4. Mobile-first consideration
The target user has a day job. They open this on their phone at 7am. Every layout decision should work at 390px width.

### 5. Morning Brief is the front door
This is what users open every morning. Articles must be substantive — real body content, not just headlines. The Sage Mode pick should be one clear decision with two sentences explaining why.

---

## Current Stock Coverage (5 stocks)

ASML, NVDA, PLTR, RKLB, AMD

Supply chain relationships wired: ASML ← TSM, NVDA ← TSM, SMCI ← NVDA (partial)

---

## Expansion Strategy

**Add one cluster at a time, never orphan a stock.**

Each new "anchor stock" we add must come with all the upstream/downstream stocks needed to make its L4 supply chain signal real. The chain relationships are what make this app different — don't add tickers without wiring the chain.

Target sectors for expansion:
- Semiconductors (TSM, SMCI, AMAT, LRCX)
- AI infrastructure (META, MSFT, GOOGL, AMZN — as hyperscaler capex signals)
- Defense/space (LMT, NOC, RTX, RKLB already in)
- Energy infrastructure (VST, CEG, NEE — power demand from AI)
- Enterprise software (CRM, NOW, SNOW)

**Upstream signal stocks to always track** (even if not featured): TSM, MSFT, GOOGL, AMZN, META. Their capex and revenue drive signals for ~80% of everything else.

---

## Roadmap

### Now (next sessions)
- [ ] Morning Brief: longer articles with real body content
- [ ] Full clickability audit — everything visible must open something
- [ ] Add first new cluster (pick anchor stock + its chain network)
- [ ] Wire `CHAIN_GRAPH` dynamic signals for all existing stocks
- [ ] Make `SCORES` dynamic from live Finnhub data (not hardcoded)

### Near term
- [ ] Expand to 20–30 stocks across 3–4 sectors
- [ ] Correlation Map redesign for scale (sector heatmap, not 5-ticker matrix)
- [ ] Architecture plan for 150-stock backend (caching, rate limiting)

### Long term
- [ ] My Intel behind Google login — personalized watchlist, saved signals, portfolio tracking
- [ ] Switch from user-supplied API keys to server-side proxy (once 150 stocks live + product polished)
- [ ] Freemium model — free tier (5 stocks, delayed signals), paid tier (full coverage, live signals)
- [ ] 1 million users

---

## Files

```
index.html          — the entire app (single file)
api/fh.js           — Finnhub proxy (Vercel serverless)
api/td.js           — Twelvedata proxy (Vercel serverless)
vercel.json         — Vercel config (framework: null, no build step)
.gitignore
CLAUDE.md           — this file
```

---

## What Success Looks Like

A retail investor opens the app at 7am, sees one high-conviction opportunity explained in two sentences, understands exactly why it's interesting, and can click into any piece of evidence behind it. They don't need to open another tab. They don't need to know what a gamma squeeze is. They make one call and go to work.

At 1 million users, this is the Bloomberg Terminal for people with a day job.
