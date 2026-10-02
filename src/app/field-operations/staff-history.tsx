import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { FieldModal } from '@/components/FieldModal';

const history = [
  { id: 'DEL-2039', title: 'Bàn giao thiết bị trekking', customer: 'Phạm Tuấn Anh', date: '30.09.2026 · 09:15', status: 'Đã hoàn tất', icon: 'cube-outline' as const },
  { id: 'RET-1174', title: 'Thu hồi thiết bị sau chuyến', customer: 'Nguyễn Hà My', date: '29.09.2026 · 17:40', status: 'Đã hoàn tất', icon: 'return-down-back-outline' as const },
  { id: 'DEL-2028', title: 'Bàn giao thiết bị trekking', customer: 'Lê Minh Quân', date: '28.09.2026 · 08:50', status: 'Đã hoàn tất', icon: 'cube-outline' as const },
];

export default function StaffHistoryScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={23} color={Colors.ink} /></TouchableOpacity><View><Text style={styles.eyebrow}>TREKOPS DELIVERY</Text><Text style={styles.title}>Lịch sử nhiệm vụ</Text></View><View style={{ width: 23 }} /></View>
    <View style={styles.summary}><View><Text style={styles.summaryValue}>12</Text><Text style={styles.summaryLabel}>Task hoàn tất</Text></View><View><Text style={styles.summaryValue}>100%</Text><Text style={styles.summaryLabel}>Đúng SLA</Text></View><Ionicons name="trending-up" size={30} color={Colors.primaryDark} /></View>
    <View style={styles.filterRow}><Text style={styles.section}>THÁNG 09/2026</Text><TouchableOpacity onPress={() => setSelected('filter')}><Text style={styles.filter}>Tất cả ▾</Text></TouchableOpacity></View>
    {history.map(item => <TouchableOpacity key={item.id} style={styles.card} onPress={() => setSelected(item.id)} activeOpacity={0.84}><View style={styles.iconBox}><Ionicons name={item.icon} size={21} color={Colors.primaryDark} /></View><View style={styles.cardCopy}><View style={styles.cardTop}><Text style={styles.id}>{item.id}</Text><Text style={styles.status}>{item.status}</Text></View><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.meta}>{item.customer} · {item.date}</Text></View><Ionicons name="chevron-forward" size={18} color={Colors.onSurfaceMuted} /></TouchableOpacity>)}
  </ScrollView><FieldModal visible={selected !== null} title={selected === 'filter' ? 'Bộ lọc nhiệm vụ' : 'Nhiệm vụ đã hoàn tất'} message={selected === 'filter' ? 'Đang hiển thị toàn bộ task giao và thu hồi trong tháng 09/2026.' : `Bằng chứng, chữ ký và thời gian đồng bộ của ${selected} đã được lưu đầy đủ.`} icon={selected === 'filter' ? 'funnel-outline' : 'checkmark-circle'} actionLabel="Đã hiểu" onAction={() => setSelected(null)} onClose={() => setSelected(null)} /></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: Colors.surface }, content: { padding: 20, paddingBottom: 35 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 }, eyebrow: { color: Colors.primaryDark, fontSize: 10, fontWeight: '800', letterSpacing: 1 }, title: { color: Colors.ink, fontSize: 23, fontWeight: '800', marginTop: 4 }, summary: { flexDirection: 'row', alignItems: 'center', gap: 32, backgroundColor: Colors.inverseSurface, padding: 18, borderRadius: Radius.md, marginBottom: 25 }, summaryValue: { color: Colors.primary, fontSize: 24, fontWeight: '800' }, summaryLabel: { color: '#bfd0bb', fontSize: 11, marginTop: 3 }, filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, section: { color: Colors.onSurfaceMuted, fontSize: 11, fontWeight: '800', letterSpacing: .8, marginBottom: 10 }, filter: { color: Colors.primaryDark, fontSize: 12, fontWeight: '800' }, card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: Radius.sm, marginBottom: 9, gap: 12, ...Shadows.card }, iconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#e9f4de', alignItems: 'center', justifyContent: 'center' }, cardCopy: { flex: 1 }, cardTop: { flexDirection: 'row', justifyContent: 'space-between' }, id: { color: Colors.primaryDark, fontSize: 11, fontWeight: '800' }, status: { color: '#2b8a4b', fontSize: 11, fontWeight: '800' }, cardTitle: { color: Colors.ink, fontSize: 14, fontWeight: '800', marginTop: 5 }, meta: { color: Colors.onSurfaceMuted, fontSize: 11, marginTop: 5 } });