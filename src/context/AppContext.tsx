import React, { createContext, useContext, useState } from "react";

import {
  EquipmentItem,
  LiveNavTelemetry,
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

interface AppContextType {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  toggleUserRole: () => void;

  trips: Trip[];
  activeTrip: Trip;
  createPrivateTrip: (tripData: Partial<Trip>) => void;
  bookPublicTrip: (tripId: string, participantsCount: number) => void;

  trails: Trail[];
  unlockTrail: (trailId: string) => void;

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

export const AppProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(mockUserProfile);

  const [trips, setTrips] = useState<Trip[]>(mockTrips);

  const [trails, setTrails] = useState<Trail[]>(mockTrails);

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

  const activeTrip = trips[0];
  const activeTrail = trails[0];

  const toggleUserRole = () => {
    setUser((current) => ({
      ...current,
      role: current.role === "TREKKER" ? "LEADER" : "TREKKER",
    }));
  };

  const createPrivateTrip = (tripData: Partial<Trip>) => {
    const inviteCode =
      "TG-" + Math.random().toString(36).substring(2, 7).toUpperCase();

    const newTrip: Trip = {
      id: `trip-private-${Date.now()}`,
      type: "PRIVATE",
      name: tripData.name || "Private Trekking Expedition",
      trailId: tripData.trailId || "trail-pinhatt",
      destination: tripData.destination || "Đà Lạt",
      startDate: tripData.startDate || "15 Tháng 11, 2026",
      endDate: tripData.endDate || "17 Tháng 11, 2026",
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
      inviteCode,
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

    setTrips((current) => [newTrip, ...current]);
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
        trail.id === trailId
          ? {
              ...trail,
              isUnlocked: true,
            }
          : trail,
      ),
    );
  };

  const addToCart = (item: EquipmentItem, quantity: number) => {
    setCart((current) => {
      const existing = current.find((entry) => entry.item.id === item.id);

      if (existing) {
        return current.map((entry) =>
          entry.item.id === item.id
            ? {
                ...entry,
                quantity: entry.quantity + quantity,
              }
            : entry,
        );
      }

      return [
        ...current,
        {
          item,
          quantity,
        },
      ];
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
        order.id === orderId
          ? {
              ...order,
              status: "IN_USE",
            }
          : order,
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
        entry.id === orderId
          ? {
              ...entry,
              status: "RETURN_PENDING",
            }
          : entry,
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

    // Kết quả kiểm định demo:
    // thiết bị hoạt động bình thường,
    // chỉ phát sinh phí vệ sinh 80.000đ.
    const deductionAmount = Math.min(80000, order.totalDeposit);

    setRentalOrders((current) =>
      current.map((entry) =>
        entry.id === orderId
          ? {
              ...entry,
              status: "RETURNED",
            }
          : entry,
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
          ? {
              ...entry,
              status: "DEPOSIT_REFUNDED",
            }
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

        const checkpoints = trail.checkpoints.map((checkpoint) => {
          if (checkpoint.id !== checkpointId) {
            return checkpoint;
          }

          return {
            ...checkpoint,
            status: "COMPLETED" as const,
            mission: checkpoint.mission
              ? {
                  ...checkpoint.mission,
                  isDone: true,
                }
              : undefined,
          };
        });

        return {
          ...trail,
          checkpoints,
        };
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
        bookPublicTrip,
        trails,
        unlockTrail,
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
