import { StatusBar } from "expo-status-bar";
import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppProvider>
        <RootNavigator />
      </AppProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const isInAuthGroup = segments[0] === "auth";

    if (!isAuthenticated && !isInAuthGroup) {
      router.replace("/auth/login");
    } else if (isAuthenticated && isInAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, router, segments]);

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
      <StatusBar style={isAuthenticated ? "dark" : "light"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.surface },
          animation: Platform.OS === "ios" ? "default" : "fade",
        }}
      >
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
