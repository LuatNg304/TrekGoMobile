import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors, Radius, Shadows } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/features/auth/AuthContext";
import { rentalApi } from "@/features/rentals/api";
import { useRentalSelection } from "@/features/rentals/RentalSelectionContext";
import {
  RentalAvailability,
  RentalOrderCreated,
  RentalQuote,
} from "@/features/rentals/types";

const money = (value: number, currency = "VND") =>
  `${value.toLocaleString("vi-VN")} ${currency === "VND" ? "đ" : currency}`;

function createIdempotencyKey() {
  return `mobile-rental-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function RentalCheckoutScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { cart, setCartQuantity } = useApp();
  const { selectedTrip } = useRentalSelection();
  const [availability, setAvailability] = useState<
    Record<string, RentalAvailability>
  >({});
  const [quote, setQuote] = useState<RentalQuote>();
  const [createdOrder, setCreatedOrder] = useState<RentalOrderCreated>();
  const [checking, setChecking] = useState(true);
  const [creatingQuote, setCreatingQuote] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [error, setError] = useState<string>();
  const idempotencyKey = useRef(createIdempotencyKey());

  const shortages = useMemo(
    () =>
      cart.filter(({ item, quantity }) => {
        const result = availability[item.id];
        return result && quantity > result.availableCount;
      }),
    [availability, cart],
  );

  const checkAvailability = useCallback(async () => {
    if (!accessToken || !selectedTrip || cart.length === 0) {
      setChecking(false);
      return;
    }

    setChecking(true);
    setError(undefined);
    setQuote(undefined);

    try {
      const eligibility = await rentalApi.getEligibility(
        selectedTrip.id,
        accessToken,
      );

      if (!eligibility.eligible) {
        throw new Error(
          eligibility.reason ||
            "Chuyến đi không còn đủ điều kiện thuê thiết bị.",
        );
      }

      const results = await Promise.all(
        cart.map(({ item }) =>
          rentalApi.getAvailability(
            { tripId: selectedTrip.id, productId: item.id },
            accessToken,
          ),
        ),
      );

      setAvailability(
        Object.fromEntries(results.map((result) => [result.productId, result])),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không kiểm tra được tồn kho cho chuyến đi.",
      );
    } finally {
      setChecking(false);
    }
  }, [accessToken, cart, selectedTrip]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void checkAvailability();
    }, 0);

    return () => clearTimeout(timer);
  }, [checkAvailability]);

  async function createQuote() {
    if (!accessToken || !selectedTrip || shortages.length > 0) return;

    setCreatingQuote(true);
    setError(undefined);

    try {
      const result = await rentalApi.createQuote(
        {
          tripId: selectedTrip.id,
          items: cart.map(({ item, quantity }) => ({
            productId: item.id,
            quantity,
          })),
        },
        accessToken,
      );
      idempotencyKey.current = createIdempotencyKey();
      setQuote(result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không tạo được báo giá thuê.",
      );
    } finally {
      setCreatingQuote(false);
    }
  }

  async function createOrder() {
    if (!accessToken || !quote) return;

    setCreatingOrder(true);
    setError(undefined);

    try {
      const result = await rentalApi.createOrder(
        quote.id,
        idempotencyKey.current,
        accessToken,
      );
      setCreatedOrder(result);
      cart.forEach(({ item }) => setCartQuantity(item, 0));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không tạo được đơn thuê.",
      );
    } finally {
      setCreatingOrder(false);
    }
  }

  if (createdOrder) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={42} color={Colors.primaryDark} />
          </View>
          <Text style={styles.successTitle}>Đã giữ thiết bị</Text>
          <Text style={styles.successDescription}>
            Đơn {createdOrder.order.id} đã được tạo ở trạng thái{" "}
            {createdOrder.order.status}. Thiết bị chỉ được giữ tới hạn thanh
            toán do server quy định.
          </Text>
          <View style={styles.successAmount}>
            <Text style={styles.summaryLabel}>Tổng cần thanh toán</Text>
            <Text style={styles.totalValue}>
              {money(
                createdOrder.order.totalAmount,
                createdOrder.order.currency,
              )}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              router.replace(
                `/rental-orders/${createdOrder.order.id}` as Href,
              )
            }
          >
            <Text style={styles.primaryButtonText}>Theo dõi đơn thuê</Text>
            <Ionicons name="arrow-forward" size={19} color={Colors.onPrimary} />
          </TouchableOpacity>
          <Text style={styles.serverNote}>
            Mobile chỉ hiển thị trạng thái từ server. Bàn giao, nhận trả và kiểm
            định do Staff thực hiện theo đúng quyền.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={21} color={Colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.flexOne}>
          <Text style={styles.eyebrow}>RENTAL CHECKOUT</Text>
          <Text style={styles.headerTitle}>Kiểm tra & báo giá</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons
            name="receipt-outline"
            size={21}
            color={Colors.primaryDark}
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {!accessToken ? (
          <StateCard
            icon="log-in-outline"
            title="Bạn cần đăng nhập"
            description="Đăng nhập lại để kiểm tra điều kiện thuê và tạo đơn."
          />
        ) : !selectedTrip ? (
          <StateCard
            icon="trail-sign-outline"
            title="Chưa chọn chuyến đi"
            description="Rental cần một Trip membership hợp lệ trước khi kiểm tra tồn kho."
            action="Chọn chuyến đi"
            onAction={() => router.replace("/rental-trip-select" as Href)}
          />
        ) : cart.length === 0 ? (
          <StateCard
            icon="bag-outline"
            title="Giỏ thuê đang trống"
            description="Quay lại danh mục và chọn ít nhất một thiết bị."
            action="Về danh mục"
            onAction={() => router.replace("/(tabs)/rental" as Href)}
          />
        ) : (
          <>
            <View style={styles.tripCard}>
              <Ionicons
                name="trail-sign"
                size={22}
                color={Colors.primaryDark}
              />
              <View style={styles.flexOne}>
                <Text style={styles.cardLabel}>CHUYẾN DÙNG ĐỂ THUÊ</Text>
                <Text style={styles.tripTitle}>{selectedTrip.title}</Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Thiết bị</Text>
              {cart.map(({ item, quantity }) => {
                const result = availability[item.id];
                const insufficient = result && quantity > result.availableCount;

                return (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemIcon}>
                      <Ionicons
                        name="cube-outline"
                        size={19}
                        color={Colors.primaryDark}
                      />
                    </View>
                    <View style={styles.flexOne}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemMeta}>Yêu cầu: {quantity}</Text>
                    </View>
                    {checking ? (
                      <ActivityIndicator
                        size="small"
                        color={Colors.primaryDark}
                      />
                    ) : result ? (
                      <Text
                        style={[
                          styles.stockText,
                          insufficient && styles.errorText,
                        ]}
                      >
                        Còn {result.availableCount}
                      </Text>
                    ) : (
                      <Text style={styles.errorText}>Chưa rõ</Text>
                    )}
                  </View>
                );
              })}
            </View>

            {error && (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle" size={20} color={Colors.error} />
                <Text style={styles.errorMessage}>{error}</Text>
              </View>
            )}

            {shortages.length > 0 && (
              <View style={styles.errorCard}>
                <Ionicons name="cube-outline" size={20} color={Colors.error} />
                <Text style={styles.errorMessage}>
                  Số lượng yêu cầu vượt tồn kho. Quay lại giỏ để giảm số lượng
                  rồi kiểm tra lại.
                </Text>
              </View>
            )}

            {!quote ? (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (checking || shortages.length > 0 || creatingQuote) &&
                    styles.disabledButton,
                ]}
                disabled={checking || shortages.length > 0 || creatingQuote}
                onPress={() => void createQuote()}
              >
                {creatingQuote ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>
                      Tạo báo giá thật
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={19}
                      color={Colors.onPrimary}
                    />
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.quoteCard}>
                <Text style={styles.cardLabel}>BÁO GIÁ TỪ SERVER</Text>
                <Text style={styles.quoteTitle}>
                  {quote.chargedDays} ngày thuê
                </Text>
                {quote.items.map((item) => (
                  <SummaryRow
                    key={item.productId}
                    label={`${item.name} × ${item.quantity}`}
                    value={money(item.feeAmount, quote.amounts.currency)}
                  />
                ))}
                <View style={styles.divider} />
                <SummaryRow
                  label="Phí thuê"
                  value={money(quote.amounts.feeAmount, quote.amounts.currency)}
                />
                <SummaryRow
                  label="Tiền cọc"
                  value={money(
                    quote.amounts.depositAmount,
                    quote.amounts.currency,
                  )}
                />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tổng thanh toán</Text>
                  <Text style={styles.totalValue}>
                    {money(quote.amounts.totalAmount, quote.amounts.currency)}
                  </Text>
                </View>
                <Text style={styles.expiryText}>
                  Báo giá hết hạn:{" "}
                  {new Date(quote.expiresAt).toLocaleString("vi-VN")}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    creatingOrder && styles.disabledButton,
                  ]}
                  disabled={creatingOrder}
                  onPress={() => void createOrder()}
                >
                  {creatingOrder ? (
                    <ActivityIndicator color={Colors.onPrimary} />
                  ) : (
                    <>
                      <Ionicons
                        name="lock-closed"
                        size={18}
                        color={Colors.onPrimary}
                      />
                      <Text style={styles.primaryButtonText}>
                        Giữ thiết bị & tạo đơn
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.retryButton}
              disabled={checking}
              onPress={() => void checkAvailability()}
            >
              <Ionicons name="refresh" size={17} color={Colors.primaryDark} />
              <Text style={styles.retryText}>Kiểm tra tồn kho lại</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function StateCard({
  icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.stateCard}>
      <Ionicons name={icon} size={44} color={Colors.primaryDark} />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateDescription}>{description}</Text>
      {action && onAction && (
        <TouchableOpacity style={styles.primaryButton} onPress={onAction}>
          <Text style={styles.primaryButtonText}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surface },
  flexOne: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHighest,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: "#E4F7D8",
  },
  eyebrow: {
    color: Colors.primaryDark,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  headerTitle: { color: Colors.onSurface, fontSize: 25, fontWeight: "900" },
  content: { padding: 18, paddingBottom: 48, gap: 14 },
  tripCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BCE9A5",
    borderRadius: Radius.xl,
    backgroundColor: "#EAF9E1",
  },
  cardLabel: {
    color: Colors.primaryDark,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  tripTitle: {
    marginTop: 3,
    color: Colors.onSurface,
    fontSize: 16,
    fontWeight: "800",
  },
  sectionCard: {
    padding: 16,
    borderRadius: Radius.xl,
    backgroundColor: "#FFFFFF",
    ...Shadows.card,
  },
  sectionTitle: {
    marginBottom: 8,
    color: Colors.onSurface,
    fontSize: 18,
    fontWeight: "900",
  },
  itemRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHighest,
  },
  itemIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: "#EAF9E1",
  },
  itemName: { color: Colors.onSurface, fontSize: 14, fontWeight: "800" },
  itemMeta: { color: Colors.onSurfaceVariant, fontSize: 12 },
  stockText: { color: Colors.primaryDark, fontSize: 13, fontWeight: "800" },
  errorText: { color: Colors.error, fontSize: 13, fontWeight: "800" },
  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F3AAA7",
    borderRadius: Radius.lg,
    backgroundColor: "#FFE6E4",
  },
  errorMessage: {
    flex: 1,
    color: Colors.error,
    fontSize: 13,
    fontWeight: "700",
  },
  primaryButton: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 18,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
  },
  primaryButtonText: {
    color: Colors.onPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
  disabledButton: { opacity: 0.45 },
  quoteCard: {
    gap: 10,
    padding: 18,
    borderRadius: Radius.xl,
    backgroundColor: "#FFFFFF",
    ...Shadows.card,
  },
  quoteTitle: { color: Colors.onSurface, fontSize: 22, fontWeight: "900" },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLabel: { flex: 1, color: Colors.onSurfaceVariant, fontSize: 13 },
  summaryValue: { color: Colors.onSurface, fontSize: 13, fontWeight: "800" },
  divider: { height: 1, backgroundColor: Colors.surfaceContainerHighest },
  totalRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  totalLabel: { color: Colors.onSurface, fontSize: 15, fontWeight: "900" },
  totalValue: { color: Colors.primaryDark, fontSize: 22, fontWeight: "900" },
  expiryText: { color: Colors.onSurfaceVariant, fontSize: 11 },
  retryButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  retryText: { color: Colors.primaryDark, fontSize: 13, fontWeight: "800" },
  stateCard: {
    alignItems: "center",
    gap: 12,
    padding: 28,
    borderRadius: Radius.xl,
    backgroundColor: "#FFFFFF",
    ...Shadows.card,
  },
  stateTitle: { color: Colors.onSurface, fontSize: 22, fontWeight: "900" },
  stateDescription: {
    color: Colors.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  successIcon: {
    width: 86,
    height: 86,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 43,
    backgroundColor: "#DDF7CD",
  },
  successTitle: { color: Colors.onSurface, fontSize: 28, fontWeight: "900" },
  successDescription: {
    color: Colors.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  successAmount: {
    width: "100%",
    alignItems: "center",
    gap: 5,
    padding: 18,
    borderRadius: Radius.xl,
    backgroundColor: "#FFFFFF",
    ...Shadows.card,
  },
  serverNote: {
    color: Colors.onSurfaceMuted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
});
