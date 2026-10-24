import { Colors, Radius, Shadows } from "@/constants/theme";
import { useAuth } from "@/features/auth/AuthContext";
import {
  CheckInScannerModal,
  type ScanResult,
} from "@/features/check-in/components/CheckInScannerModal";
import {
  buildShortCode,
  formatDayMonth,
  getCheckInWindow,
  parseCheckInQrValue,
} from "@/features/check-in/utils/checkInQr";
import {
  getLeaderPublicTripById,
  getTripDiscoverySlots,
  type LeaderPublicTrip,
} from "@/features/leaders/services/leader-public-trips.api";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AttendanceStatus = "PENDING" | "CHECKED_IN" | "NO_SHOW";
type Filter = "ALL" | AttendanceStatus;

interface CheckInMember {
  participantId: string;
  bookingId: string;
  name: string;
  phone: string;
  shortCode: string;
  status: AttendanceStatus;
  checkedAt?: Date;
  method?: "QR" | "MANUAL";
}

const DEMO_NAMES = [
  "Nguyễn Minh Anh",
  "Trần Quốc Bảo",
  "Lê Thu Hà",
  "Phạm Gia Huy",
  "Võ Ngọc Lan",
  "Đặng Hoàng Long",
  "Bùi Khánh Linh",
  "Hoàng Đức Thịnh",
  "Đỗ Phương Thảo",
  "Huỳnh Tấn Phát",
];

/**
 * TODO(backend): thay thế bằng API lấy danh sách participants của trip
 * (VD: GET /api/v1/leaders/me/trips/{tripId}/participants) và
 * POST check-in khi quét thành công.
 */
function buildMockMembers(tripId: string, count: number): CheckInMember[] {
  return Array.from({ length: count }, (_, i) => {
    const bookingId = `bk${tripId.slice(-4)}${Math.floor(i / 2)}`;
    const participantId = `${tripId}-mock-${i + 1}`;
    return {
      participantId,
      bookingId,
      name: DEMO_NAMES[i % DEMO_NAMES.length],
      phone: `098${i} *** ${String(100 + i * 37).slice(-3)}`,
      shortCode: buildShortCode(bookingId, participantId),
      status: "PENDING",
    };
  });
}

function formatTime(d?: Date) {
  if (!d) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatStart(dateStr?: string) {
  if (!dateStr) return "Chưa cập nhật";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Chưa cập nhật";
  return `${formatTime(d)} · ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function LeaderCheckInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tripId?: string }>();
  const tripId = params.tripId || "";
  const { accessToken } = useAuth();

  const [trip, setTrip] = useState<LeaderPublicTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<CheckInMember[]>([]);
  const [isDemoData, setIsDemoData] = useState(false);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [devUnlocked, setDevUnlocked] = useState(false);

  const load = useCallback(async () => {
    if (!tripId) {
      setMembers(buildMockMembers("demo-trip", 6));
      setIsDemoData(true);
      setLoading(false);
      return;
    }
    try {
      const [tripRes, slotsRes] = await Promise.all([
        accessToken ? getLeaderPublicTripById(tripId, accessToken).catch(() => null) : Promise.resolve(null),
        getTripDiscoverySlots(tripId).catch(() => null),
      ]);
      setTrip(tripRes);
      const booked = slotsRes ? Math.max(0, slotsRes.capacity - slotsRes.remainingSlots) : 0;
      if (booked > 0) {
        setMembers(buildMockMembers(tripId, booked));
        setIsDemoData(false);
      } else {
        setMembers(buildMockMembers(tripId, 6));
        setIsDemoData(true);
      }
    } finally {
      setLoading(false);
    }
  }, [tripId, accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const checkInWindow = getCheckInWindow(trip?.startAt, trip?.endAt);
  const canOperate = checkInWindow.isOpen || devUnlocked || !trip;

  const stats = useMemo(() => {
    const checked = members.filter((m) => m.status === "CHECKED_IN").length;
    const noShow = members.filter((m) => m.status === "NO_SHOW").length;
    const pending = members.length - checked - noShow;
    return { checked, noShow, pending, total: members.length };
  }, [members]);

  const progressPct = stats.total ? Math.round((stats.checked / stats.total) * 100) : 0;

  const visibleMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => filter === "ALL" || m.status === filter)
      .filter(
        (m) =>
          !q ||
          m.name.toLowerCase().includes(q) ||
          m.shortCode.toLowerCase().includes(q) ||
          m.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")),
      )
      .sort((a, b) => {
        const order = { PENDING: 0, NO_SHOW: 1, CHECKED_IN: 2 } as const;
        return order[a.status] - order[b.status];
      });
  }, [members, filter, query]);

  const setStatus = useCallback(
    (participantId: string, status: AttendanceStatus, method?: "QR" | "MANUAL") => {
      setMembers((prev) =>
        prev.map((m) =>
          m.participantId === participantId
            ? {
                ...m,
                status,
                method: status === "CHECKED_IN" ? method : undefined,
                checkedAt: status === "CHECKED_IN" ? new Date() : undefined,
              }
            : m,
        ),
      );
    },
    [],
  );

  const handleScan = useCallback(
    (raw: string): ScanResult => {
      const payload = parseCheckInQrValue(raw);
      if (!payload) {
        Vibration.vibrate([0, 80, 60, 80]);
        return {
          kind: "error",
          title: "Mã QR không hợp lệ",
          message: "Đây không phải mã điểm danh TrekGo.",
        };
      }
      if (tripId && payload.t !== tripId) {
        Vibration.vibrate([0, 80, 60, 80]);
        return {
          kind: "error",
          title: "Sai chuyến đi",
          message: `${payload.n} không thuộc chuyến này.`,
        };
      }

      const existing = members.find((m) => m.participantId === payload.p);
      if (existing?.status === "CHECKED_IN") {
        Vibration.vibrate(40);
        return {
          kind: "duplicate",
          title: `${existing.name} đã điểm danh`,
          message: `Lúc ${formatTime(existing.checkedAt)} · ${existing.shortCode}`,
        };
      }

      Vibration.vibrate(60);
      if (existing) {
        setStatus(existing.participantId, "CHECKED_IN", "QR");
        return {
          kind: "success",
          title: `Đã điểm danh ${existing.name}`,
          message: `${existing.shortCode} · ${stats.checked + 1}/${stats.total} có mặt`,
        };
      }

      // Chưa có trong danh sách mẫu → thêm vào (khi có API thật sẽ đối chiếu server)
      const added: CheckInMember = {
        participantId: payload.p,
        bookingId: payload.b,
        name: payload.n,
        phone: "—",
        shortCode: payload.c,
        status: "CHECKED_IN",
        method: "QR",
        checkedAt: new Date(),
      };
      setMembers((prev) => [added, ...prev]);
      return {
        kind: "success",
        title: `Đã điểm danh ${payload.n}`,
        message: `${payload.c} · Đã thêm vào danh sách đoàn`,
      };
    },
    [members, tripId, stats.checked, stats.total, setStatus],
  );

  const handleSimulate = useCallback((): ScanResult | null => {
    const pending = members.filter((m) => m.status === "PENDING");
    if (pending.length === 0) {
      return { kind: "duplicate", title: "Không còn ai chờ", message: "Tất cả thành viên đã được xử lý." };
    }
    const pick = pending[Math.floor(Math.random() * pending.length)];
    setStatus(pick.participantId, "CHECKED_IN", "QR");
    Vibration.vibrate(60);
    return {
      kind: "success",
      title: `Đã điểm danh ${pick.name}`,
      message: `${pick.shortCode} · ${stats.checked + 1}/${stats.total} có mặt`,
    };
  }, [members, stats.checked, stats.total, setStatus]);

  const handleMarkNoShow = (m: CheckInMember) => {
    Alert.alert("Đánh dấu vắng mặt", `Xác nhận ${m.name} không có mặt tại điểm tập kết?`, [
      { text: "Huỷ", style: "cancel" },
      { text: "Vắng mặt", style: "destructive", onPress: () => setStatus(m.participantId, "NO_SHOW") },
    ]);
  };

  const handleManualCheckIn = (m: CheckInMember) => {
    Alert.alert(
      "Điểm danh thủ công",
      `Dùng khi thành viên không xuất trình được mã QR.\nXác nhận ${m.name} (${m.shortCode}) đã có mặt?`,
      [
        { text: "Huỷ", style: "cancel" },
        { text: "Xác nhận có mặt", onPress: () => setStatus(m.participantId, "CHECKED_IN", "MANUAL") },
      ],
    );
  };

  const handleFinish = () => {
    if (stats.pending > 0) return;
    Alert.alert(
      "Hoàn tất điểm danh",
      `${stats.checked} có mặt · ${stats.noShow} vắng mặt.\nChuyển sang bước kiểm tra trước khởi hành?`,
      [
        { text: "Xem lại", style: "cancel" },
        {
          text: "Tiếp tục",
          onPress: () =>
            router.push({ pathname: "/field-operations/leader-pretrip" as any, params: { tripId } }),
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.inkDeep} />
          <Text style={styles.loadingText}>Đang tải danh sách đoàn...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "ALL", label: "Tất cả", count: stats.total },
    { key: "PENDING", label: "Chưa đến", count: stats.pending },
    { key: "CHECKED_IN", label: "Có mặt", count: stats.checked },
    { key: "NO_SHOW", label: "Vắng", count: stats.noShow },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerTitle}>Điểm danh xuất phát</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {trip?.title || "Chuyến đi"}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => void load()} activeOpacity={0.7}>
          <Ionicons name="refresh" size={19} color={Colors.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Window banner */}
        {!checkInWindow.isOpen && trip ? (
          <View style={[styles.banner, checkInWindow.isAfter ? styles.bannerMuted : styles.bannerWarn]}>
            <Ionicons
              name={checkInWindow.isAfter ? "checkmark-done" : "lock-closed"}
              size={18}
              color={checkInWindow.isAfter ? Colors.onSurfaceMuted : "#7a5b00"}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>
                {checkInWindow.isAfter
                  ? "Chuyến đi đã kết thúc"
                  : `Điểm danh mở vào ngày ${formatDayMonth(checkInWindow.opensAt)}`}
              </Text>
              <Text style={styles.bannerText}>
                {checkInWindow.isAfter
                  ? "Danh sách chỉ ở chế độ xem."
                  : "Bạn có thể xem trước danh sách đoàn. Quét QR sẽ được mở vào ngày khởi hành."}
              </Text>
              {__DEV__ && !checkInWindow.isAfter && !devUnlocked ? (
                <TouchableOpacity onPress={() => setDevUnlocked(true)} style={styles.devLink}>
                  <Ionicons name="flask-outline" size={12} color="#7a5b00" />
                  <Text style={styles.devLinkText}>Mở thử điểm danh (DEV)</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        {isDemoData ? (
          <View style={[styles.banner, styles.bannerInfo]}>
            <Ionicons name="information-circle-outline" size={18} color="#0369a1" />
            <Text style={[styles.bannerText, { flex: 1, color: "#075985" }]}>
              Chưa có trekker đặt chỗ — đang hiển thị dữ liệu mẫu để xem giao diện.
            </Text>
          </View>
        ) : null}

        {/* Hero progress */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroEyebrow}>QUÂN SỐ CÓ MẶT</Text>
              <Text style={styles.heroCount}>
                {stats.checked}
                <Text style={styles.heroTotal}> / {stats.total}</Text>
              </Text>
              <Text style={styles.heroMeta}>
                <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.7)" />{" "}
                Khởi hành {formatStart(trip?.startAt)}
              </Text>
            </View>
            <View style={styles.ring}>
              <Text style={styles.ringText}>{progressPct}%</Text>
            </View>
          </View>

          <View style={styles.heroTrack}>
            <View style={[styles.heroFill, { width: `${progressPct}%` }]} />
          </View>

          <View style={styles.heroStats}>
            <HeroStat dot="#9fe870" label="Có mặt" value={stats.checked} />
            <HeroStat dot="#fed018" label="Chưa đến" value={stats.pending} />
            <HeroStat dot="#ff8a80" label="Vắng" value={stats.noShow} />
          </View>
        </View>

        {/* Scan CTA */}
        <TouchableOpacity
          style={[styles.scanCta, !canOperate && styles.scanCtaDisabled]}
          onPress={() => setScannerOpen(true)}
          disabled={!canOperate}
          activeOpacity={0.88}
        >
          <View style={styles.scanCtaIcon}>
            <Ionicons name="scan" size={26} color={canOperate ? Colors.inkDeep : "#8a8f86"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.scanCtaTitle, !canOperate && { color: "#6b7066" }]}>
              Quét mã QR điểm danh
            </Text>
            <Text style={[styles.scanCtaSub, !canOperate && { color: "#8a8f86" }]}>
              {canOperate
                ? "Quét liên tục từng thành viên tại điểm tập kết"
                : `Khả dụng từ ngày ${formatDayMonth(checkInWindow.opensAt)}`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={canOperate ? Colors.inkDeep : "#8a8f86"} />
        </TouchableOpacity>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
                <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>
                    {f.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={Colors.onSurfaceMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm theo tên, SĐT hoặc mã CK-..."
            placeholderTextColor={Colors.mute}
            style={styles.searchInput}
            autoCapitalize="characters"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={16} color={Colors.mute} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Member list */}
        {visibleMembers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={30} color={Colors.mute} />
            <Text style={styles.emptyText}>Không có thành viên phù hợp.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {visibleMembers.map((m) => (
              <MemberRow
                key={m.participantId}
                member={m}
                disabled={!canOperate}
                onManual={() => handleManualCheckIn(m)}
                onNoShow={() => handleMarkNoShow(m)}
                onUndo={() => setStatus(m.participantId, "PENDING")}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Sticky footer */}
      <SafeAreaView edges={["bottom"]} style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.footerLabel}>
            {stats.pending > 0 ? `Còn ${stats.pending} người chưa xử lý` : "Đã xử lý toàn bộ đoàn"}
          </Text>
          <Text style={styles.footerSub}>
            {stats.checked} có mặt · {stats.noShow} vắng
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.finishBtn, stats.pending > 0 && styles.finishBtnDisabled]}
          disabled={stats.pending > 0}
          onPress={handleFinish}
          activeOpacity={0.85}
        >
          <Text style={styles.finishBtnText}>Hoàn tất</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>

      <CheckInScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
        checkedCount={stats.checked}
        totalCount={stats.total}
        onSimulate={__DEV__ ? handleSimulate : undefined}
      />
    </SafeAreaView>
  );
}

function HeroStat({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <View style={styles.heroStat}>
      <View style={[styles.heroDot, { backgroundColor: dot }]} />
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function MemberRow({
  member,
  disabled,
  onManual,
  onNoShow,
  onUndo,
}: {
  member: CheckInMember;
  disabled: boolean;
  onManual: () => void;
  onNoShow: () => void;
  onUndo: () => void;
}) {
  const s = member.status;
  const pill =
    s === "CHECKED_IN"
      ? { label: member.method === "MANUAL" ? `Thủ công · ${formatTime(member.checkedAt)}` : `QR · ${formatTime(member.checkedAt)}`, bg: "#dcfce7", color: "#166534", icon: "checkmark-circle" as const }
      : s === "NO_SHOW"
        ? { label: "Vắng mặt", bg: Colors.errorContainer, color: Colors.onErrorContainer, icon: "close-circle" as const }
        : { label: "Chưa đến", bg: "#fff7d6", color: "#7a5b00", icon: "time-outline" as const };

  return (
    <View style={[styles.row, s === "CHECKED_IN" && styles.rowChecked, s === "NO_SHOW" && styles.rowNoShow]}>
      <View
        style={[
          styles.avatar,
          s === "CHECKED_IN" && { backgroundColor: "#9fe870" },
          s === "NO_SHOW" && { backgroundColor: Colors.errorContainer },
        ]}
      >
        {s === "CHECKED_IN" ? (
          <Ionicons name="checkmark" size={20} color={Colors.inkDeep} />
        ) : (
          <Text style={[styles.avatarText, s === "NO_SHOW" && { color: Colors.onErrorContainer }]}>
            {member.name.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowName} numberOfLines={1}>
          {member.name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {member.shortCode} · {member.phone}
        </Text>
        <View style={[styles.pill, { backgroundColor: pill.bg }]}>
          <Ionicons name={pill.icon} size={11} color={pill.color} />
          <Text style={[styles.pillText, { color: pill.color }]}>{pill.label}</Text>
        </View>
      </View>

      {s === "PENDING" ? (
        <View style={styles.rowActions}>
          <TouchableOpacity
            style={[styles.actBtn, styles.actBtnPrimary, disabled && styles.actDisabled]}
            onPress={onManual}
            disabled={disabled}
          >
            <Ionicons name="hand-left-outline" size={16} color={Colors.inkDeep} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actBtn, styles.actBtnDanger, disabled && styles.actDisabled]}
            onPress={onNoShow}
            disabled={disabled}
          >
            <Ionicons name="person-remove-outline" size={16} color={Colors.error} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.undoBtn} onPress={onUndo} disabled={disabled}>
          <Ionicons name="arrow-undo" size={14} color={Colors.onSurfaceMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const LIME = "#9fe870";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, color: Colors.onSurfaceVariant },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "900", color: Colors.ink },
  headerSub: { fontSize: 11, color: Colors.onSurfaceMuted, marginTop: 2, maxWidth: 230 },
  content: { padding: 16, paddingBottom: 120, gap: 14 },
  banner: { flexDirection: "row", gap: 10, padding: 12, borderRadius: Radius.md },
  bannerWarn: { backgroundColor: "#fff7d6" },
  bannerMuted: { backgroundColor: Colors.surfaceContainer },
  bannerInfo: { backgroundColor: "#e0f2fe", alignItems: "center" },
  bannerTitle: { fontSize: 13, fontWeight: "800", color: Colors.onSurface },
  bannerText: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2, lineHeight: 17 },
  devLink: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  devLinkText: { fontSize: 12, fontWeight: "800", color: "#7a5b00", textDecorationLine: "underline" },
  hero: {
    backgroundColor: Colors.inkDeep,
    borderRadius: Radius.xl,
    padding: 18,
    ...Shadows.tactical,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroEyebrow: { color: LIME, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  heroCount: { color: "#fff", fontSize: 44, fontWeight: "900", marginTop: 2 },
  heroTotal: { color: "rgba(255,255,255,0.55)", fontSize: 22, fontWeight: "800" },
  heroMeta: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 },
  ring: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 6,
    borderColor: LIME,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(159,232,112,0.12)",
  },
  ringText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  heroTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginTop: 16,
    overflow: "hidden",
  },
  heroFill: { height: "100%", borderRadius: 4, backgroundColor: LIME },
  heroStats: { flexDirection: "row", marginTop: 14, gap: 8 },
  heroStat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroDot: { width: 8, height: 8, borderRadius: 4 },
  heroStatValue: { color: "#fff", fontSize: 15, fontWeight: "900" },
  heroStatLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "600" },
  scanCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: Radius.xl,
    backgroundColor: LIME,
    ...Shadows.hover,
  },
  scanCtaDisabled: { backgroundColor: Colors.surfaceContainerHigh },
  scanCtaIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanCtaTitle: { fontSize: 16, fontWeight: "900", color: Colors.inkDeep },
  scanCtaSub: { fontSize: 12, color: Colors.onPrimaryContainer, marginTop: 2 },
  filterRow: { gap: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  filterChipActive: { backgroundColor: Colors.inkDeep, borderColor: Colors.inkDeep },
  filterText: { fontSize: 13, fontWeight: "700", color: Colors.onSurfaceVariant },
  filterTextActive: { color: "#fff" },
  filterBadge: {
    minWidth: 22,
    paddingHorizontal: 6,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeActive: { backgroundColor: LIME },
  filterBadgeText: { fontSize: 11, fontWeight: "900", color: Colors.onSurfaceVariant },
  filterBadgeTextActive: { color: Colors.inkDeep },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  searchInput: { flex: 1, fontSize: 13, color: Colors.onSurface, paddingVertical: 0 },
  emptyBox: { alignItems: "center", paddingVertical: 30, gap: 8 },
  emptyText: { color: Colors.onSurfaceMuted, fontSize: 13 },
  list: { gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
    ...Shadows.card,
  },
  rowChecked: { borderColor: "#c5edab", backgroundColor: "#f6fdf0" },
  rowNoShow: { opacity: 0.75 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 17, fontWeight: "900", color: Colors.onSurfaceVariant },
  rowName: { fontSize: 14, fontWeight: "800", color: Colors.onSurface },
  rowMeta: { fontSize: 11, color: Colors.onSurfaceMuted, marginTop: 2, letterSpacing: 0.3 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  pillText: { fontSize: 10, fontWeight: "800" },
  rowActions: { flexDirection: "row", gap: 8 },
  actBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  actBtnPrimary: { backgroundColor: "#eefbe4", borderColor: "#c5edab" },
  actBtnDanger: { backgroundColor: "#fff1f0", borderColor: Colors.errorContainer },
  actDisabled: { opacity: 0.4 },
  undoBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceContainerLow,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainer,
  },
  footerLabel: { fontSize: 13, fontWeight: "800", color: Colors.onSurface },
  footerSub: { fontSize: 11, color: Colors.onSurfaceMuted, marginTop: 2 },
  finishBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: Radius.full,
    backgroundColor: Colors.inkDeep,
  },
  finishBtnDisabled: { backgroundColor: "#aab3a5" },
  finishBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
