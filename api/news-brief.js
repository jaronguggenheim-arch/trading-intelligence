// api/news-brief.js — Grounded plain-English "why it matters" note for a news article.
// POST {headline, summary, ticker, score} -> {brief}
// Uses Vercel AI Gateway (cheap model). Grounded prompt: may not invent facts beyond the inputs.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key) return res.status(200).json({ brief: '' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; }
  } else if (!body) {
    try { const ch = []; for await (const c of req) ch.push(c); body = JSON.parse(Buffer.concat(ch).toString('utf8')); }
    catch (e) { body = {}; }
  }
  const { headline = '', summary = '', ticker = '', score = null } = body || {};
  if (!headline) return res.status(400).json({ error: 'headline required' });

  const prompt = `You are a market analyst writing a short, plain-English context note for a retail investor with a day job.

Headline: ${headline}
Summary: ${summary || '(no summary text provided)'}
Stock: ${ticker || 'n/a'}${score != null ? ` (current signal score ${score}/100)` : ''}

Write 3-4 sentences on why this matters for ${ticker || 'the stock'} and what to watch next.
STRICT rules:
- Use ONLY facts present in the headline and summary above. Do NOT invent numbers, prices, dates, deals, or events not stated there.
- If the summary is thin, stay brief and say what would confirm or break the thesis.
- Plain English, like a smart colleague. No hype, no filler, no disclaimers.
Return only the note text.`;

  const candidates = process.env.AI_MODEL ? [process.env.AI_MODEL]
    : ['openai/gpt-4.1-nano', 'google/gemini-2.0-flash', 'meta/llama-4-scout'];
  for (const model of candidates) {
    try {
      const r = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 240, messages: [{ role: 'user', content: prompt }] }),
        signal: AbortSignal.timeout(15000)
      });
      const data = await r.json();
      if (data && data.error) continue;
      const c = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (c && c.trim()) return res.status(200).json({ brief: c.trim(), model });
    } catch (e) { /* try next model */ }
  }
  return res.status(200).json({ brief: '' });
}
