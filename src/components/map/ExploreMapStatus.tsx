import { useEffect } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { exploreMapService, ExploreMapState, mapTilerConfigured, regionDownloadsEnabled } from '@/services/maps/exploreMapService';

export function ExploreMapStatus({ state }: { state: ExploreMapState }) {
  useEffect(() => {
    if (state.notice) {
      // The persistent accessible banner is the notification; no OS permission needed.
      const timer = setTimeout(() => { void exploreMapService.acknowledgeNotice().catch(() => {}); }, 6000);
      return () => clearTimeout(timer);
    }
  }, [state.notice]);
  const zoom = state.offlineMaxZoom === null ? 'Chưa có mức zoom được lưu tại tâm bản đồ' : `Zoom tối đa ${state.offlineMaxZoom}`;
  const label = state.source === 'ONLINE' ? 'Online' :
    state.source === 'OFFLINE' ? `Offline · ${zoom}` :
    state.source === 'MIXED' ? `Online · Một phần dùng offline · ${zoom}` :
    state.network === 'OFFLINE' ? 'Offline · Chưa có bản đồ khu vực này' : 'Đang kết nối bản đồ';
  const percent = state.total > 0 ? Math.floor(state.completed / state.total * 100) : 0;
  let detail = state.download === 'DOWNLOADING' ? `Đang tải offline quanh bạn · ${percent}% (${state.completed}/${state.total})` :
    state.download === 'VERIFYING' ? 'Đang kiểm tra dữ liệu 2D/3D…' :
    state.download === 'READY' ? 'Đã tải vùng bán kính 2 km · Có 2D/3D · Zoom 10–16' :
    state.download === 'PAUSED' ? `Tải offline tạm dừng · ${state.completed}/${state.total} tile` :
    state.download === 'ERROR' ? 'Chưa tải xong vùng offline' :
    regionDownloadsEnabled ? 'Chờ vị trí GPS để tải vùng quanh bạn' :
    'Lưu tạm phần đã xem · Tải trước vùng chưa được bật cho tài khoản này';
  if (!mapTilerConfigured) detail = 'Chưa cấu hình EXPO_PUBLIC_MAPTILER_API_KEY';
  if (Platform.OS === 'web') detail = 'Bản đồ Explore hiện hỗ trợ Android và iOS';
  return <View style={styles.container} accessibilityLiveRegion="polite">
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.detail}>{detail}</Text>
    {state.locationMessage && <Text style={styles.detail}>{state.locationMessage}</Text>}
    {state.error && <Text style={styles.error}>{state.error}</Text>}
    {state.viewMessage && <Text style={styles.error}>{state.viewMessage}</Text>}
    {state.notice && <Text style={styles.success}>{state.notice}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  container: { padding: 12, gap: 4, backgroundColor: '#eef4e8' },
  label: { fontSize: 12, fontWeight: '800', color: '#20351d' },
  detail: { fontSize: 11, color: '#43533d', lineHeight: 17 },
  error: { fontSize: 11, color: '#9b3827', lineHeight: 17 },
  success: { fontSize: 11, color: '#21632c', lineHeight: 17 },
});
