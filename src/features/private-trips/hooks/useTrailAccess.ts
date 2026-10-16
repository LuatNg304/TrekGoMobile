import { ApiError } from "@/lib/api-client";
import { useCallback, useState } from "react";
import {
  checkTrailAccess,
  purchaseTrailAccess,
} from "../services/private-trips.api";
import type {
  PurchaseTrailPayload,
  PurchaseTrailResponse,
  TrailAccessResponse,
} from "../types";

export function useTrailAccess() {
  const [accessInfo, setAccessInfo] = useState<TrailAccessResponse | null>(null);
  const [purchaseResult, setPurchaseResult] =
    useState<PurchaseTrailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAccess = useCallback(
    async (trailId: string): Promise<TrailAccessResponse> => {
      setLoading(true);
      setError(null);
      try {
        const res = await checkTrailAccess(trailId);
        setAccessInfo(res);
        return res;
      } catch (err: any) {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Không thể kiểm tra quyền truy cập cung đường.";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const purchaseAccess = useCallback(
    async (
      trailId: string,
      payload: PurchaseTrailPayload = { paymentMethod: "QR" },
    ): Promise<PurchaseTrailResponse> => {
      setLoading(true);
      setError(null);
      try {
        const res = await purchaseTrailAccess(trailId, payload);
        setPurchaseResult(res);
        if (res.accessStatus === "ACTIVE") {
          setAccessInfo({
            hasAccess: true,
            accessId: res.trailAccessId,
            purchasedAt: new Date().toISOString(),
          });
        }
        return res;
      } catch (err: any) {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Không thể thực hiện mua quyền truy cập cung đường.";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setAccessInfo(null);
    setPurchaseResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    accessInfo,
    purchaseResult,
    loading,
    error,
    checkAccess,
    purchaseAccess,
    reset,
  };
}
