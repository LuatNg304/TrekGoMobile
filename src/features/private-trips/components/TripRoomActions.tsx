import { Colors, Radius } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { TripRoomPermissions } from "../types";

export interface TripRoomActionsProps {
  tripId?: string;
  expectedMemberVersion?: number;
  isHost: boolean;
  permissions?: TripRoomPermissions;
  leaving?: boolean;
  onInvite: () => void;
  onLeave?: () => void;
  onLeaveSuccess?: () => void;
}

export function TripRoomActions({
  isHost,
  permissions,
  leaving = false,
  onInvite,
  onLeave,
}: TripRoomActionsProps) {
  const canInvite = Boolean(isHost && permissions?.canInvite);
  const canLeave = Boolean(!isHost && permissions?.canLeave);

  return (
    <View style={styles.container}>
      {/* Host actions */}
      {canInvite ? (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => onInvite?.()}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Mời thêm bạn bè</Text>
        </TouchableOpacity>
      ) : null}

      {/* Member actions */}
      {canLeave ? (
        <TouchableOpacity
          style={[styles.dangerButton, leaving && styles.disabledButton]}
          onPress={() => onLeave?.()}
          disabled={leaving}
          activeOpacity={0.8}
        >
          {leaving ? (
            <ActivityIndicator size="small" color="#DC2626" />
          ) : (
            <View style={styles.buttonInner}>
              <Ionicons name="exit-outline" size={18} color="#DC2626" />
              <Text style={styles.dangerButtonText}>Rời khỏi chuyến đi</Text>
            </View>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.full,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#DC2626",
  },
});
