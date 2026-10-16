import {
  LocalCheckpoint,
  LocalRecording,
  PersonalTrail,
  RawGpsSample,
  RecordingStatus,
  SyncOutboxItem,
} from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";
import { STORAGE_KEYS } from "./keys";

export function generateUUID(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const db = await SQLite.openDatabaseAsync("trekgo_recordings.db");

  // Thiết lập WAL mode cho hiệu năng ghi cao và bảo toàn dữ liệu
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS local_recordings (
      client_recording_id TEXT PRIMARY KEY,
      server_recording_id TEXT,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      next_segment_id INTEGER NOT NULL DEFAULT 0,
      server_personal_trail_id TEXT,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS raw_gps_samples (
      client_sample_id TEXT PRIMARY KEY,
      client_recording_id TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      recorded_at TEXT NOT NULL,
      accuracy_m REAL,
      altitude_m REAL,
      altitude_accuracy_m REAL,
      speed_mps REAL,
      heading_deg REAL,
      segment_id INTEGER NOT NULL DEFAULT 0,
      accepted INTEGER NOT NULL,
      reject_reason TEXT,
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (client_recording_id) REFERENCES local_recordings(client_recording_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_samples_pending
      ON raw_gps_samples(client_recording_id, synced, recorded_at);

    CREATE TABLE IF NOT EXISTS local_checkpoints (
      client_checkpoint_id TEXT PRIMARY KEY,
      client_recording_id TEXT NOT NULL,
      name TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      latitude REAL,
      longitude REAL,
      recorded_at TEXT NOT NULL,
      distance_from_start_km REAL,
      elevation_live_m REAL,
      FOREIGN KEY (client_recording_id) REFERENCES local_recordings(client_recording_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_outbox (
      id TEXT PRIMARY KEY,
      client_recording_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'PENDING',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      next_retry_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_recording_id) REFERENCES local_recordings(client_recording_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS personal_trails (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      region TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      distance_km REAL NOT NULL,
      elevation_gain_m REAL NOT NULL,
      duration TEXT NOT NULL,
      terrain_type TEXT NOT NULL,
      description TEXT,
      visibility TEXT NOT NULL DEFAULT 'PRIVATE',
      verification_status TEXT NOT NULL DEFAULT 'DRAFT',
      rejection_reason TEXT,
      route_preset TEXT NOT NULL,
      route_points_json TEXT NOT NULL,
      gps_route_json TEXT,
      gps_segments_json TEXT,
      checkpoints_json TEXT NOT NULL,
      client_recording_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (client_recording_id) REFERENCES local_recordings(client_recording_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_personal_trails_owner
      ON personal_trails(owner_id);
  `);

  dbInstance = db;
  return db;
}

function rowToPersonalTrail(row: any): PersonalTrail {
  let routePoints: any[] = [];
  try {
    routePoints = JSON.parse(row.route_points_json || "[]");
  } catch {
    routePoints = [];
  }

  let gpsRoute: [number, number, number?][] | undefined = undefined;
  if (row.gps_route_json) {
    try {
      gpsRoute = JSON.parse(row.gps_route_json);
    } catch {}
  }

  let gpsSegments: [number, number, number?][][] | undefined = undefined;
  if (row.gps_segments_json) {
    try {
      gpsSegments = JSON.parse(row.gps_segments_json);
    } catch {}
  }

  let checkpoints: any[] = [];
  try {
    checkpoints = JSON.parse(row.checkpoints_json || "[]");
  } catch {
    checkpoints = [];
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    region: row.region,
    difficulty: row.difficulty,
    distanceKm: Number(row.distance_km),
    elevationGainM: Number(row.elevation_gain_m),
    duration: row.duration,
    terrainType: row.terrain_type,
    description: row.description || "",
    visibility: row.visibility,
    verificationStatus: row.verification_status,
    rejectionReason: row.rejection_reason || undefined,
    routePreset: row.route_preset,
    routePoints,
    gpsRoute,
    gpsSegments,
    checkpoints,
    clientRecordingId: row.client_recording_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const recordingDatabase = {
  /**
   * Tạo phiên ghi mới trong SQLite
   */
  async createRecording(
    clientRecordingId: string = generateUUID(),
    startedAt: string = new Date().toISOString(),
  ): Promise<LocalRecording> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO local_recordings (
        client_recording_id, status, started_at, next_segment_id
      ) VALUES (?, ?, ?, ?)`,
      [clientRecordingId, "RECORDING", startedAt, 0],
    );

    return {
      clientRecordingId,
      serverRecordingId: null,
      status: "RECORDING",
      startedAt,
      endedAt: null,
      nextSegmentId: 0,
      lastSyncedAt: null,
      serverPersonalTrailId: null,
    };
  },

  /**
   * Tìm phiên ghi đang chạy dở (Crash recovery)
   */
  async getActiveRecording(): Promise<LocalRecording | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM local_recordings 
       WHERE status IN ('RECORDING', 'PAUSED') 
       ORDER BY started_at DESC LIMIT 1`,
    );

    if (!row) return null;

    return {
      clientRecordingId: row.client_recording_id,
      serverRecordingId: row.server_recording_id,
      status: row.status as RecordingStatus,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      nextSegmentId: row.next_segment_id,
      lastSyncedAt: row.last_synced_at,
      serverPersonalTrailId: row.server_personal_trail_id,
    };
  },

  /**
   * Lấy thông tin một phiên ghi theo ID
   */
  async getRecording(
    clientRecordingId: string,
  ): Promise<LocalRecording | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM local_recordings WHERE client_recording_id = ?`,
      [clientRecordingId],
    );

    if (!row) return null;

    return {
      clientRecordingId: row.client_recording_id,
      serverRecordingId: row.server_recording_id,
      status: row.status as RecordingStatus,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      nextSegmentId: row.next_segment_id,
      lastSyncedAt: row.last_synced_at,
      serverPersonalTrailId: row.server_personal_trail_id,
    };
  },

  /**
   * Cập nhật trạng thái phiên ghi
   */
  async updateRecordingStatus(
    clientRecordingId: string,
    status: RecordingStatus,
    options?: {
      endedAt?: string | null;
      serverRecordingId?: string | null;
      serverPersonalTrailId?: string | null;
      lastSyncedAt?: string | null;
    },
  ): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = ["status = ?"];
    const params: any[] = [status];

    if (options?.endedAt !== undefined) {
      fields.push("ended_at = ?");
      params.push(options.endedAt);
    }
    if (options?.serverRecordingId !== undefined) {
      fields.push("server_recording_id = ?");
      params.push(options.serverRecordingId);
    }
    if (options?.serverPersonalTrailId !== undefined) {
      fields.push("server_personal_trail_id = ?");
      params.push(options.serverPersonalTrailId);
    }
    if (options?.lastSyncedAt !== undefined) {
      fields.push("last_synced_at = ?");
      params.push(options.lastSyncedAt);
    }

    params.push(clientRecordingId);

    await db.runAsync(
      `UPDATE local_recordings SET ${fields.join(", ")} WHERE client_recording_id = ?`,
      params,
    );
  },

  /**
   * Tăng segment ID khi Pause/Resume hoặc khoảng trống GPS > 15s
   */
  async incrementSegmentId(clientRecordingId: string): Promise<number> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE local_recordings SET next_segment_id = next_segment_id + 1 WHERE client_recording_id = ?`,
      [clientRecordingId],
    );

    const row = await db.getFirstAsync<{ next_segment_id: number }>(
      `SELECT next_segment_id FROM local_recordings WHERE client_recording_id = ?`,
      [clientRecordingId],
    );

    return row?.next_segment_id ?? 0;
  },

  /**
   * Chèn mẫu GPS gốc (Raw GPS Sample) vào SQLite TRƯỚC khi cập nhật UI
   */
  async insertRawSample(sample: RawGpsSample): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO raw_gps_samples (
        client_sample_id, client_recording_id, latitude, longitude,
        recorded_at, accuracy_m, altitude_m, altitude_accuracy_m,
        speed_mps, heading_deg, segment_id, accepted, reject_reason, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sample.clientSampleId,
        sample.clientRecordingId,
        sample.latitude,
        sample.longitude,
        sample.recordedAt,
        sample.accuracyM,
        sample.altitudeM,
        sample.altitudeAccuracyM,
        sample.speedMps,
        sample.headingDeg,
        sample.segmentId,
        sample.accepted ? 1 : 0,
        sample.rejectReason || null,
        0,
      ],
    );
  },

  /**
   * Lấy tất cả mẫu GPS thô của một phiên ghi
   */
  async getRawSamples(clientRecordingId: string): Promise<RawGpsSample[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM raw_gps_samples 
       WHERE client_recording_id = ? 
       ORDER BY recorded_at ASC, client_sample_id ASC`,
      [clientRecordingId],
    );

    return rows.map((r) => ({
      clientSampleId: r.client_sample_id,
      clientRecordingId: r.client_recording_id,
      latitude: r.latitude,
      longitude: r.longitude,
      recordedAt: r.recorded_at,
      accuracyM: r.accuracy_m,
      altitudeM: r.altitude_m,
      altitudeAccuracyM: r.altitude_accuracy_m,
      speedMps: r.speed_mps,
      headingDeg: r.heading_deg,
      segmentId: r.segment_id,
      accepted: r.accepted === 1,
      rejectReason: r.reject_reason,
    }));
  },

  /**
   * Lấy các điểm GPS đã được chấp nhận (accepted = 1) để khôi phục hoặc vẽ lên MapLibre
   */
  async getAcceptedPoints(clientRecordingId: string): Promise<RawGpsSample[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM raw_gps_samples 
       WHERE client_recording_id = ? AND accepted = 1 
       ORDER BY recorded_at ASC, client_sample_id ASC`,
      [clientRecordingId],
    );

    return rows.map((r) => ({
      clientSampleId: r.client_sample_id,
      clientRecordingId: r.client_recording_id,
      latitude: r.latitude,
      longitude: r.longitude,
      recordedAt: r.recorded_at,
      accuracyM: r.accuracy_m,
      altitudeM: r.altitude_m,
      altitudeAccuracyM: r.altitude_accuracy_m,
      speedMps: r.speed_mps,
      headingDeg: r.heading_deg,
      segmentId: r.segment_id,
      accepted: true,
      rejectReason: null,
    }));
  },

  /**
   * Thêm Checkpoint vào phiên ghi
   */
  async insertCheckpoint(cp: LocalCheckpoint): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO local_checkpoints (
        client_checkpoint_id, client_recording_id, name, order_index,
        latitude, longitude, recorded_at, distance_from_start_km, elevation_live_m
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cp.clientCheckpointId,
        cp.clientRecordingId,
        cp.name,
        cp.order,
        cp.latitude,
        cp.longitude,
        cp.recordedAt,
        cp.distanceFromStartKm,
        cp.elevationLiveM,
      ],
    );
  },

  /**
   * Lấy danh sách Checkpoints của một phiên ghi
   */
  async getCheckpoints(clientRecordingId: string): Promise<LocalCheckpoint[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM local_checkpoints 
       WHERE client_recording_id = ? 
       ORDER BY order_index ASC`,
      [clientRecordingId],
    );

    return rows.map((r) => ({
      clientCheckpointId: r.client_checkpoint_id,
      clientRecordingId: r.client_recording_id,
      name: r.name,
      order: r.order_index,
      latitude: r.latitude,
      longitude: r.longitude,
      recordedAt: r.recorded_at,
      distanceFromStartKm: r.distance_from_start_km,
      elevationLiveM: r.elevation_live_m,
    }));
  },

  /**
   * Đưa tác vụ vào Outbox để đồng bộ ngầm lên Backend
   */
  async enqueueOutbox(
    clientRecordingId: string,
    operation: SyncOutboxItem["operation"],
    payload: any,
  ): Promise<SyncOutboxItem> {
    const db = await getDatabase();
    const id = generateUUID();
    const now = new Date().toISOString();
    const payloadJson = JSON.stringify(payload);

    await db.runAsync(
      `INSERT INTO sync_outbox (
        id, client_recording_id, operation, payload_json, state, attempt_count, created_at
      ) VALUES (?, ?, ?, ?, 'PENDING', 0, ?)`,
      [id, clientRecordingId, operation, payloadJson, now],
    );

    return {
      id,
      clientRecordingId,
      operation,
      payloadJson,
      state: "PENDING",
      attemptCount: 0,
      nextRetryAt: null,
      createdAt: now,
    };
  },

  /**
   * Lấy các tác vụ Outbox đang chờ gửi
   */
  async getPendingOutbox(): Promise<SyncOutboxItem[]> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM sync_outbox 
       WHERE state IN ('PENDING', 'FAILED') 
         AND (next_retry_at IS NULL OR next_retry_at <= ?)
       ORDER BY created_at ASC LIMIT 10`,
      [now],
    );

    return rows.map((r) => ({
      id: r.id,
      clientRecordingId: r.client_recording_id,
      operation: r.operation,
      payloadJson: r.payload_json,
      state: r.state,
      attemptCount: r.attempt_count,
      nextRetryAt: r.next_retry_at,
      createdAt: r.created_at,
    }));
  },

  /**
   * Cập nhật trạng thái mục Outbox
   */
  async updateOutboxItem(
    id: string,
    state: SyncOutboxItem["state"],
    options?: { attemptCount?: number; nextRetryAt?: string | null },
  ): Promise<void> {
    const db = await getDatabase();
    const fields = ["state = ?"];
    const params: any[] = [state];

    if (options?.attemptCount !== undefined) {
      fields.push("attempt_count = ?");
      params.push(options.attemptCount);
    }
    if (options?.nextRetryAt !== undefined) {
      fields.push("next_retry_at = ?");
      params.push(options.nextRetryAt);
    }
    params.push(id);

    await db.runAsync(
      `UPDATE sync_outbox SET ${fields.join(", ")} WHERE id = ?`,
      params,
    );
  },

  /**
   * Đánh dấu các điểm sample đã được Backend xác nhận (ACK)
   */
  async markSamplesSynced(
    clientRecordingId: string,
    clientSampleIds: string[],
  ): Promise<void> {
    if (clientSampleIds.length === 0) return;
    const db = await getDatabase();
    const placeholders = clientSampleIds.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE raw_gps_samples SET synced = 1 
       WHERE client_recording_id = ? AND client_sample_id IN (${placeholders})`,
      [clientRecordingId, ...clientSampleIds],
    );
  },

  /**
   * Lấy các điểm GPS chưa đồng bộ để tạo batch gửi lên server
   */
  async getUnsyncedSamples(
    clientRecordingId: string,
    limit: number = 200,
  ): Promise<RawGpsSample[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM raw_gps_samples 
       WHERE client_recording_id = ? AND synced = 0
       ORDER BY recorded_at ASC, client_sample_id ASC 
       LIMIT ?`,
      [clientRecordingId, limit],
    );

    return rows.map((r) => ({
      clientSampleId: r.client_sample_id,
      clientRecordingId: r.client_recording_id,
      latitude: r.latitude,
      longitude: r.longitude,
      recordedAt: r.recorded_at,
      accuracyM: r.accuracy_m,
      altitudeM: r.altitude_m,
      altitudeAccuracyM: r.altitude_accuracy_m,
      speedMps: r.speed_mps,
      headingDeg: r.heading_deg,
      segmentId: r.segment_id,
      accepted: r.accepted === 1,
      rejectReason: r.reject_reason,
    }));
  },

  /**
   * Lấy danh sách tất cả các phiên ghi cục bộ
   */
  async getAllRecordings(): Promise<LocalRecording[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM local_recordings ORDER BY started_at DESC`,
    );

    return rows.map((r) => ({
      clientRecordingId: r.client_recording_id,
      serverRecordingId: r.server_recording_id,
      status: r.status as RecordingStatus,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      nextSegmentId: r.next_segment_id,
      lastSyncedAt: r.last_synced_at,
      serverPersonalTrailId: r.server_personal_trail_id,
    }));
  },

  /**
   * Xóa một phiên ghi và toàn bộ điểm liên quan
   */
  async deleteRecording(clientRecordingId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `DELETE FROM local_recordings WHERE client_recording_id = ?`,
      [clientRecordingId],
    );
  },

  /**
   * Lưu hoặc cập nhật một PersonalTrail vào bảng SQLite personal_trails
   */
  async savePersonalTrail(
    trail: PersonalTrail,
    clientRecordingId?: string,
  ): Promise<void> {
    const db = await getDatabase();
    const effectiveRecordingId =
      clientRecordingId || trail.clientRecordingId || null;

    // Đảm bảo phiên ghi trong local_recordings tồn tại nếu có recording ID
    if (effectiveRecordingId) {
      const existing = await db.getFirstAsync<any>(
        `SELECT client_recording_id FROM local_recordings WHERE client_recording_id = ?`,
        [effectiveRecordingId],
      );

      if (!existing) {
        await db.runAsync(
          `INSERT OR IGNORE INTO local_recordings (
            client_recording_id, status, started_at, ended_at, next_segment_id, server_personal_trail_id
          ) VALUES (?, 'STOPPED_LOCAL', ?, ?, ?, ?)`,
          [
            effectiveRecordingId,
            trail.createdAt || new Date().toISOString(),
            trail.updatedAt || new Date().toISOString(),
            trail.gpsSegments?.length || 1,
            trail.id,
          ],
        );
      } else {
        await db.runAsync(
          `UPDATE local_recordings 
           SET server_personal_trail_id = ? 
           WHERE client_recording_id = ?`,
          [trail.id, effectiveRecordingId],
        );
      }
    }

    await db.runAsync(
      `INSERT OR REPLACE INTO personal_trails (
        id, owner_id, name, region, difficulty,
        distance_km, elevation_gain_m, duration, terrain_type, description,
        visibility, verification_status, rejection_reason, route_preset,
        route_points_json, gps_route_json, gps_segments_json, checkpoints_json,
        client_recording_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trail.id,
        trail.ownerId,
        trail.name,
        trail.region,
        trail.difficulty,
        trail.distanceKm,
        trail.elevationGainM,
        trail.duration,
        trail.terrainType,
        trail.description || "",
        trail.visibility,
        trail.verificationStatus,
        trail.rejectionReason || null,
        trail.routePreset,
        JSON.stringify(trail.routePoints || []),
        trail.gpsRoute ? JSON.stringify(trail.gpsRoute) : null,
        trail.gpsSegments ? JSON.stringify(trail.gpsSegments) : null,
        JSON.stringify(trail.checkpoints || []),
        effectiveRecordingId,
        trail.createdAt,
        trail.updatedAt,
      ],
    );
  },

  /**
   * Lưu toàn bộ danh sách PersonalTrail vào SQLite
   */
  async saveAllPersonalTrails(trails: PersonalTrail[]): Promise<void> {
    for (const trail of trails) {
      await this.savePersonalTrail(trail);
    }
  },

  /**
   * Lấy toàn bộ danh sách PersonalTrail từ SQLite
   */
  async getAllPersonalTrails(): Promise<PersonalTrail[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM personal_trails ORDER BY created_at DESC`,
    );
    return rows.map(rowToPersonalTrail);
  },

  /**
   * Lấy một PersonalTrail theo ID từ SQLite
   */
  async getPersonalTrailById(id: string): Promise<PersonalTrail | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM personal_trails WHERE id = ?`,
      [id],
    );
    return row ? rowToPersonalTrail(row) : null;
  },

  /**
   * Xóa một PersonalTrail và phiên ghi SQLite liên quan (kèm cascade xóa samples, checkpoints, outbox)
   */
  async deletePersonalTrail(trailId: string): Promise<void> {
    const db = await getDatabase();

    // 1. Tìm thông tin trail để lấy client_recording_id nếu có
    const trail = await db.getFirstAsync<any>(
      `SELECT client_recording_id FROM personal_trails WHERE id = ?`,
      [trailId],
    );

    const recordingId = trail?.client_recording_id;

    // 2. Xóa khỏi personal_trails
    await db.runAsync(`DELETE FROM personal_trails WHERE id = ?`, [trailId]);

    // 3. Xóa các phiên ghi local_recordings liên kết
    // (Bằng server_personal_trail_id HOẶC client_recording_id)
    if (recordingId) {
      await db.runAsync(
        `DELETE FROM local_recordings WHERE client_recording_id = ? OR server_personal_trail_id = ?`,
        [recordingId, trailId],
      );
    } else {
      await db.runAsync(
        `DELETE FROM local_recordings WHERE server_personal_trail_id = ?`,
        [trailId],
      );
    }
  },

  /**
   * Alias: Xóa phiên ghi theo trailId
   */
  async deleteRecordingByTrailId(trailId: string): Promise<void> {
    return this.deletePersonalTrail(trailId);
  },

  /**
   * Đồng bộ dữ liệu cũ từ AsyncStorage sang SQLite (Chỉ chạy 1 lần an toàn)
   */
  async migrateFromAsyncStorage(): Promise<void> {
    try {
      const db = await getDatabase();
      const existing = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM personal_trails`,
      );

      if (existing && existing.count > 0) {
        return;
      }

      const legacyRaw = await AsyncStorage.getItem(
        STORAGE_KEYS.PERSONAL_TRAILS,
      );
      if (legacyRaw) {
        const legacyTrails: PersonalTrail[] = JSON.parse(legacyRaw);
        if (legacyTrails && legacyTrails.length > 0) {
          for (const trail of legacyTrails) {
            await this.savePersonalTrail(trail);
          }
          console.log(
            `[recordingDatabase] Đã di chuyển an toàn ${legacyTrails.length} cung đường từ AsyncStorage sang SQLite`,
          );
        }
        await AsyncStorage.removeItem(STORAGE_KEYS.PERSONAL_TRAILS);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.MIGRATION_SQLITE, "true");
    } catch (err) {
      console.warn(
        "[recordingDatabase] Migration from AsyncStorage failed:",
        err,
      );
    }
  },

  /**
   * Xóa sạch toàn bộ dữ liệu trong tất cả các bảng SQLite
   */
  async clearAllData(): Promise<void> {
    const db = await getDatabase();
    await db.execAsync(`
      PRAGMA foreign_keys = OFF;
      DELETE FROM personal_trails;
      DELETE FROM raw_gps_samples;
      DELETE FROM local_checkpoints;
      DELETE FROM sync_outbox;
      DELETE FROM local_recordings;
      PRAGMA foreign_keys = ON;
      VACUUM;
    `);
    console.log("[recordingDatabase] Đã xóa sạch toàn bộ dữ liệu trong tất cả các bảng SQLite!");
  },
};
