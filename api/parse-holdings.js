// APEX — parse a brokerage holdings screenshot into structured positions via the Vercel AI Gateway.
// Set AI_GATEWAY_API_KEY (your vck_... key) in Vercel env vars.
// Auto-tries several vision models (free-tier first) so it works without a specific model choice.
// Override with AI_MODEL to force one model.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const key = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!key) return res.status(500).json({ error: 'AI_GATEWAY_API_KEY not configured' });

  // Try in order; first one that is available + works wins. Free-tier vision models first.
  const candidates = process.env.AI_MODEL
    ? [process.env.AI_MODEL]
    : ['google/gemini-2.5-flash', 'google/gemini-2.0-flash', 'google/gemini-2.5-flash-lite', 'anthropic/claude-haiku-4.5', 'anthropic/claude-opus-4.7'];

  // Body may arrive parsed (req.body) or raw.
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; }
  } else if (!body) {
    try { const chunks = []; for await (const c of req) chunks.push(c); body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch (e) { body = {}; }
  }

  let { image, mime } = body || {};
  if (!image) return res.status(400).json({ error: 'image (base64) required' });
  let dataUrl;
  if (image.startsWith('data:')) {
    dataUrl = image;
  } else {
    mime = mime || 'image/png';
    if (!/^image\/(png|jpeg|jpg|webp|gif)$/.test(mime)) mime = 'image/png';
    dataUrl = 'data:' + mime + ';base64,' + image;
  }

  const prompt = [
    'You are extracting stock/ETF holdings from a brokerage portfolio screenshot.',
    'Return ONLY valid JSON, no markdown, no commentary, in exactly this shape:',
    '{"positions":[{"ticker":"AAPL","shares":10,"avg_cost":150.25}],"warnings":"short note or empty string"}',
    'Rules:',
    '- ticker: the uppercase trading symbol only.',
    '- shares: numeric quantity held (may be fractional).',
    '- avg_cost: average cost per share if the screenshot shows it; otherwise null. Do NOT use current price as cost.',
    '- If a number is not clearly visible, use null. Never invent values.',
    '- Ignore cash balances, totals, and non-equity rows.',
    '- If you cannot read any holdings, return {"positions":[],"warnings":"could not read holdings"}.'
  ].join('\n');

  let text = '', usedModel = '', lastErr = '';
  for (const model of candidates) {
    try {
      const r = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          max_tokens: 1500,
          messages: [{ role: 'user', content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } }
          ] }]
        })
      });
      const data = await r.json();
      if (data && data.error) { lastErr = (data.error.message || JSON.stringify(data.error)); console.error('model', model, 'rejected:', String(lastErr).slice(0, 200)); continue; }
      if (data && data.choices && data.choices[0] && data.choices[0].message) {
        const c = String(data.choices[0].message.content || '').trim();
        if (c) { text = c; usedModel = model; break; }
      }
      lastErr = 'no content from ' + model;
    } catch (e) { lastErr = e.message; console.error('model', model, 'threw:', e.message); }
  }

  if (!text) return res.status(502).json({ error: 'gateway error', detail: lastErr });

  text = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (e) {
    const sI = text.indexOf('{'), eI = text.lastIndexOf('}');
    if (sI >= 0 && eI > sI) { try { parsed = JSON.parse(text.slice(sI, eI + 1)); } catch (e2) {} }
  }
  if (!parsed || !Array.isArray(parsed.positions)) return res.status(502).json({ error: 'could not parse model output', raw: text.slice(0, 500) });

  const positions = parsed.positions.map(p => ({
    ticker: String(p.ticker || '').toUpperCase().trim(),
    shares: p.shares != null ? Number(p.shares) : null,
    avg_cost: p.avg_cost != null ? Number(p.avg_cost) : null
  })).filter(p => p.ticker);

  return res.status(200).json({ positions, warnings: (parsed.warnings || ''), model: usedModel });
}
