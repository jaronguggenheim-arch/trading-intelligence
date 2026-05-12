// api/congress.js — Congress STOCK Act disclosure proxy
// GET /api/congress → recent trades by House + Senate members filtered to our 150 tickers
// Cached 2h at edge — disclosures only update daily
//
// Data sources (free, no key required):
//   House: house-stock-watcher-data.s3-us-east-2.amazonaws.com
//   Senate: senate-stock-watcher-data.s3-us-east-2.amazonaws.com

// Our full 150-ticker universe — filter server-side to keep response small
const TRACKED = new Set([
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
]);

const HOUSE_URL  = 'https://house-stock-watcher-data.s3-us-east-2.amazonaws.com/data/all_transactions.json';
const SENATE_URL = 'https://senate-stock-watcher-data.s3-us-east-2.amazonaws.com/data/all_transactions.json';
const CUTOFF_DAYS = 120; // only last 120 days

async function fetchSource(url, chamber) {
  try {
    const r = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(12000)
    });
    if (!r.ok) return [];
    const raw = await r.json();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - CUTOFF_DAYS);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const trades = [];
    for (const t of raw) {
      // House and Senate have slightly different field names
      const rawTicker = (t.ticker || t.asset_description || '').toUpperCase()
        .replace(/[$\s]/g, '').split('(').pop().split(')')[0].trim();

      // Extract ticker from Senate "asset_description" like "Apple Inc (AAPL)"
      const tickerMatch = (t.asset_description || '').match(/\(([A-Z]{1,5})\)/);
      const ticker = tickerMatch ? tickerMatch[1] : rawTicker;

      if (!TRACKED.has(ticker)) continue;

      const date = t.transaction_date || t.transaction_date_if_blank_then_owner_or_dc || '';
      if (!date || date < cutoffStr) continue;

      const type = (t.type || '').toLowerCase();
      const isBuy  = type.includes('purchase') || type === 'buy';
      const isSell = type.includes('sale') || type.includes('sell');
      if (!isBuy && !isSell) continue;

      trades.push({
        member: t.representative || t.first_name ? `${t.first_name || ''} ${t.last_name || ''}`.trim() : 'Unknown',
        chamber,
        party: t.party || '',
        ticker,
        type: isBuy ? 'purchase' : 'sale',
        amount: t.amount || '',
        date,
        asset: t.asset_description || ticker,
        link: t.ptr_link || ''
      });
    }
    return trades;
  } catch (e) {
    console.warn(`congress.js: ${chamber} fetch failed — ${e.message}`);
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Cache 2h at CDN — disclosures update daily, not minute-by-minute
  res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=1800');

  const [house, senate] = await Promise.all([
    fetchSource(HOUSE_URL, 'House'),
    fetchSource(SENATE_URL, 'Senate')
  ]);

  // Merge and sort by date desc, cap at 100 results
  const all = [...house, ...senate]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 100);

  const byTicker = {};
  for (const t of all) {
    if (!byTicker[t.ticker]) byTicker[t.ticker] = { buys: 0, sells: 0, latest: t.date };
    if (t.type === 'purchase') byTicker[t.ticker].buys++;
    else byTicker[t.ticker].sells++;
  }

  return res.status(200).json({
    ok: true,
    count: all.length,
    houseCount: house.length,
    senateCount: senate.length,
    trades: all,
    byTicker,
    computedAt: new Date().toISOString()
  });
}
