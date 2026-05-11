// api/funds.js — SEC EDGAR 13F holdings fetcher (completely free, no API key)
// GET /api/funds?cik=0001336528  → latest 13F-HR holdings for a fund
// Cached 6 hours at Vercel edge — EDGAR rate limits are generous for infrequent reads

const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'TradingIntelligence/1.0 admin@everythingisjustoneclickaway.com',
        'Accept': 'application/json, application/xml, text/xml, */*'
      }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function parseInfoTable(xml) {
  // Parse 13F InfoTable XML — extract issuerName, tickerSymbol, value, shares, type
  // SEC requires tickerSymbol in submissions since 2013 amendments (most filers comply)
  const holdings = [];
  const blockRe = /<infoTable>([\s\S]*?)<\/infoTable>/gi;
  let m;
  while ((m = blockRe.exec(xml)) !== null) {
    const block = m[1];
    const get = (tag) => {
      const r = new RegExp(`<${tag}[^>]*>\\s*([^<]+?)\\s*</${tag}>`, 'i');
      const hit = r.exec(block);
      return hit ? hit[1].trim() : '';
    };
    const name  = get('nameOfIssuer');
    const ticker = get('tickerSymbol').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const value  = parseInt(get('value'), 10) * 1000;  // value reported in thousands
    const shares = parseInt(get('sshPrnamt'), 10) || 0;
    const stype  = get('sshPrnamtType') || '';          // SH or PRN
    const putCall = get('putCall');                     // Put / Call / '' for equity
    if (name && !isNaN(value) && value > 0) {
      holdings.push({ name, ticker: ticker || null, value, shares, stype, putCall: putCall || 'equity' });
    }
  }
  // Sort by portfolio value descending, remove dupes (sum same ticker)
  const byTicker = {};
  for (const h of holdings) {
    const key = h.ticker || h.name.slice(0, 20);
    if (!byTicker[key]) byTicker[key] = { ...h };
    else { byTicker[key].value += h.value; byTicker[key].shares += h.shares; }
  }
  return Object.values(byTicker).sort((a, b) => b.value - a.value);
}

async function getLatest13F(rawCik) {
  // Normalise CIK to 10-digit zero-padded string
  const digits = rawCik.replace(/\D/g, '').replace(/^0+/, '');
  const padded  = digits.padStart(10, '0');
  const cikFull = 'CIK' + padded;
  const cikNum  = parseInt(digits, 10);

  // 1. Fetch submissions manifest
  const subUrl = `https://data.sec.gov/submissions/${cikFull}.json`;
  const subResp = await httpsGet(subUrl);
  if (subResp.status !== 200) throw new Error(`EDGAR submissions ${subResp.status}`);

  const sub = JSON.parse(subResp.body);
  const filings = sub.filings?.recent || {};
  const forms      = filings.form          || [];
  const dates      = filings.filingDate    || [];
  const accessions = filings.accessionNumber || [];

  // 2. Find most recent 13F-HR (not amendment 13F-HR/A for simplicity)
  let idx = forms.findIndex(f => f === '13F-HR' || f === '13F-HR/A');
  if (idx === -1) throw new Error('No 13F-HR found in recent filings');

  const rawAccession  = accessions[idx];                     // e.g. "0001234567-24-000001"
  const filingDate    = dates[idx];
  const accNoHyphens  = rawAccession.replace(/-/g, '');      // "0001234567240000001"

  // 3. Fetch filing index JSON (EDGAR provides this for all modern filings)
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNoHyphens}/${rawAccession}-index.json`;
  const idxResp  = await httpsGet(indexUrl);
  if (idxResp.status !== 200) throw new Error(`Filing index ${idxResp.status}: ${indexUrl}`);

  const idxData  = JSON.parse(idxResp.body);
  const items    = idxData.directory?.item || [];

  // 4. Find the InfoTable XML file (separate file in most modern filings)
  //    Priority: file containing "infotable" in name, then any .xml that isn't primary
  let infoFile = null;
  for (const f of items) {
    const n = (f.name || '').toLowerCase();
    if (n.includes('infotable') && n.endsWith('.xml')) { infoFile = f.name; break; }
  }
  if (!infoFile) {
    for (const f of items) {
      const n = (f.name || '').toLowerCase();
      if (n.endsWith('.xml') && !n.includes('primary') && !n.includes('submission')) {
        infoFile = f.name; break;
      }
    }
  }
  if (!infoFile) throw new Error('InfoTable XML not found in filing');

  // 5. Fetch and parse InfoTable XML
  const xmlUrl  = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNoHyphens}/${infoFile}`;
  const xmlResp = await httpsGet(xmlUrl);
  if (xmlResp.status !== 200) throw new Error(`InfoTable XML ${xmlResp.status}`);

  const allHoldings = parseInfoTable(xmlResp.body);

  // 6. Compute % of portfolio for top holdings
  const totalValue = allHoldings.reduce((s, h) => s + h.value, 0);
  const top25 = allHoldings.slice(0, 25).map(h => ({
    ...h,
    pct: totalValue > 0 ? Math.round((h.value / totalValue) * 1000) / 10 : 0,
    valueM: Math.round(h.value / 1e6)
  }));

  return {
    filingDate,
    totalValue,
    holdingsCount: allHoldings.length,
    top25,
    filingUrl: `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNoHyphens}/${rawAccession}-index.htm`
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Cache aggressively — 13F filings are quarterly, data barely changes intraday
  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=3600');

  const cik = (req.query?.cik || '').replace(/\s/g, '');
  if (!cik) return res.status(400).json({ ok: false, error: 'cik parameter required' });

  // Sanity check — must be digits (possibly zero-padded)
  if (!/^\d{1,10}$/.test(cik.replace(/^0+/, ''))) {
    return res.status(400).json({ ok: false, error: 'invalid cik' });
  }

  try {
    const result = await getLatest13F(cik);
    res.json({ ok: true, cik, ...result });
  } catch (e) {
    console.error('funds.js error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
};
