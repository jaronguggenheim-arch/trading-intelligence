// api/quotes.js — Server-side cached quotes for the covered universe.
// Cron (every 10 min) fetches all quotes from Finnhub, paced under the free-tier
// rate limit, and stores them in KV. Browsers read the cached snapshot in one call
// instead of each user hammering Finnhub per-ticker (which caused $— gaps).
//
// GET (browser)            -> returns cached snapshot {quotes:{TICKER:{c,d,dp,h,l,v}}, computedAt}
// GET (cron or ?refresh=1) -> refreshes all quotes, stores to KV, returns snapshot
// Requires env: FH_KEY, KV_REST_API_URL/_TOKEN (fallbacks accepted).

export const config = { schedule: '*/10 * * * *', maxDuration: 300 };

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
  'MRNA','REGN','DXCM','TDOC','ILMN','ALB','SQM','LTHM','CHPT','BLNK',
  'BILL','ZI','MNDY','TOST','SMAR','FORM','ACMR','CAMT','IPGP','POWI',
  'SOUN','AISP','IONQ','DUOL','RBLX','EQIX','DLR','AMT','IRM','VRT',
  'KTOS','LDOS','BA','SAIC','HII','NIO','XPEV','LCID','F','GM',
  'ROKU','SNAP','PINS','ZM','NTNX','MELI','SE','FLUT','UPST','LMND'
];

function kvEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_REST_API_TOKEN;
  return { url, token };
}
async function kvExec(url, token, cmd) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd),
      signal: AbortSignal.timeout(6000)
    });
    const j = await r.json();
    return j.result ?? null;
  } catch (e) { return null; }
}
async function kvGetJSON(url, token, key) {
  const raw = await kvExec(url, token, ['GET', key]);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

async function fhQuote(sym, key) {
  try {
    const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${key}`, { signal: AbortSignal.timeout(7000) });
    if (!r.ok) return null;
    const d = await r.json();
    if (d && typeof d.c === 'number' && d.c > 0) {
      return { c: d.c, d: d.d ?? null, dp: d.dp ?? null, h: d.h ?? null, l: d.l ?? null, v: d.v ?? null };
    }
    return null;
  } catch (e) { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
  const { url: kvUrl, token: kvToken } = kvEnv();
  const FH_KEY = process.env.FH_KEY;

  const cache = (kvUrl && kvToken) ? await kvGetJSON(kvUrl, kvToken, 'ti:quotes:latest') : null;
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const isCron = ua.includes('vercel-cron') || (req.query && req.query.refresh === '1');

  // Browser path: return cached snapshot fast (never hammer Finnhub per request)
  if (!isCron) {
    return res.status(200).json(cache || { quotes: {}, count: 0, computedAt: null });
  }

  // Refresh path (cron / manual): fetch all quotes paced under the rate limit
  if (!FH_KEY) return res.status(200).json(cache || { quotes: {}, count: 0, computedAt: null, note: 'FH_KEY not configured' });
  const quotes = (cache && cache.quotes) ? Object.assign({}, cache.quotes) : {};
  const BATCH = 10, DELAY = 11000; // ~55 calls/min, under Finnhub free 60/min
  for (let i = 0; i < ALL_TICKERS.length; i += BATCH) {
    const batch = ALL_TICKERS.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map(t => fhQuote(t, FH_KEY)));
    results.forEach((r, idx) => { if (r.status === 'fulfilled' && r.value) quotes[batch[idx]] = r.value; });
    if (i + BATCH < ALL_TICKERS.length) await new Promise(r => setTimeout(r, DELAY));
  }
  const snapshot = { quotes, count: Object.keys(quotes).length, computedAt: new Date().toISOString() };
  if (kvUrl && kvToken) await kvExec(kvUrl, kvToken, ['SET', 'ti:quotes:latest', JSON.stringify(snapshot)]);
  return res.status(200).json(snapshot);
}
