import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Wrench, Package, ReceiptText, Truck } from "lucide-react";
import type { EstimateOperation, EstimateItem } from "@/hooks/useEstimateData";
import {
  useCreateItem, useUpdateItem, useDeleteItem,
  useUpdateOperation, useDeleteOperation,
} from "@/hooks/useEstimateData";

interface Props {
  operation: EstimateOperation;
  dealerId: string;
  readOnly: boolean;
  laborRateDefault: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const CATEGORY_COLORS: Record<string, string> = {
  mechanical: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  body: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  detail: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  diag: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  other: "bg-muted text-muted-foreground border-border",
};

const PRIORITY_COLORS: Record<string, string> = {
  safety: "bg-destructive/10 text-destructive border-destructive/20",
  recommended: "bg-primary/10 text-primary border-primary/20",
  cosmetic: "bg-muted text-muted-foreground border-border",
};

export default function OperationAccordion({ operation, dealerId, readOnly, laborRateDefault }: Props) {
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const updateOp = useUpdateOperation();
  const deleteOp = useDeleteOperation();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const items = operation.items || [];
  const opTotal = items.reduce((sum, item) => {
    return sum + (item.type === "labor" ? item.hours * item.labor_rate : item.qty * item.unit_price);
  }, 0);

  const handleAddItem = async (type: "labor" | "part" | "misc" | "sublet") => {
    const descMap: Record<string, string> = { labor: "Labor", part: "New Part", misc: "Miscellaneous", sublet: "Sublet Service" };
    await createItem.mutateAsync({
      operation_id: operation.id,
      dealer_id: dealerId,
      type,
      description: descMap[type],
      labor_rate: type === "labor" ? laborRateDefault : 0,
      taxable: type !== "labor",
      sort_order: items.length,
    });
  };

  const handleUpdateItem = async (id: string, field: string, value: any) => {
    await updateItem.mutateAsync({ id, [field]: value });
  };

  const handleDeleteOp = async () => {
    await deleteOp.mutateAsync({ id: operation.id, estimateId: operation.estimate_id });
    setDeleteOpen(false);
  };

  return (
    <>
      <Accordion type="single" collapsible defaultValue={operation.id}>
        <AccordionItem value={operation.id} className="glass-panel border-none">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-3 flex-1 text-left">
              <span className="font-semibold text-sm text-foreground">{operation.name}</span>
              <Badge variant="outline" className={`text-xs ${CATEGORY_COLORS[operation.category] || ""}`}>
                {operation.category}
              </Badge>
              <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[operation.priority] || ""}`}>
                {operation.priority}
              </Badge>
              {operation.approval_status !== "pending" && (
                <Badge variant={operation.approval_status === "approved" ? "default" : "destructive"} className="text-xs">
                  {operation.approval_status}
                </Badge>
              )}
              <span className="ml-auto text-sm font-semibold text-foreground mr-2">{fmt(opTotal)}</span>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-4 pb-4">
            {/* Operation meta editor */}
            {!readOnly && (
              <div className="flex gap-2 mb-3 flex-wrap">
                <Input
                  className="h-8 text-xs w-44"
                  defaultValue={operation.name}
                  onBlur={(e) => {
                    if (e.target.value !== operation.name) {
                      updateOp.mutate({ id: operation.id, name: e.target.value });
                    }
                  }}
                />
                <Select
                  value={operation.category}
                  onValueChange={(v) => updateOp.mutate({ id: operation.id, category: v })}
                >
                  <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["mechanical", "body", "detail", "diag", "other"].map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={operation.priority}
                  onValueChange={(v) => updateOp.mutate({ id: operation.id, priority: v })}
                >
                  <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["safety", "recommended", "cosmetic"].map((p) => (
                      <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive ml-auto" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Remove
                </Button>
              </div>
            )}

            {/* Items table */}
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-[40px_1fr_80px_100px_100px_48px_72px_32px] gap-2 text-xs text-muted-foreground font-medium px-2 py-1">
                <div>Type</div>
                <div>Description</div>
                <div className="text-right">Qty/Hrs</div>
                <div className="text-right">Cost</div>
                <div className="text-right">Price</div>
                <div className="text-center">Tax</div>
                <div className="text-right">Total</div>
                <div></div>
              </div>

              {items.map((item) => (
                <ItemRow key={item.id} item={item} readOnly={readOnly} onUpdate={handleUpdateItem} onDelete={() => deleteItem.mutate(item.id)} />
              ))}
            </div>

            {/* Add buttons */}
            {!readOnly && (
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAddItem("labor")}>
                  <Wrench className="h-3 w-3" /> + Labor
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAddItem("part")}>
                  <Package className="h-3 w-3" /> + Part
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAddItem("misc")}>
                  <ReceiptText className="h-3 w-3" /> + Misc
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAddItem("sublet")}>
                  <Truck className="h-3 w-3" /> + Sublet
                </Button>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete operation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{operation.name}" and all its line items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOp} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ItemRow({ item, readOnly, onUpdate, onDelete }: {
  item: EstimateItem;
  readOnly: boolean;
  onUpdate: (id: string, field: string, value: any) => void;
  onDelete: () => void;
}) {
  const lineTotal = item.type === "labor" ? item.hours * item.labor_rate : item.qty * item.unit_price;
  const typeIcons: Record<string, string> = { labor: "🔧", part: "📦", misc: "📝", sublet: "🚚" };
  const typeIcon = typeIcons[item.type] || "📝";
  const isSublet = item.type === "sublet";

  if (readOnly) {
    return (
      <div className="space-y-0.5">
        <div className="grid grid-cols-[40px_1fr_80px_100px_100px_48px_72px_32px] gap-2 text-xs items-center px-2 py-1.5 rounded-lg hover:bg-muted/30">
          <div>{typeIcon}</div>
          <div className="text-foreground truncate">{item.description}</div>
          <div className="text-right">{item.type === "labor" ? `${Number(item.hours).toFixed(1)}h` : item.qty}</div>
          <div className="text-right">{fmt(item.unit_cost)}</div>
          <div className="text-right">{item.type === "labor" ? `${fmt(item.labor_rate)}/hr` : fmt(item.unit_price)}</div>
          <div className="text-center">{item.taxable ? "✓" : ""}</div>
          <div className="font-medium text-right">{fmt(lineTotal)}</div>
          <div></div>
        </div>
        {isSublet && (item.vendor || item.part_number) && (
          <div className="pl-12 text-xs text-muted-foreground flex gap-4 pb-1">
            {item.vendor && <span>Vendor: {item.vendor}</span>}
            {item.part_number && <span>Invoice #: {item.part_number}</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="grid grid-cols-[40px_1fr_80px_100px_100px_48px_72px_32px] gap-2 text-xs items-center px-2 py-1 rounded-lg hover:bg-muted/30">
        <div>{typeIcon}</div>
        <div>
          <Input
            className="h-7 text-xs"
            defaultValue={item.description}
            onBlur={(e) => onUpdate(item.id, "description", e.target.value)}
          />
        </div>
        <div>
          <Input
            className="h-7 text-xs text-right px-2"
            type="number"
            step={item.type === "labor" ? "0.1" : "1"}
            min="0"
            defaultValue={item.type === "labor" ? Number(item.hours).toFixed(1) : item.qty}
            onBlur={(e) => {
              const val = parseFloat(e.target.value) || 0;
              const field = item.type === "labor" ? "hours" : "qty";
              onUpdate(item.id, field, item.type === "labor" ? Math.round(val * 10) / 10 : val);
            }}
          />
        </div>
        <div>
          <Input
            className="h-7 text-xs text-right px-2"
            type="number"
            step="0.01"
            defaultValue={item.unit_cost}
            onBlur={(e) => onUpdate(item.id, "unit_cost", parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <Input
            className="h-7 text-xs text-right px-2"
            type="number"
            step="0.01"
            defaultValue={item.type === "labor" ? item.labor_rate : item.unit_price}
            onBlur={(e) => onUpdate(item.id, item.type === "labor" ? "labor_rate" : "unit_price", parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="flex justify-center">
          <Switch
            checked={item.taxable}
            onCheckedChange={(v) => onUpdate(item.id, "taxable", v)}
            className="scale-75"
          />
        </div>
        <div className="font-medium text-foreground text-right">{fmt(lineTotal)}</div>
        <div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {/* Sublet vendor fields */}
      {isSublet && (
        <div className="pl-12 flex gap-2 pb-1">
          <Input
            className="h-7 text-xs w-40"
            placeholder="Vendor name"
            defaultValue={item.vendor || ""}
            onBlur={(e) => onUpdate(item.id, "vendor", e.target.value || null)}
          />
          <Input
            className="h-7 text-xs w-40"
            placeholder="Vendor invoice #"
            defaultValue={item.part_number || ""}
            onBlur={(e) => onUpdate(item.id, "part_number", e.target.value || null)}
          />
        </div>
      )}
    </div>
  );
}
