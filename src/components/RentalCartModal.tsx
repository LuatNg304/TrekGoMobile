import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

interface RentalCartModalProps {
  visible: boolean;
  onClose: () => void;
}

export const RentalCartModal: React.FC<RentalCartModalProps> = ({
  visible,
  onClose,
}) => {
  const { cart, removeFromCart, checkoutRental, activeTrip, rentalOrders } = useApp();
  const rentalDays = activeTrip.durationDays || 3;

  const totalDaily = cart.reduce((sum, c) => sum + c.item.dailyRate * c.quantity, 0);
  const totalRental = totalDaily * rentalDays;
  const totalDeposit = cart.reduce((sum, c) => sum + c.item.deposit * c.quantity, 0);
  const grandTotal = totalRental + totalDeposit;

  const handleCheckout = () => {
    checkoutRental(activeTrip.id, rentalDays);
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
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.tripTag}>
                <Ionicons name="bag" size={12} color="#0c2000" />
                <Text style={styles.tripTagText}>THUÊ THEO CHUYẾN: {activeTrip.name}</Text>
              </View>
              <Text style={styles.title}>Giỏ Thiết Bị Trekking</Text>
              <Text style={styles.subTitle}>Thời gian thuê theo tour: {rentalDays} Ngày</Text>
            </View>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="cart-outline" size={48} color={Colors.surfaceContainerHighest} />
                <Text style={styles.emptyText}>Giỏ thuê của bạn đang trống</Text>
                <Text style={styles.emptySub}>
                  Hãy chọn các thiết bị leo núi cao cấp từ danh mục Rental để thêm vào giỏ.
                </Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {cart.map(({ item, quantity }) => (
                  <View key={item.id} style={styles.itemRow}>
                    <Image source={{ uri: item.imageUrl }} style={styles.itemThumb} />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemDailyPrice}>
                        {item.dailyRate.toLocaleString('vi-VN')} đ / ngày × {quantity}
                      </Text>
                      <Text style={styles.itemDepositText}>
                        Tiền cọc: {(item.deposit * quantity).toLocaleString('vi-VN')} đ (Hoàn lại 100% khi trả đồ)
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeFromCart(item.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ba1a1a" />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Calculation Summary */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tiền thuê ({rentalDays} ngày):</Text>
                    <Text style={styles.summaryValue}>{totalRental.toLocaleString('vi-VN')} đ</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tiền đặt cọc bảo đảm:</Text>
                    <Text style={styles.summaryValue}>{totalDeposit.toLocaleString('vi-VN')} đ</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.totalLabel}>Tổng tạm tính:</Text>
                    <Text style={styles.totalValue}>{grandTotal.toLocaleString('vi-VN')} đ</Text>
                  </View>
                  <Text style={styles.refundNote}>
                    * Tiền cọc sẽ được hoàn trả tự động vào tài khoản ngân hàng ngay khi kết thúc tour và bàn giao thiết bị tại điểm tập kết.
                  </Text>
                </View>

                {/* Checkout CTA */}
                <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout} activeOpacity={0.85}>
                  <Ionicons name="shield-checkmark" size={20} color={Colors.onPrimary} />
                  <Text style={styles.checkoutBtnText}>Xác Nhận Thuê & Đặt Cọc</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Active Rental Tracking Timeline */}
            {rentalOrders.length > 0 && (
              <View style={styles.trackingSection}>
                <Text style={styles.trackingHeaderTitle}>Đơn Thuê Đang Hoạt Động (Tracking)</Text>
                {rentalOrders.map(order => (
                  <View key={order.id} style={styles.orderCard}>
                    <View style={styles.orderTop}>
                      <Text style={styles.orderId}>{order.id}</Text>
                      <View style={styles.orderStatusBadge}>
                        <Text style={styles.orderStatusText}>SẴN SÀNG GIAO TẠI XE</Text>
                      </View>
                    </View>
                    <Text style={styles.orderTrip}>{order.tripName}</Text>

                    {/* Timeline steps */}
                    <View style={styles.timeline}>
                      <View style={styles.timelineStep}>
                        <View style={[styles.timelineDot, styles.dotDone]} />
                        <Text style={styles.stepTextDone}>Đã thanh toán cọc</Text>
                      </View>
                      <View style={styles.timelineLineDone} />
                      <View style={styles.timelineStep}>
                        <View style={[styles.timelineDot, styles.dotDone]} />
                        <Text style={styles.stepTextDone}>Chuẩn bị trang bị</Text>
                      </View>
                      <View style={styles.timelineLineDone} />
                      <View style={styles.timelineStep}>
                        <View style={[styles.timelineDot, styles.dotActive]} />
                        <Text style={styles.stepTextActive}>Giao tại xe 51B-829.41</Text>
                      </View>
                      <View style={styles.timelineLinePending} />
                      <View style={styles.timelineStep}>
                        <View style={[styles.timelineDot, styles.dotPending]} />
                        <Text style={styles.stepTextPending}>Hoàn cọc sau tour</Text>
                      </View>
                    </View>
                  </View>
                ))}
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
    maxHeight: '92%',
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
  tripTag: {
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
  tripTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0c2000',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.onSurface,
  },
  subTitle: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  itemsList: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: 12,
    borderRadius: Radius.lg,
    ...Shadows.card,
  },
  itemThumb: {
    width: 54,
    height: 54,
    borderRadius: Radius.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  itemDailyPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryDark,
    marginTop: 2,
  },
  itemDepositText: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  removeBtn: {
    padding: 6,
  },
  summaryCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: 14,
    marginTop: 8,
    ...Shadows.card,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primaryDark,
  },
  refundNote: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 14,
  },
  checkoutBtn: {
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    ...Shadows.hover,
  },
  checkoutBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  trackingSection: {
    marginTop: 24,
  },
  trackingHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: 10,
  },
  orderCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 10,
    ...Shadows.card,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },
  orderStatusBadge: {
    backgroundColor: '#fff9e6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#fed018',
  },
  orderStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6f5900',
  },
  orderTrip: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: 12,
  },
  timeline: {
    gap: 4,
    paddingLeft: 6,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
  dotDone: {
    backgroundColor: Colors.primaryDark,
  },
  dotActive: {
    backgroundColor: '#fed018',
  },
  dotPending: {
    backgroundColor: Colors.surfaceContainerHighest,
  },
  stepTextDone: {
    fontSize: 11,
    color: Colors.onSurface,
    fontWeight: '600',
  },
  stepTextActive: {
    fontSize: 11,
    color: '#6f5900',
    fontWeight: '800',
  },
  stepTextPending: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  timelineLineDone: {
    width: 2,
    height: 12,
    backgroundColor: Colors.primaryDark,
    marginLeft: 3,
  },
  timelineLinePending: {
    width: 2,
    height: 12,
    backgroundColor: Colors.surfaceContainerHighest,
    marginLeft: 3,
  },
});
