import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    Alert,
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
    PersonalTrailVerificationStatus,
} from "@/types";

type ScreenMode = "LIST" | "CREATE";
type TrailFilter = "ALL" | PersonalTrailVerificationStatus;

const routePresets: {
  id: PersonalTrail["routePreset"];
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  points: PersonalTrail["routePoints"];
}[] = [
  {
    id: "RIDGE",
    title: "Sống núi",
    description: "Leo cao dần, ưu tiên điểm nhìn toàn cảnh",
    icon: "trending-up-outline",
    points: [
      { id: "ridge-1", x: 38, y: 300 },
      { id: "ridge-2", x: 116, y: 250 },
      { id: "ridge-3", x: 204, y: 194 },
      { id: "ridge-4", x: 286, y: 120 },
      { id: "ridge-5", x: 354, y: 62 },
    ],
  },
  {
    id: "FOREST",
    title: "Xuyên rừng",
    description: "Route uốn lượn, nhiều điểm nghỉ dưới tán cây",
    icon: "leaf-outline",
    points: [
      { id: "forest-1", x: 44, y: 292 },
      { id: "forest-2", x: 138, y: 254 },
      { id: "forest-3", x: 194, y: 176 },
      { id: "forest-4", x: 278, y: 142 },
      { id: "forest-5", x: 350, y: 78 },
    ],
  },
  {
    id: "WATERFALL",
    title: "Suối & thác",
    description: "Bám theo nguồn nước, lưu ý đường trơn",
    icon: "water-outline",
    points: [
      { id: "water-1", x: 40, y: 306 },
      { id: "water-2", x: 102, y: 232 },
      { id: "water-3", x: 222, y: 214 },
      { id: "water-4", x: 298, y: 126 },
      { id: "water-5", x: 360, y: 82 },
    ],
  },
];

const statusConfig: Record<
  PersonalTrailVerificationStatus,
  {
    label: string;
    background: string;
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  DRAFT: {
    label: "BẢN NHÁP",
    background: Colors.surfaceContainer,
    color: Colors.onSurfaceVariant,
    icon: "create-outline",
  },
  PENDING: {
    label: "CHỜ XÁC MINH",
    background: "#FFF7D6",
    color: "#7A5700",
    icon: "time-outline",
  },
  VERIFIED: {
    label: "ĐÃ XÁC MINH",
    background: Colors.primaryPale,
    color: Colors.primaryDark,
    icon: "shield-checkmark-outline",
  },
  REJECTED: {
    label: "CẦN CHỈNH SỬA",
    background: "#FEE2E2",
    color: "#B91C1C",
    icon: "alert-circle-outline",
  },
};

function parsePositiveNumber(value: string) {
  const normalized = value.replace(",", ".").trim();
  const number = Number.parseFloat(normalized);

  return Number.isFinite(number) && number > 0 ? number : 0;
}

export default function PersonalTrailsScreen() {
  const router = useRouter();
  const { personalTrails, createPersonalTrail } = useApp();

  const [screenMode, setScreenMode] = useState<ScreenMode>("LIST");
  const [filter, setFilter] = useState<TrailFilter>("ALL");
  const [step, setStep] = useState(1);

  const [name, setName] = useState("");
  const [region, setRegion] = useState("Đà Lạt, Lâm Đồng");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("Trung bình");
  const [distance, setDistance] = useState("8.5");
  const [elevation, setElevation] = useState("420");
  const [duration, setDuration] = useState("1 ngày");
  const [terrainType, setTerrainType] = useState("Rừng thông & Sống núi");
  const [description, setDescription] = useState("");
  const [routePreset, setRoutePreset] =
    useState<PersonalTrail["routePreset"]>("RIDGE");
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [checkpointName, setCheckpointName] = useState("");
  const [checkpointElevation, setCheckpointElevation] = useState("1450");
  const [checkpointDistance, setCheckpointDistance] = useState("0");

  const filteredTrails = useMemo(() => {
    if (filter === "ALL") {
      return personalTrails;
    }

    return personalTrails.filter(
      (trail) => trail.verificationStatus === filter,
    );
  }, [filter, personalTrails]);

  const selectedPreset =
    routePresets.find((preset) => preset.id === routePreset) ||
    routePresets[0]!;

  function resetBuilder() {
    setStep(1);
    setName("");
    setRegion("Đà Lạt, Lâm Đồng");
    setDifficulty("Trung bình");
    setDistance("8.5");
    setElevation("420");
    setDuration("1 ngày");
    setTerrainType("Rừng thông & Sống núi");
    setDescription("");
    setRoutePreset("RIDGE");
    setCheckpoints([]);
    setCheckpointName("");
    setCheckpointElevation("1450");
    setCheckpointDistance("0");
  }

  function closeBuilder() {
    resetBuilder();
    setScreenMode("LIST");
  }

  function openDetail(trailId: string) {
    router.push({
      pathname: "/personal-trails/[id]",
      params: {
        id: trailId,
      },
    } as unknown as Href);
  }

  function validateStepOne() {
    if (name.trim().length < 5) {
      Alert.alert(
        "Tên Trail chưa hợp lệ",
        "Tên cung đường cần có ít nhất 5 ký tự.",
      );
      return false;
    }

    if (!region.trim()) {
      Alert.alert("Thiếu địa điểm", "Hãy nhập khu vực của cung đường.");
      return false;
    }

    if (!parsePositiveNumber(distance) || !parsePositiveNumber(elevation)) {
      Alert.alert(
        "Thông số chưa hợp lệ",
        "Khoảng cách và độ cao tích lũy phải lớn hơn 0.",
      );
      return false;
    }

    if (description.trim().length < 20) {
      Alert.alert(
        "Mô tả còn ngắn",
        "Hãy mô tả cung đường bằng ít nhất 20 ký tự.",
      );
      return false;
    }

    return true;
  }

  function goNext() {
    if (step === 1 && !validateStepOne()) {
      return;
    }

    if (step === 3 && checkpoints.length === 0) {
      Alert.alert(
        "Chưa có checkpoint",
        "Hãy thêm ít nhất một checkpoint trước khi rà soát Trail.",
      );
      return;
    }

    setStep((current) => Math.min(4, current + 1));
  }

  function addCheckpoint() {
    if (checkpointName.trim().length < 3) {
      Alert.alert(
        "Tên checkpoint chưa hợp lệ",
        "Tên checkpoint cần có ít nhất 3 ký tự.",
      );
      return;
    }

    const checkpointIndex = checkpoints.length;
    const fallbackPoint =
      selectedPreset.points[
        Math.min(checkpointIndex, selectedPreset.points.length - 1)
      ];

    const newCheckpoint: Checkpoint = {
      id: `personal-checkpoint-${Date.now()}`,
      order: checkpointIndex + 1,
      name: checkpointName.trim(),
      elevation: parsePositiveNumber(checkpointElevation) || 1400,
      distanceFromStartKm: Math.max(
        0,
        Number.parseFloat(checkpointDistance.replace(",", ".")) || 0,
      ),
      status: "PENDING",
      coords: {
        x: fallbackPoint?.x ?? 40 + checkpointIndex * 70,
        y: fallbackPoint?.y ?? 290 - checkpointIndex * 45,
      },
    };

    setCheckpoints((current) => [...current, newCheckpoint]);
    setCheckpointName("");
    setCheckpointDistance(
      Math.min(
        parsePositiveNumber(distance),
        (checkpointIndex + 1) * 2.5,
      ).toFixed(1),
    );
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

  function saveTrail(submitForVerification: boolean) {
    const createdTrail = createPersonalTrail({
      name,
      region,
      difficulty,
      distanceKm: parsePositiveNumber(distance),
      elevationGainM: parsePositiveNumber(elevation),
      duration,
      terrainType,
      description,
      routePreset,
      routePoints: selectedPreset.points,
      checkpoints,
      submitForVerification,
    });

    resetBuilder();
    setScreenMode("LIST");

    Alert.alert(
      submitForVerification
        ? "Đã gửi Trail để xác minh"
        : "Đã lưu Trail cá nhân",
      submitForVerification
        ? "Trail đang ở trạng thái chờ Admin xác minh."
        : "Trail được lưu riêng tư và chưa hiển thị công khai.",
      [
        {
          text: "Xem chi tiết",
          onPress: () => openDetail(createdTrail.id),
        },
      ],
    );
  }

  function renderStatusPill(status: PersonalTrailVerificationStatus) {
    const config = statusConfig[status];

    return (
      <View
        style={[
          styles.statusPill,
          {
            backgroundColor: config.background,
          },
        ]}
      >
        <Ionicons name={config.icon} size={12} color={config.color} />
        <Text style={[styles.statusPillText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    );
  }

  function renderList() {
    const draftCount = personalTrails.filter(
      (trail) => trail.verificationStatus === "DRAFT",
    ).length;
    const pendingCount = personalTrails.filter(
      (trail) => trail.verificationStatus === "PENDING",
    ).length;

    return (
      <>
        <View style={styles.overviewCard}>
          <View style={styles.overviewIcon}>
            <Ionicons
              name="trail-sign-outline"
              size={29}
              color={Colors.primaryDark}
            />
          </View>

          <View style={styles.flexOne}>
            <Text style={styles.overviewTitle}>Trail cá nhân của bạn</Text>
            <Text style={styles.overviewDescription}>
              Tự xây dựng route, checkpoint và gửi Admin xác minh khi hoàn tất.
            </Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{personalTrails.length}</Text>
            <Text style={styles.statLabel}>Tổng Trail</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{draftCount}</Text>
            <Text style={styles.statLabel}>Bản nháp</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Chờ duyệt</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setScreenMode("CREATE")}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={21} color={Colors.onPrimary} />
          <Text style={styles.createButtonText}>Tạo Personal Trail mới</Text>
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {(
            [
              ["ALL", "Tất cả"],
              ["DRAFT", "Bản nháp"],
              ["PENDING", "Chờ xác minh"],
              ["VERIFIED", "Đã xác minh"],
              ["REJECTED", "Cần sửa"],
            ] as [TrailFilter, string][]
          ).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.filterChip,
                filter === value && styles.filterChipActive,
              ]}
              onPress={() => setFilter(value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === value && styles.filterChipTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredTrails.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={36} color={Colors.primaryDark} />
            <Text style={styles.emptyTitle}>
              Chưa có Trail ở trạng thái này
            </Text>
            <Text style={styles.emptyDescription}>
              Chọn bộ lọc khác hoặc tạo một Personal Trail mới.
            </Text>
          </View>
        ) : (
          <View style={styles.trailList}>
            {filteredTrails.map((trail) => (
              <TouchableOpacity
                key={trail.id}
                style={styles.trailCard}
                onPress={() => openDetail(trail.id)}
                activeOpacity={0.82}
              >
                <View style={styles.trailCardTop}>
                  {renderStatusPill(trail.verificationStatus)}

                  <Ionicons
                    name="chevron-forward"
                    size={19}
                    color={Colors.primaryDark}
                  />
                </View>

                <Text style={styles.trailName}>{trail.name}</Text>
                <Text style={styles.trailRegion}>{trail.region}</Text>

                <View style={styles.trailStats}>
                  <View style={styles.trailStatItem}>
                    <Ionicons
                      name="walk-outline"
                      size={16}
                      color={Colors.primaryDark}
                    />
                    <Text style={styles.trailStatText}>
                      {trail.distanceKm} km
                    </Text>
                  </View>

                  <View style={styles.trailStatItem}>
                    <Ionicons
                      name="trending-up-outline"
                      size={16}
                      color="#725C00"
                    />
                    <Text style={styles.trailStatText}>
                      +{trail.elevationGainM} m
                    </Text>
                  </View>

                  <View style={styles.trailStatItem}>
                    <Ionicons
                      name="flag-outline"
                      size={16}
                      color={Colors.primaryDark}
                    />
                    <Text style={styles.trailStatText}>
                      {trail.checkpoints.length} mốc
                    </Text>
                  </View>
                </View>

                {trail.verificationStatus === "REJECTED" &&
                trail.rejectionReason ? (
                  <View style={styles.rejectionNotice}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={17}
                      color="#B91C1C"
                    />
                    <Text style={styles.rejectionText} numberOfLines={2}>
                      {trail.rejectionReason}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.updatedRow}>
                  <Text style={styles.updatedText}>
                    Cập nhật: {trail.updatedAt}
                  </Text>
                  <Text style={styles.visibilityText}>
                    {trail.visibility === "PRIVATE" ? "Riêng tư" : "Công khai"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </>
    );
  }

  function renderStepIndicator() {
    return (
      <View style={styles.stepIndicator}>
        {[1, 2, 3, 4].map((number) => (
          <View key={number} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                step >= number && styles.stepCircleActive,
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  step >= number && styles.stepNumberActive,
                ]}
              >
                {number}
              </Text>
            </View>
            {number < 4 ? (
              <View
                style={[
                  styles.stepLine,
                  step > number && styles.stepLineActive,
                ]}
              />
            ) : null}
          </View>
        ))}
      </View>
    );
  }

  function renderBasicInfoStep() {
    return (
      <View>
        <Text style={styles.stepTitle}>Thông tin cung đường</Text>
        <Text style={styles.stepDescription}>
          Mô tả đủ rõ để bạn sử dụng riêng hoặc gửi Admin xác minh sau này.
        </Text>

        <Text style={styles.label}>Tên Trail</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="VD: Sống núi Langbiang phía Bắc"
          placeholderTextColor={Colors.onSurfaceVariant}
        />

        <Text style={styles.label}>Khu vực</Text>
        <TextInput
          style={styles.input}
          value={region}
          onChangeText={setRegion}
          placeholder="Tỉnh/thành, khu vực"
          placeholderTextColor={Colors.onSurfaceVariant}
        />

        <Text style={styles.label}>Độ khó</Text>
        <View style={styles.choiceRow}>
          {(["Dễ", "Trung bình", "Khó", "Thách thức"] as DifficultyLevel[]).map(
            (value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.choiceChip,
                  difficulty === value && styles.choiceChipActive,
                ]}
                onPress={() => setDifficulty(value)}
              >
                <Text
                  style={[
                    styles.choiceChipText,
                    difficulty === value && styles.choiceChipTextActive,
                  ]}
                >
                  {value}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </View>

        <View style={styles.twoColumnRow}>
          <View style={styles.column}>
            <Text style={styles.label}>Khoảng cách (km)</Text>
            <TextInput
              style={styles.input}
              value={distance}
              onChangeText={setDistance}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.column}>
            <Text style={styles.label}>Độ cao tích lũy (m)</Text>
            <TextInput
              style={styles.input}
              value={elevation}
              onChangeText={setElevation}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.twoColumnRow}>
          <View style={styles.column}>
            <Text style={styles.label}>Thời lượng</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
            />
          </View>

          <View style={styles.column}>
            <Text style={styles.label}>Loại địa hình</Text>
            <TextInput
              style={styles.input}
              value={terrainType}
              onChangeText={setTerrainType}
            />
          </View>
        </View>

        <Text style={styles.label}>Mô tả hành trình</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Điểm bắt đầu, địa hình, cảnh quan và lưu ý an toàn..."
          placeholderTextColor={Colors.onSurfaceVariant}
          multiline
          textAlignVertical="top"
        />
      </View>
    );
  }

  function renderRouteStep() {
    return (
      <View>
        <Text style={styles.stepTitle}>Mô phỏng vẽ tuyến đường</Text>
        <Text style={styles.stepDescription}>
          Bản demo dùng route mẫu. Khi gắn API bản đồ, các điểm này sẽ được thay
          bằng tọa độ GPS người dùng vẽ trực tiếp.
        </Text>

        <View style={styles.routePresetList}>
          {routePresets.map((preset) => {
            const selected = routePreset === preset.id;

            return (
              <TouchableOpacity
                key={preset.id}
                style={[
                  styles.routePresetCard,
                  selected && styles.routePresetCardActive,
                ]}
                onPress={() => setRoutePreset(preset.id)}
              >
                <View style={styles.routePresetIcon}>
                  <Ionicons
                    name={preset.icon}
                    size={20}
                    color={Colors.primaryDark}
                  />
                </View>

                <View style={styles.flexOne}>
                  <Text style={styles.routePresetTitle}>{preset.title}</Text>
                  <Text style={styles.routePresetDescription}>
                    {preset.description}
                  </Text>
                </View>

                <Ionicons
                  name={selected ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={
                    selected ? Colors.primaryDark : Colors.onSurfaceVariant
                  }
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <View>
              <Text style={styles.mapTitle}>Route Preview</Text>
              <Text style={styles.mapSubtitle}>
                {selectedPreset.points.length} điểm mô phỏng
              </Text>
            </View>

            <View style={styles.offlineBadge}>
              <Ionicons
                name="cloud-offline-outline"
                size={13}
                color="#725C00"
              />
              <Text style={styles.offlineBadgeText}>OFFLINE READY</Text>
            </View>
          </View>

          <TacticalMap
            isOnRoute
            height={240}
            checkpoints={checkpoints}
            interactive={false}
          />
        </View>

        <View style={styles.infoNotice}>
          <Ionicons
            name="information-circle-outline"
            size={19}
            color={Colors.primaryDark}
          />
          <Text style={styles.infoNoticeText}>
            Route hiện chỉ là dữ liệu demo để review UI. Sau này thay bằng tọa
            độ GPS và polyline từ Map API.
          </Text>
        </View>
      </View>
    );
  }

  function renderCheckpointStep() {
    return (
      <View>
        <Text style={styles.stepTitle}>Checkpoint của Trail</Text>
        <Text style={styles.stepDescription}>
          Thêm điểm bắt đầu, điểm nghỉ, nguồn nước hoặc điểm kết thúc.
        </Text>

        <View style={styles.checkpointForm}>
          <Text style={styles.label}>Tên checkpoint</Text>
          <TextInput
            style={styles.input}
            value={checkpointName}
            onChangeText={setCheckpointName}
            placeholder="VD: Điểm ngắm hồ Tuyền Lâm"
            placeholderTextColor={Colors.onSurfaceVariant}
          />

          <View style={styles.twoColumnRow}>
            <View style={styles.column}>
              <Text style={styles.label}>Độ cao (m)</Text>
              <TextInput
                style={styles.input}
                value={checkpointElevation}
                onChangeText={setCheckpointElevation}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.column}>
              <Text style={styles.label}>Cách điểm đầu (km)</Text>
              <TextInput
                style={styles.input}
                value={checkpointDistance}
                onChangeText={setCheckpointDistance}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.addCheckpointButton}
            onPress={addCheckpoint}
          >
            <Ionicons
              name="flag-outline"
              size={18}
              color={Colors.primaryDark}
            />
            <Text style={styles.addCheckpointText}>Thêm checkpoint</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.checkpointList}>
          {checkpoints.length === 0 ? (
            <View style={styles.checkpointEmpty}>
              <Text style={styles.checkpointEmptyText}>
                Chưa có checkpoint nào.
              </Text>
            </View>
          ) : (
            checkpoints.map((checkpoint) => (
              <View key={checkpoint.id} style={styles.checkpointRow}>
                <View style={styles.checkpointOrder}>
                  <Text style={styles.checkpointOrderText}>
                    {checkpoint.order}
                  </Text>
                </View>

                <View style={styles.flexOne}>
                  <Text style={styles.checkpointName}>{checkpoint.name}</Text>
                  <Text style={styles.checkpointMeta}>
                    {checkpoint.distanceFromStartKm} km · {checkpoint.elevation}{" "}
                    m
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.removeCheckpointButton}
                  onPress={() => removeCheckpoint(checkpoint.id)}
                >
                  <Ionicons name="trash-outline" size={17} color="#B91C1C" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </View>
    );
  }

  function renderReviewStep() {
    return (
      <View>
        <Text style={styles.stepTitle}>Rà soát và lưu Trail</Text>
        <Text style={styles.stepDescription}>
          Chọn lưu riêng tư hoặc gửi Admin xác minh để có thể công khai sau khi
          được duyệt.
        </Text>

        <View style={styles.reviewCard}>
          <View style={styles.reviewTop}>
            <View style={styles.reviewIcon}>
              <Ionicons
                name="trail-sign-outline"
                size={24}
                color={Colors.primaryDark}
              />
            </View>
            <View style={styles.flexOne}>
              <Text style={styles.reviewName}>{name}</Text>
              <Text style={styles.reviewRegion}>{region}</Text>
            </View>
          </View>

          <View style={styles.reviewGrid}>
            <View style={styles.reviewStat}>
              <Text style={styles.reviewStatValue}>{distance} km</Text>
              <Text style={styles.reviewStatLabel}>Khoảng cách</Text>
            </View>
            <View style={styles.reviewStat}>
              <Text style={styles.reviewStatValue}>+{elevation} m</Text>
              <Text style={styles.reviewStatLabel}>Độ cao</Text>
            </View>
            <View style={styles.reviewStat}>
              <Text style={styles.reviewStatValue}>{checkpoints.length}</Text>
              <Text style={styles.reviewStatLabel}>Checkpoint</Text>
            </View>
          </View>

          <Text style={styles.reviewDescription}>{description}</Text>
        </View>

        <TouchableOpacity
          style={styles.savePrivateCard}
          onPress={() => saveTrail(false)}
          activeOpacity={0.85}
        >
          <View style={styles.optionIcon}>
            <Ionicons name="lock-closed" size={21} color={Colors.primaryDark} />
          </View>
          <View style={styles.flexOne}>
            <Text style={styles.optionTitle}>Lưu Trail cá nhân</Text>
            <Text style={styles.optionDescription}>
              Giữ ở trạng thái bản nháp, chỉ bạn nhìn thấy.
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={Colors.primaryDark}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.submitVerificationCard}
          onPress={() => saveTrail(true)}
          activeOpacity={0.85}
        >
          <View style={styles.optionIconDark}>
            <Ionicons
              name="shield-checkmark"
              size={21}
              color={Colors.onPrimary}
            />
          </View>
          <View style={styles.flexOne}>
            <Text style={styles.submitOptionTitle}>Gửi Admin xác minh</Text>
            <Text style={styles.submitOptionDescription}>
              Chuyển sang trạng thái chờ duyệt. Chưa công khai ngay.
            </Text>
          </View>
          <Ionicons name="send" size={18} color={Colors.onPrimary} />
        </TouchableOpacity>
      </View>
    );
  }

  function renderBuilder() {
    return (
      <>
        {renderStepIndicator()}

        <View style={styles.builderCard}>
          {step === 1 && renderBasicInfoStep()}
          {step === 2 && renderRouteStep()}
          {step === 3 && renderCheckpointStep()}
          {step === 4 && renderReviewStep()}
        </View>

        {step < 4 ? (
          <View style={styles.builderActions}>
            <TouchableOpacity
              style={styles.backStepButton}
              onPress={() => {
                if (step === 1) {
                  closeBuilder();
                  return;
                }

                setStep((current) => Math.max(1, current - 1));
              }}
            >
              <Ionicons name="arrow-back" size={18} color={Colors.onSurface} />
              <Text style={styles.backStepText}>
                {step === 1 ? "Hủy" : "Quay lại"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.nextStepButton} onPress={goNext}>
              <Text style={styles.nextStepText}>Tiếp tục</Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={Colors.onPrimary}
              />
            </TouchableOpacity>
          </View>
        ) : null}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            if (screenMode === "CREATE") {
              Alert.alert(
                "Thoát trình tạo Trail?",
                "Dữ liệu chưa lưu trong form sẽ bị mất.",
                [
                  { text: "Ở lại", style: "cancel" },
                  {
                    text: "Thoát",
                    style: "destructive",
                    onPress: closeBuilder,
                  },
                ],
              );
              return;
            }

            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={21} color={Colors.onSurface} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>
            {screenMode === "LIST" ? "Personal Trail" : "Tạo Personal Trail"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {screenMode === "LIST"
              ? "Route cá nhân & xác minh"
              : `Bước ${step}/4`}
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {screenMode === "LIST" ? renderList() : renderBuilder()}
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
    fontSize: 16,
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
  overviewCard: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.hover,
  },
  overviewIcon: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryPale,
  },
  overviewTitle: {
    color: Colors.onSurface,
    fontSize: 16,
    fontWeight: "900",
  },
  overviewDescription: {
    marginTop: 4,
    color: Colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 16,
  },
  statRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  statCard: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  statValue: {
    color: Colors.onSurface,
    fontSize: 20,
    fontWeight: "900",
  },
  statLabel: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontSize: 9,
  },
  createButton: {
    minHeight: 52,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
    ...Shadows.card,
  },
  createButtonText: {
    color: Colors.onPrimary,
    fontSize: 14,
    fontWeight: "900",
  },
  filterRow: {
    paddingVertical: 15,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
  },
  filterChipActive: {
    backgroundColor: Colors.ink,
  },
  filterChipText: {
    color: Colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: Colors.inverseOnSurface,
    fontWeight: "900",
  },
  trailList: {
    gap: 11,
  },
  trailCard: {
    padding: 15,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  trailCardTop: {
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: Radius.full,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: "900",
  },
  trailName: {
    color: Colors.onSurface,
    fontSize: 16,
    fontWeight: "900",
  },
  trailRegion: {
    marginTop: 3,
    color: Colors.onSurfaceVariant,
    fontSize: 11,
  },
  trailStats: {
    marginTop: 12,
    flexDirection: "row",
    gap: 12,
  },
  trailStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trailStatText: {
    color: Colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: "700",
  },
  rejectionNotice: {
    marginTop: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    borderRadius: Radius.md,
    backgroundColor: "#FEF2F2",
  },
  rejectionText: {
    flex: 1,
    color: "#B91C1C",
    fontSize: 10,
    lineHeight: 15,
  },
  updatedRow: {
    marginTop: 12,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainer,
  },
  updatedText: {
    color: Colors.onSurfaceVariant,
    fontSize: 9,
  },
  visibilityText: {
    color: Colors.primaryDark,
    fontSize: 9,
    fontWeight: "800",
  },
  emptyState: {
    marginTop: 20,
    padding: 28,
    alignItems: "center",
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLow,
  },
  emptyTitle: {
    marginTop: 10,
    color: Colors.onSurface,
    fontSize: 14,
    fontWeight: "900",
  },
  emptyDescription: {
    marginTop: 4,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
  },
  stepIndicator: {
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  stepItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  stepCircle: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  stepCircleActive: {
    borderColor: Colors.primaryContainer,
    backgroundColor: Colors.primaryContainer,
  },
  stepNumber: {
    color: Colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: "900",
  },
  stepNumberActive: {
    color: Colors.onPrimary,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  stepLineActive: {
    backgroundColor: Colors.primaryContainer,
  },
  builderCard: {
    padding: 16,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  stepTitle: {
    color: Colors.onSurface,
    fontSize: 18,
    fontWeight: "900",
  },
  stepDescription: {
    marginTop: 4,
    marginBottom: 17,
    color: Colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 17,
  },
  label: {
    marginTop: 12,
    marginBottom: 6,
    color: Colors.onSurface,
    fontSize: 11,
    fontWeight: "800",
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    color: Colors.onSurface,
    fontSize: 12,
  },
  textArea: {
    minHeight: 110,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    color: Colors.onSurface,
    fontSize: 12,
    lineHeight: 18,
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  choiceChip: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  choiceChipActive: {
    borderColor: Colors.primaryContainer,
    backgroundColor: Colors.primaryContainer,
  },
  choiceChipText: {
    color: Colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: "700",
  },
  choiceChipTextActive: {
    color: Colors.onPrimary,
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: 9,
  },
  column: {
    flex: 1,
  },
  routePresetList: {
    gap: 8,
  },
  routePresetCard: {
    minHeight: 64,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  routePresetCardActive: {
    borderColor: Colors.primaryDark,
    backgroundColor: Colors.primaryPale,
  },
  routePresetIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainer,
  },
  routePresetTitle: {
    color: Colors.onSurface,
    fontSize: 12,
    fontWeight: "900",
  },
  routePresetDescription: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontSize: 9,
  },
  mapCard: {
    marginTop: 14,
    overflow: "hidden",
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  mapHeader: {
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mapTitle: {
    color: Colors.onSurface,
    fontSize: 12,
    fontWeight: "900",
  },
  mapSubtitle: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontSize: 9,
  },
  offlineBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: Radius.full,
    backgroundColor: "#FFF7D6",
  },
  offlineBadgeText: {
    color: "#725C00",
    fontSize: 8,
    fontWeight: "900",
  },
  infoNotice: {
    marginTop: 12,
    padding: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryPale,
  },
  infoNoticeText: {
    flex: 1,
    color: Colors.primaryDark,
    fontSize: 10,
    lineHeight: 15,
  },
  checkpointForm: {
    padding: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  addCheckpointButton: {
    minHeight: 44,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryPale,
  },
  addCheckpointText: {
    color: Colors.primaryDark,
    fontSize: 11,
    fontWeight: "900",
  },
  checkpointList: {
    marginTop: 12,
    gap: 8,
  },
  checkpointEmpty: {
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.md,
  },
  checkpointEmptyText: {
    color: Colors.onSurfaceVariant,
    fontSize: 10,
  },
  checkpointRow: {
    minHeight: 58,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
  },
  checkpointOrder: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
  },
  checkpointOrderText: {
    color: Colors.onPrimary,
    fontSize: 11,
    fontWeight: "900",
  },
  checkpointName: {
    color: Colors.onSurface,
    fontSize: 12,
    fontWeight: "800",
  },
  checkpointMeta: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontSize: 9,
  },
  removeCheckpointButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: "#FEE2E2",
  },
  reviewCard: {
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  reviewTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reviewIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryPale,
  },
  reviewName: {
    color: Colors.onSurface,
    fontSize: 15,
    fontWeight: "900",
  },
  reviewRegion: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
  },
  reviewGrid: {
    marginTop: 13,
    flexDirection: "row",
    gap: 7,
  },
  reviewStat: {
    flex: 1,
    padding: 9,
    alignItems: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  reviewStatValue: {
    color: Colors.onSurface,
    fontSize: 12,
    fontWeight: "900",
  },
  reviewStatLabel: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontSize: 8,
  },
  reviewDescription: {
    marginTop: 12,
    color: Colors.onSurfaceVariant,
    fontSize: 10,
    lineHeight: 16,
  },
  savePrivateCard: {
    minHeight: 70,
    marginTop: 13,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryPale,
  },
  submitVerificationCard: {
    minHeight: 76,
    marginTop: 9,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryContainer,
  },
  optionIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  optionIconDark: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  optionTitle: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
  },
  optionDescription: {
    marginTop: 2,
    color: Colors.primaryDark,
    fontSize: 9,
    lineHeight: 14,
  },
  submitOptionTitle: {
    color: Colors.onPrimary,
    fontSize: 12,
    fontWeight: "900",
  },
  submitOptionDescription: {
    marginTop: 2,
    color: Colors.onPrimary,
    fontSize: 9,
    lineHeight: 14,
    opacity: 0.85,
  },
  builderActions: {
    marginTop: 12,
    flexDirection: "row",
    gap: 9,
  },
  backStepButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  backStepText: {
    color: Colors.onSurface,
    fontSize: 12,
    fontWeight: "800",
  },
  nextStepButton: {
    flex: 2,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
  },
  nextStepText: {
    color: Colors.onPrimary,
    fontSize: 13,
    fontWeight: "900",
  },
});
