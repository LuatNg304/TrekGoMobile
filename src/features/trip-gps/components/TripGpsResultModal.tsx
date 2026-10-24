import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows } from '@/constants/theme';
import type { ActualRouteResponse } from '../types';

interface TripGpsResultModalProps {
  visible: boolean;
  actualRoute: ActualRouteResponse | null;
  onClose: () => void;
}

export function TripGpsResultModal({
  visible,
  actualRoute,
  onClose,
}: TripGpsResultModalProps) {
  if (!actualRoute) return null;

  const distanceKm = actualRoute.totalDistanceMeters
    ? (actualRoute.totalDistanceMeters / 1000).toFixed(2)
    : '0.00';

  const cpPassed = actualRoute.checkpointProgress?.passed ?? 0;
  const cpTotal = actualRoute.checkpointProgress?.total ?? 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="trophy" size={36} color={Colors.primaryDark} />
          </View>

          <Text style={styles.title}>Hành Trình Hoàn Tất!</Text>
          <Text style={styles.subtitle}>
            Dữ liệu GPS của bạn đã được lưu trữ an toàn trong TripActualRoute.
          </Text>

          {/* Metric Highlights */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{distanceKm}</Text>
              <Text style={styles.metricLabel}>QUÃNG ĐƯỜNG (KM)</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>
                {cpPassed}/{cpTotal}
              </Text>
              <Text style={styles.metricLabel}>MỐC CHECKPOINT</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{actualRoute.pointCount}</Text>
              <Text style={styles.metricLabel}>ĐIỂM HỢP LỆ</Text>
            </View>
          </View>

          {/* Status info */}
          <View style={styles.statusBox}>
            <Ionicons
              name={actualRoute.resultStatus === 'READY' ? 'checkmark-circle' : 'hourglass-outline'}
              size={18}
              color={actualRoute.resultStatus === 'READY' ? Colors.positive : Colors.warning}
            />
            <Text style={styles.statusBoxText}>
              Trạng thái tuyến: {actualRoute.resultStatus === 'READY' ? 'Đã dựng hoàn tất (LineString)' : 'Đang xử lý tổng hợp'}
            </Text>
          </View>

          {/* Wise Green Primary CTA Button */}
          <TouchableOpacity style={styles.finishBtn} activeOpacity={0.85} onPress={onClose}>
            <Text style={styles.finishBtnText}>Hoàn Tất & Xem Bản Đồ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(14, 15, 12, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl, // 24px signature card radius
    padding: 24,
    alignItems: 'center',
    ...Shadows.modal,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.body,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
  },
  metricsGrid: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#f8faf7',
    borderRadius: Radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#e8ebe6',
    marginBottom: 18,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.ink,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.mute,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#d1d5db',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e8ebe6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    marginBottom: 22,
  },
  statusBoxText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.ink,
  },
  finishBtn: {
    width: '100%',
    height: 52,
    borderRadius: Radius.xl, // 24px pill-rectangle
    backgroundColor: Colors.primary, // Wise lime green
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.onPrimary,
  },
});
