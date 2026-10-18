import { Colors, Radius, Shadows } from "@/constants/theme";
import { parsePrivateTripInviteCode } from "@/utils/qrInviteParser";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess?: (inviteCode: string) => void;
  onManualInputPress?: () => void;
}

export function QRScannerModal({
  visible,
  onClose,
  onScanSuccess,
  onManualInputPress,
}: QRScannerModalProps) {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchActive, setTorchActive] = useState(false);

  // Xử lý khi nhận diện barcode/QR
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || !data) return;
    setScanned(true);

    const inviteCode = parsePrivateTripInviteCode(data);

    if (inviteCode) {
      onClose();
      if (onScanSuccess) {
        onScanSuccess(inviteCode);
      } else {
        // Điều hướng trực tiếp tới trang xem trước thư mời và tham gia Private Trip
        router.push({
          pathname: "/invite/[code]",
          params: { code: inviteCode },
        } as any);
      }
    } else {
      Alert.alert(
        "Mã QR không hợp lệ",
        "Mã QR vừa quét không phải là mã mời Private Trip của TrekGo. Vui lòng quét mã QR được tạo từ ứng dụng TrekGo.",
        [
          {
            text: "Quét lại",
            onPress: () => setScanned(false),
          },
          {
            text: "Đóng",
            style: "cancel",
            onPress: onClose,
          },
        ],
      );
    }
  };

  const handleModalShow = () => {
    setScanned(false);
    setTorchActive(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onShow={handleModalShow}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {!permission ? (
          <SafeAreaView style={styles.permissionBox}>
            <ActivityIndicator size="large" color={Colors.primaryDark} />
            <Text style={styles.permissionText}>Đang kiểm tra quyền máy ảnh...</Text>
          </SafeAreaView>
        ) : !permission.granted ? (
          <SafeAreaView style={styles.permissionBox}>
            <View style={styles.cameraIconCircle}>
              <Ionicons name="camera-outline" size={48} color={Colors.primaryDark} />
            </View>
            <Text style={styles.permissionTitle}>Cần quyền truy cập máy ảnh</Text>
            <Text style={styles.permissionDesc}>
              TrekGo cần quyền truy cập camera để quét mã QR mời tham gia Private Trip từ màn hình web của bạn bè.
            </Text>
            <TouchableOpacity
              style={styles.permissionBtn}
              onPress={requestPermission}
              activeOpacity={0.85}
            >
              <Text style={styles.permissionBtnText}>Cấp quyền Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelLink} onPress={onClose}>
              <Text style={styles.cancelLinkText}>Để sau</Text>
            </TouchableOpacity>
          </SafeAreaView>
        ) : (
          <>
            {/* Camera Viewfinder */}
            <CameraView
              style={StyleSheet.absoluteFill}
              enableTorch={torchActive}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Tactical HUD Overlay */}
            <SafeAreaView style={styles.overlay}>
              {/* Top Controls Bar */}
              <View style={styles.topBar}>
                <TouchableOpacity
                  style={styles.circleButton}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>

                <View style={styles.topCenterBadge}>
                  <Ionicons name="scan" size={16} color="#8cd867" />
                  <Text style={styles.topCenterText}>QUÉT MÃ PRIVATE TRIP</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.circleButton,
                    torchActive && styles.circleButtonActive,
                  ]}
                  onPress={() => setTorchActive((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={torchActive ? "flash" : "flash-off-outline"}
                    size={20}
                    color={torchActive ? "#0c2000" : "#ffffff"}
                  />
                </TouchableOpacity>
              </View>

              {/* Viewfinder Center Target */}
              <View style={styles.centerTargetArea}>
                <View style={styles.scanTargetBox}>
                  {/* Tactical Glowing Corners */}
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />

                  {/* Aiming Reticle Dot in Center */}
                  <View style={styles.aimDot} />
                </View>

                <Text style={styles.instructionText}>
                  Hướng camera vào mã QR trên màn hình web để tham gia nhóm
                </Text>
              </View>

              {/* Bottom Actions Bar */}
              <View style={styles.bottomBar}>
                {onManualInputPress ? (
                  <TouchableOpacity
                    style={styles.manualInputBtn}
                    onPress={() => {
                      onClose();
                      onManualInputPress();
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="key-outline" size={18} color="#ffffff" />
                    <Text style={styles.manualInputBtnText}>
                      Nhập mã mời bằng tay
                    </Text>
                  </TouchableOpacity>
                ) : (
                  scanned && (
                    <TouchableOpacity
                      style={styles.rescanBtn}
                      onPress={() => setScanned(false)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="refresh" size={18} color="#0c2000" />
                      <Text style={styles.rescanBtnText}>Chạm để quét lại</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </SafeAreaView>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  permissionBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: Colors.surface,
  },
  cameraIconCircle: {
    width: 90,
    height: 90,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    ...Shadows.card,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.onSurface,
    textAlign: "center",
    marginBottom: 10,
  },
  permissionDesc: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionText: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginTop: 14,
  },
  permissionBtn: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: Radius.full,
    ...Shadows.card,
  },
  permissionBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
  cancelLink: {
    marginTop: 16,
    padding: 8,
  },
  cancelLinkText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.onSurfaceVariant,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  circleButtonActive: {
    backgroundColor: "#8cd867",
    borderColor: "#8cd867",
  },
  topCenterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(22, 51, 0, 0.8)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "#8cd867",
  },
  topCenterText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#8cd867",
    letterSpacing: 0.8,
  },
  centerTargetArea: {
    alignItems: "center",
    justifyContent: "center",
  },
  scanTargetBox: {
    width: 260,
    height: 260,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  aimDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: "#8cd867",
    opacity: 0.8,
  },
  corner: {
    position: "absolute",
    width: 26,
    height: 26,
    borderColor: "#8cd867",
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 6,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 6,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 6,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 6,
  },
  instructionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 32,
    lineHeight: 18,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomBar: {
    alignItems: "center",
    paddingBottom: 28,
  },
  manualInputBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  manualInputBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  rescanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#8cd867",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  rescanBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0c2000",
  },
});
