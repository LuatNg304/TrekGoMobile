import { Colors, Radius, Shadows } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { usePrivateTripMembers } from "../hooks/usePrivateTripMembers";
import { useRemoveTripMember } from "../hooks/useRemoveTripMember";
import type { TripMember } from "../types";
import { TripRoomMemberItem } from "./TripRoomMemberItem";

export interface TripRoomMemberListProps {
  tripId?: string;
  members?: TripMember[];
  canRemoveMembers?: boolean;
  onRemoveMember?: (member: TripMember) => void;
  onMemberRemoved?: (member: TripMember) => void;
}

export function TripRoomMemberList({
  tripId,
  members: propMembers,
  canRemoveMembers = false,
  onRemoveMember,
  onMemberRemoved,
}: TripRoomMemberListProps) {
  // If members not provided, fetch via hook
  const shouldFetch = !propMembers && Boolean(tripId);
  const {
    members: apiMembers,
    loading: loadingMembers,
    refetch,
  } = usePrivateTripMembers(tripId, {}, shouldFetch);

  const { removeMember, loading: removing } = useRemoveTripMember();

  const members = propMembers || apiMembers;
  const activeMembers = members.filter((m) => m.status === "ACTIVE");

  async function handleRemove(member: TripMember) {
    if (onRemoveMember) {
      onRemoveMember(member);
      return;
    }

    if (!tripId) return;

    Alert.alert(
      "Xác nhận loại thành viên",
      `Bạn có chắc chắn muốn loại "${member.displayName}" khỏi chuyến đi?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Loại khỏi đoàn",
          style: "destructive",
          onPress: async () => {
            try {
              await removeMember(tripId, member.id, member.version);
              onMemberRemoved?.(member);
              void refetch();
              Alert.alert(
                "Đã loại thành viên",
                `Đã xóa ${member.displayName} khỏi danh sách đoàn.`,
              );
            } catch (err: any) {
              if (err?.code === "MEMBERSHIP_VERSION_CONFLICT") {
                Alert.alert(
                  "Xung đột phiên bản",
                  "Dữ liệu thành viên vừa thay đổi trên máy chủ. Đang tải lại danh sách...",
                  [{ text: "Tải lại", onPress: () => void refetch() }],
                );
              } else {
                Alert.alert(
                  "Lỗi",
                  err?.message || "Không thể loại thành viên này.",
                );
              }
            }
          },
        },
      ],
    );
  }

  if (loadingMembers) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color={Colors.primaryDark} />
        <Text style={styles.loadingText}>Đang tải danh sách thành viên...</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconBox}>
          <Ionicons name="people" size={18} color={Colors.primaryDark} />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.title}>Danh sách thành viên</Text>
          <Text style={styles.subtitle}>
            {activeMembers.length} thành viên đang trong đoàn
          </Text>
        </View>
      </View>

      <View style={styles.list}>
        {activeMembers.map((member) => (
          <TripRoomMemberItem
            key={member.id}
            member={member}
            canRemove={canRemoveMembers && !removing}
            onRemove={handleRemove}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
    ...Shadows.card,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  list: {
    marginTop: 4,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: "center",
    marginTop: 6,
  },
});
