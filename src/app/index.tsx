import { Redirect } from "expo-router";
import { useAuth } from "@/features/auth/AuthContext";

export default function RootIndex() {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated && user?.role === "LEADER") {
    return <Redirect href="/trips/leader" />;
  }

  return <Redirect href="/(tabs)" />;
}
