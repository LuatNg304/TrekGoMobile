import { Colors, Radius, Shadows } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/features/auth/AuthContext";
import {
  getLeaderPublicTripById,
  getTripDiscoverySlots,
  type LeaderPublicTrip,
  type TripDiscoverySlots,
} from "@/features/leaders/services/leader-public-trips.api";
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
import { SafeAreaView } from "react-native-safe-area-context";

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

function getStatusBadge(status: string) {
  switch (status) {
    case "DRAFT":
      return { label: "Bản nháp", bg: "#f1f5f9", color: "#475569" };
    case "OPEN":
      return { label: "Đang mở bán", bg: "#dcfce7", color: "#166534" };
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
      const [tripRes, slotsRes] = await Promise.all([
        getLeaderPublicTripById(tripId, accessToken),
        getTripDiscoverySlots(tripId),
      ]);
      setTrip(tripRes);
      setSlots(slotsRes);

      // Tính số chỗ đã đặt
      const totalCap = tripRes.capacity || slotsRes?.capacity || 15;
      const booked = slotsRes
        ? Math.max(0, slotsRes.capacity - slotsRes.remainingSlots)
        : 0;

      // Khởi tạo danh sách thành viên mô phỏng theo số lượng đã đặt chỗ
      if (booked > 0) {
        setMembers((prev) => {
          if (prev.length > 0) return prev;
          const initialMembers: MemberItem[] = [];
          for (let i = 1; i <= booked; i++) {
            initialMembers.push({
              id: `TK-${tripId.slice(-4).toUpperCase()}-${String(i).padStart(2, "0")}`,
              name: `Trekker ${String(i).padStart(2, "0")} · ${tripRes.destination?.name || "Hội viên"}`,
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

  // Tính toán số liệu thống kê
  const totalCapacity = trip?.capacity || slots?.capacity || 15;
  const bookedCount = slots
    ? Math.max(0, slots.capacity - slots.remainingSlots)
    : members.length;
  const remainingSlots = slots ? slots.remainingSlots : Math.max(0, totalCapacity - bookedCount);
  const fillRate = Math.min(100, Math.round((bookedCount / totalCapacity) * 100));
  const checkedInCount = members.filter((m) => m.checkedIn).length;

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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#125238" />
          <Text style={styles.loadingText}>Đang tải chi tiết chuyến đi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !trip) {
    return (
      <SafeAreaView style={styles.safeArea}>
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

  const shortCode = `#${trip.id.slice(0, 8).toUpperCase()}`;
  const statusBadge = getStatusBadge(trip.status);
  const trailSnapshot = trip.trails?.[0];
  const trailDifficulty = trailSnapshot?.snapshotDifficulty || "MEDIUM";
  const trailName = trailSnapshot?.snapshotName || trailSnapshot?.name || trip.title;
  const checkpointsList = (trip.checkpoints || []).slice().sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  return (
    <SafeAreaView style={styles.safeArea}>
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
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <View style={[styles.statusPill, { backgroundColor: statusBadge.bg }]}>
                <Text style={[styles.statusPillText, { color: statusBadge.color }]}>
                  {statusBadge.label}
                </Text>
              </View>
              <View style={styles.trailPill}>
                <Text style={styles.trailPillText}>
                  Cấp {trailDifficulty} · {trailName}
                </Text>
              </View>
            </View>
            <Text style={styles.tripTitle} numberOfLines={2}>
              {trip.title}
            </Text>
            <Text style={styles.tripMeta}>
              {shortCode} · {formatVnDate(trip.startAt)} – {formatVnDate(trip.endAt)}
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
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#125238"]} />
        }
      >
        {/* 2. Bốn Thẻ Thống kê Tổng quan (KPI Cards - Grid 2x2) */}
        <View style={styles.kpiGrid}>
          {/* Thẻ 1: Đặt chỗ & Lấp đầy */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>THÀNH VIÊN ĐÃ DUYỆT</Text>
              <Ionicons name="people-outline" size={16} color="#125238" />
            </View>
            <Text style={styles.kpiValue}>
              {bookedCount} / {totalCapacity}
            </Text>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${fillRate}%`, backgroundColor: "#125238" },
                ]}
              />
            </View>
            <Text style={styles.kpiSub}>Còn {remainingSlots} chỗ trống</Text>
          </View>

          {/* Thẻ 2: Chờ duyệt */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>CHỜ DUYỆT</Text>
              <Ionicons name="time-outline" size={16} color="#d97706" />
            </View>
            <Text style={[styles.kpiValue, { color: "#d97706" }]}>0</Text>
            <View style={styles.kpiTagOk}>
              <Ionicons name="checkmark" size={12} color="#166534" />
              <Text style={styles.kpiTagOkText}>Tất cả đã xử lý</Text>
            </View>
            <Text style={styles.kpiSub}>Không có yêu cầu tồn</Text>
          </View>

          {/* Thẻ 3: Tiến độ thanh toán */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>TIẾN ĐỘ THANH TOÁN</Text>
              <Ionicons name="card-outline" size={16} color="#2563eb" />
            </View>
            <Text style={[styles.kpiValue, { color: "#2563eb" }]}>{bookedCount} vé</Text>
            <Text style={styles.kpiSubBold}>100% hoàn tất cọc</Text>
            <Text style={styles.kpiSub}>Bảo lãnh bởi TrekGo Escrow</Text>
          </View>

          {/* Thẻ 4: Check-in thực địa */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>CHECK-IN THỰC ĐỊA</Text>
              <Ionicons name="location-outline" size={16} color="#7c3aed" />
            </View>
            <Text style={[styles.kpiValue, { color: "#7c3aed" }]}>
              {checkedInCount} / {bookedCount || 0}
            </Text>
            <Text style={styles.kpiSubBold}>
              {bookedCount > 0 ? Math.round((checkedInCount / bookedCount) * 100) : 0}% tại điểm hẹn
            </Text>
            <Text style={styles.kpiSub}>Mở quét GPS trước 30p</Text>
          </View>
        </View>

        {/* 3. Khối Quản lý Thành viên Đoàn */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="id-card-outline" size={18} color="#125238" />
              <Text style={styles.sectionTitle}>DANH SÁCH THÀNH VIÊN CHÍNH THỨC</Text>
            </View>
            <View style={styles.memberCountBadge}>
              <Text style={styles.memberCountBadgeText}>
                {bookedCount} THÀNH VIÊN
              </Text>
            </View>
          </View>

          {/* Ô tìm kiếm thành viên */}
          <View style={styles.memberSearchBox}>
            <Ionicons name="search-outline" size={16} color="#707972" />
            <TextInput
              value={memberSearchQuery}
              onChangeText={setMemberSearchQuery}
              placeholder="Tìm tên, SĐT, mã Trekker..."
              placeholderTextColor="#8a938c"
              style={styles.memberSearchInput}
            />
          </View>

          {/* Khi members.length === 0 nhưng bookedCount > 0 (từ Booking discovery) */}
          {members.length === 0 && bookedCount > 0 && (
            <View style={styles.tealNoticeBox}>
              <View style={styles.tealBadgeCircle}>
                <Text style={styles.tealBadgeNum}>{bookedCount}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tealTitle}>
                  Hệ thống đã ghi nhận {bookedCount} thành viên đặt chỗ thành công
                </Text>
                <Text style={styles.tealDesc}>
                  Số lượng vé đã thanh toán được trừ trực tiếp vào số chỗ ({bookedCount}/{totalCapacity} chỗ đã đặt, còn {remainingSlots} chỗ trống).
                </Text>
              </View>
            </View>
          )}

          {/* Danh sách thành viên */}
          {filteredMembers.length === 0 && bookedCount === 0 ? (
            <View style={styles.emptyMembersBox}>
              <Ionicons name="people-outline" size={32} color="#a2aba3" />
              <Text style={styles.emptyMembersTitle}>Chưa có thành viên đặt chỗ</Text>
              <Text style={styles.emptyMembersSub}>
                Khi chuyến đi ở trạng thái Mở bán (OPEN), các đăng ký của Trekker sẽ tự động cập nhật vào đây.
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

                  {/* Thông tin y tế & thiết bị */}
                  <View style={styles.memberMetaRow}>
                    <View style={styles.memberMetaCol}>
                      <Text style={styles.metaLabel}>HỒ SƠ Y TẾ</Text>
                      <Text style={styles.metaValue}>{member.medicalNote}</Text>
                    </View>
                    <View style={styles.memberMetaCol}>
                      <Text style={styles.metaLabel}>THIẾT BỊ THUÊ</Text>
                      <Text style={styles.metaValue}>{member.rentedGear}</Text>
                    </View>
                  </View>

                  {/* Action buttons cho thành viên */}
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
                        {member.checkedIn ? "Đã check-in" : "Chưa check-in"}
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

        {/* 4. Khối Thông tin Lộ trình, Checkpoints & An toàn VFRS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="trail-sign-outline" size={18} color="#125238" />
              <Text style={styles.sectionTitle}>LỘ TRÌNH & TRẠM DỪNG CHECKPOINTS (VFRS)</Text>
            </View>
            <View style={styles.memberCountBadge}>
              <Text style={styles.memberCountBadgeText}>
                {checkpointsList.length} MỐC
              </Text>
            </View>
          </View>

          {checkpointsList.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có thông tin trạm dừng.</Text>
          ) : (
            <View style={styles.checkpointTimeline}>
              {checkpointsList.map((cp, idx) => (
                <View key={cp.id || idx} style={styles.cpTimelineItem}>
                  <View style={styles.cpDotCircle}>
                    <Text style={styles.cpDotNum}>{cp.sequence || idx + 1}</Text>
                  </View>
                  <View style={styles.cpInfoBox}>
                    <Text style={styles.cpNameText}>{cp.name}</Text>
                    <Text style={styles.cpDetailText}>
                      Tọa độ: {Number(cp.latitude).toFixed(4)}, {Number(cp.longitude).toFixed(4)} · Bán kính quét: {cp.radiusMeters || 50}m
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Cơ cấu giá vé nội bộ */}
          <View style={styles.pricingCard}>
            <View style={styles.pricingHeader}>
              <Ionicons name="pricetag-outline" size={16} color="#125238" />
              <Text style={styles.pricingTitle}>
                Giá tour: {Number(trip.price || trip.pricePerPax || 0).toLocaleString("vi-VN")} VND / người
              </Text>
            </View>
            <Text style={styles.priceExplLabel}>Cơ sở tính giá & Giải trình chi phí nội bộ:</Text>
            <Text style={styles.priceExplText}>
              {trip.priceExplanation || "Chưa có nội dung giải trình chi tiết."}
            </Text>
          </View>

          {/* Đội ngũ dẫn đường & Cứu hộ */}
          <View style={styles.rescueCard}>
            <View style={styles.rescueHeader}>
              <Ionicons name="shield-checkmark" size={16} color="#125238" />
              <Text style={styles.rescueTitle}>Đội ngũ dẫn đường & Kế hoạch cứu hộ sơ bộ</Text>
            </View>
            <Text style={styles.rescueItem}>
              • Phụ trách chính: Mountain Leader {authUser?.name || user?.name || "TrekGo Leader"} (Chứng chỉ VFRS Cấp 2).
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
    gap: 6,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  trailPill: {
    backgroundColor: "#f4fbf4",
    borderWidth: 1,
    borderColor: "#d1e8d5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trailPillText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#125238",
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#121c2a",
    lineHeight: 22,
  },
  tripMeta: {
    fontSize: 11.5,
    color: "#707972",
    marginTop: 2,
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
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  kpiCard: {
    width: "48%",
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
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: "900",
    color: "#121c2a",
    letterSpacing: 0.5,
  },
  memberCountBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  memberCountBadgeText: {
    fontSize: 10,
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
