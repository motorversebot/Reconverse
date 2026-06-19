// Unit photo storage client (MC blob storage).
//   POST /units/:id/photos   { data(base64/dataURL), context, category, item_name } -> { id, url }
//   GET  /units/:id/photos?context=&category=&item=                                  -> [{ id, url, ... }]
//   GET  /photos/:id          (auth + dealer scoped image bytes — load via AuthImage)
import { apiFetch } from "@/lib/api";

export interface UnitPhoto {
  id: number;
  url: string;
  context?: string;
  category?: string | null;
  item_name?: string | null;
  created_at?: string;
}

/** Read a File as a data URL (base64) for JSON upload. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("read_failed"));
    r.readAsDataURL(file);
  });
}

export async function uploadUnitPhoto(
  unitId: string | number,
  file: File,
  opts: { context?: "mpi" | "estimate" | "repair"; category?: string | null; item_name?: string | null } = {},
): Promise<UnitPhoto | null> {
  const data = await fileToDataUrl(file);
  const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, context: opts.context ?? "mpi", category: opts.category ?? null, item_name: opts.item_name ?? null }),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.ok) throw new Error(j?.error || `upload_failed_${res.status}`);
  return j.data as UnitPhoto;
}

export async function listUnitPhotos(
  unitId: string | number,
  opts: { context?: string; category?: string; item?: string } = {},
): Promise<UnitPhoto[]> {
  const qs = new URLSearchParams();
  if (opts.context) qs.set("context", opts.context);
  if (opts.category) qs.set("category", opts.category);
  if (opts.item) qs.set("item", opts.item);
  const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/photos?${qs.toString()}`);
  const j = await res.json().catch(() => null);
  return res.ok && j?.ok && Array.isArray(j.data) ? (j.data as UnitPhoto[]) : [];
}
