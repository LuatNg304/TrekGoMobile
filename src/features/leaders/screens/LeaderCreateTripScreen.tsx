import { Colors } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/features/auth/AuthContext";
import {
  LeaderPermissionDenied,
  LeaderTripFormStep,
  LeaderTripRouteStep,
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
import type { LeaderTrailSuggestion } from "@/features/leaders/services/leader-public-trips.api";
import { validateTripDates } from "@/features/leaders/utils/tripDateUtils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatIsoToVnDate(isoStr?: string | null): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return "";
  }
}

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

interface LeaderCreateTripScreenProps {
  onNavigateTab?: (tabKey: "dashboard" | "trips" | "profile") => void;
}

export function LeaderCreateTripScreen({ onNavigateTab }: LeaderCreateTripScreenProps = {}) {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ id?: string; tripId?: string }>();
  const initialTripId = searchParams.id || searchParams.tripId;

  const { user: authUser, accessToken } = useAuth();
  const { user } = useApp();

  const {
    loading: apiLoading,
    loadDestinations,
    loadPickupPoints,
    loadCheckpoints,
    checkConflict,
    createTrip,
    updateTrip,
    getTripById,
    assignCheckpoints,
    loadTrailSuggestions,
    assignTrails,
    checkReadiness,
    publish,
  } = useLeaderTripCreation(accessToken);

  const canCreatePublicTrip = authUser?.role === "LEADER" || user?.role === "LEADER";

  // Flow 3 bước đồng bộ với Web: form (Bước 1) -> route (Bước 2) -> review (Bước 3)
  const [step, setStep] = useState<"form" | "route" | "review">("form");
  const [destinations, setDestinations] = useState<TripOptionDestination[]>([]);
  const [pickupPoints, setPickupPoints] = useState<TripOptionPickupPoint[]>([]);
  const [checkpoints, setCheckpoints] = useState<TripOptionCheckpoint[]>([]);
  const [trailSuggestions, setTrailSuggestions] = useState<LeaderTrailSuggestion[]>([]);
  const [selectedTrail, setSelectedTrail] = useState<LeaderTrailSuggestion | null>(null);

  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [isLoadingRouteData, setIsLoadingRouteData] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const [draftTripId, setDraftTripId] = useState<string | null>(initialTripId || null);
  const [draftTripVersion, setDraftTripVersion] = useState<number>(1);
  const [readinessIssues, setReadinessIssues] = useState<string[]>([]);
  const [isSavingExplanation, setIsSavingExplanation] = useState(false);

  const [form, setForm] = useState<LeaderTripFormData>({
    name: "",
    description: "",
    destinationId: "",
    pickupPointId: "",
    startDate: "",
    endDate: "",
    slots: "15",
    price: "2850000",
    priceExplanation: "",
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

  // Load existing trip if initialTripId is passed (Editing Public Trip)
  useEffect(() => {
    if (!initialTripId || !accessToken) return;
    setIsLoadingMeta(true);
    getTripById(initialTripId)
      .then((existing: any) => {
        setDraftTripId(existing.id);
        setDraftTripVersion(existing.version);
        setForm((prev) => ({
          ...prev,
          name: existing.title || prev.name,
          description: existing.description || "",
          destinationId: existing.destination?.id || existing.destinationId || prev.destinationId,
          pickupPointId: existing.pickupPoint?.id || existing.pickupPointId || prev.pickupPointId,
          startDate: formatIsoToVnDate(existing.startAt) || prev.startDate,
          endDate: formatIsoToVnDate(existing.endAt) || prev.endDate,
          slots: String(existing.capacity || prev.slots),
          price: existing.pricePerPax || existing.price || prev.price,
          priceExplanation: existing.priceExplanation || "",
        }));
      })
      .catch((err: any) => {
        console.warn("Lỗi tải thông tin chuyến để chỉnh sửa:", err?.message);
      })
      .finally(() => setIsLoadingMeta(false));
  }, [initialTripId, accessToken, getTripById]);

  const fetchDestinations = useCallback(() => {
    if (!canCreatePublicTrip || !accessToken) return;
    setIsLoadingMeta(true);
    setSubmitError(null);
    loadDestinations()
      .then((items) => {
        setDestinations(items);
      })
      .catch((err) => {
        setSubmitError(err?.message || "Không thể tải danh sách điểm đến.");
      })
      .finally(() => setIsLoadingMeta(false));
  }, [canCreatePublicTrip, accessToken, loadDestinations]);

  // Load destinations from API on mount
  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  // Load pickup points when destination changes
  useEffect(() => {
    if (!form.destinationId || !accessToken) {
      setPickupPoints([]);
      return;
    }
    loadPickupPoints(form.destinationId)
      .then((pts) => {
        setPickupPoints(pts);
      })
      .catch(() => setPickupPoints([]));
  }, [form.destinationId, accessToken, loadPickupPoints]);

  const selectedDestination = useMemo(
    () => destinations.find((d) => d.id === form.destinationId),
    [destinations, form.destinationId],
  );

  const selectedPickup = useMemo(
    () => pickupPoints.find((p) => p.id === form.pickupPointId),
    [pickupPoints, form.pickupPointId],
  );

  // Checkpoints thuộc trail được chọn theo đúng thứ tự
  const selectedCheckpoints = useMemo(() => {
    if (!selectedTrail?.checkpointIds) return [];
    return selectedTrail.checkpointIds
      .map((id) => checkpoints.find((c) => c.id === id))
      .filter((cp): cp is TripOptionCheckpoint => Boolean(cp));
  }, [selectedTrail, checkpoints]);

  const updateField = (field: keyof LeaderTripFormData, value: string) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "destinationId" && value !== current.destinationId) {
        next.pickupPointId = "";
        next.checkpointIds = [];
        setSelectedTrail(null);
      }
      return next;
    });
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const formatIssues = (rawIssues?: any[]): string[] => {
    if (!Array.isArray(rawIssues)) return [];
    return rawIssues
      .map((iss: any) => {
        if (!iss) return "";
        if (typeof iss === "string") return iss;
        return (
          iss.message ||
          iss.reason ||
          iss.detail ||
          iss.description ||
          (iss.field ? `${iss.field}: ${iss.code || "chưa hợp lệ"}` : "") ||
          iss.code ||
          JSON.stringify(iss)
        );
      })
      .filter(Boolean);
  };

  const validateFormStep = () => {
    const nextErrors: Partial<Record<keyof LeaderTripFormData, string>> = {};
    if (!form.name.trim()) nextErrors.name = "Vui lòng nhập tên chuyến đi.";
    if (!form.destinationId) {
      nextErrors.destinationId = "Vui lòng chọn điểm đến trekking từ hệ thống.";
    }
    if (!form.pickupPointId) {
      nextErrors.pickupPointId = "Vui lòng chọn điểm đón / tập kết toàn đoàn.";
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

    if (!form.priceExplanation.trim()) {
      nextErrors.priceExplanation =
        "Vui lòng nhập giải thích cơ cấu giá vé (bắt buộc trước khi publish).";
    } else if (form.priceExplanation.trim().length > 5000) {
      nextErrors.priceExplanation =
        "Giải thích cơ cấu giá vé không được vượt quá 5000 ký tự.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // ─── BƯỚC 1: LƯU THÔNG TIN & CHUYỂN SANG BƯỚC 2 (LỘ TRÌNH) ───────────────────
  const handleProceedToRoute = async () => {
    if (!validateFormStep()) return;
    setConflictWarning(null);
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const startIso = parseDateToIso(form.startDate, "06:00:00");
      const endIso = parseDateToIso(form.endDate, "18:00:00");

      let activeDraftId = draftTripId;
      let activeVersion = draftTripVersion;

      // Verify schedule conflict via API
      if (accessToken) {
        try {
          const conflict = await checkConflict(
            startIso,
            endIso,
            activeDraftId || undefined,
          );
          if (conflict?.hasConflict && conflict.conflicts?.length > 0) {
            setConflictWarning(`Trùng lịch với chuyến: ${conflict.conflicts[0].title}`);
          }
        } catch {
          // Non-blocking
        }
      }

      // 1. Tạo hoặc Cập nhật DRAFT public trip
      if (!activeDraftId) {
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
          price: form.price.trim() || "2850000",
          priceExplanation: form.priceExplanation.trim(),
        });
        activeDraftId = draft.id;
        activeVersion = draft.version;
        setDraftTripId(draft.id);
        setDraftTripVersion(draft.version);
      } else {
        const updated = await updateTrip(activeDraftId, {
          expectedVersion: activeVersion,
          title: form.name.trim(),
          description: form.description.trim(),
          startAt: startIso,
          endAt: endIso,
          pickupPointId: form.pickupPointId || (pickupPoints[0]?.id ?? ""),
          capacity: Number(form.slots),
          price: form.price.trim() || "2850000",
          priceExplanation: form.priceExplanation.trim(),
          destinationId: form.destinationId,
        });
        activeVersion = updated.version;
        setDraftTripVersion(updated.version);
      }

      // 2. Tải danh sách System Trail suggestions & Checkpoints của Destination
      setIsLoadingRouteData(true);
      const [rawSuggestions, destinationCps] = await Promise.all([
        loadTrailSuggestions(activeDraftId),
        loadCheckpoints(form.destinationId),
      ]);

      setCheckpoints(destinationCps);

      const suggestions = Array.isArray(rawSuggestions)
        ? rawSuggestions
        : ((rawSuggestions as any)?.items ?? []);

      setTrailSuggestions(suggestions);

      // Lọc các cung đường hợp lệ có checkpointIds.length > 0
      const validSuggestions = suggestions.filter(
        (s: any) => Array.isArray(s.checkpointIds) && s.checkpointIds.length > 0,
      );

      // Chọn trail hợp lệ đầu tiên nếu chưa chọn trail nào hoặc trail hiện tại không hợp lệ
      if (validSuggestions.length > 0) {
        if (!selectedTrail || !validSuggestions.some((v: any) => v.id === selectedTrail.id)) {
          const firstValid = validSuggestions[0];
          setSelectedTrail(firstValid);
          setForm((prev) => ({
            ...prev,
            checkpointIds: firstValid.checkpointIds || [],
          }));
        }
      } else {
        setSelectedTrail(null);
      }

      setStep("route");
    } catch (err: any) {
      setSubmitError(err?.message || "Không thể chuẩn bị chuyến đi để thiết lập lộ trình.");
    } finally {
      setIsSubmitting(false);
      setIsLoadingRouteData(false);
    }
  };

  // Chọn 1 System Trail từ danh sách hợp lệ và tự động lấy Checkpoints theo trail đó
  const handleSelectTrail = (trail: LeaderTrailSuggestion) => {
    if (!Array.isArray(trail.checkpointIds) || trail.checkpointIds.length === 0) {
      setSubmitError("Cung đường này chưa có checkpoint để xác định đường đi.");
      return;
    }
    setSubmitError(null);
    setSelectedTrail(trail);
    setForm((prev) => ({
      ...prev,
      checkpointIds: trail.checkpointIds || [],
    }));
  };

  // ─── BƯỚC 2: LƯU LỘ TRÌNH (CHECKPOINTS & TRAILS) VÀ SANG BƯỚC 3 (REVIEW) ─────
  const handleSaveRouteAndProceedToReview = async () => {
    if (!draftTripId) {
      setSubmitError("Chưa có mã chuyến đi. Vui lòng quay lại Bước 1.");
      return;
    }

    if (
      !selectedTrail ||
      !Array.isArray(selectedTrail.checkpointIds) ||
      selectedTrail.checkpointIds.length === 0
    ) {
      setSubmitError("Vui lòng lựa chọn 1 cung đường đã thẩm định có trạm kiểm soát hợp lệ.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let currentVer = draftTripVersion;

      // Bước 2.1: PUT /api/v1/leader/public-trips/{tripId}/checkpoints với expectedVersion
      const cpRes = await assignCheckpoints(draftTripId, {
        expectedVersion: currentVer,
        checkpointIds: selectedTrail.checkpointIds,
      });
      const nextVersion = cpRes.version;
      currentVer = nextVersion;
      setDraftTripVersion(nextVersion);

      // Bước 2.2: PUT /api/v1/leader/public-trips/{tripId}/trails với expectedVersion = nextVersion
      const trailRes = await assignTrails(draftTripId, {
        expectedVersion: nextVersion,
        trailIds: [selectedTrail.id],
      });
      currentVer = trailRes.version;
      setDraftTripVersion(trailRes.version);

      // Bước 2.3: Kiểm tra điều kiện sẵn sàng xuất bản (Readiness Check)
      const readiness = await checkReadiness(draftTripId);
      if (typeof readiness.version === "number") {
        setDraftTripVersion(readiness.version);
      }
      const formatted = formatIssues(readiness.issues);
      setReadinessIssues(formatted);

      setStep("review");
    } catch (err: any) {
      setSubmitError(err?.message || "Không thể lưu cấu hình lộ trình chuyến đi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePriceExplanation = async (newExplanation: string) => {
    if (!draftTripId) return;
    setIsSavingExplanation(true);
    setSubmitError(null);
    try {
      const updated = await updateTrip(draftTripId, {
        expectedVersion: draftTripVersion,
        priceExplanation: newExplanation.trim(),
      });
      setDraftTripVersion(updated.version);
      setForm((prev) => ({ ...prev, priceExplanation: newExplanation }));

      // Re-run readiness check to verify if priceExplanation issue is resolved
      const readiness = await checkReadiness(draftTripId);
      if (typeof readiness.version === "number") {
        setDraftTripVersion(readiness.version);
      }
      const formatted = formatIssues(readiness.issues);
      setReadinessIssues(formatted);
    } catch (err: any) {
      setSubmitError(err?.message || "Không thể cập nhật cơ cấu giá vé.");
      throw err;
    } finally {
      setIsSavingExplanation(false);
    }
  };

  // ─── BƯỚC 3: XUẤT BẢN CHUYẾN ĐI (PUBLISH) ──────────────────────────────────
  const handlePublish = async () => {
    if (!draftTripId) {
      setSubmitError("Chưa tạo được bản nháp chuyến đi. Vui lòng quay lại thử lại.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Re-check readiness right before publishing
      const readiness = await checkReadiness(draftTripId);
      const currentVer = typeof readiness.version === "number" ? readiness.version : draftTripVersion;

      if (!readiness.canPublish) {
        const formatted = formatIssues(readiness.issues);
        setReadinessIssues(formatted);
        if (formatted.length > 0) {
          throw new Error(`Chưa đủ điều kiện xuất bản: ${formatted.join(". ")}`);
        }
        throw new Error("Chuyến đi chưa sẵn sàng xuất bản. Vui lòng kiểm tra lại thông tin cơ cấu giá hoặc lộ trình.");
      }

      // Publish trip (DRAFT -> OPEN)
      const finalTrip = await publish(draftTripId, currentVer);

      setPublishedTrip({
        id: finalTrip.id,
        title: finalTrip.title,
        code: finalTrip.id.slice(-6).toUpperCase(),
      });
    } catch (err: any) {
      setSubmitError(err?.message || "Không thể xuất bản chuyến đi. Vui lòng thử lại.");
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
          onViewTripDetail={() =>
            router.replace({
              pathname: "/field-operations/leader-trip-detail" as any,
              params: { id: publishedTrip.id, tripId: publishedTrip.id },
            })
          }
          onGoToDashboard={() => {
            if (onNavigateTab) {
              setPublishedTrip(null);
              setStep("form");
              onNavigateTab("dashboard");
            } else {
              router.replace("/field-operations" as any);
            }
          }}
        />
      </SafeAreaView>
    );
  }

  // BƯỚC 3: XEM LẠI & XUẤT BẢN
  if (step === "review") {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <LeaderTripReviewStep
            form={form}
            selectedDestination={selectedDestination}
            selectedPickup={selectedPickup}
            selectedCheckpoints={selectedCheckpoints}
            selectedTrail={selectedTrail}
            conflictWarning={conflictWarning}
            submitError={submitError}
            readinessIssues={readinessIssues}
            isSubmitting={isSubmitting}
            apiLoading={apiLoading}
            onPublish={() => void handlePublish()}
            onBackToForm={() => setStep("route")}
            onSavePriceExplanation={handleSavePriceExplanation}
            isSavingExplanation={isSavingExplanation}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // BƯỚC 2: THIẾT LẬP LỘ TRÌNH (CHỌN SYSTEM TRAIL & CHECKPOINTS TƯƠNG ỨNG)
  if (step === "route") {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <LeaderTripRouteStep
            tripTitle={form.name}
            destinationName={selectedDestination?.name}
            trailSuggestions={trailSuggestions}
            destinationCheckpoints={checkpoints}
            selectedTrail={selectedTrail}
            onSelectTrail={handleSelectTrail}
            isLoading={isLoadingRouteData || isSubmitting}
            submitError={submitError}
            onProceed={() => void handleSaveRouteAndProceedToReview()}
            onBack={() => setStep("form")}
            onRetry={() => {
              if (draftTripId) {
                setIsLoadingRouteData(true);
                loadTrailSuggestions(draftTripId)
                  .then((raw) => {
                    const items = Array.isArray(raw) ? raw : ((raw as any)?.items ?? []);
                    setTrailSuggestions(items);
                  })
                  .finally(() => setIsLoadingRouteData(false));
              }
            }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // BƯỚC 1: THIẾT LẬP THÔNG TIN CHUYẾN ĐI
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
          onProceed={() => void handleProceedToRoute()}
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
