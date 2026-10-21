import { Colors, Radius, Shadows } from "@/constants/theme";
import { useAuth } from "@/features/auth/AuthContext";
import { BookingParticipantsModal } from "@/features/bookings/components";
import { bookingApiService } from "@/features/bookings/services/booking.api";
import type { BookingDetail, BookingSummary } from "@/features/bookings/types";
import {
  TripHeroSection,
  TripLeaderInfo,
  TripPickupInfo,
  TripRouteTimeline,
} from "@/features/trips/components";
import { usePublicTripDetail } from "@/features/trips/hooks";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface PublicTripDetailScreenProps {
  tripId: string;
}

export function PublicTripDetailScreen({
  tripId,
}: PublicTripDetailScreenProps) {
  const router = useRouter();
  const { accessToken } = useAuth();

  const {
    trip,
    loading,
    error,
    refetch,
  } = usePublicTripDetail(tripId, accessToken);

  const [bookingVisible, setBookingVisible] = useState(false);
  const [existingBooking, setExistingBooking] = useState<BookingSummary | BookingDetail | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState<boolean>(false);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // Vòng lặp xoay nút kiểm tra trạng thái thanh toán từ máy chủ
  const startVerificationPolling = useCallback(
    (bookingId: string) => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      setIsVerifyingPayment(true);
      pollCountRef.current = 0;

      const poll = async () => {
        if (!isMountedRef.current) return;
        pollCountRef.current += 1;
        try {
          const detail = await bookingApiService.getBookingDetail(bookingId);
          if (detail.status === "CONFIRMED") {
            setIsVerifyingPayment(false);
            setExistingBooking(detail);
            refetch();
            Alert.alert(
              "Đặt chỗ thành công! 🎉",
              "Hệ thống đã nhận thanh toán và xác nhận đặt chỗ của bạn thành công. Chúc bạn có một hành trình an toàn và trọn vẹn!",
              [
                {
                  text: "Xem vé ngay",
                  onPress: () =>
                    router.push({
                      pathname: "/bookings/[id]",
                      params: { id: detail.id },
                    } as any),
                },
                { text: "Đóng", style: "cancel" },
              ]
            );
            return;
          }
        } catch {
          // Bỏ qua lỗi kết nối trong khi thử lại
        }

        if (pollCountRef.current < 25) {
          pollTimerRef.current = setTimeout(poll, 1500);
        } else {
          setIsVerifyingPayment(false);
        }
      };

      pollTimerRef.current = setTimeout(poll, 1000);
    },
    [refetch, router],
  );

  // Khi màn hình được focus, kiểm tra đặt chỗ của người dùng đối với chuyến này
  useFocusEffect(
    useCallback(() => {
      if (!accessToken || !tripId) return;
      let active = true;

      bookingApiService
        .listMyBookings({ pageSize: 50 })
        .then((res) => {
          if (!active) return;
          const matched = res.items.find(
            (b) =>
              b.trip?.id === tripId &&
              b.status !== "CANCELLED" &&
              b.status !== "EXPIRED"
          );
          if (matched) {
            setExistingBooking(matched);
            if (matched.status === "PENDING_PAYMENT") {
              startVerificationPolling(matched.id);
            }
          }
        })
        .catch(() => {});

      return () => {
        active = false;
      };
    }, [accessToken, tripId, startVerificationPolling])
  );

  const handleBookingSuccess = useCallback(
    (bookingId: string) => {
      setBookingVisible(false);
      refetch();
      startVerificationPolling(bookingId);
      router.push({
        pathname: "/bookings/[id]",
        params: { id: bookingId },
      } as any);
    },
    [refetch, router, startVerificationPolling],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Đang tải chuyến đi...</Text>
      </SafeAreaView>
    );
  }

  if (error || !trip) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={[styles.loadingText, { color: Colors.error }]}>
          {error || "Không tìm thấy chuyến đi."}
        </Text>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
          <TouchableOpacity
            style={[styles.backBtn, { width: "auto", paddingHorizontal: 16 }]}
            onPress={() => router.back()}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.onSurface }}>
              Quay lại
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bookingBtn, { paddingHorizontal: 20, paddingVertical: 10 }]}
            onPress={refetch}
          >
            <Text style={styles.bookingBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isBookable = trip.status === "OPEN" && trip.remainingSlots > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>
            Chi tiết chuyến
          </Text>
          <View style={{ width: 38 }} />
        </View>

        {/* 1. Hero Section */}
        <TripHeroSection trip={trip} />

        {/* 2. Leader Info */}
        <TripLeaderInfo leader={trip.leader} />

        {/* 3. Pickup Point */}
        <TripPickupInfo pickup={trip.pickup} startAt={trip.startAt} />

        {/* 4. Route Timeline & Checkpoints */}
        <TripRouteTimeline
          routes={trip.routes}
          checkpoints={trip.checkpoints}
        />

        {/* Bottom padding for fixed bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarPrice}>
          <Text style={styles.bottomPriceLabel}>Giá vé / người</Text>
          <Text style={styles.bottomPriceValue}>
            {parseFloat(trip.pricePerPax).toLocaleString("vi-VN")}
            <Text style={styles.bottomPriceCurrency}> {trip.currency}</Text>
          </Text>
          <Text style={styles.bottomSlots}>Còn {trip.remainingSlots} chỗ</Text>
        </View>

        {/* Dynamic Booking Button */}
        {isVerifyingPayment ? (
          <View style={[styles.bookingBtn, styles.bookingBtnVerifying]}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.bookingBtnText}>Đang chờ xác nhận...</Text>
          </View>
        ) : existingBooking?.status === "CONFIRMED" ? (
          <TouchableOpacity
            style={[styles.bookingBtn, styles.bookingBtnConfirmed]}
            onPress={() =>
              router.push({
                pathname: "/bookings/[id]",
                params: { id: existingBooking.id },
              } as any)
            }
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
            <Text style={styles.bookingBtnText}>Đã đặt chỗ thành công</Text>
          </TouchableOpacity>
        ) : existingBooking?.status === "PENDING_PAYMENT" ? (
          <TouchableOpacity
            style={[styles.bookingBtn, styles.bookingBtnPending]}
            onPress={() => startVerificationPolling(existingBooking.id)}
            activeOpacity={0.85}
          >
            <Ionicons name="time-outline" size={18} color="#ffffff" />
            <Text style={styles.bookingBtnText}>Kiểm tra thanh toán</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.bookingBtn, !isBookable && styles.bookingBtnDisabled]}
            onPress={() => {
              if (!accessToken) {
                Alert.alert("Chưa đăng nhập", "Vui lòng đăng nhập để đặt chỗ.");
                return;
              }
              setBookingVisible(true);
            }}
            disabled={!isBookable}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={18} color={Colors.onPrimary} />
            <Text style={styles.bookingBtnText}>
              {isBookable ? "Đặt chỗ ngay" : "Hết chỗ"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Booking Modal */}
      {accessToken && bookingVisible && (
        <BookingParticipantsModal
          visible={bookingVisible}
          trip={trip as any}
          onClose={() => setBookingVisible(false)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surface },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: Colors.surface,
  },
  loadingText: { color: Colors.mute, fontSize: 13 },
  scrollContent: { paddingBottom: 20 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.onSurface,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 14,
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerLow,
    ...Shadows.tactical,
  },
  bottomBarPrice: { flex: 1, gap: 1 },
  bottomPriceLabel: { fontSize: 10, color: Colors.mute, fontWeight: "700" },
  bottomPriceValue: { fontSize: 20, fontWeight: "900", color: Colors.onSurface },
  bottomPriceCurrency: { fontSize: 13, fontWeight: "700", color: Colors.mute },
  bottomSlots: { fontSize: 11, color: Colors.primaryDark, fontWeight: "700" },
  bookingBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
  },
  bookingBtnDisabled: { opacity: 0.5 },
  bookingBtnVerifying: {
    backgroundColor: "#15803d",
    opacity: 0.92,
  },
  bookingBtnConfirmed: {
    backgroundColor: "#15803d",
  },
  bookingBtnPending: {
    backgroundColor: "#ca8a04",
  },
  bookingBtnText: { fontSize: 14, fontWeight: "800", color: Colors.onPrimary },
});
