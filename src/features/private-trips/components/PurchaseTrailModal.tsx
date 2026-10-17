import { Colors, Radius, Shadows } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTrailAccess } from "../hooks/useTrailAccess";

export interface PurchaseTrailModalProps {
  visible: boolean;
  trailId: string;
  trailName: string;
  onClose: () => void;
  onAccessGranted: () => void;
}

export function PurchaseTrailModal({
  visible,
  trailId,
  trailName,
  onClose,
  onAccessGranted,
}: PurchaseTrailModalProps) {
  const {
    accessInfo,
    purchaseResult,
    loading,
    error,
    checkAccess,
    purchaseAccess,
    reset,
  } = useTrailAccess();

  const [gateway, setGateway] = useState<"momo" | "vnpay">("momo");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (visible && trailId) {
      void checkAccess(trailId);
    } else {
      reset();
    }
  }, [visible, trailId, checkAccess, reset]);

  async function handlePurchase() {
    try {
      const res = await purchaseAccess(trailId, {
        paymentMethod: "QR",
        gateway,
      });

      if (res.accessStatus === "ACTIVE") {
        Alert.alert(
          "Thành công",
          `Cung đường "${trailName}" đã được mở khóa và thêm vào danh sách của bạn!`,
          [
            {
              text: "Tiếp tục",
              onPress: () => {
                onAccessGranted();
                onClose();
              },
            },
          ],
        );
      }
    } catch (err: any) {
      Alert.alert(
        "Lỗi thanh toán",
        err?.message || "Không thể khởi tạo thanh toán mua quyền sử dụng cung đường.",
      );
    }
  }

  async function handleVerifyPayment() {
    setVerifying(true);
    try {
      const res = await checkAccess(trailId);
      if (res.hasAccess) {
        Alert.alert(
          "Thanh toán thành công!",
          `Đã xác nhận quyền sử dụng cung đường "${trailName}".`,
          [
            {
              text: "Bắt đầu tạo chuyến",
              onPress: () => {
                onAccessGranted();
                onClose();
              },
            },
          ],
        );
      } else {
        Alert.alert(
          "Chưa nhận được thanh toán",
          "Hệ thống chưa ghi nhận giao dịch thành công. Nếu bạn vừa chuyển khoản, vui lòng đợi vài giây và bấm kiểm tra lại.",
        );
      }
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message || "Không thể kiểm tra giao dịch.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleBox}>
              <Ionicons name="key" size={20} color={Colors.primaryDark} />
              <Text style={styles.headerTitle}>Quyền sử dụng Cung đường</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Trail info */}
            <View style={styles.trailCard}>
              <Text style={styles.trailName}>{trailName}</Text>
              <Text style={styles.trailSub}>Cung đường hệ thống TrekGo</Text>
            </View>

            {loading && !purchaseResult ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={Colors.primaryDark} />
                <Text style={styles.loadingText}>
                  Đang kiểm tra quyền truy cập...
                </Text>
              </View>
            ) : accessInfo?.hasAccess ? (
              <View style={styles.ownedBox}>
                <Ionicons
                  name="checkmark-circle"
                  size={46}
                  color={Colors.primaryDark}
                />
                <Text style={styles.ownedTitle}>Đã sở hữu quyền sử dụng</Text>
                <Text style={styles.ownedSub}>
                  Bạn đã có quyền tạo Private Trip với cung đường này.
                </Text>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => {
                    onAccessGranted();
                    onClose();
                  }}
                >
                  <Text style={styles.primaryBtnText}>Chọn cung đường này</Text>
                </TouchableOpacity>
              </View>
            ) : purchaseResult?.accessStatus === "PENDING_PAYMENT" ? (
              <View style={styles.paymentSection}>
                <View style={styles.priceTag}>
                  <Text style={styles.priceLabel}>Số tiền cần thanh toán:</Text>
                  <Text style={styles.priceAmount}>
                    {Number(purchaseResult.amount).toLocaleString("vi-VN")}{" "}
                    {purchaseResult.currency}
                  </Text>
                </View>

                {/* QR Code display */}
                {purchaseResult.checkout?.qrCode ? (
                  <View style={styles.qrContainer}>
                    <Text style={styles.qrInstruction}>
                      Quét mã QR bằng App Ngân hàng hoặc Ví {gateway.toUpperCase()}
                    </Text>
                    <Image
                      source={{ uri: purchaseResult.checkout.qrCode }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  </View>
                ) : null}

                {/* Payment URL link fallback */}
                {purchaseResult.checkout?.paymentUrl ? (
                  <TouchableOpacity
                    style={styles.urlButton}
                    onPress={() =>
                      purchaseResult.checkout?.paymentUrl &&
                      Linking.openURL(purchaseResult.checkout.paymentUrl)
                    }
                  >
                    <Ionicons
                      name="open-outline"
                      size={18}
                      color={Colors.primaryDark}
                    />
                    <Text style={styles.urlButtonText}>
                      Mở cổng thanh toán trên trình duyệt
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {/* Verification CTA */}
                <TouchableOpacity
                  style={[styles.primaryBtn, verifying && styles.btnDisabled]}
                  onPress={handleVerifyPayment}
                  disabled={verifying}
                >
                  {verifying ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="refresh-circle-outline"
                        size={20}
                        color="#FFFFFF"
                      />
                      <Text style={styles.primaryBtnText}>
                        Tôi đã thanh toán / Kiểm tra lại
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.buySection}>
                <View style={styles.introBox}>
                  <Ionicons
                    name="information-circle-outline"
                    size={22}
                    color="#B45309"
                  />
                  <Text style={styles.introText}>
                    Bạn chưa có bản quyền sử dụng cung đường hệ thống này. Hãy
                    mở khóa để dùng làm lộ trình cho Private Trip của nhóm bạn.
                  </Text>
                </View>

                {/* Gateway selection */}
                <Text style={styles.sectionLabel}>Chọn cổng thanh toán:</Text>
                <View style={styles.gatewayRow}>
                  <TouchableOpacity
                    style={[
                      styles.gatewayCard,
                      gateway === "momo" && styles.gatewayCardActive,
                    ]}
                    onPress={() => setGateway("momo")}
                  >
                    <Ionicons
                      name="wallet-outline"
                      size={20}
                      color={gateway === "momo" ? Colors.primaryDark : Colors.mute}
                    />
                    <Text
                      style={[
                        styles.gatewayText,
                        gateway === "momo" && styles.gatewayTextActive,
                      ]}
                    >
                      Ví MoMo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.gatewayCard,
                      gateway === "vnpay" && styles.gatewayCardActive,
                    ]}
                    onPress={() => setGateway("vnpay")}
                  >
                    <Ionicons
                      name="card-outline"
                      size={20}
                      color={
                        gateway === "vnpay" ? Colors.primaryDark : Colors.mute
                      }
                    />
                    <Text
                      style={[
                        styles.gatewayText,
                        gateway === "vnpay" && styles.gatewayTextActive,
                      ]}
                    >
                      VNPay / QR Ngân hàng
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.btnDisabled]}
                  onPress={handlePurchase}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="flash-outline"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.primaryBtnText}>
                        Mở khóa cung đường ngay
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  container: {
    maxHeight: "85%",
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: 16,
    ...Shadows.hover,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer,
  },
  headerTitleBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingVertical: 16,
    gap: 16,
  },
  trailCard: {
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  trailName: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  trailSub: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  loadingBox: {
    paddingVertical: 36,
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  ownedBox: {
    paddingVertical: 24,
    alignItems: "center",
    gap: 8,
  },
  ownedTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  ownedSub: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: "center",
    marginBottom: 8,
  },
  buySection: {
    gap: 14,
  },
  introBox: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: "#FEF3C7",
  },
  introText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
    lineHeight: 17,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  gatewayRow: {
    flexDirection: "row",
    gap: 10,
  },
  gatewayCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainerHigh,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  gatewayCardActive: {
    borderColor: Colors.primaryDark,
    backgroundColor: "#F0FDF4",
  },
  gatewayText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.onSurfaceVariant,
  },
  gatewayTextActive: {
    color: Colors.primaryDark,
    fontWeight: "800",
  },
  paymentSection: {
    alignItems: "center",
    gap: 14,
  },
  priceTag: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  priceAmount: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.primaryDark,
  },
  qrContainer: {
    alignItems: "center",
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    gap: 10,
  },
  qrInstruction: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontWeight: "600",
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  urlButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  urlButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primaryDark,
    textDecorationLine: "underline",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    textAlign: "center",
  },
});
