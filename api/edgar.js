// api/edgar.js — SEC EDGAR multi-mode proxy
//
// GET /api/edgar?cik=0001045810              → Form 4 insider filings (default)
// GET /api/edgar?type=news&ticker=NVDA&cik=xxx → Google News RSS + SEC 8-K filings
// GET /api/edgar?type=fundamentals&ticker=META&cik=xxx → XBRL quarterly revenue + capex
//
// Consolidated to stay within Vercel Hobby 12-function limit.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { type = 'form4', cik, ticker } = req.query;

  if (type === 'news')         return handleNews(req, res, ticker, cik);
  if (type === 'fundamentals') return handleFundamentals(req, res, ticker, cik);
  return handleForm4(req, res, cik);
}

// ── Form 4 (insider filings) ──────────────────────────────────────────────────

async function handleForm4(req, res, rawCik) {
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=600');

  if (!rawCik) return res.status(400).json({ ok: false, error: 'cik parameter required' });

  const digits  = rawCik.replace(/\D/g, '').replace(/^0+/, '') || '0';
  const padded  = digits.padStart(10, '0');
  const cikFull = 'CIK' + padded;

  try {
    const subUrl = `https://data.sec.gov/submissions/${cikFull}.json`;
    const res2   = await fetch(subUrl, {
      headers: {
        'User-Agent': 'TradingIntelligence/1.0 admin@everythingisjustoneclickaway.com',
        'Accept':     'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!res2.ok) {
      return res.status(res2.status).json({ ok: false, error: `EDGAR returned ${res2.status}` });
    }

    const data   = await res2.json();
    const recent = data.filings?.recent || {};
    const forms  = recent.form           || [];
    const dates  = recent.filingDate     || [];
    const accs   = recent.accessionNumber || [];

    const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;

    const filings = [];
    for (let i = 0; i < forms.length; i++) {
      if (forms[i] !== '4' && forms[i] !== '4/A') continue;
      if (new Date(dates[i]).getTime() < sixMonthsAgo) continue;
      const accClean = accs[i] || '';
      filings.push({
        file_date:  dates[i],
        form_type:  forms[i],
        entity_name: data.name || '',
        accessionNumber: accClean,
        secLink: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${padded}&type=4&dateb=&owner=include&count=40`
      });
      if (filings.length >= 15) break;
    }

    return res.status(200).json({
      ok: true,
      cik: padded,
      name: data.name || '',
      filings,
      computedAt: new Date().toISOString()
    });

  } catch (e) {
    console.error('edgar.js form4 error:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

// ── News (Google News RSS + SEC 8-K) ─────────────────────────────────────────

async function handleNews(req, res, ticker, cik) {
  if (!ticker) return res.status(400).json({ error: 'ticker required' });
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');

  const [googleNews, secFilings] = await Promise.allSettled([
    fetchGoogleNews(ticker),
    cik ? fetchSEC8K(cik, ticker) : Promise.resolve([])
  ]);

  return res.status(200).json({
    ok: true,
    ticker,
    news:    googleNews.status  === 'fulfilled' ? googleNews.value  : [],
    filings: secFilings.status  === 'fulfilled' ? secFilings.value  : [],
    ts: Date.now()
  });
}

async function fetchGoogleNews(ticker) {
  const query = encodeURIComponent(`${ticker} stock earnings`);
  const url   = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TradingIntelligence/1.0)' },
    signal: AbortSignal.timeout(6000)
  });
  if (!r.ok) throw new Error(`Google News HTTP ${r.status}`);
  const xml = await r.text();

  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null && items.length < 15) {
    const block   = m[1];
    const title   = stripCdata(xmlTag(block, 'title'));
    const link    = xmlTag(block, 'link');
    const pubDate = xmlTag(block, 'pubDate');
    const source  = xmlTag(block, 'source');
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

async function fetchSEC8K(cik, ticker) {
  const paddedCik = cik.replace(/^0+/, '').padStart(10, '0');
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;

  const r = await fetch(url, {
    headers: { 'User-Agent': 'TradingIntelligence/1.0 admin@everythingisjustoneclickaway.com' },
    signal: AbortSignal.timeout(6000)
  });
  if (!r.ok) throw new Error(`SEC HTTP ${r.status}`);
  const data = await r.json();

  const recent = data?.filings?.recent || {};
  const forms  = recent.form             || [];
  const dates  = recent.filingDate       || [];
  const accnums= recent.accessionNumber  || [];
  const docs   = recent.primaryDocument  || [];

  const filings = [];
  const cutoff  = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10);

  for (let i = 0; i < forms.length && filings.length < 10; i++) {
    if (!['8-K', '8-K/A'].includes(forms[i])) continue;
    if (dates[i] < cutoff) break;
    const acc = accnums[i].replace(/-/g, '');
    const doc = docs[i] || '';
    const viewUrl  = `https://www.sec.gov/Archives/edgar/data/${parseInt(paddedCik, 10)}/${acc}/${doc}`;
    const indexUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${paddedCik}&type=8-K&dateb=&owner=include&count=10`;
    filings.push({
      form:            forms[i],
      filingDate:      dates[i],
      url:             doc ? viewUrl : indexUrl,
      accessionNumber: accnums[i],
      type: 'sec_8k',
      label: classify8K(doc)
    });
  }
  return filings;
}

function classify8K(docName) {
  const n = (docName || '').toLowerCase();
  if (n.includes('earn') || n.includes('result'))           return 'Earnings release';
  if (n.includes('press'))                                   return 'Press release';
  if (n.includes('guidance') || n.includes('outlook'))      return 'Guidance update';
  if (n.includes('acqui') || n.includes('merger'))          return 'M&A announcement';
  if (n.includes('ceo') || n.includes('appoint') || n.includes('officer')) return 'Leadership change';
  return 'Material event';
}

function xmlTag(xml, name) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return m ? stripCdata(m[1].trim()) : '';
}

function stripCdata(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

// ── Fundamentals (EDGAR XBRL quarterly revenue + capex) ──────────────────────

async function handleFundamentals(req, res, ticker, cik) {
  if (!ticker || !cik) return res.status(400).json({ error: 'ticker and cik required' });
  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=43200');

  const paddedCik = cik.replace(/^0+/, '').padStart(10, '0');
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCik}.json`;

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'TradingIntelligence/1.0 admin@everythingisjustoneclickaway.com' },
      signal: AbortSignal.timeout(12000)
    });
    if (!r.ok) throw new Error(`SEC XBRL HTTP ${r.status}`);
    const data = await r.json();

    const gaap = data?.facts?.['us-gaap'] || {};
    const ifrs = data?.facts?.['ifrs-full'] || {};
    const isIfrs = Object.keys(ifrs).length > Object.keys(gaap).length;

    const revenue = extractQuarterly(gaap, [
      'Revenues',
      'RevenueFromContractWithCustomerExcludingAssessedTax',
      'SalesRevenueNet',
    ]) || (isIfrs ? extractQuarterly(ifrs, ['Revenue', 'RevenueFromContractsWithCustomers']) : null);

    const capex = extractQuarterly(gaap, [
      'PaymentsToAcquirePropertyPlantAndEquipment',
      'PaymentsForCapitalImprovements',
      'CapitalExpendituresIncurringObligation',
    ]) || (isIfrs ? extractQuarterly(ifrs, [
      'PaymentsForPurchaseOfPropertyPlantAndEquipment',
      'PurchaseOfPropertyPlantAndEquipment',
      'AcquisitionsOfPropertyPlantAndEquipment',
    ]) : null);

    const opIncome = extractQuarterly(gaap, [
      'OperatingIncomeLoss',
      'IncomeLossFromContinuingOperationsBeforeIncomeTaxes',
    ]);

    return res.status(200).json({
      ok: true,
      ticker: ticker.toUpperCase(),
      cik: paddedCik,
      revenue:         addDeltas(trimRecent(revenue,   8)),
      capex:           addDeltas(trimRecent(capex,      8)),
      operatingIncome: addDeltas(trimRecent(opIncome,   8)),
      ts: Date.now()
    });
  } catch (e) {
    return res.status(500).json({ ok: false, ticker, error: e.message });
  }
}

function daysDiff(startStr, endStr) {
  try { return (new Date(endStr + 'T12:00:00Z') - new Date(startStr + 'T12:00:00Z')) / 864e5; }
  catch { return 0; }
}

function extractQuarterly(taxonomy, conceptNames) {
  for (const name of conceptNames) {
    const concept = taxonomy[name];
    if (!concept?.units) continue;
    const currency = concept.units['USD'] ? 'USD'
      : concept.units['TWD']  ? 'TWD'
      : Object.keys(concept.units)[0];
    const units = concept.units[currency] || [];

    const byEnd = {};
    for (const u of units) {
      if (!['10-Q', '10-K', '20-F'].includes(u.form)) continue;
      if (!u.start) continue;
      const days = daysDiff(u.start, u.end);
      if (days < 60 || days > 125) continue;
      const end = u.end;
      if (!byEnd[end] || (u.filed || '') > (byEnd[end].filed || '')) byEnd[end] = { ...u, currency };
    }

    const quarterly = Object.values(byEnd).sort((a, b) => b.end.localeCompare(a.end));
    if (quarterly.length >= 2) return quarterly;
  }
  return null;
}

function trimRecent(items, n) {
  if (!items) return null;
  return items.slice(0, n).map(u => ({
    period:   u.end,
    start:    u.start,
    value:    u.val,
    currency: u.currency || 'USD',
    form:     u.form,
    filed:    u.filed,
  }));
}

function addDeltas(items) {
  if (!items) return null;
  return items.map((item, i) => {
    const prev = items[i + 1];
    const yoy  = items[i + 4];
    return { ...item, qoq: prev ? pct(item.value, prev.value) : null, yoy: yoy ? pct(item.value, yoy.value) : null };
  });
}

function pct(current, prior) {
  if (!prior || prior === 0) return null;
  return Math.round(((current - prior) / Math.abs(prior)) * 1000) / 10;
}
