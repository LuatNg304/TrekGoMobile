import { Ionicons } from "@expo/vector-icons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import {
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { useApp } from "@/context/AppContext";
import { RentalStatus } from "@/types";

const timeline: {
  status: RentalStatus;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    status: "PAYMENT_CONFIRMED",
    title: "Thanh toán được xác nhận",
    description: "Phí thuê và tiền cọc đã được ghi nhận.",
    icon: "card-outline",
  },
  {
    status: "PREPARING",
    title: "Kho chuẩn bị thiết bị",
    description: "Staff kiểm tra và đóng gói thiết bị.",
    icon: "construct-outline",
  },
  {
    status: "READY_FOR_DELIVERY",
    title: "Sẵn sàng bàn giao",
    description: "Thiết bị được chuyển tới điểm tập trung.",
    icon: "checkmark-circle-outline",
  },
  {
    status: "DELIVERED_AT_PICKUP",
    title: "Đã bàn giao",
    description: "Thiết bị đã được giao cho người thuê.",
    icon: "hand-left-outline",
  },
  {
    status: "IN_USE",
    title: "Đang sử dụng",
    description: "Thiết bị đang được sử dụng trong chuyến.",
    icon: "trail-sign-outline",
  },
  {
    status: "RETURN_PENDING",
    title: "Chờ hoàn trả",
    description: "Yêu cầu trả thiết bị đã được ghi nhận.",
    icon: "return-down-back-outline",
  },
  {
    status: "RETURNED",
    title: "Đã kiểm định",
    description: "Kho đã hoàn tất kiểm tra thiết bị.",
    icon: "clipboard-outline",
  },
  {
    status: "DEPOSIT_REFUNDED",
    title: "Đã hoàn tiền cọc",
    description: "Khoản hoàn cọc đã được xử lý.",
    icon: "wallet-outline",
  },
];

const statusLabels: Record<RentalStatus, string> = {
  PAYMENT_CONFIRMED: "ĐÃ THANH TOÁN",
  PREPARING: "ĐANG SOẠN THIẾT BỊ",
  READY_FOR_DELIVERY: "SẴN SÀNG BÀN GIAO",
  DELIVERED_AT_PICKUP: "ĐÃ BÀN GIAO",
  IN_USE: "ĐANG SỬ DỤNG",
  RETURN_PENDING: "CHỜ KIỂM ĐỊNH",
  RETURNED: "ĐÃ CÓ KẾT QUẢ KIỂM ĐỊNH",
  DEPOSIT_REFUNDED: "ĐÃ HOÀN CỌC",
};

export default function RentalOrderDetailScreen() {
  const router = useRouter();

  const { id } = useLocalSearchParams<{ id: string }>();

  const { rentalOrders, confirmRentalPickup } = useApp();

  const order = rentalOrders.find((current) => current.id === id)!;

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={58} color="#64748B" />

          <Text style={styles.emptyTitle}>Không tìm thấy đơn thuê</Text>

          <Text style={styles.emptyDescription}>
            Đơn này không còn tồn tại trong dữ liệu hiện tại.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentIndex = timeline.findIndex(
    (step) => step.status === order.status,
  );

  function handleConfirmPickup() {
    Alert.alert(
      "Xác nhận nhận thiết bị",
      "Bạn đã kiểm tra và nhận đủ thiết bị?",
      [
        {
          text: "Chưa",
          style: "cancel",
        },
        {
          text: "Đã nhận đủ",
          onPress: () => confirmRentalPickup(order.id),
        },
      ],
    );
  }

  function openReturnRequest() {
    router.push({
      pathname: "/rental-orders/[id]/return",
      params: {
        id: order.id,
      },
    } as unknown as Href);
  }

  function openSettlement() {
    router.push({
      pathname: "/rental-orders/[id]/settlement",
      params: {
        id: order.id,
      },
    } as unknown as Href);
  }

  function renderOrderAction() {
    if (
      order.status === "READY_FOR_DELIVERY" ||
      order.status === "DELIVERED_AT_PICKUP"
    ) {
      return (
        <View style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <View style={styles.actionIcon}>
              <Ionicons name="hand-left-outline" size={23} color="#1B4332" />
            </View>

            <View style={styles.flexOne}>
              <Text style={styles.actionTitle}>Thiết bị đã sẵn sàng</Text>

              <Text style={styles.actionDescription}>
                Kiểm tra số lượng và tình trạng thiết bị trước khi nhận.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleConfirmPickup}
          >
            <Text style={styles.primaryButtonText}>
              Xác nhận đã nhận thiết bị
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (order.status === "IN_USE") {
      return (
        <View style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <View style={styles.actionIcon}>
              <Ionicons
                name="return-down-back-outline"
                size={23}
                color="#1B4332"
              />
            </View>

            <View style={styles.flexOne}>
              <Text style={styles.actionTitle}>Hoàn trả thiết bị</Text>

              <Text style={styles.actionDescription}>
                Gửi yêu cầu trả đồ sau khi kết thúc chuyến đi.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={openReturnRequest}
          >
            <Text style={styles.primaryButtonText}>Yêu cầu trả thiết bị</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (order.status === "RETURN_PENDING") {
      return (
        <View style={styles.pendingCard}>
          <Ionicons name="time-outline" size={25} color="#B45309" />

          <View style={styles.flexOne}>
            <Text style={styles.pendingTitle}>Kho đang kiểm định</Text>

            <Text style={styles.pendingDescription}>
              Kết quả kiểm định và khoản hoàn cọc sẽ được cập nhật tại đây.
            </Text>
          </View>
        </View>
      );
    }

    if (order.status === "RETURNED" || order.status === "DEPOSIT_REFUNDED") {
      return (
        <View style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <View style={styles.actionIcon}>
              <Ionicons name="wallet-outline" size={23} color="#1B4332" />
            </View>

            <View style={styles.flexOne}>
              <Text style={styles.actionTitle}>Kết quả hoàn cọc</Text>

              <Text style={styles.actionDescription}>
                Xem phí khấu trừ và số tiền được hoàn sau kiểm định.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={openSettlement}
          >
            <Text style={styles.primaryButtonText}>Xem kết quả kiểm định</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#17231B" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Chi tiết đơn thuê</Text>

          <Text style={styles.headerSubtitle}>{order.id}</Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="checkmark-circle" size={29} color="#FFFFFF" />
          </View>

          <View style={styles.flexOne}>
            <Text style={styles.heroLabel}>{statusLabels[order.status]}</Text>

            <Text style={styles.heroTitle}>{order.tripName}</Text>

            <Text style={styles.heroDescription}>
              Theo dõi thiết bị và tiền cọc tại đây.
            </Text>
          </View>
        </View>

        {renderOrderAction()}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thiết bị đã thuê</Text>

          <View style={styles.itemsList}>
            {order.items.map(({ item, quantity }) => (
              <View key={item.id} style={styles.itemRow}>
                <Image
                  source={{
                    uri: item.imageUrl,
                  }}
                  style={styles.itemImage}
                />

                <View style={styles.flexOne}>
                  <Text style={styles.itemName}>{item.name}</Text>

                  <Text style={styles.itemMeta}>
                    {item.dailyRate.toLocaleString("vi-VN")}
                    đ/ngày × {quantity}
                  </Text>

                  <Text style={styles.itemDeposit}>
                    Cọc: {(item.deposit * quantity).toLocaleString("vi-VN")}đ
                  </Text>
                </View>

                <View style={styles.quantityBadge}>
                  <Text style={styles.quantityText}>×{quantity}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Tiến trình đơn thuê</Text>

          <Text style={styles.sectionDescription}>
            Trạng thái được cập nhật bởi kho và Staff Delivery.
          </Text>

          <View style={styles.timeline}>
            {timeline.map((step, index) => {
              const completed = index < currentIndex;

              const active = index === currentIndex;

              return (
                <View key={step.status} style={styles.timelineRow}>
                  <View style={styles.timelineIndicator}>
                    <View
                      style={[
                        styles.timelineIcon,
                        completed && styles.timelineIconCompleted,
                        active && styles.timelineIconActive,
                        !completed && !active && styles.timelineIconPending,
                      ]}
                    >
                      <Ionicons
                        name={completed ? "checkmark" : step.icon}
                        size={17}
                        color={completed || active ? "#FFFFFF" : "#94A3B8"}
                      />
                    </View>

                    {index < timeline.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          index < currentIndex && styles.timelineLineCompleted,
                        ]}
                      />
                    )}
                  </View>

                  <View style={styles.timelineContent}>
                    <Text
                      style={[
                        styles.timelineTitle,
                        active && styles.timelineTitleActive,
                      ]}
                    >
                      {step.title}
                    </Text>

                    <Text style={styles.timelineDescription}>
                      {step.description}
                    </Text>

                    {active && (
                      <View style={styles.currentStatusBadge}>
                        <Text style={styles.currentStatusText}>
                          TRẠNG THÁI HIỆN TẠI
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Chi tiết thanh toán</Text>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>
              Tiền thuê ({order.days} ngày)
            </Text>

            <Text style={styles.paymentValue}>
              {order.totalRentalFee.toLocaleString("vi-VN")}đ
            </Text>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Tiền cọc bảo đảm</Text>

            <Text style={styles.paymentValue}>
              {order.totalDeposit.toLocaleString("vi-VN")}đ
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.paymentRow}>
            <Text style={styles.totalLabel}>Tổng đã thanh toán</Text>

            <Text style={styles.totalValue}>
              {order.totalPayment.toLocaleString("vi-VN")}đ
            </Text>
          </View>

          <View style={styles.refundCard}>
            <Ionicons
              name="shield-checkmark-outline"
              size={21}
              color="#1B4332"
            />

            <Text style={styles.refundText}>
              Tiền cọc sẽ được hoàn sau khi kho xác nhận tình trạng thiết bị.
            </Text>
          </View>
        </View>

        <View style={styles.supportCard}>
          <View style={styles.supportIcon}>
            <Ionicons name="headset-outline" size={22} color="#1B4332" />
          </View>

          <View style={styles.flexOne}>
            <Text style={styles.supportTitle}>Cần hỗ trợ đơn thuê?</Text>

            <Text style={styles.supportDescription}>
              Liên hệ TrekGo nếu cần báo sự cố thiết bị.
            </Text>
          </View>

          <TouchableOpacity style={styles.supportButton}>
            <Ionicons name="chatbubble-outline" size={18} color="#1B4332" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7F5",
  },
  flexOne: {
    flex: 1,
  },
  header: {
    minHeight: 66,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8E3",
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#EEF2EE",
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: "#17231B",
    fontSize: 17,
    fontWeight: "900",
  },
  headerSubtitle: {
    marginTop: 2,
    color: "#64748B",
    fontSize: 10,
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    marginBottom: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#1B4332",
  },
  heroIcon: {
    width: 50,
    height: 50,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#2D6A4F",
  },
  heroLabel: {
    color: "#BCE2CA",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  heroTitle: {
    marginTop: 4,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  heroDescription: {
    marginTop: 3,
    color: "#D4E8DB",
    fontSize: 10,
  },
  actionCard: {
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#CAE2D2",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  actionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  actionIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#E7F3EB",
  },
  actionTitle: {
    color: "#17231B",
    fontSize: 14,
    fontWeight: "900",
  },
  actionDescription: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 10,
    lineHeight: 15,
  },
  pendingCard: {
    marginBottom: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderColor: "#F6D69A",
    borderRadius: 18,
    backgroundColor: "#FFF8E8",
  },
  pendingTitle: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "900",
  },
  pendingDescription: {
    marginTop: 3,
    color: "#A16207",
    fontSize: 10,
    lineHeight: 15,
  },
  sectionCard: {
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8E3",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  sectionTitle: {
    color: "#17231B",
    fontSize: 15,
    fontWeight: "900",
  },
  sectionDescription: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 11,
    lineHeight: 17,
  },
  itemsList: {
    marginTop: 12,
    gap: 9,
  },
  itemRow: {
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    backgroundColor: "#F1F5F2",
  },
  itemImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  itemName: {
    color: "#17231B",
    fontSize: 12,
    fontWeight: "800",
  },
  itemMeta: {
    marginTop: 3,
    color: "#2D6A4F",
    fontSize: 10,
    fontWeight: "700",
  },
  itemDeposit: {
    marginTop: 2,
    color: "#64748B",
    fontSize: 9,
  },
  quantityBadge: {
    minWidth: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#DFF4E7",
  },
  quantityText: {
    color: "#1B4332",
    fontSize: 11,
    fontWeight: "900",
  },
  timeline: {
    marginTop: 18,
  },
  timelineRow: {
    minHeight: 76,
    flexDirection: "row",
  },
  timelineIndicator: {
    width: 42,
    alignItems: "center",
  },
  timelineIcon: {
    zIndex: 2,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
  },
  timelineIconCompleted: {
    backgroundColor: "#2D6A4F",
  },
  timelineIconActive: {
    backgroundColor: "#1B4332",
  },
  timelineIconPending: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F1F5F2",
  },
  timelineLine: {
    position: "absolute",
    top: 34,
    bottom: -42,
    width: 2,
    backgroundColor: "#E2E8F0",
  },
  timelineLineCompleted: {
    backgroundColor: "#2D6A4F",
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 18,
  },
  timelineTitle: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "800",
  },
  timelineTitleActive: {
    color: "#1B4332",
    fontWeight: "900",
  },
  timelineDescription: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 10,
    lineHeight: 15,
  },
  currentStatusBadge: {
    alignSelf: "flex-start",
    marginTop: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#DFF4E7",
  },
  currentStatusText: {
    color: "#1B4332",
    fontSize: 8,
    fontWeight: "900",
  },
  paymentRow: {
    marginTop: 11,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  paymentLabel: {
    color: "#64748B",
    fontSize: 12,
  },
  paymentValue: {
    color: "#17231B",
    fontSize: 12,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginVertical: 12,
    backgroundColor: "#E2E8E3",
  },
  totalLabel: {
    color: "#17231B",
    fontSize: 14,
    fontWeight: "900",
  },
  totalValue: {
    color: "#1B4332",
    fontSize: 17,
    fontWeight: "900",
  },
  refundCard: {
    marginTop: 14,
    padding: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    borderRadius: 13,
    backgroundColor: "#E7F3EB",
  },
  refundText: {
    flex: 1,
    color: "#315E42",
    fontSize: 10,
    lineHeight: 16,
  },
  supportCard: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D5E5DA",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  supportIcon: {
    width: 42,
    height: 42,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#E7F3EB",
  },
  supportTitle: {
    color: "#17231B",
    fontSize: 12,
    fontWeight: "900",
  },
  supportDescription: {
    marginTop: 2,
    color: "#64748B",
    fontSize: 10,
    lineHeight: 15,
  },
  supportButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "#DFF4E7",
  },
  primaryButton: {
    minHeight: 50,
    marginTop: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    backgroundColor: "#1B4332",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    marginTop: 14,
    color: "#17231B",
    fontSize: 20,
    fontWeight: "900",
  },
  emptyDescription: {
    marginTop: 8,
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
