import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, rvPost, rvPatch, rvDelete, rvFetch } from "@/lib/api";

// ── Types ──

export interface Estimate {
  id: string;
  unit_id: string;
  dealer_id: string;
  version_number: number;
  status: "draft" | "submitted" | "approved" | "partial_approved" | "declined" | "void";
  labor_rate_default: number;
  tax_rate_default: number;
  shop_supplies_percent: number;
  discount_type: "none" | "percent" | "amount";
  discount_value: number;
  notes_internal: string | null;
  notes_customer: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EstimateOperation {
  id: string;
  estimate_id: string;
  dealer_id: string;
  name: string;
  category: "mechanical" | "body" | "detail" | "diag" | "other";
  priority: "safety" | "recommended" | "cosmetic";
  sort_order: number;
  approval_status: "pending" | "approved" | "declined";
  approved_at: string | null;
  approved_by: string | null;
  items?: EstimateItem[];
}

export interface EstimateItem {
  id: string;
  operation_id: string;
  dealer_id: string;
  type: "labor" | "part" | "misc" | "sublet";
  description: string;
  qty: number;
  unit_cost: number;
  unit_price: number;
  hours: number;
  labor_rate: number;
  part_number: string | null;
  vendor: string | null;
  taxable: boolean;
  status: "pending" | "approved" | "declined";
  sort_order: number;
}

export interface WorkOrder {
  id: string;
  unit_id: string;
  dealer_id: string;
  source_estimate_id: string | null;
  status: "open" | "in_progress" | "done";
  created_at: string;
  updated_at: string;
  items?: WorkOrderItem[];
}

export interface WorkOrderItem {
  id: string;
  work_order_id: string;
  dealer_id: string;
  source_estimate_item_id: string | null;
  type: "labor" | "part" | "misc" | "sublet";
  description: string;
  qty: number;
  hours: number;
  labor_rate: number;
  unit_cost: number;
  unit_price: number;
  status: "open" | "done";
}

// ── Utility ──

export function calculateEstimateTotals(
  operations: EstimateOperation[],
  estimate: Estimate | null,
  filterApproved = false
) {
  let laborTotal = 0, partsTotal = 0, miscTotal = 0, subletTotal = 0, costTotal = 0, taxableTotal = 0;
  for (const op of operations) {
    for (const item of op.items || []) {
      if (filterApproved && item.status !== "approved") continue;
      const lineTotal = item.type === "labor" ? item.hours * item.labor_rate : item.qty * item.unit_price;
      const lineCost = item.type === "labor" ? 0 : item.qty * item.unit_cost;
      if (item.type === "labor") laborTotal += lineTotal;
      else if (item.type === "part") partsTotal += lineTotal;
      else if (item.type === "sublet") subletTotal += lineTotal;
      else miscTotal += lineTotal;
      costTotal += lineCost;
      if (item.taxable) taxableTotal += lineTotal;
    }
  }
  const subtotal = laborTotal + partsTotal + miscTotal + subletTotal;
  const taxRate = estimate?.tax_rate_default ?? 0.08;
  const taxTotal = taxableTotal * taxRate;
  const shopSupplies = subtotal * (estimate?.shop_supplies_percent ?? 0);
  let discountTotal = 0;
  if (estimate?.discount_type === "percent") discountTotal = subtotal * (estimate.discount_value / 100);
  else if (estimate?.discount_type === "amount") discountTotal = estimate.discount_value;
  const grandTotal = subtotal + taxTotal + shopSupplies - discountTotal;
  const gross = subtotal - costTotal;
  const grossPercent = subtotal > 0 ? (gross / subtotal) * 100 : 0;
  return { laborTotal, partsTotal, miscTotal, subletTotal, subtotal, taxTotal, shopSupplies, discountTotal, grandTotal, costTotal, gross, grossPercent };
}

// ── Queries ──

export function useEstimate(unitId: string | undefined, dealerId: string | undefined) {
  return useQuery({
    queryKey: ["estimate", unitId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/estimate`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return null;
      return j.data as any;
    },
    enabled: !!unitId && !!dealerId,
  });
}

export function useEstimateOperations(estimateId: string | undefined) {
  return useQuery({
    queryKey: ["estimate-operations", estimateId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/reconverse/estimates/${estimateId}/operations`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return [];
      return j.data.operations as any[];
    },
    enabled: !!estimateId,
  });
}

export function useEstimateItems(operationId: string | undefined) {
  return useQuery({
    queryKey: ["estimate-items", operationId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/reconverse/operations/${operationId}/items`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return [];
      return j.data.items as any[];
    },
    enabled: !!operationId,
  });
}

export function useCreateEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { unit_id: string; dealer_id: string }) => {
      const result = await rvPost<{ estimate: any }>("/estimates", payload);
      if (!result.ok) throw new Error(result.error);
      return result.data.estimate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimate"] }),
  });
}

export function useUpdateEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const result = await rvPatch<{ estimate: any }>(`/estimates/${id}`, payload);
      if (!result.ok) throw new Error(result.error);
      return result.data.estimate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimate"] }),
  });
}

export function useCreateOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const result = await rvPost<{ operation: any }>("/estimate-operations", payload);
      if (!result.ok) throw new Error(result.error);
      return result.data.operation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimate-operations"] }),
  });
}

export function useUpdateOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const result = await rvPatch<{ operation: any }>(`/estimate-operations/${id}`, payload);
      if (!result.ok) throw new Error(result.error);
      return result.data.operation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimate-operations"] }),
  });
}

export function useDeleteOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await rvDelete(`/estimate-operations/${id}`);
      if (!result.ok) throw new Error(result.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimate-operations"] }),
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const result = await rvPost<{ item: any }>("/estimate-items", payload);
      if (!result.ok) throw new Error(result.error);
      return result.data.item;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimate-items"] }),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const result = await rvPatch<{ item: any }>(`/estimate-items/${id}`, payload);
      if (!result.ok) throw new Error(result.error);
      return result.data.item;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimate-items"] }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await rvDelete(`/estimate-items/${id}`);
      if (!result.ok) throw new Error(result.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimate-items"] }),
  });
}

export function useConvertToWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { estimate_id: string; unit_id: string; dealer_id: string }) => {
      const result = await rvPost<{ work_order: any }>("/work-orders", payload);
      if (!result.ok) throw new Error(result.error);
      return result.data.work_order;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimate"] }),
  });
}

export function useWorkOrderItems(unitId: string | undefined, dealerId: string | undefined) {
  return useQuery({
    queryKey: ["work-order-items", unitId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/work-order-items`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return [];
      return j.data.items as any[];
    },
    enabled: !!unitId && !!dealerId,
  });
}

export function useWorkOrder(unitId: string, dealerId: string) {
  return useQuery({
    queryKey: ["work-order", unitId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/work-order`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return null;
      return j.data as WorkOrder;
    },
    enabled: !!unitId && !!dealerId,
  });
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { estimate_id: string; unit_id: string; dealer_id: string }) => {
      const result = await rvPost<{ work_order: WorkOrder }>("/work-orders", payload);
      if (!result.ok) throw new Error(result.error);
      return result.data.work_order;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work-order"] }),
  });
}

export function useUpdateWorkOrderItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const result = await rvPatch<{ item: WorkOrderItem }>(`/work-order-items/${id}`, payload);
      if (!result.ok) throw new Error(result.error);
      return result.data.item;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work-order"] }),
  });
}
