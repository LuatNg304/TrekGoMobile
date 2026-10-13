import {
  initialLiveTelemetry,
  mockEquipment,
  mockRentalOrders,
  mockTrails,
  mockTrips,
<<<<<<< HEAD
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
>>>>>>> Leader-Deli-UI

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
  rentalSettlements: Record<string, RentalSettlement>;
  cart: {
    item: EquipmentItem;
    quantity: number;
  }[];
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
    setUser((current) => ({
      ...current,
      role: current.role === "TREKKER" ? "LEADER" : "TREKKER",
    }));
  };

  const signInAsRole = (role: 'STAFF_DELIVERY' | 'LEADER') => {
    setAuthRole(role);
    setUser(prev => ({ ...prev, role, name: role === 'LEADER' ? 'Minh Khoa' : 'Hoàng Văn Tuấn' }));
  };

  const signOut = () => setAuthRole(null);

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
        authRole,
        signInAsRole,
        signOut,
        trips,
        activeTrip,
        createPrivateTrip,
        publishPublicTrip,
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
    throw new Error("useApp must be used within an AppProvider");
  }

  return context;
};
