import { Colors, Radius, Shadows } from "@/constants/theme";
import { API_BASE_URL } from "@/lib/api-client";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";

export interface PaymentCompleteResult {
  success: boolean;
  responseCode?: string;
  message?: string;
  rawUrl?: string;
}

export interface PaymentWebViewModalProps {
  visible: boolean;
  url: string;
  title?: string;
  onClose: () => void;
  onPaymentComplete: (result: PaymentCompleteResult) => void;
}

export function PaymentWebViewModal({
  visible,
  url,
  title = "Thanh toán an toàn",
  onClose,
  onPaymentComplete,
}: PaymentWebViewModalProps) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const completedRef = useRef(false);

  // Check if URL indicates a payment result (VNPAY / MoMo / Return Callback)
  function handleUrlChange(navUrl: string): boolean {
    if (completedRef.current) return false;

    // 1. VNPAY detection
    if (navUrl.includes("vnp_ResponseCode")) {
      const match = navUrl.match(/vnp_ResponseCode=([^&]+)/);
      const code = match ? match[1] : null;

      // Also forward return URL to backend if it was targeting localhost:5000
      if (navUrl.includes("localhost:5000") || navUrl.includes("127.0.0.1:5000")) {
        const backendEndpoint = navUrl.replace(
          /http:\/\/(localhost|127\.0\.0\.1):5000/,
          API_BASE_URL,
        );
        fetch(backendEndpoint).catch(() => {});
      }

      completedRef.current = true;
      if (code === "00") {
        onPaymentComplete({
          success: true,
          responseCode: "00",
          message: "Thanh toán thành công!",
          rawUrl: navUrl,
        });
      } else {
        onPaymentComplete({
          success: false,
          responseCode: code || "FAILED",
          message:
            code === "24"
              ? "Bạn đã hủy giao dịch."
              : `Giao dịch không thành công (Mã lỗi: ${code}).`,
          rawUrl: navUrl,
        });
      }
      return false; // Stop loading localhost
    }

    // 2. MoMo detection
    if (navUrl.includes("resultCode=")) {
      const match = navUrl.match(/resultCode=([^&]+)/);
      const code = match ? match[1] : null;

      if (navUrl.includes("localhost:5000") || navUrl.includes("127.0.0.1:5000")) {
        const backendEndpoint = navUrl.replace(
          /http:\/\/(localhost|127\.0\.0\.1):5000/,
          API_BASE_URL,
        );
        fetch(backendEndpoint).catch(() => {});
      }

      completedRef.current = true;
      if (code === "0") {
        onPaymentComplete({
          success: true,
          responseCode: "0",
          message: "Thanh toán MoMo thành công!",
          rawUrl: navUrl,
        });
      } else {
        onPaymentComplete({
          success: false,
          responseCode: code || "FAILED",
          message: "Giao dịch MoMo không thành công.",
          rawUrl: navUrl,
        });
      }
      return false;
    }

    // 3. Catch generic localhost return endpoints before ERR_CONNECTION_REFUSED
    if (
      navUrl.includes("localhost:5000") ||
      navUrl.includes("127.0.0.1:5000") ||
      navUrl.includes("/payment-success") ||
      navUrl.includes("/payments/return")
    ) {
      // Forward to backend
      const backendEndpoint = navUrl.replace(
        /http:\/\/(localhost|127\.0\.0\.1):5000/,
        API_BASE_URL,
      );
      fetch(backendEndpoint).catch(() => {});

      completedRef.current = true;
      onPaymentComplete({
        success: true,
        responseCode: "00",
        message: "Thanh toán thành công!",
        rawUrl: navUrl,
      });
      return false;
    }

    return true;
  }

  function handleClosePress() {
    Alert.alert(
      "Dừng thanh toán?",
      "Bạn có chắc muốn thoát giao dịch thanh toán này? Đơn đặt chỗ vẫn sẽ được giữ trong thời gian quy định.",
      [
        { text: "Tiếp tục thanh toán", style: "cancel" },
        {
          text: "Thoát",
          style: "destructive",
          onPress: () => {
            onClose();
          },
        },
      ],
    );
  }

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClosePress}
    >
      <SafeAreaView style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClosePress}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color={Colors.onSurface} />
          </TouchableOpacity>
        </View>

        {/* Loading Progress Bar */}
        {loading ? (
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.max(15, progress * 100)}%` },
              ]}
            />
          </View>
        ) : null}

        {/* WebView */}
        <View style={styles.webviewContainer}>
          <WebView
            source={{ uri: url }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
            onShouldStartLoadWithRequest={(request) => {
              return handleUrlChange(request.url);
            }}
            onNavigationStateChange={(navState: WebViewNavigation) => {
              handleUrlChange(navState.url);
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={Colors.primaryDark} />
                <Text style={styles.loadingText}>Đang tải trang thanh toán...</Text>
              </View>
            )}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingTop: Platform.OS === "android" ? 25 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerLow,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  progressBarBg: {
    height: 3,
    backgroundColor: Colors.surfaceContainerLow,
    width: "100%",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.primaryDark,
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingBox: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.mute,
    fontWeight: "600",
  },
});
