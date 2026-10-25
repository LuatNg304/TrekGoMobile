import { apiRequest } from "@/lib/api-client";

// ─── Public Trip Types ────────────────────────────────────────────────────────

export type PublicTripStatus = "DRAFT" | "OPEN" | "FULL" | "CLOSED";

export interface PublicTripDestination {
  id: string;
  name: string;
}

export interface PublicTripLeader {
  id: string;
  fullName: string;
}

export interface PublicTripPickup {
  name: string;
  address?: string;
}

export interface PublicTripRoute {
  snapshotName: string;
  snapshotDifficulty: string;
  snapshotDistanceKm: string;
}

export interface PublicTripCheckpoint {
  name: string;
  isRequired: boolean;
}

export interface PublicTrip {
  id: string;
  title: string;
  description?: string | null;
  status: PublicTripStatus;
  startAt: string;
  endAt: string;
  destination: PublicTripDestination;
  leader: PublicTripLeader;
  pricePerPax: string;
  currency: string;
  capacity: number;
  remainingSlots: number;
  pickup: PublicTripPickup;
  routes: PublicTripRoute[];
  checkpoints: PublicTripCheckpoint[];
  version?: number;
}

export interface PublicTripsListResponse {
  items: PublicTrip[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PublicTripsFilter {
  page?: number;
  pageSize?: number;
  destinationId?: string;
  difficulty?: string;
  dateFrom?: string;
  dateTo?: string;
  price?: number;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/** GET /api/v1/public-trips — Explore feed (public, no auth required) */
export async function getPublicTrips(
  filter: PublicTripsFilter = {},
): Promise<PublicTripsListResponse> {
  const params = new URLSearchParams();
  const targetPageSize = Math.min(filter.pageSize || 50, 50);
  const targetPage = filter.page ?? 1;
  params.set("page", String(targetPage));
  params.set("pageSize", String(targetPageSize));
  if (filter.destinationId) params.set("destinationId", filter.destinationId);
  if (filter.difficulty) params.set("difficulty", filter.difficulty);
  if (filter.dateFrom) params.set("dateFrom", filter.dateFrom);
  if (filter.dateTo) params.set("dateTo", filter.dateTo);
  if (filter.price !== undefined) params.set("price", String(filter.price));

  const query = params.toString();
  const firstRes = await apiRequest<PublicTripsListResponse>(
    `/api/v1/trips${query ? `?${query}` : ""}`,
  );

  // Lấy hết tất cả nếu còn các trang tiếp theo
  if (firstRes.total > (firstRes.items?.length ?? 0)) {
    let allItems = [...(firstRes.items ?? [])];
    const totalPages = Math.ceil(firstRes.total / targetPageSize);
    for (let p = targetPage + 1; p <= totalPages; p++) {
      params.set("page", String(p));
      const nextRes = await apiRequest<PublicTripsListResponse>(
        `/api/v1/trips?${params.toString()}`,
      );
      if (nextRes.items && nextRes.items.length > 0) {
        allItems = allItems.concat(nextRes.items);
      }
    }
    return {
      ...firstRes,
      items: allItems,
      pageSize: allItems.length,
    };
  }

  return firstRes;
}

/** GET /api/v1/public-trips/:id — Trip detail for user (no internal priceExplanation) */
export async function getPublicTripById(id: string): Promise<PublicTrip> {
  return apiRequest<PublicTrip>(`/api/v1/trips/${id}`);
}
