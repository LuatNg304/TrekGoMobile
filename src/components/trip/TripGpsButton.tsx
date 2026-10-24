import { Colors, Radius } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

interface TripGpsButtonProps {
  tripId: string;
  tripType: "PUBLIC" | "PRIVATE";
  tripTitle: string;
}

export function TripGpsButton({ tripId, tripType, tripTitle }: TripGpsButtonProps) {
  const router = useRouter();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={styles.button}
      activeOpacity={0.85}
      onPress={() => router.push({
        pathname: "/navigation",
        params: { tripId, tripType, tripTitle },
      })}
    >
      <Ionicons name="navigate-circle-outline" size={23} color="#FFFFFF" />
      <Text style={styles.label}>Vào chế độ GPS</Text>
      <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryDark,
  },
  label: { flex: 1, color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
