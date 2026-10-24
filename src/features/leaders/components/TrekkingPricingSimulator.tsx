import { Radius, Shadows } from "@/constants/theme";
import {
  computeLocalPricingSimulation,
  confirmTripPricing,
  previewTripPricing,
  type CostItem,
  type PricingPreviewResponse,
} from "@/features/leaders/services/leader-pricing.api";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface TrekkingPricingSimulatorProps {
  tripId: string;
  expectedVersion: number;
  accessToken: string;
  minPax: number;
  maxPax: number;
  initialPrice: number;
  items: CostItem[];
  onPriceConfirmed: (
    confirmedPrice: number,
    minPax: number,
    explanation: string,
    newVersion: number,
  ) => void;
  isConfirmed?: boolean;
}

export function TrekkingPricingSimulator({
  tripId,
  expectedVersion,
  accessToken,
  minPax,
  maxPax,
  initialPrice,
  items,
  onPriceConfirmed,
  isConfirmed = false,
}: TrekkingPricingSimulatorProps) {
  // Simulator Controls
  const [targetPax, setTargetPax] = useState<number>(Math.max(minPax, Math.min(maxPax, 10)));
  const [targetMarginPct, setTargetMarginPct] = useState<number>(20); // 20%
  const [selectedPrice, setSelectedPrice] = useState<number>(
    initialPrice > 0 ? initialPrice : 2850000,
  );

  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState(isConfirmed);

  // Local calculation immediate fallback
  const localSim = useMemo(() => {
    return computeLocalPricingSimulation(
      items,
      targetPax,
      targetMarginPct * 100,
      selectedPrice,
      minPax,
    );
  }, [items, targetPax, targetMarginPct, selectedPrice, minPax]);

  const [simResult, setSimResult] = useState<PricingPreviewResponse>(localSim);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with backend preview with debouncing
  useEffect(() => {
    setSimResult(localSim);

    if (!tripId || !accessToken) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const preview = await previewTripPricing(
          tripId,
          {
            targetPax,
            targetMarginBps: targetMarginPct * 100,
            selectedPrice,
            selectedMinPax: minPax,
            items,
          },
          accessToken,
        );
        if (preview?.summary) {
          setSimResult(preview);
        }
      } catch {
        // use local calculation
      }
    }, 400);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [items, targetPax, targetMarginPct, selectedPrice, minPax, tripId, accessToken, localSim]);

  // Handlers for sliders / steppers
  const handlePaxChange = (delta: number) => {
    const next = Math.max(minPax, Math.min(maxPax, targetPax + delta));
    setTargetPax(next);
    setConfirmedSuccess(false);
  };

  const handleMarginChange = (delta: number) => {
    const next = Math.max(5, Math.min(50, targetMarginPct + delta));
    setTargetMarginPct(next);
    setConfirmedSuccess(false);
  };

  const handlePriceChange = (delta: number) => {
    const next = Math.max(100000, selectedPrice + delta);
    setSelectedPrice(next);
    setConfirmedSuccess(false);
  };

  const handleApplySuggestedPrice = () => {
    if (simResult.summary.suggestedPrice > 0) {
      setSelectedPrice(simResult.summary.suggestedPrice);
      setConfirmedSuccess(false);
    }
  };

  // Confirm Price Call (Chốt & Áp dụng giá vé)
  const handleConfirmPricing = async () => {
    if (!tripId || !accessToken) {
      Alert.alert("Chưa lưu chuyến", "Vui lòng hoàn tất lưu chuyến trước khi chốt giá vé.");
      return;
    }

    setIsConfirming(true);
    try {
      const res = await confirmTripPricing(
        tripId,
        {
          expectedVersion,
          selectedPrice,
          selectedMinPax: minPax,
          targetPax,
        },
        accessToken,
      );

      setIsConfirming(false);
      setConfirmedSuccess(true);
      Alert.alert(
        "Chốt giá vé thành công! 🎉",
        `Đã chốt giá ${selectedPrice.toLocaleString("vi-VN")} đ/người cho quy mô tối thiểu ${minPax} khách. Backend đã tự động tạo giải trình cơ cấu giá chuẩn VFRS.`,
      );

      if (onPriceConfirmed) {
        onPriceConfirmed(
          selectedPrice,
          minPax,
          res.priceExplanation,
          res.version || expectedVersion + 1,
        );
      }
    } catch (err: any) {
      setIsConfirming(false);
      Alert.alert(
        "Không thể chốt giá vé",
        err?.message || "Đã xảy ra lỗi khi xác nhận giá vé với máy chủ.",
      );
    }
  };

  const summary = simResult.summary;
  const breakEven = summary.breakEvenPax;
  const isBreakEvenSafe = breakEven <= targetPax;
  const isLoss = summary.isDeficit || summary.netProfitAtTarget < 0;

  return (
    <View style={styles.darkCard}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.badgeSim}>
          <Ionicons name="analytics" size={13} color="#9fe870" />
          <Text style={styles.badgeSimText}>FINANCIAL SIMULATOR</Text>
        </View>
        <Text style={styles.cardHeaderMeta}>TG-PTR-PRICING-01</Text>
      </View>

      <Text style={styles.cardTitle}>MÔ PHỎNG TÀI CHÍNH & HÒA VỐN</Text>
      <Text style={styles.cardSub}>
        Kéo chỉnh quy mô kỳ vọng, biên lợi nhuận và giá vé để hệ thống cân đối tài chính thời gian thực.
      </Text>

      {/* KPI Dashboard */}
      <View style={styles.kpiRow}>
        {/* KPI 1: Break-even Pax */}
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>ĐIỂM HÒA VỐN</Text>
          <View style={styles.kpiValRow}>
            <Text
              style={[
                styles.kpiValue,
                { color: isBreakEvenSafe ? "#9fe870" : "#ffd11a" },
              ]}
            >
              {breakEven > maxPax ? ">" + maxPax : breakEven}
            </Text>
            <Text style={styles.kpiUnit}>khách</Text>
          </View>
          <Text style={styles.kpiHint}>
            {breakEven <= minPax
              ? "✓ Đạt hòa vốn từ minPax"
              : breakEven <= targetPax
              ? `Hòa vốn ở mức ${breakEven} pax`
              : "⚠️ Cần tăng giá để hòa vốn"}
          </Text>
        </View>

        {/* KPI 2: Suggested Price */}
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>GIÁ ĐỀ XUẤT HỆ THỐNG</Text>
          <View style={styles.kpiValRow}>
            <Text style={[styles.kpiValue, { color: "#ffffff" }]}>
              {(summary.suggestedPrice / 1000).toLocaleString("vi-VN")}K
            </Text>
            <Text style={styles.kpiUnit}>đ / pax</Text>
          </View>
          <TouchableOpacity onPress={handleApplySuggestedPrice}>
            <Text style={styles.kpiAction}>Áp dụng giá này</Text>
          </TouchableOpacity>
        </View>

        {/* KPI 3: Expected Profit */}
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>LỢI NHUẬN DỰ KIẾN</Text>
          <View style={styles.kpiValRow}>
            <Text
              style={[
                styles.kpiValue,
                { color: isLoss ? "#d03238" : "#9fe870" },
              ]}
            >
              {isLoss ? "-" : "+"}
              {(Math.abs(summary.netProfitAtTarget) / 1000).toLocaleString("vi-VN")}K
            </Text>
          </View>
          <Text style={styles.kpiHint}>
            Margin {summary.marginPctAtTarget}% (tại {targetPax} pax)
          </Text>
        </View>
      </View>

      {/* Warning Deficit Banner if Price is too low */}
      {isLoss && (
        <View style={styles.deficitBanner}>
          <Ionicons name="warning" size={18} color="#d03238" />
          <View style={{ flex: 1 }}>
            <Text style={styles.deficitTitle}>Cảnh báo bù lỗ vận hành!</Text>
            <Text style={styles.deficitText}>
              Giá vé {selectedPrice.toLocaleString("vi-VN")} đ chưa đủ bù đắp chi phí cố định và biến phí.
              Dự kiến bù lỗ{" "}
              {summary.deficitAmount?.toLocaleString("vi-VN")} đ nếu chỉ đạt {targetPax} khách. Vui lòng tăng giá vé hoặc tăng quy mô đoàn.
            </Text>
          </View>
        </View>
      )}

      {/* Control 1: Target Pax */}
      <View style={styles.controlSection}>
        <View style={styles.controlHeader}>
          <Text style={styles.controlLabel}>1. Số khách kỳ vọng (Target Pax)</Text>
          <Text style={styles.controlBadge}>{targetPax} khách (Min: {minPax} - Max: {maxPax})</Text>
        </View>
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => handlePaxChange(-1)}
          >
            <Ionicons name="remove" size={18} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.stepDisplay}>
            <Text style={styles.stepNum}>{targetPax}</Text>
            <Text style={styles.stepSub}>Trekker tham gia</Text>
          </View>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => handlePaxChange(1)}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Control 2: Target Margin */}
      <View style={styles.controlSection}>
        <View style={styles.controlHeader}>
          <Text style={styles.controlLabel}>2. Biên lợi nhuận mong muốn</Text>
          <Text style={styles.controlBadge}>{targetMarginPct}% Margin</Text>
        </View>
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => handleMarginChange(-5)}
          >
            <Ionicons name="remove" size={18} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.stepDisplay}>
            <Text style={styles.stepNum}>{targetMarginPct}%</Text>
            <Text style={styles.stepSub}>Biên an toàn tài chính</Text>
          </View>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => handleMarginChange(5)}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Control 3: Selected Price */}
      <View style={styles.controlSection}>
        <View style={styles.controlHeader}>
          <Text style={styles.controlLabel}>3. Giá vé thu mỗi khách (Selected Price)</Text>
          <Text style={[styles.controlBadge, { backgroundColor: "#163300", color: "#9fe870" }]}>
            {selectedPrice.toLocaleString("vi-VN")} đ
          </Text>
        </View>
        <View style={styles.priceRow}>
          <TouchableOpacity
            style={styles.priceDeltaBtn}
            onPress={() => handlePriceChange(-50000)}
          >
            <Text style={styles.priceDeltaText}>-50K</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.priceInputBox}
            value={String(selectedPrice)}
            onChangeText={(v) => {
              const num = parseInt(v.replace(/[^0-9]/g, ""), 10) || 0;
              setSelectedPrice(num);
              setConfirmedSuccess(false);
            }}
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={styles.priceDeltaBtn}
            onPress={() => handlePriceChange(50000)}
          >
            <Text style={styles.priceDeltaText}>+50K</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirm Price Button */}
      <View style={styles.confirmWrapper}>
        {confirmedSuccess && (
          <View style={styles.confirmedBadge}>
            <Ionicons name="checkmark-done-circle" size={16} color="#054d28" />
            <Text style={styles.confirmedBadgeText}>
              ĐÃ CHỐT CẤU TRÚC GIÁ VÉ: {selectedPrice.toLocaleString("vi-VN")} Đ/PAX
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.confirmBtn, isConfirming && styles.btnDisabled]}
          onPress={handleConfirmPricing}
          disabled={isConfirming}
          activeOpacity={0.88}
        >
          {isConfirming ? (
            <ActivityIndicator size="small" color="#0e0f0c" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={17} color="#0e0f0c" />
              <Text style={styles.confirmBtnText}>
                {confirmedSuccess ? "CẬP NHẬT & CHỐT LẠI GIÁ VÉ" : "CHỐT & ÁP DỤNG GIÁ VÉ NÀY"}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.confirmHint}>
          Khi bấm chốt, Backend sẽ tự động sinh văn bản giải trình tài chính (priceExplanation) và mở khóa xuất bản chuyến đi.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  darkCard: {
    backgroundColor: "#0e0f0c",
    borderRadius: Radius.xl,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1e2617",
    ...Shadows.card,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badgeSim: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#163300",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  badgeSimText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#9fe870",
    letterSpacing: 0.8,
  },
  cardHeaderMeta: {
    fontSize: 10,
    color: "#868685",
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  cardSub: {
    fontSize: 11,
    color: "#c5edab",
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 16,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: "#1b1c19",
    borderRadius: Radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: "#2c3029",
  },
  kpiLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: "#868685",
    letterSpacing: 0.5,
  },
  kpiValRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    marginTop: 4,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: "900",
  },
  kpiUnit: {
    fontSize: 9,
    color: "#868685",
  },
  kpiHint: {
    fontSize: 9,
    color: "#c5edab",
    marginTop: 4,
  },
  kpiAction: {
    fontSize: 9,
    color: "#9fe870",
    fontWeight: "700",
    textDecorationLine: "underline",
    marginTop: 4,
  },
  deficitBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#320707",
    borderWidth: 1,
    borderColor: "#a72027",
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 14,
  },
  deficitTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffc091",
  },
  deficitText: {
    fontSize: 10,
    color: "#f5f4ee",
    marginTop: 2,
    lineHeight: 14,
  },
  controlSection: {
    backgroundColor: "#161814",
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#23291f",
  },
  controlHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  controlLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  controlBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#c5edab",
    backgroundColor: "#222a1e",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: "#2c3326",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDisplay: {
    flex: 1,
    alignItems: "center",
  },
  stepNum: {
    fontSize: 18,
    fontWeight: "900",
    color: "#9fe870",
  },
  stepSub: {
    fontSize: 10,
    color: "#868685",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priceDeltaBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#2c3326",
    borderRadius: Radius.md,
  },
  priceDeltaText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffffff",
  },
  priceInputBox: {
    flex: 1,
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "#333d2e",
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: "900",
    color: "#9fe870",
    textAlign: "center",
  },
  confirmWrapper: {
    marginTop: 8,
  },
  confirmedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#e2f6d5",
    paddingVertical: 8,
    borderRadius: Radius.md,
    marginBottom: 8,
  },
  confirmedBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#054d28",
    letterSpacing: 0.5,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#9fe870",
    paddingVertical: 14,
    borderRadius: Radius.xl,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0e0f0c",
    letterSpacing: 0.5,
  },
  confirmHint: {
    fontSize: 10,
    color: "#868685",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 14,
  },
});
