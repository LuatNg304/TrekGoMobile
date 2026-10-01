import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

interface CreatePrivateTripModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CreatePrivateTripModal: React.FC<CreatePrivateTripModalProps> = ({
  visible,
  onClose,
}) => {
  const { trails, createPrivateTrip } = useApp();
  const [tripName, setTripName] = useState('Chinh phục đỉnh núi cùng bạn bè');
  const [selectedTrailId, setSelectedTrailId] = useState(trails[1]?.id || trails[0].id);
  const [capacity, setCapacity] = useState('6');
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);

  const handleCreate = () => {
    const selectedTrail = trails.find(t => t.id === selectedTrailId) || trails[0];
    const generatedCode = 'TG-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    
    createPrivateTrip({
      name: tripName,
      trailId: selectedTrail.id,
      destination: selectedTrail.region,
      capacity: parseInt(capacity) || 6,
      inviteCode: generatedCode,
    });

    setCreatedInviteCode(generatedCode);
  };

  const handleDone = () => {
    setCreatedInviteCode(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.dragHandle} />

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {createdInviteCode ? (
              // Success Screen with Invite Code
              <View style={styles.successBox}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={48} color={Colors.primaryDark} />
                </View>
                <Text style={styles.successTitle}>Đã Tạo Private Trip Thành Công!</Text>
                <Text style={styles.successDesc}>
                  Chuyến trekking riêng của bạn đã sẵn sàng. Hãy gửi mã mời bên dưới cho các thành viên trong đoàn để cùng tham gia.
                </Text>

                <View style={styles.codeContainer}>
                  <Text style={styles.codeLabel}>MÃ MỜI THÀNH VIÊN (INVITE CODE)</Text>
                  <Text style={styles.codeText}>{createdInviteCode}</Text>
                  <TouchableOpacity style={styles.copyButton} activeOpacity={0.8}>
                    <Ionicons name="copy-outline" size={16} color={Colors.ink} />
                    <Text style={styles.copyText}>Sao chép liên kết mời</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleDone}>
                  <Text style={styles.submitBtnText}>Quay lại danh sách chuyến đi</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Form Screen
              <View>
                <View style={styles.header}>
                  <View style={styles.privatePill}>
                    <Ionicons name="lock-closed" size={12} color="#564500" />
                    <Text style={styles.privatePillText}>PRIVATE TRIP HOST</Text>
                  </View>
                  <Text style={styles.title}>Tạo Chuyến Đi Riêng Tư</Text>
                  <Text style={styles.subtitle}>
                    Tự do lựa chọn cung đường, thiết lập sĩ số và mời bạn bè tham gia bằng mã code bảo mật.
                  </Text>
                </View>

                {/* Trip Name input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Tên chuyến đi:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={tripName}
                    onChangeText={setTripName}
                    placeholder="VD: Săn mây Tà Xùa cùng Team Dev"
                  />
                </View>

                {/* Select Trail */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Chọn Cung Đường (Trail):</Text>
                  <View style={styles.trailList}>
                    {trails.map(t => (
                      <TouchableOpacity
                        key={t.id}
                        style={[
                          styles.trailOption,
                          selectedTrailId === t.id && styles.trailOptionSelected,
                        ]}
                        onPress={() => setSelectedTrailId(t.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={selectedTrailId === t.id ? 'radio-button-on' : 'radio-button-off'}
                          size={16}
                          color={selectedTrailId === t.id ? Colors.primaryDark : Colors.onSurfaceVariant}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.trailOptionName}>{t.name}</Text>
                          <Text style={styles.trailOptionMeta}>{t.region} · {t.distanceKm}km · {t.difficulty}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Capacity */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Số lượng thành viên tối đa:</Text>
                  <View style={styles.capacityRow}>
                    {['4', '6', '8', '12', '16'].map(num => (
                      <TouchableOpacity
                        key={num}
                        style={[styles.capacityPill, capacity === num && styles.capacityPillActive]}
                        onPress={() => setCapacity(num)}
                      >
                        <Text style={[styles.capacityText, capacity === num && styles.capacityTextActive]}>
                          {num} người
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Submit button */}
                <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} activeOpacity={0.85}>
                  <Ionicons name="add-circle" size={20} color={Colors.onPrimary} />
                  <Text style={styles.submitBtnText}>Tạo Chuyến Đi & Nhận Mã Mời</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '88%',
    ...Shadows.hover,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHighest,
    alignSelf: 'center',
    marginBottom: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  header: {
    marginBottom: 16,
  },
  privatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.tertiaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  privatePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#564500',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.onSurface,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 17,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 6,
  },
  textInput: {
    height: 46,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: 12,
    fontSize: 13,
    color: Colors.onSurface,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  trailList: {
    gap: 8,
  },
  trailOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  trailOptionSelected: {
    borderColor: Colors.primaryDark,
    backgroundColor: Colors.primaryPale,
  },
  trailOptionName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  trailOptionMeta: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  capacityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  capacityPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
  },
  capacityPillActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  capacityText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },
  capacityTextActive: {
    color: Colors.onPrimary,
  },
  submitBtn: {
    height: 50,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    ...Shadows.hover,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successIcon: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.onSurface,
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginVertical: 10,
    lineHeight: 18,
  },
  codeContainer: {
    width: '100%',
    backgroundColor: '#fff9e6',
    borderWidth: 1.5,
    borderColor: '#fed018',
    borderRadius: Radius.lg,
    padding: 16,
    alignItems: 'center',
    marginVertical: 14,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6f5900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  codeText: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#231b00',
    letterSpacing: 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginTop: 10,
  },
  copyText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
});
