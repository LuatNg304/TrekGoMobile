import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { TopHeader } from '@/components/TopHeader';
import { TacticalMap } from '@/components/TacticalMap';
import { useApp } from '@/context/AppContext';
import { Trail, DifficultyLevel } from '@/types';
import { CreatePrivateTripModal } from '@/components/CreatePrivateTripModal';

export default function ExploreScreen() {
  const router = useRouter();
  const { trails, unlockTrail } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('Tất cả');
  const [selectedTrail, setSelectedTrail] = useState<Trail>(trails[0]);
  const [createPrivateModalVisible, setCreatePrivateModalVisible] = useState(false);

  const filters = ['Tất cả', 'Gần bạn', 'Dễ', 'Trung bình', 'Khó', 'Đã sở hữu'];

  const filteredTrails = trails.filter(trail => {
    if (selectedFilter === 'Đã sở hữu') return trail.isUnlocked;
    if (selectedFilter !== 'Tất cả' && selectedFilter !== 'Gần bạn') {
      return trail.difficulty === selectedFilter;
    }
    if (searchQuery.trim()) {
      return trail.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             trail.region.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleUnlock = () => {
    unlockTrail(selectedTrail.id);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopHeader subtitle="Explore" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 1. Tactical Search & Filter Pills */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.onSurfaceVariant} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm cung đường, địa danh..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.onSurfaceMuted}
            />
            <TouchableOpacity style={styles.filterIconButton}>
              <Ionicons name="options-outline" size={16} color={Colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Filter Pills Scroll */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
            {filters.map(filter => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterPill,
                  selectedFilter === filter && styles.filterPillActive,
                ]}
                onPress={() => setSelectedFilter(filter)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    selectedFilter === filter && styles.filterPillTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 2. Main Trail Canvas Card */}
        <View style={styles.mainTrailCard}>
          {/* Hero Image */}
          <View style={styles.trailHeroWrapper}>
            <Image source={{ uri: selectedTrail.imageUrl }} style={styles.trailHeroImage} />
            <View style={styles.heroOverlay} />

            {/* Top Badges */}
            <View style={styles.offlineGpsBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.offlineGpsText}>Offline GPS 3D</Text>
            </View>

            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={13} color="#fed018" />
              <Text style={styles.ratingText}>
                {selectedTrail.rating} ({selectedTrail.reviewCount})
              </Text>
            </View>

            {/* Bottom Hero Info */}
            <View style={styles.heroInfoBottom}>
              <View style={styles.categoryTagsRow}>
                <View style={styles.categoryTag}>
                  <Text style={styles.categoryTagText}>{selectedTrail.terrainType}</Text>
                </View>
                <View style={[styles.categoryTag, { backgroundColor: '#fed018' }]}>
                  <Text style={[styles.categoryTagText, { color: '#4a3b1c' }]}>
                    {selectedTrail.difficulty}
                  </Text>
                </View>
              </View>

              <Text style={styles.trailTitle}>{selectedTrail.name}</Text>
              <Text style={styles.trailSubtitle}>
                📍 {selectedTrail.region}
              </Text>
            </View>
          </View>

          {/* Bento Telemetry Grid */}
          <View style={styles.bentoGrid}>
            <View style={styles.bentoTile}>
              <View style={styles.bentoIconBg}>
                <Ionicons name="git-commit" size={16} color={Colors.primaryDark} />
              </View>
              <View>
                <Text style={styles.bentoLabel}>KHOẢNG CÁCH</Text>
                <Text style={styles.bentoValue}>{selectedTrail.distanceKm} km</Text>
              </View>
            </View>

            <View style={styles.bentoTile}>
              <View style={styles.bentoIconBg}>
                <Ionicons name="time" size={16} color={Colors.secondary} />
              </View>
              <View>
                <Text style={styles.bentoLabel}>THỜI GIAN</Text>
                <Text style={styles.bentoValue}>{selectedTrail.duration}</Text>
              </View>
            </View>

            <View style={styles.bentoTile}>
              <View style={styles.bentoIconBg}>
                <Ionicons name="trending-up" size={16} color="#725c00" />
              </View>
              <View>
                <Text style={styles.bentoLabel}>ĐỘ CAO LŨY KẾ</Text>
                <Text style={styles.bentoValue}>+{selectedTrail.elevationGainM}m</Text>
              </View>
            </View>

            <View style={styles.bentoTile}>
              <View style={styles.bentoIconBg}>
                <Ionicons name="flag" size={16} color={Colors.primaryDark} />
              </View>
              <View>
                <Text style={styles.bentoLabel}>CHECKPOINTS</Text>
                <Text style={styles.bentoValue}>5 Mốc GPS</Text>
              </View>
            </View>
          </View>

          {/* Interactive Topo Route Map Preview */}
          <View style={styles.mapSectionCard}>
            <View style={styles.mapHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="map" size={16} color={Colors.primaryDark} />
                <Text style={styles.mapHeaderTitle}>Bản đồ địa hình & Tuyến GPS</Text>
              </View>
              <View style={styles.contourBadge}>
                <Text style={styles.contourText}>Contour 25m</Text>
              </View>
            </View>

            <TacticalMap
              isOnRoute={true}
              height={220}
              checkpoints={selectedTrail.checkpoints}
              interactive={false}
            />
          </View>

          {/* Trail Description */}
          <View style={styles.descSection}>
            <Text style={styles.descTitle}>Tổng quan hành trình</Text>
            <Text style={styles.descBody}>{selectedTrail.description}</Text>
          </View>

          {/* Actions CTA */}
          <View style={styles.ctaRow}>
            {selectedTrail.isUnlocked ? (
              <>
                <TouchableOpacity
                  style={styles.primaryCta}
                  onPress={() => router.push('/navigation')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="navigate" size={18} color={Colors.onPrimary} />
                  <Text style={styles.primaryCtaText}>Vào Chế Độ GPS Trekking</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryCta}
                  onPress={() => setCreatePrivateModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="people" size={18} color={Colors.onSurface} />
                  <Text style={styles.secondaryCtaText}>Tạo Private Trip</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.unlockCta}
                onPress={handleUnlock}
                activeOpacity={0.85}
              >
                <Ionicons name="lock-open" size={20} color={Colors.onPrimary} />
                <Text style={styles.unlockCtaText}>
                  Mở Khóa Bản Đồ GPS Toàn Tuyến ({selectedTrail.price.toLocaleString('vi-VN')} đ)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 3. Other Trails List */}
        <View style={styles.otherTrailsSection}>
          <Text style={styles.otherTrailsTitle}>Các Cung Đường Khác ({filteredTrails.length})</Text>
          <View style={styles.otherTrailsList}>
            {filteredTrails.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.otherTrailItem,
                  selectedTrail.id === t.id && styles.otherTrailItemSelected,
                ]}
                onPress={() => setSelectedTrail(t)}
                activeOpacity={0.8}
              >
                <Image source={{ uri: t.imageUrl }} style={styles.otherTrailThumb} />
                <View style={styles.otherTrailInfo}>
                  <Text style={styles.otherTrailName}>{t.name}</Text>
                  <Text style={styles.otherTrailRegion}>{t.region}</Text>
                  <View style={styles.otherTrailMetaRow}>
                    <Text style={styles.otherTrailMeta}>{t.distanceKm} km</Text>
                    <Text style={styles.otherTrailMeta}>•</Text>
                    <Text style={styles.otherTrailMeta}>+{t.elevationGainM}m</Text>
                    <Text style={styles.otherTrailMeta}>•</Text>
                    <Text style={styles.otherTrailDifficulty}>{t.difficulty}</Text>
                  </View>
                </View>
                <View style={styles.trailStatusCol}>
                  <Text style={styles.trailPrice}>
                    {t.isUnlocked ? 'Đã mở' : `${(t.price / 1000)}k`}
                  </Text>
                  <Ionicons
                    name={selectedTrail.id === t.id ? 'chevron-down' : 'chevron-forward'}
                    size={16}
                    color={Colors.onSurfaceVariant}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

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
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  searchBar: {
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
    ...Shadows.card,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.onSurface,
  },
  filterIconButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillsRow: {
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  filterPillActive: {
    backgroundColor: Colors.ink,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },
  filterPillTextActive: {
    color: Colors.inverseOnSurface,
  },
  mainTrailCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, // 24px signature rounded card
    overflow: 'hidden',
    ...Shadows.hover,
    marginBottom: 24,
  },
  trailHeroWrapper: {
    height: 220,
    width: '100%',
    position: 'relative',
  },
  trailHeroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 25, 18, 0.45)',
  },
  offlineGpsBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 249, 243, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
  },
  offlineGpsText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.onSurface,
    textTransform: 'uppercase',
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(30, 35, 28, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroInfoBottom: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
  },
  categoryTagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  categoryTag: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  categoryTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.onPrimaryContainer,
    textTransform: 'uppercase',
  },
  trailTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
  },
  trailSubtitle: {
    fontSize: 12,
    color: '#e4e2dd',
    marginTop: 2,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 14,
    gap: 10,
  },
  bentoTile: {
    width: '48%',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bentoIconBg: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  bentoValue: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.onSurface,
    marginTop: 1,
  },
  mapSectionCard: {
    marginHorizontal: 14,
    marginBottom: 14,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: Colors.surfaceContainerLow,
  },
  mapHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  contourBadge: {
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  contourText: {
    fontSize: 9,
    color: Colors.onSurfaceVariant,
    fontWeight: '700',
  },
  descSection: {
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  descTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: 4,
  },
  descBody: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  ctaRow: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: 8,
  },
  primaryCta: {
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadows.card,
  },
  primaryCtaText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  secondaryCta: {
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  unlockCta: {
    height: 50,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadows.hover,
  },
  unlockCtaText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  otherTrailsSection: {
    paddingHorizontal: 16,
  },
  otherTrailsTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.onSurface,
    marginBottom: 12,
  },
  otherTrailsList: {
    gap: 10,
  },
  otherTrailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    padding: 10,
    borderRadius: Radius.lg,
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    ...Shadows.card,
  },
  otherTrailItemSelected: {
    borderColor: Colors.primaryDark,
    backgroundColor: Colors.primaryPale,
  },
  otherTrailThumb: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
  },
  otherTrailInfo: {
    flex: 1,
  },
  otherTrailName: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  otherTrailRegion: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  otherTrailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  otherTrailMeta: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  otherTrailDifficulty: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  trailStatusCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  trailPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSurface,
  },
});
