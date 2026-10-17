import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import React, { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
  parseCf01Error,
  TripOptionDestination,
  TripOptionPickupPoint,
  ScheduleConflict,
} from "@/services/api/cf01PublicTripApi";

export default function LeaderCreateTripScreen() {
  const router = useRouter();

  // Form states
  const [destinations, setDestinations] = useState<TripOptionDestination[]>([]);
  const [pickupPoints, setPickupPoints] = useState<TripOptionPickupPoint[]>([]);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>("");
  const [selectedPickupPointId, setSelectedPickupPointId] = useState<string>("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceExplanation, setPriceExplanation] = useState("");
  const [capacity, setCapacity] = useState("15");
  const [price, setPrice] = useState("700000");

  // Date times (Default: next Saturday 05:00 to Sunday 17:00)
  const defaultDates = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() + 7);
    start.setHours(5, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setHours(17, 0, 0, 0);
    return {
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    };
  }, []);

  const [startAt, setStartAt] = useState(defaultDates.startAt);
  const [endAt, setEndAt] = useState(defaultDates.endAt);

  // Status & Conflict checking
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingPickups, setLoadingPickups] = useState(false);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 1. Tải danh sách Destinations
  useEffect(() => {
    async function loadDestinations() {
      try {
        setLoadingOptions(true);
        const data = await cf01PublicTripApi.getDestinations(1, 50);
        setDestinations(data);
        if (data.length > 0) {
          setSelectedDestinationId(data[0].id);
        }
      } catch (err) {
        const parsed = parseCf01Error(err);
        setFormError(parsed.message);
      } finally {
        setLoadingOptions(false);
      }
    }
    loadDestinations();
  }, []);

  // 2. Tải Pickup points khi chọn Destination
  useEffect(() => {
    let active = true;
    if (!selectedDestinationId) {
      const timer = setTimeout(() => {
        if (active) {
          setPickupPoints([]);
          setSelectedPickupPointId("");
        }
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }

    async function loadPickups() {
      try {
        setLoadingPickups(true);
        const data = await cf01PublicTripApi.getPickupPoints(
          selectedDestinationId,
          1,
          50,
        );
        if (!active) return;
        setPickupPoints(data);
        if (data.length > 0) {
          setSelectedPickupPointId(data[0].id);
        } else {
          setSelectedPickupPointId("");
        }
      } catch (err) {
        const parsed = parseCf01Error(err);
        console.warn("Lỗi load pickup points:", parsed.message);
      } finally {
        if (active) setLoadingPickups(false);
      }
    }
    const timer = setTimeout(() => {
      loadPickups();
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedDestinationId]);

  // 3. Kiểm tra trùng lịch của Leader
  useEffect(() => {
    if (!startAt || !endAt) return;

    let active = true;
    const timeout = setTimeout(async () => {
      try {
        setCheckingConflict(true);
        const result = await cf01PublicTripApi.checkConflicts(startAt, endAt);
        if (active) {
          setConflicts(result.hasConflict ? result.conflicts : []);
        }
      } catch (err) {
        console.warn("Lỗi kiểm tra trùng lịch:", err);
      } finally {
        if (active) setCheckingConflict(false);
      }
    }, 600);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [startAt, endAt]);

  const handlePriceChange = (val: string) => {
    // Chỉ giữ các ký tự số
    const clean = val.replace(/[^0-9]/g, "");
    setPrice(clean);
  };

  const formattedPricePreview = useMemo(() => {
    const num = parseInt(price, 10);
    if (isNaN(num) || num <= 0) return "0 đ";
    return `${num.toLocaleString("vi-VN")} đ / người`;
  }, [price]);

  const handleSubmit = async () => {
    setFormError(null);

    if (!selectedDestinationId) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn địa điểm tổ chức chuyến đi.");
      return;
    }

    if (!title.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tiêu đề chuyến đi.");
      return;
    }

    if (!selectedPickupPointId) {
      Alert.alert(
        "Thiếu thông tin",
        "Vui lòng chọn điểm tập kết / đón khách.",
      );
      return;
    }

    const capNum = parseInt(capacity, 10);
    if (isNaN(capNum) || capNum <= 0) {
      Alert.alert("Không hợp lệ", "Số lượng chỗ tối đa phải là số nguyên dương.");
      return;
    }

    const priceNum = parseInt(price, 10);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert("Không hợp lệ", "Giá chuyến đi phải là số nguyên dương.");
      return;
    }

    if (conflicts.length > 0) {
      Alert.alert(
        "Cảnh báo trùng lịch",
        "Bạn đang có chuyến đi khác trong cùng khoảng thời gian này. Vui lòng chọn thời gian khác hoặc kiểm tra lại lịch trình.",
      );
      return;
    }

    try {
      setSubmitting(true);
      const created = await cf01PublicTripApi.createLeaderTrip({
        destinationId: selectedDestinationId,
        title: title.trim(),
        description: description.trim() || null,
        priceExplanation: priceExplanation.trim() || null,
        startAt,
        endAt,
        pickupPointId: selectedPickupPointId,
        capacity: capNum,
        price: price.trim(), // Bắt buộc là chuỗi số nguyên dương theo hợp đồng API CF01
      });

      Alert.alert(
        "Tạo bản nháp thành công!",
        `Chuyến đi "${created.title}" đã được khởi tạo ở trạng thái DRAFT (v${created.version}). Hãy tiếp tục thiết lập Checkpoints và System Trails.`,
        [
          {
            text: "Thiết lập lộ trình ngay",
            onPress: () => {
              router.replace({
                pathname: "/trips/leader/[id]/route",
                params: { id: created.id },
              } as unknown as Href);
            },
          },
        ],
      );
    } catch (err) {
      const parsed = parseCf01Error(err);
      let alertMsg = parsed.message;
      if (parsed.issues && parsed.issues.length > 0) {
        alertMsg += "\n• " + parsed.issues.map((it) => it.message).join("\n• ");
      }
      setFormError(alertMsg);
      Alert.alert("Không thể tạo chuyến đi", alertMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Tạo chuyến đi công khai</Text>
          <Text style={styles.headerSub}>Bản nháp (DRAFT) · Leader CF01</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {formError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="warning-outline" size={20} color="#b91c1c" />
              <Text style={styles.errorBannerText}>{formError}</Text>
            </View>
          ) : null}

          {/* 1. Chọn Địa điểm */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              1. Địa điểm trekking <Text style={styles.req}>*</Text>
            </Text>
            {loadingOptions ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : destinations.length === 0 ? (
              <Text style={styles.hintText}>Không có địa điểm khả dụng.</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipScroll}
              >
                {destinations.map((d) => {
                  const isSelected = d.id === selectedDestinationId;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[
                        styles.selectChip,
                        isSelected && styles.selectChipActive,
                      ]}
                      onPress={() => setSelectedDestinationId(d.id)}
                    >
                      <Ionicons
                        name="location"
                        size={14}
                        color={isSelected ? Colors.onPrimary : Colors.primaryDark}
                      />
                      <Text
                        style={[
                          styles.selectChipText,
                          isSelected && styles.selectChipTextActive,
                        ]}
                      >
                        {d.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* 2. Chọn Điểm tập kết */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              2. Điểm đón / tập kết <Text style={styles.req}>*</Text>
            </Text>
            {loadingPickups ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : pickupPoints.length === 0 ? (
              <Text style={styles.hintText}>
                Địa điểm này chưa có điểm tập kết cụ thể.
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipScroll}
              >
                {pickupPoints.map((p) => {
                  const isSelected = p.id === selectedPickupPointId;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.selectChip,
                        isSelected && styles.selectChipActive,
                      ]}
                      onPress={() => setSelectedPickupPointId(p.id)}
                    >
                      <Ionicons
                        name="bus"
                        size={14}
                        color={isSelected ? Colors.onPrimary : Colors.primaryDark}
                      />
                      <Text
                        style={[
                          styles.selectChipText,
                          isSelected && styles.selectChipTextActive,
                        ]}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* 3. Tiêu đề & Mô tả */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              3. Tiêu đề chuyến đi <Text style={styles.req}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: Chinh phục đỉnh Núi Bà Đen 2N1Đ"
              placeholderTextColor={Colors.onSurfaceMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>4. Mô tả chi tiết lịch trình</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Giới thiệu hành trình, độ khó dự kiến, trang bị cần chuẩn bị..."
              placeholderTextColor={Colors.onSurfaceMuted}
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* 4. Thời gian & Kiểm tra trùng lịch */}
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                5. Thời gian chuyến đi <Text style={styles.req}>*</Text>
              </Text>
              {checkingConflict ? (
                <View style={styles.conflictChecking}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.conflictCheckingText}>
                    Đang kiểm tra lịch...
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.dateRow}>
              <View style={styles.dateCol}>
                <Text style={styles.dateLabel}>Khởi hành (startAt)</Text>
                <TextInput
                  style={styles.input}
                  value={startAt}
                  onChangeText={setStartAt}
                  placeholder="YYYY-MM-DDTHH:mm:ss.000Z"
                  placeholderTextColor={Colors.onSurfaceMuted}
                />
              </View>
              <View style={styles.dateCol}>
                <Text style={styles.dateLabel}>Kết thúc (endAt)</Text>
                <TextInput
                  style={styles.input}
                  value={endAt}
                  onChangeText={setEndAt}
                  placeholder="YYYY-MM-DDTHH:mm:ss.000Z"
                  placeholderTextColor={Colors.onSurfaceMuted}
                />
              </View>
            </View>

            {conflicts.length > 0 ? (
              <View style={styles.conflictAlert}>
                <Ionicons name="alert-circle" size={18} color="#b91c1c" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.conflictAlertTitle}>
                    Cảnh báo trùng lịch của Leader!
                  </Text>
                  {conflicts.map((c) => (
                    <Text key={c.id} style={styles.conflictAlertText}>
                      • {c.title} ({c.status})
                    </Text>
                  ))}
                </View>
              </View>
            ) : !checkingConflict ? (
              <View style={styles.noConflictBadge}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={15}
                  color="#15803d"
                />
                <Text style={styles.noConflictText}>
                  Lịch trình hoàn toàn trống, không bị trùng với chuyến nào khác.
                </Text>
              </View>
            ) : null}
          </View>

          {/* 5. Số chỗ & Giá tiền */}
          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>
                6. Số chỗ tối đa <Text style={styles.req}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={capacity}
                onChangeText={setCapacity}
                keyboardType="numeric"
                placeholder="15"
                placeholderTextColor={Colors.onSurfaceMuted}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1.4 }]}>
              <Text style={styles.label}>
                7. Giá VND / khách <Text style={styles.req}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={handlePriceChange}
                keyboardType="numeric"
                placeholder="700000"
                placeholderTextColor={Colors.onSurfaceMuted}
              />
              <Text style={styles.pricePreviewText}>{formattedPricePreview}</Text>
            </View>
          </View>

          {/* 6. Cơ sở tính giá nội bộ (priceExplanation) */}
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>8. Cơ sở tính giá nội bộ</Text>
              <View style={styles.publishTag}>
                <Text style={styles.publishTagText}>Bắt buộc khi Publish</Text>
              </View>
            </View>
            <Text style={styles.hintSub}>
              Chi phí xe, ăn uống, lều trại, porter, dự phòng và lợi nhuận. Chỉ
              lưu nội bộ trong quản lý của Leader, không hiển thị công khai.
            </Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Ví dụ: Xe giường nằm khứ hồi 300k + Ăn uống 4 bữa 250k + Thuê lều trại 150k"
              placeholderTextColor={Colors.onSurfaceMuted}
              multiline
              numberOfLines={3}
              value={priceExplanation}
              onChangeText={setPriceExplanation}
            />
          </View>

          {/* Nút Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            disabled={submitting}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.onPrimary} />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={Colors.onPrimary}
                />
                <Text style={styles.submitBtnText}>
                  Lưu bản nháp & Thiết lập lộ trình
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    gap: 16,
    paddingBottom: 40,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fee2e2",
    borderRadius: Radius.medium,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#b91c1c",
    lineHeight: 16,
  },
  formGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  req: {
    color: Colors.error,
  },
  hintText: {
    fontSize: 12,
    color: Colors.onSurfaceMuted,
    fontStyle: "italic",
  },
  hintSub: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    lineHeight: 15,
  },
  chipScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  selectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHighest,
  },
  selectChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  selectChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.onSurface,
  },
  selectChipTextActive: {
    color: Colors.onPrimary,
  },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHighest,
    borderRadius: Radius.medium,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.onSurface,
  },
  textarea: {
    height: 84,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  dateRow: {
    gap: 8,
  },
  dateCol: {
    gap: 4,
  },
  dateLabel: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  conflictChecking: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  conflictCheckingText: {
    fontSize: 11,
    color: Colors.primaryDark,
  },
  conflictAlert: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderRadius: Radius.small,
    padding: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginTop: 4,
  },
  conflictAlertTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#b91c1c",
  },
  conflictAlertText: {
    fontSize: 11,
    color: "#b91c1c",
  },
  noConflictBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.small,
    marginTop: 4,
  },
  noConflictText: {
    fontSize: 11,
    color: "#15803d",
    fontWeight: "500",
  },
  pricePreviewText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primaryDark,
    marginTop: 2,
  },
  publishTag: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.small,
  },
  publishTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#b45309",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.large,
    paddingVertical: 14,
    marginTop: 10,
    ...Shadows.level2,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.onPrimary,
  },
});
