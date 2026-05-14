// api/push.js — Push notifications + email subscriptions + Stripe billing
//
// GET  /api/push?action=vapid-public
// GET  /api/push?action=unsub&email=...&token=...
// GET  /api/push?action=stripe-check&email=...
// POST /api/push {action:'email', email}
// POST /api/push {action:'subscribe', subscription, email}
// POST /api/push {action:'send', ticker, type, message, url}
// POST /api/push {action:'stripe-checkout', email, returnUrl}
// POST /api/push {action:'stripe-webhook'}  (raw body, Stripe-Signature header)

const PUSH_KEY = (e) => `ti:push:${e.toLowerCase().trim()}`;
const PRO_KEY  = (e) => `ti:pro:${e.toLowerCase().trim()}`;
const PUSH_ALL  = 'ti:push:all';

// ── Base64url helpers ──────────────────────────────────────────────────────────
function b64uEncode(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
function b64uDecode(s) {
  s = s.replace(/-/g,'+').replace(/_/g,'/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

// ── KV helpers ─────────────────────────────────────────────────────────────────
async function kvExec(url, token, cmd) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd),
      signal: AbortSignal.timeout(6000)
    });
    return (await r.json()).result ?? null;
  } catch { return null; }
}
const kvGet  = async (u,t,k) => { const r = await kvExec(u,t,['GET',k]); try { return r ? JSON.parse(r) : null; } catch { return null; } };
const kvSet  = (u,t,k,v,ex) => ex ? kvExec(u,t,['SET',k,JSON.stringify(v),'EX',ex]) : kvExec(u,t,['SET',k,JSON.stringify(v)]);
const kvSAdd = (u,t,k,...m)   => kvExec(u,t,['SADD',k,...m]);
const kvSRem = (u,t,k,m)     => kvExec(u,t,['SREM',k,m]);
const kvSMem = async (u,t,k) => { const r = await kvExec(u,t,['SMEMBERS',k]); return Array.isArray(r) ? r : []; };

// ── Unsubscribe token ──────────────────────────────────────────────────────────
function makeUnsubToken(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = ((hash << 5) - hash + email.charCodeAt(i)) | 0;
  return Math.abs(hash).toString(36) + email.length.toString(36);
}

// ── VAPID JWT ──────────────────────────────────────────────────────────────────
async function makeVapidJwt(audience, subject, privKeyB64u) {
  const header  = b64uEncode(new TextEncoder().encode(JSON.stringify({typ:'JWT',alg:'ES256'})));
  const payload = b64uEncode(new TextEncoder().encode(JSON.stringify({
    aud: audience, exp: Math.floor(Date.now()/1000)+86400, sub: subject
  })));
  const unsigned = `${header}.${payload}`;
  const privKey = await globalThis.crypto.subtle.importKey(
    'pkcs8', buildPkcs8(b64uDecode(privKeyB64u)),
    { name:'ECDSA', namedCurve:'P-256' }, false, ['sign']
  );
  const sigBuf = await globalThis.crypto.subtle.sign(
    { name:'ECDSA', hash:'SHA-256' }, privKey, new TextEncoder().encode(unsigned)
  );
  return `${unsigned}.${b64uEncode(sigBuf)}`;
}

function buildPkcs8(rawKey) {
  const h = new Uint8Array([0x30,0x41,0x02,0x01,0x00,0x30,0x13,0x06,0x07,0x2a,0x86,0x48,0xce,0x3d,0x02,0x01,0x06,0x08,0x2a,0x86,0x48,0xce,0x3d,0x03,0x01,0x07,0x04,0x27,0x30,0x25,0x02,0x01,0x01,0x04,0x20]);
  const r = new Uint8Array(h.length+32); r.set(h); r.set(rawKey.slice(0,32),h.length); return r.buffer;
}

// ── Push encryption ────────────────────────────────────────────────────────────
function concat(...arrays) {
  const out = new Uint8Array(arrays.reduce((s,a)=>s+a.length,0)); let off=0;
  for (const a of arrays){out.set(a,off);off+=a.length;} return out;
}

async function sendPush(subscription, payloadStr, pubKeyB64u, privKeyB64u, vapidEmail) {
  const endpoint = new URL(subscription.endpoint);
  const audience = `${endpoint.protocol}//${endpoint.host}`;
  const jwt  = await makeVapidJwt(audience, vapidEmail, privKeyB64u);
  const auth = `vapid t=${jwt},k=${pubKeyB64u}`;
  const clientPubRaw = b64uDecode(subscription.keys?.p256dh||'');
  const authSecret   = b64uDecode(subscription.keys?.auth||'');
  if (!clientPubRaw.length||!authSecret.length) {
    const r = await fetch(subscription.endpoint,{method:'POST',headers:{Authorization:auth,TTL:'86400','Content-Type':'application/json'},body:payloadStr,signal:AbortSignal.timeout(10000)});
    return r.status;
  }
  const serverKP=await globalThis.crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const serverPubRaw=new Uint8Array(await globalThis.crypto.subtle.exportKey('raw',serverKP.publicKey));
  const clientPubKey=await globalThis.crypto.subtle.importKey('raw',clientPubRaw,{name:'ECDH',namedCurve:'P-256'},false,[]);
  const sharedBits=await globalThis.crypto.subtle.deriveBits({name:'ECDH',public:clientPubKey},serverKP.privateKey,256);
  const hmacKey=await globalThis.crypto.subtle.importKey('raw',authSecret,{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const prk=new Uint8Array(await globalThis.crypto.subtle.sign('HMAC',hmacKey,new Uint8Array(sharedBits)));
  const ctx=concat(new TextEncoder().encode('P-256\0'),new Uint8Array([0,65]),clientPubRaw,new Uint8Array([0,65]),serverPubRaw);
  const salt=globalThis.crypto.getRandomValues(new Uint8Array(16));
  const saltKey=await globalThis.crypto.subtle.importKey('raw',salt,{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const saltedPrk=new Uint8Array(await globalThis.crypto.subtle.sign('HMAC',saltKey,prk));
  const saltedKey=await globalThis.crypto.subtle.importKey('raw',saltedPrk,{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const cekInfo=concat(new TextEncoder().encode('Content-Encoding: aesgcm\0'),ctx);
  const nonceInfo=concat(new TextEncoder().encode('Content-Encoding: nonce\0'),ctx);
  const cek=new Uint8Array(await globalThis.crypto.subtle.sign('HMAC',saltedKey,concat(cekInfo,new Uint8Array([1])))).slice(0,16);
  const nonce=new Uint8Array(await globalThis.crypto.subtle.sign('HMAC',saltedKey,concat(nonceInfo,new Uint8Array([1])))).slice(0,12);
  const aesKey=await globalThis.crypto.subtle.importKey('raw',cek,{name:'AES-GCM'},false,['encrypt']);
  const ciphertext=new Uint8Array(await globalThis.crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,tagLength:128},aesKey,concat(new Uint8Array([0,0]),new TextEncoder().encode(payloadStr))));
  const r=await fetch(subscription.endpoint,{method:'POST',headers:{Authorization:auth,TTL:'86400','Content-Type':'application/octet-stream','Content-Encoding':'aesgcm',Encryption:`salt=${b64uEncode(salt)}`,'Crypto-Key':`dh=${b64uEncode(serverPubRaw)};p256ecdsa=${pubKeyB64u}`,'Content-Length':String(ciphertext.length)},body:ciphertext,signal:AbortSignal.timeout(10000)});
  return r.status;
}

// ── Stripe helpers ─────────────────────────────────────────────────────────────
async function stripePost(path, params, secretKey) {
  const body = Object.entries(params)
    .flatMap(([k,v]) => Array.isArray(v) ? v.map((x,i)=>`${k}[${i}]=${encodeURIComponent(x)}`) : [`${k}=${encodeURIComponent(v)}`])
    .join('&');
  const r = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body,
    signal: AbortSignal.timeout(10000)
  });
  return r.json();
}

async function verifyStripeWebhook(rawBody, sigHeader, secret) {
  const parts = Object.fromEntries(sigHeader.split(',').map(p => p.split('=')));
  const ts = parts.t;
  const sig = parts.v1;
  if (!ts || !sig) return null;
  const payload = `${ts}.${rawBody}`;
  const key = await globalThis.crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']
  );
  const computed = Array.from(new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))))
    .map(b => b.toString(16).padStart(2,'0')).join('');
  if (computed !== sig) return null;
  if (Math.abs(Date.now()/1000 - parseInt(ts)) > 300) return null; // 5-min tolerance
  try { return JSON.parse(rawBody); } catch { return null; }
}

// ── Handler ────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Stripe-Signature');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const {
    VAPID_PUBLIC_KEY:  pubKey,
    VAPID_PRIVATE_KEY: privKey,
    VAPID_EMAIL:       vapidEmail = 'mailto:jaronguggenheim@gmail.com',
    KV_REST_API_URL:   kvUrl,
    KV_REST_API_TOKEN: kvToken,
    STRIPE_SECRET_KEY: stripeKey,
    STRIPE_WEBHOOK_SECRET: stripeWhSecret,
    STRIPE_PRICE_ID:   stripePriceId
  } = process.env;

  // ── GET ────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { action, email, token: tok } = req.query || {};

    if (action === 'vapid-public')
      return res.status(200).json({ ok: true, publicKey: pubKey || '' });

    if (action === 'unsub') {
      if (!email || !tok) return res.status(400).send('Missing params');
      if (tok !== makeUnsubToken(decodeURIComponent(email))) return res.status(403).send('Invalid token');
      if (kvUrl && kvToken) await kvSRem(kvUrl, kvToken, 'ti:subscribers', decodeURIComponent(email));
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(`<html><body style="font-family:sans-serif;padding:40px;text-align:center;color:#111"><h2>You've been unsubscribed</h2><p>You won't receive the Morning Brief anymore.</p><a href="https://www.everythingisjustoneclickaway.com" style="color:#10b981">Back to app</a></body></html>`);
    }

    // Check Pro subscription status
    if (action === 'stripe-check') {
      if (!email) return res.status(400).json({ ok: false, error: 'email required' });
      if (!kvUrl || !kvToken) return res.status(200).json({ ok: true, pro: false });
      const norm = decodeURIComponent(email).toLowerCase().trim();
      const sub  = await kvGet(kvUrl, kvToken, PRO_KEY(norm));
      return res.status(200).json({ ok: true, pro: !!(sub && sub.active) });
    }

    return res.status(400).json({ ok: false, error: 'Unknown action' });
  }

  if (req.method !== 'POST') return res.status(405).end();

  // ── Stripe webhook — raw body needed ──────────────────────────────────────
  const sigHeader = req.headers['stripe-signature'];
  if (sigHeader) {
    if (!stripeWhSecret) return res.status(400).json({ error: 'Webhook secret not configured' });
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const event = await verifyStripeWebhook(rawBody, sigHeader, stripeWhSecret);
    if (!event) return res.status(400).json({ error: 'Invalid signature' });

    if (event.type === 'checkout.session.completed' || event.type === 'customer.subscription.created') {
      const session = event.data.object;
      const email   = (session.customer_email || session.metadata?.email || '').toLowerCase().trim();
      const custId  = session.customer;
      const subId   = session.subscription || session.id;
      if (email && kvUrl && kvToken) {
        await kvSet(kvUrl, kvToken, PRO_KEY(email), {
          active: true, customerId: custId, subscriptionId: subId,
          activatedAt: new Date().toISOString()
        }, 60 * 60 * 24 * 400); // 400 day TTL
        await kvSAdd(kvUrl, kvToken, 'ti:pro:all', email);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub   = event.data.object;
      const email = (sub.metadata?.email || '').toLowerCase().trim();
      if (email && kvUrl && kvToken) {
        await kvSet(kvUrl, kvToken, PRO_KEY(email), { active: false, cancelledAt: new Date().toISOString() });
        await kvSRem(kvUrl, kvToken, 'ti:pro:all', email);
      }
    }

    return res.status(200).json({ received: true });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch {} }
  const { action } = body || {};

  // ── Email subscribe ────────────────────────────────────────────────────────
  if (action === 'email') {
    if (!kvUrl || !kvToken) return res.status(200).json({ ok: false, reason: 'KV not configured' });
    const { email } = body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });
    await kvSAdd(kvUrl, kvToken, 'ti:subscribers', email.toLowerCase().trim());
    return res.status(200).json({ ok: true });
  }

  // ── Web Push subscribe ─────────────────────────────────────────────────────
  if (action === 'subscribe') {
    if (!kvUrl || !kvToken) return res.status(500).json({ ok: false, error: 'KV not configured' });
    const { subscription, email = 'anon' } = body;
    if (!subscription?.endpoint) return res.status(400).json({ ok: false, error: 'subscription required' });
    const key      = PUSH_KEY(email);
    const existing = (await kvGet(kvUrl, kvToken, key)) || [];
    const filtered = existing.filter(s => s.endpoint !== subscription.endpoint);
    filtered.push({ ...subscription, createdAt: Date.now() });
    await kvSet(kvUrl, kvToken, key, filtered.slice(-5));
    await kvSAdd(kvUrl, kvToken, PUSH_ALL, email);
    return res.status(200).json({ ok: true, devices: filtered.length });
  }

  // ── Web Push send ──────────────────────────────────────────────────────────
  if (action === 'send') {
    if (!pubKey||!privKey) return res.status(500).json({ ok:false, error:'VAPID keys not configured' });
    if (!kvUrl||!kvToken)  return res.status(500).json({ ok:false, error:'KV not configured' });
    const { ticker, type='chain', message, url='/' } = body;
    const title = type==='chain' ? `⚡ Chain Window: ${ticker}` : type==='velocity' ? `🚀 Score Spike: ${ticker}` : type==='insider' ? `👀 Insider Signal: ${ticker}` : `📈 Signal: ${ticker}`;
    const payload = JSON.stringify({ title, body: message||title, url, tag: ticker });
    const emails  = await kvSMem(kvUrl, kvToken, PUSH_ALL);
    let sent=0, failed=0;
    await Promise.all(emails.map(async (em) => {
      const subs = (await kvGet(kvUrl, kvToken, PUSH_KEY(em))) || [];
      for (const sub of subs) {
        try {
          const status = await sendPush(sub, payload, pubKey, privKey, vapidEmail);
          if (status>=200&&status<300) sent++;
          else { if (status===410) await kvSet(kvUrl,kvToken,PUSH_KEY(em),subs.filter(s=>s.endpoint!==sub.endpoint)); failed++; }
        } catch { failed++; }
      }
    }));
    return res.status(200).json({ ok:true, sent, failed, emails: emails.length });
  }

  // ── Stripe checkout session ────────────────────────────────────────────────
  if (action === 'stripe-checkout') {
    if (!stripeKey || !stripePriceId)
      return res.status(500).json({ ok: false, error: 'Stripe not configured' });
    const { email, returnUrl = 'https://www.everythingisjustoneclickaway.com' } = body;
    if (!email || !email.includes('@'))
      return res.status(400).json({ ok: false, error: 'Valid email required' });

    const session = await stripePost('/checkout/sessions', {
      mode: 'subscription',
      'line_items[0][price]': stripePriceId,
      'line_items[0][quantity]': '1',
      customer_email: email.toLowerCase().trim(),
      'metadata[email]': email.toLowerCase().trim(),
      success_url: `${returnUrl}?pro=success&email=${encodeURIComponent(email)}`,
      cancel_url:  `${returnUrl}?pro=cancel`
    }, stripeKey);

    if (session.url) return res.status(200).json({ ok: true, url: session.url });
    return res.status(500).json({ ok: false, error: session.error?.message || 'Checkout failed' });
  }

  return res.status(400).json({ ok: false, error: 'Unknown action' });
}
