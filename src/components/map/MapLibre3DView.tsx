import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Radius, Shadows } from "@/constants/theme";

export interface MapCoordinate {
  latitude: number;
  longitude: number;
  elevation?: number;
}

export interface MapCheckpoint {
  id: string;
  name: string;
  order: number;
  latitude: number;
  longitude: number;
  elevation?: number;
  status?: "COMPLETED" | "PENDING";
}

export interface MapLibre3DViewProps {
  height?: number;
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  pitch?: number;
  bearing?: number;
  is3D?: boolean;
  plannedRoute?: [number, number][]; // Array of [lng, lat]
  traveledRoute?: [number, number][]; // Array of [lng, lat]
  currentPosition?: MapCoordinate | null;
  checkpoints?: MapCheckpoint[];
  interactive?: boolean;
  onMapReady?: () => void;
  onCheckpointPress?: (checkpointId: string) => void;
}

export interface MapLibre3DViewRef {
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  toggle3D: () => void;
  resetCamera: () => void;
}

export const MapLibre3DView = forwardRef<MapLibre3DViewRef, MapLibre3DViewProps>(
  (
    {
      height = 360,
      center = [108.529, 11.5831], // Mặc định Lâm Đồng / Tà Năng
      zoom = 13.5,
      pitch = 60,
      bearing = -20,
      is3D = true,
      plannedRoute = [],
      traveledRoute = [],
      currentPosition = null,
      checkpoints = [],
      interactive = true,
      onMapReady,
      onCheckpointPress,
    },
    ref,
  ) => {
    const webViewRef = useRef<WebView>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [is3DMode, setIs3DMode] = useState(is3D);

    useImperativeHandle(ref, () => ({
      flyTo: (lng: number, lat: number, targetZoom = 14) => {
        runInMap(`flyTo([${lng}, ${lat}], ${targetZoom});`);
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

    // Khi plannedRoute hoặc checkpoints hoặc traveledRoute thay đổi, đẩy vào WebView
    useEffect(() => {
      if (!isLoaded) return;
      runInMap(`
        updatePlannedRoute(${JSON.stringify(plannedRoute)});
        updateTraveledRoute(${JSON.stringify(traveledRoute)});
        updateCheckpoints(${JSON.stringify(checkpoints)});
      `);
    }, [plannedRoute, traveledRoute, checkpoints, isLoaded]);

    // Khi vị trí hiện tại thay đổi
    useEffect(() => {
      if (!isLoaded || !currentPosition) return;
      runInMap(`
        updateCurrentPosition(${currentPosition.longitude}, ${currentPosition.latitude});
      `);
    }, [currentPosition, isLoaded]);

    const handleMessage = (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "MAP_READY") {
          setIsLoaded(true);
          onMapReady?.();
        } else if (data.type === "CHECKPOINT_CLICK") {
          onCheckpointPress?.(data.id);
        }
      } catch (err) {
        console.warn("[MapLibre3DView] Message error:", err);
      }
    };

    // Tạo HTML template tự chứa MapLibre GL JS với Terrarium 3D Terrain & ArcGIS Satellite
    const htmlContent = `
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
    .user-marker {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #38ef7d;
      border: 3px solid #ffffff;
      box-shadow: 0 0 16px rgba(56, 239, 125, 0.9);
      position: relative;
    }
    .user-marker::after {
      content: '';
      position: absolute;
      top: -10px;
      left: -10px;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(56, 239, 125, 0.3);
      animation: pulse 1.8s infinite ease-out;
    }
    @keyframes pulse {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    .maplibregl-ctrl-attrib { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const INITIAL_CENTER = [${center[0]}, ${center[1]}];
    const INITIAL_ZOOM = ${zoom};
    const INITIAL_PITCH = ${is3D ? pitch : 0};
    const INITIAL_BEARING = ${bearing};

    const map = new maplibregl.Map({
      container: 'map',
      style: {
        version: 8,
        sources: {
          'satellite-tiles': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution: 'Esri Satellite'
          }
        },
        layers: [
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      pitch: INITIAL_PITCH,
      bearing: INITIAL_BEARING,
      maxPitch: 85,
      interactive: ${interactive}
    });

    let checkpointMarkers = [];
    let userMarker = null;

    map.on('load', () => {
      // 1. Thêm nguồn địa hình 3D (Terrarium DEM)
      map.addSource('terrain-dem-source', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256,
        minzoom: 5,
        maxzoom: 15
      });

      if (${is3D}) {
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
          geometry: { type: 'LineString', coordinates: ${JSON.stringify(plannedRoute)} }
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
          geometry: { type: 'LineString', coordinates: ${JSON.stringify(traveledRoute)} }
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

      // Báo về React Native là map đã sẵn sàng
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
      }
    });

    window.updatePlannedRoute = function(coords) {
      if (map.getSource('planned-route-src')) {
        map.getSource('planned-route-src').setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords }
        });
      }
    };

    window.updateTraveledRoute = function(coords) {
      if (map.getSource('traveled-route-src')) {
        map.getSource('traveled-route-src').setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords }
        });
      }
    };

    window.updateCurrentPosition = function(lng, lat) {
      if (!userMarker) {
        const el = document.createElement('div');
        el.className = 'user-marker';
        userMarker = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);
      } else {
        userMarker.setLngLat([lng, lat]);
      }
    };

    window.updateCheckpoints = function(cps) {
      checkpointMarkers.forEach(m => m.remove());
      checkpointMarkers = [];

      cps.forEach(cp => {
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

    window.set3DMode = function(enabled) {
      if (enabled) {
        map.setTerrain({ source: 'terrain-dem-source', exaggeration: 2.0 });
        map.easeTo({ pitch: 60, duration: 800 });
      } else {
        map.setTerrain(null);
        map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
      }
    };

    window.resetCamera = function() {
      map.flyTo({ center: INITIAL_CENTER, zoom: INITIAL_ZOOM, pitch: INITIAL_PITCH, bearing: INITIAL_BEARING, duration: 1000 });
    };
  </script>
</body>
</html>
    `;

    return (
      <View style={[styles.container, { height }]}>
        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          source={{ html: htmlContent }}
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
              <Text style={[styles.hudButtonText, is3DMode && styles.hudButtonTextActive]}>
                3D
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.hudButton}
              onPress={() => runInMap(`resetCamera();`)}
              activeOpacity={0.8}
            >
              <Ionicons name="compass-outline" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.hudBottomLeft}>
          <Text style={styles.watermarkText}>
            TREKGO 3D · SATELLITE & DEM
          </Text>
        </View>
      </View>
    );
  },
);

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
    gap: 8,
  },
  hudButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: "rgba(20, 25, 18, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
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
