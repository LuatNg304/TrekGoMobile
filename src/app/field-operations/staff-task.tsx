import { FieldModal } from "@/components/FieldModal";
import { Colors, Radius, Shadows } from "@/constants/theme";
import { useAuth } from "@/features/auth/AuthContext";
import { rentalApi } from "@/features/rentals/api";
import {
  DeliveryTaskDetail,
  DeliveryTaskSummary,
  RentalOrderDetail,
} from "@/features/rentals/types";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ItemStatus = "PENDING" | "OK" | "MISSING" | "DAMAGED";
type ItemReview = { status: ItemStatus; note: string };
type NoShowReason =
  | "USER_NO_SHOW"
  | "USER_CHANGED_MIND"
  | "USER_REFUSED_DISCLOSED_CONDITION"
  | "SYSTEM_WRONG_EQUIPMENT"
  | "SYSTEM_DAMAGED_EQUIPMENT"
  | "SYSTEM_MISSING_EQUIPMENT";

const noShowReasons: { value: NoShowReason; label: string }[] = [
  { value: "USER_NO_SHOW", label: "Khách không đến" },
  { value: "USER_CHANGED_MIND", label: "Khách đổi ý" },
  { value: "USER_REFUSED_DISCLOSED_CONDITION", label: "Khách từ chối tình trạng đã công bố" },
  { value: "SYSTEM_WRONG_EQUIPMENT", label: "TrekGo giao sai thiết bị" },
  { value: "SYSTEM_DAMAGED_EQUIPMENT", label: "Thiết bị hỏng tại điểm giao" },
  { value: "SYSTEM_MISSING_EQUIPMENT", label: "Package thiếu thiết bị" },
];

function operationKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function recipientName(summary?: DeliveryTaskSummary, task?: DeliveryTaskDetail) {
  const recipient = task?.recipient || summary?.orderSummary.recipient;
  return recipient?.displayName || recipient?.fullName || recipient?.name || "Khách thuê";
}

function verificationRef(task?: DeliveryTaskDetail) {
  const value = task?.verificationStatus?.verificationRef;
  return typeof value === "string" ? value : undefined;
}

export default function StaffTaskScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ taskId?: string | string[]; orderId?: string | string[] }>();
  const requestedTaskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId;
  const requestedOrderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const { accessToken } = useAuth();
  const keys = useRef({
    claim: operationKey("claim-outbound"),
    receive: operationKey("receive-package"),
    verify: operationKey("verify-recipient"),
    handover: operationKey("commit-handover"),
    noShow: operationKey("mark-no-show"),
  });

  const [summary, setSummary] = useState<DeliveryTaskSummary>();
  const [task, setTask] = useState<DeliveryTaskDetail>();
  const [order, setOrder] = useState<RentalOrderDetail>();
  const [reviews, setReviews] = useState<Record<string, ItemReview>>({});
  const [custodyTransferId, setCustodyTransferId] = useState("");
  const [packageCode, setPackageCode] = useState("");
  const [pickupCode, setPickupCode] = useState("");
  const [verifiedRef, setVerifiedRef] = useState<string>();
  const [recipientNotes, setRecipientNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string>();
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);
  const [noShowVisible, setNoShowVisible] = useState(false);
  const [noShowReason, setNoShowReason] = useState<NoShowReason>("USER_NO_SHOW");
  const [noShowNotes, setNoShowNotes] = useState("");

  const load = useCallback(async () => {
    if (!accessToken) {
      setError("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại bằng Staff Delivery.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const listed = await rentalApi.listDeliveryTasks(accessToken, {
        type: "OUTBOUND",
        page: 1,
        pageSize: 100,
      });
      const selected =
        listed.items.find((item) => item.id === requestedTaskId) ||
        listed.items.find((item) => item.orderSummary.orderId === requestedOrderId) ||
        listed.items.find((item) => !["HANDED_OVER", "NO_SHOW", "REFUSED", "CLOSED", "CANCELLED"].includes(item.status));

      if (!selected) {
        setSummary(undefined);
        setTask(undefined);
        setOrder(undefined);
        setError("Không có task giao thiết bị đang hoạt động.");
        return;
      }

      setSummary(selected);
      setPackageCode((current) => current || selected.package.code);
      const orderDetail = await rentalApi.getOrder(selected.orderSummary.orderId, accessToken);
      setOrder(orderDetail);

      try {
        const taskDetail = await rentalApi.getDeliveryTask(selected.id, accessToken);
        setTask(taskDetail);
        setCustodyTransferId((current) => current || taskDetail.custodyTransfer?.id || "");
        setVerifiedRef(verificationRef(taskDetail));
        setReviews((current) => {
          const next = { ...current };
          taskDetail.units.forEach((unit) => {
            next[unit.unitId] ||= { status: "PENDING", note: "" };
          });
          return next;
        });
      } catch {
        if (selected.status !== "SCHEDULED" && selected.status !== "BLOCKED") {
          throw new Error("Task đã có người nhận hoặc tài khoản này không có quyền truy cập.");
        }
        setTask(undefined);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tải được task giao thiết bị.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, requestedOrderId, requestedTaskId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const units = useMemo(() => task?.units || [], [task?.units]);
  const allReviewed =
    units.length > 0 &&
    units.every((unit) => {
      const review = reviews[unit.unitId];
      return review && review.status !== "PENDING" && (review.status === "OK" || review.note.trim().length > 0);
    });
  const currentVerificationRef = verifiedRef || verificationRef(task);
  const serverStatus = task?.task.status || summary?.status;

  const setReview = (unitId: string, update: Partial<ItemReview>) => {
    setReviews((current) => ({
      ...current,
      [unitId]: {
        status: current[unitId]?.status || "PENDING",
        note: current[unitId]?.note || "",
        ...update,
      },
    }));
  };

  const claimTask = async () => {
    if (!accessToken || !summary || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await rentalApi.claimDeliveryTask(summary.id, summary.version, keys.current.claim, accessToken);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không nhận được task.");
    } finally {
      setBusy(false);
    }
  };

  const receivePackage = async () => {
    if (!accessToken || !summary || !task || busy) return;
    if (!custodyTransferId.trim() || !packageCode.trim()) {
      setFeedback({
        title: "Thiếu dữ liệu từ kho",
        message: "Cần quét/nhập custodyTransferId và packageCode trên QR bàn giao của kho.",
      });
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await rentalApi.receiveDeliveryPackage(
        summary.id,
        {
          custodyTransferId: custodyTransferId.trim(),
          packageCode: packageCode.trim(),
          expectedVersion: task.task.version,
        },
        keys.current.receive,
        accessToken,
      );
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không nhận được package từ kho.");
    } finally {
      setBusy(false);
    }
  };

  const verifyRecipient = async () => {
    if (!accessToken || !summary || !task || busy) return;
    if (!pickupCode.trim()) {
      setFeedback({ title: "Thiếu mã pickup", message: "Nhập mã pickup một lần do khách hàng cung cấp." });
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const result = await rentalApi.verifyDeliveryRecipient(
        summary.id,
        { pickupCode: pickupCode.trim(), expectedVersion: task.task.version },
        keys.current.verify,
        accessToken,
      );
      setVerifiedRef(result.verificationRef);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không xác minh được người nhận.");
    } finally {
      setBusy(false);
    }
  };

  const handover = async () => {
    if (!accessToken || !summary || !task || !order || busy) return;
    if (!currentVerificationRef) {
      setFeedback({ title: "Chưa xác minh", message: "Phải xác minh pickup code trước khi bàn giao." });
      return;
    }
    if (!task.package) {
      setFeedback({ title: "Thiếu package", message: "Backend chưa trả package của task." });
      return;
    }
    if (!allReviewed) {
      setFeedback({ title: "Chưa kiểm đủ", message: "Kiểm tra từng thiết bị; món thiếu hoặc hỏng phải có ghi chú." });
      return;
    }

    const reportedIssues = units.flatMap((unit) => {
      const review = reviews[unit.unitId];
      if (!review || review.status === "OK") return [];
      return [{ unitId: unit.unitId, type: review.status, description: review.note.trim() }];
    });

    setBusy(true);
    setError(undefined);
    try {
      await rentalApi.commitRentalHandover(
        summary.orderSummary.orderId,
        {
          packageId: task.package.id,
          verificationRef: currentVerificationRef,
          recipientNotes: recipientNotes.trim() || undefined,
          reportedIssues,
          expectedVersion: order.order.version,
        },
        keys.current.handover,
        accessToken,
      );
      setComplete(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Bàn giao thiết bị thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const markNoShow = async () => {
    if (!accessToken || !summary || !order || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await rentalApi.markRentalNoShow(
        summary.orderSummary.orderId,
        {
          reason: noShowReason,
          notes: noShowNotes.trim() || undefined,
          evidenceIds: [],
          expectedVersion: order.order.version,
        },
        keys.current.noShow,
        accessToken,
      );
      setNoShowVisible(false);
      setComplete(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không ghi nhận được no-show/từ chối.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primaryDark} />
          <Text style={styles.muted}>Đang tải task giao thiết bị thật...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!summary || !order) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={23} color={Colors.ink} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Giao thiết bị</Text><View style={{ width: 23 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#9b6700" />
          <Text style={styles.cardTitle}>Không tải được task</Text>
          <Text style={styles.muted}>{error}</Text>
          <TouchableOpacity style={styles.primary} onPress={() => void load()}><Text style={styles.primaryText}>TẢI LẠI</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={23} color={Colors.ink} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết giao thiết bị</Text><View style={{ width: 23 }} />
        </View>
        <View style={styles.taskHeader}>
          <Text style={styles.taskId}>{summary.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.title}>Giao thiết bị cho khách</Text>
          <Text style={styles.meta}>{recipientName(summary, task)} · {summary.point.name}</Text>
        </View>

        {!task ? (
          <View style={styles.card}>
            <Text style={styles.section}>BƯỚC 1 · NHẬN TASK</Text>
            <Text style={styles.cardTitle}>Task đang chờ Staff Delivery</Text>
            <Text style={styles.muted}>Nhận task trước khi lấy package từ kho.</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity disabled={busy} style={[styles.primary, busy && styles.disabled]} onPress={() => void claimTask()}>
              <Text style={styles.primaryText}>{busy ? "ĐANG NHẬN..." : "NHẬN TASK"}</Text>
            </TouchableOpacity>
          </View>
        ) : serverStatus === "SCHEDULED" || serverStatus === "BLOCKED" ? (
          <View style={styles.card}>
            <Text style={styles.section}>BƯỚC 1 · NHẬN PACKAGE TỪ KHO</Text>
            <InfoRow icon="cube-outline" label="Package" value={task.package?.code || summary.package.code} />
            <TextInput value={custodyTransferId} onChangeText={setCustodyTransferId} autoCapitalize="none" placeholder="custodyTransferId từ QR kho" placeholderTextColor={Colors.onSurfaceMuted} style={styles.input} />
            <TextInput value={packageCode} onChangeText={setPackageCode} autoCapitalize="characters" placeholder="Package code" placeholderTextColor={Colors.onSurfaceMuted} style={styles.input} />
            <Text style={styles.notice}>Quét hoặc nhập đúng hai giá trị trên phiếu/QR bàn giao của Staff Kho.</Text>
            <TouchableOpacity disabled={busy} style={[styles.primary, busy && styles.disabled]} onPress={() => void receivePackage()}>
              <Text style={styles.primaryText}>{busy ? "ĐANG XỬ LÝ..." : "XÁC NHẬN NHẬN PACKAGE"}</Text>
            </TouchableOpacity>
          </View>
        ) : serverStatus === "PACKAGE_RECEIVED" ? (
          <View style={styles.card}>
            <Text style={styles.section}>BƯỚC 2 · XÁC MINH NGƯỜI NHẬN</Text>
            <InfoRow icon="person-outline" label="Người nhận" value={recipientName(summary, task)} />
            <InfoRow icon="location-outline" label="Điểm tập trung" value={summary.point.name} />
            <TextInput value={pickupCode} onChangeText={setPickupCode} autoCapitalize="characters" placeholder="Mã pickup từ khách" placeholderTextColor={Colors.onSurfaceMuted} style={styles.input} />
            <Text style={styles.notice}>Chỉ xác minh khi đã đến đúng điểm tập trung và gặp người nhận.</Text>
            <TouchableOpacity disabled={busy} style={[styles.primary, busy && styles.disabled]} onPress={() => void verifyRecipient()}>
              <Text style={styles.primaryText}>{busy ? "ĐANG XÁC MINH..." : "XÁC MINH MÃ PICKUP"}</Text>
            </TouchableOpacity>
          </View>
        ) : serverStatus === "RECIPIENT_VERIFIED" ? (
          <View style={styles.card}>
            <Text style={styles.section}>BƯỚC 3 · KIỂM TRA VÀ BÀN GIAO</Text>
            {units.map((unit) => {
              const review = reviews[unit.unitId] || { status: "PENDING" as ItemStatus, note: "" };
              return (
                <View key={unit.unitId} style={styles.item}>
                  <Text style={styles.itemName}>{unit.product?.name || unit.assetCode}</Text>
                  <Text style={styles.assetCode}>{unit.assetCode}</Text>
                  <View style={styles.statusRow}>
                    {(["OK", "MISSING", "DAMAGED"] as ItemStatus[]).map((status) => (
                      <TouchableOpacity key={status} style={[styles.statusButton, review.status === status && styles.statusSelected]} onPress={() => setReview(unit.unitId, { status })}>
                        <Text style={[styles.statusText, review.status === status && styles.statusTextSelected]}>{status === "OK" ? "Đủ / tốt" : status === "MISSING" ? "Thiếu" : "Hư hỏng"}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {(review.status === "MISSING" || review.status === "DAMAGED") && (
                    <TextInput value={review.note} onChangeText={(note) => setReview(unit.unitId, { note })} placeholder="Mô tả bắt buộc" placeholderTextColor={Colors.onSurfaceMuted} style={styles.issueInput} />
                  )}
                </View>
              );
            })}
            <TextInput value={recipientNotes} onChangeText={setRecipientNotes} placeholder="Ghi chú của người nhận (không bắt buộc)" placeholderTextColor={Colors.onSurfaceMuted} multiline style={[styles.input, styles.notes]} />
            <TouchableOpacity disabled={busy || !allReviewed} style={[styles.primary, (busy || !allReviewed) && styles.disabled]} onPress={() => void handover()}>
              <Text style={styles.primaryText}>{busy ? "ĐANG BÀN GIAO..." : "XÁC NHẬN BÀN GIAO"}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Ionicons name="checkmark-circle" size={48} color={Colors.primaryDark} />
            <Text style={styles.cardTitle}>Task đã được xử lý</Text>
            <Text style={styles.muted}>Trạng thái server: {serverStatus}</Text>
          </View>
        )}

        {error && task ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
        {task && !completedStatus(serverStatus) ? (
          <TouchableOpacity style={styles.noShowButton} onPress={() => setNoShowVisible(true)}>
            <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
            <Text style={styles.noShowText}>KHÁCH KHÔNG ĐẾN / TỪ CHỐI NHẬN</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <Modal visible={noShowVisible} transparent animationType="slide" onRequestClose={() => setNoShowVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setNoShowVisible(false)}>
          <Pressable style={styles.menu} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.menuTitle}>Ghi nhận ngoại lệ giao hàng</Text>
            {noShowReasons.map((reason) => (
              <TouchableOpacity key={reason.value} style={[styles.reasonButton, noShowReason === reason.value && styles.reasonSelected]} onPress={() => setNoShowReason(reason.value)}>
                <Text style={styles.reasonText}>{reason.label}</Text>
              </TouchableOpacity>
            ))}
            <TextInput value={noShowNotes} onChangeText={setNoShowNotes} placeholder="Ghi chú bổ sung" placeholderTextColor={Colors.onSurfaceMuted} multiline style={[styles.input, styles.notes]} />
            <TouchableOpacity disabled={busy} style={[styles.dangerButton, busy && styles.disabled]} onPress={() => void markNoShow()}>
              <Text style={styles.primaryText}>{busy ? "ĐANG GHI NHẬN..." : "XÁC NHẬN NGOẠI LỆ"}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <FieldModal
        visible={complete}
        title="Đã cập nhật task"
        message="Trạng thái giao nhận đã được Backend ghi nhận."
        icon="checkmark-circle"
        actionLabel="Về dashboard"
        onAction={() => { setComplete(false); router.replace("/field-operations" as never); }}
        onClose={() => setComplete(false)}
      />
      <FieldModal
        visible={feedback !== null}
        title={feedback?.title || ""}
        message={feedback?.message || ""}
        icon="information-circle"
        tone="warning"
        actionLabel="Đã hiểu"
        onAction={() => setFeedback(null)}
        onClose={() => setFeedback(null)}
      />
    </SafeAreaView>
  );
}

function completedStatus(status?: string) {
  return Boolean(status && ["HANDED_OVER", "NO_SHOW", "REFUSED", "CLOSED", "CANCELLED"].includes(status));
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Ionicons name={icon} size={18} color={Colors.primaryDark} />
      <View><Text style={styles.muted}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: 20, paddingBottom: 35 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 28 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  headerTitle: { color: Colors.ink, fontSize: 17, fontWeight: "800" },
  taskHeader: { backgroundColor: Colors.inverseSurface, padding: 18, borderRadius: Radius.md, marginBottom: 18, ...Shadows.tactical },
  taskId: { color: Colors.primary, fontSize: 11, fontWeight: "800" },
  title: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 7 },
  meta: { color: "#bed0bb", fontSize: 13, marginTop: 8 },
  card: { backgroundColor: "#fff", padding: 17, borderRadius: Radius.md, marginBottom: 16, ...Shadows.card },
  section: { color: Colors.onSurfaceMuted, fontSize: 11, fontWeight: "800", letterSpacing: 0.8, marginBottom: 12 },
  cardTitle: { color: Colors.ink, fontSize: 18, fontWeight: "800", marginTop: 8 },
  muted: { color: Colors.onSurfaceMuted, fontSize: 12, marginTop: 6 },
  input: { borderWidth: 1, borderColor: Colors.surfaceContainerHighest, borderRadius: Radius.sm, padding: 13, color: Colors.ink, marginTop: 10 },
  notes: { minHeight: 76, textAlignVertical: "top" },
  notice: { color: Colors.body, backgroundColor: "#fff5d7", padding: 12, borderRadius: 8, marginTop: 12, fontSize: 12 },
  primary: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.primaryDark, padding: 15, borderRadius: Radius.sm, marginTop: 15 },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  disabled: { opacity: 0.55 },
  info: { flexDirection: "row", gap: 12, alignItems: "center", paddingBottom: 12, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainer },
  infoValue: { color: Colors.ink, fontSize: 14, fontWeight: "700", marginTop: 3 },
  item: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainer },
  itemName: { color: Colors.ink, fontSize: 14, fontWeight: "700" },
  assetCode: { color: Colors.onSurfaceMuted, fontSize: 11, marginTop: 3 },
  statusRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  statusButton: { borderWidth: 1, borderColor: Colors.surfaceContainerHighest, borderRadius: 7, paddingVertical: 8, paddingHorizontal: 9 },
  statusSelected: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
  statusText: { color: Colors.ink, fontSize: 10, fontWeight: "700" },
  statusTextSelected: { color: "#fff" },
  issueInput: { borderWidth: 1, borderColor: Colors.error, borderRadius: 7, padding: 9, color: Colors.ink, marginTop: 8 },
  errorBox: { backgroundColor: "#ffe8e5", borderRadius: Radius.sm, padding: 12, marginBottom: 12 },
  errorText: { color: Colors.error, fontSize: 12, marginTop: 8 },
  noShowButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14 },
  noShowText: { color: Colors.error, fontWeight: "800", fontSize: 11 },
  backdrop: { flex: 1, backgroundColor: "rgba(14,15,12,.45)", justifyContent: "flex-end" },
  menu: { backgroundColor: Colors.surface, padding: 22, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  menuTitle: { color: Colors.ink, fontSize: 19, fontWeight: "800", marginBottom: 12 },
  reasonButton: { padding: 11, borderRadius: 8, marginBottom: 6, backgroundColor: Colors.surfaceContainerLow },
  reasonSelected: { backgroundColor: "#dcefd2", borderWidth: 1, borderColor: Colors.primaryDark },
  reasonText: { color: Colors.ink, fontSize: 12, fontWeight: "700" },
  dangerButton: { alignItems: "center", backgroundColor: Colors.error, padding: 14, borderRadius: Radius.sm, marginTop: 12 },
});