import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { RentalCartModal } from "@/components/RentalCartModal";
import { TopHeader } from "@/components/TopHeader";
import { Colors, Radius, Shadows } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { EquipmentCategory, RentalStatus } from "@/types";

type RentalView = "CATALOG" | "ORDERS";

const categories: EquipmentCategory[] = [
  "Tất cả",
  "Tent",
  "Backpack",
  "Trekking Pole",
  "Sleeping Bag",
  "Accessories",
];

const categoryLabels: Record<EquipmentCategory, string> = {
  "Tất cả": "Tất cả",
  Tent: "Lều",
  Backpack: "Balo",
  "Trekking Pole": "Gậy",
  "Sleeping Bag": "Túi ngủ",
  Accessories: "Phụ kiện",
};

const statusContent: Record<
  RentalStatus,
  {
    label: string;
    description: string;
    color: string;
    backgroundColor: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  PAYMENT_CONFIRMED: {
    label: "Đã thanh toán",
    description: "Đơn đang chờ kho tiếp nhận",
    color: "#1D4ED8",
    backgroundColor: "#DBEAFE",
    icon: "card-outline",
  },
  PREPARING: {
    label: "Đang chuẩn bị",
    description: "Kho đang soạn thiết bị",
    color: "#7A5700",
    backgroundColor: "#FFF1BF",
    icon: "construct-outline",
  },
  READY_FOR_DELIVERY: {
    label: "Sẵn sàng giao",
    description: "Thiết bị đã được chuẩn bị xong",
    color: "#166534",
    backgroundColor: "#DCFCE7",
    icon: "checkmark-circle-outline",
  },
  DELIVERED_AT_PICKUP: {
    label: "Đã giao tại điểm đón",
    description: "Staff đã bàn giao thiết bị",
    color: "#0F766E",
    backgroundColor: "#CCFBF1",
    icon: "hand-left-outline",
  },
  IN_USE: {
    label: "Đang sử dụng",
    description: "Thiết bị đang gắn với chuyến đi",
    color: "#1B4332",
    backgroundColor: "#DFF4E7",
    icon: "trail-sign-outline",
  },
  RETURN_PENDING: {
    label: "Chờ hoàn trả",
    description: "Trả thiết bị sau chuyến đi",
    color: "#9A3412",
    backgroundColor: "#FFEDD5",
    icon: "return-down-back-outline",
  },
  RETURNED: {
    label: "Đã trả thiết bị",
    description: "Kho đang kiểm tra tình trạng",
    color: "#6B21A8",
    backgroundColor: "#F3E8FF",
    icon: "clipboard-outline",
  },
  DEPOSIT_REFUNDED: {
    label: "Đã hoàn cọc",
    description: "Đơn thuê đã hoàn tất",
    color: "#166534",
    backgroundColor: "#DCFCE7",
    icon: "wallet-outline",
  },
};

export default function RentalScreen() {
  const router = useRouter();

  const { equipment, cart, addToCart, activeTrip, rentalOrders } = useApp();

  const [view, setView] = useState<RentalView>("CATALOG");

  const [selectedCategory, setSelectedCategory] =
    useState<EquipmentCategory>("Tất cả");

  const [cartModalVisible, setCartModalVisible] = useState(false);

  const filteredEquipment = equipment.filter((item) => {
    if (selectedCategory === "Tất cả") {
      return true;
    }

    return item.category === selectedCategory;
  });

  const cartTotalItems = cart.reduce(
    (sum, current) => sum + current.quantity,
    0,
  );

  function openOrder(orderId: string) {
    router.push({
      pathname: "/rental-orders/[id]",
      params: {
        id: orderId,
      },
    } as unknown as Href);
  }

  function renderCatalog() {
    return (
      <>
        <View style={styles.contextBanner}>
          <View style={styles.contextHeader}>
            <Ionicons name="compass" size={16} color={Colors.primaryDark} />

            <Text style={styles.contextTitle}>TRANG BỊ GẮN THEO CHUYẾN ĐI</Text>
          </View>

          <Text style={styles.tripNameText}>{activeTrip.name}</Text>

          <Text style={styles.tripDetailsSub}>
            {activeTrip.startDate} · Giao tại điểm tập trung
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryPill,
                selectedCategory === category && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory(category)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === category &&
                    styles.categoryPillTextActive,
                ]}
              >
                {categoryLabels[category]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.productsGrid}>
          {filteredEquipment.map((item) => {
            const inCart = cart.find((current) => current.item.id === item.id);

            return (
              <View key={item.id} style={styles.productCard}>
                <View style={styles.imageBox}>
                  <Image
                    source={{
                      uri: item.imageUrl,
                    }}
                    style={styles.productImage}
                  />

                  <View style={styles.stockBadge}>
                    <Text style={styles.stockText}>Còn {item.stock}</Text>
                  </View>
                </View>

                <View style={styles.productBody}>
                  <Text style={styles.categoryTag}>
                    {categoryLabels[item.category]}
                  </Text>

                  <Text style={styles.productTitle}>{item.name}</Text>

                  <TouchableOpacity
                    style={styles.detailLink}
                    onPress={() =>
                      router.push(`/rental-products/${item.id}` as Href)
                    }
                  >
                    <Text style={styles.detailLinkText}>
                      Xem chi tiết thiết bị
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={Colors.primaryDark}
                    />
                  </TouchableOpacity>

                  <View style={styles.specsList}>
                    {item.specs.map((specification) => (
                      <Text key={specification} style={styles.specText}>
                        • {specification}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.pricingRow}>
                    <View style={styles.flexOne}>
                      <Text style={styles.dailyPrice}>
                        {item.dailyRate.toLocaleString("vi-VN")}đ{" "}
                        <Text style={styles.perDay}>/ngày</Text>
                      </Text>

                      <Text style={styles.depositPrice}>
                        Cọc: {item.deposit.toLocaleString("vi-VN")}đ
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.addBtn, inCart && styles.addBtnInCart]}
                      onPress={() => addToCart(item, 1)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={inCart ? "checkmark" : "add"}
                        size={18}
                        color={inCart ? "#0C2000" : Colors.onPrimary}
                      />

                      <Text
                        style={[
                          styles.addBtnText,
                          inCart && styles.addBtnTextInCart,
                        ]}
                      >
                        {inCart ? `Đã thêm (${inCart.quantity})` : "Thuê"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </>
    );
  }

  function renderOrders() {
    if (rentalOrders.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="receipt-outline"
              size={36}
              color={Colors.primaryDark}
            />
          </View>

          <Text style={styles.emptyTitle}>Chưa có đơn thuê</Text>

          <Text style={styles.emptyDescription}>
            Những đơn đã thanh toán sẽ xuất hiện tại đây để bạn theo dõi.
          </Text>

          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setView("CATALOG")}
          >
            <Text style={styles.emptyButtonText}>Xem thiết bị</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.ordersContent}>
        <View style={styles.ordersHeader}>
          <View>
            <Text style={styles.ordersTitle}>Đơn thuê của tôi</Text>

            <Text style={styles.ordersDescription}>
              Theo dõi giao, sử dụng và hoàn cọc
            </Text>
          </View>

          <View style={styles.ordersCount}>
            <Text style={styles.ordersCountText}>{rentalOrders.length}</Text>
          </View>
        </View>

        {rentalOrders.map((order) => {
          const status = statusContent[order.status];

          const totalQuantity = order.items.reduce(
            (sum, current) => sum + current.quantity,
            0,
          );

          return (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => openOrder(order.id)}
              activeOpacity={0.8}
            >
              <View style={styles.orderTop}>
                <View>
                  <Text style={styles.orderLabel}>MÃ ĐƠN THUÊ</Text>

                  <Text style={styles.orderId}>{order.id}</Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: status.backgroundColor,
                    },
                  ]}
                >
                  <Ionicons name={status.icon} size={14} color={status.color} />

                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: status.color,
                      },
                    ]}
                  >
                    {status.label}
                  </Text>
                </View>
              </View>

              <Text style={styles.orderTripName}>{order.tripName}</Text>

              <Text style={styles.orderStatusSub}>{status.description}</Text>

              <View style={styles.orderItemsPreview}>
                {order.items.slice(0, 3).map(({ item, quantity }) => (
                  <View key={item.id} style={styles.previewItem}>
                    <Image
                      source={{
                        uri: item.imageUrl,
                      }}
                      style={styles.previewImage}
                    />

                    <View style={styles.flexOne}>
                      <Text style={styles.previewItemName} numberOfLines={1}>
                        {item.name}
                      </Text>

                      <Text style={styles.previewQuantity}>
                        Số lượng: {quantity}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.orderSummary}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryItemLabel}>Thiết bị</Text>

                  <Text style={styles.summaryItemValue}>
                    {totalQuantity} món
                  </Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryItem}>
                  <Text style={styles.summaryItemLabel}>Thời gian</Text>

                  <Text style={styles.summaryItemValue}>{order.days} ngày</Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryItem}>
                  <Text style={styles.summaryItemLabel}>Tổng tiền</Text>

                  <Text style={styles.summaryTotalValue}>
                    {order.totalPayment.toLocaleString("vi-VN")}đ
                  </Text>
                </View>
              </View>

              <View style={styles.detailButton}>
                <Text style={styles.detailButtonText}>
                  Xem chi tiết và tiến trình
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={Colors.primaryDark}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopHeader subtitle="Rental" />

      <View style={styles.viewSwitcherContainer}>
        <View style={styles.viewSwitcher}>
          <TouchableOpacity
            style={[
              styles.viewButton,
              view === "CATALOG" && styles.viewButtonActive,
            ]}
            onPress={() => setView("CATALOG")}
          >
            <Ionicons
              name="grid-outline"
              size={17}
              color={
                view === "CATALOG" ? Colors.onPrimary : Colors.onSurfaceVariant
              }
            />

            <Text
              style={[
                styles.viewButtonText,
                view === "CATALOG" && styles.viewButtonTextActive,
              ]}
            >
              Danh mục
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewButton,
              view === "ORDERS" && styles.viewButtonActive,
            ]}
            onPress={() => setView("ORDERS")}
          >
            <Ionicons
              name="receipt-outline"
              size={17}
              color={
                view === "ORDERS" ? Colors.onPrimary : Colors.onSurfaceVariant
              }
            />

            <Text
              style={[
                styles.viewButtonText,
                view === "ORDERS" && styles.viewButtonTextActive,
              ]}
            >
              Đơn thuê
            </Text>

            {rentalOrders.length > 0 && (
              <View style={styles.orderCountBadge}>
                <Text style={styles.orderCountBadgeText}>
                  {rentalOrders.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {view === "CATALOG" ? renderCatalog() : renderOrders()}
      </ScrollView>

      {view === "CATALOG" && cartTotalItems > 0 && (
        <View style={styles.floatingCartBar}>
          <View style={styles.floatingCartLeft}>
            <View style={styles.cartCountPill}>
              <Text style={styles.cartCountText}>{cartTotalItems}</Text>
            </View>

            <View>
              <Text style={styles.cartBarTitle}>{cartTotalItems} thiết bị</Text>

              <Text style={styles.cartBarSub}>Hoàn cọc sau khi trả đồ</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.cartViewBtn}
            onPress={() => setCartModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.cartViewBtnText}>Xem giỏ</Text>

            <Ionicons name="arrow-forward" size={16} color={Colors.onPrimary} />
          </TouchableOpacity>
        </View>
      )}

      <RentalCartModal
        visible={cartModalVisible}
        onClose={() => setCartModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  viewSwitcherContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  viewSwitcher: {
    padding: 3,
    flexDirection: "row",
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  viewButton: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: Radius.full,
  },
  viewButtonActive: {
    backgroundColor: Colors.primaryContainer,
    ...Shadows.card,
  },
  viewButtonText: {
    color: Colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: "700",
  },
  viewButtonTextActive: {
    color: Colors.onPrimary,
    fontWeight: "900",
  },
  orderCountBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
  },
  orderCountBadgeText: {
    color: Colors.primaryDark,
    fontSize: 9,
    fontWeight: "900",
  },
  contextBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primaryDark,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  contextHeader: {
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contextTitle: {
    color: Colors.primaryDark,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  tripNameText: {
    color: Colors.onSurface,
    fontSize: 16,
    fontWeight: "900",
  },
  tripDetailsSub: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontSize: 11,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  categoryPillActive: {
    backgroundColor: Colors.ink,
  },
  categoryPillText: {
    color: Colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: "700",
  },
  categoryPillTextActive: {
    color: Colors.inverseOnSurface,
  },
  productsGrid: {
    paddingHorizontal: 16,
    gap: 14,
  },
  productCard: {
    overflow: "hidden",
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  imageBox: {
    position: "relative",
    width: "100%",
    height: 150,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  stockBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: "rgba(30, 35, 28, 0.85)",
  },
  stockText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  productBody: {
    padding: 14,
  },
  categoryTag: {
    color: Colors.secondary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  productTitle: {
    marginTop: 2,
    marginBottom: 6,
    color: Colors.onSurface,
    fontSize: 16,
    fontWeight: "900",
  },
  detailLink: {
    alignSelf: "flex-start",
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  detailLinkText: {
    color: Colors.primaryDark,
    fontSize: 11,
    fontWeight: "800",
  },
  specsList: {
    marginBottom: 12,
    gap: 2,
  },
  specText: {
    color: Colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 16,
  },
  pricingRow: {
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerLow,
  },
  dailyPrice: {
    color: Colors.primaryDark,
    fontSize: 16,
    fontWeight: "900",
  },
  perDay: {
    color: Colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: "400",
  },
  depositPrice: {
    marginTop: 1,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
  },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
    ...Shadows.card,
  },
  addBtnInCart: {
    backgroundColor: Colors.secondaryContainer,
  },
  addBtnText: {
    color: Colors.onPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
  addBtnTextInCart: {
    color: "#0C2000",
  },
  ordersContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  ordersHeader: {
    marginBottom: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ordersTitle: {
    color: Colors.onSurface,
    fontSize: 20,
    fontWeight: "900",
  },
  ordersDescription: {
    marginTop: 3,
    color: Colors.onSurfaceVariant,
    fontSize: 11,
  },
  ordersCount: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: Colors.primaryPale,
  },
  ordersCountText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: "900",
  },
  orderCard: {
    padding: 15,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  orderTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  orderLabel: {
    color: Colors.onSurfaceVariant,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  orderId: {
    marginTop: 2,
    color: Colors.onSurface,
    fontSize: 12,
    fontWeight: "900",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: Radius.full,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
  },
  orderTripName: {
    marginTop: 13,
    color: Colors.onSurface,
    fontSize: 16,
    fontWeight: "900",
  },
  orderStatusSub: {
    marginTop: 3,
    color: Colors.onSurfaceVariant,
    fontSize: 11,
  },
  orderItemsPreview: {
    marginTop: 13,
    gap: 8,
  },
  previewItem: {
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
  },
  previewImage: {
    width: 42,
    height: 42,
    borderRadius: 10,
  },
  previewItemName: {
    color: Colors.onSurface,
    fontSize: 11,
    fontWeight: "700",
  },
  previewQuantity: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontSize: 9,
  },
  orderSummary: {
    marginTop: 12,
    paddingVertical: 10,
    flexDirection: "row",
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryItemLabel: {
    color: Colors.onSurfaceVariant,
    fontSize: 9,
  },
  summaryItemValue: {
    marginTop: 3,
    color: Colors.onSurface,
    fontSize: 11,
    fontWeight: "800",
  },
  summaryTotalValue: {
    marginTop: 3,
    color: Colors.primaryDark,
    fontSize: 11,
    fontWeight: "900",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  detailButton: {
    minHeight: 44,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
    borderRadius: Radius.full,
  },
  detailButtonText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
  },
  emptyState: {
    marginHorizontal: 16,
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 44,
    alignItems: "center",
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 35,
    backgroundColor: Colors.primaryPale,
  },
  emptyTitle: {
    color: Colors.onSurface,
    fontSize: 18,
    fontWeight: "900",
  },
  emptyDescription: {
    marginTop: 7,
    color: Colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  emptyButton: {
    minHeight: 44,
    marginTop: 18,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  floatingCartBar: {
    position: "absolute",
    right: 16,
    bottom: 12,
    left: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: Radius.full,
    backgroundColor: Colors.inverseSurface,
    ...Shadows.hover,
  },
  floatingCartLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cartCountPill: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
  },
  cartCountText: {
    color: Colors.onPrimary,
    fontSize: 13,
    fontWeight: "900",
  },
  cartBarTitle: {
    color: Colors.inverseOnSurface,
    fontSize: 12,
    fontWeight: "800",
  },
  cartBarSub: {
    color: Colors.mute,
    fontSize: 9,
  },
  cartViewBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
  },
  cartViewBtnText: {
    color: Colors.onPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
});
