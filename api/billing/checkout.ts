import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Square checkout — creates a hosted payment link for the selected plan and
 * returns its URL. The browser redirects there to collect payment.
 *
 * Env (set in Vercel, server-side only):
 *   SQUARE_ACCESS_TOKEN      Square access token (sandbox or production)
 *   SQUARE_ENVIRONMENT       'sandbox' | 'production'  (default 'production')
 *   SQUARE_LOCATION_ID       Square location the sale belongs to
 *   SQUARE_PLAN_STARTER      price in cents for the Starter plan (e.g. 19900)
 *   SQUARE_PLAN_PRO          price in cents for the Pro plan
 *   SQUARE_PLAN_ENTERPRISE   price in cents for the Enterprise plan
 *   APP_URL                  public app origin for the post-checkout redirect
 *   MC_API_INTERNAL          MC base URL, used to identify the dealer from the
 *                            caller's bearer token (optional but recommended)
 *
 * See docs/BILLING.md for the full setup, including how the recurring Square
 * subscription is finalized via api/billing/webhook.ts + MC.
 */

const PLAN_PRICE_ENV: Record<string, string> = {
  starter: 'SQUARE_PLAN_STARTER',
  pro: 'SQUARE_PLAN_PRO',
  enterprise: 'SQUARE_PLAN_ENTERPRISE',
};

const PLAN_NAMES: Record<string, string> = {
  starter: 'Reconverse Starter',
  pro: 'Reconverse Pro',
  enterprise: 'Reconverse Enterprise',
};

function squareBase(): string {
  return process.env.SQUARE_ENVIRONMENT === 'sandbox'
    ? 'https://connect.squareupsandbox.com'
    : 'https://connect.squareup.com';
}

/** Best-effort: resolve the calling dealer's email from MC for prefill/reference. */
async function resolveBuyer(
  req: VercelRequest,
): Promise<{ email?: string; dealerId?: string }> {
  const mc = process.env.MC_API_INTERNAL;
  const auth = req.headers.authorization;
  if (!mc || !auth) return {};
  try {
    const r = await fetch(`${mc.replace(/\/+$/, '')}/api/v1/auth/me`, {
      headers: { authorization: auth },
    });
    if (!r.ok) return {};
    const j = await r.json().catch(() => null);
    const user = j?.data?.user;
    return { email: user?.email, dealerId: user?.dealer_id ?? undefined };
  } catch {
    return {};
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  const token = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!token || !locationId) {
    res.status(503).json({ ok: false, error: 'billing_not_configured' });
    return;
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const plan = String(body?.plan || '');
  const priceEnv = PLAN_PRICE_ENV[plan];
  if (!priceEnv) {
    res.status(400).json({ ok: false, error: 'invalid_plan' });
    return;
  }
  const amount = Number(process.env[priceEnv]);
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(503).json({ ok: false, error: 'plan_price_not_configured' });
    return;
  }

  const { email, dealerId } = await resolveBuyer(req);
  const appUrl = (process.env.APP_URL || '').replace(/\/+$/, '');

  const payload = {
    idempotency_key: `rv-${dealerId ?? 'anon'}-${plan}-${Date.now()}`,
    quick_pay: {
      name: PLAN_NAMES[plan] ?? `Reconverse ${plan}`,
      price_money: { amount: Math.round(amount), currency: 'USD' },
      location_id: locationId,
    },
    checkout_options: {
      redirect_url: appUrl ? `${appUrl}/dealer/billing?status=success` : undefined,
      ask_for_shipping_address: false,
    },
    pre_populated_data: email ? { buyer_email: email } : undefined,
    // Carry the dealer + plan so the webhook can reconcile the subscription.
    payment_note: `dealer:${dealerId ?? ''};plan:${plan}`,
  };

  try {
    const r = await fetch(`${squareBase()}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Square-Version': '2025-01-23',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => null);
    const url = j?.payment_link?.url;
    if (!r.ok || !url) {
      res.status(502).json({ ok: false, error: 'square_error', detail: j?.errors ?? null });
      return;
    }
    res.status(200).json({ ok: true, url });
  } catch {
    res.status(502).json({ ok: false, error: 'square_unreachable' });
  }
}

function safeParse(s: string): Record<string, unknown> | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
