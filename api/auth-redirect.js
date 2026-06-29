// api/auth-redirect.js — Google Sign-In redirect-mode handler (for iOS Safari, which
// blocks the popup/One-Tap flow). Google POSTs the credential (id_token) here after a
// full-page redirect; we bounce it back to the SPA in the URL fragment so the existing
// client-side _gsiCallback can pick it up. Requires the Authorized redirect URI
// https://www.everythingisjustoneclickaway.com/api/auth-redirect in the OAuth client.

export default async function handler(req, res) {
  const base = 'https://www.everythingisjustoneclickaway.com';
  let cred = '';
  let bodyToken = '';
  try {
    let body = req.body;
    if (!body || typeof body !== 'object') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const params = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
      cred = params.get('credential') || '';
      bodyToken = params.get('g_csrf_token') || '';
    } else {
      cred = body.credential || '';
      bodyToken = body.g_csrf_token || '';
    }
    const cookie = req.headers.cookie || '';
    const cookieToken = (cookie.match(/g_csrf_token=([^;]+)/) || [])[1] || '';
    if (bodyToken && cookieToken && bodyToken !== cookieToken) cred = '';
  } catch (e) { cred = ''; }

  const loc = cred ? (base + '/#gcred=' + encodeURIComponent(cred)) : (base + '/?login=failed');
  res.writeHead(302, { Location: loc });
  res.end();
}
