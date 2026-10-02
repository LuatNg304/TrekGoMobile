import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { TacticalMap } from '@/components/TacticalMap';
import { RouteDeviationAlert } from '@/components/RouteDeviationAlert';
import { CheckpointMissionModal } from '@/components/CheckpointMissionModal';
import { TrekGoLogo } from '@/components/TrekGoLogo';
import { useApp } from '@/context/AppContext';
import { Checkpoint } from '@/types';

export default function NavigationScreen() {
  const router = useRouter();
  const {
    telemetry,
    activeTrail,
    toggleDeviation,
    dismissDeviationWarning,
    reconnectToRoute,
    completeCheckpointMission,
  } = useApp();

  const [activeCheckpointModal, setActiveCheckpointModal] = useState<Checkpoint | null>(null);

  const targetCheckpoint = activeTrail.checkpoints[1] || activeTrail.checkpoints[0];

  const handleSOS = () => {
    Alert.alert(
      'PHÁT TÍN HIỆU SOS KHẨN CẤP',
      'Đang gửi toạ độ GPS (11.5831°N, 108.5290°E) tới Kiểm Lâm Vườn Quốc Gia và Trạm Cứu Hộ TrekGo gần nhất qua tần số vệ tinh & SMS khẩn.',
      [{ text: 'Đã nhận tín hiệu' }]
    );
  };

  const handleRadio = () => {
    Alert.alert(
      'Kênh Bộ Đàm VHF Đoàn Trek',
      'Kênh 01 (Leader Nam Nguyễn) · Sóng ổn định · Giữ nút bấm để nói.',
      [{ text: 'Đóng' }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. Top HUD Header */}
      <View style={styles.topHudBar}>
        <View style={styles.topHudLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
          </TouchableOpacity>
          <TrekGoLogo size={24} showText={false} />
          <Text style={styles.hudTitle}>Live Navigation</Text>
        </View>

        <View style={styles.topHudRight}>
          <View style={styles.gpsPrecisionBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.gpsPrecisionText}>GPS ±{telemetry.gpsAccuracyMeters}M</Text>
            <Text style={styles.batteryDivider}>|</Text>
            <Ionicons name="battery-charging" size={13} color={Colors.onPrimaryContainer} />
            <Text style={styles.batteryText}>{telemetry.batteryPercent}%</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Expedition Subtitle bar */}
        <View style={styles.expeditionBar}>
          <View>
            <Text style={styles.liveHudTag}>LIVE TREK HUD</Text>
            <Text style={styles.expeditionName}>Tà Năng – Phan Dũng (Ngày 1)</Text>
          </View>

          {/* Interactive Simulation Switch: Toggle Deviation */}
          <TouchableOpacity
            style={[
              styles.simToggleBtn,
              !telemetry.isOnRoute && styles.simToggleBtnWarning,
            ]}
            onPress={toggleDeviation}
            activeOpacity={0.8}
          >
            <Ionicons
              name={telemetry.isOnRoute ? 'navigate-outline' : 'warning-outline'}
              size={13}
              color={telemetry.isOnRoute ? Colors.primaryDark : '#ba1a1a'}
            />
            <Text
              style={[
                styles.simToggleText,
                !telemetry.isOnRoute && styles.simToggleTextWarning,
              ]}
            >
              {telemetry.isOnRoute ? 'Thử Giả Lập Lệch Đường' : 'Mô Phỏng Lệch 120m'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. 3D Vector Terrain & Tactical Map Container (70% viewport highlight) */}
        <TacticalMap
          isOnRoute={telemetry.isOnRoute}
          deviationMeters={telemetry.deviationMeters}
          checkpoints={activeTrail.checkpoints}
          onCheckpointPress={cp => setActiveCheckpointModal(cp)}
          height={340}
        />

        {/* 3. CRITICAL ROUTE DEVIATION WARNING CARD */}
        {!telemetry.isOnRoute && !telemetry.isWarningDismissed && (
          <View style={styles.alertContainer}>
            <RouteDeviationAlert
              deviationMeters={telemetry.deviationMeters}
              trailName={activeTrail.name}
              onViewRoute={reconnectToRoute}
              onDismiss={dismissDeviationWarning}
            />
          </View>
        )}

        {/* Back on Route indicator if safe */}
        {telemetry.isOnRoute && (
          <View style={styles.onRouteIndicator}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.primaryDark} />
            <Text style={styles.onRouteText}>Bạn đang đi đúng tuyến đường quy định (On Route)</Text>
          </View>
        )}

        {/* 4. Live 4-Grid Metrics Telemetry */}
        <View style={styles.metricsGrid}>
          {/* Tile 1: Distance */}
          <View style={styles.metricTile}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>KHOẢNG CÁCH</Text>
              <Ionicons name="git-commit" size={14} color={Colors.primaryDark} />
            </View>
            <Text style={styles.metricBigVal}>
              {telemetry.distanceCompletedKm}{' '}
              <Text style={styles.metricUnit}>/ {telemetry.totalDistanceKm} km</Text>
            </Text>
            <View style={styles.metricProgressBg}>
              <View
                style={[
                  styles.metricProgressFill,
                  { width: `${(telemetry.distanceCompletedKm / telemetry.totalDistanceKm) * 100}%` },
                ]}
              />
            </View>
          </View>

          {/* Tile 2: Elapsed Time */}
          <View style={styles.metricTile}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>THỜI GIAN ĐI</Text>
              <Ionicons name="time" size={14} color={Colors.primaryDark} />
            </View>
            <Text style={styles.metricBigVal}>{telemetry.elapsedTimeString}</Text>
            <Text style={styles.metricSubInfo}>Vận tốc TB: {telemetry.averageSpeedKmh} km/h</Text>
          </View>

          {/* Tile 3: Current Elevation */}
          <View style={styles.metricTile}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>ĐỘ CAO HIỆN TẠI</Text>
              <Ionicons name="trending-up" size={14} color={Colors.secondary} />
            </View>
            <Text style={styles.metricBigVal}>{telemetry.currentElevationM}m</Text>
            <Text style={[styles.metricSubInfo, { color: Colors.primaryDark, fontWeight: '700' }]}>
              +{telemetry.elevationGainM}m tích lũy
            </Text>
          </View>

          {/* Tile 4: Checkpoints Status */}
          <View style={styles.metricTile}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>MỐC ĐIỂM (CP)</Text>
              <Ionicons name="flag" size={14} color="#725c00" />
            </View>
            <Text style={styles.metricBigVal}>
              {telemetry.activeCheckpointsCompleted}{' '}
              <Text style={styles.metricUnit}>/ {telemetry.totalCheckpoints} mốc</Text>
            </Text>
            <Text style={styles.metricSubInfo}>Đã chốt an toàn 40%</Text>
          </View>
        </View>

        {/* 5. Checkpoint Mission Drawer Card */}
        <View style={styles.missionCard}>
          <View style={styles.missionCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={styles.missionPulseDot} />
              <Text style={styles.missionTargetTitle}>
                Mục Tiêu Kế Tiếp: {telemetry.nextCheckpointName}
              </Text>
            </View>
            <View style={styles.distRemainingBadge}>
              <Text style={styles.distRemainingText}>Còn {telemetry.nextCheckpointDistanceM}m</Text>
            </View>
          </View>

          <View style={styles.missionTaskRow}>
            <View style={styles.cameraIconBox}>
              <Ionicons name="camera" size={20} color={Colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.missionTaskTitle}>Nhiệm vụ Check-in Cột Mốc</Text>
              <Text style={styles.missionTaskSub}>
                Chụp ảnh xác thực tại biển kiểm lâm. Nút check-in tự động mở khi vào bán kính GPS 30m.
              </Text>
            </View>
          </View>

          {/* Bottom Tactile Quick Triggers */}
          <View style={styles.tactileActionsRow}>
            <TouchableOpacity
              style={styles.verifyCheckpointBtn}
              onPress={() => setActiveCheckpointModal(targetCheckpoint)}
              activeOpacity={0.85}
            >
              <Ionicons name="scan-circle" size={20} color={Colors.onPrimary} />
              <Text style={styles.verifyCheckpointText}>Xác Thực Mốc & Gửi Báo Cáo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sosButton}
              onPress={handleSOS}
              activeOpacity={0.8}
            >
              <Ionicons name="alert" size={20} color="#ba1a1a" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioButton}
              onPress={handleRadio}
              activeOpacity={0.8}
            >
              <Ionicons name="radio" size={18} color={Colors.onSurface} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Checkpoint Mission Modal */}
      <CheckpointMissionModal
        visible={!!activeCheckpointModal}
        checkpoint={activeCheckpointModal}
        onClose={() => setActiveCheckpointModal(null)}
        onComplete={cpId => completeCheckpointMission(cpId)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  topHudBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  topHudLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.onSurface,
  },
  topHudRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gpsPrecisionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
  },
  gpsPrecisionText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.onPrimaryContainer,
  },
  batteryDivider: {
    fontSize: 10,
    color: Colors.onPrimaryContainer,
    opacity: 0.5,
  },
  batteryText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.onPrimaryContainer,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  expeditionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
  },
  liveHudTag: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: 1,
  },
  expeditionName: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.onSurface,
  },
  simToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryPale,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  simToggleBtnWarning: {
    backgroundColor: '#fff9e6',
    borderColor: '#fed018',
  },
  simToggleText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  simToggleTextWarning: {
    color: '#ba1a1a',
  },
  alertContainer: {
    marginTop: -16,
    zIndex: 30,
    marginBottom: 10,
  },
  onRouteIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryPale,
    paddingVertical: 6,
    marginHorizontal: 16,
    borderRadius: Radius.full,
    marginTop: 8,
    marginBottom: 4,
  },
  onRouteText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 10,
    marginBottom: 14,
  },
  metricTile: {
    width: '48%',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.lg,
    padding: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  metricBigVal: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.onSurface,
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
  },
  metricProgressBg: {
    height: 4,
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: Radius.full,
    marginTop: 6,
    overflow: 'hidden',
  },
  metricProgressFill: {
    height: '100%',
    backgroundColor: Colors.primaryDark,
  },
  metricSubInfo: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  missionCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xl, // 24px signature rounded card
    padding: 14,
    ...Shadows.card,
  },
  missionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  missionPulseDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: '#fed018',
  },
  missionTargetTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  distRemainingBadge: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  distRemainingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0c2000',
  },
  missionTaskRow: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: 10,
    borderRadius: Radius.md,
    marginBottom: 12,
  },
  cameraIconBox: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionTaskTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  missionTaskSub: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 15,
  },
  tactileActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  verifyCheckpointBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...Shadows.card,
  },
  verifyCheckpointText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  sosButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: '#ffdad6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
