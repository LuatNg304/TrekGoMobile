import { PublicTripDetailScreen } from "@/features/trips/screens";
import { useLocalSearchParams } from "expo-router";

import { BookingModal } from "@/components/BookingModal";
import { Colors, Radius, Shadows } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { PublicTripDetailScreen } from "@/features/trips/screens/PublicTripDetailScreen";
import type { Trip } from "@/types";

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips } = useApp();

  // If this ID belongs to the legacy mock list (starts with 'trip-'), render legacy screen
  const isMockTrip = id?.startsWith("trip-");
  const mockTrip = useMemo(
    () => (isMockTrip ? trips.find((item) => item.id === id) : null),
    [id, isMockTrip, trips],
  );

  if (!isMockTrip && id) {
    return <PublicTripDetailScreen tripId={id} />;
  }

  return <LegacyMockTripDetail trip={mockTrip} />;
}

function LegacyMockTripDetail({ trip }: { trip?: Trip | null }) {
  const router = useRouter();
  const [bookingVisible, setBookingVisible] = useState(false);

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)/trips" as Href);
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Ionicons
            name="map-outline"
            size={54}
            color={Colors.onSurfaceMuted}
          />

          <Text style={styles.emptyTitle}>Không tìm thấy chuyến đi</Text>

          <Text style={styles.emptyDescription}>
            Chuyến đi này có thể đã được cập nhật hoặc không còn khả dụng.
          </Text>

          <TouchableOpacity style={styles.primaryButton} onPress={handleBack}>
            <Text style={styles.primaryButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const availableSlots = Math.max(0, trip.capacity - trip.enrolledCount);

  const isAlreadyBooked = Boolean(trip.bookingCode);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Chi tiết chuyến đi</Text>

        <TouchableOpacity style={styles.headerButton}>
          <Ionicons
            name="bookmark-outline"
            size={21}
            color={Colors.onSurface}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroDecorOne} />
          <View style={styles.heroDecorTwo} />

          <View style={styles.heroBadges}>
            <View style={styles.publicBadge}>
              <Ionicons name="earth" size={13} color="#0c2000" />

              <Text style={styles.publicBadgeText}>PUBLIC TOUR</Text>
            </View>

            <View style={styles.slotBadge}>
              <Text style={styles.slotBadgeText}>Còn {availableSlots} chỗ</Text>
            </View>
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>{trip.destination}</Text>

            <Text style={styles.heroTitle}>{trip.name}</Text>

            <View style={styles.heroMetaRow}>
              <Ionicons
                name="calendar-outline"
                size={15}
                color={Colors.onSurfaceVariant}
              />

              <Text style={styles.heroMetaText}>
                {trip.startDate} – {trip.endDate}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons
              name="time-outline"
              size={21}
              color={Colors.primaryDark}
            />

            <Text style={styles.statValue}>{trip.durationDays} ngày</Text>

            <Text style={styles.statLabel}>Thời lượng</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons
              name="people-outline"
              size={21}
              color={Colors.primaryDark}
            />

            <Text style={styles.statValue}>
              {trip.enrolledCount}/{trip.capacity}
            </Text>

            <Text style={styles.statLabel}>Thành viên</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons
              name="wallet-outline"
              size={21}
              color={Colors.primaryDark}
            />

            <Text style={styles.statValue}>
              {((trip.pricePerPerson ?? 2850000) / 1000000).toFixed(2)}tr
            </Text>

            <Text style={styles.statLabel}>Mỗi người</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Trek Leader</Text>

          <View style={styles.leaderRow}>
            <View style={styles.leaderAvatar}>
              <Ionicons name="person" size={26} color={Colors.onPrimary} />
            </View>

            <View style={styles.leaderInfo}>
              <Text style={styles.leaderName}>{trip.leader.name}</Text>

              <View style={styles.leaderRatingRow}>
                <Ionicons name="star" size={14} color="#e5aa00" />

                <Text style={styles.leaderRating}>
                  {trip.leader.rating.toFixed(1)}
                </Text>

                <Text style={styles.leaderBadgeText}>
                  · {trip.leader.badge}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.contactButton}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={19}
                color={Colors.primaryDark}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionTitle}>Thời tiết dự kiến</Text>

            <View style={styles.weatherStatus}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: trip.weather.rainRisk
                      ? "#e5aa00"
                      : Colors.primary,
                  },
                ]}
              />

              <Text style={styles.weatherStatusText}>
                {trip.weather.rainRisk ? "Có khả năng mưa" : "Điều kiện tốt"}
              </Text>
            </View>
          </View>

          <View style={styles.weatherRow}>
            <View style={styles.weatherIconBox}>
              <Ionicons
                name={trip.weather.rainRisk ? "rainy" : "partly-sunny"}
                size={28}
                color="#725c00"
              />
            </View>

            <View style={styles.weatherMain}>
              <Text style={styles.weatherTemp}>{trip.weather.tempC}°C</Text>

              <Text style={styles.weatherCondition}>
                {trip.weather.condition}
              </Text>
            </View>

            <View style={styles.weatherDetails}>
              <Text style={styles.weatherDetailText}>
                Mưa {trip.weather.rainChancePercent}%
              </Text>

              <Text style={styles.weatherDetailText}>
                Gió {trip.weather.windSpeedKmh} km/h
              </Text>
            </View>
          </View>

          {trip.weather.riskNotice ? (
            <View style={styles.noticeBox}>
              <Ionicons
                name="information-circle-outline"
                size={17}
                color={Colors.primaryDark}
              />

              <Text style={styles.noticeText}>{trip.weather.riskNotice}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Lịch trình dự kiến</Text>

          <View style={styles.timelineItem}>
            <View style={styles.timelineMarker}>
              <Text style={styles.timelineNumber}>1</Text>
            </View>

            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Tập trung và di chuyển</Text>

              <Text style={styles.timelineText}>
                Kiểm tra hành lý, nhận thiết bị và di chuyển đến điểm trekking.
              </Text>
            </View>
          </View>

          <View style={styles.timelineLine} />

          <View style={styles.timelineItem}>
            <View style={styles.timelineMarker}>
              <Text style={styles.timelineNumber}>2</Text>
            </View>

            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Trekking theo cung đường</Text>

              <Text style={styles.timelineText}>
                Đi qua các checkpoint, nghỉ trưa và dựng trại theo hướng dẫn của
                Leader.
              </Text>
            </View>
          </View>

          <View style={styles.timelineLine} />

          <View style={styles.timelineItem}>
            <View style={styles.timelineMarker}>
              <Text style={styles.timelineNumber}>3</Text>
            </View>

            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Hoàn thành chuyến đi</Text>

              <Text style={styles.timelineText}>
                Thu dọn khu cắm trại, kiểm tra thành viên và trở về điểm đón.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Chi phí bao gồm</Text>

          {[
            "Xe trung chuyển hai chiều",
            "Trek Leader và Porter bản địa",
            "Bảo hiểm trekking cơ bản",
            "Nước uống và bữa ăn theo lịch trình",
          ].map((item) => (
            <View key={item} style={styles.includedRow}>
              <View style={styles.checkIcon}>
                <Ionicons name="checkmark" size={14} color="#0c2000" />
              </View>

              <Text style={styles.includedText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.priceSummary}>
          <View>
            <Text style={styles.priceCaption}>Giá mỗi người</Text>

            <Text style={styles.priceValue}>
              {(trip.pricePerPerson ?? 2850000).toLocaleString("vi-VN")} đ
            </Text>
          </View>

          <Text style={styles.slotWarning}>Chỉ còn {availableSlots} chỗ</Text>
        </View>

        <TouchableOpacity
          style={styles.bookingButton}
          activeOpacity={0.85}
          onPress={() => {
            if (isAlreadyBooked) {
              router.replace("/(tabs)/trips" as Href);
              return;
            }

            setBookingVisible(true);
          }}
        >
          <Ionicons
            name={isAlreadyBooked ? "checkmark-circle" : "ticket-outline"}
            size={21}
            color={Colors.onPrimary}
          />

          <Text style={styles.bookingButtonText}>
            {isAlreadyBooked
              ? "Đã đặt chỗ · Xem chuyến của tôi"
              : "Đặt tour ngay"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.policyText}>
          Bạn có thể xem lại chính sách hoàn hủy trước khi xác nhận thanh toán.
        </Text>
      </ScrollView>

      <BookingModal
        visible={bookingVisible}
        trip={trip}
        onClose={() => setBookingVisible(false)}
      />
    </SafeAreaView>
  );
}
