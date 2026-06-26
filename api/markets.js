// api/markets.js — Live market data: indices, FX, yields, commodities, crypto
// GET /api/markets → live quotes for all market categories
// Cached 60s at Vercel edge — fast enough for a Markets tab refresh
//
// Data sources:
//   Indices/Equities/Commodities/Crypto → Finnhub (via FH_KEY)
//   Treasury yields → FRED API (free, no key needed for public series)

function _kvEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_REST_API_TOKEN;
  return { url, token };
}
async function _kvExec(url, token, cmd) {
  try {
    const r = await fetch(url, { method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body:JSON.stringify(cmd), signal:AbortSignal.timeout(6000) });
    const j = await r.json(); return j.result ?? null;
  } catch (e) { return null; }
}
async function _kvGetJSON(url, token, key) {
  const raw = await _kvExec(url, token, ['GET', key]);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Cache 60s at CDN edge, browser gets fresh data every minute max
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  const FH = process.env.FH_KEY;
  if (!FH) return res.status(500).json({ ok: false, error: 'FH_KEY not configured' });

  // Server-side cache: browsers read the KV snapshot (kept warm by the /api/markets cron),
  // so we don't fetch ~50 Finnhub+FRED symbols on every page view (which caused stale fallbacks).
  const { url: _kvUrl, token: _kvToken } = _kvEnv();
  const _isCron = (req.headers['user-agent'] || '').toLowerCase().includes('vercel-cron') || (req.query && req.query.refresh === '1');
  const _cache = (_kvUrl && _kvToken) ? await _kvGetJSON(_kvUrl, _kvToken, 'ti:markets:latest') : null;
  if (!_isCron && _cache) return res.status(200).json(_cache);

  // ── Symbol maps ────────────────────────────────────────────────────────────
  // Finnhub quote endpoint returns: c (current), d (change), dp (% change), h, l, o, pc
  // We use ETF proxies for indices since Finnhub covers US-listed ETFs reliably.

  const INDEX_PROXIES = {
    SPX: 'SPY', NDX: 'QQQ', DJI: 'DIA', RUT: 'IWM',
    AEX: 'EWN', DAX: 'EWG', CAC: 'EWQ', FTSE: 'EWU',
    NKY: 'EWJ', HSI: 'EWH', AXJO: 'EWA', BVSP: 'EWZ',
    SENSEX: 'INDA'
  };

  // VIX direct from Finnhub
  const FX_PAIRS = {
    EURUSD: 'EUR/USD', USDJPY: 'USD/JPY', GBPUSD: 'GBP/USD',
    USDCNY: 'USD/CNY', USDCHF: 'USD/CHF', USDCAD: 'USD/CAD',
    AUDUSD: 'AUD/USD', EURGBP: 'EUR/GBP', DXY: 'DXY'
  };

  const COMMODITY_PROXIES = {
    GOLD: 'GLD', SLV: 'SLV', WTI: 'USO', BRENT: 'BNO',
    NGAS: 'UNG', COPPER: 'CPER', PLAT: 'PPLT', PALL: 'PALL',
    WHEAT: 'WEAT', CORN: 'CORN', URA: 'URA'
  };

  // Finnhub crypto format: BINANCE:BTCUSDT
  const CRYPTO_SYMBOLS = {
    BTC: 'BINANCE:BTCUSDT', ETH: 'BINANCE:ETHUSDT', SOL: 'BINANCE:SOLUSDT',
    BNB: 'BINANCE:BNBUSDT', XRP: 'BINANCE:XRPUSDT', ADA: 'BINANCE:ADAUSDT',
    DOGE: 'BINANCE:DOGEUSDT', AVAX: 'BINANCE:AVAXUSDT',
    DOT: 'BINANCE:DOTUSDT', LINK: 'BINANCE:LINKUSDT'
  };

  // FRED series IDs for Treasury yields (free, no key required for public data)
  const YIELD_SERIES = {
    US10Y: 'DGS10', US2Y: 'DGS2', US30Y: 'DGS30',
    DE10Y: 'IRLTLT01DEM156N', JP10Y: 'IRLTLT01JPM156N', UK10Y: 'IRLTLT01GBM156N'
  };

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  async function fhCandles(symbol, fromTs, toTs, resolution = 'W') {
    try {
      const r = await fetch(
        `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${fromTs}&to=${toTs}&token=${FH}`,
        { signal: AbortSignal.timeout(7000) }
      );
      if (!r.ok) return null;
      const d = await r.json().catch(() => null);
      return (d?.s === 'ok' && d.c?.length) ? d : null;
    } catch { return null; }
  }

  // Compute TF percent changes from weekly candle data + current price
  function computeTF(candles, currentPrice) {
    if (!candles || !candles.c || !candles.t || !currentPrice) return null;
    const closes = candles.c;
    const times  = candles.t;
    const n      = closes.length;
    if (n < 2) return null;

    // Helper: find close price nearest to a target Unix timestamp
    function priceAt(targetTs) {
      let best = 0, bestDiff = Infinity;
      for (let i = 0; i < n; i++) {
        const diff = Math.abs(times[i] - targetTs);
        if (diff < bestDiff) { bestDiff = diff; best = i; }
      }
      return closes[best];
    }

    const now     = Math.floor(Date.now() / 1000);
    const yearStart = Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime() / 1000);

    const refs = {
      '5D':  priceAt(now - 5  * 86400),
      '1M':  priceAt(now - 30 * 86400),
      '3M':  priceAt(now - 91 * 86400),
      'YTD': priceAt(yearStart),
      '1Y':  closes[0]  // first available (oldest)
    };

    const result = {};
    for (const [tf, ref] of Object.entries(refs)) {
      if (!ref) continue;
      const pct = ((currentPrice - ref) / ref) * 100;
      result[tf] = {
        chg: (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%',
        up: pct >= 0,
        raw: pct
      };
    }
    return result;
  }

  async function fhQuote(symbol) {
    try {
      const r = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FH}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!r.ok) return null;
      return r.json().catch(() => null);
    } catch { return null; }
  }

  async function fhForex(from, to) {
    try {
      const symbol = `${from}/${to}`;
      const r = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FH}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!r.ok) return null;
      const d = await r.json().catch(() => null);
      return d;
    } catch { return null; }
  }

  async function fredLatest(series) {
    try {
      const r = await fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&sort_order=desc&limit=1&file_type=json`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!r.ok) return null;
      const d = await r.json().catch(() => null);
      const val = d?.observations?.[0]?.value;
      return val && val !== '.' ? parseFloat(val) : null;
    } catch { return null; }
  }

  function fmt(q, prefix = '') {
    if (!q || !q.c) return null;
    const chgPct = q.dp != null ? q.dp : (q.c - q.pc) / q.pc * 100;
    return {
      val: prefix + fmtNum(q.c),
      chg: (chgPct >= 0 ? '+' : '') + chgPct.toFixed(2) + '%',
      up: chgPct >= 0,
      raw: q.c,
      rawChg: chgPct
    };
  }

  function fmtNum(n) {
    if (n >= 10000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (n >= 1000)  return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
    if (n >= 100)   return n.toFixed(2);
    if (n >= 10)    return n.toFixed(3);
    return n.toFixed(4);
  }

  // ── Build all symbol lists for parallel fetching ───────────────────────────
  const indexSymbols  = Object.values(INDEX_PROXIES);
  const cryptoSymbols = Object.values(CRYPTO_SYMBOLS);
  const commSymbols   = Object.values(COMMODITY_PROXIES);
  const yieldKeys     = Object.keys(YIELD_SERIES);

  // Timeframe windows for candle fetches
  const nowTs      = Math.floor(Date.now() / 1000);
  const oneYearAgo = nowTs - 366 * 86400;

  // Fetch all ETF/equity/crypto quotes + index weekly candles in parallel
  const [indexQuotes, cryptoQuotes, commQuotes, vixQuote, indexCandles] = await Promise.all([
    Promise.allSettled(indexSymbols.map(s => fhQuote(s))),
    Promise.allSettled(cryptoSymbols.map(s => fhQuote(s))),
    Promise.allSettled(commSymbols.map(s => fhQuote(s))),
    fhQuote('^VIX'),
    Promise.allSettled(indexSymbols.map(s => fhCandles(s, oneYearAgo, nowTs, 'W')))
  ]);

  // Fetch FX pairs (slightly different endpoint)
  const fxKeys    = Object.keys(FX_PAIRS);
  const fxResults = await Promise.allSettled(
    fxKeys.map(k => {
      if (k === 'DXY') return fhQuote('UUP'); // DXY via ETF proxy
      const [from, to] = k.match(/[A-Z]{3}/g);
      return fhForex(from, to);
    })
  );

  // Fetch FRED yields in parallel
  const yieldResults = await Promise.allSettled(
    yieldKeys.map(k => fredLatest(YIELD_SERIES[k]))
  );

  // ── Assemble response ──────────────────────────────────────────────────────
  const indices = {};
  Object.keys(INDEX_PROXIES).forEach((id, i) => {
    const q = indexQuotes[i]?.status === 'fulfilled' ? indexQuotes[i].value : null;
    const r = fmt(q);
    if (!r) return;
    // ETF proxies trade at a fraction of the index they track — scale to the real index level
    const _lvlMult = { SPX:10, NDX:41, DJI:100, RUT:10 }[id];
    if (_lvlMult && q && q.c) { r.raw = q.c * _lvlMult; r.val = fmtNum(r.raw); }
    // Attach multi-timeframe performance from weekly candles
    const candles = indexCandles[i]?.status === 'fulfilled' ? indexCandles[i].value : null;
    const tf = computeTF(candles, q?.c);
    if (tf) r.tfChanges = tf;
    indices[id] = r;
  });
  // VIX separately — already a direct quote
  if (vixQuote?.c) {
    indices['VIX'] = {
      val: vixQuote.c.toFixed(2),
      chg: (vixQuote.dp >= 0 ? '+' : '') + (vixQuote.dp || 0).toFixed(2) + '%',
      up: (vixQuote.dp || 0) >= 0,
      raw: vixQuote.c,
      rawChg: vixQuote.dp || 0
    };
  }

  const crypto = {};
  Object.keys(CRYPTO_SYMBOLS).forEach((id, i) => {
    const q = cryptoQuotes[i]?.status === 'fulfilled' ? cryptoQuotes[i].value : null;
    const r = fmt(q, id === 'BTC' || id === 'ETH' || q?.c > 100 ? '$' : '$');
    if (r) crypto[id] = r;
  });

  const commodities = {};
  Object.keys(COMMODITY_PROXIES).forEach((id, i) => {
    const q = commQuotes[i]?.status === 'fulfilled' ? commQuotes[i].value : null;
    const r = fmt(q, '$');
    if (r && id === 'GOLD' && q && q.c) { r.raw = q.c * 10; r.val = '$' + fmtNum(r.raw); }
    if (r) commodities[id] = r;
  });

  const fx = {};
  fxKeys.forEach((id, i) => {
    const q = fxResults[i]?.status === 'fulfilled' ? fxResults[i].value : null;
    const r = fmt(q);
    if (r) fx[id] = r;
  });

  const yields = {};
  yieldKeys.forEach((id, i) => {
    const val = yieldResults[i]?.status === 'fulfilled' ? yieldResults[i].value : null;
    if (val != null) {
      yields[id] = {
        val: val.toFixed(2) + '%',
        raw: val
        // FRED doesn't give daily change — client can compute vs previous snapshot
      };
    }
  });

  const _payload = { ok: true, computedAt: new Date().toISOString(), indices, crypto, commodities, fx, yields };
  const _cnt = o => o ? (Object.keys(o.indices||{}).length + Object.keys(o.crypto||{}).length + Object.keys(o.commodities||{}).length + Object.keys(o.fx||{}).length) : 0;
  const _newN = _cnt(_payload), _oldN = _cnt(_cache);
  if (_kvUrl && _kvToken && _newN >= Math.max(20, Math.floor(_oldN * 0.8))) {
    try { await _kvExec(_kvUrl, _kvToken, ['SET', 'ti:markets:latest', JSON.stringify(_payload)]); } catch (e) {}
  }
  return res.status(200).json(_newN >= _oldN ? _payload : _cache);
}
