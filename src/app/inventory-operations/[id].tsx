import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  PreparationCandidate,
  PreparationTaskDetail,
  RentalDeliveryAssignee,
  staffInventoryApi,
  uploadInventoryEvidence,
} from "@/features/rentals/staff-inventory-api";

type BusyAction = "claim" | "pick" | "evidence" | "pack" | "ready" | "transfer";

export default function InventoryTaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const [detail, setDetail] = useState<PreparationTaskDetail | null>(null);
  const [candidates, setCandidates] = useState<PreparationCandidate[]>([]);
  const [deliveryStaff, setDeliveryStaff] = useState<RentalDeliveryAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<BusyAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remainingLine = useMemo(
    () => detail?.requiredLines.find((line) => line.remainingQty > 0),
    [detail],
  );

  const load = useCallback(async () => {
    if (!id || !accessToken) return;
    setError(null);
    try {
      const nextDetail = await staffInventoryApi.getTask(id, accessToken);
      setDetail(nextDetail);
      const nextRemaining = nextDetail.requiredLines.find(
        (line) => line.remainingQty > 0,
      );
      const [candidateResult, staffResult] = await Promise.all([
        nextRemaining
          ? staffInventoryApi.listCandidates(
              id,
              nextRemaining.productId,
              accessToken,
            )
          : Promise.resolve({ items: [] }),
        nextDetail.package?.status === "READY"
          ? staffInventoryApi.listDeliveryStaff(accessToken)
          : Promise.resolve({ items: [] }),
      ]);
      setCandidates(candidateResult.items);
      setDeliveryStaff(staffResult.items);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải chi tiết task kho.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const run = async (action: BusyAction, request: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(action);
    setError(null);
    try {
      await request();
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Thao tác chưa thể hoàn tất.",
      );
    } finally {
      setBusy(null);
    }
  };

  async function captureEvidence(unitId: string) {
    if (!detail || !accessToken) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Cần quyền camera", "Hãy cấp quyền để chụp tình trạng thiết bị.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await run("evidence", async () => {
      const mediaId = await uploadInventoryEvidence(asset, accessToken);
      await staffInventoryApi.saveCondition(
        detail.task.id,
        {
          unitId,
          condition: "GOOD",
          notes: "Ảnh tình trạng trước bàn giao từ Mobile",
          evidenceIds: [mediaId],
          expectedVersion: detail.version,
        },
        accessToken,
      );
    });
  }

  if (loading && !detail) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={Colors.primaryDark} />
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>{error || "Không tìm thấy task kho."}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => void load()}>
          <Text style={styles.primaryText}>Thử lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const evidenceComplete = detail.progress.evidenceComplete ?? 0;
  const canPack =
    detail.progress.required > 0 &&
    detail.progress.picked === detail.progress.required &&
    evidenceComplete === detail.progress.picked &&
    !detail.package;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chuẩn bị đơn thuê</Text>
          <TouchableOpacity onPress={() => void load()}>
            <Ionicons name="refresh" size={22} color={Colors.primaryDark} />
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroCode}>{detail.task.id}</Text>
          <Text style={styles.heroTitle}>{detail.pickupContext.name}</Text>
          <Text style={styles.heroMeta}>
            {new Date(detail.pickupContext.scheduledAt).toLocaleString("vi-VN")}
          </Text>
          <Text style={styles.heroStatus}>{detail.task.status}</Text>
        </View>

        {error && <Text style={styles.errorBanner}>{error}</Text>}

        {!detail.task.assignee && detail.task.status === "OPEN" && (
          <ActionButton
            label={busy === "claim" ? "Đang nhận task..." : "Nhận task kho"}
            disabled={Boolean(busy)}
            onPress={() =>
              void run("claim", () =>
                staffInventoryApi.claim(
                  detail.task.id,
                  detail.version,
                  accessToken!,
                ),
              )
            }
          />
        )}

        <SectionTitle title="1. Danh sách cần chuẩn bị" />
        <View style={styles.card}>
          {detail.requiredLines.map((line) => (
            <View key={line.orderLineId} style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{line.productName}</Text>
                <Text style={styles.rowMeta}>Product: {line.productId}</Text>
              </View>
              <Text style={styles.quantity}>
                {line.pickedQty}/{line.requiredQty}
              </Text>
            </View>
          ))}
        </View>

        {remainingLine && (
          <>
            <SectionTitle title={`2. Chọn asset cho ${remainingLine.productName}`} />
            <View style={styles.card}>
              {candidates.length === 0 ? (
                <Text style={styles.muted}>Không có asset khả dụng tại kho.</Text>
              ) : (
                candidates.map((candidate) => (
                  <View key={candidate.id} style={styles.row}>
                    <View style={styles.flex}>
                      <Text style={styles.rowTitle}>{candidate.assetCode}</Text>
                      <Text style={styles.rowMeta}>
                        {candidate.condition} · {candidate.location || "Chưa có vị trí"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.smallButton}
                      disabled={Boolean(busy)}
                      onPress={() =>
                        void run("pick", () =>
                          staffInventoryApi.pick(
                            detail.task.id,
                            [candidate.assetCode],
                            detail.version,
                            accessToken!,
                          ),
                        )
                      }
                    >
                      <Text style={styles.smallButtonText}>PICK</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {detail.pickedUnits.length > 0 && (
          <>
            <SectionTitle title="3. Ảnh tình trạng trước giao" />
            <View style={styles.card}>
              {detail.pickedUnits.map((unit) => (
                <View key={unit.unitId} style={styles.row}>
                  <View style={styles.flex}>
                    <Text style={styles.rowTitle}>{unit.assetCode}</Text>
                    <Text style={styles.rowMeta}>
                      {unit.evidenceCaptured ? "Đã có bằng chứng" : "Chưa chụp ảnh"}
                    </Text>
                  </View>
                  {unit.evidenceCaptured ? (
                    <Ionicons name="checkmark-circle" size={25} color={Colors.primaryDark} />
                  ) : (
                    <TouchableOpacity
                      style={styles.cameraButton}
                      disabled={Boolean(busy)}
                      onPress={() => void captureEvidence(unit.unitId)}
                    >
                      <Ionicons name="camera" size={18} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        {!detail.package && (
          <ActionButton
            label={busy === "pack" ? "Đang đóng gói..." : "Đóng gói & tạo QR package"}
            disabled={!canPack || Boolean(busy)}
            onPress={() =>
              void run("pack", () =>
                staffInventoryApi.pack(
                  detail.task.id,
                  detail.pickedUnits.map((unit) => unit.unitId),
                  detail.version,
                  accessToken!,
                ),
              )
            }
          />
        )}

        {detail.package && (
          <>
            <SectionTitle title="4. Package bàn giao" />
            <View style={styles.packageCard}>
              <Ionicons name="qr-code" size={58} color={Colors.primaryDark} />
              <Text style={styles.packageCode}>{detail.package.code}</Text>
              <Text style={styles.muted}>
                {detail.package.unitIds.length} thiết bị · {detail.package.status}
              </Text>
            </View>
            {detail.package.status === "PACKED" && (
              <ActionButton
                label={busy === "ready" ? "Đang tạo task giao..." : "Đánh dấu READY & tạo Delivery Task"}
                disabled={Boolean(busy)}
                onPress={() =>
                  void run("ready", () =>
                    staffInventoryApi.markReady(
                      detail.task.id,
                      detail.package!.id,
                      detail.version,
                      accessToken!,
                    ),
                  )
                }
              />
            )}
          </>
        )}

        {detail.package?.status === "READY" && !detail.pendingTransfer && (
          <>
            <SectionTitle title="5. Chuyển package cho Staff Delivery" />
            <View style={styles.card}>
              {deliveryStaff.length === 0 ? (
                <Text style={styles.muted}>Không có Staff Delivery ACTIVE.</Text>
              ) : (
                deliveryStaff.map((staff) => (
                  <View key={staff.id} style={styles.row}>
                    <View style={styles.flex}>
                      <Text style={styles.rowTitle}>{staff.displayName}</Text>
                      <Text style={styles.rowMeta}>
                        {staff.activeTaskCount} task đang hoạt động
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.smallButton}
                      disabled={Boolean(busy)}
                      onPress={() =>
                        void run("transfer", () =>
                          staffInventoryApi.requestTransfer(
                            detail.task.id,
                            detail.package!.id,
                            staff.id,
                            detail.version,
                            accessToken!,
                          ),
                        )
                      }
                    >
                      <Text style={styles.smallButtonText}>CHUYỂN</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {detail.pendingTransfer && (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={28} color={Colors.primaryDark} />
            <View style={styles.flex}>
              <Text style={styles.successTitle}>Đã tạo yêu cầu bàn giao</Text>
              <Text style={styles.rowMeta}>
                {detail.pendingTransfer.toStaff.displayName} · {detail.pendingTransfer.status}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
}

function ActionButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, disabled && styles.disabled]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
    backgroundColor: Colors.surface,
  },
  content: { padding: 20, paddingBottom: 50 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTitle: { color: Colors.ink, fontSize: 17, fontWeight: "800" },
  hero: {
    backgroundColor: Colors.inverseSurface,
    borderRadius: Radius.md,
    padding: 18,
    marginBottom: 18,
    ...Shadows.tactical,
  },
  heroCode: { color: Colors.primary, fontSize: 10, fontWeight: "800" },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 8 },
  heroMeta: { color: "#bed0bb", fontSize: 12, marginTop: 7 },
  heroStatus: { color: Colors.primary, fontSize: 12, fontWeight: "800", marginTop: 12 },
  error: { color: Colors.error, textAlign: "center" },
  errorBanner: {
    color: Colors.error,
    backgroundColor: "#ffe8e5",
    borderRadius: Radius.sm,
    padding: 12,
    marginBottom: 14,
  },
  section: {
    color: Colors.onSurfaceMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginTop: 18,
    marginBottom: 9,
  },
  card: { backgroundColor: "#fff", borderRadius: Radius.md, padding: 15, ...Shadows.card },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer,
  },
  flex: { flex: 1 },
  rowTitle: { color: Colors.ink, fontSize: 14, fontWeight: "800" },
  rowMeta: { color: Colors.onSurfaceMuted, fontSize: 11, marginTop: 4 },
  quantity: { color: Colors.primaryDark, fontSize: 17, fontWeight: "800" },
  muted: { color: Colors.onSurfaceMuted, fontSize: 12, textAlign: "center" },
  smallButton: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  smallButtonText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  cameraButton: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 20,
    padding: 10,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.sm,
    padding: 15,
    marginTop: 16,
  },
  primaryText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  disabled: { opacity: 0.45 },
  packageCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: Radius.md,
    padding: 22,
    ...Shadows.card,
  },
  packageCode: { color: Colors.ink, fontSize: 22, fontWeight: "800", marginVertical: 9 },
  successCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#eaf5e1",
    borderRadius: Radius.md,
    padding: 16,
    marginTop: 18,
  },
  successTitle: { color: Colors.primaryDark, fontSize: 14, fontWeight: "800" },
});
