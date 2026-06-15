import type { UnitStatus } from "@/lib/pipeline";
import UnitIntakeCard from "@/components/dealer/UnitIntakeCard";
import UnitNotesCard from "@/components/dealer/UnitNotesCard";
import UnitActivityCard from "@/components/dealer/UnitActivityCard";
import UnitPhotos from "@/components/dealer/UnitPhotos";
import InspectionChecklist from "@/components/dealer/InspectionChecklist";
import PlaceholderSection from "@/components/dealer/PlaceholderSection";

interface Unit {
  id: string;
  dealer_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vin?: string | null;
  stock_number?: string | null;
  year?: number | string | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  color?: string | null;
  engine?: string | null;
  body?: string | null;
  drive_type?: string | null;
  transmission?: string | null;
}

interface Props {
  unit: Unit;
  status: UnitStatus;
}

/**
 * Renders the vertically-stacked content sections
 * relevant to the unit's current pipeline stage.
 */
export default function StageContent({ unit, status }: Props) {
  switch (status) {
    case "inspection":
      return (
        <div className="space-y-6">
          <UnitIntakeCard unit={unit} />
          <InspectionChecklist unitId={unit.id} dealerId={unit.dealer_id} />
          <UnitPhotos unitId={unit.id} dealerId={unit.dealer_id} />
          <UnitNotesCard notes={unit.notes} />
        </div>
      );

    case "estimate":
      return (
        <div className="space-y-6">
          <UnitIntakeCard unit={unit} />
          <PlaceholderSection
            title="Repair Estimate"
            description="Repair estimates and cost breakdowns will appear here."
          />
          <UnitNotesCard notes={unit.notes} />
        </div>
      );

    case "approval":
      return (
        <div className="space-y-6">
          <UnitIntakeCard unit={unit} />
          <PlaceholderSection
            title="Approval"
            description="Pending approvals and sign-offs will appear here."
          />
          <UnitNotesCard notes={unit.notes} />
        </div>
      );

    case "repair":
      return (
        <div className="space-y-6">
          <PlaceholderSection
            title="Work Orders"
            description="Repair work orders and technician assignments will appear here."
          />
          <PlaceholderSection
            title="Parts"
            description="Parts orders, tracking, and inventory will appear here."
          />
          <UnitPhotos unitId={unit.id} dealerId={unit.dealer_id} />
          <UnitNotesCard notes={unit.notes} />
        </div>
      );

    case "qc":
      return (
        <div className="space-y-6">
          <InspectionChecklist unitId={unit.id} dealerId={unit.dealer_id} />
          <UnitPhotos unitId={unit.id} dealerId={unit.dealer_id} />
          <UnitNotesCard notes={unit.notes} />
        </div>
      );

    case "ready":
    case "sold":
      return (
        <div className="space-y-6">
          <UnitIntakeCard unit={unit} />
          <UnitPhotos unitId={unit.id} dealerId={unit.dealer_id} />
          <UnitNotesCard notes={unit.notes} />
          <UnitActivityCard createdAt={unit.created_at} updatedAt={unit.updated_at} />
        </div>
      );

    default:
      return (
        <div className="space-y-6">
          <UnitIntakeCard unit={unit} />
          <UnitNotesCard notes={unit.notes} />
        </div>
      );
  }
}
