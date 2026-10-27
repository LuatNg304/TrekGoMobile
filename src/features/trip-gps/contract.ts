import type { GpsPolicyDto, GpsSample, PlannedRouteDto, SessionDto, TripCheckpointDto, LocalSyncStatus } from './types';

export interface Limits {
  maxBatchSamples: number; maxSnapshotSamples: number; maxManifestPages: number;
  maxManifestEntriesPerPage: number; maxBodyBytes: number; publishMinIntervalSeconds: number;
}
export interface GrantClaims {
  protocolVersion: 3; grantId: string; accountId: string; tripId: string; packageId: string;
  packageHash: string; scope: string[]; issuedAt: string; offlineAccessFrom: string;
  offlineAccessUntil: string; kid: string; alg: 'Ed25519';
}
export interface OfflinePackage {
  packageId: string; packageVersion: string; packageHash: string;
  snapshot: {
    protocolVersion: 3; tripId: string; tripVersion: number; title: string; startAt: string; endAt: string;
    routePlans: (Omit<PlannedRouteDto, 'geometry'> & { geometryHash: string | null; geometryUrl: string | null; sourceUpdatedAt: string | null })[];
    activeTrailPlanId: string | null; checkpoints: TripCheckpointDto[];
    policy: GpsPolicyDto & { offlineAccessGraceSeconds: number }; policyVersion: number; limits: Limits;
  };
  grant: { claims: GrantClaims; signature: string }; serverTime: string;
  groupSharingFrom: string; groupSharingUntil: string;
  capabilities: { supportedSyncProtocols: number[]; localRecordingOnly: boolean };
}
export interface CachedPackage {
  accountId: string; tripId: string; data: OfflinePackage; downloadedAt: string;
  grantStatus?: 'VALID' | 'EXPIRED' | 'REVOKED' | 'INVALID' | 'REVIEW_REQUIRED'; refreshRequired?: boolean;
}
export interface PublicKey { kid: string; alg: 'Ed25519'; publicKeyPem: string }
export type RecordedSample = GpsSample & { sequence: number };
export interface Batch { batchId: string; payloadHash: string; samples: RecordedSample[] }
export interface Entry { batchId: string; payloadHash: string; sampleCount: number }
export interface Manifest { pageIndex: number; pageCount: number; pageHash: string; entries: Entry[] }
export interface CompletedMetadata {
  protocolVersion: 3; localSessionId: string; deviceId: string; recordingStatus: 'STOPPED';
  source: 'SIMULATOR' | 'REAL_GPS'; grantId: string; packageId: string; startedAt: string; endedAt: string;
  intervals: { start: string; end: string }[]; expectedSampleCount: number; manifestHash: string;
}
export interface UploadSnapshot {
  metadata: CompletedMetadata; metadataHash: string; batches: Batch[]; manifests: Manifest[];
  acknowledgedBatches: string[]; acknowledgedPages: number[];
}
export interface Receipt {
  protocolVersion: 3; recordingId: string; localSessionId: string;
  status: 'RECEIVING' | 'FINALIZE_PENDING' | 'COMPLETE' | 'NEEDS_ATTENTION'; metadataHash: string; limits: Limits;
}
export interface ReceiptStatus extends Receipt {
  missingBatchIds: string[]; nextCursor: number | null; manifestError: string | null;
  lastError: string | null; resultAvailable: boolean;
}
export interface RecordingResult {
  rawSampleCount: number; pointCount: number; totalDistanceMeters: number;
  routeGeojson: { type: 'MultiLineString'; coordinates: [number, number][][] };
  rejectedSamples: { clientSampleId: string; code: string }[];
  recognitionStatus: string; reviewReasons: string[];
}
export interface LocalTrip {
  protocolVersion: 3; accountId: string; session: SessionDto; package: OfflinePackage;
  policy: GpsPolicyDto; source: 'SIMULATOR' | 'REAL_GPS'; limits: Limits; sampleSequence: number;
  syncStatus: LocalSyncStatus; lastError: string | null; retryCount: number; nextRetryAt: string | null;
  snapshot?: UploadSnapshot; receipt?: Receipt; result?: RecordingResult; finalProcessed?: boolean;
  processingPolls?: number;
  simulatorSegment?: number;
  simulatorDistanceM?: number;
}
export interface GroupMember {
  userId: string; fullName: string; avatarUrl: string | null; tripRole: 'HOST' | 'LEADER' | 'MEMBER';
  location: (Omit<GpsSample, 'clientSampleId'> & { clientSampleId?: string }) | null; source: 'REAL_GPS' | 'SIMULATOR' | null; receivedAt: string | null;
  locationStatus: 'NO_DATA' | 'FRESH' | 'STALE' | 'OFFLINE';
}
export interface GroupState { protocolVersion: 3; tripId: string; members: GroupMember[]; serverTime: string; groupSharingFrom: string; groupSharingUntil: string }
export interface Publish {
  protocolVersion: 3; eventId: string; tripId: string; deviceId: string; streamId: string;
  sequence: number; source: 'REAL_GPS' | 'SIMULATOR'; location: GpsSample;
}
