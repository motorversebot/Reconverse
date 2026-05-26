import { ShieldCheck, Lock, Database, Quote } from "lucide-react";

const stats = [
  { v: "38%", l: "Avg cycle time reduction", s: "Pilot dealerships, Q1 2026" },
  { v: "100%", l: "Photo capture compliance", s: "Required-photo gating" },
  { v: "< 2s", l: "VIN-to-intake decode", s: "NHTSA VPIC integration" },
  { v: "24/7", l: "Real-time pipeline sync", s: "Across every device" },
];

const testimonials = [
  {
    quote: "We cut our average days-to-front-line by nearly five days in the first month. Every manager finally sees the same pipeline.",
    name: "Pilot dealer testimonial",
    role: "General Manager · Coming soon",
  },
  {
    quote: "Parts status used to be a guessing game. Now overdue items surface automatically — we stopped losing units to forgotten orders.",
    name: "Pilot dealer testimonial",
    role: "Service Director · Coming soon",
  },
];

const security = [
  { icon: ShieldCheck, title: "Multi-tenant isolation", desc: "Every record scoped per dealership via row-level security. No cross-tenant access, ever." },
  { icon: Lock, title: "Role-based access control", desc: "Owner, Admin, Manager, Staff — strict, scoped permissions enforced server-side." },
  { icon: Database, title: "Encrypted at rest & in transit", desc: "TLS 1.3 in transit, AES-256 at rest. Audit trail on every field-level change." },
];

const TrustSection = () => {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-14">
          <p className="text-primary font-mono text-xs tracking-[0.2em] uppercase mb-3">Trusted by Dealer Operations</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
            Built for the floor. <span className="text-gradient-accent">Audited for the back office.</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            Operational metrics, real customer voices, and enterprise-grade security in one platform.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12 max-w-6xl mx-auto">
          {stats.map((s, i) => (
            <div
              key={s.l}
              className="glass-panel-strong p-6 opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${0.06 * i}s` }}
            >
              <div className="text-3xl sm:text-4xl font-bold text-foreground font-mono tabular-nums tracking-tight leading-none">
                {s.v}
              </div>
              <div className="text-foreground/90 font-semibold text-sm mt-3">{s.l}</div>
              <div className="text-muted-foreground text-[11px] mt-1 font-mono">{s.s}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-12 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <figure
              key={t.name + i}
              className="glass-panel-strong p-7 flex flex-col gap-5 opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${0.1 + 0.08 * i}s` }}
            >
              <Quote className="w-6 h-6 text-primary/60" />
              <blockquote className="text-foreground text-base sm:text-lg leading-relaxed font-medium">
                "{t.quote}"
              </blockquote>
              <figcaption className="flex items-center gap-3 mt-auto pt-4 border-t border-[hsl(var(--glass-border)/0.08)]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border border-[hsl(var(--glass-border)/0.1)]" />
                <div>
                  <div className="text-foreground font-semibold text-sm">{t.name}</div>
                  <div className="text-muted-foreground text-xs font-mono">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Security reassurance */}
        <div className="max-w-6xl mx-auto">
          <div className="glass-panel-strong p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-foreground font-semibold text-base">Security & Compliance</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {security.map((s) => (
                <div key={s.title} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <s.icon className="w-4 h-4 text-primary" />
                    <h4 className="text-foreground font-semibold text-sm">{s.title}</h4>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
