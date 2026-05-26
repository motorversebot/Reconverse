import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { subDays, startOfQuarter, startOfYear } from "date-fns";
import { useReportsData, downloadCSV, type DateRange } from "@/hooks/useReportsData";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid,
} from "recharts";

const PRESETS: { label: string; days?: number; mode?: "qtd" | "ytd" }[] = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "QTD", mode: "qtd" },
  { label: "YTD", mode: "ytd" },
];

const STAGE_LABELS: Record<string, string> = {
  inspection: "MPI", estimate: "Estimate", approval: "Approval", repair: "Repair", qc: "QC", ready: "Ready",
};

function fmtHours(h: number) {
  if (!h || isNaN(h)) return "—";
  const days = h / 24;
  return days >= 1 ? `${days.toFixed(1)}d` : `${h.toFixed(1)}h`;
}
function fmt$(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
}

export default function ReportsPage() {
  const [range, setRange] = useState<DateRange>({ from: subDays(new Date(), 30), to: new Date() });
  const { data, isLoading } = useReportsData(range);

  const setPreset = (p: typeof PRESETS[number]) => {
    const to = new Date();
    let from = to;
    if (p.days) from = subDays(to, p.days);
    if (p.mode === "qtd") from = startOfQuarter(to);
    if (p.mode === "ytd") from = startOfYear(to);
    setRange({ from, to });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Cycle time, bottlenecks, financials, and productivity.</p>
        </div>
        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <Button key={p.label} size="sm" variant="outline" onClick={() => setPreset(p)}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">Loading reports…</Card>
      ) : (
        <Tabs defaultValue="cycle">
          <TabsList>
            <TabsTrigger value="cycle">Cycle & Throughput</TabsTrigger>
            <TabsTrigger value="bottleneck">Bottlenecks</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="productivity">Productivity</TabsTrigger>
          </TabsList>

          {/* ── Cycle ── */}
          <TabsContent value="cycle" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Kpi label="Avg cycle time" value={fmtHours(data.cycle.avgHours)} />
              <Kpi label="Median cycle time" value={fmtHours(data.cycle.medianHours)} />
              <Kpi label="Units completed" value={String(data.cycle.completedCount)} />
            </div>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Weekly throughput</p>
                <Button size="sm" variant="ghost" onClick={() => downloadCSV("throughput.csv", data.cycle.weekly)}>
                  <Download className="h-3.5 w-3.5 mr-1" /> CSV
                </Button>
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.cycle.weekly}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="week" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>

          {/* ── Bottleneck ── */}
          <TabsContent value="bottleneck" className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Average time per stage (completed transitions)</p>
                <Button size="sm" variant="ghost" onClick={() => downloadCSV("stage_avg.csv", data.bottleneck.stageAvgs)}>
                  <Download className="h-3.5 w-3.5 mr-1" /> CSV
                </Button>
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.bottleneck.stageAvgs.map((s) => ({
                      ...s, stage: STAGE_LABELS[s.stage] ?? s.stage, hours: Math.round(s.avgHours * 10) / 10,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="stage" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-semibold mb-3">Aged units (current state)</p>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr><th className="text-left py-2">Stage</th><th className="text-right">Yellow (3-6d)</th><th className="text-right">Red (6d+)</th></tr>
                </thead>
                <tbody>
                  {Object.entries(data.bottleneck.agedByStage).map(([s, v]) => (
                    <tr key={s} className="border-t">
                      <td className="py-2">{STAGE_LABELS[s] ?? s}</td>
                      <td className="text-right text-amber-500 font-mono">{v.yellow}</td>
                      <td className="text-right text-red-500 font-mono">{v.red}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          {/* ── Financial ── */}
          <TabsContent value="financial" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Kpi label="Total estimated" value={fmt$(data.financial.totalEstimated)} />
              <Kpi label="Total approved" value={fmt$(data.financial.totalApproved)} />
              <Kpi label="Parts $" value={fmt$(data.financial.partsTotal)} />
              <Kpi label="Avg per unit" value={fmt$(data.financial.avgPerUnit)} />
              <Kpi label="Approval rate" value={`${Math.round(data.financial.approvalRate * 100)}%`} />
            </div>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Weekly approved $</p>
                <Button size="sm" variant="ghost" onClick={() => downloadCSV("approved_weekly.csv", data.financial.weeklyApproved)}>
                  <Download className="h-3.5 w-3.5 mr-1" /> CSV
                </Button>
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.financial.weeklyApproved}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="week" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Line type="monotone" dataKey="approved" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>

          {/* ── Productivity ── */}
          <TabsContent value="productivity">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Productivity by user</p>
                <Button size="sm" variant="ghost" onClick={() => downloadCSV("productivity.csv", data.productivity)}>
                  <Download className="h-3.5 w-3.5 mr-1" /> CSV
                </Button>
              </div>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left py-2">User</th>
                    <th className="text-right">MPI items</th>
                    <th className="text-right">Repairs</th>
                    <th className="text-right">Estimates</th>
                    <th className="text-right">Photos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.productivity.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">No activity in range.</td></tr>
                  ) : data.productivity.map((u) => (
                    <tr key={u.name} className="border-t">
                      <td className="py-2">{u.name}</td>
                      <td className="text-right font-mono">{u.mpi}</td>
                      <td className="text-right font-mono">{u.repairs}</td>
                      <td className="text-right font-mono">{u.estimates}</td>
                      <td className="text-right font-mono">{u.photos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold font-mono tabular-nums">{value}</p>
    </Card>
  );
}
