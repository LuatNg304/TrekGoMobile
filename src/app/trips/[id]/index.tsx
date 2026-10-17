import { Ionicons } from "@expo/vector-icons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookingModal } from "@/components/BookingModal";
import {
  MapLibre3DView,
  MapLibre3DViewRef,
  MapCheckpoint,
  MapRouteCoordinates,
} from "@/components/map/MapLibre3DView";
import { Colors, Radius, Shadows } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import {
  cf01PublicTripApi,
  PublicTripDiscoveryDetail,
} from "@/services/api/cf01PublicTripApi";
import { Trip } from "@/types";

interface StageData {
  stageNumber: number;
  name: string;
  difficulty: string;
  distanceKm: string;
  routeCoords?: MapRouteCoordinates;
  checkpoints?: MapCheckpoint[];
  camera?: {
    center?: [number, number];
    zoom?: number;
    pitch?: number;
    bearing?: number;
  };
}

export default function TripDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips } = useApp();

  const [bookingVisible, setBookingVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [backendTrip, setBackendTrip] =
    useState<PublicTripDiscoveryDetail | null>(null);

  // 3D Map stages
  const [stages, setStages] = useState<StageData[]>([]);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [loadingMap, setLoadingMap] = useState(false);
  const mapRef = useRef<MapLibre3DViewRef>(null);

  // Mock fallback
  const mockTrip = useMemo(
    () => trips.find((item) => item.id === id),
    [id, trips],
  );

  // 1. Tải chi tiết chuyến đi từ API Backend
  useEffect(() => {
    let active = true;
    async function fetchTripDetail() {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await cf01PublicTripApi.getPublicTripDetail(id);
        if (!active) return;
        setBackendTrip(data);

        // 2. Tải bản đồ 3D cho các routes của chuyến đi
        if (data.destination?.id) {
          load3DMapForTrip(data);
        }
      } catch (err) {
        // Fallback sang mock data nếu không tìm thấy trên backend
        console.log("Trip detail fallback to local mock:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    async function load3DMapForTrip(tripData: PublicTripDiscoveryDetail) {
      try {
        setLoadingMap(true);
        const trailsRes = await cf01PublicTripApi.getSystemTrailsForDestination(
          tripData.destination.id,
        );
        const systemTrails = trailsRes?.items || [];

        const loadedStages: StageData[] = [];

        // Duyệt từng route của chuyến đi để khớp với systemTrails
        const routes = tripData.routes || [];
        for (let i = 0; i < routes.length; i++) {
          const r = routes[i];
          const matched = systemTrails.find(
            (st: any) =>
              st.name.trim().toLowerCase() ===
              r.snapshotName.trim().toLowerCase(),
          );

          const trailCodeOrId = matched?.code || matched?.id;
          if (trailCodeOrId) {
            try {
              const detail =
                await cf01PublicTripApi.getSystemTrailDetailByCodeOrId(
                  trailCodeOrId,
                );

              const coords = detail.routeGeojson?.coordinates;
              const cps: MapCheckpoint[] = (detail.checkpoints || []).map(
                (c: any, idx: number) => ({
                  id: c.id,
                  name: c.name,
                  order: c.sequence || idx + 1,
                  latitude: parseFloat(String(c.latitude)) || 0,
                  longitude: parseFloat(String(c.longitude)) || 0,
                }),
              );

              loadedStages.push({
                stageNumber: i + 1,
                name: r.snapshotName,
                difficulty: r.snapshotDifficulty,
                distanceKm: r.snapshotDistanceKm,
                routeCoords: coords,
                checkpoints: cps,
                camera: detail.initialCamera
                  ? {
                      center: [
                        detail.initialCamera.center.longitude,
                        detail.initialCamera.center.latitude,
                      ],
                      zoom: detail.initialCamera.zoom || 14,
                      pitch: detail.initialCamera.pitch || 55,
                      bearing: detail.initialCamera.bearing || 0,
                    }
                  : undefined,
              });
            } catch (stageErr) {
              console.warn(
                `Lỗi tải trail detail cho chặng ${r.snapshotName}:`,
                stageErr,
              );
              loadedStages.push({
                stageNumber: i + 1,
                name: r.snapshotName,
                difficulty: r.snapshotDifficulty,
                distanceKm: r.snapshotDistanceKm,
              });
            }
          } else {
            loadedStages.push({
              stageNumber: i + 1,
              name: r.snapshotName,
              difficulty: r.snapshotDifficulty,
              distanceKm: r.snapshotDistanceKm,
            });
          }
        }

        if (active) {
          setStages(loadedStages);
        }
      } catch (mapErr) {
        console.warn("Lỗi tải System Trails cho bản đồ 3D:", mapErr);
      } finally {
        if (active) setLoadingMap(false);
      }
    }

    const timer = setTimeout(() => {
      fetchTripDetail();
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id]);

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)/trips" as Href);
  }

  // Kết hợp data giữa backend và mock
  const tripCombined: Trip | null = useMemo(() => {
    if (backendTrip) {
      const priceNum = parseInt(backendTrip.pricePerPax, 10) || 700000;
      const enrolled = Math.max(
        0,
        backendTrip.capacity - backendTrip.remainingSlots,
      );

      return {
        id: backendTrip.id,
        type: "PUBLIC",
        name: backendTrip.title,
        trailId: backendTrip.destination?.id || "dest-default",
        destination: backendTrip.destination?.name || "Điểm đến TrekGo",
        startDate: backendTrip.startAt
          ? new Date(backendTrip.startAt).toLocaleDateString("vi-VN")
          : "Sắp diễn ra",
        endDate: backendTrip.endAt
          ? new Date(backendTrip.endAt).toLocaleDateString("vi-VN")
          : "Sắp diễn ra",
        durationDays: 2,
        status: "UPCOMING",
        leader: {
          name: backendTrip.leader?.fullName || "Trek Leader",
          avatar:
            backendTrip.leader?.avatarUrl ||
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
          phone: "0900000000",
          rating: 5.0,
          badge: "Verified Trek Leader",
        },
        capacity: backendTrip.capacity,
        enrolledCount: enrolled,
        pricePerPerson: priceNum,
        weather: {
          tempC: 22,
          condition: "Nắng nhẹ",
          rainRisk: false,
          rainChancePercent: 15,
          humidityPercent: 65,
          windSpeedKmh: 10,
        },
        participants: [],
      };
    }
    return mockTrip || null;
  }, [backendTrip, mockTrip]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải chi tiết chuyến đi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!tripCombined) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Ionicons
            name="map-outline"
            size={54}
            color={Colors.onSurfaceMuted}
          />
          <Text style={styles.emptyTitle}>Không tìm thấy chuyến đi</Text>
          <Text style={styles.emptyDescription}>
            Chuyến đi này có thể đã được cập nhật hoặc không còn khả dụng.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleBack}>
            <Text style={styles.primaryButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const availableSlots = backendTrip
    ? backendTrip.remainingSlots
    : Math.max(0, tripCombined.capacity - tripCombined.enrolledCount);

  const isAlreadyBooked = Boolean(tripCombined.bookingCode);
  const currentStage = stages[activeStageIndex];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết chuyến đi</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons
            name="bookmark-outline"
            size={21}
            color={Colors.onSurface}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HERO CARD */}
        <View style={styles.heroCard}>
          <View style={styles.heroDecorOne} />
          <View style={styles.heroDecorTwo} />

          <View style={styles.heroBadges}>
            <View style={styles.publicBadge}>
              <Ionicons name="earth" size={13} color="#0c2000" />
              <Text style={styles.publicBadgeText}>PUBLIC TOUR</Text>
            </View>

            <View style={styles.slotBadge}>
              <Text style={styles.slotBadgeText}>Còn {availableSlots} chỗ</Text>
            </View>
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>
              {backendTrip?.destination?.name || tripCombined.destination}
            </Text>
            <Text style={styles.heroTitle}>{tripCombined.name}</Text>

            <View style={styles.heroMetaRow}>
              <Ionicons
                name="calendar-outline"
                size={15}
                color={Colors.onSurfaceVariant}
              />
              <Text style={styles.heroMetaText}>
                {tripCombined.startDate} – {tripCombined.endDate}
              </Text>
            </View>
          </View>
        </View>

        {/* STATS GRID */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons
              name="time-outline"
              size={21}
              color={Colors.primaryDark}
            />
            <Text style={styles.statValue}>
              {tripCombined.durationDays} ngày
            </Text>
            <Text style={styles.statLabel}>Thời lượng</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons
              name="people-outline"
              size={21}
              color={Colors.primaryDark}
            />
            <Text style={styles.statValue}>
              {tripCombined.enrolledCount}/{tripCombined.capacity}
            </Text>
            <Text style={styles.statLabel}>Thành viên</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons
              name="wallet-outline"
              size={21}
              color={Colors.primaryDark}
            />
            <Text style={styles.statValue}>
              {((tripCombined.pricePerPerson ?? 700000) / 1000000).toFixed(2)}tr
            </Text>
            <Text style={styles.statLabel}>Mỗi người</Text>
          </View>
        </View>

        {/* BẢN ĐỒ 3D THEO CUNG ĐƯỜNG CỦA TRIP (MapLibre 3D Terrain) */}
        {stages.length > 0 && currentStage?.routeCoords ? (
          <View style={styles.mapSectionCard}>
            <View style={styles.mapHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>
                  Bản đồ 3D Cung đường Chuyến đi
                </Text>
                <Text style={styles.mapSubtitle}>
                  MapLibre 3D Terrain · Vệ tinh ArcGIS
                </Text>
              </View>
              <View style={styles.mapBadge}>
                <Ionicons name="cube" size={13} color="#15803d" />
                <Text style={styles.mapBadgeText}>3D SATELLITE</Text>
              </View>
            </View>

            {/* Stage Selector nếu có nhiều hơn 1 chặng */}
            {stages.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.stageTabsContainer}
              >
                {stages.map((st, idx) => {
                  const isActive = idx === activeStageIndex;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.stageTab,
                        isActive && styles.stageTabActive,
                      ]}
                      onPress={() => {
                        setActiveStageIndex(idx);
                        if (st.camera?.center) {
                          mapRef.current?.flyTo(
                            st.camera.center[0],
                            st.camera.center[1],
                            st.camera.zoom || 14,
                          );
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.stageTabText,
                          isActive && styles.stageTabTextActive,
                        ]}
                      >
                        Chặng {st.stageNumber}: {st.name} ({st.distanceKm}km)
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}

            {/* MapLibre 3D View */}
            <View style={styles.mapWrapper}>
              <MapLibre3DView
                ref={mapRef}
                height={260}
                center={
                  currentStage.camera?.center ||
                  (Array.isArray(currentStage.routeCoords[0])
                    ? [
                        (currentStage.routeCoords[0] as any)[0],
                        (currentStage.routeCoords[0] as any)[1],
                      ]
                    : [106.162, 11.365])
                }
                zoom={currentStage.camera?.zoom || 14}
                pitch={currentStage.camera?.pitch || 55}
                bearing={currentStage.camera?.bearing || -15}
                is3D
                plannedRoute={currentStage.routeCoords}
                checkpoints={currentStage.checkpoints}
                showEndpoints
              />
            </View>

            {/* Stage Info Footer */}
            <View style={styles.stageInfoFooter}>
              <View style={styles.stageInfoItem}>
                <Ionicons
                  name="navigate-outline"
                  size={15}
                  color={Colors.primaryDark}
                />
                <Text style={styles.stageInfoText}>
                  {currentStage.distanceKm} km
                </Text>
              </View>
              <View style={styles.stageInfoItem}>
                <Ionicons
                  name="speedometer-outline"
                  size={15}
                  color={Colors.primaryDark}
                />
                <Text style={styles.stageInfoText}>
                  Độ khó: {currentStage.difficulty}
                </Text>
              </View>
              <View style={styles.stageInfoItem}>
                <Ionicons
                  name="flag-outline"
                  size={15}
                  color={Colors.primaryDark}
                />
                <Text style={styles.stageInfoText}>
                  {currentStage.checkpoints?.length || 0} checkpoints
                </Text>
              </View>
            </View>
          </View>
        ) : loadingMap ? (
          <View style={styles.mapLoadingBox}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.mapLoadingText}>
              Đang tải bản đồ địa hình 3D cho các chặng...
            </Text>
          </View>
        ) : null}

        {/* TREK LEADER */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Trek Leader</Text>
          <View style={styles.leaderRow}>
            <View style={styles.leaderAvatar}>
              <Ionicons name="person" size={26} color={Colors.onPrimary} />
            </View>

            <View style={styles.leaderInfo}>
              <Text style={styles.leaderName}>{tripCombined.leader.name}</Text>
              <View style={styles.leaderRatingRow}>
                <Ionicons name="star" size={14} color="#e5aa00" />
                <Text style={styles.leaderRating}>
                  {tripCombined.leader.rating.toFixed(1)}
                </Text>
                <Text style={styles.leaderBadgeText}>
                  · {tripCombined.leader.badge}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.contactButton}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={19}
                color={Colors.primaryDark}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ĐIỂM ĐÓN / TẬP KẾT */}
        {backendTrip?.pickup ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Điểm tập kết & Xe trung chuyển</Text>
            <View style={styles.pickupBox}>
              <View style={styles.pickupIconBox}>
                <Ionicons name="bus" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickupName}>{backendTrip.pickup.name}</Text>
                {backendTrip.pickup.address ? (
                  <Text style={styles.pickupAddress}>
                    {backendTrip.pickup.address}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        {/* CHECKPOINTS BẮT BUỘC */}
        {backendTrip?.checkpoints && backendTrip.checkpoints.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              Các mốc trạm trên đường đi ({backendTrip.checkpoints.length})
            </Text>
            <View style={styles.cpList}>
              {backendTrip.checkpoints.map((cp, idx) => (
                <View key={cp.id} style={styles.cpRow}>
                  <View style={styles.cpDot}>
                    <Text style={styles.cpDotText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.cpRowText}>{cp.name}</Text>
                  {cp.isRequired ? (
                    <View style={styles.reqBadge}>
                      <Text style={styles.reqBadgeText}>BẮT BUỘC</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* MÔ TẢ & LỊCH TRÌNH */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Mô tả chi tiết</Text>
          <Text style={styles.descBody}>
            {backendTrip?.description ||
              "Hành trình trekking khám phá thiên nhiên hoang sơ, vượt qua các dốc đá và rừng nguyên sinh cùng Trek Leader chuyên nghiệp."}
          </Text>
        </View>

        {/* CHI PHÍ BAO GỒM */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Chi phí bao gồm</Text>
          {[
            "Xe trung chuyển hai chiều",
            "Trek Leader và Porter bản địa",
            "Bảo hiểm trekking cơ bản",
            "Nước uống và bữa ăn theo lịch trình",
          ].map((item) => (
            <View key={item} style={styles.includedRow}>
              <View style={styles.checkIcon}>
                <Ionicons name="checkmark" size={14} color="#0c2000" />
              </View>
              <Text style={styles.includedText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* PRICE SUMMARY */}
        <View style={styles.priceSummary}>
          <View>
            <Text style={styles.priceCaption}>Giá mỗi người</Text>
            <Text style={styles.priceValue}>
              {(tripCombined.pricePerPerson ?? 700000).toLocaleString("vi-VN")} đ
            </Text>
          </View>
          <Text style={styles.slotWarning}>Chỉ còn {availableSlots} chỗ</Text>
        </View>

        {/* BOOKING BUTTON */}
        <TouchableOpacity
          style={styles.bookingButton}
          activeOpacity={0.85}
          onPress={() => {
            if (isAlreadyBooked) {
              router.replace("/(tabs)/trips" as Href);
              return;
            }
            setBookingVisible(true);
          }}
        >
          <Ionicons
            name={isAlreadyBooked ? "checkmark-circle" : "ticket-outline"}
            size={21}
            color={Colors.onPrimary}
          />
          <Text style={styles.bookingButtonText}>
            {isAlreadyBooked
              ? "Đã đặt chỗ · Xem chuyến của tôi"
              : "Đặt tour ngay"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.policyText}>
          Bạn có thể xem lại chính sách hoàn hủy trước khi xác nhận thanh toán.
        </Text>
      </ScrollView>

      <BookingModal
        visible={bookingVisible}
        trip={tripCombined}
        onClose={() => setBookingVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
    backgroundColor: Colors.surface,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceContainer,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.onSurface,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  heroCard: {
    minHeight: 210,
    padding: 18,
    borderRadius: Radius.xl,
    overflow: "hidden",
    backgroundColor: Colors.primaryPale,
    justifyContent: "space-between",
    ...Shadows.hover,
  },
  heroDecorOne: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -70,
    top: -70,
    backgroundColor: Colors.primary,
    opacity: 0.2,
  },
  heroDecorTwo: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    left: -50,
    bottom: -95,
    backgroundColor: Colors.primaryDark,
    opacity: 0.12,
  },
  heroBadges: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  publicBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  publicBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0c2000",
    letterSpacing: 0.6,
  },
  slotBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  slotBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primaryDark,
  },
  heroContent: {
    gap: 6,
  },
  heroEyebrow: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.primaryDark,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.ink,
    lineHeight: 28,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroMetaText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontWeight: "500",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.large,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  mapSectionCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.large,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: 10,
    ...Shadows.level1,
  },
  mapHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mapSubtitle: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  mapBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.small,
  },
  mapBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803d",
  },
  stageTabsContainer: {
    gap: 8,
    paddingVertical: 4,
  },
  stageTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  stageTabActive: {
    backgroundColor: Colors.primary,
  },
  stageTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.onSurfaceVariant,
  },
  stageTabTextActive: {
    color: Colors.onPrimary,
    fontWeight: "700",
  },
  mapWrapper: {
    height: 260,
    borderRadius: Radius.medium,
    overflow: "hidden",
  },
  stageInfoFooter: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  stageInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  stageInfoText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.onSurface,
  },
  mapLoadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.large,
  },
  mapLoadingText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  sectionCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.large,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  leaderAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  leaderInfo: {
    flex: 1,
    gap: 3,
  },
  leaderName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  leaderRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  leaderRating: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  leaderBadgeText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  contactButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  pickupBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: Radius.medium,
  },
  pickupIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  pickupName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  pickupAddress: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  cpList: {
    gap: 8,
  },
  cpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: Radius.small,
  },
  cpDot: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cpDotText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.onPrimary,
  },
  cpRowText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.onSurface,
  },
  reqBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.small,
  },
  reqBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#b45309",
  },
  descBody: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    lineHeight: 19,
  },
  includedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkIcon: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  includedText: {
    fontSize: 13,
    color: Colors.onSurface,
  },
  priceSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surfaceContainerLow,
    padding: 16,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  priceCaption: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.primaryDark,
  },
  slotWarning: {
    fontSize: 12,
    fontWeight: "700",
    color: "#b45309",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  bookingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: Radius.large,
    ...Shadows.level2,
  },
  bookingButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.onPrimary,
  },
  policyText: {
    fontSize: 11,
    color: Colors.onSurfaceMuted,
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  emptyDescription: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.full,
    marginTop: 8,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.onPrimary,
  },
});
