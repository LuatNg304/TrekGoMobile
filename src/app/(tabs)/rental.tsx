import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { RentalCartModal } from "@/components/RentalCartModal";
import { TopHeader } from "@/components/TopHeader";
import { Colors, Radius, Shadows } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/features/auth/AuthContext";
import { rentalApi } from "@/features/rentals/api";
import { useRentalSelection } from "@/features/rentals/RentalSelectionContext";
import {
  calculateProductDeposit,
  RentalCategory,
  RentalOrderSummary,
  RentalProduct,
  rentalProductSpecs,
} from "@/features/rentals/types";
import { EquipmentItem } from "@/types";

type RentalView = "CATALOG" | "ORDERS";

const formatMoney = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

function toCartItem(product: RentalProduct): EquipmentItem {
  return {
    id: product.id,
    name: product.name,
    category: "Accessories",
    dailyRate: product.dailyPrice,
    deposit: calculateProductDeposit(product),
    stock: 99,
    imageUrl: product.imageUrl ?? "",
    specs: rentalProductSpecs(product),
    description: product.description ?? "",
    rating: 0,
  };
}

export default function RentalScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { cart, setCartQuantity } = useApp();
  const { selectedTrip } = useRentalSelection();
  const [view, setView] = useState<RentalView>("CATALOG");
  const [categories, setCategories] = useState<RentalCategory[]>([]);
  const [products, setProducts] = useState<RentalProduct[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>();
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>();
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const [orders, setOrders] = useState<RentalOrderSummary[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersRefreshing, setOrdersRefreshing] = useState(false);
  const [ordersError, setOrdersError] = useState<string>();

  const cartTotalItems = useMemo(
    () => cart.reduce((sum, current) => sum + current.quantity, 0),
    [cart],
  );

  const loadCatalog = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(undefined);

    try {
      const [categoryResult, productResult] = await Promise.all([
        rentalApi.listCategories(),
        rentalApi.listProducts({ search, categoryId: selectedCategoryId }),
      ]);
      setCategories(categoryResult.items);
      setProducts(productResult.items);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không tải được danh mục thiết bị.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedCategoryId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCatalog();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadCatalog]);

  function submitSearch() {
    setSearch(searchDraft.trim());
  }

  const loadOrders = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) {
        setOrders([]);
        setOrdersError("Phiên đăng nhập không hợp lệ.");
        return;
      }

      if (isRefresh) setOrdersRefreshing(true);
      else setOrdersLoading(true);
      setOrdersError(undefined);

      try {
        const result = await rentalApi.listOrders(accessToken, {
          page: 1,
          pageSize: 50,
        });
        setOrders(result.items);
      } catch (requestError) {
        setOrdersError(
          requestError instanceof Error
            ? requestError.message
            : "Không tải được đơn thuê.",
        );
      } finally {
        setOrdersLoading(false);
        setOrdersRefreshing(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    if (view !== "ORDERS") return;

    const timer = setTimeout(() => {
      void loadOrders();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadOrders, view]);

  function renderOrders() {
    if (ordersLoading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.primaryDark} />
          <Text style={styles.stateDescription}>Đang tải đơn thuê thật...</Text>
        </View>
      );
    }

    if (ordersError) {
      return (
        <StateCard
          icon="cloud-offline-outline"
          title="Chưa tải được đơn thuê"
          description={ordersError}
          actionLabel="Thử lại"
          onAction={() => void loadOrders()}
        />
      );
    }

    if (orders.length === 0) {
      return (
        <StateCard
          icon="receipt-outline"
          title="Chưa có đơn thuê"
          description="Sau khi chọn chuyến, kiểm tra tồn kho và tạo đơn thành công, đơn thật sẽ xuất hiện tại đây."
          actionLabel="Chọn thiết bị"
          onAction={() => setView("CATALOG")}
        />
      );
    }

    return (
      <View style={styles.ordersList}>
        {orders.map((order) => {
          const status = rentalOrderStatus(order.status);
          return (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              activeOpacity={0.85}
              onPress={() => router.push(`/rental-orders/${order.id}` as Href)}
            >
              <View style={styles.orderTopRow}>
                <View style={styles.orderIcon}>
                  <Ionicons
                    name="bag-check-outline"
                    size={20}
                    color={Colors.primaryDark}
                  />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.orderCode}>ĐƠN #{shortId(order.id)}</Text>
                  <Text style={styles.orderTrip} numberOfLines={1}>
                    {order.trip?.title || `Trip ${shortId(order.tripId)}`}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>
                    {status.label}
                  </Text>
                </View>
              </View>

              <View style={styles.orderDivider} />

              <View style={styles.orderBottomRow}>
                <View>
                  <Text style={styles.orderMetaLabel}>Tổng thanh toán</Text>
                  <Text style={styles.orderAmount}>
                    {formatCurrency(order.totalAmount, order.currency)}
                  </Text>
                </View>
                <View style={styles.orderOpen}>
                  <Text style={styles.orderOpenText}>Chi tiết</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={Colors.primaryDark}
                  />
                </View>
              </View>

              {order.exceptionStatus && (
                <Text style={styles.exceptionText}>
                  Cần chú ý: {order.exceptionStatus}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function renderCatalog() {
    return (
      <>
        <View style={styles.contextBanner}>
          <View style={styles.contextIcon}>
            <Ionicons name="bag-handle" size={20} color={Colors.primaryDark} />
          </View>

          <View style={styles.flexOne}>
            <Text style={styles.contextTitle}>THUÊ ĐỒ THEO CHUYẾN ĐI</Text>
            <Text style={styles.contextDescription}>
              Xem thiết bị trước. Chuyến đi chỉ bắt buộc khi kiểm tra tồn kho và
              tạo báo giá.
            </Text>
            {selectedTrip && (
              <Text style={styles.selectedTripText} numberOfLines={1}>
                Đã chọn: {selectedTrip.title}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={Colors.onSurfaceMuted} />
            <TextInput
              value={searchDraft}
              onChangeText={setSearchDraft}
              onSubmitEditing={submitSearch}
              placeholder="Tìm lều, balo, gậy trekking..."
              placeholderTextColor={Colors.onSurfaceMuted}
              returnKeyType="search"
              style={styles.searchInput}
            />
            {searchDraft.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchDraft("");
                  setSearch("");
                }}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={Colors.onSurfaceMuted}
                />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.searchButton} onPress={submitSearch}>
            <Ionicons name="arrow-forward" size={19} color={Colors.onPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          <CategoryPill
            label="Tất cả"
            active={!selectedCategoryId}
            onPress={() => setSelectedCategoryId(undefined)}
          />
          {categories.map((category) => (
            <CategoryPill
              key={category.id}
              label={category.name}
              active={selectedCategoryId === category.id}
              onPress={() => setSelectedCategoryId(category.id)}
            />
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={Colors.primaryDark} />
            <Text style={styles.stateDescription}>Đang tải thiết bị thật...</Text>
          </View>
        ) : error ? (
          <StateCard
            icon="cloud-offline-outline"
            title="Chưa tải được thiết bị"
            description={error}
            actionLabel="Thử lại"
            onAction={() => void loadCatalog()}
          />
        ) : products.length === 0 ? (
          <StateCard
            icon="search-outline"
            title="Không tìm thấy thiết bị"
            description="Thử đổi từ khóa hoặc chọn danh mục khác."
          />
        ) : (
          <View style={styles.productsGrid}>
            {products.map((product) => {
              const cartEntry = cart.find(
                (entry) => entry.item.id === product.id,
              );
              const deposit = calculateProductDeposit(product);

              return (
                <View key={product.id} style={styles.productCard}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push(`/rental-products/${product.id}` as Href)
                    }
                  >
                    <View style={styles.imageBox}>
                      {product.imageUrl ? (
                        <Image
                          source={{ uri: product.imageUrl }}
                          style={styles.productImage}
                        />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <Ionicons
                            name="cube-outline"
                            size={38}
                            color={Colors.primaryDark}
                          />
                          <Text style={styles.imagePlaceholderText}>
                            Ảnh thiết bị đang cập nhật
                          </Text>
                        </View>
                      )}
                      <View style={styles.availabilityBadge}>
                        <Ionicons
                          name="trail-sign-outline"
                          size={12}
                          color={Colors.primaryDark}
                        />
                        <Text style={styles.availabilityText}>
                          Kiểm tra theo chuyến
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.productBody}>
                    <Text style={styles.categoryTag}>{product.category.name}</Text>
                    <Text style={styles.productTitle} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <Text style={styles.skuText}>SKU: {product.sku}</Text>
                    <Text style={styles.dailyPrice}>
                      {formatMoney(product.dailyPrice)}{" "}
                      <Text style={styles.perDay}>/ngày</Text>
                    </Text>
                    <Text style={styles.depositPrice}>
                      Cọc dự kiến: {formatMoney(deposit)}
                    </Text>

                    {cartEntry ? (
                      <View style={styles.quantityControl}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          accessibilityLabel="Giảm số lượng"
                          onPress={() =>
                            setCartQuantity(
                              toCartItem(product),
                              cartEntry.quantity - 1,
                            )
                          }
                        >
                          <Ionicons
                            name="remove"
                            size={17}
                            color={Colors.onPrimary}
                          />
                        </TouchableOpacity>
                        <Text style={styles.quantityValue}>
                          {cartEntry.quantity}
                        </Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          accessibilityLabel="Tăng số lượng"
                          disabled={cartEntry.quantity >= 20}
                          onPress={() =>
                            setCartQuantity(
                              toCartItem(product),
                              Math.min(20, cartEntry.quantity + 1),
                            )
                          }
                        >
                          <Ionicons
                            name="add"
                            size={17}
                            color={Colors.onPrimary}
                          />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => setCartQuantity(toCartItem(product), 1)}
                      >
                        <Ionicons
                          name="add"
                          size={17}
                          color={Colors.onPrimary}
                        />
                        <Text style={styles.addButtonText}>Chọn thuê</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopHeader subtitle="Rental" />

      <View style={styles.switcherWrap}>
        <View style={styles.switcher}>
          <ViewButton
            active={view === "CATALOG"}
            icon="grid-outline"
            label="Danh mục"
            onPress={() => setView("CATALOG")}
          />
          <ViewButton
            active={view === "ORDERS"}
            icon="receipt-outline"
            label="Đơn thuê"
            onPress={() => setView("ORDERS")}
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          view === "CATALOG" ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadCatalog(true)}
              tintColor={Colors.primaryDark}
            />
          ) : (
            <RefreshControl
              refreshing={ordersRefreshing}
              onRefresh={() => void loadOrders(true)}
              tintColor={Colors.primaryDark}
            />
          )
        }
        contentContainerStyle={styles.scrollContent}
      >
        {view === "CATALOG" ? renderCatalog() : renderOrders()}
      </ScrollView>

      {view === "CATALOG" && cartTotalItems > 0 && (
        <View style={styles.floatingCart}>
          <View style={styles.cartCount}>
            <Text style={styles.cartCountText}>{cartTotalItems}</Text>
          </View>
          <View style={styles.flexOne}>
            <Text style={styles.cartTitle}>{cartTotalItems} thiết bị đã chọn</Text>
            <Text style={styles.cartSubtitle}>
              Chọn chuyến trước khi kiểm tra tồn kho
            </Text>
          </View>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => setCartModalVisible(true)}
          >
            <Text style={styles.cartButtonText}>Xem giỏ</Text>
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

function shortId(value: string) {
  return value.length > 8 ? value.slice(-8).toUpperCase() : value.toUpperCase();
}

function formatCurrency(value: number, currency = "VND") {
  return `${value.toLocaleString("vi-VN")} ${currency === "VND" ? "đ" : currency}`;
}

function rentalOrderStatus(status: string) {
  const statuses: Record<
    string,
    { label: string; color: string; bg: string }
  > = {
    PENDING_PAYMENT: { label: "Chờ thanh toán", color: "#8A5A00", bg: "#FFF1C2" },
    PAID: { label: "Đã thanh toán", color: "#226600", bg: "#E0F5D3" },
    PREPARING: { label: "Đang chuẩn bị", color: "#245F73", bg: "#DDF3F8" },
    READY_FOR_HANDOVER: { label: "Sẵn sàng nhận", color: "#226600", bg: "#DDF7CB" },
    ACTIVE: { label: "Đang sử dụng", color: "#174B00", bg: "#CFF3B8" },
    RETURN_PENDING: { label: "Chờ thu hồi", color: "#714C00", bg: "#FFF0BF" },
    RETURN_PROCESSING: { label: "Đang xử lý trả", color: "#714C00", bg: "#FFE5A6" },
    COMPLETED: { label: "Hoàn tất", color: "#35523A", bg: "#E5EEE3" },
    CANCELLED: { label: "Đã hủy", color: "#9E1A1A", bg: "#FFE0DE" },
    EXPIRED: { label: "Hết hạn", color: "#6C6460", bg: "#EEEAE7" },
  };

  return (
    statuses[status] ?? {
      label: status.replaceAll("_", " "),
      color: Colors.onSurfaceVariant,
      bg: Colors.surfaceContainer,
    }
  );
}

function CategoryPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.categoryPill, active && styles.categoryPillActive]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.categoryPillText,
          active && styles.categoryPillTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ViewButton({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.viewButton, active && styles.viewButtonActive]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={17}
        color={active ? Colors.onPrimary : Colors.onSurfaceVariant}
      />
      <Text
        style={[styles.viewButtonText, active && styles.viewButtonTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StateCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIcon}>
        <Ionicons name={icon} size={34} color={Colors.primaryDark} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateDescription}>{description}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.stateButton} onPress={onAction}>
          <Text style={styles.stateButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surface },
  flexOne: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  switcherWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  switcher: {
    flexDirection: "row",
    padding: 3,
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
  viewButtonActive: { backgroundColor: Colors.primaryContainer },
  viewButtonText: {
    color: Colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: "700",
  },
  viewButtonTextActive: { color: Colors.onPrimary, fontWeight: "900" },
  contextBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryNeutral,
    backgroundColor: Colors.primaryPale,
  },
  contextIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  contextTitle: {
    color: Colors.primaryDark,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  contextDescription: {
    marginTop: 4,
    color: Colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 17,
  },
  selectedTripText: {
    marginTop: 6,
    color: Colors.onSurface,
    fontSize: 12,
    fontWeight: "800",
  },
  searchRow: {
    marginTop: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 8,
  },
  searchBox: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  searchInput: { flex: 1, color: Colors.onSurface, fontSize: 13 },
  searchButton: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
  },
  categoryScroll: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  categoryPill: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  categoryPillActive: { backgroundColor: Colors.inkDeep },
  categoryPillText: {
    color: Colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: "700",
  },
  categoryPillTextActive: { color: Colors.onPrimaryDark },
  centerState: { paddingVertical: 70, alignItems: "center", gap: 12 },
  ordersList: { paddingHorizontal: 16, paddingTop: 14, gap: 12 },
  orderCard: {
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  orderTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  orderIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryPale,
  },
  orderCode: {
    color: Colors.primaryDark,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  orderTrip: {
    marginTop: 3,
    color: Colors.onSurface,
    fontSize: 13,
    fontWeight: "800",
  },
  statusPill: {
    maxWidth: 118,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  statusText: { fontSize: 9, fontWeight: "900", textAlign: "center" },
  orderDivider: {
    height: 1,
    marginVertical: 12,
    backgroundColor: Colors.surfaceContainer,
  },
  orderBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderMetaLabel: { color: Colors.onSurfaceMuted, fontSize: 9 },
  orderAmount: {
    marginTop: 3,
    color: Colors.onSurface,
    fontSize: 14,
    fontWeight: "900",
  },
  orderOpen: { flexDirection: "row", alignItems: "center", gap: 3 },
  orderOpenText: { color: Colors.primaryDark, fontSize: 11, fontWeight: "900" },
  exceptionText: {
    marginTop: 10,
    color: "#A32020",
    fontSize: 10,
    fontWeight: "700",
  },
  productsGrid: {
    paddingHorizontal: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  productCard: {
    width: "48%",
    overflow: "hidden",
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  imageBox: { height: 145, backgroundColor: Colors.surfaceContainerHigh },
  productImage: { width: "100%", height: "100%" },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: 12,
    backgroundColor: Colors.primaryPale,
  },
  imagePlaceholderText: {
    textAlign: "center",
    color: Colors.onSurfaceVariant,
    fontSize: 10,
  },
  availabilityBadge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255,255,255,0.93)",
  },
  availabilityText: {
    color: Colors.primaryDark,
    fontSize: 8,
    fontWeight: "800",
  },
  productBody: { padding: 12 },
  categoryTag: {
    color: Colors.primaryDark,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  productTitle: {
    minHeight: 38,
    marginTop: 5,
    color: Colors.onSurface,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
  },
  skuText: { marginTop: 3, color: Colors.onSurfaceMuted, fontSize: 9 },
  dailyPrice: {
    marginTop: 9,
    color: Colors.primaryDark,
    fontSize: 15,
    fontWeight: "900",
  },
  perDay: { color: Colors.onSurfaceVariant, fontSize: 10, fontWeight: "500" },
  depositPrice: {
    marginTop: 3,
    color: Colors.onSurfaceVariant,
    fontSize: 9,
  },
  addButton: {
    marginTop: 10,
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
  },
  addButtonText: { color: Colors.onPrimaryDark, fontSize: 11, fontWeight: "900" },
  quantityControl: {
    marginTop: 12,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: Radius.full,
    backgroundColor: Colors.secondary,
  },
  quantityButton: {
    width: 44,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityValue: {
    minWidth: 28,
    color: Colors.onPrimaryDark,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "900",
  },
  stateCard: {
    margin: 16,
    padding: 28,
    alignItems: "center",
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  stateIcon: {
    width: 66,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryPale,
  },
  stateTitle: {
    marginTop: 14,
    textAlign: "center",
    color: Colors.onSurface,
    fontSize: 18,
    fontWeight: "900",
  },
  stateDescription: {
    marginTop: 7,
    textAlign: "center",
    color: Colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 18,
  },
  stateButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
  },
  stateButtonText: { color: Colors.onPrimaryDark, fontWeight: "900" },
  floatingCart: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: Radius.xl,
    backgroundColor: Colors.inkDeep,
    ...Shadows.tactical,
  },
  cartCount: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  cartCountText: { color: Colors.onPrimary, fontWeight: "900" },
  cartTitle: { color: Colors.onPrimaryDark, fontSize: 12, fontWeight: "900" },
  cartSubtitle: { marginTop: 2, color: Colors.primaryNeutral, fontSize: 9 },
  cartButton: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  cartButtonText: { color: Colors.onPrimary, fontSize: 11, fontWeight: "900" },
});
