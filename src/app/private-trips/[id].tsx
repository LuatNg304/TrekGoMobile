import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import {
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { Colors, Radius, Shadows } from "@/constants/theme";
import { useApp } from "@/context/AppContext";

function formatStatus(status: string) {
  if (status === "CANCELLED") {
    return "ĐÃ HỦY";
  }

  if (status === "IN_PROGRESS") {
    return "ĐANG DIỄN RA";
  }

  if (status === "COMPLETED") {
    return "ĐÃ HOÀN THÀNH";
  }

  return "SẮP DIỄN RA";
}

export default function PrivateTripDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const tripId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { trips, user, leavePrivateTrip, cancelPrivateTrip } = useApp();

  const trip = useMemo(
    () => trips.find((current) => current.id === tripId),
    [tripId, trips],
  );

  const isHost = useMemo(() => {
    if (!trip) {
      return false;
    }

    return trip.participants.some(
      (participant) =>
        participant.role === "HOST" &&
        (participant.id === user.id ||
          participant.name.replace(" (Host)", "") === user.name),
    );
  }, [trip, user.id, user.name]);

  const isMember = useMemo(() => {
    if (!trip) {
      return false;
    }

    return trip.participants.some(
      (participant) =>
        participant.id === user.id ||
        participant.name.replace(" (Host)", "") === user.name,
    );
  }, [trip, user.id, user.name]);

  async function shareInvite() {
    if (!trip?.inviteCode) {
      return;
    }

    await Share.share({
      title: "Mời tham gia Private Trip TrekGo",
      message:
        `Tham gia chuyến “${trip.name}” trên TrekGo.\n` +
        `Mã mời: ${trip.inviteCode}\n` +
        `${trip.startDate} · ${trip.destination}`,
    });
  }

  function confirmLeave() {
    if (!trip) {
      return;
    }

    Alert.alert(
      "Rời Private Trip?",
      "Bạn sẽ không còn thấy thông tin riêng của đoàn sau khi rời chuyến.",
      [
        {
          text: "Ở lại",
          style: "cancel",
        },
        {
          text: "Rời chuyến",
          style: "destructive",
          onPress: () => {
            const result = leavePrivateTrip(trip.id);

            if (!result.ok) {
              Alert.alert("Không thể rời chuyến", result.message);
              return;
            }

            Alert.alert("Đã rời chuyến", result.message, [
              {
                text: "Về Chuyến của tôi",
                onPress: () => router.replace("/(tabs)/trips"),
              },
            ]);
          },
        },
      ],
    );
  }

  function confirmCancel() {
    if (!trip) {
      return;
    }

    Alert.alert(
      "Hủy Private Trip?",
      "Tất cả thành viên sẽ nhận trạng thái chuyến đã hủy. Thao tác này chỉ là mock trong phiên demo.",
      [
        {
          text: "Quay lại",
          style: "cancel",
        },
        {
          text: "Hủy chuyến",
          style: "destructive",
          onPress: () => {
            const result = cancelPrivateTrip(trip.id);

            if (!result.ok) {
              Alert.alert("Không thể hủy chuyến", result.message);
              return;
            }

            Alert.alert("Đã hủy Private Trip", result.message);
          },
        },
      ],
    );
  }

  if (!trip || trip.type !== "PRIVATE") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={21} color={Colors.onSurface} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Private Trip</Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="trail-sign-outline"
              size={38}
              color={Colors.primaryDark}
            />
          </View>

          <Text style={styles.emptyTitle}>Không tìm thấy chuyến đi</Text>

          <Text style={styles.emptyDescription}>
            Chuyến có thể đã bị xóa hoặc dữ liệu mock đã được reset.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/(tabs)/trips")}
          >
            <Text style={styles.primaryButtonText}>Về Chuyến của tôi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const trail = trip;
  const remainingSlots = Math.max(0, trip.capacity - trip.enrolledCount);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={21} color={Colors.onSurface} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Chi tiết Private Trip</Text>

        <TouchableOpacity style={styles.backButton} onPress={shareInvite}>
          <Ionicons
            name="share-social-outline"
            size={20}
            color={Colors.primaryDark}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.privatePill}>
              <Ionicons name="lock-closed" size={12} color="#564500" />
              <Text style={styles.privatePillText}>PRIVATE TRIP</Text>
            </View>

            <View
              style={[
                styles.statusPill,
                trip.status === "CANCELLED" && styles.cancelledStatusPill,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  trip.status === "CANCELLED" && styles.cancelledStatusText,
                ]}
              >
                {formatStatus(trip.status)}
              </Text>
            </View>
          </View>

          <Text style={styles.tripName}>{trail.name}</Text>

          <View style={styles.metaRow}>
            <Ionicons
              name="location-outline"
              size={17}
              color={Colors.primaryDark}
            />
            <Text style={styles.metaText}>{trail.destination}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons
              name="calendar-outline"
              size={17}
              color={Colors.primaryDark}
            />
            <Text style={styles.metaText}>
              {trail.startDate} – {trail.endDate}
            </Text>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Ionicons name="time-outline" size={19} color="#725C00" />
              <Text style={styles.summaryValue}>{trail.durationDays} ngày</Text>
              <Text style={styles.summaryLabel}>Thời lượng</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Ionicons
                name="people-outline"
                size={19}
                color={Colors.primaryDark}
              />
              <Text style={styles.summaryValue}>
                {trail.enrolledCount}/{trail.capacity}
              </Text>
              <Text style={styles.summaryLabel}>Thành viên</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Ionicons
                name="person-outline"
                size={19}
                color={Colors.primaryDark}
              />
              <Text style={styles.summaryValue}>{remainingSlots}</Text>
              <Text style={styles.summaryLabel}>Chỗ trống</Text>
            </View>
          </View>
        </View>

        <View style={styles.inviteCard}>
          <View style={styles.sectionHeadingRow}>
            <View style={styles.sectionIconBox}>
              <Ionicons
                name="key-outline"
                size={18}
                color={Colors.primaryDark}
              />
            </View>

            <View style={styles.flexOne}>
              <Text style={styles.sectionTitle}>Mã mời của đoàn</Text>
              <Text style={styles.sectionSubtitle}>
                Chỉ chia sẻ mã này với người bạn muốn mời
              </Text>
            </View>
          </View>

          <View style={styles.codeBox}>
            <Text style={styles.codeText}>
              {trip.inviteCode || "TG-PRIVATE"}
            </Text>

            <TouchableOpacity style={styles.shareButton} onPress={shareInvite}>
              <Ionicons
                name="share-social"
                size={16}
                color={Colors.onPrimary}
              />
              <Text style={styles.shareButtonText}>Chia sẻ mã mời</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeadingRow}>
            <View style={styles.sectionIconBox}>
              <Ionicons name="people" size={18} color={Colors.primaryDark} />
            </View>

            <View style={styles.flexOne}>
              <Text style={styles.sectionTitle}>Thành viên trong đoàn</Text>
              <Text style={styles.sectionSubtitle}>
                {trip.enrolledCount} người đã tham gia
              </Text>
            </View>
          </View>

          <View style={styles.memberList}>
            {trip.participants.map((participant) => (
              <View key={participant.id} style={styles.memberRow}>
                <Image
                  source={{ uri: participant.avatar }}
                  style={styles.memberAvatar}
                />

                <View style={styles.flexOne}>
                  <Text style={styles.memberName}>{participant.name}</Text>
                  <Text style={styles.memberMeta}>
                    {participant.role === "HOST"
                      ? "Người tổ chức chuyến"
                      : "Thành viên"}
                  </Text>
                </View>

                {participant.role === "HOST" ? (
                  <View style={styles.hostBadge}>
                    <Ionicons name="star" size={12} color="#725C00" />
                    <Text style={styles.hostBadgeText}>HOST</Text>
                  </View>
                ) : (
                  <View style={styles.readyBadge}>
                    <Text style={styles.readyBadgeText}>ĐÃ THAM GIA</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeadingRow}>
            <View style={styles.sectionIconBox}>
              <Ionicons
                name="partly-sunny"
                size={18}
                color={Colors.primaryDark}
              />
            </View>

            <View style={styles.flexOne}>
              <Text style={styles.sectionTitle}>Dự báo chuyến đi</Text>
              <Text style={styles.sectionSubtitle}>
                Dữ liệu thời tiết đang dùng mock
              </Text>
            </View>
          </View>

          <View style={styles.weatherRow}>
            <View>
              <Text style={styles.weatherTemperature}>
                {trip.weather.tempC}°C
              </Text>
              <Text style={styles.weatherCondition}>
                {trip.weather.condition}
              </Text>
            </View>

            <View style={styles.weatherMetaBox}>
              <Text style={styles.weatherMetaText}>
                Mưa {trip.weather.rainChancePercent}%
              </Text>
              <Text style={styles.weatherMetaText}>
                Gió {trip.weather.windSpeedKmh} km/h
              </Text>
            </View>
          </View>

          {trip.weather.riskNotice ? (
            <View style={styles.weatherNotice}>
              <Ionicons name="warning-outline" size={17} color="#7A5700" />
              <Text style={styles.weatherNoticeText}>
                {trip.weather.riskNotice}
              </Text>
            </View>
          ) : null}
        </View>

        {trip.status !== "CANCELLED" && isHost ? (
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>Quản lý chuyến của Host</Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={shareInvite}
            >
              <Ionicons
                name="person-add-outline"
                size={19}
                color={Colors.onPrimary}
              />
              <Text style={styles.primaryButtonText}>Mời thêm thành viên</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dangerButton}
              onPress={confirmCancel}
            >
              <Ionicons name="close-circle-outline" size={18} color="#B91C1C" />
              <Text style={styles.dangerButtonText}>Hủy Private Trip</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {trip.status !== "CANCELLED" && isMember && !isHost ? (
          <TouchableOpacity style={styles.dangerButton} onPress={confirmLeave}>
            <Ionicons name="exit-outline" size={18} color="#B91C1C" />
            <Text style={styles.dangerButtonText}>Rời khỏi chuyến đi</Text>
          </TouchableOpacity>
        ) : null}

        {trip.status === "CANCELLED" ? (
          <View style={styles.cancelledNotice}>
            <Ionicons name="close-circle" size={22} color="#B91C1C" />
            <View style={styles.flexOne}>
              <Text style={styles.cancelledTitle}>Private Trip đã bị hủy</Text>
              <Text style={styles.cancelledDescription}>
                Dữ liệu sẽ trở về trạng thái ban đầu khi reload mock app.
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
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
  headerBar: {
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
  },
  headerTitle: {
    color: Colors.onSurface,
    fontSize: 16,
    fontWeight: "900",
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 42,
  },
  heroCard: {
    padding: 18,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.hover,
  },
  heroTopRow: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  privatePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.tertiaryFixed,
  },
  privatePillText: {
    color: "#564500",
    fontSize: 10,
    fontWeight: "900",
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryPale,
  },
  statusText: {
    color: Colors.primaryDark,
    fontSize: 9,
    fontWeight: "900",
  },
  cancelledStatusPill: {
    backgroundColor: "#FEE2E2",
  },
  cancelledStatusText: {
    color: "#B91C1C",
  },
  tripName: {
    marginBottom: 12,
    color: Colors.onSurface,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  metaRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    flex: 1,
    color: Colors.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 19,
  },
  summaryGrid: {
    marginTop: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 45,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  summaryValue: {
    marginTop: 4,
    color: Colors.onSurface,
    fontSize: 14,
    fontWeight: "900",
  },
  summaryLabel: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontSize: 9,
  },
  inviteCard: {
    marginTop: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F5CF55",
    borderRadius: Radius.xl,
    backgroundColor: "#FFF9E6",
  },
  sectionCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIconBox: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryPale,
  },
  sectionTitle: {
    color: Colors.onSurface,
    fontSize: 14,
    fontWeight: "900",
  },
  sectionSubtitle: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
  },
  codeBox: {
    marginTop: 14,
    alignItems: "center",
  },
  codeText: {
    color: "#231B00",
    fontFamily: "monospace",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 3,
  },
  shareButton: {
    minHeight: 42,
    marginTop: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
  },
  shareButtonText: {
    color: Colors.onPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
  memberList: {
    marginTop: 12,
  },
  memberRow: {
    minHeight: 58,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  memberName: {
    color: Colors.onSurface,
    fontSize: 13,
    fontWeight: "800",
  },
  memberMeta: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
  },
  hostBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.tertiaryFixed,
  },
  hostBadgeText: {
    color: "#725C00",
    fontSize: 9,
    fontWeight: "900",
  },
  readyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryPale,
  },
  readyBadgeText: {
    color: Colors.primaryDark,
    fontSize: 8,
    fontWeight: "900",
  },
  weatherRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  weatherTemperature: {
    color: Colors.onSurface,
    fontSize: 28,
    fontWeight: "900",
  },
  weatherCondition: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontSize: 12,
  },
  weatherMetaBox: {
    gap: 4,
    alignItems: "flex-end",
  },
  weatherMetaText: {
    color: Colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: "700",
  },
  weatherNotice: {
    marginTop: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: Radius.md,
    backgroundColor: "#FFF7D6",
  },
  weatherNoticeText: {
    flex: 1,
    color: "#725C00",
    fontSize: 11,
    lineHeight: 16,
  },
  actionCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  actionTitle: {
    marginBottom: 12,
    color: Colors.onSurface,
    fontSize: 14,
    fontWeight: "900",
  },
  primaryButton: {
    minHeight: 50,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
  },
  primaryButtonText: {
    color: Colors.onPrimary,
    fontSize: 14,
    fontWeight: "900",
  },
  dangerButton: {
    minHeight: 46,
    marginTop: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: Radius.full,
    backgroundColor: "#FEF2F2",
  },
  dangerButtonText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "900",
  },
  cancelledNotice: {
    marginTop: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: Radius.lg,
    backgroundColor: "#FEF2F2",
  },
  cancelledTitle: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "900",
  },
  cancelledDescription: {
    marginTop: 3,
    color: "#B91C1C",
    fontSize: 10,
    lineHeight: 15,
  },
  emptyState: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    width: 74,
    height: 74,
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 37,
    backgroundColor: Colors.primaryPale,
  },
  emptyTitle: {
    color: Colors.onSurface,
    fontSize: 18,
    fontWeight: "900",
  },
  emptyDescription: {
    marginTop: 6,
    marginBottom: 18,
    color: Colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
