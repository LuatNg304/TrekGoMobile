import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { TopHeader } from '@/components/TopHeader';
import { useApp } from '@/context/AppContext';
import { EquipmentCategory } from '@/types';
import { RentalCartModal } from '@/components/RentalCartModal';

export default function RentalScreen() {
  const { equipment, cart, addToCart, activeTrip } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<EquipmentCategory>('Tất cả');
  const [cartModalVisible, setCartModalVisible] = useState<boolean>(false);

  const categories: EquipmentCategory[] = [
    'Tất cả',
    'Tent',
    'Backpack',
    'Trekking Pole',
    'Sleeping Bag',
    'Accessories',
  ];

  const filteredEquipment = equipment.filter(item => {
    if (selectedCategory === 'Tất cả') return true;
    return item.category === selectedCategory;
  });

  const cartTotalItems = cart.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopHeader subtitle="Rental" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 1. Trip Context Banner */}
        <View style={styles.contextBanner}>
          <View style={styles.contextHeader}>
            <Ionicons name="compass" size={16} color={Colors.primaryDark} />
            <Text style={styles.contextTitle}>TRANG BỊ GẮN THEO CHUYẾN ĐI</Text>
          </View>
          <Text style={styles.tripNameText}>{activeTrip.name}</Text>
          <Text style={styles.tripDetailsSub}>
            Thời gian: {activeTrip.startDate} · Điểm giao đồ: Bến xe Miền Đông mới
          </Text>
        </View>

        {/* 2. Category Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryPill,
                selectedCategory === cat && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === cat && styles.categoryPillTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 3. Products List */}
        <View style={styles.productsGrid}>
          {filteredEquipment.map(item => {
            const inCart = cart.find(c => c.item.id === item.id);

            return (
              <View key={item.id} style={styles.productCard}>
                <View style={styles.imageBox}>
                  <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
                  <View style={styles.stockBadge}>
                    <Text style={styles.stockText}>Còn {item.stock} cái</Text>
                  </View>
                </View>

                <View style={styles.productBody}>
                  <Text style={styles.categoryTag}>{item.category}</Text>
                  <Text style={styles.productTitle}>{item.name}</Text>

                  {/* Specs list */}
                  <View style={styles.specsList}>
                    {item.specs.map((spec, idx) => (
                      <Text key={idx} style={styles.specText}>• {spec}</Text>
                    ))}
                  </View>

                  <View style={styles.pricingRow}>
                    <View>
                      <Text style={styles.dailyPrice}>
                        {item.dailyRate.toLocaleString('vi-VN')} đ <Text style={styles.perDay}>/ngày</Text>
                      </Text>
                      <Text style={styles.depositPrice}>
                        Cọc: {item.deposit.toLocaleString('vi-VN')} đ (Hoàn lại)
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.addBtn,
                        inCart && styles.addBtnInCart,
                      ]}
                      onPress={() => addToCart(item, 1)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={inCart ? 'checkmark' : 'add'}
                        size={18}
                        color={inCart ? '#0c2000' : Colors.onPrimary}
                      />
                      <Text style={[styles.addBtnText, inCart && styles.addBtnTextInCart]}>
                        {inCart ? `Đã thêm (${inCart.quantity})` : 'Thuê món này'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* 4. Floating Cart CTA Bar */}
      {cartTotalItems > 0 && (
        <View style={styles.floatingCartBar}>
          <View style={styles.floatingCartLeft}>
            <View style={styles.cartCountPill}>
              <Text style={styles.cartCountText}>{cartTotalItems}</Text>
            </View>
            <View>
              <Text style={styles.cartBarTitle}>Đã chọn {cartTotalItems} thiết bị</Text>
              <Text style={styles.cartBarSub}>Hoàn cọc 100% khi kết thúc tour</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.cartViewBtn}
            onPress={() => setCartModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.cartViewBtnText}>Xem Giỏ Thuê</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.onPrimary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Rental Cart Modal */}
      <RentalCartModal
        visible={cartModalVisible}
        onClose={() => setCartModalVisible(false)}
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
    paddingBottom: 90,
  },
  contextBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 14,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primaryDark,
    ...Shadows.card,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  contextTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: 0.5,
  },
  tripNameText: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.onSurface,
  },
  tripDetailsSub: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  categoryPillActive: {
    backgroundColor: Colors.ink,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },
  categoryPillTextActive: {
    color: Colors.inverseOnSurface,
  },
  productsGrid: {
    paddingHorizontal: 16,
    gap: 14,
  },
  productCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, // 24px signature rounded card
    overflow: 'hidden',
    ...Shadows.card,
  },
  imageBox: {
    height: 150,
    width: '100%',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  stockBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(30, 35, 28, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  stockText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  productBody: {
    padding: 14,
  },
  categoryTag: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.onSurface,
    marginTop: 2,
    marginBottom: 6,
  },
  specsList: {
    gap: 2,
    marginBottom: 12,
  },
  specText: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    lineHeight: 16,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerLow,
    paddingTop: 10,
  },
  dailyPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.primaryDark,
  },
  perDay: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.onSurfaceVariant,
  },
  depositPrice: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    ...Shadows.card,
  },
  addBtnInCart: {
    backgroundColor: Colors.secondaryContainer,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  addBtnTextInCart: {
    color: '#0c2000',
  },
  floatingCartBar: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    backgroundColor: Colors.inverseSurface,
    borderRadius: Radius.full,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadows.hover,
  },
  floatingCartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartCountPill: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCountText: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.onPrimary,
  },
  cartBarTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.inverseOnSurface,
  },
  cartBarSub: {
    fontSize: 9,
    color: Colors.mute,
  },
  cartViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  cartViewBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
});
