import { Colors, Radius, Shadows } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { usePersonalTrails } from "../hooks/usePersonalTrails";
import { useSystemTrailAccesses } from "../hooks/useSystemTrailAccesses";
import type { CheckpointItem, PrivateTrailSource } from "../types";

export interface CreateTripTrailStepProps {
  trails?: PrivateTrailSource[];
  selectedTrailId?: string;
  loading?: boolean;
  onSelectTrail: (trail: PrivateTrailSource) => void;
}

export function CreateTripTrailStep({
  trails: propTrails,
  selectedTrailId,
  loading: propLoading,
  onSelectTrail,
}: CreateTripTrailStepProps) {
  // If trails are not passed from parent, use real API hooks
  const shouldFetch = !propTrails;
  const { personalTrails, loading: loadingPersonal } = usePersonalTrails(shouldFetch);
  const { trailAccesses, loading: loadingSystem } = useSystemTrailAccesses(shouldFetch);

  const trails = useMemo(() => {
    if (propTrails) return propTrails;

    const combined: PrivateTrailSource[] = [];

    // Map personal trails from API GET /me/personal-trails
    if (Array.isArray(personalTrails)) {
      personalTrails.forEach((item: any) => {
        const points: CheckpointItem[] = (
          item.personalCheckpointsViaPersonalTrailId || []
        ).map((cp: any) => ({
          id: cp.id,
          name: cp.name,
          sequence: cp.sequence,
          latitude: cp.latitude,
          longitude: cp.longitude,
        }));

        combined.push({
          id: item.id,
          type: "PERSONAL",
          name: item.title || item.name || "Cung đường cá nhân",
          destinationId: item.destinationId,
          points,
        });
      });
    }

    // Map system trail accesses from API GET /me/trail-accesses
    if (Array.isArray(trailAccesses)) {
      trailAccesses.forEach((item: any) => {
        const st = item.systemTrail;
        if (!st) return;

        const activePoints: CheckpointItem[] = (
          st.trailCheckpointsViaSystemTrailId || []
        )
          .filter((tcp: any) => tcp.checkpoint?.status === "ACTIVE")
          .map((tcp: any) => ({
            id: tcp.checkpoint.id,
            name: tcp.checkpoint.name,
            sequence: tcp.sequence,
            latitude: tcp.checkpoint.latitude,
            longitude: tcp.checkpoint.longitude,
          }));

        combined.push({
          id: st.id,
          type: "SYSTEM",
          name: st.name || "Cung đường hệ thống",
          destinationId: st.destinationId,
          points: activePoints,
        });
      });
    }

    return combined;
  }, [propTrails, personalTrails, trailAccesses]);

  const isLoading = propLoading ?? (loadingPersonal || loadingSystem);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryDark} />
        <Text style={styles.loadingText}>Đang tải danh sách tuyến đường...</Text>
      </View>
    );
  }

  if (trails.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="trail-sign-outline" size={40} color={Colors.mute} />
        <Text style={styles.emptyTitle}>Chưa có tuyến đường khả dụng</Text>
        <Text style={styles.emptySubtitle}>
          Bạn cần tạo Cung đường cá nhân hoặc mua quyền truy cập Cung đường hệ
          thống trước khi tạo Private Trip.
        </Text>
      </View>
    );
  }

  const selectedTrail = trails.find((t) => t.id === selectedTrailId);

  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>Bước 1: Chọn tuyến đường</Text>
      <Text style={styles.stepDescription}>
        Chọn cung đường cá nhân tự vẽ hoặc cung đường hệ thống đã mua quyền để làm
        lộ trình cho chuyến đi.
      </Text>

      <ScrollView style={styles.trailList} showsVerticalScrollIndicator={false}>
        {trails.map((trail) => {
          const isSelected = trail.id === selectedTrailId;
          const isPersonal = trail.type === "PERSONAL";

          return (
            <TouchableOpacity
              key={trail.id}
              style={[styles.trailCard, isSelected && styles.trailCardSelected]}
              onPress={() => onSelectTrail(trail)}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.typeBadge,
                    isPersonal ? styles.personalBadge : styles.systemBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBadgeText,
                      isPersonal
                        ? styles.personalBadgeText
                        : styles.systemBadgeText,
                    ]}
                  >
                    {isPersonal ? "CUNG ĐƯỜNG CÁ NHÂN" : "HỆ THỐNG"}
                  </Text>
                </View>

                {isSelected ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={Colors.primaryDark}
                  />
                ) : (
                  <Ionicons
                    name="ellipse-outline"
                    size={20}
                    color={Colors.mute}
                  />
                )}
              </View>

              <Text style={styles.trailName}>{trail.name}</Text>

              <View style={styles.checkpointsSummary}>
                <Ionicons
                  name="flag-outline"
                  size={14}
                  color={Colors.onSurfaceVariant}
                />
                <Text style={styles.checkpointsText}>
                  {trail.points.length} trạm dừng (checkpoints)
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Preview selected trail checkpoints */}
      {selectedTrail && selectedTrail.points.length > 0 ? (
        <View style={styles.checkpointsPreview}>
          <Text style={styles.previewTitle}>
            Các trạm dừng trên tuyến ({selectedTrail.points.length} trạm):
          </Text>
          <View style={styles.chipsRow}>
            {selectedTrail.points.map((cp) => (
              <View key={cp.id} style={styles.checkpointChip}>
                <Text style={styles.checkpointChipSequence}>#{cp.sequence}</Text>
                <Text style={styles.checkpointChipName}>{cp.name}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.onSurface,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: 14,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  emptyContainer: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: "center",
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.onSurface,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: "center",
    lineHeight: 18,
  },
  trailList: {
    maxHeight: 280,
    marginBottom: 12,
  },
  trailCard: {
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainer,
    marginBottom: 10,
    ...Shadows.card,
  },
  trailCardSelected: {
    borderColor: Colors.primaryDark,
    backgroundColor: "#F0FDF4",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  personalBadge: {
    backgroundColor: "#E0E7FF",
  },
  systemBadge: {
    backgroundColor: "#FEF3C7",
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  personalBadgeText: {
    color: "#3730A3",
  },
  systemBadgeText: {
    color: "#B45309",
  },
  trailName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.onSurface,
    marginBottom: 6,
  },
  checkpointsSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  checkpointsText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  checkpointsPreview: {
    padding: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    marginTop: 4,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.onSurface,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  checkpointChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  checkpointChipSequence: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.primaryDark,
  },
  checkpointChipName: {
    fontSize: 11,
    color: Colors.onSurface,
  },
});
