import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { TopHeader } from '@/components/TopHeader';
import { useApp } from '@/context/AppContext';
import { TripPrepModal } from '@/components/TripPrepModal';
import { CreatePrivateTripModal } from '@/components/CreatePrivateTripModal';

export default function TripsScreen() {
  const router = useRouter();
  const { trips, activeTrip, user } = useApp();

  const [activeFilter, setActiveFilter] = useState<'UPCOMING' | 'PENDING' | 'HISTORY'>('UPCOMING');
  const [prepModalVisible, setPrepModalVisible] = useState(false);
  const [createPrivateModalVisible, setCreatePrivateModalVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopHeader subtitle="Trips" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 1. Main View Switcher Pill */}
        <View style={styles.segmentContainer}>
          <View style={styles.segmentBox}>
            <TouchableOpacity style={[styles.segmentBtn, styles.segmentBtnActive]}>
              <Ionicons name="briefcase" size={16} color={Colors.onPrimary} />
              <Text style={styles.segmentBtnTextActive}>Chuyến của tôi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.segmentBtn}
              onPress={() => router.push('/(tabs)/rental')}
            >
              <Ionicons name="basket-outline" size={16} color={Colors.onSurfaceVariant} />
              <Text style={styles.segmentBtnText}>Thuê thiết bị</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Sub Filter Chips */}
        <View style={styles.subFilterRow}>
          <TouchableOpacity
            style={[styles.subFilterChip, activeFilter === 'UPCOMING' && styles.subFilterChipActive]}
            onPress={() => setActiveFilter('UPCOMING')}
          >
            <Text style={[styles.subFilterText, activeFilter === 'UPCOMING' && styles.subFilterTextActive]}>
              Sắp tới
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>2</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subFilterChip, activeFilter === 'PENDING' && styles.subFilterChipActive]}
            onPress={() => setActiveFilter('PENDING')}
          >
            <Text style={[styles.subFilterText, activeFilter === 'PENDING' && styles.subFilterTextActive]}>
              Chờ xác nhận
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subFilterChip, activeFilter === 'HISTORY' && styles.subFilterChipActive]}
            onPress={() => setActiveFilter('HISTORY')}
          >
            <Text style={[styles.subFilterText, activeFilter === 'HISTORY' && styles.subFilterTextActive]}>
              Lịch sử đã đi (12)
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Active Tour Highlight Card (Tà Năng – Phan Dũng) */}
        <View style={styles.tripCard}>
          {/* Card Header */}
          <View style={styles.tripCardTop}>
            <View style={styles.leaderBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#0c2000" />
              <Text style={styles.leaderBadgeText}>Public Tour · Leader Nam 5★</Text>
            </View>
            <View style={styles.confirmedBadge}>
              <Text style={styles.confirmedText}>CONFIRMED ✓</Text>
            </View>
          </View>

          {/* Trip Name & Time */}
          <View style={styles.tripDetails}>
            <Text style={styles.tripTitle}>{activeTrip.name}</Text>
            <View style={styles.tripTimeRow}>
              <Ionicons name="calendar-outline" size={14} color={Colors.primaryDark} />
              <Text style={styles.tripTimeText}>
                Khởi hành: 21:00 Thứ Sáu tuần này (3 ngày 2 đêm)
              </Text>
            </View>
          </View>

          {/* Logistics Box (Bus & Station) */}
          <View style={styles.logisticsBox}>
            <View style={styles.busIconBox}>
              <Ionicons name="bus" size={18} color="#0c2000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.logisticsTitle}>{activeTrip.logistics?.pickupLocation}</Text>
              <Text style={styles.logisticsSub}>
                Xe 16 chỗ TrekGo Express (BKS: {activeTrip.logistics?.vehiclePlate})
              </Text>
            </View>
          </View>

          {/* Weather & Equipment Grid */}
          <View style={styles.quickGrid}>
            <View style={styles.quickTile}>
              <Ionicons name="partly-sunny" size={18} color="#725c00" />
              <View>
                <Text style={styles.quickTileLabel}>Thời tiết</Text>
                <Text style={styles.quickTileVal}>{activeTrip.weather.tempC}°C · Mây rải rác</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.quickTile}
              onPress={() => router.push('/(tabs)/rental')}
            >
              <Ionicons name="basket" size={18} color={Colors.primaryDark} />
              <View>
                <Text style={styles.quickTileLabel}>Đồ đã thuê</Text>
                <Text style={[styles.quickTileVal, { color: Colors.primaryDark, fontWeight: '700' }]}>
                  1 món (Đã gán) ›
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Actions */}
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
              onPress={() => router.push('/navigation')}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate" size={16} color={Colors.onPrimary} />
              <Text style={styles.gpsLiveBtnText}>Vào GPS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Private Trip Card */}
        {trips.length > 1 && (
          <View style={styles.privateTripCard}>
            <View style={styles.privateTop}>
              <View style={styles.privatePill}>
                <Ionicons name="lock-closed" size={12} color="#564500" />
                <Text style={styles.privatePillText}>
                  Private Trip · {trips[1].inviteCode || 'TG-8F92A'}
                </Text>
              </View>
              <Text style={styles.hostText}>Host: Bạn</Text>
            </View>

            <Text style={styles.privateTitle}>{trips[1].name}</Text>
            <Text style={styles.privateSub}>Dự kiến: Tháng sau · 2 ngày 1 đêm</Text>

            {/* Participants stack */}
            <View style={styles.participantsBox}>
              <View style={styles.avatarStack}>
                <View style={[styles.avatarCircle, { backgroundColor: '#47672d' }]}>
                  <Text style={styles.avatarLetter}>H</Text>
                </View>
                <View style={[styles.avatarCircle, { backgroundColor: '#2f6c00' }]}>
                  <Text style={styles.avatarLetter}>T</Text>
                </View>
                <View style={[styles.avatarCircle, { backgroundColor: '#725c00' }]}>
                  <Text style={styles.avatarLetter}>K</Text>
                </View>
                <View style={[styles.avatarCircle, { backgroundColor: Colors.surfaceContainerHighest }]}>
                  <Text style={[styles.avatarLetter, { color: Colors.onSurface }]}>+1</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.inviteBtn}
                onPress={() => setCreatePrivateModalVisible(true)}
              >
                <Ionicons name="share-social-outline" size={14} color={Colors.primaryDark} />
                <Text style={styles.inviteBtnText}>Mời thành viên</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 5. Create Private Trip CTA Banner */}
        <TouchableOpacity
          style={styles.createTripBanner}
          onPress={() => setCreatePrivateModalVisible(true)}
          activeOpacity={0.85}
        >
          <View style={styles.createTripIcon}>
            <Ionicons name="add" size={24} color={Colors.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.createTripTitle}>Tổ chức chuyến đi riêng (Private Trip)</Text>
            <Text style={styles.createTripSub}>Chọn cung đường và tạo mã mời riêng tư cho nhóm bạn</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.primaryDark} />
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      <TripPrepModal
        visible={prepModalVisible}
        trip={activeTrip}
        onClose={() => setPrepModalVisible(false)}
        onStartNavigation={() => router.push('/navigation')}
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
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.full,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: Radius.full,
  },
  segmentBtnActive: {
    backgroundColor: Colors.primaryContainer,
    ...Shadows.card,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },
  segmentBtnTextActive: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  subFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  subFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  subFilterChipActive: {
    backgroundColor: Colors.ink,
  },
  subFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  subFilterTextActive: {
    color: Colors.inverseOnSurface,
    fontWeight: '700',
  },
  countBadge: {
    width: 16,
    height: 16,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  tripCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, // 24px signature rounded card
    padding: 16,
    marginBottom: 16,
    ...Shadows.hover,
  },
  tripCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  leaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  leaderBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0c2000',
  },
  confirmedBadge: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  confirmedText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.onPrimaryContainer,
  },
  tripDetails: {
    marginBottom: 12,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.onSurface,
  },
  tripTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  tripTimeText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  logisticsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceContainerLow,
    padding: 10,
    borderRadius: Radius.md,
    marginBottom: 12,
  },
  busIconBox: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logisticsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  logisticsSub: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  quickTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceContainerLow,
    padding: 10,
    borderRadius: Radius.md,
  },
  quickTileLabel: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  quickTileVal: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  prepBtn: {
    flex: 3,
    height: 46,
    borderRadius: Radius.full,
    backgroundColor: Colors.inverseSurface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  prepBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.inverseOnSurface,
  },
  gpsLiveBtn: {
    flex: 2,
    height: 46,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  gpsLiveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  privateTripCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: 16,
    marginBottom: 16,
    ...Shadows.card,
  },
  privateTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  privatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.tertiaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  privatePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#564500',
  },
  hostText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  privateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  privateSub: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    marginBottom: 12,
  },
  participantsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    padding: 10,
    borderRadius: Radius.md,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -8,
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainerLowest,
  },
  avatarLetter: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  inviteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  createTripBanner: {
    marginHorizontal: 16,
    backgroundColor: Colors.primaryPale,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Shadows.card,
  },
  createTripIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTripTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.inkDeep,
  },
  createTripSub: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 15,
  },
});
