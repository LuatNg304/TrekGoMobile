import {
  initialLiveTelemetry,
  mockEquipment,
  mockRentalOrders,
  mockTrails,
  mockTrips,
  mockUserProfile
} from '@/data/mockData';
import { leaderMembers } from '@/data/fieldOpsMock';
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
export type LeaderMemberAttendance = 'CHECKED_IN' | 'PENDING' | 'NO_SHOW';
export type LeaderGpsStatus = 'OK' | 'LOST';
export type DeliveryItemStatus = 'PENDING' | 'OK' | 'MISSING' | 'DAMAGED';
export interface DeliveryItemState {
  status: DeliveryItemStatus;
  note: string;
}
export interface ReturnItemState {
  status: DeliveryItemStatus;
  note: string;
}

export interface FieldWorkflowState {
  leaderTripStatus: 'PREPARING' | 'IN_PROGRESS' | 'COMPLETED';
  leaderPretripApproved: boolean;
  leaderAttendance: { memberName: string; status: LeaderMemberAttendance }[];
  requiredCheckpointIds: string[];
  completedCheckpointIds: string[];
  leaderSafetyAlert: {
    status: 'ACTIVE' | 'RESOLVED';
    selectedOption: string | null;
  };
  gpsStatus: LeaderGpsStatus;
  isOnline: boolean;
  pendingSyncCount: number;
  leaderReportSent: boolean;
  handoverRequested: boolean;
  deliveryStatus: FieldWorkflowStatus;
  packageReceived: boolean;
  arrivedAtPickup: boolean;
  deliveryVerified: boolean;
  deliveryItems: DeliveryItemState[];
  deliveryPhotoUri: string | null;
  deliverySigned: boolean;
  returnStatus: FieldWorkflowStatus;
  returnArrived: boolean;
  returnVerified: boolean;
  returnItems: ReturnItemState[];
  returnConditionRecorded: boolean;
  returnSigned: boolean;
  depositStatus: 'HELD' | 'PENDING_INSPECTION' | 'REFUNDED';
  lastUpdated: string;
}

const FIELD_WORKFLOW_STORAGE_KEY = 'trekgo.field-workflow.v1';

const initialFieldWorkflow: FieldWorkflowState = {
  leaderTripStatus: 'PREPARING',
  leaderPretripApproved: false,
  leaderAttendance: leaderMembers.map(member => ({
    memberName: member.name,
    status: member.status === 'Đã check-in' ? 'CHECKED_IN' : 'PENDING',
  })),
  requiredCheckpointIds: mockTrails[0].checkpoints.map(checkpoint => checkpoint.id),
  completedCheckpointIds: [],
  leaderSafetyAlert: { status: 'ACTIVE', selectedOption: null },
  gpsStatus: 'OK',
  isOnline: true,
  pendingSyncCount: 0,
  leaderReportSent: false,
  handoverRequested: false,
  deliveryStatus: 'PENDING',
  packageReceived: false,
  arrivedAtPickup: false,
  deliveryVerified: false,
  deliveryItems: [
    { status: 'PENDING', note: '' },
    { status: 'PENDING', note: '' },
    { status: 'PENDING', note: '' },
    { status: 'PENDING', note: '' },
  ],
  deliveryPhotoUri: null,
  deliverySigned: false,
  returnStatus: 'PENDING',
  returnArrived: false,
  returnVerified: false,
  returnItems: [
    { status: 'PENDING', note: '' },
    { status: 'PENDING', note: '' },
    { status: 'PENDING', note: '' },
    { status: 'PENDING', note: '' },
  ],
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
  publishPublicTrip: (draft: { name: string; startDate: string; endDate: string; slots: number; trailId: string; checkpointIds: string[] }) => void;
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
  setLeaderMemberAttendance: (memberName: string, status: LeaderMemberAttendance) => void;
  completeLeaderCheckpoint: (checkpointId: string) => void;
  resolveLeaderSafetyAlert: (selectedOption: string) => void;
  toggleLeaderGpsStatus: () => void;
  toggleLeaderOnlineStatus: () => void;
  approveLeaderPretrip: () => void;
  startLeaderTrip: () => void;
  completeLeaderTrip: () => void;
  sendLeaderReport: () => void;
  receiveDeliveryPackage: (packageCode: string) => boolean;
  markArrivedAtPickup: () => void;
  setDeliveryVerified: (verified: boolean) => void;
  setDeliveryItem: (index: number, status: DeliveryItemStatus, note: string) => void;
  setDeliveryPhoto: (uri: string | null) => void;
  setDeliverySigned: (signed: boolean) => void;
  completeDelivery: () => void;
  markReturnArrived: () => void;
  setReturnVerified: (verified: boolean) => void;
  setReturnItem: (index: number, status: DeliveryItemStatus, note: string) => void;
  setReturnConditionRecorded: (recorded: boolean) => void;
  setReturnSigned: (signed: boolean) => void;
  completeReturn: () => void;
  enableReturnDemo: () => void;
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
          const stored = JSON.parse(value) as Partial<FieldWorkflowState> & { deliveryItems?: (boolean | DeliveryItemState)[]; returnItems?: (boolean | ReturnItemState)[] };
          const deliveryItems = stored.deliveryItems?.map(item => typeof item === 'boolean'
            ? { status: item ? 'OK' : 'PENDING', note: '' } as DeliveryItemState
            : item) ?? initialFieldWorkflow.deliveryItems;
          const returnItems = stored.returnItems?.map(item => typeof item === 'boolean'
            ? { status: item ? 'OK' : 'PENDING', note: '' } as ReturnItemState
            : item) ?? initialFieldWorkflow.returnItems;
          setFieldWorkflow({ ...initialFieldWorkflow, ...stored, deliveryItems, returnItems });
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
  const publishPublicTrip = (draft: { name: string; startDate: string; endDate: string; slots: number; trailId: string; checkpointIds: string[] }) => {
    const trail = trails.find(item => item.id === draft.trailId);
    if (!trail) return;
    const newTrip: Trip = {
      id: `trip-public-${Date.now()}`,
      type: 'PUBLIC',
      name: draft.name,
      trailId: trail.id,
      destination: trail.region,
      startDate: draft.startDate,
      endDate: draft.endDate,
      durationDays: 1,
      status: 'UPCOMING',
      leader: {
        name: 'Minh Khoa',
        avatar: '',
        phone: '',
        rating: 5,
        badge: 'Mountain Leader',
      },
      capacity: draft.slots,
      enrolledCount: 0,
      pricePerPerson: 0,
      bookingCode: `TG-${Date.now().toString().slice(-6)}`,
      weather: {
        tempC: 0,
        condition: 'Chưa cập nhật',
        rainRisk: false,
        rainChancePercent: 0,
        humidityPercent: 0,
        windSpeedKmh: 0,
      },
      participants: [],
    };
    setTrips(prev => [newTrip, ...prev]);
  };
  const setLeaderMemberAttendance = (memberName: string, status: LeaderMemberAttendance) => {
    setFieldWorkflow(prev => ({
      ...prev,
      leaderAttendance: prev.leaderAttendance.map(member =>
        member.memberName === memberName ? { ...member, status } : member
      ),
      lastUpdated: new Date().toISOString(),
    }));
  };
  const startLeaderTrip = () => {
    setFieldWorkflow(prev => {
      const hasPendingAttendance = prev.leaderAttendance.some(member => member.status === 'PENDING');
      const hasCheckedInMember = prev.leaderAttendance.some(member => member.status === 'CHECKED_IN');
      if (!prev.leaderPretripApproved || hasPendingAttendance || !hasCheckedInMember) return prev;
      return { ...prev, leaderTripStatus: 'IN_PROGRESS', lastUpdated: new Date().toISOString() };
    });
  };
  const completeLeaderCheckpoint = (checkpointId: string) => {
    setFieldWorkflow(prev => prev.leaderTripStatus !== 'IN_PROGRESS'
      || !prev.requiredCheckpointIds.includes(checkpointId)
      || prev.completedCheckpointIds.includes(checkpointId)
      ? prev
      : {
          ...prev,
          completedCheckpointIds: [...prev.completedCheckpointIds, checkpointId],
          lastUpdated: new Date().toISOString(),
        });
  };
  const resolveLeaderSafetyAlert = (selectedOption: string) => {
    updateFieldWorkflow({
      leaderSafetyAlert: { status: 'RESOLVED', selectedOption },
    });
  };
  const toggleLeaderGpsStatus = () => {
    setFieldWorkflow(prev => ({
      ...prev,
      gpsStatus: prev.gpsStatus === 'OK' ? 'LOST' : 'OK',
      pendingSyncCount: prev.gpsStatus === 'OK' ? prev.pendingSyncCount + 1 : prev.pendingSyncCount,
      lastUpdated: new Date().toISOString(),
    }));
  };
  const toggleLeaderOnlineStatus = () => {
    setFieldWorkflow(prev => {
      if (!prev.isOnline) {
        setTimeout(() => {
          setFieldWorkflow(current => ({
            ...current,
            pendingSyncCount: 0,
            lastUpdated: new Date().toISOString(),
          }));
        }, 1000);
      }
      return {
        ...prev,
        isOnline: !prev.isOnline,
        pendingSyncCount: prev.isOnline ? prev.pendingSyncCount + 1 : prev.pendingSyncCount,
        lastUpdated: new Date().toISOString(),
      };
    });
  };
  const completeLeaderTrip = () => {
    setFieldWorkflow(prev => {
      const hasMissingCheckpoint = prev.requiredCheckpointIds.some(id => !prev.completedCheckpointIds.includes(id));
      if (prev.leaderTripStatus !== 'IN_PROGRESS' || hasMissingCheckpoint) return prev;
      return { ...prev, leaderTripStatus: 'COMPLETED', lastUpdated: new Date().toISOString() };
    });
  };
  const sendLeaderReport = () => updateFieldWorkflow({
    leaderReportSent: true,
    handoverRequested: true,
    returnStatus: 'IN_PROGRESS',
  });
  const receiveDeliveryPackage = (packageCode: string) => {
    const readyOrder = rentalOrders.find(order => order.status === 'READY_FOR_DELIVERY');
    if (!readyOrder || packageCode !== 'PKG-7892-A') return false;
    updateFieldWorkflow({ packageReceived: true });
    return true;
  };
  const markArrivedAtPickup = () => updateFieldWorkflow({ arrivedAtPickup: true });
  const setDeliveryVerified = (verified: boolean) => updateFieldWorkflow({ deliveryVerified: verified });
  const setDeliveryItem = (index: number, status: DeliveryItemStatus, note: string) => updateFieldWorkflow({
    deliveryItems: fieldWorkflow.deliveryItems.map((item, itemIndex) => itemIndex === index ? { status, note } : item),
  });
  const setDeliveryPhoto = (uri: string | null) => updateFieldWorkflow({ deliveryPhotoUri: uri });
  const setDeliverySigned = (signed: boolean) => updateFieldWorkflow({ deliverySigned: signed });
  const completeDelivery = () => updateFieldWorkflow({ deliveryStatus: 'COMPLETED', returnStatus: 'PENDING', depositStatus: 'HELD' });
  const markReturnArrived = () => updateFieldWorkflow({ returnArrived: true, returnStatus: 'IN_PROGRESS' });
  const setReturnVerified = (verified: boolean) => updateFieldWorkflow({ returnVerified: verified });
  const setReturnItem = (index: number, status: DeliveryItemStatus, note: string) => updateFieldWorkflow({
    returnItems: fieldWorkflow.returnItems.map((item, itemIndex) => itemIndex === index ? { status, note } : item),
  });
  const setReturnConditionRecorded = (recorded: boolean) => updateFieldWorkflow({ returnConditionRecorded: recorded });
  const setReturnSigned = (signed: boolean) => updateFieldWorkflow({ returnSigned: signed });
  const completeReturn = () => updateFieldWorkflow({ returnStatus: 'COMPLETED', depositStatus: 'PENDING_INSPECTION' });
  const enableReturnDemo = () => updateFieldWorkflow({
    handoverRequested: true,
    leaderReportSent: true,
    returnStatus: 'IN_PROGRESS',
  });
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
        publishPublicTrip,
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
        setLeaderMemberAttendance,
        completeLeaderCheckpoint,
        resolveLeaderSafetyAlert,
        toggleLeaderGpsStatus,
        toggleLeaderOnlineStatus,
        approveLeaderPretrip,
        startLeaderTrip,
        completeLeaderTrip,
        sendLeaderReport,
        receiveDeliveryPackage,
        markArrivedAtPickup,
        setDeliveryVerified,
        setDeliveryItem,
        setDeliveryPhoto,
        setDeliverySigned,
        completeDelivery,
        markReturnArrived,
        setReturnVerified,
        setReturnItem,
        setReturnConditionRecorded,
        setReturnSigned,
        completeReturn,
        enableReturnDemo,
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
