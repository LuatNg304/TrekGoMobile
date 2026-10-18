import { Colors, Radius } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { TripMember } from "../types";

export interface TripRoomMemberItemProps {
  member: TripMember;
  canRemove: boolean;
  onRemove?: (member: TripMember) => void;
}

export function TripRoomMemberItem({
  member,
  canRemove,
  onRemove,
}: TripRoomMemberItemProps) {
  const isHost = member.role === "HOST" || member.isHost;

  return (
    <View style={styles.container}>
      <View style={styles.avatarBox}>
        {member.avatarUrl ? (
          <Image source={{ uri: member.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {member.displayName?.charAt(0)?.toUpperCase() || "U"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {member.displayName}
          </Text>
          {isHost ? (
            <View style={styles.hostBadge}>
              <Ionicons name="star" size={10} color="#725C00" />
              <Text style={styles.hostBadgeText}>TRƯỞNG ĐOÀN</Text>
            </View>
          ) : (
            <View style={styles.memberBadge}>
              <Text style={styles.memberBadgeText}>THÀNH VIÊN</Text>
            </View>
          )}
        </View>

        <Text style={styles.joinedAt}>
          Tham gia:{" "}
          {new Date(member.joinedAt).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
          })}
        </Text>
      </View>

      {/* Host can remove members (except themselves) */}
      {canRemove && !isHost ? (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove?.(member)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={18} color="#DC2626" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerLow,
  },
  avatarBox: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.primaryDark,
  },
  content: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  hostBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: "#FEF3C7",
  },
  hostBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#725C00",
    letterSpacing: 0.3,
  },
  memberBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  memberBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.3,
  },
  joinedAt: {
    fontSize: 11,
    color: Colors.mute,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});
