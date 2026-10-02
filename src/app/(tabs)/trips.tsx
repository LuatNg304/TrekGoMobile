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

export default function TripsScreen() {
  const router = useRouter();
  const { trips, activeTrip } = useApp();

  const [activeFilter, setActiveFilter] = useState<TripFilter>("UPCOMING");
  const [prepModalVisible, setPrepModalVisible] = useState(false);
  const [createPrivateModalVisible, setCreatePrivateModalVisible] =
    useState(false);

  function openTicket() {
    router.push({
      pathname: "/trips/[id]/ticket",
      params: {
        id: activeTrip.id,
      },
    } as unknown as Href);
  }

  function openTripDetail() {
    router.push({
      pathname: "/trips/[id]",
      params: {
        id: activeTrip.id,
      },
    } as unknown as Href);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopHeader subtitle="Trips" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Main view switcher */}
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

        {/* Filters */}
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
              Lịch sử đã đi (12)
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Active public trip */}
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
            onPress={openTripDetail}
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

          {/* Logistics */}
          <View style={styles.logisticsBox}>
            <View style={styles.busIconBox}>
              <Ionicons name="bus" size={18} color="#0C2000" />
            </View>

            <View style={styles.logisticsContent}>
              <Text style={styles.logisticsTitle}>
                {activeTrip.logistics?.pickupLocation ??
                  "Điểm tập trung TrekGo"}
              </Text>

              <Text style={styles.logisticsSub}>
                Xe 16 chỗ TrekGo Express
                {activeTrip.logistics?.vehiclePlate
                  ? ` (BKS: ${activeTrip.logistics.vehiclePlate})`
                  : ""}
              </Text>
            </View>
          </View>

          {/* Weather and rental */}
          <View style={styles.quickGrid}>
            <View style={styles.quickTile}>
              <Ionicons name="partly-sunny" size={18} color="#725C00" />

              <View style={styles.quickTileContent}>
                <Text style={styles.quickTileLabel}>Thời tiết</Text>

                <Text style={styles.quickTileVal} numberOfLines={1}>
                  {activeTrip.weather.tempC}°C · Mây rải rác
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.quickTile}
              onPress={() => router.push("/(tabs)/rental")}
            >
              <Ionicons name="basket" size={18} color={Colors.primaryDark} />

              <View style={styles.quickTileContent}>
                <Text style={styles.quickTileLabel}>Đồ đã thuê</Text>

                <Text
                  style={[styles.quickTileVal, styles.rentalQuickValue]}
                  numberOfLines={1}
                >
                  1 món (Đã gán) ›
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Ticket */}
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

            <View style={styles.ticketTextContent}>
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

          {/* Operational actions */}
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
              onPress={() => router.push("/navigation")}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate" size={16} color={Colors.onPrimary} />

              <Text style={styles.gpsLiveBtnText}>Vào GPS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Private trip */}
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
              Dự kiến: Tháng sau · 2 ngày 1 đêm
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

        {/* Create private trip */}
        <TouchableOpacity
          style={styles.createTripBanner}
          onPress={() => setCreatePrivateModalVisible(true)}
          activeOpacity={0.85}
        >
          <View style={styles.createTripIcon}>
            <Ionicons name="add" size={24} color={Colors.onPrimary} />
          </View>

          <View style={styles.createTripContent}>
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
  scrollContent: {
    paddingBottom: 40,
  },
  segmentContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  segmentBox: {
    flexDirection: "row",
    padding: 3,
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
    paddingVertical: 6,
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
    width: 16,
    height: 16,
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
    paddingVertical: 2,
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
    justifyContent: "space-between",
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
  logisticsContent: {
    flex: 1,
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
  quickTileContent: {
    flex: 1,
    minWidth: 0,
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
  rentalQuickValue: {
    color: Colors.primaryDark,
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
  ticketTextContent: {
    flex: 1,
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
  createTripContent: {
    flex: 1,
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
});
