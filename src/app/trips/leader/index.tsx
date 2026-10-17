import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Radius, Shadows } from "@/constants/theme";
import {
  cf01PublicTripApi,
  LeaderTrip,
  parseCf01Error,
} from "@/services/api/cf01PublicTripApi";

type FilterStatus = "ALL" | "DRAFT" | "OPEN" | "CANCEL_PENDING" | "CLOSED";

export default function LeaderTripsScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<LeaderTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("ALL");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLeaderTrips = useCallback(async () => {
    try {
      setErrorMsg(null);
      const data = await cf01PublicTripApi.getLeaderTrips(1, 50);
      setTrips(Array.isArray(data) ? data : []);
    } catch (err) {
      const parsed = parseCf01Error(err);
      setErrorMsg(parsed.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeaderTrips();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchLeaderTrips]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderTrips();
  };

  const filteredTrips = trips.filter((t) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "DRAFT") return t.status === "DRAFT";
    if (activeFilter === "OPEN") return t.status === "OPEN";
    if (activeFilter === "CANCEL_PENDING") return t.status === "CANCEL_PENDING";
    if (activeFilter === "CLOSED")
      return (
        t.status === "FULL" ||
        t.status === "COMPLETED" ||
        t.status === "CANCELLED"
      );
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return {
          label: "BẢN NHÁP",
          bg: "#fef3c7",
          text: "#b45309",
          icon: "create-outline" as const,
        };
      case "OPEN":
        return {
          label: "ĐANG MỞ BÁN",
          bg: "#dcfce7",
          text: "#15803d",
          icon: "checkmark-circle" as const,
        };
      case "CANCEL_PENDING":
        return {
          label: "CHỜ DUYỆT HỦY",
          bg: "#fee2e2",
          text: "#b91c1c",
          icon: "alert-circle" as const,
        };
      case "FULL":
        return {
          label: "ĐÃ HẾT CHỖ",
          bg: "#e2e8f0",
          text: "#475569",
          icon: "people" as const,
        };
      case "CANCELLED":
        return {
          label: "ĐÃ HỦY",
          bg: "#f1f5f9",
          text: "#94a3b8",
          icon: "close-circle" as const,
        };
      default:
        return {
          label: status,
          bg: "#f3f4f6",
          text: "#374151",
          icon: "information-circle-outline" as const,
        };
    }
  };

  const formatPrice = (val?: string | null) => {
    if (!val) return "Chưa đặt giá";
    const num = parseInt(val, 10);
    if (isNaN(num)) return val;
    return `${num.toLocaleString("vi-VN")} đ`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)/trips" as Href);
          }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Quản lý chuyến đi Leader</Text>
          <Text style={styles.headerSub}>Public Trip (CF01)</Text>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push("/trips/leader/create" as Href)}
        >
          <Ionicons name="add" size={20} color={Colors.onPrimary} />
          <Text style={styles.createBtnText}>Tạo mới</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.chip, activeFilter === "ALL" && styles.chipActive]}
          onPress={() => setActiveFilter("ALL")}
        >
          <Text
            style={[
              styles.chipText,
              activeFilter === "ALL" && styles.chipTextActive,
            ]}
          >
            Tất cả ({trips.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, activeFilter === "DRAFT" && styles.chipActive]}
          onPress={() => setActiveFilter("DRAFT")}
        >
          <Text
            style={[
              styles.chipText,
              activeFilter === "DRAFT" && styles.chipTextActive,
            ]}
          >
            Nháp ({trips.filter((t) => t.status === "DRAFT").length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, activeFilter === "OPEN" && styles.chipActive]}
          onPress={() => setActiveFilter("OPEN")}
        >
          <Text
            style={[
              styles.chipText,
              activeFilter === "OPEN" && styles.chipTextActive,
            ]}
          >
            Mở bán ({trips.filter((t) => t.status === "OPEN").length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.chip,
            activeFilter === "CANCEL_PENDING" && styles.chipActive,
          ]}
          onPress={() => setActiveFilter("CANCEL_PENDING")}
        >
          <Text
            style={[
              styles.chipText,
              activeFilter === "CANCEL_PENDING" && styles.chipTextActive,
            ]}
          >
            Chờ hủy (
            {trips.filter((t) => t.status === "CANCEL_PENDING").length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách chuyến đi...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchLeaderTrips}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="trail-sign-outline"
                size={56}
                color={Colors.onSurfaceMuted}
              />
              <Text style={styles.emptyTitle}>Chưa có chuyến đi nào</Text>
              <Text style={styles.emptySub}>
                Bấm nút &quot;Tạo mới&quot; ở góc trên để tạo bản nháp chuyến đi công khai
                cho Leader.
              </Text>
              <TouchableOpacity
                style={styles.emptyCreateBtn}
                onPress={() => router.push("/trips/leader/create" as Href)}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.emptyCreateBtnText}>Tạo chuyến đi đầu tiên</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const badge = getStatusBadge(item.status);
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.88}
                onPress={() =>
                  router.push({
                    pathname: "/trips/leader/[id]",
                    params: { id: item.id },
                  } as unknown as Href)
                }
              >
                {/* Card Top: Version + Status */}
                <View style={styles.cardHeader}>
                  <View style={styles.versionPill}>
                    <Text style={styles.versionText}>v{item.version}</Text>
                  </View>
                  <View
                    style={[styles.statusBadge, { backgroundColor: badge.bg }]}
                  >
                    <Ionicons
                      name={badge.icon}
                      size={13}
                      color={badge.text}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[styles.statusBadgeText, { color: badge.text }]}
                    >
                      {badge.label}
                    </Text>
                  </View>
                </View>

                {/* Card Title */}
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.description ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                {/* Card Meta details */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={15}
                      color={Colors.primaryDark}
                    />
                    <Text style={styles.metaText}>
                      {formatDate(item.startAt)}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="people-outline"
                      size={15}
                      color={Colors.primaryDark}
                    />
                    <Text style={styles.metaText}>{item.capacity} chỗ</Text>
                  </View>
                </View>

                {/* Price & Checkpoints / Trails summary */}
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.priceLabel}>Giá / khách</Text>
                    <Text style={styles.priceValue}>{formatPrice(item.price)}</Text>
                  </View>
                  <View style={styles.routeSummary}>
                    <View style={styles.countTag}>
                      <Ionicons
                        name="flag-outline"
                        size={12}
                        color={Colors.onSurface}
                      />
                      <Text style={styles.countTagText}>
                        {item.checkpoints?.length || 0} mốc
                      </Text>
                    </View>
                    <View style={styles.countTag}>
                      <Ionicons
                        name="map-outline"
                        size={12}
                        color={Colors.onSurface}
                      />
                      <Text style={styles.countTagText}>
                        {item.trails?.length || 0} chặng
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Action buttons inside card */}
                <View style={styles.cardActions}>
                  {item.status === "DRAFT" ? (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnOutline]}
                        onPress={() =>
                          router.push({
                            pathname: "/trips/leader/[id]/route",
                            params: { id: item.id },
                          } as unknown as Href)
                        }
                      >
                        <Ionicons
                          name="trail-sign"
                          size={15}
                          color={Colors.primaryDark}
                        />
                        <Text style={styles.actionBtnOutlineText}>
                          Lên lộ trình (Trails)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnPrimary]}
                        onPress={() =>
                          router.push({
                            pathname: "/trips/leader/[id]/publish",
                            params: { id: item.id },
                          } as unknown as Href)
                        }
                      >
                        <Ionicons
                          name="rocket-outline"
                          size={15}
                          color={Colors.onPrimary}
                        />
                        <Text style={styles.actionBtnPrimaryText}>
                          Kiểm tra & Publish
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : item.status === "OPEN" ? (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnOutline]}
                        onPress={() =>
                          router.push({
                            pathname: "/trips/[id]",
                            params: { id: item.id },
                          } as unknown as Href)
                        }
                      >
                        <Ionicons
                          name="eye-outline"
                          size={15}
                          color={Colors.primaryDark}
                        />
                        <Text style={styles.actionBtnOutlineText}>
                          Xem trang công khai
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnDanger]}
                        onPress={() =>
                          router.push({
                            pathname: "/trips/leader/[id]",
                            params: { id: item.id, cancelModal: "1" },
                          } as unknown as Href)
                        }
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={15}
                          color="#b91c1c"
                        />
                        <Text style={styles.actionBtnDangerText}>Hủy chuyến</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnOutline, { flex: 1 }]}
                      onPress={() =>
                        router.push({
                          pathname: "/trips/leader/[id]",
                          params: { id: item.id },
                        } as unknown as Href)
                      }
                    >
                      <Ionicons
                        name="information-circle-outline"
                        size={15}
                        color={Colors.onSurface}
                      />
                      <Text style={styles.actionBtnOutlineText}>Xem chi tiết</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
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
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  headerSub: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    gap: 4,
    ...Shadows.level1,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onPrimary,
  },
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
    backgroundColor: Colors.surface,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.onSurfaceVariant,
  },
  chipTextActive: {
    color: Colors.onPrimary,
  },
  listContent: {
    padding: 16,
    gap: 14,
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
  errorText: {
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    marginTop: 8,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onPrimary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: "center",
    lineHeight: 18,
  },
  emptyCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.full,
    marginTop: 8,
  },
  emptyCreateBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.onPrimary,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.large,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: 10,
    ...Shadows.level1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  versionPill: {
    backgroundColor: Colors.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.small,
  },
  versionText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.onSurfaceVariant,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  cardDesc: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  priceLabel: {
    fontSize: 11,
    color: Colors.onSurfaceMuted,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.primaryDark,
  },
  routeSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.small,
  },
  countTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.onSurface,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: Radius.medium,
    gap: 6,
  },
  actionBtnOutline: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  actionBtnOutlineText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primaryDark,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.primary,
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.onPrimary,
  },
  actionBtnDanger: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  actionBtnDangerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#b91c1c",
  },
});
