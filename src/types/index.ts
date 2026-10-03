export type DifficultyLevel = "Dễ" | "Trung bình" | "Khó" | "Thách thức";

export type TripType = "PUBLIC" | "PRIVATE";

export type TripStatus = "UPCOMING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type CheckpointStatus = "PENDING" | "REACHED" | "COMPLETED";

export type RentalStatus =
  | "PAYMENT_CONFIRMED"
  | "PREPARING"
  | "READY_FOR_DELIVERY"
  | "DELIVERED_AT_PICKUP"
  | "IN_USE"
  | "RETURN_PENDING"
  | "RETURNED"
  | "DEPOSIT_REFUNDED";

export type PersonalTrailVisibility = "PRIVATE" | "PUBLIC";

export type PersonalTrailVerificationStatus =
  | "DRAFT"
  | "PENDING"
  | "VERIFIED"
  | "REJECTED";

export interface CheckpointMission {
  id: string;
  title: string;
  description: string;
  type: "PHOTO" | "QUIZ" | "QR";
  instruction: string;
  isDone: boolean;
  rewardPoints: number;
}

export interface Checkpoint {
  id: string;
  order: number;
  name: string;
  elevation: number;
  distanceFromStartKm: number;
  status: CheckpointStatus;
  mission?: CheckpointMission;

  coords: {
    x: number;
    y: number;
  };

  realCoords?: {
    lat: number;
    lon: number;
  };
}

export interface Trail {
  id: string;
  name: string;
  region: string;
  difficulty: DifficultyLevel;
  distanceKm: number;
  elevationGainM: number;
  duration: string;
  price: number;
  isUnlocked: boolean;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  description: string;
  highlights: string[];
  checkpoints: Checkpoint[];
  terrainType: string;
}

export interface PersonalTrailRoutePoint {
  id: string;
  x: number;
  y: number;
}

export interface PersonalTrail {
  id: string;
  ownerId: string;
  name: string;
  region: string;
  difficulty: DifficultyLevel;
  distanceKm: number;
  elevationGainM: number;
  duration: string;
  terrainType: string;
  description: string;
  visibility: PersonalTrailVisibility;
  verificationStatus: PersonalTrailVerificationStatus;
  rejectionReason?: string;

  routePreset: "RIDGE" | "FOREST" | "WATERFALL";

  routePoints: PersonalTrailRoutePoint[];
  checkpoints: Checkpoint[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePersonalTrailInput {
  name: string;
  region: string;
  difficulty: DifficultyLevel;
  distanceKm: number;
  elevationGainM: number;
  duration: string;
  terrainType: string;
  description: string;
  routePreset: PersonalTrail["routePreset"];
  routePoints: PersonalTrailRoutePoint[];
  checkpoints: Checkpoint[];
  submitForVerification: boolean;
}

export interface TripParticipant {
  id: string;
  name: string;
  avatar: string;
  phone?: string;

  role: "LEADER" | "MEMBER" | "HOST";

  isOffRoute?: boolean;
  deviationMeters?: number;
  lastKnownLocation?: string;
}

export interface TripLogistics {
  pickupLocation: string;
  pickupTime: string;
  vehicleModel: string;
  vehiclePlate: string;
  driverName: string;
  driverPhone: string;
  notes: string;
}

export interface TripWeather {
  tempC: number;
  condition: string;
  rainRisk: boolean;
  rainChancePercent: number;
  humidityPercent: number;
  windSpeedKmh: number;
  riskNotice?: string;
}

export interface Trip {
  id: string;
  type: TripType;
  name: string;
  trailId: string;
  destination: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  status: TripStatus;

  leader: {
    name: string;
    avatar: string;
    phone: string;
    rating: number;
    badge: string;
  };

  capacity: number;
  enrolledCount: number;
  pricePerPerson?: number;
  bookingCode?: string;
  inviteCode?: string;
  logistics?: TripLogistics;
  weather: TripWeather;
  participants: TripParticipant[];
  rentedItemsCount?: number;
}

export type EquipmentCategory =
  | "Tất cả"
  | "Tent"
  | "Backpack"
  | "Trekking Pole"
  | "Sleeping Bag"
  | "Accessories";

export interface EquipmentItem {
  id: string;
  name: string;
  category: EquipmentCategory;
  dailyRate: number;
  deposit: number;
  stock: number;
  imageUrl: string;
  specs: string[];
  description: string;
  rating: number;
}

export interface RentalOrderItem {
  item: EquipmentItem;
  quantity: number;
}

export interface RentalOrder {
  id: string;
  tripId: string;
  tripName: string;
  items: RentalOrderItem[];
  days: number;
  totalRentalFee: number;
  totalDeposit: number;
  totalPayment: number;
  status: RentalStatus;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;

  role: "TREKKER" | "LEADER";

  completedTripsCount: number;
  totalDistanceKm: number;
  unlockedTrailsCount: number;
  savedPoints: number;
}

export interface LiveNavTelemetry {
  distanceCompletedKm: number;
  totalDistanceKm: number;
  elapsedTimeString: string;
  averageSpeedKmh: number;
  currentElevationM: number;
  elevationGainM: number;
  activeCheckpointsCompleted: number;
  totalCheckpoints: number;
  nextCheckpointName: string;
  nextCheckpointDistanceM: number;
  batteryPercent: number;
  gpsAccuracyMeters: number;
  offlineSyncSec: number;
  isOnRoute: boolean;
  deviationMeters: number;
  isWarningDismissed: boolean;
}
