import { Trip3DMapView } from "@/components/Trip3DMapView";
import { Colors, Radius, Shadows } from "@/constants/theme";
import type {
  TripOptionCheckpoint,
  TripOptionDestination,
  TripOptionPickupPoint,
} from "@/features/leaders/hooks";
import type { SystemTrailDetail } from "@/features/leaders/services/leader-public-trips.api";
import {
  calculateTripDuration,
  getDayOfWeekName,
  getQuickDatePresets,
  parseVnDate,
} from "@/features/leaders/utils/tripDateUtils";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface LeaderTripFormData {
  name: string;
  description: string;
  destinationId: string;
  pickupPointId: string;
  startDate: string;
  endDate: string;
  slots: string;
  price: string;
  priceExplanation: string;
  checkpointIds: string[];
}

interface LeaderTripFormStepProps {
  form: LeaderTripFormData;
  errors: Partial<Record<keyof LeaderTripFormData, string>>;
  destinations: TripOptionDestination[];
  pickupPoints: TripOptionPickupPoint[];
  checkpoints: TripOptionCheckpoint[];
  isLoadingMeta: boolean;
  submitError?: string | null;
  onUpdateField: (field: keyof LeaderTripFormData, value: string) => void;
  onToggleCheckpoint?: (id: string) => void;
  onProceed: () => void;
  onBack: () => void;
  onRetryLoadMeta?: () => void;
}

export function LeaderTripFormStep({
  form,
  errors,
  destinations,
  pickupPoints,
  checkpoints,
  isLoadingMeta,
  submitError,
  onUpdateField,
  onProceed,
  onBack,
  onRetryLoadMeta,
}: LeaderTripFormStepProps) {
  // Compute duration in real-time
  const durationInfo = useMemo(() => {
    const start = parseVnDate(form.startDate);
    const end = parseVnDate(form.endDate);
    if (start && end && end.getTime() >= start.getTime()) {
      return calculateTripDuration(start, end);
    }
    return null;
  }, [form.startDate, form.endDate]);

  const startDay = useMemo(() => {
    const d = parseVnDate(form.startDate);
    return d ? getDayOfWeekName(d) : null;
  }, [form.startDate]);

  const endDay = useMemo(() => {
    const d = parseVnDate(form.endDate);
    return d ? getDayOfWeekName(d) : null;
  }, [form.endDate]);

  const quickPresets = useMemo(() => getQuickDatePresets(), []);

  const slotNum = parseInt(form.slots, 10) || 12;

  const handleSlotChange = (delta: number) => {
    const next = Math.max(1, Math.min(30, slotNum + delta));
    onUpdateField("slots", String(next));
  };

  const selectedDest = useMemo(
    () => destinations.find((d) => d.id === form.destinationId),
    [destinations, form.destinationId],
  );

  // Generate 3D Trail Model immediately once destination & checkpoints are selected
  const trail3DData = useMemo<SystemTrailDetail | null>(() => {
    if (!selectedDest || checkpoints.length === 0) return null;

    const coords = checkpoints.map((cp) => [
      Number(cp.longitude) || 106.17,
      Number(cp.latitude) || 11.37,
    ]);

    const firstCp = checkpoints[0];
    const centerLng = Number(firstCp?.longitude) || 106.1712;
    const centerLat = Number(firstCp?.latitude) || 11.3789;

    return {
      id: selectedDest.id,
      code: `TR-${selectedDest.id.slice(-6).toUpperCase()}`,
      name: selectedDest.name,
      distanceKm: 12.8,
      elevationGainM: 850,
      destination: {
        name: selectedDest.name,
        centerLat,
        centerLng,
      },
      routeGeojson: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates:
                coords.length > 1
                  ? coords
                  : [
                      [centerLng, centerLat],
                      [centerLng + 0.008, centerLat + 0.008],
                    ],
            },
          },
        ],
      },
      checkpoints: checkpoints.map((cp, idx) => ({
        id: cp.id,
        name: cp.name,
        sequence: idx + 1,
        latitude: Number(cp.latitude) || centerLat,
        longitude: Number(cp.longitude) || centerLng,
      })),
      initialCamera: {
        center: [centerLng, centerLat],
        zoom: 13.5,
        pitch: 60,
        bearing: -20,
      },
    };
  }, [selectedDest, checkpoints]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={Colors.ink} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>TẠO PUBLIC TRIP</Text>
            <Text style={styles.headerSubtitle}>BƯỚC 1/2 · THÔNG TIN CHUYẾN</Text>
          </View>
        </View>
        <View style={styles.badgeVfrs}>
          <Ionicons name="shield-checkmark" size={14} color="#125238" />
          <Text style={styles.badgeVfrsText}>VFRS-L2</Text>
        </View>
      </View>

      {/* Wizard Progress Tracker */}
      <View style={styles.progressContainer}>
        <View style={styles.progressRow}>
          <View style={styles.progressLabelRow}>
            <View style={styles.progressStepCircle}>
              <Text style={styles.progressStepNum}>1</Text>
            </View>
            <Text style={styles.progressStepText}>BƯỚC 1/2: THIẾT LẬP THÔNG TIN CHUYẾN</Text>
          </View>
          <Text style={styles.progressPercent}>50%</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: "50%" }]} />
        </View>
      </View>

      {/* Error Banner with helpful guidance */}
      {Boolean(submitError) && (
        <View style={styles.errorBox}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle" size={22} color="#ba1a1a" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>Lưu ý từ hệ thống</Text>
            <Text style={styles.errorText}>{submitError}</Text>
            {onRetryLoadMeta && (
              <TouchableOpacity style={styles.retryBtn} onPress={onRetryLoadMeta}>
                <Ionicons name="reload" size={14} color="#125238" />
                <Text style={styles.retryBtnText}>Thử lại tải dữ liệu</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* 1. CARD: THÔNG TIN TỔ CHỨC & LỊCH TRÌNH (Moved to TOP) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="calendar" size={20} color="#125238" />
          <Text style={styles.cardTitle}>THÔNG TIN TỔ CHỨC & LỊCH TRÌNH</Text>
        </View>

        {/* Trip Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Tên chuyến đi hiển thị *</Text>
          <TextInput
            value={form.name}
            onChangeText={(val) => onUpdateField("name", val)}
            placeholder="Ví dụ: Chinh phục Fansipan cùng Leader Hoàng Nam"
            placeholderTextColor="#707972"
            style={[styles.inputBox, errors.name && styles.inputError]}
          />
          <Text style={styles.inputHint}>
            Tên sẽ hiển thị công khai trên ứng dụng TrekGo để người tham gia tìm kiếm.
          </Text>
          {errors.name && <Text style={styles.fieldError}>{errors.name}</Text>}
        </View>

        {/* Trip Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Mô tả lộ trình & yêu cầu</Text>
          <TextInput
            value={form.description}
            onChangeText={(val) => onUpdateField("description", val)}
            placeholder="Mô tả ngắn gọn cung đường, thể lực yêu cầu, điều kiện thời tiết..."
            placeholderTextColor="#707972"
            multiline
            numberOfLines={3}
            style={[styles.inputBox, styles.inputMultiline]}
          />
        </View>

        {/* DATE CONSTRAINTS & DUAL INPUT */}
        <View style={styles.dateSection}>
          <View style={styles.dateSectionTop}>
            <Text style={styles.inputLabel}>Lịch trình di chuyển (Ngày đi & về) *</Text>
            {durationInfo && (
              <View style={styles.durationPill}>
                <Ionicons name="time-outline" size={13} color="#125238" />
                <Text style={styles.durationPillText}>{durationInfo.text}</Text>
              </View>
            )}
          </View>

          {/* Quick Date Presets */}
          <View style={styles.presetsRow}>
            {quickPresets.map((preset, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.presetChip}
                onPress={() => {
                  onUpdateField("startDate", preset.startDate);
                  onUpdateField("endDate", preset.endDate);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="flash-outline" size={13} color="#125238" />
                <Text style={styles.presetChipText}>{preset.label}</Text>
                <Text style={styles.presetDurationBadge}>{preset.durationLabel}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.dateGrid}>
            {/* Start Date */}
            <View style={styles.dateCol}>
              <Text style={styles.dateSubLabel}>Ngày khởi hành *</Text>
              <View style={[styles.dateCard, errors.startDate && styles.dateCardError]}>
                <View style={styles.dateCardInputRow}>
                  <Ionicons name="calendar-outline" size={18} color="#125238" />
                  <TextInput
                    value={form.startDate}
                    onChangeText={(val) => onUpdateField("startDate", val)}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor="#707972"
                    keyboardType="numbers-and-punctuation"
                    style={styles.dateInput}
                  />
                </View>
                {startDay && <Text style={styles.dayOfWeekText}>{startDay} • Xuất phát 05:30</Text>}
              </View>
              {errors.startDate && (
                <Text style={styles.fieldError}>{errors.startDate}</Text>
              )}
            </View>

            {/* End Date */}
            <View style={styles.dateCol}>
              <Text style={styles.dateSubLabel}>Dự kiến kết thúc *</Text>
              <View style={[styles.dateCard, errors.endDate && styles.dateCardError]}>
                <View style={styles.dateCardInputRow}>
                  <Ionicons name="flag-outline" size={18} color="#125238" />
                  <TextInput
                    value={form.endDate}
                    onChangeText={(val) => onUpdateField("endDate", val)}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor="#707972"
                    keyboardType="numbers-and-punctuation"
                    style={styles.dateInput}
                  />
                </View>
                {endDay && <Text style={styles.dayOfWeekText}>{endDay} • Kết thúc 18:00</Text>}
              </View>
              {errors.endDate && <Text style={styles.fieldError}>{errors.endDate}</Text>}
            </View>
          </View>

          <Text style={styles.dateRulesHint}>
            Ràng buộc: Không được chọn ngày trong quá khứ. Ngày khởi hành từ ngày mai trở đi và Ngày kết thúc không được trước ngày đi.
          </Text>
        </View>

        {/* Pickup point */}
        {pickupPoints.length > 0 && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Điểm đón / Tập kết toàn đoàn *</Text>
            <View style={styles.pickupList}>
              {pickupPoints.map((pt) => {
                const isSelected = form.pickupPointId === pt.id;
                return (
                  <TouchableOpacity
                    key={pt.id}
                    style={[styles.pickupChip, isSelected && styles.pickupChipSelected]}
                    onPress={() => onUpdateField("pickupPointId", pt.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="bus-outline"
                      size={16}
                      color={isSelected ? "#125238" : "#707972"}
                    />
                    <Text style={[styles.pickupText, isSelected && styles.pickupTextSelected]}>
                      {pt.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Member Slots Stepper */}
        <View style={styles.inputGroup}>
          <View style={styles.slotHeader}>
            <Text style={styles.inputLabel}>Số lượng thành viên mở bán (Slots) *</Text>
            <Text style={styles.slotCapTag}>{slotNum} / 14 Max</Text>
          </View>

          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => handleSlotChange(-1)}
              activeOpacity={0.8}
            >
              <Ionicons name="remove" size={20} color="#121c2a" />
            </TouchableOpacity>

            <View style={styles.stepperDisplay}>
              <Text style={styles.stepperValue}>{slotNum}</Text>
              <Text style={styles.stepperSub}>Suất đăng ký</Text>
            </View>

            <TouchableOpacity
              style={[styles.stepperBtn, styles.stepperBtnPlus]}
              onPress={() => handleSlotChange(1)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.slotRuleHint}>
            Quy định an toàn VFRS: Tối đa 14 thành viên / 1 Leader chính kèm Porter dẫn đường.
          </Text>
          {errors.slots && <Text style={styles.fieldError}>{errors.slots}</Text>}
        </View>
      </View>

      {/* 2. CARD: ĐIỂM ĐẾN & CUNG ĐƯỜNG LIÊN KẾT (Followed after Info) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="trail-sign" size={20} color="#125238" />
          <Text style={styles.cardTitle}>ĐIỂM ĐẾN & CUNG ĐƯỜNG LIÊN KẾT</Text>
        </View>

        {isLoadingMeta ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#125238" />
            <Text style={styles.muted}>Đang đồng bộ danh mục điểm đến từ máy chủ...</Text>
          </View>
        ) : destinations.length > 0 ? (
          <View style={styles.destList}>
            {destinations.map((dest) => {
              const isSelected = form.destinationId === dest.id;
              return (
                <TouchableOpacity
                  key={dest.id}
                  style={[styles.destCard, isSelected && styles.destCardSelected]}
                  onPress={() => onUpdateField("destinationId", dest.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.destIconBox, isSelected && styles.destIconBoxSelected]}>
                    <Ionicons
                      name="location"
                      size={20}
                      color={isSelected ? "#125238" : "#707972"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.destName, isSelected && styles.destNameSelected]}>
                      {dest.name}
                    </Text>
                    <Text style={styles.destMeta}>Tuyến Trekking Tiêu Chuẩn Quốc Gia</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color="#125238" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="map-outline" size={32} color="#707972" />
            <Text style={styles.emptyText}>
              Chưa có danh sách điểm đến trả về từ máy chủ.
            </Text>
            <Text style={styles.emptySubtext}>
              Vui lòng thử lại sau hoặc liên hệ ban quản trị để được hỗ trợ.
            </Text>
          </View>
        )}
        {errors.destinationId && <Text style={styles.fieldError}>{errors.destinationId}</Text>}

        {/* Checkpoints list: Fixed list by default, NOT checkboxes */}
        {checkpoints.length > 0 && (
          <View style={styles.checkpointSection}>
            <View style={styles.checkpointSectionHeader}>
              <View style={styles.checkpointSectionTitleRow}>
                <Ionicons name="flag" size={16} color="#125238" />
                <Text style={styles.checkpointSectionTitle}>
                  TRẠM KIỂM SOÁT VFRS ({checkpoints.length} CHECKPOINTS MẶC ĐỊNH)
                </Text>
              </View>
              <Text style={styles.checkpointCountBadge}>
                {checkpoints.length} trạm theo tuyến
              </Text>
            </View>

            <View style={styles.checkpointList}>
              {checkpoints.map((cp, idx) => (
                <View key={cp.id} style={styles.checkpointRow}>
                  <View style={styles.cpLeft}>
                    <View style={styles.cpPill}>
                      <Text style={styles.cpPillText}>CP0{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cpName}>{cp.name}</Text>
                      <Text style={styles.cpCoords}>
                        Tọa độ GPS: {Number(cp.latitude).toFixed(4)}, {Number(cp.longitude).toFixed(4)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cpDefaultBadge}>
                    <Ionicons name="shield-checkmark" size={13} color="#125238" />
                    <Text style={styles.cpDefaultBadgeText}>Cố định</Text>
                  </View>
                </View>
              ))}
            </View>
            {errors.checkpointIds && (
              <Text style={styles.fieldError}>{errors.checkpointIds}</Text>
            )}
          </View>
        )}

        {/* 3D MAP PREVIEW: Rendered immediately upon selecting Destination & Trail */}
        {trail3DData && (
          <View style={styles.map3DSection}>
            <View style={styles.map3DHeader}>
              <View style={styles.map3DTitleRow}>
                <Ionicons name="cube" size={16} color="#125238" />
                <Text style={styles.map3DTitle}>MÔ HÌNH ĐỊA HÌNH 3D (VFRS DEM SATELLITE)</Text>
              </View>
              <View style={styles.map3DBadge}>
                <Ionicons name="scan-outline" size={11} color="#002113" />
                <Text style={styles.map3DBadgeText}>3D MapLibre</Text>
              </View>
            </View>

            <View style={styles.map3DContainer}>
              <Trip3DMapView trailData={trail3DData} height={260} />
            </View>
            <Text style={styles.map3DNote}>
              Mô hình 3D thực địa vệ tinh & cao độ trực quan cho toàn bộ tuyến {selectedDest?.name}.
            </Text>
          </View>
        )}
      </View>

      {/* 3. CARD: TÀI CHÍNH & MỨC GIÁ */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="cash" size={20} color="#125238" />
          <Text style={styles.cardTitle}>TÀI CHÍNH & MỨC PHÍ TOUR</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Giá trọn gói mỗi thành viên (VNĐ) *</Text>
          <View style={styles.priceInputWrapper}>
            <TextInput
              value={form.price}
              onChangeText={(val) => onUpdateField("price", val.replace(/[^0-9]/g, ""))}
              placeholder="2500000"
              placeholderTextColor="#707972"
              keyboardType="numeric"
              style={styles.priceInput}
            />
            <Text style={styles.priceSuffix}>VNĐ / suất</Text>
          </View>
          <Text style={styles.priceFormatted}>
            {Number(form.price || 0).toLocaleString("vi-VN")} đ / người
          </Text>
        </View>

        {/* Price Explanation — Bắt buộc trước khi publish */}
        <View style={styles.inputGroup}>
          <View style={styles.explanationHeaderRow}>
            <Text style={styles.inputLabel}>Giải thích cơ cấu giá vé (priceExplanation) *</Text>
            <Text style={styles.charCountText}>
              {(form.priceExplanation || "").length}/5000
            </Text>
          </View>
          <TextInput
            value={form.priceExplanation}
            onChangeText={(val) => onUpdateField("priceExplanation", val)}
            placeholder="Ví dụ: Chi phí ăn uống 3 bữa/ngày, phí lán trại nghỉ đêm, đội porter hỗ trợ mang đồ 5kg/khách, bảo hiểm du lịch mạo hiểm VFRS và thù lao Mountain Leader..."
            placeholderTextColor="#707972"
            multiline
            numberOfLines={4}
            maxLength={5000}
            style={[
              styles.inputBox,
              styles.inputMultiline,
              errors.priceExplanation && styles.inputError,
            ]}
          />
          <Text style={styles.inputHint}>
            Cơ sở tính giá nội bộ phục vụ kiểm duyệt trước khi xuất bản. Bắt buộc để mở khóa xuất bản chuyến đi.
          </Text>
          {errors.priceExplanation && (
            <Text style={styles.fieldError}>{errors.priceExplanation}</Text>
          )}
        </View>
      </View>

      {/* Bottom Action Button */}
      <TouchableOpacity style={styles.primaryBtn} onPress={onProceed} activeOpacity={0.88}>
        <Text style={styles.primaryBtnText}>TIẾP TỤC: XEM LẠI & XUẤT BẢN</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.card,
  },
  headerTitle: {
    color: "#121c2a",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: "#125238",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  badgeVfrs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#b1f0cd",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeVfrsText: {
    color: "#002113",
    fontSize: 11,
    fontWeight: "800",
  },
  progressContainer: {
    backgroundColor: "#ffffff",
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 16,
    ...Shadows.card,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressStepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#125238",
    alignItems: "center",
    justifyContent: "center",
  },
  progressStepNum: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  progressStepText: {
    color: "#125238",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  progressPercent: {
    color: "#404943",
    fontSize: 12,
    fontWeight: "800",
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: "#dee9fc",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#125238",
    borderRadius: 3,
  },
  errorBox: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#ffdad6",
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ba1a1a",
  },
  errorIconWrap: {
    marginTop: 2,
  },
  errorTitle: {
    color: "#ba1a1a",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 3,
  },
  errorText: {
    color: "#93000a",
    fontSize: 12,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  retryBtnText: {
    color: "#125238",
    fontSize: 11,
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 16,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eff4ff",
    paddingBottom: 12,
    marginBottom: 14,
  },
  cardTitle: {
    color: "#121c2a",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
  },
  muted: {
    color: "#707972",
    fontSize: 12,
  },
  destList: {
    gap: 10,
  },
  destCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: Radius.sm,
    backgroundColor: "#eff4ff",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  destCardSelected: {
    borderColor: "#125238",
    backgroundColor: "#e6eeff",
  },
  destIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#dee9fc",
    alignItems: "center",
    justifyContent: "center",
  },
  destIconBoxSelected: {
    backgroundColor: "#b1f0cd",
  },
  destName: {
    color: "#121c2a",
    fontSize: 14,
    fontWeight: "700",
  },
  destNameSelected: {
    color: "#125238",
    fontWeight: "800",
  },
  destMeta: {
    color: "#404943",
    fontSize: 11,
    marginTop: 2,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 6,
  },
  emptyText: {
    color: "#121c2a",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtext: {
    color: "#707972",
    fontSize: 11,
    textAlign: "center",
    maxWidth: 260,
  },
  checkpointSection: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#eff4ff",
    paddingTop: 14,
  },
  checkpointSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  checkpointSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  checkpointSectionTitle: {
    color: "#121c2a",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  checkpointCountBadge: {
    color: "#125238",
    fontSize: 11,
    fontWeight: "800",
  },
  checkpointList: {
    gap: 8,
  },
  checkpointRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: Radius.sm,
    backgroundColor: "#f4f8f5",
    borderWidth: 1,
    borderColor: "#e0ece4",
  },
  cpLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  cpPill: {
    backgroundColor: "#125238",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  cpPillText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  cpName: {
    color: "#121c2a",
    fontSize: 12,
    fontWeight: "700",
  },
  cpCoords: {
    color: "#707972",
    fontSize: 10,
    marginTop: 2,
  },
  cpDefaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#c8e6c9",
  },
  cpDefaultBadgeText: {
    color: "#125238",
    fontSize: 10,
    fontWeight: "700",
  },
  map3DSection: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#eff4ff",
    paddingTop: 14,
  },
  map3DHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  map3DTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  map3DTitle: {
    color: "#121c2a",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  map3DBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#b1f0cd",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  map3DBadgeText: {
    color: "#002113",
    fontSize: 10,
    fontWeight: "800",
  },
  map3DContainer: {
    borderRadius: Radius.md,
    overflow: "hidden",
    backgroundColor: "#141d13",
    borderWidth: 1,
    borderColor: "#c1ecd2",
  },
  map3DNote: {
    color: "#707972",
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 6,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 14,
  },
  explanationHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  charCountText: {
    color: "#707972",
    fontSize: 10,
    fontWeight: "600",
  },
  inputLabel: {
    color: "#121c2a",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  inputBox: {
    backgroundColor: "#eff4ff",
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#121c2a",
    fontSize: 13,
    fontWeight: "500",
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputMultiline: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: "#ba1a1a",
    backgroundColor: "#ffdad6",
  },
  inputHint: {
    color: "#707972",
    fontSize: 11,
    marginTop: 4,
  },
  fieldError: {
    color: "#ba1a1a",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  dateSection: {
    backgroundColor: "#eff4ff",
    borderRadius: Radius.sm,
    padding: 12,
    marginBottom: 14,
  },
  dateSectionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#b1f0cd",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationPillText: {
    color: "#002113",
    fontSize: 11,
    fontWeight: "800",
  },
  presetsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#dee9fc",
  },
  presetChipText: {
    color: "#125238",
    fontSize: 11,
    fontWeight: "700",
  },
  presetDurationBadge: {
    backgroundColor: "#e6eeff",
    color: "#125238",
    fontSize: 9,
    fontWeight: "800",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  dateGrid: {
    flexDirection: "row",
    gap: 10,
  },
  dateCol: {
    flex: 1,
  },
  dateSubLabel: {
    color: "#404943",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  dateCard: {
    backgroundColor: "#ffffff",
    borderRadius: Radius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: "#dee9fc",
  },
  dateCardError: {
    borderColor: "#ba1a1a",
    backgroundColor: "#ffdad6",
  },
  dateCardInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#121c2a",
    padding: 0,
  },
  dayOfWeekText: {
    color: "#125238",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
  },
  dateRulesHint: {
    color: "#707972",
    fontSize: 10,
    marginTop: 8,
    fontStyle: "italic",
  },
  pickupList: {
    gap: 6,
  },
  pickupChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: Radius.sm,
    backgroundColor: "#eff4ff",
    borderWidth: 1,
    borderColor: "transparent",
  },
  pickupChipSelected: {
    borderColor: "#125238",
    backgroundColor: "#ffffff",
  },
  pickupText: {
    color: "#121c2a",
    fontSize: 12,
    fontWeight: "600",
  },
  pickupTextSelected: {
    color: "#125238",
    fontWeight: "800",
  },
  slotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  slotCapTag: {
    color: "#125238",
    fontSize: 11,
    fontWeight: "800",
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#eff4ff",
    borderRadius: Radius.sm,
    padding: 8,
    marginTop: 4,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#dee9fc",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnPlus: {
    backgroundColor: "#125238",
  },
  stepperDisplay: {
    alignItems: "center",
  },
  stepperValue: {
    color: "#121c2a",
    fontSize: 22,
    fontWeight: "900",
  },
  stepperSub: {
    color: "#707972",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  slotRuleHint: {
    color: "#707972",
    fontSize: 10,
    marginTop: 6,
    fontStyle: "italic",
  },
  priceInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff4ff",
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  priceInput: {
    flex: 1,
    color: "#125238",
    fontSize: 17,
    fontWeight: "800",
    padding: 0,
  },
  priceSuffix: {
    color: "#707972",
    fontSize: 12,
    fontWeight: "700",
  },
  priceFormatted: {
    color: "#125238",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#125238",
    paddingVertical: 15,
    borderRadius: Radius.sm,
    marginTop: 10,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
