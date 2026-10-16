import { apiRequest } from "@/lib/api-client";
import { readStoredAuth } from "@/features/auth/storage";
import { recordingDatabase } from "./recordingDatabase";
import { SyncOutboxItem } from "@/types";

let isSyncing = false;

export const syncService = {
  /**
   * Kích hoạt xử lý hàng đợi Outbox đồng bộ ngầm lên Backend
   */
  async processSyncOutbox(): Promise<void> {
    if (isSyncing) return;
    isSyncing = true;

    try {
      const auth = await readStoredAuth();
      const accessToken = auth?.accessToken;
      if (!accessToken) {
        // Chưa đăng nhập -> Tạm dừng sync outbox
        return;
      }

      const pendingItems = await recordingDatabase.getPendingOutbox();
      if (pendingItems.length === 0) return;

      for (const item of pendingItems) {
        await this.syncItem(item, accessToken);
      }
    } catch (err) {
      console.warn("[syncService] Lỗi khi xử lý sync outbox:", err);
    } finally {
      isSyncing = false;
    }
  },

  /**
   * Xử lý từng tác vụ đồng bộ cụ thể
   */
  async syncItem(item: SyncOutboxItem, accessToken: string): Promise<void> {
    try {
      await recordingDatabase.updateOutboxItem(item.id, "SYNCING");
      const payload = JSON.parse(item.payloadJson);

      switch (item.operation) {
        case "CREATE_RECORDING": {
          const res = await apiRequest<{ id: string; clientRecordingId: string }>(
            "/api/v1/trail-recordings",
            {
              method: "POST",
              accessToken,
              body: JSON.stringify({
                clientRecordingId: item.clientRecordingId,
                startedAt: payload.startedAt,
              }),
            },
          );

          if (res?.id) {
            await recordingDatabase.updateRecordingStatus(
              item.clientRecordingId,
              "PENDING_SYNC",
              { serverRecordingId: res.id },
            );
          }
          break;
        }

        case "BATCH_POINTS": {
          const recording = await recordingDatabase.getRecording(item.clientRecordingId);
          const serverId = recording?.serverRecordingId || item.clientRecordingId;

          const unsyncedSamples = await recordingDatabase.getUnsyncedSamples(
            item.clientRecordingId,
            200,
          );

          if (unsyncedSamples.length > 0) {
            const pointsPayload = unsyncedSamples.map((s) => ({
              clientSampleId: s.clientSampleId,
              latitude: s.latitude,
              longitude: s.longitude,
              accuracyM: s.accuracyM,
              speedMps: s.speedMps,
              headingDeg: s.headingDeg,
              altitudeM: s.altitudeM,
              altitudeAccuracyM: s.altitudeAccuracyM,
              segmentId: s.segmentId,
              recordedAt: s.recordedAt,
            }));

            const ack = await apiRequest<{ acceptedCount: number }>(
              `/api/v1/trail-recordings/${serverId}/points:batch`,
              {
                method: "POST",
                accessToken,
                body: JSON.stringify({ points: pointsPayload }),
              },
            );

            if (ack) {
              const sampleIds = unsyncedSamples.map((s) => s.clientSampleId);
              await recordingDatabase.markSamplesSynced(item.clientRecordingId, sampleIds);
            }
          }
          break;
        }

        case "FINISH_RECORDING": {
          const recording = await recordingDatabase.getRecording(item.clientRecordingId);
          const serverId = recording?.serverRecordingId || item.clientRecordingId;

          await apiRequest(
            `/api/v1/trail-recordings/${serverId}/finish`,
            {
              method: "POST",
              accessToken,
              body: JSON.stringify({
                endedAt: payload.endedAt,
              }),
            },
          );

          await recordingDatabase.updateRecordingStatus(
            item.clientRecordingId,
            "PROCESSING",
          );
          break;
        }

        case "CREATE_TRAIL": {
          // Gửi payload tạo PersonalTrail lên Backend
          const res = await apiRequest<{ id: string }>(
            "/api/v1/personal-trails",
            {
              method: "POST",
              accessToken,
              body: JSON.stringify(payload),
            },
          );

          if (res?.id) {
            await recordingDatabase.updateRecordingStatus(
              item.clientRecordingId,
              "READY",
              { serverPersonalTrailId: res.id, lastSyncedAt: new Date().toISOString() },
            );
          }
          break;
        }
      }

      // Đánh dấu hoàn tất
      await recordingDatabase.updateOutboxItem(item.id, "SYNCED");
    } catch (error: any) {
      console.warn(`[syncService] Lỗi sync outbox item ${item.id}:`, error);

      // Nếu lỗi 401 thì không tăng attempt vô ích
      if (error?.status === 401) {
        await recordingDatabase.updateOutboxItem(item.id, "FAILED");
        return;
      }

      // Tính thời gian Exponential Backoff có Jitter
      const nextAttempt = (item.attemptCount || 0) + 1;
      const baseDelay = Math.min(300_000, 2 ** nextAttempt * 1000);
      const jitter = Math.random() * 1000;
      const nextRetryAt = new Date(Date.now() + baseDelay + jitter).toISOString();

      await recordingDatabase.updateOutboxItem(item.id, "FAILED", {
        attemptCount: nextAttempt,
        nextRetryAt,
      });
    }
  },
};
