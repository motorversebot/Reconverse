import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

// ── Queries ──

export function useEstimate(unitId: string, dealerId: string) {
  return useQuery({
    queryKey: ["estimate", unitId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("estimates") as any)
        .select("*")
        .eq("unit_id", unitId)
        .eq("dealer_id", dealerId)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Estimate | null;
    },
    enabled: !!unitId && !!dealerId,
  });
}

export function useEstimateOperations(estimateId: string | undefined) {
  return useQuery({
    queryKey: ["estimate-operations", estimateId],
    queryFn: async () => {
      if (!estimateId) return [];
      const { data: ops, error } = await (supabase
        .from("estimate_operations") as any)
        .select("*")
        .eq("estimate_id", estimateId)
        .order("sort_order");
      if (error) throw error;

      // Fetch items for all operations
      const opIds = (ops || []).map((o: any) => o.id);
      if (opIds.length === 0) return [];

      const { data: items, error: itemsErr } = await (supabase
        .from("estimate_items") as any)
        .select("*")
        .in("operation_id", opIds)
        .order("sort_order");
      if (itemsErr) throw itemsErr;

      return (ops || []).map((op: any) => ({
        ...op,
        items: (items || []).filter((i: any) => i.operation_id === op.id),
      })) as EstimateOperation[];
    },
    enabled: !!estimateId,
  });
}

export function useWorkOrder(unitId: string, dealerId: string) {
  return useQuery({
    queryKey: ["work-order", unitId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("work_orders") as any)
        .select("*")
        .eq("unit_id", unitId)
        .eq("dealer_id", dealerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const { data: items, error: itemsErr } = await (supabase
        .from("work_order_items") as any)
        .select("*")
        .eq("work_order_id", data.id)
        .order("created_at");
      if (itemsErr) throw itemsErr;

      return { ...data, items: items || [] } as WorkOrder;
    },
    enabled: !!unitId && !!dealerId,
  });
}

// ── Mutations ──

export function useCreateEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { unit_id: string; dealer_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase.from("estimates") as any)
        .insert({ ...payload, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as Estimate;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["estimate", d.unit_id] });
    },
  });
}

export function useUpdateEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Estimate> & { id: string }) => {
      const { data, error } = await (supabase.from("estimates") as any)
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Estimate;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["estimate", d.unit_id] });
    },
  });
}

export function useCreateOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { estimate_id: string; dealer_id: string; name: string; category?: string; priority?: string; sort_order?: number }) => {
      const { data, error } = await (supabase.from("estimate_operations") as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["estimate-operations", d.estimate_id] });
    },
  });
}

export function useUpdateOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { data, error } = await (supabase.from("estimate_operations") as any)
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["estimate-operations", d.estimate_id] });
    },
  });
}

export function useDeleteOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estimateId }: { id: string; estimateId: string }) => {
      const { error } = await (supabase.from("estimate_operations") as any).delete().eq("id", id);
      if (error) throw error;
      return estimateId;
    },
    onSuccess: (estimateId) => {
      qc.invalidateQueries({ queryKey: ["estimate-operations", estimateId] });
    },
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase.from("estimate_items") as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estimate-operations"] });
    },
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { data, error } = await (supabase.from("estimate_items") as any)
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estimate-operations"] });
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("estimate_items") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estimate-operations"] });
    },
  });
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      unit_id: string;
      dealer_id: string;
      source_estimate_id: string;
      items: Omit<WorkOrderItem, "id" | "work_order_id" | "dealer_id">[];
    }) => {
      const { data: wo, error } = await (supabase.from("work_orders") as any)
        .insert({
          unit_id: payload.unit_id,
          dealer_id: payload.dealer_id,
          source_estimate_id: payload.source_estimate_id,
        })
        .select()
        .single();
      if (error) throw error;

      if (payload.items.length > 0) {
        const woItems = payload.items.map((item) => ({
          ...item,
          work_order_id: wo.id,
          dealer_id: payload.dealer_id,
        }));
        const { error: itemsErr } = await (supabase.from("work_order_items") as any).insert(woItems);
        if (itemsErr) throw itemsErr;
      }

      return wo;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["work-order", d.unit_id] });
    },
  });
}

export function useUpdateWorkOrderItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { data, error } = await (supabase.from("work_order_items") as any)
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-order"] });
    },
  });
}

// ── Totals Calculator ──

export function calculateEstimateTotals(
  operations: EstimateOperation[],
  estimate: Estimate | null,
  filterApproved = false
) {
  let laborTotal = 0;
  let partsTotal = 0;
  let miscTotal = 0;
  let subletTotal = 0;
  let costTotal = 0;
  let taxableTotal = 0;

  for (const op of operations) {
    for (const item of op.items || []) {
      if (filterApproved && item.status !== "approved") continue;

      const lineTotal =
        item.type === "labor"
          ? item.hours * item.labor_rate
          : item.qty * item.unit_price;

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
  if (estimate?.discount_type === "percent") {
    discountTotal = subtotal * (estimate.discount_value / 100);
  } else if (estimate?.discount_type === "amount") {
    discountTotal = estimate.discount_value;
  }

  const grandTotal = subtotal + taxTotal + shopSupplies - discountTotal;
  // Gross = revenue (all line totals) minus cost (all line costs)
  const gross = subtotal - costTotal;
  // Margin = gross / revenue * 100
  const grossPercent = subtotal > 0 ? (gross / subtotal) * 100 : 0;

  return {
    laborTotal,
    partsTotal,
    miscTotal,
    subletTotal,
    subtotal,
    taxTotal,
    shopSupplies,
    discountTotal,
    grandTotal,
    costTotal,
    gross,
    grossPercent,
  };
}
