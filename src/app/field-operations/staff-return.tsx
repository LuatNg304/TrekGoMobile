import { FieldModal } from "@/components/FieldModal";
import { Colors, Radius, Shadows } from "@/constants/theme";
import { useAuth } from "@/features/auth/AuthContext";
import { rentalApi } from "@/features/rentals/api";
import {
  DeliveryTaskDetail,
  DeliveryTaskSummary,
  RentalOrderDetail,
  RentalReturnScanResult,
} from "@/features/rentals/types";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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

const labels: Record<ItemStatus, string> = {
  PENDING: "Chưa kiểm",
  OK: "Bình thường",
  MISSING: "Thiếu",
  DAMAGED: "Hư hỏng",
};

function operationKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function recipientName(task?: DeliveryTaskSummary) {
  const recipient = task?.orderSummary.recipient;
  return recipient?.displayName || recipient?.fullName || recipient?.name || "Khách thuê";
}

export default function StaffReturnScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ taskId?: string | string[]; orderId?: string | string[] }>();
  const requestedTaskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId;
  const requestedOrderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const { accessToken } = useAuth();
  const mutationKeys = useRef({
    claim: operationKey("claim-return"),
    scan: operationKey("scan-return"),
    operation: operationKey("return-operation"),
    observe: operationKey("observe-return"),
    transfer: operationKey("transfer-return"),
  });

  const [summary, setSummary] = useState<DeliveryTaskSummary>();
  const [task, setTask] = useState<DeliveryTaskDetail>();
  const [order, setOrder] = useState<RentalOrderDetail>();
  const [reviews, setReviews] = useState<Record<string, ItemReview>>({});
  const [scanResult, setScanResult] = useState<RentalReturnScanResult>();
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string>();
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) {
      setError("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại bằng tài khoản Staff Delivery.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const listed = await rentalApi.listDeliveryTasks(accessToken, { type: "RETURN" });
      const selected =
        listed.items.find((item) => item.id === requestedTaskId) ??
        listed.items.find((item) => item.orderSummary.orderId === requestedOrderId) ??
        listed.items.find((item) => !["INVENTORY_RECEIVED", "CLOSED", "CANCELLED"].includes(item.status));

      if (!selected) {
        setSummary(undefined);
        setTask(undefined);
        setOrder(undefined);
        setError("Chưa có task thu hồi. Task chỉ mở sau khi Leader xác nhận kết thúc chuyến.");
        return;
      }

      let taskDetail: DeliveryTaskDetail;
      try {
        taskDetail = await rentalApi.getDeliveryTask(selected.id, accessToken);
      } catch (detailError) {
        if (selected.status !== "SCHEDULED") throw detailError;
        await rentalApi.claimDeliveryTask(
          selected.id,
          selected.version,
          mutationKeys.current.claim,
          accessToken,
        );
        taskDetail = await rentalApi.getDeliveryTask(selected.id, accessToken);
      }
      const orderDetail = await rentalApi.getOrder(selected.orderSummary.orderId, accessToken);
      setSummary({ ...selected, version: taskDetail.task.version });
      setTask(taskDetail);
      setOrder(orderDetail);
      setReviews((current) => {
        const next = { ...current };
        taskDetail.units.forEach((unit) => {
          next[unit.unitId] ??= { status: "PENDING", note: "" };
        });
        return next;
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tải được task thu hồi.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, requestedOrderId, requestedTaskId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const units = useMemo(() => task?.units ?? [], [task?.units]);
  const allReviewed = units.length > 0 && units.every((unit) => {
    const review = reviews[unit.unitId];
    return review && review.status !== "PENDING" && (review.status === "OK" || review.note.trim().length > 0);
  });
  const receivedUnits = useMemo(
    () => units.filter((unit) => reviews[unit.unitId]?.status !== "MISSING"),
    [reviews, units],
  );
  const issueCount = units.filter((unit) => ["MISSING", "DAMAGED"].includes(reviews[unit.unitId]?.status)).length;

  const setReview = (unitId: string, update: Partial<ItemReview>) => {
    setReviews((current) => ({
      ...current,
      [unitId]: { status: current[unitId]?.status ?? "PENDING", note: current[unitId]?.note ?? "", ...update },
    }));
  };

  const scanReturn = async () => {
    if (!accessToken || !summary || !order || busy) return;
    if (!allReviewed) {
      setFeedback({ title: "Chưa đủ đối soát", message: "Đánh dấu từng món; thiết bị thiếu hoặc hư hỏng phải có ghi chú." });
      return;
    }
    if (receivedUnits.length === 0) {
      setFeedback({ title: "Không có thiết bị để quét", message: "BE yêu cầu ít nhất một thiết bị thực nhận. Trường hợp mất toàn bộ cần chuyển cho quy trình ngoại lệ." });
      return;
    }

    setBusy(true);
    setError(undefined);
    try {
      const result = await rentalApi.scanRentalReturn(
        summary.orderSummary.orderId,
        {
          assetCodes: receivedUnits.map((unit) => unit.assetCode),
          operationId: mutationKeys.current.operation,
          expectedVersion: order.order.version,
        },
        mutationKeys.current.scan,
        accessToken,
      );
      setScanResult(result);
      setOrder((current) => current ? { ...current, order: { ...current.order, version: result.version } } : current);
      setStage(1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Quét nhận thiết bị thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const recordObservations = async () => {
    if (!accessToken || !summary || !scanResult || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await rentalApi.submitRentalReturnObservations(
        summary.orderSummary.orderId,
        {
          items: receivedUnits.map((unit) => {
            const review = reviews[unit.unitId];
            return {
              unitId: unit.unitId,
              visibleDamage: review.status === "DAMAGED",
              accessoryObservations: review.status === "DAMAGED" && review.note.trim() ? [review.note.trim()] : [],
              notes: review.note.trim() || undefined,
              evidenceIds: [],
            };
          }),
          expectedVersion: scanResult.version,
        },
        mutationKeys.current.observe,
        accessToken,
      );
      const refreshed = await rentalApi.getDeliveryTask(scanResult.returnId, accessToken);
      setTask(refreshed);
      setStage(2);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không ghi nhận được hiện trạng.");
    } finally {
      setBusy(false);
    }
  };

  const transferToInventory = async () => {
    if (!accessToken || !task || !scanResult || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await rentalApi.transferRentalReturnToInventory(
        scanResult.returnId,
        {
          unitIds: scanResult.receivedUnits.map((unit) => unit.unitId),
          packageId: task.package?.id,
          expectedVersion: task.task.version,
        },
        mutationKeys.current.transfer,
        accessToken,
      );
      setComplete(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tạo được yêu cầu bàn giao về kho.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator size="large" color={Colors.primaryDark} /><Text style={styles.muted}>Đang tải task thu hồi thật...</Text></View></SafeAreaView>;
  }

  if (!summary || !task || !order) {
    return <SafeAreaView style={styles.safe}><View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={23} color={Colors.ink} /></TouchableOpacity><Text style={styles.headerTitle}>Thu hồi thiết bị</Text><View style={{ width: 23 }} /></View><View style={styles.center}><Ionicons name="lock-closed-outline" size={48} color="#9b6700" /><Text style={styles.emptyTitle}>Task chưa sẵn sàng</Text><Text style={styles.muted}>{error}</Text><TouchableOpacity style={styles.retry} onPress={() => void load()}><Text style={styles.primaryText}>TẢI LẠI</Text></TouchableOpacity></View></SafeAreaView>;
  }

  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.header, styles.contentHeader]}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={23} color={Colors.ink} /></TouchableOpacity><Text style={styles.headerTitle}>Chi tiết thu hồi</Text><View style={{ width: 23 }} /></View>
      <View style={styles.taskHeader}><Text style={styles.taskId}>{summary.id}</Text><Text style={styles.title}>Thu hồi thiết bị sau chuyến</Text><Text style={styles.meta}>{recipientName(summary)} · {summary.point.name}</Text></View>
      <View style={styles.steps}>{["Thu hồi", "Ghi nhận", "Về kho"].map((label, index) => <View key={label} style={styles.step}><View style={[styles.stepCircle, index < stage && styles.stepDone]}>{index < stage ? <Ionicons name="checkmark" size={14} color="#fff" /> : <Text style={styles.stepNumber}>{index + 1}</Text>}</View><Text style={styles.stepLabel}>{label}</Text></View>)}</View>

      {stage === 0 && <View style={styles.card}><Text style={styles.section}>THU HỒI & QUÉT THIẾT BỊ</Text>{units.map((unit) => { const review = reviews[unit.unitId] ?? { status: "PENDING" as ItemStatus, note: "" }; return <View key={unit.unitId} style={styles.item}><Text style={styles.checkLabel}>{unit.product?.name || unit.assetCode}</Text><Text style={styles.assetCode}>{unit.assetCode}</Text><View style={styles.statusRow}>{(["OK", "MISSING", "DAMAGED"] as ItemStatus[]).map((status) => <TouchableOpacity key={status} style={[styles.statusButton, review.status === status && styles.statusSelected]} onPress={() => setReview(unit.unitId, { status })}><Text style={[styles.statusText, review.status === status && styles.statusTextSelected]}>{labels[status]}</Text></TouchableOpacity>)}</View>{(review.status === "MISSING" || review.status === "DAMAGED") && <TextInput value={review.note} onChangeText={(note) => setReview(unit.unitId, { note })} placeholder="Ghi chú bắt buộc" placeholderTextColor={Colors.onSurfaceMuted} style={styles.noteInput} />}</View>; })}<View style={styles.summary}><Text style={styles.noticeText}>{receivedUnits.length} món thực nhận · {issueCount} món có vấn đề.</Text></View></View>}

      {stage === 1 && <View style={styles.card}><Text style={styles.section}>QUAN SÁT SƠ BỘ</Text><Ionicons name="clipboard-outline" size={44} color={Colors.primaryDark} /><Text style={styles.cardTitle}>Đã quét {scanResult?.receivedUnits.length ?? 0} thiết bị</Text><Text style={styles.muted}>{scanResult?.missingUnits.length ?? 0} thiết bị chưa nhận được ghi nhận MISSING_PENDING_REVIEW.</Text><Text style={styles.policy}>Staff Delivery chỉ ghi nhận ngoại quan theo dữ liệu vừa nhập. Đây không phải kết luận kiểm định cuối cùng và không hoàn cọc tại chỗ.</Text></View>}

      {stage === 2 && <View style={styles.card}><Text style={styles.section}>BÀN GIAO VỀ KHO</Text><Ionicons name="business-outline" size={44} color={Colors.primaryDark} /><Text style={styles.cardTitle}>Sẵn sàng chuyển quyền quản lý</Text><Text style={styles.muted}>Kho sẽ xác nhận nhận hàng và thực hiện kiểm định chuyên sâu.</Text><Text style={styles.policy}>Thiết bị chưa chuyển AVAILABLE ở bước này.</Text></View>}

      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      <TouchableOpacity disabled={busy || (stage === 0 && !allReviewed)} style={[styles.primary, (busy || (stage === 0 && !allReviewed)) && styles.disabled]} onPress={() => void (stage === 0 ? scanReturn() : stage === 1 ? recordObservations() : transferToInventory())}><Text style={styles.primaryText}>{busy ? "ĐANG XỬ LÝ..." : stage === 0 ? "QUÉT NHẬN THIẾT BỊ" : stage === 1 ? "GHI NHẬN HIỆN TRẠNG" : "CHUYỂN VỀ KHO"}</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></TouchableOpacity>
    </ScrollView>
    <FieldModal visible={complete} title="Đã chuyển về kho" message="Yêu cầu bàn giao đã tạo. Chờ Staff Inventory xác nhận nhận hàng và kiểm định; Staff Delivery không hoàn cọc." icon="checkmark-circle" actionLabel="Về dashboard" onAction={() => { setComplete(false); router.replace("/field-operations" as never); }} onClose={() => setComplete(false)} />
    <FieldModal visible={feedback !== null} title={feedback?.title ?? ""} message={feedback?.message ?? ""} icon="information-circle" tone="warning" actionLabel="Đã hiểu" onAction={() => setFeedback(null)} onClose={() => setFeedback(null)} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: 20, paddingBottom: 35 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 28 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingHorizontal: 20, paddingTop: 12 },
  contentHeader: { paddingHorizontal: 0, paddingTop: 0 },
  headerTitle: { color: Colors.ink, fontSize: 17, fontWeight: "800" },
  taskHeader: { backgroundColor: Colors.inverseSurface, padding: 18, borderRadius: Radius.md, marginBottom: 16 },
  taskId: { color: Colors.primary, fontSize: 11, fontWeight: "800" },
  title: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 7 },
  meta: { color: "#bed0bb", fontSize: 13, marginTop: 8 },
  steps: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  step: { alignItems: "center", width: "32%" },
  stepCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.surfaceContainerHighest, alignItems: "center", justifyContent: "center" },
  stepDone: { backgroundColor: Colors.primaryDark },
  stepNumber: { color: Colors.onSurfaceMuted, fontWeight: "800", fontSize: 12 },
  stepLabel: { color: Colors.onSurfaceMuted, fontSize: 10, textAlign: "center", marginTop: 6 },
  card: { backgroundColor: "#fff", padding: 17, borderRadius: Radius.md, marginBottom: 18, ...Shadows.card },
  section: { color: Colors.onSurfaceMuted, fontSize: 11, fontWeight: "800", letterSpacing: 0.8, marginBottom: 10 },
  item: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainer },
  checkLabel: { color: Colors.ink, fontSize: 14, fontWeight: "700" },
  assetCode: { color: Colors.onSurfaceMuted, fontSize: 11, marginTop: 3 },
  statusRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  statusButton: { borderWidth: 1, borderColor: Colors.surfaceContainerHighest, borderRadius: 7, paddingVertical: 8, paddingHorizontal: 9 },
  statusSelected: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
  statusText: { color: Colors.ink, fontSize: 10, fontWeight: "700" },
  statusTextSelected: { color: "#fff" },
  noteInput: { borderWidth: 1, borderColor: Colors.error, borderRadius: 7, padding: 9, color: Colors.ink, marginTop: 8 },
  summary: { backgroundColor: "#fff5d7", padding: 12, borderRadius: 8, marginTop: 15 },
  noticeText: { color: Colors.body, fontSize: 12 },
  cardTitle: { color: Colors.ink, fontSize: 17, fontWeight: "800", marginTop: 10 },
  muted: { color: Colors.onSurfaceMuted, fontSize: 12, marginTop: 5, textAlign: "center" },
  policy: { color: Colors.primaryDark, marginTop: 16, lineHeight: 19 },
  errorBox: { backgroundColor: "#ffe8e5", borderRadius: Radius.sm, padding: 12, marginBottom: 12 },
  errorText: { color: Colors.error, fontSize: 12 },
  primary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.primaryDark, padding: 15, borderRadius: Radius.sm },
  retry: { backgroundColor: Colors.primaryDark, paddingVertical: 12, paddingHorizontal: 20, borderRadius: Radius.sm },
  disabled: { opacity: 0.55 },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  emptyTitle: { color: Colors.ink, fontSize: 18, fontWeight: "800" },
});
