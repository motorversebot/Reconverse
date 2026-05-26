import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type DateRange = { from: Date; to: Date };

export function useReportsData(range: DateRange) {
  return useQuery({
    queryKey: ["reports", range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      });
      const res = await apiFetch(`/api/v1/reconverse/reports?${params}`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed");
      return j.data;
    },
  });
}

export function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(","),
    ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
