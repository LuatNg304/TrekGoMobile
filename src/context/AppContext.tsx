import React, { createContext, useContext, useState } from "react";

import {
  CommunityNotification,
  CommunityPost,
  CommunityProfile,
  CommunityReport,
  CommunityReportReason,
  CreateCommunityPostInput,
  CreatePersonalTrailInput,
  EquipmentItem,
  GroupTrip,
  LiveNavTelemetry,
  PersonalTrail,
  RentalOrder,
  SupportTicket,
  SupportTicketCategory,
  Trail,
  TrekkerAccount,
  Trip,
  UserNotification,
  UserProfile,
} from "@/types";

import {
  initialLiveTelemetry,
  mockEquipment,
  mockRentalOrders,
  mockTrails,
  mockTrips,
  mockUserProfile,
} from "@/data/mockData";
import { useAuth } from "@/features/auth/AuthContext";

export interface RentalSettlement {
  orderId: string;
  returnMethod: string;
  requestedAt: string;
  inspectedAt?: string;
  inspectionResult?: "PASSED" | "DEDUCTION";
  deductionAmount: number;
  deductionReason?: string;
  refundAmount: number;
  refundedAt?: string;
}

export interface PrivateTripActionResult {
  ok: boolean;
  message: string;
  trip?: Trip;
}

export interface GroupTripActionResult {
  ok: boolean;
  message: string;
  status?: GroupTrip["joinStatus"];
}

interface AppContextType {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  toggleUserRole: () => void;
  trekkerAccount: TrekkerAccount;
  updateUserProfile: (input: Partial<UserProfile>) => void;
  updateTrekkerAccount: (input: Partial<TrekkerAccount>) => void;

  trips: Trip[];
  activeTrip: Trip;
  createPrivateTrip: (tripData: Partial<Trip>) => Trip;
  joinPrivateTrip: (inviteCode: string) => PrivateTripActionResult;
  leavePrivateTrip: (tripId: string) => PrivateTripActionResult;
  cancelPrivateTrip: (tripId: string) => PrivateTripActionResult;
  bookPublicTrip: (tripId: string, participantsCount: number) => void;

  groupTrips: GroupTrip[];
  joinGroupTrip: (groupTripId: string) => GroupTripActionResult;
  cancelGroupTripRequest: (groupTripId: string) => GroupTripActionResult;
  leaveGroupTrip: (groupTripId: string) => GroupTripActionResult;

  userNotifications: UserNotification[];
  markUserNotificationRead: (notificationId: string) => void;
  markAllUserNotificationsRead: () => void;
  deleteUserNotification: (notificationId: string) => void;

  savedTrailIds: string[];
  toggleSavedTrail: (trailId: string) => void;

  supportTickets: SupportTicket[];
  createSupportTicket: (input: {
    category: SupportTicketCategory;
    subject: string;
    description: string;
  }) => SupportTicket;

  trails: Trail[];
  unlockTrail: (trailId: string) => void;

  personalTrails: PersonalTrail[];
  createPersonalTrail: (input: CreatePersonalTrailInput) => PersonalTrail;
  updatePersonalTrail: (
    trailId: string,
    input: CreatePersonalTrailInput,
  ) => void;
  submitPersonalTrail: (trailId: string) => void;
  deletePersonalTrail: (trailId: string) => void;

  communityPosts: CommunityPost[];
  communityProfiles: CommunityProfile[];
  communityNotifications: CommunityNotification[];
  communityReports: CommunityReport[];
  createCommunityPost: (input: CreateCommunityPostInput) => CommunityPost;
  toggleCommunityPostLike: (postId: string) => void;
  toggleCommunityPostSaved: (postId: string) => void;
  addCommunityComment: (postId: string, content: string) => void;
  toggleCommunityFollow: (profileId: string) => void;
  markCommunityNotificationRead: (notificationId: string) => void;
  markAllCommunityNotificationsRead: () => void;
  reportCommunityPost: (
    postId: string,
    reason: CommunityReportReason,
    detail?: string,
  ) => void;

  equipment: EquipmentItem[];
  rentalOrders: RentalOrder[];
  rentalSettlements: Record<string, RentalSettlement>;
  cart: {
    item: EquipmentItem;
    quantity: number;
  }[];
  addToCart: (item: EquipmentItem, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  checkoutRental: (tripId: string, days: number) => void;
  confirmRentalPickup: (orderId: string) => void;
  requestRentalReturn: (orderId: string, returnMethod: string) => void;
  completeRentalInspection: (orderId: string) => void;
  confirmRentalDepositRefund: (orderId: string) => void;

  telemetry: LiveNavTelemetry;
  activeTrail: Trail;
  toggleDeviation: () => void;
  dismissDeviationWarning: () => void;
  reconnectToRoute: () => void;
  completeCheckpointMission: (checkpointId: string) => void;
  resolveMemberAlert: (memberId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialTrekkerAccount: TrekkerAccount = {
  phone: "0903 456 789",
  dateOfBirth: "18/09/2003",
  gender: "MALE",
  address: "Thành phố Hồ Chí Minh",
  bio: "Trekker cuối tuần, yêu rừng thông và những cung đường săn mây.",
  bloodType: "O+",
  allergies: "Không ghi nhận",
  medicalConditions: "Không có bệnh nền",
  medications: "Không sử dụng thuốc định kỳ",
  fitnessLevel: "INTERMEDIATE",
  emergencyContact: {
    name: "Nguyễn Minh Tâm",
    relationship: "Người thân",
    phone: "0912 345 678",
  },
  notifications: {
    tripUpdates: true,
    safetyAlerts: true,
    communityActivities: true,
    promotions: false,
  },
  privacy: {
    profileVisibility: "PUBLIC",
    activityVisibility: "FOLLOWERS",
    allowFollowRequests: true,
  },
};

const initialGroupTrips: GroupTrip[] = [
  {
    id: "group-ta-nang-01",
    title: "Ghép đoàn săn mây Tà Năng – Phan Dũng",
    destination: "Tà Năng – Phan Dũng",
    province: "Lâm Đồng",
    startDate: "16/10/2026",
    endDate: "18/10/2026",
    duration: "3 ngày 2 đêm",
    difficulty: "Trung bình",
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    description: "Nhóm nhỏ ưu tiên trải nghiệm chậm, săn mây bình minh và cắm trại trên sống lưng đồi cỏ.",
    organizer: {
      id: "community-leader-linh",
      name: "Trần Gia Linh",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80",
      role: "LEADER",
      verified: true,
      badge: "Verified Leader",
    },
    maxMembers: 10,
    currentMembers: 7,
    priceEstimate: 1850000,
    meetingPoint: "Bến xe Miền Đông mới, TP.HCM",
    joinMode: "APPROVAL",
    joinStatus: "NONE",
    tags: ["Săn mây", "Cắm trại", "Chụp ảnh"],
    requirements: ["Thể lực trung bình", "Có giày trekking", "Không bệnh tim mạch nặng"],
    members: [
      { id: "community-leader-linh", name: "Trần Gia Linh", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80", fitnessLevel: "ADVANCED", role: "ORGANIZER" },
      { id: "group-member-1", name: "Hoàng Nam", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80", fitnessLevel: "INTERMEDIATE", role: "MEMBER" },
      { id: "group-member-2", name: "Bảo Ngọc", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80", fitnessLevel: "INTERMEDIATE", role: "MEMBER" },
    ],
  },
  {
    id: "group-bidoup-02",
    title: "Cuối tuần chinh phục Bidoup",
    destination: "Vườn quốc gia Bidoup – Núi Bà",
    province: "Lâm Đồng",
    startDate: "24/10/2026",
    endDate: "25/10/2026",
    duration: "2 ngày 1 đêm",
    difficulty: "Khó",
    imageUrl: "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=80",
    description: "Đoàn dành cho trekker đã có kinh nghiệm, tốc độ ổn định và ưu tiên an toàn rừng già.",
    organizer: {
      id: "community-leader-minh",
      name: "Lê Nhật Minh",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80",
      role: "LEADER",
      verified: true,
      badge: "Top Organizer",
    },
    maxMembers: 8,
    currentMembers: 5,
    priceEstimate: 2250000,
    meetingPoint: "Quảng trường Lâm Viên, Đà Lạt",
    joinMode: "APPROVAL",
    joinStatus: "PENDING",
    tags: ["Rừng già", "Đỉnh cao", "Thử thách"],
    requirements: ["Đã hoàn thành ít nhất 2 cung", "Thể lực khá", "Mang áo mưa cá nhân"],
    members: [
      { id: "community-leader-minh", name: "Lê Nhật Minh", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80", fitnessLevel: "ADVANCED", role: "ORGANIZER" },
    ],
  },
  {
    id: "group-chua-chan-03",
    title: "Trekking Núi Chứa Chan cho người mới",
    destination: "Núi Chứa Chan",
    province: "Đồng Nai",
    startDate: "01/11/2026",
    endDate: "01/11/2026",
    duration: "Trong ngày",
    difficulty: "Dễ",
    imageUrl: "https://images.unsplash.com/photo-1486911278844-a81c5267e227?auto=format&fit=crop&w=1200&q=80",
    description: "Chuyến làm quen trekking với nhịp độ nhẹ, phù hợp người mới và nhóm bạn nhỏ.",
    organizer: {
      id: "community-user-thao",
      name: "Nguyễn Thanh Thảo",
      avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=240&q=80",
      role: "TREKKER",
      verified: false,
    },
    maxMembers: 12,
    currentMembers: 9,
    priceEstimate: 650000,
    meetingPoint: "Bưu điện trung tâm TP.HCM",
    joinMode: "INSTANT",
    joinStatus: "NONE",
    tags: ["Người mới", "Trong ngày", "Kết bạn"],
    requirements: ["Sức khỏe ổn định", "Mang tối thiểu 1.5L nước", "Có mặt đúng giờ"],
    members: [
      { id: "community-user-thao", name: "Nguyễn Thanh Thảo", avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=240&q=80", fitnessLevel: "INTERMEDIATE", role: "ORGANIZER" },
    ],
  },
];

const initialUserNotifications: UserNotification[] = [
  {
    id: "notification-booking-1",
    category: "BOOKING",
    title: "Booking đã được xác nhận",
    message: "Vé QR cho chuyến trekking sắp tới đã sẵn sàng trong My Trips.",
    createdAt: "10 phút trước",
    isRead: false,
    route: "/(tabs)/trips",
  },
  {
    id: "notification-rental-1",
    category: "RENTAL",
    title: "Đơn thuê đang được chuẩn bị",
    message: "Kho đã tiếp nhận đơn và đang chuẩn bị thiết bị cho chuyến đi của bạn.",
    createdAt: "1 giờ trước",
    isRead: false,
    route: "/(tabs)/rental",
  },
  {
    id: "notification-group-1",
    category: "GROUP_TRIP",
    title: "Yêu cầu ghép đoàn đang chờ duyệt",
    message: "Trưởng nhóm Bidoup sẽ phản hồi yêu cầu tham gia của bạn.",
    createdAt: "Hôm qua",
    isRead: false,
    route: "/group-trips",
  },
  {
    id: "notification-trail-1",
    category: "PERSONAL_TRAIL",
    title: "Cung đường đã được xác minh",
    message: "Cung đường cá nhân của bạn đã đạt trạng thái VERIFIED.",
    createdAt: "2 ngày trước",
    isRead: true,
    route: "/personal-trails",
  },
  {
    id: "notification-trail-2",
    category: "PERSONAL_TRAIL",
    title: "Cần chỉnh sửa cung đường",
    message: "Admin yêu cầu bổ sung checkpoint và mô tả an toàn trước khi duyệt lại.",
    createdAt: "3 ngày trước",
    isRead: true,
    route: "/personal-trails",
  },
];

function formatNow() {
  return new Date().toLocaleString("vi-VN");
}

function normalizeInviteCode(value: string) {
  return value.trim().toUpperCase();
}

const initialPersonalTrails: PersonalTrail[] = [
  {
    id: "personal-trail-dinh-pinhatt",
    ownerId: mockUserProfile.id,
    name: "Đường mòn săn hoàng hôn Pinhatt",
    region: "Đà Lạt, Lâm Đồng",
    difficulty: "Trung bình",
    distanceKm: 8.6,
    elevationGainM: 420,
    duration: "1 ngày",
    terrainType: "Rừng thông & Sống núi",
    description:
      "Route cá nhân xuyên rừng thông lên điểm ngắm hồ Tuyền Lâm và đỉnh Pinhatt.",
    visibility: "PRIVATE",
    verificationStatus: "DRAFT",
    routePreset: "RIDGE",
    routePoints: [
      { id: "route-1", x: 42, y: 304 },
      { id: "route-2", x: 112, y: 252 },
      { id: "route-3", x: 208, y: 196 },
      { id: "route-4", x: 294, y: 116 },
      { id: "route-5", x: 356, y: 62 },
    ],
    checkpoints: [
      {
        id: "personal-cp-1",
        order: 1,
        name: "Bìa rừng thông",
        elevation: 1450,
        distanceFromStartKm: 0,
        status: "PENDING",
        coords: { x: 42, y: 304 },
      },
      {
        id: "personal-cp-2",
        order: 2,
        name: "Điểm ngắm hồ Tuyền Lâm",
        elevation: 1620,
        distanceFromStartKm: 4.2,
        status: "PENDING",
        coords: { x: 208, y: 196 },
      },
    ],
    createdAt: "01/10/2026",
    updatedAt: "01/10/2026",
  },
  {
    id: "personal-trail-suoi-vang",
    ownerId: mockUserProfile.id,
    name: "Suối Vàng – Đồi cỏ hồng",
    region: "Lạc Dương, Lâm Đồng",
    difficulty: "Dễ",
    distanceKm: 5.4,
    elevationGainM: 180,
    duration: "Nửa ngày",
    terrainType: "Đồi cỏ & Đường đất",
    description:
      "Cung đường ngắn dành cho nhóm mới bắt đầu, có nhiều điểm dừng chụp ảnh.",
    visibility: "PRIVATE",
    verificationStatus: "REJECTED",
    rejectionReason:
      "Cần bổ sung checkpoint nguồn nước và mô tả lối thoát khẩn cấp.",
    routePreset: "FOREST",
    routePoints: [
      { id: "route-a", x: 38, y: 292 },
      { id: "route-b", x: 126, y: 238 },
      { id: "route-c", x: 230, y: 172 },
      { id: "route-d", x: 346, y: 86 },
    ],
    checkpoints: [
      {
        id: "personal-cp-a",
        order: 1,
        name: "Bãi gửi xe Suối Vàng",
        elevation: 1380,
        distanceFromStartKm: 0,
        status: "PENDING",
        coords: { x: 38, y: 292 },
      },
    ],
    createdAt: "29/09/2026",
    updatedAt: "30/09/2026",
  },
];

const initialCommunityPosts: CommunityPost[] = [
  {
    id: "community-post-pinhatt",
    author: {
      id: "leader-hoang-nam",
      name: "Hoàng Nam",
      avatar: "https://i.pravatar.cc/200?img=12",
      role: "LEADER",
      verified: true,
      badge: "Verified Leader",
    },
    content:
      "Sáng nay Pinhatt có mây thấp và gió khá mạnh ở đoạn sống núi. Đoàn đi sau 9 giờ nên mang áo gió, giữ khoảng cách và tránh đứng lâu tại mép đá.",
    imageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    location: "Đỉnh Pinhatt, Lâm Đồng",
    trailName: "Đường mòn săn hoàng hôn Pinhatt",
    tags: ["Cảnh báo", "Pinhatt", "Thời tiết"],
    createdAt: "35 phút trước",
    likesCount: 128,
    commentsCount: 2,
    isLiked: false,
    isSaved: true,
    comments: [
      {
        id: "comment-pinhatt-1",
        postId: "community-post-pinhatt",
        author: {
          id: "trekker-minh-anh",
          name: "Minh Anh",
          avatar: "https://i.pravatar.cc/200?img=47",
          role: "TREKKER",
          verified: false,
        },
        content: "Cảm ơn Leader, nhóm mình sẽ xuất phát sớm hơn dự kiến.",
        createdAt: "20 phút trước",
      },
      {
        id: "comment-pinhatt-2",
        postId: "community-post-pinhatt",
        author: {
          id: "leader-khanh-linh",
          name: "Khánh Linh",
          avatar: "https://i.pravatar.cc/200?img=32",
          role: "LEADER",
          verified: true,
          badge: "Top Organizer",
        },
        content: "Đoạn CP2 cũng hơi trơn, nhớ kiểm tra đế giày trước khi lên.",
        createdAt: "12 phút trước",
      },
    ],
  },
  {
    id: "community-post-ta-nang",
    author: {
      id: "trekker-minh-anh",
      name: "Minh Anh",
      avatar: "https://i.pravatar.cc/200?img=47",
      role: "TREKKER",
      verified: false,
      badge: "Mountain Explorer",
    },
    content:
      "Hoàn thành cung Tà Năng – Phan Dũng lần đầu tiên! Cảm ơn mọi người đã chia sẻ checklist nước và đồ chống nắng. View cuối ngày thật sự xứng đáng.",
    imageUrl:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    location: "Tà Năng – Phan Dũng",
    trailName: "Tà Năng – Phan Dũng",
    tags: ["Review chuyến đi", "Tà Năng", "Tân binh"],
    createdAt: "2 giờ trước",
    likesCount: 84,
    commentsCount: 1,
    isLiked: true,
    isSaved: false,
    comments: [
      {
        id: "comment-ta-nang-1",
        postId: "community-post-ta-nang",
        author: {
          id: "leader-hoang-nam",
          name: "Hoàng Nam",
          avatar: "https://i.pravatar.cc/200?img=12",
          role: "LEADER",
          verified: true,
          badge: "Verified Leader",
        },
        content: "Chúc mừng bạn đã hoàn thành cung đầu tiên nhé!",
        createdAt: "1 giờ trước",
      },
    ],
  },
  {
    id: "community-post-gear",
    author: {
      id: "leader-khanh-linh",
      name: "Khánh Linh",
      avatar: "https://i.pravatar.cc/200?img=32",
      role: "LEADER",
      verified: true,
      badge: "Top Organizer",
    },
    content:
      "Checklist nhanh cho chuyến 2 ngày 1 đêm: áo mưa nhẹ, đèn pin đội đầu, túi ngủ phù hợp nhiệt độ và tối thiểu 2 lít nước/người. Đừng mang balo quá 20% cân nặng cơ thể.",
    location: "Cộng đồng TrekGo",
    tags: ["Kinh nghiệm", "Trang bị", "Checklist"],
    createdAt: "Hôm qua",
    likesCount: 206,
    commentsCount: 0,
    isLiked: false,
    isSaved: false,
    comments: [],
  },
];

const initialCommunityProfiles: CommunityProfile[] = [
  {
    id: mockUserProfile.id,
    name: mockUserProfile.name,
    avatar: mockUserProfile.avatar,
    coverImage:
      "https://images.unsplash.com/photo-1464278533981-50106e6176b1?auto=format&fit=crop&w=1200&q=80",
    role: mockUserProfile.role,
    verified: mockUserProfile.role === "LEADER",
    badge: mockUserProfile.role === "LEADER" ? "Verified Leader" : "Trail Explorer",
    bio: "Yêu những cung đường nhiều cây xanh, thích ghi lại checklist và kinh nghiệm cho người mới.",
    location: "TP. Hồ Chí Minh",
    joinedAt: "Tham gia từ 08/2026",
    followersCount: 126,
    followingCount: 48,
    completedTripsCount: mockUserProfile.completedTripsCount,
    totalDistanceKm: mockUserProfile.totalDistanceKm,
    specialties: ["Trekking cuối tuần", "Checklist", "Ảnh hành trình"],
    isFollowing: false,
  },
  {
    id: "leader-hoang-nam",
    name: "Hoàng Nam",
    avatar: "https://i.pravatar.cc/200?img=12",
    coverImage:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    role: "LEADER",
    verified: true,
    badge: "Verified Leader",
    bio: "Leader chuyên tuyến Tây Nguyên, ưu tiên an toàn đoàn và kỹ năng xử lý thời tiết xấu.",
    location: "Đà Lạt, Lâm Đồng",
    joinedAt: "Tham gia từ 04/2025",
    followersCount: 2840,
    followingCount: 119,
    completedTripsCount: 68,
    totalDistanceKm: 1246,
    specialties: ["Tây Nguyên", "An toàn tuyến", "Sơ cứu"],
    isFollowing: true,
  },
  {
    id: "trekker-minh-anh",
    name: "Minh Anh",
    avatar: "https://i.pravatar.cc/200?img=47",
    coverImage:
      "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=80",
    role: "TREKKER",
    verified: false,
    badge: "Mountain Explorer",
    bio: "Tân binh mê săn mây, đang chinh phục từng cung đường đẹp của Việt Nam.",
    location: "Biên Hòa, Đồng Nai",
    joinedAt: "Tham gia từ 09/2026",
    followersCount: 318,
    followingCount: 92,
    completedTripsCount: 7,
    totalDistanceKm: 86,
    specialties: ["Săn mây", "Review chuyến đi", "Người mới"],
    isFollowing: false,
  },
  {
    id: "leader-khanh-linh",
    name: "Khánh Linh",
    avatar: "https://i.pravatar.cc/200?img=32",
    coverImage:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    role: "LEADER",
    verified: true,
    badge: "Top Organizer",
    bio: "Leader tuyến dài ngày, thích chia sẻ cách chuẩn bị hành lý gọn và đủ.",
    location: "Hà Nội",
    joinedAt: "Tham gia từ 11/2024",
    followersCount: 4210,
    followingCount: 204,
    completedTripsCount: 94,
    totalDistanceKm: 2084,
    specialties: ["Tuyến dài ngày", "Trang bị", "Điều phối đoàn"],
    isFollowing: true,
  },
];

const initialCommunityNotifications: CommunityNotification[] = [
  {
    id: "community-notification-safety",
    type: "SAFETY",
    title: "Cảnh báo tuyến Pinhatt",
    message: "Gió mạnh và mây thấp tại đoạn sống núi. Kiểm tra bài cập nhật trước khi khởi hành.",
    createdAt: "20 phút trước",
    isRead: false,
    postId: "community-post-pinhatt",
  },
  {
    id: "community-notification-comment",
    type: "COMMENT",
    title: "Khánh Linh đã bình luận",
    message: "Checklist này rất phù hợp cho đoàn đi cuối tuần.",
    createdAt: "1 giờ trước",
    isRead: false,
    actor: {
      id: "leader-khanh-linh",
      name: "Khánh Linh",
      avatar: "https://i.pravatar.cc/200?img=32",
      role: "LEADER",
      verified: true,
      badge: "Top Organizer",
    },
    profileId: "leader-khanh-linh",
  },
  {
    id: "community-notification-follow",
    type: "FOLLOW",
    title: "Minh Anh đã theo dõi bạn",
    message: "Bạn có thêm một người đồng hành mới trong Community.",
    createdAt: "Hôm qua",
    isRead: true,
    actor: {
      id: "trekker-minh-anh",
      name: "Minh Anh",
      avatar: "https://i.pravatar.cc/200?img=47",
      role: "TREKKER",
      verified: false,
      badge: "Mountain Explorer",
    },
    profileId: "trekker-minh-anh",
  },
];

export const AppProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { user: authenticatedUser } = useAuth();
  const [localUser, setUser] = useState<UserProfile>(mockUserProfile);
  const user: UserProfile = authenticatedUser
    ? {
        ...localUser,
        id: authenticatedUser.id,
        name:
          authenticatedUser.fullName ||
          authenticatedUser.name ||
          authenticatedUser.email.split("@")[0],
        email: authenticatedUser.email,
        avatar:
          authenticatedUser.avatarUrl ||
          authenticatedUser.avatar ||
          localUser.avatar,
        role: authenticatedUser.role === "LEADER" ? "LEADER" : "TREKKER",
      }
    : localUser;
  const [trekkerAccount, setTrekkerAccount] = useState<TrekkerAccount>(
    initialTrekkerAccount,
  );
  const [groupTrips, setGroupTrips] = useState<GroupTrip[]>(initialGroupTrips);
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>(
    initialUserNotifications,
  );
  const [savedTrailIds, setSavedTrailIds] = useState<string[]>([
    "trail-pinhatt",
  ]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [trips, setTrips] = useState<Trip[]>(mockTrips);
  const [trails, setTrails] = useState<Trail[]>(mockTrails);

  const [personalTrails, setPersonalTrails] = useState<PersonalTrail[]>(
    initialPersonalTrails,
  );
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(
    initialCommunityPosts,
  );
  const [communityProfiles, setCommunityProfiles] = useState<CommunityProfile[]>(
    initialCommunityProfiles,
  );
  const [communityNotifications, setCommunityNotifications] = useState<
    CommunityNotification[]
  >(initialCommunityNotifications);
  const [communityReports, setCommunityReports] = useState<CommunityReport[]>(
    [],
  );
  const [equipment] = useState<EquipmentItem[]>(mockEquipment);
  const [rentalOrders, setRentalOrders] =
    useState<RentalOrder[]>(mockRentalOrders);
  const [rentalSettlements, setRentalSettlements] = useState<
    Record<string, RentalSettlement>
  >({});
  const [cart, setCart] = useState<
    {
      item: EquipmentItem;
      quantity: number;
    }[]
  >([]);
  const [telemetry, setTelemetry] =
    useState<LiveNavTelemetry>(initialLiveTelemetry);

  const activeTrip =
    trips.find(
      (trip) =>
        trip.type === "PUBLIC" &&
        trip.status === "UPCOMING" &&
        Boolean(trip.bookingCode),
    ) || trips[0];
  const activeTrail = trails[0];

  const toggleUserRole = () => {
    setUser((current) => ({
      ...current,
      role: current.role === "TREKKER" ? "LEADER" : "TREKKER",
    }));
  };

  const updateUserProfile = (input: Partial<UserProfile>) => {
    setUser((current) => ({ ...current, ...input }));

    setCommunityProfiles((current) =>
      current.map((profile) =>
        profile.id === user.id
          ? {
              ...profile,
              name: input.name ?? profile.name,
              avatar: input.avatar ?? profile.avatar,
            }
          : profile,
      ),
    );
  };

  const updateTrekkerAccount = (input: Partial<TrekkerAccount>) => {
    setTrekkerAccount((current) => ({ ...current, ...input }));
  };

  const joinGroupTrip = (groupTripId: string): GroupTripActionResult => {
    const selected = groupTrips.find((trip) => trip.id === groupTripId);

    if (!selected) return { ok: false, message: "Không tìm thấy chuyến ghép đoàn." };
    if (selected.joinStatus === "JOINED") return { ok: true, message: "Bạn đã tham gia chuyến này.", status: "JOINED" };
    if (selected.joinStatus === "PENDING") return { ok: true, message: "Yêu cầu của bạn đang chờ duyệt.", status: "PENDING" };
    if (selected.currentMembers >= selected.maxMembers) return { ok: false, message: "Chuyến đi đã đủ thành viên." };

    const nextStatus = selected.joinMode === "INSTANT" ? "JOINED" : "PENDING";
    setGroupTrips((current) =>
      current.map((trip) =>
        trip.id !== groupTripId
          ? trip
          : {
              ...trip,
              joinStatus: nextStatus,
              currentMembers: nextStatus === "JOINED" ? trip.currentMembers + 1 : trip.currentMembers,
              members:
                nextStatus === "JOINED"
                  ? [
                      ...trip.members,
                      {
                        id: user.id,
                        name: user.name,
                        avatar: user.avatar,
                        fitnessLevel: trekkerAccount.fitnessLevel,
                        role: "MEMBER" as const,
                      },
                    ]
                  : trip.members,
            },
      ),
    );

    return {
      ok: true,
      status: nextStatus,
      message:
        nextStatus === "JOINED"
          ? "Bạn đã tham gia nhóm thành công."
          : "Đã gửi yêu cầu. Trưởng nhóm sẽ duyệt hồ sơ của bạn.",
    };
  };

  const cancelGroupTripRequest = (groupTripId: string): GroupTripActionResult => {
    setGroupTrips((current) =>
      current.map((trip) =>
        trip.id === groupTripId && trip.joinStatus === "PENDING"
          ? { ...trip, joinStatus: "NONE" }
          : trip,
      ),
    );
    return { ok: true, message: "Đã rút yêu cầu tham gia.", status: "NONE" };
  };

  const leaveGroupTrip = (groupTripId: string): GroupTripActionResult => {
    setGroupTrips((current) =>
      current.map((trip) =>
        trip.id === groupTripId && trip.joinStatus === "JOINED"
          ? {
              ...trip,
              joinStatus: "NONE",
              currentMembers: Math.max(0, trip.currentMembers - 1),
              members: trip.members.filter((member) => member.id !== user.id),
            }
          : trip,
      ),
    );
    return { ok: true, message: "Bạn đã rời chuyến ghép đoàn.", status: "NONE" };
  };

  const markUserNotificationRead = (notificationId: string) => {
    setUserNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification,
      ),
    );
  };

  const markAllUserNotificationsRead = () => {
    setUserNotifications((current) =>
      current.map((notification) => ({ ...notification, isRead: true })),
    );
  };

  const deleteUserNotification = (notificationId: string) => {
    setUserNotifications((current) =>
      current.filter((notification) => notification.id !== notificationId),
    );
  };

  const toggleSavedTrail = (trailId: string) => {
    setSavedTrailIds((current) =>
      current.includes(trailId)
        ? current.filter((id) => id !== trailId)
        : [trailId, ...current],
    );
  };

  const createSupportTicket = (input: {
    category: SupportTicketCategory;
    subject: string;
    description: string;
  }) => {
    const ticket: SupportTicket = {
      id: `SUP-${Date.now().toString().slice(-6)}`,
      category: input.category,
      subject: input.subject.trim(),
      description: input.description.trim(),
      createdAt: new Date().toLocaleString("vi-VN"),
      status: "SUBMITTED",
    };

    setSupportTickets((current) => [ticket, ...current]);
    return ticket;
  };

  const createPrivateTrip = (tripData: Partial<Trip>) => {
    const inviteCode =
      tripData.inviteCode ||
      `TG-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const newTrip: Trip = {
      id: `trip-private-${Date.now()}`,
      type: "PRIVATE",
      name: tripData.name?.trim() || "Private Trekking Expedition",
      trailId: tripData.trailId || "trail-pinhatt",
      destination: tripData.destination || "Đà Lạt",
      startDate: tripData.startDate || "15 Tháng 11, 2026",
      endDate: tripData.endDate || tripData.startDate || "17 Tháng 11, 2026",
      durationDays: tripData.durationDays || 2,
      status: "UPCOMING",
      leader: {
        name: `${user.name} (Host)`,
        avatar: user.avatar,
        phone: "0909 111 222",
        rating: 5,
        badge: "Private Trip Host",
      },
      capacity: tripData.capacity || 8,
      enrolledCount: 1,
      inviteCode: normalizeInviteCode(inviteCode),
      weather: {
        tempC: 19,
        condition: "Mây rải rác",
        rainRisk: false,
        rainChancePercent: 20,
        humidityPercent: 78,
        windSpeedKmh: 12,
      },
      participants: [
        {
          id: user.id,
          name: `${user.name} (Host)`,
          avatar: user.avatar,
          role: "HOST",
        },
      ],
    };

    // Giữ Public Trip đã xác nhận ở đầu danh sách để không làm sai
    // card chính, QR và flow check-in hiện tại trong tab Trips.
    setTrips((current) => [...current, newTrip]);

    return newTrip;
  };

  const joinPrivateTrip = (rawInviteCode: string): PrivateTripActionResult => {
    const inviteCode = normalizeInviteCode(rawInviteCode);

    if (!inviteCode) {
      return {
        ok: false,
        message: "Vui lòng nhập mã mời.",
      };
    }

    let selectedTrip = trips.find(
      (trip) =>
        trip.type === "PRIVATE" &&
        normalizeInviteCode(trip.inviteCode || "") === inviteCode,
    );

    if (!selectedTrip && inviteCode === "TG-DEMO") {
      const demoTrip: Trip = {
        id: `trip-private-demo-${Date.now()}`,
        type: "PRIVATE",
        name: "Cắm trại Núi Chứa Chan cùng hội bạn",
        trailId: "trail-pinhatt",
        destination: "Xuân Lộc, Đồng Nai",
        startDate: "08 Tháng 11, 2026",
        endDate: "09 Tháng 11, 2026",
        durationDays: 2,
        status: "UPCOMING",
        leader: {
          name: "Minh Quân (Host)",
          avatar:
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
          phone: "0903 456 789",
          rating: 4.9,
          badge: "Private Trip Host",
        },
        capacity: 8,
        enrolledCount: 3,
        inviteCode: "TG-DEMO",
        weather: {
          tempC: 24,
          condition: "Nắng nhẹ",
          rainRisk: false,
          rainChancePercent: 15,
          humidityPercent: 70,
          windSpeedKmh: 10,
        },
        participants: [
          {
            id: "demo-host",
            name: "Minh Quân (Host)",
            avatar:
              "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
            role: "HOST",
          },
          {
            id: "demo-member-1",
            name: "Bảo Ngọc",
            avatar:
              "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
            role: "MEMBER",
          },
          {
            id: "demo-member-2",
            name: "Hoàng Nam",
            avatar:
              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
            role: "MEMBER",
          },
        ],
      };

      selectedTrip = demoTrip;
      setTrips((current) => [...current, demoTrip]);
    }

    if (!selectedTrip) {
      return {
        ok: false,
        message: "Không tìm thấy Private Trip với mã mời này.",
      };
    }

    if (selectedTrip.status === "CANCELLED") {
      return {
        ok: false,
        message: "Chuyến đi này đã bị Host hủy.",
      };
    }

    const alreadyJoined = selectedTrip.participants.some(
      (participant) =>
        participant.id === user.id ||
        participant.name.replace(" (Host)", "") === user.name,
    );

    if (alreadyJoined) {
      return {
        ok: true,
        message: "Bạn đã có mặt trong chuyến đi này.",
        trip: selectedTrip,
      };
    }

    if (selectedTrip.enrolledCount >= selectedTrip.capacity) {
      return {
        ok: false,
        message: "Chuyến đi đã đủ số lượng thành viên.",
      };
    }

    const joinedTrip: Trip = {
      ...selectedTrip,
      enrolledCount: selectedTrip.enrolledCount + 1,
      participants: [
        ...selectedTrip.participants,
        {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          role: "MEMBER",
        },
      ],
    };

    setTrips((current) =>
      current.map((trip) => (trip.id === joinedTrip.id ? joinedTrip : trip)),
    );

    return {
      ok: true,
      message: "Tham gia Private Trip thành công.",
      trip: joinedTrip,
    };
  };

  const leavePrivateTrip = (tripId: string): PrivateTripActionResult => {
    const selectedTrip = trips.find((trip) => trip.id === tripId);

    if (!selectedTrip || selectedTrip.type !== "PRIVATE") {
      return {
        ok: false,
        message: "Không tìm thấy Private Trip.",
      };
    }

    const isHost = selectedTrip.participants.some(
      (participant) =>
        participant.role === "HOST" &&
        (participant.id === user.id ||
          participant.name.replace(" (Host)", "") === user.name),
    );

    if (isHost) {
      return {
        ok: false,
        message: "Host không thể rời chuyến. Hãy hủy chuyến nếu cần.",
      };
    }

    const isMember = selectedTrip.participants.some(
      (participant) => participant.id === user.id,
    );

    if (!isMember) {
      return {
        ok: false,
        message: "Bạn chưa tham gia chuyến đi này.",
      };
    }

    const updatedTrip: Trip = {
      ...selectedTrip,
      enrolledCount: Math.max(1, selectedTrip.enrolledCount - 1),
      participants: selectedTrip.participants.filter(
        (participant) => participant.id !== user.id,
      ),
    };

    setTrips((current) =>
      current.map((trip) => (trip.id === tripId ? updatedTrip : trip)),
    );

    return {
      ok: true,
      message: "Bạn đã rời khỏi chuyến đi.",
      trip: updatedTrip,
    };
  };

  const cancelPrivateTrip = (tripId: string): PrivateTripActionResult => {
    const selectedTrip = trips.find((trip) => trip.id === tripId);

    if (!selectedTrip || selectedTrip.type !== "PRIVATE") {
      return {
        ok: false,
        message: "Không tìm thấy Private Trip.",
      };
    }

    const isHost = selectedTrip.participants.some(
      (participant) =>
        participant.role === "HOST" &&
        (participant.id === user.id ||
          participant.name.replace(" (Host)", "") === user.name),
    );

    if (!isHost) {
      return {
        ok: false,
        message: "Chỉ Host mới có thể hủy chuyến đi này.",
      };
    }

    const cancelledTrip: Trip = {
      ...selectedTrip,
      status: "CANCELLED",
    };

    setTrips((current) =>
      current.map((trip) => (trip.id === tripId ? cancelledTrip : trip)),
    );

    return {
      ok: true,
      message: "Private Trip đã được hủy.",
      trip: cancelledTrip,
    };
  };

  const bookPublicTrip = (tripId: string, participantsCount: number) => {
    setTrips((current) =>
      current.map((trip) => {
        if (trip.id !== tripId) {
          return trip;
        }

        return {
          ...trip,
          enrolledCount: Math.min(
            trip.capacity,
            trip.enrolledCount + participantsCount,
          ),
          bookingCode:
            trip.bookingCode ||
            `#BK-${Math.floor(1000 + Math.random() * 9000)}`,
        };
      }),
    );
  };

  const unlockTrail = (trailId: string) => {
    setTrails((current) =>
      current.map((trail) =>
        trail.id === trailId ? { ...trail, isUnlocked: true } : trail,
      ),
    );
  };

  const createPersonalTrail = (input: CreatePersonalTrailInput) => {
    const now = new Date().toLocaleDateString("vi-VN");

    const newTrail: PersonalTrail = {
      id: `personal-trail-${Date.now()}`,
      ownerId: user.id,
      name: input.name.trim(),
      region: input.region.trim(),
      difficulty: input.difficulty,
      distanceKm: input.distanceKm,
      elevationGainM: input.elevationGainM,
      duration: input.duration.trim(),
      terrainType: input.terrainType.trim(),
      description: input.description.trim(),
      visibility: "PRIVATE",
      verificationStatus: input.submitForVerification ? "PENDING" : "DRAFT",
      routePreset: input.routePreset,
      routePoints: input.routePoints,
      checkpoints: input.checkpoints,
      createdAt: now,
      updatedAt: now,
    };

    setPersonalTrails((current) => [newTrail, ...current]);

    return newTrail;
  };

  const updatePersonalTrail = (
    trailId: string,
    input: CreatePersonalTrailInput,
  ) => {
    setPersonalTrails((current) =>
      current.map((trail) => {
        if (trail.id !== trailId) {
          return trail;
        }

        return {
          ...trail,
          name: input.name.trim(),
          region: input.region.trim(),
          difficulty: input.difficulty,
          distanceKm: input.distanceKm,
          elevationGainM: input.elevationGainM,
          duration: input.duration.trim(),
          terrainType: input.terrainType.trim(),
          description: input.description.trim(),
          visibility: "PRIVATE",
          verificationStatus: input.submitForVerification
            ? "PENDING"
            : "DRAFT",
          rejectionReason: undefined,
          routePreset: input.routePreset,
          routePoints: input.routePoints,
          checkpoints: input.checkpoints.map((checkpoint, index) => ({
            ...checkpoint,
            order: index + 1,
          })),
          updatedAt: new Date().toLocaleDateString("vi-VN"),
        };
      }),
    );
  };

  const submitPersonalTrail = (trailId: string) => {
    setPersonalTrails((current) =>
      current.map((trail) =>
        trail.id === trailId
          ? {
              ...trail,
              visibility: "PRIVATE",
              verificationStatus: "PENDING",
              rejectionReason: undefined,
              updatedAt: new Date().toLocaleDateString("vi-VN"),
            }
          : trail,
      ),
    );
  };

  const deletePersonalTrail = (trailId: string) => {
    setPersonalTrails((current) =>
      current.filter((trail) => trail.id !== trailId),
    );
  };

  const createCommunityPost = (input: CreateCommunityPostInput) => {
    const newPost: CommunityPost = {
      id: `community-post-${Date.now()}`,
      author: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        verified: user.role === "LEADER",
        badge: user.role === "LEADER" ? "Verified Leader" : "Trekker",
      },
      content: input.content.trim(),
      imageUrl: input.imageUrl?.trim() || undefined,
      location: input.location?.trim() || undefined,
      trailName: input.trailName?.trim() || undefined,
      tags: input.tags,
      createdAt: "Vừa xong",
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
      isSaved: false,
      comments: [],
    };

    setCommunityPosts((current) => [newPost, ...current]);

    return newPost;
  };

  const toggleCommunityPostLike = (postId: string) => {
    setCommunityPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likesCount: Math.max(
                0,
                post.likesCount + (post.isLiked ? -1 : 1),
              ),
            }
          : post,
      ),
    );
  };

  const toggleCommunityPostSaved = (postId: string) => {
    setCommunityPosts((current) =>
      current.map((post) =>
        post.id === postId ? { ...post, isSaved: !post.isSaved } : post,
      ),
    );
  };

  const addCommunityComment = (postId: string, content: string) => {
    const normalizedContent = content.trim();

    if (!normalizedContent) {
      return;
    }

    setCommunityPosts((current) =>
      current.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        return {
          ...post,
          commentsCount: post.commentsCount + 1,
          comments: [
            ...post.comments,
            {
              id: `community-comment-${Date.now()}`,
              postId,
              author: {
                id: user.id,
                name: user.name,
                avatar: user.avatar,
                role: user.role,
                verified: user.role === "LEADER",
                badge:
                  user.role === "LEADER" ? "Verified Leader" : "Trekker",
              },
              content: normalizedContent,
              createdAt: "Vừa xong",
            },
          ],
        };
      }),
    );
  };

  const toggleCommunityFollow = (profileId: string) => {
    setCommunityProfiles((current) =>
      current.map((profile) => {
        if (profile.id !== profileId || profile.id === user.id) {
          return profile;
        }

        return {
          ...profile,
          isFollowing: !profile.isFollowing,
          followersCount: Math.max(
            0,
            profile.followersCount + (profile.isFollowing ? -1 : 1),
          ),
        };
      }),
    );
  };

  const markCommunityNotificationRead = (notificationId: string) => {
    setCommunityNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification,
      ),
    );
  };

  const markAllCommunityNotificationsRead = () => {
    setCommunityNotifications((current) =>
      current.map((notification) => ({ ...notification, isRead: true })),
    );
  };

  const reportCommunityPost = (
    postId: string,
    reason: CommunityReportReason,
    detail?: string,
  ) => {
    const newReport: CommunityReport = {
      id: `community-report-${Date.now()}`,
      postId,
      reporterId: user.id,
      reason,
      detail: detail?.trim() || undefined,
      createdAt: formatNow(),
      status: "SUBMITTED",
    };

    setCommunityReports((current) => [newReport, ...current]);
  };

  const addToCart = (item: EquipmentItem, quantity: number) => {
    setCart((current) => {
      const existing = current.find((entry) => entry.item.id === item.id);

      if (existing) {
        return current.map((entry) =>
          entry.item.id === item.id
            ? { ...entry, quantity: entry.quantity + quantity }
            : entry,
        );
      }

      return [...current, { item, quantity }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((current) => current.filter((entry) => entry.item.id !== itemId));
  };

  const checkoutRental = (tripId: string, days: number) => {
    if (cart.length === 0) {
      return;
    }

    const totalRentalFee = cart.reduce(
      (total, entry) =>
        total + entry.item.dailyRate * entry.quantity * days,
      0,
    );

    const totalDeposit = cart.reduce(
      (total, entry) => total + entry.item.deposit * entry.quantity,
      0,
    );

    const newOrder: RentalOrder = {
      id: `ord-rent-${Math.floor(1000 + Math.random() * 9000)}`,
      tripId,
      tripName:
        trips.find((trip) => trip.id === tripId)?.name || "Chuyến trekking",
      items: [...cart],
      days,
      totalRentalFee,
      totalDeposit,
      totalPayment: totalRentalFee + totalDeposit,
      status: "PAYMENT_CONFIRMED",
      createdAt: new Date().toLocaleDateString("vi-VN"),
    };

    setRentalOrders((current) => [newOrder, ...current]);
    setCart([]);
  };

  const confirmRentalPickup = (orderId: string) => {
    setRentalOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status: "IN_USE" } : order,
      ),
    );
  };

  const requestRentalReturn = (orderId: string, returnMethod: string) => {
    const order = rentalOrders.find((current) => current.id === orderId);

    if (!order) {
      return;
    }

    setRentalOrders((current) =>
      current.map((entry) =>
        entry.id === orderId ? { ...entry, status: "RETURN_PENDING" } : entry,
      ),
    );

    setRentalSettlements((current) => ({
      ...current,
      [orderId]: {
        orderId,
        returnMethod,
        requestedAt: formatNow(),
        deductionAmount: 0,
        refundAmount: order.totalDeposit,
      },
    }));
  };

  const completeRentalInspection = (orderId: string) => {
    const order = rentalOrders.find((current) => current.id === orderId);

    if (!order) {
      return;
    }

    const deductionAmount = Math.min(80000, order.totalDeposit);

    setRentalOrders((current) =>
      current.map((entry) =>
        entry.id === orderId ? { ...entry, status: "RETURNED" } : entry,
      ),
    );

    setRentalSettlements((current) => ({
      ...current,
      [orderId]: {
        orderId,
        returnMethod:
          current[orderId]?.returnMethod || "Trả tại điểm tập trung",
        requestedAt: current[orderId]?.requestedAt || formatNow(),
        inspectedAt: formatNow(),
        inspectionResult: "DEDUCTION",
        deductionAmount,
        deductionReason: "Phí vệ sinh bùn đất sau chuyến đi",
        refundAmount: order.totalDeposit - deductionAmount,
      },
    }));
  };

  const confirmRentalDepositRefund = (orderId: string) => {
    setRentalOrders((current) =>
      current.map((entry) =>
        entry.id === orderId
          ? { ...entry, status: "DEPOSIT_REFUNDED" }
          : entry,
      ),
    );

    setRentalSettlements((current) => {
      const settlement = current[orderId];

      if (!settlement) {
        return current;
      }

      return {
        ...current,
        [orderId]: {
          ...settlement,
          refundedAt: formatNow(),
        },
      };
    });
  };

  const toggleDeviation = () => {
    setTelemetry((current) => {
      const isOnRoute = !current.isOnRoute;

      return {
        ...current,
        isOnRoute,
        deviationMeters: isOnRoute ? 0 : 120,
        isWarningDismissed: false,
      };
    });
  };

  const dismissDeviationWarning = () => {
    setTelemetry((current) => ({
      ...current,
      isWarningDismissed: true,
    }));
  };

  const reconnectToRoute = () => {
    setTelemetry((current) => ({
      ...current,
      isOnRoute: true,
      deviationMeters: 0,
      isWarningDismissed: false,
    }));
  };

  const completeCheckpointMission = (checkpointId: string) => {
    setTrails((current) =>
      current.map((trail) => {
        if (trail.id !== activeTrail.id) {
          return trail;
        }

        const checkpoints = trail.checkpoints.map((checkpoint) =>
          checkpoint.id === checkpointId
            ? {
                ...checkpoint,
                status: "COMPLETED" as const,
                mission: checkpoint.mission
                  ? { ...checkpoint.mission, isDone: true }
                  : undefined,
              }
            : checkpoint,
        );

        return { ...trail, checkpoints };
      }),
    );

    setTelemetry((current) => ({
      ...current,
      activeCheckpointsCompleted: current.activeCheckpointsCompleted + 1,
      nextCheckpointName: "Đỉnh 986m – Sống Lưng Khủng Long",
      nextCheckpointDistanceM: 2800,
    }));
  };

  const resolveMemberAlert = (memberId: string) => {
    setTrips((current) =>
      current.map((trip) => {
        if (trip.id !== activeTrip.id) {
          return trip;
        }

        return {
          ...trip,
          participants: trip.participants.map((participant) =>
            participant.id === memberId
              ? {
                  ...participant,
                  isOffRoute: false,
                  deviationMeters: 0,
                }
              : participant,
          ),
        };
      }),
    );
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        toggleUserRole,
        trekkerAccount,
        updateUserProfile,
        updateTrekkerAccount,
        trips,
        activeTrip,
        createPrivateTrip,
        joinPrivateTrip,
        leavePrivateTrip,
        cancelPrivateTrip,
        bookPublicTrip,
        groupTrips,
        joinGroupTrip,
        cancelGroupTripRequest,
        leaveGroupTrip,
        userNotifications,
        markUserNotificationRead,
        markAllUserNotificationsRead,
        deleteUserNotification,
        savedTrailIds,
        toggleSavedTrail,
        supportTickets,
        createSupportTicket,
        trails,
        unlockTrail,
        personalTrails,
        createPersonalTrail,
        updatePersonalTrail,
        submitPersonalTrail,
        deletePersonalTrail,
        communityPosts,
        communityProfiles,
        communityNotifications,
        communityReports,
        createCommunityPost,
        toggleCommunityPostLike,
        toggleCommunityPostSaved,
        addCommunityComment,
        toggleCommunityFollow,
        markCommunityNotificationRead,
        markAllCommunityNotificationsRead,
        reportCommunityPost,
        equipment,
        rentalOrders,
        rentalSettlements,
        cart,
        addToCart,
        removeFromCart,
        checkoutRental,
        confirmRentalPickup,
        requestRentalReturn,
        completeRentalInspection,
        confirmRentalDepositRefund,
        telemetry,
        activeTrail,
        toggleDeviation,
        dismissDeviationWarning,
        reconnectToRoute,
        completeCheckpointMission,
        resolveMemberAlert,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }

  return context;
};
