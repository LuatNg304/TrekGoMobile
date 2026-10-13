import { Colors, Radius, Shadows } from "@/constants/theme";
import type { LeaderPublicTrip } from "@/features/leaders/hooks";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

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
        return (
          <View key={trip.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.tripId}>{tripCode}</Text>
              <Text
                style={[
                  styles.tripStatus,
                  { color: isOpen ? Colors.primaryDark : "#9b6700" },
                ]}
              >
                {trip.status}
              </Text>
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
          </View>
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
