import { Colors, Radius, Shadows } from "@/constants/theme";
import { TripCard } from "@/features/trips/components";
import { usePublicTrips } from "@/features/trips/hooks";
import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DIFFICULTY_FILTERS = ["Tất cả", "EASY", "MEDIUM", "HARD", "EXTREME"];
const DIFFICULTY_LABELS: Record<string, string> = {
  "Tất cả": "Tất cả",
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
  EXTREME: "Thách thức",
};

export function PublicTripsExploreScreen() {
  const router = useRouter();

  const {
    trips,
    loading,
    refreshing,
    loadingMore,
    error,
    refresh,
    loadMore,
    setDifficulty,
    filter,
  } = usePublicTrips();

  const [search, setSearch] = useState("");

  const currentDifficulty = filter.difficulty || "Tất cả";

  const filteredTrips = useMemo(() => {
    if (!search.trim()) return trips;
    const query = search.toLowerCase();
    return trips.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.destination.name.toLowerCase().includes(query),
    );
  }, [trips, search]);

  const handleTripPress = useCallback(
    (id: string) => {
      router.push({
        pathname: "/trips/[id]",
        params: { id },
      } as unknown as Href);
    },
    [router],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.topTitleBox}>
          <Text style={styles.topBarTitle}>Chuyến công khai</Text>
          <Text style={styles.topBarSub}>Khám phá & đặt chỗ theo đoàn</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={16}
            color={Colors.onSurfaceVariant}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm chuyến, địa danh..."
            placeholderTextColor={Colors.mute}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={Colors.mute} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Difficulty Filters */}
      <View style={styles.filterRow}>
        {DIFFICULTY_FILTERS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[
              styles.filterPill,
              currentDifficulty === d && styles.filterPillActive,
            ]}
            onPress={() => setDifficulty(d)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterPillText,
                currentDifficulty === d && styles.filterPillTextActive,
              ]}
            >
              {DIFFICULTY_LABELS[d]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Error Banner with Retry */}
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={Colors.error} />
          <Text style={styles.errorText} numberOfLines={2}>
            {error}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={refresh}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Trips List */}
      <FlatList
        data={filteredTrips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TripCard trip={item} onPress={() => handleTripPress(item.id)} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onRefresh={refresh}
        refreshing={refreshing}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={true}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.emptySub}>Đang tải danh sách chuyến...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="map-outline"
                  size={36}
                  color={Colors.primaryDark}
                />
              </View>
              <Text style={styles.emptyTitle}>Chưa có chuyến nào</Text>
              <Text style={styles.emptySub}>
                Kéo xuống để làm mới hoặc thử bộ lọc khác
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surface },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitleBox: { flex: 1 },
  topBarTitle: { fontSize: 20, fontWeight: "900", color: Colors.onSurface },
  topBarSub: { fontSize: 12, color: Colors.mute },
  searchSection: { paddingHorizontal: 16, paddingVertical: 8 },
  searchBar: {
    height: 46,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    ...Shadows.card,
  },
  searchInput: { flex: 1, fontSize: 13, color: Colors.onSurface },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  filterPillActive: { backgroundColor: Colors.ink },
  filterPillText: { fontSize: 11, fontWeight: "700", color: Colors.onSurfaceVariant },
  filterPillTextActive: { color: Colors.inverseOnSurface },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: Colors.errorContainer,
    borderRadius: Radius.md,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: { flex: 1, fontSize: 12, color: Colors.onErrorContainer },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.onErrorContainer,
  },
  retryBtnText: { fontSize: 11, fontWeight: "700", color: Colors.errorContainer },
  listContent: { paddingHorizontal: 16, paddingBottom: 30, gap: 12 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: Colors.onSurface },
  emptySub: { fontSize: 13, color: Colors.mute, textAlign: "center" },
  footerLoader: { paddingVertical: 20, alignItems: "center" },
});
