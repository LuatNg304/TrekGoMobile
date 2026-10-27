import { Colors, Radius, Shadows } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Modal,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useTripInvitation } from "../hooks/useTripInvitation";

export interface InviteShareModalProps {
  visible: boolean;
  tripId?: string;
  expectedVersion?: number;
  inviteCode?: string;
  inviteUrl?: string;
  tripTitle?: string;
  loading?: boolean;
  revoking?: boolean;
  onClose: () => void;
  onGenerateNewCode?: () => void;
  onRevoke?: () => void;
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
  revoking = false,
  onClose,
  onGenerateNewCode,
  onRevoke,
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

  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  // Payload for QR: prioritize full inviteUrl or inviteCode
  const qrPayload = inviteUrl || inviteCode || "";

  function handleCopyCode() {
    if (!inviteCode) return;
    Clipboard.setString(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Auto generate invite via hook ONLY IF parent didn't manage it (no onGenerateNewCode and not already loading)
  useEffect(() => {
    if (
      visible &&
      tripId &&
      expectedVersion !== undefined &&
      !propInviteCode &&
      !inviteData &&
      !propLoading &&
      !onGenerateNewCode
    ) {
      void (async () => {
        try {
          const res = await generateInvite(tripId, expectedVersion);
          onInviteGenerated?.(res.inviteCode, res.tripVersion);
        } catch (err: any) {
          Alert.alert("Lỗi", err?.message || "Không thể tạo mã mời.");
        }
      })();
    }
  }, [
    visible,
    tripId,
    expectedVersion,
    propInviteCode,
    inviteData,
    propLoading,
    onGenerateNewCode,
    generateInvite,
    onInviteGenerated,
  ]);

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
            <View style={styles.contentWrapper}>
              {/* QR Code Container */}
              {qrPayload ? (
                <View style={styles.qrCard}>
                  <View style={styles.qrInner}>
                    <QRCode
                      value={qrPayload}
                      size={180}
                      color="#000000"
                      backgroundColor="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.qrHint}>
                    Quét mã QR để tự động tham gia đoàn
                  </Text>
                </View>
              ) : null}

              {/* Code Container */}
              <View style={styles.codeContainer}>
                <View style={styles.codeHeaderRow}>
                  <Text style={styles.codeLabel}>MÃ MỜI THAM GIA</Text>
                  <View style={styles.codeActionButtonsRow}>
                    <TouchableOpacity
                      style={styles.toggleVisibilityBtn}
                      onPress={() => setShowCode((prev) => !prev)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={showCode ? "eye-off-outline" : "eye-outline"}
                        size={13}
                        color={Colors.onSurfaceVariant}
                      />
                      <Text style={styles.toggleVisibilityText}>
                        {showCode ? "Ẩn mã" : "Hiện mã"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={handleCopyCode}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={copied ? "checkmark-circle" : "copy-outline"}
                        size={13}
                        color={copied ? "#059669" : Colors.primaryDark}
                      />
                      <Text
                        style={[
                          styles.copyText,
                          copied && { color: "#059669", fontWeight: "700" },
                        ]}
                      >
                        {copied ? "Đã chép" : "Sao chép"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {showCode ? (
                  <Text style={styles.codeText} selectable numberOfLines={3}>
                    {inviteCode || "Đang lấy mã..."}
                  </Text>
                ) : (
                  <Text style={styles.codeMaskedText}>
                    ••••••••••••••••••••••••
                  </Text>
                )}
              </View>
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

            {onRevoke ? (
              <TouchableOpacity
                style={styles.revokeButton}
                onPress={onRevoke}
                disabled={loading || revoking}
              >
                {revoking ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <View style={styles.buttonInner}>
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color="#DC2626"
                    />
                    <Text style={styles.revokeButtonText}>Thu hồi link mời</Text>
                  </View>
                )}
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
  contentWrapper: {
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  qrCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    marginBottom: 14,
    ...Shadows.card,
  },
  qrInner: {
    padding: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.md,
  },
  qrHint: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 8,
    fontWeight: "600",
  },
  codeContainer: {
    width: "100%",
    padding: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  codeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  codeActionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  toggleVisibilityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  toggleVisibilityText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: Colors.onSurfaceVariant,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  copyText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primaryDark,
  },
  codeText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primaryDark,
    letterSpacing: 0.8,
    fontFamily: "monospace",
  },
  codeMaskedText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.onSurfaceVariant,
    letterSpacing: 2,
    paddingVertical: 2,
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
  revokeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: "#FEE2E2",
    marginTop: 2,
  },
  revokeButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
});
