import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, rvPost, rvPatch } from "@/lib/api";

export function useTireInspection(unitId: string | undefined, dealerId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["tire-inspection", unitId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/tire-inspection`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return null;
      return j.data as any;
    },
    enabled: !!unitId && !!dealerId,
  });

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const existing = query.data;
      if (existing?.id) {
        const result = await rvPatch(`/tire-inspections/${existing.id}`, payload);
        if (!result.ok) throw new Error(result.error);
      } else {
        const result = await rvPost("/tire-inspections", { ...payload, unit_id: unitId, dealer_id: dealerId });
        if (!result.ok) throw new Error(result.error);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tire-inspection", unitId] }),
  });

  return { ...query, save: save.mutate, saving: save.isPending };
}
