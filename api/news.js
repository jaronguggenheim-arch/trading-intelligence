// api/news.js — Free news aggregator: Google News RSS + SEC EDGAR 8-K filings
// No API key required. Called by the browser for per-ticker news enrichment.
// GET /api/news?ticker=NVDA&cik=0001045810

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { ticker, cik } = req.query;
  if (!ticker) return res.status(400).json({ error: 'ticker required' });

  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800'); // 15min cache

  const [googleNews, secFilings] = await Promise.allSettled([
    fetchGoogleNews(ticker),
    cik ? fetchSEC8K(cik, ticker) : Promise.resolve([])
  ]);

  const news    = googleNews.status  === 'fulfilled' ? googleNews.value  : [];
  const filings = secFilings.status  === 'fulfilled' ? secFilings.value  : [];

  return res.status(200).json({
    ok: true,
    ticker,
    news,
    filings,
    ts: Date.now()
  });
}

// ── Google News RSS ───────────────────────────────────────────────────────────
async function fetchGoogleNews(ticker) {
  const query = encodeURIComponent(`${ticker} stock earnings`);
  const url   = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TradingIntelligence/1.0)' },
    signal: AbortSignal.timeout(6000)
  });
  if (!r.ok) throw new Error(`Google News HTTP ${r.status}`);
  const xml = await r.text();

  // Parse <item> blocks
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null && items.length < 15) {
    const block = m[1];
    const title  = stripCdata(tag(block, 'title'));
    const link   = tag(block, 'link');
    const pubDate= tag(block, 'pubDate');
    const source = tag(block, 'source');
    if (!title) continue;
    items.push({
      title,
      url: link || '',
      source: source || 'Google News',
      publishedAt: pubDate ? new Date(pubDate).toISOString() : null,
      type: 'news'
    });
  }
  return items;
}

// ── SEC EDGAR 8-K recent filings ─────────────────────────────────────────────
async function fetchSEC8K(cik, ticker) {
  const paddedCik = cik.replace(/^0+/, '').padStart(10, '0');
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;

  const r = await fetch(url, {
    headers: { 'User-Agent': 'trading-intelligence contact@example.com' },
    signal: AbortSignal.timeout(6000)
  });
  if (!r.ok) throw new Error(`SEC HTTP ${r.status}`);
  const data = await r.json();

  const recent = data?.filings?.recent || {};
  const forms  = recent.form         || [];
  const dates  = recent.filingDate   || [];
  const accnums= recent.accessionNumber || [];
  const docs   = recent.primaryDocument || [];

  const filings = [];
  const cutoff  = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10); // 6 months

  for (let i = 0; i < forms.length && filings.length < 10; i++) {
    if (!['8-K', '8-K/A'].includes(forms[i])) continue;
    if (dates[i] < cutoff) break; // filings are newest-first
    const acc = accnums[i].replace(/-/g, '');
    const doc = docs[i] || '';
    const viewUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(paddedCik, 10)}/${acc}/${doc}`;
    const indexUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${paddedCik}&type=8-K&dateb=&owner=include&count=10`;
    filings.push({
      form: forms[i],
      filingDate: dates[i],
      url: doc ? viewUrl : indexUrl,
      accessionNumber: accnums[i],
      type: 'sec_8k',
      label: classify8K(doc)
    });
  }
  return filings;
}

// ── 8-K classification heuristic ─────────────────────────────────────────────
function classify8K(docName) {
  const n = (docName || '').toLowerCase();
  if (n.includes('earn') || n.includes('result')) return 'Earnings release';
  if (n.includes('press'))                         return 'Press release';
  if (n.includes('guidance') || n.includes('outlook')) return 'Guidance update';
  if (n.includes('acqui') || n.includes('merger')) return 'M&A announcement';
  if (n.includes('ceo') || n.includes('appoint') || n.includes('officer')) return 'Leadership change';
  return 'Material event';
}

// ── XML helpers ───────────────────────────────────────────────────────────────
function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return m ? stripCdata(m[1].trim()) : '';
}

function stripCdata(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}
