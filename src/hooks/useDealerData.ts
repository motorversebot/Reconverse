import { useQuery } from "@tanstack/react-query";
import { apiFetch, getMe } from "@/lib/api";

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
export function useCurrentDealer() {
  return useQuery({
    queryKey: ["current-dealer"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes — don't refetch on every mount
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const user = await getMe();
      if (!user) throw new Error("not_authenticated");
      return {
        dealer_id: user.dealer_id ?? "1",
        dealer_name: "",
        role: user.role ?? "dealer_owner",
        is_active: true,
      } as { dealer_id: string; dealer_name: string; role: string; is_active: boolean };
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
      try {
        const res = await apiFetch(`/api/v1/reconverse/dealers/${dealerId}/units?recent=true&limit=10`);
        const j = await res.json().catch(() => null);
        if (res.ok && j?.ok) return j.data.units as any[];
      } catch (e) {
        console.warn("recent units API failed, returning mock", e);
      }
      return getLocalMockUnits(dealerId || "1").slice(0, 10);
    },
    enabled: !!dealerId,
  });
}

export function useDealerUnits(dealerId?: string) {
  return useQuery({
    queryKey: ["dealer-units", dealerId],
    queryFn: async () => {
      if (!dealerId) return [];
      try {
        const res = await apiFetch(`/api/v1/reconverse/dealers/${dealerId}/units`);
        const j = await res.json().catch(() => null);
        if (res.ok && j?.ok) return j.data.units as any[];
      } catch (err) {
        console.warn("apiFetch failed for dealer units, using mock fallback", err);
      }
      return getLocalMockUnits(dealerId).filter(u => !u.is_deleted);
    },
    enabled: !!dealerId,
  });
}

export function useDealerArchivedUnits(dealerId?: string) {
  return useQuery({
    queryKey: ["dealer-archived-units", dealerId],
    queryFn: async () => {
      if (!dealerId) return [];
      try {
        const res = await apiFetch(`/api/v1/reconverse/dealers/${dealerId}/units?archived=true`);
        const j = await res.json().catch(() => null);
        if (res.ok && j?.ok) return j.data.units as any[];
      } catch (err) {
        console.warn("apiFetch failed for archived units, using mock fallback", err);
      }
      return getLocalMockUnits(dealerId).filter(u => u.is_deleted);
    },
    enabled: !!dealerId,
  });
}

export function useDealerMembers(dealerId?: string) {
  return useQuery({
    queryKey: ["dealer-members", dealerId],
    queryFn: async () => {
      if (!dealerId) return [];
      try {
        const res = await apiFetch(`/api/v1/reconverse/dealers/${dealerId}/members`);
        const j = await res.json().catch(() => null);
        if (res.ok && j?.ok) return j.data.members as any[];
      } catch (err) {
        console.warn("apiFetch failed for members, using mock fallback", err);
      }
      return [
        { id: "mem-1", full_name: "Owner User", email: "owner@reconverse.app", role: "owner", is_active: true },
        { id: "mem-2", full_name: "Dealer Owner", email: "motorverseauto@gmail.com", role: "dealer_owner", is_active: true },
        { id: "mem-3", full_name: "Admin User", email: "admin@reconverse.app", role: "dealer_admin", is_active: true },
        { id: "mem-4", full_name: "Tech User", email: "tech@reconverse.app", role: "technician", is_active: true },
      ];
    },
    enabled: !!dealerId,
  });
}

