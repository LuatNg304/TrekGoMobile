import { Colors, Radius } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PrivateTripCard } from "../components/PrivateTripCard";
import { useMyPrivateTrips } from "../hooks/useMyPrivateTrips";
import type { PrivateTrip } from "../types";

type TabKey = "UPCOMING" | "COMPLETED" | "CANCELLED";

export function MyPrivateTripsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("UPCOMING");

  const { trips, loading, error, refetch } = useMyPrivateTrips(true);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  // Filter trips by active tab
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      if (activeTab === "UPCOMING") {
        return trip.status === "OPEN" || trip.status === "IN_PROGRESS";
      }
      if (activeTab === "COMPLETED") {
        return trip.status === "COMPLETED";
      }
      if (activeTab === "CANCELLED") {
        return trip.status === "CANCELLED";
      }
      return false;
    });
  }, [trips, activeTab]);

  function handleCreateTrip() {
    router.push("/private-trips/create" as any);
  }

  function handleTripPress(trip: PrivateTrip) {
    router.push({
      pathname: "/private-trips/[id]",
      params: { id: trip.id },
    } as any);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Chuyến đi riêng của tôi</Text>

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateTrip}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Tạo chuyến</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "UPCOMING" && styles.tabItemActive]}
          onPress={() => setActiveTab("UPCOMING")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "UPCOMING" && styles.tabTextActive,
            ]}
          >
            Sắp tới
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "COMPLETED" && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab("COMPLETED")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "COMPLETED" && styles.tabTextActive,
            ]}
          >
            Đã hoàn thành
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "CANCELLED" && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab("CANCELLED")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "CANCELLED" && styles.tabTextActive,
            ]}
          >
            Đã hủy
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primaryDark} />
          <Text style={styles.loadingText}>Đang tải danh sách chuyến đi...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={40} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PrivateTripCard
              trip={item}
              currentPax={1}
              onPress={() => handleTripPress(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primaryDark]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="trail-sign-outline"
                size={44}
                color={Colors.mute}
              />
              <Text style={styles.emptyTitle}>Chưa có chuyến đi nào</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === "UPCOMING"
                  ? "Bạn chưa có chuyến đi riêng nào sắp tới. Hãy bấm tạo chuyến để lên kế hoạch cùng bạn bè!"
                  : activeTab === "COMPLETED"
                  ? "Bạn chưa có chuyến đi riêng nào hoàn thành."
                  : "Không có chuyến đi riêng nào bị hủy."}
              </Text>
              {activeTab === "UPCOMING" && (
                <TouchableOpacity
                  style={styles.primaryCta}
                  onPress={handleCreateTrip}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryCtaText}>Tạo chuyến đi mới</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  headerBar: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
  },
  createButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerLow,
    backgroundColor: Colors.surface,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceContainerLow,
  },
  tabItemActive: {
    backgroundColor: Colors.primaryDark,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    padding: 16,
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
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  errorText: {
    fontSize: 14,
    color: "#DC2626",
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: "center",
    lineHeight: 18,
  },
  primaryCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
    marginTop: 8,
  },
  primaryCtaText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
