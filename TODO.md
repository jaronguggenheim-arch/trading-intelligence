# Trading Intelligence — To-Do List
*Last updated: May 7, 2026 · v7.2 baseline*

---

## 🌿 SAGE MODE — Top Priority
*A friendly, jargon-free daily flow for easy use — one screen, one decision.*

- [ ] **Sage Mode tab** — Add a "Sage" tab (or home page toggle) that strips the platform down to: Today's top pick, one-line plain-English reason, one green "I'm in" button and one gray "Skip today" button. No scores, no chains — just the verdict.
- [ ] **Plain-English signal summaries** — For each signal, auto-generate a 1-sentence "what this means for me" translation. E.g. "3 ASML executives bought with their own money this week — that's rare and usually bullish."
- [ ] **Daily decision card** — A single card at the top of Morning Brief that says: "Today's action: Buy $350 of ASML. Here's why in 2 sentences. Tap to execute or skip." Removes decision fatigue.
- [ ] **Guided onboarding tour** — First-time walkthrough: 5 tooltips showing what each tab does, dismissible, re-accessible from a "?" button in header.
- [ ] **Sage summary push notification** — Daily 8am alert: "Signal score changed for NVDA. Tap to see today's action." (Push via browser notifications API)

---

## 📈 Charts

- [ ] **Cursor price indicator on charts** ← in progress
- [ ] **Deep Edge cards are not clickable / no deeper info** — Each Deep Edge signal card (dark pool, GEX, estimate revisions, SEC filings) should be clickable and open a deeper detail view: show the full breakdown, link to source (SEC EDGAR, Unusual Whales, etc.), and route to the relevant ticker page. Currently all cards have `sc-na` (non-clickable) class.
- [ ] **Earnings Playbook blocks not clickable** — Each earnings card section (NVDA, ASML, AMD, META) should be clickable with expandable detail: show the full signal stack, how to act, and a direct link to open the ticker page. Key metrics and strategy boxes should be interactive, not just static. — When hovering over any price chart (ticker pages + instrument detail pages), show a vertical crosshair line that tracks the mouse, with a price label on the Y-axis and a date label on the X-axis. Display the OHLC or close price in the chart summary bar as the cursor moves. Snap to nearest data point on mouse leave to show last known value.

---

## 📱 Mobile & UX Polish

- [ ] **Mobile layout pass** — Navigation tabs scroll horizontally but some cards break on small screens. Add responsive breakpoints for cards (grid-template-columns: 1fr on mobile)
- [ ] **Dark/light mode toggle** — Add a ☀️/🌙 button to header. Many users prefer light mode during daytime.
- [ ] **Sticky allocation bar** — Show a slim persistent bar at the bottom of screen: "This week: ASML $350 · NVDA $250 · RKLB $200" — always visible regardless of active tab.
- [ ] **Keyboard shortcuts** — Press `M` for Morning Brief, `S` for Signal Scores, `W` for Watchlist, etc.
- [ ] **Swipe between tabs** on mobile (touch gesture support)

---

## 📊 Data & Live Feeds

- [ ] **Alpha Vantage auto-refresh** — Currently charts load on demand. Add a 60-second auto-refresh for header ticker prices and a "last updated" timestamp.
- [ ] **News feed per ticker** — On each ticker page, pull live headlines from a free news API (e.g. Finnhub free tier). Show last 5 headlines with sentiment badge (bullish/bearish/neutral).
- [ ] **Earnings calendar integration** — Pull upcoming earnings from a free API (earningswhispers or similar). Show countdown timer per ticker: "NVDA earnings in 15 days."
- [ ] **Options flow live alert** — When a new large call sweep is detected (via manual entry or webhook), flash a banner notification at the top of the screen. Store in an "Alerts log."
- [ ] **SEC Form 4 feed** — Add a panel in Smart Money that shows the last 10 insider filings across all watchlist tickers. Auto-highlight cluster buys.

---

## 🤖 AI & Intelligence

- [ ] **AI Morning Brief generator** — Add a "Regenerate brief" button that calls Claude/GPT API with today's market data and outputs a fresh 3-paragraph morning summary in plain English.
- [ ] **Signal score explainer** — When user taps a score pill (e.g. "91"), show a breakdown modal: "Insider cluster adds 35 pts · Analyst upgrade adds 20 pts · Dark pool adds 22 pts · Options flow adds 14 pts."
- [ ] **Custom signal weighting** — Let the user drag sliders to adjust how much weight they give to each signal type (insider, analyst, dark pool, options). Recalculates scores live.
- [ ] **Thesis invalidation alerts** — For each position, define a "thesis-break" condition (e.g. "ASML order book cuts"). Alert user when that condition is met.

---

## 💼 Portfolio & Trading

- [ ] **Interactive Brokers paper trading API** — Already noted as "Cowork Session 4." Wire up the IBKR paper trading API so Mirror sends real paper orders.
- [ ] **Position sizing calculator** — Modal that asks: "How much risk per trade?" and calculates exact share count based on portfolio size, signal score, and stop-loss level.
- [ ] **Trade journal** — Per-position notes field. After selling, prompt: "What went right/wrong?" Store locally. Add a "Journal" tab to review past decisions.
- [ ] **P&L history chart** — Visual chart of portfolio value over time (line chart, stored in localStorage).
- [ ] **Export portfolio to CSV** — "Download report" button generates a CSV of positions, cost basis, P&L, and why tags.
- [ ] **Alert when score drops** — If a held position's signal score drops below a threshold (e.g. from 91 to below 50), surface a warning banner on next visit.

---

## 🗓️ Calendar & Planning

- [ ] **Economic calendar tab** — Fed meetings, CPI dates, jobs reports. Color-coded by expected market impact. Pull from FRED or a free economic data API.
- [ ] **Personal trading schedule** — Let user set "I review my portfolio every Monday" and get a reminder summary email/notification.
- [ ] **Earnings countdown on Morning Brief** — Below the signal score header, show a compact row: "Next earnings: NVDA in 15d · ASML in 70d · AMD in 84d"

---

## 🔒 Security & Settings

- [ ] **PIN reset flow** — Currently no way to reset PIN if forgotten. Add a "Forgot PIN" that clears via a confirmation step.
- [ ] **Settings tab** — Consolidate: API key, PIN, budget default, notification preferences, color theme.
- [ ] **Data export / import** — Let user download a full JSON backup of their portfolio, watchlist, and settings. And import it on a new device.
- [ ] **Session timeout** — Auto-lock Portfolio/Autobuy tabs after 30 minutes of inactivity (re-requires PIN).

---

## 🧪 Nice to Have

- [ ] **Backtesting tab** — "If I had followed signal scores in the past 6 months, what would my return be?" Simple historical simulation using stored signal logic.
- [ ] **Community sentiment** — Show a simple thumbs up/down poll per signal card: "Do you agree with this signal?" Display aggregate community conviction.
- [ ] **Ticker comparison** — Side-by-side comparison of two tickers (charts, scores, revenue segments, insider activity).
- [ ] **Crypto deep edge** — Extend the Deep Edge tab to include on-chain signals: whale wallet moves, exchange inflows/outflows for BTC/ETH.

---

## ✅ Recently Completed (v7.2)
- [x] Correlation Map with full supplier chain intelligence
- [x] Sector drill-down from heat map cells
- [x] PIN-protected Portfolio + Autobuy tabs
- [x] Alpha Vantage chart integration
- [x] Paper trading mode
- [x] Copy Trade with Mirror functionality
- [x] Signal score convergence tab
- [x] Global markets panel (indices, FX, yields, commodities, crypto)
- [x] Earnings Playbook with pre-earnings strategy cards
