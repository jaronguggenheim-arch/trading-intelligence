// api/sync.js — cross-device user data sync via Vercel KV (Upstash Redis)
// GET  /api/sync?credential=<google_jwt>  → returns stored {wl, pos, alerts}
// POST /api/sync  body: {credential, data}  → saves data
// Requires env vars: KV_REST_API_URL, KV_REST_API_TOKEN

async function kvGet(url, token, key) {
  const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const j = await r.json();
  return j.result ? JSON.parse(j.result) : null;
}

async function kvSet(url, token, key, value) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['SET', key, JSON.stringify(value), 'EX', 31536000])
  });
  return r.ok;
}

async function verifyGoogleJWT(credential) {
  const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
  if (!r.ok) return null;
  const info = await r.json();
  if (info.error) return null;
  return { email: info.email, name: info.name, picture: info.picture };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const KV_REST_API_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_REST_API_URL;
  const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_REST_API_TOKEN;
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    return res.status(200).json({ ok: false, reason: 'KV not configured' });
  }

  if (req.method === 'GET') {
    const credential = req.query.credential;
    if (!credential) return res.status(400).json({ error: 'credential required' });
    const user = await verifyGoogleJWT(credential);
    if (!user) return res.status(401).json({ error: 'Invalid credential' });
    const data = await kvGet(KV_REST_API_URL, KV_REST_API_TOKEN, `ti:user:${user.email}`);
    return res.status(200).json({ ok: true, data: data || {}, email: user.email });
  }

  if (req.method === 'POST') {
    const { credential, data } = req.body || {};
    if (!credential || !data) return res.status(400).json({ error: 'credential and data required' });
    const user = await verifyGoogleJWT(credential);
    if (!user) return res.status(401).json({ error: 'Invalid credential' });
    const safe = {
      wl:      Array.isArray(data.wl)  ? data.wl.slice(0, 50)  : [],
      pos:     Array.isArray(data.pos) ? data.pos.slice(0, 50) : [],
      alerts:  data.alerts && typeof data.alerts === 'object' ? data.alerts : {},
      budget:  data.budget || {},
      savedTs: Date.now()
    };
    await kvSet(KV_REST_API_URL, KV_REST_API_TOKEN, `ti:user:${user.email}`, safe);
    return res.status(200).json({ ok: true, saved: safe.savedTs });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
