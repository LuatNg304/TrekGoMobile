import { Ionicons } from "@expo/vector-icons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Radius, Shadows } from "@/constants/theme";
import {
  MapLibre3DView,
  MapRouteCoordinates,
} from "@/components/map/MapLibre3DView";
import {
  cf01PublicTripApi,
  LeaderTrip,
  parseCf01Error,
  TrailSuggestion,
  TripOptionCheckpoint,
} from "@/services/api/cf01PublicTripApi";

export default function LeaderTripRouteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [trip, setTrip] = useState<LeaderTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"CHECKPOINTS" | "TRAILS">("CHECKPOINTS");

  // Checkpoints state
  const [availableCheckpoints, setAvailableCheckpoints] = useState<TripOptionCheckpoint[]>([]);
  const [selectedCheckpointIds, setSelectedCheckpointIds] = useState<string[]>([]);
  const [savingCheckpoints, setSavingCheckpoints] = useState(false);

  // Trails state
  const [trailSuggestions, setTrailSuggestions] = useState<TrailSuggestion[]>([]);
  const [selectedTrailIds, setSelectedTrailIds] = useState<string[]>([]);
  const [savingTrails, setSavingTrails] = useState(false);

  // 3D Preview Modal
  const [previewTrail, setPreviewTrail] = useState<any | null>(null);

  // Load trip & options
  const initData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const tripData = await cf01PublicTripApi.getLeaderTripDetail(id);
      setTrip(tripData);

      // Pre-select existing checkpoints & trails
      if (tripData.checkpoints) {
        const sortedIds = [...tripData.checkpoints]
          .sort((a, b) => a.sequence - b.sequence)
          .map((c) => c.sourceCheckpointId || "")
          .filter(Boolean);
        setSelectedCheckpointIds(sortedIds);
      }

      if (tripData.trails) {
        const sortedTrailIds = [...tripData.trails]
          .sort((a, b) => a.sequence - b.sequence)
          .map((t) => t.systemTrailId)
          .filter(Boolean);
        setSelectedTrailIds(sortedTrailIds);
      }

      // Load destination checkpoints
      const cps = await cf01PublicTripApi.getCheckpoints(tripData.destinationId, 1, 50);
      setAvailableCheckpoints(cps);

      // Load trail suggestions
      const suggestions = await cf01PublicTripApi.getTrailSuggestions(id, 1, 50);
      setTrailSuggestions(suggestions);
    } catch (err) {
      const parsed = parseCf01Error(err);
      Alert.alert("Lỗi tải dữ liệu", parsed.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      initData();
    }, 0);
    return () => clearTimeout(timer);
  }, [initData]);

  // Checkpoints selection handlers
  const toggleCheckpoint = (cpId: string) => {
    if (selectedCheckpointIds.includes(cpId)) {
      setSelectedCheckpointIds(selectedCheckpointIds.filter((it) => it !== cpId));
    } else {
      setSelectedCheckpointIds([...selectedCheckpointIds, cpId]);
    }
  };

  const moveCheckpoint = (index: number, direction: "UP" | "DOWN") => {
    const newIdx = direction === "UP" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= selectedCheckpointIds.length) return;
    const copy = [...selectedCheckpointIds];
    const temp = copy[index];
    copy[index] = copy[newIdx];
    copy[newIdx] = temp;
    setSelectedCheckpointIds(copy);
  };

  const handleSaveCheckpoints = async () => {
    if (!trip) return;
    if (selectedCheckpointIds.length === 0) {
      Alert.alert("Lưu ý", "Bạn nên chọn ít nhất một checkpoint bắt buộc cho chuyến đi.");
    }

    try {
      setSavingCheckpoints(true);
      const updated = await cf01PublicTripApi.setTripCheckpoints(
        trip.id,
        trip.version,
        selectedCheckpointIds,
      );
      setTrip(updated);
      Alert.alert(
        "Lưu Checkpoints thành công!",
        `Đã cập nhật ${selectedCheckpointIds.length} mốc bắt buộc. Version mới: v${updated.version}.`,
      );
      // Reload trail suggestions because suggestions depend on checkpoints!
      const suggestions = await cf01PublicTripApi.getTrailSuggestions(trip.id, 1, 50);
      setTrailSuggestions(suggestions);
      setActiveTab("TRAILS");
    } catch (err) {
      const parsed = parseCf01Error(err);
      Alert.alert("Lỗi lưu Checkpoints", parsed.message);
    } finally {
      setSavingCheckpoints(false);
    }
  };

  // Trails selection handlers
  const toggleTrail = (trailId: string) => {
    if (selectedTrailIds.includes(trailId)) {
      setSelectedTrailIds(selectedTrailIds.filter((it) => it !== trailId));
    } else {
      setSelectedTrailIds([...selectedTrailIds, trailId]);
    }
  };

  const moveTrail = (index: number, direction: "UP" | "DOWN") => {
    const newIdx = direction === "UP" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= selectedTrailIds.length) return;
    const copy = [...selectedTrailIds];
    const temp = copy[index];
    copy[index] = copy[newIdx];
    copy[newIdx] = temp;
    setSelectedTrailIds(copy);
  };

  const handleSaveTrails = async () => {
    if (!trip) return;
    if (selectedTrailIds.length === 0) {
      Alert.alert("Chưa chọn cung đường", "Vui lòng chọn ít nhất 1 System Trail cho chuyến đi.");
      return;
    }

    try {
      setSavingTrails(true);
      const updated = await cf01PublicTripApi.setTripTrails(
        trip.id,
        trip.version,
        selectedTrailIds,
      );
      setTrip(updated);
      Alert.alert(
        "Lưu lộ trình Trails thành công!",
        `Đã lưu ${selectedTrailIds.length} chặng System Trails. Version mới: v${updated.version}.`,
        [
          {
            text: "Kiểm tra Sẵn sàng & Publish",
            onPress: () => {
              router.push({
                pathname: "/trips/leader/[id]/publish",
                params: { id: trip.id },
              } as unknown as Href);
            },
          },
          { text: "Ở lại trang này", style: "cancel" },
        ],
      );
    } catch (err) {
      const parsed = parseCf01Error(err);
      Alert.alert("Lỗi lưu System Trails", parsed.message);
    } finally {
      setSavingTrails(false);
    }
  };

  // Open 3D Preview Modal
  const handlePreviewTrail3D = async (trailId: string) => {
    try {
      const detail = await cf01PublicTripApi.getSystemTrail(trailId);
      setPreviewTrail(detail);
    } catch (err) {
      const parsed = parseCf01Error(err);
      Alert.alert("Không thể tải bản đồ 3D", parsed.message);
    }
  };

  // Extract coordinates for preview
  const previewRouteCoords: MapRouteCoordinates | undefined = useMemo(() => {
    if (!previewTrail?.routeGeojson?.coordinates) return undefined;
    return previewTrail.routeGeojson.coordinates;
  }, [previewTrail]);

  const previewCenter: [number, number] | undefined = useMemo(() => {
    if (!previewRouteCoords || previewRouteCoords.length === 0) return undefined;
    const first = Array.isArray(previewRouteCoords[0]) ? previewRouteCoords[0] : null;
    if (first && typeof first[0] === "number" && typeof first[1] === "number") {
      return [first[0], first[1]];
    }
    return undefined;
  }, [previewRouteCoords]);

  if (loading || !trip) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải dữ liệu lộ trình...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Lên lộ trình: {trip.title}
          </Text>
          <Text style={styles.headerSub}>Expected Version: v{trip.version}</Text>
        </View>
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() =>
            router.push({
              pathname: "/trips/leader/[id]/publish",
              params: { id: trip.id },
            } as unknown as Href)
          }
        >
          <Text style={styles.nextBtnText}>Publish</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "CHECKPOINTS" && styles.tabActive]}
          onPress={() => setActiveTab("CHECKPOINTS")}
        >
          <Ionicons
            name="flag"
            size={16}
            color={activeTab === "CHECKPOINTS" ? Colors.primary : Colors.onSurfaceVariant}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "CHECKPOINTS" && styles.tabTextActive,
            ]}
          >
            1. Checkpoints ({selectedCheckpointIds.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "TRAILS" && styles.tabActive]}
          onPress={() => setActiveTab("TRAILS")}
        >
          <Ionicons
            name="trail-sign"
            size={16}
            color={activeTab === "TRAILS" ? Colors.primary : Colors.onSurfaceVariant}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "TRAILS" && styles.tabTextActive,
            ]}
          >
            2. System Trails ({selectedTrailIds.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: CHECKPOINTS */}
      {activeTab === "CHECKPOINTS" ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.guideCard}>
            <Ionicons name="information-circle" size={20} color={Colors.primary} />
            <Text style={styles.guideText}>
              Chọn và sắp xếp thứ tự các điểm mốc bắt buộc trong chuyến đi. Thứ
              tự này sẽ giúp hệ thống gợi ý các cung đường System Trails phù hợp
              nhất.
            </Text>
          </View>

          {/* Selected Ordered Checkpoints */}
          <Text style={styles.sectionHeading}>
            Thứ tự các mốc đã chọn ({selectedCheckpointIds.length})
          </Text>

          {selectedCheckpointIds.length === 0 ? (
            <Text style={styles.emptyHint}>
              Chưa chọn mốc nào. Bấm vào danh sách bên dưới để chọn.
            </Text>
          ) : (
            selectedCheckpointIds.map((cpId, idx) => {
              const cp = availableCheckpoints.find((c) => c.id === cpId);
              if (!cp) return null;
              return (
                <View key={cp.id} style={styles.selectedCpItem}>
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderBadgeText}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cpItemTitle}>{cp.name}</Text>
                    <Text style={styles.cpItemSub}>
                      {cp.latitude}, {cp.longitude} · R={cp.defaultRadiusMeters}m
                    </Text>
                  </View>
                  <View style={styles.reorderBtns}>
                    <TouchableOpacity
                      disabled={idx === 0}
                      onPress={() => moveCheckpoint(idx, "UP")}
                      style={[styles.moveBtn, idx === 0 && { opacity: 0.3 }]}
                    >
                      <Ionicons name="chevron-up" size={18} color={Colors.onSurface} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={idx === selectedCheckpointIds.length - 1}
                      onPress={() => moveCheckpoint(idx, "DOWN")}
                      style={[
                        styles.moveBtn,
                        idx === selectedCheckpointIds.length - 1 && { opacity: 0.3 },
                      ]}
                    >
                      <Ionicons name="chevron-down" size={18} color={Colors.onSurface} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => toggleCheckpoint(cp.id)}
                      style={styles.removeBtn}
                    >
                      <Ionicons name="close" size={18} color="#b91c1c" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          {/* Available Checkpoints */}
          <Text style={[styles.sectionHeading, { marginTop: 16 }]}>
            Danh sách Checkpoints của địa điểm ({availableCheckpoints.length})
          </Text>

          {availableCheckpoints.map((cp) => {
            const isSelected = selectedCheckpointIds.includes(cp.id);
            return (
              <TouchableOpacity
                key={cp.id}
                style={[
                  styles.availableCpCard,
                  isSelected && styles.availableCpCardSelected,
                ]}
                onPress={() => toggleCheckpoint(cp.id)}
              >
                <View
                  style={[
                    styles.checkbox,
                    isSelected && styles.checkboxSelected,
                  ]}
                >
                  {isSelected ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.availableCpName}>{cp.name}</Text>
                  {cp.description ? (
                    <Text style={styles.availableCpDesc}>{cp.description}</Text>
                  ) : null}
                  <Text style={styles.availableCpMeta}>
                    Toạ độ: {cp.latitude}, {cp.longitude}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.saveBtn, savingCheckpoints && { opacity: 0.6 }]}
            disabled={savingCheckpoints}
            onPress={handleSaveCheckpoints}
          >
            {savingCheckpoints ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>
                  Lưu danh sách Checkpoints (v{trip.version})
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        /* TAB 2: TRAILS & 3D MAP PREVIEW */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.guideCard}>
            <Ionicons name="map" size={20} color={Colors.primary} />
            <Text style={styles.guideText}>
              Gợi ý cung đường System Trails được tự động đối sánh với các
              checkpoints bạn đã chọn. Bạn có thể xem trước bản đồ 3D địa hình để
              thẩm định trước khi lưu lộ trình.
            </Text>
          </View>

          {/* Selected Trails Ordered */}
          <Text style={styles.sectionHeading}>
            Các chặng Trails đã chọn ({selectedTrailIds.length})
          </Text>

          {selectedTrailIds.length === 0 ? (
            <Text style={styles.emptyHint}>
              Chưa chọn trail nào. Vui lòng chọn ít nhất 1 trail trong danh sách gợi ý.
            </Text>
          ) : (
            selectedTrailIds.map((trId, idx) => {
              const tr = trailSuggestions.find((s) => s.id === trId);
              return (
                <View key={trId} style={styles.selectedCpItem}>
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderBadgeText}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cpItemTitle}>
                      {tr?.name || `Trail #${trId.slice(0, 8)}`}
                    </Text>
                    <Text style={styles.cpItemSub}>
                      {tr?.distanceKm} km · {tr?.difficulty} · Độ dốc:{" "}
                      {tr?.elevationGainM ?? "N/A"}m
                    </Text>
                  </View>
                  <View style={styles.reorderBtns}>
                    <TouchableOpacity
                      disabled={idx === 0}
                      onPress={() => moveTrail(idx, "UP")}
                      style={[styles.moveBtn, idx === 0 && { opacity: 0.3 }]}
                    >
                      <Ionicons name="chevron-up" size={18} color={Colors.onSurface} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={idx === selectedTrailIds.length - 1}
                      onPress={() => moveTrail(idx, "DOWN")}
                      style={[
                        styles.moveBtn,
                        idx === selectedTrailIds.length - 1 && { opacity: 0.3 },
                      ]}
                    >
                      <Ionicons name="chevron-down" size={18} color={Colors.onSurface} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => toggleTrail(trId)}
                      style={styles.removeBtn}
                    >
                      <Ionicons name="close" size={18} color="#b91c1c" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          {/* Trail Suggestions List */}
          <Text style={[styles.sectionHeading, { marginTop: 16 }]}>
            Gợi ý System Trails phù hợp ({trailSuggestions.length})
          </Text>

          {trailSuggestions.map((trail) => {
            const isSelected = selectedTrailIds.includes(trail.id);
            return (
              <View
                key={trail.id}
                style={[
                  styles.trailCard,
                  isSelected && styles.trailCardSelected,
                ]}
              >
                <View style={styles.trailCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trailCardTitle}>{trail.name}</Text>
                    <Text style={styles.trailCardMeta}>
                      Độ khó: {trail.difficulty} · Độ dài: {trail.distanceKm} km ·
                      Độ dốc: {trail.elevationGainM ?? 0}m
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.appendBadge,
                      trail.canAppend
                        ? styles.appendBadgeYes
                        : styles.appendBadgeNo,
                    ]}
                  >
                    <Text
                      style={[
                        styles.appendBadgeText,
                        trail.canAppend ? { color: "#15803d" } : { color: "#64748b" },
                      ]}
                    >
                      {trail.canAppend ? "Khớp nối ✓" : "Độc lập"}
                    </Text>
                  </View>
                </View>

                {trail.coveredCheckpointIds?.length > 0 ? (
                  <Text style={styles.coveredText}>
                    Bao phủ {trail.coveredCheckpointIds.length} checkpoint đã chọn.
                  </Text>
                ) : null}

                <View style={styles.trailCardActions}>
                  <TouchableOpacity
                    style={styles.preview3DBtn}
                    onPress={() => handlePreviewTrail3D(trail.id)}
                  >
                    <Ionicons name="cube-outline" size={16} color={Colors.primary} />
                    <Text style={styles.preview3DBtnText}>Xem 3D Map</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.selectTrailBtn,
                      isSelected && styles.selectTrailBtnActive,
                    ]}
                    onPress={() => toggleTrail(trail.id)}
                  >
                    <Ionicons
                      name={isSelected ? "checkmark-circle" : "add-circle-outline"}
                      size={16}
                      color={isSelected ? "#fff" : Colors.onSurface}
                    />
                    <Text
                      style={[
                        styles.selectTrailBtnText,
                        isSelected && styles.selectTrailBtnTextActive,
                      ]}
                    >
                      {isSelected ? "Đã chọn chặng" : "Chọn vào lộ trình"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={[styles.saveBtn, savingTrails && { opacity: 0.6 }]}
            disabled={savingTrails}
            onPress={handleSaveTrails}
          >
            {savingTrails ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>
                  Lưu lộ trình System Trails (v{trip.version})
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* MODAL PREVIEW MAP 3D CHO TRAIL */}
      <Modal visible={Boolean(previewTrail)} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface }}>
          <View style={styles.modalMapHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalMapTitle} numberOfLines={1}>
                {previewTrail?.name}
              </Text>
              <Text style={styles.modalMapSub}>
                Độ dài: {previewTrail?.distanceKm} km · Độ khó:{" "}
                {previewTrail?.difficulty}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeMapBtn}
              onPress={() => setPreviewTrail(null)}
            >
              <Ionicons name="close" size={24} color={Colors.onSurface} />
            </TouchableOpacity>
          </View>

          {previewRouteCoords ? (
            <View style={{ flex: 1 }}>
              <MapLibre3DView
                height={undefined}
                center={previewCenter}
                zoom={14}
                pitch={55}
                bearing={-20}
                is3D
                plannedRoute={previewRouteCoords}
                showEndpoints
              />
            </View>
          ) : (
            <View style={styles.centerBox}>
              <Text style={styles.emptyHint}>
                Cung đường này chưa có toạ độ GeoJSON để dựng mô hình 3D.
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
    backgroundColor: Colors.surface,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceContainerHigh,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  headerSub: {
    fontSize: 11,
    color: Colors.primaryDark,
    fontWeight: "600",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  nextBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.onPrimary,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
    backgroundColor: Colors.surface,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: Colors.primaryDark,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  guideCard: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: Colors.surfaceContainerLow,
    padding: 12,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  guideText: {
    flex: 1,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.onSurface,
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 12,
    fontStyle: "italic",
    color: Colors.onSurfaceMuted,
    paddingVertical: 6,
  },
  selectedCpItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surfaceContainerLow,
    padding: 10,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  orderBadge: {
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  orderBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.onPrimary,
  },
  cpItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  cpItemSub: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  reorderBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  moveBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.small,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.small,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  availableCpCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  availableCpCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceContainerLow,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radius.small,
    borderWidth: 2,
    borderColor: Colors.surfaceContainerHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  availableCpName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  availableCpDesc: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  availableCpMeta: {
    fontSize: 10,
    color: Colors.onSurfaceMuted,
    marginTop: 2,
  },
  trailCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.large,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: 8,
  },
  trailCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: "#f7fee7",
  },
  trailCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  trailCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  trailCardMeta: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  appendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.small,
  },
  appendBadgeYes: {
    backgroundColor: "#dcfce7",
  },
  appendBadgeNo: {
    backgroundColor: "#f1f5f9",
  },
  appendBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  coveredText: {
    fontSize: 11,
    color: "#15803d",
    fontWeight: "600",
  },
  trailCardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  preview3DBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  preview3DBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primaryDark,
  },
  selectTrailBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  selectTrailBtnActive: {
    backgroundColor: Colors.primary,
  },
  selectTrailBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  selectTrailBtnTextActive: {
    color: "#fff",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.large,
    marginTop: 12,
    ...Shadows.level2,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.onPrimary,
  },
  modalMapHeader: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
  },
  modalMapTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  modalMapSub: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  closeMapBtn: {
    padding: 6,
  },
});
