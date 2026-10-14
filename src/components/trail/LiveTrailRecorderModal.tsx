import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Radius, Shadows } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { MapLibre3DView, MapCoordinate, MapCheckpoint, MapLibre3DViewRef } from "@/components/map/MapLibre3DView";
import { DifficultyLevel, PersonalTrail } from "@/types";
import { GpsProcessor, GpsPoint } from "@/utils/gpsProcessor";

interface LiveTrailRecorderModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (trailId: string, trail?: PersonalTrail) => void;
}

export const LiveTrailRecorderModal: React.FC<LiveTrailRecorderModalProps> = ({
  visible,
  onClose,
  onSaved,
}) => {
  const { createPersonalTrail } = useApp();

  // Trạng thái ghi nhận
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Chế độ camera tự bám theo GPS (Follow Mode): bật khi bắt đầu, tắt khi người dùng chủ động vuốt/zoom bản đồ
  const [isFollowingUser, setIsFollowingUser] = useState(true);

  // Số liệu telemetry Strava style
  const [distanceKm, setDistanceKm] = useState(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [elevationGainM, setElevationGainM] = useState(0);

  // Dữ liệu GPS
  const [recordedCoordinates, setRecordedCoordinates] = useState<GpsPoint[]>([]);
  const [currentPosition, setCurrentPosition] = useState<MapCoordinate | null>(null);
  const [checkpoints, setCheckpoints] = useState<MapCheckpoint[]>([]);
  const [gpsStatus, setGpsStatus] = useState<"SEARCHING" | "READY" | "DENIED" | "SIMULATED">("SEARCHING");
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Modal lưu cung đường
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [trailName, setTrailName] = useState("");
  const [trailRegion, setTrailRegion] = useState("Lâm Đồng");
  const [trailDifficulty] = useState<DifficultyLevel>("Trung bình");
  const [trailDescription, setTrailDescription] = useState("");

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<MapLibre3DViewRef>(null);
  const gpsProcessorRef = useRef(new GpsProcessor());
  const isPausedRef = useRef(false);
  const isRecordingRef = useRef(false);

  // Hàm xác định toạ độ GPS tức thì của người dùng (chỉ dùng để hiển thị ban đầu, không đưa vào bản ghi thật)
  const detectCurrentLocation = async (): Promise<MapCoordinate | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsStatus("DENIED");
        Alert.alert(
          "Quyền GPS",
          "TrekGo cần quyền truy cập vị trí để hiển thị vị trí và ghi nhận cung đường thực tế của bạn.",
        );
        return null;
      }

      // 1. Thử lấy vị trí lưu gần nhất
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          const altitude =
            lastKnown.coords.altitude != null
              ? Math.round(lastKnown.coords.altitude)
              : undefined;
          const coord: MapCoordinate = {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
            elevation: altitude,
          };
          setCurrentPosition(coord);
          setGpsAccuracy(lastKnown.coords.accuracy || null);
          setGpsStatus("READY");
          mapRef.current?.centerOnUser(coord.longitude, coord.latitude);
          return coord;
        }
      } catch {
        // bỏ qua nếu thiết bị chưa từng có cache vị trí
      }

      // 2. Lấy vị trí GPS tươi mới
      let fresh: Location.LocationObject | null = null;
      try {
        fresh = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
      } catch {
        try {
          fresh = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        } catch {
          // Bỏ qua nếu mất sóng
        }
      }

      if (fresh) {
        const altitude =
          fresh.coords.altitude != null
            ? Math.round(fresh.coords.altitude)
            : undefined;
        const coord: MapCoordinate = {
          latitude: fresh.coords.latitude,
          longitude: fresh.coords.longitude,
          elevation: altitude,
        };
        setCurrentPosition(coord);
        setGpsAccuracy(fresh.coords.accuracy || null);
        setGpsStatus("READY");
        mapRef.current?.centerOnUser(coord.longitude, coord.latitude);
        return coord;
      }

      setGpsStatus("SEARCHING");
      return null;
    } catch (e) {
      console.warn("[LiveTrailRecorder] detectCurrentLocation error:", e);
      setGpsStatus("SEARCHING");
      return null;
    }
  };

  const resetSession = () => {
    isRecordingRef.current = false;
    isPausedRef.current = false;
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    gpsProcessorRef.current.reset();
    setIsRecording(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    setDistanceKm(0);
    setElevationGainM(0);
    setCurrentSpeedKmh(0);
    setRecordedCoordinates([]);
    setCheckpoints([]);
  };

  // Timer đếm giây
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  // Tự động định vị ngay khi mở modal
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (visible) {
      timer = setTimeout(() => {
        detectCurrentLocation();
      }, 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
    };
  }, [visible]);

  // Yêu cầu quyền vị trí và lắng nghe GPS
  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsStatus("DENIED");
        Alert.alert(
          "Quyền GPS",
          "TrekGo cần quyền truy cập vị trí để ghi lại cung đường di chuyển của bạn.",
        );
        return false;
      }

      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert("GPS chưa bật", "Vui lòng bật dịch vụ vị trí trên iPhone.");
        return false;
      }

      locationSubscription.current?.remove();
      locationSubscription.current = null;

      try {
        const targetAccuracy =
          Platform.OS === "ios"
            ? Location.Accuracy.BestForNavigation
            : Location.Accuracy.High;

        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: targetAccuracy,
            distanceInterval: 1, // Nhận sự kiện di chuyển từ 1 mét
            timeInterval: 1000, // Cập nhật nhịp tim 1 giây / lần
          },
          (location) => {
            if (!isRecordingRef.current || isPausedRef.current) return;

            const result = gpsProcessorRef.current.process(location);
            setGpsAccuracy(location.coords.accuracy ?? null);

            if (!result.accepted || !result.point) {
              return;
            }

            const pt = result.point;
            const currentCoord: MapCoordinate = {
              latitude: pt.latitude,
              longitude: pt.longitude,
              elevation:
                pt.elevation != null
                  ? Math.round(pt.elevation)
                  : undefined,
            };

            setCurrentPosition(currentCoord);
            setRecordedCoordinates((prev) => [...prev, pt]);
            setDistanceKm(result.distanceM / 1000);
            setElevationGainM(result.elevationGainM);
            setCurrentSpeedKmh(result.speedKmh);
            setGpsStatus("READY");
          },
        );
        return true;
      } catch (watchErr) {
        console.warn("[LiveTrailRecorder] watchPositionAsync failed:", watchErr);
        return false;
      }
    } catch (e) {
      console.warn("[LiveTrailRecorder] Location error:", e);
      return false;
    }
  };

  const handleStart = async () => {
    gpsProcessorRef.current.reset();
    setRecordedCoordinates([]);
    setDistanceKm(0);
    setElevationGainM(0);
    setCurrentSpeedKmh(0);
    setElapsedSeconds(0);
    setCheckpoints([]);

    isPausedRef.current = false;
    isRecordingRef.current = true;
    setIsFollowingUser(true);

    const started = await startLocationTracking();
    if (!started) {
      isRecordingRef.current = false;
      Alert.alert(
        "Không thể ghi GPS",
        "Vui lòng kiểm tra quyền vị trí và dịch vụ định vị GPS.",
      );
      return;
    }

    setIsRecording(true);
    setIsPaused(false);
  };

  // Khi người dùng chủ động chạm/vuốt/zoom bản đồ -> Tắt Follow Mode, cho phép tự do khám phá địa hình
  const handleUserMapInteraction = useCallback(() => {
    setIsFollowingUser(false);
  }, []);

  // Khi người dùng bấm nút La bàn trên bản đồ -> Bật lại Follow Mode
  const handleCompassPress = useCallback(() => {
    setIsFollowingUser(true);
  }, []);

  // Khi bấm nút Định vị tôi (trên status bar hoặc nút Locate trên map) -> Zoom cận cảnh vị trí hiện tại
  const handleCenterOnUser = useCallback(() => {
    setIsFollowingUser(true);
    if (currentPosition && mapRef.current) {
      mapRef.current.centerOnUser(currentPosition.longitude, currentPosition.latitude, 16.5);
    } else {
      detectCurrentLocation();
    }
  }, [currentPosition]);

  const handlePauseResume = () => {
    const nextPaused = !isPausedRef.current;
    isPausedRef.current = nextPaused;
    setIsPaused(nextPaused);

    if (!nextPaused) {
      gpsProcessorRef.current.breakSegment();
    }
  };

  const handleAddCheckpoint = () => {
    if (!currentPosition) {
      Alert.alert("Chưa có vị trí", "Đang chờ bắt tín hiệu GPS...");
      return;
    }

    const order = checkpoints.length + 1;
    const newCp: MapCheckpoint = {
      id: `cp-rec-${Date.now()}`,
      order,
      name: `Cột mốc CP${order}`,
      latitude: currentPosition.latitude,
      longitude: currentPosition.longitude,
      elevation: currentPosition.elevation,
      status: "COMPLETED",
    };

    setCheckpoints((prev) => [...prev, newCp]);
    Alert.alert("Đã lưu Checkpoint", `Đã đánh dấu ${newCp.name} tại toạ độ hiện tại.`);
  };

  const handleStopAndSave = () => {
    isPausedRef.current = true;
    setIsPaused(true);
    if (recordedCoordinates.length < 2) {
      Alert.alert(
        "Cung đường quá ngắn",
        "Bạn cần di chuyển ghi nhận ít nhất vài điểm GPS để lưu thành cung đường hoàn chỉnh.",
      );
      return;
    }

    setTrailName(`Cung đường ngày ${new Date().toLocaleDateString("vi-VN")}`);
    setShowSaveForm(true);
  };

  const handleConfirmSave = () => {
    if (!trailName.trim()) {
      Alert.alert("Vui lòng nhập tên", "Hãy đặt tên cho cung đường của bạn.");
      return;
    }

    const durationMin = Math.round(elapsedSeconds / 60);
    const durationStr =
      durationMin >= 60
        ? `${Math.floor(durationMin / 60)} giờ ${durationMin % 60} phút`
        : `${Math.max(1, durationMin)} phút`;

    // Phân chia toạ độ thành các segments riêng biệt (tránh nối đường qua khoảng Pause / GPS gap)
    const gpsSegments: [number, number, number?][][] = [];
    const segmentsMap = new Map<number, [number, number, number?][]>();
    for (const c of recordedCoordinates) {
      const segId = c.segmentId ?? 0;
      if (!segmentsMap.has(segId)) {
        segmentsMap.set(segId, []);
      }
      segmentsMap.get(segId)!.push([
        c.longitude,
        c.latitude,
        c.elevation != null ? Math.round(c.elevation) : undefined,
      ]);
    }
    for (const seg of segmentsMap.values()) {
      if (seg.length >= 2) {
        gpsSegments.push(seg);
      }
    }
    if (gpsSegments.length === 0) {
      for (const seg of segmentsMap.values()) {
        if (seg.length > 0) {
          gpsSegments.push(seg);
        }
      }
    }

    // Toạ độ phẳng đồng bộ với segments hợp lệ
    const flatPoints: [number, number, number?][] = [];
    for (const seg of gpsSegments) {
      flatPoints.push(...seg);
    }
    const gpsRouteCoords: [number, number, number?][] =
      flatPoints.length > 0
        ? flatPoints
        : recordedCoordinates.map((c) => [
            c.longitude,
            c.latitude,
            c.elevation != null ? Math.round(c.elevation) : undefined,
          ]);

    const finalCheckpoints = checkpoints;

    // Chuyển đổi sang format PersonalTrail của TrekGo
    const newTrail = createPersonalTrail({
      name: trailName.trim(),
      region: trailRegion,
      difficulty: trailDifficulty,
      distanceKm: Number(distanceKm.toFixed(3)),
      elevationGainM: Math.round(elevationGainM),
      duration: durationStr,
      terrainType: "Rừng & Đồi dốc",
      description: trailDescription.trim() || `Cung đường ghi nhận thực tế vào ngày ${new Date().toLocaleDateString("vi-VN")}`,
      routePreset: "RIDGE",
      submitForVerification: false,
      gpsRoute: gpsRouteCoords,
      gpsSegments: gpsSegments,
      routePoints: recordedCoordinates.map((c, idx) => ({
        id: `rp-${idx}`,
        lat: c.latitude,
        lng: c.longitude,
        elevation: c.elevation != null ? Math.round(c.elevation) : undefined,
        segmentId: c.segmentId,
        x: Math.round(50 + (idx / Math.max(1, recordedCoordinates.length - 1)) * 300),
        y: Math.round(300 - (idx / Math.max(1, recordedCoordinates.length - 1)) * 200),
      })),
      checkpoints: finalCheckpoints.map((cp, idx) => ({
        id: cp.id,
        order: idx + 1,
        name: cp.name,
        elevation: cp.elevation != null ? Math.round(cp.elevation) : null,
        distanceFromStartKm: Number(((idx + 1) * (distanceKm / Math.max(1, finalCheckpoints.length + 1))).toFixed(3)),
        status: "PENDING" as const,
        coords: {
          x: Math.round(50 + ((idx + 1) / (finalCheckpoints.length + 2)) * 300),
          y: Math.round(300 - ((idx + 1) / (finalCheckpoints.length + 2)) * 200),
        },
        realCoords: {
          lat: cp.latitude,
          lon: cp.longitude,
        },
      })),
    });

    // Dọn dẹp
    resetSession();
    setShowSaveForm(false);
    onClose();
    onSaved?.(newTrail.id, newTrail);

    setTimeout(() => {
      Alert.alert(
        "Ghi nhận thành công!",
        `Cung đường "${newTrail.name}" (${distanceKm} km) đã được lưu vào Cung Đường Cá Nhân và lưu trữ ngoại tuyến trên thiết bị của bạn.`,
      );
    }, 400);
  };

  const handleCancel = () => {
    if (isRecording) {
      Alert.alert(
        "Hủy phiên ghi?",
        "Dữ liệu GPS của cung đường hiện tại chưa lưu sẽ bị mất.",
        [
          { text: "Tiếp tục ghi", style: "cancel" },
          {
            text: "Hủy bỏ",
            style: "destructive",
            onPress: () => {
              resetSession();
              onClose();
            },
          },
        ],
      );
    } else {
      resetSession();
      onClose();
    }
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Mảng toạ độ vẽ trên MapLibre: [lng, lat, elev?]
  // Memoize để tránh tạo reference mới trên mỗi nhịp giây (tránh re-render map liên tục)
  // Mảng phân đoạn toạ độ vẽ trên MapLibre: [lng, lat, elev?][][] (MultiLineString)
  // Tách biệt theo segmentId giúp không bị vẽ đường nối xuyên qua lúc Tạm dừng hoặc mất tín hiệu GPS
  const traveledRouteSegments: [number, number, number?][][] = useMemo(() => {
    if (recordedCoordinates.length === 0) return [];
    const segmentsMap = new Map<number, [number, number, number?][]>();
    for (const c of recordedCoordinates) {
      const segId = c.segmentId ?? 0;
      if (!segmentsMap.has(segId)) {
        segmentsMap.set(segId, []);
      }
      segmentsMap.get(segId)!.push([
        c.longitude,
        c.latitude,
        c.elevation != null ? Math.round(c.elevation) : undefined,
      ]);
    }
    return Array.from(segmentsMap.values()).filter((seg) => seg.length > 0);
  }, [recordedCoordinates]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* 1. Header HUD */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.recBadge}>
              <View style={[styles.recDot, isRecording && !isPaused && styles.recDotActive]} />
              <Text style={styles.recTitle}>
                {isRecording ? (isPaused ? "ĐÃ TẠM DỪNG" : "LIVE TREKGO TRACK") : "CHUẨN BỊ GHI CUNG ĐƯỜNG"}
              </Text>
            </View>
          </View>
        </View>

        {/* GPS Tactical Status Bar */}
        <View style={styles.gpsStatusBar}>
          <TouchableOpacity
            style={styles.gpsStatusLeft}
            onPress={gpsStatus === "DENIED" ? detectCurrentLocation : undefined}
            activeOpacity={gpsStatus === "DENIED" ? 0.7 : 1}
          >
            <View
              style={[
                styles.gpsDot,
                gpsStatus === "READY" && styles.gpsDotReady,
                gpsStatus === "SEARCHING" && styles.gpsDotSearching,
                gpsStatus === "DENIED" && styles.gpsDotDenied,
                gpsStatus === "SIMULATED" && styles.gpsDotSimulated,
              ]}
            />
            <Text style={styles.gpsStatusText} numberOfLines={1}>
              {gpsStatus === "READY" && currentPosition
                ? `GPS Tốt ${gpsAccuracy ? `(±${Math.round(gpsAccuracy)}m)` : ""} · ${currentPosition.latitude.toFixed(4)}°N, ${currentPosition.longitude.toFixed(4)}°E`
                : gpsStatus === "SEARCHING"
                  ? "Đang dò sóng vệ tinh GPS..."
                  : gpsStatus === "DENIED"
                    ? "Chưa cấp quyền GPS (Bấm cấp quyền)"
                    : "Vị trí mô phỏng Tà Năng (Chưa có GPS)"}
            </Text>
          </TouchableOpacity>

          <View style={styles.gpsActionsRight}>
            <TouchableOpacity
              style={[
                styles.gpsLocateBtn,
                isFollowingUser && isRecording && !isPaused
                  ? styles.gpsLocateBtnActive
                  : styles.gpsLocateBtnInactive,
              ]}
              onPress={handleCenterOnUser}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isFollowingUser && isRecording && !isPaused ? "navigate" : "locate"}
                size={13}
                color={isFollowingUser && isRecording && !isPaused ? "#0c2000" : "#ffffff"}
              />
              <Text
                style={[
                  styles.gpsLocateText,
                  isFollowingUser && isRecording && !isPaused
                    ? styles.gpsLocateTextActive
                    : styles.gpsLocateTextInactive,
                ]}
              >
                {isFollowingUser && isRecording && !isPaused ? "Bám GPS" : "Định vị"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. MapLibre View (Mặc định 2D tĩnh trong lúc tracking để triệt tiêu biến dạng Terrain 3D) */}
        <View style={styles.mapContainer}>
          <MapLibre3DView
            ref={mapRef}
            height={320}
            center={currentPosition ? [currentPosition.longitude, currentPosition.latitude] : [108.529, 11.5831]}
            is3D={false}
            pitch={0}
            minZoom={10}
            maxZoom={18}
            dragRotate={true}
            autoCenterOnUser={true}
            followUser={isFollowingUser && isRecording && !isPaused}
            onUserInteraction={handleUserMapInteraction}
            onCompassPress={handleCompassPress}
            onLocatePress={handleCenterOnUser}
            traveledRoute={traveledRouteSegments}
            currentPosition={currentPosition}
            checkpoints={checkpoints}
            interactive={true}
          />
        </View>

        {/* 3. Strava Telemetry Metrics Dashboard */}
        <View style={styles.dashboard}>
          {/* Main Elapsed Time */}
          <View style={styles.timeSection}>
            <Text style={styles.metricLabel}>THỜI GIAN DI CHUYỂN</Text>
            <Text style={styles.timeValue}>{formatTime(elapsedSeconds)}</Text>
          </View>

          {/* Metric Grid */}
          <View style={styles.metricGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>QUÃNG ĐƯỜNG</Text>
              <Text style={styles.metricValue}>{distanceKm.toFixed(2)}</Text>
              <Text style={styles.metricUnit}>km</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>TỐC ĐỘ</Text>
              <Text style={styles.metricValue}>{currentSpeedKmh.toFixed(1)}</Text>
              <Text style={styles.metricUnit}>km/h</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>ĐỘ CAO LŨY KẾ</Text>
              <Text style={styles.metricValue}>+{elevationGainM}</Text>
              <Text style={styles.metricUnit}>m</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>ĐIỂM CHECKPOINT</Text>
              <Text style={styles.metricValue}>{checkpoints.length}</Text>
              <Text style={styles.metricUnit}>mốc</Text>
            </View>
          </View>

          {/* Current GPS Coordinates & Real Elevation Info Card */}
          <View style={styles.gpsCoordCard}>
            <Ionicons name="navigate-circle" size={15} color={Colors.primary} />
            <Text style={styles.gpsCoordText}>
              {currentPosition
                ? `Vị trí: ${currentPosition.latitude.toFixed(5)}°B, ${currentPosition.longitude.toFixed(5)}°Đ · Độ cao: ${currentPosition.elevation != null ? `${Math.round(currentPosition.elevation)}m` : "Đang lấy..."}`
                : "Đang kết nối tín hiệu vệ tinh GPS..."}
            </Text>
          </View>
        </View>

        {/* 4. Controls Footer */}
        <View style={styles.footer}>
          {!isRecording ? (
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStart}
              activeOpacity={0.85}
            >
              <Ionicons name="play" size={22} color="#0c2000" />
              <Text style={styles.startButtonText}>BẮT ĐẦU GHI CUNG ĐƯỜNG</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.activeControlsRow}>
              {/* Add Checkpoint Button */}
              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={handleAddCheckpoint}
                activeOpacity={0.8}
              >
                <Ionicons name="flag" size={18} color="#fed018" />
                <Text style={styles.secondaryActionText}>Mốc CP</Text>
              </TouchableOpacity>

              {/* Pause / Resume Button */}
              <TouchableOpacity
                style={[
                  styles.primaryActionBtn,
                  isPaused ? styles.resumeBtn : styles.pauseBtn,
                ]}
                onPress={handlePauseResume}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isPaused ? "play" : "pause"}
                  size={24}
                  color={isPaused ? "#0c2000" : "#ffffff"}
                />
              </TouchableOpacity>

              {/* Stop & Save Button */}
              <TouchableOpacity
                style={styles.finishActionBtn}
                onPress={handleStopAndSave}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-done" size={20} color="#ffffff" />
                <Text style={styles.finishActionText}>Hoàn tất</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 5. Save Trail Info Overlay (View overlay thay vì nested Modal để không bị màn hình đen trên iOS) */}
        {showSaveForm && (
          <View style={styles.saveModalBackdrop}>
            <View style={styles.saveModalCard}>
              <Text style={styles.saveModalTitle}>Lưu Cung Đường Cá Nhân</Text>
              <Text style={styles.saveModalSubtitle}>
                {distanceKm} km · {formatTime(elapsedSeconds)} · +{elevationGainM}m độ cao
              </Text>

              <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>TÊN CUNG ĐƯỜNG</Text>
                <TextInput
                  style={styles.textInput}
                  value={trailName}
                  onChangeText={setTrailName}
                  placeholder="Ví dụ: Đường mòn săn mây đỉnh 986m"
                  placeholderTextColor="#777"
                />

                <Text style={styles.inputLabel}>KHU VỰC / TỈNH THÀNH</Text>
                <TextInput
                  style={styles.textInput}
                  value={trailRegion}
                  onChangeText={setTrailRegion}
                  placeholder="Ví dụ: Lâm Đồng"
                  placeholderTextColor="#777"
                />

                <Text style={styles.inputLabel}>MÔ TẢ NGẮN</Text>
                <TextInput
                  style={[styles.textInput, { height: 60 }]}
                  value={trailDescription}
                  onChangeText={setTrailDescription}
                  placeholder="Ghi chú về nguồn nước, độ dốc, lều trại..."
                  placeholderTextColor="#777"
                  multiline
                />
              </ScrollView>

              <View style={styles.saveModalActions}>
                <TouchableOpacity
                  style={styles.saveCancelBtn}
                  onPress={() => setShowSaveForm(false)}
                >
                  <Text style={styles.saveCancelText}>Quay lại</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveSubmitBtn}
                  onPress={handleConfirmSave}
                >
                  <Text style={styles.saveSubmitText}>Lưu & Đồng bộ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#081008",
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0d150c",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    alignItems: "center",
  },
  recBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: "rgba(20, 25, 18, 0.8)",
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#666",
  },
  recDotActive: {
    backgroundColor: "#ff3b30",
  },
  recTitle: {
    color: "#e4e2dd",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  simStepBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(56, 239, 125, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  simStepText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: "800",
  },
  mapContainer: {
    height: 320,
    width: "100%",
  },
  gpsStatusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#0d170d",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.07)",
    gap: 8,
  },
  gpsStatusLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#888",
  },
  gpsDotReady: {
    backgroundColor: "#38ef7d",
  },
  gpsDotSearching: {
    backgroundColor: "#fed018",
  },
  gpsDotDenied: {
    backgroundColor: "#ff3b30",
  },
  gpsDotSimulated: {
    backgroundColor: "#4cc9f0",
  },
  gpsStatusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#c2d1be",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  gpsActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  gpsActionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(159, 232, 112, 0.3)",
  },
  gpsActionPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  gpsActionPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9fe870",
  },
  gpsActionPillTextActive: {
    color: "#0c2000",
  },
  gpsLocateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  gpsLocateBtnActive: {
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  gpsLocateBtnInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
  },
  gpsLocateText: {
    fontSize: 10,
    fontWeight: "800",
  },
  gpsLocateTextActive: {
    color: "#0c2000",
  },
  gpsLocateTextInactive: {
    color: "#ffffff",
  },
  gpsCoordCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(20, 25, 18, 0.7)",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(56, 239, 125, 0.2)",
  },
  gpsCoordText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9fe870",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  dashboard: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: "#0d150c",
  },
  timeSection: {
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "rgba(20, 25, 18, 0.6)",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  timeValue: {
    fontSize: 38,
    fontWeight: "900",
    color: "#ffffff",
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "monospace",
    letterSpacing: 1.5,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  metricCard: {
    width: "48%",
    backgroundColor: "rgba(20, 25, 18, 0.6)",
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  metricLabel: {
    fontSize: 9,
    color: "#9fe870",
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    marginTop: 4,
  },
  metricUnit: {
    fontSize: 10,
    color: "#8a9486",
    fontWeight: "700",
    marginTop: -2,
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    backgroundColor: "#0d150c",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  startButton: {
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...Shadows.hover,
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0c2000",
    letterSpacing: 0.5,
  },
  activeControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  secondaryActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: "rgba(30, 35, 28, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  secondaryActionText: {
    color: "#fed018",
    fontSize: 12,
    fontWeight: "800",
  },
  primaryActionBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.tactical,
  },
  pauseBtn: {
    backgroundColor: "#ba1a1a",
  },
  resumeBtn: {
    backgroundColor: Colors.primary,
  },
  finishActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: "#1b4d24",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderColor: "#38ef7d",
  },
  finishActionText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  saveModalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    justifyContent: "center",
    padding: 20,
    zIndex: 999,
  },
  saveModalCard: {
    backgroundColor: "#141e13",
    borderRadius: Radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(159, 232, 112, 0.25)",
    ...Shadows.card,
  },
  saveModalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ffffff",
  },
  saveModalSubtitle: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#9fe870",
    marginTop: 10,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "#0d150c",
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#ffffff",
    fontSize: 13,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  saveModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  saveCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  saveCancelText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  saveSubmitBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveSubmitText: {
    color: "#0c2000",
    fontSize: 13,
    fontWeight: "900",
  },
});
