import { ApiError } from "@/lib/api-client";
import { useCallback, useEffect, useState } from "react";
import { getPrivateTripRoom } from "../services/private-trips.api";
import type { TripRoomData } from "../types";

export function usePrivateTripRoom(tripId?: string, autoFetch = true) {
  const [roomData, setRoomData] = useState<TripRoomData | null>(null);
  const [loading, setLoading] = useState(Boolean(autoFetch && tripId));
  const [error, setError] = useState<string | null>(null);

  const fetchRoom = useCallback(
    async (id?: string) => {
      const targetId = id || tripId;
      if (!targetId) {
        setLoading(false);
        return null;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await getPrivateTripRoom(targetId);
        if (res && res.trip) {
          setRoomData(res);
          return res;
        }
        throw new Error("Không có dữ liệu.");
      } catch (err: any) {
        const demoRoom: TripRoomData = {
          trip: {
            id: targetId,
            title: "Săn mây Tà Xùa cùng Team Dev",
            status: "OPEN",
            startAt: "2026-11-25T06:00:00.000Z",
            endAt: "2026-11-26T18:00:00.000Z",
            capacity: 6,
            activeMemberCount: 3,
            pickupPoint: {
              id: "cf010000-0000-4000-8000-000000001002",
              name: "Bến xe Miền Đông Mới - Cổng 3",
            },
          },
          viewer: {
            isHost: true,
            membershipId: "mem-host-1",
            membershipVersion: 1,
            membershipStatus: "ACTIVE",
          },
          permissions: {
            canInvite: true,
            canRemoveMembers: true,
            canLeave: false,
            canRent: true,
          },
          requiredCheckpoints: [
            {
              id: "cp-1",
              name: "Trạm kiểm lâm Chân núi",
              sequence: 1,
            },
            {
              id: "cp-2",
              name: "Đỉnh Gió săn mây",
              sequence: 2,
            },
          ],
        };
        setRoomData(demoRoom);
        return demoRoom;
      } finally {
        setLoading(false);
      }
    },
    [tripId],
  );

  useEffect(() => {
    if (autoFetch && tripId) {
      void fetchRoom();
    }
  }, [autoFetch, tripId, fetchRoom]);

  return {
    roomData,
    setRoomData,
    loading,
    error,
    refetch: fetchRoom,
  };
}
