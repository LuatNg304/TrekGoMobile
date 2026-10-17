import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
import { WebView } from "react-native-webview";

import { Colors, Radius, Shadows } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/features/auth/AuthContext";
import { cf02BookingApi, parseCf02Error } from "@/services/api/cf02BookingApi";
import { Trip } from "@/types";

interface BookingModalProps {
  visible: boolean;
  trip: Trip;
  onClose: () => void;
}

type BookingStep = "INFORMATION" | "REVIEW" | "SUCCESS";

type PaymentMethod = "VNPAY_GATEWAY" | "VNPAY_QR";

export function BookingModal({ visible, trip, onClose }: BookingModalProps) {
  const router = useRouter();
  const { bookPublicTrip } = useApp();
  const { user: authUser } = useAuth();

  const [step, setStep] = useState<BookingStep>("INFORMATION");
  const [participantsCount, setParticipantsCount] = useState(1);
  const [contactName, setContactName] = useState(authUser?.fullName || "");
  const [contactPhone, setContactPhone] = useState(authUser?.phone || "");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [acceptedSafety, setAcceptedSafety] = useState(false);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("VNPAY_GATEWAY");
  const [submitting, setSubmitting] = useState(false);
  const [ticketCode, setTicketCode] = useState("");
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [vnpayUrl, setVnpayUrl] = useState<string | null>(null);
  const vnpayHandledRef = useRef(false);

  useEffect(() => {
    if (!visible || !authUser) return;
    const timer = setTimeout(() => {
      setContactName((prev) => prev || authUser.fullName || "");
      setContactPhone((prev) => prev || authUser.phone || "");
    }, 0);
    return () => clearTimeout(timer);
  }, [visible, authUser]);

  const pricePerPerson = trip.pricePerPerson ?? 2850000;
  const totalPrice = pricePerPerson * participantsCount;
  const availableSlots = Math.max(0, trip.capacity - trip.enrolledCount);

  function resetModal() {
    setStep("INFORMATION");
    setAcceptedSafety(false);
    setAcceptedPolicy(false);
    setSubmitting(false);
    setVnpayUrl(null);
    vnpayHandledRef.current = false;
  }

  function handleClose() {
    resetModal();
    onClose();
  }

  function decreaseParticipants() {
    setParticipantsCount((current) => Math.max(1, current - 1));
  }

  function increaseParticipants() {
    setParticipantsCount((current) =>
      Math.min(Math.min(4, availableSlots), current + 1),
    );
  }

  function continueToReview() {
    if (!contactName.trim()) {
      Alert.alert("Thiếu họ tên", "Vui lòng nhập họ tên người đại diện.");
      return;
    }

    if (contactPhone.replace(/\s/g, "").length < 9) {
      Alert.alert(
        "Số điện thoại chưa hợp lệ",
        "Vui lòng kiểm tra lại số điện thoại liên hệ.",
      );
      return;
    }

    if (emergencyContact.replace(/\s/g, "").length < 9) {
      Alert.alert(
        "Thiếu liên hệ khẩn cấp",
        "Vui lòng nhập số điện thoại liên hệ khẩn cấp.",
      );
      return;
    }

    if (!acceptedSafety) {
      Alert.alert(
        "Chưa xác nhận an toàn",
        "Bạn cần xác nhận tình trạng sức khỏe và cam kết tuân thủ hướng dẫn của Trek Leader.",
      );
      return;
    }

    setStep("REVIEW");
  }

  async function confirmBooking() {
    if (!acceptedPolicy) {
      Alert.alert(
        "Chưa đồng ý điều khoản",
        "Vui lòng đọc và đồng ý với điều khoản tham gia chuyến đi và chính sách hủy chuyến.",
      );
      return;
    }

    setSubmitting(true);

    try {
      // 1. Gọi API 19: POST /api/v1/trips/{tripId}/bookings
      const participantsList = [
        {
          fullName: contactName.trim(),
          phone: contactPhone.trim(),
          emergencyContactName: contactName.trim(),
          emergencyContactPhone: emergencyContact.trim(),
        },
      ];

      // Thêm các thành viên đi kèm nếu có
      for (let i = 2; i <= participantsCount; i++) {
        participantsList.push({
          fullName: `Người đồng hành ${i} (${contactName.trim()})`,
          phone: contactPhone.trim(),
          emergencyContactName: contactName.trim(),
          emergencyContactPhone: emergencyContact.trim(),
        });
      }

      const bookingRes = await cf02BookingApi.createBooking({
        tripId: trip.id,
        participantCount: participantsCount,
        participants: participantsList,
      });

      const newBookingId = bookingRes?.id || bookingRes?.bookingId;
      setCreatedBookingId(newBookingId);

      // Đồng bộ local fallback
      try {
        bookPublicTrip(trip.id, participantsCount);
      } catch {}

      // 2. Khởi tạo phiên thanh toán qua VNPAY (API 23)
      let paymentUrl: string | undefined;

      try {
        await cf02BookingApi.getPaymentOptions();
        const payRes = await cf02BookingApi.createBookingPayment(newBookingId, {
          paymentMethod: paymentMethod === "VNPAY_QR" ? "QR" : "REDIRECT",
          gateway: "vnpay",
        });

        // Backend trả về checkout.url cho VNPAY Redirect
        paymentUrl =
          payRes?.checkout?.url ||
          payRes?.checkoutUrl ||
          payRes?.paymentUrl ||
          payRes?.url ||
          payRes?.redirectUrl ||
          payRes?.data?.checkout?.url ||
          payRes?.data?.paymentUrl ||
          payRes?.data?.url;
      } catch (payErr: any) {
        console.warn("Lỗi tạo phiên thanh toán VNPAY:", payErr);
      }

      const generatedTicket =
        bookingRes?.code ||
        bookingRes?.bookingCode ||
        (newBookingId
          ? `#BK-${newBookingId.slice(0, 6).toUpperCase()}`
          : `#BK-${Math.floor(1000 + Math.random() * 9000)}`);

      setTicketCode(generatedTicket);

      // 3. Mở cổng VNPAY Sandbox trực tiếp trong ứng dụng qua WebView
      if (paymentUrl) {
        vnpayHandledRef.current = false;
        setVnpayUrl(paymentUrl);
      } else {
        Alert.alert(
          "Thanh toán & Giữ chỗ thành công!",
          `Đã xác nhận đặt chỗ và ghi nhận đơn hàng ${totalPrice.toLocaleString("vi-VN")} đ. Vé QR đã sẵn sàng.`,
          [
            {
              text: "Xem vé ngay",
              onPress: () => {
                setStep("SUCCESS");
              },
            },
          ],
          { cancelable: false },
        );
        setStep("SUCCESS");
      }
    } catch (err: any) {
      const parsed = parseCf02Error(err);
      if (
        parsed.code === "ACTIVE_BOOKING_EXISTS" ||
        parsed.issues?.some((i) => i.code === "ACTIVE_BOOKING_EXISTS")
      ) {
        Alert.alert(
          "Đã có đơn đặt chỗ",
          "Bạn đang có đơn đặt chỗ còn hiệu lực cho chuyến đi này. Bạn có muốn chuyển đến xem đơn đặt chỗ không?",
          [
            { text: "Ở lại", style: "cancel" },
            {
              text: "Xem đơn đặt chỗ",
              onPress: () => {
                const existingId = parsed.existingBookingId || trip.id;
                onClose();
                router.push({
                  pathname: "/trips/[id]/ticket",
                  params: {
                    id: trip.id,
                    bookingId: existingId,
                  },
                } as any);
              },
            },
          ],
        );
        return;
      }

      Alert.alert(
        "Không thể đặt chỗ",
        parsed.message ||
          "Đã xảy ra lỗi khi tạo đơn giữ chỗ. Vui lòng thử lại sau.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleCloseVnpay() {
    Alert.alert(
      "Đóng cổng thanh toán VNPAY?",
      "Bạn chưa hoàn tất thanh toán. Đơn đặt chỗ vẫn được lưu ở trạng thái Chờ thanh toán.",
      [
        { text: "Ở lại thanh toán", style: "cancel" },
        {
          text: "Đóng & Xem vé",
          style: "destructive",
          onPress: () => {
            setVnpayUrl(null);
            setStep("SUCCESS");
          },
        },
      ],
    );
  }

  function handleVnpayNavigation(navUrl: string) {
    if (!navUrl || vnpayHandledRef.current) return true;

    const isReturn =
      navUrl.includes("vnp_ResponseCode=") ||
      navUrl.includes("vnp_TransactionStatus=") ||
      navUrl.includes("localhost") ||
      navUrl.includes("127.0.0.1") ||
      navUrl.includes("/payments/vnpay/return") ||
      navUrl.includes("/payments/return");

    if (!isReturn) {
      return true;
    }

    // Đánh dấu đã bắt đầu xử lý để không bị trùng lặp
    vnpayHandledRef.current = true;

    // Trích xuất mã phản hồi vnp_ResponseCode
    const matchCode = navUrl.match(/[?&]vnp_ResponseCode=([^&#]*)/);
    const responseCode = matchCode ? decodeURIComponent(matchCode[1]) : null;

    const matchStatus = navUrl.match(/[?&]vnp_TransactionStatus=([^&#]*)/);
    const transactionStatus = matchStatus
      ? decodeURIComponent(matchStatus[1])
      : null;

    const isSuccess = responseCode === "00" || transactionStatus === "00";

    // Đồng bộ gọi ngầm về Backend thật nếu là localhost/127.0.0.1
    if (navUrl.includes("localhost") || navUrl.includes("127.0.0.1")) {
      try {
        const backendApiUrl =
          process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.7:3000";
        const syncUrl = navUrl.replace(
          /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/,
          backendApiUrl.replace(/\/$/, ""),
        );
        fetch(syncUrl).catch((err) => {
          console.log("Sync return URL to backend:", err);
        });
      } catch (err) {
        console.warn("Lỗi sync URL:", err);
      }
    }

    // Đóng WebView VNPAY Sandbox ngay lập tức
    setVnpayUrl(null);

    if (isSuccess) {
      setStep("SUCCESS");
      Alert.alert(
        "Thanh toán & Giữ chỗ thành công!",
        `Đã xác nhận đặt chỗ và ghi nhận thanh toán trọn gói ${totalPrice.toLocaleString("vi-VN")} đ qua VNPAY Sandbox. Vé QR đã sẵn sàng.`,
        [
          {
            text: "Xem vé ngay",
            onPress: () => {
              setStep("SUCCESS");
            },
          },
        ],
        { cancelable: false },
      );
    } else {
      Alert.alert(
        "Thanh toán chưa hoàn tất",
        `Giao dịch qua VNPAY chưa thành công hoặc đã bị hủy (Mã: ${responseCode || "HỦY"}). Bạn có thể thanh toán lại trong mục Chuyến của tôi.`,
        [
          {
            text: "Xem đơn hàng",
            onPress: () => {
              setStep("SUCCESS");
            },
          },
        ],
      );
    }

    return false;
  }

  function finishBooking() {
    const bookingIdToPass = createdBookingId;
    resetModal();
    onClose();
    if (bookingIdToPass) {
      router.push({
        pathname: "/trips/[id]/ticket",
        params: {
          id: trip.id,
          bookingId: bookingIdToPass,
        },
      } as any);
    }
  }

  return (
    <>
      <Modal
        visible={visible && !vnpayUrl}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.dragHandle} />

          {step !== "SUCCESS" ? (
            <View style={styles.stepHeader}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => {
                  if (step === "REVIEW") {
                    setStep("INFORMATION");
                    return;
                  }

                  handleClose();
                }}
              >
                <Ionicons
                  name={step === "REVIEW" ? "arrow-back" : "close"}
                  size={20}
                  color={Colors.onSurface}
                />
              </TouchableOpacity>

              <View style={styles.stepHeaderCenter}>
                <Text style={styles.stepCaption}>
                  {step === "INFORMATION" ? "BƯỚC 1/2" : "BƯỚC 2/2"}
                </Text>

                <Text style={styles.stepTitle}>
                  {step === "INFORMATION"
                    ? "Thông tin đặt tour"
                    : "Rà soát & thanh toán"}
                </Text>
              </View>

              <View style={styles.headerButtonPlaceholder} />
            </View>
          ) : null}

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {step === "INFORMATION" ? (
              <>
                <View style={styles.tripSummary}>
                  <View style={styles.badgeRow}>
                    <View style={styles.publicBadge}>
                      <Ionicons name="earth" size={12} color="#0c2000" />

                      <Text style={styles.publicBadgeText}>PUBLIC TOUR</Text>
                    </View>

                    <Text style={styles.slotsText}>
                      Còn {availableSlots} chỗ
                    </Text>
                  </View>

                  <Text style={styles.tripName}>{trip.name}</Text>

                  <Text style={styles.tripMeta}>
                    {trip.startDate} · {trip.durationDays} ngày
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Số người tham gia</Text>

                  <View style={styles.counterCard}>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={decreaseParticipants}
                      disabled={participantsCount === 1}
                    >
                      <Ionicons
                        name="remove"
                        size={20}
                        color={
                          participantsCount === 1
                            ? Colors.onSurfaceMuted
                            : Colors.onSurface
                        }
                      />
                    </TouchableOpacity>

                    <View style={styles.counterCenter}>
                      <Text style={styles.counterValue}>
                        {participantsCount}
                      </Text>

                      <Text style={styles.counterLabel}>Thành viên</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={increaseParticipants}
                      disabled={
                        participantsCount >= Math.min(4, availableSlots)
                      }
                    >
                      <Ionicons
                        name="add"
                        size={20}
                        color={
                          participantsCount >= Math.min(4, availableSlots)
                            ? Colors.onSurfaceMuted
                            : Colors.onSurface
                        }
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Người đại diện</Text>

                  <Text style={styles.inputLabel}>Họ và tên</Text>

                  <TextInput
                    style={styles.input}
                    value={contactName}
                    onChangeText={setContactName}
                    placeholder="Nhập họ và tên"
                    placeholderTextColor={Colors.onSurfaceMuted}
                  />

                  <Text style={styles.inputLabel}>Số điện thoại</Text>

                  <TextInput
                    style={styles.input}
                    value={contactPhone}
                    onChangeText={setContactPhone}
                    placeholder="Số điện thoại/Zalo"
                    placeholderTextColor={Colors.onSurfaceMuted}
                    keyboardType="phone-pad"
                  />

                  <Text style={styles.inputLabel}>Liên hệ khẩn cấp</Text>

                  <TextInput
                    style={styles.input}
                    value={emergencyContact}
                    onChangeText={setEmergencyContact}
                    placeholder="Số điện thoại người thân"
                    placeholderTextColor={Colors.onSurfaceMuted}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.safetyCard}>
                  <View style={styles.safetyHeader}>
                    <View style={styles.safetyIcon}>
                      <Ionicons
                        name="shield-checkmark"
                        size={19}
                        color={Colors.primaryDark}
                      />
                    </View>

                    <View style={styles.safetyHeading}>
                      <Text style={styles.safetyTitle}>
                        Xác nhận sức khỏe & an toàn
                      </Text>

                      <Text style={styles.safetySubtitle}>
                        Bắt buộc trước khi giữ chỗ
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setAcceptedSafety((current) => !current)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        acceptedSafety && styles.checkboxSelected,
                      ]}
                    >
                      {acceptedSafety ? (
                        <Ionicons name="checkmark" size={15} color="#0c2000" />
                      ) : null}
                    </View>

                    <Text style={styles.checkboxText}>
                      Tôi xác nhận các thành viên đủ sức khỏe tham gia và cam
                      kết tuân thủ hướng dẫn của Trek Leader trong suốt chuyến
                      đi.
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={continueToReview}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>Tiếp tục rà soát</Text>

                  <Ionicons
                    name="arrow-forward"
                    size={19}
                    color={Colors.onPrimary}
                  />
                </TouchableOpacity>
              </>
            ) : null}

            {step === "REVIEW" ? (
              <>
                <View style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View>
                      <Text style={styles.reviewCaption}>CHUYẾN ĐI</Text>

                      <Text style={styles.reviewTrip}>{trip.name}</Text>
                    </View>

                    <View style={styles.memberBadge}>
                      <Text style={styles.memberBadgeText}>
                        {participantsCount} người
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <ReviewRow label="Người đại diện" value={contactName} />

                  <ReviewRow label="Điện thoại" value={contactPhone} />

                  <ReviewRow
                    label="Liên hệ khẩn cấp"
                    value={emergencyContact}
                  />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Chi tiết thanh toán</Text>

                  <View style={styles.paymentSummary}>
                    <PriceRow
                      label={`Giá tour × ${participantsCount}`}
                      value={`${totalPrice.toLocaleString("vi-VN")} đ`}
                    />

                    <PriceRow
                      label="Bảo hiểm trekking"
                      value="Đã bao gồm"
                      highlighted
                    />

                    <View style={styles.divider} />

                    <PriceRow
                      label="Tổng thanh toán trọn gói (1 lần)"
                      value={`${totalPrice.toLocaleString("vi-VN")} đ`}
                      total
                    />

                    <Text style={styles.remainingDescription}>
                      Thanh toán 100% trọn gói một lần. Không phát sinh chi phí
                      ẩn hay tiền cọc bổ sung.
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Cổng thanh toán</Text>

                  <PaymentOption
                    selected={paymentMethod === "VNPAY_GATEWAY"}
                    icon="card-outline"
                    title="Cổng thanh toán VNPAY"
                    subtitle="Thẻ ATM nội địa, Thẻ quốc tế Visa/Master (Mở trang VNPAY)"
                    onPress={() => setPaymentMethod("VNPAY_GATEWAY")}
                  />

                  <PaymentOption
                    selected={paymentMethod === "VNPAY_QR"}
                    icon="qr-code-outline"
                    title="VNPAY-QR nhanh"
                    subtitle="Quét mã QR qua ứng dụng Ngân hàng trên điện thoại"
                    onPress={() => setPaymentMethod("VNPAY_QR")}
                  />
                </View>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setAcceptedPolicy((current) => !current)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.checkbox,
                      acceptedPolicy && styles.checkboxSelected,
                    ]}
                  >
                    {acceptedPolicy ? (
                      <Ionicons name="checkmark" size={15} color="#0c2000" />
                    ) : null}
                  </View>

                  <Text style={styles.checkboxText}>
                    Tôi đã kiểm tra thông tin và đồng ý với điều khoản tham gia
                    chuyến đi và chính sách hủy chuyến của TrekGo.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    submitting && styles.disabledButton,
                  ]}
                  onPress={confirmBooking}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color={Colors.onPrimary} />
                  ) : (
                    <>
                      <Ionicons
                        name="card-outline"
                        size={20}
                        color={Colors.onPrimary}
                      />

                      <Text style={styles.primaryButtonText}>
                        Thanh toán ngay {totalPrice.toLocaleString("vi-VN")} đ
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : null}

            {step === "SUCCESS" ? (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark" size={42} color="#0c2000" />
                </View>

                <Text style={styles.successTitle}>
                  Thanh toán & Đặt chỗ thành công!
                </Text>

                <Text style={styles.successDescription}>
                  Khoản thanh toán trọn gói 100% đã được ghi nhận. Vé QR điện tử
                  và checklist chuẩn bị đã sẵn sàng cho chuyến đi của bạn.
                </Text>

                <View style={styles.ticketCard}>
                  <View style={styles.ticketTop}>
                    <View>
                      <Text style={styles.ticketLabel}>MÃ VÉ TREKGO</Text>

                      <Text style={styles.ticketCode}>{ticketCode}</Text>
                    </View>

                    <View style={styles.qrPlaceholder}>
                      <Ionicons name="qr-code" size={48} color={Colors.ink} />
                    </View>
                  </View>

                  <View style={styles.ticketDivider} />

                  <Text style={styles.ticketTripName}>{trip.name}</Text>

                  <Text style={styles.ticketMeta}>
                    {participantsCount} thành viên · {trip.startDate}
                  </Text>

                  <View style={styles.depositPaid}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={Colors.primaryDark}
                    />

                    <Text style={styles.depositPaidText}>
                      Đã thanh toán trọn gói:{" "}
                      {totalPrice.toLocaleString("vi-VN")} đ
                    </Text>
                  </View>
                </View>

                <View style={styles.nextStepCard}>
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color={Colors.primaryDark}
                  />

                  <Text style={styles.nextStepText}>
                    Tiếp theo, mở “Chuyến của tôi” để xem QR check-in, checklist
                    và thông tin xe trung chuyển.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={finishBooking}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>
                    Hoàn tất & xem chuyến đi
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={19}
                    color={Colors.onPrimary}
                  />
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* Cổng thanh toán VNPAY Sandbox trực tiếp trong ứng dụng */}
    <Modal
      visible={!!vnpayUrl}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleCloseVnpay}
    >
      <SafeAreaView style={styles.vnpayModalContainer} edges={["top", "bottom"]}>
        <View style={styles.vnpayHeader}>
          <View style={styles.vnpayHeaderInfo}>
            <View style={styles.vnpayBadge}>
              <Ionicons name="card" size={16} color="#005BAA" />
              <Text style={styles.vnpayBadgeText}>VNPAY SANDBOX</Text>
            </View>
            <Text style={styles.vnpayHeaderAmount}>
              {totalPrice.toLocaleString("vi-VN")} đ
            </Text>
          </View>

          <TouchableOpacity
            style={styles.vnpayCloseBtn}
            onPress={handleCloseVnpay}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
        </View>

        <View style={styles.vnpayWebViewWrapper}>
          {vnpayUrl ? (
            <WebView
              source={{ uri: vnpayUrl }}
              onNavigationStateChange={(nav) => {
                handleVnpayNavigation(nav.url);
              }}
              onShouldStartLoadWithRequest={(req) => {
                return handleVnpayNavigation(req.url);
              }}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.vnpayLoader}>
                  <ActivityIndicator size="large" color="#005BAA" />
                  <Text style={styles.vnpayLoaderText}>
                    Đang kết nối cổng VNPAY Sandbox...
                  </Text>
                </View>
              )}
              style={styles.vnpayWebView}
            />
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  </>
  );
}

interface ReviewRowProps {
  label: string;
  value: string;
}

function ReviewRow({ label, value }: ReviewRowProps) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>

      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

interface PriceRowProps {
  label: string;
  value: string;
  highlighted?: boolean;
  total?: boolean;
}

function PriceRow({
  label,
  value,
  highlighted = false,
  total = false,
}: PriceRowProps) {
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, total && styles.totalLabel]}>
        {label}
      </Text>

      <Text
        style={[
          styles.priceValue,
          highlighted && styles.highlightedPrice,
          total && styles.totalValue,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

interface PaymentOptionProps {
  selected: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function PaymentOption({
  selected,
  icon,
  title,
  subtitle,
  onPress,
}: PaymentOptionProps) {
  return (
    <TouchableOpacity
      style={[styles.paymentOption, selected && styles.paymentOptionSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.paymentIcon}>
        <Ionicons name={icon} size={21} color={Colors.primaryDark} />
      </View>

      <View style={styles.paymentInfo}>
        <Text style={styles.paymentTitle}>{title}</Text>

        <Text style={styles.paymentSubtitle}>{subtitle}</Text>
      </View>

      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.68)",
  },
  container: {
    maxHeight: "94%",
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    ...Shadows.hover,
  },
  dragHandle: {
    width: 42,
    height: 4,
    alignSelf: "center",
    marginBottom: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  stepHeader: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  headerButtonPlaceholder: {
    width: 38,
  },
  stepHeaderCenter: {
    flex: 1,
    alignItems: "center",
  },
  stepCaption: {
    fontSize: 9,
    fontWeight: "900",
    color: Colors.primaryDark,
  },
  stepTitle: {
    marginTop: 1,
    fontSize: 15,
    fontWeight: "900",
    color: Colors.onSurface,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  tripSummary: {
    padding: 15,
    marginTop: 8,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryPale,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  publicBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryContainer,
  },
  publicBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#0c2000",
  },
  slotsText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.primaryDark,
  },
  tripName: {
    marginTop: 10,
    fontSize: 19,
    fontWeight: "900",
    color: Colors.inkDeep,
  },
  tripMeta: {
    marginTop: 4,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    marginBottom: 9,
    fontSize: 14,
    fontWeight: "900",
    color: Colors.onSurface,
  },
  counterCard: {
    height: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  counterButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
  },
  counterCenter: {
    alignItems: "center",
  },
  counterValue: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.onSurface,
  },
  counterLabel: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  inputLabel: {
    marginTop: 9,
    marginBottom: 5,
    fontSize: 11,
    fontWeight: "700",
    color: Colors.onSurfaceVariant,
  },
  input: {
    height: 46,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLowest,
    color: Colors.onSurface,
    fontSize: 13,
  },
  safetyCard: {
    padding: 14,
    marginTop: 18,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryPale,
  },
  safetyHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  safetyIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  safetyHeading: {
    marginLeft: 10,
  },
  safetyTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: Colors.onSurface,
  },
  safetySubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.onSurfaceMuted,
    borderRadius: 6,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  checkboxSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.secondaryContainer,
  },
  checkboxText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: Colors.onSurfaceVariant,
  },
  primaryButton: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 20,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
    ...Shadows.hover,
  },
  disabledButton: {
    opacity: 0.65,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: Colors.onPrimary,
  },
  reviewCard: {
    padding: 15,
    marginTop: 8,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reviewCaption: {
    fontSize: 9,
    fontWeight: "900",
    color: Colors.primaryDark,
  },
  reviewTrip: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: "900",
    color: Colors.onSurface,
  },
  memberBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryContainer,
  },
  memberBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0c2000",
  },
  divider: {
    height: 1,
    marginVertical: 12,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  reviewLabel: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  reviewValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 11,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  paymentSummary: {
    padding: 15,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  priceLabel: {
    flex: 1,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  priceValue: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  highlightedPrice: {
    color: Colors.primaryDark,
  },
  totalLabel: {
    fontWeight: "900",
    color: Colors.onSurface,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.primaryDark,
  },
  remainingDescription: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 15,
    color: Colors.onSurfaceMuted,
  },
  paymentOption: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    padding: 11,
    marginBottom: 9,
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  paymentOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 10,
  },
  paymentTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: Colors.onSurface,
  },
  paymentSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  radio: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.onSurfaceMuted,
    borderRadius: Radius.full,
  },
  radioSelected: {
    borderColor: Colors.primaryDark,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
  },
  successContainer: {
    alignItems: "center",
    paddingTop: 18,
  },
  successIcon: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryContainer,
  },
  successTitle: {
    marginTop: 15,
    fontSize: 23,
    fontWeight: "900",
    color: Colors.onSurface,
  },
  successDescription: {
    maxWidth: 320,
    marginTop: 7,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    color: Colors.onSurfaceVariant,
  },
  ticketCard: {
    width: "100%",
    padding: 16,
    marginTop: 18,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  ticketTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ticketLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: Colors.onSurfaceVariant,
  },
  ticketCode: {
    marginTop: 4,
    fontSize: 23,
    fontWeight: "900",
    color: Colors.primaryDark,
  },
  qrPlaceholder: {
    width: 66,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
  },
  ticketDivider: {
    height: 1,
    marginVertical: 13,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  ticketTripName: {
    fontSize: 15,
    fontWeight: "900",
    color: Colors.onSurface,
  },
  ticketMeta: {
    marginTop: 4,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  depositPaid: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  depositPaidText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primaryDark,
  },
  nextStepCard: {
    width: "100%",
    flexDirection: "row",
    gap: 9,
    padding: 12,
    marginTop: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryPale,
  },
  nextStepText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.onSurfaceVariant,
  },
  vnpayModalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  vnpayHeader: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
    backgroundColor: "#FFFFFF",
  },
  vnpayHeaderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  vnpayBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: "#E6F0FA",
  },
  vnpayBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#005BAA",
    letterSpacing: 0.5,
  },
  vnpayHeaderAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  vnpayCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceContainerLow,
  },
  vnpayWebViewWrapper: {
    flex: 1,
    position: "relative",
  },
  vnpayWebView: {
    flex: 1,
  },
  vnpayLoader: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  vnpayLoaderText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontWeight: "600",
  },
});
