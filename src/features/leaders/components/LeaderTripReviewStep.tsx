import { Radius, Shadows } from "@/constants/theme";
import type {
  TripOptionCheckpoint,
  TripOptionDestination,
  TripOptionPickupPoint,
} from "@/features/leaders/hooks";
import type { CostItem } from "@/features/leaders/services/leader-pricing.api";
import {
  calculateTripDuration,
  getDayOfWeekName,
  parseVnDate,
} from "@/features/leaders/utils/tripDateUtils";
import { CostPlanBuilder } from "./CostPlanBuilder";
import type { LeaderTripFormData } from "./LeaderTripFormStep";
import { TrekkingPricingSimulator } from "./TrekkingPricingSimulator";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface LeaderTripReviewStepProps {
  form: LeaderTripFormData;
  tripId?: string;
  expectedVersion?: number;
  accessToken?: string;
  costItems: CostItem[];
  onChangeCostItems: (items: CostItem[]) => void;
  selectedDestination?: TripOptionDestination;
  selectedPickup?: TripOptionPickupPoint;
  selectedCheckpoints: TripOptionCheckpoint[];
  selectedTrail?: any;
  conflictWarning?: string | null;
  submitError?: string | null;
  readinessIssues?: string[];
  canPublish?: boolean;
  isSubmitting: boolean;
  apiLoading: boolean;
  onPublish: () => void;
  onBackToForm: () => void;
  onPriceConfirmed: (
    confirmedPrice: number,
    minPax: number,
    explanation: string,
    newVersion: number,
  ) => void;
  isPriceConfirmed: boolean;
  confirmedPriceExplanation?: string | null;
  onVersionUpdated?: (newVersion: number) => void;
}

export function LeaderTripReviewStep({
  form,
  tripId = "",
  expectedVersion = 1,
  accessToken = "",
  costItems,
  onChangeCostItems,
  selectedDestination,
  selectedPickup,
  selectedCheckpoints,
  selectedTrail,
  conflictWarning,
  submitError,
  readinessIssues = [],
  canPublish = false,
  isSubmitting,
  apiLoading,
  onPublish,
  onBackToForm,
  onPriceConfirmed,
  isPriceConfirmed,
  confirmedPriceExplanation,
  onVersionUpdated,
}: LeaderTripReviewStepProps) {
  const isLoading = isSubmitting || apiLoading;

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

  const minPaxNum = parseInt(form.minPax || "5", 10) || 5;
  const maxPaxNum = parseInt(form.slots || "15", 10) || 15;
  const initialPriceNum = parseInt(form.price || "2850000", 10) || 2850000;

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
            <Text style={styles.headerSubtitle}>BƯỚC 3/3 · ĐỊNH GIÁ & XUẤT BẢN CÔNG KHAI</Text>
          </View>
        </View>
        <View style={styles.badgeVfrs}>
          <Ionicons name="shield-checkmark" size={14} color="#125238" />
          <Text style={styles.badgeVfrsText}>TG-PTR-PRICING-01</Text>
        </View>
      </View>

      {/* Progress Track: 100% */}
      <View style={styles.progressContainer}>
        <View style={styles.progressRow}>
          <View style={styles.progressLabelRow}>
            <View style={styles.progressStepCircle}>
              <Text style={styles.progressStepNum}>3</Text>
            </View>
            <Text style={styles.progressStepText}>BƯỚC 3/3: BẢNG DỰ TOÁN, MÔ PHỎNG GIÁ & XUẤT BẢN</Text>
          </View>
          <Text style={styles.progressPercent}>100%</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: "100%" }]} />
        </View>
      </View>

      {/* 1. Main Review Card */}
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
            <Text style={styles.telemetryLabel}>QUY MÔ ĐOÀN</Text>
            <Text style={styles.telemetryVal}>{minPaxNum} - {maxPaxNum} PAX</Text>
          </View>
          <View style={styles.telemetryItem}>
            <Text style={styles.telemetryLabel}>GIÁ VÉ ÁP DỤNG</Text>
            <Text style={[styles.telemetryVal, { color: "#163300" }]}>
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
            value={selectedPickup?.name ?? "Điểm tập kết toàn đoàn"}
          />
          <ReviewRow
            icon="trail-sign-outline"
            label="Cung đường thẩm định (Trail)"
            value={selectedTrail?.name ?? "Cung đường chuẩn VFRS"}
          />
          <ReviewRow
            icon="shield-checkmark-outline"
            label="Trạm kiểm soát (Checkpoints)"
            value={
              selectedCheckpoints.length > 0
                ? selectedCheckpoints.map((cp) => cp.name).join(" → ")
                : "Tất cả checkpoint hợp lệ của tuyến"
            }
          />
        </View>
      </View>

      {/* 2. COMPONENT CON A: BẢNG KÊ CHI PHÍ THỰC TẾ (CostPlanBuilder) */}
      <CostPlanBuilder
        tripId={tripId}
        expectedVersion={expectedVersion}
        accessToken={accessToken}
        targetPax={maxPaxNum}
        items={costItems}
        onChangeItems={onChangeCostItems}
        onSavedSuccess={onVersionUpdated}
      />

      {/* 3. COMPONENT CON B: BỘ MÔ PHỎNG TÀI CHÍNH THỜI GIAN THỰC (TrekkingPricingSimulator) */}
      <TrekkingPricingSimulator
        tripId={tripId}
        expectedVersion={expectedVersion}
        accessToken={accessToken}
        minPax={minPaxNum}
        maxPax={maxPaxNum}
        initialPrice={initialPriceNum}
        items={costItems}
        onPriceConfirmed={onPriceConfirmed}
        isConfirmed={isPriceConfirmed}
      />

      {/* 4. CARD: GIẢI THÍCH CƠ CẤU GIÁ VÉ DO BACKEND TỰ ĐỘNG TẠO */}
      <View style={styles.reviewCard}>
        <View style={styles.cardHeaderBetween}>
          <View style={styles.cardHeaderLeft}>
            <Ionicons name="receipt-outline" size={20} color="#125238" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.cardTitle}>GIẢI THÍCH CƠ CẤU GIÁ VÉ</Text>
              <Text style={styles.cardSubtitle}>AUTOMATED PRICE EXPLANATION (TG-PTR-PRICING-01)</Text>
            </View>
          </View>
          {isPriceConfirmed && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#054d28" />
              <Text style={styles.verifiedBadgeText}>Đã xác thực</Text>
            </View>
          )}
        </View>

        {confirmedPriceExplanation || (form.priceExplanation && form.priceExplanation.trim()) ? (
          <View style={styles.explanationContentBox}>
            <Text style={styles.explanationText}>
              {confirmedPriceExplanation || form.priceExplanation}
            </Text>
          </View>
        ) : (
          <View style={styles.missingExplanationBox}>
            <Ionicons name="alert-circle" size={18} color="#ba1a1a" />
            <View style={{ flex: 1 }}>
              <Text style={styles.missingExplanationTitle}>
                Chưa chốt giá vé trên bộ mô phỏng!
              </Text>
              <Text style={styles.missingExplanationText}>
                Leader cần kéo chỉnh các thông số và bấm &ldquo;CHỐT & ÁP DỤNG GIÁ VÉ NÀY&rdquo; ở bộ mô phỏng phía trên để Backend tự động sinh cơ cấu giải trình giá vé.
              </Text>
            </View>
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
          Khi xuất bản thành công, chuyến đi sẽ chuyển trạng thái sang OPEN và xuất hiện trên bảng khám phá công khai để Trekker đặt chỗ.
        </Text>
      </View>

      {/* Action Button: Active only when canPublish === true */}
      <TouchableOpacity
        disabled={isLoading || !canPublish}
        style={[
          styles.publishBtn,
          canPublish && styles.publishBtnActive,
          (!canPublish || isLoading) && styles.disabledBtn,
        ]}
        onPress={onPublish}
        activeOpacity={0.88}
      >
        {isLoading ? (
          <>
            <ActivityIndicator size="small" color="#0e0f0c" />
            <Text style={styles.publishBtnText}>ĐANG XUẤT BẢN CHUYẾN ĐI...</Text>
          </>
        ) : (
          <>
            <Ionicons
              name="rocket-outline"
              size={18}
              color={canPublish ? "#0e0f0c" : "#868685"}
            />
            <Text
              style={[
                styles.publishBtnText,
                canPublish && { color: "#0e0f0c" },
              ]}
            >
              {canPublish
                ? "XUẤT BẢN & MỞ NHẬN ĐĂNG KÝ (OPEN)"
                : "CHƯA ĐỦ ĐIỀU KIỆN XUẤT BẢN (KHÓA)"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {!canPublish && (
        <Text style={styles.lockedHint}>
          * Nút xuất bản sẽ tự động mở khóa sau khi bạn bấm &ldquo;Chốt & Áp dụng giá vé&rdquo; và hệ thống xác nhận chuyến đi đủ điều kiện (canPublish: true).
        </Text>
      )}
    </View>
  );
}

function ReviewRow({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.reviewRow}>
      <View style={styles.reviewRowIconCircle}>
        <Ionicons name={icon} size={15} color="#125238" />
      </View>
      <View style={styles.reviewRowContent}>
        <Text style={styles.reviewRowLabel}>{label}</Text>
        <Text style={styles.reviewRowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
    flex: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.card,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0e0f0c",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#717a68",
    marginTop: 2,
  },
  badgeVfrs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e2f6d5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  badgeVfrsText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#054d28",
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressStepCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#163300",
    alignItems: "center",
    justifyContent: "center",
  },
  progressStepNum: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9fe870",
  },
  progressStepText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0e0f0c",
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: "800",
    color: "#163300",
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#e8ebe6",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#9fe870",
    borderRadius: 3,
  },
  reviewCard: {
    backgroundColor: "#ffffff",
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e8ebe6",
    marginBottom: 16,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  cardHeaderBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0e0f0c",
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 9,
    fontWeight: "700",
    color: "#868685",
    marginTop: 1,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e2f6d5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#054d28",
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0e0f0c",
    marginBottom: 4,
  },
  tripDesc: {
    fontSize: 12,
    color: "#454745",
    lineHeight: 18,
    marginBottom: 12,
  },
  telemetryGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  telemetryItem: {
    flex: 1,
    backgroundColor: "#fbf9f3",
    borderRadius: Radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e8ebe6",
  },
  telemetryLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#868685",
    letterSpacing: 0.5,
  },
  telemetryVal: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0e0f0c",
    marginTop: 4,
  },
  detailRows: {
    gap: 10,
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  reviewRowIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#e2f6d5",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  reviewRowContent: {
    flex: 1,
  },
  reviewRowLabel: {
    fontSize: 10,
    color: "#868685",
    fontWeight: "600",
  },
  reviewRowValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0e0f0c",
    marginTop: 1,
  },
  explanationContentBox: {
    backgroundColor: "#fbf9f3",
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e8ebe6",
  },
  explanationText: {
    fontSize: 12,
    color: "#0e0f0c",
    lineHeight: 18,
  },
  missingExplanationBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#fee2e2",
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  missingExplanationTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#991b1b",
  },
  missingExplanationText: {
    fontSize: 11,
    color: "#7f1d1d",
    marginTop: 3,
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#fee2e2",
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#991b1b",
  },
  errorText: {
    fontSize: 11,
    color: "#7f1d1d",
    marginTop: 2,
    lineHeight: 16,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#fef3c7",
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#92400e",
  },
  warningText: {
    fontSize: 11,
    color: "#78350f",
    marginTop: 2,
  },
  protocolNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f5f4ee",
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 16,
  },
  protocolNoticeText: {
    fontSize: 11,
    color: "#454745",
    flex: 1,
    lineHeight: 16,
  },
  publishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#e8ebe6",
    paddingVertical: 15,
    borderRadius: Radius.xl,
  },
  publishBtnActive: {
    backgroundColor: "#9fe870",
  },
  disabledBtn: {
    opacity: 0.6,
  },
  publishBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#868685",
    letterSpacing: 0.5,
  },
  lockedHint: {
    fontSize: 11,
    color: "#868685",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 16,
  },
});
