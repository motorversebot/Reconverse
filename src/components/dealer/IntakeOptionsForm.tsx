import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useUpdateUnit } from "@/hooks/useDealerActions";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, Save, Loader2, Wand2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { mapVinDecodeToIntake, mergeDecodeIntoIntake } from "@/lib/vinToIntakeMapping";

type IntakeMeta = Record<string, unknown>;

interface Unit {
  id: string;
  intake_meta?: IntakeMeta | null;
  vin_decode_raw?: Record<string, string> | null;
}

// Read a meta value as a string for controlled string inputs/selects
const metaStr = (v: unknown): string => (v == null ? "" : String(v));

interface Props {
  unit: Unit;
}

// Radio-style option group
function OptionGroup({
  label, options, value, onChange,
}: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt} type="button"
            onClick={() => onChange(value === opt ? "" : opt)}
            className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
              value === opt
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:bg-muted"
            }`}
          >{opt}</button>
        ))}
      </div>
    </div>
  );
}

// Toggle row
function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <Label className="text-sm text-foreground">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// Condition rating
function ConditionRating({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const ratings = ["Good", "Fair", "Bad"];
  const colors: Record<string, string> = {
    Good: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Fair: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    Bad: "bg-destructive/20 text-destructive border-destructive/30",
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-1.5">
        {ratings.map((r) => (
          <button key={r} type="button"
            onClick={() => onChange(value === r ? "" : r)}
            className={`px-3 py-1 text-xs rounded-md border transition-colors ${
              value === r ? colors[r] : "bg-background border-border text-muted-foreground hover:bg-muted"
            }`}
          >{r}</button>
        ))}
      </div>
    </div>
  );
}

// Collapsible section wrapper
function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <Card className="glass-panel border-border overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

const SAFETY_MECHANICAL = ["ABS", "Driver Airbag", "Front Airbag", "Side Airbag", "Child Safety Door Locks", "Power Steering", "Tilt Wheel"];
const COMFORT_CONVENIENCE = ["AC", "AM/FM Radio", "CD Player", "CD Changer", "Cassette", "TV", "VCR", "Cruise Control", "Power Windows", "Power Door Locks", "Power Seat Driver", "Power Seat Passenger", "Rear Air"];
const EXTERIOR_ADDONS = ["Alloy Wheels", "Sunroof", "Running Boards", "Bed Liner", "Roof Rack", "Fog Lights", "Alarm", "Front Grill"];
const SEATING_OPTIONS = ["5 Passenger", "7 Passenger", "15 Passenger"];

export default function IntakeOptionsForm({ unit }: Props) {
  const updateUnit = useUpdateUnit();
  const { toast } = useToast();
  const [meta, setMeta] = useState<IntakeMeta>({});
  const [dirty, setDirty] = useState(false);
  const [overrides, setOverrides] = useState<Set<string>>(new Set());
  const initializedRef = useRef<string | null>(null);

  const hasDecodeData = !!unit.vin_decode_raw && Object.keys(unit.vin_decode_raw).length > 0;

  useEffect(() => {
    const currentMeta = unit.intake_meta ?? {};
    setMeta(currentMeta);
    setDirty(false);
    setOverrides(new Set((currentMeta._manual_overrides as string[] | undefined) ?? []));

    // Auto-fill from VIN decode on first load if not yet applied
    if (
      unit.id !== initializedRef.current &&
      hasDecodeData &&
      !currentMeta._vin_auto_filled
    ) {
      const mapping = mapVinDecodeToIntake(unit.vin_decode_raw);
      const merged = mergeDecodeIntoIntake(currentMeta, mapping, new Set(), false);
      merged._vin_auto_filled = true;
      setMeta(merged);
      setDirty(true);
    }
    initializedRef.current = unit.id;
  }, [unit.id, unit.intake_meta, unit.vin_decode_raw, hasDecodeData]);

  const set = useCallback((key: string, val: unknown) => {
    setMeta((prev) => ({ ...prev, [key]: val }));
    setOverrides((prev) => { const next = new Set(prev); next.add(key); return next; });
    setDirty(true);
  }, []);

  const toggleOption = useCallback((key: string) => {
    setMeta((prev) => {
      const newVal = !prev[key];
      return { ...prev, [key]: newVal };
    });
    setOverrides((prev) => { const next = new Set(prev); next.add(key); return next; });
    setDirty(true);
  }, []);

  const handleReapply = () => {
    if (!hasDecodeData) return;
    const mapping = mapVinDecodeToIntake(unit.vin_decode_raw);
    const merged = mergeDecodeIntoIntake(meta, mapping, new Set(), true); // force overwrite
    merged._vin_auto_filled = true;
    merged._manual_overrides = [];
    setMeta(merged);
    setOverrides(new Set());
    setDirty(true);
    toast({ title: "VIN decode re-applied", description: "All options reset from decoded data" });
  };

  const handleSave = async () => {
    try {
      const saveMeta = { ...meta, _manual_overrides: Array.from(overrides) };
      await updateUnit.mutateAsync({ id: unit.id, intake_meta: saveMeta });
      toast({ title: "Intake options saved" });
      setDirty(false);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      {/* VIN Decode Auto-fill Bar */}
      {hasDecodeData && (
        <Card className="glass-panel border-primary/20 bg-primary/5">
          <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Wand2 className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm text-foreground">
                {meta._vin_auto_filled
                  ? "Options auto-filled from VIN decode"
                  : "VIN decode data available"}
              </span>
              {meta._vin_auto_filled && (
                <Badge variant="secondary" className="text-[10px] shrink-0">Applied</Badge>
              )}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                  <RotateCcw className="h-3 w-3" />
                  Re-apply
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Re-apply VIN decode?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will overwrite all current option settings with values from the VIN decode, including any manual changes you've made.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReapply}>Re-apply</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* Save bar */}
      {dirty && (
        <div className="flex justify-end sticky top-0 z-10">
          <Button onClick={handleSave} disabled={updateUnit.isPending} size="sm" className="gap-1.5">
            {updateUnit.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </Button>
        </div>
      )}

      {/* 1. SOURCE & HISTORY */}
      <Section title="Source & History" defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Date In</Label>
            <Input type="date" value={metaStr(meta.date_in)} onChange={(e) => set("date_in", e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Source</Label>
            <Select value={metaStr(meta.acquisition_source)} onValueChange={(v) => set("acquisition_source", v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                {["Retail", "Wholesale", "Auction", "Trade-In", "eBay", "Other"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <OptionGroup label="CARFAX" options={["Yes", "No"]} value={metaStr(meta.carfax)} onChange={(v) => set("carfax", v)} />
          <ToggleRow label="Books Present" checked={!!meta.books_present} onChange={(v) => set("books_present", v)} />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Spare Keys</Label>
            <Input type="number" min={0} value={metaStr(meta.spare_keys)} onChange={(e) => set("spare_keys", parseInt(e.target.value) || 0)} className="h-9 text-sm w-24" />
          </div>
          <OptionGroup label="Interior Material" options={["Cloth", "Leather"]} value={metaStr(meta.interior_material)} onChange={(v) => set("interior_material", v)} />
        </div>
      </Section>

      {/* 2. VEHICLE CONFIGURATION */}
      <Section title="Vehicle Configuration">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <OptionGroup label="Body Type" options={["2 Door", "3 Door", "4 Door", "Truck", "SUV", "Van"]} value={metaStr(meta.body_type)} onChange={(v) => set("body_type", v)} />
          <OptionGroup label="Engine" options={["4 Cyl", "V6", "V8", "V10"]} value={metaStr(meta.engine_type)} onChange={(v) => set("engine_type", v)} />
          <OptionGroup label="Transmission" options={["Automatic", "4 Speed", "5 Speed", "6 Speed"]} value={metaStr(meta.transmission_type)} onChange={(v) => set("transmission_type", v)} />
          <OptionGroup label="Mileage Type" options={["5 Digit", "6 Digit"]} value={metaStr(meta.mileage_type)} onChange={(v) => set("mileage_type", v)} />
          <ToggleRow label="VIN Plate Missing" checked={!!meta.vin_plate_missing} onChange={(v) => set("vin_plate_missing", v)} />
          <ToggleRow label="Frame Damage Indicator" checked={!!meta.frame_damage} onChange={(v) => set("frame_damage", v)} />
        </div>
      </Section>

      {/* 3. OPTIONS CHECKLIST */}
      <Section title="Vehicle Options">
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground font-semibold mb-2 block">Safety & Mechanical</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              {SAFETY_MECHANICAL.map((opt) => (
                <ToggleRow key={opt} label={opt} checked={!!meta[`opt_${opt}`]} onChange={() => toggleOption(`opt_${opt}`)} />
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground font-semibold mb-2 block">Comfort & Convenience</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              {COMFORT_CONVENIENCE.map((opt) => (
                <ToggleRow key={opt} label={opt} checked={!!meta[`opt_${opt}`]} onChange={() => toggleOption(`opt_${opt}`)} />
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground font-semibold mb-2 block">Exterior & Add-ons</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              {EXTERIOR_ADDONS.map((opt) => (
                <ToggleRow key={opt} label={opt} checked={!!meta[`opt_${opt}`]} onChange={() => toggleOption(`opt_${opt}`)} />
              ))}
            </div>
          </div>
          <OptionGroup label="Seating Capacity" options={SEATING_OPTIONS} value={metaStr(meta.seating_capacity)} onChange={(v) => set("seating_capacity", v)} />
        </div>
      </Section>

      {/* 4. CONDITION QUICK RATING */}
      <Section title="Condition Rating">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
          <ConditionRating label="Paint" value={metaStr(meta.cond_paint)} onChange={(v) => set("cond_paint", v)} />
          <ConditionRating label="Tires" value={metaStr(meta.cond_tires)} onChange={(v) => set("cond_tires", v)} />
          <ConditionRating label="Interior" value={metaStr(meta.cond_interior)} onChange={(v) => set("cond_interior", v)} />
        </div>
      </Section>

      {/* Comments section removed — now uses UnitCommentsCard */}
    </div>
  );
}
