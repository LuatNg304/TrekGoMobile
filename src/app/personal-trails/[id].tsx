import { Ionicons } from "@expo/vector-icons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { TacticalMap } from "@/components/TacticalMap";
import { Colors, Radius, Shadows } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { PersonalTrailVerificationStatus } from "@/types";

const statusConfig: Record<
  PersonalTrailVerificationStatus,
  {
    label: string;
    description: string;
    background: string;
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  DRAFT: {
    label: "BẢN NHÁP RIÊNG TƯ",
    description: "Trail chỉ hiển thị với bạn và chưa được gửi xác minh.",
    background: Colors.surfaceContainer,
    color: Colors.onSurfaceVariant,
    icon: "create-outline",
  },
  PENDING: {
    label: "ĐANG CHỜ XÁC MINH",
    description:
      "Admin đang kiểm tra route, checkpoint và thông tin an toàn của Trail.",
    background: "#FFF7D6",
    color: "#7A5700",
    icon: "time-outline",
  },
  VERIFIED: {
    label: "ĐÃ XÁC MINH",
    description: "Trail đã được duyệt và có thể hiển thị công khai.",
    background: Colors.primaryPale,
    color: Colors.primaryDark,
    icon: "shield-checkmark-outline",
  },
  REJECTED: {
    label: "CẦN CHỈNH SỬA",
    description: "Admin đã gửi phản hồi. Hãy bổ sung thông tin rồi gửi lại.",
    background: "#FEE2E2",
    color: "#B91C1C",
    icon: "alert-circle-outline",
  },
};

export default function PersonalTrailDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const trailId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { personalTrails, submitPersonalTrail, deletePersonalTrail } = useApp();

  const trail = useMemo(
    () => personalTrails.find((current) => current.id === trailId),
    [personalTrails, trailId],
  );

  function submitForVerification() {
    if (!trail) {
      return;
    }

    Alert.alert(
      "Gửi Trail để xác minh?",
      "Trail sẽ chuyển sang trạng thái chờ Admin kiểm tra. Trong bản demo, trạng thái được lưu bằng mock state.",
      [
        {
          text: "Quay lại",
          style: "cancel",
        },
        {
          text: "Gửi xác minh",
          onPress: () => {
            submitPersonalTrail(trail.id);
            Alert.alert("Đã gửi thành công", "Trail đang chờ Admin xác minh.");
          },
        },
      ],
    );
  }

  function confirmDelete() {
    if (!trail) {
      return;
    }

    Alert.alert(
      "Xóa Personal Trail?",
      "Trail và toàn bộ checkpoint mock sẽ bị xóa khỏi phiên hiện tại.",
      [
        {
          text: "Giữ lại",
          style: "cancel",
        },
        {
          text: "Xóa Trail",
          style: "destructive",
          onPress: () => {
            deletePersonalTrail(trail.id);
            router.replace("/personal-trails" as Href);
          },
        },
      ],
    );
  }

  if (!trail) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={21} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết Personal Trail</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={42} color={Colors.primaryDark} />
          <Text style={styles.emptyTitle}>Không tìm thấy Personal Trail</Text>
          <Text style={styles.emptyDescription}>
            Trail có thể đã bị xóa hoặc mock data đã được reset.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/personal-trails" as Href)}
          >
            <Text style={styles.primaryButtonText}>Về danh sách Trail</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status = statusConfig[trail.verificationStatus];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={21} color={Colors.onSurface} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Chi tiết Personal Trail</Text>
          <Text style={styles.headerSubtitle}>Route riêng của bạn</Text>
        </View>

        <TouchableOpacity style={styles.headerButton} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={19} color="#B91C1C" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroCard}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: status.background,
              },
            ]}
          >
            <Ionicons name={status.icon} size={13} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>

          <Text style={styles.trailName}>{trail.name}</Text>

          <View style={styles.metaRow}>
            <Ionicons
              name="location-outline"
              size={17}
              color={Colors.primaryDark}
            />
            <Text style={styles.metaText}>{trail.region}</Text>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Ionicons
                name="walk-outline"
                size={19}
                color={Colors.primaryDark}
              />
              <Text style={styles.summaryValue}>{trail.distanceKm} km</Text>
              <Text style={styles.summaryLabel}>Khoảng cách</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Ionicons name="trending-up-outline" size={19} color="#725C00" />
              <Text style={styles.summaryValue}>+{trail.elevationGainM} m</Text>
              <Text style={styles.summaryLabel}>Độ cao</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Ionicons
                name="flag-outline"
                size={19}
                color={Colors.primaryDark}
              />
              <Text style={styles.summaryValue}>
                {trail.checkpoints.length}
              </Text>
              <Text style={styles.summaryLabel}>Checkpoint</Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: status.background,
            },
          ]}
        >
          <Ionicons name={status.icon} size={24} color={status.color} />
          <View style={styles.flexOne}>
            <Text style={[styles.statusCardTitle, { color: status.color }]}>
              {status.label}
            </Text>
            <Text
              style={[styles.statusCardDescription, { color: status.color }]}
            >
              {status.description}
            </Text>
          </View>
        </View>

        {trail.verificationStatus === "REJECTED" && trail.rejectionReason ? (
          <View style={styles.rejectionCard}>
            <View style={styles.rejectionHeader}>
              <Ionicons
                name="chatbox-ellipses-outline"
                size={19}
                color="#B91C1C"
              />
              <Text style={styles.rejectionTitle}>Phản hồi từ Admin</Text>
            </View>
            <Text style={styles.rejectionDescription}>
              {trail.rejectionReason}
            </Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="map" size={19} color={Colors.primaryDark} />
            </View>
            <View style={styles.flexOne}>
              <Text style={styles.sectionTitle}>Route địa hình</Text>
              <Text style={styles.sectionSubtitle}>
                Preset {trail.routePreset} · {trail.routePoints.length} điểm
              </Text>
            </View>
            <View style={styles.privateBadge}>
              <Ionicons name="lock-closed" size={11} color="#725C00" />
              <Text style={styles.privateBadgeText}>
                {trail.visibility === "PRIVATE" ? "RIÊNG TƯ" : "CÔNG KHAI"}
              </Text>
            </View>
          </View>

          <View style={styles.mapWrapper}>
            <TacticalMap
              isOnRoute
              height={250}
              checkpoints={trail.checkpoints}
              interactive={false}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="information-circle-outline"
                size={19}
                color={Colors.primaryDark}
              />
            </View>
            <View style={styles.flexOne}>
              <Text style={styles.sectionTitle}>Tổng quan hành trình</Text>
              <Text style={styles.sectionSubtitle}>{trail.terrainType}</Text>
            </View>
          </View>

          <Text style={styles.description}>{trail.description}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Độ khó</Text>
              <Text style={styles.infoValue}>{trail.difficulty}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Thời lượng</Text>
              <Text style={styles.infoValue}>{trail.duration}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="flag" size={19} color={Colors.primaryDark} />
            </View>
            <View style={styles.flexOne}>
              <Text style={styles.sectionTitle}>Checkpoint</Text>
              <Text style={styles.sectionSubtitle}>
                {trail.checkpoints.length} mốc trên tuyến
              </Text>
            </View>
          </View>

          <View style={styles.checkpointList}>
            {trail.checkpoints.map((checkpoint, index) => (
              <View key={checkpoint.id} style={styles.checkpointRow}>
                <View style={styles.timelineColumn}>
                  <View style={styles.checkpointOrder}>
                    <Text style={styles.checkpointOrderText}>
                      {checkpoint.order}
                    </Text>
                  </View>
                  {index < trail.checkpoints.length - 1 ? (
                    <View style={styles.timelineLine} />
                  ) : null}
                </View>

                <View style={styles.checkpointContent}>
                  <Text style={styles.checkpointName}>{checkpoint.name}</Text>
                  <Text style={styles.checkpointMeta}>
                    {checkpoint.distanceFromStartKm} km từ điểm đầu ·{" "}
                    {checkpoint.elevation} m
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.auditCard}>
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Ngày tạo</Text>
            <Text style={styles.auditValue}>{trail.createdAt}</Text>
          </View>
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Cập nhật cuối</Text>
            <Text style={styles.auditValue}>{trail.updatedAt}</Text>
          </View>
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Chế độ hiển thị</Text>
            <Text style={styles.auditValue}>
              {trail.visibility === "PRIVATE" ? "Chỉ mình tôi" : "Công khai"}
            </Text>
          </View>
        </View>

        {(trail.verificationStatus === "DRAFT" ||
          trail.verificationStatus === "REJECTED") && (
          <>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() =>
                router.push({
                  pathname: "/personal-trails/[id]/edit",
                  params: {
                    id: trail.id,
                  },
                } as unknown as Href)
              }
              activeOpacity={0.85}
            >
              <Ionicons
                name="create-outline"
                size={19}
                color={Colors.primaryDark}
              />
              <Text style={styles.editButtonText}>Chỉnh sửa Trail</Text>
            </TouchableOpacity>

            {trail.verificationStatus === "DRAFT" ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={submitForVerification}
                activeOpacity={0.85}
              >
                <Ionicons name="send" size={19} color={Colors.onPrimary} />
                <Text style={styles.primaryButtonText}>Gửi Admin xác minh</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}

        {trail.verificationStatus === "PENDING" ? (
          <View style={styles.pendingNotice}>
            <Ionicons name="hourglass-outline" size={19} color="#7A5700" />
            <Text style={styles.pendingNoticeText}>
              Trail đang chờ Admin kiểm tra. Trong bản thật, kết quả sẽ được cập
              nhật từ API và gửi thông báo đến người tạo.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  flexOne: {
    flex: 1,
  },
  headerBar: {
    minHeight: 62,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
  },
  headerTitleBox: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: Colors.onSurface,
    fontSize: 15,
    fontWeight: "900",
  },
  headerSubtitle: {
    marginTop: 1,
    color: Colors.onSurfaceVariant,
    fontSize: 9,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 44,
  },
  heroCard: {
    padding: 17,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.hover,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: Radius.full,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
  },
  trailName: {
    marginTop: 13,
    color: Colors.onSurface,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  metaRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  metaText: {
    flex: 1,
    color: Colors.onSurfaceVariant,
    fontSize: 12,
  },
  summaryGrid: {
    marginTop: 17,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 45,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  summaryValue: {
    marginTop: 4,
    color: Colors.onSurface,
    fontSize: 13,
    fontWeight: "900",
  },
  summaryLabel: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontSize: 8,
  },
  statusCard: {
    marginTop: 13,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: Radius.lg,
  },
  statusCardTitle: {
    fontSize: 12,
    fontWeight: "900",
  },
  statusCardDescription: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 15,
  },
  rejectionCard: {
    marginTop: 13,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: Radius.lg,
    backgroundColor: "#FEF2F2",
  },
  rejectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  rejectionTitle: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "900",
  },
  rejectionDescription: {
    marginTop: 7,
    color: "#B91C1C",
    fontSize: 10,
    lineHeight: 16,
  },
  sectionCard: {
    marginTop: 13,
    padding: 15,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryPale,
  },
  sectionTitle: {
    color: Colors.onSurface,
    fontSize: 13,
    fontWeight: "900",
  },
  sectionSubtitle: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontSize: 9,
  },
  privateBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: Radius.full,
    backgroundColor: "#FFF7D6",
  },
  privateBadgeText: {
    color: "#725C00",
    fontSize: 8,
    fontWeight: "900",
  },
  mapWrapper: {
    marginTop: 13,
    overflow: "hidden",
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  description: {
    marginTop: 13,
    color: Colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 18,
  },
  infoGrid: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  infoCell: {
    flex: 1,
    padding: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
  },
  infoLabel: {
    color: Colors.onSurfaceVariant,
    fontSize: 8,
    fontWeight: "800",
  },
  infoValue: {
    marginTop: 3,
    color: Colors.onSurface,
    fontSize: 11,
    fontWeight: "900",
  },
  checkpointList: {
    marginTop: 13,
  },
  checkpointRow: {
    minHeight: 62,
    flexDirection: "row",
    gap: 10,
  },
  timelineColumn: {
    width: 34,
    alignItems: "center",
  },
  checkpointOrder: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
  },
  checkpointOrderText: {
    color: Colors.onPrimary,
    fontSize: 10,
    fontWeight: "900",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  checkpointContent: {
    flex: 1,
    paddingTop: 4,
    paddingBottom: 13,
  },
  checkpointName: {
    color: Colors.onSurface,
    fontSize: 12,
    fontWeight: "800",
  },
  checkpointMeta: {
    marginTop: 3,
    color: Colors.onSurfaceVariant,
    fontSize: 9,
  },
  auditCard: {
    marginTop: 13,
    padding: 14,
    gap: 9,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  auditRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  auditLabel: {
    color: Colors.onSurfaceVariant,
    fontSize: 10,
  },
  auditValue: {
    color: Colors.onSurface,
    fontSize: 10,
    fontWeight: "800",
  },
  primaryButton: {
    minHeight: 51,
    marginTop: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
    ...Shadows.card,
  },
  primaryButtonText: {
    color: Colors.onPrimary,
    fontSize: 13,
    fontWeight: "900",
  },
  editButton: {
    minHeight: 49,
    marginTop: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primaryContainer,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  editButtonText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: "900",
  },
  pendingNotice: {
    marginTop: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: Radius.lg,
    backgroundColor: "#FFF7D6",
  },
  pendingNoticeText: {
    flex: 1,
    color: "#7A5700",
    fontSize: 10,
    lineHeight: 15,
  },
  emptyState: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    marginTop: 12,
    color: Colors.onSurface,
    fontSize: 17,
    fontWeight: "900",
  },
  emptyDescription: {
    marginTop: 5,
    marginBottom: 18,
    color: Colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
});
