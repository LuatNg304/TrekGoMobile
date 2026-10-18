import { useCallback, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { AppState, Platform } from 'react-native';
import { exploreMapService } from '@/services/maps/exploreMapService';

export function useExploreMap() {
  const state = useSyncExternalStore(exploreMapService.subscribe, exploreMapService.getSnapshot, exploreMapService.getSnapshot);
  useFocusEffect(useCallback(() => {
    if (Platform.OS === 'web') return;
    let disposed = false;
    let run = 0;
    let removeNetwork: (() => void) | undefined;
    let location: Location.LocationSubscription | undefined;
    async function resume() {
      const ticket = ++run;
      const cleanup = await exploreMapService.start();
      if (disposed || ticket !== run) { cleanup(); return; }
      removeNetwork?.();
      removeNetwork = cleanup;
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (disposed || ticket !== run) return;
        if (permission.status !== 'granted') {
          exploreMapService.setLocationMessage('Cho phép vị trí để chuẩn bị bản đồ quanh bạn.');
          return;
        }
        location?.remove();
        const watcher = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 100, timeInterval: 15000 }, value => {
          if (!disposed && ticket === run && (value.coords.accuracy == null || value.coords.accuracy <= 200)) {
            exploreMapService.setPosition([value.coords.longitude, value.coords.latitude]);
          }
        });
        if (disposed || ticket !== run) watcher.remove(); else location = watcher;
      } catch {
        if (!disposed && ticket === run) exploreMapService.setLocationMessage('Chưa lấy được GPS. Bản đồ đã lưu vẫn được giữ.');
      }
    }
    function pause() {
      run++;
      location?.remove(); location = undefined;
      removeNetwork?.(); removeNetwork = undefined;
      exploreMapService.pause();
    }
    void resume();
    const app = AppState.addEventListener('change', status => {
      if (status === 'active') void resume(); else pause();
    });
    return () => { disposed = true; app.remove(); pause(); };
  }, []));
  return state;
}
