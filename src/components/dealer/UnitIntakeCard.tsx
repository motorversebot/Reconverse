import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface Props {
  unit: any;
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm text-foreground ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}

export default function UnitIntakeCard({ unit }: Props) {
  return (
    <Card className="glass-panel border-border">
      <CardHeader>
        <CardTitle className="text-lg">Intake Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <InfoRow label="VIN" value={unit.vin} mono />
        <InfoRow label="Stock #" value={unit.stock_number} />
        <InfoRow label="Year" value={unit.year?.toString()} />
        <InfoRow label="Make" value={unit.make} />
        <InfoRow label="Model" value={unit.model} />
        <InfoRow label="Trim" value={unit.trim} />
        <InfoRow label="Color" value={unit.color} />
        <InfoRow label="Engine" value={unit.engine} />
        <InfoRow label="Body" value={unit.body} />
        <InfoRow label="Drive Type" value={unit.drive_type} />
        <InfoRow label="Transmission" value={unit.transmission} />
        <InfoRow label="Added" value={format(new Date(unit.created_at), "MMM d, yyyy h:mm a")} />
      </CardContent>
    </Card>
  );
}
