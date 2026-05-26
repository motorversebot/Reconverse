import { Clock, Eye, FileX, AlertTriangle } from "lucide-react";

const problems = [
  { icon: Clock, title: "Parts Delays", stat: "5.2d", statLabel: "avg wait", description: "No vendor visibility means cars sit idle while floor plan interest stacks up." },
  { icon: Eye, title: "Zero Pipeline Visibility", stat: "0", statLabel: "live status", description: "Managers walk the lot every morning to find out where each unit actually is." },
  { icon: FileX, title: "Lost Inspections", stat: "1 in 5", statLabel: "missed items", description: "Paper MPIs and group chats lose items between technician handoffs." },
  { icon: AlertTriangle, title: "No Accountability", stat: "—", statLabel: "trail", description: "When a unit slips, nobody can say who owned it, when, or why." },
];

const ProblemSection = () => {
  return (
    <section className="relative py-24 sm:py-32 bg-gradient-section">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-14">
          <p className="text-primary font-mono text-xs tracking-[0.2em] uppercase mb-3">The Problem</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-[1.1]">
            Recon is the most expensive blind spot in your dealership.
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            Every day a unit sits in recon costs you holding interest, lot space, and a sale that could have closed yesterday. Most shops still run it on whiteboards.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {problems.map((p, i) => (
            <div
              key={p.title}
              className="floating-card flex flex-col gap-4 opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${0.1 * i}s` }}
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                  <p.icon className="w-4 h-4 text-accent" />
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-foreground font-mono tabular-nums leading-none">{p.stat}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{p.statLabel}</div>
                </div>
              </div>
              <div>
                <h3 className="text-foreground font-semibold text-base mb-1.5">{p.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{p.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
