import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import {
  useEstimate, useEstimateOperations, useUpdateEstimate,
  useUpdateOperation, useUpdateItem, useCreateWorkOrder,
  calculateEstimateTotals,
  type EstimateOperation,
} from "@/hooks/useEstimateData";
import { useUpdateUnit } from "@/hooks/useDealerActions";
import { useToast } from "@/hooks/use-toast";
import ApprovalSummaryHeader from "./ApprovalSummaryHeader";
import ApprovalOperationCard from "./ApprovalOperationCard";

interface Props {
  unitId: string;
  dealerId: string;
  unit?: { year?: number | null; make?: string | null; model?: string | null; stock_number?: string | null; vin?: string | null };
  onStageAdvance?: () => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function ApprovalView({ unitId, dealerId, unit, onStageAdvance }: Props) {
  const { data: estimate } = useEstimate(unitId, dealerId);
  const { data: operations = [] } = useEstimateOperations(estimate?.id);
  const updateEstimate = useUpdateEstimate();
  const updateOp = useUpdateOperation();
  const updateItem = useUpdateItem();
  const createWorkOrder = useCreateWorkOrder();
  const updateUnit = useUpdateUnit();
  const { toast } = useToast();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState("");

  if (!estimate || !["submitted", "approved", "partial_approved", "declined"].includes(estimate.status)) {
    return (
      <div className="glass-panel p-8 text-center text-muted-foreground text-sm">
        No submitted estimate found. Submit an estimate first.
      </div>
    );
  }

  const allTotals = calculateEstimateTotals(operations, estimate);
  const approvedTotals = calculateEstimateTotals(operations, estimate, true);

  const hasApprovedItems = operations.some((op) =>
    op.items?.some((item) => item.status === "approved")
  );

  const vehicleTitle = unit
    ? [unit.year, unit.make, unit.model].filter(Boolean).join(" ") || "Vehicle"
    : "Vehicle";

  // ── Handlers ──

  const recalcEstimateStatus = async () => {
    const allItems = operations.flatMap((op) => op.items || []);
    const approvedCount = allItems.filter((i) => i.status === "approved").length;
    const declinedCount = allItems.filter((i) => i.status === "declined").length;

    let newStatus: string = estimate.status;
    if (approvedCount === allItems.length) newStatus = "approved";
    else if (declinedCount === allItems.length) newStatus = "declined";
    else if (approvedCount > 0) newStatus = "partial_approved";
    else newStatus = "submitted"; // all pending again

    if (newStatus !== estimate.status) {
      await updateEstimate.mutateAsync({ id: estimate.id, status: newStatus });
    }
  };

  const handleApproveOp = async (op: EstimateOperation, status: "approved" | "declined") => {
    await updateOp.mutateAsync({ id: op.id, approval_status: status, approved_at: new Date().toISOString() });
    for (const item of op.items || []) {
      await updateItem.mutateAsync({ id: item.id, status });
    }
    await recalcEstimateStatus();
  };

  const handleApproveItem = async (itemId: string, status: "approved" | "declined" | "pending") => {
    await updateItem.mutateAsync({ id: itemId, status });
    await recalcEstimateStatus();
  };

  const handleApproveAll = async () => {
    for (const op of operations) {
      await updateOp.mutateAsync({ id: op.id, approval_status: "approved", approved_at: new Date().toISOString() });
      for (const item of op.items || []) {
        // Don't override already rejected
        if (item.status !== "declined") {
          await updateItem.mutateAsync({ id: item.id, status: "approved" });
        }
      }
    }
    await updateEstimate.mutateAsync({ id: estimate.id, status: "approved" });
  };

  const handleReturnToEstimate = async () => {
    await updateUnit.mutateAsync({ id: unitId, status: "estimate" });
    toast({ title: "Returned to Estimate stage" });
    onStageAdvance?.();
  };

  const handleGenerateWorkOrder = async () => {
    const approvedItems = operations.flatMap((op) =>
      (op.items || []).filter((i) => i.status === "approved").map((item) => ({
        source_estimate_item_id: item.id,
        type: item.type as "labor" | "part" | "misc",
        description: item.description,
        qty: item.qty,
        hours: item.hours,
        labor_rate: item.labor_rate,
        unit_cost: item.unit_cost,
        unit_price: item.unit_price,
        status: "open" as const,
      }))
    );

    // Save decision notes if any
    if (decisionNotes.trim()) {
      await updateEstimate.mutateAsync({ id: estimate.id, notes_internal: decisionNotes });
    }

    await createWorkOrder.mutateAsync({
      unit_id: unitId,
      dealer_id: dealerId,
      source_estimate_id: estimate.id,
      items: approvedItems,
    });

    await updateUnit.mutateAsync({ id: unitId, status: "repair" });
    toast({ title: "Work order created — moved to Repair" });
    setGenerateOpen(false);
    onStageAdvance?.();
  };

  return (
    <div className="space-y-4">
      {/* Sticky Summary Header */}
      <ApprovalSummaryHeader
        title={vehicleTitle}
        stockNumber={unit?.stock_number}
        vin={unit?.vin}
        grandTotal={allTotals.grandTotal}
        gross={allTotals.gross}
        grossPercent={allTotals.grossPercent}
      />

      {/* Operations */}
      <div className="space-y-3">
        {operations.map((op) => (
          <ApprovalOperationCard
            key={op.id}
            operation={op}
            onApproveOp={handleApproveOp}
            onApproveItem={handleApproveItem}
          />
        ))}
      </div>

      {/* Approved Total (when items approved) */}
      {hasApprovedItems && (
        <div className="glass-panel p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Approved Total</p>
            <p className="text-2xl font-bold text-primary">{fmt(approvedTotals.grandTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Approved Gross</p>
            <p className="text-sm font-semibold text-foreground">{fmt(approvedTotals.gross)} ({approvedTotals.grossPercent.toFixed(1)}%)</p>
          </div>
        </div>
      )}

      {/* Decision Notes */}
      <div className="glass-panel p-4 print:hidden">
        <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Approval Decision Notes</label>
        <Textarea
          className="mt-2 text-xs min-h-[60px]"
          value={decisionNotes}
          onChange={(e) => setDecisionNotes(e.target.value)}
          placeholder="Internal approval notes..."
        />
      </div>

      {/* Footer Actions */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end lg:sticky lg:bottom-4 z-10">
        <Button
          variant="outline" size="sm" className="gap-1.5 text-xs"
          onClick={handleReturnToEstimate}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Return to Estimate
        </Button>

        <Button
          variant="outline" size="sm" className="gap-1.5 text-xs"
          onClick={handleApproveAll}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Approve All
        </Button>

        <Button
          size="sm" className="gap-1.5 text-xs"
          disabled={!hasApprovedItems}
          onClick={() => setGenerateOpen(true)}
        >
          <ArrowRight className="h-3.5 w-3.5" />
          {hasApprovedItems ? "Approve Selected & Generate Work Order" : "Approve items to continue"}
        </Button>
      </div>

      {/* Generate WO dialog */}
      <AlertDialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Work Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a work order from approved items ({fmt(approvedTotals.grandTotal)}) and move the unit to Repair stage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleGenerateWorkOrder}>Approve & Generate Work Order</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
