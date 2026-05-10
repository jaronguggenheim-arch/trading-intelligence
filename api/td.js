// Twelvedata proxy — keeps API key server-side, adds caching headers
export default async function handler(req, res) {
  const { endpoint, ...params } = req.query;
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });

  const apikey = process.env.TD_KEY;
  if (!apikey) return res.status(500).json({ error: 'TD_KEY not configured' });

  const qs = new URLSearchParams({ ...params, apikey }).toString();
  const url = `https://api.twelvedata.com/${endpoint}?${qs}`;

  try {
    const r = await fetch(url);
    const data = await r.json();

    // Chart data: 4h cache. Quote: 1min cache.
    const isChart = endpoint === 'time_series';
    const ttl = isChart ? 14400 : 60;

    res.setHeader('Cache-Control', `s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'upstream failed', detail: e.message });
  }
}
