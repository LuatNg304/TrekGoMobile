import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { TopHeader } from '@/components/TopHeader';
import { useApp } from '@/context/AppContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, toggleUserRole, activeTrip, resolveMemberAlert } = useApp();

  const [switchedTrailNotice, setSwitchedTrailNotice] = useState<string | null>(null);

  const offRouteMember = activeTrip.participants.find(p => p.isOffRoute);

  const handleSwitchTrail = () => {
    setSwitchedTrailNotice('Đã chuyển sang Cung Né Lũ Vực Đá (Đường phụ B2). Cập nhật toàn bộ máy GPS của đoàn.');
  };

  const handleCompleteTrip = () => {
    Alert.alert(
      'Hoàn Thành Chuyến Đi',
      'Xác nhận kết thúc chuyến đi Tà Năng – Phan Dũng? Toàn bộ mốc GPS sẽ được khóa và hồ sơ hoàn cọc đồ thuê được kích hoạt.',
      [{ text: 'Đóng' }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopHeader subtitle="Profile" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 1. Profile Identity Header */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarLarge}>
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              <View style={[styles.roleBadgeIcon, user.role === 'LEADER' && styles.roleBadgeLeader]}>
                <Ionicons
                  name={user.role === 'LEADER' ? 'shield-checkmark' : 'walk'}
                  size={14}
                  color={user.role === 'LEADER' ? Colors.onPrimaryContainer : Colors.ink}
                />
              </View>
            </View>

            <View style={styles.identityText}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{user.name}</Text>
                <View style={[styles.rolePill, user.role === 'LEADER' && styles.rolePillLeader]}>
                  <Text style={[styles.rolePillText, user.role === 'LEADER' && styles.rolePillTextLeader]}>
                    {user.role}
                  </Text>
                </View>
              </View>
              <Text style={styles.userEmail}>{user.email}</Text>
              <Text style={styles.userRank}>Hạng: Mountain Explorer Lv.3</Text>
            </View>
          </View>

          {/* Quick Role Toggle Bar */}
          <TouchableOpacity
            style={styles.roleToggleBanner}
            onPress={toggleUserRole}
            activeOpacity={0.85}
          >
            <Ionicons
              name={user.role === 'LEADER' ? 'refresh' : 'swap-horizontal'}
              size={18}
              color={Colors.primaryDark}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.roleToggleTitle}>
                {user.role === 'LEADER' ? 'Đang bật Chế Độ Leader' : 'Chuyển sang Chế Độ Leader'}
              </Text>
              <Text style={styles.roleToggleSub}>
                {user.role === 'LEADER'
                  ? 'Quản lý thành viên, xử lý cảnh báo lạc đoàn & điều hướng'
                  : 'Bấm để trải nghiệm giao diện quản lý chuyến dành cho Leader'}
              </Text>
            </View>
            <View style={[styles.toggleStatePill, user.role === 'LEADER' && styles.toggleStateActive]}>
              <Text style={[styles.toggleStateText, user.role === 'LEADER' && styles.toggleStateTextActive]}>
                {user.role === 'LEADER' ? 'BẬT' : 'THỬ NGAY'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 2. LEADER DASHBOARD CONTROL ROOM (When user.role === 'LEADER') */}
        {user.role === 'LEADER' && (
          <View style={styles.leaderPanel}>
            <View style={styles.panelHeader}>
              <View style={styles.leaderIconBox}>
                <Ionicons name="shield" size={16} color="#0c2000" />
              </View>
              <View>
                <Text style={styles.panelTitle}>TRUNG TÂM CHỈ HUY ĐOÀN TREK</Text>
                <Text style={styles.panelSubtitle}>{activeTrip.name}</Text>
              </View>
            </View>

            {/* CRITICAL MEMBER OFF-ROUTE ALERT */}
            {offRouteMember ? (
              <View style={styles.memberAlertCard}>
                <View style={styles.alertHeaderRow}>
                  <View style={styles.alertIconBadge}>
                    <Ionicons name="warning" size={16} color="#ba1a1a" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertMemberName}>⚠ {offRouteMember.name} ĐANG LỆCH TUYẾN!</Text>
                    <Text style={styles.alertLocation}>
                      Khoảng cách lệch: {offRouteMember.deviationMeters}m · {offRouteMember.lastKnownLocation}
                    </Text>
                  </View>
                </View>

                <View style={styles.alertActionsRow}>
                  <TouchableOpacity
                    style={styles.radioBtn}
                    onPress={() => Alert.alert('VHF Radio Kênh 2', 'Đang kết nối đàm thoại với Nguyễn Văn A...')}
                  >
                    <Ionicons name="radio" size={14} color="#0c2000" />
                    <Text style={styles.radioBtnText}>Gọi đàm VHF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resolveBtn}
                    onPress={() => resolveMemberAlert(offRouteMember.id)}
                  >
                    <Ionicons name="checkmark-circle" size={14} color="#ffffff" />
                    <Text style={styles.resolveBtnText}>Xác nhận an toàn</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.memberAllSafeCard}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.primaryDark} />
                <Text style={styles.memberAllSafeText}>Toàn bộ 6/6 thành viên đang bám sát đúng tuyến route GPS.</Text>
              </View>
            )}

            {/* Switched Trail Notice */}
            {switchedTrailNotice && (
              <View style={styles.switchedNoticeBox}>
                <Ionicons name="information-circle" size={16} color="#2f6c00" />
                <Text style={styles.switchedNoticeText}>{switchedTrailNotice}</Text>
              </View>
            )}

            {/* Leader Controls Buttons */}
            <View style={styles.leaderControlsGrid}>
              <TouchableOpacity
                style={styles.leaderControlBtn}
                onPress={handleSwitchTrail}
                activeOpacity={0.8}
              >
                <Ionicons name="git-branch" size={18} color={Colors.ink} />
                <Text style={styles.leaderControlText}>Đổi Cung Đường Phụ (Switch Trail)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.leaderControlBtn, { backgroundColor: Colors.surfaceContainerHighest }]}
                onPress={handleCompleteTrip}
                activeOpacity={0.8}
              >
                <Ionicons name="flag-outline" size={18} color={Colors.primaryDark} />
                <Text style={styles.leaderControlText}>Chốt Hoàn Thành Chuyến Đi</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 3. Trekker Statistics Bento */}
        <View style={styles.statsGrid}>
          <View style={styles.statTile}>
            <Text style={styles.statNumber}>{user.completedTripsCount}</Text>
            <Text style={styles.statLabel}>Chuyến đi đã chốt</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statNumber}>{user.totalDistanceKm}</Text>
            <Text style={styles.statLabel}>Km cự ly hoàn tất</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statNumber}>{user.unlockedTrailsCount}</Text>
            <Text style={styles.statLabel}>Trails sở hữu</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statNumber}>{user.savedPoints}</Text>
            <Text style={styles.statLabel}>Điểm thưởng</Text>
          </View>
        </View>

        {/* 4. Action Menu List */}
        <View style={styles.menuSection}>
          <Text style={styles.menuGroupTitle}>QUẢN LÝ TÀI KHOẢN & HOẠT ĐỘNG</Text>

          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuRow}>
              <View style={styles.menuIconCircle}>
                <Ionicons name="person-outline" size={16} color={Colors.onSurface} />
              </View>
              <Text style={styles.menuText}>Thông tin cá nhân & Giấy tờ leo núi</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/(tabs)/trips')}>
              <View style={styles.menuIconCircle}>
                <Ionicons name="ticket-outline" size={16} color={Colors.onSurface} />
              </View>
              <Text style={styles.menuText}>Vé Public Tour đã đặt (#BK-8842)</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/(tabs)/explore')}>
              <View style={styles.menuIconCircle}>
                <Ionicons name="map-outline" size={16} color={Colors.onSurface} />
              </View>
              <Text style={styles.menuText}>Cung đường cá nhân (Personal Trails)</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/(tabs)/rental')}>
              <View style={styles.menuIconCircle}>
                <Ionicons name="cube-outline" size={16} color={Colors.onSurface} />
              </View>
              <Text style={styles.menuText}>Đơn thuê thiết bị & Biên nhận cọc</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuRow}>
              <View style={styles.menuIconCircle}>
                <Ionicons name="medal-outline" size={16} color={Colors.primaryDark} />
              </View>
              <Text style={styles.menuText}>Chứng nhận & Thẩm định Leader TrekGo</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. Logout */}
        <TouchableOpacity style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={18} color="#ba1a1a" />
          <Text style={styles.logoutText}>Đăng xuất tài khoản</Text>
        </TouchableOpacity>
      </ScrollView>
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
  profileHeaderCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, // 24px signature rounded card
    padding: 16,
    marginBottom: 16,
    ...Shadows.hover,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatarLarge: {
    width: 68,
    height: 68,
    borderRadius: Radius.full,
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.full,
  },
  roleBadgeIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surfaceContainerLowest,
  },
  roleBadgeLeader: {
    backgroundColor: Colors.primaryContainer,
  },
  identityText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.onSurface,
  },
  rolePill: {
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  rolePillLeader: {
    backgroundColor: Colors.primaryContainer,
  },
  rolePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.ink,
  },
  rolePillTextLeader: {
    color: Colors.onPrimaryContainer,
  },
  userEmail: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  userRank: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryDark,
    marginTop: 2,
  },
  roleToggleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceContainerLow,
    padding: 12,
    borderRadius: Radius.lg,
  },
  roleToggleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  roleToggleSub: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  toggleStatePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  toggleStateActive: {
    backgroundColor: Colors.primaryContainer,
  },
  toggleStateText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  toggleStateTextActive: {
    color: Colors.onPrimaryContainer,
  },
  leaderPanel: {
    marginHorizontal: 16,
    backgroundColor: '#f5faef',
    borderWidth: 1.5,
    borderColor: Colors.primaryDark,
    borderRadius: Radius.xl,
    padding: 16,
    marginBottom: 16,
    ...Shadows.card,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  leaderIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: 0.5,
  },
  panelSubtitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.onSurface,
  },
  memberAlertCard: {
    backgroundColor: '#fff9e6',
    borderWidth: 1.5,
    borderColor: '#fed018',
    borderRadius: Radius.lg,
    padding: 12,
    marginBottom: 12,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  alertIconBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: '#ffdad6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertMemberName: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ba1a1a',
  },
  alertLocation: {
    fontSize: 10,
    color: '#564500',
    marginTop: 1,
  },
  alertActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  radioBtn: {
    flex: 1,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  radioBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0c2000',
  },
  resolveBtn: {
    flex: 1,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  resolveBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  memberAllSafeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: 10,
    borderRadius: Radius.md,
    marginBottom: 12,
  },
  memberAllSafeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  switchedNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryPale,
    padding: 10,
    borderRadius: Radius.md,
    marginBottom: 12,
  },
  switchedNoticeText: {
    fontSize: 11,
    color: Colors.primaryDark,
    fontWeight: '600',
    flex: 1,
  },
  leaderControlsGrid: {
    gap: 8,
  },
  leaderControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
  },
  leaderControlText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  statTile: {
    width: '48%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: 14,
    alignItems: 'center',
    ...Shadows.card,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.onSurface,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  menuSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  menuGroupTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  menuCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.card,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerLow,
    gap: 12,
  },
  menuIconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: '#ffdad6',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ba1a1a',
  },
});
