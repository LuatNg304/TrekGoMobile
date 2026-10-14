import React, { useState, useEffect, useRef } from "react";
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
import { MapLibre3DView, MapCoordinate, MapCheckpoint } from "@/components/map/MapLibre3DView";
import { DifficultyLevel } from "@/types";

interface LiveTrailRecorderModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (trailId: string) => void;
}

// Hàm tính khoảng cách giữa 2 toạ độ (Haversine formula in KM)
function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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

  // Số liệu telemetry Strava style
  const [distanceKm, setDistanceKm] = useState(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [elevationGainM, setElevationGainM] = useState(0);

  // Dữ liệu GPS
  const [recordedCoordinates, setRecordedCoordinates] = useState<MapCoordinate[]>([]);
  const [currentPosition, setCurrentPosition] = useState<MapCoordinate | null>(null);
  const [checkpoints, setCheckpoints] = useState<MapCheckpoint[]>([]);

  // Modal lưu cung đường
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [trailName, setTrailName] = useState("");
  const [trailRegion, setTrailRegion] = useState("Lâm Đồng");
  const [trailDifficulty] = useState<DifficultyLevel>("Trung bình");
  const [trailDescription, setTrailDescription] = useState("");

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Yêu cầu quyền vị trí và lắng nghe GPS
  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Quyền GPS",
          "TrekGo cần quyền truy cập vị trí để ghi lại cung đường di chuyển của bạn.",
        );
        return false;
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5, // Mỗi 5m cập nhật 1 lần
          timeInterval: 2000,
        },
        (loc) => {
          if (!isPaused) {
            handleNewLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              elevation: loc.coords.altitude || 850,
            }, loc.coords.speed);
          }
        },
      );
      return true;
    } catch (e) {
      console.warn("[LiveTrailRecorder] Location error:", e);
      return false;
    }
  };

  const handleNewLocation = (newCoord: MapCoordinate, speedMs: number | null = null) => {
    setCurrentPosition(newCoord);

    setRecordedCoordinates((prev) => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const addedKm = calculateDistanceKm(
          last.latitude,
          last.longitude,
          newCoord.latitude,
          newCoord.longitude,
        );

        if (addedKm > 0.002) {
          // Lọc rung nhiễu GPS (< 2m)
          setDistanceKm((d) => Number((d + addedKm).toFixed(2)));

          // Tính độ cao lũy kế
          if (newCoord.elevation && last.elevation && newCoord.elevation > last.elevation) {
            setElevationGainM((e) => Math.round(e + (newCoord.elevation! - last.elevation!)));
          }

          // Tính tốc độ
          const speed = speedMs ? Math.max(0, speedMs * 3.6) : addedKm * 1800; // km/h
          setCurrentSpeedKmh(Number(speed.toFixed(1)));

          return [...prev, newCoord];
        }
        return prev;
      }

      return [newCoord];
    });
  };

  const handleStart = async () => {
    setRecordedCoordinates([]);
    setDistanceKm(0);
    setElevationGainM(0);
    setElapsedSeconds(0);
    setCheckpoints([]);

    const hasGps = await startLocationTracking();
    if (!hasGps) {
      // Nếu không có GPS thực tế, kích hoạt vị trí giả lập tại Tà Năng
      const initialMock: MapCoordinate = {
        latitude: 11.5831,
        longitude: 108.529,
        elevation: 840,
      };
      setCurrentPosition(initialMock);
      setRecordedCoordinates([initialMock]);
    }

    setIsRecording(true);
    setIsPaused(false);
  };

  // Nút giả lập di chuyển (Simulation) tiện cho test trong nhà
  const handleSimulateStep = () => {
    const baseLat = currentPosition?.latitude || 11.5831;
    const baseLng = currentPosition?.longitude || 108.529;
    const baseElev = currentPosition?.elevation || 840;

    const nextCoord: MapCoordinate = {
      latitude: baseLat + (Math.random() * 0.001 - 0.0003),
      longitude: baseLng + (Math.random() * 0.001 + 0.0002),
      elevation: baseElev + Math.floor(Math.random() * 6),
    };

    handleNewLocation(nextCoord, 1.4); // ~5 km/h đi bộ
  };

  const handlePauseResume = () => {
    setIsPaused((p) => !p);
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

    // Chuyển đổi sang format PersonalTrail của TrekGo
    const newTrail = createPersonalTrail({
      name: trailName.trim(),
      region: trailRegion,
      difficulty: trailDifficulty,
      distanceKm: Math.max(0.1, distanceKm),
      elevationGainM: Math.max(10, elevationGainM),
      duration: durationStr,
      terrainType: "Rừng & Đồi dốc",
      description: trailDescription.trim() || `Cung đường ghi nhận thực tế vào ngày ${new Date().toLocaleDateString("vi-VN")}`,
      routePreset: "RIDGE",
      submitForVerification: false,
      routePoints: recordedCoordinates.map((c, idx) => ({
        id: `rp-${idx}`,
        x: Math.round(50 + (idx / Math.max(1, recordedCoordinates.length - 1)) * 300),
        y: Math.round(300 - (idx / Math.max(1, recordedCoordinates.length - 1)) * 200),
      })),
      checkpoints: checkpoints.map((cp, idx) => ({
        id: cp.id,
        order: idx + 1,
        name: cp.name,
        elevation: cp.elevation || 800,
        distanceFromStartKm: Number(((idx + 1) * (distanceKm / Math.max(1, checkpoints.length + 1))).toFixed(2)),
        status: "PENDING" as const,
        coords: {
          x: Math.round(50 + ((idx + 1) / (checkpoints.length + 2)) * 300),
          y: Math.round(300 - ((idx + 1) / (checkpoints.length + 2)) * 200),
        },
        realCoords: {
          lat: cp.latitude,
          lon: cp.longitude,
        },
      })),
    });

    // Dọn dẹp
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    setIsRecording(false);
    setShowSaveForm(false);
    onClose();
    onSaved?.(newTrail.id);

    Alert.alert(
      "Ghi nhận thành công!",
      `Cung đường "${newTrail.name}" (${distanceKm} km) đã được lưu vào Cung Đường Cá Nhân và lưu trữ ngoại tuyến trên thiết bị của bạn.`,
    );
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
              if (locationSubscription.current) {
                locationSubscription.current.remove();
                locationSubscription.current = null;
              }
              setIsRecording(false);
              onClose();
            },
          },
        ],
      );
    } else {
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

  // Mảng toạ độ vẽ trên MapLibre 3D: [lng, lat]
  const traveledRouteCoords: [number, number][] = recordedCoordinates.map((c) => [
    c.longitude,
    c.latitude,
  ]);

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
                {isRecording ? (isPaused ? "ĐÃ TẠM DỪNG" : "LIVE STRAVA TRACK") : "CHUẨN BỊ GHI CUNG ĐƯỜNG"}
              </Text>
            </View>
          </View>

          {isRecording && (
            <TouchableOpacity onPress={handleSimulateStep} style={styles.simStepBtn}>
              <Ionicons name="footsteps" size={14} color={Colors.primary} />
              <Text style={styles.simStepText}>+Bước</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 2. MapLibre 3D View */}
        <View style={styles.mapContainer}>
          <MapLibre3DView
            height={360}
            is3D={true}
            traveledRoute={traveledRouteCoords}
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

        {/* 5. Save Trail Info Modal */}
        <Modal visible={showSaveForm} animationType="fade" transparent={true}>
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
        </Modal>
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
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    padding: 20,
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
