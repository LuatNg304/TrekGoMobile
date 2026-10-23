import { MAPTILER_STYLE_URL } from "@/constants/map";
import { Colors, Radius, Shadows } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

export interface MapCoordinate {
  latitude: number;
  longitude: number;
  elevation?: number | null;
}

export interface MapCheckpoint {
  id: string;
  name: string;
  order: number;
  latitude: number;
  longitude: number;
  elevation?: number | null;
  status?: "COMPLETED" | "PENDING";
}

export type MapRouteCoordinates =
  | [number, number, number?][]
  | [number, number, number?][][];

export interface MapLibre3DViewProps {
  height?: number;
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  pitch?: number;
  bearing?: number;
  is3D?: boolean;
  plannedRoute?: MapRouteCoordinates;
  traveledRoute?: MapRouteCoordinates;
  currentPosition?: MapCoordinate | null;
  checkpoints?: MapCheckpoint[];
  showEndpoints?: boolean; // Tự động hiển thị mốc START và END tại điểm đầu và điểm cuối của route vẽ
  interactive?: boolean;
  dragRotate?: boolean;
  followUser?: boolean; // Tự động trượt camera bám theo GPS (giữ nguyên mức zoom)
  autoCenterOnUser?: boolean;
  onMapReady?: () => void;
  onCheckpointPress?: (checkpointId: string) => void;
  onUserInteraction?: () => void; // Người dùng chủ động chạm/vuốt/zoom bản đồ
  onCompassPress?: () => void; // Người dùng bấm la bàn (reset hướng Bắc)
  onLocatePress?: () => void; // Người dùng bấm nút định vị (zoom lại vị trí người dùng)
}

export interface MapLibre3DViewRef {
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  easeTo: (lng: number, lat: number) => void;
  toggle3D: () => void;
  resetCamera: () => void;
  centerOnUser: (lng?: number, lat?: number, zoom?: number) => void;
  fitBounds: (
    bounds: [[number, number], [number, number]],
    padding?: number,
  ) => void;
}

const MapLibre3DViewBase = forwardRef<MapLibre3DViewRef, MapLibre3DViewProps>(
  (
    {
      height,
      center = [108.529, 11.5831], // Mặc định Lâm Đồng / Tà Năng
      zoom = 13.5,
      minZoom = 10,
      maxZoom = 18,
      pitch = 60,
      bearing = -20,
      is3D = true,
      plannedRoute = [],
      traveledRoute = [],
      currentPosition = null,
      checkpoints = [],
      showEndpoints = true,
      interactive = true,
      dragRotate = true, // Cho phép xoay tròn 360 độ ở cả 2D và 3D để quan sát địa hình mọi hướng
      followUser = false,
      autoCenterOnUser = false,
      onMapReady,
      onCheckpointPress,
      onUserInteraction,
      onCompassPress,
      onLocatePress,
    },
    ref,
  ) => {
    const webViewRef = useRef<WebView>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [is3DMode, setIs3DMode] = useState(is3D);
    const [currentBearing, setCurrentBearing] = useState(0);

    // Cấu hình ban đầu được giữ cố định để WebView KHÔNG bị reload lại mỗi khi props thay đổi
    const initialConfig = useRef({
      center,
      zoom,
      minZoom,
      maxZoom,
      pitch: is3D ? pitch : 0,
      bearing,
      interactive,
      is3D,
      dragRotate,
      showEndpoints,
    }).current;

    useImperativeHandle(ref, () => ({
      flyTo: (lng: number, lat: number, targetZoom = 14) => {
        runInMap(`flyTo([${lng}, ${lat}], ${targetZoom});`);
      },
      easeTo: (lng: number, lat: number) => {
        runInMap(`easeTo([${lng}, ${lat}]);`);
      },
      toggle3D: () => {
        setIs3DMode((prev) => {
          const next = !prev;
          runInMap(`set3DMode(${next});`);
          return next;
        });
      },
      resetCamera: () => {
        runInMap(`resetCamera();`);
      },
      centerOnUser: (lng?: number, lat?: number, targetZoom?: number) => {
        const zoomParam = targetZoom !== undefined ? `, ${targetZoom}` : "";
        if (lng !== undefined && lat !== undefined) {
          runInMap(`centerOnUser(${lng}, ${lat}${zoomParam});`);
        } else if (currentPosition) {
          runInMap(
            `centerOnUser(${currentPosition.longitude}, ${currentPosition.latitude}${zoomParam});`,
          );
        } else {
          runInMap(`centerOnUser(undefined, undefined${zoomParam});`);
        }
      },
      fitBounds: (
        bounds: [[number, number], [number, number]],
        padding = 40,
      ) => {
        runInMap(`fitBounds(${JSON.stringify(bounds)}, ${padding});`);
      },
    }));

    const runInMap = (jsCode: string) => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          try {
            ${jsCode}
          } catch(e) {
            console.error(e);
          }
          true;
        `);
      }
    };

    // Chỉ đẩy traveledRoute vào WebView khi có toạ độ mới được ghi nhận (tránh spam lệnh khi render)
    const prevTraveledCount = useRef(-1);
    useEffect(() => {
      if (!isLoaded) return;
      const totalPoints =
        Array.isArray(traveledRoute) &&
        traveledRoute.length > 0 &&
        Array.isArray(traveledRoute[0]) &&
        Array.isArray((traveledRoute[0] as any)[0])
          ? (traveledRoute as any[][]).reduce(
              (acc, seg) => acc + (Array.isArray(seg) ? seg.length : 0),
              0,
            )
          : traveledRoute?.length || 0;

      if (totalPoints !== prevTraveledCount.current) {
        prevTraveledCount.current = totalPoints;
        runInMap(`
          updateTraveledRoute(${JSON.stringify(traveledRoute)});
        `);
      }
    }, [traveledRoute, isLoaded]);

    // Khi plannedRoute thay đổi
    useEffect(() => {
      if (!isLoaded) return;
      runInMap(`
        updatePlannedRoute(${JSON.stringify(plannedRoute)});
      `);
    }, [plannedRoute, isLoaded]);

    // Khi checkpoints thay đổi
    useEffect(() => {
      if (!isLoaded) return;
      runInMap(`
        updateCheckpoints(${JSON.stringify(checkpoints)});
      `);
    }, [checkpoints, isLoaded]);

    // Khi vị trí hiện tại thay đổi -> Cập nhật vị trí marker và pan camera nếu followUser = true (giữ nguyên zoom)
    const hasCenteredInitialUser = useRef(false);
    useEffect(() => {
      if (!isLoaded || !currentPosition) return;
      runInMap(`
        updateCurrentPosition(${currentPosition.longitude}, ${currentPosition.latitude}, ${Boolean(followUser)});
      `);
      if (!hasCenteredInitialUser.current && autoCenterOnUser) {
        hasCenteredInitialUser.current = true;
        runInMap(`
          centerOnUser(${currentPosition.longitude}, ${currentPosition.latitude});
        `);
      }
    }, [currentPosition, isLoaded, followUser, autoCenterOnUser]);

    // Safety fallback: Tự động tắt loading overlay sau 3.5s nếu WebView chậm
    useEffect(() => {
      const fallbackTimer = setTimeout(() => {
        setIsLoaded(true);
      }, 3500);
      return () => clearTimeout(fallbackTimer);
    }, []);

    const handleMessage = (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "MAP_READY") {
          setIsLoaded(true);
          onMapReady?.();
        } else if (data.type === "CHECKPOINT_CLICK") {
          onCheckpointPress?.(data.id);
        } else if (data.type === "USER_INTERACTION") {
          onUserInteraction?.();
        } else if (data.type === "BEARING_CHANGE") {
          setCurrentBearing(Math.round(data.bearing || 0));
        } else if (data.type === "LOG") {
          console.warn("[MapLibre3DView WebView]", data.message);
        }
      } catch (err) {
        console.warn("[MapLibre3DView] Message error:", err);
      }
    };

    // Tạo HTML template tự chứa MapLibre GL JS với Terrarium 3D Terrain & ArcGIS Satellite
    // Được memoize để giữ nguyên instance bản đồ, KHÔNG bị reload lại làm giật/zoom
    const htmlContent = useMemo(
      () => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>TrekGo Tactical 3D Map</title>
  <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; background: #081008; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    
    /* Marker Styles */
    .checkpoint-marker {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #fed018;
      border: 3px solid #142013;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(0,0,0,0.6);
      color: #382b00;
      font-size: 11px;
      font-weight: 800;
      cursor: pointer;
    }
    .checkpoint-marker.completed {
      background: #38ef7d;
      color: #0c2000;
      border-color: #0c2000;
    }
    /* Start / End Route Endpoint Badges (S & E) */
    .endpoint-marker {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 900;
      color: #ffffff;
      border: 2px solid #ffffff;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.7);
      user-select: none;
      cursor: pointer;
      line-height: 1;
    }
    .endpoint-marker.start {
      background: #10b981;
    }
    .endpoint-marker.end {
      background: #ef4444;
    }
    .user-marker {
      width: 28px;
      height: 28px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .user-marker-core {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #38ef7d;
      border: 2.5px solid #ffffff;
      box-shadow: 0 0 10px rgba(56, 239, 125, 0.95);
      position: relative;
      z-index: 2;
    }
    .user-marker-pulse {
      position: absolute;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(56, 239, 125, 0.35);
      border: 1.5px solid rgba(56, 239, 125, 0.7);
      animation: userMarkerPulse 1.8s infinite ease-out;
      z-index: 1;
    }
    @keyframes userMarkerPulse {
      0% { transform: scale(0.4); opacity: 1; }
      100% { transform: scale(1.7); opacity: 0; }
    }
    .maplibregl-popup-content {
      background: transparent !important;
      padding: 0 !important;
      box-shadow: none !important;
    }
    .maplibregl-popup-tip {
      border-top-color: #0c2000 !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const INITIAL_CENTER = [${initialConfig.center[0]}, ${initialConfig.center[1]}];
    const INITIAL_ZOOM = ${initialConfig.zoom};
    const INITIAL_PITCH = ${initialConfig.pitch};
    const INITIAL_BEARING = ${initialConfig.bearing};

    const map = new maplibregl.Map({
      container: 'map',
      style: ${JSON.stringify(MAPTILER_STYLE_URL)},
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      minZoom: ${initialConfig.minZoom},
      maxZoom: ${initialConfig.maxZoom},
      pitch: INITIAL_PITCH,
      minPitch: 0,
      maxPitch: 65,
      bearing: INITIAL_BEARING,
      interactive: ${initialConfig.interactive},
      dragPan: true,
      scrollZoom: true,
      dragRotate: ${Boolean(initialConfig.dragRotate)},
      touchZoomRotate: true,
      touchPitch: true,
      pitchWithRotate: true
    });

    // Cấu hình xoay và nghiêng bằng cảm ứng (cho phép xoay 360 độ cả 2D và 3D trên mobile)
    if (${Boolean(initialConfig.dragRotate)}) {
      if (map.touchZoomRotate) {
        map.touchZoomRotate.enable();
        map.touchZoomRotate.enableRotation();
      }
      if (map.touchPitch) {
        map.touchPitch.enable();
      }
    } else {
      if (map.touchZoomRotate) {
        map.touchZoomRotate.disableRotation();
      }
      if (map.touchPitch) {
        map.touchPitch.disable();
      }
    }

    // Lắng nghe thao tác người dùng chủ động vuốt, zoom, xoay hoặc nghiêng để tắt Follow Mode
    map.on('dragstart', function() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'USER_INTERACTION' }));
      }
    });

    map.on('zoomstart', function(e) {
      if (e && e.originalEvent && window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'USER_INTERACTION' }));
      }
    });

    map.on('rotatestart', function() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'USER_INTERACTION' }));
      }
    });

    map.on('pitchstart', function() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'USER_INTERACTION' }));
      }
    });

    // Gửi góc bearing hiện tại về React Native để kim la bàn xoay trực quan
    map.on('rotate', function() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'BEARING_CHANGE',
          bearing: map.getBearing()
        }));
      }
    });

    window.onerror = function(msg, url, line) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOG', message: msg + ' (' + line + ')' }));
      }
    };

    let checkpointMarkers = [];
    let startMarker = null;
    let endMarker = null;
    let userMarker = null;

    function extractEndpoints(coords) {
      if (!coords || !coords.length) return null;
      var flat = [];
      if (Array.isArray(coords[0]) && coords[0].length > 0 && Array.isArray(coords[0][0])) {
        // Multi-segment: Chỉ lấy các phân đoạn thực sự được vẽ đường (tối thiểu 2 điểm)
        for (var i = 0; i < coords.length; i++) {
          if (Array.isArray(coords[i]) && coords[i].length >= 2) {
            flat = flat.concat(coords[i]);
          }
        }
        // Fallback: nếu chưa segment nào đạt >= 2 điểm (ví dụ vừa bắt đầu ghi nhận điểm đầu tiên)
        if (flat.length === 0) {
          for (var j = 0; j < coords.length; j++) {
            if (Array.isArray(coords[j]) && coords[j].length > 0) {
              flat = flat.concat(coords[j]);
            }
          }
        }
      } else {
        flat = coords;
      }
      if (!flat || flat.length === 0) return null;
      return {
        start: [flat[0][0], flat[0][1]],
        end: [flat[flat.length - 1][0], flat[flat.length - 1][1]]
      };
    }

    window.updateEndpoints = function(endpoints) {
      if (!${Boolean(initialConfig.showEndpoints)}) return;
      if (startMarker) {
        startMarker.remove();
        startMarker = null;
      }
      if (endMarker) {
        endMarker.remove();
        endMarker = null;
      }
      if (!endpoints || !endpoints.start || !endpoints.end) return;

      var isLoop = false;
      var dLng = Math.abs(endpoints.start[0] - endpoints.end[0]);
      var dLat = Math.abs(endpoints.start[1] - endpoints.end[1]);
      if (dLng < 0.0001 && dLat < 0.0001) {
        isLoop = true;
      }

      var startEl = document.createElement('div');
      startEl.className = 'endpoint-marker start';
      startEl.innerText = 'S';

      startMarker = new maplibregl.Marker({ element: startEl, anchor: 'center' })
        .setLngLat([endpoints.start[0], endpoints.start[1]])
        .addTo(map);

      if (!isLoop) {
        var endEl = document.createElement('div');
        endEl.className = 'endpoint-marker end';
        endEl.innerText = 'E';

        endMarker = new maplibregl.Marker({ element: endEl, anchor: 'center' })
          .setLngLat([endpoints.end[0], endpoints.end[1]])
          .addTo(map);
      }
    };

    function getGeoJsonGeometry(coords) {
      if (!coords || !coords.length) {
        return { type: 'LineString', coordinates: [] };
      }
      if (Array.isArray(coords[0]) && coords[0].length > 0 && Array.isArray(coords[0][0])) {
        var validSegments = [];
        for (var i = 0; i < coords.length; i++) {
          if (Array.isArray(coords[i]) && coords[i].length >= 2) {
            validSegments.push(coords[i]);
          }
        }
        return {
          type: 'MultiLineString',
          coordinates: validSegments
        };
      }
      if (coords.length < 2) {
        return { type: 'LineString', coordinates: [] };
      }
      return { type: 'LineString', coordinates: coords };
    }

    function getBoundsFromCoords(coords) {
      if (!coords || !coords.length) return null;
      var minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
      var points = [];
      if (Array.isArray(coords[0]) && coords[0].length > 0 && Array.isArray(coords[0][0])) {
        for (var i = 0; i < coords.length; i++) {
          if (Array.isArray(coords[i])) {
            for (var j = 0; j < coords[i].length; j++) {
              points.push(coords[i][j]);
            }
          }
        }
      } else {
        points = coords;
      }
      if (points.length < 1) return null;
      for (var k = 0; k < points.length; k++) {
        var p = points[k];
        if (p && p.length >= 2) {
          if (p[0] < minLng) minLng = p[0];
          if (p[0] > maxLng) maxLng = p[0];
          if (p[1] < minLat) minLat = p[1];
          if (p[1] > maxLat) maxLat = p[1];
        }
      }
      if (minLng !== Infinity && maxLng !== -Infinity) {
        if (minLng === maxLng && minLat === maxLat) {
          return [[minLng - 0.005, minLat - 0.005], [maxLng + 0.005, maxLat + 0.005]];
        }
        return [[minLng, minLat], [maxLng, maxLat]];
      }
      return null;
    }

    window.updatePlannedRoute = function(coords) {
      if (map && map.getSource('planned-route-src')) {
        var geom = getGeoJsonGeometry(coords);
        map.getSource('planned-route-src').setData({
          type: 'Feature',
          geometry: geom
        });
        if (geom && geom.coordinates && geom.coordinates.length > 0) {
          var bounds = getBoundsFromCoords(coords);
          if (bounds) {
            map.fitBounds(bounds, { padding: 45, duration: 800 });
          }
        }
      }
      if (${Boolean(initialConfig.showEndpoints)}) {
        var ep = extractEndpoints(coords);
        window.updateEndpoints(ep);
      }
    };

    window.updateTraveledRoute = function(coords) {
      if (map && map.getSource('traveled-route-src')) {
        map.getSource('traveled-route-src').setData({
          type: 'Feature',
          geometry: getGeoJsonGeometry(coords)
        });
      }
      if (${Boolean(initialConfig.showEndpoints)} && (!${Boolean(plannedRoute && plannedRoute.length > 0)})) {
        var ep = extractEndpoints(coords);
        window.updateEndpoints(ep);
      }
    };

    // Cập nhật chấm định vị người dùng; nếu follow=true thì pan nhẹ camera, TUYỆT ĐỐI GIỮ NGUYÊN MỨC ZOOM
    window.updateCurrentPosition = function(lng, lat, follow) {
      try {
        if (!userMarker) {
          const el = document.createElement('div');
          el.className = 'user-marker';
          const pulse = document.createElement('div');
          pulse.className = 'user-marker-pulse';
          el.appendChild(pulse);
          const core = document.createElement('div');
          core.className = 'user-marker-core';
          el.appendChild(core);

          userMarker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(map);
        } else {
          userMarker.setLngLat([lng, lat]);
        }

        if (follow && map) {
          map.panTo([lng, lat], { duration: 500 });
        }
      } catch (err) {
        console.error('updateCurrentPosition error:', err);
      }
    };

    // Khi người dùng bấm nút Định vị tôi (Locate):
    // Trượt camera về vị trí thực tế của người dùng và phóng to ở mức cận cảnh targetZoom (mặc định 16.5)
    window.centerOnUser = function(lng, lat, targetZoom) {
      var target = null;
      if (lng !== undefined && lat !== undefined) {
        target = [lng, lat];
      } else if (userMarker) {
        var lngLat = userMarker.getLngLat();
        target = [lngLat.lng, lngLat.lat];
      }
      if (target && map) {
        var opts = { center: target, duration: 600 };
        if (targetZoom !== undefined && targetZoom !== null) {
          opts.zoom = targetZoom;
        }
        map.easeTo(opts);
      }
    };

    // Khi người dùng bấm nút La bàn (Compass):
    // Quay thẳng về hướng Bắc (bearing = 0), giữ nguyên vị trí tâm và mức zoom hiện tại của người dùng
    window.resetNorth = function() {
      if (map) {
        map.easeTo({ bearing: 0, duration: 500 });
      }
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'BEARING_CHANGE',
          bearing: 0
        }));
      }
    };

    window.resetCamera = function(lng, lat) {
      window.resetNorth(lng, lat);
    };

    window.fitBounds = function(bounds, padding) {
      if (map && bounds) {
        map.fitBounds(bounds, { padding: padding || 40, duration: 1000 });
      }
    };

    window.updateCheckpoints = function(cps) {
      checkpointMarkers.forEach(m => m.remove());
      checkpointMarkers = [];

      (cps || []).forEach(cp => {
        const el = document.createElement('div');
        el.className = 'checkpoint-marker' + (cp.status === 'COMPLETED' ? ' completed' : '');
        el.innerText = cp.order || '★';
        el.onclick = () => {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'CHECKPOINT_CLICK',
              id: cp.id
            }));
          }
        };

        const m = new maplibregl.Marker({ element: el })
          .setLngLat([cp.longitude, cp.latitude])
          .addTo(map);
        checkpointMarkers.push(m);
      });
    };

    window.flyTo = function(center, zoom) {
      map.flyTo({ center: center, zoom: zoom || 14, duration: 1200 });
    };

    window.easeTo = function(center) {
      map.easeTo({ center: center, duration: 600 });
    };

    window.set3DMode = function(enabled) {
      if (enabled) {
        map.setTerrain({ source: 'terrain-dem-source', exaggeration: 2.0 });
        map.easeTo({ pitch: 60, duration: 800 });
      } else {
        map.setTerrain(null);
        map.easeTo({ pitch: 0, duration: 800 });
      }
    };


    map.on('load', () => {
      try {
        // 1. Thêm nguồn địa hình 3D (Terrarium DEM)
        map.addSource('terrain-dem-source', {
          type: 'raster-dem',
          tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
          encoding: 'terrarium',
          tileSize: 256,
          minzoom: 5,
          maxzoom: 15
        });

        if (${initialConfig.is3D}) {
          map.setTerrain({ source: 'terrain-dem-source', exaggeration: 2.0 });
        }

        // 2. Thêm layer đổ bóng nổi 3D (Hillshade)
        map.addLayer({
          id: 'hillshade-layer',
          type: 'hillshade',
          source: 'terrain-dem-source',
          paint: {
            'hillshade-exaggeration': 0.75,
            'hillshade-shadow-color': '#081008',
            'hillshade-highlight-color': '#ffffff'
          }
        });

        // 3. Layer Tuyến đường dự kiến (Planned Route - Trắng đứt nét)
        map.addSource('planned-route-src', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: getGeoJsonGeometry(${JSON.stringify(plannedRoute)})
          }
        });

        map.addLayer({
          id: 'planned-route-glow',
          type: 'line',
          source: 'planned-route-src',
          paint: {
            'line-color': '#000000',
            'line-width': 6,
            'line-opacity': 0.5
          }
        });

        map.addLayer({
          id: 'planned-route-line',
          type: 'line',
          source: 'planned-route-src',
          paint: {
            'line-color': '#ffffff',
            'line-width': 3.5,
            'line-dasharray': [3, 2],
            'line-opacity': 0.85
          }
        });

        // 4. Layer Tuyến đường thực tế đã đi (Traveled Route - Xanh neon emerald #38ef7d)
        map.addSource('traveled-route-src', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: getGeoJsonGeometry(${JSON.stringify(traveledRoute)})
          }
        });

        map.addLayer({
          id: 'traveled-route-glow',
          type: 'line',
          source: 'traveled-route-src',
          paint: {
            'line-color': 'rgba(56, 239, 125, 0.4)',
            'line-width': 9,
            'line-blur': 3
          }
        });

        map.addLayer({
          id: 'traveled-route-line',
          type: 'line',
          source: 'traveled-route-src',
          paint: {
            'line-color': '#38ef7d',
            'line-width': 4.5,
            'line-cap': 'round',
            'line-join': 'round'
          }
        });

        // Khởi tạo Start / End endpoint markers dựa trên tọa độ đầu & cuối của route vẽ
        const initialRoute = ${JSON.stringify(plannedRoute && plannedRoute.length > 0 ? plannedRoute : traveledRoute)};
        if (${Boolean(initialConfig.showEndpoints)}) {
          const ep = extractEndpoints(initialRoute);
          if (ep) {
            window.updateEndpoints(ep);
          }
        }
        if (initialRoute && initialRoute.length > 0) {
          const initBounds = getBoundsFromCoords(initialRoute);
          if (initBounds) {
            map.fitBounds(initBounds, { padding: 45, duration: 0 });
          }
        }

        // Khởi tạo vị trí ban đầu nếu có sẵn
        const initialPos = ${currentPosition ? JSON.stringify([currentPosition.longitude, currentPosition.latitude]) : "null"};
        if (initialPos) {
          window.updateCurrentPosition(initialPos[0], initialPos[1], true);
        }
      } catch (err) {
        console.error('map load error:', err);
      } finally {
        // Luôn luôn báo về React Native là map đã sẵn sàng
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
        }
      }
    });
  </script>
</body>
</html>
      `,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );

    // Memoize object source để WebView KHÔNG bao giờ bị reload lại khi component re-render
    const webViewSource = useMemo(() => ({ html: htmlContent }), [htmlContent]);

    return (
      <View
        style={[
          styles.container,
          height !== undefined ? { height } : { flex: 1 },
        ]}
      >
        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          source={webViewSource}
          style={styles.webView}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
        />

        {!isLoaded && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Đang tải bản đồ 3D...</Text>
          </View>
        )}

        {/* Tactical Map HUD Overlays */}
        {interactive && (
          <View style={styles.hudTopRight}>
            <TouchableOpacity
              style={[styles.hudButton, is3DMode && styles.hudButtonActive]}
              onPress={() => {
                const next = !is3DMode;
                setIs3DMode(next);
                runInMap(`set3DMode(${next});`);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.hudButtonText,
                  is3DMode && styles.hudButtonTextActive,
                ]}
              >
                3D
              </Text>
            </TouchableOpacity>

            {/* 1. Nút La Bàn: Quay về hướng Bắc (bearing = 0), giữ nguyên mức zoom hiện tại */}
            <TouchableOpacity
              style={styles.hudButton}
              onPress={() => {
                runInMap(`resetNorth();`);
                setCurrentBearing(0);
                onCompassPress?.();
              }}
              activeOpacity={0.8}
            >
              <View
                style={{ transform: [{ rotate: `${-currentBearing}deg` }] }}
              >
                <Ionicons
                  name="compass"
                  size={18}
                  color={currentBearing !== 0 ? Colors.primary : "#ffffff"}
                />
              </View>
            </TouchableOpacity>

            {/* 2. Nút Định vị tôi (Locate): Căn giữa vị trí GPS và tự động zoom cận cảnh (mức 16.5) để thấy rõ lối mòn */}
            {currentPosition && (
              <TouchableOpacity
                style={styles.hudButton}
                onPress={() => {
                  runInMap(
                    `centerOnUser(${currentPosition.longitude}, ${currentPosition.latitude}, 16.5);`,
                  );
                  onLocatePress?.();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="locate" size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.hudBottomLeft}>
          <Text style={styles.watermarkText}>TREKGO 3D · SATELLITE & DEM</Text>
        </View>
      </View>
    );
  },
);

MapLibre3DViewBase.displayName = "MapLibre3DViewBase";
export const MapLibre3DView = React.memo(MapLibre3DViewBase);
MapLibre3DView.displayName = "MapLibre3DView";

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#081008",
    overflow: "hidden",
    position: "relative",
  },
  webView: {
    flex: 1,
    backgroundColor: "#081008",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(8, 16, 8, 0.88)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  hudTopRight: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "column",
    alignItems: "center",
    zIndex: 10,
  },
  hudButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: "rgba(20, 25, 18, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: 8,
    ...Shadows.tactical,
  },
  hudButtonActive: {
    backgroundColor: "rgba(56, 239, 125, 0.25)",
    borderColor: Colors.primary,
  },
  hudButtonText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#ffffff",
  },
  hudButtonTextActive: {
    color: Colors.primary,
  },
  hudBottomLeft: {
    position: "absolute",
    bottom: 8,
    left: 10,
    backgroundColor: "rgba(8, 16, 8, 0.65)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  watermarkText: {
    fontSize: 8,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "rgba(159, 232, 112, 0.7)",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
