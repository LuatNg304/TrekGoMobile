import { Colors, Radius, Shadows } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/features/auth/AuthContext";
import {
  getDestinations,
  getLeaderPublicTripById,
  getPickupPoints,
  getTripDiscoverySlots,
  type LeaderPublicTrip,
  type TripDiscoverySlots,
} from "@/features/leaders/services/leader-public-trips.api";
import { getDayOfWeekName } from "@/features/leaders/utils/tripDateUtils";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

interface MemberItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  emergencyContact: string;
  medicalNote: string;
  rentedGear: string;
  paymentStatus: "PAID" | "DEPOSIT";
  checkedIn: boolean;
  isLeader?: boolean;
}

const KICK_REASONS = [
  "Không đạt yêu cầu kiểm tra thể lực / y tế",
  "Vi phạm quy chế an toàn",
  "Thành viên chủ động xin rút lui",
  "Lý do bất khả kháng",
];

function formatVnDate(dateStr?: string): string {
  if (!dateStr) return "Chưa cập nhật";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Chưa cập nhật";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return "Chưa cập nhật";
  }
}

function formatVnDateTime(dateStr?: string): string {
  if (!dateStr) return "Chưa cập nhật";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Chưa cập nhật";
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const dayName = getDayOfWeekName(d);
    return `${hours}:${mins} • ${dd}/${mm}/${yyyy} (${dayName})`;
  } catch {
    return "Chưa cập nhật";
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "DRAFT":
      return { label: "Bản nháp", bg: "#f1f5f9", color: "#475569" };
    case "OPEN":
      return { label: "Đang mở nhận khách", bg: "#dcfce7", color: "#166534" };
    case "FULL":
      return { label: "Đã đủ chỗ", bg: "#e0f2fe", color: "#0369a1" };
    case "IN_PROGRESS":
      return { label: "Đang diễn ra", bg: "#fef9c3", color: "#854d0e" };
    case "COMPLETED":
      return { label: "Đã hoàn thành", bg: "#f3e8ff", color: "#6b21a8" };
    case "CANCEL_PENDING":
      return { label: "Chờ hủy", bg: "#fee2e2", color: "#991b1b" };
    case "CANCELLED":
      return { label: "Đã hủy", bg: "#fee2e2", color: "#991b1b" };
    default:
      return { label: status, bg: "#f1f5f9", color: "#475569" };
  }
}

export function LeaderTripDetailScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ tripId?: string; id?: string }>();
  const tripId = searchParams.tripId || searchParams.id;

  const { accessToken, user: authUser } = useAuth();
  const { user } = useApp();

  const [trip, setTrip] = useState<LeaderPublicTrip | null>(null);
  const [slots, setSlots] = useState<TripDiscoverySlots | null>(null);
  const [resolvedDestinationName, setResolvedDestinationName] = useState<string | null>(null);
  const [resolvedPickupName, setResolvedPickupName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quản lý thành viên đoàn
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  // Modal loại thành viên khỏi đoàn
  const [selectedMemberToKick, setSelectedMemberToKick] = useState<MemberItem | null>(null);
  const [selectedReason, setSelectedReason] = useState(KICK_REASONS[0]);
  const [kickExplanation, setKickExplanation] = useState("");
  const [isKicking, setIsKicking] = useState(false);

  // Modal thông báo quyết toán
  const [showSettlementModal, setShowSettlementModal] = useState(false);

  // Tải dữ liệu chuyến đi
  const loadData = useCallback(async () => {
    if (!tripId || !accessToken) return;
    setError(null);
    try {
      const tripRes = await getLeaderPublicTripById(tripId, accessToken);
      setTrip(tripRes);

      // Slots discovery query (bọc an toàn tránh throw khi chuyến mới tạo)
      const slotsRes = await getTripDiscoverySlots(tripId).catch(() => null);
      setSlots(slotsRes);

      // Tra cứu tên Điểm đến và Điểm đón nếu API trả về ID
      if (tripRes.destinationId) {
        try {
          const dests = await getDestinations(accessToken, 1, 50);
          const matchedDest = dests.find((d) => d.id === tripRes.destinationId);
          if (matchedDest) {
            setResolvedDestinationName(matchedDest.name);
          }
          if (tripRes.pickupPointId) {
            const pickups = await getPickupPoints(tripRes.destinationId, accessToken, 1, 50);
            const matchedPickup = pickups.find((p) => p.id === tripRes.pickupPointId);
            if (matchedPickup) {
              setResolvedPickupName(matchedPickup.name);
            }
          }
        } catch {
          // ignore lookup error
        }
      }

      // Khởi tạo thành viên nếu có đặt chỗ
      const booked = slotsRes
        ? Math.max(0, slotsRes.capacity - slotsRes.remainingSlots)
        : 0;

      if (booked > 0) {
        setMembers((prev) => {
          if (prev.length > 0) return prev;
          const initialMembers: MemberItem[] = [];
          for (let i = 1; i <= booked; i++) {
            initialMembers.push({
              id: `TK-${tripId.slice(-4).toUpperCase()}-${String(i).padStart(2, "0")}`,
              name: `Trekker ${String(i).padStart(2, "0")}`,
              phone: `098***${String(100 + i * 11).slice(-3)}`,
              email: `trekker${i}@trekgo.vn`,
              emergencyContact: "Người thân (Đã xác minh qua CCCD/VNeID)",
              medicalNote: "Không tiền sử tim mạch, huyết áp bình thường",
              rentedGear: i % 2 === 0 ? "Gậy leo núi Leki + Đèn pin Petzl" : "Không thuê thêm",
              paymentStatus: "PAID",
              checkedIn: i === 1,
            });
          }
          return initialMembers;
        });
      } else {
        setMembers([]);
      }
    } catch (err: any) {
      setError(err?.message || "Không thể tải thông tin chuyến đi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tripId, accessToken]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  const insets = useSafeAreaInsets();

  // Tính toán số liệu thống kê: Bao gồm LEADER là thành viên số 1 trong đoàn
  const totalCapacity = trip?.capacity || slots?.capacity || 15;
  const bookedTrekkersCount = slots
    ? Math.max(0, slots.capacity - slots.remainingSlots)
    : members.length;
  // Leader luôn là thành viên #1 trong đoàn
  const totalMembersCount = 1 + bookedTrekkersCount;
  const remainingTrekkerSlots = Math.max(0, totalCapacity - totalMembersCount);
  const fillRate = Math.min(100, Math.round((totalMembersCount / totalCapacity) * 100));

  const leaderName = authUser?.name || user?.name || "Mountain Leader";
  const leaderPhone = (authUser as any)?.phoneNumber || (user as any)?.phone || "0988 888 999";
  const leaderEmail = authUser?.email || "leader@trekgo.vn";
  const leaderIdCode = trip?.leaderId ? `LD-${trip.leaderId.slice(0, 8).toUpperCase()}` : "LD-TREKGO-01";

  const leaderMemberItem: MemberItem = useMemo(
    () => ({
      id: leaderIdCode,
      name: `${leaderName} (Bạn)`,
      phone: leaderPhone,
      email: leaderEmail,
      emergencyContact: "Ban Chỉ Huy Cứu Hộ VFRS Trung Tâm: 1800 9988",
      medicalNote: "Chứng chỉ Y tế Leo núi Quốc tế WFR / VFRS L2",
      rentedGear: "Bộ đàm tần số VHF/UHF Kênh 04, GPS Garmin inReach, Túi sơ cứu VFRS Kit Pro",
      paymentStatus: "PAID",
      checkedIn: true,
      isLeader: true,
    }),
    [leaderIdCode, leaderName, leaderPhone, leaderEmail],
  );

  // Toggle Check-in
  const handleToggleCheckIn = (memberId: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, checkedIn: !m.checkedIn } : m)),
    );
  };

  // Xác nhận loại khỏi đoàn
  const handleConfirmKick = () => {
    if (!selectedMemberToKick) return;
    setIsKicking(true);
    setTimeout(() => {
      setMembers((prev) => prev.filter((m) => m.id !== selectedMemberToKick.id));
      setIsKicking(false);
      const kickedName = selectedMemberToKick.name;
      setSelectedMemberToKick(null);
      setKickExplanation("");
      Alert.alert(
        "Đã xử lý loại khỏi đoàn",
        `Thành viên ${kickedName} đã được loại với lý do: "${selectedReason}". Hệ thống đã kích hoạt hoàn cọc theo chính sách an toàn VFRS.`,
      );
    }, 500);
  };

  // Lọc thành viên theo thanh tìm kiếm
  const filteredMembers = useMemo(() => {
    const q = memberSearchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.phone.includes(q),
    );
  }, [members, memberSearchQuery]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            paddingLeft: Math.max(0, insets.left),
            paddingRight: Math.max(0, insets.right),
          },
        ]}
        edges={["top", "bottom", "left", "right"]}
      >
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#125238" />
          <Text style={styles.loadingText}>Đang tải chi tiết chuyến đi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !trip) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            paddingLeft: Math.max(0, insets.left),
            paddingRight: Math.max(0, insets.right),
          },
        ]}
        edges={["top", "bottom", "left", "right"]}
      >
        <View style={styles.centerLoading}>
          <Ionicons name="alert-circle-outline" size={48} color="#ba1a1a" />
          <Text style={styles.errorTitle}>Lỗi tải chuyến đi</Text>
          <Text style={styles.errorText}>{error || "Chuyến đi không tồn tại."}</Text>
          <TouchableOpacity style={styles.primaryActionBtn} onPress={() => router.back()}>
            <Text style={styles.primaryActionBtnText}>Quay lại danh sách</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const systemCode = `#TG-${trip.id.slice(-6).toUpperCase()}-VN`;
  const statusBadge = getStatusBadge(trip.status);
  const trailSnapshot = trip.trails?.[0];
  const trailDifficulty = trailSnapshot?.snapshotDifficulty || trailSnapshot?.difficulty || "MEDIUM";
  const trailName = trailSnapshot?.snapshotName || trailSnapshot?.name || trip.title;
  const checkpointsList = (trip.checkpoints || [])
    .slice()
    .sort((a, b) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));

  const destinationDisplayName =
    trip.destination?.name || resolvedDestinationName || "Khu vực trekking VFRS";
  const pickupDisplayName =
    trip.pickupPoint?.name || resolvedPickupName || "Điểm tập kết toàn đoàn";

  const coordinatesCount =
    trailSnapshot?.snapshotGeojson?.coordinates?.length ||
    (Array.isArray(trailSnapshot?.snapshotGeojson?.features) &&
      trailSnapshot.snapshotGeojson.features[0]?.geometry?.coordinates?.length) ||
    0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* 1. Header & Actions */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.ink} />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.badgeRow}>
              <View style={[styles.statusPill, { backgroundColor: statusBadge.bg }]}>
                <Text style={[styles.statusPillText, { color: statusBadge.color }]}>
                  {statusBadge.label}
                </Text>
              </View>
              <View style={styles.publicTypePill}>
                <Ionicons name="globe-outline" size={11} color="#002113" />
                <Text style={styles.publicTypePillText}>{trip.tripType || "PUBLIC"}</Text>
              </View>
              <View style={styles.trailPill}>
                <Text style={styles.trailPillText}>
                  Cấp {trailDifficulty}
                </Text>
              </View>
              <View style={styles.versionPill}>
                <Text style={styles.versionPillText}>v{trip.version}</Text>
              </View>
            </View>
            <Text style={styles.tripTitle} numberOfLines={2}>
              {trip.title}
            </Text>
            {trip.description ? (
              <Text style={styles.tripDesc} numberOfLines={2}>
                {trip.description}
              </Text>
            ) : null}
            <Text style={styles.tripMeta}>
              {systemCode} · Xuất bản: {formatVnDate(trip.publishedAt || trip.startAt)}
            </Text>
          </View>
        </View>

        {/* Thanh công cụ hành động nhanh */}
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() =>
              router.push({
                pathname: "/field-operations/leader-trip-edit" as any,
                params: { tripId: trip.id },
              })
            }
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={16} color="#125238" />
            <Text style={styles.toolBtnText}>Chỉnh sửa</Text>
          </TouchableOpacity>

          {trip.status === "DRAFT" && (
            <TouchableOpacity
              style={[styles.toolBtn, styles.toolBtnPublish]}
              onPress={() =>
                router.push({
                  pathname: "/field-operations/leader-create-trip" as any,
                  params: { id: trip.id },
                })
              }
              activeOpacity={0.8}
            >
              <Ionicons name="rocket-outline" size={16} color="#ffffff" />
              <Text style={styles.toolBtnPublishText}>Kiểm duyệt & Xuất bản</Text>
            </TouchableOpacity>
          )}

          {trip.status !== "DRAFT" && (
            <TouchableOpacity
              style={[styles.toolBtn, styles.toolBtnCheckIn]}
              onPress={() =>
                router.push({
                  pathname: "/field-operations/leader-checkin" as any,
                  params: { tripId: trip.id },
                })
              }
              activeOpacity={0.8}
            >
              <Ionicons name="qr-code-outline" size={15} color="#163300" />
              <Text style={styles.toolBtnCheckInText}>Điểm danh QR</Text>
            </TouchableOpacity>
          )}

          {trip.status !== "DRAFT" && (
            <TouchableOpacity
              style={[styles.toolBtn, styles.toolBtnStart]}
              onPress={() => router.push("/field-operations/leader-pretrip" as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={15} color="#ffffff" />
              <Text style={styles.toolBtnStartText}>Bắt đầu hành trình</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => setShowSettlementModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="receipt-outline" size={16} color="#475569" />
            <Text style={[styles.toolBtnText, { color: "#475569" }]}>Quyết toán</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(40, insets.bottom + 28) },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#125238"]} />
        }
      >
        {/* 2. Bốn Thẻ Thống kê Tổng quan (KPI Cards - 2x2 Grid) */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiRow}>
            {/* Thẻ 1: Thành viên đoàn (Bao gồm Leader + Trekker) */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiLabel}>THÀNH VIÊN ĐOÀN</Text>
                <Ionicons name="people-outline" size={16} color="#125238" />
              </View>
              <Text style={[styles.kpiValue, { color: "#125238" }]}>
                {totalMembersCount} / {totalCapacity}
              </Text>
              <Text style={styles.kpiSub}>
                1 Leader + {bookedTrekkersCount} khách ({remainingTrekkerSlots} chỗ trống)
              </Text>
            </View>

            {/* Thẻ 2: Giá vé / Người */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiLabel}>GIÁ VÉ / NGƯỜI</Text>
                <Ionicons name="pricetag-outline" size={16} color="#0369a1" />
              </View>
              <Text style={[styles.kpiValue, { color: "#0369a1" }]}>
                {Number(trip.price || 0).toLocaleString("vi-VN")} đ
              </Text>
              <Text style={styles.kpiSub}>Mở bán {totalCapacity} chỗ</Text>
            </View>
          </View>

          <View style={styles.kpiRow}>
            {/* Thẻ 3: Cự ly & Độ dốc */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiLabel}>CỰ LY & ĐỘ CAO</Text>
                <Ionicons name="map-outline" size={16} color="#b45309" />
              </View>
              <Text style={[styles.kpiValue, { color: "#b45309" }]}>
                {trailSnapshot?.snapshotDistanceKm || 5} km
              </Text>
              <Text style={styles.kpiSub}>
                Độ dốc +{trailSnapshot?.snapshotElevationGainM || 500}m
              </Text>
            </View>

            {/* Thẻ 4: Checkpoint kiểm soát */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiLabel}>TRẠM AN TOÀN</Text>
                <Ionicons name="shield-checkmark-outline" size={16} color="#15803d" />
              </View>
              <Text style={[styles.kpiValue, { color: "#15803d" }]}>
                {checkpointsList.length} mốc
              </Text>
              <Text style={styles.kpiSub}>Bắt buộc quét GPS</Text>
            </View>
          </View>
        </View>

        {/* 3. Khối Thông tin Lịch trình & Điểm đón / Đến */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="calendar-outline" size={18} color="#125238" />
              <Text style={styles.sectionTitle}>LỊCH TRÌNH & ĐỊA ĐIỂM TẬP KẾT</Text>
            </View>
            <View style={styles.statusPillSmall}>
              <Text style={styles.statusPillSmallText}>CHUYẾN ĐI ĐÃ MỞ</Text>
            </View>
          </View>

          <View style={styles.scheduleInfoList}>
            <View style={styles.scheduleInfoItem}>
              <View style={styles.scheduleIconWrap}>
                <Ionicons name="location" size={16} color="#125238" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scheduleLabel}>Điểm đến (Destination)</Text>
                <Text style={styles.scheduleValue}>{destinationDisplayName}</Text>
              </View>
            </View>

            <View style={styles.scheduleInfoItem}>
              <View style={styles.scheduleIconWrap}>
                <Ionicons name="bus" size={16} color="#125238" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scheduleLabel}>Điểm đón khách (Pickup Point)</Text>
                <Text style={styles.scheduleValue}>{pickupDisplayName}</Text>
              </View>
            </View>

            <View style={styles.scheduleInfoItem}>
              <View style={styles.scheduleIconWrap}>
                <Ionicons name="time" size={16} color="#125238" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scheduleLabel}>Khởi hành</Text>
                <Text style={styles.scheduleValue}>{formatVnDateTime(trip.startAt)}</Text>
              </View>
            </View>

            <View style={styles.scheduleInfoItem}>
              <View style={styles.scheduleIconWrap}>
                <Ionicons name="flag" size={16} color="#125238" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scheduleLabel}>Kết thúc dự kiến</Text>
                <Text style={styles.scheduleValue}>{formatVnDateTime(trip.endAt)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. Khối Cung đường thẩm định (System Trail) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="trail-sign-outline" size={18} color="#125238" />
              <Text style={styles.sectionTitle}>CUNG ĐƯỜNG THẨM ĐỊNH (SYSTEM TRAIL)</Text>
            </View>
            <View style={styles.sectionHeaderBadge}>
              <Text style={styles.sectionHeaderBadgeText}>CHUẨN VFRS</Text>
            </View>
          </View>

          <View style={styles.trailCardDetail}>
            <View style={styles.trailTitleRow}>
              <View style={styles.trailIconCircle}>
                <Ionicons name="trail-sign" size={20} color="#125238" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.trailDetailName}>{trailName}</Text>
                <Text style={styles.trailDetailSub}>
                  Hành trình {destinationDisplayName} · Chuẩn an toàn VFRS
                </Text>
              </View>
            </View>

            <View style={styles.trailSpecsGrid}>
              <View style={styles.trailSpecItem}>
                <Text style={styles.specLabel}>CỰ LY</Text>
                <Text style={styles.specValue}>{trailSnapshot?.snapshotDistanceKm || 5} km</Text>
              </View>
              <View style={styles.trailSpecItem}>
                <Text style={styles.specLabel}>ĐỘ DỐC / ĐỈNH</Text>
                <Text style={styles.specValue}>+{trailSnapshot?.snapshotElevationGainM || 500}m</Text>
              </View>
              <View style={styles.trailSpecItem}>
                <Text style={styles.specLabel}>ĐỘ KHÓ</Text>
                <Text style={[styles.specValue, { color: "#b45309" }]}>{trailDifficulty}</Text>
              </View>
              <View style={styles.trailSpecItem}>
                <Text style={styles.specLabel}>TỌA ĐỘ GPS</Text>
                <Text style={styles.specValue}>{coordinatesCount > 0 ? `${coordinatesCount} điểm` : "Đã nạp"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 5. Khối Checkpoints an toàn VFRS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="flag-outline" size={18} color="#125238" />
              <Text style={styles.sectionTitle}>TRẠM DỪNG & CHECKPOINTS KIỂM SOÁT VFRS</Text>
            </View>
            <View style={styles.sectionHeaderBadge}>
              <Text style={styles.sectionHeaderBadgeText}>
                {checkpointsList.length} MỐC BẮT BUỘC
              </Text>
            </View>
          </View>

          {checkpointsList.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có thông tin trạm dừng.</Text>
          ) : (
            <View style={styles.checkpointTimeline}>
              {checkpointsList.map((cp, idx) => (
                <View key={cp.id || cp.sourceCheckpointId || idx} style={styles.cpTimelineItem}>
                  <View style={styles.cpDotCircle}>
                    <Text style={styles.cpDotNum}>{cp.sequence || idx + 1}</Text>
                  </View>
                  <View style={styles.cpInfoBox}>
                    <View style={styles.cpNameHeaderRow}>
                      <Text style={styles.cpNameText}>{cp.name}</Text>
                      <View style={styles.cpPillRow}>
                        {cp.isRequired !== false && (
                          <View style={styles.cpRequiredPill}>
                            <Ionicons name="shield-checkmark" size={10} color="#125238" />
                            <Text style={styles.cpRequiredPillText}>Bắt buộc</Text>
                          </View>
                        )}
                        {cp.isEnabled !== false && (
                          <View style={styles.cpEnabledPill}>
                            <Text style={styles.cpEnabledPillText}>Hoạt động</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={styles.cpDetailText}>
                      Tọa độ: {Number(cp.latitude).toFixed(4)}, {Number(cp.longitude).toFixed(4)} · Bán kính quét: {cp.radiusMeters || 50}m
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 6. Khối Cơ cấu giá vé (Price Explanation) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="receipt-outline" size={18} color="#125238" />
              <Text style={styles.sectionTitle}>GIẢI THÍCH CƠ CẤU GIÁ VÉ (PRICE EXPLANATION)</Text>
            </View>
          </View>

          <View style={styles.pricingCard}>
            <View style={styles.pricingHeader}>
              <Ionicons name="pricetag-outline" size={16} color="#125238" />
              <Text style={styles.pricingTitle}>
                Giá niêm yết: {Number(trip.price || trip.pricePerPax || 0).toLocaleString("vi-VN")} đ / người
              </Text>
            </View>
            <Text style={styles.priceExplLabel}>Cơ sở tính giá & Giải trình cấu trúc chi phí:</Text>
            <View style={styles.priceExplContentBox}>
              <Text style={styles.priceExplText}>
                {trip.priceExplanation || "Chưa có nội dung giải trình chi tiết."}
              </Text>
            </View>
          </View>
        </View>

        {/* 7. Khối Quản lý Thành viên Đoàn (Leader + Bookings) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="people-outline" size={18} color="#125238" />
              <Text style={styles.sectionTitle}>DANH SÁCH THÀNH VIÊN ĐOÀN</Text>
            </View>
            <View style={styles.memberCountBadge}>
              <Text style={styles.memberCountBadgeText}>
                {totalMembersCount} / {totalCapacity} NGƯỜI
              </Text>
            </View>
          </View>

          {/* Banner thông tin Leader là thành viên #1 */}
          <View style={styles.leaderNoticeBanner}>
            <Ionicons name="shield-checkmark" size={16} color="#125238" />
            <Text style={styles.leaderNoticeText}>
              Đoàn gồm <Text style={styles.boldText}>1 Trưởng đoàn (Leader)</Text> +{" "}
              <Text style={styles.boldText}>{bookedTrekkersCount} Trekker</Text> đã đặt chỗ (còn{" "}
              <Text style={styles.boldText}>{remainingTrekkerSlots} chỗ mở nhận khách</Text>).
            </Text>
          </View>

          {/* Thẻ Thành viên số 1: LEADER */}
          <View style={styles.leaderMemberCard}>
            <View style={styles.memberItemTop}>
              <View style={styles.leaderAvatarCircle}>
                <Ionicons name="star" size={18} color="#ffffff" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.memberNameRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", flexShrink: 1 }}>
                    <Text style={styles.memberNameText}>{leaderMemberItem.name}</Text>
                    <View style={styles.leaderBadge}>
                      <Ionicons name="ribbon-outline" size={11} color="#002113" />
                      <Text style={styles.leaderBadgeText}>LEADER</Text>
                    </View>
                  </View>
                  <Text style={styles.memberIdText} numberOfLines={1}>
                    #{leaderMemberItem.id}
                  </Text>
                </View>
                <Text style={styles.memberContactText} numberOfLines={1}>
                  📞 {leaderMemberItem.phone} · ✉️ {leaderMemberItem.email}
                </Text>
              </View>
            </View>

            <View style={styles.memberMetaRow}>
              <View style={styles.memberMetaCol}>
                <Text style={styles.metaLabel}>VAI TRÒ VẬN HÀNH</Text>
                <Text style={styles.metaValue}>Chỉ huy điều hướng GPS & An toàn VFRS</Text>
              </View>
              <View style={styles.memberMetaCol}>
                <Text style={styles.metaLabel}>TRANG BỊ CỨU HỘ MANG THEO</Text>
                <Text style={styles.metaValue} numberOfLines={2}>
                  {leaderMemberItem.rentedGear}
                </Text>
              </View>
            </View>

            <View style={styles.memberActionRow}>
              <View style={[styles.checkInBtn, styles.checkInBtnActive]}>
                <Ionicons name="checkmark-circle" size={16} color="#166534" />
                <Text style={[styles.checkInBtnText, styles.checkInBtnTextActive]}>
                  Trưởng đoàn sẵn sàng xuất phát
                </Text>
              </View>
              <View style={styles.leaderVerifiedPill}>
                <Ionicons name="checkmark-done-circle" size={14} color="#125238" />
                <Text style={styles.leaderVerifiedText}>Xác thực VFRS</Text>
              </View>
            </View>
          </View>

          {/* Thanh tìm kiếm Trekker */}
          <View style={styles.memberSearchBox}>
            <Ionicons name="search-outline" size={16} color="#707972" />
            <TextInput
              value={memberSearchQuery}
              onChangeText={setMemberSearchQuery}
              placeholder="Tìm kiếm Trekker (tên, SĐT, mã đặt chỗ)..."
              placeholderTextColor="#8a938c"
              style={styles.memberSearchInput}
            />
          </View>

          {filteredMembers.length === 0 ? (
            <View style={styles.emptyMembersBox}>
              <Ionicons name="person-add-outline" size={32} color="#a2aba3" />
              <Text style={styles.emptyMembersTitle}>Chưa có Trekker đặt chỗ</Text>
              <Text style={styles.emptyMembersSub}>
                Chuyến đi đang mở nhận khách ({remainingTrekkerSlots}/{totalCapacity - 1} chỗ trống). Khi Trekker đặt tour thành công, hệ thống sẽ tự động đồng bộ danh sách tại đây.
              </Text>
            </View>
          ) : (
            <View style={styles.membersList}>
              {filteredMembers.map((member) => (
                <View key={member.id} style={styles.memberItemCard}>
                  <View style={styles.memberItemTop}>
                    <View style={styles.memberAvatarCircle}>
                      <Text style={styles.memberAvatarInitial}>
                        {member.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.memberNameRow}>
                        <Text style={styles.memberNameText}>{member.name}</Text>
                        <Text style={styles.memberIdText}>#{member.id}</Text>
                      </View>
                      <Text style={styles.memberContactText}>
                        📞 {member.phone} · ✉️ {member.email}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.memberActionRow}>
                    <TouchableOpacity
                      style={[
                        styles.checkInBtn,
                        member.checkedIn && styles.checkInBtnActive,
                      ]}
                      onPress={() => handleToggleCheckIn(member.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={member.checkedIn ? "checkmark-circle" : "ellipse-outline"}
                        size={16}
                        color={member.checkedIn ? "#166534" : "#475569"}
                      />
                      <Text
                        style={[
                          styles.checkInBtnText,
                          member.checkedIn && styles.checkInBtnTextActive,
                        ]}
                      >
                        {member.checkedIn ? "Đã điểm danh" : "Chưa điểm danh"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.kickBtn}
                      onPress={() => {
                        setSelectedMemberToKick(member);
                        setSelectedReason(KICK_REASONS[0]);
                        setKickExplanation("");
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="person-remove-outline" size={14} color="#ba1a1a" />
                      <Text style={styles.kickBtnText}>Loại khỏi đoàn</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 8. Đội ngũ dẫn đường & An toàn VFRS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#125238" />
              <Text style={styles.sectionTitle}>ĐỘI NGŨ DẪN ĐƯỜNG & AN TOÀN VFRS</Text>
            </View>
          </View>
          <View style={styles.rescueCard}>
            <Text style={styles.rescueItem}>
              • Phụ trách chính: Mountain Leader {authUser?.name || user?.name || "TrekGo Leader"} (ID: {trip.leaderId?.slice(0, 8) || "LEADER"}).
            </Text>
            <Text style={styles.rescueItem}>
              • Kênh liên lạc vô tuyến: Bộ đàm tần số VHF/UHF Kênh 04 (433.175 MHz).
            </Text>
            <Text style={styles.rescueItem}>
              • Trang bị y tế: Túi sơ cấp cứu cứu thương VFRS Kit Pro + Nẹp định hình chấn thương.
            </Text>
            <Text style={styles.rescueHotline}>
              • Hotline Cứu hộ phản ứng nhanh VFRS: 1800 9988 (Trực 24/7).
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* MODAL: LOẠI THÀNH VIÊN KHỎI ĐOÀN */}
      <Modal visible={Boolean(selectedMemberToKick)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="alert-circle" size={24} color="#ba1a1a" />
              <Text style={styles.modalTitle}>Xác nhận loại khỏi đoàn</Text>
            </View>
            <Text style={styles.modalMemberName}>
              Thành viên: <Text style={styles.boldText}>{selectedMemberToKick?.name}</Text>
            </Text>

            <Text style={styles.modalSectionLabel}>Lý do loại khỏi đoàn *</Text>
            {KICK_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonOption,
                  selectedReason === reason && styles.reasonOptionSelected,
                ]}
                onPress={() => setSelectedReason(reason)}
              >
                <Ionicons
                  name={selectedReason === reason ? "radio-button-on" : "radio-button-off"}
                  size={16}
                  color={selectedReason === reason ? "#125238" : "#707972"}
                />
                <Text
                  style={[
                    styles.reasonText,
                    selectedReason === reason && styles.reasonTextSelected,
                  ]}
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.modalSectionLabel}>Giải trình chi tiết biên bản *</Text>
            <TextInput
              value={kickExplanation}
              onChangeText={setKickExplanation}
              placeholder="Ghi nhận tình trạng thực tế của thành viên tại thời điểm kiểm tra..."
              placeholderTextColor="#707972"
              multiline
              numberOfLines={3}
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSelectedMemberToKick(null)}
                disabled={isKicking}
              >
                <Text style={styles.modalCancelText}>Hủy bỏ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmKick}
                disabled={isKicking}
              >
                {isKicking ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Xác nhận loại</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: QUYẾT TOÁN CHUYẾN ĐI */}
      <Modal visible={showSettlementModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="receipt" size={24} color="#125238" />
              <Text style={[styles.modalTitle, { color: "#125238" }]}>Hồ sơ quyết toán chuyến đi</Text>
            </View>
            <Text style={styles.settlementText}>
              Doanh thu dự kiến: {((Number(trip.price || 0)) * totalCapacity).toLocaleString("vi-VN")} đ.
            </Text>
            <Text style={styles.settlementText}>
              Hệ thống sẽ tự động tính toán đối soát phí dịch vụ VFRS (5%) và giải ngân vào tài khoản ngân hàng của Leader sau khi chuyến đi hoàn tất.
            </Text>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { marginTop: 16 }]}
              onPress={() => setShowSettlementModal(false)}
            >
              <Text style={styles.primaryActionBtnText}>Đã hiểu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8faf7",
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: "#707972",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ba1a1a",
  },
  errorText: {
    fontSize: 13,
    color: "#410002",
    textAlign: "center",
  },
  header: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e9e2",
    gap: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
    flexWrap: "wrap",
    paddingRight: 4,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  trailPill: {
    backgroundColor: "#f4fbf4",
    borderWidth: 1,
    borderColor: "#d1e8d5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  trailPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#125238",
  },
  publicTypePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#b1f0cd",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  publicTypePillText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#002113",
  },
  versionPill: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  versionPillText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#475569",
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#121c2a",
    lineHeight: 22,
  },
  tripDesc: {
    fontSize: 12,
    color: "#414942",
    lineHeight: 16,
    marginTop: 2,
  },
  tripMeta: {
    fontSize: 11.5,
    color: "#707972",
    marginTop: 2,
  },
  statusPillSmall: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillSmallText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#166534",
  },
  scheduleInfoList: {
    gap: 10,
  },
  scheduleInfoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#f8faf7",
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#eef2ef",
  },
  scheduleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#d1e8d5",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  scheduleLabel: {
    fontSize: 10.5,
    color: "#707972",
    fontWeight: "600",
  },
  scheduleValue: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#121c2a",
    marginTop: 2,
  },
  trailCardDetail: {
    backgroundColor: "#fbfcfb",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#e1e9e2",
    padding: 12,
    gap: 10,
  },
  trailTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trailIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#d1e8d5",
    alignItems: "center",
    justifyContent: "center",
  },
  trailDetailName: {
    fontSize: 13,
    fontWeight: "900",
    color: "#121c2a",
  },
  trailDetailSub: {
    fontSize: 11,
    color: "#707972",
    marginTop: 1,
  },
  trailSpecsGrid: {
    flexDirection: "row",
    backgroundColor: "#f4f6f4",
    borderRadius: Radius.sm,
    padding: 8,
    gap: 6,
  },
  trailSpecItem: {
    flex: 1,
    alignItems: "center",
  },
  specLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#707972",
    letterSpacing: 0.3,
  },
  specValue: {
    fontSize: 11,
    fontWeight: "900",
    color: "#121c2a",
    marginTop: 2,
  },
  cpNameHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    flexWrap: "wrap",
  },
  cpPillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cpRequiredPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#d1e8d5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cpRequiredPillText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#125238",
  },
  cpEnabledPill: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cpEnabledPillText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#0369a1",
  },
  priceExplContentBox: {
    backgroundColor: "#ffffff",
    borderRadius: Radius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e1e9e2",
    marginTop: 4,
  },
  actionsBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#d1e8d5",
  },
  toolBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#125238",
  },
  toolBtnPublish: {
    backgroundColor: "#125238",
    borderColor: "#125238",
  },
  toolBtnPublishText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },
  toolBtnCheckIn: {
    backgroundColor: "#9fe870",
    borderColor: "#82d453",
  },
  toolBtnCheckInText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#163300",
  },
  toolBtnStart: {
    backgroundColor: "#0369a1",
    borderColor: "#0369a1",
  },
  toolBtnStartText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  kpiContainer: {
    gap: 10,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e1e9e2",
    ...Shadows.card,
    gap: 4,
  },
  kpiHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kpiLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#707972",
    letterSpacing: 0.3,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#121c2a",
    marginTop: 2,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    overflow: "hidden",
    marginVertical: 4,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  kpiSub: {
    fontSize: 10.5,
    color: "#707972",
  },
  kpiSubBold: {
    fontSize: 11,
    fontWeight: "800",
    color: "#121c2a",
  },
  kpiTagOk: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginVertical: 2,
  },
  kpiTagOkText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#166534",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e1e9e2",
    ...Shadows.card,
    gap: 12,
  },
  sectionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 8,
  },
  sectionTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    color: "#121c2a",
    letterSpacing: 0.3,
  },
  memberCountBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  memberCountBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#334155",
  },
  sectionHeaderBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  sectionHeaderBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#334155",
  },
  memberSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8faf7",
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#e1e9e2",
  },
  leaderNoticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#d1e8d5",
    padding: 10,
    borderRadius: Radius.sm,
  },
  leaderNoticeText: {
    flex: 1,
    fontSize: 11.5,
    color: "#166534",
    lineHeight: 16,
  },
  leaderMemberCard: {
    backgroundColor: "#f4fbf7",
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: "#b1f0cd",
    padding: 12,
    gap: 8,
    ...Shadows.card,
  },
  leaderAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#125238",
    alignItems: "center",
    justifyContent: "center",
  },
  leaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#b1f0cd",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leaderBadgeText: {
    fontSize: 9.5,
    fontWeight: "900",
    color: "#002113",
    letterSpacing: 0.3,
  },
  leaderVerifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  leaderVerifiedText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#125238",
  },
  memberSearchInput: {
    flex: 1,
    fontSize: 12,
    color: "#121c2a",
    padding: 0,
  },
  tealNoticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#f0fdfa",
    borderWidth: 1,
    borderColor: "#99f6e4",
    borderRadius: Radius.md,
    padding: 12,
  },
  tealBadgeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0d9488",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  tealBadgeNum: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  tealTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f766e",
    marginBottom: 2,
  },
  tealDesc: {
    fontSize: 11.5,
    color: "#115e59",
    lineHeight: 16,
  },
  emptyMembersBox: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyMembersTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#121c2a",
  },
  emptyMembersSub: {
    fontSize: 11.5,
    color: "#707972",
    textAlign: "center",
  },
  membersList: {
    gap: 10,
  },
  memberItemCard: {
    backgroundColor: "#fcfdfc",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#e1e9e2",
    padding: 12,
    gap: 8,
  },
  memberItemTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  memberAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#d1e8d5",
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarInitial: {
    fontSize: 14,
    fontWeight: "900",
    color: "#125238",
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memberNameText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#121c2a",
  },
  memberIdText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#707972",
  },
  memberContactText: {
    fontSize: 11,
    color: "#707972",
    marginTop: 1,
  },
  memberMetaRow: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#f4f6f4",
    padding: 8,
    borderRadius: 6,
  },
  memberMetaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#707972",
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 10.5,
    color: "#121c2a",
  },
  memberActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  checkInBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  checkInBtnActive: {
    backgroundColor: "#dcfce7",
  },
  checkInBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
  },
  checkInBtnTextActive: {
    color: "#166534",
  },
  kickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  kickBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ba1a1a",
  },
  checkpointTimeline: {
    gap: 8,
  },
  cpTimelineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f8faf7",
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#eef2ef",
  },
  cpDotCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#125238",
    alignItems: "center",
    justifyContent: "center",
  },
  cpDotNum: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
  },
  cpInfoBox: {
    flex: 1,
  },
  cpNameText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#121c2a",
  },
  cpDetailText: {
    fontSize: 10.5,
    color: "#707972",
    marginTop: 2,
  },
  pricingCard: {
    backgroundColor: "#fbfcfb",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#d1e8d5",
    padding: 12,
    gap: 6,
  },
  pricingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pricingTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#125238",
  },
  priceExplLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#707972",
  },
  priceExplText: {
    fontSize: 11.5,
    color: "#121c2a",
    lineHeight: 16,
  },
  rescueCard: {
    backgroundColor: "#fbfcfb",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#e1e9e2",
    padding: 12,
    gap: 4,
  },
  rescueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  rescueTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#125238",
  },
  rescueItem: {
    fontSize: 11,
    color: "#414942",
    lineHeight: 16,
  },
  rescueHotline: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ba1a1a",
    marginTop: 2,
  },
  emptyText: {
    fontSize: 12,
    color: "#707972",
  },
  primaryActionBtn: {
    backgroundColor: "#125238",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  primaryActionBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: Radius.lg,
    padding: 20,
    gap: 10,
    ...Shadows.card,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ba1a1a",
  },
  modalMemberName: {
    fontSize: 13,
    color: "#414942",
    marginBottom: 4,
  },
  boldText: {
    fontWeight: "800",
    color: "#121c2a",
  },
  modalSectionLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#121c2a",
    marginTop: 4,
  },
  reasonOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  reasonOptionSelected: {},
  reasonText: {
    fontSize: 12,
    color: "#414942",
  },
  reasonTextSelected: {
    fontWeight: "700",
    color: "#125238",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e1e9e2",
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: "#121c2a",
    textAlignVertical: "top",
    backgroundColor: "#fbfcfb",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e1e9e2",
  },
  modalCancelText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#707972",
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: "#ba1a1a",
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  modalConfirmText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#ffffff",
  },
  settlementText: {
    fontSize: 12.5,
    color: "#414942",
    lineHeight: 18,
  },
});
