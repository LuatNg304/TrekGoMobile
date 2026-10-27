import { useCallback, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/AuthContext';
import { listLocalTrips, getPackage, downloadPackage } from '@/features/trip-gps/services/trip-gps.local';
import { gpsRequest, gpsBase, fetchGroup } from '@/features/trip-gps/services/trip-gps.client';
import { Colors, Radius } from '@/constants/theme';

interface Props { tripId: string; tripType: 'PUBLIC' | 'PRIVATE'; tripTitle: string; tripStatus: string }
export function TripGpsButton({ tripId, tripType, tripTitle, tripStatus }: Props) {
  const router = useRouter(), { user } = useAuth();
  const account = user?.id;
  const [opened, setOpened] = useState(false), [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [canEnd, setCanEnd] = useState(false);
  const [ended, setEnded] = useState(false);
  const reload = useCallback(async () => {
    if (!account) return;
    const [trips, pkg] = await Promise.all([listLocalTrips(account, tripId), getPackage(account, tripId)]);
    setOpened(trips.some(t => t.session.status !== 'STOPPED')); setReady(!!pkg);
  }, [account, tripId]);
  useFocusEffect(useCallback(() => {
    let alive = true; setEnded(false); setCanEnd(false);
    void reload().catch(() => {});
    if (account && tripStatus === 'IN_PROGRESS') void fetchGroup(account, tripId).then(state => {
      if (alive) setCanEnd(['HOST', 'LEADER'].includes(state.members.find(m => m.userId === account)?.tripRole ?? ''));
    }).catch(() => {});
    return () => { alive = false; };
  }, [reload, account, tripId, tripStatus]));
  const style = { padding: 15, borderRadius: Radius.lg, backgroundColor: Colors.primaryDark, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 };
  const open = () => router.push({ pathname: '/navigation', params: { tripId, tripType, tripTitle } });
  return <View style={{ gap: 8 }}>
    <TouchableOpacity style={style} onPress={open} accessibilityRole="button">
      <Ionicons name="navigate-circle-outline" size={23} color="#fff" />
      <Text style={{ color: '#fff', flex: 1, fontWeight: '700' }}>{opened ? 'Phiên GPS cá nhân còn mở · Mở / kết thúc ghi' : 'Vào chế độ GPS'}</Text>
    </TouchableOpacity>
    <TouchableOpacity style={{ ...style, backgroundColor: Colors.surfaceContainer }} disabled={busy} onPress={async () => {
      if (!account || busy) return; setBusy(true);
      try { await downloadPackage(account, tripId); await reload(); Alert.alert('Đã tải dữ liệu chuyến', 'Tuyến và checkpoint đã lưu trên máy. Bản đồ nền vẫn cần kết nối.'); }
      catch (e) { Alert.alert('Chưa tải được tuyến', e instanceof Error ? e.message : String(e)); }
      finally { setBusy(false); }
    }}>
      <Ionicons name="download-outline" size={20} color={Colors.ink} /><Text style={{ flex: 1, color: Colors.ink }}>{busy ? 'Đang tải…' : ready ? 'Đã có tuyến offline · Cập nhật' : 'Tải trước tuyến chuyến đi'}</Text>
    </TouchableOpacity>
    {canEnd && !ended && <TouchableOpacity style={{ ...style, backgroundColor: '#a83232' }} disabled={busy} onPress={() => Alert.alert('Kết thúc chuyến đi?', 'Thao tác hoàn thành chuyến không dừng GPS cá nhân. Bạn vẫn có thể mở phiên và kết thúc ghi sau đó.', [
      { text: 'Hủy', style: 'cancel' }, { text: 'Kết thúc chuyến', onPress: async () => {
        if (!account) return; setBusy(true);
        try { await gpsRequest(account, `${gpsBase(tripId)}/end-trip`, undefined, 'POST'); setEnded(true); setCanEnd(false); Alert.alert('Chuyến đã hoàn thành', 'Nếu còn ghi GPS, bấm “Phiên GPS cá nhân còn mở” để kết thúc ghi.'); }
        catch (e) { Alert.alert('Chưa kết thúc được chuyến', e instanceof Error ? e.message : String(e)); }
        finally { setBusy(false); }
      } },
    ])}><Ionicons name="flag-outline" size={20} color="#fff" /><Text style={{ color: '#fff' }}>Kết thúc chuyến</Text></TouchableOpacity>}
  </View>;
}
