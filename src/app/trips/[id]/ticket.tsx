import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { useApp } from "@/context/AppContext";

const qrCells = [
  1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0,
  1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1,
  1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0,
  1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0,
  1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1,
  0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1,
];

export default function TripTicketScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips } = useApp();

  const trip = trips.find((item) => item.id === id);

  if (!trip) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Ionicons name="ticket-outline" size={54} color="#64748B" />

          <Text style={styles.emptyTitle}>Không tìm thấy vé</Text>

          <Text style={styles.emptyDescription}>
            Chuyến đi này không còn tồn tại trong dữ liệu hiện tại.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/(tabs)/trips")}
          >
            <Text style={styles.primaryButtonText}>Về chuyến của tôi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const bookingCode = trip.bookingCode ?? "#BK-DEMO-2026";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#17231B" />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Vé tham gia chuyến</Text>

          <Text style={styles.headerSubtitle}>Xuất trình vé khi tập trung</Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.statusBanner}>
          <View style={styles.statusIcon}>
            <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
          </View>

          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>Đặt chỗ đã được xác nhận</Text>

            <Text style={styles.statusDescription}>
              Khoản đặt cọc đã được ghi nhận
            </Text>
          </View>
        </View>

        <View style={styles.ticket}>
          <View style={styles.ticketTop}>
            <View style={styles.brandIcon}>
              <Ionicons name="trail-sign" size={24} color="#FFFFFF" />
            </View>

            <View style={styles.brandContent}>
              <Text style={styles.brandName}>Vina TrekGo</Text>

              <Text style={styles.brandCaption}>E-TICKET · PUBLIC TOUR</Text>
            </View>

            <View style={styles.confirmedBadge}>
              <Text style={styles.confirmedText}>CONFIRMED</Text>
            </View>
          </View>

          <View style={styles.tripSection}>
            <Text style={styles.label}>CHUYẾN ĐI</Text>

            <Text style={styles.tripName}>{trip.name}</Text>

            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={17} color="#2D6A4F" />

              <Text style={styles.metaText}>{trip.destination}</Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={17} color="#2D6A4F" />

              <Text style={styles.metaText}>
                {trip.startDate} – {trip.endDate}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={17} color="#2D6A4F" />

              <Text style={styles.metaText}>Leader {trip.leader.name}</Text>
            </View>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.ticketCutLeft} />

            <View style={styles.dashedLine} />

            <View style={styles.ticketCutRight} />
          </View>

          <View style={styles.qrSection}>
            <Text style={styles.scanTitle}>Quét mã để check-in</Text>

            <Text style={styles.scanDescription}>
              Nhân viên hoặc Leader sẽ quét mã này tại điểm tập trung
            </Text>

            <View style={styles.qrFrame}>
              <View style={styles.qrGrid}>
                {qrCells.map((cell, index) => (
                  <View
                    key={`${cell}-${index}`}
                    style={[
                      styles.qrCell,
                      cell === 1 ? styles.qrCellFilled : styles.qrCellEmpty,
                    ]}
                  />
                ))}
              </View>
            </View>

            <Text style={styles.bookingCode}>{bookingCode}</Text>

            <Text style={styles.bookingCaption}>Mã đặt chỗ</Text>
          </View>

          <View style={styles.reminderBox}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#9A6700"
            />

            <Text style={styles.reminderText}>
              Có mặt trước giờ khởi hành ít nhất 30 phút và mang theo giấy tờ
              tùy thân.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace("/(tabs)/trips")}
          activeOpacity={0.85}
        >
          <Ionicons name="briefcase-outline" size={19} color="#FFFFFF" />

          <Text style={styles.primaryButtonText}>Về chuyến của tôi</Text>
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
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2EE",
  },
  headerText: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: "#17231B",
    fontSize: 17,
    fontWeight: "800",
  },
  headerSubtitle: {
    marginTop: 2,
    color: "#64748B",
    fontSize: 11,
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 14,
    borderRadius: 16,
    backgroundColor: "#DFF4E7",
  },
  statusIcon: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1B4332",
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    color: "#123524",
    fontSize: 15,
    fontWeight: "800",
  },
  statusDescription: {
    marginTop: 3,
    color: "#3E6651",
    fontSize: 12,
  },
  ticket: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#DDE5DF",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  ticketTop: {
    minHeight: 82,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1B4332",
  },
  brandIcon: {
    width: 44,
    height: 44,
    marginRight: 11,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2D6A4F",
  },
  brandContent: {
    flex: 1,
  },
  brandName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  brandCaption: {
    marginTop: 3,
    color: "#BCE2CA",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.7,
  },
  confirmedBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#C8F169",
  },
  confirmedText: {
    color: "#183100",
    fontSize: 9,
    fontWeight: "900",
  },
  tripSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  label: {
    marginBottom: 6,
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  tripName: {
    marginBottom: 14,
    color: "#17231B",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 29,
  },
  metaRow: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    flex: 1,
    marginLeft: 9,
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
  },
  dividerRow: {
    height: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  ticketCutLeft: {
    width: 24,
    height: 24,
    marginLeft: -12,
    borderRadius: 12,
    backgroundColor: "#F5F7F5",
  },
  dashedLine: {
    flex: 1,
    marginHorizontal: 8,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
  },
  ticketCutRight: {
    width: 24,
    height: 24,
    marginRight: -12,
    borderRadius: 12,
    backgroundColor: "#F5F7F5",
  },
  qrSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  scanTitle: {
    color: "#17231B",
    fontSize: 17,
    fontWeight: "800",
  },
  scanDescription: {
    maxWidth: 270,
    marginTop: 5,
    marginBottom: 18,
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  qrFrame: {
    width: 196,
    height: 196,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D9E2DC",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  qrGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  qrCell: {
    width: "8.333333%",
    height: "8.333333%",
  },
  qrCellFilled: {
    backgroundColor: "#102117",
  },
  qrCellEmpty: {
    backgroundColor: "#FFFFFF",
  },
  bookingCode: {
    marginTop: 16,
    color: "#1B4332",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1,
  },
  bookingCaption: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 11,
  },
  reminderBox: {
    marginHorizontal: 16,
    marginBottom: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    backgroundColor: "#FFF7D6",
  },
  reminderText: {
    flex: 1,
    marginLeft: 9,
    color: "#6B5200",
    fontSize: 12,
    lineHeight: 18,
  },
  primaryButton: {
    minHeight: 52,
    marginTop: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    backgroundColor: "#1B4332",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
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
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
});
