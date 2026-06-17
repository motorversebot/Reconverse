import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Car, MoreVertical, Archive, ArrowRight,
  ClipboardCheck, FileText, Camera, StickyNote, Activity,
  Calculator, ThumbsUp, Wrench, ShieldCheck, Package, FileDown, Loader2,
  CalendarIcon, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentDealer, useDealerUnits } from "@/hooks/useDealerData";
import { useArchiveUnit, useUpdateUnit } from "@/hooks/useDealerActions";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import StageProgressBar from "@/components/dealer/StageProgressBar";
import { hoursInStage, formatAgingDuration, agingColor, AGING_COLORS, AGING_BG } from "@/hooks/useStageAging";
import InspectionChecklist from "@/components/dealer/InspectionChecklist";
import EditableIntakeCard from "@/components/dealer/EditableIntakeCard";
import RequiredPhotosTab from "@/components/dealer/RequiredPhotosTab";
import UnitNotesCard from "@/components/dealer/UnitNotesCard";
import UnitCommentsCard from "@/components/dealer/UnitCommentsCard";
import UnitActivityCard from "@/components/dealer/UnitActivityCard";
import ActivityTab, { useActivityCount } from "@/components/dealer/activity/ActivityTab";
import CarfaxCard from "@/components/dealer/CarfaxCard";
import EstimateBuilder from "@/components/dealer/estimate/EstimateBuilder";
import ApprovalView from "@/components/dealer/estimate/ApprovalView";
import RepairView from "@/components/dealer/estimate/RepairView";
import {
  STAGE_META, STAGE_DEFAULT_TAB, STATUS_TO_SLUG,
  isStageBefore, type UnitStatus,
} from "@/lib/pipeline";
import { isStaffOnly, canArchiveUnits, canAdvanceStage, canEditUnits } from "@/lib/permissions";

/** Define which tabs are available per stage */
function getTabsForStage(status: UnitStatus, staffOnly: boolean) {
  // Staff can only see a summary view + activity
  if (staffOnly) {
    if (status === "ready" || status === "sold") {
      return [
        { id: "summary", label: "Summary", icon: Package },
        { id: "activity", label: "Activity", icon: Activity },
      ];
    }
    // For any other stage, staff sees minimal info
    return [
      { id: "summary", label: "Summary", icon: Package },
      { id: "activity", label: "Activity", icon: Activity },
    ];
  }

  switch (status) {
    case "inspection":
      return [
        { id: "mpi", label: "MPI", icon: ClipboardCheck },
        { id: "intake", label: "Intake", icon: FileText },
        { id: "photos", label: "Photos", icon: Camera },
        { id: "notes", label: "Notes", icon: StickyNote },
        { id: "activity", label: "Activity", icon: Activity },
      ];
    case "estimate":
      return [
        { id: "estimate", label: "Estimate", icon: Calculator },
        { id: "mpi", label: "MPI", icon: ClipboardCheck },
        { id: "photos", label: "Photos", icon: Camera },
        { id: "notes", label: "Notes", icon: StickyNote },
        { id: "activity", label: "Activity", icon: Activity },
      ];
    case "approval":
      return [
        { id: "approval", label: "Approval", icon: ThumbsUp },
        { id: "estimate", label: "Estimate", icon: Calculator },
        { id: "notes", label: "Notes", icon: StickyNote },
        { id: "activity", label: "Activity", icon: Activity },
      ];
    case "repair":
      return [
        { id: "repair", label: "Repair", icon: Wrench },
        { id: "estimate", label: "Estimate", icon: Calculator },
        { id: "photos", label: "Photos", icon: Camera },
        { id: "notes", label: "Notes", icon: StickyNote },
        { id: "activity", label: "Activity", icon: Activity },
      ];
    case "qc":
      return [
        { id: "qc", label: "QC", icon: ShieldCheck },
        { id: "photos", label: "Photos", icon: Camera },
        { id: "notes", label: "Notes", icon: StickyNote },
        { id: "activity", label: "Activity", icon: Activity },
      ];
    case "ready":
    case "sold":
      return [
        { id: "summary", label: "Summary", icon: Package },
        { id: "estimate", label: "Estimate", icon: Calculator },
        { id: "photos", label: "Photos", icon: Camera },
        { id: "notes", label: "Notes", icon: StickyNote },
        { id: "activity", label: "Activity", icon: Activity },
      ];
    default:
      return [
        { id: "mpi", label: "MPI", icon: ClipboardCheck },
        { id: "notes", label: "Notes", icon: StickyNote },
      ];
  }
}

export default function UnitDetailPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const { data: membership } = useCurrentDealer();
  const dealerId = membership?.dealer_id ?? "";
  const role = membership?.role as string | undefined;
  const staffOnly = isStaffOnly(role);
  const { data: units } = useDealerUnits(dealerId);
  const archiveUnit = useArchiveUnit();
  const updateUnit = useUpdateUnit();
  const { toast } = useToast();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [estimateHasItems, setEstimateHasItems] = useState(false);
  const [estimateStatus, setEstimateStatus] = useState("draft");

  const activityCount = useActivityCount(unitId, dealerId);

  const unit = units?.find((u) => u.id === unitId);
  const showArchive = canArchiveUnits(role);
  const currentStatus = (unit?.status as UnitStatus) ?? "inspection";
  const stageMeta = STAGE_META[currentStatus];
  const nextStatus = stageMeta?.next;

  const defaultTab = staffOnly ? "summary" : (STAGE_DEFAULT_TAB[currentStatus] ?? "mpi");
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const effectiveTab = activeTab ?? defaultTab;

  const tabs = unit ? getTabsForStage(currentStatus, staffOnly) : [];

  const mpiReadOnly = staffOnly || isStageBefore("inspection", currentStatus);
  const estimateReadOnly = staffOnly || isStageBefore("estimate", currentStatus);
  const showAdvanceButton = canAdvanceStage(role);

  const canAdvance = (() => {
    if (!nextStatus || !showAdvanceButton) return false;
    if (currentStatus === "estimate") return estimateStatus === "submitted" && estimateHasItems;
    if (currentStatus === "approval") return false;
    if (currentStatus === "repair") return false;
    return true;
  })();

  const handleEstimateReady = useCallback((hasItems: boolean, status: string) => {
    setEstimateHasItems(hasItems);
    setEstimateStatus(status);
  }, []);

  const handleStageAdvance = useCallback(() => {
    setActiveTab(null);
  }, []);

  if (!unit) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Car className="h-10 w-10 mb-3 opacity-40" />
        <p>Unit not found</p>
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => navigate("/dealer/units")}>
          Back to Units
        </Button>
      </div>
    );
  }

  const title = [unit.year, unit.make, unit.model].filter(Boolean).join(" ") || "Untitled Unit";

  const handleAdvanceStage = async () => {
    if (!nextStatus) return;
    try {
      await updateUnit.mutateAsync({ id: unit.id, status: nextStatus });
      const nextMeta = STAGE_META[nextStatus];
      toast({ title: `Moved to ${nextMeta.label}` });
      setActiveTab(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleArchive = async () => {
    try {
      await archiveUnit.mutateAsync(unit.id);
      toast({ title: "Vehicle archived" });
      navigate("/dealer/units");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/export-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export failed");

      // Open HTML in new window and trigger print (saves as PDF)
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(data.html);
        printWindow.document.close();
        // Set document title so browser uses it as default PDF filename
        if (data.filename) {
          printWindow.document.title = data.filename.replace(/\.pdf$/, "");
        }
        // Small delay so styles render
        setTimeout(() => printWindow.print(), 400);
      }
      toast({ title: "PDF export ready" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{title}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {unit.stock_number && <span>#{unit.stock_number}</span>}
            {unit.vin && <span className="font-mono text-xs">{unit.vin}</span>}
            <Badge variant="outline" className="text-xs">{stageMeta?.label ?? unit.status}</Badge>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPdf}
          disabled={exporting}
          className="gap-1.5 text-xs"
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
          Export PDF
        </Button>

        {showArchive && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setArchiveOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive Vehicle
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Stage progress bar */}
      <StageProgressBar status={currentStatus} />

      {/* Stage aging indicator */}
      {currentStatus !== "sold" && (() => {
        const hours = hoursInStage(unit.stage_entered_at);
        const color = agingColor(hours);
        return (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border-l-2 text-xs font-medium ${AGING_BG[color]}`}>
            <span className={AGING_COLORS[color]}>
              In {stageMeta?.label} for {formatAgingDuration(hours)}
            </span>
          </div>
        );
      })()}

      {/* Promise Date (admin/manager only) */}
      {!staffOnly && currentStatus !== "sold" && (
        <PromiseDatePicker
          unitId={unit.id}
          promiseDate={(unit as any).promise_date ?? null}
        />
      )}

      {/* Staff notice */}
      {staffOnly && (
        <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          You have read-only access. Contact a manager or admin for recon operations.
        </div>
      )}

      {/* CARFAX report */}
      <CarfaxCard unit={unit} dealerId={dealerId} role={role} />

      {/* Stage Tabs */}
      <Tabs value={effectiveTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 w-full justify-start">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 text-xs sm:text-sm">
              <tab.icon className="h-3.5 w-3.5" /> {tab.label}
              {tab.id === "activity" && activityCount > 0 && (
                <span className="text-[10px] text-muted-foreground ml-0.5">({activityCount})</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* MPI Tab */}
        <TabsContent value="mpi" className="mt-4">
          <div className="space-y-4">
            {mpiReadOnly && (
              <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                MPI checklist is read-only — this unit has moved past Inspection.
              </div>
            )}
            <InspectionChecklist unitId={unit.id} dealerId={dealerId} readOnly={mpiReadOnly} />
            {showAdvanceButton && currentStatus === "inspection" && nextStatus && (
              <div className="flex justify-end pt-2">
                <Button onClick={handleAdvanceStage} disabled={updateUnit.isPending} className="gap-2">
                  Move to {STAGE_META[nextStatus].label}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Intake Tab */}
        <TabsContent value="intake" className="mt-4">
          <EditableIntakeCard unit={unit} readOnly={mpiReadOnly} />
        </TabsContent>

        {/* Estimate Tab */}
        <TabsContent value="estimate" className="mt-4">
          <div className="space-y-4">
            {estimateReadOnly && (
              <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                Estimate is read-only — this unit has moved past Estimate.
              </div>
            )}
            <EstimateBuilder
              unitId={unit.id}
              dealerId={dealerId}
              readOnly={estimateReadOnly}
              onEstimateReady={handleEstimateReady}
            />
            {showAdvanceButton && currentStatus === "estimate" && nextStatus && canAdvance && (
              <div className="flex justify-end pt-2">
                <Button onClick={handleAdvanceStage} disabled={updateUnit.isPending} className="gap-2">
                  Move to {STAGE_META[nextStatus].label}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            {currentStatus === "estimate" && !canAdvance && estimateStatus === "draft" && !staffOnly && (
              <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                Submit the estimate before advancing to Approval.
              </div>
            )}
          </div>
        </TabsContent>

        {/* Approval Tab */}
        <TabsContent value="approval" className="mt-4">
          <ApprovalView
            unitId={unit.id}
            dealerId={dealerId}
            unit={unit}
            onStageAdvance={handleStageAdvance}
          />
        </TabsContent>

        {/* Repair Tab */}
        <TabsContent value="repair" className="mt-4">
          <RepairView
            unitId={unit.id}
            dealerId={dealerId}
            onStageAdvance={handleStageAdvance}
          />
        </TabsContent>

        {/* QC Tab */}
        <TabsContent value="qc" className="mt-4">
          <div className="space-y-4">
            <InspectionChecklist unitId={unit.id} dealerId={dealerId} />
            {showAdvanceButton && currentStatus === "qc" && nextStatus && (
              <div className="flex justify-end pt-2">
                <Button onClick={handleAdvanceStage} disabled={updateUnit.isPending} className="gap-2">
                  Ready for Sale
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Summary Tab (Ready / Sold / Staff read-only) */}
        <TabsContent value="summary" className="mt-4">
          <div className="space-y-4">
            <EditableIntakeCard unit={unit} readOnly />
            <UnitActivityCard createdAt={unit.created_at} updatedAt={unit.updated_at} />
          </div>
        </TabsContent>

        {/* Photos Tab */}
        <TabsContent value="photos" className="mt-4">
          <RequiredPhotosTab unitId={unit.id} dealerId={dealerId} />
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-4">
          <div className="space-y-4">
            <UnitCommentsCard unitId={unit.id} dealerId={dealerId} />
            <UnitNotesCard notes={unit.notes} />
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-4">
          <ActivityTab unitId={unit.id} dealerId={dealerId} currentStatus={currentStatus} />
        </TabsContent>
      </Tabs>

      {/* Archive confirmation */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{title}</strong> from the active inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Archive Vehicle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PromiseDatePicker({ unitId, promiseDate }: { unitId: string; promiseDate: string | null }) {
  const updateUnit = useUpdateUnit();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const selected = promiseDate ? new Date(promiseDate + "T00:00:00") : undefined;
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = !!(promiseDate && promiseDate < today);

  const handleSelect = async (date: Date | undefined) => {
    const value = date ? format(date, "yyyy-MM-dd") : null;
    try {
      await updateUnit.mutateAsync({ id: unitId, promise_date: value });
      toast({ title: value ? `Promise date set to ${format(date!, "MMM d, yyyy")}` : "Promise date cleared" });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleClear = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await handleSelect(undefined);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-2 text-xs h-8 border-border/40",
              !promiseDate && "text-muted-foreground",
              isOverdue && "border-red-500/30 text-red-400"
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {promiseDate
              ? <>Promise: {format(new Date(promiseDate + "T00:00:00"), "MMM d, yyyy")}</>
              : "Set Promise Date"
            }
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      {promiseDate && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground/40 hover:text-foreground"
          onClick={handleClear}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
      {isOverdue && (
        <span className="text-[10px] font-semibold text-red-400">OVERDUE</span>
      )}
    </div>
  );
}
