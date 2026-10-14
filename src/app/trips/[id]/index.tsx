import { PublicTripDetailScreen } from "@/features/trips/screens";
import { useLocalSearchParams } from "expo-router";


export default function TripDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PublicTripDetailScreen tripId={id} />;
}
