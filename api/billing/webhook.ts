import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Square webhook receiver. Verifies the signature, then forwards the event to
 * MC so it can persist/mirror the dealer's subscription state (which the app
 * reads back via GET /api/v1/reconverse/billing/subscription).
 *
 * Env:
 *   SQUARE_WEBHOOK_SIGNATURE_KEY  signature key from the Square webhook config
 *   SQUARE_WEBHOOK_URL            the exact public URL Square calls (this fn)
 *   MC_API_INTERNAL               MC base URL to forward verified events to
 *   MC_WEBHOOK_TOKEN              shared secret MC uses to trust this forwarder
 *
 * Vercel note: signature verification needs the RAW body. We disable body
 * parsing below and read the stream ourselves.
 */
export const config = { api: { bodyParser: false } };

async function readRaw(req: VercelRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function verify(signatureKey: string, notifyUrl: string, rawBody: string, sig: string): boolean {
  // Square: HMAC-SHA256 over (notificationUrl + rawBody), base64-encoded.
  const hmac = createHmac('sha256', signatureKey);
  hmac.update(notifyUrl + rawBody);
  const expected = hmac.digest('base64');
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notifyUrl = process.env.SQUARE_WEBHOOK_URL;
  if (!signatureKey || !notifyUrl) {
    res.status(503).json({ ok: false, error: 'webhook_not_configured' });
    return;
  }

  const raw = await readRaw(req);
  const sig = (req.headers['x-square-hmacsha256-signature'] as string) || '';
  if (!verify(signatureKey, notifyUrl, raw, sig)) {
    res.status(401).json({ ok: false, error: 'bad_signature' });
    return;
  }

  // Forward the verified event to MC for persistence. We always 200 back to
  // Square once the signature is valid so it doesn't retry on MC hiccups; MC
  // is expected to be idempotent on event_id.
  const mc = process.env.MC_API_INTERNAL;
  if (mc) {
    try {
      await fetch(`${mc.replace(/\/+$/, '')}/api/v1/reconverse/billing/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MC-Webhook-Token': process.env.MC_WEBHOOK_TOKEN || '',
        },
        body: raw,
      });
    } catch {
      // Swallow — Square gets a 200; MC reconciles on next event or poll.
    }
  }

  res.status(200).json({ ok: true });
}
