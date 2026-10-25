import { Colors, Radius } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { InvitePreviewCard } from "../components";

import { useAuth } from "@/features/auth/AuthContext";

export interface PrivateTripInvitePreviewScreenProps {
  inviteCode?: string;
  isLoggedIn?: boolean;
}

export function PrivateTripInvitePreviewScreen({
  inviteCode: propCode,
  isLoggedIn: propIsLoggedIn,
}: PrivateTripInvitePreviewScreenProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const isLoggedIn = propIsLoggedIn !== undefined ? propIsLoggedIn : isAuthenticated;
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const code =
    propCode || (Array.isArray(params.code) ? params.code[0] : params.code);

  function handleJoinSuccess(res: any) {
    router.replace({
      pathname: "/private-trips/[id]/room",
      params: { id: res.tripId },
    } as any);
  }

  function handleLogin() {
    router.push("/auth/login" as any);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Thư mời Private Trip</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <InvitePreviewCard
          inviteCode={code}
          isLoggedIn={isLoggedIn}
          onLogin={handleLogin}
          onJoinSuccess={handleJoinSuccess}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  headerBar: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  headerSpacer: {
    width: 38,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
});
