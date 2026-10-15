import {
  EquipmentItem,
  LiveNavTelemetry,
  RentalOrder,
  Trail,
  Trip,
  UserProfile,
} from "@/types";

export const mockUserProfile: UserProfile = {
  id: "",
  name: "",
  email: "",
  avatar: "",
  role: "TREKKER",
  completedTripsCount: 0,
  totalDistanceKm: 0,
  unlockedTrailsCount: 0,
  savedPoints: 0,
};

export const mockTrails: Trail[] = [];

export const mockTrips: Trip[] = [];

export const mockEquipment: EquipmentItem[] = [];

export const mockRentalOrders: RentalOrder[] = [];

export const initialLiveTelemetry: LiveNavTelemetry = {
  distanceCompletedKm: 0,
  totalDistanceKm: 0,
  elapsedTimeString: "00h 00m",
  averageSpeedKmh: 0,
  currentElevationM: 0,
  elevationGainM: 0,
  activeCheckpointsCompleted: 0,
  totalCheckpoints: 0,
  nextCheckpointName: "",
  nextCheckpointDistanceM: 0,
  batteryPercent: 0,
  gpsAccuracyMeters: 0,
  offlineSyncSec: 0,
  isOnRoute: true,
  deviationMeters: 0,
  isWarningDismissed: false,
};
