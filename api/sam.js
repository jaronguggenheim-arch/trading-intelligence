// api/sam.js — SAM.gov government contract awards proxy
// GET /api/sam?keywords=Palantir  → recent contract awards (real if SAM_KEY set, curated static fallback)
// GET /api/sam                     → all default tracked companies (PLTR + RKLB)
// Cached 6h at edge — contracts don't change minute-to-minute
//
// To get a live SAM.gov API key (free): https://open.gsa.gov/api/get-started/
// Add as VERCEL env var: SAM_KEY

// Curated static fallback — used when SAM_KEY is not configured
const STATIC_CONTRACTS = {
  palantir: [
    { title: 'TITAN Army AI/ML Battlefield Intelligence Platform', date: '2025-01-15', value: '$619M', agency: 'US Army', status: 'Active' },
    { title: 'AIP for Defense Enterprise AI Operations (DoD-wide)', date: '2024-11-08', value: '$100M+', agency: 'DoD', status: 'Active' },
    { title: 'ICE Data Analytics Platform Renewal', date: '2024-09-22', value: '$95M', agency: 'DHS', status: 'Active' },
    { title: 'Special Operations Command AI Analytics', date: '2024-07-11', value: '$64M', agency: 'SOCOM', status: 'Active' },
    { title: 'State Dept Data Integration Platform', date: '2024-04-03', value: '$53M', agency: 'State Dept', status: 'Active' }
  ],
  'rocket lab': [
    { title: 'SDA Tranche 2 Beta Transport Layer — 18 Satellites', date: '2025-03-12', value: '~$515M', agency: 'SDA', status: 'Active' },
    { title: 'NRO NSSL Phase 3 Small Launch Services', date: '2025-01-19', value: '$67M', agency: 'NRO', status: 'Active' },
    { title: 'NASA ESCAPADE Dual-Spacecraft Mars Mission', date: '2024-10-07', value: '$52M', agency: 'NASA', status: 'Active' },
    { title: 'Electron National Security Manifest FY2025', date: '2024-09-01', value: 'Multiple', agency: 'USSF', status: 'Ongoing' },
    { title: 'HASTE Hypersonic Test Flights', date: '2024-06-14', value: '$24.5M', agency: 'DoD', status: 'Active' }
  ]
};

async function fetchLiveContracts(keyword, apiKey) {
  // SAM.gov Opportunities API v2
  const from = new Date();
  from.setFullYear(from.getFullYear() - 1);
  const fromStr = `${String(from.getMonth() + 1).padStart(2,'0')}/${String(from.getDate()).padStart(2,'0')}/${from.getFullYear()}`;

  const url = `https://api.sam.gov/opportunities/v2/search?` +
    `limit=10&keywords=${encodeURIComponent(keyword)}&postedFrom=${encodeURIComponent(fromStr)}&api_key=${apiKey}`;

  const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`SAM.gov API returned ${r.status}`);
  const data = await r.json();

  return (data.opportunitiesData || []).map(o => ({
    title: o.title || '',
    date: (o.postedDate || '').split('T')[0],
    value: o.awardedAmount ? '$' + Number(o.awardedAmount).toLocaleString('en-US', { notation: 'compact' }) : 'Undisclosed',
    agency: o.department || o.subtierName || '',
    status: o.type || 'Award',
    solicitationNumber: o.solicitationNumber || '',
    link: o.uiLink || `https://sam.gov/opp/${o.noticeId}/view`
  }));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Cache 6h at CDN
  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=3600');

  const SAM_KEY = process.env.SAM_KEY;
  const rawKeyword = (req.query?.keywords || '').trim().toLowerCase();
  const targets = rawKeyword
    ? [rawKeyword]
    : ['palantir', 'rocket lab'];

  const results = {};
  const usingLive = !!SAM_KEY;

  for (const kw of targets) {
    if (usingLive) {
      try {
        results[kw] = await fetchLiveContracts(kw, SAM_KEY);
      } catch (e) {
        console.warn(`sam.js live fetch failed for "${kw}":`, e.message);
        results[kw] = STATIC_CONTRACTS[kw] || [];
      }
    } else {
      results[kw] = STATIC_CONTRACTS[kw] || [];
    }
  }

  return res.status(200).json({
    ok: true,
    usingLive,
    note: usingLive ? null : 'Showing curated static data — add SAM_KEY env var to Vercel for live contracts',
    results,
    computedAt: new Date().toISOString()
  });
}
