import { Colors, Radius, Shadows } from "@/constants/theme";
import type { PublicTrip } from "@/features/trips/services/public-trips.api";
import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface TripCardProps {
  trip: PublicTrip;
  onPress: () => void;
}

export const TripCard = memo(function TripCard({ trip, onPress }: TripCardProps) {
  const startDate = new Date(trip.startAt);
  const endDate = new Date(trip.endAt);
  const diffDays = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const slotPercent = trip.capacity > 0 ? trip.remainingSlots / trip.capacity : 0;
  const isAlmostFull = slotPercent < 0.3;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.87}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={styles.destinationPill}>
          <Ionicons name="location" size={11} color={Colors.primaryDark} />
          <Text style={styles.destinationText}>{trip.destination.name}</Text>
        </View>

        {isAlmostFull && (
          <View style={styles.almostFullBadge}>
            <Text style={styles.almostFullText}>GẦN ĐẦY</Text>
          </View>
        )}
      </View>

      {/* Trip Title */}
      <Text style={styles.cardTitle} numberOfLines={2}>
        {trip.title}
      </Text>

      {/* Meta row */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={Colors.mute} />
          <Text style={styles.metaText}>
            {startDate.toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
            })}{" "}
            · {diffDays}N{Math.max(0, diffDays - 1)}Đ
          </Text>
        </View>
        {trip.routes[0] && (
          <View style={styles.metaItem}>
            <Ionicons name="trending-up" size={13} color={Colors.mute} />
            <Text style={styles.metaText}>{trip.routes[0].snapshotDifficulty}</Text>
          </View>
        )}
      </View>

      {/* Leader row */}
      <View style={styles.leaderRow}>
        <View style={styles.leaderAvatarSmall}>
          <Text style={styles.leaderAvatarLetter}>
            {trip.leader.fullName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.leaderName}>{trip.leader.fullName}</Text>
        <Ionicons name="shield-checkmark" size={12} color={Colors.primaryDark} />
      </View>

      {/* Pickup */}
      <View style={styles.pickupBanner}>
        <Ionicons name="bus-outline" size={12} color={Colors.onSurfaceVariant} />
        <Text style={styles.pickupText} numberOfLines={1}>
          {trip.pickup.name}
          {trip.pickup.address ? ` · ${trip.pickup.address}` : ""}
        </Text>
      </View>

      {/* Footer: price + slots */}
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.priceLabel}>Giá vé / người</Text>
          <Text style={styles.priceValue}>
            {parseFloat(trip.pricePerPax).toLocaleString("vi-VN")}
            <Text style={styles.priceCurrency}> {trip.currency}</Text>
          </Text>
        </View>

        <View style={styles.slotsInfo}>
          <View style={styles.slotBarOuter}>
            <View
              style={[
                styles.slotBarInner,
                {
                  width: `${Math.round(slotPercent * 100)}%`,
                  backgroundColor: isAlmostFull ? Colors.warning : Colors.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.slotText}>
            {trip.remainingSlots}/{trip.capacity} chỗ còn
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: 16,
    gap: 8,
    ...Shadows.hover,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  destinationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryContainer,
  },
  destinationText: { fontSize: 10, fontWeight: "800", color: Colors.primaryDark },
  almostFullBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.errorContainer,
  },
  almostFullText: { fontSize: 9, fontWeight: "900", color: Colors.onErrorContainer },
  cardTitle: { fontSize: 16, fontWeight: "900", color: Colors.onSurface, lineHeight: 22 },
  metaRow: { flexDirection: "row", gap: 14 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, color: Colors.mute },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 2,
  },
  leaderAvatarSmall: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  leaderAvatarLetter: { fontSize: 9, fontWeight: "900", color: Colors.primaryDark },
  leaderName: { flex: 1, fontSize: 11, fontWeight: "700", color: Colors.onSurfaceVariant },
  pickupBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.md,
  },
  pickupText: { flex: 1, fontSize: 10, color: Colors.onSurfaceVariant },
  cardFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  priceLabel: { fontSize: 9, color: Colors.mute, fontWeight: "700" },
  priceValue: { fontSize: 18, fontWeight: "900", color: Colors.onSurface },
  priceCurrency: { fontSize: 11, fontWeight: "700", color: Colors.mute },
  slotsInfo: { alignItems: "flex-end", gap: 4 },
  slotBarOuter: {
    width: 72,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceContainerHigh,
    overflow: "hidden",
  },
  slotBarInner: { height: "100%", borderRadius: 2 },
  slotText: { fontSize: 9, color: Colors.mute, fontWeight: "700" },
});
