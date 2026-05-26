import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2, XCircle, RotateCcw, ChevronDown, MoreVertical,
} from "lucide-react";
import type { EstimateOperation, EstimateItem } from "@/hooks/useEstimateData";

interface Props {
  operation: EstimateOperation;
  onApproveOp: (op: EstimateOperation, status: "approved" | "declined") => void;
  onApproveItem: (itemId: string, status: "approved" | "declined" | "pending") => void;
  compact?: boolean;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  approved: { label: "Approved", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  declined: { label: "Rejected", className: "bg-red-500/15 text-red-400 border-red-500/20" },
  pending: { label: "Pending", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
};

const TYPE_LABEL: Record<string, string> = {
  labor: "Labor",
  part: "Part",
  misc: "Misc",
  sublet: "Sublet",
};

function lineTotal(item: EstimateItem) {
  return item.type === "labor" ? item.hours * item.labor_rate : item.qty * item.unit_price;
}

function lineGross(item: EstimateItem) {
  const revenue = lineTotal(item);
  const cost = item.type === "labor" ? 0 : item.qty * item.unit_cost;
  return revenue - cost;
}

export default function ApprovalOperationCard({ operation, onApproveOp, onApproveItem, compact }: Props) {
  const [open, setOpen] = useState(true);
  const items = operation.items || [];
  const opTotal = items.reduce((s, i) => s + lineTotal(i), 0);
  const opGross = items.reduce((s, i) => s + lineGross(i), 0);
  const approvedCount = items.filter((i) => i.status === "approved").length;
  const pendingCount = items.filter((i) => i.status === "pending").length;

  const statusInfo = STATUS_BADGE[operation.approval_status] || STATUS_BADGE.pending;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="glass-panel overflow-hidden">
        {/* Operation header */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors text-left">
            <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground">{operation.name}</span>
                <Badge variant="outline" className="text-[10px]">{operation.category}</Badge>
                <Badge variant="outline" className="text-[10px]">{operation.priority}</Badge>
                <Badge className={`text-[10px] border ${statusInfo.className}`}>{statusInfo.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {approvedCount}/{items.length} approved · {fmt(opTotal)} total · {fmt(opGross)} gross
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline" size="sm" className="h-7 text-xs gap-1"
                onClick={() => onApproveOp(operation, "approved")}
              >
                <CheckCircle2 className="h-3 w-3" /> Approve All
              </Button>
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Line items table */}
        <CollapsibleContent>
          <div className="border-t border-border/30">
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase tracking-wider w-[90px]">Status</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider w-[60px]">Type</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider">Description</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-right w-[70px]">Qty/Hrs</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-right w-[80px]">Cost</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-right w-[80px]">Price</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-right w-[80px]">Gross</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-center w-[50px]">Tax</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-right w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const st = STATUS_BADGE[item.status] || STATUS_BADGE.pending;
                    const lt = lineTotal(item);
                    const lg = lineGross(item);
                    return (
                      <TableRow key={item.id} className="group">
                        <TableCell>
                          <Badge className={`text-[10px] border ${st.className}`}>{st.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{TYPE_LABEL[item.type]}</TableCell>
                        <TableCell className="text-xs text-foreground font-medium">{item.description}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {item.type === "labor" ? `${item.hours}h` : item.qty}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                          {item.type === "labor" ? "—" : fmt(item.unit_cost)}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{fmt(item.type === "labor" ? item.labor_rate : item.unit_price)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums font-medium">{fmt(lg)}</TableCell>
                        <TableCell className="text-center text-xs">{item.taxable ? "✓" : "—"}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant={item.status === "approved" ? "default" : "outline"}
                              size="sm" className="h-6 px-2 text-[10px] gap-1"
                              onClick={() => onApproveItem(item.id, "approved")}
                            >
                              <CheckCircle2 className="h-3 w-3" /> Approve
                            </Button>
                            <Button
                              variant={item.status === "declined" ? "destructive" : "outline"}
                              size="sm" className="h-6 px-2 text-[10px] gap-1"
                              onClick={() => onApproveItem(item.id, "declined")}
                            >
                              <XCircle className="h-3 w-3" /> Reject
                            </Button>
                            <Button
                              variant="outline" size="sm" className="h-6 px-2 text-[10px] gap-1"
                              onClick={() => onApproveItem(item.id, "pending")}
                            >
                              <RotateCcw className="h-3 w-3" /> Revise
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border/30">
              {items.map((item) => {
                const st = STATUS_BADGE[item.status] || STATUS_BADGE.pending;
                const lt = lineTotal(item);
                const lg = lineGross(item);
                return (
                  <div key={item.id} className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">{item.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-[10px] border ${st.className}`}>{st.label}</Badge>
                          <span className="text-[10px] text-muted-foreground">{TYPE_LABEL[item.type]}</span>
                          {item.taxable && <span className="text-[10px] text-muted-foreground">Taxable</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold">{fmt(lt)}</p>
                        <p className="text-[10px] text-muted-foreground">Gross {fmt(lg)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 w-full">
                            <MoreVertical className="h-3 w-3" /> Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => onApproveItem(item.id, "approved")}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-400" /> Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onApproveItem(item.id, "declined")}>
                            <XCircle className="h-3.5 w-3.5 mr-2 text-red-400" /> Reject
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onApproveItem(item.id, "pending")}>
                            <RotateCcw className="h-3.5 w-3.5 mr-2 text-amber-400" /> Send Back for Revision
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
