import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { useAuth } from '@/features/auth/AuthContext';
import { ApiError } from '@/lib/api-client';
import { generateUUID } from '@/services/storage/recordingDatabase';
import {
  finishGpsSession,
  getGpsContext,
  getGpsState,
  getMyActualRoute,
  getMyLiveRoute,
  pauseGpsSession,
  resumeGpsSession,
  startGpsSession,
  uploadGpsSamples,
} from '../services/trip-gps.api';
import { tripGpsSocket } from '../services/trip-gps.socket';
import {
  getActiveTripSession,
  getOrCreateDeviceId,
  getPendingCommands,
  getPendingSamples,
  getSessionCoordinates,
  insertGpsSample,
  markCommandSynced,
  markSamplesAccepted,
  markSamplesRejected,
  pruneCompletedSessionSamples,
  pruneSyncedCommands,
  saveLocalTripSession,
  updateLocalSessionStatus,
} from '../services/trip-gps.storage';
import type {
  ActualRouteResponse,
  GpsContextResponse,
  GpsPolicyDto,
  GpsSample,
  GpsStateResponse,
  MemberStateDto,
  SessionDto,
  TripCheckpointDto,
} from '../types';

export function useTripGps(tripId?: string) {
  const { accessToken, isLoading: authLoading } = useAuth();

  const [context, setContext] = useState<GpsContextResponse | null>(null);
  const [gpsState, setGpsState] = useState<GpsStateResponse | null>(null);
  const [session, setSession] = useState<SessionDto | null>(null);
  const [policy, setPolicy] = useState<GpsPolicyDto | null>(null);
  const [actualRoute, setActualRoute] = useState<ActualRouteResponse | null>(null);
  const [liveRouteCoords, setLiveRouteCoords] = useState<[number, number][]>([]);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracyM: number;
    altitudeM: number | null;
    speedMps: number | null;
    headingDeg: number | null;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const syncTimerRef = useRef<any>(null);
  const pollTimerRef = useRef<any>(null);
  const isSyncingRef = useRef(false);
  const canViewGps = Boolean(accessToken && context?.tripId === tripId && context?.permissions.canViewGroupLocations);

  // 1. Tải Context và Khôi phục Session từ SQLite
  const loadContextAndActiveSession = useCallback(async () => {
    if (authLoading) return;
    if (!tripId) {
      setError('Thiếu mã chuyến đi. Vui lòng mở GPS từ chi tiết chuyến đi.');
      setLoading(false);
      return;
    }
    if (!accessToken) {
      setError('Vui lòng đăng nhập để sử dụng GPS chuyến đi.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setContext(null);
      setGpsState(null);

      // Tải Context từ server
      const ctx = await getGpsContext(tripId);
      setContext(ctx);
      setPolicy(ctx.policy);

      // Khôi phục Session đang hoạt động từ SQLite
      const localActive = await getActiveTripSession(tripId);
      if (localActive) {
        setSession(localActive.session);
        setPolicy(localActive.policy);
        const coords = await getSessionCoordinates(localActive.session.id);
        setLiveRouteCoords(coords);
      }

      // Tải State hiện hành của cả đoàn
      const st = await getGpsState(tripId);
      setGpsState(st);

      // Tìm session của bản thân trong state nếu local chưa có
      if (!localActive && st.selfUserId) {
        const selfMember = st.members.find((m) => m.userId === st.selfUserId);
        if (selfMember?.session && ['ACTIVE', 'PAUSED'].includes(selfMember.session.status)) {
          const deviceId = await getOrCreateDeviceId();
          const reconstructedSession: SessionDto = {
            id: selfMember.session.id,
            tripId,
            userId: st.selfUserId,
            clientSessionId: generateUUID(),
            deviceId,
            gpsPolicyId: ctx.policy.id,
            status: selfMember.session.status,
            version: 1,
            startedAt: selfMember.session.startedAt,
            endedAt: selfMember.session.endedAt,
            uploadDeadline: null,
            sampleCount: selfMember.session.sampleCount,
            totalDistanceMeters: selfMember.session.totalDistanceMeters,
          };
          setSession(reconstructedSession);
          await saveLocalTripSession(reconstructedSession, ctx.policy);
        }
      }
    } catch (err: any) {
      console.warn('[useTripGps] Failed to load GPS context/state:', {
        tripId,
        status: err instanceof ApiError ? err.status : undefined,
        code: err instanceof ApiError ? err.code : undefined,
        message: err?.message,
      });
      setContext(null);
      setGpsState(null);
      setError(err instanceof ApiError && err.code === 'GPS_TEMPORARILY_UNAVAILABLE'
        ? err.message === 'An effective GPS policy is required'
          ? 'Máy chủ chưa có cấu hình GPS đang có hiệu lực. Vui lòng liên hệ quản trị viên để thiết lập GPS policy.'
          : 'Dịch vụ GPS tạm thời chưa sẵn sàng. Vui lòng thử lại sau.'
        : err instanceof ApiError && err.status === 403
        ? 'Máy chủ từ chối quyền GPS chuyến đi này. Tài khoản cần là thành viên hợp lệ hoặc leader được phân công; chỉ đặt vé hộ chưa đủ quyền GPS.'
        : err?.message || 'Không thể tải thông tin GPS chuyến đi.');
    } finally {
      setLoading(false);
    }
  }, [tripId, accessToken, authLoading]);

  useEffect(() => {
    loadContextAndActiveSession();
  }, [loadContextAndActiveSession]);

  // 2. Kết nối Socket.IO Realtime
  useEffect(() => {
    if (!tripId || !accessToken || !canViewGps) return;

    tripGpsSocket.connect(accessToken, tripId, {
      onConnect: () => setSocketConnected(true),
      onDisconnect: () => setSocketConnected(false),
      onError: (err) => console.warn('[useTripGps] Socket error:', err?.message || err),
      onMemberUpdated: (event) => {
        const updatedMember = event.data.member;
        setGpsState((prev) => {
          if (!prev) return prev;
          const exists = prev.members.some((m) => m.userId === updatedMember.userId);
          const newMembers = exists
            ? prev.members.map((m) =>
                m.userId === updatedMember.userId && updatedMember.memberVersion >= m.memberVersion
                  ? updatedMember
                  : m
              )
            : [...prev.members, updatedMember];
          return { ...prev, members: newMembers };
        });
      },
      onTripChanged: () => {
        // Tải lại state & context khi chuyến đi có thay đổi
        if (tripId) {
          getGpsState(tripId).then(setGpsState).catch(() => {});
          getGpsContext(tripId).then(setContext).catch(() => {});
        }
      },
      onRouteReady: (event) => {
        if (tripId && event.data.userId === gpsState?.selfUserId) {
          getMyActualRoute(tripId).then(setActualRoute).catch(() => {});
        }
      },
      onAccessRevoked: () => {
        setError('Quyền truy cập GPS của bạn trong chuyến này đã bị thu hồi.');
      },
    });

    return () => {
      tripGpsSocket.disconnect();
      setSocketConnected(false);
    };
  }, [tripId, accessToken, canViewGps, gpsState?.selfUserId]);

  // 3. Polling Fallback (Mỗi 20s đối soát lại State cả đoàn khi ở màn hình)
  useEffect(() => {
    if (!tripId || !canViewGps) return;
    pollTimerRef.current = setInterval(async () => {
      try {
        const freshState = await getGpsState(tripId);
        setGpsState(freshState);
      } catch {
        // Silent catch for background poll
      }
    }, 20000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [tripId, canViewGps]);

  // 4. Lấy GPS thiết bị thực tế khi Session đang ACTIVE
  useEffect(() => {
    let isCancelled = false;

    async function startLocationTracking() {
      if (session?.status !== 'ACTIVE') {
        if (locationSubscriptionRef.current) {
          locationSubscriptionRef.current.remove();
          locationSubscriptionRef.current = null;
        }
        return;
      }

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Cần cấp quyền truy cập vị trí để ghi lộ trình trekking.');
          return;
        }

        const intervalSec = policy?.sampleIntervalSeconds || 5;

        locationSubscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: intervalSec * 1000,
            distanceInterval: 3,
          },
          async (loc) => {
            if (isCancelled || !session) return;

            const accuracy = loc.coords.accuracy ?? 10;
            // Bỏ qua điểm nếu accuracy vượt trần cho phép của policy
            const maxAcc = policy?.maxAcceptedAccuracyM || 50;
            if (accuracy > maxAcc) return;

            const sample: GpsSample = {
              clientSampleId: generateUUID(),
              recordedAt: new Date(loc.timestamp).toISOString(),
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracyM: accuracy,
              altitudeM: loc.coords.altitude ?? null,
              speedMps: loc.coords.speed ?? null,
              headingDeg: loc.coords.heading ?? null,
            };

            // Lưu tức thì vào SQLite
            await insertGpsSample(session.id, sample);

            setCurrentLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracyM: accuracy,
              altitudeM: loc.coords.altitude,
              speedMps: loc.coords.speed,
              headingDeg: loc.coords.heading,
            });

            setLiveRouteCoords((prev) => [...prev, [sample.longitude, sample.latitude]]);
          }
        );
      } catch (err: any) {
        console.warn('[useTripGps] Location tracking error:', err?.message || err);
      }
    }

    startLocationTracking();

    return () => {
      isCancelled = true;
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
    };
  }, [session?.status, session?.id, policy]);

  // 5. Chu kỳ Đồng bộ SQLite -> Backend (Mỗi syncIntervalSeconds)
  const processOutboxSync = useCallback(async () => {
    if (!tripId || !session || isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncing(true);

    try {
      const deviceId = await getOrCreateDeviceId();

      // a. Xử lý các lệnh Pending (Pause, Resume, Finish)
      const pendingCmds = await getPendingCommands(session.id);
      for (const cmd of pendingCmds) {
        try {
          if (cmd.action === 'PAUSE') {
            await pauseGpsSession(tripId, session.id, {
              commandId: cmd.commandId,
              expectedVersion: cmd.expectedVersion,
              occurredAt: cmd.occurredAt,
            }, deviceId);
          } else if (cmd.action === 'RESUME') {
            await resumeGpsSession(tripId, session.id, {
              commandId: cmd.commandId,
              expectedVersion: cmd.expectedVersion,
              occurredAt: cmd.occurredAt,
            }, deviceId);
          } else if (cmd.action === 'FINISH') {
            await finishGpsSession(tripId, session.id, {
              commandId: cmd.commandId,
              expectedVersion: cmd.expectedVersion,
              occurredAt: cmd.occurredAt,
              reason: 'USER_FINISHED',
            }, deviceId);
          }
          await markCommandSynced(cmd.commandId);
        } catch (cmdErr: any) {
          console.warn('[useTripGps] Command sync failed:', cmd.action, cmdErr?.message);
        }
      }
      await pruneSyncedCommands(session.id);

      // b. Xử lý các điểm GPS chưa đồng bộ (synced = 0)
      const maxBatch = policy?.maxBatchSamples || 200;
      const pendingSamples = await getPendingSamples(session.id, maxBatch);

      if (pendingSamples.length > 0) {
        const res = await uploadGpsSamples(tripId, session.id, { samples: pendingSamples }, deviceId);

        const accepted = [...res.acceptedSampleIds, ...res.duplicateSampleIds];
        await markSamplesAccepted(session.id, accepted);

        if (res.rejectedSamples?.length > 0) {
          await markSamplesRejected(session.id, res.rejectedSamples);
        }
      }
    } catch (err: any) {
      console.warn('[useTripGps] Outbox sync error:', err?.message || err);
    } finally {
      isSyncingRef.current = false;
      setSyncing(false);
    }
  }, [tripId, session, policy]);

  useEffect(() => {
    const syncSec = policy?.syncIntervalSeconds || 10;
    syncTimerRef.current = setInterval(processOutboxSync, syncSec * 1000);
    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [processOutboxSync, policy]);

  // 6. Thao tác điều khiển phiên (Start, Pause, Resume, Finish)
  const startRecording = useCallback(async () => {
    if (!tripId || !canViewGps || !context?.permissions.canRecord) {
      setError(context?.permissions.cannotRecordReason || 'Chưa đủ điều kiện ghi GPS cho chuyến đi này.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const clientSessionId = generateUUID();
      const deviceId = await getOrCreateDeviceId();

      const res = await startGpsSession(tripId, { clientSessionId, deviceId }, deviceId);
      setSession(res.session);
      setPolicy(res.policy);

      await saveLocalTripSession(res.session, res.policy);
    } catch (err: any) {
      console.warn('[useTripGps] Start session error:', err?.message || err);
      setError(err?.message || 'Không thể bắt đầu phiên ghi GPS.');
    } finally {
      setLoading(false);
    }
  }, [tripId, canViewGps, context]);

  const pauseRecording = useCallback(async () => {
    if (!tripId || !session) return;
    try {
      setLoading(true);
      const commandId = generateUUID();
      const deviceId = await getOrCreateDeviceId();
      const occurredAt = new Date().toISOString();

      const res = await pauseGpsSession(
        tripId,
        session.id,
        { commandId, expectedVersion: session.version, occurredAt },
        deviceId
      );
      setSession(res.session);
      await updateLocalSessionStatus(session.id, 'PAUSED', res.session.version);
    } catch (err: any) {
      console.warn('[useTripGps] Pause session error:', err?.message || err);
      setError(err?.message || 'Lỗi khi tạm dừng phiên.');
    } finally {
      setLoading(false);
    }
  }, [tripId, session]);

  const resumeRecording = useCallback(async () => {
    if (!tripId || !session) return;
    try {
      setLoading(true);
      const commandId = generateUUID();
      const deviceId = await getOrCreateDeviceId();
      const occurredAt = new Date().toISOString();

      const res = await resumeGpsSession(
        tripId,
        session.id,
        { commandId, expectedVersion: session.version, occurredAt },
        deviceId
      );
      setSession(res.session);
      await updateLocalSessionStatus(session.id, 'ACTIVE', res.session.version);
    } catch (err: any) {
      console.warn('[useTripGps] Resume session error:', err?.message || err);
      setError(err?.message || 'Lỗi khi tiếp tục phiên.');
    } finally {
      setLoading(false);
    }
  }, [tripId, session]);

  const finishRecording = useCallback(async () => {
    if (!tripId || !session) return;
    try {
      setLoading(true);
      const commandId = generateUUID();
      const deviceId = await getOrCreateDeviceId();
      const occurredAt = new Date().toISOString();

      const res = await finishGpsSession(
        tripId,
        session.id,
        { commandId, expectedVersion: session.version, occurredAt, reason: 'USER_FINISHED' },
        deviceId
      );

      setSession(res.session);
      await updateLocalSessionStatus(session.id, 'STOPPED', res.session.version, res.session.endedAt);

      // Thử lấy ActualRoute ngay nếu READY
      if (res.resultStatus === 'READY') {
        const route = await getMyActualRoute(tripId);
        setActualRoute(route);
        // Dọn dẹp các điểm thô đã đồng bộ xong
        await pruneCompletedSessionSamples(session.id);
      }
    } catch (err: any) {
      console.warn('[useTripGps] Finish session error:', err?.message || err);
      setError(err?.message || 'Lỗi khi kết thúc phiên.');
    } finally {
      setLoading(false);
    }
  }, [tripId, session]);

  // 7. Computed Data
  const myMemberState = useMemo<MemberStateDto | null>(() => {
    if (!gpsState || !gpsState.selfUserId) return null;
    return gpsState.members.find((m) => m.userId === gpsState.selfUserId) || null;
  }, [gpsState]);

  const otherMembers = useMemo<MemberStateDto[]>(() => {
    if (!gpsState) return [];
    return gpsState.members.filter((m) => m.userId !== gpsState.selfUserId);
  }, [gpsState]);

  // Tuyến kế hoạch (Planned Route Geometry)
  const plannedRouteCoords = useMemo(() => {
    if (!context || !context.routePlans || context.routePlans.length === 0) return [];
    const activePlan =
      context.routePlans.find((p) => p.trailPlanId === context.activeTrailPlanId) ||
      context.routePlans[0];
    if (!activePlan?.geometry) return [];
    if (activePlan.geometry.type === 'LineString') {
      return activePlan.geometry.coordinates as [number, number][];
    }
    if (activePlan.geometry.type === 'MultiLineString') {
      return activePlan.geometry.coordinates as [number, number][][];
    }
    return [];
  }, [context]);

  // Checkpoints
  const checkpoints = useMemo(() => {
    return context?.checkpoints || [];
  }, [context]);

  const arrivedCheckpointIds = useMemo(() => {
    return myMemberState?.checkpointProgress?.arrivedCheckpointIds || [];
  }, [myMemberState]);

  // Mốc Checkpoint tiếp theo cần đến
  const nextCheckpoint = useMemo<TripCheckpointDto | null>(() => {
    if (!checkpoints || checkpoints.length === 0) return null;
    const sorted = [...checkpoints].sort((a, b) => a.sequence - b.sequence);
    return sorted.find((cp) => !arrivedCheckpointIds.includes(cp.id)) || null;
  }, [checkpoints, arrivedCheckpointIds]);

  // Cảnh báo lệch tuyến
  const deviation = useMemo(() => {
    const status = myMemberState?.deviation?.status || 'NORMAL';
    const distanceM = myMemberState?.deviation?.distanceToRouteMeters ?? null;
    return {
      isDeviated: status === 'DEVIATED',
      status,
      distanceM,
    };
  }, [myMemberState]);

  // Thống kê di chuyển
  const stats = useMemo(() => {
    const distanceM = session?.totalDistanceMeters ?? myMemberState?.session?.totalDistanceMeters ?? 0;
    const distanceKm = (distanceM / 1000).toFixed(2);
    const speedKmh = currentLocation?.speedMps != null ? (currentLocation.speedMps * 3.6).toFixed(1) : '0.0';
    const altitudeM = currentLocation?.altitudeM != null ? Math.round(currentLocation.altitudeM) : '--';
    const accuracyM = currentLocation?.accuracyM != null ? Math.round(currentLocation.accuracyM) : 8;

    return {
      distanceKm,
      speedKmh,
      altitudeM,
      accuracyM,
    };
  }, [session, myMemberState, currentLocation]);

  return {
    context,
    gpsState,
    session,
    policy,
    myMemberState,
    otherMembers,
    plannedRouteCoords,
    liveRouteCoords,
    currentLocation,
    checkpoints,
    arrivedCheckpointIds,
    nextCheckpoint,
    deviation,
    stats,
    actualRoute,
    loading,
    syncing,
    error,
    socketConnected,
    startRecording,
    pauseRecording,
    resumeRecording,
    finishRecording,
    refreshState: loadContextAndActiveSession,
  };
}
