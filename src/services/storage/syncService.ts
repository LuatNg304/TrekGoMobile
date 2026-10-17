import { readStoredAuth } from "@/features/auth/storage";
import { SyncOutboxItem } from "@/types";
import * as Network from "expo-network";
import { AppState, NativeEventSubscription } from "react-native";
import {
  mapDifficultyToBackend,
  personalTrailApi,
  RawGpsSampleDto,
} from "../api/personalTrailApi";
import { recordingDatabase } from "./recordingDatabase";

let isSyncing = false;
let syncWaiters: (() => void)[] = [];
let syncTimer: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: NativeEventSubscription | null = null;
let networkSubscription: { remove: () => void } | null = null;
let wasOnline: boolean | null = null;

type SyncListener = () => void;
const syncListeners = new Set<SyncListener>();

function notifySyncCompleted() {
  syncListeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn("[syncService] Listener error:", err);
    }
  });
}

const SAMPLE_BATCH_SIZE = 100;

async function uploadAllPendingSamples(
  clientRecordingId: string,
  serverRecordingId: string,
  accessToken: string,
): Promise<void> {
  while (true) {
    const pending = await recordingDatabase.getUnsyncedSamples(
      clientRecordingId,
      SAMPLE_BATCH_SIZE,
    );

    if (pending.length === 0) return;

    const samples: RawGpsSampleDto[] = pending.map((sample) => ({
      clientSampleId: sample.clientSampleId,
      latitude: sample.latitude,
      longitude: sample.longitude,
      recordedAt: sample.recordedAt,
      accuracyM: sample.accuracyM,
      altitudeM: sample.altitudeM,
      altitudeAccuracyM: sample.altitudeAccuracyM,
      speedMps: sample.speedMps,
      headingDeg: sample.headingDeg,
      segmentId: sample.segmentId,
      accepted: sample.accepted,
      rejectReason: sample.rejectReason || null,
    }));

    const ack = await personalTrailApi.uploadRawSamples(
      serverRecordingId,
      { clientRecordingId, samples },
      accessToken,
    );

    if (!ack?.success) {
      throw new Error("Backend không xác nhận lô dữ liệu GPS.");
    }

    await recordingDatabase.markSamplesSynced(
      clientRecordingId,
      pending.map((sample) => sample.clientSampleId),
    );
  }
}

/**
 * Đảm bảo phiên ghi đã có serverRecordingId trên Backend.
 * Nếu chưa có (hoặc CREATE_RECORDING chưa chạy thành công trước đó),
 * tự động gọi startRecording để lấy serverRecordingId (Backend hỗ trợ Idempotency).
 */
async function ensureServerRecordingId(
  clientRecordingId: string,
  accessToken: string,
): Promise<string> {
  const recording = await recordingDatabase.getRecording(clientRecordingId);
  if (recording?.serverRecordingId) {
    return recording.serverRecordingId;
  }

  try {
    const startRes = await personalTrailApi.startRecording(
      {
        clientRecordingId,
        startedAt: recording?.startedAt || new Date().toISOString(),
      },
      accessToken,
    );
    if (startRes?.data?.serverRecordingId) {
      const serverId = startRes.data.serverRecordingId;
      await recordingDatabase.updateRecordingStatus(
        clientRecordingId,
        recording?.status || "RECORDING",
        { serverRecordingId: serverId },
      );
      return serverId;
    }
  } catch (err) {
    console.warn(
      `[syncService] Không thể auto-start recording ${clientRecordingId}:`,
      err,
    );
    // Giữ nguyên ApiError (status/code/details) để retry và log đúng nguyên nhân.
    throw err;
  }

  // Không được dùng client ID thay cho server ID. Nếu start thất bại, các tác
  // vụ phụ thuộc phải chờ retry; nếu không backend sẽ nhận một recordingId sai.
  throw new Error(`Máy chủ không trả về ID cho phiên ghi ${clientRecordingId}.`);
}

export const syncService = {
  /**
   * Bắt đầu tiến trình tự động đồng bộ ngầm khi thiết bị online trở lại:
   * 1. Quét ngay lập tức khi gọi.
   * 2. Lắng nghe AppState: mỗi khi app chuyển sang 'active' (mở lại app), quét ngay.
   * 3. Định kỳ chạy mỗi intervalMs (mặc định 15s) để bắt ngay thời điểm có mạng lại.
   */
  startAutoSync(intervalMs = 15_000): void {
    if (!syncTimer) {
      this.processSyncOutbox().catch(console.warn);

      syncTimer = setInterval(() => {
        this.processSyncOutbox().catch(console.warn);
      }, intervalMs);
    }

    if (!appStateSubscription) {
      appStateSubscription = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          this.processSyncOutbox().catch(console.warn);
        }
      });
    }

    if (!networkSubscription) {
      Network.getNetworkStateAsync()
        .then((state) => {
          wasOnline =
            state.isConnected === true && state.isInternetReachable !== false;
        })
        .catch(console.warn);

      networkSubscription = Network.addNetworkStateListener((state) => {
        const isOnline =
          state.isConnected === true && state.isInternetReachable !== false;
        const connectionWasRestored = isOnline && wasOnline === false;
        wasOnline = isOnline;

        if (connectionWasRestored) {
          this.processSyncOutbox().catch(console.warn);
        }
      });
    }
  },

  /**
   * Dừng dịch vụ tự động đồng bộ ngầm
   */
  stopAutoSync(): void {
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
    if (appStateSubscription) {
      appStateSubscription.remove();
      appStateSubscription = null;
    }
    if (networkSubscription) {
      networkSubscription.remove();
      networkSubscription = null;
      wasOnline = null;
    }
  },

  /**
   * Chờ lượt sync hiện tại, reset FAILED về PENDING và đẩy lại ngay lập tức.
   */
  async forceRetryAll(): Promise<{ attempted: number; remaining: number }> {
    const before = await recordingDatabase.getAllOutboxItems();
    // Chờ tiến trình hiện tại kết thúc để không reset item đang SYNCING.
    await this.processSyncOutbox();
    await recordingDatabase.resetAllPendingOutbox();
    await this.processSyncOutbox();
    // Nếu một auto-sync chen vào giữa hai await, lượt này bảo đảm quét lại item vừa reset.
    await this.processSyncOutbox();
    const after = await recordingDatabase.getAllOutboxItems();
    return {
      attempted: before.filter((item) => item.state !== "SYNCED").length,
      remaining: after.filter((item) => item.state !== "SYNCED").length,
    };
  },

  /**
   * Kích hoạt xử lý hàng đợi Outbox đồng bộ ngầm lên Backend
   */
  async processSyncOutbox(): Promise<void> {
    if (isSyncing) {
      await new Promise<void>((resolve) => syncWaiters.push(resolve));
      return;
    }
    isSyncing = true;

    try {
      const auth = await readStoredAuth();
      if (!auth?.accessToken) {
        // Chưa đăng nhập -> Tạm dừng sync outbox
        return;
      }
      const accessToken = auth.accessToken;

      const pendingItems = await recordingDatabase.getPendingOutbox(auth.user.id);
      if (pendingItems.length === 0) return;

      console.log(
        `[syncService] Bắt đầu đồng bộ outbox: tìm thấy ${pendingItems.length} tác vụ đang chờ xử lý...`,
      );

      for (const item of pendingItems) {
        const completed = await this.syncItem(item, accessToken);
        // Outbox có thứ tự phụ thuộc. Không gửi BATCH/FINISH khi CREATE trước đó lỗi.
        if (!completed) break;
      }
    } catch (err) {
      console.warn("[syncService] Lỗi khi xử lý sync outbox:", err);
    } finally {
      isSyncing = false;
      const waiters = syncWaiters;
      syncWaiters = [];
      waiters.forEach((resolve) => resolve());
    }
  },

  /**
   * Xử lý từng tác vụ đồng bộ cụ thể
   */
  async syncItem(
    item: SyncOutboxItem,
    accessToken: string,
  ): Promise<boolean> {
    try {
      const auth = await readStoredAuth();
      const recording = await recordingDatabase.getRecording(item.clientRecordingId);
      if (!auth || auth.accessToken !== accessToken || recording?.ownerId !== auth.user.id) return false;
      await recordingDatabase.updateOutboxItem(item.id, "SYNCING");
      const payload = JSON.parse(item.payloadJson);
      let completedServerTrailId: string | null = null;

      switch (item.operation) {
        case "CREATE_RECORDING": {
          const res = await personalTrailApi.startRecording(
            {
              clientRecordingId: item.clientRecordingId,
              startedAt: payload.startedAt,
            },
            accessToken,
          );

          if (res?.data?.serverRecordingId) {
            await recordingDatabase.updateRecordingStatus(
              item.clientRecordingId,
              recording.status,
              { serverRecordingId: res.data.serverRecordingId },
            );
          } else {
            throw new Error("Máy chủ không trả về serverRecordingId.");
          }
          break;
        }

        case "BATCH_POINTS": {
          const serverId = await ensureServerRecordingId(
            item.clientRecordingId,
            accessToken,
          );

          await uploadAllPendingSamples(
            item.clientRecordingId,
            serverId,
            accessToken,
          );
          break;
        }

        case "UPDATE_STATUS": {
          const serverId = await ensureServerRecordingId(
            item.clientRecordingId,
            accessToken,
          );

          await personalTrailApi.updateRecordingStatus(
            serverId,
            {
              clientRecordingId: item.clientRecordingId,
              status: payload.status,
              timestamp: payload.timestamp || new Date().toISOString(),
              currentSegmentId: payload.currentSegmentId,
            },
            accessToken,
          );
          break;
        }

        case "FINISH_RECORDING":
        case "CREATE_TRAIL": {
          const serverId = await ensureServerRecordingId(
            item.clientRecordingId,
            accessToken,
          );

          // Không cho phép hoàn tất trên backend khi thiết bị vẫn còn mẫu GPS chưa gửi.
          await uploadAllPendingSamples(
            item.clientRecordingId,
            serverId,
            accessToken,
          );

          const res = await personalTrailApi.finishRecording(
            serverId,
            {
              clientRecordingId: item.clientRecordingId,
              endedAt: payload.endedAt || new Date().toISOString(),
              trailMetadata: {
                title:
                  payload.title ||
                  payload.trailMetadata?.title ||
                  "Cung đường cá nhân",
                description:
                  payload.description ||
                  payload.trailMetadata?.description ||
                  "",
                region:
                  payload.region || payload.trailMetadata?.region || "Lâm Đồng",
                difficulty: mapDifficultyToBackend(
                  payload.difficulty ||
                    payload.trailMetadata?.difficulty ||
                    "Trung bình",
                ),
                terrainType:
                  payload.terrainType ||
                  payload.trailMetadata?.terrainType ||
                  "Rừng & Đồi dốc",
                visibility:
                  payload.visibility ||
                  payload.trailMetadata?.visibility ||
                  "PRIVATE",
              },
              provisionalTelemetry: payload.provisionalTelemetry || {
                distanceKm: Number(payload.distanceKm || 0),
                elevationGainM: Number(payload.elevationGainM || 0),
                duration: payload.duration || "0 phút",
                elapsedSeconds: Number(payload.elapsedSeconds || 0),
              },
            },
            accessToken,
          );

          if (res?.data?.serverPersonalTrailId) {
            const serverPersonalTrailId = res.data.serverPersonalTrailId;
            completedServerTrailId = serverPersonalTrailId;
            await recordingDatabase.updateRecordingStatus(
              item.clientRecordingId,
              "READY",
              {
                serverPersonalTrailId,
                lastSyncedAt: new Date().toISOString(),
              },
            );

          }
          break;
        }
      }

      // Đánh dấu hoàn tất
      await recordingDatabase.updateOutboxItem(item.id, "SYNCED");

      if (completedServerTrailId) {
        console.log("[syncService] Đã đồng bộ hoàn tất Personal Trail", {
          trailName: payload.title || payload.trailMetadata?.title || "Cung đường cá nhân",
          clientRecordingId: item.clientRecordingId,
          serverPersonalTrailId: completedServerTrailId,
        });
        notifySyncCompleted();
      }

      console.log(
        `[syncService] Đã đồng bộ thành công tác vụ ${item.operation} (id: ${item.id})`,
      );
      return true;
    } catch (error: any) {
      console.warn(
        `[syncService] Lỗi ${item.operation} của outbox item ${item.id}:`,
        {
          message: error?.message,
          status: error?.status,
          code: error?.code,
          details: error?.details,
          cause: error?.cause,
        },
      );

      // Nếu lỗi 401 thì không tăng attempt vô ích
      if (error?.status === 401) {
        await recordingDatabase.updateOutboxItem(item.id, "PENDING", {
          nextRetryAt: new Date(Date.now() + 15_000).toISOString(),
        });
        return false;
      }

      // Lỗi nghiệp vụ không thể retry (ví dụ: đoạn đường quá ngắn, không đủ 2 điểm GPS trên Backend)
      const errorMessage = error?.message || "";
      const isPermanentValidationError =
        error?.status === 400 &&
        (errorMessage.includes("ít nhất một đoạn") ||
          errorMessage.includes("2 điểm GPS") ||
          error?.code === "INSUFFICIENT_GPS_POINTS");

      if (isPermanentValidationError) {
        console.warn(
          `[syncService] Tác vụ ${item.id} không hợp lệ về mặt dữ liệu GPS (${errorMessage}). Đã xóa khỏi hàng đợi Outbox.`,
        );
        await recordingDatabase.deleteOutboxItem(item.id);
        await recordingDatabase.updateRecordingStatus(
          item.clientRecordingId,
          "PROCESSING_FAILED",
        );
        return false;
      }

      // Tính thời gian Exponential Backoff có Jitter
      const nextAttempt = (item.attemptCount || 0) + 1;
      const baseDelay = Math.min(300_000, 2 ** nextAttempt * 1000);
      const jitter = Math.random() * 1000;
      const nextRetryAt = new Date(
        Date.now() + baseDelay + jitter,
      ).toISOString();

      await recordingDatabase.updateOutboxItem(item.id, "FAILED", {
        attemptCount: nextAttempt,
        nextRetryAt,
      });
      return false;
    }
  },

  /**
   * Đăng ký lắng nghe sự kiện đồng bộ hoàn tất (để UI tự động reload)
   */
  onSyncCompleted(listener: SyncListener) {
    syncListeners.add(listener);
    return () => syncListeners.delete(listener);
  },

  notifySyncCompleted,
};
