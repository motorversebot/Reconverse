import { useQuery } from "@tanstack/react-query";
import { apiFetch, getMe, getActiveDealerId, setActiveDealerId } from "@/lib/api";

/**
 * Current dealer membership for the signed-in user.
 *
 * MC's /api/v1/reconverse/me/membership endpoint isn't implemented yet, so we
 * derive membership from /api/v1/auth/me (which DOES authenticate the user).
 * MC's global auth user doesn't currently carry tenant-scoped dealer_id/role,
 * so we fall back to safe defaults (dealer_id "1", role "owner") when those
 * fields aren't populated.
 *
 * Without this fallback, DealerGuard throws, redirects to /, Index redirects
 * back to /dealer, and the page hammers /auth/me in a render loop until MC
 * exposes the proper membership endpoint.
 *
 * TODO(MC): replace this with a real /api/v1/reconverse/me/membership call
 * once MC implements the endpoint.
 */
/**
 * Normalize whatever role MC returns into the frontend DealerRole vocabulary
 * (dealer_owner | dealer_admin | manager | staff) used by lib/permissions.
 *
 * MC's /auth/me returns a *global* auth role (admin | counterman | driver | …),
 * not the tenant-scoped reconverse role (owner | manager | tech | …), and the
 * two vocabularies don't line up. Mapping them here means the recon-lane nav,
 * Add Unit, Users and Settings gates work instead of silently hiding.
 *
 * Until MC exposes a granular per-dealer role, unknown/auth roles default to
 * owner-level access (one login per dealer today) so dealers aren't locked out.
 * TODO(MC): use the real reconverse role from /reconverse/me/membership.
 */
function normalizeDealerRole(raw?: string | null): string {
  switch ((raw || "").toLowerCase()) {
    case "dealer_admin": return "dealer_admin";
    case "manager": return "manager";
    case "staff":
    case "viewer": return "staff";
    case "owner":
    case "dealer_owner":
    case "admin":
    default: return "dealer_owner";
  }
}

export interface DealerMembership {
  dealer_id: string;
  dealer_name: string;
  role: string;
  is_active: boolean;
}

export interface CurrentDealer {
  dealer_id: string;
  dealer_name: string;
  role: string;          // DealerRole vocab
  is_active: boolean;
  user_id?: string;      // reconverse user id (for self-checks)
  is_platform_admin?: boolean;
  tier?: string;
  memberships?: DealerMembership[];     // all dealers this user belongs to
  active_dealer_id?: string | null;
  needs_dealer_assignment?: boolean;    // has Reconverse access but no dealer
}

export function useCurrentDealer() {
  return useQuery<CurrentDealer>({
    queryKey: ["current-dealer"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes — don't refetch on every mount
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // Preferred: real per-dealer membership from MC.
      try {
        const res = await apiFetch("/api/v1/reconverse/me/membership");
        const j = await res.json().catch(() => null);
        if (res.ok && j?.ok && j.data) {
          const m = j.data;
          const memberships: DealerMembership[] = Array.isArray(m.memberships)
            ? m.memberships.map((x: any) => ({
                dealer_id: String(x.dealer_id),
                dealer_name: x.dealer_name ?? "",
                role: x.role ?? "",
                is_active: !!x.is_active,
              }))
            : [];
          // Persist the active dealer so apiFetch sends X-Dealer-Id. Honor a
          // previously chosen dealer if it's still a valid membership.
          const stored = getActiveDealerId();
          const validStored = stored && memberships.some((mm) => mm.dealer_id === stored) ? stored : null;
          const resolvedActive = validStored
            ?? (m.active_dealer_id != null ? String(m.active_dealer_id) : null)
            ?? (m.dealer?.id != null ? String(m.dealer.id) : null)
            ?? (memberships[0]?.dealer_id ?? null);
          if (resolvedActive) setActiveDealerId(resolvedActive);
          const activeMembership = memberships.find((mm) => mm.dealer_id === resolvedActive);
          return {
            dealer_id: resolvedActive ?? String(m.dealer?.id ?? "1"),
            dealer_name: activeMembership?.dealer_name ?? m.dealer?.name ?? "",
            role: activeMembership?.role ?? m.dealer_role ?? normalizeDealerRole(m.role),
            is_active: true,
            user_id: m.reconverse_user_id != null ? String(m.reconverse_user_id) : undefined,
            is_platform_admin: !!m.is_platform_admin,
            tier: m.tier,
            memberships,
            active_dealer_id: resolvedActive,
            needs_dealer_assignment: !!m.needs_dealer_assignment,
          };
        }
      } catch {
        // fall through to /auth/me derivation
      }
      // Fallback (endpoint not live yet): derive from /auth/me so the app
      // never hard-fails into a redirect loop.
      const user = await getMe();
      if (!user) throw new Error("not_authenticated");
      return {
        dealer_id: user.dealer_id ?? "1",
        dealer_name: "",
        role: normalizeDealerRole(user.role),
        is_active: true,
      };
    },
  });
}

const MOCK_UNITS_KEY = (dealerId: string) => `rv_mock_units_${dealerId}`;

const DEFAULT_MOCK_UNITS = [
  {
    id: "unit-1",
    year: 2021,
    make: "Tesla",
    model: "Model 3",
    trim: "Standard Range Plus",
    color: "White",
    vin: "5YJ3E1EA5MF823199",
    stock_number: "T3942",
    status: "inspection",
    stage_entered_at: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    dealer_id: "1",
    promise_date: null,
    notes: "Needs initial multi-point inspection and battery health check.",
    is_deleted: false,
  },
  {
    id: "unit-2",
    year: 2020,
    make: "Ford",
    model: "F-150",
    trim: "Lariat",
    color: "Black",
    vin: "1FTFW1E84LF543201",
    stock_number: "F2019",
    status: "estimate",
    stage_entered_at: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    dealer_id: "1",
    promise_date: null,
    notes: "Body damage estimate pending. Left front fender scratched.",
    is_deleted: false,
  },
  {
    id: "unit-3",
    year: 2022,
    make: "Porsche",
    model: "911",
    trim: "Carrera S",
    color: "Crayon",
    vin: "WP0AB2A92NS381204",
    stock_number: "P0911",
    status: "approval",
    stage_entered_at: new Date(Date.now() - 3.5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    dealer_id: "1",
    promise_date: null,
    notes: "Estimate submitted for brake pad replacement ($1,250). Pending manager approval.",
    is_deleted: false,
  },
  {
    id: "unit-4",
    year: 2019,
    make: "Jeep",
    model: "Wrangler",
    trim: "Unlimited Sahara",
    color: "Sting-Gray",
    vin: "1C4HJXEG1KW102488",
    stock_number: "J1920",
    status: "repair",
    stage_entered_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    dealer_id: "1",
    promise_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: "Suspension components replacement ongoing. Waiting for shock absorbers delivery.",
    is_deleted: false,
  },
  {
    id: "unit-5",
    year: 2023,
    make: "BMW",
    model: "3-Series",
    trim: "330i M Sport",
    color: "Portimao Blue",
    vin: "WBA5R1C09PF490212",
    stock_number: "B2023",
    status: "qc",
    stage_entered_at: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    dealer_id: "1",
    promise_date: null,
    notes: "Post-repair quality control check. alignment verified, test drive done.",
    is_deleted: false,
  },
  {
    id: "unit-6",
    year: 2021,
    make: "Toyota",
    model: "RAV4",
    trim: "XLE",
    color: "Silver",
    vin: "JTMDFRFV5MD920155",
    stock_number: "T2021",
    status: "ready",
    stage_entered_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    dealer_id: "1",
    promise_date: null,
    notes: "Detailing done, photoshoot complete. Placed on front lot.",
    is_deleted: false,
  },
  {
    id: "unit-7",
    year: 2022,
    make: "Chevrolet",
    model: "Corvette",
    trim: "Stingray 3LT",
    color: "Red",
    vin: "1G1YB2D46N5048290",
    stock_number: "C2022",
    status: "ready",
    stage_entered_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    dealer_id: "1",
    promise_date: null,
    notes: "Ready for sale, listed online.",
    is_deleted: false,
  },
  {
    id: "unit-8",
    year: 2020,
    make: "Audi",
    model: "Q7",
    trim: "55 TFSI Prestige",
    color: "Gray",
    vin: "WA1VAAF75LD831022",
    stock_number: "A7041",
    status: "sold",
    stage_entered_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    dealer_id: "1",
    promise_date: null,
    notes: "Sold and delivered to customer.",
    is_deleted: false,
  },
  {
    id: "unit-9",
    year: 2023,
    make: "Mercedes-Benz",
    model: "E-Class",
    trim: "E350",
    color: "Obsidian Black",
    vin: "WDDZH8EB1PF391033",
    stock_number: "M2350",
    status: "inspection",
    stage_entered_at: new Date(Date.now() - 0.2 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 0.2 * 24 * 60 * 60 * 1000).toISOString(),
    dealer_id: "1",
    promise_date: null,
    notes: "Recently received. Key check-in complete.",
    is_deleted: false,
  },
  {
    id: "unit-10",
    year: 2021,
    make: "Honda",
    model: "Civic",
    trim: "Type R",
    color: "Boost Blue",
    vin: "SHHFC1F78MU290151",
    stock_number: "H8291",
    status: "estimate",
    stage_entered_at: new Date(Date.now() - 0.8 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    dealer_id: "1",
    promise_date: null,
    notes: "Tire alignment estimate pending.",
    is_deleted: false,
  },
  {
    id: "unit-11",
    year: 2022,
    make: "Ram",
    model: "1500",
    trim: "Limited",
    color: "Granite Crystal",
    vin: "1C6RREHTXNN391081",
    stock_number: "R1500",
    status: "approval",
    stage_entered_at: new Date(Date.now() - 1.2 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    dealer_id: "1",
    promise_date: null,
    notes: "Brake service estimate submitted. Awaiting manager sign-off.",
    is_deleted: false,
  },
  {
    id: "unit-12",
    year: 2020,
    make: "Subaru",
    model: "Outback",
    trim: "Limited",
    color: "Autumn Green",
    vin: "4S4WMCD67L3928180",
    stock_number: "S9281",
    status: "repair",
    stage_entered_at: new Date(Date.now() - 4.5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    dealer_id: "1",
    promise_date: null,
    notes: "A/C compressor replacement. Blocker: Parts (waiting for OEM compressor).",
    is_deleted: false,
  }
];

export function getLocalMockUnits(dealerId: string): any[] {
  if (typeof window === "undefined") return [];
  const key = MOCK_UNITS_KEY(dealerId);
  const data = localStorage.getItem(key);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // ignore
    }
  }
  const initial = DEFAULT_MOCK_UNITS.map(u => ({ ...u, dealer_id: dealerId }));
  localStorage.setItem(key, JSON.stringify(initial));
  return initial;
}

export function saveLocalMockUnits(dealerId: string, units: any[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MOCK_UNITS_KEY(dealerId), JSON.stringify(units));
}

// ── Real units (token-scoped → dealer-isolated by MC) ───────────────────────
// MC's /reconverse/units returns the signed-in user's dealer rows only, with
// status ∈ active|hold|sold|archived and a joined stage_slug. The frontend
// models status AS the stage (inspection|estimate|…), so we map it here.
const MC_STAGE_TO_STATUS: Record<string, string> = {
  intake: "inspection", mpi: "inspection", estimate: "estimate",
  approval: "approval", repair: "repair", qc: "qc", ready: "ready", sold: "sold",
};

function mapMcUnit(u: Record<string, unknown>) {
  const mcStatus = String(u.status ?? "active");
  const archived = mcStatus === "archived";
  const status = mcStatus === "sold"
    ? "sold"
    : (MC_STAGE_TO_STATUS[String(u.stage_slug ?? "")] ?? "inspection");
  return {
    id: String(u.id),
    year: (u.year as number) ?? null,
    make: (u.make as string) ?? null,
    model: (u.model as string) ?? null,
    trim: (u.trim as string) ?? null,
    engine: (u.engine as string) ?? (u.engine_description as string) ?? null,
    mileage: (u.mileage as number) ?? (u.odometer as number) ?? null,
    color: (u.exterior_color as string) ?? (u.color as string) ?? null,
    vin: (u.vin as string) ?? null,
    stock_number: (u.stock_number as string) ?? null,
    status,
    current_stage_id: (u.current_stage_id as number) ?? null,
    stage_entered_at: (u.stage_entered_at as string) ?? (u.created_at as string),
    created_at: u.created_at as string,
    updated_at: (u.updated_at as string) ?? (u.created_at as string),
    dealer_id: String(u.dealer_id),
    promise_date: (u.promise_date as string) ?? null,
    notes: (u.notes as string) ?? null,
    assigned_technician: (u.assigned_to_name as string) ?? (u.technician_name as string) ?? null,
    repair_order_number: (u.repair_order_number as string) ?? (u.ro_number as string) ?? null,
    tag_number: (u.tag_number as string) ?? null,
    // Automatic CARFAX + recall check results (for badges + cards).
    carfax_status: (u.carfax_status as string) ?? null,
    carfax_report_url: (u.carfax_report_url as string) ?? null,
    carfax_last_checked_at: (u.carfax_last_checked_at as string) ?? null,
    recall_status: (u.recall_status as string) ?? null,
    open_recall_count: Number(u.open_recall_count ?? 0),
    has_open_recalls: !!u.has_open_recalls,
    open_recall_summary: (u.open_recall_summary as string) ?? null,
    open_recall_last_checked_at: (u.open_recall_last_checked_at as string) ?? null,
    is_deleted: archived,
  };
}

/** Fetch this dealer's real units. Server scopes to the caller's dealer. */
export async function fetchDealerUnits(): Promise<ReturnType<typeof mapMcUnit>[]> {
  const res = await apiFetch(`/api/v1/reconverse/units?status=all&limit=200`);
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.ok || !Array.isArray(j.data)) return [];
  return (j.data as Record<string, unknown>[]).map(mapMcUnit);
}

export function useDealerDashboardStats(dealerId?: string) {
  return useQuery({
    queryKey: ["dealer-dashboard-stats", dealerId],
    queryFn: async () => {
      try {
        const res = await apiFetch(`/api/v1/reconverse/dealers/${dealerId}/stats`);
        const j = await res.json().catch(() => null);
        if (res.ok && j?.ok) return j.data;
      } catch (e) {
        console.warn("stats API failed, returning mock", e);
      }
      return {
        activeCount: 11,
        completedCount: 24,
        avgDays: 4.2
      };
    },
    enabled: !!dealerId,
  });
}

export function useDealerRecentUnits(dealerId?: string) {
  return useQuery({
    queryKey: ["dealer-recent-units", dealerId],
    queryFn: async () => {
      const all = await fetchDealerUnits();
      return all
        .filter((u) => !u.is_deleted)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 10);
    },
    enabled: !!dealerId,
  });
}

export function useDealerUnits(dealerId?: string) {
  return useQuery({
    queryKey: ["dealer-units", dealerId],
    queryFn: async () => {
      if (!dealerId) return [];
      const all = await fetchDealerUnits();
      return all.filter((u) => !u.is_deleted);
    },
    enabled: !!dealerId,
  });
}
// (multi-dealer: memberships[] + active_dealer_id consumed from /me/membership)

export function useDealerArchivedUnits(dealerId?: string) {
  return useQuery({
    queryKey: ["dealer-archived-units", dealerId],
    queryFn: async () => {
      if (!dealerId) return [];
      const all = await fetchDealerUnits();
      return all.filter((u) => u.is_deleted);
    },
    enabled: !!dealerId,
  });
}

export function useDealerMembers(dealerId?: string) {
  return useQuery({
    queryKey: ["dealer-members", dealerId],
    queryFn: async () => {
      // Token-scoped on the server; dealerId only gates the query being enabled.
      const res = await apiFetch(`/api/v1/reconverse/dealer-users`);
      // Endpoint not live yet (pre-restart) → show an empty list, not an error.
      if (res.status === 404) return [];
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed to load users");
      // Map MC's flat shape → the table's expected shape.
      return (j.data as any[]).map((u) => ({
        user_id: String(u.id),
        auth_user_id: u.auth_user_id ?? null,
        role: u.role,                     // already DealerRole vocab
        is_active: u.is_active,
        created_at: u.created_at,
        profiles: { full_name: u.name, email: u.email },
      }));
    },
    enabled: !!dealerId,
  });
}

