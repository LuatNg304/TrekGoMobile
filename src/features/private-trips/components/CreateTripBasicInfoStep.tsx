import { Colors, Radius, Shadows } from "@/constants/theme";
import { WheelDatePickerModal } from "@/features/leaders/components";
import { parseVnDate } from "@/features/leaders/utils/tripDateUtils";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

function padZero(n: number): string {
  return String(n).padStart(2, "0");
}

function parseIsoToParts(isoString: string): { dateStr: string; timeStr: string } {
  if (!isoString) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return {
      dateStr: `${padZero(d.getDate())}/${padZero(d.getMonth() + 1)}/${d.getFullYear()}`,
      timeStr: "06:00",
    };
  }

  const d = new Date(isoString);
  if (isNaN(d.getTime())) {
    return { dateStr: "", timeStr: "06:00" };
  }

  return {
    dateStr: `${padZero(d.getDate())}/${padZero(d.getMonth() + 1)}/${d.getFullYear()}`,
    timeStr: `${padZero(d.getHours())}:${padZero(d.getMinutes())}`,
  };
}

function partsToIso(dateStr: string, timeStr: string): string | null {
  const parts = dateStr.includes("/") ? dateStr.split("/") : dateStr.includes("-") ? dateStr.split("-") : [];
  if (parts.length !== 3) return null;

  let day: number, month: number, year: number;
  if (parts[0].length === 4) {
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    year = parseInt(parts[2], 10);
  }

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  const [hStr, mStr] = (timeStr || "06:00").split(":");
  const hours = parseInt(hStr, 10) || 0;
  const minutes = parseInt(mStr, 10) || 0;

  const d = new Date(year, month, day, hours, minutes, 0, 0);
  if (isNaN(d.getTime())) return null;

  return d.toISOString();
}

function getDayOfWeek(dateStr: string): string {
  const parts = dateStr.includes("/") ? dateStr.split("/") : dateStr.includes("-") ? dateStr.split("-") : [];
  if (parts.length !== 3) return "";

  let day: number, month: number, year: number;
  if (parts[0].length === 4) {
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    year = parseInt(parts[2], 10);
  }

  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return "";

  const days = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
  return days[d.getDay()];
}

function computeDurationText(startIso: string, endIso: string): { durationText: string; isInvalid: boolean } {
  const s = new Date(startIso);
  const e = new Date(endIso);

  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    return { durationText: "Chưa xác định", isInvalid: false };
  }

  const diffMs = e.getTime() - s.getTime();
  if (diffMs <= 0) {
    return { durationText: "Thời gian kết thúc phải sau thời gian bắt đầu", isInvalid: true };
  }

  const totalHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  const days = Math.max(1, diffDays);
  const nights = Math.max(0, days - 1);

  const label = nights === 0 ? "Trong ngày" : `${days}N${nights}Đ (${days} ngày ${nights} đêm)`;
  return { durationText: `${label} • Khoảng ${totalHours} tiếng`, isInvalid: false };
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

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
  // Local state for formatted inputs
  const initialStart = useMemo(() => parseIsoToParts(startAt), [startAt]);
  const initialEnd = useMemo(() => parseIsoToParts(endAt), [endAt]);

  const [startDateInput, setStartDateInput] = useState(initialStart.dateStr);
  const [startTimeInput, setStartTimeInput] = useState(initialStart.timeStr);
  const [endDateInput, setEndDateInput] = useState(initialEnd.dateStr);
  const [endTimeInput, setEndTimeInput] = useState(initialEnd.timeStr);
  const [datePickerTarget, setDatePickerTarget] = useState<"start" | "end" | null>(null);

  // Sync back if parent props change externally
  useEffect(() => {
    const s = parseIsoToParts(startAt);
    if (s.dateStr) setStartDateInput(s.dateStr);
    if (s.timeStr) setStartTimeInput(s.timeStr);
  }, [startAt]);

  useEffect(() => {
    const e = parseIsoToParts(endAt);
    if (e.dateStr) setEndDateInput(e.dateStr);
    if (e.timeStr) setEndTimeInput(e.timeStr);
  }, [endAt]);

  // Update startAt ISO
  function handleUpdateStart(date: string, time: string) {
    setStartDateInput(date);
    setStartTimeInput(time);
    const iso = partsToIso(date, time);
    if (iso) {
      onChangeStartAt(iso);
    }
  }

  // Update endAt ISO
  function handleUpdateEnd(date: string, time: string) {
    setEndDateInput(date);
    setEndTimeInput(time);
    const iso = partsToIso(date, time);
    if (iso) {
      onChangeEndAt(iso);
    }
  }

  // Handle confirm from WheelDatePickerModal
  function handleConfirmWheelDate(dateStr: string) {
    if (datePickerTarget === "start") {
      handleUpdateStart(dateStr, startTimeInput);
      // Gợi ý ngày kết thúc nếu endDate trống hoặc nhỏ hơn startDate
      const s = parseVnDate(dateStr);
      const e = parseVnDate(endDateInput);
      if (s && (!e || e.getTime() < s.getTime())) {
        const next = new Date(s);
        next.setDate(next.getDate() + 1); // Mặc định 2 ngày 1 đêm
        const nextStr = `${String(next.getDate()).padStart(2, "0")}/${String(next.getMonth() + 1).padStart(2, "0")}/${next.getFullYear()}`;
        handleUpdateEnd(nextStr, endTimeInput);
      }
    } else if (datePickerTarget === "end") {
      handleUpdateEnd(dateStr, endTimeInput);
    }
    setDatePickerTarget(null);
  }

  // Quick preset handlers
  function applyPreset(daysFromNow: number, tripDays: number, startHour = 6, endHour = 18) {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() + daysFromNow);
    start.setHours(startHour, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + (tripDays - 1));
    end.setHours(endHour, 0, 0, 0);

    const sParts = {
      dateStr: `${padZero(start.getDate())}/${padZero(start.getMonth() + 1)}/${start.getFullYear()}`,
      timeStr: `${padZero(startHour)}:00`,
    };
    const eParts = {
      dateStr: `${padZero(end.getDate())}/${padZero(end.getMonth() + 1)}/${end.getFullYear()}`,
      timeStr: `${padZero(endHour)}:00`,
    };

    setStartDateInput(sParts.dateStr);
    setStartTimeInput(sParts.timeStr);
    setEndDateInput(eParts.dateStr);
    setEndTimeInput(eParts.timeStr);

    onChangeStartAt(start.toISOString());
    onChangeEndAt(end.toISOString());
  }

  // Presets calculation
  const quickPresets = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToSaturday = (6 - day + 7) % 7 || 7;
    const diffToNextSat = diffToSaturday + 7;
    const diffToFriday = (5 - day + 7) % 7 || 7;

    return [
      {
        label: "Cuối tuần tới",
        sub: "2N1Đ (T7 - CN)",
        action: () => applyPreset(diffToSaturday, 2, 6, 18),
      },
      {
        label: "Tuần sau đó",
        sub: "2N1Đ (T7 - CN)",
        action: () => applyPreset(diffToNextSat, 2, 6, 18),
      },
      {
        label: "Tour 3N2Đ",
        sub: "Thứ 6 - CN",
        action: () => applyPreset(diffToFriday, 3, 6, 18),
      },
      {
        label: "Trong ngày",
        sub: "Chủ Nhật (1N)",
        action: () => applyPreset(diffToSaturday + 1, 1, 5, 17),
      },
    ];
  }, []);

  const startDayName = useMemo(() => getDayOfWeek(startDateInput), [startDateInput]);
  const endDayName = useMemo(() => getDayOfWeek(endDateInput), [endDateInput]);
  const { durationText, isInvalid: isTimeInvalid } = useMemo(
    () => computeDurationText(startAt, endAt),
    [startAt, endAt],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>Bước 2: Thông tin chuyến đi</Text>
      <Text style={styles.stepDescription}>
        Đặt tên và ghi chú thời gian khởi hành để các thành viên nắm rõ lịch trình.
      </Text>

      {/* 1. Tên chuyến đi */}
      <View style={styles.field}>
        <Text style={styles.label}>
          Tên chuyến đi <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Ví dụ: Chuyến đi: Cung đường Cột Điện - Đỉnh Núi Bà Đen"
          placeholderTextColor={Colors.mute}
          value={title}
          onChangeText={onChangeTitle}
          maxLength={150}
        />
      </View>

      {/* 2. Mô tả / Ghi chú */}
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

      {/* 3. Lịch trình chuyến đi (Thân thiện, trực quan) */}
      <View style={styles.scheduleCard}>
        <View style={styles.scheduleCardHeader}>
          <View style={styles.scheduleTitleRow}>
            <Ionicons name="calendar" size={18} color={Colors.primaryDark} />
            <Text style={styles.scheduleTitle}>Thời gian & Lịch trình</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Dễ nhập & Tự động tính</Text>
          </View>
        </View>

        {/* Quick Presets */}
        <Text style={styles.presetsLabel}>Chọn nhanh lịch trình phổ biến:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsScroll}
        >
          {quickPresets.map((preset, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.presetChip}
              onPress={preset.action}
              activeOpacity={0.75}
            >
              <Ionicons name="flash-outline" size={12} color={Colors.primaryDark} />
              <View>
                <Text style={styles.presetChipLabel}>{preset.label}</Text>
                <Text style={styles.presetChipSub}>{preset.sub}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Date Time Picker Inputs */}
        <View style={styles.dateTimeGrid}>
          {/* Cột Ngày giờ bắt đầu */}
          <View style={styles.dateTimeCol}>
            <View style={styles.colHeader}>
              <Ionicons name="flag-outline" size={14} color="#059669" />
              <Text style={styles.colTitle}>Khởi hành *</Text>
            </View>

            <View style={styles.timeCard}>
              {/* Ngày */}
              <TouchableOpacity
                style={styles.inputSubRow}
                onPress={() => setDatePickerTarget("start")}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={16} color={Colors.primaryDark} />
                <Text
                  style={[
                    styles.dateDisplayValue,
                    !startDateInput && styles.datePlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {startDateInput || "DD/MM/YYYY"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color={Colors.onSurfaceVariant}
                  style={{ marginLeft: "auto" }}
                />
              </TouchableOpacity>

              {startDayName ? (
                <View style={styles.dayTag}>
                  <Text style={styles.dayTagText}>{startDayName}</Text>
                </View>
              ) : null}

              {/* Giờ xuất phát */}
              <View style={styles.timeSubRow}>
                <Ionicons name="time-outline" size={16} color={Colors.primaryDark} />
                <TextInput
                  style={styles.timeTextInput}
                  placeholder="06:00"
                  placeholderTextColor={Colors.mute}
                  value={startTimeInput}
                  onChangeText={(val) => handleUpdateStart(startDateInput, val)}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>

              {/* Quick time pills */}
              <View style={styles.quickTimeRow}>
                {["05:30", "06:00", "07:00"].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.quickTimePill,
                      startTimeInput === t && styles.quickTimePillActive,
                    ]}
                    onPress={() => handleUpdateStart(startDateInput, t)}
                  >
                    <Text
                      style={[
                        styles.quickTimeText,
                        startTimeInput === t && styles.quickTimeTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Cột Ngày giờ kết thúc */}
          <View style={styles.dateTimeCol}>
            <View style={styles.colHeader}>
              <Ionicons name="checkmark-done-circle-outline" size={14} color="#0284C7" />
              <Text style={styles.colTitle}>Dự kiến về *</Text>
            </View>

            <View style={styles.timeCard}>
              {/* Ngày */}
              <TouchableOpacity
                style={styles.inputSubRow}
                onPress={() => setDatePickerTarget("end")}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={16} color="#0284C7" />
                <Text
                  style={[
                    styles.dateDisplayValue,
                    !endDateInput && styles.datePlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {endDateInput || "DD/MM/YYYY"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color={Colors.onSurfaceVariant}
                  style={{ marginLeft: "auto" }}
                />
              </TouchableOpacity>

              {endDayName ? (
                <View style={[styles.dayTag, styles.dayTagEnd]}>
                  <Text style={[styles.dayTagText, styles.dayTagTextEnd]}>
                    {endDayName}
                  </Text>
                </View>
              ) : null}

              {/* Giờ về */}
              <View style={styles.timeSubRow}>
                <Ionicons name="time-outline" size={16} color="#0284C7" />
                <TextInput
                  style={styles.timeTextInput}
                  placeholder="18:00"
                  placeholderTextColor={Colors.mute}
                  value={endTimeInput}
                  onChangeText={(val) => handleUpdateEnd(endDateInput, val)}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>

              {/* Quick time pills */}
              <View style={styles.quickTimeRow}>
                {["16:00", "17:00", "18:00"].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.quickTimePill,
                      endTimeInput === t && styles.quickTimePillActiveEnd,
                    ]}
                    onPress={() => handleUpdateEnd(endDateInput, t)}
                  >
                    <Text
                      style={[
                        styles.quickTimeText,
                        endTimeInput === t && styles.quickTimeTextActiveEnd,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Duration summary bar */}
        <View
          style={[
            styles.durationBar,
            isTimeInvalid && styles.durationBarError,
          ]}
        >
          <Ionicons
            name={isTimeInvalid ? "alert-circle" : "hourglass-outline"}
            size={16}
            color={isTimeInvalid ? "#DC2626" : Colors.primaryDark}
          />
          <Text
            style={[
              styles.durationText,
              isTimeInvalid && styles.durationTextError,
            ]}
          >
            {durationText}
          </Text>
        </View>
      </View>

      {/* Wheel Date Picker Modals */}
      <WheelDatePickerModal
        visible={datePickerTarget === "start"}
        title="Chọn ngày khởi hành"
        initialDate={startDateInput}
        minDate={new Date()}
        onClose={() => setDatePickerTarget(null)}
        onConfirm={handleConfirmWheelDate}
      />

      <WheelDatePickerModal
        visible={datePickerTarget === "end"}
        title="Chọn ngày dự kiến về"
        initialDate={endDateInput || startDateInput}
        minDate={parseVnDate(startDateInput) || new Date()}
        onClose={() => setDatePickerTarget(null)}
        onConfirm={handleConfirmWheelDate}
      />
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
  scheduleCard: {
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    ...Shadows.card,
    marginBottom: 16,
  },
  scheduleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  scheduleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: "#DCFCE7",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  presetsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.onSurfaceVariant,
    marginBottom: 8,
  },
  presetsScroll: {
    gap: 8,
    paddingBottom: 12,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  presetChipLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primaryDark,
  },
  presetChipSub: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  dateTimeGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  dateTimeCol: {
    flex: 1,
  },
  colHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  colTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  timeCard: {
    padding: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
    gap: 6,
  },
  inputSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  dateDisplayValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  datePlaceholder: {
    color: Colors.mute,
    fontWeight: "400",
  },
  dayTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: "#DCFCE7",
  },
  dayTagEnd: {
    backgroundColor: "#E0F2FE",
  },
  dayTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  dayTagTextEnd: {
    color: "#0284C7",
  },
  timeSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  timeTextInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
    padding: 0,
  },
  quickTimeRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 2,
  },
  quickTimePill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 3,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  quickTimePillActive: {
    backgroundColor: "#DCFCE7",
    borderColor: Colors.primaryDark,
  },
  quickTimePillActiveEnd: {
    backgroundColor: "#E0F2FE",
    borderColor: "#0284C7",
  },
  quickTimeText: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    fontWeight: "600",
  },
  quickTimeTextActive: {
    color: Colors.primaryDark,
    fontWeight: "700",
  },
  quickTimeTextActiveEnd: {
    color: "#0284C7",
    fontWeight: "700",
  },
  durationBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: Radius.md,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginTop: 10,
  },
  durationBarError: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  durationText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  durationTextError: {
    color: "#DC2626",
  },
});
