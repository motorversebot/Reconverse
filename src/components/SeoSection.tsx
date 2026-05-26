import { Check } from "lucide-react";

const bullets = [
  { h: "Built for recon, not generic DMS workflows", d: "Stage gates, required photos, and aging telemetry purpose-built for the recon lane." },
  { h: "Cut average days-to-front-line", d: "Real-time bottleneck alerts surface stuck units before they cost you a sale." },
  { h: "Full parts visibility", d: "Vendor status, ETAs, and overdue flags live next to the unit they belong to." },
  { h: "Accountability at every handoff", d: "Field-level audit trail across MPI, estimate, approval, repair, QC, and ready-for-sale." },
  { h: "Mobile-first for the shop floor", d: "Technicians scan VINs, capture required photos, and update status from any phone." },
  { h: "Multi-tenant security", d: "Strict role-based access (Owner, Admin, Manager, Staff) scoped per dealership." },
];

const SeoSection = () => {
  return (
    <section className="relative py-24 sm:py-32 bg-gradient-section">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-6xl mx-auto">
          <div className="lg:col-span-5">
            <p className="text-primary font-mono text-xs tracking-[0.2em] uppercase mb-3">Reconditioning Software</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] mb-5">
              Modern <span className="text-gradient-accent">reconditioning software</span> for dealerships that ship cars faster.
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-4">
              Motorverse Recon replaces whiteboards, group chats, and spreadsheets with a single real-time pipeline. Inspect, estimate, approve, repair, and QC every unit from one workspace — and watch your time-to-line drop with each cycle.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Purpose-built for used-vehicle reconditioning at independent and franchise dealers. No customer-facing fluff — just the operational rigor your floor needs.
            </p>
          </div>

          <div className="lg:col-span-7">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bullets.map((b) => (
                <li key={b.h} className="floating-card flex gap-3">
                  <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-foreground font-semibold text-sm mb-1 leading-tight">{b.h}</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">{b.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SeoSection;
