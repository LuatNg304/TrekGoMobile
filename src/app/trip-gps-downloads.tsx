import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/AuthContext';
import { listPackages, listLocalTrips, deletePackage, downloadPackage, checkPackageGrants } from '@/features/trip-gps/services/trip-gps.local';
import { tripGpsRuntime } from '@/features/trip-gps/services/trip-gps.runtime';
import type { CachedPackage, LocalTrip } from '@/features/trip-gps/contract';
import { Colors } from '@/constants/theme';

const badge = (trip: LocalTrip) => trip.session.status === 'ACTIVE' ? 'Đang ghi trên máy' : trip.session.status === 'PAUSED' ? 'Đang tạm dừng' : ({ PENDING: 'Đã lưu trên máy · Chờ đồng bộ', SYNCING: 'Đang đồng bộ', PROCESSING: 'Máy chủ đang xử lý', SYNCED: 'Đã đồng bộ · Chưa công nhận thành tích', WAITING_NETWORK: 'Chờ kết nối để đồng bộ', NEEDS_ATTENTION: 'Cần kiểm tra lại' }[trip.syncStatus]);
export default function TripGpsDownloads() {
  const { user } = useAuth(), router = useRouter();
  const account = user?.id;
  const [clock, setClock] = useState(() => Date.now());
  const [packages, setPackages] = useState<CachedPackage[]>([]), [trips, setTrips] = useState<LocalTrip[]>([]);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState<string | null>(null), [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setClock(Date.now());
    if (!account) { setPackages([]); setTrips([]); setLoading(false); return; }
    const [p, t] = await Promise.all([listPackages(account), listLocalTrips(account)]); setPackages(p); setTrips(t); setLoading(false);
  }, [account]);
  useFocusEffect(useCallback(() => {
    let active = true;
    void reload().catch(e => { if (active) { setError(String(e)); setLoading(false); } });
    if (account) void checkPackageGrants(account).then(() => { if (active) return reload(); }).catch(() => {});
    const off = tripGpsRuntime.on(event => { if (active && event.kind === 'refresh') void reload().catch(() => {}); });
    return () => { active = false; off(); };
  }, [reload, account]));
  const run = async (key: string, fn: () => Promise<unknown>) => {
    if (busy) return; setBusy(key); setError(null);
    try { await fn(); await reload(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  };
  const card = { padding: 16, marginBottom: 12, borderRadius: 16, backgroundColor: Colors.surfaceContainer, gap: 10 };
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
    <View style={{ flexDirection: 'row', padding: 20, gap: 12, alignItems: 'center' }}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Colors.ink} /></TouchableOpacity><Text style={{ color: Colors.ink, fontSize: 21, fontWeight: '700' }}>Dữ liệu GPS trên máy</Text></View>
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ color: Colors.body, marginBottom: 16 }}>Tải tuyến từ chi tiết chuyến đi trước khi mất mạng. Chỉ tọa độ và checkpoint được lưu; bản đồ nền cần kết nối.</Text>
      {loading && <ActivityIndicator />}{error && <Text style={{ color: '#a83232', marginBottom: 12 }}>{error}</Text>}
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Tuyến đã tải ({packages.length})</Text>
      {packages.filter(p => p.accountId === account).map(p => {
        const expired = clock >= Date.parse(p.data.grant.claims.offlineAccessUntil);
        const status = p.grantStatus === 'REVOKED' ? 'Quyền đã bị thu hồi' : p.grantStatus === 'REVIEW_REQUIRED' || p.grantStatus === 'INVALID' ? 'Cần kiểm tra lại quyền' : expired ? 'Quyền offline đã hết hạn' : p.refreshRequired ? 'Có thay đổi · Nên cập nhật' : 'Sẵn sàng offline';
        return <View key={p.tripId} style={card}>
          <Text style={{ fontWeight: '700', color: Colors.ink }}>{p.data.snapshot.title}</Text>
          <Text>{status} · Hạn {new Date(p.data.grant.claims.offlineAccessUntil).toLocaleString('vi-VN')}</Text>
          <Text>Đã tải {new Date(p.downloadedAt).toLocaleString('vi-VN')} · Phiên bản {p.data.packageVersion.slice(0, 10)}</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/navigation', params: { tripId: p.tripId, tripTitle: p.data.snapshot.title } })}><Text style={{ color: Colors.primaryDark, fontWeight: '700' }}>Xem tuyến / Ghi GPS</Text></TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 24 }}>
            <TouchableOpacity disabled={!!busy} onPress={() => { if (account) void run(p.tripId, () => downloadPackage(account, p.tripId)); }}><Text style={{ color: Colors.primaryDark }}>{busy === p.tripId ? 'Đang cập nhật…' : 'Cập nhật'}</Text></TouchableOpacity>
            <TouchableOpacity disabled={!!busy} onPress={() => Alert.alert('Xóa tuyến tải về?', 'Lịch sử GPS và dữ liệu đang phục vụ phiên ghi sẽ được giữ lại.', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa bản tải', style: 'destructive', onPress: () => { if (account) void run(p.tripId, () => deletePackage(account, p.tripId)); } }])}><Text style={{ color: '#a83232' }}>Xóa bản tải</Text></TouchableOpacity>
          </View>
        </View>;
      })}
      {!loading && !packages.length && <Text style={{ marginBottom: 20 }}>Chưa có tuyến tải về. Mở chi tiết chuyến và bấm “Tải trước tuyến chuyến đi”.</Text>}
      <Text style={{ fontSize: 18, fontWeight: '700', marginVertical: 12 }}>Phiên ghi & lịch sử ({trips.length})</Text>
      {trips.filter(t => t.accountId === account).map(t => <View style={card} key={t.session.id}>
        <Text style={{ fontWeight: '700' }}>{t.package.snapshot.title}</Text><Text>{badge(t)} · GPS mô phỏng</Text>
        <Text>{new Date(t.session.startedAt).toLocaleString('vi-VN')} · {t.session.sampleCount} điểm</Text>
        {t.result && <Text>Máy chủ đã xử lý: {(t.result.totalDistanceMeters / 1000).toFixed(2)} km · {t.result.pointCount}/{t.result.rawSampleCount} điểm · {t.result.rejectedSamples.length} điểm bị loại</Text>}
        {t.lastError && <Text style={{ color: '#a83232' }}>{t.lastError}</Text>}
        <TouchableOpacity onPress={() => router.push({ pathname: '/navigation', params: { tripId: t.session.tripId, tripTitle: t.package.snapshot.title, localSessionId: t.session.id } })}><Text style={{ color: Colors.primaryDark, fontWeight: '700' }}>{t.session.status !== 'STOPPED' ? 'Mở phiên / Kết thúc ghi' : 'Xem hành trình đã lưu'}</Text></TouchableOpacity>
        {t.session.status === 'STOPPED' && !t.finalProcessed && <TouchableOpacity disabled={!!busy} onPress={() => { void run(t.session.id, () => tripGpsRuntime.sync(true)); }}><Text style={{ color: Colors.primaryDark }}>Thử đồng bộ lại</Text></TouchableOpacity>}
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}
