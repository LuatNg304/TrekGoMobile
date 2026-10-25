import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { Colors, Radius } from "@/constants/theme";

export function TrekkingLoader({
  label = "Đang chuẩn bị hành trang...",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  const [rotation] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={[styles.wrap, compact && styles.compact]} accessibilityRole="progressbar">
      <Animated.View style={[styles.compass, { transform: [{ rotate: spin }] }]}>
        <Ionicons name="navigate" size={compact ? 18 : 24} color={Colors.inkDeep} />
      </Animated.View>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hint}>Đang đi qua một đoạn dốc nhỏ</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 76,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.primaryNeutral,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryPale,
  },
  compact: { minHeight: 60, paddingVertical: 10 },
  compass: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  copy: { flex: 1 },
  label: { color: Colors.inkDeep, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  hint: { marginTop: 2, color: Colors.onSurfaceVariant, fontSize: 11, lineHeight: 15 },
});
