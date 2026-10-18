import { Colors, Radius } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export interface CreateTripBasicInfoStepProps {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  onChangeTitle: (val: string) => void;
  onChangeDescription: (val: string) => void;
  onChangeStartAt: (val: string) => void;
  onChangeEndAt: (val: string) => void;
}

export function CreateTripBasicInfoStep({
  title,
  description,
  startAt,
  endAt,
  onChangeTitle,
  onChangeDescription,
  onChangeStartAt,
  onChangeEndAt,
}: CreateTripBasicInfoStepProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>Bước 2: Thông tin chuyến đi</Text>
      <Text style={styles.stepDescription}>
        Đặt tên và ghi chú thời gian khởi hành để các thành viên nắm rõ lịch trình.
      </Text>

      {/* Title */}
      <View style={styles.field}>
        <Text style={styles.label}>
          Tên chuyến đi <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Ví dụ: Cuối tuần leo Núi Chứa Chan"
          placeholderTextColor={Colors.mute}
          value={title}
          onChangeText={onChangeTitle}
          maxLength={150}
        />
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text style={styles.label}>Mô tả / Ghi chú cho đoàn</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ví dụ: Mang theo lều, đồ ăn nhẹ và 2 lít nước..."
          placeholderTextColor={Colors.mute}
          value={description}
          onChangeText={onChangeDescription}
          multiline
          numberOfLines={3}
          maxLength={5000}
        />
      </View>

      {/* Time inputs */}
      <View style={styles.row}>
        <View style={[styles.field, styles.flexOne]}>
          <Text style={styles.label}>
            Ngày giờ bắt đầu <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.inputWithIcon}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={Colors.primaryDark}
            />
            <TextInput
              style={styles.inputBare}
              placeholder="YYYY-MM-DDTHH:mm"
              placeholderTextColor={Colors.mute}
              value={startAt}
              onChangeText={onChangeStartAt}
            />
          </View>
        </View>

        <View style={[styles.field, styles.flexOne]}>
          <Text style={styles.label}>
            Ngày giờ kết thúc <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.inputWithIcon}>
            <Ionicons
              name="time-outline"
              size={18}
              color={Colors.primaryDark}
            />
            <TextInput
              style={styles.inputBare}
              placeholder="YYYY-MM-DDTHH:mm"
              placeholderTextColor={Colors.mute}
              value={endAt}
              onChangeText={onChangeEndAt}
            />
          </View>
        </View>
      </View>

      <View style={styles.noticeBox}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.primaryDark} />
        <Text style={styles.noticeText}>
          Thời gian khởi hành phải ở tương lai và ngày kết thúc phải sau ngày bắt đầu.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.onSurface,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: 16,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
    marginBottom: 6,
  },
  required: {
    color: "#DC2626",
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLow,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flexOne: {
    flex: 1,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceContainerLow,
  },
  inputBare: {
    flex: 1,
    fontSize: 13,
    color: Colors.onSurface,
    padding: 0,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
    marginTop: 4,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 16,
  },
});
