import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { TopHeader } from '@/components/TopHeader';
import { useApp } from '@/context/AppContext';
import { TripPrepModal } from '@/components/TripPrepModal';
import { CreatePrivateTripModal } from '@/components/CreatePrivateTripModal';
import { BookingModal } from '@/components/BookingModal';
import { Trail } from '@/types';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { user, activeTrip, trails } = useApp();

  const [tripPrepVisible, setTripPrepVisible] = useState(false);
  const [createPrivateVisible, setCreatePrivateVisible] = useState(false);
  const [bookingVisible, setBookingVisible] = useState(false);
  const [selectedTrailForBooking, setSelectedTrailForBooking] = useState<Trail | null>(null);

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopHeader subtitle="Home" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. GREETING & WEATHER STATUS BANNER */}
        <View style={styles.greetingSection}>
          <View style={styles.statusChipsRow}>
            <View style={styles.weatherChip}>
              <Ionicons name="partly-sunny" size={14} color="#725c00" />
              <Text style={styles.weatherChipText}>Lâm Đồng · 22°C Nắng nhẹ</Text>
            </View>

            <View style={styles.gpsChip}>
              <View style={styles.gpsPulseDot} />
              <Text style={styles.gpsChipText}>GPS READY</Text>
            </View>
          </View>

          <Text style={styles.greetingTitle}>Xin chào, {user.name}!</Text>
          <Text style={styles.greetingSubtitle}>
            Sẵn sàng cho hành trình trekking tiếp theo cùng TrekGo?
          </Text>
        </View>

        {/* 2. UPCOMING TRIP HERO CARD (24px rounded card / Scandinavian fintech vibe) */}
        <View style={styles.heroCard}>
          {/* Card Image Banner */}
          <View style={styles.heroImageContainer}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
              }}
              style={styles.heroImage}
            />
            <View style={styles.imageOverlay} />

            {/* Countdown Badge */}
            <View style={styles.countdownBadge}>
              <Ionicons name="time" size={13} color={Colors.onPrimaryContainer} />
              <Text style={styles.countdownText}>BẮT ĐẦU TRONG 11 NGÀY</Text>
            </View>

            {/* Verified Booking Code */}
            <View style={styles.bookingBadge}>
              <Ionicons name="shield-checkmark" size={13} color={Colors.primary} />
              <Text style={styles.bookingText}>{activeTrip.bookingCode || '#BK-8842'}</Text>
            </View>

            {/* Title on Image */}
            <View style={styles.heroTitles}>
              <Text style={styles.trailCategory}>Cung đường huyền thoại</Text>
              <Text style={styles.trailName}>{activeTrip.name}</Text>
            </View>
          </View>

          {/* Card Body */}
          <View style={styles.heroBody}>
            {/* Telemetry 3-Grid */}
            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryTile}>
                <View style={styles.telemetryHeader}>
                  <Ionicons name="git-commit" size={12} color={Colors.primaryDark} />
                  <Text style={styles.telemetryLabel}>Cự ly</Text>
                </View>
                <Text style={styles.telemetryValue}>
                  14.5<Text style={styles.telemetryUnit}>km</Text>
                </Text>
              </View>

              <View style={styles.telemetryTile}>
                <View style={styles.telemetryHeader}>
                  <Ionicons name="trending-up" size={12} color="#725c00" />
                  <Text style={styles.telemetryLabel}>Độ cao</Text>
                </View>
                <Text style={styles.telemetryValue}>
                  +850<Text style={styles.telemetryUnit}>m</Text>
                </Text>
              </View>

              <View style={styles.telemetryTile}>
                <View style={styles.telemetryHeader}>
                  <Ionicons name="speedometer" size={12} color="#ba1a1a" />
                  <Text style={styles.telemetryLabel}>Độ khó</Text>
                </View>
                <Text style={[styles.telemetryValue, { color: '#ba1a1a' }]}>Khó</Text>
              </View>
            </View>

            {/* Enrollment progress */}
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <View style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.secondary} />
                  <Text style={styles.dateText}>{activeTrip.startDate}</Text>
                </View>
                <Text style={styles.slotsText}>
                  Đã chốt {activeTrip.enrolledCount}/{activeTrip.capacity} thành viên
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${(activeTrip.enrolledCount / activeTrip.capacity) * 100}%` },
                  ]}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.heroActionsRow}>
              <TouchableOpacity
                style={styles.detailsBtn}
                onPress={() => setTripPrepVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.detailsBtnText}>Chi tiết chuyến đi</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.onPrimary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navLiveBtn}
                onPress={() => router.push('/navigation')}
                activeOpacity={0.85}
              >
                <Ionicons name="navigate" size={16} color={Colors.primaryDark} />
                <Text style={styles.navLiveBtnText}>Vào GPS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 3. QUICK ACTION SHORTCUTS (4 Items Rounded Icon Buttons) */}
        <View style={styles.shortcutsRow}>
          <TouchableOpacity
            style={styles.shortcutItem}
            onPress={() => router.push('/(tabs)/explore')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: Colors.primaryContainer }]}>
              <Ionicons name="compass" size={24} color={Colors.onPrimary} />
            </View>
            <Text style={styles.shortcutLabel}>Khám phá Trails</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutItem}
            onPress={() => {
              setSelectedTrailForBooking(trails[0]);
              setBookingVisible(true);
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: Colors.secondaryContainer }]}>
              <Ionicons name="flag" size={24} color="#0c2000" />
            </View>
            <Text style={styles.shortcutLabel}>Public Tours</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutItem}
            onPress={() => setCreatePrivateVisible(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: Colors.tertiaryFixed }]}>
              <Ionicons name="people" size={24} color="#564500" />
            </View>
            <Text style={styles.shortcutLabel}>Tạo Private Trip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutItem}
            onPress={() => router.push('/(tabs)/rental')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: Colors.surfaceContainerHighest }]}>
              <Ionicons name="basket" size={24} color={Colors.onSurface} />
            </View>
            <Text style={styles.shortcutLabel}>Thuê đồ Trek</Text>
          </TouchableOpacity>
        </View>

        {/* 4. FEATURED TRAILS (Horizontal Scroll) */}
        <View style={styles.featuredSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Cung đường nổi bật</Text>
              <Text style={styles.sectionSubtitle}>Dữ liệu định vị GPS offline & cao độ chuẩn xác</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.viewAllText}>Xem tất cả ›</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trailScroll}>
            {trails.map(trail => (
              <TouchableOpacity
                key={trail.id}
                style={styles.trailCard}
                onPress={() => router.push('/(tabs)/explore')}
                activeOpacity={0.85}
              >
                <View style={styles.trailImageWrapper}>
                  <Image source={{ uri: trail.imageUrl }} style={styles.trailCardImage} />
                  <View style={styles.priceTag}>
                    <Ionicons
                      name={trail.isUnlocked ? 'checkmark-circle' : 'lock-closed'}
                      size={11}
                      color="#fed018"
                    />
                    <Text style={styles.priceTagText}>
                      {trail.isUnlocked ? 'Đã sở hữu' : `${trail.price.toLocaleString('vi-VN')}đ`}
                    </Text>
                  </View>
                </View>
                <View style={styles.trailCardBody}>
                  <Text style={styles.trailCardTitle} numberOfLines={1}>{trail.name}</Text>
                  <Text style={styles.trailCardRegion}>{trail.region}</Text>
                  <View style={styles.trailMetaRow}>
                    <Text style={styles.trailMetaItem}>{trail.distanceKm} km</Text>
                    <Text style={styles.trailMetaDivider}>•</Text>
                    <Text style={styles.trailMetaItem}>+{trail.elevationGainM}m</Text>
                    <Text style={styles.trailMetaDivider}>•</Text>
                    <Text style={[styles.trailMetaItem, { color: Colors.primaryDark, fontWeight: '700' }]}>
                      {trail.difficulty}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 5. WEATHER & SAFETY RISK ADVISORY CARD */}
        <View style={styles.advisoryCard}>
          <View style={styles.advisoryHeader}>
            <Ionicons name="shield-half" size={18} color="#725c00" />
            <Text style={styles.advisoryTitle}>Khuyến nghị an toàn ngoài thực địa</Text>
          </View>
          <Text style={styles.advisoryText}>
            Khu vực đồi lính Tà Năng có gió giật mạnh về chiều tối (14-25 km/h). Luôn sạc đầy pin dự phòng và giữ liên lạc kênh bộ đàm VHF cùng Leader.
          </Text>
        </View>
      </ScrollView>

      {/* Modals */}
      <TripPrepModal
        visible={tripPrepVisible}
        trip={activeTrip}
        onClose={() => setTripPrepVisible(false)}
        onStartNavigation={() => router.push('/navigation')}
      />

      <CreatePrivateTripModal
        visible={createPrivateVisible}
        onClose={() => setCreatePrivateVisible(false)}
      />

      {selectedTrailForBooking && (
        <BookingModal
          visible={bookingVisible}
          trip={activeTrip}
          onClose={() => setBookingVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  greetingSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  statusChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weatherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    ...Shadows.card,
  },
  weatherChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  gpsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(159, 232, 112, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  gpsPulseDot: {
    width: 7,
    height: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
  },
  gpsChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.onPrimaryContainer,
    letterSpacing: 0.5,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  heroCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, // 24px signature radius
    overflow: 'hidden',
    ...Shadows.hover,
    marginBottom: 20,
  },
  heroImageContainer: {
    height: 170,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20, 25, 18, 0.45)',
  },
  countdownBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    ...Shadows.card,
  },
  countdownText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.onPrimaryContainer,
    letterSpacing: 0.5,
  },
  bookingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 249, 243, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  bookingText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  heroTitles: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
  },
  trailCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: '#acf67c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trailName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 2,
  },
  heroBody: {
    padding: 16,
    gap: 14,
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  telemetryTile: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    padding: 10,
    borderRadius: Radius.md,
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  telemetryLabel: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  telemetryValue: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.onSurface,
  },
  telemetryUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.onSurfaceVariant,
    marginLeft: 2,
  },
  progressContainer: {
    backgroundColor: Colors.surfaceContainerLow,
    padding: 12,
    borderRadius: Radius.md,
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  slotsText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.full,
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailsBtn: {
    flex: 3,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...Shadows.card,
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  navLiveBtn: {
    flex: 2,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  navLiveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  shortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  shortcutItem: {
    alignItems: 'center',
    width: (width - 32 - 30) / 4,
  },
  shortcutIconBox: {
    width: 52,
    height: 52,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...Shadows.card,
  },
  shortcutLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.onSurface,
    textAlign: 'center',
    lineHeight: 13,
  },
  featuredSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.onSurface,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  trailScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  trailCard: {
    width: 220,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.card,
  },
  trailImageWrapper: {
    height: 120,
    width: '100%',
    position: 'relative',
  },
  trailCardImage: {
    width: '100%',
    height: '100%',
  },
  priceTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(30, 35, 28, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  priceTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  trailCardBody: {
    padding: 12,
  },
  trailCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  trailCardRegion: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  trailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  trailMetaItem: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  trailMetaDivider: {
    fontSize: 10,
    color: Colors.surfaceContainerHighest,
  },
  advisoryCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff9e6',
    borderWidth: 1,
    borderColor: '#fed018',
    borderRadius: Radius.lg,
    padding: 14,
    gap: 6,
  },
  advisoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  advisoryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6f5900',
  },
  advisoryText: {
    fontSize: 11,
    color: '#4a3b1c',
    lineHeight: 16,
  },
});
