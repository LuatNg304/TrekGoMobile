import { API_BASE_URL } from "@/lib/api-client";
import { readStoredAuth } from "@/features/auth/storage";
import { OpenAPI } from "@/api/generated/core/OpenAPI";
import { ApiError } from "@/api/generated/core/ApiError";
import { Cf01LeaderPublicTripsService } from "@/api/generated/services/Cf01LeaderPublicTripsService";
import { Cf01TripOptionsService } from "@/api/generated/services/Cf01TripOptionsService";
import { PublicBookingDiscoveryService } from "@/api/generated/services/PublicBookingDiscoveryService";
import { SystemTrailsService } from "@/api/generated/services/SystemTrailsService";

// Cấu hình OpenAPI client với base URL và bearer token động
OpenAPI.BASE = API_BASE_URL;
OpenAPI.TOKEN = async () => {
  const auth = await readStoredAuth();
  return auth?.accessToken || "";
};

// ==================== ERROR PARSING ====================

export interface Cf01Issue {
  code: string;
  field: string;
  message: string;
}

export interface Cf01ErrorPayload {
  statusCode?: number;
  code?: string;
  message: string;
  issues?: Cf01Issue[];
}

export function parseCf01Error(error: unknown): Cf01ErrorPayload {
  if (error instanceof ApiError) {
    const body = error.body;
    if (body && typeof body === "object") {
      const message =
        typeof body.message === "string"
          ? body.message
          : Array.isArray(body.message)
            ? body.message.join(", ")
            : error.message || "Đã xảy ra lỗi từ hệ thống.";

      const issues: Cf01Issue[] = Array.isArray(body.issues)
        ? body.issues.map((it: any) => ({
            code: String(it.code || ""),
            field: String(it.field || ""),
            message: String(it.message || ""),
          }))
        : [];

      return {
        statusCode: error.status,
        code: body.code || `HTTP_${error.status}`,
        message,
        issues,
      };
    }
    return {
      statusCode: error.status,
      code: `HTTP_${error.status}`,
      message: error.message || `Lỗi máy chủ (${error.status})`,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  return {
    message: "Đã xảy ra sự cố không xác định. Vui lòng thử lại.",
  };
}

// ==================== TYPES ====================

export type LeaderTripCheckpoint = {
  sourceCheckpointId: string | null;
  name: string;
  description: string | null;
  latitude: string;
  longitude: string;
  radiusMeters: number;
  sequence: number;
  isRequired: boolean;
  isEnabled: boolean;
};

export type LeaderTripTrail = {
  systemTrailId: string;
  sequence: number;
  snapshotName: string;
  snapshotDifficulty: string;
  snapshotGeojson: any;
  snapshotDistanceKm: string | null;
  snapshotElevationGainM: number | null;
  sourceTrailVersion: number | null;
  snapshotCheckpointIds: any;
};

export type LeaderTrip = {
  id: string;
  title: string;
  description: string | null;
  destinationId: string;
  startAt: string;
  endAt: string;
  capacity: number;
  price: string | null;
  pickupPointId: string | null;
  status: "DRAFT" | "OPEN" | "FULL" | "CANCEL_PENDING" | "CANCELLED" | string;
  publishedAt: string | null;
  priceExplanation: string | null;
  tripType: "PUBLIC";
  creatorId: string;
  leaderId: string | null;
  version: number;
  checkpoints: LeaderTripCheckpoint[];
  trails: LeaderTripTrail[];
};

export type CreateLeaderTripInput = {
  destinationId: string;
  title: string;
  description?: string | null;
  priceExplanation?: string | null;
  startAt: string;
  endAt: string;
  pickupPointId: string;
  capacity: number;
  price: string; // Chuỗi số nguyên dương VND
};

export type UpdateLeaderTripInput = {
  expectedVersion: number;
  destinationId?: string;
  title?: string;
  description?: string | null;
  priceExplanation?: string | null;
  startAt?: string;
  endAt?: string;
  pickupPointId?: string;
  capacity?: number;
  price?: string;
};

export type TripOptionDestination = {
  id: string;
  name: string;
};

export type TripOptionPickupPoint = {
  id: string;
  name: string;
};

export type TripOptionCheckpoint = {
  id: string;
  destinationId: string;
  name: string;
  description: string | null;
  latitude: string;
  longitude: string;
  defaultRadiusMeters: number;
  status: string;
};

export type ScheduleConflict = {
  id: string;
  title: string;
  status: string;
  startAt: string;
  endAt: string;
};

export type ScheduleConflictsResponse = {
  hasConflict: boolean;
  conflicts: ScheduleConflict[];
};

export type TrailSuggestion = {
  id: string;
  destinationId: string;
  name: string;
  difficulty: string;
  status: string;
  version: number;
  routeGeojson: any;
  distanceKm: string;
  elevationGainM: number | null;
  checkpointIds: string[];
  canAppend: boolean;
  coveredCheckpointIds: string[];
};

export type TripReadinessResponse = {
  canPublish: boolean;
  issues: Cf01Issue[];
  version: number;
};

// ==================== USER PUBLIC DISCOVERY TYPES ====================

export type PublicTripRoute = {
  id: string;
  snapshotName: string;
  snapshotDifficulty: string;
  snapshotDistanceKm: string;
};

export type PublicTripCheckpoint = {
  id: string;
  name: string;
  isRequired: boolean;
};

export type PublicTripDiscoveryDetail = {
  id: string;
  title: string;
  description: string;
  status: string;
  startAt: string;
  endAt: string;
  destination: { id: string; name: string };
  leader: { id: string; fullName: string; avatarUrl?: string };
  pricePerPax: string;
  currency: string;
  capacity: number;
  remainingSlots: number;
  pickup: { id: string; name: string; address?: string };
  routes: PublicTripRoute[];
  checkpoints: PublicTripCheckpoint[];
  transportAvailable?: boolean;
  transport?: any[];
};

export type PublicTripFilterParams = {
  destinationId?: string;
  dateFrom?: string;
  dateTo?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD" | "EXTREME";
  price?: number;
  page?: number;
  pageSize?: number;
};

// ==================== SERVICE WRAPPER ====================

export const cf01PublicTripApi = {
  // --- NHÓM A: OPTIONS & SCHEDULE CONFLICTS ---
  async getDestinations(page = 1, pageSize = 50): Promise<TripOptionDestination[]> {
    return Cf01TripOptionsService.tripOptionsControllerDestinations(page, pageSize);
  },

  async getPickupPoints(destinationId: string, page = 1, pageSize = 50): Promise<TripOptionPickupPoint[]> {
    return Cf01TripOptionsService.tripOptionsControllerPickups(destinationId, page, pageSize);
  },

  async getCheckpoints(destinationId: string, page = 1, pageSize = 50): Promise<TripOptionCheckpoint[]> {
    return Cf01TripOptionsService.tripOptionsControllerCheckpoints(destinationId, page, pageSize);
  },

  async getSystemTrail(trailId: string) {
    return Cf01TripOptionsService.tripOptionsControllerTrail(trailId);
  },

  async checkConflicts(
    startAt: string,
    endAt: string,
    excludeTripId?: string,
  ): Promise<ScheduleConflictsResponse> {
    return Cf01TripOptionsService.tripOptionsControllerConflicts(endAt, startAt, excludeTripId);
  },

  // --- NHÓM B: LEADER PUBLIC TRIPS CRUD & PUBLISH ---
  async createLeaderTrip(input: CreateLeaderTripInput): Promise<LeaderTrip> {
    return Cf01LeaderPublicTripsService.leaderPublicTripControllerCreate(input as any);
  },

  async getLeaderTrips(page = 1, pageSize = 50): Promise<LeaderTrip[]> {
    return Cf01LeaderPublicTripsService.leaderPublicTripControllerList(page, pageSize);
  },

  async getLeaderTripDetail(id: string): Promise<LeaderTrip> {
    return Cf01LeaderPublicTripsService.leaderPublicTripControllerDetail(id);
  },

  async updateLeaderTrip(id: string, input: UpdateLeaderTripInput): Promise<LeaderTrip> {
    return Cf01LeaderPublicTripsService.leaderPublicTripControllerUpdate(id, input as any);
  },

  async setTripCheckpoints(id: string, expectedVersion: number, checkpointIds: string[]): Promise<LeaderTrip> {
    return Cf01LeaderPublicTripsService.leaderPublicTripControllerCheckpoints(id, {
      expectedVersion,
      checkpointIds,
    });
  },

  async getTrailSuggestions(id: string, page = 1, pageSize = 50): Promise<TrailSuggestion[]> {
    return Cf01LeaderPublicTripsService.leaderPublicTripControllerSuggestions(id, page, pageSize);
  },

  async setTripTrails(id: string, expectedVersion: number, trailIds: string[]): Promise<LeaderTrip> {
    return Cf01LeaderPublicTripsService.leaderPublicTripControllerTrails(id, {
      expectedVersion,
      trailIds,
    });
  },

  async getTripReadiness(id: string): Promise<TripReadinessResponse> {
    return Cf01LeaderPublicTripsService.leaderPublicTripControllerReadiness(id);
  },

  async publishTrip(id: string, expectedVersion: number): Promise<LeaderTrip> {
    return Cf01LeaderPublicTripsService.leaderPublicTripControllerPublish(id, {
      expectedVersion,
    });
  },

  async cancelTrip(
    id: string,
    expectedVersion: number,
    reason: string,
    evidenceUrls: string[] = [],
  ): Promise<LeaderTrip> {
    return Cf01LeaderPublicTripsService.leaderPublicTripControllerCancel(id, {
      expectedVersion,
      reason,
      evidenceUrls,
    });
  },

  // --- NHÓM C: PUBLIC USER DISCOVERY & 3D MAP ---
  async getPublicTrips(params: PublicTripFilterParams = {}) {
    return PublicBookingDiscoveryService.bookingDiscoveryControllerList(
      params.price,
      params.difficulty,
      params.dateTo,
      params.dateFrom,
      params.destinationId,
      params.pageSize ?? 20,
      params.page ?? 1,
    );
  },

  async getPublicTripDetail(id: string): Promise<PublicTripDiscoveryDetail> {
    return PublicBookingDiscoveryService.bookingDiscoveryControllerDetail(id);
  },

  async getSystemTrailsForDestination(destinationId: string) {
    return SystemTrailsService.systemTrailControllerGetTrails(
      undefined,
      undefined,
      "ACTIVE",
      undefined,
      undefined,
      destinationId,
      50,
      1,
    );
  },

  async getSystemTrailDetailByCodeOrId(idOrCode: string) {
    return SystemTrailsService.systemTrailControllerGetTrailDetail(idOrCode);
  },
};
