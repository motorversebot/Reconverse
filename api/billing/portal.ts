import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * "Manage billing" entry point. Square has no Stripe-style hosted customer
 * portal, so operators configure a destination where dealers manage their
 * subscription/payment method:
 *
 *   SQUARE_BILLING_PORTAL_URL  e.g. a Square customer link or a support page
 *
 * If unset, returns a clean error so the UI can fall back to "contact support".
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }
  const url = process.env.SQUARE_BILLING_PORTAL_URL;
  if (!url) {
    res.status(503).json({ ok: false, error: 'portal_not_configured' });
    return;
  }
  res.status(200).json({ ok: true, url });
}
