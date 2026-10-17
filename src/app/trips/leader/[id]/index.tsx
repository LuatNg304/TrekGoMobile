import { Ionicons } from "@expo/vector-icons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Radius, Shadows } from "@/constants/theme";
import {
  cf01PublicTripApi,
  LeaderTrip,
  parseCf01Error,
} from "@/services/api/cf01PublicTripApi";

export default function LeaderTripDetailScreen() {
  const router = useRouter();
  const { id, cancelModal: initCancelModal } = useLocalSearchParams<{
    id: string;
    cancelModal?: string;
  }>();

  const [trip, setTrip] = useState<LeaderTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cancellation modal states
  const [showCancelModal, setShowCancelModal] = useState(initCancelModal === "1");
  const [cancelReason, setCancelReason] = useState("");
  const [evidenceUrlInput, setEvidenceUrlInput] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const fetchTripDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await cf01PublicTripApi.getLeaderTripDetail(id);
      setTrip(data);
    } catch (err) {
      const parsed = parseCf01Error(err);
      setErrorMsg(parsed.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTripDetail();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchTripDetail]);

  const handleAddEvidenceUrl = () => {
    const trimmed = evidenceUrlInput.trim();
    if (!trimmed) return;
    if (evidenceUrls.length >= 10) {
      Alert.alert("Tối đa", "Bạn chỉ được đính kèm tối đa 10 đường dẫn hình ảnh.");
      return;
    }
    setEvidenceUrls([...evidenceUrls, trimmed]);
    setEvidenceUrlInput("");
  };

  const handleRemoveEvidenceUrl = (index: number) => {
    setEvidenceUrls(evidenceUrls.filter((_, i) => i !== index));
  };

  const handleSubmitCancellation = async () => {
    if (!trip) return;
    if (!cancelReason.trim()) {
      Alert.alert("Thiếu lý do", "Vui lòng nhập lý do cụ thể bạn muốn hủy chuyến đi.");
      return;
    }

    try {
      setSubmittingCancel(true);
      const updated = await cf01PublicTripApi.cancelTrip(
        trip.id,
        trip.version,
        cancelReason.trim(),
        evidenceUrls,
      );
      setTrip(updated);
      setShowCancelModal(false);
      Alert.alert(
        "Đã gửi yêu cầu hủy chuyến",
        "Chuyến đi đã chuyển sang trạng thái CANCEL_PENDING và đang chờ xét duyệt.",
      );
    } catch (err) {
      const parsed = parseCf01Error(err);
      let alertMsg = parsed.message;
      if (parsed.issues && parsed.issues.length > 0) {
        alertMsg += "\n• " + parsed.issues.map((it) => it.message).join("\n• ");
      }
      Alert.alert("Lỗi gửi yêu cầu hủy", alertMsg);
    } finally {
      setSubmittingCancel(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải chi tiết chuyến đi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMsg || !trip) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={50} color={Colors.error} />
          <Text style={styles.errorText}>
            {errorMsg || "Không tìm thấy dữ liệu chuyến đi"}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/trips/leader" as Href);
            }}
          >
            <Text style={styles.retryBtnText}>Quay lại danh sách</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isDraft = trip.status === "DRAFT";
  const isOpen = trip.status === "OPEN";
  const isCancelPending = trip.status === "CANCEL_PENDING";

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {trip.title}
          </Text>
          <Text style={styles.headerSub}>
            Leader Management · Version {trip.version}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={fetchTripDetail}>
          <Ionicons name="refresh" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status banner */}
        <View
          style={[
            styles.banner,
            isDraft
              ? styles.bannerDraft
              : isOpen
                ? styles.bannerOpen
                : isCancelPending
                  ? styles.bannerCancelPending
                  : styles.bannerDefault,
          ]}
        >
          <View style={styles.bannerRow}>
            <Ionicons
              name={
                isDraft
                  ? "create-outline"
                  : isOpen
                    ? "checkmark-circle"
                    : isCancelPending
                      ? "alert-circle"
                      : "information-circle"
              }
              size={22}
              color={
                isDraft
                  ? "#b45309"
                  : isOpen
                    ? "#15803d"
                    : isCancelPending
                      ? "#b91c1c"
                      : "#374151"
              }
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.bannerTitle,
                  {
                    color: isDraft
                      ? "#b45309"
                      : isOpen
                        ? "#15803d"
                        : isCancelPending
                          ? "#b91c1c"
                          : "#374151",
                  },
                ]}
              >
                TRẠNG THÁI: {trip.status} (v{trip.version})
              </Text>
              <Text style={styles.bannerDesc}>
                {isDraft
                  ? "Bản nháp nội bộ. Cần hoàn thiện Checkpoints, Trails và kiểm tra Readiness trước khi xuất bản."
                  : isOpen
                    ? "Chuyến đi đã xuất bản thành công! Người dùng có thể tìm kiếm và đặt tour công khai."
                    : isCancelPending
                      ? "Đang có yêu cầu hủy chuyến. Hệ thống đang xử lý và bảo vệ quyền lợi thành viên."
                      : "Chuyến đi đang ở trạng thái đặc thù."}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Shortcuts Bar */}
        {isDraft ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.mainActionBtn, styles.actionPrimary]}
              onPress={() =>
                router.push({
                  pathname: "/trips/leader/[id]/route",
                  params: { id: trip.id },
                } as unknown as Href)
              }
            >
              <Ionicons name="trail-sign" size={18} color="#fff" />
              <Text style={styles.mainActionBtnText}>
                1. Lên lộ trình (Trails & Mốc)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mainActionBtn, styles.actionAccent]}
              onPress={() =>
                router.push({
                  pathname: "/trips/leader/[id]/publish",
                  params: { id: trip.id },
                } as unknown as Href)
              }
            >
              <Ionicons name="rocket" size={18} color="#fff" />
              <Text style={styles.mainActionBtnText}>
                2. Kiểm tra & Publish
              </Text>
            </TouchableOpacity>
          </View>
        ) : isOpen ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.mainActionBtn, styles.actionPrimary]}
              onPress={() =>
                router.push({
                  pathname: "/trips/[id]",
                  params: { id: trip.id },
                } as unknown as Href)
              }
            >
              <Ionicons name="eye-outline" size={18} color="#fff" />
              <Text style={styles.mainActionBtnText}>Xem trang User (3D Map)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mainActionBtn, styles.actionDanger]}
              onPress={() => setShowCancelModal(true)}
            >
              <Ionicons name="close-circle-outline" size={18} color="#fff" />
              <Text style={styles.mainActionBtnText}>Yêu cầu hủy chuyến</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Thông tin chung */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin chuyến đi</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tên chuyến:</Text>
            <Text style={styles.infoValue}>{trip.title}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Thời gian:</Text>
            <Text style={styles.infoValue}>
              {new Date(trip.startAt).toLocaleString("vi-VN")} →{" "}
              {new Date(trip.endAt).toLocaleString("vi-VN")}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Quy mô:</Text>
            <Text style={styles.infoValue}>{trip.capacity} khách</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Giá niêm yết:</Text>
            <Text style={[styles.infoValue, styles.priceHighlight]}>
              {trip.price
                ? `${parseInt(trip.price, 10).toLocaleString("vi-VN")} đ / khách`
                : "Chưa đặt"}
            </Text>
          </View>

          {trip.description ? (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.infoLabel}>Mô tả:</Text>
              <Text style={styles.descText}>{trip.description}</Text>
            </View>
          ) : null}
        </View>

        {/* Cơ sở tính giá nội bộ (Bắt buộc trước khi publish) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Cơ cấu giá nội bộ Leader</Text>
            {trip.priceExplanation ? (
              <Ionicons name="checkmark-circle" size={18} color="#15803d" />
            ) : (
              <Ionicons name="alert-circle" size={18} color="#b45309" />
            )}
          </View>

          {trip.priceExplanation ? (
            <Text style={styles.explanationBox}>{trip.priceExplanation}</Text>
          ) : (
            <View style={styles.warningBox}>
              <Text style={styles.warningBoxText}>
                ⚠️ Chưa có giải trình chi phí. Bạn bắt buộc phải bổ sung thông
                tin này trước khi xuất bản sang trạng thái OPEN!
              </Text>
            </View>
          )}
        </View>

        {/* Danh sách Checkpoints đã gán */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              Checkpoints bắt buộc ({trip.checkpoints?.length || 0})
            </Text>
            {isDraft ? (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/trips/leader/[id]/route",
                    params: { id: trip.id },
                  } as unknown as Href)
                }
              >
                <Text style={styles.editLink}>Chỉnh sửa</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {trip.checkpoints && trip.checkpoints.length > 0 ? (
            trip.checkpoints.map((cp, idx) => (
              <View key={idx} style={styles.cpItem}>
                <View style={styles.cpNum}>
                  <Text style={styles.cpNumText}>{cp.sequence || idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cpName}>{cp.name}</Text>
                  {cp.description ? (
                    <Text style={styles.cpDesc}>{cp.description}</Text>
                  ) : null}
                  <Text style={styles.cpCoords}>
                    Toạ độ: {cp.latitude}, {cp.longitude} · Bán kính:{" "}
                    {cp.radiusMeters}m
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyItemText}>
              Chưa gán checkpoint nào. Bấm &quot;Lên lộ trình&quot; để chọn.
            </Text>
          )}
        </View>

        {/* Danh sách System Trails đã gán */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              Lộ trình System Trails ({trip.trails?.length || 0})
            </Text>
            {isDraft ? (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/trips/leader/[id]/route",
                    params: { id: trip.id },
                  } as unknown as Href)
                }
              >
                <Text style={styles.editLink}>Chỉnh sửa</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {trip.trails && trip.trails.length > 0 ? (
            trip.trails.map((tr, idx) => (
              <View key={idx} style={styles.trailItem}>
                <View style={styles.trailIcon}>
                  <Ionicons name="map" size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trailName}>
                    Chặng {tr.sequence || idx + 1}: {tr.snapshotName}
                  </Text>
                  <Text style={styles.trailMeta}>
                    Độ khó: {tr.snapshotDifficulty} · Độ dài:{" "}
                    {tr.snapshotDistanceKm} km · Độ dốc:{" "}
                    {tr.snapshotElevationGainM ?? "N/A"}m
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyItemText}>
              Chưa gán cung đường trail nào.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Modal Hủy Chuyến Đi Cho Leader */}
      <Modal visible={showCancelModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="warning" size={24} color="#b91c1c" />
                <Text style={styles.modalTitle}>Yêu cầu hủy chuyến</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCancelModal(false)}
                disabled={submittingCancel}
              >
                <Ionicons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSub}>
                Chuyến đi của bạn đang ở trạng thái OPEN. Khi gửi yêu cầu, chuyến
                sẽ chuyển sang CANCEL_PENDING để Admin xác thực lý do bất khả kháng
                (thời tiết nguy hiểm, sạt lở...) và xử lý hoàn tiền cho khách.
              </Text>

              <Text style={styles.modalInputLabel}>
                Lý do hủy chuyến <Text style={{ color: Colors.error }}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Nêu rõ lý do: Bão lũ, sạt lở, lệnh đóng rừng của kiểm lâm..."
                placeholderTextColor={Colors.onSurfaceMuted}
                multiline
                numberOfLines={3}
                value={cancelReason}
                onChangeText={setCancelReason}
              />

              <Text style={[styles.modalInputLabel, { marginTop: 12 }]}>
                Đường dẫn bằng chứng ảnh / cảnh báo (Tối đa 10 link)
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="https://example.com/anh-du-bao.jpg"
                  placeholderTextColor={Colors.onSurfaceMuted}
                  value={evidenceUrlInput}
                  onChangeText={setEvidenceUrlInput}
                />
                <TouchableOpacity
                  style={styles.addUrlBtn}
                  onPress={handleAddEvidenceUrl}
                >
                  <Text style={styles.addUrlBtnText}>Thêm</Text>
                </TouchableOpacity>
              </View>

              {evidenceUrls.map((url, idx) => (
                <View key={idx} style={styles.evidenceItem}>
                  <Text style={styles.evidenceText} numberOfLines={1}>
                    {idx + 1}. {url}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveEvidenceUrl(idx)}>
                    <Ionicons name="trash-outline" size={16} color="#b91c1c" />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setShowCancelModal(false)}
                  disabled={submittingCancel}
                >
                  <Text style={styles.cancelModalBtnText}>Đóng</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.confirmCancelBtn,
                    submittingCancel && { opacity: 0.6 },
                  ]}
                  onPress={handleSubmitCancellation}
                  disabled={submittingCancel}
                >
                  {submittingCancel ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmCancelBtnText}>
                      Xác nhận gửi yêu cầu
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
    backgroundColor: Colors.surface,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceContainerHigh,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  headerSub: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    marginTop: 8,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onPrimary,
  },
  banner: {
    borderRadius: Radius.medium,
    padding: 14,
    borderWidth: 1,
  },
  bannerDraft: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  bannerOpen: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  bannerCancelPending: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  bannerDefault: {
    backgroundColor: Colors.surfaceContainerLow,
    borderColor: Colors.surfaceContainerHigh,
  },
  bannerRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  bannerDesc: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  mainActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.medium,
    ...Shadows.level1,
  },
  actionPrimary: {
    backgroundColor: Colors.primary,
  },
  actionAccent: {
    backgroundColor: "#059669",
  },
  actionDanger: {
    backgroundColor: "#b91c1c",
  },
  mainActionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  sectionCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.large,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: 10,
    ...Shadows.level1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  editLink: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primaryDark,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    width: 90,
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.onSurface,
    textAlign: "right",
  },
  priceHighlight: {
    color: Colors.primaryDark,
    fontWeight: "800",
    fontSize: 15,
  },
  descText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
    marginTop: 4,
  },
  explanationBox: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.small,
    padding: 10,
    fontSize: 13,
    color: Colors.onSurface,
    lineHeight: 18,
  },
  warningBox: {
    backgroundColor: "#fffbeb",
    borderRadius: Radius.small,
    padding: 10,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  warningBoxText: {
    fontSize: 12,
    color: "#b45309",
    lineHeight: 16,
  },
  cpItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  cpNum: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cpNumText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.onPrimary,
  },
  cpName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  cpDesc: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  cpCoords: {
    fontSize: 10,
    color: Colors.onSurfaceMuted,
    marginTop: 3,
  },
  trailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  trailIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  trailName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  trailMeta: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  emptyItemText: {
    fontSize: 12,
    fontStyle: "italic",
    color: Colors.onSurfaceMuted,
    textAlign: "center",
    paddingVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  modalSub: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 17,
    marginBottom: 14,
  },
  modalInputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHighest,
    borderRadius: Radius.medium,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.onSurface,
  },
  textarea: {
    height: 70,
    textAlignVertical: "top",
  },
  addUrlBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.medium,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  addUrlBtnText: {
    color: Colors.onPrimary,
    fontWeight: "700",
    fontSize: 13,
  },
  evidenceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.small,
    marginTop: 6,
  },
  evidenceText: {
    fontSize: 12,
    color: Colors.onSurface,
    flex: 1,
    marginRight: 8,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    paddingBottom: 16,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHighest,
    alignItems: "center",
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  confirmCancelBtn: {
    flex: 1.5,
    backgroundColor: "#b91c1c",
    paddingVertical: 12,
    borderRadius: Radius.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
});
