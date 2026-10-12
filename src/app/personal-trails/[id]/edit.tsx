import { Ionicons } from "@expo/vector-icons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { TacticalMap } from "@/components/TacticalMap";
import { Colors, Radius, Shadows } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import {
  Checkpoint,
  DifficultyLevel,
  PersonalTrail,
  PersonalTrailRoutePoint,
} from "@/types";

const difficultyOptions: DifficultyLevel[] = [
  "Dễ",
  "Trung bình",
  "Khó",
  "Thách thức",
];

const routeOptions: {
  value: PersonalTrail["routePreset"];
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: "RIDGE",
    label: "Sống núi",
    description: "Route cao dần theo sườn núi",
    icon: "trending-up-outline",
  },
  {
    value: "FOREST",
    label: "Rừng",
    description: "Route uốn lượn trong rừng",
    icon: "leaf-outline",
  },
  {
    value: "WATERFALL",
    label: "Thác nước",
    description: "Route men theo suối và thác",
    icon: "water-outline",
  },
];

const routePointsByPreset: Record<
  PersonalTrail["routePreset"],
  PersonalTrailRoutePoint[]
> = {
  RIDGE: [
    { id: "ridge-1", x: 42, y: 304 },
    { id: "ridge-2", x: 112, y: 252 },
    { id: "ridge-3", x: 208, y: 196 },
    { id: "ridge-4", x: 294, y: 116 },
    { id: "ridge-5", x: 356, y: 62 },
  ],
  FOREST: [
    { id: "forest-1", x: 38, y: 292 },
    { id: "forest-2", x: 126, y: 238 },
    { id: "forest-3", x: 230, y: 172 },
    { id: "forest-4", x: 346, y: 86 },
  ],
  WATERFALL: [
    { id: "waterfall-1", x: 36, y: 300 },
    { id: "waterfall-2", x: 98, y: 232 },
    { id: "waterfall-3", x: 188, y: 244 },
    { id: "waterfall-4", x: 270, y: 154 },
    { id: "waterfall-5", x: 350, y: 92 },
  ],
};

function numericValue(value: string) {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

export default function PersonalTrailEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();
  const trailId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { personalTrails, updatePersonalTrail } = useApp();
  const trail = useMemo(
    () => personalTrails.find((current) => current.id === trailId),
    [personalTrails, trailId],
  );

  const [name, setName] = useState(trail?.name ?? "");
  const [region, setRegion] = useState(trail?.region ?? "");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    trail?.difficulty ?? "Trung bình",
  );
  const [distanceKm, setDistanceKm] = useState(String(trail?.distanceKm ?? 0));
  const [elevationGainM, setElevationGainM] = useState(
    String(trail?.elevationGainM ?? 0),
  );
  const [duration, setDuration] = useState(trail?.duration ?? "1 ngày");
  const [terrainType, setTerrainType] = useState(
    trail?.terrainType ?? "Đường mòn & Rừng",
  );
  const [description, setDescription] = useState(trail?.description ?? "");
  const [routePreset, setRoutePreset] = useState<PersonalTrail["routePreset"]>(
    trail?.routePreset ?? "RIDGE",
  );
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(
    trail?.checkpoints.map((checkpoint) => ({ ...checkpoint })) ?? [],
  );
  const [checkpointName, setCheckpointName] = useState("");
  const [checkpointDistance, setCheckpointDistance] = useState("");
  const [checkpointElevation, setCheckpointElevation] = useState("");

  const canEdit =
    trail?.verificationStatus === "DRAFT" ||
    trail?.verificationStatus === "REJECTED";

  function addCheckpoint() {
    const nextName = checkpointName.trim();
    const nextDistance = numericValue(checkpointDistance);
    const nextElevation = numericValue(checkpointElevation);

    if (!nextName) {
      Alert.alert("Thiếu tên checkpoint", "Hãy nhập tên mốc trên tuyến.");
      return;
    }

    const routePoints = routePointsByPreset[routePreset];
    const fallbackPoint =
      routePoints[Math.min(checkpoints.length, routePoints.length - 1)];

    setCheckpoints((current) => [
      ...current,
      {
        id: `personal-cp-${Date.now()}`,
        order: current.length + 1,
        name: nextName,
        elevation: Math.max(0, Math.round(nextElevation)),
        distanceFromStartKm: Math.max(0, nextDistance),
        status: "PENDING",
        coords: {
          x: fallbackPoint?.x ?? 42,
          y: fallbackPoint?.y ?? 304,
        },
      },
    ]);

    setCheckpointName("");
    setCheckpointDistance("");
    setCheckpointElevation("");
  }

  function removeCheckpoint(checkpointId: string) {
    setCheckpoints((current) =>
      current
        .filter((checkpoint) => checkpoint.id !== checkpointId)
        .map((checkpoint, index) => ({
          ...checkpoint,
          order: index + 1,
        })),
    );
  }

  function validate() {
    if (!name.trim() || !region.trim()) {
      Alert.alert(
        "Thiếu thông tin",
        "Hãy nhập tên Trail và khu vực trước khi lưu.",
      );
      return false;
    }

    if (numericValue(distanceKm) <= 0) {
      Alert.alert("Khoảng cách chưa hợp lệ", "Khoảng cách phải lớn hơn 0 km.");
      return false;
    }

    if (!duration.trim() || !terrainType.trim() || !description.trim()) {
      Alert.alert(
        "Chưa đủ mô tả",
        "Hãy điền thời lượng, địa hình và mô tả hành trình.",
      );
      return false;
    }

    if (checkpoints.length === 0) {
      Alert.alert(
        "Chưa có checkpoint",
        "Trail cần ít nhất một checkpoint trước khi lưu.",
      );
      return false;
    }

    return true;
  }

  function saveTrail(submitForVerification: boolean) {
    if (!trail || !canEdit || !validate()) {
      return;
    }

    updatePersonalTrail(trail.id, {
      name,
      region,
      difficulty,
      distanceKm: numericValue(distanceKm),
      elevationGainM: Math.max(0, Math.round(numericValue(elevationGainM))),
      duration,
      terrainType,
      description,
      routePreset,
      routePoints: routePointsByPreset[routePreset],
      checkpoints,
      submitForVerification,
    });

    Alert.alert(
      submitForVerification ? "Đã gửi lại Trail" : "Đã lưu bản nháp",
      submitForVerification
        ? "Trail đã chuyển sang trạng thái chờ Admin xác minh."
        : "Các thay đổi đã được lưu trong mock state của phiên hiện tại.",
      [
        {
          text: "Xem chi tiết",
          onPress: () =>
            router.replace({
              pathname: "/personal-trails/[id]",
              params: {
                id: trail.id,
              },
            } as unknown as Href),
        },
      ],
    );
  }

  if (!trail) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.headerButton} onPress={router.back}>
            <Ionicons name="arrow-back" size={21} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chỉnh sửa Personal Trail</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={44} color={Colors.primaryDark} />
          <Text style={styles.emptyTitle}>Không tìm thấy Trail</Text>
          <Text style={styles.emptyDescription}>
            Trail có thể đã bị xóa hoặc mock data đã được reset.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/personal-trails" as Href)}
          >
            <Text style={styles.primaryButtonText}>Về danh sách</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!canEdit) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.headerButton} onPress={router.back}>
            <Ionicons name="arrow-back" size={21} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chỉnh sửa Personal Trail</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.emptyState}>
          <Ionicons name="lock-closed" size={42} color="#7A5700" />
          <Text style={styles.emptyTitle}>Trail đang bị khóa chỉnh sửa</Text>
          <Text style={styles.emptyDescription}>
            Trail ở trạng thái {trail.verificationStatus}. Chỉ bản nháp hoặc
            Trail bị từ chối mới có thể chỉnh sửa.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryButtonText}>Quay lại chi tiết</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.headerButton} onPress={router.back}>
            <Ionicons name="arrow-back" size={21} color={Colors.onSurface} />
          </TouchableOpacity>

          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Chỉnh sửa Personal Trail</Text>
            <Text style={styles.headerSubtitle}>
              {trail.verificationStatus === "REJECTED"
                ? "Bổ sung theo phản hồi Admin"
                : "Cập nhật bản nháp của bạn"}
            </Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {trail.verificationStatus === "REJECTED" && trail.rejectionReason ? (
            <View style={styles.rejectionCard}>
              <Ionicons name="alert-circle-outline" size={22} color="#B91C1C" />
              <View style={styles.flexOne}>
                <Text style={styles.rejectionTitle}>Phản hồi từ Admin</Text>
                <Text style={styles.rejectionText}>
                  {trail.rejectionReason}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.sectionCard}>
            <SectionHeading
              icon="information-circle-outline"
              title="Thông tin Trail"
              subtitle="Cập nhật nội dung hiển thị của cung đường"
            />

            <FieldLabel text="Tên Personal Trail" required />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ví dụ: Đường mòn săn mây Pinhatt"
              placeholderTextColor={Colors.onSurfaceVariant}
            />

            <FieldLabel text="Khu vực" required />
            <TextInput
              style={styles.input}
              value={region}
              onChangeText={setRegion}
              placeholder="Đà Lạt, Lâm Đồng"
              placeholderTextColor={Colors.onSurfaceVariant}
            />

            <FieldLabel text="Độ khó" required />
            <View style={styles.optionWrap}>
              {difficultyOptions.map((option) => {
                const selected = difficulty === option;

                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionPill,
                      selected && styles.optionPillSelected,
                    ]}
                    onPress={() => setDifficulty(option)}
                  >
                    <Text
                      style={[
                        styles.optionPillText,
                        selected && styles.optionPillTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.twoColumnRow}>
              <View style={styles.flexOne}>
                <FieldLabel text="Khoảng cách (km)" required />
                <TextInput
                  style={styles.input}
                  value={distanceKm}
                  onChangeText={setDistanceKm}
                  keyboardType="decimal-pad"
                  placeholder="8.6"
                  placeholderTextColor={Colors.onSurfaceVariant}
                />
              </View>

              <View style={styles.flexOne}>
                <FieldLabel text="Tăng độ cao (m)" />
                <TextInput
                  style={styles.input}
                  value={elevationGainM}
                  onChangeText={setElevationGainM}
                  keyboardType="number-pad"
                  placeholder="420"
                  placeholderTextColor={Colors.onSurfaceVariant}
                />
              </View>
            </View>

            <FieldLabel text="Thời lượng" required />
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="1 ngày"
              placeholderTextColor={Colors.onSurfaceVariant}
            />

            <FieldLabel text="Địa hình" required />
            <TextInput
              style={styles.input}
              value={terrainType}
              onChangeText={setTerrainType}
              placeholder="Rừng thông & Sống núi"
              placeholderTextColor={Colors.onSurfaceVariant}
            />

            <FieldLabel text="Mô tả hành trình" required />
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              placeholder="Mô tả đường đi, điểm nổi bật và lưu ý an toàn..."
              placeholderTextColor={Colors.onSurfaceVariant}
            />
          </View>

          <View style={styles.sectionCard}>
            <SectionHeading
              icon="map-outline"
              title="Route mô phỏng"
              subtitle="Chọn preset để thay route trên bản đồ demo"
            />

            <View style={styles.routeOptionList}>
              {routeOptions.map((option) => {
                const selected = routePreset === option.value;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.routeOption,
                      selected && styles.routeOptionSelected,
                    ]}
                    onPress={() => setRoutePreset(option.value)}
                  >
                    <View
                      style={[
                        styles.routeIcon,
                        selected && styles.routeIconSelected,
                      ]}
                    >
                      <Ionicons
                        name={option.icon}
                        size={20}
                        color={selected ? Colors.onPrimary : Colors.primaryDark}
                      />
                    </View>
                    <View style={styles.flexOne}>
                      <Text style={styles.routeOptionTitle}>
                        {option.label}
                      </Text>
                      <Text style={styles.routeOptionDescription}>
                        {option.description}
                      </Text>
                    </View>
                    <Ionicons
                      name={selected ? "checkmark-circle" : "ellipse-outline"}
                      size={22}
                      color={
                        selected
                          ? Colors.primaryContainer
                          : Colors.onSurfaceVariant
                      }
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.mapWrapper}>
              <TacticalMap
                isOnRoute
                height={240}
                checkpoints={checkpoints}
                interactive={false}
              />
            </View>

            <View style={styles.mockNotice}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#725C00"
              />
              <Text style={styles.mockNoticeText}>
                Bản demo đang dùng route preset. Khi nối API/GPS, phần này sẽ
                nhận tọa độ thực do người dùng vẽ hoặc ghi hành trình.
              </Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <SectionHeading
              icon="flag-outline"
              title="Checkpoint"
              subtitle={`${checkpoints.length} mốc trên tuyến`}
            />

            {checkpoints.map((checkpoint) => (
              <View key={checkpoint.id} style={styles.checkpointRow}>
                <View style={styles.checkpointOrder}>
                  <Text style={styles.checkpointOrderText}>
                    {checkpoint.order}
                  </Text>
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.checkpointTitle}>{checkpoint.name}</Text>
                  <Text style={styles.checkpointMeta}>
                    {checkpoint.distanceFromStartKm} km · {checkpoint.elevation}{" "}
                    m
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteCheckpointButton}
                  onPress={() => removeCheckpoint(checkpoint.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#B91C1C" />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.checkpointForm}>
              <Text style={styles.checkpointFormTitle}>
                Thêm checkpoint mới
              </Text>
              <TextInput
                style={styles.input}
                value={checkpointName}
                onChangeText={setCheckpointName}
                placeholder="Tên checkpoint"
                placeholderTextColor={Colors.onSurfaceVariant}
              />

              <View style={styles.twoColumnRow}>
                <TextInput
                  style={[styles.input, styles.flexOne]}
                  value={checkpointDistance}
                  onChangeText={setCheckpointDistance}
                  keyboardType="decimal-pad"
                  placeholder="Khoảng cách (km)"
                  placeholderTextColor={Colors.onSurfaceVariant}
                />
                <TextInput
                  style={[styles.input, styles.flexOne]}
                  value={checkpointElevation}
                  onChangeText={setCheckpointElevation}
                  keyboardType="number-pad"
                  placeholder="Độ cao (m)"
                  placeholderTextColor={Colors.onSurfaceVariant}
                />
              </View>

              <TouchableOpacity
                style={styles.addCheckpointButton}
                onPress={addCheckpoint}
              >
                <Ionicons name="add" size={19} color={Colors.primaryDark} />
                <Text style={styles.addCheckpointButtonText}>
                  Thêm checkpoint
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.actionCard}>
            <TouchableOpacity
              style={styles.draftButton}
              onPress={() => saveTrail(false)}
              activeOpacity={0.85}
            >
              <Ionicons
                name="save-outline"
                size={19}
                color={Colors.primaryDark}
              />
              <Text style={styles.draftButtonText}>Lưu bản nháp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => saveTrail(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="send" size={19} color={Colors.onPrimary} />
              <Text style={styles.submitButtonText}>
                {trail.verificationStatus === "REJECTED"
                  ? "Gửi lại Admin"
                  : "Lưu và gửi xác minh"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({
  text,
  required = false,
}: {
  text: string;
  required?: boolean;
}) {
  return (
    <Text style={styles.fieldLabel}>
      {text}
      {required ? <Text style={styles.requiredMark}> *</Text> : null}
    </Text>
  );
}

function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Ionicons name={icon} size={19} color={Colors.primaryDark} />
      </View>
      <View style={styles.flexOne}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
    </View>
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
  headerSpacer: {
    width: 40,
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
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontSize: 9,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 42,
  },
  rejectionCard: {
    marginBottom: 13,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: Radius.lg,
    backgroundColor: "#FEF2F2",
  },
  rejectionTitle: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "900",
  },
  rejectionText: {
    marginTop: 4,
    color: "#991B1B",
    fontSize: 10,
    lineHeight: 15,
  },
  sectionCard: {
    marginBottom: 13,
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    ...Shadows.card,
  },
  sectionHeader: {
    marginBottom: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  sectionIcon: {
    width: 34,
    height: 34,
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
  fieldLabel: {
    marginTop: 10,
    marginBottom: 6,
    color: Colors.onSurface,
    fontSize: 10,
    fontWeight: "800",
  },
  requiredMark: {
    color: "#B91C1C",
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
    color: Colors.onSurface,
    fontSize: 11,
  },
  multilineInput: {
    minHeight: 102,
    paddingTop: 12,
  },
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  optionPill: {
    minHeight: 38,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
  },
  optionPillSelected: {
    borderColor: Colors.primaryContainer,
    backgroundColor: Colors.primaryPale,
  },
  optionPillText: {
    color: Colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: "700",
  },
  optionPillTextSelected: {
    color: Colors.primaryDark,
    fontWeight: "900",
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: 9,
  },
  routeOptionList: {
    gap: 8,
  },
  routeOption: {
    minHeight: 64,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
  },
  routeOptionSelected: {
    borderColor: Colors.primaryContainer,
    backgroundColor: Colors.primaryPale,
  },
  routeIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  routeIconSelected: {
    backgroundColor: Colors.primaryContainer,
  },
  routeOptionTitle: {
    color: Colors.onSurface,
    fontSize: 11,
    fontWeight: "900",
  },
  routeOptionDescription: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontSize: 9,
  },
  mapWrapper: {
    marginTop: 12,
    overflow: "hidden",
    borderRadius: Radius.lg,
  },
  mockNotice: {
    marginTop: 10,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    borderRadius: Radius.md,
    backgroundColor: "#FFF7D6",
  },
  mockNoticeText: {
    flex: 1,
    color: "#725C00",
    fontSize: 9,
    lineHeight: 14,
  },
  checkpointRow: {
    minHeight: 58,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerLow,
  },
  checkpointOrder: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryPale,
  },
  checkpointOrderText: {
    color: Colors.primaryDark,
    fontSize: 11,
    fontWeight: "900",
  },
  checkpointTitle: {
    color: Colors.onSurface,
    fontSize: 11,
    fontWeight: "800",
  },
  checkpointMeta: {
    marginTop: 3,
    color: Colors.onSurfaceVariant,
    fontSize: 9,
  },
  deleteCheckpointButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: "#FEF2F2",
  },
  checkpointForm: {
    marginTop: 14,
    padding: 12,
    gap: 9,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
  },
  checkpointFormTitle: {
    color: Colors.onSurface,
    fontSize: 11,
    fontWeight: "900",
  },
  addCheckpointButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primaryContainer,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  addCheckpointButtonText: {
    color: Colors.primaryDark,
    fontSize: 10,
    fontWeight: "900",
  },
  actionCard: {
    padding: 13,
    gap: 9,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    ...Shadows.card,
  },
  draftButton: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primaryContainer,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  draftButtonText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
  },
  submitButton: {
    minHeight: 51,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
    ...Shadows.card,
  },
  submitButtonText: {
    color: Colors.onPrimary,
    fontSize: 12,
    fontWeight: "900",
  },
  primaryButton: {
    minHeight: 49,
    marginTop: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
  },
  primaryButtonText: {
    color: Colors.onPrimary,
    fontSize: 12,
    fontWeight: "900",
  },
  emptyState: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    marginTop: 13,
    color: Colors.onSurface,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyDescription: {
    marginTop: 7,
    color: Colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
});
