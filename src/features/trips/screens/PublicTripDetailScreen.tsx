import { Colors, Radius, Shadows } from "@/constants/theme";
import { useAuth } from "@/features/auth/AuthContext";
import { BookingParticipantsModal } from "@/features/bookings/components";
import {
  TripHeroSection,
  TripLeaderInfo,
  TripMapSection,
  TripPickupInfo,
  TripRouteTimeline,
} from "@/features/trips/components";
import { usePublicTripDetail } from "@/features/trips/hooks";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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
    trailData,
    loading,
    error,
    refetch,
  } = usePublicTripDetail(tripId, accessToken);

  const [bookingVisible, setBookingVisible] = useState(false);

  const handleBookingSuccess = useCallback(
    (bookingId: string) => {
      setBookingVisible(false);
      refetch();
      router.push({
        pathname: "/bookings/[id]",
        params: { id: bookingId },
      } as any);
    },
    [refetch, router],
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

        {/* 5. 3D Map Section */}
        <TripMapSection trailData={trailData} />

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
  bookingBtnText: { fontSize: 14, fontWeight: "800", color: Colors.onPrimary },
});
