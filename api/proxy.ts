import type { VercelRequest, VercelResponse } from '@vercel/node';

// Public URL of the Motorverse Mission Control gateway.
// Set this in Vercel: Settings -> Environment Variables -> Production -> MC_API_INTERNAL
// MC is currently LAN-only (motorverse.genesis.lan); the deployment will return a
// clean 503 below until a public MC transport exists and this var is set.
const MC_API = process.env.MC_API_INTERNAL;

const HOP_BY_HOP = new Set([
  'connection', 'content-length', 'host', 'keep-alive',
  'proxy-authenticate', 'proxy-authorization', 'te',
  'trailer', 'transfer-encoding', 'upgrade',
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Hard-fail with a JSON-shaped error when the transport isn't configured.
  // The client (lib/api.ts) expects { ok: false, error: string } shapes — this
  // surfaces as a clean 'MC gateway not configured' error instead of HTML 404.
  if (!MC_API) {
    res.status(503).json({
      ok: false,
      error: 'mc_unreachable',
      detail: 'MC_API_INTERNAL is not set on this Vercel deployment. Set it to the public MC URL and redeploy.',
    });
    return;
  }

  let pathStr = '';
  let qs = '';
  if (req.query.path !== undefined) {
    pathStr = Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path);
    const u = req.url || '';
    const qIdx = u.indexOf('?');
    if (qIdx >= 0) {
      const params = new URLSearchParams(u.slice(qIdx + 1));
      params.delete('path');
      const remaining = params.toString();
      qs = remaining ? `?${remaining}` : '';
    }
  } else {
    const u = req.url || '';
    const qIdx = u.indexOf('?');
    const pathPart = qIdx >= 0 ? u.slice(0, qIdx) : u;
    qs = qIdx >= 0 ? u.slice(qIdx) : '';
    pathStr = pathPart.replace(/^\/api\//, '');
  }

  const target = `${MC_API.replace(/\/+$/, '')}/api/v1/${pathStr}${qs}`;

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (!HOP_BY_HOP.has(k.toLowerCase()) && typeof v === 'string') {
      headers[k] = v;
    }
  }

  try {
    const upstream = await fetch(target, {
      method: req.method || 'GET',
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD'
        ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
        : undefined,
      redirect: 'manual',
    });

    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);
    const cd = upstream.headers.get('content-disposition');
    if (cd) res.setHeader('content-disposition', cd);
    const loc = upstream.headers.get('location');
    if (loc) res.setHeader('location', loc);

    res.status(upstream.status);
    const body = await upstream.arrayBuffer();
    res.send(Buffer.from(body));
  } catch {
    res.status(502).json({ ok: false, error: 'gateway_error' });
  }
}
