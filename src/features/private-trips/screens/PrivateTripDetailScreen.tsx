import { Colors, Radius } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
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
import {
  CancelTripModal,
  InviteShareModal,
  PrivateTripHero,
  PrivateTripPickupCard,
  PrivateTripRouteTimeline,
} from "../components";
import { useCancelPrivateTrip } from "../hooks/useCancelPrivateTrip";
import { usePrivateTripDetail } from "../hooks/usePrivateTripDetail";
import { useTripInvitation } from "../hooks/useTripInvitation";

export interface PrivateTripDetailScreenProps {
  tripId?: string;
  isHost?: boolean;
}

export function PrivateTripDetailScreen({
  tripId: propTripId,
  isHost: propIsHost,
}: PrivateTripDetailScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const tripId =
    propTripId || (Array.isArray(params.id) ? params.id[0] : params.id);

  // Use custom hooks for real API integration
  const { trip, setTrip, loading, error, refetch } = usePrivateTripDetail(tripId);
  const { cancelTrip, loading: cancelling } = useCancelPrivateTrip();
  const {
    inviteData,
    loading: generatingInvite,
    generateInvite,
  } = useTripInvitation();

  // Modals state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  async function handleOpenInviteModal() {
    if (!trip) return;
    setShowInviteModal(true);

    if (!inviteData) {
      try {
        const res = await generateInvite(trip.id, trip.version);
        setTrip((prev) => (prev ? { ...prev, version: res.tripVersion } : prev));
      } catch (err: any) {
        Alert.alert(
          "Lỗi tạo mã mời",
          err?.message || "Không thể tạo mã mời lúc này.",
        );
      }
    }
  }

  async function handleRegenerateInvite() {
    if (!trip) return;
    try {
      const res = await generateInvite(trip.id, trip.version);
      setTrip((prev) => (prev ? { ...prev, version: res.tripVersion } : prev));
    } catch (err: any) {
      Alert.alert(
        "Lỗi tạo lại mã",
        err?.message || "Không thể tạo mã mới lúc này.",
      );
    }
  }

  async function handleConfirmCancel(reason: string) {
    if (!trip) return;
    try {
      const updated = await cancelTrip(trip.id, trip.version, reason);
      setShowCancelModal(false);
      setTrip(updated);
      Alert.alert("Đã hủy chuyến", "Chuyến đi riêng của bạn đã được hủy thành công.");
    } catch (err: any) {
      if (err?.code === "PRIVATE_TRIP_VERSION_CONFLICT") {
        Alert.alert(
          "Xung đột phiên bản",
          "Thông tin chuyến đi vừa được cập nhật bởi thao tác khác. Đang tải lại dữ liệu...",
          [{ text: "Tải lại", onPress: () => void refetch() }],
        );
      } else {
        Alert.alert("Lỗi hủy chuyến", err?.message || "Không thể hủy chuyến.");
      }
    }
  }

  function handleGoToRoom() {
    if (!tripId) return;
    router.push({
      pathname: "/private-trips/[id]/room",
      params: { id: tripId },
    } as any);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primaryDark} />
          <Text style={styles.loadingText}>Đang tải chi tiết chuyến đi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !trip) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết chuyến đi</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={44} color="#DC2626" />
          <Text style={styles.errorTitle}>Không tìm thấy chuyến đi</Text>
          <Text style={styles.errorSubtitle}>
            {error || "Chuyến đi có thể đã bị xóa hoặc bạn không có quyền truy cập."}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.replace("/(tabs)/trips")}
          >
            <Text style={styles.retryButtonText}>Về Chuyến của tôi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isHost = propIsHost ?? true;
  const isCancelled = trip.status === "CANCELLED";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {trip.title}
        </Text>

        {!isCancelled && isHost ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleOpenInviteModal}
          >
            <Ionicons
              name="share-social-outline"
              size={20}
              color={Colors.primaryDark}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <PrivateTripHero trip={trip} activeMemberCount={1} />

        {/* Pickup Point Card */}
        <PrivateTripPickupCard pickupPoint={trip.pickupPoint} />

        {/* Route / Checkpoints Timeline */}
        {trip.tripCheckpointsViaTripId && trip.tripCheckpointsViaTripId.length > 0 ? (
          <PrivateTripRouteTimeline
            checkpoints={trip.tripCheckpointsViaTripId}
            trailName={trip.tripTrailPlansViaTripId?.[0]?.snapshotName}
          />
        ) : null}

        {/* Primary Action Buttons */}
        {!isCancelled ? (
          <View style={styles.actionGroup}>
            <TouchableOpacity
              style={styles.roomButton}
              onPress={handleGoToRoom}
              activeOpacity={0.88}
            >
              <Ionicons name="chatbubbles-outline" size={19} color="#FFFFFF" />
              <Text style={styles.roomButtonText}>Vào phòng chờ chuyến đi</Text>
            </TouchableOpacity>

            {isHost ? (
              <TouchableOpacity
                style={styles.cancelTripButton}
                onPress={() => setShowCancelModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                <Text style={styles.cancelTripButtonText}>Hủy chuyến đi này</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* Modals */}
      <CancelTripModal
        visible={showCancelModal}
        loading={cancelling}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
      />

      <InviteShareModal
        visible={showInviteModal}
        inviteCode={inviteData?.inviteCode}
        inviteUrl={inviteData?.inviteUrl}
        tripTitle={trip.title}
        loading={generatingInvite}
        onClose={() => setShowInviteModal(false)}
        onGenerateNewCode={handleRegenerateInvite}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  headerBar: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: Colors.onSurface,
    textAlign: "center",
    marginHorizontal: 12,
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
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.onSurface,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: "center",
    lineHeight: 18,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  actionGroup: {
    marginTop: 8,
    gap: 12,
  },
  roomButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
  },
  roomButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cancelTripButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.full,
    backgroundColor: "#FEE2E2",
  },
  cancelTripButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
});
