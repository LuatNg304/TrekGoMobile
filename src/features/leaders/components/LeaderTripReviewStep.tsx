import { Radius, Shadows } from "@/constants/theme";
import type {
  TripOptionCheckpoint,
  TripOptionDestination,
  TripOptionPickupPoint,
} from "@/features/leaders/hooks";
import {
  calculateTripDuration,
  getDayOfWeekName,
  parseVnDate,
} from "@/features/leaders/utils/tripDateUtils";
import type { LeaderTripFormData } from "./LeaderTripFormStep";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface LeaderTripReviewStepProps {
  form: LeaderTripFormData;
  selectedDestination?: TripOptionDestination;
  selectedPickup?: TripOptionPickupPoint;
  selectedCheckpoints: TripOptionCheckpoint[];
  conflictWarning?: string | null;
  submitError?: string | null;
  readinessIssues?: string[];
  isSubmitting: boolean;
  apiLoading: boolean;
  onPublish: () => void;
  onBackToForm: () => void;
  onSavePriceExplanation?: (newExplanation: string) => Promise<void> | void;
  isSavingExplanation?: boolean;
}

export function LeaderTripReviewStep({
  form,
  selectedDestination,
  selectedPickup,
  selectedCheckpoints,
  conflictWarning,
  submitError,
  readinessIssues = [],
  isSubmitting,
  apiLoading,
  onPublish,
  onBackToForm,
  onSavePriceExplanation,
  isSavingExplanation = false,
}: LeaderTripReviewStepProps) {
  const isLoading = isSubmitting || apiLoading;

  const [isEditingExplanation, setIsEditingExplanation] = useState(false);
  const [editedExplanation, setEditedExplanation] = useState(
    form.priceExplanation || "",
  );
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const handleSaveExplanation = async () => {
    if (!onSavePriceExplanation) {
      setIsEditingExplanation(false);
      return;
    }
    try {
      await onSavePriceExplanation(editedExplanation);
      setIsEditingExplanation(false);
      setSaveSuccessMsg("Đã cập nhật cơ cấu giá vé thành công.");
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch {
      // error handled by parent
    }
  };

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
    return d ? getDayOfWeekName(d) : "";
  }, [form.startDate]);

  const endDay = useMemo(() => {
    const d = parseVnDate(form.endDate);
    return d ? getDayOfWeekName(d) : "";
  }, [form.endDate]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBackToForm} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#121c2a" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>XEM LẠI CHUYẾN ĐI</Text>
            <Text style={styles.headerSubtitle}>BƯỚC 2/2 · KIỂM DUYỆT & XUẤT BẢN</Text>
          </View>
        </View>
        <View style={styles.badgeVfrs}>
          <Ionicons name="shield-checkmark" size={14} color="#125238" />
          <Text style={styles.badgeVfrsText}>VFRS-L2</Text>
        </View>
      </View>

      {/* Progress Track: 100% */}
      <View style={styles.progressContainer}>
        <View style={styles.progressRow}>
          <View style={styles.progressLabelRow}>
            <View style={styles.progressStepCircle}>
              <Text style={styles.progressStepNum}>2</Text>
            </View>
            <Text style={styles.progressStepText}>BƯỚC 2/2: XÁC NHẬN & MỞ BÁN CÔNG KHAI</Text>
          </View>
          <Text style={styles.progressPercent}>100%</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: "100%" }]} />
        </View>
      </View>

      {/* Main Review Card */}
      <View style={styles.reviewCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="document-text" size={20} color="#125238" />
          <Text style={styles.cardTitle}>TỔNG QUAN HỒ SƠ CHUYẾN ĐI</Text>
        </View>

        <Text style={styles.tripTitle}>{form.name}</Text>
        {form.description ? (
          <Text style={styles.tripDesc}>{form.description}</Text>
        ) : null}

        {/* Telemetry Chips */}
        <View style={styles.telemetryGrid}>
          <View style={styles.telemetryItem}>
            <Text style={styles.telemetryLabel}>THỜI LƯỢNG</Text>
            <Text style={styles.telemetryVal}>{durationInfo?.text || "Theo thỏa thuận"}</Text>
          </View>
          <View style={styles.telemetryItem}>
            <Text style={styles.telemetryLabel}>MỞ BÁN</Text>
            <Text style={styles.telemetryVal}>{form.slots} SLOTS</Text>
          </View>
          <View style={styles.telemetryItem}>
            <Text style={styles.telemetryLabel}>GIÁ / NGƯỜI</Text>
            <Text style={[styles.telemetryVal, { color: "#125238" }]}>
              {Number(form.price || 0).toLocaleString("vi-VN")} đ
            </Text>
          </View>
        </View>

        {/* Detail Rows */}
        <View style={styles.detailRows}>
          <ReviewRow
            icon="location-outline"
            label="Điểm đến (Destination)"
            value={selectedDestination?.name ?? "Theo cấu hình"}
          />
          <ReviewRow
            icon="calendar-outline"
            label="Khởi hành"
            value={`${form.startDate} (${startDay} • 05:30)`}
          />
          <ReviewRow
            icon="flag-outline"
            label="Kết thúc"
            value={`${form.endDate} (${endDay} • 18:00)`}
          />
          <ReviewRow
            icon="bus-outline"
            label="Điểm đón khách"
            value={selectedPickup?.name ?? "Sa Pa Hub, Số 02 Cầu Mây"}
          />
          <ReviewRow
            icon="shield-checkmark-outline"
            label="Trạm kiểm soát (Checkpoints)"
            value={
              selectedCheckpoints.length > 0
                ? selectedCheckpoints.map((cp) => cp.name).join(", ")
                : "Tất cả checkpoint hợp lệ của tuyến"
            }
          />
        </View>
      </View>

      {/* 2. CARD: GIẢI THÍCH CƠ CẤU GIÁ VÉ (priceExplanation) */}
      <View style={styles.reviewCard}>
        <View style={styles.cardHeaderBetween}>
          <View style={styles.cardHeaderLeft}>
            <Ionicons name="receipt-outline" size={20} color="#125238" />
            <Text style={styles.cardTitle}>GIẢI THÍCH CƠ CẤU GIÁ VÉ (PRICE EXPLANATION)</Text>
          </View>
          {!isEditingExplanation && onSavePriceExplanation && (
            <TouchableOpacity
              onPress={() => {
                setEditedExplanation(form.priceExplanation || "");
                setIsEditingExplanation(true);
              }}
              style={styles.quickEditBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil" size={13} color="#125238" />
              <Text style={styles.quickEditBtnText}>Sửa nhanh</Text>
            </TouchableOpacity>
          )}
        </View>

        {Boolean(saveSuccessMsg) && (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={16} color="#125238" />
            <Text style={styles.successText}>{saveSuccessMsg}</Text>
          </View>
        )}

        {isEditingExplanation ? (
          <View style={styles.editExplanationBox}>
            <Text style={styles.explanationEditHint}>
              Cập nhật cơ cấu tính giá. Khi bấm Lưu, hệ thống sẽ gọi PATCH và tự động kiểm tra lại điều kiện sẵn sàng xuất bản (Readiness Check):
            </Text>
            <TextInput
              value={editedExplanation}
              onChangeText={setEditedExplanation}
              placeholder="Nhập chi tiết cơ sở tính giá (lán trại, ăn uống, bảo hiểm, porter...)"
              placeholderTextColor="#707972"
              multiline
              numberOfLines={4}
              maxLength={5000}
              style={styles.explanationInput}
            />
            <Text style={styles.explanationCounter}>{editedExplanation.length}/5000 ký tự</Text>

            <View style={styles.editActionRow}>
              <TouchableOpacity
                style={styles.cancelEditBtn}
                onPress={() => setIsEditingExplanation(false)}
                disabled={isSavingExplanation}
              >
                <Text style={styles.cancelEditBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveEditBtn, isSavingExplanation && styles.disabledBtn]}
                onPress={() => void handleSaveExplanation()}
                disabled={isSavingExplanation || !editedExplanation.trim()}
              >
                {isSavingExplanation ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={15} color="#fff" />
                    <Text style={styles.saveEditBtnText}>Lưu & Cập nhật</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.explanationContentBox}>
            {form.priceExplanation && form.priceExplanation.trim() ? (
              <Text style={styles.explanationText}>{form.priceExplanation.trim()}</Text>
            ) : (
              <View style={styles.missingExplanationBox}>
                <Ionicons name="alert-circle" size={18} color="#ba1a1a" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.missingExplanationTitle}>
                    Chưa có giải thích cơ cấu giá vé!
                  </Text>
                  <Text style={styles.missingExplanationText}>
                    Backend yêu cầu bắt buộc trường này để Publish. Vui lòng bấm &ldquo;Sửa nhanh&rdquo; bên trên để bổ sung ngay.
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Readiness Issues Warning */}
      {readinessIssues.length > 0 && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={20} color="#ba1a1a" />
          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>Điều kiện xuất bản chưa đạt (Readiness)</Text>
            {readinessIssues.map((issue, idx) => (
              <Text key={idx} style={styles.errorText}>
                • {issue}
              </Text>
            ))}
          </View>
        </View>
      )}

      {/* Conflict Warning */}
      {Boolean(conflictWarning) && (
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={20} color="#9a3412" />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>Cảnh báo xung đột lịch trình</Text>
            <Text style={styles.warningText}>{conflictWarning}</Text>
          </View>
        </View>
      )}

      {/* Submission Error */}
      {Boolean(submitError) && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={20} color="#ba1a1a" />
          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>Thông báo hệ thống</Text>
            <Text style={styles.errorText}>{submitError}</Text>
          </View>
        </View>
      )}

      {/* Operational Protocol Notice */}
      <View style={styles.protocolNotice}>
        <Ionicons name="information-circle" size={18} color="#125238" />
        <Text style={styles.protocolNoticeText}>
          Khi bấm xuất bản, hệ thống sẽ tiến hành xác thực lộ trình, kích hoạt các trạm kiểm soát VFRS và mở nhận đăng ký công khai cho Trekker.
        </Text>
      </View>

      {/* Action Buttons */}
      <TouchableOpacity
        disabled={isLoading}
        style={[styles.publishBtn, isLoading && styles.disabledBtn]}
        onPress={onPublish}
        activeOpacity={0.88}
      >
        {isLoading ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.publishBtnText}>ĐANG XUẤT BẢN CHUYẾN ĐI...</Text>
          </>
        ) : (
          <>
            <Ionicons name="rocket-outline" size={18} color="#fff" />
            <Text style={styles.publishBtnText}>XUẤT BẢN & MỞ NHẬN ĐĂNG KÝ</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.editBtn}
        onPress={onBackToForm}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <Ionicons name="create-outline" size={16} color="#125238" />
        <Text style={styles.editBtnText}>QUAY LẠI CHỈNH SỬA THÔNG TIN</Text>
      </TouchableOpacity>
    </View>
  );
}

function ReviewRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.reviewRow}>
      <View style={styles.reviewRowIcon}>
        <Ionicons name={icon} size={16} color="#125238" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.reviewRowLabel}>{label}</Text>
        <Text style={styles.reviewRowValue}>{value}</Text>
      </View>
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
    color: "#125238",
    fontSize: 12,
    fontWeight: "900",
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
  reviewCard: {
    backgroundColor: "#ffffff",
    borderRadius: Radius.md,
    padding: 18,
    marginBottom: 14,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eff4ff",
    paddingBottom: 10,
    marginBottom: 12,
  },
  cardTitle: {
    color: "#121c2a",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  tripTitle: {
    color: "#121c2a",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
    marginBottom: 6,
  },
  tripDesc: {
    color: "#404943",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  telemetryGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  telemetryItem: {
    flex: 1,
    backgroundColor: "#eff4ff",
    borderRadius: Radius.sm,
    padding: 10,
    alignItems: "center",
  },
  telemetryLabel: {
    color: "#707972",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  telemetryVal: {
    color: "#121c2a",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    textAlign: "center",
  },
  detailRows: {
    borderTopWidth: 1,
    borderTopColor: "#eff4ff",
    paddingTop: 10,
    gap: 10,
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 6,
  },
  reviewRowIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#eff4ff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  reviewRowLabel: {
    color: "#707972",
    fontSize: 11,
    fontWeight: "600",
  },
  reviewRowValue: {
    color: "#121c2a",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  warningBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#fff7ed",
    borderRadius: Radius.sm,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#fdba74",
  },
  warningTitle: {
    color: "#9a3412",
    fontSize: 12,
    fontWeight: "800",
  },
  warningText: {
    color: "#c2410c",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#ffdad6",
    borderRadius: Radius.sm,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ba1a1a",
  },
  errorTitle: {
    color: "#ba1a1a",
    fontSize: 12,
    fontWeight: "800",
  },
  errorText: {
    color: "#93000a",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  protocolNotice: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#eaf5e1",
    padding: 12,
    borderRadius: Radius.sm,
    marginBottom: 16,
  },
  protocolNoticeText: {
    color: "#125238",
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  publishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#125238",
    paddingVertical: 15,
    borderRadius: Radius.sm,
    marginBottom: 10,
  },
  disabledBtn: {
    backgroundColor: "#aab3a5",
  },
  publishBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#125238",
    paddingVertical: 12,
    borderRadius: Radius.sm,
    backgroundColor: "#ffffff",
  },
  editBtnText: {
    color: "#125238",
    fontSize: 12,
    fontWeight: "800",
  },
  cardHeaderBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eff4ff",
    paddingBottom: 10,
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  quickEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e6eeff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickEditBtnText: {
    color: "#125238",
    fontSize: 11,
    fontWeight: "700",
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e8f5e9",
    padding: 10,
    borderRadius: Radius.sm,
    marginBottom: 10,
  },
  successText: {
    color: "#125238",
    fontSize: 12,
    fontWeight: "700",
  },
  editExplanationBox: {
    gap: 8,
  },
  explanationEditHint: {
    color: "#707972",
    fontSize: 11,
    lineHeight: 16,
  },
  explanationInput: {
    backgroundColor: "#eff4ff",
    borderRadius: Radius.sm,
    padding: 12,
    color: "#121c2a",
    fontSize: 13,
    minHeight: 90,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#dee9fc",
  },
  explanationCounter: {
    color: "#707972",
    fontSize: 10,
    textAlign: "right",
  },
  editActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  cancelEditBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#eff4ff",
  },
  cancelEditBtnText: {
    color: "#404943",
    fontSize: 12,
    fontWeight: "700",
  },
  saveEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#125238",
  },
  saveEditBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  explanationContentBox: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  explanationText: {
    color: "#1e293b",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
  },
  missingExplanationBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: "#ffdad6",
    padding: 12,
    borderRadius: Radius.sm,
  },
  missingExplanationTitle: {
    color: "#ba1a1a",
    fontSize: 12,
    fontWeight: "800",
  },
  missingExplanationText: {
    color: "#93000a",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
});
