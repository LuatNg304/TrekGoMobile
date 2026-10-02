import { Colors, Radius, Shadows } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RootIndex() {
  const router = useRouter();
  const { signInAsRole } = useApp();

  const login = (role: 'STAFF_DELIVERY' | 'LEADER') => {
    signInAsRole(role);
    router.replace('/field-operations');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandMark}><Ionicons name="shield-checkmark" size={28} color={Colors.primary} /></View>
        <Text style={styles.eyebrow}>TREKGO FIELD OPS</Text>
        <Text style={styles.title}>Hệ thống quản lý thực địa & an toàn dã ngoại</Text>
        <Text style={styles.subtitle}>Chọn tài khoản mock để trải nghiệm đúng luồng vận hành của từng vai trò.</Text>
        <View style={styles.securityNotice}>
          <Ionicons name="lock-closed" size={18} color={Colors.primaryDark} />
          <View style={{ flex: 1 }}><Text style={styles.noticeTitle}>PHIÊN AN TOÀN MOCK</Text><Text style={styles.noticeText}>GPS, QR/OTP và chữ ký đang được mô phỏng tại local.</Text></View>
        </View>
        <Text style={styles.sectionLabel}>ĐĂNG NHẬP VỚI TÀI KHOẢN NỘI BỘ</Text>
        <TouchableOpacity style={styles.roleCard} onPress={() => login('STAFF_DELIVERY')} activeOpacity={0.86}>
          <View style={[styles.roleIcon, { backgroundColor: '#e9f4de' }]}><Ionicons name="cube" size={24} color={Colors.primaryDark} /></View>
          <View style={styles.roleCopy}><Text style={styles.roleTitle}>Staff Delivery</Text><Text style={styles.roleEmail}>delivery.mock@trekgo.vn</Text><Text style={styles.roleHint}>Nhận task · xác minh · bàn giao thiết bị</Text></View>
          <Ionicons name="arrow-forward-circle" size={26} color={Colors.primaryDark} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.roleCard} onPress={() => login('LEADER')} activeOpacity={0.86}>
          <View style={[styles.roleIcon, { backgroundColor: '#fff1c7' }]}><Ionicons name="compass" size={24} color="#9b6700" /></View>
          <View style={styles.roleCopy}><Text style={styles.roleTitle}>Mountain Leader</Text><Text style={styles.roleEmail}>leader.mock@trekgo.vn</Text><Text style={styles.roleHint}>Pre-trip · GPS · an toàn · tổng kết</Text></View>
          <Ionicons name="arrow-forward-circle" size={26} color="#9b6700" />
        </TouchableOpacity>
        <View style={styles.footer}><Text style={styles.footerText}>VFRS Field Pro · v4.8.2</Text><Text style={styles.footerText}>Chỉ hiển thị luồng Staff Delivery và Leader</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: 24, paddingTop: 48, paddingBottom: 40 },
  brandMark: { width: 58, height: 58, borderRadius: 16, backgroundColor: Colors.inverseSurface, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  eyebrow: { color: Colors.primaryDark, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: Colors.ink, fontSize: 30, lineHeight: 36, fontWeight: '800', marginTop: 10 },
  subtitle: { color: Colors.body, fontSize: 16, lineHeight: 23, marginTop: 12, marginBottom: 24 },
  securityNotice: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#edf7e7', borderRadius: Radius.md, marginBottom: 28, ...Shadows.card },
  noticeTitle: { color: Colors.primaryDark, fontSize: 12, fontWeight: '800', marginBottom: 4 },
  noticeText: { color: Colors.body, fontSize: 13, lineHeight: 18 },
  sectionLabel: { color: Colors.onSurfaceMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 10 },
  roleCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: Radius.md, marginBottom: 12, ...Shadows.card },
  roleIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  roleCopy: { flex: 1 },
  roleTitle: { color: Colors.ink, fontSize: 17, fontWeight: '800' },
  roleEmail: { color: Colors.onSurfaceVariant, fontSize: 13, marginTop: 3 },
  roleHint: { color: Colors.onSurfaceMuted, fontSize: 12, marginTop: 6 },
  footer: { borderTopWidth: 1, borderTopColor: Colors.surfaceContainerHighest, marginTop: 28, paddingTop: 18 },
  footerText: { color: Colors.onSurfaceMuted, fontSize: 12, textAlign: 'center', marginBottom: 4 },
});
