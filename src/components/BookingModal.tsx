import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { Trip } from '@/types';
import { useApp } from '@/context/AppContext';

interface BookingModalProps {
  visible: boolean;
  trip: Trip;
  onClose: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  visible,
  trip,
  onClose,
}) => {
  const { bookPublicTrip } = useApp();
  const [participantsCount, setParticipantsCount] = useState<number>(1);
  const [contactName, setContactName] = useState<string>('Anh Thư');
  const [contactPhone, setContactPhone] = useState<string>('0908 777 666');
  const [isBooked, setIsBooked] = useState<boolean>(false);
  const [generatedCode, setGeneratedCode] = useState<string>('');

  const pricePerPerson = trip.pricePerPerson || 2850000;
  const totalPrice = pricePerPerson * participantsCount;

  const handleConfirm = () => {
    const code = '#BK-' + Math.floor(1000 + Math.random() * 9000);
    bookPublicTrip(trip.id, participantsCount);
    setGeneratedCode(code);
    setIsBooked(true);
  };

  const handleFinish = () => {
    setIsBooked(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.dragHandle} />

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {isBooked ? (
              // Booking Confirmed Success Screen
              <View style={styles.successBox}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={54} color={Colors.primaryDark} />
                </View>
                <Text style={styles.successTitle}>Đặt Chỗ Thành Công!</Text>
                <Text style={styles.successSub}>
                  Vé tham gia Public Tour đã được xác nhận. Thông tin xe trung chuyển và tài xế đã sẵn sàng trong mục chuẩn bị chuyến.
                </Text>

                <View style={styles.ticketCard}>
                  <View style={styles.ticketHeader}>
                    <Text style={styles.ticketLabel}>MÃ VÉ TREKGO</Text>
                    <Text style={styles.ticketCode}>{generatedCode}</Text>
                  </View>
                  <View style={styles.ticketDivider} />
                  <View style={styles.ticketDetails}>
                    <Text style={styles.ticketTripName}>{trip.name}</Text>
                    <Text style={styles.ticketMeta}>
                      {participantsCount} Thành viên · Khởi hành: {trip.startDate}
                    </Text>
                    <Text style={styles.ticketTotal}>
                      Tổng tiền: {totalPrice.toLocaleString('vi-VN')} đ (Đã thanh toán)
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.confirmBtn} onPress={handleFinish}>
                  <Text style={styles.confirmBtnText}>Hoàn tất & Xem Chuyến Đi</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Booking Form
              <View>
                <View style={styles.header}>
                  <View style={styles.badgeRow}>
                    <Text style={styles.tourType}>PUBLIC TOUR</Text>
                    <Text style={styles.slotsLeft}>Còn {trip.capacity - trip.enrolledCount} chỗ trống</Text>
                  </View>
                  <Text style={styles.title}>{trip.name}</Text>
                  <Text style={styles.subtitle}>Leader: {trip.leader.name} ★ 5.0</Text>
                </View>

                {/* Participant Counter */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Số lượng thành viên tham gia:</Text>
                  <View style={styles.counterRow}>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => setParticipantsCount(p => Math.max(1, p - 1))}
                    >
                      <Ionicons name="remove" size={18} color={Colors.ink} />
                    </TouchableOpacity>
                    <Text style={styles.counterVal}>{participantsCount} Người</Text>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => setParticipantsCount(p => Math.min(4, p + 1))}
                    >
                      <Ionicons name="add" size={18} color={Colors.ink} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Contact info */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Thông tin liên hệ đại diện:</Text>
                  <TextInput
                    style={styles.input}
                    value={contactName}
                    onChangeText={setContactName}
                    placeholder="Họ tên người đặt..."
                  />
                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    value={contactPhone}
                    onChangeText={setContactPhone}
                    placeholder="Số điện thoại Zalo..."
                    keyboardType="phone-pad"
                  />
                </View>

                {/* Cost Breakdown */}
                <View style={styles.pricingCard}>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Giá tour / người:</Text>
                    <Text style={styles.priceVal}>{pricePerPerson.toLocaleString('vi-VN')} đ</Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Số lượng:</Text>
                    <Text style={styles.priceVal}>x {participantsCount}</Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Bảo hiểm trekking 100tr:</Text>
                    <Text style={styles.freeBadge}>Miễn phí</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.priceRow}>
                    <Text style={styles.totalLabel}>Tổng thanh toán:</Text>
                    <Text style={styles.totalVal}>{totalPrice.toLocaleString('vi-VN')} đ</Text>
                  </View>
                </View>

                {/* Action button */}
                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
                  <Ionicons name="card" size={20} color={Colors.onPrimary} />
                  <Text style={styles.confirmBtnText}>Xác Nhận & Giữ Chỗ Ngay</Text>
                </TouchableOpacity>
              </View>
            )}
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  tourType: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0c2000',
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  slotsLeft: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.onSurface,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 8,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  counterVal: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  input: {
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: 12,
    fontSize: 13,
    color: Colors.onSurface,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  pricingCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 16,
    ...Shadows.card,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  priceVal: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  freeBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.onSurface,
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primaryDark,
  },
  confirmBtn: {
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadows.hover,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successIcon: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.onSurface,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginVertical: 8,
    lineHeight: 18,
  },
  ticketCard: {
    width: '100%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginVertical: 16,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  ticketCode: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.primaryDark,
  },
  ticketDivider: {
    height: 1,
    backgroundColor: Colors.surfaceContainer,
    marginVertical: 10,
  },
  ticketDetails: {
    gap: 4,
  },
  ticketTripName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  ticketMeta: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  ticketTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginTop: 4,
  },
});
