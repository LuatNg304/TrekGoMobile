import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import {
  BookingParticipantInput,
  cf02BookingApi,
  parseCf02Error,
} from "@/services/api/cf02BookingApi";

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
  const params = useLocalSearchParams<{ id: string; bookingId?: string }>();
  const { trips } = useApp();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [savingParticipants, setSavingParticipants] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const pollIntervalRef = useRef<any>(null);
  const targetBookingId = params.bookingId || params.id;
  const trip = trips.find((item) => item.id === params.id || item.id === booking?.tripId);

  // API 21: GET /api/v1/bookings/{id} kèm Polling nếu PENDING_PAYMENT
  const loadBookingDetail = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await cf02BookingApi.getBookingDetail(targetBookingId);
        setBooking(data);
        if (data?.participants?.[0]) {
          setEditFullName(data.participants[0].fullName || "");
          setEditPhone(data.participants[0].phone || "");
        }
      } catch (err) {
        console.warn("Không tải được chi tiết booking từ API:", err);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [targetBookingId],
  );

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      if (mounted) {
        loadBookingDetail();
      }
    }, 0);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [loadBookingDetail]);

  useEffect(() => {
    // Polling tự động nếu đang ở PENDING_PAYMENT
    if (booking?.status === "PENDING_PAYMENT") {
      pollIntervalRef.current = setInterval(() => {
        loadBookingDetail(true);
      }, 4000);
    } else if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [booking?.status, loadBookingDetail]);

  // API 20: PATCH /api/v1/bookings/{id}/participants
  async function handleUpdateParticipants() {
    if (!editFullName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập họ và tên.");
      return;
    }
    setSavingParticipants(true);
    try {
      const currentParticipants = booking?.participants || [];
      const updatedList: BookingParticipantInput[] = [
        {
          id: currentParticipants[0]?.id,
          fullName: editFullName.trim(),
          phone: editPhone.trim(),
          emergencyContactName: editFullName.trim(),
          emergencyContactPhone: editPhone.trim(),
        },
      ];

      const res = await cf02BookingApi.updateParticipants(targetBookingId, {
        participantCount: Math.max(1, currentParticipants.length),
        participants: updatedList,
        expectedVersion: Number(booking?.version || 1),
      });

      setBooking(res);
      setEditModalVisible(false);
      Alert.alert("Thành công", "Đã cập nhật thông tin người tham gia.");
    } catch (err) {
      const parsed = parseCf02Error(err);
      Alert.alert("Lỗi", parsed.message || "Không thể cập nhật danh sách người tham gia.");
    } finally {
      setSavingParticipants(false);
    }
  }

  if (loading && !booking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2D6A4F" />
          <Text style={styles.loadingText}>Đang tải thông tin vé...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const bookingCode =
    booking?.code ||
    booking?.bookingCode ||
    (targetBookingId ? `#BK-${targetBookingId.slice(0, 6).toUpperCase()}` : "#BK-DEMO-2026");

  const status = booking?.status || "CONFIRMED";
  const tripName = booking?.trip?.name || trip?.name || "Chuyến đi Trekking";
  const destination = booking?.trip?.destination || trip?.destination || "Điểm đến trải nghiệm";
  const dateRange =
    booking?.trip?.startDate && booking?.trip?.endDate
      ? `${booking.trip.startDate} – ${booking.trip.endDate}`
      : trip?.startDate
        ? `${trip.startDate} – ${trip.endDate}`
        : "Theo lịch khởi hành";
  const leaderName = booking?.trip?.leaderName || trip?.leader?.name || "Trek Leader";
  const paidAmount = Number(booking?.totalPrice || booking?.paidAmount || trip?.pricePerPerson || 2850000);

  const isPending = status === "PENDING_PAYMENT";
  const isCancelled = status === "CANCELLED";

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
        <View
          style={[
            styles.statusBanner,
            isPending && styles.statusBannerPending,
            isCancelled && styles.statusBannerCancelled,
          ]}
        >
          <View style={styles.statusIcon}>
            <Ionicons
              name={
                isCancelled
                  ? "close-circle"
                  : isPending
                    ? "time"
                    : "checkmark-circle"
              }
              size={22}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>
              {isCancelled
                ? "Đặt chỗ đã bị hủy"
                : isPending
                  ? "Chờ thanh toán (Đang giữ chỗ)"
                  : "Đặt chỗ đã được xác nhận"}
            </Text>

            <Text style={styles.statusDescription}>
              {isCancelled
                ? "Chỗ đã được giải phóng theo yêu cầu"
                : isPending
                  ? "Vui lòng hoàn tất thanh toán để nhận mã vé chính thức"
                  : "Thanh toán trọn gói 100% thành công. Đặt chỗ đã được xác nhận"}
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

            <View
              style={[
                styles.confirmedBadge,
                isPending && styles.pendingBadge,
                isCancelled && styles.cancelledBadge,
              ]}
            >
              <Text style={styles.confirmedText}>
                {isCancelled
                  ? "CANCELLED"
                  : isPending
                    ? "PENDING"
                    : "CONFIRMED"}
              </Text>
            </View>
          </View>

          <View style={styles.tripSection}>
            <Text style={styles.label}>CHUYẾN ĐI</Text>
            <Text style={styles.tripName}>{tripName}</Text>

            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={17} color="#2D6A4F" />
              <Text style={styles.metaText}>{destination}</Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={17} color="#2D6A4F" />
              <Text style={styles.metaText}>{dateRange}</Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={17} color="#2D6A4F" />
              <Text style={styles.metaText}>Leader {leaderName}</Text>
            </View>

            {booking?.participants?.length ? (
              <View style={styles.participantBox}>
                <View style={styles.participantHeader}>
                  <Text style={styles.participantTitle}>Người tham gia:</Text>
                  {isPending && (
                    <TouchableOpacity
                      onPress={() => setEditModalVisible(true)}
                      style={styles.editLink}
                    >
                      <Ionicons name="create-outline" size={14} color="#2D6A4F" />
                      <Text style={styles.editLinkText}>Chỉnh sửa</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {booking.participants.map((p: any, idx: number) => (
                  <Text key={p.id || idx} style={styles.participantText}>
                    • {p.fullName} {p.phone ? `(${p.phone})` : ""}
                  </Text>
                ))}
              </View>
            ) : null}
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

        {/* Nút hành động cho vé */}
        <View style={styles.actionRow}>
          {!isCancelled && (
            <TouchableOpacity
              style={styles.cancelBookingButton}
              onPress={() =>
                router.push({
                  pathname: "/trips/[id]/cancel",
                  params: {
                    id: params.id,
                    bookingId: targetBookingId,
                    name: tripName,
                    bookingCode,
                    amount: String(paidAmount),
                  },
                } as any)
              }
            >
              <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
              <Text style={styles.cancelBookingButtonText}>Hủy đặt chỗ</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/(tabs)/trips")}
            activeOpacity={0.85}
          >
            <Ionicons name="briefcase-outline" size={19} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Về chuyến của tôi</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal cập nhật người tham gia (API 20: PATCH /bookings/{id}/participants) */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cập nhật thông tin người tham gia</Text>
            <Text style={styles.modalSubtitle}>Áp dụng khi đơn đang ở trạng thái giữ chỗ</Text>

            <Text style={styles.inputLabel}>Họ và tên</Text>
            <TextInput
              style={styles.input}
              value={editFullName}
              onChangeText={setEditFullName}
              placeholder="Nhập họ và tên"
            />

            <Text style={styles.inputLabel}>Số điện thoại</Text>
            <TextInput
              style={styles.input}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="Số điện thoại"
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditModalVisible(false)}
                disabled={savingParticipants}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleUpdateParticipants}
                disabled={savingParticipants}
              >
                {savingParticipants ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Lưu thay đổi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
  },
  statusBannerPending: {
    backgroundColor: "#FEF3C7",
  },
  statusBannerCancelled: {
    backgroundColor: "#FEE2E2",
  },
  pendingBadge: {
    backgroundColor: "#D97706",
  },
  cancelledBadge: {
    backgroundColor: "#DC2626",
  },
  participantBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#F8FAF8",
  },
  participantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  participantTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#17231B",
  },
  editLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  editLinkText: {
    fontSize: 12,
    color: "#2D6A4F",
    fontWeight: "600",
  },
  participantText: {
    fontSize: 12,
    color: "#475569",
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "column",
    gap: 8,
    marginTop: 8,
  },
  cancelBookingButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  cancelBookingButtonText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#17231B",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14,
    color: "#0F172A",
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  modalSaveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#1B4332",
    minWidth: 100,
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
