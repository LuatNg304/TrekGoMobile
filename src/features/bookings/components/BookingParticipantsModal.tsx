import { Colors, Radius, Shadows } from "@/constants/theme";
import { useAuth } from "@/features/auth/AuthContext";
import { useBookingMutations } from "@/features/bookings/hooks";
import type { Participant, PublicBookingTrip } from "@/features/bookings/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface BookingParticipantsModalProps {
  visible: boolean;
  trip: PublicBookingTrip;
  onClose: () => void;
  onSuccess?: (bookingId: string) => void;
}

interface ParticipantFormState {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

function createEmptyParticipant(): ParticipantFormState {
  return {
    fullName: "",
    phone: "",
    dateOfBirth: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  };
}

export function BookingParticipantsModal({
  visible,
  trip,
  onClose,
  onSuccess,
}: BookingParticipantsModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { createBooking, isSubmitting } = useBookingMutations();

  const [participants, setParticipants] = useState<ParticipantFormState[]>([
    createEmptyParticipant(),
  ]);

  // Pre-fill participant #1 with logged-in user profile
  useEffect(() => {
    if (visible && user) {
      setParticipants([
        {
          fullName: user.fullName || user.name || "",
          phone: user.phone || "",
          dateOfBirth: "",
          emergencyContactName: "",
          emergencyContactPhone: "",
        },
      ]);
    } else if (visible) {
      setParticipants([createEmptyParticipant()]);
    }
  }, [visible, user]);

  const maxSlots = Math.max(1, trip.remainingSlots || trip.capacity || 1);
  const currentCount = participants.length;

  function handleAddParticipant() {
    if (currentCount >= maxSlots) {
      Alert.alert(
        "Giới hạn số chỗ",
        `Chuyến đi hiện chỉ còn ${maxSlots} chỗ trống.`,
      );
      return;
    }
    setParticipants((prev) => [...prev, createEmptyParticipant()]);
  }

  function handleRemoveParticipant(index: number) {
    if (participants.length <= 1) return;
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  }

  function handleFieldChange(
    index: number,
    field: keyof ParticipantFormState,
    value: string,
  ) {
    setParticipants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  // Calculate pricing
  const unitPrice = parseFloat(trip.pricePerPax || "0");
  const totalAmount = unitPrice * currentCount;

  async function handleSubmit() {
    // 1. Validation
    const todayStr = new Date().toISOString().split("T")[0];
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      if (!p.fullName.trim()) {
        Alert.alert(
          "Thiếu thông tin",
          `Vui lòng nhập họ và tên cho thành viên #${i + 1}.`,
        );
        return;
      }

      if (p.phone.trim() && p.phone.trim().length < 5) {
        Alert.alert(
          "Số điện thoại không hợp lệ",
          `Số điện thoại thành viên #${i + 1} phải có ít nhất 5 chữ số.`,
        );
        return;
      }

      if (p.dateOfBirth.trim()) {
        if (!dateRegex.test(p.dateOfBirth.trim())) {
          Alert.alert(
            "Ngày sinh sai định dạng",
            `Ngày sinh thành viên #${i + 1} phải theo định dạng YYYY-MM-DD (ví dụ: 1998-05-20).`,
          );
          return;
        }
        if (p.dateOfBirth.trim() > todayStr) {
          Alert.alert(
            "Ngày sinh không hợp lệ",
            `Ngày sinh thành viên #${i + 1} không được vượt quá ngày hiện tại.`,
          );
          return;
        }
      }
    }

    // 2. Format payload
    const formatted: Participant[] = participants.map((p) => ({
      fullName: p.fullName.trim(),
      phone: p.phone.trim() || undefined,
      dateOfBirth: p.dateOfBirth.trim() || undefined,
      emergencyContactName: p.emergencyContactName.trim() || undefined,
      emergencyContactPhone: p.emergencyContactPhone.trim() || undefined,
    }));

    // 3. Submit
    try {
      const booking = await createBooking(trip.id, formatted);
      onClose();
      if (onSuccess) {
        onSuccess(booking.id);
      } else {
        router.push({
          pathname: "/bookings/[id]",
          params: { id: booking.id },
        } as any);
      }
    } catch (err: any) {
      const errDetails = err?.details as any;
      const existingBookingId = errDetails?.bookingId || err?.bookingId;

      if (err?.code === "ACTIVE_BOOKING_EXISTS" && existingBookingId) {
        Alert.alert(
          "Đã có đặt chỗ",
          "Bạn đã có một đơn đặt chỗ cho chuyến đi này đang chờ xử lý.",
          [
            { text: "Ở lại", style: "cancel" },
            {
              text: "Xem đặt chỗ",
              onPress: () => {
                onClose();
                router.push({
                  pathname: "/bookings/[id]",
                  params: { id: existingBookingId },
                } as any);
              },
            },
          ],
        );
        return;
      }

      Alert.alert(
        "Lỗi đặt chỗ",
        err?.message || "Không thể khởi tạo đặt chỗ lúc này. Vui lòng thử lại.",
      );
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardContainer}
        >
          <View style={styles.sheetContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerEyebrow}>CF02 • PUBLIC TRIP BOOKING</Text>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Đặt chỗ: {trip.title}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Trip Info Quick Bar */}
            <View style={styles.tripMetaBar}>
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={15} color={Colors.primaryDark} />
                <Text style={styles.metaText}>
                  Còn trống: <Text style={styles.metaBold}>{trip.remainingSlots}</Text>/{trip.capacity} chỗ
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="pricetag-outline" size={15} color={Colors.primaryDark} />
                <Text style={styles.metaText}>
                  {unitPrice.toLocaleString("vi-VN")} đ / người
                </Text>
              </View>
            </View>

            {/* Scrollable Form */}
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>
                  Danh sách thành viên tham gia ({currentCount})
                </Text>
                {currentCount < maxSlots && (
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={handleAddParticipant}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="person-add-outline" size={14} color={Colors.primaryDark} />
                    <Text style={styles.addBtnText}>Thêm người</Text>
                  </TouchableOpacity>
                )}
              </View>

              {participants.map((p, index) => (
                <View key={index} style={styles.participantCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={styles.badgeIndex}>
                        <Text style={styles.badgeIndexText}>#{index + 1}</Text>
                      </View>
                      <Text style={styles.cardTitle}>
                        {index === 0 ? "Người đại diện đặt chỗ" : `Thành viên #${index + 1}`}
                      </Text>
                    </View>
                    {index > 0 && (
                      <TouchableOpacity
                        onPress={() => handleRemoveParticipant(index)}
                        style={styles.removeBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Họ và tên */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Họ và tên <Text style={styles.requiredMark}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Nguyễn Văn A"
                      placeholderTextColor={Colors.onSurfaceMuted}
                      value={p.fullName}
                      onChangeText={(val) => handleFieldChange(index, "fullName", val)}
                    />
                  </View>

                  {/* Số điện thoại & Ngày sinh */}
                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, styles.flex1]}>
                      <Text style={styles.inputLabel}>Số điện thoại</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="0901234567"
                        placeholderTextColor={Colors.onSurfaceMuted}
                        keyboardType="phone-pad"
                        value={p.phone}
                        onChangeText={(val) => handleFieldChange(index, "phone", val)}
                      />
                    </View>
                    <View style={[styles.inputGroup, styles.flex1]}>
                      <Text style={styles.inputLabel}>Ngày sinh (YYYY-MM-DD)</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="1998-05-20"
                        placeholderTextColor={Colors.onSurfaceMuted}
                        value={p.dateOfBirth}
                        onChangeText={(val) => handleFieldChange(index, "dateOfBirth", val)}
                      />
                    </View>
                  </View>

                  {/* Thông tin liên hệ khẩn cấp */}
                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, styles.flex1]}>
                      <Text style={styles.inputLabel}>Người liên hệ khẩn cấp</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Tên người thân"
                        placeholderTextColor={Colors.onSurfaceMuted}
                        value={p.emergencyContactName}
                        onChangeText={(val) =>
                          handleFieldChange(index, "emergencyContactName", val)
                        }
                      />
                    </View>
                    <View style={[styles.inputGroup, styles.flex1]}>
                      <Text style={styles.inputLabel}>SĐT khẩn cấp</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="0909876543"
                        placeholderTextColor={Colors.onSurfaceMuted}
                        keyboardType="phone-pad"
                        value={p.emergencyContactPhone}
                        onChangeText={(val) =>
                          handleFieldChange(index, "emergencyContactPhone", val)
                        }
                      />
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Bottom Sticky Action Bar */}
            <View style={styles.footer}>
              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceLabel}>
                    Tổng cộng ({currentCount} người):
                  </Text>
                  <Text style={styles.priceValue}>
                    {totalAmount.toLocaleString("vi-VN")} đ
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  activeOpacity={0.88}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>Giữ chỗ & Tiếp tục</Text>
                      <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: "92%",
    minHeight: "65%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 10,
  },
  headerEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.primaryDark,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.onSurface,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  tripMetaBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  metaBold: {
    fontWeight: "700",
    color: Colors.primaryDark,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 30,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryPale,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primaryDark,
  },
  participantCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerLow,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badgeIndex: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeIndexText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  removeBtn: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  flex1: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.onSurfaceVariant,
    marginBottom: 4,
  },
  requiredMark: {
    color: "#DC2626",
  },
  textInput: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: Colors.onSurface,
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainer,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  priceLabel: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.primaryDark,
    marginTop: 2,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
