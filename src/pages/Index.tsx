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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ── Pipeline stages used in the centerpiece ── */
const STAGES = [
  { id: "intake",   label: "01. Intake",     icon: Car },
  { id: "mpi",      label: "02. MPI",        icon: ClipboardCheck },
  { id: "estimate", label: "03. Estimate",   icon: Calculator },
  { id: "approval", label: "04. Approval",   icon: ThumbsUp },
  { id: "repair",   label: "05. Repair",     icon: Wrench },
  { id: "qc",       label: "06. QC",         icon: ShieldCheck },
  { id: "ready",    label: "07. Ready",      icon: Tag },
] as const;

/* ── Top navigation ── */
function Nav() {
  return (
    <nav className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-7 w-7 rounded-none border border-foreground bg-foreground text-background flex items-center justify-center font-mono font-bold text-sm">
            R
          </div>
          <span className="font-mono font-bold tracking-widest text-foreground text-base uppercase">Reconverse</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            id="nav-signin-link"
            to="/login"
            className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Button asChild size="sm" className="rounded-none border border-foreground bg-foreground text-background hover:bg-background hover:text-foreground text-xs font-mono uppercase tracking-wider h-8 px-4">
            <Link to="/login" id="nav-getstarted-btn">
              Get Started
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}

/* ── Interactive ROI Savings Calculator ── */
function ROICalculator() {
  const [volume, setVolume] = useState<number>(30);
  const [daysSaved, setDaysSaved] = useState<number>(3);
  const holdingCost = 40; // $40 per day holding cost

  const monthlySavings = volume * daysSaved * holdingCost;
  const yearlySavings = monthlySavings * 12;

  return (
    <div className="border border-border p-6 sm:p-8 max-w-md w-full bg-card relative">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
        <h3 className="text-xs font-mono uppercase tracking-wider text-foreground font-bold">RECON SAVINGS CALCULATOR</h3>
        <span className="text-[10px] font-mono text-muted-foreground">HOLDING COST: ${holdingCost}/D</span>
      </div>

      <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
        Adjust monthly volume and cycle time reduction to estimate capital recovery.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono uppercase">
            <span className="text-muted-foreground">Monthly Lot Volume</span>
            <span className="text-foreground font-bold">{volume} units</span>
          </div>
          <input
            type="range"
            min="5"
            max="150"
            step="5"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full h-1 bg-neutral-800 rounded-none appearance-none cursor-pointer accent-white"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono uppercase">
            <span className="text-muted-foreground">Recon Days Reduced</span>
            <span className="text-foreground font-bold">{daysSaved} days</span>
          </div>
          <input
            type="range"
            min="1"
            max="7"
            step="1"
            value={daysSaved}
            onChange={(e) => setDaysSaved(Number(e.target.value))}
            className="w-full h-1 bg-neutral-800 rounded-none appearance-none cursor-pointer accent-white"
          />
        </div>

        <div className="border border-border p-5 text-center mt-6 bg-neutral-950">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">Monthly Saved Holding Costs</span>
          <p className="text-3xl font-bold font-mono text-foreground tracking-tight mt-2.5 tabular-nums">
            ${monthlySavings.toLocaleString()}
          </p>
          <span className="text-[9px] font-mono text-muted-foreground/60 mt-1 block">
            (${yearlySavings.toLocaleString()} ANNUALLY AT STATED RATE)
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Hero ── */
function Hero() {
  return (
    <section className="relative border-b border-border bg-background py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
          
          {/* Left Hero Column */}
          <div className="flex flex-col items-start text-left max-w-xl">
            <span className="inline-flex items-center px-2.5 py-1 border border-border text-[9px] font-mono tracking-widest uppercase text-muted-foreground mb-6">
              RECON WORKFLOW REDEFINED
            </span>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.05] text-foreground uppercase">
              Intake to frontline, slashed to hours.
            </h1>

            <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
              Ditch the whiteboards and paper logs. Reconverse synchronizes your vehicle inspections, parts estimation sheets, and approval cycles into a clean, mobile-first operations hub.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Button asChild size="lg" className="w-full sm:w-auto rounded-none border border-foreground bg-foreground text-background hover:bg-background hover:text-foreground text-xs font-mono uppercase tracking-wider h-11 px-8">
                <Link to="/login" id="hero-getstarted-btn">
                  Get Started Free
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto rounded-none border border-border bg-transparent text-foreground hover:bg-neutral-900 text-xs font-mono uppercase tracking-wider h-11 px-8">
                <Link to="/login" id="hero-signin-btn">Member Sign In</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[9px] font-mono tracking-wider uppercase text-muted-foreground/60">
              <span>✓ Auto VIN Decoder</span>
              <span>·</span>
              <span>✓ Mobile lot dashboard</span>
              <span>·</span>
              <span>✓ Real-time holding indicators</span>
            </div>
          </div>

          {/* Right Hero Column (Interactive ROI Tool) */}
          <div className="flex justify-center lg:justify-end">
            <ROICalculator />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Interactive Pipeline Showcase Card ── */
function PipelineSection() {
  const [activeStage, setActiveStage] = useState<string>("mpi");
  const currentStageInfo = STAGES.find(s => s.id === activeStage) || STAGES[0];
  const ActiveIcon = currentStageInfo.icon;

  const stageDetails: Record<string, { role: string; text: string; details: string }> = {
    intake: { role: "Intake Agent", text: "Register lot units instantly.", details: "Decode the VIN config automatically, assign stock numbers, and upload initial visual lot condition check photos." },
    mpi: { role: "Technician", text: "Multi-point lot inspection check.", details: "Walk the vehicle to assess frame, interior, tires, mechanical, and safety points using quick mobile checkboxes." },
    estimate: { role: "Service Advisor", text: "Itemize repair actions.", details: "Draft estimations containing labor line item hours, parts numbers, sublets, taxes, and automatically computed margins." },
    approval: { role: "Dealer Manager", text: "Authorize repair limits.", details: "Approve or decline operations item-by-item, pushing accepted work items straight to mechanic work orders." },
    repair: { role: "Mechanic", text: "Execute lane tasks.", details: "Mechanics update status flags, post labor comments, and attach completed photos directly from their workstation." },
    qc: { role: "QC Inspector", text: "Verify completed works.", details: "Double-check safety parameters, clean visual defects, and sign off before releasing to the lot." },
    ready: { role: "Sales Admin", text: "frontline list ready.", details: "Generate retail lot guides, download safety reports, list pricing specs, and update frontline inventory status." }
  };

  return (
    <section className="relative bg-background py-16 sm:py-24 border-b border-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground border border-border px-2.5 py-1">
            UNIFIED PIPELINE
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground uppercase">
            Connect every lane in one dashboard.
          </h2>
        </div>

        <div className="border border-border p-6 bg-card max-w-4xl mx-auto">
          {/* Stage Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
            {STAGES.map((s) => {
              const isActive = s.id === activeStage;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveStage(s.id)}
                  onMouseEnter={() => setActiveStage(s.id)}
                  className={cn(
                    "border p-3 text-left transition-colors duration-200 rounded-none relative group",
                    isActive ? "border-foreground bg-neutral-950" : "border-border hover:border-muted-foreground"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono tracking-wider uppercase text-muted-foreground truncate">{s.label}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-base font-mono font-bold text-foreground">
                      {[12, 8, 5, 3, 6, 2, 9][STAGES.findIndex(x => x.id === s.id)]} Units
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dynamic Stage Details */}
          <div className="border border-border p-5 bg-neutral-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-none border border-border flex items-center justify-center shrink-0">
                <ActiveIcon className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-foreground font-bold">{stageDetails[activeStage].text}</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-xl">
                  {stageDetails[activeStage].details}
                </p>
              </div>
            </div>
            <div className="border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-4 shrink-0 flex flex-col w-full sm:w-auto">
              <span className="text-[8px] font-mono tracking-widest text-muted-foreground uppercase">ROLE OWNER</span>
              <span className="text-xs font-mono text-foreground font-bold mt-0.5 uppercase">{stageDetails[activeStage].role}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Features Section ── */
const FEATURES = [
  {
    icon: ClipboardCheck,
    title: "MOBILE INSPECTIONS",
    body: "Assess vehicles on the spot. Mark line items, capture photo proof, and record notes on frame, tires, or mechanical safety elements.",
  },
  {
    icon: Calculator,
    title: "ESTIMATE ITEMIZER",
    body: "Build estimates containing labor time calculations, part cost details, and sublet items. Set custom margins and compute taxes automatically.",
  },
  {
    icon: ThumbsUp,
    title: "INSTANT SIGN-OFFS",
    body: "Managers accept or deny estimate lines with a single mobile trigger, sending work orders instantly to technicians.",
  },
  {
    icon: Camera,
    title: "EVIDENCE PHOTOS",
    body: "Link photos to specific inspections and estimate lines, stored securely in high-speed cloud directories.",
  },
  {
    icon: Activity,
    title: "CONTINUOUS AUDIT LOG",
    body: "Chronologically record stage modifications, user replies, and cost revisions. Eliminate verbal misalignments.",
  },
  {
    icon: Users,
    title: "ROOFTOP SEPARATIONS",
    body: "Enterprise multi-tenant data structures ensure database and inventory records are isolated securely at the server level.",
  },
] as const;

function Features() {
  return (
    <section className="relative py-16 sm:py-24 border-b border-border bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground border border-border px-2.5 py-1">
            CAPABILITIES
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground uppercase">
            Everything your reconditioning loop requires.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="border border-border p-6 rounded-none bg-card hover:border-foreground transition-colors duration-200"
              >
                <div className="h-10 w-10 border border-border flex items-center justify-center mb-5 bg-neutral-950">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-foreground font-bold mb-2.5">
                  {f.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
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

/* ── Value Strip ── */
function ValueStrip() {
  const items = [
    { label: "MOBILIZED LOT SPEED", body: "Techs and managers execute checklists directly from vehicle hoods." },
    { label: "RLS GOVERNANCE", body: "Rooftop contents are completely isolated at the server-database level." },
    { label: "DETAILED AUDIT LOGS", body: "Vehicle updates are chronologically recorded in unified server logs." },
  ];
  return (
    <section className="relative py-12 border-b border-border bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((it) => {
            return (
              <div key={it.label} className="border border-border p-5 bg-card">
                <h4 className="text-xs font-mono uppercase tracking-wider text-foreground font-bold">{it.label}</h4>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{it.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Final Call To Action ── */
function FinalCTA() {
  return (
    <section className="relative py-16 sm:py-20 bg-background">
      <div className="max-w-4xl mx-auto px-6">
        <div className="border border-border p-10 sm:p-14 text-center bg-card relative">
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-foreground uppercase">
              Ready to recover holding costs?
            </h2>
            <p className="mt-4 text-xs text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Consolidate your reconditioning loop under one pipeline. Start tracking units today.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="w-full sm:w-auto rounded-none border border-foreground bg-foreground text-background hover:bg-background hover:text-foreground text-xs font-mono uppercase tracking-wider h-11 px-8">
                <Link to="/login" id="cta-getstarted-btn">
                  Start Free Trial
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto rounded-none border border-border bg-transparent text-foreground hover:bg-neutral-900 text-xs font-mono uppercase tracking-wider h-11 px-8">
                <Link to="/login" id="cta-signin-btn">Member Sign In</Link>
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
    <footer className="border-t border-border py-12 bg-background">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-none border border-foreground bg-foreground text-background flex items-center justify-center font-mono font-bold text-xs">
            R
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-foreground font-bold">Reconverse</span>
            <span className="text-[10px] font-mono text-muted-foreground/50 ml-2 border-l border-border pl-2 uppercase">
              Motorverse System
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-[10px] font-mono uppercase text-muted-foreground/60">
          <Link to="/login" className="hover:text-foreground transition-colors">
            Member Login
          </Link>
          <a
            href="mailto:hello@reconverse.app"
            className="hover:text-foreground transition-colors"
          >
            Support
          </a>
          <span className="text-muted-foreground/45">© {new Date().getFullYear()} RECONVERSE INC.</span>
        </div>
      </div>
    </footer>
  );
}

/* ── Page composition ── */
const Index = () => {
  const navigate = useNavigate();
  const { user, isPlatformAdmin, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate(isPlatformAdmin ? "/platform" : "/dealer", { replace: true });
    }
  }, [user, isPlatformAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 border border-foreground border-t-transparent rounded-none animate-spin" />
      </div>
    );
  }

  if (user) return null; // navigating away

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-neutral-800">
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
      <ValueStrip />
      <FinalCTA />
      <LandingFooter />
    </div>
  );
};

export default Index;
