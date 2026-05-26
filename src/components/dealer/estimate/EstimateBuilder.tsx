import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Send, RefreshCw, Printer, FileText,
} from "lucide-react";
import {
  useEstimate, useEstimateOperations, useCreateEstimate,
  useUpdateEstimate, useCreateOperation, calculateEstimateTotals,
} from "@/hooks/useEstimateData";
import EstimateTotals from "./EstimateTotals";
import OperationAccordion from "./OperationAccordion";

interface Props {
  unitId: string;
  dealerId: string;
  readOnly?: boolean;
  onEstimateReady?: (hasItems: boolean, status: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-500/10 text-blue-600",
  approved: "bg-primary/10 text-primary",
  partial_approved: "bg-yellow-500/10 text-yellow-600",
  declined: "bg-destructive/10 text-destructive",
  void: "bg-muted text-muted-foreground",
};

export default function EstimateBuilder({ unitId, dealerId, readOnly = false, onEstimateReady }: Props) {
  const { data: estimate, isLoading } = useEstimate(unitId, dealerId);
  const { data: operations = [] } = useEstimateOperations(estimate?.id);
  const createEstimate = useCreateEstimate();
  const updateEstimate = useUpdateEstimate();
  const createOperation = useCreateOperation();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [newOpName, setNewOpName] = useState("");
  const [addOpOpen, setAddOpOpen] = useState(false);

  // Auto-create draft estimate if none exists
  useEffect(() => {
    if (!isLoading && !estimate && !readOnly) {
      createEstimate.mutate({ unit_id: unitId, dealer_id: dealerId });
    }
  }, [isLoading, estimate, readOnly, unitId, dealerId]);

  // Report estimate readiness to parent
  const totalItems = operations.reduce((sum, op) => sum + (op.items?.length || 0), 0);
  useEffect(() => {
    onEstimateReady?.(totalItems > 0, estimate?.status || "draft");
  }, [totalItems, estimate?.status]);

  const isDraft = estimate?.status === "draft";
  const isEditable = isDraft && !readOnly;

  const totals = calculateEstimateTotals(operations, estimate);

  const handleAddOperation = async () => {
    if (!estimate || !newOpName.trim()) return;
    await createOperation.mutateAsync({
      estimate_id: estimate.id,
      dealer_id: dealerId,
      name: newOpName.trim(),
      sort_order: operations.length,
    });
    setNewOpName("");
    setAddOpOpen(false);
  };

  const handleSubmit = async () => {
    if (!estimate) return;
    await updateEstimate.mutateAsync({ id: estimate.id, status: "submitted" as any });
    setSubmitOpen(false);
  };

  const handleRevise = async () => {
    if (!estimate) return;
    // Create a new version by duplicating — simplified: just reset to draft for now
    await updateEstimate.mutateAsync({ id: estimate.id, status: "draft" as any });
  };

  if (isLoading) {
    return <div className="glass-panel p-8 text-center text-muted-foreground text-sm">Loading estimate…</div>;
  }

  if (!estimate) {
    return <div className="glass-panel p-8 text-center text-muted-foreground text-sm">Creating estimate…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className={`${STATUS_COLORS[estimate.status]} text-xs`}>
            {estimate.status.replace("_", " ").toUpperCase()}
          </Badge>
          <span className="text-xs text-muted-foreground">v{estimate.version_number}</span>

          <div className="flex-1" />

          {isEditable && (
            <>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setAddOpOpen(true)}>
                <Plus className="h-3 w-3" /> Add Operation
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1"
                disabled={totalItems === 0}
                onClick={() => setSubmitOpen(true)}
              >
                <Send className="h-3 w-3" /> Submit for Approval
              </Button>
            </>
          )}

          {estimate.status === "submitted" && !readOnly && (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleRevise}>
              <RefreshCw className="h-3 w-3" /> Revise
            </Button>
          )}

          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => window.print()}>
            <Printer className="h-3 w-3" /> Print
          </Button>
        </div>

        {/* Estimate settings (inline for draft) */}
        {isEditable && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div>
              <label className="text-xs text-muted-foreground">Labor Rate ($/hr)</label>
              <Input
                type="number"
                className="h-8 text-xs mt-1"
                defaultValue={estimate.labor_rate_default}
                onBlur={(e) => updateEstimate.mutate({ id: estimate.id, labor_rate_default: parseFloat(e.target.value) || 125 } as any)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tax Rate (%)</label>
              <Input
                type="number"
                className="h-8 text-xs mt-1"
                defaultValue={(estimate.tax_rate_default * 100).toFixed(2)}
                onBlur={(e) => updateEstimate.mutate({ id: estimate.id, tax_rate_default: (parseFloat(e.target.value) || 8) / 100 } as any)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Shop Supplies (%)</label>
              <Input
                type="number"
                className="h-8 text-xs mt-1"
                defaultValue={(estimate.shop_supplies_percent * 100).toFixed(2)}
                onBlur={(e) => updateEstimate.mutate({ id: estimate.id, shop_supplies_percent: (parseFloat(e.target.value) || 5) / 100 } as any)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Discount</label>
              <Input
                type="number"
                className="h-8 text-xs mt-1"
                defaultValue={estimate.discount_value}
                onBlur={(e) => updateEstimate.mutate({
                  id: estimate.id,
                  discount_value: parseFloat(e.target.value) || 0,
                  discount_type: (parseFloat(e.target.value) || 0) > 0 ? "amount" : "none",
                } as any)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main content: operations + totals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {operations.length === 0 ? (
            <div className="glass-panel p-8 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No operations yet.</p>
              {isEditable && (
                <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => setAddOpOpen(true)}>
                  <Plus className="h-3 w-3" /> Add First Operation
                </Button>
              )}
            </div>
          ) : (
            operations.map((op) => (
              <OperationAccordion
                key={op.id}
                operation={op}
                dealerId={dealerId}
                readOnly={!isEditable}
                laborRateDefault={estimate.labor_rate_default}
              />
            ))
          )}
        </div>

        <div className="lg:sticky lg:top-4 self-start">
          <EstimateTotals totals={totals} />

          {/* Notes */}
          {isEditable && (
            <div className="glass-panel p-4 mt-4">
              <label className="text-xs text-muted-foreground font-medium">Notes</label>
              <Textarea
                className="mt-1 text-xs min-h-[60px] print:hidden"
                defaultValue={estimate.notes_internal || ""}
                placeholder="Internal recon notes..."
                onBlur={(e) => updateEstimate.mutate({ id: estimate.id, notes_internal: e.target.value } as any)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Add Operation Dialog */}
      <AlertDialog open={addOpOpen} onOpenChange={setAddOpOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Operation</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a name for the repair operation (e.g., "Front Brakes", "Oil Change").
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Operation name"
            value={newOpName}
            onChange={(e) => setNewOpName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddOperation()}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddOperation} disabled={!newOpName.trim()}>Add</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit Dialog */}
      <AlertDialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit for Approval?</AlertDialogTitle>
            <AlertDialogDescription>
              This will lock the estimate and submit it for review. You can revise it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
