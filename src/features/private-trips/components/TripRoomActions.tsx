import { Colors, Radius } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLeavePrivateTrip } from "../hooks/useLeavePrivateTrip";
import type { TripRoomPermissions } from "../types";

export interface TripRoomActionsProps {
  tripId?: string;
  expectedMemberVersion?: number;
  isHost: boolean;
  permissions: TripRoomPermissions;
  onInvite: () => void;
  onLeave?: () => void;
  onLeaveSuccess?: () => void;
}

export function TripRoomActions({
  tripId,
  expectedMemberVersion,
  isHost,
  permissions,
  onInvite,
  onLeave,
  onLeaveSuccess,
}: TripRoomActionsProps) {
  const { leaveTrip, loading: leaving } = useLeavePrivateTrip();

  function handleLeave() {
    if (onLeave) {
      onLeave();
      return;
    }

    if (!tripId || expectedMemberVersion === undefined) return;

    Alert.alert(
      "Rời khỏi chuyến đi",
      "Bạn có chắc chắn muốn rời khỏi chuyến đi này? Bạn sẽ không còn quyền truy cập thông tin phòng chờ.",
      [
        { text: "Ở lại", style: "cancel" },
        {
          text: "Rời chuyến",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveTrip(tripId, expectedMemberVersion);
              Alert.alert("Đã rời chuyến", "Bạn đã rời khỏi đoàn thành công.");
              onLeaveSuccess?.();
            } catch (err: any) {
              if (err?.code === "MEMBERSHIP_VERSION_CONFLICT") {
                Alert.alert(
                  "Xung đột phiên bản",
                  "Trạng thái thành viên vừa thay đổi trên máy chủ.",
                );
              } else {
                Alert.alert("Lỗi", err?.message || "Không thể rời chuyến lúc này.");
              }
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      {/* Host actions */}
      {isHost && permissions.canInvite ? (
        <TouchableOpacity style={styles.primaryButton} onPress={onInvite}>
          <Ionicons name="person-add" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Mời thêm bạn bè</Text>
        </TouchableOpacity>
      ) : null}

      {/* Member actions */}
      {!isHost && permissions.canLeave ? (
        <TouchableOpacity
          style={[styles.dangerButton, leaving && styles.disabledButton]}
          onPress={handleLeave}
          disabled={leaving}
        >
          {leaving ? (
            <ActivityIndicator size="small" color="#DC2626" />
          ) : (
            <>
              <Ionicons name="exit-outline" size={18} color="#DC2626" />
              <Text style={styles.dangerButtonText}>Rời khỏi chuyến đi</Text>
            </>
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
  dangerButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#DC2626",
  },
});
