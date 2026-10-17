import { Ionicons } from "@expo/vector-icons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
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
  TripReadinessResponse,
} from "@/services/api/cf01PublicTripApi";

export default function LeaderTripPublishScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [trip, setTrip] = useState<LeaderTrip | null>(null);
  const [readiness, setReadiness] = useState<TripReadinessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // Price explanation patch state
  const [editingPriceExp, setEditingPriceExp] = useState(false);
  const [priceExplanationInput, setPriceExplanationInput] = useState("");
  const [updatingPriceExp, setUpdatingPriceExp] = useState(false);

  const checkReadinessData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [tripData, readyData] = await Promise.all([
        cf01PublicTripApi.getLeaderTripDetail(id),
        cf01PublicTripApi.getTripReadiness(id),
      ]);
      setTrip(tripData);
      setReadiness(readyData);
      setPriceExplanationInput(tripData.priceExplanation || "");
    } catch (err) {
      const parsed = parseCf01Error(err);
      Alert.alert("Lỗi kiểm tra điều kiện xuất bản", parsed.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkReadinessData();
    }, 0);
    return () => clearTimeout(timer);
  }, [checkReadinessData]);

  // Patch price explanation if missing
  const handleUpdatePriceExplanation = async () => {
    if (!trip) return;
    const trimmed = priceExplanationInput.trim();
    if (!trimmed) {
      Alert.alert("Chưa nhập nội dung", "Vui lòng nhập chi tiết giải trình chi phí.");
      return;
    }

    try {
      setUpdatingPriceExp(true);
      const updated = await cf01PublicTripApi.updateLeaderTrip(trip.id, {
        expectedVersion: trip.version,
        priceExplanation: trimmed,
      });
      setTrip(updated);
      setEditingPriceExp(false);

      // Re-check readiness
      const readyData = await cf01PublicTripApi.getTripReadiness(trip.id);
      setReadiness(readyData);

      Alert.alert(
        "Cập nhật thành công!",
        `Cơ cấu giá đã được lưu. Version mới: v${updated.version}.`,
      );
    } catch (err) {
      const parsed = parseCf01Error(err);
      Alert.alert("Lỗi cập nhật giải trình giá", parsed.message);
    } finally {
      setUpdatingPriceExp(false);
    }
  };

  // Publish to OPEN
  const handlePublish = async () => {
    if (!trip || !readiness) return;
    if (!readiness.canPublish) {
      Alert.alert(
        "Chưa đủ điều kiện",
        "Vui lòng hoàn thiện tất cả các điều kiện bắt buộc trước khi xuất bản.",
      );
      return;
    }

    Alert.alert(
      "Xác nhận xuất bản chuyến đi",
      `Bạn có chắc chắn muốn xuất bản chuyến đi "${trip.title}" sang trạng thái OPEN? Chuyến đi sẽ được mở bán công khai cho tất cả Trekker.`,
      [
        { text: "Xem lại", style: "cancel" },
        {
          text: "Xuất bản ngay",
          style: "default",
          onPress: async () => {
            try {
              setPublishing(true);
              const published = await cf01PublicTripApi.publishTrip(
                trip.id,
                trip.version,
              );
              setTrip(published);
              Alert.alert(
                "🎉 Xuất bản thành công!",
                `Chuyến đi hiện đã ở trạng thái OPEN (v${published.version}) và hiển thị công khai trên ứng dụng.`,
                [
                  {
                    text: "Xem trang công khai",
                    onPress: () => {
                      router.replace({
                        pathname: "/trips/[id]",
                        params: { id: published.id },
                      } as unknown as Href);
                    },
                  },
                  {
                    text: "Về danh sách chuyến",
                    onPress: () => {
                      router.replace("/trips/leader" as Href);
                    },
                  },
                ],
              );
            } catch (err) {
              const parsed = parseCf01Error(err);
              let msg = parsed.message;
              if (parsed.issues && parsed.issues.length > 0) {
                msg += "\n• " + parsed.issues.map((i) => i.message).join("\n• ");
              }
              Alert.alert("Xuất bản thất bại", msg);
            } finally {
              setPublishing(false);
            }
          },
        },
      ],
    );
  };

  if (loading || !trip) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            Đang kiểm tra điều kiện xuất bản (Readiness)...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasTrails = (trip.trails?.length || 0) > 0;
  const hasCheckpoints = (trip.checkpoints?.length || 0) > 0;
  const hasPriceExplanation = Boolean(trip.priceExplanation?.trim());
  const canPublish = Boolean(readiness?.canPublish);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Kiểm tra & Xuất bản chuyến đi
          </Text>
          <Text style={styles.headerSub}>
            Readiness Check · Version v{trip.version}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={checkReadinessData}>
          <Ionicons name="refresh" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Banner Tổng Thể */}
        <View
          style={[
            styles.statusBanner,
            canPublish ? styles.statusBannerSuccess : styles.statusBannerWarning,
          ]}
        >
          <Ionicons
            name={canPublish ? "checkmark-circle" : "alert-circle"}
            size={28}
            color={canPublish ? "#15803d" : "#b45309"}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.statusBannerTitle,
                { color: canPublish ? "#15803d" : "#b45309" },
              ]}
            >
              {canPublish
                ? "SẴN SÀNG XUẤT BẢN (READY)"
                : "CHƯA ĐỦ ĐIỀU KIỆN XUẤT BẢN"}
            </Text>
            <Text style={styles.statusBannerDesc}>
              {canPublish
                ? "Chuyến đi đã thỏa mãn tất cả tiêu chuẩn nội bộ và an toàn. Bạn có thể xuất bản ngay bây giờ."
                : "Vui lòng xem các mục cảnh báo bên dưới và hoàn thiện trước khi mở bán công khai."}
            </Text>
          </View>
        </View>

        {/* Danh sách Issues nếu có */}
        {readiness?.issues && readiness.issues.length > 0 ? (
          <View style={styles.issuesCard}>
            <Text style={styles.issuesTitle}>
              Các vấn đề cần xử lý ({readiness.issues.length}):
            </Text>
            {readiness.issues.map((issue, idx) => (
              <View key={idx} style={styles.issueRow}>
                <Ionicons name="close-circle" size={16} color="#b91c1c" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.issueField}>
                    [{issue.field || issue.code}]
                  </Text>
                  <Text style={styles.issueMsg}>{issue.message}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Bảng Checklist Điều Kiện */}
        <View style={styles.checklistCard}>
          <Text style={styles.checklistTitle}>Điều kiện tiêu chuẩn CF01</Text>

          {/* 1. System Trails */}
          <View style={styles.checkItem}>
            <Ionicons
              name={hasTrails ? "checkmark-circle" : "close-circle"}
              size={22}
              color={hasTrails ? "#15803d" : "#b91c1c"}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.checkItemTitle}>1. Lộ trình System Trails</Text>
              <Text style={styles.checkItemSub}>
                {hasTrails
                  ? `Đã chọn ${trip.trails.length} chặng System Trails.`
                  : "Chưa có System Trail nào được gán cho chuyến đi."}
              </Text>
            </View>
            {!hasTrails ? (
              <TouchableOpacity
                style={styles.fixBtn}
                onPress={() =>
                  router.push({
                    pathname: "/trips/leader/[id]/route",
                    params: { id: trip.id },
                  } as unknown as Href)
                }
              >
                <Text style={styles.fixBtnText}>Chọn Trail</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* 2. Checkpoints */}
          <View style={styles.checkItem}>
            <Ionicons
              name={hasCheckpoints ? "checkmark-circle" : "close-circle"}
              size={22}
              color={hasCheckpoints ? "#15803d" : "#b91c1c"}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.checkItemTitle}>2. Checkpoints bắt buộc</Text>
              <Text style={styles.checkItemSub}>
                {hasCheckpoints
                  ? `Đã thiết lập ${trip.checkpoints.length} mốc an toàn.`
                  : "Chưa chọn các checkpoint kiểm tra cho chuyến."}
              </Text>
            </View>
            {!hasCheckpoints ? (
              <TouchableOpacity
                style={styles.fixBtn}
                onPress={() =>
                  router.push({
                    pathname: "/trips/leader/[id]/route",
                    params: { id: trip.id },
                  } as unknown as Href)
                }
              >
                <Text style={styles.fixBtnText}>Chọn Mốc</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* 3. Cơ cấu giá nội bộ priceExplanation */}
          <View style={styles.checkItem}>
            <Ionicons
              name={hasPriceExplanation ? "checkmark-circle" : "close-circle"}
              size={22}
              color={hasPriceExplanation ? "#15803d" : "#b91c1c"}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.checkItemTitle}>
                3. Giải trình cơ cấu giá (priceExplanation)
              </Text>
              <Text style={styles.checkItemSub}>
                {hasPriceExplanation
                  ? trip.priceExplanation
                  : "Bắt buộc trước khi publish (xe, ăn uống, lều trại, lợi nhuận)."}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.fixBtn}
              onPress={() => setEditingPriceExp(true)}
            >
              <Text style={styles.fixBtnText}>
                {hasPriceExplanation ? "Sửa" : "Bổ sung"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form bổ sung priceExplanation nếu đang mở */}
          {editingPriceExp ? (
            <View style={styles.editExpBox}>
              <Text style={styles.editExpLabel}>
                Nhập cơ sở tính giá nội bộ:
              </Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Ví dụ: Xe giường nằm 300k + Ăn uống 250k + Thuê lều trại 150k"
                placeholderTextColor={Colors.onSurfaceMuted}
                multiline
                numberOfLines={3}
                value={priceExplanationInput}
                onChangeText={setPriceExplanationInput}
              />
              <View style={styles.editExpActions}>
                <TouchableOpacity
                  style={styles.cancelEditBtn}
                  onPress={() => setEditingPriceExp(false)}
                >
                  <Text style={styles.cancelEditBtnText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveEditBtn,
                    updatingPriceExp && { opacity: 0.6 },
                  ]}
                  disabled={updatingPriceExp}
                  onPress={handleUpdatePriceExplanation}
                >
                  {updatingPriceExp ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveEditBtnText}>
                      Lưu giải trình (v{trip.version})
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* 4. Quy mô & Giá tiền */}
          <View style={styles.checkItem}>
            <Ionicons name="checkmark-circle" size={22} color="#15803d" />
            <View style={{ flex: 1 }}>
              <Text style={styles.checkItemTitle}>4. Quy mô & Giá niêm yết</Text>
              <Text style={styles.checkItemSub}>
                {trip.capacity} chỗ ·{" "}
                {trip.price
                  ? `${parseInt(trip.price, 10).toLocaleString("vi-VN")} đ / khách`
                  : "0 đ"}
              </Text>
            </View>
          </View>
        </View>

        {/* Nút Xuất Bản (PUBLISH) */}
        <TouchableOpacity
          style={[
            styles.publishBtn,
            (!canPublish || publishing) && styles.publishBtnDisabled,
          ]}
          disabled={!canPublish || publishing}
          onPress={handlePublish}
          activeOpacity={0.88}
        >
          {publishing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="rocket" size={20} color="#fff" />
              <Text style={styles.publishBtnText}>
                XUẤT BẢN CHUYẾN ĐI (PUBLISH SANG OPEN)
              </Text>
            </>
          )}
        </TouchableOpacity>
        {!canPublish ? (
          <Text style={styles.cannotPublishNote}>
            * Nút xuất bản sẽ tự động kích hoạt khi tất cả các mục trên đạt yêu
            cầu.
          </Text>
        ) : null}
      </ScrollView>
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
    fontSize: 15,
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
  statusBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: Radius.medium,
    padding: 14,
    borderWidth: 1,
  },
  statusBannerSuccess: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  statusBannerWarning: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  statusBannerTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  statusBannerDesc: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 16,
  },
  issuesCard: {
    backgroundColor: "#fef2f2",
    borderRadius: Radius.medium,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    gap: 8,
  },
  issuesTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b91c1c",
  },
  issueRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  issueField: {
    fontSize: 11,
    fontWeight: "700",
    color: "#991b1b",
  },
  issueMsg: {
    fontSize: 12,
    color: "#b91c1c",
    lineHeight: 15,
  },
  checklistCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.large,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: 12,
    ...Shadows.level1,
  },
  checklistTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.onSurface,
    marginBottom: 4,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  checkItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  checkItemSub: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 15,
  },
  fixBtn: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.small,
  },
  fixBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primaryDark,
  },
  editExpBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.medium,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 8,
  },
  editExpLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHighest,
    borderRadius: Radius.medium,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: Colors.onSurface,
  },
  textarea: {
    height: 60,
    textAlignVertical: "top",
  },
  editExpActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  cancelEditBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelEditBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.onSurfaceVariant,
  },
  saveEditBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.small,
  },
  saveEditBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.onPrimary,
  },
  publishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#15803d",
    paddingVertical: 14,
    borderRadius: Radius.large,
    marginTop: 8,
    ...Shadows.level2,
  },
  publishBtnDisabled: {
    backgroundColor: "#94a3b8",
    opacity: 0.6,
  },
  publishBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
  cannotPublishNote: {
    fontSize: 11,
    color: Colors.onSurfaceMuted,
    textAlign: "center",
    marginTop: 4,
  },
});
