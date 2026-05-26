import type { VercelRequest, VercelResponse } from '@vercel/node';

const MC_API = process.env.MC_API_INTERNAL || 'https://gateway.tdreman.app/mc';

const HOP_BY_HOP = new Set([
  'connection', 'content-length', 'host', 'keep-alive',
  'proxy-authenticate', 'proxy-authorization', 'te',
  'trailer', 'transfer-encoding', 'upgrade',
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathSegments = req.query.path;
  const pathStr = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments || '';
  const qs = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
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
