import { Ionicons } from "@expo/vector-icons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { useApp } from "@/context/AppContext";

export default function RentalSettlementScreen() {
  const router = useRouter();

  const { id } = useLocalSearchParams<{ id: string }>();

  const { rentalOrders, rentalSettlements, confirmRentalDepositRefund } =
    useApp();

  const order = rentalOrders.find((current) => current.id === id)!;

  const settlement = id ? rentalSettlements[id] : undefined;

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Không tìm thấy đơn thuê</Text>

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

  const deductionAmount = settlement?.deductionAmount ?? 0;

  const refundAmount =
    settlement?.refundAmount ?? order.totalDeposit - deductionAmount;

  const refunded = order.status === "DEPOSIT_REFUNDED";

  function confirmRefund() {
    Alert.alert(
      "Xác nhận hoàn cọc",
      `Hệ thống sẽ mô phỏng hoàn ${refundAmount.toLocaleString(
        "vi-VN",
      )}đ về phương thức thanh toán ban đầu.`,
      [
        {
          text: "Để sau",
          style: "cancel",
        },
        {
          text: "Xác nhận",
          onPress: () => confirmRentalDepositRefund(order.id),
        },
      ],
    );
  }

  function goToRentalOrders() {
    router.dismissAll();

    router.replace("/(tabs)/rental" as Href);
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
          <Text style={styles.headerTitle}>Kết quả kiểm định</Text>

          <Text style={styles.headerSubtitle}>{order.id}</Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={[styles.heroCard, refunded && styles.heroCardCompleted]}>
          <View style={styles.heroIcon}>
            <Ionicons
              name={refunded ? "checkmark-done" : "clipboard-outline"}
              size={29}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.flexOne}>
            <Text style={styles.heroLabel}>
              {refunded ? "ĐÃ HOÀN TẤT" : "KHO ĐÃ KIỂM ĐỊNH"}
            </Text>

            <Text style={styles.heroTitle}>
              {refunded ? "Tiền cọc đã được hoàn" : "Thiết bị đã được kiểm tra"}
            </Text>

            <Text style={styles.heroDescription}>
              {refunded
                ? "Swimlane thuê thiết bị đã hoàn tất."
                : "Xem chi tiết khoản hoàn và phí khấu trừ."}
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tình trạng thiết bị</Text>

            <View style={styles.passedBadge}>
              <Text style={styles.passedText}>HOẠT ĐỘNG TỐT</Text>
            </View>
          </View>

          {order.items.map(({ item, quantity }) => (
            <View key={item.id} style={styles.inspectionRow}>
              <View style={styles.checkIcon}>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </View>

              <View style={styles.flexOne}>
                <Text style={styles.itemName}>{item.name}</Text>

                <Text style={styles.itemMeta}>
                  Đủ {quantity} thiết bị và phụ kiện · Không hư hỏng
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.cleaningRow}>
            <Ionicons name="sparkles-outline" size={20} color="#B45309" />

            <View style={styles.flexOne}>
              <Text style={styles.cleaningTitle}>Cần vệ sinh chuyên dụng</Text>

              <Text style={styles.cleaningDescription}>
                Thiết bị bám bùn đất sau chuyến trekking.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Đối soát tiền cọc</Text>

          <View style={styles.moneyRow}>
            <Text style={styles.moneyLabel}>Tiền cọc ban đầu</Text>

            <Text style={styles.moneyValue}>
              {order.totalDeposit.toLocaleString("vi-VN")}đ
            </Text>
          </View>

          <View style={styles.moneyRow}>
            <Text style={styles.deductionLabel}>Phí vệ sinh</Text>

            <Text style={styles.deductionValue}>
              -{deductionAmount.toLocaleString("vi-VN")}đ
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.moneyRow}>
            <Text style={styles.refundLabel}>Số tiền được hoàn</Text>

            <Text style={styles.refundValue}>
              {refundAmount.toLocaleString("vi-VN")}đ
            </Text>
          </View>

          <View style={styles.bankCard}>
            <Ionicons name="card-outline" size={22} color="#1B4332" />

            <View style={styles.flexOne}>
              <Text style={styles.bankTitle}>Phương thức nhận hoàn tiền</Text>

              <Text style={styles.bankDescription}>
                Tài khoản thanh toán •••• 1234
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.auditCard}>
          <Text style={styles.auditTitle}>Thông tin xử lý</Text>

          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Yêu cầu trả</Text>

            <Text style={styles.auditValue}>
              {settlement?.requestedAt || "Vừa xong"}
            </Text>
          </View>

          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Phương thức</Text>

            <Text style={styles.auditValue}>
              {settlement?.returnMethod || "Điểm tập trung"}
            </Text>
          </View>

          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Kiểm định</Text>

            <Text style={styles.auditValue}>
              {settlement?.inspectedAt || "Đã hoàn tất"}
            </Text>
          </View>

          {refunded && (
            <View style={styles.auditRow}>
              <Text style={styles.auditLabel}>Hoàn cọc</Text>

              <Text style={styles.auditValue}>
                {settlement?.refundedAt || "Đã hoàn tất"}
              </Text>
            </View>
          )}
        </View>

        {refunded ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={goToRentalOrders}
          >
            <Text style={styles.primaryButtonText}>Về danh sách đơn thuê</Text>

            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={confirmRefund}
          >
            <Text style={styles.primaryButtonText}>Xác nhận nhận hoàn cọc</Text>

            <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
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
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#B45309",
  },
  heroCardCompleted: {
    backgroundColor: "#1B4332",
  },
  heroIcon: {
    width: 50,
    height: 50,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  heroLabel: {
    color: "#FEF3C7",
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
    color: "#FFF7E6",
    fontSize: 10,
  },
  sectionCard: {
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8E3",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: {
    color: "#17231B",
    fontSize: 15,
    fontWeight: "900",
  },
  passedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "#DFF4E7",
  },
  passedText: {
    color: "#1B4332",
    fontSize: 8,
    fontWeight: "900",
  },
  inspectionRow: {
    marginTop: 12,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    backgroundColor: "#F1F5F2",
  },
  checkIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#2D6A4F",
  },
  itemName: {
    color: "#17231B",
    fontSize: 11,
    fontWeight: "800",
  },
  itemMeta: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 9,
  },
  cleaningRow: {
    marginTop: 10,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#F6D69A",
    borderRadius: 14,
    backgroundColor: "#FFF8E8",
  },
  cleaningTitle: {
    color: "#92400E",
    fontSize: 11,
    fontWeight: "900",
  },
  cleaningDescription: {
    marginTop: 3,
    color: "#A16207",
    fontSize: 9,
  },
  moneyRow: {
    marginTop: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },
  moneyLabel: {
    color: "#64748B",
    fontSize: 12,
  },
  moneyValue: {
    color: "#17231B",
    fontSize: 12,
    fontWeight: "800",
  },
  deductionLabel: {
    color: "#B45309",
    fontSize: 12,
  },
  deductionValue: {
    color: "#B45309",
    fontSize: 12,
    fontWeight: "900",
  },
  divider: {
    height: 1,
    marginVertical: 13,
    backgroundColor: "#E2E8E3",
  },
  refundLabel: {
    color: "#17231B",
    fontSize: 14,
    fontWeight: "900",
  },
  refundValue: {
    color: "#1B4332",
    fontSize: 19,
    fontWeight: "900",
  },
  bankCard: {
    marginTop: 15,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    backgroundColor: "#E7F3EB",
  },
  bankTitle: {
    color: "#1B4332",
    fontSize: 11,
    fontWeight: "900",
  },
  bankDescription: {
    marginTop: 3,
    color: "#315E42",
    fontSize: 9,
  },
  auditCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  auditTitle: {
    marginBottom: 4,
    color: "#17231B",
    fontSize: 14,
    fontWeight: "900",
  },
  auditRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },
  auditLabel: {
    color: "#64748B",
    fontSize: 10,
  },
  auditValue: {
    flex: 1,
    color: "#334155",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "right",
  },
  primaryButton: {
    minHeight: 52,
    marginTop: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 26,
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
    color: "#17231B",
    fontSize: 19,
    fontWeight: "900",
  },
});
