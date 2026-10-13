import { apiRequest } from "@/lib/api-client";

// ─── Leader Public Trip Types ─────────────────────────────────────────────────

export interface TripOptionDestination {
  id: string;
  name: string;
}

export interface TripOptionPickupPoint {
  id: string;
  name: string;
}

export interface TripOptionCheckpoint {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
}

export interface ScheduleConflictResponse {
  hasConflict: boolean;
  conflicts: {
    id: string;
    title: string;
    startAt: string;
    endAt: string;
  }[];
}

export interface LeaderTrailSuggestion {
  id: string;
  name: string;
  difficulty: string;
  distanceKm: string;
  canAppend: boolean;
  coveredCheckpointIds: string[];
}

export interface SystemTrailDetail {
  id: string;
  code: string;
  name: string;
  distanceKm: number;
  elevationGainM: number;
  destination: {
    name: string;
    centerLat: number;
    centerLng: number;
  };
  routeGeojson: {
    type: "FeatureCollection";
    features: {
      type: "Feature";
      geometry: {
        type: "LineString";
        coordinates: number[][];
      };
    }[];
  };
  checkpoints: {
    id: string;
    name: string;
    sequence: number;
    latitude: number;
    longitude: number;
  }[];
  initialCamera: {
    center: [number, number];
    zoom: number;
    pitch: number;
    bearing: number;
  };
}

export type LeaderTripStatus = "DRAFT" | "OPEN" | "FULL" | "CLOSED";

export interface LeaderPublicTrip {
  id: string;
  title: string;
  description?: string;
  status: LeaderTripStatus;
  startAt: string;
  endAt: string;
  capacity: number;
  remainingSlots?: number;
  pricePerPax: string;
  currency: string;
  version: number;
  publishedAt?: string;
  destination?: { id: string; name: string };
  pickupPoint?: { id: string; name: string };
}

export interface CreatePublicTripInput {
  destinationId: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  pickupPointId: string;
  capacity: number;
  price: string;
}

export interface SetCheckpointsInput {
  expectedVersion: number;
  checkpointIds: string[];
}

export interface SetTrailsInput {
  expectedVersion: number;
  trailIds: string[];
}

export interface PublishTripInput {
  expectedVersion: number;
}

export interface ReadinessIssue {
  code?: string;
  message?: string;
  reason?: string;
  field?: string;
  details?: unknown;
}

export interface ReadinessCheckResponse {
  canPublish: boolean;
  issues: (string | ReadinessIssue)[];
  version: number;
}

export interface LeaderTripsListResponse {
  items: LeaderPublicTrip[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── [NHÓM A] Data Fetching for Leader ───────────────────────────────────────

/** GET /api/v1/leader/trip-options/destinations */
export async function getDestinations(
  accessToken: string,
): Promise<TripOptionDestination[]> {
  return apiRequest<TripOptionDestination[]>(
    "/api/v1/leader/trip-options/destinations?page=1&pageSize=100",
    { accessToken },
  );
}

/** GET /api/v1/leader/trip-options/pickup-points?destinationId={id} */
export async function getPickupPoints(
  destinationId: string,
  accessToken: string,
): Promise<TripOptionPickupPoint[]> {
  return apiRequest<TripOptionPickupPoint[]>(
    `/api/v1/leader/trip-options/pickup-points?destinationId=${destinationId}`,
    { accessToken },
  );
}

/** GET /api/v1/leader/trip-options/checkpoints?destinationId={id} */
export async function getCheckpointOptions(
  destinationId: string,
  accessToken: string,
): Promise<TripOptionCheckpoint[]> {
  return apiRequest<TripOptionCheckpoint[]>(
    `/api/v1/leader/trip-options/checkpoints?destinationId=${destinationId}`,
    { accessToken },
  );
}

/** GET /api/v1/leaders/me/schedule-conflicts?startAt=&endAt= */
export async function checkScheduleConflict(
  startAt: string,
  endAt: string,
  accessToken: string,
): Promise<ScheduleConflictResponse> {
  return apiRequest<ScheduleConflictResponse>(
    `/api/v1/leaders/me/schedule-conflicts?startAt=${encodeURIComponent(startAt)}&endAt=${encodeURIComponent(endAt)}`,
    { accessToken },
  );
}

// ─── [NHÓM B] Leader Create & Publish Flow ───────────────────────────────────

/** POST /api/v1/leader/public-trips — Create DRAFT trip */
export async function createPublicTrip(
  input: CreatePublicTripInput,
  accessToken: string,
): Promise<LeaderPublicTrip> {
  return apiRequest<LeaderPublicTrip>("/api/v1/leader/public-trips", {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

/** PUT /api/v1/leader/public-trips/:id/checkpoints */
export async function setTripCheckpoints(
  tripId: string,
  input: SetCheckpointsInput,
  accessToken: string,
): Promise<LeaderPublicTrip> {
  return apiRequest<LeaderPublicTrip>(
    `/api/v1/leader/public-trips/${tripId}/checkpoints`,
    {
      method: "PUT",
      accessToken,
      body: JSON.stringify(input),
    },
  );
}

/** GET /api/v1/leader/public-trips/:id/trail-suggestions */
export async function getTrailSuggestions(
  tripId: string,
  accessToken: string,
  page = 1,
  pageSize = 20,
): Promise<LeaderTrailSuggestion[]> {
  return apiRequest<LeaderTrailSuggestion[]>(
    `/api/v1/leader/public-trips/${tripId}/trail-suggestions?page=${page}&pageSize=${pageSize}`,
    { accessToken },
  );
}

/** PUT /api/v1/leader/public-trips/:id/trails */
export async function setTripTrails(
  tripId: string,
  input: SetTrailsInput,
  accessToken: string,
): Promise<LeaderPublicTrip> {
  return apiRequest<LeaderPublicTrip>(
    `/api/v1/leader/public-trips/${tripId}/trails`,
    {
      method: "PUT",
      accessToken,
      body: JSON.stringify(input),
    },
  );
}

/** GET /api/v1/leader/public-trips/:id/readiness */
export async function getTripReadiness(
  tripId: string,
  accessToken: string,
): Promise<ReadinessCheckResponse> {
  return apiRequest<ReadinessCheckResponse>(
    `/api/v1/leader/public-trips/${tripId}/readiness`,
    { accessToken },
  );
}

/** POST /api/v1/leader/public-trips/:id/publish */
export async function publishTrip(
  tripId: string,
  input: PublishTripInput,
  accessToken: string,
): Promise<LeaderPublicTrip> {
  return apiRequest<LeaderPublicTrip>(
    `/api/v1/leader/public-trips/${tripId}/publish`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    },
  );
}

/** GET /api/v1/leader/public-trips */
export async function getLeaderTrips(
  accessToken: string,
  page = 1,
  pageSize = 20,
): Promise<LeaderTripsListResponse> {
  return apiRequest<LeaderTripsListResponse>(
    `/api/v1/leader/public-trips?page=${page}&pageSize=${pageSize}`,
    { accessToken },
  );
}

/** GET /api/v1/system-trails/:trailCode */
export async function getSystemTrailDetail(
  trailCode: string,
): Promise<SystemTrailDetail> {
  return apiRequest<SystemTrailDetail>(`/api/v1/system-trails/${trailCode}`);
}

/** GET /api/v1/leader/trip-options/system-trails/:id */
export async function getSystemTrailById(
  trailId: string,
  accessToken: string,
): Promise<SystemTrailDetail> {
  return apiRequest<SystemTrailDetail>(
    `/api/v1/leader/trip-options/system-trails/${trailId}`,
    { accessToken },
  );
}
