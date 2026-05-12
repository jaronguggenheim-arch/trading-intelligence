// api/scores.js — Nightly server-side score computation
// Vercel cron: runs at 02:00 UTC daily (10pm ET, before market open)
// GET /api/scores  → returns latest pre-computed score snapshot from KV
// POST/cron        → fetches live data for all 150 stocks, computes real 5-component
//                    scores (L1 momentum + L2 insider + L3 analyst + L4 chain + L5 macro),
//                    generates 3 plain-English signal sentences per stock via Claude Haiku,
//                    writes everything to KV.
//
// Requires env vars: FH_KEY, KV_REST_API_URL, KV_REST_API_TOKEN
// Optional:          ANTHROPIC_API_KEY (enables Claude narrative generation)

export const config = { schedule: '0 2 * * *' };

// ── All 150 tracked stocks ────────────────────────────────────────────────────
const ALL_TICKERS = [
  'NVDA','ASML','AMD','RKLB','PLTR','TSM','SMCI','META','MSFT','GOOGL',
  'VST','CEG','AMAT','LRCX','MU','LMT','NOC','RTX','CRM','NOW','SNOW',
  'CCJ','UEC','AMZN','ARM','QCOM','AAPL','PANW','CRWD','GEV',
  'AVGO','MRVL','INTC','DELL','ORCL','NET','NEE','ETN','PWR','OKLO',
  'GD','LHX','ADBE','TSLA','NFLX','APP','ON','HPE','WDAY','COIN',
  'KLAC','ENTG','TER','MKSI','ONTO','V','MA','PYPL','SQ','HOOD',
  'DDOG','MDB','ZS','ESTC','S','OKTA','FTNT','CYBR','HUBS','SHOP',
  'TTD','PATH','CFLT','MCHP','TXN','MPWR','ADI','NXPI','FSLR','ENPH',
  'WOLF','RIVN','ANET','PSTG','NTAP','WDC','ISRG','VEEV','RXRX','AMGN',
  'UBER','SPOT','ABNB','DIS','AXON','GTLB','TWLO','SOFI','AFRM','NU',
  'MRNA','REGN','DXCM','TDOC','ILMN',
  'ALB','SQM','LTHM','CHPT','BLNK',
  'BILL','ZI','MNDY','TOST','SMAR',
  'FORM','ACMR','CAMT','IPGP','POWI',
  'SOUN','AISP','IONQ','DUOL','RBLX',
  'EQIX','DLR','AMT','IRM','VRT',
  'KTOS','LDOS','BA','SAIC','HII',
  'NIO','XPEV','LCID','F','GM',
  'ROKU','SNAP','PINS','ZM','NTNX',
  'MELI','SE','FLUT','UPST','LMND'
];

const NAMES = {
  NVDA:'NVIDIA',ASML:'ASML Holding',AMD:'AMD',RKLB:'Rocket Lab',PLTR:'Palantir',
  TSM:'Taiwan Semi',SMCI:'Super Micro',META:'Meta',MSFT:'Microsoft',GOOGL:'Alphabet',
  VST:'Vistra',CEG:'Constellation Energy',AMAT:'Applied Materials',LRCX:'Lam Research',
  MU:'Micron',LMT:'Lockheed Martin',NOC:'Northrop Grumman',RTX:'RTX Corp',
  CRM:'Salesforce',NOW:'ServiceNow',SNOW:'Snowflake',CCJ:'Cameco',UEC:'Uranium Energy',
  AMZN:'Amazon',ARM:'Arm Holdings',QCOM:'Qualcomm',AAPL:'Apple',PANW:'Palo Alto Networks',
  CRWD:'CrowdStrike',GEV:'GE Vernova',AVGO:'Broadcom',MRVL:'Marvell',INTC:'Intel',
  DELL:'Dell',ORCL:'Oracle',NET:'Cloudflare',NEE:'NextEra Energy',ETN:'Eaton',
  PWR:'Quanta Services',OKLO:'Oklo',GD:'General Dynamics',LHX:'L3Harris',
  ADBE:'Adobe',TSLA:'Tesla',NFLX:'Netflix',APP:'AppLovin',ON:'ON Semi',
  HPE:'HPE',WDAY:'Workday',COIN:'Coinbase',KLAC:'KLA Corp',ENTG:'Entegris',
  TER:'Teradyne',MKSI:'MKS Instruments',ONTO:'Onto Innovation',V:'Visa',
  MA:'Mastercard',PYPL:'PayPal',SQ:'Block',HOOD:'Robinhood',DDOG:'Datadog',
  MDB:'MongoDB',ZS:'Zscaler',ESTC:'Elastic',S:'SentinelOne',OKTA:'Okta',
  FTNT:'Fortinet',CYBR:'CyberArk',HUBS:'HubSpot',SHOP:'Shopify',TTD:'Trade Desk',
  PATH:'UiPath',CFLT:'Confluent',MCHP:'Microchip',TXN:'Texas Instruments',
  MPWR:'Monolithic Power',ADI:'Analog Devices',NXPI:'NXP Semi',FSLR:'First Solar',
  ENPH:'Enphase',WOLF:'Wolfspeed',RIVN:'Rivian',ANET:'Arista Networks',
  PSTG:'Pure Storage',NTAP:'NetApp',WDC:'Western Digital',ISRG:'Intuitive Surgical',
  VEEV:'Veeva',RXRX:'Recursion Pharma',AMGN:'Amgen',UBER:'Uber',SPOT:'Spotify',
  ABNB:'Airbnb',DIS:'Disney',AXON:'Axon',GTLB:'GitLab',TWLO:'Twilio',
  SOFI:'SoFi',AFRM:'Affirm',NU:'Nu Holdings',MRNA:'Moderna',REGN:'Regeneron',
  DXCM:'Dexcom',TDOC:'Teladoc',ILMN:'Illumina',ALB:'Albemarle',SQM:'SQM',
  LTHM:'Livent',CHPT:'ChargePoint',BLNK:'Blink Charging',BILL:'Bill.com',
  ZI:'ZoomInfo',MNDY:'Monday.com',TOST:'Toast',SMAR:'Smartsheet',FORM:'FormFactor',
  ACMR:'ACM Research',CAMT:'Camtek',IPGP:'IPG Photonics',POWI:'Power Integrations',
  SOUN:'SoundHound',AISP:'Airship AI',IONQ:'IonQ',DUOL:'Duolingo',RBLX:'Roblox',
  EQIX:'Equinix',DLR:'Digital Realty',AMT:'American Tower',IRM:'Iron Mountain',
  VRT:'Vertiv',KTOS:'Kratos Defense',LDOS:'Leidos',BA:'Boeing',SAIC:'SAIC',
  HII:'Huntington Ingalls',NIO:'NIO',XPEV:'XPeng',LCID:'Lucid',F:'Ford',GM:'GM',
  ROKU:'Roku',SNAP:'Snap',PINS:'Pinterest',ZM:'Zoom',NTNX:'Nutanix',
  MELI:'MercadoLibre',SE:'Sea Limited',FLUT:'Flutter',UPST:'Upstart',LMND:'Lemonade'
};

// ── Compact supply chain upstream map (for L4 computation) ───────────────────
// ticker → array of upstream anchor tickers whose momentum drives this stock
const UPSTREAM_MAP = {
  ASML:['TSM'], NVDA:['TSM'], AMD:['TSM'], AMAT:['TSM'], LRCX:['TSM'],
  KLAC:['TSM'], ENTG:['TSM'], SMCI:['NVDA'], MU:['NVDA'],
  DDOG:['NVDA'], ORCL:['NVDA','MSFT'], NET:['NVDA'], SNOW:['NVDA'],
  CRM:['NVDA'], CRWD:['NVDA'], PANW:['NVDA'], HUBS:['NVDA'],
  AVGO:['META'], MRVL:['META'], GEV:['MSFT'], ETN:['MSFT'],
  PWR:['MSFT'], VST:['MSFT'], CEG:['MSFT'], NEE:['MSFT'],
  DELL:['NVDA'], HPE:['NVDA'], PSTG:['NVDA'], ANET:['NVDA'],
  PATH:['MSFT'], WDAY:['MSFT'], NOW:['MSFT'], ADBE:['MSFT'],
  VRT:['NVDA','MSFT'], EQIX:['NVDA','MSFT'], DLR:['NVDA','MSFT'],
  SHOP:['AMZN'], UBER:['GOOGL'], ABNB:['GOOGL'],
  V:['AMZN'], MA:['AMZN'], PYPL:['AMZN'],
  LMT:['GD'], NOC:['GD'], RTX:['GD'], KTOS:['LMT'], LDOS:['LMT'],
  CCJ:['CEG'], UEC:['CEG']
};

// ── Finnhub API helper ────────────────────────────────────────────────────────
async function fhFetch(path, params, token) {
  const qs = new URLSearchParams({ ...params, token }).toString();
  try {
    const r = await fetch(`https://finnhub.io/api/v1/${path}?${qs}`, {
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) return null;
    return r.json().catch(() => null);
  } catch (e) { return null; }
}

function _dateStr(daysOffset = 0) {
  const d = new Date(Date.now() + daysOffset * 864e5);
  return d.toISOString().slice(0, 10);
}

// ── KV helpers ───────────────────────────────────────────────────────────────
async function kvSet(url, token, key, value, exSeconds) {
  try {
    const cmd = exSeconds
      ? ['SET', key, JSON.stringify(value), 'EX', exSeconds]
      : ['SET', key, JSON.stringify(value)];
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd)
    });
    return r.ok;
  } catch (e) { return false; }
}

async function kvGet(url, token, key) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['GET', key])
    });
    const j = await r.json();
    return j.result ? JSON.parse(j.result) : null;
  } catch (e) { return null; }
}

// ── Score computation ─────────────────────────────────────────────────────────

// L1: Price momentum + 52-week position (0–30)
function computeL1(quote) {
  if (!quote || !quote.c) return 12;
  const dp = quote.dp || 0;
  const h52 = quote.h || quote.c;
  const l52 = quote.l || quote.c;
  const range = h52 - l52;
  const fromLow = range > 0 ? ((quote.c - l52) / range) * 100 : 50;

  const momentumPts = dp > 4 ? 10 : dp > 2 ? 7 : dp > 0.5 ? 4
    : dp < -4 ? -4 : dp < -2 ? -2 : dp < -0.5 ? -1 : 0;
  const positionPts = fromLow > 80 ? 5 : fromLow > 60 ? 3 : fromLow < 20 ? -3 : fromLow < 35 ? -1 : 0;
  return Math.min(30, Math.max(0, 15 + momentumPts + positionPts));
}

// L2: Insider cluster strength (0–25)
function computeL2(insiderData) {
  const txns = (insiderData?.data || [])
    .filter(t => !t.isDerivative && t.change !== 0)
    .filter(t => (Date.now() - new Date(t.transactionDate)) / 864e5 <= 90)
    .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

  const buys = txns.filter(t => t.change > 0);
  const sells = txns.filter(t => t.change < 0);
  const recentBuys = buys.filter(t => (Date.now() - new Date(t.transactionDate)) / 864e5 <= 30);
  const uniqueBuyers = new Set(buys.map(t => t.name)).size;
  const totalBuyVal = buys.reduce((s, t) => s + Math.abs(t.change * (t.transactionPrice || 0)), 0);

  // Strong cluster: 2+ executives buying in last 30 days
  if (uniqueBuyers >= 2 && recentBuys.length >= 2) return 23;
  // Single large buy ($1M+) recent
  if (recentBuys.length >= 1 && totalBuyVal >= 1e6) return 19;
  // Some buying, no recent sells
  if (buys.length >= 1 && sells.length === 0) return 16;
  // Some buying with some selling
  if (buys.length >= 1) return 13;
  // Net selling
  if (sells.length >= 2 && buys.length === 0) return 5;
  if (sells.length >= 1 && buys.length === 0) return 8;
  // No activity — neutral
  return 12;
}

// L3: Analyst consensus strength (0–25)
function computeL3(recommendations) {
  if (!Array.isArray(recommendations) || !recommendations[0]) return 12;
  const r = recommendations[0];
  const { buy = 0, hold = 0, sell = 0, strongBuy = 0, strongSell = 0 } = r;
  const total = buy + hold + sell + strongBuy + strongSell;
  if (!total) return 12;

  const bullish = buy + strongBuy;
  const bearish = sell + strongSell;
  const bullPct = bullish / total;

  // Check if consensus is improving vs previous period
  const prev = recommendations[1];
  const prevBullish = prev ? (prev.buy || 0) + (prev.strongBuy || 0) : bullish;
  const improving = bullish > prevBullish;

  if (bullPct >= 0.80 && improving) return 24;
  if (bullPct >= 0.80) return 21;
  if (bullPct >= 0.65 && improving) return 19;
  if (bullPct >= 0.65) return 17;
  if (bullPct >= 0.50) return 14;
  if (bullPct >= 0.35) return 10;
  return 6;
}

// L4: Supply chain window activity (0–10)
// Based on whether upstream anchors have significant positive momentum
function computeL4(ticker, allQuotes) {
  const upstreams = UPSTREAM_MAP[ticker] || [];
  if (!upstreams.length) return 5;

  const activeBull = upstreams.filter(up => (allQuotes[up]?.dp || 0) > 1.5);
  const activeBear = upstreams.filter(up => (allQuotes[up]?.dp || 0) < -1.5);

  if (activeBull.length >= 2) return 9;
  if (activeBull.length === 1) return 7;
  if (activeBear.length >= 1) return 3;
  return 5;
}

// L5: Macro regime (0–10) — derived from SPY momentum
function computeL5(spyDp) {
  if (spyDp > 1.5) return 9;
  if (spyDp > 0.5) return 7;
  if (spyDp > -0.5) return 5;
  if (spyDp > -1.5) return 3;
  return 1;
}

// ── Human-readable summaries for narrative generation ────────────────────────
function insiderSummary(insiderData) {
  const txns = (insiderData?.data || [])
    .filter(t => !t.isDerivative && t.change !== 0)
    .filter(t => (Date.now() - new Date(t.transactionDate)) / 864e5 <= 90)
    .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

  const buys = txns.filter(t => t.change > 0);
  if (!buys.length) {
    const sells = txns.filter(t => t.change < 0);
    return sells.length ? `${sells.length} insider sell(s) in last 90 days, no buys` : 'No open market activity in last 90 days';
  }
  const val = buys.reduce((s, t) => s + Math.abs(t.change * (t.transactionPrice || 0)), 0);
  const valStr = val >= 1e6 ? '$' + (val / 1e6).toFixed(1) + 'M' : val >= 1e3 ? '$' + Math.round(val / 1e3) + 'K' : '';
  const names = [...new Set(buys.map(t => t.name))].slice(0, 2).map(n => n.split(/\s+/).pop()).join(' & ');
  const daysAgo = Math.round((Date.now() - new Date(buys[0].transactionDate)) / 864e5);
  return `${names} bought ${valStr} (${daysAgo}d ago) — ${new Set(buys.map(t => t.name)).size} unique buyer(s)`;
}

function analystSummary(recommendations) {
  if (!Array.isArray(recommendations) || !recommendations[0]) return 'No recent analyst data';
  const r = recommendations[0];
  const { buy = 0, hold = 0, sell = 0, strongBuy = 0, strongSell = 0 } = r;
  const total = buy + hold + sell + strongBuy + strongSell;
  const bullish = buy + strongBuy;
  const bullPct = total ? Math.round((bullish / total) * 100) : 50;
  const prev = recommendations[1];
  const prevBull = prev ? (prev.buy || 0) + (prev.strongBuy || 0) : bullish;
  const trend = bullish > prevBull ? ' (improving)' : bullish < prevBull ? ' (deteriorating)' : '';
  return `${bullish}/${total} analysts bullish (${bullPct}%)${trend} — ${strongBuy} strong buy`;
}

function chainSummary(ticker, allQuotes) {
  const upstreams = UPSTREAM_MAP[ticker] || [];
  if (!upstreams.length) return 'No mapped upstream signals';
  const active = upstreams.filter(up => Math.abs(allQuotes[up]?.dp || 0) > 1.5);
  if (!active.length) return `Upstream (${upstreams.join(', ')}) within normal range`;
  return active.map(up => {
    const dp = allQuotes[up]?.dp || 0;
    return `${up} ${dp > 0 ? '+' : ''}${dp.toFixed(1)}% → lag window active`;
  }).join('; ');
}

// ── Claude narrative generation ───────────────────────────────────────────────
async function generateSignalNarrative(ticker, name, data, anthropicKey) {
  if (!anthropicKey) return null;

  const { score, l1, l2, l3, l4, l5, dp, insiderStr, analystStr, chainStr } = data;
  const prompt = `You generate market intelligence signal observations.

Stock: ${ticker} (${name}) | Score: ${score}/100
Components — L1 market:${l1}/30, L2 insider:${l2}/25, L3 analyst:${l3}/25, L4 chain:${l4}/10, L5 macro:${l5}/10
Price: ${dp >= 0 ? '+' : ''}${(dp || 0).toFixed(1)}% today
Insider: ${insiderStr}
Analyst: ${analystStr}
Supply chain: ${chainStr}

Write exactly 3 signal observations. Rules:
- Specific numbers, not vague statements
- State what the signal implies for price over 2-8 weeks
- Plain English — smart colleague, not Bloomberg terminal
- No hedging words (may, could, might)
- Each sentence = one distinct point

Return ONLY: ["observation1", "observation2", "observation3"]`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: AbortSignal.timeout(12000)
    });
    if (!r.ok) return null;
    const j = await r.json();
    const text = (j.content?.[0]?.text || '').trim();
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      const arr = JSON.parse(match[0]);
      return Array.isArray(arr) && arr.length === 3 ? arr : null;
    }
    return null;
  } catch (e) { return null; }
}

// ── Main computation ──────────────────────────────────────────────────────────
async function computeAndStore(fhKey, kvUrl, kvToken, anthropicKey) {
  const today = new Date().toISOString().slice(0, 10);

  // ── Phase 1: Fetch all data in batches ─────────────────────────────────────
  const quoteMap = {};
  const insiderMap = {};
  const recMap = {};

  // Fetch SPY for L5 macro baseline
  const spyQuote = await fhFetch('quote', { symbol: 'SPY' }, fhKey);
  const spyDp = spyQuote?.dp || 0;

  const BATCH = 8;
  for (let i = 0; i < ALL_TICKERS.length; i += BATCH) {
    const batch = ALL_TICKERS.slice(i, i + BATCH);

    // Fetch quote + recommendation + insider in parallel per batch
    const [quotes, recs, insiders] = await Promise.all([
      Promise.allSettled(batch.map(t => fhFetch('quote', { symbol: t }, fhKey))),
      Promise.allSettled(batch.map(t => fhFetch('stock/recommendation', { symbol: t }, fhKey))),
      Promise.allSettled(batch.map(t => fhFetch('stock/insider-transactions', {
        symbol: t, from: _dateStr(-90), to: _dateStr(0)
      }, fhKey)))
    ]);

    batch.forEach((t, idx) => {
      if (quotes[idx]?.status === 'fulfilled') quoteMap[t] = quotes[idx].value;
      if (recs[idx]?.status === 'fulfilled') recMap[t] = recs[idx].value;
      if (insiders[idx]?.status === 'fulfilled') insiderMap[t] = insiders[idx].value;
    });

    // Stagger batches — 3 API calls per ticker × 8 tickers = 24 calls per batch
    // Finnhub free tier: 30/s, so ~800ms stagger keeps us well within limits
    if (i + BATCH < ALL_TICKERS.length) {
      await new Promise(r => setTimeout(r, 900));
    }
  }

  // ── Phase 2: Compute 5-component scores ────────────────────────────────────
  const scores = {};
  const components = {};
  const meta = {};
  const narrativeInputs = {};

  for (const ticker of ALL_TICKERS) {
    const q = quoteMap[ticker];
    const l1 = computeL1(q);
    const l2 = computeL2(insiderMap[ticker]);
    const l3 = computeL3(recMap[ticker]);
    const l4 = computeL4(ticker, quoteMap);
    const l5 = computeL5(spyDp);
    const score = Math.min(99, Math.max(1, l1 + l2 + l3 + l4 + l5));

    scores[ticker] = score;
    components[ticker] = { l1, l2, l3, l4, l5 };
    if (q && q.c) {
      meta[ticker] = { price: q.c, dp: q.dp || 0, h52: q.h || 0, l52: q.l || 0 };
    }

    const insiderStr = insiderSummary(insiderMap[ticker]);
    const analystStr = analystSummary(recMap[ticker]);
    const chainStr = chainSummary(ticker, quoteMap);
    narrativeInputs[ticker] = {
      score, l1, l2, l3, l4, l5,
      dp: q?.dp || 0,
      insiderStr, analystStr, chainStr
    };
  }

  // ── Phase 3: Generate Claude narratives — top 35 stocks only ─────────────
  // Limiting to top scorers keeps cron well under the 60s Vercel function limit.
  // Lower-scoring stocks get narratives on their next score climb.
  const signals = {};
  if (anthropicKey) {
    const NARRATIVE_LIMIT = 35;
    const topTickers = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, NARRATIVE_LIMIT)
      .map(([t]) => t);

    const ANTHRO_BATCH = 10;
    for (let i = 0; i < topTickers.length; i += ANTHRO_BATCH) {
      const batch = topTickers.slice(i, i + ANTHRO_BATCH);
      const results = await Promise.allSettled(
        batch.map(t => generateSignalNarrative(t, NAMES[t] || t, narrativeInputs[t], anthropicKey))
      );
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled' && r.value) signals[batch[idx]] = r.value;
      });
      // Brief pause between Anthropic batches to respect rate limits
      if (i + ANTHRO_BATCH < topTickers.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
  }

  // ── Phase 4a: Compute score deltas vs yesterday ───────────────────────────
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  let deltas = {};
  try {
    const prevSnap = await kvGet(kvUrl, kvToken, `ti:scores:daily:${yesterday}`);
    if (prevSnap?.scores) {
      for (const t of ALL_TICKERS) {
        const d = (scores[t] || 50) - (prevSnap.scores[t] || 50);
        if (d !== 0) deltas[t] = d;
      }
    }
  } catch (e) { /* no prev snapshot yet — deltas stay empty */ }

  // ── Phase 4b: Write to KV ─────────────────────────────────────────────────
  const snapshot = {
    date: today,
    scores,
    components,
    meta,
    signals,
    deltas,   // score change vs yesterday — powers velocity arrows
    spyDp,
    computedAt: new Date().toISOString()
  };

  await kvSet(kvUrl, kvToken, 'ti:scores:latest', snapshot);
  await kvSet(kvUrl, kvToken, `ti:scores:daily:${today}`, snapshot, 60 * 86400);

  // Update rolling daily index (for backtest lookups)
  const indexKey = 'ti:scores:daily:index';
  let index = await kvGet(kvUrl, kvToken, indexKey) || [];
  if (!index.includes(today)) {
    index = [...index, today].sort();
    if (index.length > 60) index = index.slice(-60);
    await kvSet(kvUrl, kvToken, indexKey, index);
  }

  const deltaVals = Object.values(deltas);
  return {
    date: today,
    tickers: Object.keys(scores).length,
    withSignals: Object.keys(signals).length,
    withDeltas: deltaVals.length,
    scoreRange: {
      min: Math.min(...Object.values(scores)),
      max: Math.max(...Object.values(scores)),
      avg: Math.round(Object.values(scores).reduce((s, v) => s + v, 0) / Object.values(scores).length)
    },
    topMovers: Object.entries(deltas)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 5)
      .map(([t, d]) => ({ ticker: t, delta: d, score: scores[t] }))
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const { FH_KEY, KV_REST_API_URL, KV_REST_API_TOKEN, ANTHROPIC_API_KEY, CRON_SECRET } = process.env;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET: serve latest pre-computed scores to the browser ─────────────────
  if (req.method === 'GET') {
    if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
      return res.status(200).json({ ok: false, reason: 'KV not configured', scores: {} });
    }
    const latest = await kvGet(KV_REST_API_URL, KV_REST_API_TOKEN, 'ti:scores:latest');
    if (!latest) {
      return res.status(200).json({ ok: false, reason: 'No snapshot yet — cron runs at 2am UTC', scores: {} });
    }
    const index = await kvGet(KV_REST_API_URL, KV_REST_API_TOKEN, 'ti:scores:daily:index') || [];
    return res.status(200).json({ ok: true, ...latest, dailyIndex: index });
  }

  // ── POST/cron: protected — requires CRON_SECRET ───────────────────────────
  // Vercel automatically sends Authorization: Bearer {CRON_SECRET} for scheduled crons.
  // Manual triggers must include the same header.
  if (CRON_SECRET) {
    const auth = req.headers['authorization'];
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized — valid Authorization: Bearer <CRON_SECRET> required' });
    }
  }

  if (!FH_KEY) return res.status(500).json({ error: 'FH_KEY not configured' });
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) return res.status(500).json({ error: 'KV not configured' });

  try {
    const result = await computeAndStore(FH_KEY, KV_REST_API_URL, KV_REST_API_TOKEN, ANTHROPIC_API_KEY || null);
    return res.status(200).json({ ok: true, ...result });
  } catch (e) {
    return res.status(500).json({ error: e.message, stack: e.stack?.slice(0, 400) });
  }
}
