import { CreatePrivateTripModal } from "@/components/CreatePrivateTripModal";
import {
  MapLibre3DView,
  MapCheckpoint,
  MapLibre3DViewRef,
} from "@/components/map/MapLibre3DView";
import { LiveTrailRecorderModal } from "@/components/trail/LiveTrailRecorderModal";
import { TopHeader } from "@/components/TopHeader";
import { Colors, Radius, Shadows } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { Trail, PersonalTrail } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import {
  RefreshControl,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr;
  }
  const hours = date.getHours().toString().padStart(2, "0");
  const mins = date.getMinutes().toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${hours}:${mins} - ${day}/${month}/${year}`;
}

export default function ExploreScreen() {
  const router = useRouter();
  const { trails, unlockTrail, personalTrails, refreshPersonalTrails } =
    useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"SYSTEM" | "PERSONAL">("SYSTEM");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("Tất cả");
  const [selectedTrail, setSelectedTrail] = useState<Trail>(trails[0]);
  const [selectedPersonalTrail, setSelectedPersonalTrail] =
    useState<PersonalTrail | null>(personalTrails[0] || null);
  const [createPrivateModalVisible, setCreatePrivateModalVisible] =
    useState(false);
  const [isRecordingModalVisible, setIsRecordingModalVisible] = useState(false);

  const filters = ["Tất cả", "Gần bạn", "Dễ", "Trung bình", "Khó", "Đã sở hữu"];

  const filteredTrails = trails.filter((trail) => {
    if (selectedFilter === "Đã sở hữu") return trail.isUnlocked;
    if (selectedFilter !== "Tất cả" && selectedFilter !== "Gần bạn") {
      return trail.difficulty === selectedFilter;
    }
    if (searchQuery.trim()) {
      return (
        trail.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trail.region.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  const filteredPersonalTrails = personalTrails.filter((trail) => {
    if (searchQuery.trim()) {
      return (
        trail.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trail.region.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  const handleUnlock = () => {
    unlockTrail(selectedTrail.id);
  };

  // Chuẩn bị dữ liệu Checkpoint và Toạ độ cho MapLibre 3D
  const systemCheckpoints: MapCheckpoint[] = (
    selectedTrail.checkpoints || []
  ).map((cp, idx) => ({
    id: cp.id,
    name: cp.name,
    order: cp.order || idx + 1,
    latitude:
      cp.realCoords?.lat ||
      11.5831 + (cp.coords?.y ? (cp.coords.y - 200) * 0.0003 : idx * 0.003),
    longitude:
      cp.realCoords?.lon ||
      108.529 + (cp.coords?.x ? (cp.coords.x - 200) * 0.0003 : idx * 0.003),
    elevation: cp.elevation,
    status: cp.status === "COMPLETED" ? "COMPLETED" : "PENDING",
  }));
  const systemPlannedRoute: [number, number][] = systemCheckpoints.map((cp) => [
    cp.longitude,
    cp.latitude,
  ]);

  // Tự động làm mới danh sách từ Server khi chuyển sang tab PERSONAL
  useEffect(() => {
    if (activeTab === "PERSONAL") {
      refreshPersonalTrails().catch(console.warn);
    }
  }, [activeTab, refreshPersonalTrails]);

  // Luôn resolve sang bản ghi mới nhất trong personalTrails (tránh kẹt ID tạm thời sau khi sync)
  const activePersonal = useMemo(() => {
    if (!selectedPersonalTrail) return personalTrails[0] || null;
    const exact = personalTrails.find((t) => t.id === selectedPersonalTrail.id);
    if (exact) return exact;

    if (selectedPersonalTrail.clientRecordingId) {
      const synced = personalTrails.find(
        (t) => t.clientRecordingId === selectedPersonalTrail.clientRecordingId,
      );
      if (synced) return synced;
    }

    const matched = personalTrails.find(
      (t) =>
        t.name.trim().toLowerCase() ===
          selectedPersonalTrail.name.trim().toLowerCase() &&
        Math.abs(t.distanceKm - selectedPersonalTrail.distanceKm) < 0.2,
    );
    if (matched) return matched;

    return selectedPersonalTrail;
  }, [selectedPersonalTrail, personalTrails]);

  const personalMapRef = useRef<MapLibre3DViewRef>(null);

  const handlePersonalMapReady = useCallback(() => {
    let routeCoords: [number, number, number?][] | undefined;
    if (activePersonal?.gpsSegments && activePersonal.gpsSegments.length > 0) {
      const validPoints: [number, number, number?][] = [];
      for (const seg of activePersonal.gpsSegments) {
        if (seg.length >= 2) {
          validPoints.push(...seg);
        }
      }
      if (validPoints.length > 1) {
        routeCoords = validPoints;
      }
    }
    if (!routeCoords) {
      routeCoords = activePersonal?.gpsRoute;
    }

    if (routeCoords && routeCoords.length > 1) {
      let minLng = Infinity;
      let maxLng = -Infinity;
      let minLat = Infinity;
      let maxLat = -Infinity;
      for (const pt of routeCoords) {
        if (pt[0] < minLng) minLng = pt[0];
        if (pt[0] > maxLng) maxLng = pt[0];
        if (pt[1] < minLat) minLat = pt[1];
        if (pt[1] > maxLat) maxLat = pt[1];
      }
      if (minLng !== Infinity) {
        personalMapRef.current?.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          45,
        );
      }
    }
  }, [activePersonal]);

  // Tự động fit camera khi chọn hoặc chuyển đổi cung đường cá nhân
  useEffect(() => {
    handlePersonalMapReady();
  }, [handlePersonalMapReady]);

  const personalPlannedRoute =
    activePersonal?.gpsSegments && activePersonal.gpsSegments.length > 0
      ? activePersonal.gpsSegments
      : activePersonal?.gpsRoute && activePersonal.gpsRoute.length > 0
        ? activePersonal.gpsRoute
        : [];
  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await refreshPersonalTrails();
    } finally {
      setIsRefreshing(false);
    }
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <TopHeader subtitle="Explore" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        alwaysBounceVertical
        refreshControl={
          activeTab === "PERSONAL" ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primaryDark]}
              tintColor={Colors.primaryDark}
            />
          ) : undefined
        }
      >
        {/* 1. Mode Switcher (Cung đường hệ thống vs Cung đường cá nhân) */}
        <View style={styles.tabSwitcherContainer}>
          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "SYSTEM" && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab("SYSTEM")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="compass"
                size={16}
                color={
                  activeTab === "SYSTEM"
                    ? Colors.primaryDark
                    : Colors.onSurfaceVariant
                }
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "SYSTEM" && styles.tabButtonTextActive,
                ]}
              >
                Cung đường hệ thống
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "PERSONAL" && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab("PERSONAL")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="trail-sign"
                size={16}
                color={
                  activeTab === "PERSONAL"
                    ? Colors.primaryDark
                    : Colors.onSurfaceVariant
                }
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "PERSONAL" && styles.tabButtonTextActive,
                ]}
              >
                Cá nhân ({personalTrails.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. TrekGo Live GPS Tracker Action Banner */}
        <View style={styles.liveRecordBanner}>
          <View style={styles.liveRecordInfo}>
            <View style={styles.liveRecordTag}>
              <View style={styles.pulseDot} />
              <Text style={styles.liveRecordTagText}>
                GPS LIVE TREKGO TRACK
              </Text>
            </View>
            <Text style={styles.liveRecordTitle}>
              Ghi nhận cung đường cá nhân
            </Text>
            <Text style={styles.liveRecordDesc}>
              Bật GPS ghi lại vệt di chuyển, tốc độ, cao độ 3D và lưu vào máy
            </Text>
          </View>

          <TouchableOpacity
            style={styles.liveRecordActionBtn}
            onPress={() => setIsRecordingModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="radio" size={16} color="#0c2000" />
            <Text style={styles.liveRecordActionText}>BẮT ĐẦU GHI</Text>
          </TouchableOpacity>
        </View>

        {/* 3. Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons
              name="search"
              size={18}
              color={Colors.onSurfaceVariant}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={
                activeTab === "SYSTEM"
                  ? "Tìm kiếm cung đường, địa danh..."
                  : "Tìm trong cung đường cá nhân..."
              }
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.onSurfaceMuted}
            />
            <TouchableOpacity
              style={styles.filterIconButton}
              onPress={() => router.push("/personal-trails" as Href)}
              activeOpacity={0.85}
            >
              <Ionicons
                name="folder-open-outline"
                size={16}
                color={Colors.onSurface}
              />
            </TouchableOpacity>
          </View>

          {/* Filter Pills Scroll (Chỉ áp dụng cho Cung đường hệ thống) */}
          {activeTab === "SYSTEM" && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsRow}
            >
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterPill,
                    selectedFilter === filter && styles.filterPillActive,
                  ]}
                  onPress={() => setSelectedFilter(filter)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      selectedFilter === filter && styles.filterPillTextActive,
                    ]}
                  >
                    {filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* 4. MAIN CONTENT THEO TAB */}
        {activeTab === "SYSTEM" ? (
          /* TAB CUNG ĐƯỜNG HỆ THỐNG */
          <View style={styles.mainTrailCard}>
            {/* Hero Image */}
            <View style={styles.trailHeroWrapper}>
              <Image
                source={{ uri: selectedTrail.imageUrl }}
                style={styles.trailHeroImage}
              />
              <View style={styles.heroOverlay} />

              <View style={styles.offlineGpsBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.offlineGpsText}>Offline GPS 3D</Text>
              </View>

              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={13} color="#fed018" />
                <Text style={styles.ratingText}>
                  {selectedTrail.rating} ({selectedTrail.reviewCount})
                </Text>
              </View>

              <View style={styles.heroInfoBottom}>
                <View style={styles.categoryTagsRow}>
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>
                      {selectedTrail.terrainType}
                    </Text>
                  </View>
                  <View
                    style={[styles.categoryTag, { backgroundColor: "#fed018" }]}
                  >
                    <Text
                      style={[styles.categoryTagText, { color: "#4a3b1c" }]}
                    >
                      {selectedTrail.difficulty}
                    </Text>
                  </View>
                </View>

                <Text style={styles.trailTitle}>{selectedTrail.name}</Text>
                <Text style={styles.trailSubtitle}>
                  📍 {selectedTrail.region}
                </Text>
              </View>
            </View>

            {/* Bento Grid */}
            <View style={styles.bentoGrid}>
              <View style={styles.bentoTile}>
                <View style={styles.bentoIconBg}>
                  <Ionicons
                    name="git-commit"
                    size={16}
                    color={Colors.primaryDark}
                  />
                </View>
                <View>
                  <Text style={styles.bentoLabel}>KHOẢNG CÁCH</Text>
                  <Text style={styles.bentoValue}>
                    {selectedTrail.distanceKm} km
                  </Text>
                </View>
              </View>

              <View style={styles.bentoTile}>
                <View style={styles.bentoIconBg}>
                  <Ionicons name="time" size={16} color={Colors.secondary} />
                </View>
                <View>
                  <Text style={styles.bentoLabel}>THỜI GIAN</Text>
                  <Text style={styles.bentoValue}>
                    {selectedTrail.duration}
                  </Text>
                </View>
              </View>

              <View style={styles.bentoTile}>
                <View style={styles.bentoIconBg}>
                  <Ionicons name="trending-up" size={16} color="#725c00" />
                </View>
                <View>
                  <Text style={styles.bentoLabel}>ĐỘ CAO LŨY KẾ</Text>
                  <Text style={styles.bentoValue}>
                    +{selectedTrail.elevationGainM}m
                  </Text>
                </View>
              </View>

              <View style={styles.bentoTile}>
                <View style={styles.bentoIconBg}>
                  <Ionicons name="flag" size={16} color={Colors.primaryDark} />
                </View>
                <View>
                  <Text style={styles.bentoLabel}>CHECKPOINTS</Text>
                  <Text style={styles.bentoValue}>
                    {selectedTrail.checkpoints?.length || 5} Mốc GPS
                  </Text>
                </View>
              </View>
            </View>

            {/* MAPLIBRE 3D ROUTE VIEW (Thay thế TacticalMap SVG) */}
            <View style={styles.mapSectionCard}>
              <View style={styles.mapHeaderRow}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Ionicons name="map" size={16} color={Colors.primaryDark} />
                  <Text style={styles.mapHeaderTitle}>
                    Bản đồ địa hình 3D MapLibre & ArcGIS
                  </Text>
                </View>
                <View style={styles.contourBadge}>
                  <Text style={styles.contourText}>DEM 3D</Text>
                </View>
              </View>

              <MapLibre3DView
                height={260}
                is3D={true}
                plannedRoute={systemPlannedRoute}
                checkpoints={systemCheckpoints}
                interactive={true}
              />
            </View>

            {/* Description */}
            <View style={styles.descSection}>
              <Text style={styles.descTitle}>Tổng quan hành trình</Text>
              <Text style={styles.descBody}>{selectedTrail.description}</Text>
            </View>

            {/* CTA */}
            <View style={styles.ctaRow}>
              {selectedTrail.isUnlocked ? (
                <>
                  <TouchableOpacity
                    style={styles.primaryCta}
                    onPress={() => router.push("/navigation")}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="navigate"
                      size={18}
                      color={Colors.onPrimary}
                    />
                    <Text style={styles.primaryCtaText}>
                      Vào Chế Độ GPS Trekking
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryCta}
                    onPress={() => setCreatePrivateModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="people"
                      size={18}
                      color={Colors.onSurface}
                    />
                    <Text style={styles.secondaryCtaText}>
                      Tạo Private Trip
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.unlockCta}
                  onPress={handleUnlock}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="lock-open"
                    size={20}
                    color={Colors.onPrimary}
                  />
                  <Text style={styles.unlockCtaText}>
                    Mở Khóa Bản Đồ GPS Toàn Tuyến (
                    {selectedTrail.price.toLocaleString("vi-VN")} đ)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          /* TAB CUNG ĐƯỜNG CÁ NHÂN */
          <View style={styles.personalSection}>
            {activePersonal ? (
              <View style={styles.mainTrailCard}>
                <View style={styles.personalHeroCard}>
                  <View style={styles.personalBadgeRow}>
                    <View
                      style={[
                        styles.verificationBadge,
                        activePersonal.verificationStatus === "VERIFIED"
                          ? styles.badgeVerified
                          : activePersonal.verificationStatus === "PENDING"
                            ? styles.badgePending
                            : styles.badgeDraft,
                      ]}
                    >
                      <Ionicons
                        name={
                          activePersonal.verificationStatus === "VERIFIED"
                            ? "checkmark-circle"
                            : activePersonal.verificationStatus === "PENDING"
                              ? "time"
                              : "document-text"
                        }
                        size={12}
                        color="#ffffff"
                      />
                      <Text style={styles.verificationBadgeText}>
                        {activePersonal.verificationStatus === "VERIFIED"
                          ? "Đã xác minh"
                          : activePersonal.verificationStatus === "PENDING"
                            ? "Đang chờ duyệt"
                            : "Bản nháp cá nhân"}
                      </Text>
                    </View>

                    <Text style={styles.personalDateText}>
                      {formatDateTime(activePersonal.createdAt)}
                    </Text>
                  </View>

                  <Text style={styles.personalTitleText}>
                    {activePersonal.name}
                  </Text>
                  <Text style={styles.personalRegionText}>
                    📍 {activePersonal.region}
                  </Text>

                  {/* Bento Metrics */}
                  <View style={[styles.bentoGrid, { marginTop: 14 }]}>
                    <View style={styles.bentoTile}>
                      <View style={styles.bentoIconBg}>
                        <Ionicons
                          name="git-commit"
                          size={16}
                          color={Colors.primaryDark}
                        />
                      </View>
                      <View>
                        <Text style={styles.bentoLabel}>QUÃNG ĐƯỜNG</Text>
                        <Text style={styles.bentoValue}>
                          {activePersonal.distanceKm} km
                        </Text>
                      </View>
                    </View>

                    <View style={styles.bentoTile}>
                      <View style={styles.bentoIconBg}>
                        <Ionicons
                          name="trending-up"
                          size={16}
                          color="#725c00"
                        />
                      </View>
                      <View>
                        <Text style={styles.bentoLabel}>ĐỘ CAO</Text>
                        <Text style={styles.bentoValue}>
                          +{activePersonal.elevationGainM}m
                        </Text>
                      </View>
                    </View>

                    <View style={styles.bentoTile}>
                      <View style={styles.bentoIconBg}>
                        <Ionicons
                          name="time"
                          size={16}
                          color={Colors.secondary}
                        />
                      </View>
                      <View>
                        <Text style={styles.bentoLabel}>THỜI GIAN</Text>
                        <Text style={styles.bentoValue}>
                          {activePersonal.duration}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.bentoTile}>
                      <View style={styles.bentoIconBg}>
                        <Ionicons
                          name="trail-sign"
                          size={16}
                          color={Colors.primaryDark}
                        />
                      </View>
                      <View>
                        <Text style={styles.bentoLabel}>ĐỊA HÌNH</Text>
                        <Text style={styles.bentoValue} numberOfLines={1}>
                          {activePersonal.terrainType || "Rừng núi"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* MapLibre 3D cho Cung đường cá nhân */}
                <View style={styles.mapSectionCard}>
                  <View style={styles.mapHeaderRow}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Ionicons
                        name="map"
                        size={16}
                        color={Colors.primaryDark}
                      />
                      <Text style={styles.mapHeaderTitle}>
                        Bản đồ 3D Cung đường cá nhân
                      </Text>
                    </View>
                    <View style={styles.contourBadge}>
                      <Text style={styles.contourText}>MapLibre 3D</Text>
                    </View>
                  </View>

                  <MapLibre3DView
                    ref={personalMapRef}
                    key={activePersonal?.id || "personal-map"}
                    height={260}
                    center={
                      activePersonal?.gpsRoute &&
                      activePersonal.gpsRoute.length > 0
                        ? [
                            activePersonal.gpsRoute[0][0],
                            activePersonal.gpsRoute[0][1],
                          ]
                        : [108.529, 11.5831]
                    }
                    is3D={true}
                    dragRotate={true}
                    onMapReady={handlePersonalMapReady}
                    plannedRoute={personalPlannedRoute}
                    checkpoints={[]}
                    showEndpoints={true}
                    interactive={true}
                  />
                </View>

                {/* Nút hành động */}
                <View style={styles.ctaRow}>
                  <TouchableOpacity
                    style={styles.primaryCta}
                    onPress={() =>
                      router.push(
                        `/personal-trails/${activePersonal.id}` as Href,
                      )
                    }
                    activeOpacity={0.85}
                  >
                    <Ionicons name="eye" size={18} color={Colors.onPrimary} />
                    <Text style={styles.primaryCtaText}>
                      Xem Chi Tiết Cung Đường
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryCta}
                    onPress={() =>
                      router.push(
                        `/personal-trails/${activePersonal.id}/edit` as Href,
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="create-outline"
                      size={18}
                      color={Colors.onSurface}
                    />
                    <Text style={styles.secondaryCtaText}>Chỉnh Sửa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.emptyPersonalCard}>
                <Ionicons
                  name="trail-sign-outline"
                  size={48}
                  color={Colors.onSurfaceMuted}
                />
                <Text style={styles.emptyPersonalTitle}>
                  Chưa có cung đường cá nhân
                </Text>
                <Text style={styles.emptyPersonalDesc}>
                  {
                    'Hãy bấm vào nút "BẮT ĐẦU GHI" ở trên để ghi lại hành trình trekking thực tế của bạn bằng GPS!'
                  }
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 5. DANH SÁCH CÁC CUNG ĐƯỜNG KHÁC */}
        <View style={styles.otherTrailsSection}>
          <Text style={styles.otherTrailsTitle}>
            {activeTab === "SYSTEM"
              ? `Các Cung Đường Khác (${filteredTrails.length})`
              : `Danh Sách Cung Đường Của Bạn (${filteredPersonalTrails.length})`}
          </Text>

          <View style={styles.otherTrailsList}>
            {activeTab === "SYSTEM"
              ? filteredTrails.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.otherTrailItem,
                      selectedTrail.id === t.id &&
                        styles.otherTrailItemSelected,
                    ]}
                    onPress={() => setSelectedTrail(t)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: t.imageUrl }}
                      style={styles.otherTrailThumb}
                    />
                    <View style={styles.otherTrailInfo}>
                      <Text style={styles.otherTrailName}>{t.name}</Text>
                      <Text style={styles.otherTrailRegion}>{t.region}</Text>
                      <View style={styles.otherTrailMetaRow}>
                        <Text style={styles.otherTrailMeta}>
                          {t.distanceKm} km
                        </Text>
                        <Text style={styles.otherTrailMeta}>•</Text>
                        <Text style={styles.otherTrailMeta}>
                          +{t.elevationGainM}m
                        </Text>
                        <Text style={styles.otherTrailMeta}>•</Text>
                        <Text style={styles.otherTrailDifficulty}>
                          {t.difficulty}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.trailStatusCol}>
                      <Text style={styles.trailPrice}>
                        {t.isUnlocked ? "Đã mở" : `${t.price / 1000}k`}
                      </Text>
                      <Ionicons
                        name={
                          selectedTrail.id === t.id
                            ? "chevron-down"
                            : "chevron-forward"
                        }
                        size={16}
                        color={Colors.onSurfaceVariant}
                      />
                    </View>
                  </TouchableOpacity>
                ))
              : filteredPersonalTrails.map((pt) => (
                  <TouchableOpacity
                    key={pt.id}
                    style={[
                      styles.otherTrailItem,
                      selectedPersonalTrail?.id === pt.id &&
                        styles.otherTrailItemSelected,
                    ]}
                    onPress={() => setSelectedPersonalTrail(pt)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.personalTrailThumbBg}>
                      <Ionicons
                        name="trail-sign"
                        size={24}
                        color={Colors.primaryDark}
                      />
                    </View>
                    <View style={styles.otherTrailInfo}>
                      <Text style={styles.otherTrailName}>{pt.name}</Text>
                      <Text style={styles.otherTrailRegion}>{pt.region}</Text>
                      <View style={styles.otherTrailMetaRow}>
                        <Text style={styles.otherTrailMeta}>
                          {pt.distanceKm} km
                        </Text>
                        <Text style={styles.otherTrailMeta}>•</Text>
                        <Text style={styles.otherTrailMeta}>
                          +{pt.elevationGainM}m
                        </Text>
                        <Text style={styles.otherTrailMeta}>•</Text>
                        <Text style={styles.otherTrailDifficulty}>
                          {pt.difficulty}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.trailStatusCol}>
                      <Text
                        style={[
                          styles.trailPrice,
                          {
                            color:
                              pt.verificationStatus === "VERIFIED"
                                ? "#38ef7d"
                                : pt.verificationStatus === "PENDING"
                                  ? "#fed018"
                                  : Colors.onSurfaceMuted,
                          },
                        ]}
                      >
                        {pt.verificationStatus === "VERIFIED"
                          ? "Đã duyệt"
                          : pt.verificationStatus === "PENDING"
                            ? "Chờ duyệt"
                            : "Bản nháp"}
                      </Text>
                      <Ionicons
                        name={
                          selectedPersonalTrail?.id === pt.id
                            ? "chevron-down"
                            : "chevron-forward"
                        }
                        size={16}
                        color={Colors.onSurfaceVariant}
                      />
                    </View>
                  </TouchableOpacity>
                ))}
          </View>
        </View>
      </ScrollView>

      {/* MODAL GHI CUNG ĐƯỜNG TrekGo STYLE */}
      <LiveTrailRecorderModal
        visible={isRecordingModalVisible}
        onClose={() => setIsRecordingModalVisible(false)}
        onSaved={(newId, newTrail) => {
          setActiveTab("PERSONAL");
          if (newTrail) {
            setSelectedPersonalTrail(newTrail);
          } else {
            const created = personalTrails.find((t) => t.id === newId);
            if (created) setSelectedPersonalTrail(created);
          }
          refreshPersonalTrails().catch(console.warn);
        }}
      />

      <CreatePrivateTripModal
        visible={createPrivateModalVisible}
        onClose={() => setCreatePrivateModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  tabSwitcherContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.full,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: Radius.full,
  },
  tabButtonActive: {
    backgroundColor: Colors.primaryContainer,
    ...Shadows.card,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.onSurfaceVariant,
  },
  tabButtonTextActive: {
    color: Colors.onPrimaryContainer,
    fontWeight: "900",
  },
  liveRecordBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: Radius.xl,
    backgroundColor: "#111b10",
    borderWidth: 1,
    borderColor: "rgba(56, 239, 125, 0.25)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    ...Shadows.card,
  },
  liveRecordInfo: {
    flex: 1,
  },
  liveRecordTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#38ef7d",
  },
  liveRecordTagText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#38ef7d",
    letterSpacing: 0.6,
  },
  liveRecordTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#ffffff",
  },
  liveRecordDesc: {
    fontSize: 10,
    color: "#a4b39e",
    marginTop: 2,
    lineHeight: 14,
  },
  liveRecordActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.full,
    ...Shadows.hover,
  },
  liveRecordActionText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0c2000",
  },
  searchSection: {
    marginTop: 12,
    paddingHorizontal: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.onSurface,
  },
  filterIconButton: {
    padding: 6,
  },
  filterPillsRow: {
    paddingTop: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
  },
  filterPillActive: {
    backgroundColor: Colors.primaryDark,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.onSurfaceVariant,
  },
  filterPillTextActive: {
    color: "#ffffff",
  },
  mainTrailCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
    ...Shadows.card,
  },
  personalSection: {
    marginTop: 0,
  },
  personalHeroCard: {
    padding: 16,
    backgroundColor: "#141e13",
  },
  personalBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  verificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  badgeVerified: {
    backgroundColor: "#1b4d24",
  },
  badgePending: {
    backgroundColor: "#6a5300",
  },
  badgeDraft: {
    backgroundColor: "#3a3d38",
  },
  verificationBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
  },
  personalDateText: {
    fontSize: 10,
    color: "#9fe870",
    fontWeight: "600",
  },
  personalTitleText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#ffffff",
  },
  personalRegionText: {
    fontSize: 12,
    color: "#c2d4bc",
    marginTop: 3,
  },
  emptyPersonalCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 30,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
  },
  emptyPersonalTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: Colors.onSurface,
  },
  emptyPersonalDesc: {
    fontSize: 12,
    color: Colors.onSurfaceMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  personalTrailThumbBg: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  trailHeroWrapper: {
    height: 220,
    position: "relative",
  },
  trailHeroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  offlineGpsBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(20, 25, 18, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  offlineGpsText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
  },
  ratingBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(20, 25, 18, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffffff",
  },
  heroInfoBottom: {
    position: "absolute",
    bottom: 12,
    left: 14,
    right: 14,
  },
  categoryTagsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  categoryTag: {
    backgroundColor: "rgba(20, 25, 18, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  categoryTagText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#ffffff",
  },
  trailTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#ffffff",
  },
  trailSubtitle: {
    fontSize: 11,
    color: "#e4e2dd",
    marginTop: 2,
  },
  bentoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    gap: 8,
  },
  bentoTile: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surfaceContainerLow,
    padding: 10,
    borderRadius: Radius.lg,
  },
  bentoIconBg: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: "center",
    justifyContent: "center",
  },
  bentoLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: Colors.onSurfaceMuted,
  },
  bentoValue: {
    fontSize: 12,
    fontWeight: "900",
    color: Colors.onSurface,
    marginTop: 1,
  },
  mapSectionCard: {
    margin: 12,
    marginTop: 4,
    borderRadius: Radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
    backgroundColor: "#081008",
  },
  mapHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#0d150c",
  },
  mapHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffffff",
  },
  contourBadge: {
    backgroundColor: "rgba(56, 239, 125, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  contourText: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.primary,
  },
  descSection: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  descTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: Colors.onSurface,
  },
  descBody: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    lineHeight: 16,
    marginTop: 4,
  },
  ctaRow: {
    flexDirection: "row",
    gap: 8,
    padding: 14,
  },
  primaryCta: {
    flex: 1.5,
    height: 46,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    ...Shadows.hover,
  },
  primaryCtaText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#ffffff",
  },
  secondaryCta: {
    flex: 1,
    height: 46,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secondaryCtaText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  unlockCta: {
    flex: 1,
    height: 46,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...Shadows.hover,
  },
  unlockCtaText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#ffffff",
  },
  otherTrailsSection: {
    paddingHorizontal: 16,
    marginTop: 18,
  },
  otherTrailsTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: Colors.onSurface,
    marginBottom: 10,
  },
  otherTrailsList: {
    gap: 8,
  },
  otherTrailItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceContainerLowest,
    padding: 10,
    borderRadius: Radius.lg,
    gap: 12,
    borderWidth: 1,
    borderColor: "transparent",
    ...Shadows.card,
  },
  otherTrailItemSelected: {
    borderColor: Colors.primaryDark,
    backgroundColor: Colors.primaryPale,
  },
  otherTrailThumb: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
  },
  otherTrailInfo: {
    flex: 1,
  },
  otherTrailName: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  otherTrailRegion: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  otherTrailMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  otherTrailMeta: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  otherTrailDifficulty: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.primaryDark,
  },
  trailStatusCol: {
    alignItems: "flex-end",
    gap: 4,
  },
  trailPrice: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.onSurface,
  },
});
