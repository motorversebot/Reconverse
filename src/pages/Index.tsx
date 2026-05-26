import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight,
  ClipboardCheck,
  Calculator,
  ThumbsUp,
  Wrench,
  ShieldCheck,
  Tag,
  Car,
  Camera,
  Activity,
  Users,
  Smartphone,
  Gauge,
  CheckCircle2,
  Github,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { provisionDealerIfNeeded } from "@/lib/provisionDealer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ── Pipeline stages used in the hero + pipeline section ── */
const STAGES = [
  { id: "intake",     label: "Intake",     icon: Car,             tint: "text-sky-400",     dot: "bg-sky-400" },
  { id: "mpi",        label: "MPI",        icon: ClipboardCheck,  tint: "text-amber-400",   dot: "bg-amber-400" },
  { id: "estimate",   label: "Estimate",   icon: Calculator,      tint: "text-blue-400",    dot: "bg-blue-400" },
  { id: "approval",   label: "Approval",   icon: ThumbsUp,        tint: "text-orange-400",  dot: "bg-orange-400" },
  { id: "repair",     label: "Repair",     icon: Wrench,          tint: "text-purple-400",  dot: "bg-purple-400" },
  { id: "qc",         label: "QC",         icon: ShieldCheck,     tint: "text-teal-400",    dot: "bg-teal-400" },
  { id: "ready",      label: "Ready",      icon: Tag,             tint: "text-emerald-400", dot: "bg-emerald-400" },
] as const;

/* ── Top navigation ── */
function Nav() {
  return (
    <nav className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border/30">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-emerald-500 grid place-items-center text-background font-black text-sm tracking-tight">
            R
          </div>
          <span className="font-bold tracking-tight text-foreground/90">Reconverse</span>
          <span className="hidden sm:inline text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60 ml-1">.app</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden sm:inline text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <Button asChild size="sm" className="gap-1.5 h-8 text-xs font-medium">
            <Link to="/login">
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}

/* ── Hero ── */
function Hero() {
  return (
    <section className="relative bg-gradient-hero overflow-hidden">
      {/* faint grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          {/* Eyebrow */}
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium tracking-wide uppercase text-primary/80 bg-primary/10 border border-primary/20">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Recon workflow for modern dealerships
          </span>

          {/* Headline */}
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05] text-foreground">
            Move every used car from{" "}
            <span className="text-gradient-accent">intake to frontline</span>{" "}
            in days, not weeks.
          </h1>

          {/* Sub */}
          <p className="mt-5 text-base sm:text-lg text-muted-foreground/90 max-w-2xl leading-relaxed">
            Reconverse gives your dealership one real-time pipeline for inspections, estimates,
            approvals, and repairs — built mobile-first for the lot, not the back office.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            <Button asChild size="lg" className="gap-2 h-11 px-6 font-semibold">
              <Link to="/login">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2 h-11 px-6 font-medium border-border/40 text-foreground/80">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>

          {/* Reassurance line */}
          <p className="mt-5 text-[12px] text-muted-foreground/50">
            No credit card required · Multi-rooftop ready · Mobile-first
          </p>
        </div>

        {/* Pipeline preview card */}
        <div className="mt-14 sm:mt-16">
          <PipelineCard />
        </div>
      </div>
    </section>
  );
}

/* ── Hero pipeline card (also acts as the visual centerpiece) ── */
function PipelineCard() {
  return (
    <div className="glass-panel-strong p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 px-1">
        <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground/50">
          Recon Pipeline
        </p>
        <span className="text-[10px] font-mono text-muted-foreground/40">
          reconverse.app / dealer
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {STAGES.map((stage, i) => {
          const Icon = stage.icon;
          // synthetic counts just for visual density on the landing card
          const count = [12, 8, 5, 3, 6, 2, 9][i];
          return (
            <div
              key={stage.id}
              className="glass-panel p-3 flex flex-col gap-2 group hover:border-primary/20 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", stage.dot)} />
                <span className="text-[10px] font-medium text-muted-foreground/60 truncate">
                  {stage.label}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold tabular-nums text-foreground/90">
                  {count}
                </span>
                <Icon className={cn("h-3.5 w-3.5 opacity-60", stage.tint)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Pipeline / workflow section ── */
function PipelineSection() {
  return (
    <section className="relative bg-gradient-section py-20 sm:py-24">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-12">
          <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-primary/70">
            The Workflow
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            One pipeline. Every unit. End-to-end.
          </h2>
          <p className="mt-4 text-base text-muted-foreground/80 max-w-2xl mx-auto">
            Reconverse replaces whiteboards, group chats, and spreadsheets with a single shared
            pipeline that every role — sales, recon, service, and management — can see.
          </p>
        </div>

        {/* Flow diagram */}
        <div className="glass-panel p-5 sm:p-8 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {STAGES.map((stage, i) => {
              const Icon = stage.icon;
              return (
                <div key={stage.id} className="flex items-center gap-2 first:pl-0">
                  <div className="flex flex-col items-center gap-2 min-w-[88px]">
                    <div className={cn(
                      "h-12 w-12 rounded-xl border border-border/40 flex items-center justify-center bg-muted/10",
                    )}>
                      <Icon className={cn("h-5 w-5", stage.tint)} />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
                      {stage.label}
                    </span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Features grid ── */
const FEATURES = [
  {
    icon: ClipboardCheck,
    title: "Multi-point Inspection",
    body: "Mobile-first MPI checklists for exterior, interior, mechanical, electrical, tires, and under-vehicle. Pass / fail / repair, with notes and photos on every line.",
  },
  {
    icon: Calculator,
    title: "Repair Estimates",
    body: "Build versioned estimates with labor, parts, and sublet. Group by operation, set priorities, and route for approval — all without a spreadsheet in sight.",
  },
  {
    icon: ThumbsUp,
    title: "Approval Workflow",
    body: "Owners and managers approve or decline operations line-by-line. Work orders flow straight to the shop with the right scope, every time.",
  },
  {
    icon: Camera,
    title: "Photos that count",
    body: "Required photo categories per unit — exterior, interior, engine bay, damage, tires, undercarriage. Stored in Supabase Storage, attached to every record.",
  },
  {
    icon: Activity,
    title: "Activity log",
    body: "Every stage change, every comment, every photo, every estimate change — captured automatically with a full audit trail for every unit.",
  },
  {
    icon: Users,
    title: "Multi-dealer ready",
    body: "Built as a true multi-tenant SaaS from day one. Roles, RLS, and dealer separation are baked into the schema, not bolted on later.",
  },
] as const;

function Features() {
  return (
    <section className="relative py-20 sm:py-24 border-t border-border/20">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-12">
          <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-primary/70">
            Built for the lot
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Everything your recon team actually needs.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="floating-card group"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {f.title}
                </h3>
                <p className="text-[13px] text-muted-foreground/80 leading-relaxed">
                  {f.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── How it works ── */
const HOW_STEPS = [
  {
    n: "01",
    icon: Car,
    title: "Add the unit",
    body: "Scan the VIN — Reconverse decodes year, make, model, and trim automatically. Drop the stock number in and the unit is in the pipeline.",
  },
  {
    n: "02",
    icon: Gauge,
    title: "Run the recon",
    body: "Your team works through MPI, estimate, approval, repair, and QC. Stage aging shows you exactly which units are about to slip.",
  },
  {
    n: "03",
    icon: CheckCircle2,
    title: "Ship to frontline",
    body: "When QC clears, the unit moves to Ready for Sale. Sold? Stage it out. Done — and the activity log proves every step.",
  },
] as const;

function HowItWorks() {
  return (
    <section className="relative bg-gradient-section py-20 sm:py-24">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-12">
          <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-primary/70">
            How it works
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Three steps. Every car.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {HOW_STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="glass-panel p-6 relative overflow-hidden">
                <span className="absolute -right-2 -top-3 text-[64px] font-black text-foreground/5 select-none">
                  {s.n}
                </span>
                <Icon className="h-6 w-6 text-primary mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {s.title}
                </h3>
                <p className="text-[13px] text-muted-foreground/80 leading-relaxed">
                  {s.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Why Reconverse strip ── */
function WhyStrip() {
  const items = [
    { icon: Smartphone, label: "Mobile-first", body: "Designed for service drives and lot walks." },
    { icon: ShieldCheck, label: "Multi-tenant", body: "Row-level security and dealer separation by default." },
    { icon: Activity, label: "Audit-ready", body: "Server-side activity log on every meaningful change." },
  ];
  return (
    <section className="relative py-16 border-t border-border/20">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <div key={it.label} className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground/90">{it.label}</p>
                  <p className="text-[13px] text-muted-foreground/70 mt-1">{it.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Final CTA ── */
function FinalCTA() {
  return (
    <section className="relative py-20 sm:py-24">
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <div className="glass-panel-strong p-10 sm:p-14 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 0%, hsl(152 60% 52% / 0.18), transparent), radial-gradient(ellipse 50% 40% at 50% 100%, hsl(260 50% 55% / 0.12), transparent)",
            }}
          />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Ready to ship cars faster?
            </h2>
            <p className="mt-4 text-base text-muted-foreground/80 max-w-xl mx-auto">
              Get every unit in one pipeline. Start free — no credit card,
              no setup fees, no per-seat surprises.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" className="gap-2 h-11 px-7 font-semibold">
                <Link to="/login">
                  Start Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2 h-11 px-7 font-medium border-border/40">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ── */
function LandingFooter() {
  return (
    <footer className="border-t border-border/20 py-10">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary to-emerald-500 grid place-items-center text-background font-black text-xs">
            R
          </div>
          <span className="text-sm font-semibold text-foreground/80">Reconverse</span>
          <span className="text-[11px] text-muted-foreground/50 ml-2">
            Part of the Motorverse ecosystem
          </span>
        </div>
        <div className="flex items-center gap-5 text-[12px] text-muted-foreground/60">
          <Link to="/login" className="hover:text-foreground transition-colors">
            Sign in
          </Link>
          <a
            href="mailto:hello@reconverse.app"
            className="hover:text-foreground transition-colors"
          >
            Contact
          </a>
          <span className="text-muted-foreground/30">© {new Date().getFullYear()} Reconverse</span>
        </div>
      </div>
    </footer>
  );
}

/* ── Page composition ── */
const Index = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Auth-aware redirect: logged-in users go straight to their workspace
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("is_platform_admin")
          .eq("id", session.user.id)
          .single();

        if (data?.is_platform_admin) {
          navigate("/platform", { replace: true });
          return;
        }
        await provisionDealerIfNeeded();
        navigate("/dealer", { replace: true });
        return;
      }
      setReady(true);
    });
  }, [navigate]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Reconverse — Vehicle Recon Workflow for Modern Dealerships</title>
        <meta
          name="description"
          content="Reconverse is the single real-time pipeline used car teams use to move vehicles from intake to frontline-ready — built mobile-first for the lot."
        />
        <link rel="canonical" href="https://reconverse.app/" />
        <meta property="og:title" content="Reconverse — Vehicle Recon Workflow for Modern Dealerships" />
        <meta
          property="og:description"
          content="One pipeline for inspections, estimates, approvals, and repairs. Built mobile-first for dealership recon teams."
        />
        <meta property="og:url" content="https://reconverse.app/" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Reconverse" />
        <meta
          name="twitter:description"
          content="Vehicle recon workflow software for modern dealerships."
        />
      </Helmet>
      <Nav />
      <Hero />
      <PipelineSection />
      <Features />
      <HowItWorks />
      <WhyStrip />
      <FinalCTA />
      <LandingFooter />
    </div>
  );
};

export default Index;
