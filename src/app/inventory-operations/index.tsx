import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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

import { Colors, Radius, Shadows } from "@/constants/theme";
import { useAuth } from "@/features/auth/AuthContext";
import {
  PreparationTaskStatus,
  PreparationTaskSummary,
  staffInventoryApi,
} from "@/features/rentals/staff-inventory-api";

const FILTERS: {
  label: string;
  value?: PreparationTaskStatus;
}[] = [
  { label: "Tất cả" },
  { label: "Mới", value: "OPEN" },
  { label: "Đang soạn", value: "PICKING" },
  { label: "Đã đóng", value: "PACKED" },
  { label: "Sẵn sàng", value: "READY" },
];

export default function InventoryQueueScreen() {
  const router = useRouter();
  const { accessToken, user, signOut } = useAuth();
  const [filter, setFilter] = useState<PreparationTaskStatus | undefined>();
  const [tasks, setTasks] = useState<PreparationTaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!accessToken) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await staffInventoryApi.listTasks(accessToken, filter);
        setTasks(result.items);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không thể tải hàng đợi kho.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, filter],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>TREKOPS INVENTORY</Text>
            <Text style={styles.title}>
              Xin chào, {user?.fullName || user?.name || "Nhân viên kho"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              void signOut();
              router.replace("/auth/login");
            }}
          >
            <Ionicons name="log-out-outline" size={24} color={Colors.ink} />
          </TouchableOpacity>
        </View>

        <View style={styles.banner}>
          <Ionicons name="file-tray-stacked" size={24} color={Colors.primaryDark} />
          <View style={styles.flex}>
            <Text style={styles.bannerTitle}>Hàng đợi chuẩn bị đơn thuê</Text>
            <Text style={styles.bannerCopy}>
              {tasks.length} task thật từ Backend
            </Text>
          </View>
          <TouchableOpacity onPress={() => void load(true)}>
            <Ionicons name="refresh" size={22} color={Colors.primaryDark} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((item) => {
            const selected = filter === item.value;
            return (
              <TouchableOpacity
                key={item.label}
                style={[styles.filter, selected && styles.filterActive]}
                onPress={() => setFilter(item.value)}
              >
                <Text
                  style={[
                    styles.filterText,
                    selected && styles.filterTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={Colors.primaryDark} style={styles.loader} />
        ) : error ? (
          <View style={styles.messageCard}>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity style={styles.retry} onPress={() => void load()}>
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.messageCard}>
            <Ionicons name="cube-outline" size={38} color={Colors.onSurfaceMuted} />
            <Text style={styles.empty}>Không có task kho ở trạng thái này.</Text>
          </View>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onPress={() =>
                router.push({
                  pathname: "/inventory-operations/[id]",
                  params: { id: task.id },
                })
              }
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TaskCard({
  task,
  onPress,
}: {
  task: PreparationTaskSummary;
  onPress: () => void;
}) {
  const percent = task.progress.required
    ? Math.round((task.progress.picked / task.progress.required) * 100)
    : 0;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.82}>
      <View style={styles.cardTop}>
        <Text style={styles.orderCode}>{task.orderCode || task.orderId}</Text>
        <Text style={styles.status}>{task.status}</Text>
      </View>
      <Text style={styles.cardTitle}>{task.pickup.name}</Text>
      <Text style={styles.meta}>{task.inventoryLocation.name}</Text>
      <Text style={styles.meta}>
        {task.requiredLineSummary
          .map((line) => `${line.productName} ×${line.quantity}`)
          .join(" · ")}
      </Text>
      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>Đã pick</Text>
        <Text style={styles.progressText}>
          {task.progress.picked}/{task.progress.required}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
      <View style={styles.openRow}>
        <Text style={styles.openText}>Mở quy trình chuẩn bị</Text>
        <Ionicons name="arrow-forward" size={18} color={Colors.primaryDark} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: 20, paddingBottom: 48 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  eyebrow: {
    color: Colors.primaryDark,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: { color: Colors.ink, fontSize: 23, fontWeight: "800", marginTop: 5 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#eaf5e1",
    borderRadius: Radius.md,
    padding: 16,
  },
  flex: { flex: 1 },
  bannerTitle: { color: Colors.ink, fontSize: 15, fontWeight: "800" },
  bannerCopy: { color: Colors.body, fontSize: 12, marginTop: 4 },
  filters: { gap: 8, paddingVertical: 16 },
  filter: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  filterActive: { backgroundColor: Colors.primaryDark },
  filterText: { color: Colors.body, fontSize: 12, fontWeight: "700" },
  filterTextActive: { color: "#fff" },
  loader: { marginTop: 50 },
  messageCard: {
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: Radius.md,
    padding: 28,
  },
  error: { color: Colors.error, textAlign: "center" },
  empty: { color: Colors.onSurfaceMuted, textAlign: "center" },
  retry: {
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.sm,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { color: "#fff", fontWeight: "800" },
  card: {
    backgroundColor: "#fff",
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 12,
    ...Shadows.card,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  orderCode: { flex: 1, color: Colors.primaryDark, fontSize: 11, fontWeight: "800" },
  status: { color: "#9b6700", fontSize: 10, fontWeight: "800" },
  cardTitle: { color: Colors.ink, fontSize: 17, fontWeight: "800", marginTop: 10 },
  meta: { color: Colors.body, fontSize: 12, marginTop: 6 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  progressText: { color: Colors.onSurfaceMuted, fontSize: 11, fontWeight: "700" },
  progressTrack: {
    height: 6,
    overflow: "hidden",
    borderRadius: 4,
    backgroundColor: Colors.surfaceContainer,
    marginTop: 7,
  },
  progressFill: { height: "100%", backgroundColor: Colors.primaryDark },
  openRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainer,
    marginTop: 14,
    paddingTop: 12,
  },
  openText: { color: Colors.primaryDark, fontSize: 12, fontWeight: "800" },
});
