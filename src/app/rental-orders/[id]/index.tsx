import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,

  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Radius, Shadows } from "@/constants/theme";
import { useAuth } from "@/features/auth/AuthContext";
import { rentalApi } from "@/features/rentals/api";
import {
  RentalDepositStatus,
  RentalHandoverPreview,
  RentalOrderDetail,
  RentalPaymentStatus,
  RentalPickupCode,
} from "@/features/rentals/types";

const ORDER_STEPS = [
  "PENDING_PAYMENT",
  "PAID",
  "PREPARING",
  "READY_FOR_HANDOVER",
  "ACTIVE",
  "RETURN_PENDING",
  "RETURN_PROCESSING",
  "COMPLETED",
];

const STEP_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  PREPARING: "Kho đang chuẩn bị",
  READY_FOR_HANDOVER: "Sẵn sàng bàn giao",
  ACTIVE: "Đang sử dụng",
  RETURN_PENDING: "Chờ thu hồi",
  RETURN_PROCESSING: "Đang xử lý trả",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
  EXPIRED: "Đã hết hạn",
};

const money = (value = 0, currency = "VND") =>
  `${value.toLocaleString("vi-VN")} ${currency === "VND" ? "đ" : currency}`;

const dateTime = (value?: string | null) => {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function RentalOrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { accessToken } = useAuth();
  const [detail, setDetail] = useState<RentalOrderDetail>();
  const [payment, setPayment] = useState<RentalPaymentStatus>();
  const [deposit, setDeposit] = useState<RentalDepositStatus>();
  const [handover, setHandover] = useState<RentalHandoverPreview>();
  const [pickupCode, setPickupCode] = useState<RentalPickupCode>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [codeError, setCodeError] = useState<string>();

  const loadOrder = useCallback(
    async (isRefresh = false) => {
      if (!accessToken || !orderId) {
        setError("Thiếu phiên đăng nhập hoặc mã đơn thuê.");
        setLoading(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(undefined);

      try {
        const orderDetail = await rentalApi.getOrder(orderId, accessToken);
        setDetail(orderDetail);

        const [paymentResult, depositResult, handoverResult] =
          await Promise.allSettled([
            rentalApi.getPaymentStatus(orderId, accessToken),
            rentalApi.getDepositStatus(orderId, accessToken),
            rentalApi.getHandoverPreview(orderId, accessToken),
          ]);

        setPayment(
          paymentResult.status === "fulfilled"
            ? paymentResult.value
            : orderDetail.payment ?? undefined,
        );
        setDeposit(
          depositResult.status === "fulfilled"
            ? depositResult.value
            : orderDetail.deposit ?? undefined,
        );
        setHandover(
          handoverResult.status === "fulfilled"
            ? handoverResult.value
            : undefined,
        );
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Không tải được chi tiết đơn thuê.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, orderId],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadOrder();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadOrder]);

  const currentStep = useMemo(() => {
    if (!detail) return -1;
    return ORDER_STEPS.indexOf(detail.order.status);
  }, [detail]);

  async function revealPickupCode() {
    if (!accessToken || !orderId) return;
    setCodeLoading(true);
    setCodeError(undefined);
    try {
      setPickupCode(await rentalApi.getPickupCode(orderId, accessToken));
    } catch (requestError) {
      setCodeError(
        requestError instanceof Error
          ? requestError.message
          : "Không lấy được mã nhận thiết bị.",
      );
    } finally {
      setCodeLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.primaryDark} />
          <Text style={styles.mutedText}>Đang tải trạng thái đơn thật...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!detail || error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header onBack={() => router.back()} />
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={52} color={Colors.primaryDark} />
          <Text style={styles.emptyTitle}>Chưa tải được đơn thuê</Text>
          <Text style={styles.mutedText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void loadOrder()}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { order, items, assignedUnits = [], timeline = [] } = detail;
  const canShowPickupCode = order.status === "READY_FOR_HANDOVER";

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header onBack={() => router.back()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadOrder(true)}
            tintColor={Colors.primaryDark}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="bag-check-outline" size={24} color={Colors.primaryDark} />
          </View>
          <View style={styles.flexOne}>
            <Text style={styles.eyebrow}>RENTAL ORDER</Text>
            <Text style={styles.orderId}>#{order.id}</Text>
            <Text style={styles.tripName}>
              {order.trip?.title || `Chuyến đi ${order.tripId}`}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
              {STEP_LABELS[order.status] || order.status.replaceAll("_", " ")}
            </Text>
          </View>
        </View>

        {order.exceptionStatus && (
          <InfoBanner
            tone="warning"
            icon="warning-outline"
            title="Đơn cần được xử lý"
            description={order.exceptionStatus}
          />
        )}

        <Section title="Tiến trình đơn thuê" subtitle="Trạng thái do hệ thống và Staff cập nhật">
          {ORDER_STEPS.map((step, index) => {
            const complete = currentStep >= index;
            const active = currentStep === index;
            return (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepRail}>
                  <View
                    style={[
                      styles.stepDot,
                      complete && styles.stepDotComplete,
                      active && styles.stepDotActive,
                    ]}
                  >
                    {complete && (
                      <Ionicons name="checkmark" size={12} color={Colors.onPrimary} />
                    )}
                  </View>
                  {index < ORDER_STEPS.length - 1 && (
                    <View style={[styles.stepLine, complete && styles.stepLineComplete]} />
                  )}
                </View>
                <View style={styles.stepTextWrap}>
                  <Text style={[styles.stepTitle, complete && styles.stepTitleComplete]}>
                    {STEP_LABELS[step]}
                  </Text>
                  {active && <Text style={styles.stepCurrent}>Trạng thái hiện tại</Text>}
                </View>
              </View>
            );
          })}
        </Section>

        <Section title="Thiết bị đã đặt" subtitle="Exact unit chỉ xuất hiện sau khi Kho pick">
          {items.map((item) => (
            <View key={item.id} style={styles.lineItem}>
              <View style={styles.lineIcon}>
                <Ionicons name="cube-outline" size={18} color={Colors.primaryDark} />
              </View>
              <View style={styles.flexOne}>
                <Text style={styles.lineName}>
                  {item.name || item.product?.name || `Thiết bị ${item.productId}`}
                </Text>
                <Text style={styles.lineMeta}>Số lượng: {item.quantity}</Text>
              </View>
              <Text style={styles.lineAmount}>
                {money(item.feeAmount, order.currency)}
              </Text>
            </View>
          ))}
          {assignedUnits.length > 0 && (
            <View style={styles.unitWrap}>
              <Text style={styles.subheading}>Thiết bị vật lý đã gán</Text>
              {assignedUnits.map((unit) => (
                <Text key={unit.id} style={styles.unitText}>
                  • {unit.assetCode || unit.unitId || unit.id}
                  {unit.condition ? ` · ${unit.condition}` : ""}
                </Text>
              ))}
            </View>
          )}
        </Section>

        <Section title="Thanh toán" subtitle="Chỉ hiển thị kết quả server xác nhận">
          <MoneyRow label="Phí thuê" value={order.rentalFee} currency={order.currency} />
          <MoneyRow label="Tiền cọc" value={order.totalDeposit} currency={order.currency} />
          <View style={styles.totalDivider} />
          <MoneyRow label="Tổng cộng" value={order.totalAmount} currency={order.currency} strong />
          <Text style={styles.paymentStatus}>
            Trạng thái: {payment?.status || order.financialStatus || "Chưa cập nhật"}
          </Text>
          {order.paymentExpiresAt && (
            <Text style={styles.deadline}>Hạn thanh toán: {dateTime(order.paymentExpiresAt)}</Text>
          )}
        </Section>

        {canShowPickupCode && (
          <Section title="Mã nhận thiết bị" subtitle="Chỉ đưa mã này cho Staff Delivery tại điểm nhận">
            {pickupCode ? (
              <View style={styles.codeBox}>
                <Text style={styles.codeValue}>{pickupCode.pickupCode}</Text>
                <Text style={styles.codeExpiry}>Hết hạn: {dateTime(pickupCode.expiresAt)}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.revealButton}
                disabled={codeLoading}
                onPress={() => void revealPickupCode()}
              >
                {codeLoading ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <>
                    <Ionicons name="eye-outline" size={18} color={Colors.onPrimary} />
                    <Text style={styles.revealText}>Hiển thị mã nhận</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {codeError && <Text style={styles.inlineError}>{codeError}</Text>}
            {handover?.conditionSnapshots?.length ? (
              <Text style={styles.readOnlyNote}>
                Có {handover.conditionSnapshots.length} bản ghi tình trạng trước giao. Bạn kiểm tra trực tiếp và báo Staff nếu có sai lệch.
              </Text>
            ) : null}
          </Section>
        )}

        {deposit && (
          <Section title="Theo dõi tiền cọc" subtitle="Cọc được xử lý riêng theo từng thiết bị">
            <MoneyRow label="Đã thu" value={deposit.collectedAmount} currency={order.currency} />
            <MoneyRow label="Đang giữ" value={deposit.heldAmount} currency={order.currency} />
            <MoneyRow label="Đã hoàn" value={deposit.refundedAmount} currency={order.currency} />
            <MoneyRow label="Khấu trừ" value={deposit.deductionAmount} currency={order.currency} />
            {deposit.items.map((item) => (
              <View key={item.unitId} style={styles.depositItem}>
                <View style={styles.flexOne}>
                  <Text style={styles.lineName}>{item.assetCode || item.unitId}</Text>
                  <Text style={styles.lineMeta}>{item.status.replaceAll("_", " ")}</Text>
                  {item.reason ? <Text style={styles.reasonText}>{item.reason}</Text> : null}
                </View>
                <Text style={styles.lineAmount}>{money(item.amount, order.currency)}</Text>
              </View>
            ))}
          </Section>
        )}

        {timeline.length > 0 && (
          <Section title="Lịch sử cập nhật">
            {timeline.map((event, index) => (
              <View key={event.id || `${event.status}-${index}`} style={styles.historyRow}>
                <Ionicons name="time-outline" size={17} color={Colors.primaryDark} />
                <View style={styles.flexOne}>
                  <Text style={styles.historyTitle}>{event.title || event.status || "Cập nhật đơn"}</Text>
                  {event.description ? <Text style={styles.lineMeta}>{event.description}</Text> : null}
                  <Text style={styles.historyTime}>{dateTime(event.occurredAt || event.createdAt)}</Text>
                </View>
              </View>
            ))}
          </Section>
        )}

        <InfoBanner
          icon="shield-checkmark-outline"
          title="Đúng quyền Trekker"
          description="Bạn chỉ theo dõi và xuất trình mã nhận. Staff chịu trách nhiệm bàn giao, thu hồi, kiểm định; Admin xử lý khấu trừ và hệ thống thực hiện hoàn cọc."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
      </TouchableOpacity>
      <View style={styles.flexOne}>
        <Text style={styles.eyebrow}>TREKGO RENTAL</Text>
        <Text style={styles.headerTitle}>Chi tiết đơn thuê</Text>
      </View>
      <View style={styles.headerButton}>
        <Ionicons name="receipt-outline" size={21} color={Colors.primaryDark} />
      </View>
    </View>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function MoneyRow({
  label,
  value,
  currency,
  strong = false,
}: {
  label: string;
  value?: number;
  currency?: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.moneyRow}>
      <Text style={[styles.moneyLabel, strong && styles.moneyStrong]}>{label}</Text>
      <Text style={[styles.moneyValue, strong && styles.moneyStrong]}>
        {money(value, currency)}
      </Text>
    </View>
  );
}

function InfoBanner({
  icon,
  title,
  description,
  tone = "normal",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  tone?: "normal" | "warning";
}) {
  return (
    <View style={[styles.infoBanner, tone === "warning" && styles.warningBanner]}>
      <Ionicons
        name={icon}
        size={22}
        color={tone === "warning" ? "#A32020" : Colors.primaryDark}
      />
      <View style={styles.flexOne}>
        <Text style={[styles.infoTitle, tone === "warning" && styles.warningText]}>{title}</Text>
        <Text style={styles.infoDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surface },
  flexOne: { flex: 1 },
  header: {
    minHeight: 72,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  eyebrow: { color: Colors.primaryDark, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  headerTitle: { marginTop: 2, color: Colors.onSurface, fontSize: 20, fontWeight: "900" },
  content: { padding: 16, gap: 14, paddingBottom: 48 },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 28 },
  emptyTitle: { color: Colors.onSurface, fontSize: 20, fontWeight: "900", textAlign: "center" },
  mutedText: { color: Colors.onSurfaceVariant, fontSize: 12, lineHeight: 18, textAlign: "center" },
  retryButton: { marginTop: 8, paddingHorizontal: 22, paddingVertical: 12, borderRadius: Radius.full, backgroundColor: Colors.primaryDark },
  retryText: { color: Colors.onPrimaryDark, fontWeight: "900" },
  heroCard: { padding: 16, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: Radius.xl, backgroundColor: Colors.inkDeep, ...Shadows.tactical },
  heroIcon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: Radius.full, backgroundColor: Colors.primary },
  orderId: { marginTop: 3, color: Colors.onPrimaryDark, fontSize: 12, fontWeight: "900" },
  tripName: { marginTop: 4, color: Colors.primaryNeutral, fontSize: 11 },
  statusBadge: { maxWidth: 112, paddingHorizontal: 9, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.primary },
  statusBadgeText: { color: Colors.onPrimary, fontSize: 9, fontWeight: "900", textAlign: "center" },
  section: { padding: 16, borderRadius: Radius.xl, backgroundColor: Colors.surfaceContainerLowest, ...Shadows.card },
  sectionTitle: { color: Colors.onSurface, fontSize: 17, fontWeight: "900" },
  sectionSubtitle: { marginTop: 4, color: Colors.onSurfaceVariant, fontSize: 10, lineHeight: 15 },
  sectionBody: { marginTop: 14 },
  stepRow: { minHeight: 48, flexDirection: "row", gap: 10 },
  stepRail: { width: 22, alignItems: "center" },
  stepDot: { width: 18, height: 18, alignItems: "center", justifyContent: "center", borderRadius: Radius.full, borderWidth: 2, borderColor: Colors.surfaceContainerHighest, backgroundColor: Colors.surfaceContainerLowest },
  stepDotComplete: { borderColor: Colors.primaryDark, backgroundColor: Colors.primaryDark },
  stepDotActive: { borderWidth: 4, borderColor: Colors.primary, backgroundColor: Colors.primaryDark },
  stepLine: { flex: 1, width: 2, backgroundColor: Colors.surfaceContainerHighest },
  stepLineComplete: { backgroundColor: Colors.primaryDark },
  stepTextWrap: { flex: 1, paddingBottom: 12 },
  stepTitle: { color: Colors.onSurfaceMuted, fontSize: 12, fontWeight: "700" },
  stepTitleComplete: { color: Colors.onSurface, fontWeight: "900" },
  stepCurrent: { marginTop: 3, color: Colors.primaryDark, fontSize: 9, fontWeight: "800" },
  lineItem: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainer },
  lineIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryPale },
  lineName: { color: Colors.onSurface, fontSize: 12, fontWeight: "800" },
  lineMeta: { marginTop: 3, color: Colors.onSurfaceVariant, fontSize: 10 },
  lineAmount: { color: Colors.primaryDark, fontSize: 11, fontWeight: "900" },
  unitWrap: { marginTop: 12, padding: 12, borderRadius: Radius.md, backgroundColor: Colors.primaryPale },
  subheading: { marginBottom: 6, color: Colors.primaryDark, fontSize: 10, fontWeight: "900" },
  unitText: { color: Colors.onSurfaceVariant, fontSize: 10, lineHeight: 17 },
  moneyRow: { minHeight: 30, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  moneyLabel: { color: Colors.onSurfaceVariant, fontSize: 11 },
  moneyValue: { color: Colors.onSurface, fontSize: 11, fontWeight: "800" },
  moneyStrong: { color: Colors.primaryDark, fontSize: 14, fontWeight: "900" },
  totalDivider: { height: 1, marginVertical: 8, backgroundColor: Colors.surfaceContainer },
  paymentStatus: { marginTop: 12, color: Colors.onSurface, fontSize: 10, fontWeight: "800" },
  deadline: { marginTop: 4, color: "#A32020", fontSize: 10 },
  codeBox: { padding: 18, alignItems: "center", borderRadius: Radius.lg, backgroundColor: Colors.inkDeep },
  codeValue: { color: Colors.primary, fontSize: 30, fontWeight: "900", letterSpacing: 5 },
  codeExpiry: { marginTop: 6, color: Colors.primaryNeutral, fontSize: 10 },
  revealButton: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: Radius.full, backgroundColor: Colors.primaryDark },
  revealText: { color: Colors.onPrimaryDark, fontWeight: "900" },
  inlineError: { marginTop: 8, color: "#A32020", fontSize: 10, textAlign: "center" },
  readOnlyNote: { marginTop: 10, color: Colors.onSurfaceVariant, fontSize: 10, lineHeight: 16 },
  depositItem: { marginTop: 10, paddingTop: 10, flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: Colors.surfaceContainer },
  reasonText: { marginTop: 3, color: "#A32020", fontSize: 9 },
  historyRow: { paddingVertical: 9, flexDirection: "row", gap: 9, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainer },
  historyTitle: { color: Colors.onSurface, fontSize: 11, fontWeight: "800" },
  historyTime: { marginTop: 3, color: Colors.onSurfaceMuted, fontSize: 9 },
  infoBanner: { padding: 14, flexDirection: "row", gap: 10, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.primaryNeutral, backgroundColor: Colors.primaryPale },
  warningBanner: { borderColor: "#F3AAA7", backgroundColor: "#FFE5E2" },
  infoTitle: { color: Colors.primaryDark, fontSize: 11, fontWeight: "900" },
  warningText: { color: "#A32020" },
  infoDescription: { marginTop: 3, color: Colors.onSurfaceVariant, fontSize: 10, lineHeight: 16 },
});
