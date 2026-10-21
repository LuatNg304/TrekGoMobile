import { Colors, Radius, Shadows } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/features/auth/AuthContext";
import { rentalApi } from "@/features/rentals/api";
import { DeliveryTaskSummary } from "@/features/rentals/types";
import { LeaderNavigationShell } from "@/features/leaders/screens";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TaskTab = "WAITING" | "IN_PROGRESS" | "COMPLETED";

const completedStatuses = new Set([
  "HANDED_OVER",
  "INVENTORY_RECEIVED",
  "NO_SHOW",
  "REFUSED",
  "CLOSED",
  "CANCELLED",
]);
const inProgressStatuses = new Set([
  "PACKAGE_RECEIVED",
  "RECIPIENT_VERIFIED",
  "COLLECTING",
  "RETURNED",
]);

function taskTab(task: DeliveryTaskSummary): TaskTab {
  if (completedStatuses.has(task.status)) return "COMPLETED";
  if (inProgressStatuses.has(task.status)) return "IN_PROGRESS";
  return "WAITING";
}

function recipientName(task: DeliveryTaskSummary) {
  const recipient = task.orderSummary.recipient;
  return recipient?.displayName || recipient?.fullName || recipient?.name || "Khách thuê";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    SCHEDULED: "Chờ nhận",
    BLOCKED: "Đang bị chặn",
    PACKAGE_RECEIVED: "Đã nhận package",
    RECIPIENT_VERIFIED: "Đã xác minh khách",
    HANDED_OVER: "Đã bàn giao",
    COLLECTING: "Đang thu hồi",
    RETURNED: "Đang chuyển về kho",
    INVENTORY_RECEIVED: "Kho đã nhận",
    NO_SHOW: "Khách vắng mặt",
    REFUSED: "Khách từ chối",
    CLOSED: "Đã đóng",
    CANCELLED: "Đã hủy",
  };
  return labels[status] || status;
}

export default function FieldOperationsHome() {
  const router = useRouter();
  const { user, authRole, signOut } = useApp();
  const { user: authUser, accessToken, signOut: authSignOut } = useAuth();
  const [activeTaskTab, setActiveTaskTab] = useState<TaskTab>("WAITING");
  const [tasks, setTasks] = useState<DeliveryTaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>();

  const effectiveRole =
    authRole ||
    (authUser?.role === "STAFF_DELIVERY" || authUser?.role === "LEADER"
      ? authUser.role
      : null) ||
    (user.role === "STAFF_DELIVERY" || user.role === "LEADER" ? user.role : null);

  const loadTasks = useCallback(
    async (refresh = false) => {
      if (!accessToken || effectiveRole !== "STAFF_DELIVERY") {
        setLoading(false);
        return;
      }

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(undefined);
      try {
        const result = await rentalApi.listDeliveryTasks(accessToken, {
          page: 1,
          pageSize: 100,
        });
        setTasks(result.items);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Không tải được nhiệm vụ giao nhận.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, effectiveRole],
  );

  useEffect(() => {
    if (!effectiveRole) {
      router.replace("/");
      return;
    }
    if (effectiveRole !== "STAFF_DELIVERY") return;
    const timer = setTimeout(() => void loadTasks(), 0);
    return () => clearTimeout(timer);
  }, [effectiveRole, loadTasks, router]);

  const visibleTasks = useMemo(
    () => tasks.filter((task) => taskTab(task) === activeTaskTab),
    [activeTaskTab, tasks],
  );
  const inProgressCount = tasks.filter((task) => taskTab(task) === "IN_PROGRESS").length;
  const completedCount = tasks.filter((task) => taskTab(task) === "COMPLETED").length;

  const logout = () => {
    signOut();
    void authSignOut();
    router.replace("/");
  };

  if (!effectiveRole) return null;
  if (effectiveRole === "LEADER") {
    return <LeaderNavigationShell onLogout={logout} />;
  }

  const openTask = (task: DeliveryTaskSummary) => {
    router.push({
      pathname:
        task.type === "RETURN"
          ? "/field-operations/staff-return"
          : "/field-operations/staff-task",
      params: { taskId: task.id, orderId: task.orderSummary.orderId },
    } as never);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadTasks(true)}
            tintColor={Colors.primaryDark}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>TREKOPS DELIVERY</Text>
            <Text style={styles.heading}>Xin chào, {authUser?.name || user.name}</Text>
          </View>
          <TouchableOpacity onPress={logout} accessibilityLabel="Đăng xuất">
            <Ionicons name="log-out-outline" size={23} color={Colors.ink} />
          </TouchableOpacity>
        </View>

        <View style={styles.statusBanner}>
          <Ionicons name="cube" size={22} color={Colors.primaryDark} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Ca giao nhận hôm nay</Text>
            <Text style={styles.bannerText}>{tasks.length} task từ hệ thống</Text>
          </View>
          <View style={styles.liveDot} />
        </View>

        <View style={styles.statsRow}>
          <Stat value={String(tasks.length)} label="Tổng task" />
          <Stat value={String(inProgressCount)} label="Đang xử lý" />
          <Stat value={String(completedCount)} label="Đã hoàn tất" />
        </View>

        <Text style={styles.sectionTitle}>NHIỆM VỤ</Text>
        <View style={styles.taskTabs}>
          {(
            [
              ["WAITING", "Chờ nhận"],
              ["IN_PROGRESS", "Đang xử lý"],
              ["COMPLETED", "Hoàn tất"],
            ] as const
          ).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              style={[styles.taskTab, activeTaskTab === value && styles.taskTabActive]}
              onPress={() => setActiveTaskTab(value)}
            >
              <Text style={[styles.taskTabText, activeTaskTab === value && styles.taskTabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.primaryDark} />
            <Text style={styles.emptyText}>Đang tải task thật...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retry} onPress={() => void loadTasks()}>
              <Text style={styles.retryText}>THỬ LẠI</Text>
            </TouchableOpacity>
          </View>
        ) : visibleTasks.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Không có task trong trạng thái này.</Text>
          </View>
        ) : (
          visibleTasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              onPress={() => openTask(task)}
              activeOpacity={0.84}
            >
              <View style={styles.taskTop}>
                <Text style={styles.taskId}>{task.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={styles.taskStatus}>{statusLabel(task.status)}</Text>
              </View>
              <Text style={styles.taskTitle}>
                {task.type === "RETURN" ? "Thu hồi thiết bị" : "Giao thiết bị"}
              </Text>
              <Text style={styles.taskMeta}>
                <Ionicons name="person-outline" size={13} /> {recipientName(task)}
              </Text>
              <Text style={styles.taskMeta}>
                <Ionicons name="location-outline" size={13} /> {task.point.name}
              </Text>
              <View style={styles.taskItems}>
                <Ionicons name="cube-outline" size={15} color={Colors.primaryDark} />
                <Text style={styles.taskItemsText}>{task.package.code}</Text>
                <Ionicons name="arrow-forward" size={17} color={Colors.primaryDark} />
              </View>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity style={styles.refreshAction} onPress={() => void loadTasks(true)}>
          <Ionicons name="refresh-outline" size={19} color={Colors.primaryDark} />
          <Text style={styles.refreshText}>Làm mới nhiệm vụ</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
  eyebrow: { color: Colors.primaryDark, fontSize: 11, fontWeight: "800", letterSpacing: 1.1 },
  heading: { color: Colors.ink, fontSize: 25, fontWeight: "800", marginTop: 5 },
  statusBanner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: Radius.md, marginBottom: 16, backgroundColor: "#eaf5e1" },
  bannerTitle: { color: Colors.ink, fontSize: 15, fontWeight: "800" },
  bannerText: { color: Colors.body, fontSize: 12, marginTop: 4 },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#22a35a" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 25 },
  stat: { flex: 1, backgroundColor: "#fff", padding: 14, borderRadius: Radius.sm, ...Shadows.card },
  statValue: { color: Colors.ink, fontSize: 22, fontWeight: "800" },
  statLabel: { color: Colors.onSurfaceMuted, fontSize: 11, marginTop: 5 },
  sectionTitle: { color: Colors.onSurfaceMuted, fontSize: 11, fontWeight: "800", letterSpacing: 0.8, marginBottom: 10, marginTop: 8 },
  taskTabs: { flexDirection: "row", gap: 7, marginBottom: 12 },
  taskTab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 8, backgroundColor: Colors.surfaceContainerLow },
  taskTabActive: { backgroundColor: Colors.primaryDark },
  taskTabText: { color: Colors.onSurfaceMuted, fontSize: 11, fontWeight: "700" },
  taskTabTextActive: { color: "#fff" },
  center: { backgroundColor: "#fff", padding: 24, borderRadius: Radius.sm, alignItems: "center", gap: 10 },
  emptyText: { color: Colors.onSurfaceMuted, textAlign: "center" },
  errorBox: { backgroundColor: "#ffe8e5", padding: 16, borderRadius: Radius.sm },
  errorText: { color: Colors.error, fontSize: 13 },
  retry: { alignSelf: "flex-start", backgroundColor: Colors.primaryDark, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8, marginTop: 12 },
  retryText: { color: "#fff", fontWeight: "800", fontSize: 11 },
  taskCard: { backgroundColor: "#fff", borderRadius: Radius.md, padding: 16, marginBottom: 12, ...Shadows.card },
  taskTop: { flexDirection: "row", justifyContent: "space-between" },
  taskId: { color: Colors.primaryDark, fontSize: 11, fontWeight: "800" },
  taskStatus: { color: "#9b6700", fontSize: 11, fontWeight: "700" },
  taskTitle: { color: Colors.ink, fontSize: 17, fontWeight: "800", marginVertical: 8 },
  taskMeta: { color: Colors.body, fontSize: 13, marginBottom: 5 },
  taskItems: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: Colors.surfaceContainer, paddingTop: 12, marginTop: 7 },
  taskItemsText: { flex: 1, color: Colors.onSurfaceVariant, fontSize: 12 },
  refreshAction: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, marginTop: 8 },
  refreshText: { color: Colors.primaryDark, fontWeight: "800" },
});