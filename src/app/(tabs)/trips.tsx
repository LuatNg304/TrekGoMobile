import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { CreatePrivateTripModal } from "@/components/CreatePrivateTripModal";
import { TopHeader } from "@/components/TopHeader";
import { TripPrepModal } from "@/components/TripPrepModal";
import { Colors, Radius, Shadows } from "@/constants/theme";
import { useApp } from "@/context/AppContext";

type TripFilter = "UPCOMING" | "PENDING" | "HISTORY";

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

  const [activeFilter, setActiveFilter] = useState<TripFilter>("UPCOMING");

  const [prepModalVisible, setPrepModalVisible] = useState(false);

  const [createPrivateModalVisible, setCreatePrivateModalVisible] =
    useState(false);

  const pendingTrips = trips.filter(
    (trip) =>
      trip.type === "PUBLIC" && trip.status === "UPCOMING" && !trip.bookingCode,
  );

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

          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>2</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.subFilterChip,
            activeFilter === "PENDING" && styles.subFilterChipActive,
          ]}
          onPress={() => setActiveFilter("PENDING")}
        >
          <Text
            style={[
              styles.subFilterText,
              activeFilter === "PENDING" && styles.subFilterTextActive,
            ]}
          >
            Chờ xác nhận
          </Text>

          {pendingTrips.length > 0 && (
            <View style={styles.pendingCountBadge}>
              <Text style={styles.pendingCountBadgeText}>
                {pendingTrips.length}
              </Text>
            </View>
          )}
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

          <View style={styles.historyCountBadge}>
            <Text style={styles.historyCountBadgeText}>12</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function renderUpcomingTrips() {
    return (
      <>
        <View style={styles.tripCard}>
          <View style={styles.tripCardTop}>
            <View style={styles.leaderBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#0C2000" />

              <Text style={styles.leaderBadgeText}>
                Public Tour · Leader Nam 5★
              </Text>
            </View>

            <View style={styles.confirmedBadge}>
              <Text style={styles.confirmedText}>CONFIRMED ✓</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.tripDetails}
            onPress={() => openTripDetail(activeTrip.id)}
            activeOpacity={0.75}
          >
            <View style={styles.tripTitleRow}>
              <Text style={styles.tripTitle}>{activeTrip.name}</Text>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.primaryDark}
              />
            </View>

            <View style={styles.tripTimeRow}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={Colors.primaryDark}
              />

              <Text style={styles.tripTimeText}>
                Khởi hành: 21:00 Thứ Sáu tuần này (3 ngày 2 đêm)
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.logisticsBox}>
            <View style={styles.busIconBox}>
              <Ionicons name="bus" size={18} color="#0C2000" />
            </View>

            <View style={styles.flexOne}>
              <Text style={styles.logisticsTitle}>
                {activeTrip.logistics?.pickupLocation ??
                  "Điểm tập trung TrekGo"}
              </Text>

              <Text style={styles.logisticsSub}>
                TrekGo Express
                {activeTrip.logistics?.vehiclePlate
                  ? ` · ${activeTrip.logistics.vehiclePlate}`
                  : ""}
              </Text>
            </View>
          </View>

          <View style={styles.quickGrid}>
            <View style={styles.quickTile}>
              <Ionicons name="partly-sunny" size={18} color="#725C00" />

              <View style={styles.flexOne}>
                <Text style={styles.quickTileLabel}>Thời tiết</Text>

                <Text style={styles.quickTileVal} numberOfLines={1}>
                  {activeTrip.weather.tempC}°C · {activeTrip.weather.condition}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.quickTile}
              onPress={() => router.push("/(tabs)/rental")}
            >
              <Ionicons name="basket" size={18} color={Colors.primaryDark} />

              <View style={styles.flexOne}>
                <Text style={styles.quickTileLabel}>Đồ đã thuê</Text>

                <Text style={styles.quickRentalValue} numberOfLines={1}>
                  {activeTrip.rentedItemsCount ?? 0} món ›
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.ticketBtn}
            onPress={openTicket}
            activeOpacity={0.85}
          >
            <View style={styles.ticketIconBox}>
              <Ionicons
                name="qr-code-outline"
                size={19}
                color={Colors.primaryDark}
              />
            </View>

            <View style={styles.flexOne}>
              <Text style={styles.ticketBtnText}>Xem vé QR và mã đặt chỗ</Text>

              <Text style={styles.ticketBtnSubtext}>
                Xuất trình khi tập trung và check-in
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={Colors.primaryDark}
            />
          </TouchableOpacity>

          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              style={styles.prepBtn}
              onPress={() => setPrepModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="list" size={16} color={Colors.inverseOnSurface} />

              <Text style={styles.prepBtnText}>Lộ trình & Chuẩn bị</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gpsLiveBtn}
              onPress={() => setPrepModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate" size={16} color={Colors.onPrimary} />

              <Text style={styles.gpsLiveBtnText}>Vào GPS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {trips.length > 1 && (
          <View style={styles.privateTripCard}>
            <View style={styles.privateTop}>
              <View style={styles.privatePill}>
                <Ionicons name="lock-closed" size={12} color="#564500" />

                <Text style={styles.privatePillText}>
                  Private Trip · {trips[1].inviteCode ?? "TG-8F92A"}
                </Text>
              </View>

              <Text style={styles.hostText}>Host: Bạn</Text>
            </View>

            <Text style={styles.privateTitle}>{trips[1].name}</Text>

            <Text style={styles.privateSub}>
              {trips[1].startDate} · {trips[1].durationDays} ngày
            </Text>

            <View style={styles.participantsBox}>
              <View style={styles.avatarStack}>
                <View style={[styles.avatarCircle, styles.avatarGreen]}>
                  <Text style={styles.avatarLetter}>H</Text>
                </View>

                <View style={[styles.avatarCircle, styles.avatarDarkGreen]}>
                  <Text style={styles.avatarLetter}>T</Text>
                </View>

                <View style={[styles.avatarCircle, styles.avatarGold]}>
                  <Text style={styles.avatarLetter}>K</Text>
                </View>

                <View style={[styles.avatarCircle, styles.avatarMore]}>
                  <Text style={styles.avatarMoreText}>+1</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.inviteBtn}
                onPress={() => setCreatePrivateModalVisible(true)}
              >
                <Ionicons
                  name="share-social-outline"
                  size={14}
                  color={Colors.primaryDark}
                />

                <Text style={styles.inviteBtnText}>Mời thành viên</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.createTripBanner}
          onPress={() => setCreatePrivateModalVisible(true)}
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
      </>
    );
  }

  function renderPendingTrips() {
    if (pendingTrips.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="time-outline"
              size={34}
              color={Colors.primaryDark}
            />
          </View>

          <Text style={styles.emptyTitle}>Không có chuyến chờ xác nhận</Text>

          <Text style={styles.emptyDescription}>
            Các chuyến sau khi đặt cọc thành công sẽ được chuyển sang mục Sắp
            tới.
          </Text>

          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.emptyButtonText}>Khám phá chuyến mới</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        {pendingTrips.map((trip) => (
          <View key={trip.id} style={styles.pendingCard}>
            <View style={styles.pendingCardTop}>
              <View style={styles.pendingStatusPill}>
                <Ionicons name="time-outline" size={13} color="#7A5700" />

                <Text style={styles.pendingStatusText}>CHỜ XÁC NHẬN</Text>
              </View>

              <Text style={styles.pendingPrice}>
                {trip.pricePerPerson
                  ? `${trip.pricePerPerson.toLocaleString("vi-VN")}đ`
                  : "Liên hệ"}
              </Text>
            </View>

            <Text style={styles.pendingTripName}>{trip.name}</Text>

            <View style={styles.infoRow}>
              <Ionicons
                name="location-outline"
                size={16}
                color={Colors.primaryDark}
              />

              <Text style={styles.infoText}>{trip.destination}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={Colors.primaryDark}
              />

              <Text style={styles.infoText}>
                {trip.startDate} – {trip.endDate}
              </Text>
            </View>

            <View style={styles.pendingNotice}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#7A5700"
              />

              <Text style={styles.pendingNoticeText}>
                Đang chờ hoàn tất đặt cọc để xác nhận chỗ.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => openTripDetail(trip.id)}
            >
              <Text style={styles.outlineButtonText}>Xem chi tiết chuyến</Text>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={Colors.primaryDark}
              />
            </TouchableOpacity>
          </View>
        ))}
      </>
    );
  }

  function renderHistory() {
    return (
      <View style={styles.historyCard}>
        <View style={styles.historyTop}>
          <View style={styles.completedPill}>
            <Ionicons name="checkmark-circle" size={14} color="#1B4332" />

            <Text style={styles.completedText}>ĐÃ HOÀN THÀNH</Text>
          </View>

          <Text style={styles.historyDate}>{completedTrip.date}</Text>
        </View>

        <Text style={styles.historyTripName}>{completedTrip.name}</Text>

        <Text style={styles.historyDestination}>
          {completedTrip.destination}
        </Text>

        <View style={styles.historyStats}>
          <View style={styles.historyStat}>
            <Ionicons
              name="walk-outline"
              size={18}
              color={Colors.primaryDark}
            />

            <Text style={styles.historyStatValue}>
              {completedTrip.distance}
            </Text>

            <Text style={styles.historyStatLabel}>Quãng đường</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.historyStat}>
            <Ionicons
              name="trending-up-outline"
              size={18}
              color={Colors.primaryDark}
            />

            <Text style={styles.historyStatValue}>
              {completedTrip.elevation}
            </Text>

            <Text style={styles.historyStatLabel}>Độ cao</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.historyStat}>
            <Ionicons
              name="people-outline"
              size={18}
              color={Colors.primaryDark}
            />

            <Text style={styles.historyStatValue}>{completedTrip.members}</Text>

            <Text style={styles.historyStatLabel}>Thành viên</Text>
          </View>
        </View>

        <View style={styles.leaderSummary}>
          <View style={styles.leaderAvatar}>
            <Text style={styles.leaderAvatarText}>HN</Text>
          </View>

          <View style={styles.flexOne}>
            <Text style={styles.leaderLabel}>Dẫn đoàn</Text>

            <Text style={styles.leaderName}>{completedTrip.leader}</Text>
          </View>

          <View style={styles.ratingSummary}>
            <Ionicons name="star" size={14} color="#F59E0B" />

            <Text style={styles.ratingSummaryText}>4.9</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.reviewButton}
          onPress={openReview}
          activeOpacity={0.85}
        >
          <Ionicons name="star-outline" size={19} color="#FFFFFF" />

          <Text style={styles.reviewButtonText}>Đánh giá chuyến đi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopHeader subtitle="Trips" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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

        {activeFilter === "HISTORY" && renderHistory()}
      </ScrollView>

      <TripPrepModal
        visible={prepModalVisible}
        trip={activeTrip}
        onClose={() => setPrepModalVisible(false)}
        onStartNavigation={() => router.push("/navigation")}
      />

      <CreatePrivateTripModal
        visible={createPrivateModalVisible}
        onClose={() => setCreatePrivateModalVisible(false)}
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
});
