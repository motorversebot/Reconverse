import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { mapVinDecodeToIntake, mergeDecodeIntoIntake } from "@/lib/vinToIntakeMapping";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useCurrentDealer, useDealerUnits, useDealerArchivedUnits, fetchDealerUnits } from "@/hooks/useDealerData";
import { useCreateUnit, useUpdateUnit, useRestoreUnit } from "@/hooks/useDealerActions";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Search, ScanLine, Check, Loader2, ChevronDown, AlertCircle, RotateCcw, Archive, Car, ArrowUpDown, ArrowUp, ArrowDown, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { decodeVinNhtsa } from "@/lib/vinDecode";
import { runUnitChecks } from "@/lib/unitChecks";
import { OpenRecallBadge } from "@/components/dealer/OpenRecallBadge";
import { isStaffOnly, canEditUnits, canArchiveUnits } from "@/lib/permissions";
import StaffUnitDrawer from "@/components/dealer/StaffUnitDrawer";
import VinScanner from "@/components/dealer/VinScanner";

import { ALL_STATUSES, STAGE_META } from "@/lib/pipeline";
import { hoursInStage, formatAgingDuration, agingColor, AGING_COLORS } from "@/hooks/useStageAging";

const STATUSES = ALL_STATUSES.map((s) => s);

interface UnitForm {
  vin: string;
  stock_number: string;
  make: string;
  model: string;
  year: string;
  color: string;
  notes: string;
  status: string;
  trim: string;
  engine: string;
  body: string;
  drive_type: string;
  transmission: string;
}

interface DecodedData {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  engine: string | null;
  body: string | null;
  drive_type: string | null;
  transmission: string | null;
}

const emptyForm: UnitForm = {
  vin: "", stock_number: "", make: "", model: "", year: "",
  color: "", notes: "", status: "inspection", trim: "", engine: "",
  body: "", drive_type: "", transmission: "",
};

export default function DealerUnitsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: membership } = useCurrentDealer();
  const dealerId = membership?.dealer_id ?? "";
  const role = membership?.role as string | undefined;
  const staffOnly = isStaffOnly(role);
  const { data: units } = useDealerUnits(dealerId);
  const { data: archivedUnits } = useDealerArchivedUnits(dealerId);
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const restoreUnit = useRestoreUnit();
  const { toast } = useToast();
  const canEdit = canEditUnits(role);       // owner / admin / manager → add + edit units
  const canManage = canArchiveUnits(role);  // owner / admin → archive + restore
  const [drawerUnit, setDrawerUnit] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [makeFilter, setMakeFilter] = useState("all");
  const [minYear, setMinYear] = useState("");
  const [maxYear, setMaxYear] = useState("");
  const [promiseAfter, setPromiseAfter] = useState<Date | undefined>(undefined);
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [modalOpen, setModalOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UnitForm>(emptyForm);

  // VIN decode state
  const [decoding, setDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [decoded, setDecoded] = useState(false);
  const [decodedRaw, setDecodedRaw] = useState<Record<string, string> | null>(null);
  const [fieldsLocked, setFieldsLocked] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const filterUnits = (list: any[] | undefined) => list?.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      (u.vin?.toLowerCase().includes(q)) ||
      (u.stock_number?.toLowerCase().includes(q)) ||
      (u.make?.toLowerCase().includes(q)) ||
      (u.model?.toLowerCase().includes(q));
    if (!matchesSearch) return false;
    if (stageFilter !== "all" && u.status !== stageFilter) return false;
    if (makeFilter !== "all" && (u.make ?? "") !== makeFilter) return false;
    if (minYear && Number(u.year || 0) < Number(minYear)) return false;
    if (maxYear && Number(u.year || 0) > Number(maxYear)) return false;
    if (promiseAfter) {
      if (!u.promise_date) return false;
      const pd = new Date(String(u.promise_date).length <= 10 ? `${u.promise_date}T00:00:00` : u.promise_date);
      if (isNaN(pd.getTime()) || pd < promiseAfter) return false;
    }
    return true;
  });

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sortUnits = (list: any[] | undefined) => {
    if (!list) return [];
    return [...list].sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case "vehicle": av = `${a.year ?? ""} ${a.make ?? ""} ${a.model ?? ""}`.trim().toLowerCase(); bv = `${b.year ?? ""} ${b.make ?? ""} ${b.model ?? ""}`.trim().toLowerCase(); break;
        case "stock_number": av = a.stock_number?.toLowerCase() ?? ""; bv = b.stock_number?.toLowerCase() ?? ""; break;
        case "vin": av = a.vin?.toLowerCase() ?? ""; bv = b.vin?.toLowerCase() ?? ""; break;
        case "status": av = ALL_STATUSES.indexOf(a.status); bv = ALL_STATUSES.indexOf(b.status); break;
        case "stage_age": av = hoursInStage(a.stage_entered_at); bv = hoursInStage(b.stage_entered_at); break;
        case "promise_date": av = a.promise_date ?? ""; bv = b.promise_date ?? ""; break;
        case "created_at": default: av = a.created_at; bv = b.created_at; break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  };

  const filtered = sortUnits(filterUnits(units));
  const filteredArchived = filterUnits(archivedUnits);

  const makeOptions = Array.from(new Set((units ?? []).map((u: any) => u.make).filter(Boolean))).sort() as string[];
  const hasActiveFilters = !!search || stageFilter !== "all" || makeFilter !== "all" || !!minYear || !!maxYear || !!promiseAfter;
  const shownCount = (activeTab === "archived" ? filteredArchived : filtered)?.length ?? 0;
  const clearFilters = () => { setSearch(""); setStageFilter("all"); setMakeFilter("all"); setMinYear(""); setMaxYear(""); setPromiseAfter(undefined); };

  const SortHeader = ({ label, column }: { label: string; column: string }) => (
    <TableHead>
      <button
        className="flex items-center gap-1 hover:text-foreground transition-colors -ml-0.5"
        onClick={() => toggleSort(column)}
      >
        {label}
        {sortKey === column
          ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
          : <ArrowUpDown className="h-3 w-3 opacity-30" />
        }
      </button>
    </TableHead>
  );

  const handleRestore = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await restoreUnit.mutateAsync(id);
      toast({ title: "Vehicle restored" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const resetDecodeState = () => {
    setDecoding(false);
    setDecodeError(null);
    setDecoded(false);
    setDecodedRaw(null);
    setFieldsLocked(false);
    setRawOpen(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    resetDecodeState();
    setModalOpen(true);
  };

  // Deep-link: arriving with ?add=1 (e.g. dashboard "Add Unit") opens intake.
  useEffect(() => {
    if (searchParams.get("add") === "1") {
      if (!staffOnly && canEdit) openCreate();
      const next = new URLSearchParams(searchParams);
      next.delete("add");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const openEdit = (u: any) => {
    setEditingId(u.id);
    setForm({
      vin: u.vin || "", stock_number: u.stock_number || "", make: u.make || "",
      model: u.model || "", year: u.year?.toString() || "", color: u.color || "",
      notes: u.notes || "", status: u.status || "inspection",
      trim: u.trim || "", engine: u.engine || "", body: u.body || "",
      drive_type: u.drive_type || "", transmission: u.transmission || "",
    });
    resetDecodeState();
    setModalOpen(true);
  };

  const decodeVin = useCallback(async (vin: string) => {
    if (vin.length !== 17) return;
    setDecoding(true);
    setDecodeError(null);
    setDecoded(false);
    setDecodedRaw(null);

    try {
      // VIN decode via NHTSA vPIC (client-side, VIN-only). MC's
      // /api/v1/reconverse/vin-decode isn't implemented yet, so we decode
      // against the same public source the recall checker uses.
      const { decoded: d, raw } = await decodeVinNhtsa(vin.trim().toUpperCase());
      if (!d.year && !d.make && !d.model) {
        setDecodeError("Could not decode this VIN");
        return;
      }
      setForm((prev) => ({
        ...prev,
        year: d.year?.toString() || prev.year,
        make: d.make || prev.make,
        model: d.model || prev.model,
        trim: d.trim || prev.trim,
        engine: d.engine || prev.engine,
        body: d.body || prev.body,
        drive_type: d.drive_type || prev.drive_type,
        transmission: d.transmission || prev.transmission,
      }));
      setDecodedRaw(raw);
      setDecoded(true);
      setFieldsLocked(true);
    } catch {
      setDecodeError("Network error decoding VIN");
    } finally {
      setDecoding(false);
    }
  }, []);

  // Auto-decode when VIN reaches 17 chars
  const handleVinChange = (value: string) => {
    const upper = value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17);
    setForm((prev) => ({ ...prev, vin: upper }));
    setDecoded(false);
    setDecodeError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (upper.length === 17) {
      debounceRef.current = setTimeout(() => decodeVin(upper), 400);
    }
  };

  const handleScan = async () => {
    // Try BarcodeDetector API if available (Chrome Android, etc.)
    if ("BarcodeDetector" in window) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const video = document.createElement("video");
        video.srcObject = stream;
        await video.play();

        const detector = new (window as any).BarcodeDetector({ formats: ["code_39", "code_128", "qr_code"] });
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d")!;

        let found = false;
        for (let i = 0; i < 30 && !found; i++) {
          await new Promise((r) => setTimeout(r, 200));
          ctx.drawImage(video, 0, 0);
          const barcodes = await detector.detect(canvas);
          for (const b of barcodes) {
            if (b.rawValue && b.rawValue.length === 17) {
              handleVinChange(b.rawValue);
              found = true;
              break;
            }
          }
        }
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        if (!found) toast({ title: "No VIN barcode found", description: "Try entering manually", variant: "destructive" });
      } catch {
        toast({ title: "Camera unavailable", description: "Enter VIN manually", variant: "destructive" });
      }
    } else {
      toast({ title: "Scan not supported", description: "Enter VIN manually on this device" });
    }
  };

  const handleSave = async () => {
    const payload: any = {
      vin: form.vin || null,
      stock_number: form.stock_number || null,
      make: form.make || null,
      model: form.model || null,
      year: form.year ? parseInt(form.year) : null,
      color: form.color || null,
      notes: form.notes || null,
      trim: form.trim || null,
      engine: form.engine || null,
      body: form.body || null,
      drive_type: form.drive_type || null,
      transmission: form.transmission || null,
    };
    // Only include vin_decode_raw and status for create
    if (!editingId) {
      payload.vin_decode_raw = decodedRaw || null;
      // Auto-generate intake_meta from decoded data
      if (decodedRaw) {
        const mapping = mapVinDecodeToIntake(decodedRaw);
        const initialIntake = mergeDecodeIntoIntake({}, mapping, new Set(), true);
        initialIntake._vin_auto_filled = true;
        payload.intake_meta = initialIntake;
      }
      // Status defaults to Inspection via DB default, don't send
    } else {
      payload.status = form.status;
      if (decodedRaw) payload.vin_decode_raw = decodedRaw;
    }

    try {
      if (editingId) {
        await updateUnit.mutateAsync({ id: editingId, ...payload });
        toast({ title: "Unit updated" });
        setModalOpen(false);
      } else {
        const created = await createUnit.mutateAsync({ dealer_id: dealerId, ...payload });

        // The unit is created server-side at this point. Resolve its id
        // defensively — never let an unexpected response shape turn a
        // successful create into a red crash error.
        let unitId = created?.id != null ? String(created.id) : "";
        let unitVin = (created?.vin as string) || (payload.vin as string) || "";
        const stockNo = (payload.stock_number as string) || "";

        // If the id didn't come back, refetch the dealer's units and match the
        // one we just created by VIN/stock before giving up.
        if (!unitId) {
          try {
            const all = await fetchDealerUnits();
            const match = all.find(
              (u) => (unitVin && u.vin === unitVin) || (stockNo && u.stock_number === stockNo),
            );
            if (match?.id != null) {
              unitId = String(match.id);
              unitVin = unitVin || (match.vin ?? "");
            }
          } catch { /* fall through to the safe success path below */ }
        }

        setModalOpen(false);

        if (unitId) {
          // Optional, non-blocking post-create checks — only ever called with a
          // valid unit id. Failures surface on the unit's card, never here.
          if (unitVin) {
            void runUnitChecks({ id: unitId, vin: unitVin }, dealerId).catch(() => {});
            toast({ title: "Unit created", description: "Running CARFAX and recall checks…" });
          } else {
            toast({ title: "Unit created" });
          }
          navigate(`/dealer/units/${unitId}`);
        } else {
          // Created, but we couldn't resolve the id. Do NOT show a raw error —
          // the unit is safe and will appear in the list (already invalidated).
          toast({ title: "Unit created", description: "CARFAX/recall check will retry later." });
        }
      }
    } catch (err: any) {
      // Only genuine create/update failures reach here (post-create steps are
      // non-blocking). Never surface a raw JS error string to the user.
      const known = typeof err?.message === "string" && err.message &&
        !/undefined|null|Cannot read|is not a function/i.test(err.message);
      toast({
        title: editingId ? "Couldn't update unit" : "Couldn't create unit",
        description: known ? err.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const decodedField = (label: string, value: string, key: keyof UnitForm) => (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input
        value={value}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        readOnly={fieldsLocked}
        className={fieldsLocked ? "opacity-70" : ""}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Units</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your inventory</p>
        </div>
        {!staffOnly && canEdit && (
          <Button variant="hero" size="sm" onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Add Unit
          </Button>
        )}
      </div>

      {/* Horizontal filter bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search VIN, stock #, make, model…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Stage */}
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="All Stages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {ALL_STATUSES.map((st) => <SelectItem key={st} value={st}>{STAGE_META[st].label}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Make */}
        <Select value={makeFilter} onValueChange={setMakeFilter}>
          <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="All Makes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Makes</SelectItem>
            {makeOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Year range */}
        <div className="flex items-center gap-1.5">
          <Input type="number" inputMode="numeric" placeholder="Min yr" value={minYear} onChange={(e) => setMinYear(e.target.value)} className="w-[5.5rem]" />
          <span className="text-xs text-muted-foreground">–</span>
          <Input type="number" inputMode="numeric" placeholder="Max yr" value={maxYear} onChange={(e) => setMaxYear(e.target.value)} className="w-[5.5rem]" />
        </div>

        {/* Promise after */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start gap-2 font-normal">
              <CalendarIcon className="h-4 w-4" />
              {promiseAfter ? format(promiseAfter, "MMM d, yyyy") : "Promise after"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={promiseAfter} onSelect={setPromiseAfter} initialFocus />
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}

        {hasActiveFilters && (
          <span className="text-xs font-mono text-muted-foreground sm:ml-auto">{shownCount} shown</span>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="active" className="gap-2">
            <Car className="h-3.5 w-3.5" />
            Active
            {units?.length ? <span className="text-xs font-mono text-muted-foreground ml-1">({units.length})</span> : null}
          </TabsTrigger>
          {!staffOnly && canManage && (
            <TabsTrigger value="archived" className="gap-2">
              <Archive className="h-3.5 w-3.5" />
              Archived
              {archivedUnits?.length ? <span className="text-xs font-mono text-muted-foreground ml-1">({archivedUnits.length})</span> : null}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="active">
          <Card className="glass-panel border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader label="Vehicle" column="vehicle" />
                    <SortHeader label="Stock #" column="stock_number" />
                    <SortHeader label="VIN" column="vin" />
                    <SortHeader label="Status" column="status" />
                    <SortHeader label="In Stage" column="stage_age" />
                    <SortHeader label="Promise" column="promise_date" />
                    <SortHeader label="Added" column="created_at" />
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered?.map((u) => (
                    <TableRow
                      key={u.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => staffOnly ? setDrawerUnit(u) : navigate(`/dealer/units/${u.id}`)}
                    >
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-2 flex-wrap">
                          {u.year} {u.make} {u.model}
                          <OpenRecallBadge count={(u as any).open_recall_count} size="xs" />
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.stock_number || "—"}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{u.vin || "—"}</TableCell>
                      <TableCell><span className="status-pill text-xs">{STAGE_META[u.status as keyof typeof STAGE_META]?.label ?? u.status}</span></TableCell>
                      <TableCell>
                        {(() => {
                          const hours = hoursInStage(u.stage_entered_at);
                          const color = agingColor(hours);
                          return (
                            <span className={`text-xs font-semibold tabular-nums ${AGING_COLORS[color]}`}>
                              {formatAgingDuration(hours)}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {(u as any).promise_date ? (
                          <span className={`text-xs tabular-nums ${(u as any).promise_date < new Date().toISOString().slice(0, 10) && u.status !== "ready" && u.status !== "sold" ? "text-red-400 font-semibold" : "text-muted-foreground"}`}>
                            {format(new Date((u as any).promise_date + "T00:00:00"), "MMM d")}
                          </span>
                        ) : <span className="text-muted-foreground/40">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(u.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        {!staffOnly && (
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(u); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filtered?.length && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No units found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {!staffOnly && canManage && (
          <TabsContent value="archived">
            <Card className="glass-panel border-border">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Stock #</TableHead>
                      <TableHead>VIN</TableHead>
                      <TableHead>Last Status</TableHead>
                      <TableHead>Archived</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArchived?.map((u: any) => (
                      <TableRow key={u.id} className="opacity-70 hover:opacity-100 transition-opacity">
                        <TableCell className="font-medium">{u.year} {u.make} {u.model}</TableCell>
                        <TableCell className="text-muted-foreground">{u.stock_number || "—"}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">{u.vin || "—"}</TableCell>
                        <TableCell><span className="status-pill text-xs">{STAGE_META[u.status as keyof typeof STAGE_META]?.label ?? u.status}</span></TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.deleted_at ? format(new Date(u.deleted_at), "MMM d, yyyy") : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-primary hover:text-primary"
                            onClick={(e) => handleRestore(u.id, e)}
                            disabled={restoreUnit.isPending}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restore
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!filteredArchived?.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No archived units</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add / Edit Unit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="glass-panel-strong border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Unit" : "Add Unit"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* VIN Input — Primary */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">VIN</label>
              <div className="relative">
                <Input
                  value={form.vin}
                  onChange={(e) => handleVinChange(e.target.value)}
                  placeholder="Enter 17-character VIN"
                  className="pr-20 font-mono tracking-wider uppercase"
                  maxLength={17}
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {decoding && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {decoded && !decoding && <Check className="h-4 w-4 text-primary" />}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:text-primary"
                    onClick={() => setScanOpen(true)}
                    title="Scan VIN barcode"
                  >
                    <ScanLine className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {form.vin.length > 0 && form.vin.length < 17 && (
                <p className="text-xs text-muted-foreground">{form.vin.length}/17 characters</p>
              )}
              {decodeError && (
                <div className="flex items-center gap-1.5 text-destructive text-xs mt-1">
                  <AlertCircle className="h-3 w-3" />
                  {decodeError}
                </div>
              )}
            </div>

            {/* Decode button (if not auto-decoded) */}
            {form.vin.length === 17 && !decoded && !decoding && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => decodeVin(form.vin)}
                className="w-full"
              >
                Decode VIN
              </Button>
            )}

            {/* Decoded vehicle fields */}
            {decoded && fieldsLocked && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-primary font-medium">✓ VIN decoded</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6"
                  onClick={() => setFieldsLocked(false)}
                >
                  Edit fields
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {decodedField("Year", form.year, "year")}
              {decodedField("Make", form.make, "make")}
              {decodedField("Model", form.model, "model")}
              {decodedField("Trim", form.trim, "trim")}
              {decodedField("Engine", form.engine, "engine")}
              {decodedField("Body", form.body, "body")}
              {decodedField("Drive Type", form.drive_type, "drive_type")}
              {decodedField("Transmission", form.transmission, "transmission")}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Stock #</label>
                <Input value={form.stock_number} onChange={(e) => setForm({ ...form, stock_number: e.target.value })} placeholder="Stock number" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Color</label>
                <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Color" />
              </div>
            </div>

            {/* Status — only for edit mode */}
            {editingId && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{STAGE_META[s]?.label ?? s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Notes</label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" />
            </div>

            {/* Decoded Details expandable */}
            {decodedRaw && Object.keys(decodedRaw).length > 0 && (
              <Collapsible open={rawOpen} onOpenChange={setRawOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-muted-foreground h-8">
                    Decoded Details ({Object.keys(decodedRaw).length} fields)
                    <ChevronDown className={`h-3 w-3 transition-transform ${rawOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 rounded-md border border-border bg-muted/30 p-3 max-h-48 overflow-y-auto space-y-1">
                    <p className="text-[10px] text-muted-foreground mb-2">Source: NHTSA VIN decode</p>
                    {Object.entries(decodedRaw).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-xs gap-2">
                        <span className="text-muted-foreground truncate">{key}</span>
                        <span className="text-foreground text-right truncate max-w-[200px]">{val}</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleSave} disabled={createUnit.isPending || updateUnit.isPending}>
              {editingId ? "Save Changes" : "Create Unit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIN scanner — camera + photo capture (cross-platform incl. iOS) */}
      <VinScanner
        open={scanOpen}
        onOpenChange={setScanOpen}
        onDetected={(vin) => { setScanOpen(false); handleVinChange(vin); }}
      />

      {/* Staff read-only drawer */}
      <StaffUnitDrawer
        unit={drawerUnit}
        open={!!drawerUnit}
        onOpenChange={(open) => { if (!open) setDrawerUnit(null); }}
      />
    </div>
  );
}
