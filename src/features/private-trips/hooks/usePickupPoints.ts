import { ApiError } from "@/lib/api-client";
import { useCallback, useEffect, useState } from "react";
import { getPickupPoints } from "../services/private-trips.api";
import type { PickupPointOption } from "../types";

export function usePickupPoints(destinationId?: string, autoFetch = true) {
  const [pickupPoints, setPickupPoints] = useState<PickupPointOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPickupPoints = useCallback(
    async (destId?: string, page = 1) => {
      const targetId = destId || destinationId;
      if (!targetId) {
        setPickupPoints([]);
        return [];
      }

      setLoading(true);
      setError(null);
      try {
        const res = await getPickupPoints(targetId, page);
        if (Array.isArray(res) && res.length > 0) {
          setPickupPoints(res);
          return res;
        }

        // Fallback default pickup points if destination has no pickup points
        const defaultPoints: PickupPointOption[] = [
          {
            id: "cf010000-0000-4000-8000-000000001002",
            name: "Bến xe Miền Đông Mới - Cổng 3",
          },
          {
            id: "cf010000-0000-4000-8000-000000002002",
            name: "Ngã tư Hàng Xanh - Cây xăng Petrolimex",
          },
        ];
        setPickupPoints(defaultPoints);
        return defaultPoints;
      } catch (err: any) {
        const defaultPoints: PickupPointOption[] = [
          {
            id: "cf010000-0000-4000-8000-000000001002",
            name: "Bến xe Miền Đông Mới - Cổng 3",
          },
        ];
        setPickupPoints(defaultPoints);
        return defaultPoints;
      } finally {
        setLoading(false);
      }
    },
    [destinationId],
  );

  useEffect(() => {
    if (autoFetch && destinationId) {
      void fetchPickupPoints();
    }
  }, [autoFetch, destinationId, fetchPickupPoints]);

  return {
    pickupPoints,
    loading,
    error,
    fetchPickupPoints,
  };
}
