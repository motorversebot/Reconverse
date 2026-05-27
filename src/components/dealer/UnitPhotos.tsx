import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, rvFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload, Trash2, Loader2, ImagePlus, X, ZoomIn,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const PHOTO_CATEGORIES = [
  "general",
  "exterior",
  "interior",
  "engine",
  "damage",
  "tires",
  "undercarriage",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  exterior: "Exterior",
  interior: "Interior",
  engine: "Engine Bay",
  damage: "Damage",
  tires: "Tires & Wheels",
  undercarriage: "Undercarriage",
};

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

interface Props {
  unitId: string;
  dealerId: string;
}

export default function UnitPhotos({ unitId, dealerId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("general");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch photos
  const { data: photos, isLoading } = useQuery({
    queryKey: ["unit-photos", unitId],
    queryFn: async () => {
      const res = await rvFetch<UnitPhoto[]>(`/photos?unit_id=${unitId}`);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Generate signed URLs for all photos
  const generateSignedUrls = async (photoList: UnitPhoto[]) => {
    const urls: Record<string, string> = {};
    for (const photo of photoList) {
      const signedUrl = `/api/v1/reconverse/photos/blob/${encodeURIComponent(photo.file_path)}`;
      {
        urls[photo.id] = signedUrl;
      }
    }
    setSignedUrls(urls);
  };

  // Refresh signed URLs when photos change
  const prevPhotosRef = useRef<string>("");
  if (photos) {
    const key = photos.map((p) => p.id).join(",");
    if (key !== prevPhotosRef.current) {
      prevPhotosRef.current = key;
      generateSignedUrls(photos);
    }
  }

  const getPhotoUrl = (photo: UnitPhoto) => signedUrls[photo.id] || "";

  // Upload
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast({ title: "Invalid file", description: `${file.name} is not an image`, variant: "destructive" });
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: "File too large", description: `${file.name} exceeds 10MB`, variant: "destructive" });
          continue;
        }

        const ext = file.name.split(".").pop() || "jpg";
        const filePath = `${dealerId}/${unitId}/${crypto.randomUUID()}.${ext}`;

        const uploadForm = new FormData();
        uploadForm.append("file", file, { contentType: file.type });
        uploadForm.append("path", filePath);
        const uploadRes = await apiFetch("/api/v1/reconverse/photos/upload", { method: "POST", body: uploadForm });
        const uploadJ = await uploadRes.json().catch(() => null);
        const uploadError = (!uploadRes.ok || !uploadJ?.ok) ? new Error(uploadJ?.error || "Upload failed") : null;

        if (uploadError) {
          toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
          continue;
        }

        // Save metadata
        const insertRes = await apiFetch("/api/v1/reconverse/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unit_id: unitId,
            dealer_id: dealerId,
            file_path: filePath,
            file_name: file.name,
            category: selectedCategory,
          } as any),
        });
        const insertJ = await insertRes.json().catch(() => null);
        const insertError = (!insertRes.ok || !insertJ?.ok) ? new Error(insertJ?.error || "Failed") : null;

        if (insertError) {
          toast({ title: "Error saving photo", description: insertError.message, variant: "destructive" });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["unit-photos", unitId] });
      toast({ title: `${files.length} photo${files.length > 1 ? "s" : ""} uploaded` });
    } catch (err: any) {
      toast({ title: "Upload error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (photo: UnitPhoto) => {
      const delRes = await apiFetch(`/api/v1/reconverse/photos/\${photo.id}`, { method: "DELETE" });
      const delJ = await delRes.json().catch(() => null);
      const storageError = (!delRes.ok || !delJ?.ok) ? new Error(delJ?.error || "Delete failed") : null;
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

  const filtered = photos?.filter(
    (p) => filterCategory === "all" || p.category === filterCategory
  );

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
    <div className="space-y-4">
      {/* Upload bar */}
      <Card className="glass-panel border-border">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHOTO_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="hero"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload Photos
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {["all", ...PHOTO_CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filterCategory === cat
                ? "glass-panel-strong text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
            {cat !== "all" && photos && (
              <span className="ml-1 text-muted-foreground">
                {photos.filter((p) => p.category === cat).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Photo grid */}
      {filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((photo) => (
            <div
              key={photo.id}
              className="group relative rounded-xl overflow-hidden border border-border bg-muted/20 aspect-square"
            >
              <img
                src={getPhotoUrl(photo)}
                alt={photo.file_name}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                <div className="w-full p-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] bg-black/50 text-white border-white/20">
                    {CATEGORY_LABELS[photo.category] || photo.category}
                  </Badge>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPreviewUrl(getPhotoUrl(photo))}
                      className="p-1.5 rounded-md bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(photo)}
                      className="p-1.5 rounded-md bg-black/50 text-white hover:bg-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="glass-panel border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ImagePlus className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No photos yet</p>
            <p className="text-xs text-muted-foreground">
              Upload photos to document this vehicle's condition
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" /> Upload Photos
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lightbox preview */}
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
  );
}
