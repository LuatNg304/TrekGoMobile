import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { Trip } from '@/types';

interface TripPrepModalProps {
  visible: boolean;
  trip: Trip;
  onClose: () => void;
  onStartNavigation: () => void;
}

export const TripPrepModal: React.FC<TripPrepModalProps> = ({
  visible,
  trip,
  onClose,
  onStartNavigation,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header handle */}
          <View style={styles.dragHandle} />

          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Title & Status */}
            <View style={styles.header}>
              <View style={styles.confirmedPill}>
                <Ionicons name="shield-checkmark" size={14} color="#0c2000" />
                <Text style={styles.confirmedText}>XÁC NHẬN CHUYẾN ĐI</Text>
              </View>
              <Text style={styles.title}>{trip.name}</Text>
              <Text style={styles.bookingCode}>Mã đặt chỗ: {trip.bookingCode || '#BK-8842'}</Text>
            </View>

            {/* Logistics Card (Bus & Station) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="bus" size={18} color={Colors.primaryDark} />
                <Text style={styles.sectionTitle}>Thông tin Phương Tiện & Điểm Tập Kết</Text>
              </View>

              <View style={styles.logisticsDetail}>
                <View style={styles.logRow}>
                  <Text style={styles.logLabel}>Điểm đón:</Text>
                  <Text style={styles.logValue}>{trip.logistics?.pickupLocation}</Text>
                </View>
                <View style={styles.logRow}>
                  <Text style={styles.logLabel}>Thời gian:</Text>
                  <Text style={styles.logValue}>{trip.logistics?.pickupTime}</Text>
                </View>
                <View style={styles.logRow}>
                  <Text style={styles.logLabel}>Loại xe:</Text>
                  <Text style={styles.logValue}>{trip.logistics?.vehicleModel}</Text>
                </View>
                <View style={styles.logRow}>
                  <Text style={styles.logLabel}>Biển số xe:</Text>
                  <View style={styles.licensePlateBadge}>
                    <Text style={styles.licensePlateText}>{trip.logistics?.vehiclePlate}</Text>
                  </View>
                </View>
                <View style={styles.logRow}>
                  <Text style={styles.logLabel}>Tài xế:</Text>
                  <Text style={styles.logValue}>{trip.logistics?.driverName} ({trip.logistics?.driverPhone})</Text>
                </View>
              </View>
            </View>

            {/* Weather Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="partly-sunny" size={18} color="#725c00" />
                <Text style={styles.sectionTitle}>Thời Tiết & Khí Hậu Địa Hình</Text>
              </View>
              <View style={styles.weatherBox}>
                <View style={styles.weatherTop}>
                  <Text style={styles.temp}>{trip.weather.tempC}°C</Text>
                  <Text style={styles.condition}>{trip.weather.condition}</Text>
                </View>
                <Text style={styles.weatherNotice}>💡 {trip.weather.riskNotice}</Text>
              </View>
            </View>

            {/* Checklist */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="checkbox" size={18} color={Colors.primaryDark} />
                <Text style={styles.sectionTitle}>Hành Lý Cần Chuẩn Bị (Checklist)</Text>
              </View>
              <View style={styles.checklist}>
                <Text style={styles.checkItem}>✓ Balo trekking 45L - 65L (có đệm trợ lực lưng)</Text>
                <Text style={styles.checkItem}>✓ Giày leo núi đế gai Vibram chuyên dụng</Text>
                <Text style={styles.checkItem}>✓ 2 đôi tất dày & quần áo mau khô (quick-dry)</Text>
                <Text style={styles.checkItem}>✓ Bình nước cá nhân tối thiểu 1.5 Lít</Text>
                <Text style={styles.checkItem}>✓ Thuốc chống muỗi, vắt & điện giải muối</Text>
              </View>
            </View>

            {/* Action buttons */}
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => {
                onClose();
                onStartNavigation();
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate-circle" size={24} color={Colors.onPrimary} />
              <Text style={styles.navButtonText}>Vào Chế Độ GPS Trekking Trực Tiếp</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '90%',
    ...Shadows.hover,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHighest,
    alignSelf: 'center',
    marginBottom: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  header: {
    marginBottom: 16,
  },
  confirmedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  confirmedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0c2000',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.onSurface,
  },
  bookingCode: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 12,
    ...Shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  logisticsDetail: {
    gap: 6,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  logValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  licensePlateBadge: {
    backgroundColor: '#fff9e6',
    borderWidth: 1,
    borderColor: '#fed018',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  licensePlateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6f5900',
  },
  weatherBox: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: 10,
  },
  weatherTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  temp: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.onSurface,
  },
  condition: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  weatherNotice: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    lineHeight: 16,
  },
  checklist: {
    gap: 6,
  },
  checkItem: {
    fontSize: 12,
    color: Colors.onSurface,
    lineHeight: 18,
  },
  navButton: {
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    ...Shadows.hover,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
});
