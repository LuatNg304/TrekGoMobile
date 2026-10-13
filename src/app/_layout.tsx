import { Colors } from "@/constants/theme";
import { AppProvider, useApp } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext";
import { Stack, useRouter, useSegments, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppProvider>
        <SafeAreaProvider>
          <RootNavigator />
        </SafeAreaProvider>
      </AppProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { authRole } = useApp();

  useEffect(() => {
    if (isLoading) return;

    const rootSegment = (segments[0] as string | undefined) || "";
    const isInAuthGroup = rootSegment === "auth";
    const isInFieldOps = rootSegment === "field-operations";
    const isInTabs = rootSegment === "(tabs)";

    // Determine current effective role (from auth token or mock switcher)
    const effectiveRole = user?.role || authRole;

    if (!isAuthenticated && !authRole && !isInAuthGroup && rootSegment !== "") {
      router.replace("/auth/login" as Href);
      return;
    }

    if (isAuthenticated || authRole) {
      // Role-based routing when logged in
      if (effectiveRole === "STAFF_DELIVERY") {
        // Staff Delivery is dedicated to field-operations
        if (isInAuthGroup || isInTabs) {
          router.replace("/field-operations" as Href);
        }
      } else if (effectiveRole === "LEADER") {
        if (isInAuthGroup) {
          router.replace("/field-operations" as Href);
        }
      } else {
        // Regular User / Trekker should not access field-operations
        if (isInAuthGroup || isInFieldOps) {
          router.replace("/(tabs)" as Href);
        }
      }
    }
  }, [isAuthenticated, isLoading, router, segments, user, authRole]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Đang khôi phục phiên TrekGo...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.surface },
          animation: Platform.OS === "ios" ? "default" : "fade",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="field-operations" options={{ headerShown: false }} />
        <Stack.Screen
          name="navigation"
          options={{
            headerShown: false,
            presentation: "fullScreenModal",
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: Colors.inkDeep,
  },
  loadingText: {
    color: Colors.onPrimaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
});
