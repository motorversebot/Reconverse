import { useState, useRef } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ZoomIn, ImageOff, Clock } from "lucide-react";
import { STAGE_META, type UnitStatus } from "@/lib/pipeline";
import { hoursInStage, formatAgingDuration, agingColor, AGING_COLORS, AGING_BG } from "@/hooks/useStageAging";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface UnitPhoto {
  id: string;
  file_path: string;
  file_name: string;
  category: string;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "General", exterior: "Exterior", interior: "Interior",
  engine: "Engine Bay", damage: "Damage", tires: "Tires & Wheels",
  undercarriage: "Undercarriage",
};

interface Props {
  unit: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StaffUnitDrawer({ unit, open, onOpenChange }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const status = (unit?.status as UnitStatus) ?? "inspection";
  const stageMeta = STAGE_META[status];

  // Fetch QC-approved photos (RLS already filters for staff)
  const { data: photos } = useQuery({
    queryKey: ["staff-unit-photos", unit?.id],
    queryFn: async () => {
      if (!unit?.id) return [];
      const { data, error } = await supabase
        .from("unit_photos" as any)
        .select("*")
        .eq("unit_id", unit.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[] as UnitPhoto[];
    },
    enabled: open && !!unit?.id,
  });

  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const prevKey = useRef("");

  if (photos) {
    const key = photos.map((p) => p.id).join(",");
    if (key !== prevKey.current) {
      prevKey.current = key;
      (async () => {
        const urls: Record<string, string> = {};
        for (const photo of photos) {
          const signedUrl = `/api/v1/reconverse/photos/blob/${encodeURIComponent(photo.file_path)}`;
          urls[photo.id] = signedUrl;
        }
        setSignedUrls(urls);
      })();
    }
  }

  if (!unit) return null;

  const title = [unit.year, unit.make, unit.model].filter(Boolean).join(" ") || "Vehicle";
  const hours = hoursInStage(unit.stage_entered_at);
  const color = agingColor(hours);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:w-[480px] p-0 border-l border-border overflow-y-auto"
          style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)" }}>
          <SheetHeader className="p-5 pb-3">
            <SheetTitle className="text-lg font-bold text-foreground">{title}</SheetTitle>
          </SheetHeader>

          <div className="px-5 space-y-4 pb-6">
            {/* Vehicle Info */}
            <Card className="glass-panel border-border">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {unit.vin && (
                    <div><span className="text-muted-foreground text-xs">VIN</span><p className="font-mono text-xs mt-0.5">{unit.vin}</p></div>
                  )}
                  {unit.stock_number && (
                    <div><span className="text-muted-foreground text-xs">Stock #</span><p className="font-medium mt-0.5">{unit.stock_number}</p></div>
                  )}
                  {unit.year && (
                    <div><span className="text-muted-foreground text-xs">Year</span><p className="font-medium mt-0.5">{unit.year}</p></div>
                  )}
                  {unit.make && (
                    <div><span className="text-muted-foreground text-xs">Make</span><p className="font-medium mt-0.5">{unit.make}</p></div>
                  )}
                  {unit.model && (
                    <div><span className="text-muted-foreground text-xs">Model</span><p className="font-medium mt-0.5">{unit.model}</p></div>
                  )}
                  {unit.trim && (
                    <div><span className="text-muted-foreground text-xs">Trim</span><p className="font-medium mt-0.5">{unit.trim}</p></div>
                  )}
                  {unit.color && (
                    <div><span className="text-muted-foreground text-xs">Color</span><p className="font-medium mt-0.5">{unit.color}</p></div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status + Aging */}
            <Card className="glass-panel border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Current Status</span>
                  <Badge variant="outline" className="text-xs">{stageMeta?.label ?? unit.status}</Badge>
                </div>
                <Separator className="opacity-30" />
                <div className={`flex items-center gap-2 px-3 py-2 rounded-md border-l-2 text-xs font-medium ${AGING_BG[color]}`}>
                  <Clock className="h-3.5 w-3.5 opacity-60" />
                  <span className={AGING_COLORS[color]}>
                    In {stageMeta?.label} for {formatAgingDuration(hours)}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Since {format(new Date(unit.stage_entered_at), "MMM d, yyyy h:mm a")}
                </div>
              </CardContent>
            </Card>

            {/* QC-Approved Photos */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Photos</h3>
              {photos && photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative rounded-lg overflow-hidden border border-border bg-muted/20 aspect-square cursor-pointer"
                      onClick={() => setPreviewUrl(signedUrls[photo.id] || "")}
                    >
                      <img
                        src={signedUrls[photo.id] || ""}
                        alt={photo.file_name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                        <div className="w-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
                          <Badge variant="outline" className="text-[9px] bg-black/50 text-white border-white/20">
                            {CATEGORY_LABELS[photo.category] || photo.category}
                          </Badge>
                          <ZoomIn className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Card className="glass-panel border-border">
                  <CardContent className="flex flex-col items-center py-10 text-center">
                    <ImageOff className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {status === "ready" || status === "sold"
                        ? "No approved photos available"
                        : "Photos available after QC completion"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Lightbox */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl p-1 bg-black/90 border-none">
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          {previewUrl && (
            <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
