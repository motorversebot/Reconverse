import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUpdateUnit } from "@/hooks/useDealerActions";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Pencil, Save, X } from "lucide-react";
import IntakeOptionsForm from "./IntakeOptionsForm";

interface Unit {
  id: string;
  created_at: string;
  [key: string]: unknown;
}

interface Props {
  unit: Unit;
  readOnly?: boolean;
}

const FIELDS: { key: string; label: string; mono?: boolean }[] = [
  { key: "vin", label: "VIN", mono: true },
  { key: "stock_number", label: "Stock #" },
  { key: "year", label: "Year" },
  { key: "make", label: "Make" },
  { key: "model", label: "Model" },
  { key: "trim", label: "Trim" },
  { key: "color", label: "Color" },
  { key: "engine", label: "Engine" },
  { key: "body", label: "Body" },
  { key: "drive_type", label: "Drive Type" },
  { key: "transmission", label: "Transmission" },
];

export default function EditableIntakeCard({ unit, readOnly = false }: Props) {
  const updateUnit = useUpdateUnit();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const startEdit = () => {
    const initial: Record<string, string> = {};
    FIELDS.forEach((f) => {
      initial[f.key] = unit[f.key]?.toString() ?? "";
    });
    setForm(initial);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm({});
  };

  const handleSave = async () => {
    try {
      const payload: { id: string } & Record<string, unknown> = { id: unit.id };
      FIELDS.forEach((f) => {
        const val = form[f.key]?.trim() || null;
        if (f.key === "year") {
          payload[f.key] = val ? parseInt(val) : null;
        } else {
          payload[f.key] = val;
        }
      });
      await updateUnit.mutateAsync(payload);
      toast({ title: "Intake updated" });
      setEditing(false);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  return (
    <>
    <Card className="glass-panel border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Intake Information</CardTitle>
        {!readOnly && !editing ? (
          <Button variant="ghost" size="sm" onClick={startEdit} className="gap-1.5 text-xs">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        ) : editing ? (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={cancelEdit} className="gap-1 text-xs">
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button
              variant="hero"
              size="sm"
              onClick={handleSave}
              disabled={updateUnit.isPending}
              className="gap-1 text-xs"
            >
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-1">
        {FIELDS.map((f) => (
          <div
            key={f.key}
            className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
          >
            <span className="text-sm text-muted-foreground">{f.label}</span>
            {editing ? (
              <Input
                value={form[f.key] ?? ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className={`h-8 w-48 text-sm text-right ${f.mono ? "font-mono" : ""}`}
              />
            ) : (
              <span className={`text-sm text-foreground ${f.mono ? "font-mono" : ""}`}>
                {unit[f.key]?.toString() || "—"}
              </span>
            )}
          </div>
        ))}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">Added</span>
          <span className="text-sm text-foreground">
            {format(new Date(unit.created_at), "MMM d, yyyy h:mm a")}
          </span>
        </div>
      </CardContent>
    </Card>

    {/* Structured intake options */}
    <IntakeOptionsForm unit={unit} />
  </>
  );
}
