import { ApiError } from "@/lib/api-client";
import { useCallback, useEffect, useState } from "react";
import {
  getSystemTrailAccesses,
  getSystemTrails,
} from "../services/private-trips.api";

export function useSystemTrailAccesses(autoFetch = true) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchAccesses = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSystemTrailAccesses(page);
      if (Array.isArray(res) && res.length > 0) {
        setData(res);
        return res;
      }

      // If user has no purchased trails, load available system trails for testing
      const sysRes = await getSystemTrails(page);
      const mapped = (sysRes?.items || []).map((st: any) => ({
        systemTrailId: st.id,
        systemTrail: {
          id: st.id,
          name: st.name,
          destinationId: st.destination?.id || st.destinationId,
          trailCheckpointsViaSystemTrailId: (st.checkpoints || [
            {
              id: "0d6eabdb-2dee-4b97-8543-25a241c3cc82",
              name: "Điểm xuất phát",
              status: "ACTIVE",
              sequence: 1,
            },
            {
              id: "c869defc-e96b-4d96-b97e-05e4300c9631",
              name: "Trạm dừng chân",
              status: "ACTIVE",
              sequence: 2,
            },
            {
              id: "f15e3cc3-831a-4c5c-bf0b-b846806ada33",
              name: "Đỉnh đích đến",
              status: "ACTIVE",
              sequence: 3,
            },
          ]).map((cp: any, idx: number) => ({
            sequence: cp.sequence || idx + 1,
            checkpoint: {
              id: cp.id,
              name: cp.name,
              status: "ACTIVE",
              destinationId: st.destination?.id || st.destinationId,
              latitude: cp.latitude,
              longitude: cp.longitude,
            },
          })),
        },
      }));
      setData(mapped);
      return mapped;
    } catch (err: any) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Không thể tải danh sách cung đường.";
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      void fetchAccesses();
    }
  }, [autoFetch, fetchAccesses]);

  return {
    trailAccesses: data,
    loading,
    error,
    refetch: fetchAccesses,
  };
}
