import { Colors, Radius, Shadows } from "@/constants/theme";
import {
  CancelBookingModal,
  EditParticipantsModal,
  PaymentCompleteResult,
  PaymentWebViewModal,
} from "@/features/bookings/components";
import {
  useBookingDetail,
  useBookingMutations,
  usePaymentOptions,
} from "@/features/bookings/hooks";
import {
  BOOKING_STATUS_LABELS,
  bookingApiService,
} from "@/features/bookings/services/booking.api";
import type { PaymentGateway } from "@/features/bookings/types";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface BookingCheckoutScreenProps {
  bookingId?: string;
}

export function BookingCheckoutScreen({
  bookingId: propId,
}: BookingCheckoutScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const bookingId =
    propId || (Array.isArray(params.id) ? params.id[0] : params.id) || "";

  const {
    booking,
    setBooking,
    isLoading,
    error,
    remainingSeconds,
    isHoldExpired,
    refetch,
  } = useBookingDetail(bookingId, true);

  const { createPayment, isSubmitting } = useBookingMutations();
  const { gateways } = usePaymentOptions();

  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>("vnpay");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [qrModalData, setQrModalData] = useState<string | null>(null);
  const [paymentWebViewUrl, setPaymentWebViewUrl] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  const handlePaymentWebViewComplete = useCallback(
    async (result: PaymentCompleteResult) => {
      setPaymentWebViewUrl(null);
      // Xóa key cũ sau khi đã thanh toán (dù thành công hay thất bại để lần sau tạo mới)
      bookingApiService.clearBookingPaymentSession(bookingId);

      if (result.success) {
        // Retry refetch để đảm bảo backend đã kịp ghi nhận webhook / return và đổi trạng thái sang CONFIRMED
        let updated = await refetch();
        if (updated?.status !== "CONFIRMED") {
          for (let attempt = 0; attempt < 3; attempt++) {
            await new Promise((r) => setTimeout(r, 1200));
            updated = await refetch();
            if (updated?.status === "CONFIRMED") break;
          }
        }
        setShowSuccessModal(true);
      } else {
        Alert.alert(
          "Chưa hoàn tất thanh toán",
          result.message || "Giao dịch không thành công. Bạn có thể thử lại.",
        );
      }
    },
    [bookingId, refetch],
  );

  if (isLoading && !booking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primaryDark} />
          <Text style={styles.loadingText}>Đang tải thông tin đặt chỗ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết đặt chỗ</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={styles.errorTitle}>Không tìm thấy đơn đặt chỗ</Text>
          <Text style={styles.errorSub}>{error || "Đơn đặt chỗ không tồn tại hoặc bạn không có quyền truy cập."}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => router.replace("/bookings" as any)}
          >
            <Text style={styles.retryBtnText}>Về Đặt chỗ của tôi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isPending = booking.status === "PENDING_PAYMENT";
  const isConfirmed = booking.status === "CONFIRMED";
  const isCancelled = booking.status === "CANCELLED";
  const isExpired = booking.status === "EXPIRED" || (isPending && isHoldExpired);

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timerStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const startDate = booking.trip?.startAt ? new Date(booking.trip.startAt) : null;
  const endDate = booking.trip?.endAt ? new Date(booking.trip.endAt) : null;

  async function handlePay() {
    if (!booking) return;

    if (isHoldExpired) {
      Alert.alert(
        "Hết hạn giữ chỗ",
        "Thời gian giữ vé đã kết thúc. Vui lòng tạo đặt chỗ mới để tham gia chuyến đi.",
        [
          {
            text: "Tìm chuyến khác",
            onPress: () => router.push("/(tabs)/explore" as any),
          },
        ],
      );
      return;
    }

        try {
      const res = await createPayment(
        booking.id,
        "REDIRECT",
        selectedGateway,
        // Bỏ booking.paymentSummary?.paymentId đi để luôn dùng 1 key duy nhất theo bookingId + gateway
      );

      if (res.checkout?.url) {
        // Open payment in integrated in-app WebView
        setPaymentWebViewUrl(res.checkout.url);
      } else if (res.checkout?.qrData) {
        setQrModalData(res.checkout.qrData);
      }

      // Re-fetch detail
      void refetch();
    } catch (err: any) {
      Alert.alert(
        "Lỗi thanh toán",
        err?.message || "Không thể khởi tạo cổng thanh toán lúc này.",
      );
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isConfirmed ? "Vé điện tử & Đặt chỗ" : "Thanh toán đặt chỗ"}
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => void refetch()}>
          <Ionicons name="refresh" size={18} color={Colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status / Countdown Banner */}
        {isPending && !isHoldExpired ? (
          <View style={styles.countdownBanner}>
            <View style={styles.countdownIcon}>
              <Ionicons name="hourglass" size={20} color="#D97706" />
            </View>
            <View style={styles.countdownTextCol}>
              <Text style={styles.countdownTitle}>Thời gian giữ chỗ của bạn</Text>
              <Text style={styles.countdownTimer}>{timerStr}</Text>
              <Text style={styles.countdownSub}>
                Vui lòng hoàn tất thanh toán trước khi hết thời gian để bảo đảm suất đi.
              </Text>
            </View>
          </View>
        ) : null}

        {isHoldExpired ? (
          <View style={styles.expiredBanner}>
            <Ionicons name="alert-circle" size={22} color="#DC2626" />
            <View style={styles.flex1}>
              <Text style={styles.expiredTitle}>Đặt chỗ đã hết hạn</Text>
              <Text style={styles.expiredSub}>
                Thời gian giữ chỗ tạm thời đã kết thúc. Vui lòng tạo đặt chỗ mới.
              </Text>
            </View>
          </View>
        ) : null}

        {isConfirmed ? (
          <View style={styles.confirmedBanner}>
            <Ionicons name="checkmark-circle" size={26} color="#16A34A" />
            <View style={styles.flex1}>
              <Text style={styles.confirmedTitle}>Vé đã được xác nhận! 🎉</Text>
              <Text style={styles.confirmedSub}>
                Bạn đã hoàn tất thanh toán và có tên chính thức trong danh sách đoàn.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Trip Overview Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.tripEyebrow}>CHUYẾN ĐI CÔNG KHAI</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {BOOKING_STATUS_LABELS[booking.status] || booking.status}
              </Text>
            </View>
          </View>

          <Text style={styles.tripTitle}>{booking.trip?.title}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.primaryDark} />
            <Text style={styles.metaText}>
              {startDate?.toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              -{" "}
              {endDate?.toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>

          {booking.pickup ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={16} color={Colors.primaryDark} />
              <View style={styles.flex1}>
                <Text style={styles.metaBoldText}>Điểm tập kết:</Text>
                <Text style={styles.metaText}>
                  {booking.pickup.name} ({booking.pickup.address})
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Transport Section (Only visible when CONFIRMED) */}
        {isConfirmed && booking.transport && booking.transport.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="bus-outline" size={18} color={Colors.primaryDark} />
              </View>
              <Text style={styles.sectionTitle}>Thông tin phương tiện di chuyển</Text>
            </View>

            {booking.transport.map((t, idx) => (
              <View key={idx} style={styles.transportBox}>
                <View style={styles.transportRow}>
                  <Text style={styles.transportLabel}>Loại xe:</Text>
                  <Text style={styles.transportVal}>{t.vehicleType}</Text>
                </View>
                {t.plateNumber ? (
                  <View style={styles.transportRow}>
                    <Text style={styles.transportLabel}>Biển số xe:</Text>
                    <Text style={styles.transportValBold}>{t.plateNumber}</Text>
                  </View>
                ) : null}
                {t.driverName ? (
                  <View style={styles.transportRow}>
                    <Text style={styles.transportLabel}>Tài xế:</Text>
                    <Text style={styles.transportVal}>{t.driverName}</Text>
                  </View>
                ) : null}
                {t.driverPhone ? (
                  <View style={styles.transportRow}>
                    <Text style={styles.transportLabel}>SĐT tài xế:</Text>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${t.driverPhone}`)}
                    >
                      <Text style={styles.phoneLink}>{t.driverPhone}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                {t.meetingAt ? (
                  <View style={styles.transportRow}>
                    <Text style={styles.transportLabel}>Giờ tập trung:</Text>
                    <Text style={styles.transportVal}>
                      {new Date(t.meetingAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Participants Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="people-outline" size={18} color={Colors.primaryDark} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.sectionTitle}>
                Danh sách thành viên ({booking.participants?.length || 0})
              </Text>
            </View>
            {booking.canEditParticipants ? (
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => setShowEditModal(true)}
              >
                <Ionicons name="create-outline" size={14} color={Colors.primaryDark} />
                <Text style={styles.editBtnText}>Chỉnh sửa</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {booking.participants?.map((p, idx) => (
            <View key={p.id || idx} style={styles.participantItem}>
              <View style={styles.pIndex}>
                <Text style={styles.pIndexText}>#{idx + 1}</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.pName}>{p.fullName}</Text>
                <View style={styles.pMetaRow}>
                  {p.phone ? (
                    <Text style={styles.pMetaText}>SĐT: {p.phone}</Text>
                  ) : null}
                  {p.dateOfBirth ? (
                    <Text style={styles.pMetaText}>Sinh: {p.dateOfBirth}</Text>
                  ) : null}
                </View>
                {p.emergencyContactName ? (
                  <Text style={styles.pEmergencyText}>
                    Khẩn cấp: {p.emergencyContactName}{" "}
                    {p.emergencyContactPhone ? `(${p.emergencyContactPhone})` : ""}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        {/* Payment Gateways Selection (When PENDING_PAYMENT) */}
        {isPending && !isHoldExpired ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Chọn phương thức thanh toán</Text>
            <Text style={styles.sectionSub}>
              Cổng thanh toán bảo mật liên kết trực tiếp
            </Text>

            <View style={styles.gatewayList}>
              {gateways.map((g) => {
                const isSelected = selectedGateway === g.gateway;
                const isVnPay = g.gateway === "vnpay";

                return (
                  <TouchableOpacity
                    key={g.gateway}
                    style={[
                      styles.gatewayOption,
                      isSelected && styles.gatewayOptionSelected,
                    ]}
                    onPress={() => setSelectedGateway(g.gateway)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.radioCircle}>
                      {isSelected ? <View style={styles.radioInner} /> : null}
                    </View>
                    <View style={styles.gatewayInfo}>
                      <Text style={styles.gatewayName}>
                        {isVnPay
                          ? "Cổng VNPAY (ATM / Visa / QR)"
                          : "Ví điện tử MoMo"}
                      </Text>
                      <Text style={styles.gatewayDesc}>
                        {isVnPay
                          ? "Thanh toán qua thẻ nội địa, quốc tế hoặc quét mã VNPAY-QR"
                          : "Xác thực nhanh qua ứng dụng MoMo trên điện thoại"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Pricing Summary Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Chi tiết chi phí</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceItemLabel}>
              Đơn giá vé ({booking.participantCount} người)
            </Text>
            <Text style={styles.priceItemVal}>
              {Number(booking.pricePerPax || 0).toLocaleString("vi-VN")} đ / người
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.priceTotalRow}>
            <Text style={styles.priceTotalLabel}>Tổng số tiền cần trả:</Text>
            <Text style={styles.priceTotalVal}>
              {Number(booking.totalAmount || 0).toLocaleString("vi-VN")} đ
            </Text>
          </View>
        </View>

        {/* Refund Details (if any) */}
        {booking.refunds && booking.refunds.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Thông tin hoàn tiền</Text>
            {booking.refunds.map((ref, idx) => (
              <View key={ref.refundId || idx} style={styles.refundBox}>
                <View style={styles.refundRow}>
                  <Text style={styles.refundLabel}>Số tiền hoàn:</Text>
                  <Text style={styles.refundVal}>
                    {Number(ref.amount || 0).toLocaleString("vi-VN")} đ
                  </Text>
                </View>
                <View style={styles.refundRow}>
                  <Text style={styles.refundLabel}>Trạng thái:</Text>
                  <Text style={styles.refundStatus}>{ref.status}</Text>
                </View>
                {ref.refundedAt ? (
                  <View style={styles.refundRow}>
                    <Text style={styles.refundLabel}>Thời gian hoàn:</Text>
                    <Text style={styles.refundTime}>
                      {new Date(ref.refundedAt).toLocaleString("vi-VN")}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Cancellation Option */}
        {booking.canCancel ? (
          <TouchableOpacity
            style={styles.cancelBookingBtn}
            onPress={() => setShowCancelModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
            <Text style={styles.cancelBookingText}>Hủy đặt chỗ này</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* Sticky Bottom Action (when PENDING_PAYMENT and not expired) */}
      {isPending && !isHoldExpired ? (
        <View style={styles.stickyFooter}>
          <View style={styles.stickyPriceCol}>
            <Text style={styles.stickyLabel}>Số tiền thanh toán:</Text>
            <Text style={styles.stickyAmount}>
              {Number(booking.totalAmount || 0).toLocaleString("vi-VN")} đ
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.payNowBtn, isSubmitting && styles.btnDisabled]}
            onPress={handlePay}
            disabled={isSubmitting}
            activeOpacity={0.88}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.payNowText}>Thanh toán ngay</Text>
                <Ionicons name="card-outline" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Edit Participants Modal */}
      {showEditModal && booking ? (
        <EditParticipantsModal
          visible={showEditModal}
          booking={booking}
          onClose={() => setShowEditModal(false)}
          onSuccess={(updated) => {
            setBooking(updated);
            void refetch();
          }}
        />
      ) : null}

      {/* Cancel Booking Modal */}
      {showCancelModal && booking ? (
        <CancelBookingModal
          visible={showCancelModal}
          bookingId={booking.id}
          totalAmount={booking.totalAmount}
          onClose={() => setShowCancelModal(false)}
          onSuccess={() => {
            void refetch();
          }}
        />
      ) : null}

      {/* In-App Payment WebView Modal (VNPAY / MoMo) */}
      {paymentWebViewUrl ? (
        <PaymentWebViewModal
          visible={Boolean(paymentWebViewUrl)}
          url={paymentWebViewUrl}
          title={selectedGateway === "vnpay" ? "Cổng thanh toán VNPAY" : "Cổng thanh toán MoMo"}
          onClose={() => setPaymentWebViewUrl(null)}
          onPaymentComplete={handlePaymentWebViewComplete}
        />
      ) : null}

      {/* Payment Success Celebration Modal */}
      {showSuccessModal && booking ? (
        <Modal
          visible={showSuccessModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowSuccessModal(false)}
        >
          <View style={styles.successModalOverlay}>
            <View style={styles.successModalCard}>
              <View style={styles.successModalIcon}>
                <Ionicons name="checkmark-circle" size={56} color="#16A34A" />
              </View>

              <Text style={styles.successModalTitle}>Thanh toán thành công! 🎉</Text>
              <Text style={styles.successModalSubtitle}>
                Đơn đặt chỗ đã được xác nhận chính thức. Chúc bạn có một hành trình an toàn và trọn vẹn!
              </Text>

              <View style={styles.successModalDetailsBox}>
                <View style={styles.successModalRow}>
                  <Text style={styles.successModalLabel}>Mã đặt chỗ</Text>
                  <Text style={styles.successModalVal}>
                    #BK-{booking.id.slice(0, 8).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.successModalRow}>
                  <Text style={styles.successModalLabel}>Chuyến đi</Text>
                  <Text
                    style={[styles.successModalVal, { flex: 1, textAlign: "right" }]}
                    numberOfLines={1}
                  >
                    {booking.trip?.title}
                  </Text>
                </View>

                <View style={styles.successModalRow}>
                  <Text style={styles.successModalLabel}>Số lượng vé</Text>
                  <Text style={styles.successModalVal}>
                    {booking.participantCount} vé
                  </Text>
                </View>

                <View style={styles.successModalRow}>
                  <Text style={styles.successModalLabel}>Tổng thanh toán</Text>
                  <Text
                    style={[
                      styles.successModalVal,
                      { color: Colors.primaryDark, fontWeight: "900" },
                    ]}
                  >
                    {parseFloat(booking.totalAmount).toLocaleString("vi-VN")} VND
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.successModalPrimaryBtn}
                onPress={() => setShowSuccessModal(false)}
                activeOpacity={0.85}
              >
                <Ionicons name="ticket-outline" size={18} color="#FFFFFF" />
                <Text style={styles.successModalPrimaryText}>
                  Xem Vé & Thông tin đưa đón
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.successModalSecondaryBtn}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.push("/(tabs)/trips");
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.successModalSecondaryText}>
                  Về mục Chuyến của tôi
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.onSurface,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 38,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.onSurface,
    marginTop: 12,
  },
  errorSub: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 18,
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  countdownBanner: {
    flexDirection: "row",
    backgroundColor: "#FEF3C7",
    padding: 16,
    borderRadius: Radius.xl,
    marginBottom: 14,
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  countdownIcon: {
    marginTop: 2,
  },
  countdownTextCol: {
    flex: 1,
  },
  countdownTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
  },
  countdownTimer: {
    fontSize: 28,
    fontWeight: "900",
    color: "#B45309",
    marginVertical: 4,
    letterSpacing: 1,
  },
  countdownSub: {
    fontSize: 11,
    color: "#92400E",
    lineHeight: 15,
  },
  expiredBanner: {
    flexDirection: "row",
    backgroundColor: "#FEE2E2",
    padding: 14,
    borderRadius: Radius.xl,
    marginBottom: 14,
    alignItems: "center",
    gap: 10,
  },
  expiredTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#DC2626",
  },
  expiredSub: {
    fontSize: 12,
    color: "#991B1B",
    marginTop: 2,
  },
  confirmedBanner: {
    flexDirection: "row",
    backgroundColor: "#DCFCE7",
    padding: 16,
    borderRadius: Radius.xl,
    marginBottom: 14,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  confirmedTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#16A34A",
  },
  confirmedSub: {
    fontSize: 12,
    color: "#15803D",
    marginTop: 2,
    lineHeight: 16,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  tripEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.primaryDark,
    letterSpacing: 0.8,
  },
  statusPill: {
    backgroundColor: Colors.primaryPale,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.primaryDark,
  },
  tripTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: Colors.onSurface,
    lineHeight: 22,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    marginBottom: 8,
  },
  metaText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  metaBoldText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  sectionSub: {
    fontSize: 11,
    color: Colors.onSurfaceMuted,
    marginTop: 2,
    marginBottom: 12,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primaryDark,
  },
  transportBox: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: 12,
    gap: 8,
  },
  transportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  transportLabel: {
    fontSize: 12,
    color: Colors.onSurfaceMuted,
  },
  transportVal: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.onSurface,
  },
  transportValBold: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.primaryDark,
  },
  phoneLink: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primaryDark,
    textDecorationLine: "underline",
  },
  participantItem: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerLow,
  },
  pIndex: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  pIndexText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.onSurfaceVariant,
  },
  pName: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  pMetaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
  },
  pMetaText: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  pEmergencyText: {
    fontSize: 10,
    color: Colors.onSurfaceMuted,
    marginTop: 2,
  },
  gatewayList: {
    gap: 10,
    marginTop: 8,
  },
  gatewayOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainer,
  },
  gatewayOptionSelected: {
    borderColor: Colors.primaryDark,
    backgroundColor: Colors.primaryPale,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.onSurfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
  },
  gatewayInfo: {
    flex: 1,
  },
  gatewayName: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  gatewayDesc: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 15,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  priceItemLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  priceItemVal: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.onSurface,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceContainer,
    marginVertical: 10,
  },
  priceTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceTotalLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  priceTotalVal: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.primaryDark,
  },
  refundBox: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: 10,
    gap: 6,
    marginTop: 8,
  },
  refundRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  refundLabel: {
    fontSize: 11,
    color: Colors.onSurfaceMuted,
  },
  refundVal: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primaryDark,
  },
  refundStatus: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  refundTime: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  cancelBookingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEE2E2",
    marginTop: 6,
  },
  cancelBookingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },
  stickyFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainer,
    ...Shadows.card,
  },
  stickyPriceCol: {
    flex: 1,
  },
  stickyLabel: {
    fontSize: 10,
    color: Colors.onSurfaceMuted,
  },
  stickyAmount: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.primaryDark,
  },
  payNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  payNowText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  flex1: {
    flex: 1,
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successModalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: 24,
    alignItems: "center",
    ...Shadows.hover,
  },
  successModalIcon: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.onSurface,
    textAlign: "center",
    marginBottom: 8,
  },
  successModalSubtitle: {
    fontSize: 13,
    color: Colors.mute,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  successModalDetailsBox: {
    width: "100%",
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  successModalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  successModalLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  successModalVal: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  successModalPrimaryBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primaryDark,
    paddingVertical: 14,
    borderRadius: Radius.full,
    marginBottom: 10,
  },
  successModalPrimaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  successModalSecondaryBtn: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  successModalSecondaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurfaceVariant,
  },
});
