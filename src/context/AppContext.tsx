import React, { createContext, useContext, useState } from "react";

import {
  CreatePersonalTrailInput,
  EquipmentItem,
  LiveNavTelemetry,
  PersonalTrail,
  RentalOrder,
  Trail,
  Trip,
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

interface AppContextType {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  toggleUserRole: () => void;

  trips: Trip[];
  activeTrip: Trip;
  createPrivateTrip: (tripData: Partial<Trip>) => Trip;
  joinPrivateTrip: (inviteCode: string) => PrivateTripActionResult;
  leavePrivateTrip: (tripId: string) => PrivateTripActionResult;
  cancelPrivateTrip: (tripId: string) => PrivateTripActionResult;
  bookPublicTrip: (tripId: string, participantsCount: number) => void;

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

export const AppProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(mockUserProfile);
  const [trips, setTrips] = useState<Trip[]>(mockTrips);
  const [trails, setTrails] = useState<Trail[]>(mockTrails);

  const [personalTrails, setPersonalTrails] = useState<PersonalTrail[]>(
    initialPersonalTrails,
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
          verificationStatus: input.submitForVerification ? "PENDING" : "DRAFT",
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
      (total, entry) => total + entry.item.dailyRate * entry.quantity * days,
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
        entry.id === orderId ? { ...entry, status: "DEPOSIT_REFUNDED" } : entry,
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
        trips,
        activeTrip,
        createPrivateTrip,
        joinPrivateTrip,
        leavePrivateTrip,
        cancelPrivateTrip,
        bookPublicTrip,
        trails,
        unlockTrail,
        personalTrails,
        createPersonalTrail,
        updatePersonalTrail,
        submitPersonalTrail,
        deletePersonalTrail,
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
