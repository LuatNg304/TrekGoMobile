import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { Colors, Radius, Shadows } from "@/constants/theme";
import { useApp } from "@/context/AppContext";

export default function RentalProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { equipment, cart, addToCart, activeTrip } = useApp();

  const product = useMemo(
    () => equipment.find((item) => item.id === id),
    [equipment, id],
  );

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const cartEntry = cart.find((entry) => entry.item.id === product?.id);

  if (!product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="cube-outline"
              size={42}
              color={Colors.onSurfaceMuted}
            />
          </View>

          <Text style={styles.emptyTitle}>Không tìm thấy thiết bị</Text>

          <Text style={styles.emptyDescription}>
            Sản phẩm có thể đã được cập nhật hoặc tạm ngừng cho thuê.
          </Text>

          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color={Colors.onPrimary} />

            <Text style={styles.emptyButtonText}>Quay lại danh mục</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const rentalDays = activeTrip.durationDays || 1;
  const rentalFee = product.dailyRate * quantity * rentalDays;
  const depositFee = product.deposit * quantity;
  const estimatedTotal = rentalFee + depositFee;

  function decreaseQuantity() {
    setAdded(false);
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increaseQuantity() {
    if (!product) {
      return;
    }

    setAdded(false);
    setQuantity((current) => Math.min(product.stock, current + 1));
  }

  function handleAddToCart() {
    if (!product) {
      return;
    }

    addToCart(product, quantity);
    setAdded(true);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.headerEyebrow}>TREKGO RENTAL</Text>

          <Text style={styles.headerTitle}>Chi tiết thiết bị</Text>
        </View>

        <View style={styles.cartButton}>
          <Ionicons name="bag-outline" size={20} color={Colors.onSurface} />

          {cart.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>
                {cart.reduce((sum, entry) => sum + entry.quantity, 0)}
              </Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.heroCard}>
          <Image source={{ uri: product.imageUrl }} style={styles.heroImage} />

          <View style={styles.heroOverlay} />

          <View style={styles.stockBadge}>
            <View style={styles.stockDot} />

            <Text style={styles.stockBadgeText}>
              Còn {product.stock} thiết bị
            </Text>
          </View>

          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={13} color={Colors.warning} />

            <Text style={styles.ratingBadgeText}>
              {product.rating.toFixed(1)}
            </Text>
          </View>

          <View style={styles.heroBottom}>
            <Text style={styles.category}>{product.category}</Text>

            <Text style={styles.productName}>{product.name}</Text>
          </View>
        </View>

        <View style={styles.tripContext}>
          <View style={styles.tripContextIcon}>
            <Ionicons name="compass" size={20} color={Colors.primaryDark} />
          </View>

          <View style={styles.tripContextBody}>
            <Text style={styles.tripContextLabel}>THUÊ GẮN VỚI CHUYẾN ĐI</Text>

            <Text style={styles.tripContextName}>{activeTrip.name}</Text>

            <Text style={styles.tripContextMeta}>
              {activeTrip.startDate} · {rentalDays} ngày
            </Text>
          </View>

          <Ionicons
            name="shield-checkmark"
            size={20}
            color={Colors.primaryDark}
          />
        </View>

        <View style={styles.priceCard}>
          <View>
            <Text style={styles.priceLabel}>GIÁ THUÊ</Text>

            <Text style={styles.dailyPrice}>
              {product.dailyRate.toLocaleString("vi-VN")} đ
              <Text style={styles.perDay}> / ngày</Text>
            </Text>
          </View>

          <View style={styles.depositBox}>
            <Text style={styles.depositLabel}>Tiền cọc</Text>

            <Text style={styles.depositValue}>
              {product.deposit.toLocaleString("vi-VN")} đ
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Giới thiệu thiết bị</Text>

          <Text style={styles.description}>{product.description}</Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionTitle}>Thông số nổi bật</Text>

            <View style={styles.verifiedPill}>
              <Ionicons
                name="checkmark-circle"
                size={13}
                color={Colors.primaryDark}
              />

              <Text style={styles.verifiedText}>Đã kiểm định</Text>
            </View>
          </View>

          <View style={styles.specList}>
            {product.specs.map((spec) => (
              <View key={spec} style={styles.specRow}>
                <View style={styles.specIcon}>
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color={Colors.primaryDark}
                  />
                </View>

                <Text style={styles.specText}>{spec}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeadingRow}>
            <View>
              <Text style={styles.sectionTitle}>Số lượng thuê</Text>

              <Text style={styles.quantityHint}>
                Tối đa {product.stock} thiết bị
              </Text>
            </View>

            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={decreaseQuantity}
                disabled={quantity === 1}
              >
                <Ionicons
                  name="remove"
                  size={18}
                  color={
                    quantity === 1 ? Colors.onSurfaceMuted : Colors.onSurface
                  }
                />
              </TouchableOpacity>

              <Text style={styles.quantityValue}>{quantity}</Text>

              <TouchableOpacity
                style={styles.quantityButton}
                onPress={increaseQuantity}
                disabled={quantity === product.stock}
              >
                <Ionicons
                  name="add"
                  size={18}
                  color={
                    quantity === product.stock
                      ? Colors.onSurfaceMuted
                      : Colors.onSurface
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Tạm tính cho chuyến đi</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tiền thuê</Text>

            <Text style={styles.summaryValue}>
              {product.dailyRate.toLocaleString("vi-VN")} đ{" × "}
              {quantity}
              {" × "}
              {rentalDays} ngày
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Thành tiền thuê</Text>

            <Text style={styles.summaryValue}>
              {rentalFee.toLocaleString("vi-VN")} đ
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Cọc hoàn lại</Text>

            <Text style={styles.summaryValue}>
              {depositFee.toLocaleString("vi-VN")} đ
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Tổng tạm tính</Text>

            <Text style={styles.totalValue}>
              {estimatedTotal.toLocaleString("vi-VN")} đ
            </Text>
          </View>

          <View style={styles.refundNotice}>
            <Ionicons
              name="information-circle"
              size={18}
              color={Colors.primaryDark}
            />

            <Text style={styles.refundText}>
              Tiền cọc được hoàn lại sau khi Staff Inventory kiểm tra và xác
              nhận thiết bị đã được bàn giao đúng tình trạng.
            </Text>
          </View>
        </View>

        {cartEntry && (
          <View style={styles.currentCartNotice}>
            <Ionicons name="bag-check" size={18} color={Colors.primaryDark} />

            <Text style={styles.currentCartText}>
              Sản phẩm này đang có {cartEntry.quantity} món trong giỏ thuê.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomPriceLabel}>Tổng dự kiến</Text>

          <Text style={styles.bottomPriceValue}>
            {estimatedTotal.toLocaleString("vi-VN")} đ
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addButton, added && styles.addButtonSuccess]}
          onPress={handleAddToCart}
          activeOpacity={0.85}
        >
          <Ionicons
            name={added ? "checkmark-circle" : "bag-add"}
            size={20}
            color={Colors.onPrimary}
          />

          <Text style={styles.addButtonText}>
            {added ? "Đã thêm vào giỏ" : "Thêm vào giỏ thuê"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceContainerLow,
  },
  headerText: {
    flex: 1,
  },
  headerEyebrow: {
    fontSize: 9,
    fontWeight: "900",
    color: Colors.primaryDark,
    letterSpacing: 0.8,
  },
  headerTitle: {
    marginTop: 1,
    fontSize: 17,
    fontWeight: "900",
    color: Colors.onSurface,
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceContainerLow,
  },
  cartBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.error,
  },
  cartBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#ffffff",
  },
  content: {
    padding: 16,
    paddingBottom: 130,
    gap: 14,
  },
  heroCard: {
    height: 310,
    overflow: "hidden",
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerHigh,
    ...Shadows.hover,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(8, 28, 21, 0.34)",
  },
  stockBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
  },
  stockDot: {
    width: 7,
    height: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  ratingBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: "rgba(14, 15, 12, 0.82)",
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#ffffff",
  },
  heroBottom: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
  category: {
    alignSelf: "flex-start",
    marginBottom: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    overflow: "hidden",
    backgroundColor: Colors.primaryContainer,
    fontSize: 9,
    fontWeight: "900",
    color: Colors.onPrimaryContainer,
    textTransform: "uppercase",
  },
  productName: {
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 28,
    color: "#ffffff",
  },
  tripContext: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryPale,
    borderWidth: 1,
    borderColor: Colors.primaryNeutral,
  },
  tripContextIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceContainerLowest,
  },
  tripContextBody: {
    flex: 1,
  },
  tripContextLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: Colors.primaryDark,
    letterSpacing: 0.5,
  },
  tripContextName: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "900",
    color: Colors.onSurface,
  },
  tripContextMeta: {
    marginTop: 2,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  priceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  priceLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  dailyPrice: {
    marginTop: 3,
    fontSize: 22,
    fontWeight: "900",
    color: Colors.primaryDark,
  },
  perDay: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.onSurfaceVariant,
  },
  depositBox: {
    alignItems: "flex-end",
  },
  depositLabel: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  depositValue: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  sectionCard: {
    padding: 16,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: Colors.onSurface,
  },
  description: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.onSurfaceVariant,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryContainer,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.onSecondaryContainer,
  },
  specList: {
    marginTop: 12,
    gap: 9,
  },
  specRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  specIcon: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryPale,
  },
  specText: {
    flex: 1,
    fontSize: 12,
    color: Colors.onSurface,
  },
  quantityHint: {
    marginTop: 3,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  quantityButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceContainerLow,
  },
  quantityValue: {
    minWidth: 22,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "900",
    color: Colors.onSurface,
  },
  summaryCard: {
    padding: 16,
    borderRadius: Radius.lg,
    backgroundColor: Colors.inverseSurface,
    ...Shadows.hover,
  },
  summaryTitle: {
    marginBottom: 12,
    fontSize: 15,
    fontWeight: "900",
    color: Colors.inverseOnSurface,
  },
  summaryRow: {
    marginBottom: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.mute,
  },
  summaryValue: {
    flexShrink: 1,
    textAlign: "right",
    fontSize: 11,
    fontWeight: "700",
    color: Colors.inverseOnSurface,
  },
  divider: {
    height: 1,
    marginVertical: 8,
    backgroundColor: "#4a4b46",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.inverseOnSurface,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.primary,
  },
  refundNotice: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: Radius.md,
    backgroundColor: "rgba(159, 232, 112, 0.12)",
  },
  refundText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: Colors.inverseOnSurface,
  },
  currentCartNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.secondaryContainer,
  },
  currentCartText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: Colors.onSecondaryContainer,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainer,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  bottomPrice: {
    flex: 1,
  },
  bottomPriceLabel: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  bottomPriceValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: "900",
    color: Colors.primaryDark,
  },
  addButton: {
    minHeight: 48,
    paddingHorizontal: 17,
    borderRadius: Radius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: Colors.primaryContainer,
    ...Shadows.card,
  },
  addButtonSuccess: {
    backgroundColor: Colors.primaryActive,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: "900",
    color: Colors.onPrimary,
  },
  emptyState: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    width: 84,
    height: 84,
    marginBottom: 16,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceContainerLow,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.onSurface,
  },
  emptyDescription: {
    marginTop: 8,
    marginBottom: 20,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    color: Colors.onSurfaceVariant,
  },
  emptyButton: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: Radius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: Colors.primaryContainer,
  },
  emptyButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: Colors.onPrimary,
  },
});
