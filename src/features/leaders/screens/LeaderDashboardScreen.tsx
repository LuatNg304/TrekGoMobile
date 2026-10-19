import { FieldModal } from "@/components/FieldModal";
import { Colors } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/features/auth/AuthContext";
import {
  LeaderActiveTripCard,
  LeaderProgressTracker,
  LeaderTripList,
} from "@/features/leaders/components";
import { useLeaderTrips } from "@/features/leaders/hooks";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Action = ({
  icon,
  label,
  onPress,
  tone = "green",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: "green" | "amber" | "red";
}) => (
  <TouchableOpacity style={styles.action} onPress={onPress} activeOpacity={0.84}>
    <View
      style={[
        styles.actionIcon,
        tone === "amber" && styles.amber,
        tone === "red" && styles.red,
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={tone === "green" ? Colors.primaryDark : tone === "amber" ? "#9b6700" : Colors.error}
      />
    </View>
    <Text style={styles.actionText}>{label}</Text>
    <Ionicons name="chevron-forward" size={17} color={Colors.onSurfaceMuted} />
  </TouchableOpacity>
);

export function LeaderDashboardScreen() {
  const router = useRouter();
  const { user, signOut, fieldWorkflow } = useApp();
  const { user: authUser, accessToken, signOut: authSignOut } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);

  const {
    trips: leaderTrips,
    loading: loadingTrips,
    fetchMyTrips,
    cancelTrip,
  } = useLeaderTrips(accessToken);

  const handleCancelTrip = async (
    tripId: string,
    version: number,
    reason: string,
  ) => {
    await cancelTrip(tripId, { expectedVersion: version, reason });
  };

  useEffect(() => {
    if (accessToken) {
      void fetchMyTrips();
    }
  }, [accessToken, fetchMyTrips]);

  const activeLeaderTrip = leaderTrips.length > 0 ? leaderTrips[0] : null;

  const checkedInCount = fieldWorkflow.leaderAttendance.filter(
    (member: { memberName: string; status: string }) => member.status === "CHECKED_IN",
  ).length;
  const attendanceComplete = fieldWorkflow.leaderAttendance.every(
    (member: { memberName: string; status: string }) => member.status !== "PENDING",
  );

  const nextStep =
    fieldWorkflow.leaderTripStatus === "PREPARING"
      ? fieldWorkflow.leaderPretripApproved
        ? {
            label: "Bắt đầu chuyến đi",
            detail: "Danh sách đã sẵn sàng. Xác nhận để mở GPS.",
            route: "/field-operations/leader-trip" as const,
            icon: "play-circle-outline" as const,
          }
        : {
            label: "Hoàn tất kiểm tra trước chuyến",
            detail: attendanceComplete
              ? "Mọi thành viên đã được xử lý."
              : "Cần điểm danh hoặc ghi nhận no-show cho toàn bộ đoàn.",
            route: "/field-operations/leader-pretrip" as const,
            icon: "lock-open-outline" as const,
          }
      : fieldWorkflow.leaderTripStatus === "IN_PROGRESS"
        ? {
            label: "Tiếp tục điều hành chuyến",
            detail: "Theo dõi GPS và xác nhận các checkpoint trên tuyến.",
            route: "/field-operations/leader-map" as const,
            icon: "navigate-outline" as const,
          }
        : {
            label: fieldWorkflow.leaderReportSent ? "Xem báo cáo chuyến" : "Kết thúc và gửi báo cáo",
            detail: fieldWorkflow.leaderReportSent
              ? "Báo cáo đã được chuyển cho đội vận hành."
              : "Kiểm tra đủ checkpoint trước khi kết thúc chuyến.",
            route: "/field-operations/leader-summary" as const,
            icon: "flag-outline" as const,
          };

  const logout = () => {
    signOut();
    void authSignOut();
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>MOUNTAIN LEADER</Text>
            <Text style={styles.heading}>Xin chào, {authUser?.name || user.name}</Text>
          </View>
          <TouchableOpacity onPress={logout} accessibilityLabel="Đăng xuất">
            <Ionicons name="log-out-outline" size={23} color={Colors.ink} />
          </TouchableOpacity>
        </View>

        {/* Status Banner */}
        <View style={[styles.statusBanner, styles.bannerAmber]}>
          <Ionicons name="compass" size={22} color="#9b6700" />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Trung tâm chỉ huy chuyến trek</Text>
            <Text style={styles.bannerText}>
              {activeLeaderTrip
                ? `${activeLeaderTrip.title} · ${activeLeaderTrip.status}`
                : "Chưa có chuyến đang chạy · Sẵn sàng khởi tạo"}
            </Text>
          </View>
          <View style={styles.liveDot} />
        </View>

        {/* Active Command Card */}
        <LeaderActiveTripCard
          trip={activeLeaderTrip}
          loading={loadingTrips}
          nextStep={nextStep}
          onNavigateNext={(route) => router.push(route)}
          onCreateTrip={() => router.push("/field-operations/leader-create-trip" as any)}
        />

        {/* Progress Tracker */}
        <LeaderProgressTracker fieldWorkflow={fieldWorkflow} />

        {/* Shortcut Actions */}
        <Text style={styles.sectionTitle}>CẦN XỬ LÝ</Text>
        {fieldWorkflow.gpsStatus === "LOST" && (
          <Action
            icon="locate-outline"
            label="Mất GPS — kiểm tra tín hiệu"
            tone="amber"
            onPress={() => router.push("/field-operations/leader-map" as any)}
          />
        )}
        {fieldWorkflow.leaderSafetyAlert.status === "ACTIVE" && (
          <Action
            icon="warning-outline"
            label="Cảnh báo tuyến cần được xử lý"
            tone="amber"
            onPress={() => router.push("/field-operations/leader-safety" as any)}
          />
        )}
        {fieldWorkflow.pendingSyncCount > 0 && (
          <Action
            icon="cloud-upload-outline"
            label={`${fieldWorkflow.pendingSyncCount} bản ghi đang chờ đồng bộ`}
            onPress={() => setModalVisible(true)}
          />
        )}
        {!fieldWorkflow.leaderPretripApproved && (
          <Action
            icon="clipboard-outline"
            label="Mở checklist trước chuyến"
            onPress={() => router.push("/field-operations/leader-pretrip" as any)}
          />
        )}
        <Action
          icon="add-circle-outline"
          label="Tạo Public Trip mới"
          onPress={() => router.push("/field-operations/leader-create-trip" as any)}
        />
        <Action
          icon="briefcase-outline"
          label="Chuyến đi của tôi (Quản lý đoàn)"
          onPress={() => router.push("/field-operations/leader-trips" as any)}
        />

        {/* Created Trips List */}
        <LeaderTripList trips={leaderTrips} onCancelTrip={handleCancelTrip} />

        {/* Member Preview */}
        <View style={styles.memberPreview}>
          <View style={styles.memberSectionHeader}>
            <Text style={styles.sectionTitle}>ĐOÀN HÔM NAY</Text>
            <Text style={styles.memberCount}>
              {checkedInCount}/{fieldWorkflow.leaderAttendance.length} CHECK-IN
            </Text>
          </View>
          {fieldWorkflow.leaderAttendance.map((member: { memberName: string; status: string }) => (
            <View key={member.memberName} style={styles.memberRow}>
              <View
                style={[
                  styles.memberDot,
                  member.status === "PENDING" && styles.memberDotWait,
                  member.status === "NO_SHOW" && styles.memberDotNoShow,
                ]}
              />
              <Text style={styles.memberName}>{member.memberName}</Text>
              <Text style={styles.memberStatus}>
                {member.status === "CHECKED_IN"
                  ? "Đã check-in"
                  : member.status === "NO_SHOW"
                    ? "No-show"
                    : "Chờ xử lý"}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <FieldModal
        visible={modalVisible}
        title="Dữ liệu đã đồng bộ"
        message="GPS, checklist và trạng thái thành viên đang được lưu offline. Lần đồng bộ gần nhất: vừa xong."
        icon="cloud-done-outline"
        actionLabel="Đã hiểu"
        onAction={() => setModalVisible(false)}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  eyebrow: {
    color: Colors.onSurfaceMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  heading: { color: Colors.ink, fontSize: 24, fontWeight: "800", marginTop: 2 },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 6,
  },
  bannerAmber: { backgroundColor: "#fff5db" },
  bannerTitle: { color: Colors.ink, fontSize: 13, fontWeight: "800" },
  bannerText: { color: Colors.body, fontSize: 11, marginTop: 2 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#00b553" },
  sectionTitle: {
    color: Colors.onSurfaceMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#e8ece5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  amber: { backgroundColor: "#fff5db" },
  red: { backgroundColor: "#ffebee" },
  actionText: { flex: 1, color: Colors.ink, fontSize: 13, fontWeight: "700" },
  memberPreview: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 18,
  },
  memberSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  memberCount: { color: Colors.primaryDark, fontSize: 11, fontWeight: "800" },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer,
  },
  memberDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#25a55a", marginRight: 10 },
  memberDotWait: { backgroundColor: "#e7a900" },
  memberDotNoShow: { backgroundColor: "#b44638" },
  memberName: { flex: 1, color: Colors.ink, fontSize: 13, fontWeight: "600" },
  memberStatus: { color: Colors.onSurfaceMuted, fontSize: 11 },
});
