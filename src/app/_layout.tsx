import { StatusBar } from "expo-status-bar";
import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import * as SQLite from "expo-sqlite";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";


import { SafeAreaProvider } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext";
import { getDatabase } from "@/services/storage/recordingDatabase";
import "@/services/location/backgroundLocationTask";

export default function RootLayout() {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);

  useEffect(() => {
    getDatabase()
      .then((database) => {
        setDb(database);
        if (__DEV__) {
          console.log("[SQLite] Drizzle Studio sẵn sàng: http://localhost:8081/_expo/plugins/expo-drizzle-studio-plugin");
          console.log("[AsyncStorage] DevTools sẵn sàng: http://localhost:8081/_expo/plugins/@dev-plugins/async-storage");
        }
      })
      .catch((err) => {
        console.warn("[RootLayout] Khởi tạo SQLite cho Drizzle Studio thất bại:", err);
      });
  }, []);

  useDrizzleStudio(db);
  

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppProvider>
          <RootNavigator />
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const isInAuthGroup = segments[0] === "auth";

    if (!isAuthenticated && !isInAuthGroup) {
      router.replace("/auth/login");
    } else if (isAuthenticated && isInAuthGroup) {
      if (user?.role === "LEADER") {
        router.replace("/trips/leader");
      } else {
        router.replace("/(tabs)");
      }
    }
  }, [isAuthenticated, isLoading, router, segments, user?.role]);

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
