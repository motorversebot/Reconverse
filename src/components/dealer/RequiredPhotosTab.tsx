import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload, Trash2, Loader2, ImagePlus, X, ZoomIn, CheckCircle2,
  ChevronDown, ChevronRight, Lock, Camera, Info,
} from "lucide-react";

/* ─── Category config ─── */

interface RequiredCategory {
  key: string;
  label: string;
  required: number;
  conditional?: boolean;
  optional?: boolean;
}

const REQUIRED_CATEGORIES: RequiredCategory[] = [
  { key: "exterior", label: "Exterior", required: 6 },
  { key: "interior", label: "Interior", required: 6 },
  { key: "vin_sticker", label: "VIN Sticker", required: 1 },
  { key: "odometer", label: "Odometer", required: 1 },
  { key: "tires", label: "Tires & Wheels", required: 4 },
  { key: "engine", label: "Engine Bay", required: 3 },
  { key: "damage", label: "Damage", required: 0, conditional: true },
  { key: "undercarriage", label: "Underbody", required: 0, optional: true },
];

/* ─── Types ─── */

interface UnitPhoto {
  id: string;
  unit_id: string;
  dealer_id: string;
  file_path: string;
  file_name: string;
  caption: string | null;
  category: string;
  uploaded_by: string | null;
  created_at: string;
}

type SectionStatus = "complete" | "partial" | "missing";

interface CategoryData extends RequiredCategory {
  count: number;
  photos: UnitPhoto[];
  status: SectionStatus;
  isOptional: boolean;
  progressPct: number;
}

interface Props {
  unitId: string;
  dealerId: string;
}

/* ─── Helpers ─── */

function getSectionStatus(count: number, required: number, isOptional: boolean): SectionStatus {
  if (isOptional || required === 0) return count > 0 ? "complete" : "missing";
  if (count >= required) return "complete";
  if (count > 0) return "partial";
  return "missing";
}

const STRIP_COLORS: Record<SectionStatus, string> = {
  complete: "bg-emerald-500",
  partial: "bg-amber-500",
  missing: "bg-red-500",
};

const DOT_COLORS: Record<SectionStatus, string> = {
  complete: "bg-emerald-500",
  partial: "bg-amber-500",
  missing: "bg-red-500",
};

const BADGE_STYLES: Record<SectionStatus, string> = {
  complete: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  partial: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  missing: "bg-red-500/10 text-red-400 border-red-500/20",
};

const BADGE_LABELS: Record<SectionStatus, string> = {
  complete: "Complete",
  partial: "Partial",
  missing: "Missing",
};

/* ─── Capture Mode Overlay ─── */

function CaptureOverlay({
  categories,
  currentIdx,
  onCapture,
  onClose,
  uploading,
}: {
  categories: CategoryData[];
  currentIdx: number;
  onCapture: (cat: string) => void;
  onClose: () => void;
  uploading: boolean;
}) {
  const cat = categories[currentIdx];
  if (!cat) return null;

  const remaining = cat.required - cat.count;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="text-center space-y-4 max-w-sm">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Capture Mode
        </p>
        <h2 className="text-2xl font-bold text-foreground">{cat.label}</h2>
        <p className="text-sm text-muted-foreground">
          {cat.count} of {cat.required} captured
          {remaining > 0 && ` — ${remaining} remaining`}
        </p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 py-2">
          {Array.from({ length: cat.required }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i < cat.count ? "bg-emerald-500" : "bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>

        <Button
          variant="hero"
          size="lg"
          className="w-full h-14 text-base gap-3"
          onClick={() => onCapture(cat.key)}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
          Capture Photo
        </Button>

        {/* Section nav */}
        <div className="flex items-center justify-center gap-1 pt-2">
          {categories.filter((c) => c.required > 0).map((c, idx) => (
            <div
              key={c.key}
              className={`h-1 rounded-full transition-all ${
                idx === currentIdx ? "w-6 bg-primary" : "w-2 bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export default function RequiredPhotosTab({ unitId, dealerId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const captureInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean> | null>(null);
  const [captureMode, setCaptureMode] = useState(false);
  const [captureIdx, setCaptureIdx] = useState(0);
  const [captureCat, setCaptureCat] = useState("");

  const { data: photos, isLoading } = useQuery({
    queryKey: ["unit-photos", unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_photos" as any)
        .select("*")
        .eq("unit_id", unitId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[] as UnitPhoto[];
    },
  });

  // Build signed URLs for all photos
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!photos?.length) return;
    let cancelled = false;
    (async () => {
      const urls: Record<string, string> = {};
      for (const photo of photos) {
        const signedUrl = `/api/v1/reconverse/photos/blob/${encodeURIComponent(photo.file_path)}`;
        urls[photo.id] = signedUrl;
      }
      if (!cancelled) setSignedUrls(urls);
    })();
    return () => { cancelled = true; };
  }, [photos]);

  const getPhotoUrl = (photo: UnitPhoto) => signedUrls[photo.id] ?? "";

  const categoryData: CategoryData[] = useMemo(() => {
    return REQUIRED_CATEGORIES.map((cat) => {
      const catPhotos = photos?.filter((p) => p.category === cat.key) ?? [];
      const isOptional = !!(cat.optional || cat.conditional);
      const status = getSectionStatus(catPhotos.length, cat.required, isOptional);
      const progressPct = cat.required > 0
        ? Math.min(100, Math.round((catPhotos.length / cat.required) * 100))
        : catPhotos.length > 0 ? 100 : 0;
      return { ...cat, count: catPhotos.length, photos: catPhotos, status, isOptional, progressPct };
    });
  }, [photos]);

  // Auto-expand logic: first incomplete + any missing
  const resolvedExpanded = useMemo(() => {
    if (expandedSections !== null) return expandedSections;
    const auto: Record<string, boolean> = {};
    let firstIncompleteSet = false;
    categoryData.forEach((cat) => {
      if (cat.status === "complete") {
        auto[cat.key] = false;
      } else if (cat.status === "missing" || !firstIncompleteSet) {
        auto[cat.key] = true;
        firstIncompleteSet = true;
      } else {
        auto[cat.key] = false;
      }
    });
    return auto;
  }, [categoryData, expandedSections]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({
      ...(prev ?? resolvedExpanded),
      [key]: !(prev ?? resolvedExpanded)[key],
    }));
  };

  const totalRequired = REQUIRED_CATEGORIES.filter(
    (c) => !c.optional && !c.conditional
  ).reduce((sum, c) => sum + c.required, 0);

  const totalUploaded = categoryData
    .filter((c) => !c.optional && !c.conditional)
    .reduce((sum, c) => sum + Math.min(c.count, c.required), 0);

  const globalPct = totalRequired > 0 ? Math.round((totalUploaded / totalRequired) * 100) : 0;
  const isComplete = totalUploaded >= totalRequired;

  // Upload handler
  const handleFiles = useCallback(async (files: FileList | null, category: string) => {
    if (!files || files.length === 0) return;
    setUploadingCategory(category);

    try {
      

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast({ title: "Invalid file", description: `${file.name} is not an image`, variant: "destructive" });
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: "File too large", description: `${file.name} exceeds 10 MB`, variant: "destructive" });
          continue;
        }

        const ext = file.name.split(".").pop() || "jpg";
        const filePath = `${dealerId}/${unitId}/${crypto.randomUUID()}.${ext}`;

        const _upForm = new FormData();
          _upForm.append("file", file, { contentType: file.type });
          _upForm.append("path", filePath);
          const _upRes = await apiFetch("/api/v1/reconverse/photos/upload", { method: "POST", body: _upForm });
          const _upJ = await _upRes.json().catch(() => null);
          const uploadError = (!_upRes.ok || !_upJ?.ok) ? new Error(_upJ?.error || "Upload failed") : null;

        if (uploadError) {
          toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
          continue;
        }

        const _insRes = await apiFetch("/api/v1/reconverse/photos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            unit_id: unitId,
            dealer_id: dealerId,
            file_path: filePath,
            file_name: file.name,
            category,
            uploaded_by: user?.id ?? null,
          } as any),
          });
          const _insJ = await _insRes.json().catch(() => null);
          const insertError = (!_insRes.ok || !_insJ?.ok) ? new Error(_insJ?.error || "Failed") : null;

        if (insertError) {
          toast({ title: "Error saving photo", description: insertError.message, variant: "destructive" });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["unit-photos", unitId] });
      toast({ title: `${files.length} photo${files.length > 1 ? "s" : ""} uploaded` });
    } catch (err: any) {
      toast({ title: "Upload error", description: err.message, variant: "destructive" });
    } finally {
      setUploadingCategory(null);
      Object.values(fileInputRefs.current).forEach((ref) => {
        if (ref) ref.value = "";
      });
      if (captureInputRef.current) captureInputRef.current.value = "";
    }
  }, [dealerId, unitId, queryClient, toast]);

  const deleteMutation = useMutation({
    mutationFn: async (photo: UnitPhoto) => {
      const _delRes = await apiFetch(`/api/v1/reconverse/photos/\${photo.id}`, { method: "DELETE" });
      const _delJ = await _delRes.json().catch(() => null);
      const storageError = (!_delRes.ok || !_delJ?.ok) ? new Error(_delJ?.error || "Delete failed") : null;
      if (storageError) throw storageError;

      const dbError = null; // handled by API delete above
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unit-photos", unitId] });
      toast({ title: "Photo deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Capture mode handlers
  const incompleteCats: CategoryData[] = useMemo(
    () => categoryData.filter((c): c is CategoryData => c.required > 0 && c.status !== "complete"),
    [categoryData]
  );

  const startCapture = () => {
    if (incompleteCats.length === 0) return;
    setCaptureIdx(0);
    setCaptureCat(incompleteCats[0].key);
    setCaptureMode(true);
  };

  const handleCaptureClick = (catKey: string) => {
    setCaptureCat(catKey);
    captureInputRef.current?.click();
  };

  if (isLoading) {
    return (
      <Card className="glass-panel border-border">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        {/* Capture mode file input */}
        <input
          ref={captureInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files, captureCat);
          }}
        />

        {/* Blocking banner */}
        {!isComplete && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-500/8 border border-red-500/15">
            <Lock className="h-3.5 w-3.5 text-red-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-red-400">Photos Required</span>
              <span className="text-xs text-muted-foreground ml-2">
                Approval, Ready for Sale, and Export are locked until required photos are complete.
              </span>
            </div>
          </div>
        )}

        {/* Top-level completion panel */}
        <Card className="glass-panel border-border">
          <CardContent className="py-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Required Photos</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${
                    isComplete ? BADGE_STYLES.complete : globalPct > 0 ? BADGE_STYLES.partial : BADGE_STYLES.missing
                  }`}
                >
                  {isComplete ? (
                    <><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Complete</>
                  ) : (
                    `${totalUploaded} / ${totalRequired}`
                  )}
                </Badge>
              </div>
              <Button
                variant="hero"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={startCapture}
                disabled={isComplete}
              >
                <Camera className="h-3 w-3" />
                Start Capture Mode
              </Button>
            </div>

            {/* Global progress bar */}
            <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isComplete ? "bg-emerald-500" : globalPct > 0 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${globalPct}%` }}
              />
            </div>

            {/* Summary chips */}
            <div className="flex flex-wrap gap-1.5">
              {categoryData.filter((c) => c.required > 0).map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => toggleSection(cat.key)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors text-xs"
                >
                  <div className={`h-1.5 w-1.5 rounded-full ${DOT_COLORS[cat.status]}`} />
                  <span className="text-foreground/80">{cat.label}</span>
                  <span className="text-muted-foreground">{cat.count}/{cat.required}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category sections */}
        {categoryData.map((cat) => {
          const isOpen = resolvedExpanded[cat.key] ?? false;

          return (
            <Card key={cat.key} className="glass-panel border-border overflow-hidden">
              <div className="flex">
                {/* Left accent strip */}
                <div className={`w-1 shrink-0 ${STRIP_COLORS[cat.status]}`} />

                <div className="flex-1 min-w-0">
                  <Collapsible open={isOpen} onOpenChange={() => toggleSection(cat.key)}>
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-muted/10 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          {isOpen ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-sm font-medium text-foreground">{cat.label}</span>
                          {(cat.optional || cat.conditional) && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground border-border">
                              Optional
                            </Badge>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 shrink-0 ${BADGE_STYLES[cat.status]}`}
                        >
                          {cat.status === "complete" && <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />}
                          {cat.required > 0
                            ? `${cat.count}/${cat.required}`
                            : `${cat.count}`}
                          {" "}
                          {BADGE_LABELS[cat.status]}
                        </Badge>
                      </button>
                    </CollapsibleTrigger>

                    {/* Section progress bar */}
                    {cat.required > 0 && (
                      <div className="mx-3.5 h-1 rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${STRIP_COLORS[cat.status]}`}
                          style={{ width: `${cat.progressPct}%` }}
                        />
                      </div>
                    )}

                    <CollapsibleContent>
                      <div className="px-3.5 pb-3 pt-2 space-y-2">
                        {/* Section upload button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => fileInputRefs.current[cat.key]?.click()}
                          disabled={uploadingCategory === cat.key}
                        >
                          {uploadingCategory === cat.key ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Upload className="h-3 w-3" />
                          )}
                          Upload {cat.label}
                        </Button>
                        <input
                          ref={(el) => { fileInputRefs.current[cat.key] = el; }}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => handleFiles(e.target.files, cat.key)}
                        />

                        {/* Photo grid */}
                        {cat.photos.length > 0 ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
                            {cat.photos.map((photo) => (
                              <div
                                key={photo.id}
                                className="group relative rounded-lg overflow-hidden border border-border bg-muted/20 aspect-square"
                              >
                                <img
                                  src={getPhotoUrl(photo)}
                                  alt={photo.file_name}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                                  <div className="w-full p-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button className="p-1 rounded bg-black/50 text-white">
                                          <Info className="h-2.5 w-2.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs max-w-[200px]">
                                        <p className="font-medium">{photo.file_name}</p>
                                        <p className="text-muted-foreground">
                                          {new Date(photo.created_at).toLocaleString()}
                                        </p>
                                        {photo.uploaded_by && (
                                          <p className="text-muted-foreground truncate">
                                            By: {photo.uploaded_by.slice(0, 8)}…
                                          </p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                    <div className="flex gap-0.5">
                                      <button
                                        onClick={() => setPreviewUrl(getPhotoUrl(photo))}
                                        className="p-1 rounded bg-black/50 text-white hover:bg-black/70 transition-colors"
                                      >
                                        <ZoomIn className="h-2.5 w-2.5" />
                                      </button>
                                      <button
                                        onClick={() => deleteMutation.mutate(photo)}
                                        className="p-1 rounded bg-black/50 text-white hover:bg-destructive transition-colors"
                                      >
                                        <Trash2 className="h-2.5 w-2.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-6 text-center">
                            <ImagePlus className="h-6 w-6 text-muted-foreground/30 mb-2" />
                            <p className="text-xs font-medium text-foreground/70">No photos uploaded yet.</p>
                            <p className="text-[11px] text-muted-foreground">
                              Upload required documentation to proceed.
                            </p>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            </Card>
          );
        })}

        {/* Capture mode overlay */}
        {captureMode && (
          <CaptureOverlay
            categories={incompleteCats}
            currentIdx={captureIdx}
            onCapture={handleCaptureClick}
            onClose={() => setCaptureMode(false)}
            uploading={uploadingCategory !== null}
          />
        )}

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
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

/** Helper to check if required photos are complete */
export function useRequiredPhotosComplete(unitId: string) {
  const { data: photos } = useQuery({
    queryKey: ["unit-photos", unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_photos" as any)
        .select("category")
        .eq("unit_id", unitId);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!unitId,
  });

  const requiredCats = REQUIRED_CATEGORIES.filter((c) => !c.optional && !c.conditional);
  const complete = requiredCats.every((cat) => {
    const count = photos?.filter((p: any) => p.category === cat.key).length ?? 0;
    return count >= cat.required;
  });

  return complete;
}
