// api/edgar.js — Server-side SEC EDGAR Form 4 proxy
// GET /api/edgar?cik=0001045810  → Form 4 filings for that CIK (last 6 months)
// Cached 30 min at Vercel edge — EDGAR updates infrequently during the day
//
// Why server-side? Browser-direct EDGAR calls get rate-limited per user IP.
// Vercel edge cache means many users share one server-side fetch per 30 min.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Cache 30 min at CDN edge
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=600');

  const rawCik = (req.query?.cik || '').replace(/\s/g, '');
  if (!rawCik) return res.status(400).json({ ok: false, error: 'cik parameter required' });

  // Normalise CIK: strip leading zeros, repad to 10 digits
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

    // Filter to Form 4 / 4A filed in last 6 months
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
    console.error('edgar.js error:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
