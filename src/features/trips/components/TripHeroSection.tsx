import { Colors, Radius, Shadows } from "@/constants/theme";
import type { PublicTrip } from "@/features/trips/services/public-trips.api";
import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

export interface TripHeroSectionProps {
  trip: PublicTrip;
}

export const TripHeroSection = memo(function TripHeroSection({
  trip,
}: TripHeroSectionProps) {
  const startDate = new Date(trip.startAt);
  const endDate = new Date(trip.endAt);
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const totalDistanceKm = trip.routes.reduce(
    (sum, r) => sum + parseFloat(r.snapshotDistanceKm || "0"),
    0,
  );

  return (
    <View style={styles.heroCard}>
      {/* Status + Difficulty pills */}
      <View style={styles.heroBadgeRow}>
        <View
          style={[
            styles.statusBadge,
            trip.status === "OPEN" ? styles.statusOpen : styles.statusFull,
          ]}
        >
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            {trip.status === "OPEN" ? "Đang mở đặt chỗ" : "Đã đầy"}
          </Text>
        </View>
        {trip.routes[0] && (
          <View style={styles.difficultyBadge}>
            <Text style={styles.difficultyText}>
              {trip.routes[0].snapshotDifficulty}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.tripTitle}>{trip.title}</Text>
      <Text style={styles.destinationText}>📍 {trip.destination.name}</Text>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statTile}>
          <Ionicons name="calendar-outline" size={16} color={Colors.primaryDark} />
          <Text style={styles.statLabel}>NGÀY ĐI</Text>
          <Text style={styles.statValue}>
            {startDate.toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
            })}
          </Text>
        </View>
        <View style={styles.statTile}>
          <Ionicons name="time-outline" size={16} color={Colors.primaryDark} />
          <Text style={styles.statLabel}>THỜI GIAN</Text>
          <Text style={styles.statValue}>
            {diffDays}N{Math.max(0, diffDays - 1)}Đ
          </Text>
        </View>
        <View style={styles.statTile}>
          <Ionicons name="people-outline" size={16} color={Colors.primaryDark} />
          <Text style={styles.statLabel}>CHỖ CÒN</Text>
          <Text style={styles.statValue}>
            {trip.remainingSlots}/{trip.capacity}
          </Text>
        </View>
        <View style={styles.statTile}>
          <Ionicons name="git-commit-outline" size={16} color={Colors.primaryDark} />
          <Text style={styles.statLabel}>KHOẢNG CÁCH</Text>
          <Text style={styles.statValue}>{totalDistanceKm.toFixed(1)}km</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: 16,
    ...Shadows.hover,
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusOpen: { backgroundColor: Colors.secondaryContainer },
  statusFull: { backgroundColor: Colors.surfaceContainerHigh },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primaryDark,
  },
  statusText: { fontSize: 10, fontWeight: "800", color: Colors.primaryDark },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.tertiaryContainer,
  },
  difficultyText: { fontSize: 10, fontWeight: "800", color: Colors.onTertiaryContainer },
  tripTitle: { fontSize: 20, fontWeight: "900", color: Colors.onSurface, marginBottom: 4 },
  destinationText: { fontSize: 13, color: Colors.onSurfaceVariant, marginBottom: 14 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statTile: {
    flex: 1,
    minWidth: "22%",
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: 10,
    alignItems: "center",
    gap: 3,
  },
  statLabel: { fontSize: 8, fontWeight: "800", color: Colors.mute, letterSpacing: 0.3 },
  statValue: { fontSize: 13, fontWeight: "900", color: Colors.onSurface },
});
