const units = [
  { stock: "A9921", vehicle: "2024 Toyota Sequoia Platinum", stage: "Repair", color: "hsl(var(--primary))", days: "1.2d", hold: "14h 22m" },
  { stock: "B4022", vehicle: "2023 BMW X5 xDrive40i", stage: "Approval", color: "hsl(40 85% 55%)", days: "3.1d", hold: "3d 04h", overdue: true },
  { stock: "C1109", vehicle: "2024 Ford F-150 Lightning", stage: "QC", color: "hsl(280 55% 60%)", days: "0.7d", hold: "0h 45m" },
  { stock: "D7783", vehicle: "2023 Honda Accord Sport", stage: "Estimate", color: "hsl(200 70% 55%)", days: "0.4d", hold: "9h 10m" },
  { stock: "E2204", vehicle: "2024 Chevy Silverado LT", stage: "Ready for Sale", color: "hsl(152 65% 45%)", days: "0.0d", hold: "—" },
];

const MockupSection = () => {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-14">
          <p className="text-primary font-mono text-xs tracking-[0.2em] uppercase mb-3">Command Center</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-[1.1]">
            Every unit, every minute, <span className="text-gradient-accent">accounted for.</span>
          </h2>
        </div>

        <div className="relative max-w-6xl mx-auto opacity-0 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          {/* Outer dark frame for premium feel */}
          <div className="rounded-[2rem] p-3 bg-[hsl(224_45%_8%)] shadow-2xl">
            <div className="rounded-[1.5rem] overflow-hidden border border-white/5 bg-[hsl(224_45%_10%)]">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
                    <span className="text-primary font-bold text-xs">M</span>
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold leading-tight">Global Fleet Monitor</div>
                    <div className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Live · 142 units</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-32 rounded-md bg-white/5 border border-white/5 flex items-center px-3 text-[11px] text-white/40 font-mono">⌘ K  Search</div>
                  <div className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center">Add Unit</div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {["Unit ID", "Vehicle", "Phase", "In Stage", "Hold Time"].map((h) => (
                        <th key={h} className="text-left text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 px-6 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((u) => (
                      <tr key={u.stock} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-white/60">#{u.stock}</td>
                        <td className="px-6 py-4 text-sm text-white/90 font-medium">{u.vehicle}</td>
                        <td className="px-6 py-4">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              color: u.color,
                              backgroundColor: `color-mix(in srgb, ${u.color} 12%, transparent)`,
                              border: `1px solid color-mix(in srgb, ${u.color} 30%, transparent)`,
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: u.color }} />
                            {u.stage}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-white/60 tabular-nums">{u.days}</td>
                        <td className={`px-6 py-4 font-mono text-xs tabular-nums ${u.overdue ? "text-[hsl(0_70%_65%)] font-semibold" : "text-white/60"}`}>
                          {u.hold}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer status bar */}
              <div className="flex items-center justify-between px-6 py-3 bg-white/[0.02] border-t border-white/5">
                <div className="flex items-center gap-4 text-[11px] font-mono text-white/40">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(140_50%_50%)] animate-pulse" />
                    Synced
                  </div>
                  <span>Updated 0.4s ago</span>
                </div>
                <div className="text-[11px] font-mono text-white/40">v2.4.0 · dealer.motorverserecon.com</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MockupSection;
