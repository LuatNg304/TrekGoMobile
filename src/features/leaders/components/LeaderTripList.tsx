import { Colors, Radius, Shadows } from "@/constants/theme";
import type { LeaderPublicTrip } from "@/features/leaders/hooks";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface LeaderTripListProps {
  trips: LeaderPublicTrip[];
}

function formatTripDates(startAt?: string, endAt?: string) {
  if (!startAt) return "Lịch chưa cập nhật";
  try {
    const s = new Date(startAt);
    const e = endAt ? new Date(endAt) : null;
    const startStr = `${s.getDate().toString().padStart(2, "0")}/${(s.getMonth() + 1).toString().padStart(2, "0")}`;
    if (!e) return startStr;
    const endStr = `${e.getDate().toString().padStart(2, "0")}/${(e.getMonth() + 1).toString().padStart(2, "0")}.${e.getFullYear()}`;
    return `${startStr} - ${endStr}`;
  } catch {
    return "Lịch chưa cập nhật";
  }
}

export function LeaderTripList({ trips }: LeaderTripListProps) {
  const router = useRouter();
  if (trips.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>DANH SÁCH CHUYẾN ĐI CỦA BẠN</Text>
        <Text style={styles.memberCount}>{trips.length} CHUYẾN</Text>
      </View>

      {trips.map((trip) => {
        const tripCode = `#TG-${trip.id.slice(0, 4).toUpperCase()}-VN`;
        const isOpen = trip.status === "OPEN";
        const isDraft = trip.status === "DRAFT";
        return (
          <TouchableOpacity
            key={trip.id}
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => {
              if (isDraft) {
                router.push({
                  pathname: "/field-operations/leader-create-trip",
                  params: { id: trip.id },
                } as any);
              } else {
                router.push(`/trips/${trip.id}` as any);
              }
            }}
          >
            <View style={styles.cardTop}>
              <Text style={styles.tripId}>{tripCode}</Text>
              <View style={styles.statusRow}>
                <Text
                  style={[
                    styles.tripStatus,
                    { color: isOpen ? Colors.primaryDark : "#9b6700" },
                  ]}
                >
                  {trip.status}
                </Text>
                {isDraft && (
                  <View style={styles.editBadge}>
                    <Ionicons name="pencil" size={11} color="#125238" />
                    <Text style={styles.editBadgeText}>Sửa / Tiếp tục</Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={styles.tripTitle}>{trip.title}</Text>

            <Text style={styles.meta}>
              <Ionicons name="calendar-outline" size={13} />{" "}
              {formatTripDates(trip.startAt, trip.endAt)}
            </Text>

            <Text style={styles.meta}>
              <Ionicons name="people-outline" size={13} /> Sức chứa: {trip.capacity} chỗ ·{" "}
              {Number(trip.pricePerPax).toLocaleString("vi-VN")} đ/suất
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    color: Colors.onSurfaceMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  memberCount: {
    color: Colors.primaryDark,
    fontSize: 11,
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 12,
    ...Shadows.card,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tripId: {
    color: Colors.onSurfaceMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  tripStatus: {
    fontSize: 11,
    fontWeight: "800",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  editBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#b1f0cd",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  editBadgeText: {
    color: "#002113",
    fontSize: 10,
    fontWeight: "800",
  },
  tripTitle: {
    color: Colors.ink,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 6,
    marginBottom: 8,
  },
  meta: {
    color: Colors.onSurfaceMuted,
    fontSize: 12,
    marginTop: 3,
  },
});
