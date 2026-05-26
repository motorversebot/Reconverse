import { Activity, Package, Camera, Zap, ShieldCheck, Clock } from "lucide-react";

const FeaturesSection = () => {
  return (
    <section className="relative py-24 sm:py-32 bg-gradient-section">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-14">
          <p className="text-primary font-mono text-xs tracking-[0.2em] uppercase mb-3">The Platform</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-[1.1]">
            Built for the floor. <span className="text-gradient-accent">Wired for the office.</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            Fast keyboard-first interactions for technicians. Real-time aging, margin, and bottleneck telemetry for management. One source of truth.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-12 gap-4 max-w-6xl mx-auto">
          {/* Big feature */}
          <div className="col-span-12 lg:col-span-7 floating-card flex flex-col justify-between min-h-[320px] opacity-0 animate-fade-in-up">
            <div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Live pipeline visualization</h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
                Every unit, every stage, every minute of aging — surfaced in a single Kanban with stage-aware color (Green / Yellow / Red).
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-6">
              {[
                { l: "Avg cycle", v: "4.2d", t: "text-primary" },
                { l: "Aging units", v: "7", t: "text-[hsl(40_85%_50%)]" },
                { l: "Overdue", v: "3", t: "text-destructive" },
              ].map((m) => (
                <div key={m.l} className="rounded-lg border border-[hsl(var(--glass-border)/0.08)] p-3 bg-background/40">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.l}</div>
                  <div className={`text-lg font-bold font-mono tabular-nums ${m.t}`}>{m.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tall feature */}
          <div className="col-span-12 lg:col-span-5 floating-card flex flex-col gap-4 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Parts tracking that doesn't lie</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Status by line item, vendor, and ETA. Overdue parts surface as bottlenecks the moment they cross threshold.
              </p>
            </div>
            <div className="mt-auto space-y-1.5">
              {[
                { p: "Front bumper cover", v: "LKQ", s: "Ordered", c: "hsl(280 55% 60%)" },
                { p: "OEM headlight L", v: "Toyota", s: "Arrived", c: "hsl(var(--primary))" },
                { p: "Brake rotors (2)", v: "NAPA", s: "Overdue", c: "hsl(0 70% 55%)" },
              ].map((r) => (
                <div key={r.p} className="flex items-center justify-between gap-3 rounded-md border border-[hsl(var(--glass-border)/0.08)] px-3 py-2 bg-background/40">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{r.p}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{r.v}</div>
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ color: r.c, backgroundColor: `color-mix(in srgb, ${r.c} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${r.c} 25%, transparent)` }}
                  >
                    {r.s}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Small features row */}
          {[
            { icon: Camera, title: "Required photos", desc: "Photo categories gate stage advancement. 100% or no progression." },
            { icon: ShieldCheck, title: "Role-based access", desc: "Owner, Admin, Manager, Staff — strict, separated, scoped per dealer." },
            { icon: Clock, title: "Stage aging telemetry", desc: "Real-time durations with green / yellow / red age thresholds." },
            { icon: Zap, title: "VIN-first intake", desc: "NHTSA decode auto-fills every spec. Mobile barcode scan in seconds." },
          ].map((f, i) => (
            <div
              key={f.title}
              className="col-span-12 sm:col-span-6 lg:col-span-3 floating-card opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${0.15 + i * 0.05}s` }}
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                <f.icon className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-foreground font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
