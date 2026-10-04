export type DifficultyLevel = "Dễ" | "Trung bình" | "Khó" | "Thách thức";

export type TripType = "PUBLIC" | "PRIVATE";

export type TripStatus =
  | "UPCOMING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

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

export type CommunityAuthorRole = "TREKKER" | "LEADER";

export interface CommunityAuthor {
  id: string;
  name: string;
  avatar: string;
  role: CommunityAuthorRole;
  verified: boolean;
  badge?: string;
}

export interface CommunityProfile extends CommunityAuthor {
  coverImage: string;
  bio: string;
  location: string;
  joinedAt: string;
  followersCount: number;
  followingCount: number;
  completedTripsCount: number;
  totalDistanceKm: number;
  specialties: string[];
  isFollowing: boolean;
}

export type CommunityNotificationType =
  | "LIKE"
  | "COMMENT"
  | "FOLLOW"
  | "SAFETY"
  | "SYSTEM";

export interface CommunityNotification {
  id: string;
  type: CommunityNotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  actor?: CommunityAuthor;
  postId?: string;
  profileId?: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  author: CommunityAuthor;
  content: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  author: CommunityAuthor;
  content: string;
  imageUrl?: string;
  location?: string;
  trailName?: string;
  tags: string[];
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  comments: CommunityComment[];
}

export interface CreateCommunityPostInput {
  content: string;
  imageUrl?: string;
  location?: string;
  trailName?: string;
  tags: string[];
}

export type CommunityReportReason =
  | "SPAM"
  | "HARASSMENT"
  | "DANGEROUS_INFORMATION"
  | "MISINFORMATION"
  | "OTHER";

export interface CommunityReport {
  id: string;
  postId: string;
  reporterId: string;
  reason: CommunityReportReason;
  detail?: string;
  createdAt: string;
  status: "SUBMITTED";
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

export type TrekkerFitnessLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type ProfileVisibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";

export interface TrekkerEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface TrekkerNotificationSettings {
  tripUpdates: boolean;
  safetyAlerts: boolean;
  communityActivities: boolean;
  promotions: boolean;
}

export interface TrekkerPrivacySettings {
  profileVisibility: ProfileVisibility;
  activityVisibility: ProfileVisibility;
  allowFollowRequests: boolean;
}

export interface TrekkerAccount {
  phone: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  address: string;
  bio: string;
  bloodType: string;
  allergies: string;
  medicalConditions: string;
  medications: string;
  fitnessLevel: TrekkerFitnessLevel;
  emergencyContact: TrekkerEmergencyContact;
  notifications: TrekkerNotificationSettings;
  privacy: TrekkerPrivacySettings;
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
