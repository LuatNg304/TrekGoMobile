import { Redirect } from "expo-router";
import { useAuth } from "@/features/auth/AuthContext";

export default function RootIndex() {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    const role = user?.role?.toUpperCase();
    if (role === "LEADER") {
      return <Redirect href={"/trips/leader" as any} />;
    }
    if (role === "STAFF_DELIVERY") {
      return <Redirect href={"/(tabs)/rental" as any} />;
    }
  }

  return <Redirect href="/(tabs)" />;
}
