import { Colors } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/features/auth/AuthContext";
import {
  LeaderPermissionDenied,
  LeaderTripFormStep,
  LeaderTripReviewStep,
  LeaderTripSuccessView,
  type LeaderTripFormData,
} from "@/features/leaders/components";
import {
  useLeaderTripCreation,
  type TripOptionCheckpoint,
  type TripOptionDestination,
  type TripOptionPickupPoint,
} from "@/features/leaders/hooks";
import { validateTripDates } from "@/features/leaders/utils/tripDateUtils";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function parseDateToIso(str: string, timeStr = "06:00:00"): string {
  const trimmed = str.trim();
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/");
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];
      return new Date(`${year}-${month}-${day}T${timeStr}.000Z`).toISOString();
    }
  }
  if (trimmed.includes("-")) {
    return new Date(`${trimmed}T${timeStr}.000Z`).toISOString();
  }
  return new Date(trimmed).toISOString();
}

export function LeaderCreateTripScreen() {
  const router = useRouter();
  const { user: authUser, accessToken } = useAuth();
  const { authRole } = useApp();

  const {
    loading: apiLoading,
    loadDestinations,
    loadPickupPoints,
    loadCheckpoints,
    checkConflict,
    createTrip,
    assignCheckpoints,
    loadTrailSuggestions,
    assignTrails,
    checkReadiness,
    publish,
  } = useLeaderTripCreation(accessToken);

  const canCreatePublicTrip = authUser?.role === "LEADER" || authRole === "LEADER";

  const [step, setStep] = useState<"form" | "review">("form");
  const [destinations, setDestinations] = useState<TripOptionDestination[]>([]);
  const [pickupPoints, setPickupPoints] = useState<TripOptionPickupPoint[]>([]);
  const [checkpoints, setCheckpoints] = useState<TripOptionCheckpoint[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const [form, setForm] = useState<LeaderTripFormData>({
    name: "",
    description: "",
    destinationId: "",
    pickupPointId: "",
    startDate: "",
    endDate: "",
    slots: "12",
    price: "2500000",
    checkpointIds: [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LeaderTripFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [publishedTrip, setPublishedTrip] = useState<{
    id: string;
    title: string;
    code: string;
  } | null>(null);

  const fetchDestinations = useCallback(() => {
    if (!canCreatePublicTrip || !accessToken) return;
    setIsLoadingMeta(true);
    setSubmitError(null);
    loadDestinations()
      .then((items) => {
        setDestinations(items);
        if (items.length > 0 && !form.destinationId) {
          setForm((prev) => ({ ...prev, destinationId: items[0].id }));
        }
      })
      .catch((err) => {
        setSubmitError(err?.message || "Không thể tải danh sách điểm đến.");
      })
      .finally(() => setIsLoadingMeta(false));
  }, [canCreatePublicTrip, accessToken, loadDestinations, form.destinationId]);

  // Load destinations from API on mount
  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  // Load pickup points & checkpoints when destination changes
  useEffect(() => {
    if (!form.destinationId || !accessToken) return;
    loadPickupPoints(form.destinationId)
      .then((pts) => {
        setPickupPoints(pts);
        if (pts.length > 0) {
          setForm((prev) => ({ ...prev, pickupPointId: pts[0].id }));
        }
      })
      .catch(() => setPickupPoints([]));

    loadCheckpoints(form.destinationId)
      .then((cps) => {
        setCheckpoints(cps);
        setForm((prev) => ({ ...prev, checkpointIds: cps.map((c) => c.id) }));
      })
      .catch(() => setCheckpoints([]));
  }, [form.destinationId, accessToken, loadPickupPoints, loadCheckpoints]);

  const selectedDestination = useMemo(
    () => destinations.find((d) => d.id === form.destinationId),
    [destinations, form.destinationId],
  );

  const selectedPickup = useMemo(
    () => pickupPoints.find((p) => p.id === form.pickupPointId),
    [pickupPoints, form.pickupPointId],
  );

  const selectedCheckpoints = useMemo(
    () => checkpoints.filter((c) => form.checkpointIds.includes(c.id)),
    [checkpoints, form.checkpointIds],
  );

  const updateField = (field: keyof LeaderTripFormData, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const toggleCheckpoint = (id: string) => {
    setForm((current) => ({
      ...current,
      checkpointIds: current.checkpointIds.includes(id)
        ? current.checkpointIds.filter((cpId) => cpId !== id)
        : [...current.checkpointIds, id],
    }));
    setErrors((current) => ({ ...current, checkpointIds: undefined }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof LeaderTripFormData, string>> = {};
    if (!form.name.trim()) nextErrors.name = "Vui lòng nhập tên chuyến đi.";
    if (!form.destinationId && destinations.length > 0) {
      nextErrors.destinationId = "Vui lòng chọn điểm đến.";
    }

    // Strict date validation
    const dateCheck = validateTripDates(form.startDate, form.endDate);
    if (!dateCheck.isValid) {
      if (dateCheck.startError) nextErrors.startDate = dateCheck.startError;
      if (dateCheck.endError) nextErrors.endDate = dateCheck.endError;
    }

    const slots = Number(form.slots);
    if (!form.slots.trim() || !Number.isInteger(slots) || slots < 1) {
      nextErrors.slots = "Số slot phải là số nguyên từ 1 đến 30.";
    } else if (slots > 30) {
      nextErrors.slots = "Quy định an toàn VFRS: Tối đa 30 slot / đoàn.";
    }

    if (form.checkpointIds.length === 0 && checkpoints.length > 0) {
      nextErrors.checkpointIds = "Chọn ít nhất 1 checkpoint của tuyến.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleProceedToReview = async () => {
    if (!validate()) return;
    setConflictWarning(null);

    // Verify schedule conflict via API
    try {
      const startIso = parseDateToIso(form.startDate, "06:00:00");
      const endIso = parseDateToIso(form.endDate, "18:00:00");
      if (accessToken) {
        const conflict = await checkConflict(startIso, endIso);
        if (conflict?.hasConflict && conflict.conflicts?.length > 0) {
          setConflictWarning(`Trùng lịch với chuyến: ${conflict.conflicts[0].title}`);
        }
      }
    } catch {
      // Non-blocking
    }

    setStep("review");
  };

  const handlePublish = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const startIso = parseDateToIso(form.startDate, "06:00:00");
      const endIso = parseDateToIso(form.endDate, "18:00:00");

      // 1. Create DRAFT public trip via API
      const draft = await createTrip({
        destinationId: form.destinationId,
        title: form.name.trim(),
        description:
          form.description.trim() ||
          `Chuyến đi công khai do Mountain Leader ${authUser?.name || "TrekGo"} phụ trách.`,
        startAt: startIso,
        endAt: endIso,
        pickupPointId: form.pickupPointId || (pickupPoints[0]?.id ?? ""),
        capacity: Number(form.slots),
        price: form.price.trim() || "2500000",
      });

      let currentVersion = draft.version;

      // 2. Attach selected checkpoints
      if (form.checkpointIds.length > 0) {
        const withCps = await assignCheckpoints(draft.id, {
          expectedVersion: currentVersion,
          checkpointIds: form.checkpointIds,
        });
        currentVersion = withCps.version;
      }

      // 3. Attach trail suggestions & align checkpoint order with route sequence
      try {
        const rawSuggestions = await loadTrailSuggestions(draft.id);
        const suggestions = Array.isArray(rawSuggestions)
          ? rawSuggestions
          : ((rawSuggestions as any)?.items ?? []);

        if (suggestions.length > 0) {
          // Lấy danh sách ID các checkpoint được trail đi qua theo đúng thứ tự
          const trailOrderedCpIds: string[] = [];
          for (const s of suggestions) {
            if (Array.isArray(s.coveredCheckpointIds)) {
              for (const cid of s.coveredCheckpointIds) {
                if (!trailOrderedCpIds.includes(cid)) {
                  trailOrderedCpIds.push(cid);
                }
              }
            }
          }

          // Nếu có thứ tự checkpoint xác định từ trail, đồng bộ lại thứ tự checkpoints cho khớp với route
          if (
            trailOrderedCpIds.length > 0 &&
            JSON.stringify(trailOrderedCpIds) !== JSON.stringify(form.checkpointIds)
          ) {
            const reorderedCps = await assignCheckpoints(draft.id, {
              expectedVersion: currentVersion,
              checkpointIds: trailOrderedCpIds,
            });
            currentVersion = reorderedCps.version;
          }

          // Gán toàn bộ trail gợi ý của tuyến
          const trailIdsToAssign = suggestions.map((s: any) => s.id);
          const withTrails = await assignTrails(draft.id, {
            expectedVersion: currentVersion,
            trailIds: trailIdsToAssign,
          });
          currentVersion = withTrails.version;
        }
      } catch (trailErr: any) {
        console.warn("Lỗi tải/gán trail suggestions:", trailErr?.message);
      }

      // 4. Kiểm tra điều kiện sẵn sàng xuất bản (Readiness Check)
      try {
        const readiness = await checkReadiness(draft.id);
        if (typeof readiness.version === "number") {
          currentVersion = readiness.version;
        }
        if (!readiness.canPublish) {
          const rawIssues = readiness.issues || [];
          const formatted = rawIssues
            .map((iss: any) => {
              if (!iss) return "";
              if (typeof iss === "string") return iss;
              return (
                iss.message ||
                iss.reason ||
                iss.detail ||
                iss.description ||
                (iss.field ? `${iss.field}: ${iss.code || "không hợp lệ"}` : "") ||
                iss.code ||
                JSON.stringify(iss)
              );
            })
            .filter(Boolean);

          if (formatted.length > 0) {
            throw new Error(`Chưa đủ điều kiện xuất bản: ${formatted.join(". ")}`);
          }
          throw new Error("Chuyến đi chưa sẵn sàng xuất bản. Vui lòng kiểm tra lại thông tin cung đường hoặc trạm kiểm soát.");
        }
      } catch (readinessErr: any) {
        if (
          readinessErr?.message?.includes("Chưa đủ điều kiện xuất bản") ||
          readinessErr?.message?.includes("Chuyến đi chưa sẵn sàng")
        ) {
          throw readinessErr;
        }
      }

      // 5. Publish trip
      const finalTrip = await publish(draft.id, currentVersion);

      setPublishedTrip({
        id: finalTrip.id,
        title: finalTrip.title,
        code: finalTrip.id.slice(-6).toUpperCase(),
      });
    } catch (err: any) {
      setSubmitError(err?.message || "Không thể tạo và xuất bản chuyến đi. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canCreatePublicTrip) {
    return (
      <SafeAreaView style={styles.safe}>
        <LeaderPermissionDenied onBack={() => router.back()} />
      </SafeAreaView>
    );
  }

  if (publishedTrip) {
    return (
      <SafeAreaView style={styles.safe}>
        <LeaderTripSuccessView
          publishedTrip={publishedTrip}
          form={form}
          selectedDestination={selectedDestination}
          onProceedPretrip={() =>
            router.replace("/field-operations/leader-pretrip" as any)
          }
        />
      </SafeAreaView>
    );
  }

  if (step === "review") {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <LeaderTripReviewStep
            form={form}
            selectedDestination={selectedDestination}
            selectedPickup={selectedPickup}
            selectedCheckpoints={selectedCheckpoints}
            conflictWarning={conflictWarning}
            submitError={submitError}
            isSubmitting={isSubmitting}
            apiLoading={apiLoading}
            onPublish={() => void handlePublish()}
            onBackToForm={() => setStep("form")}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LeaderTripFormStep
          form={form}
          errors={errors}
          destinations={destinations}
          pickupPoints={pickupPoints}
          checkpoints={checkpoints}
          isLoadingMeta={isLoadingMeta}
          submitError={submitError}
          onUpdateField={updateField}
          onProceed={() => void handleProceedToReview()}
          onBack={() => router.back()}
          onRetryLoadMeta={fetchDestinations}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
});
