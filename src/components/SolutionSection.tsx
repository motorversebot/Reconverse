import { ArrowRight } from "lucide-react";

const stages = [
  { num: "01", label: "MPI", desc: "Multi-point inspection", color: "hsl(var(--accent))" },
  { num: "02", label: "Estimate", desc: "Labor, parts, sublet", color: "hsl(200 70% 55%)" },
  { num: "03", label: "Approval", desc: "Margin-aware review", color: "hsl(40 85% 55%)" },
  { num: "04", label: "Repair", desc: "Work orders + timers", color: "hsl(var(--primary))" },
  { num: "05", label: "QC", desc: "Final verification", color: "hsl(280 55% 60%)" },
  { num: "06", label: "Ready for Sale", desc: "Front-line ready", color: "hsl(152 65% 45%)" },
];

const SolutionSection = () => {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <p className="text-primary font-mono text-xs tracking-[0.2em] uppercase mb-3">The Workflow</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-[1.1]">
            One strict pipeline. Six stages. <span className="text-gradient-accent">Zero ambiguity.</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            Every unit moves left to right through the same hardened workflow. Required photos, completed work orders, and QC sign-offs gate each transition — no shortcuts, no lost vehicles.
          </p>
        </div>

        {/* Linear pipeline */}
        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {stages.map((s, i) => (
              <div
                key={s.label}
                className="relative floating-card opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${0.08 * i}s` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-muted-foreground">{s.num}</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color, boxShadow: `0 0 10px ${s.color}` }} />
                </div>
                <div className="text-foreground font-semibold text-sm leading-tight">{s.label}</div>
                <div className="text-muted-foreground text-[11px] mt-1">{s.desc}</div>
                {i < stages.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 w-3 h-3 text-muted-foreground/40 z-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;
