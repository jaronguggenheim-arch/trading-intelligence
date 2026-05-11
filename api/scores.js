// api/scores.js — Nightly server-side score computation
// Vercel cron: runs at 02:00 UTC daily (10pm ET, before market open)
// GET /api/scores  → returns latest pre-computed score snapshot from KV
// POST /api/scores (cron) → fetches quotes for all 150 stocks, computes L1 momentum,
//   writes daily snapshot to KV so browsers load pre-computed scores instead of
//   computing them client-side on page load. History accumulates server-side
//   even when no browser is open.
//
// Requires env vars: FH_KEY, KV_REST_API_URL, KV_REST_API_TOKEN

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

// ── Base scores (hardcoded priors — live computation adjusts these) ───────────
const BASE_SCORES = {
  NVDA:78,ASML:91,AMD:62,RKLB:67,PLTR:73,TSM:74,SMCI:65,META:64,MSFT:68,GOOGL:60,
  VST:71,CEG:68,AMAT:66,LRCX:64,MU:75,LMT:59,NOC:57,RTX:61,CRM:72,NOW:70,SNOW:58,
  CCJ:63,UEC:61,AMZN:65,ARM:69,QCOM:63,AAPL:64,PANW:67,CRWD:70,GEV:72,
  AVGO:74,MRVL:68,INTC:48,DELL:58,ORCL:76,NET:69,NEE:58,ETN:67,PWR:65,OKLO:63,
  GD:60,LHX:61,ADBE:62,TSLA:60,NFLX:64,APP:71,ON:62,HPE:55,WDAY:64,COIN:67,
  KLAC:68,ENTG:64,TER:63,MKSI:61,ONTO:62,V:72,MA:74,PYPL:60,SQ:62,HOOD:63,
  DDOG:75,MDB:68,ZS:71,ESTC:63,S:66,OKTA:62,FTNT:64,CYBR:65,HUBS:63,SHOP:66,
  TTD:65,PATH:60,CFLT:64,MCHP:62,TXN:65,MPWR:66,ADI:64,NXPI:63,FSLR:62,ENPH:58,
  WOLF:52,RIVN:48,ANET:67,PSTG:65,NTAP:60,WDC:62,ISRG:67,VEEV:64,RXRX:59,AMGN:63,
  UBER:66,SPOT:65,ABNB:62,DIS:58,AXON:69,GTLB:64,TWLO:60,SOFI:62,AFRM:59,NU:64,
  MRNA:58,REGN:65,DXCM:62,TDOC:52,ILMN:57,
  ALB:54,SQM:55,LTHM:52,CHPT:46,BLNK:44,
  BILL:60,ZI:57,MNDY:63,TOST:62,SMAR:60,
  FORM:59,ACMR:61,CAMT:60,IPGP:58,POWI:60,
  SOUN:55,AISP:54,IONQ:57,DUOL:65,RBLX:60,
  EQIX:68,DLR:64,AMT:63,IRM:66,VRT:70,
  KTOS:64,LDOS:61,BA:57,SAIC:60,HII:58,
  NIO:46,XPEV:45,LCID:42,F:52,GM:54,
  ROKU:55,SNAP:52,PINS:57,ZM:51,NTNX:60,
  MELI:67,SE:61,FLUT:63,UPST:58,LMND:55
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

// ── Score computation (L1 momentum) ─────────────────────────────────────────
// Takes a live quote and applies momentum boost to the base score.
// Same logic as initLiveScores() in the browser.
function computeL1Score(ticker, quote) {
  const base = BASE_SCORES[ticker] || 55;
  if (!quote || !quote.c) return base;
  const dp = quote.dp || 0;
  const fromLow = quote.l52 && quote.l52 > 0
    ? ((quote.c - quote.l52) / (quote.h52 - quote.l52 + 0.01)) * 100
    : 50;
  const priceMomentum = dp > 4 ? 8 : dp > 2 ? 5 : dp > 0.5 ? 2
    : dp < -4 ? -8 : dp < -2 ? -5 : dp < -0.5 ? -2 : 0;
  const positionBoost = fromLow > 80 ? 4 : fromLow > 60 ? 2 : fromLow < 20 ? -4 : fromLow < 40 ? -2 : 0;
  return Math.min(99, Math.max(1, base + priceMomentum + positionBoost));
}

// ── Main score computation + KV write ────────────────────────────────────────
async function computeAndStore(fhKey, kvUrl, kvToken) {
  const today = new Date().toISOString().slice(0, 10);
  const scores = {};
  const meta = {}; // dp%, price for each ticker

  // Fetch quotes in batches of 10 (Finnhub free tier: ~30 req/s)
  const BATCH = 10;
  for (let i = 0; i < ALL_TICKERS.length; i += BATCH) {
    const batch = ALL_TICKERS.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(t => fhFetch('quote', { symbol: t }, fhKey))
    );
    results.forEach((r, idx) => {
      const ticker = batch[idx];
      const q = r.status === 'fulfilled' ? r.value : null;
      scores[ticker] = computeL1Score(ticker, q);
      if (q && q.c) {
        meta[ticker] = {
          price: q.c,
          dp: q.dp || 0,
          h52: q.h52 || 0,
          l52: q.l52 || 0
        };
      }
    });
    // Stagger batches to avoid rate limiting
    if (i + BATCH < ALL_TICKERS.length) {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  const snapshot = { date: today, scores, meta, computedAt: new Date().toISOString() };

  // Write latest scores (no expiry — always serve latest)
  await kvSet(kvUrl, kvToken, 'ti:scores:latest', snapshot);

  // Write daily history entry (keyed by date, expire after 60 days)
  await kvSet(kvUrl, kvToken, `ti:scores:daily:${today}`, snapshot, 60 * 86400);

  // Maintain rolling index of available daily keys (for backtest lookups)
  const indexKey = 'ti:scores:daily:index';
  let index = await kvGet(kvUrl, kvToken, indexKey) || [];
  if (!index.includes(today)) {
    index = [...index, today].sort();
    // Keep last 60 entries
    if (index.length > 60) index = index.slice(-60);
    await kvSet(kvUrl, kvToken, indexKey, index);
  }

  return { date: today, tickers: Object.keys(scores).length, snapshot };
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const { FH_KEY, KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;

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
      return res.status(200).json({ ok: false, reason: 'No snapshot yet', scores: {} });
    }
    // Also include the daily index for backtest use
    const index = await kvGet(KV_REST_API_URL, KV_REST_API_TOKEN, 'ti:scores:daily:index') || [];
    return res.status(200).json({ ok: true, ...latest, dailyIndex: index });
  }

  // ── POST/cron: compute and store ──────────────────────────────────────────
  if (!FH_KEY) return res.status(500).json({ error: 'FH_KEY not configured' });
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    return res.status(500).json({ error: 'KV not configured' });
  }

  try {
    const result = await computeAndStore(FH_KEY, KV_REST_API_URL, KV_REST_API_TOKEN);
    return res.status(200).json({ ok: true, ...result });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
