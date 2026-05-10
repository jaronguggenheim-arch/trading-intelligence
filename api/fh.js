// Finnhub proxy — keeps API key server-side, adds caching headers
export default async function handler(req, res) {
  const { path, ...params } = req.query;
  if (!path) return res.status(400).json({ error: 'path required' });

  const token = process.env.FH_KEY;
  if (!token) return res.status(500).json({ error: 'FH_KEY not configured' });

  const qs = new URLSearchParams({ ...params, token }).toString();
  const url = `https://finnhub.io/api/v1/${path}?${qs}`;

  try {
    const r = await fetch(url);
    const data = await r.json();

    // Cache aggressively — quote: 1min, news: 15min, financials: 4h
    const isNews = path.includes('news');
    const isFinancials = path.includes('metric') || path.includes('basic-financials');
    const ttl = isFinancials ? 14400 : isNews ? 900 : 60;

    res.setHeader('Cache-Control', `s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'upstream failed', detail: e.message });
  }
}
