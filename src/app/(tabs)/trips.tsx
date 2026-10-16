import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { TopHeader } from "@/components/TopHeader";
import { TripPrepModal } from "@/components/TripPrepModal";
import { Colors, Radius, Shadows } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/features/auth/AuthContext";
import { BookingCard } from "@/features/bookings/components";
import { useMyBookings } from "@/features/bookings/hooks";
import { TripCard } from "@/features/trips/components";
import { usePublicTrips } from "@/features/trips/hooks";

type TripFilter = "UPCOMING" | "PENDING" | "EXPLORE" | "HISTORY";

const completedTrip = {
  id: "trip-bidoup-completed",
  name: "Bidoup – Núi Bà (2N1Đ)",
  destination: "Lạc Dương, Lâm Đồng",
  date: "18 – 19 Tháng 08, 2026",
  duration: "2 ngày 1 đêm",
  leader: "Leader Hoàng Nam",
  distance: "27 km",
  elevation: "2.287 m",
  members: 11,
  reviewed: false,
};

export default function TripsScreen() {
  const router = useRouter();
  const { trips, activeTrip } = useApp();
  const { accessToken } = useAuth();

  // Real backend bookings & public trips
  const {
    bookings,
    isLoading: loadingBookings,
    refetch: refetchBookings,
  } = useMyBookings();

  const {
    trips: publicTripsList,
    loading: loadingPublicTrips,
    refresh: refreshPublicTrips,
  } = usePublicTrips({ pageSize: 20 });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchBookings(), refreshPublicTrips()]);
    setRefreshing(false);
  }, [refetchBookings, refreshPublicTrips]);

  // Split bookings by status
  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.status === "PENDING_PAYMENT"),
    [bookings],
  );

  const confirmedBookings = useMemo(
    () =>
      bookings.filter((b) =>
        ["CONFIRMED", "CHECKED_IN", "PARTIAL_CHECKIN"].includes(b.status),
      ),
    [bookings],
  );

  const historyBookings = useMemo(
    () =>
      bookings.filter((b) =>
        ["COMPLETED", "CANCELLED", "EXPIRED", "NO_SHOW"].includes(b.status),
      ),
    [bookings],
  );

  const [activeFilter, setActiveFilter] = useState<TripFilter>(
    pendingBookings.length > 0 ? "PENDING" : "UPCOMING",
  );

  const [prepModalVisible, setPrepModalVisible] = useState(false);

  function openTripDetail(tripId: string) {
    router.push({
      pathname: "/trips/[id]",
      params: {
        id: tripId,
      },
    } as unknown as Href);
  }

  function openTicket() {
    router.push({
      pathname: "/trips/[id]/ticket",
      params: {
        id: activeTrip.id,
      },
    } as unknown as Href);
  }

  function openReview() {
    router.push({
      pathname: "/trips/[id]/review",
      params: {
        id: completedTrip.id,
        name: completedTrip.name,
        leader: completedTrip.leader,
        date: completedTrip.date,
      },
    } as unknown as Href);
  }

  function renderFilters() {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.subFilterRow}
      >
        <TouchableOpacity
          style={[
            styles.subFilterChip,
            activeFilter === "UPCOMING" && styles.subFilterChipActive,
          ]}
          onPress={() => setActiveFilter("UPCOMING")}
        >
          <Text
            style={[
              styles.subFilterText,
              activeFilter === "UPCOMING" && styles.subFilterTextActive,
            ]}
          >
            Sắp tới
          </Text>

          {confirmedBookings.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{confirmedBookings.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.subFilterChip,
            activeFilter === "PENDING" && styles.subFilterChipActive,
            pendingBookings.length > 0 && { borderColor: "#D97706", borderWidth: 1 },
          ]}
          onPress={() => setActiveFilter("PENDING")}
        >
          <Text
            style={[
              styles.subFilterText,
              activeFilter === "PENDING" && styles.subFilterTextActive,
            ]}
          >
            Chờ thanh toán
          </Text>

          {pendingBookings.length > 0 && (
            <View style={styles.pendingCountBadge}>
              <Text style={styles.pendingCountBadgeText}>
                {pendingBookings.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.subFilterChip,
            activeFilter === "EXPLORE" && styles.subFilterChipActive,
          ]}
          onPress={() => setActiveFilter("EXPLORE")}
        >
          <Ionicons
            name="compass-outline"
            size={14}
            color={
              activeFilter === "EXPLORE"
                ? Colors.inverseOnSurface
                : Colors.onSurfaceVariant
            }
          />
          <Text
            style={[
              styles.subFilterText,
              activeFilter === "EXPLORE" && styles.subFilterTextActive,
            ]}
          >
            Khám phá chuyến
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.subFilterChip,
            activeFilter === "HISTORY" && styles.subFilterChipActive,
          ]}
          onPress={() => setActiveFilter("HISTORY")}
        >
          <Text
            style={[
              styles.subFilterText,
              activeFilter === "HISTORY" && styles.subFilterTextActive,
            ]}
          >
            Lịch sử đã đi
          </Text>

          {historyBookings.length > 0 && (
            <View style={styles.historyCountBadge}>
              <Text style={styles.historyCountBadgeText}>
                {historyBookings.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.subFilterChip,
            { backgroundColor: Colors.tertiaryFixed, gap: 5 },
          ]}
          onPress={() => router.push("/private-trips" as any)}
        >
          <Ionicons name="lock-closed" size={13} color="#564500" />
          <Text style={[styles.subFilterText, { color: "#564500", fontWeight: "700" }]}>
            Chuyến riêng
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.subFilterChip,
            { backgroundColor: Colors.primaryPale, gap: 5 },
          ]}
          onPress={() => router.push("/bookings" as any)}
        >
          <Ionicons name="ticket" size={13} color={Colors.primaryDark} />
          <Text style={[styles.subFilterText, { color: Colors.primaryDark, fontWeight: "700" }]}>
            Tất cả vé
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function renderUpcomingTrips() {
    if (confirmedBookings.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="calendar-outline"
              size={34}
              color={Colors.primaryDark}
            />
          </View>

          <Text style={styles.emptyTitle}>Chưa có chuyến đi sắp tới</Text>

          <Text style={styles.emptyDescription}>
            Hãy khám phá các chuyến đi công khai đang mở bán hoặc tổ chức chuyến đi riêng cùng bạn bè!
          </Text>

          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setActiveFilter("EXPLORE")}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyButtonText}>Khám phá chuyến mở bán</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.createTripBanner, { marginTop: 24 }]}
            onPress={() => router.push("/private-trips/create" as any)}
            activeOpacity={0.85}
          >
            <View style={styles.createTripIcon}>
              <Ionicons name="add" size={24} color={Colors.onPrimary} />
            </View>

            <View style={styles.flexOne}>
              <Text style={styles.createTripTitle}>Tổ chức chuyến đi riêng</Text>

              <Text style={styles.createTripSub}>
                Chọn cung đường và tạo mã mời riêng tư cho nhóm bạn
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={Colors.primaryDark}
            />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: 16 }}>
        {confirmedBookings.map((b) => (
          <View key={b.id} style={{ marginBottom: 14 }}>
            <BookingCard
              booking={b}
              onPress={() =>
                router.push({
                  pathname: "/bookings/[id]",
                  params: { id: b.id },
                } as any)
              }
            />
          </View>
        ))}

        <TouchableOpacity
          style={styles.createTripBanner}
          onPress={() => router.push("/private-trips/create" as any)}
          activeOpacity={0.85}
        >
          <View style={styles.createTripIcon}>
            <Ionicons name="add" size={24} color={Colors.onPrimary} />
          </View>

          <View style={styles.flexOne}>
            <Text style={styles.createTripTitle}>Tổ chức chuyến đi riêng</Text>

            <Text style={styles.createTripSub}>
              Chọn cung đường và tạo mã mời riêng tư cho nhóm bạn
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={Colors.primaryDark}
          />
        </TouchableOpacity>
      </View>
    );
  }

  function renderPendingTrips() {
    if (pendingBookings.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="time-outline"
              size={34}
              color={Colors.primaryDark}
            />
          </View>

          <Text style={styles.emptyTitle}>Không có đơn chờ thanh toán</Text>

          <Text style={styles.emptyDescription}>
            Tất cả các đơn đặt chỗ của bạn đã được thanh toán hoặc chưa có đơn giữ chỗ nào.
          </Text>

          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setActiveFilter("EXPLORE")}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyButtonText}>Khám phá chuyến mở bán</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.pendingHeaderNotice}>
          <Ionicons name="alert-circle" size={18} color="#D97706" />
          <Text style={styles.pendingHeaderNoticeText}>
            Bạn có {pendingBookings.length} đơn giữ chỗ đang chờ thanh toán. Vui lòng hoàn tất thanh toán trước khi hết hạn!
          </Text>
        </View>

        {pendingBookings.map((b) => (
          <View key={b.id} style={{ marginBottom: 14 }}>
            <BookingCard
              booking={b}
              onPress={() =>
                router.push({
                  pathname: "/bookings/[id]",
                  params: { id: b.id },
                } as any)
              }
            />
          </View>
        ))}
      </View>
    );
  }

  function renderExploreTrips() {
    if (loadingPublicTrips && publicTripsList.length === 0) {
      return (
        <View style={[styles.emptyState, { paddingVertical: 40 }]}>
          <ActivityIndicator size="large" color={Colors.primaryDark} />
          <Text style={[styles.emptyDescription, { marginTop: 12 }]}>
            Đang tải danh sách chuyến đi mở bán...
          </Text>
        </View>
      );
    }

    if (publicTripsList.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="compass-outline"
              size={34}
              color={Colors.primaryDark}
            />
          </View>

          <Text style={styles.emptyTitle}>Chưa có chuyến đi công khai nào</Text>

          <Text style={styles.emptyDescription}>
            Hiện tại chưa có chuyến đi công khai nào đang mở bán. Vui lòng quay lại sau!
          </Text>
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: 16 }}>
        {publicTripsList.map((pt) => (
          <TripCard
            key={pt.id}
            trip={pt}
            onPress={() => openTripDetail(pt.id)}
          />
        ))}
      </View>
    );
  }

  function renderHistory() {
    if (historyBookings.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="file-tray-outline"
              size={34}
              color={Colors.primaryDark}
            />
          </View>

          <Text style={styles.emptyTitle}>Chưa có lịch sử chuyến đi</Text>

          <Text style={styles.emptyDescription}>
            Các chuyến đi đã hoàn thành hoặc đã hủy sẽ được lưu trữ tại đây.
          </Text>

          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setActiveFilter("EXPLORE")}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyButtonText}>Khám phá chuyến mở bán</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: 16 }}>
        {historyBookings.map((b) => (
          <View key={b.id} style={{ marginBottom: 14 }}>
            <BookingCard
              booking={b}
              onPress={() =>
                router.push({
                  pathname: "/bookings/[id]",
                  params: { id: b.id },
                } as any)
              }
            />
          </View>
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopHeader subtitle="Trips" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primaryDark}
            colors={[Colors.primaryDark]}
          />
        }
      >
        <View style={styles.segmentContainer}>
          <View style={styles.segmentBox}>
            <TouchableOpacity
              style={[styles.segmentBtn, styles.segmentBtnActive]}
            >
              <Ionicons name="briefcase" size={16} color={Colors.onPrimary} />

              <Text style={styles.segmentBtnTextActive}>Chuyến của tôi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.segmentBtn}
              onPress={() => router.push("/(tabs)/rental")}
            >
              <Ionicons
                name="basket-outline"
                size={16}
                color={Colors.onSurfaceVariant}
              />

              <Text style={styles.segmentBtnText}>Thuê thiết bị</Text>
            </TouchableOpacity>
          </View>
        </View>

        {renderFilters()}

        {activeFilter === "UPCOMING" && renderUpcomingTrips()}

        {activeFilter === "PENDING" && renderPendingTrips()}

        {activeFilter === "EXPLORE" && renderExploreTrips()}

        {activeFilter === "HISTORY" && renderHistory()}
      </ScrollView>

      <TripPrepModal
        visible={prepModalVisible}
        trip={activeTrip}
        onClose={() => setPrepModalVisible(false)}
        onStartNavigation={() => router.push("/navigation")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  segmentContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  segmentBox: {
    padding: 3,
    flexDirection: "row",
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: Radius.full,
  },
  segmentBtnActive: {
    backgroundColor: Colors.primaryContainer,
    ...Shadows.card,
  },
  segmentBtnText: {
    color: Colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: "700",
  },
  segmentBtnTextActive: {
    color: Colors.onPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  subFilterRow: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    gap: 8,
  },
  subFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  subFilterChipActive: {
    backgroundColor: Colors.ink,
  },
  subFilterText: {
    color: Colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: "600",
  },
  subFilterTextActive: {
    color: Colors.inverseOnSurface,
    fontWeight: "700",
  },
  countBadge: {
    width: 17,
    height: 17,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  countBadgeText: {
    color: Colors.onPrimary,
    fontSize: 10,
    fontWeight: "800",
  },
  pendingCountBadge: {
    width: 17,
    height: 17,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: "#F59E0B",
  },
  pendingCountBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  historyCountBadge: {
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  historyCountBadgeText: {
    color: Colors.onSurface,
    fontSize: 9,
    fontWeight: "800",
  },
  pendingHeaderNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  pendingHeaderNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
    lineHeight: 17,
  },
  tripCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.hover,
  },
  tripCardTop: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leaderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryContainer,
  },
  leaderBadgeText: {
    color: "#0C2000",
    fontSize: 10,
    fontWeight: "800",
  },
  confirmedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
  },
  confirmedText: {
    color: Colors.onPrimaryContainer,
    fontSize: 9,
    fontWeight: "800",
  },
  tripDetails: {
    marginBottom: 12,
  },
  tripTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tripTitle: {
    flex: 1,
    color: Colors.onSurface,
    fontSize: 18,
    fontWeight: "900",
  },
  tripTimeRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tripTimeText: {
    flex: 1,
    color: Colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 17,
  },
  logisticsBox: {
    marginBottom: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
  },
  busIconBox: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryContainer,
  },
  logisticsTitle: {
    color: Colors.onSurface,
    fontSize: 12,
    fontWeight: "700",
  },
  logisticsSub: {
    marginTop: 1,
    color: Colors.onSurfaceVariant,
    fontSize: 11,
  },
  quickGrid: {
    marginBottom: 14,
    flexDirection: "row",
    gap: 8,
  },
  quickTile: {
    flex: 1,
    minWidth: 0,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
  },
  quickTileLabel: {
    color: Colors.onSurfaceVariant,
    fontSize: 10,
  },
  quickTileVal: {
    color: Colors.onSurface,
    fontSize: 12,
    fontWeight: "700",
  },
  quickRentalValue: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
  },
  ticketBtn: {
    minHeight: 58,
    marginBottom: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  ticketIconBox: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryPale,
  },
  ticketBtnText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
  ticketBtnSubtext: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  prepBtn: {
    flex: 3,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.inverseSurface,
  },
  prepBtnText: {
    color: Colors.inverseOnSurface,
    fontSize: 13,
    fontWeight: "700",
  },
  gpsLiveBtn: {
    flex: 2,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
  },
  gpsLiveBtnText: {
    color: Colors.onPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  privateTripCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  privateTop: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  privatePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.tertiaryFixed,
  },
  privatePillText: {
    color: "#564500",
    fontSize: 10,
    fontWeight: "800",
  },
  hostText: {
    color: Colors.primaryDark,
    fontSize: 11,
    fontWeight: "700",
  },
  privateTitle: {
    color: Colors.onSurface,
    fontSize: 16,
    fontWeight: "800",
  },
  privateSub: {
    marginTop: 2,
    marginBottom: 12,
    color: Colors.onSurfaceVariant,
    fontSize: 12,
  },
  participantsBox: {
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
  },
  avatarStack: {
    flexDirection: "row",
  },
  avatarCircle: {
    width: 28,
    height: 28,
    marginRight: -8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.full,
  },
  avatarGreen: {
    backgroundColor: "#47672D",
  },
  avatarDarkGreen: {
    backgroundColor: "#2F6C00",
  },
  avatarGold: {
    backgroundColor: "#725C00",
  },
  avatarMore: {
    backgroundColor: Colors.surfaceContainerHighest,
  },
  avatarLetter: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  avatarMoreText: {
    color: Colors.onSurface,
    fontSize: 11,
    fontWeight: "800",
  },
  inviteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  inviteBtnText: {
    color: Colors.primaryDark,
    fontSize: 11,
    fontWeight: "700",
  },
  createTripBanner: {
    marginHorizontal: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryPale,
    ...Shadows.card,
  },
  createTripIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
  },
  createTripTitle: {
    color: Colors.inkDeep,
    fontSize: 14,
    fontWeight: "800",
  },
  createTripSub: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 15,
  },
  pendingCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  pendingCardTop: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pendingStatusPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: Radius.full,
    backgroundColor: "#FFF1BF",
  },
  pendingStatusText: {
    color: "#7A5700",
    fontSize: 9,
    fontWeight: "900",
  },
  pendingPrice: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: "900",
  },
  pendingTripName: {
    marginBottom: 10,
    color: Colors.onSurface,
    fontSize: 19,
    fontWeight: "900",
  },
  infoRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    flex: 1,
    color: Colors.onSurfaceVariant,
    fontSize: 12,
  },
  pendingNotice: {
    marginTop: 14,
    padding: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: Radius.md,
    backgroundColor: "#FFF7D6",
  },
  pendingNoticeText: {
    flex: 1,
    color: "#6B5200",
    fontSize: 11,
    lineHeight: 16,
  },
  outlineButton: {
    minHeight: 46,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
    borderRadius: Radius.full,
  },
  outlineButtonText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
  emptyState: {
    marginHorizontal: 16,
    paddingHorizontal: 24,
    paddingVertical: 42,
    alignItems: "center",
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 34,
    backgroundColor: Colors.primaryPale,
  },
  emptyTitle: {
    color: Colors.onSurface,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyDescription: {
    marginTop: 7,
    color: Colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  emptyButton: {
    minHeight: 44,
    marginTop: 18,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  historyCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.hover,
  },
  historyTop: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  completedPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: Radius.full,
    backgroundColor: "#DFF4E7",
  },
  completedText: {
    color: "#1B4332",
    fontSize: 9,
    fontWeight: "900",
  },
  historyDate: {
    color: Colors.onSurfaceVariant,
    fontSize: 10,
  },
  historyTripName: {
    color: Colors.onSurface,
    fontSize: 20,
    fontWeight: "900",
  },
  historyDestination: {
    marginTop: 4,
    color: Colors.onSurfaceVariant,
    fontSize: 12,
  },
  historyStats: {
    marginTop: 16,
    paddingVertical: 12,
    flexDirection: "row",
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
  },
  historyStat: {
    flex: 1,
    alignItems: "center",
  },
  historyStatValue: {
    marginTop: 4,
    color: Colors.onSurface,
    fontSize: 13,
    fontWeight: "900",
  },
  historyStatLabel: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontSize: 9,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  leaderSummary: {
    marginTop: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
  },
  leaderAvatar: {
    width: 38,
    height: 38,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: Colors.primaryDark,
  },
  leaderAvatarText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  leaderLabel: {
    color: Colors.onSurfaceVariant,
    fontSize: 9,
  },
  leaderName: {
    marginTop: 2,
    color: Colors.onSurface,
    fontSize: 12,
    fontWeight: "800",
  },
  ratingSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingSummaryText: {
    color: Colors.onSurface,
    fontSize: 12,
    fontWeight: "800",
  },
  reviewButton: {
    minHeight: 50,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
  },
  reviewButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  cancelBookingButton: {
    minHeight: 44,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: Radius.full,
    backgroundColor: "#FEF2F2",
  },
  cancelBookingButtonText: {
    color: "#B91C1C",
    fontSize: 11,
    fontWeight: "900",
  },
});
