import {
  initialLiveTelemetry,
  mockEquipment,
  mockRentalOrders,
  mockTrails,
  mockTrips,
  mockUserProfile
} from '@/data/mockData';
import {
  EquipmentItem,
  LiveNavTelemetry,
  RentalOrder,
  Trail,
  Trip,
  UserProfile
} from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type FieldWorkflowStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface FieldWorkflowState {
  leaderTripStatus: 'PREPARING' | 'IN_PROGRESS' | 'COMPLETED';
  leaderPretripApproved: boolean;
  leaderReportSent: boolean;
  handoverRequested: boolean;
  deliveryStatus: FieldWorkflowStatus;
  deliveryVerified: boolean;
  deliveryItems: boolean[];
  deliveryPhotoUri: string | null;
  deliverySigned: boolean;
  returnStatus: FieldWorkflowStatus;
  returnArrived: boolean;
  returnVerified: boolean;
  returnItems: boolean[];
  returnConditionRecorded: boolean;
  returnSigned: boolean;
  depositStatus: 'HELD' | 'PENDING_INSPECTION' | 'REFUNDED';
  lastUpdated: string;
}

const FIELD_WORKFLOW_STORAGE_KEY = 'trekgo.field-workflow.v1';

const initialFieldWorkflow: FieldWorkflowState = {
  leaderTripStatus: 'PREPARING',
  leaderPretripApproved: false,
  leaderReportSent: false,
  handoverRequested: false,
  deliveryStatus: 'PENDING',
  deliveryVerified: false,
  deliveryItems: [false, false, false, false],
  deliveryPhotoUri: null,
  deliverySigned: false,
  returnStatus: 'PENDING',
  returnArrived: false,
  returnVerified: false,
  returnItems: [false, false, false, false],
  returnConditionRecorded: false,
  returnSigned: false,
  depositStatus: 'HELD',
  lastUpdated: new Date().toISOString(),
};

interface AppContextType {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  toggleUserRole: () => void;
  authRole: 'STAFF_DELIVERY' | 'LEADER' | null;
  signInAsRole: (role: 'STAFF_DELIVERY' | 'LEADER') => void;
  signOut: () => void;

  trips: Trip[];
  activeTrip: Trip;
  createPrivateTrip: (tripData: Partial<Trip>) => void;
  bookPublicTrip: (tripId: string, participantsCount: number) => void;

  trails: Trail[];
  unlockTrail: (trailId: string) => void;

  equipment: EquipmentItem[];
  rentalOrders: RentalOrder[];
  cart: { item: EquipmentItem; quantity: number }[];
  addToCart: (item: EquipmentItem, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  checkoutRental: (tripId: string, days: number) => void;

  // Live GPS & Navigation State
  telemetry: LiveNavTelemetry;
  activeTrail: Trail;
  toggleDeviation: () => void;
  dismissDeviationWarning: () => void;
  reconnectToRoute: () => void;
  completeCheckpointMission: (checkpointId: string) => void;
  resolveMemberAlert: (memberId: string) => void;

  fieldWorkflow: FieldWorkflowState;
  approveLeaderPretrip: () => void;
  startLeaderTrip: () => void;
  completeLeaderTrip: () => void;
  sendLeaderReport: () => void;
  setDeliveryVerified: (verified: boolean) => void;
  toggleDeliveryItem: (index: number) => void;
  setDeliveryPhoto: (uri: string | null) => void;
  setDeliverySigned: (signed: boolean) => void;
  completeDelivery: () => void;
  markReturnArrived: () => void;
  setReturnVerified: (verified: boolean) => void;
  toggleReturnItem: (index: number) => void;
  setReturnConditionRecorded: (recorded: boolean) => void;
  setReturnSigned: (signed: boolean) => void;
  completeReturn: () => void;
  resetFieldWorkflow: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(mockUserProfile);
  const [authRole, setAuthRole] = useState<'STAFF_DELIVERY' | 'LEADER' | null>(null);
  const [trips, setTrips] = useState<Trip[]>(mockTrips);
  const [trails, setTrails] = useState<Trail[]>(mockTrails);
  const [equipment] = useState<EquipmentItem[]>(mockEquipment);
  const [rentalOrders, setRentalOrders] = useState<RentalOrder[]>(mockRentalOrders);
  const [cart, setCart] = useState<{ item: EquipmentItem; quantity: number }[]>([]);
  const [telemetry, setTelemetry] = useState<LiveNavTelemetry>(initialLiveTelemetry);
  const [fieldWorkflow, setFieldWorkflow] = useState<FieldWorkflowState>(initialFieldWorkflow);
  const [workflowHydrated, setWorkflowHydrated] = useState(false);

  const activeTrip = trips[0]; // Tà Năng – Phan Dũng
  const activeTrail = trails[0];

  useEffect(() => {
    AsyncStorage.getItem(FIELD_WORKFLOW_STORAGE_KEY)
      .then(value => {
        if (value) {
          setFieldWorkflow({ ...initialFieldWorkflow, ...JSON.parse(value) });
        }
      })
      .catch(() => undefined)
      .finally(() => setWorkflowHydrated(true));
  }, []);

  useEffect(() => {
    if (!workflowHydrated) return;
    AsyncStorage.setItem(FIELD_WORKFLOW_STORAGE_KEY, JSON.stringify(fieldWorkflow)).catch(() => undefined);
  }, [fieldWorkflow, workflowHydrated]);

  const updateFieldWorkflow = (update: Partial<FieldWorkflowState>) => {
    setFieldWorkflow(prev => ({ ...prev, ...update, lastUpdated: new Date().toISOString() }));
  };

  const approveLeaderPretrip = () => updateFieldWorkflow({ leaderPretripApproved: true });
  const startLeaderTrip = () => updateFieldWorkflow({ leaderTripStatus: 'IN_PROGRESS' });
  const completeLeaderTrip = () => updateFieldWorkflow({ leaderTripStatus: 'COMPLETED', handoverRequested: true });
  const sendLeaderReport = () => updateFieldWorkflow({ leaderReportSent: true, handoverRequested: true });
  const setDeliveryVerified = (verified: boolean) => updateFieldWorkflow({ deliveryVerified: verified });
  const toggleDeliveryItem = (index: number) => updateFieldWorkflow({ deliveryItems: fieldWorkflow.deliveryItems.map((value, itemIndex) => itemIndex === index ? !value : value) });
  const setDeliveryPhoto = (uri: string | null) => updateFieldWorkflow({ deliveryPhotoUri: uri });
  const setDeliverySigned = (signed: boolean) => updateFieldWorkflow({ deliverySigned: signed });
  const completeDelivery = () => updateFieldWorkflow({ deliveryStatus: 'COMPLETED', returnStatus: 'PENDING', depositStatus: 'HELD' });
  const markReturnArrived = () => updateFieldWorkflow({ returnArrived: true, returnStatus: 'IN_PROGRESS' });
  const setReturnVerified = (verified: boolean) => updateFieldWorkflow({ returnVerified: verified });
  const toggleReturnItem = (index: number) => updateFieldWorkflow({ returnItems: fieldWorkflow.returnItems.map((value, itemIndex) => itemIndex === index ? !value : value) });
  const setReturnConditionRecorded = (recorded: boolean) => updateFieldWorkflow({ returnConditionRecorded: recorded });
  const setReturnSigned = (signed: boolean) => updateFieldWorkflow({ returnSigned: signed });
  const completeReturn = () => updateFieldWorkflow({ returnStatus: 'COMPLETED', depositStatus: 'PENDING_INSPECTION' });
  const resetFieldWorkflow = () => setFieldWorkflow({ ...initialFieldWorkflow, lastUpdated: new Date().toISOString() });

  const toggleUserRole = () => {
    setUser(prev => ({
      ...prev,
      role: prev.role === 'TREKKER' ? 'LEADER' : 'TREKKER',
    }));
  };

  const signInAsRole = (role: 'STAFF_DELIVERY' | 'LEADER') => {
    setAuthRole(role);
    setUser(prev => ({ ...prev, role, name: role === 'LEADER' ? 'Minh Khoa' : 'Hoàng Văn Tuấn' }));
  };

  const signOut = () => setAuthRole(null);

  const createPrivateTrip = (tripData: Partial<Trip>) => {
    const inviteCode = 'TG-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const newTrip: Trip = {
      id: `trip-private-${Date.now()}`,
      type: 'PRIVATE',
      name: tripData.name || 'Private Trekking Expedition',
      trailId: tripData.trailId || 'trail-pinhatt',
      destination: tripData.destination || 'Đà Lạt',
      startDate: tripData.startDate || '15 Tháng 11, 2026',
      endDate: tripData.endDate || '17 Tháng 11, 2026',
      durationDays: tripData.durationDays || 2,
      status: 'UPCOMING',
      leader: {
        name: `${user.name} (Host)`,
        avatar: user.avatar,
        phone: '0909 111 222',
        rating: 5.0,
        badge: 'Private Trip Host',
      },
      capacity: tripData.capacity || 8,
      enrolledCount: 1,
      inviteCode,
      weather: {
        tempC: 19,
        condition: 'Mây rải rác',
        rainRisk: false,
        rainChancePercent: 20,
        humidityPercent: 78,
        windSpeedKmh: 12,
      },
      participants: [
        { id: user.id, name: `${user.name} (Host)`, avatar: user.avatar, role: 'HOST' },
      ],
    };
    setTrips(prev => [newTrip, ...prev]);
  };

  const bookPublicTrip = (tripId: string, participantsCount: number) => {
    setTrips(prev =>
      prev.map(t => {
        if (t.id === tripId) {
          return {
            ...t,
            enrolledCount: Math.min(t.capacity, t.enrolledCount + participantsCount),
            bookingCode: t.bookingCode || `#BK-${Math.floor(1000 + Math.random() * 9000)}`,
          };
        }
        return t;
      })
    );
  };

  const unlockTrail = (trailId: string) => {
    setTrails(prev =>
      prev.map(tr => (tr.id === trailId ? { ...tr, isUnlocked: true } : tr))
    );
  };

  const addToCart = (item: EquipmentItem, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(p => p.item.id === item.id);
      if (existing) {
        return prev.map(p =>
          p.item.id === item.id ? { ...p, quantity: p.quantity + quantity } : p
        );
      }
      return [...prev, { item, quantity }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(p => p.item.id !== itemId));
  };

  const checkoutRental = (tripId: string, days: number) => {
    if (cart.length === 0) return;
    const totalRentalFee = cart.reduce((sum, c) => sum + c.item.dailyRate * c.quantity * days, 0);
    const totalDeposit = cart.reduce((sum, c) => sum + c.item.deposit * c.quantity, 0);
    const newOrder: RentalOrder = {
      id: `ord-rent-${Math.floor(1000 + Math.random() * 9000)}`,
      tripId,
      tripName: trips.find(t => t.id === tripId)?.name || 'Chuyến trekking',
      items: [...cart],
      days,
      totalRentalFee,
      totalDeposit,
      totalPayment: totalRentalFee + totalDeposit,
      status: 'PAYMENT_CONFIRMED',
      createdAt: new Date().toLocaleDateString('vi-VN'),
    };
    setRentalOrders(prev => [newOrder, ...prev]);
    setCart([]);
  };

  const toggleDeviation = () => {
    setTelemetry(prev => {
      const newDeviationState = !prev.isOnRoute;
      return {
        ...prev,
        isOnRoute: newDeviationState,
        deviationMeters: newDeviationState ? 0 : 120,
        isWarningDismissed: false,
      };
    });
  };

  const dismissDeviationWarning = () => {
    setTelemetry(prev => ({
      ...prev,
      isWarningDismissed: true,
    }));
  };

  const reconnectToRoute = () => {
    setTelemetry(prev => ({
      ...prev,
      isOnRoute: true,
      deviationMeters: 0,
      isWarningDismissed: false,
    }));
  };

  const completeCheckpointMission = (checkpointId: string) => {
    setTrails(prev =>
      prev.map(tr => {
        if (tr.id === activeTrail.id) {
          const updatedCPs = tr.checkpoints.map(cp => {
            if (cp.id === checkpointId) {
              return {
                ...cp,
                status: 'COMPLETED' as const,
                mission: cp.mission ? { ...cp.mission, isDone: true } : undefined,
              };
            }
            return cp;
          });
          return { ...tr, checkpoints: updatedCPs };
        }
        return tr;
      })
    );

    setTelemetry(prev => ({
      ...prev,
      activeCheckpointsCompleted: prev.activeCheckpointsCompleted + 1,
      nextCheckpointName: 'Đỉnh 986m – Sống Lưng Khủng Long',
      nextCheckpointDistanceM: 2800,
    }));
  };

  const resolveMemberAlert = (memberId: string) => {
    setTrips(prev =>
      prev.map(t => {
        if (t.id === activeTrip.id) {
          return {
            ...t,
            participants: t.participants.map(p =>
              p.id === memberId ? { ...p, isOffRoute: false, deviationMeters: 0 } : p
            ),
          };
        }
        return t;
      })
    );
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        toggleUserRole,
        authRole,
        signInAsRole,
        signOut,
        trips,
        activeTrip,
        createPrivateTrip,
        bookPublicTrip,
        trails,
        unlockTrail,
        equipment,
        rentalOrders,
        cart,
        addToCart,
        removeFromCart,
        checkoutRental,
        telemetry,
        activeTrail,
        toggleDeviation,
        dismissDeviationWarning,
        reconnectToRoute,
        completeCheckpointMission,
        resolveMemberAlert,
        fieldWorkflow,
        approveLeaderPretrip,
        startLeaderTrip,
        completeLeaderTrip,
        sendLeaderReport,
        setDeliveryVerified,
        toggleDeliveryItem,
        setDeliveryPhoto,
        setDeliverySigned,
        completeDelivery,
        markReturnArrived,
        setReturnVerified,
        toggleReturnItem,
        setReturnConditionRecorded,
        setReturnSigned,
        completeReturn,
        resetFieldWorkflow,
      }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
