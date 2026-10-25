import { Colors, Radius, Shadows } from "@/constants/theme";
import type { TripOptionCheckpoint } from "@/features/leaders/hooks";
import type {
  LeaderTrailSuggestion,
} from "@/features/leaders/services/leader-public-trips.api";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface LeaderTripRouteStepProps {
  tripTitle?: string;
  destinationName?: string;
  trailSuggestions: LeaderTrailSuggestion[];
  destinationCheckpoints: TripOptionCheckpoint[];
  selectedTrail: LeaderTrailSuggestion | null;
  onSelectTrail: (trail: LeaderTrailSuggestion) => void;
  isLoading: boolean;
  submitError?: string | null;
  onProceed: () => void;
  onBack: () => void;
  onRetry?: () => void;
}

export function LeaderTripRouteStep({
  tripTitle,
  destinationName,
  trailSuggestions,
  destinationCheckpoints,
  selectedTrail,
  onSelectTrail,
  isLoading,
  submitError,
  onProceed,
  onBack,
  onRetry,
}: LeaderTripRouteStepProps) {
  // Lọc chỉ lấy các System Trail hợp lệ có checkpointIds.length > 0
  const validSuggestions = useMemo(() => {
    return trailSuggestions.filter(
      (s) => Array.isArray(s.checkpointIds) && s.checkpointIds.length > 0,
    );
  }, [trailSuggestions]);

  // Map checkpointIds của trail đã chọn sang danh sách checkpoint chi tiết (tên, tọa độ)
  const currentCheckpoints = useMemo(() => {
    if (!selectedTrail?.checkpointIds || selectedTrail.checkpointIds.length === 0) {
      return [];
    }
    return selectedTrail.checkpointIds
      .map((id) => destinationCheckpoints.find((cp) => cp.id === id))
      .filter((cp): cp is TripOptionCheckpoint => Boolean(cp));
  }, [selectedTrail, destinationCheckpoints]);

  const canProceed = Boolean(
    selectedTrail &&
      Array.isArray(selectedTrail.checkpointIds) &&
      selectedTrail.checkpointIds.length > 0 &&
      !isLoading,
  );

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
            <Text style={styles.headerSubtitle}>BƯỚC 2/3 · THIẾT LẬP LỘ TRÌNH</Text>
          </View>
        </View>
        <View style={styles.badgeVfrs}>
          <Ionicons name="shield-checkmark" size={14} color="#125238" />
          <Text style={styles.badgeVfrsText}>VFRS-L2</Text>
        </View>
      </View>

      {/* Wizard Progress Tracker (Step 2 of 3 = 66%) */}
      <View style={styles.progressContainer}>
        <View style={styles.progressRow}>
          <View style={styles.progressLabelRow}>
            <View style={styles.progressStepCircle}>
              <Text style={styles.progressStepNum}>2</Text>
            </View>
            <Text style={styles.progressStepText}>BƯỚC 2/3: LỰA CHỌN CUNG ĐƯỜNG & TRẠM DỪNG</Text>
          </View>
          <Text style={styles.progressPercent}>66%</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: "66%" }]} />
        </View>
      </View>

      {/* Error Banner */}
      {Boolean(submitError) && (
        <View style={styles.errorBox}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle" size={22} color="#ba1a1a" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>Lưu ý từ hệ thống</Text>
            <Text style={styles.errorText}>{submitError}</Text>
            {onRetry && (
              <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
                <Ionicons name="reload" size={14} color="#125238" />
                <Text style={styles.retryBtnText}>Thử lại</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* 1. CARD: LỰA CHỌN CUNG ĐƯỜNG CHO CHUYẾN ĐI (SYSTEM TRAILS) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderIcon}>
            <Ionicons name="map" size={18} color="#125238" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              1. LỰA CHỌN CUNG ĐƯỜNG CHO CHUYẾN ĐI (System Trails)
            </Text>
            <Text style={styles.cardSubtitle}>
              Sử dụng kho dữ liệu GPS đã thẩm định và xác minh theo chuẩn VFRS.
            </Text>
          </View>
        </View>

        <View style={styles.verifiedBadgeRow}>
          <View style={styles.verifiedPill}>
            <Ionicons name="shield-checkmark" size={14} color="#125238" />
            <Text style={styles.verifiedPillText}>Cung đường đã thẩm định</Text>
          </View>
          <Text style={styles.verifiedSubText}>
            Dữ liệu trắc diện, nguồn nước và tọa độ cứu hộ đã được chuẩn hóa.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#125238" />
            <Text style={styles.loadingText}>Đang tải danh sách cung đường chuẩn từ hệ thống...</Text>
          </View>
        ) : validSuggestions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="trail-sign-outline" size={32} color="#707972" />
            <Text style={styles.emptyTitle}>Chưa có cung đường phù hợp</Text>
            <Text style={styles.emptySub}>
              Khu vực {destinationName || "này"} chưa có System Trail hợp lệ có trạm kiểm soát chuẩn.
              Vui lòng kiểm tra lại điểm đến hoặc liên hệ ban quản trị VFRS.
            </Text>
          </View>
        ) : (
          <View style={styles.trailsList}>
            {validSuggestions.map((trail) => {
              const isSelected = selectedTrail?.id === trail.id;
              const cpCount = trail.checkpointIds?.length || 0;
              const dist = trail.distanceKm || trail.lengthKm || "5.0";
              const elevation = trail.elevationGainM ? `+${trail.elevationGainM}m` : "+450m";
              const difficulty = trail.difficulty || "MEDIUM";

              return (
                <TouchableOpacity
                  key={trail.id}
                  style={[styles.trailItem, isSelected && styles.trailItemSelected]}
                  onPress={() => onSelectTrail(trail)}
                  activeOpacity={0.8}
                >
                  <View style={styles.trailItemContent}>
                    {/* Thumbnail / Icon Badge */}
                    <View
                      style={[
                        styles.trailThumbnail,
                        isSelected && styles.trailThumbnailSelected,
                      ]}
                    >
                      <Ionicons
                        name="trail-sign"
                        size={22}
                        color={isSelected ? "#125238" : "#707972"}
                      />
                    </View>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.trailNameRow}>
                        <Text
                          style={[
                            styles.trailName,
                            isSelected && styles.trailNameSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {trail.name}
                        </Text>
                        <Text style={styles.trailCpCount}>• {cpCount} checkpoint</Text>
                      </View>

                      {/* Metrics Badges */}
                      <View style={styles.trailMetricsRow}>
                        <View style={styles.metricChip}>
                          <Text style={styles.metricLabel}>Cự ly</Text>
                          <Text style={styles.metricVal}>{dist} km</Text>
                        </View>
                        <View style={styles.metricChip}>
                          <Text style={styles.metricLabel}>Độ dốc/Cao</Text>
                          <Text style={styles.metricVal}>{elevation}</Text>
                        </View>
                        <View style={[styles.metricChip, styles.diffChip]}>
                          <Text style={styles.metricLabel}>Độ khó</Text>
                          <Text style={styles.diffVal}>{difficulty}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Radio Checkmark */}
                    <View style={styles.radioWrap}>
                      <Ionicons
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                        size={22}
                        color={isSelected ? "#125238" : "#a2aba3"}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Selected Trail Overview */}
        {selectedTrail && (
          <View style={styles.trailOverviewBox}>
            <View style={styles.overviewHeader}>
              <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                <Text style={styles.overviewTitle} numberOfLines={1}>
                  Tổng quan: {selectedTrail.name}
                </Text>
                <Text style={styles.overviewSubTitle}>
                  Hành trình {destinationName || "khám phá"} · Chuẩn an toàn VFRS
                </Text>
              </View>
              <View style={styles.peakBadge}>
                <Ionicons name="trending-up" size={12} color="#125238" />
                <Text style={styles.peakBadgeText}>
                  {selectedTrail.elevationGainM ? `${selectedTrail.elevationGainM}m Peak` : "500m Peak"}
                </Text>
              </View>
            </View>

            {/* Stats Summary Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>Tổng cự ly</Text>
                <Text style={styles.statValue}>
                  {selectedTrail.distanceKm || selectedTrail.lengthKm || "5.0"} km
                </Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>Độ cao đỉnh</Text>
                <Text style={styles.statValue}>
                  {selectedTrail.elevationGainM ? `${selectedTrail.elevationGainM}m` : "500m"}
                </Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>Độ khó</Text>
                <Text style={[styles.statValue, { color: "#b76e00" }]}>
                  {selectedTrail.difficulty || "MEDIUM"}
                </Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>Trạm an toàn</Text>
                <Text style={styles.statValue}>{currentCheckpoints.length} mốc</Text>
              </View>
            </View>

            {/* Safety Rules Box */}
            <View style={styles.safetyBox}>
              <View style={styles.safetyHeader}>
                <Ionicons name="shield-outline" size={15} color="#125238" />
                <Text style={styles.safetyTitle}>Quy chuẩn An toàn Trạm dừng VFRS</Text>
              </View>
              <Text style={styles.safetyText}>
                • Mốc kiểm soát bắt buộc: Toàn đoàn phải quét GPS và đồng bộ trạng thái tại mỗi checkpoint đã định.
              </Text>
              <Text style={styles.safetyText}>
                • Định vị khẩn cấp SOS: Hệ thống kích hoạt giám sát thời gian thực khi bắt đầu chuyến đi.
              </Text>
              <Text style={styles.safetyTextHotline}>
                • Cứu hộ phản ứng nhanh VFRS: 1800 9988
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* 2. CARD: TRẠM DỪNG & CHECKPOINTS AN TOÀN THEO THỨ TỰ CỦA TRAIL */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderIcon}>
            <Ionicons name="flag" size={18} color="#125238" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.checkpointHeaderTitleRow}>
              <Text style={styles.cardTitle}>2. TRẠM DỪNG & CHECKPOINTS AN TOÀN</Text>
              {currentCheckpoints.length > 0 && (
                <View style={styles.reqCpBadge}>
                  <Text style={styles.reqCpBadgeText}>
                    {currentCheckpoints.length} MỐC
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.cardSubtitle}>
              Danh sách mốc kiểm soát đoàn bắt buộc theo đúng thứ tự hành trình của cung đường.
            </Text>
          </View>
        </View>

        {!selectedTrail ? (
          <View style={styles.disabledPromptBox}>
            <Ionicons name="information-circle-outline" size={18} color="#707972" />
            <Text style={styles.disabledPromptText}>
              Vui lòng chọn 1 Cung đường ở trên để hiển thị danh sách trạm kiểm soát tương ứng.
            </Text>
          </View>
        ) : currentCheckpoints.length === 0 ? (
          <View style={styles.disabledPromptBox}>
            <ActivityIndicator size="small" color="#125238" />
            <Text style={styles.disabledPromptText}>
              Đang đồng bộ tọa độ các trạm kiểm soát của cung đường này...
            </Text>
          </View>
        ) : (
          <View style={styles.checkpointList}>
            {currentCheckpoints.map((cp, idx) => {
              const latStr = Number(cp.latitude).toFixed(4);
              const lngStr = Number(cp.longitude).toFixed(4);

              return (
                <View key={cp.id || idx} style={styles.checkpointCard}>
                  <View style={styles.cpLeft}>
                    {/* Sequence Badge */}
                    <View style={styles.cpSeqCircle}>
                      <Text style={styles.cpSeqNum}>{idx + 1}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.cpName}>{cp.name}</Text>
                      <Text style={styles.cpSub}>Mốc kiểm soát vệ tinh an toàn</Text>
                      <Text style={styles.cpCoords}>
                        Tọa độ: {latStr}, {lngStr} · Bán kính quét: 50m
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cpBadgeBắtBuộc}>
                    <Ionicons name="shield-checkmark" size={13} color="#125238" />
                    <Text style={styles.cpBadgeText}>Bắt buộc</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Bottom Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={16} color="#125238" />
          <Text style={styles.secondaryBtnText}>Quay lại</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, !canProceed && styles.primaryBtnDisabled]}
          onPress={onProceed}
          disabled={!canProceed}
          activeOpacity={0.88}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.primaryBtnText}>Tiếp tục: Xem lại & Xuất bản</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
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
    backgroundColor: "#d1e8d5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeVfrsText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#125238",
  },
  progressContainer: {
    backgroundColor: "#ffffff",
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e1e9e2",
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
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#125238",
    alignItems: "center",
    justifyContent: "center",
  },
  progressStepNum: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  progressStepText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#121c2a",
    letterSpacing: 0.3,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: "900",
    color: "#125238",
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: "#e8ede9",
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
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#fff8f7",
    borderWidth: 1,
    borderColor: "#ffdad6",
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 16,
  },
  errorIconWrap: {
    marginTop: 2,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ba1a1a",
    marginBottom: 2,
  },
  errorText: {
    fontSize: 12,
    color: "#410002",
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#125238",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e1e9e2",
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 14,
  },
  cardHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#d1e8d5",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#121c2a",
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 11,
    color: "#707972",
    marginTop: 2,
    lineHeight: 16,
  },
  verifiedBadgeRow: {
    backgroundColor: "#f4fbf4",
    borderWidth: 1,
    borderColor: "#d1e8d5",
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 16,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  verifiedPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#125238",
  },
  verifiedSubText: {
    fontSize: 11,
    color: "#414942",
    lineHeight: 16,
  },
  loadingBox: {
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    color: "#707972",
  },
  emptyCard: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fcfdfc",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#e1e9e2",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#121c2a",
  },
  emptySub: {
    fontSize: 12,
    color: "#707972",
    textAlign: "center",
    lineHeight: 18,
  },
  trailsList: {
    gap: 10,
    marginBottom: 16,
  },
  trailItem: {
    backgroundColor: "#fbfcfb",
    borderWidth: 1.5,
    borderColor: "#e1e9e2",
    borderRadius: Radius.md,
    padding: 12,
  },
  trailItemSelected: {
    backgroundColor: "#f1f8f3",
    borderColor: "#125238",
  },
  trailItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trailThumbnail: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#e8ede9",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  trailThumbnailSelected: {
    backgroundColor: "#d1e8d5",
  },
  trailNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  trailName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#121c2a",
    flexShrink: 1,
  },
  trailNameSelected: {
    color: "#125238",
  },
  trailCpCount: {
    fontSize: 11,
    color: "#707972",
  },
  trailMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  metricChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e1e9e2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metricLabel: {
    fontSize: 9,
    color: "#707972",
    textTransform: "uppercase",
  },
  metricVal: {
    fontSize: 10,
    fontWeight: "800",
    color: "#121c2a",
  },
  diffChip: {
    backgroundColor: "#fef7ed",
    borderColor: "#fde68a",
  },
  diffVal: {
    fontSize: 10,
    fontWeight: "800",
    color: "#b45309",
  },
  radioWrap: {
    paddingLeft: 4,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  trailOverviewBox: {
    marginTop: 8,
    backgroundColor: "#ffffff",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#d1e8d5",
    padding: 14,
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  overviewTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#121c2a",
  },
  overviewSubTitle: {
    fontSize: 11,
    color: "#707972",
    marginTop: 1,
  },
  peakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#d1e8d5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  peakBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#125238",
  },
  statsGrid: {
    flexDirection: "row",
    backgroundColor: "#f8faf7",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    color: "#707972",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "900",
    color: "#121c2a",
  },
  safetyBox: {
    backgroundColor: "#fbfcfb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1e9e2",
    padding: 10,
    gap: 4,
  },
  safetyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  safetyTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#125238",
  },
  safetyText: {
    fontSize: 10.5,
    color: "#414942",
    lineHeight: 15,
  },
  safetyTextHotline: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#ba1a1a",
    lineHeight: 15,
  },
  checkpointHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  reqCpBadge: {
    backgroundColor: "#125238",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  reqCpBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
  },
  disabledPromptBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8faf7",
    borderWidth: 1,
    borderColor: "#e1e9e2",
    borderRadius: Radius.md,
    padding: 14,
  },
  disabledPromptText: {
    fontSize: 12,
    color: "#707972",
    lineHeight: 18,
    flex: 1,
  },
  checkpointList: {
    gap: 8,
  },
  checkpointCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fbfcfb",
    borderWidth: 1,
    borderColor: "#e1e9e2",
    borderRadius: Radius.md,
    padding: 12,
  },
  cpLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  cpSeqCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#125238",
    alignItems: "center",
    justifyContent: "center",
  },
  cpSeqNum: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  cpName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#121c2a",
  },
  cpSub: {
    fontSize: 11,
    color: "#707972",
    marginTop: 1,
  },
  cpCoords: {
    fontSize: 10,
    color: "#8a938c",
    marginTop: 2,
  },
  cpBadgeBắtBuộc: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#d1e8d5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cpBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#125238",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: "#125238",
    backgroundColor: "#ffffff",
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#125238",
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#125238",
    borderRadius: Radius.md,
    paddingVertical: 14,
    ...Shadows.card,
  },
  primaryBtnDisabled: {
    backgroundColor: "#a2aba3",
    elevation: 0,
    shadowOpacity: 0,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
