import { Colors, Radius, Shadows } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTripInvitation } from "../hooks/useTripInvitation";

export interface InviteShareModalProps {
  visible: boolean;
  tripId?: string;
  expectedVersion?: number;
  inviteCode?: string;
  inviteUrl?: string;
  tripTitle?: string;
  loading?: boolean;
  onClose: () => void;
  onGenerateNewCode?: () => void;
  onInviteGenerated?: (inviteCode: string, tripVersion: number) => void;
}

export function InviteShareModal({
  visible,
  tripId,
  expectedVersion,
  inviteCode: propInviteCode,
  inviteUrl: propInviteUrl,
  tripTitle,
  loading: propLoading = false,
  onClose,
  onGenerateNewCode,
  onInviteGenerated,
}: InviteShareModalProps) {
  const {
    inviteData,
    loading: hookLoading,
    generateInvite,
  } = useTripInvitation();

  const inviteCode = propInviteCode || inviteData?.inviteCode;
  const inviteUrl = propInviteUrl || inviteData?.inviteUrl;
  const loading = propLoading || hookLoading;

  // Auto generate invite via hook if tripId is provided and no inviteCode passed
  useEffect(() => {
    if (visible && tripId && expectedVersion !== undefined && !propInviteCode && !inviteData) {
      void (async () => {
        try {
          const res = await generateInvite(tripId, expectedVersion);
          onInviteGenerated?.(res.inviteCode, res.tripVersion);
        } catch (err: any) {
          Alert.alert("Lỗi", err?.message || "Không thể tạo mã mời.");
        }
      })();
    }
  }, [visible, tripId, expectedVersion, propInviteCode, inviteData, generateInvite, onInviteGenerated]);

  async function handleShare() {
    if (!inviteCode) return;
    try {
      await Share.share({
        title: `Mời tham gia chuyến: ${tripTitle || "Private Trip TrekGo"}`,
        message:
          `Tham gia chuyến đi "${tripTitle || "TrekGo"}" cùng mình nhé!\n` +
          `Mã mời: ${inviteCode}\n` +
          (inviteUrl ? `Link tham gia: ${inviteUrl}` : ""),
      });
    } catch {
      // Ignored
    }
  }

  async function handleRegenerate() {
    if (onGenerateNewCode) {
      onGenerateNewCode();
      return;
    }

    if (tripId && expectedVersion !== undefined) {
      try {
        const res = await generateInvite(tripId, expectedVersion);
        onInviteGenerated?.(res.inviteCode, res.tripVersion);
      } catch (err: any) {
        Alert.alert("Lỗi", err?.message || "Không thể tạo mã mời mới.");
      }
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
            <Ionicons name="close" size={20} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Ionicons name="share-social" size={24} color={Colors.primaryDark} />
          </View>

          <Text style={styles.title}>Mã mời bạn bè</Text>
          <Text style={styles.subtitle}>
            Chia sẻ mã hoặc link này với những người bạn muốn mời tham gia đoàn.
          </Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={Colors.primaryDark} />
              <Text style={styles.loadingText}>Đang tạo mã mời...</Text>
            </View>
          ) : (
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>MÃ MỜI CỦA BẠN</Text>
              <Text style={styles.codeText} selectable>
                {inviteCode || "Đang lấy mã..."}
              </Text>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
              disabled={!inviteCode || loading}
            >
              <Ionicons name="share-outline" size={18} color="#FFFFFF" />
              <Text style={styles.shareButtonText}>Chia sẻ ngay</Text>
            </TouchableOpacity>

            {(onGenerateNewCode || (tripId && expectedVersion !== undefined)) ? (
              <TouchableOpacity
                style={styles.regenerateButton}
                onPress={handleRegenerate}
                disabled={loading}
              >
                <Ionicons
                  name="refresh-outline"
                  size={16}
                  color={Colors.primaryDark}
                />
                <Text style={styles.regenerateButtonText}>Tạo mã mới</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  dialog: {
    width: "100%",
    maxWidth: 380,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    padding: 22,
    alignItems: "center",
    position: "relative",
    ...Shadows.hover,
  },
  closeIcon: {
    position: "absolute",
    top: 14,
    right: 14,
    padding: 6,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.onSurface,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  loadingBox: {
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  codeContainer: {
    width: "100%",
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    alignItems: "center",
    marginBottom: 18,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  codeText: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.primaryDark,
    letterSpacing: 1.2,
  },
  actionButtons: {
    width: "100%",
    gap: 10,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  regenerateButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primaryDark,
  },
});
