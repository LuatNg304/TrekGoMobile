import { Ionicons } from "@expo/vector-icons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { useApp } from "@/context/AppContext";

type ReturnMethod = "PICKUP_POINT" | "WAREHOUSE";

const returnMethods: {
  id: ReturnMethod;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    id: "PICKUP_POINT",
    title: "Trả tại điểm tập trung",
    description: "Bàn giao thiết bị cho Staff Delivery sau chuyến đi.",
    icon: "location-outline",
  },
  {
    id: "WAREHOUSE",
    title: "Trả trực tiếp tại kho TrekGo",
    description: "Mang thiết bị tới kho trong khung giờ 08:00–18:00.",
    icon: "business-outline",
  },
];

export default function RentalReturnScreen() {
  const router = useRouter();

  const { id } = useLocalSearchParams<{ id: string }>();

  const { rentalOrders, requestRentalReturn, completeRentalInspection } =
    useApp();

  const order = rentalOrders.find((current) => current.id === id)!;

  const [selectedMethod, setSelectedMethod] =
    useState<ReturnMethod>("PICKUP_POINT");

  const [accepted, setAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);

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

  function submitReturnRequest() {
    if (!accepted) {
      Alert.alert(
        "Chưa xác nhận",
        "Bạn cần xác nhận đã chuẩn bị đầy đủ thiết bị trước khi trả.",
      );

      return;
    }

    const method =
      selectedMethod === "PICKUP_POINT"
        ? "Trả tại điểm tập trung"
        : "Trả trực tiếp tại kho TrekGo";

    setSubmitting(true);

    requestRentalReturn(order.id, method);

    // Demo hành động của Staff Inventory:
    // Sau khi User gửi yêu cầu, hệ thống mô phỏng
    // kho đã nhận và kiểm định thiết bị.
    setTimeout(() => {
      completeRentalInspection(order.id);

      router.replace({
        pathname: "/rental-orders/[id]/settlement",
        params: {
          id: order.id,
        },
      } as unknown as Href);
    }, 1400);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={submitting}
        >
          <Ionicons name="arrow-back" size={22} color="#17231B" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Trả thiết bị</Text>

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
            <Ionicons
              name="return-down-back-outline"
              size={28}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.flexOne}>
            <Text style={styles.heroLabel}>YÊU CẦU HOÀN TRẢ</Text>

            <Text style={styles.heroTitle}>{order.tripName}</Text>

            <Text style={styles.heroDescription}>
              Chọn nơi bàn giao thiết bị để kho tiến hành kiểm định.
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Phương thức hoàn trả</Text>

          <View style={styles.options}>
            {returnMethods.map((method) => {
              const active = selectedMethod === method.id;

              return (
                <TouchableOpacity
                  key={method.id}
                  style={[styles.optionCard, active && styles.optionCardActive]}
                  onPress={() => setSelectedMethod(method.id)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      active && styles.optionIconActive,
                    ]}
                  >
                    <Ionicons
                      name={method.icon}
                      size={22}
                      color={active ? "#FFFFFF" : "#1B4332"}
                    />
                  </View>

                  <View style={styles.flexOne}>
                    <Text
                      style={[
                        styles.optionTitle,
                        active && styles.optionTitleActive,
                      ]}
                    >
                      {method.title}
                    </Text>

                    <Text style={styles.optionDescription}>
                      {method.description}
                    </Text>
                  </View>

                  <Ionicons
                    name={active ? "radio-button-on" : "radio-button-off"}
                    size={22}
                    color={active ? "#1B4332" : "#94A3B8"}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thiết bị cần hoàn trả</Text>

          <View style={styles.itemsList}>
            {order.items.map(({ item, quantity }) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemIcon}>
                  <Ionicons name="cube-outline" size={20} color="#1B4332" />
                </View>

                <View style={styles.flexOne}>
                  <Text style={styles.itemName}>{item.name}</Text>

                  <Text style={styles.itemMeta}>Số lượng: {quantity}</Text>
                </View>

                <Ionicons name="checkmark-circle" size={21} color="#2D6A4F" />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.noticeCard}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color="#B45309"
          />

          <Text style={styles.noticeText}>
            Kho sẽ kiểm tra số lượng, tình trạng, vệ sinh và phụ kiện. Phí phát
            sinh sẽ được trừ trực tiếp vào tiền cọc.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.confirmRow}
          onPress={() => setAccepted((current) => !current)}
          activeOpacity={0.85}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </View>

          <Text style={styles.confirmText}>
            Tôi xác nhận đã chuẩn bị đầy đủ thiết bị và phụ kiện để hoàn trả.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            submitting && styles.primaryButtonDisabled,
          ]}
          onPress={submitReturnRequest}
          disabled={submitting}
          activeOpacity={0.88}
        >
          {submitting ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />

              <Text style={styles.primaryButtonText}>
                Kho đang kiểm định demo...
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.primaryButtonText}>
                Gửi yêu cầu trả thiết bị
              </Text>

              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
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
    lineHeight: 15,
  },
  sectionCard: {
    marginTop: 12,
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
  options: {
    marginTop: 12,
    gap: 10,
  },
  optionCard: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#DCE5DE",
    borderRadius: 15,
    backgroundColor: "#F8FAF8",
  },
  optionCardActive: {
    borderColor: "#1B4332",
    backgroundColor: "#EEF7F1",
  },
  optionIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#E7F3EB",
  },
  optionIconActive: {
    backgroundColor: "#1B4332",
  },
  optionTitle: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
  },
  optionTitleActive: {
    color: "#1B4332",
    fontWeight: "900",
  },
  optionDescription: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 9,
    lineHeight: 14,
  },
  itemsList: {
    marginTop: 12,
    gap: 8,
  },
  itemRow: {
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    backgroundColor: "#F1F5F2",
  },
  itemIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#E0EEE5",
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
  noticeCard: {
    marginTop: 12,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    borderWidth: 1,
    borderColor: "#F6D69A",
    borderRadius: 15,
    backgroundColor: "#FFF8E8",
  },
  noticeText: {
    flex: 1,
    color: "#92400E",
    fontSize: 10,
    lineHeight: 16,
  },
  confirmRow: {
    marginTop: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },
  checkbox: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#94A3B8",
    borderRadius: 6,
  },
  checkboxChecked: {
    borderColor: "#1B4332",
    backgroundColor: "#1B4332",
  },
  confirmText: {
    flex: 1,
    color: "#334155",
    fontSize: 11,
    lineHeight: 17,
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
  primaryButtonDisabled: {
    opacity: 0.75,
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
