import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentDealer } from "@/hooks/useDealerData";
import { useSubscription } from "@/hooks/useSubscription";
import { canManageUsers } from "@/lib/permissions";
import { startCheckout, openBillingPortal } from "@/lib/api";
import {
  PLANS,
  getPlan,
  statusLabel,
  daysRemaining,
  needsBillingAttention,
  isLockedOut,
  type PlanKey,
} from "@/lib/plans";
import { cn } from "@/lib/utils";

function Money({ amount }: { amount: number }) {
  return <>${amount.toLocaleString()}</>;
}

export default function DealerBillingPage() {
  const { toast } = useToast();
  const { data: membership } = useCurrentDealer();
  const { user } = useAuth();
  const { data: subscription, isLoading } = useSubscription();
  const [params, setParams] = useSearchParams();
  const [pending, setPending] = useState<PlanKey | null>(null);
  const [portalPending, setPortalPending] = useState(false);

  const role = membership?.role as string | undefined;
  const dealerName =
    (membership as { dealers?: { name?: string } } | undefined)?.dealers?.name ||
    membership?.dealer_name ||
    "your dealership";
  const canManage = canManageUsers(role);
  const currentPlan = getPlan(subscription?.planKey);
  const days = daysRemaining(subscription);

  // Surface the post-checkout redirect result once.
  useEffect(() => {
    const status = params.get("status");
    if (!status) return;
    if (status === "success") {
      toast({
        title: "Payment received",
        description: "Your subscription is being activated. It may take a moment to reflect here.",
      });
    }
    params.delete("status");
    setParams(params, { replace: true });
  }, [params, setParams, toast]);

  async function handleSubscribe(plan: PlanKey) {
    if (!canManage) {
      toast({
        title: "Owner access required",
        description: "Ask an owner or admin to manage the subscription.",
        variant: "destructive",
      });
      return;
    }
    setPending(plan);
    const res = await startCheckout(plan);
    setPending(null);
    if (!("url" in res)) {
      toast({
        title: "Couldn't start checkout",
        description:
          res.error === "billing_not_configured"
            ? "Billing isn't fully configured yet. Contact support."
            : res.error,
        variant: "destructive",
      });
      return;
    }
    window.location.href = res.url;
  }

  async function handleManage() {
    setPortalPending(true);
    const res = await openBillingPortal();
    setPortalPending(false);
    if (!("url" in res)) {
      toast({
        title: "Manage billing unavailable",
        description: "To change your plan or payment method, contact support.",
      });
      return;
    }
    window.location.href = res.url;
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <header className="space-y-1">
        <h1 className="text-xl font-mono font-bold uppercase tracking-widest text-foreground">
          Billing
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your Reconverse subscription for {dealerName}.
        </p>
      </header>

      {/* Current subscription summary */}
      <Card className="p-5 rounded-none border-border">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading subscription…
          </div>
        ) : subscription && subscription.status !== "none" ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Current plan
                </span>
                <Badge
                  variant={isLockedOut(subscription) ? "destructive" : "secondary"}
                  className="rounded-none text-[10px] uppercase tracking-wider"
                >
                  {statusLabel(subscription.status)}
                </Badge>
              </div>
              <p className="text-lg font-semibold text-foreground">
                {currentPlan?.name ?? "—"}
                {currentPlan && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    · <Money amount={currentPlan.priceMonthly} />/mo
                  </span>
                )}
              </p>
              {days !== null && (
                <p className="text-xs text-muted-foreground">
                  {subscription.cancelAtPeriodEnd ? "Ends" : "Renews"} in {days} day
                  {days === 1 ? "" : "s"}
                </p>
              )}
            </div>
            {canManage && (
              <Button
                variant="outline"
                className="rounded-none gap-2"
                onClick={handleManage}
                disabled={portalPending}
              >
                {portalPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Manage billing
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No active subscription</p>
            <p className="text-xs text-muted-foreground">
              Choose a plan below to activate full access for your team.
            </p>
          </div>
        )}
      </Card>

      {/* Banners */}
      {needsBillingAttention(subscription) && (
        <div className="flex items-start gap-3 border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            {subscription?.status === "past_due"
              ? "Your last payment failed. Update your payment method to avoid losing access."
              : subscription?.cancelAtPeriodEnd
                ? "Your subscription is set to cancel at the end of the period."
                : "You're on a trial. Add a plan before it ends to keep your team working."}
          </p>
        </div>
      )}

      {!canManage && (
        <p className="text-xs text-muted-foreground">
          You're signed in as {user?.email}. Only owners and admins can change the subscription.
        </p>
      )}

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = subscription?.planKey === plan.key && subscription?.status !== "none";
          return (
            <Card
              key={plan.key}
              className={cn(
                "flex flex-col p-5 rounded-none border-border",
                plan.popular && "border-foreground ring-1 ring-foreground/20",
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-mono font-bold uppercase tracking-widest text-foreground">
                  {plan.name}
                </h3>
                {plan.popular && (
                  <Badge className="rounded-none text-[9px] uppercase tracking-wider">
                    Popular
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                <Money amount={plan.priceMonthly} />
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-foreground/60" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-5 rounded-none"
                variant={plan.popular ? "default" : "outline"}
                disabled={isCurrent || pending === plan.key || !canManage}
                onClick={() => handleSubscribe(plan.key)}
              >
                {pending === plan.key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isCurrent ? (
                  "Current plan"
                ) : (
                  "Subscribe"
                )}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
