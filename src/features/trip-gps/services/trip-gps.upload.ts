import { ApiError } from '@/lib/api-client';
import { gpsRequest, gpsBase, getRecordingStatus, getRecordingResult } from './trip-gps.client';
import { readLocalTrip, changeLocalTrip, listLocalTrips } from './trip-gps.local';
import type { Receipt, LocalTrip } from '../contract';

export class TripGpsUploader {
  private running = false;
  private stopped = false;
  private rerun = false;
  private timer?: ReturnType<typeof setTimeout>;
  constructor(private account: string, private active: () => boolean, private changed: (tripId: string) => void) {}
  stop() { this.stopped = true; clearTimeout(this.timer); }
  private check() { if (this.stopped || !this.active()) throw new ApiError('Tài khoản GPS đã thay đổi.', 401, 'GPS_ACCOUNT_CHANGED'); }
  async sync(manual = false) {
    if (this.running) { this.rerun = true; return; }
    if (this.stopped || !this.active()) return;
    this.running = true; clearTimeout(this.timer);
    try {
      for (const item of await listLocalTrips(this.account)) {
        this.check();
        if (item.session.status !== 'STOPPED' || item.finalProcessed || !item.snapshot) continue;
        if (!manual && (item.syncStatus === 'NEEDS_ATTENTION' || (item.nextRetryAt && Date.parse(item.nextRetryAt) > Date.now()) || item.retryCount >= 4)) continue;
        try {
          await this.upload(item, manual);
        } catch (e) {
          if (this.stopped || !this.active()) break;
          const retryable = !(e instanceof ApiError) || e.status === 0 || e.status >= 500 || e.status === 429 || e.status === 401 || e.retryable === true;
          await changeLocalTrip(this.account, item.session.id, t => {
            t.retryCount++;
            t.syncStatus = retryable ? 'WAITING_NETWORK' : 'NEEDS_ATTENTION';
            t.lastError = e instanceof Error ? e.message : String(e);
            t.nextRetryAt = retryable && t.retryCount < 4 ? new Date(Date.now() + [5000, 15000, 30000][Math.min(t.retryCount - 1, 2)]).toISOString() : null;
          });
          this.changed(item.session.tripId);
        }
      }
    } finally {
      this.running = false;
      if (!this.stopped && this.active()) {
        const pending = (await listLocalTrips(this.account)).filter(t => t.session.status === 'STOPPED' && !t.finalProcessed);
        const due = pending.filter(t => t.nextRetryAt && t.retryCount < 4).map(t => Date.parse(t.nextRetryAt!));
        if (this.rerun) { this.rerun = false; this.timer = setTimeout(() => { void this.sync().catch(() => {}); }, 100); }
        else if (due.length) this.timer = setTimeout(() => { void this.sync().catch(() => {}); }, Math.max(1000, Math.min(...due) - Date.now()));
      }
    }
  }
  private async upload(item: LocalTrip, manual: boolean) {
    const id = item.session.id, tripId = item.session.tripId;
    const base = `${gpsBase(tripId)}/completed-recordings`;
    let trip = await readLocalTrip(this.account, id);
    this.check();
    await changeLocalTrip(this.account, id, t => { t.syncStatus = 'SYNCING'; t.lastError = null; if (manual) { t.retryCount = 0; t.processingPolls = 0; } }); this.changed(tripId);
    const frozen = trip.snapshot!;
    const validate = (r: Receipt) => {
      if (r.protocolVersion !== 3 || r.localSessionId !== id || r.metadataHash !== frozen.metadataHash) throw new ApiError('Receipt GPS không khớp snapshot local.', 409, 'GPS_RECEIPT_MISMATCH');
    };
    if (!trip.receipt) {
      let receipt: Receipt;
      try { receipt = await gpsRequest<Receipt>(this.account, `${base}/by-client/${id}`); }
      catch (e) {
        if (!(e instanceof ApiError) || e.status !== 404) throw e;
        this.check(); receipt = await gpsRequest<Receipt>(this.account, base, frozen.metadata);
      }
      this.check(); validate(receipt);
      trip = await changeLocalTrip(this.account, id, t => { t.receipt = receipt; });
    }
    validate(trip.receipt!);
    const receiptId = trip.receipt!.recordingId, endpoint = `${base}/${receiptId}`;
    let status = await getRecordingStatus(this.account, tripId, receiptId);
    this.check(); validate(status);
    if (status.status === 'NEEDS_ATTENTION' && !manual) throw new ApiError(status.lastError ?? 'Hành trình cần kiểm tra lại.', 422, 'GPS_NEEDS_ATTENTION');
    if (status.status === 'RECEIVING') {
      for (const page of frozen.manifests) {
        if (trip.snapshot!.acknowledgedPages.includes(page.pageIndex) && !status.manifestError) continue;
        this.check();
        const ack = await gpsRequest<{ acknowledged: boolean; kind: string; key: string }>(this.account, `${endpoint}/manifests`, page);
        if (!ack.acknowledged || ack.kind !== 'manifest' || String(ack.key) !== String(page.pageIndex)) throw new Error('ACK manifest GPS không khớp.');
        trip = await changeLocalTrip(this.account, id, t => { if (!t.snapshot!.acknowledgedPages.includes(page.pageIndex)) t.snapshot!.acknowledgedPages.push(page.pageIndex); });
      }
      status = await getRecordingStatus(this.account, tripId, receiptId); this.check();
      const missing = new Set(status.missingBatchIds); let cursor = status.nextCursor;
      while (cursor !== null) {
        const previous = cursor; const page = await getRecordingStatus(this.account, tripId, receiptId, cursor); this.check();
        page.missingBatchIds.forEach(v => missing.add(v)); cursor = page.nextCursor;
        if (cursor !== null && cursor <= previous) throw new Error('Phân trang batch GPS không hợp lệ.');
      }
      if ([...missing].some(v => !frozen.batches.some(b => b.batchId === v))) throw new ApiError('Server yêu cầu batch không có trong snapshot.', 409);
      for (const batch of frozen.batches) {
        if (!missing.has(batch.batchId) && trip.snapshot!.acknowledgedBatches.includes(batch.batchId)) continue;
        this.check();
        const ack = await gpsRequest<{ acknowledged: boolean; kind: string; key: string }>(this.account, `${endpoint}/batches`, batch);
        if (!ack.acknowledged || ack.kind !== 'batch' || ack.key !== batch.batchId) throw new Error('ACK batch GPS không khớp.');
        trip = await changeLocalTrip(this.account, id, t => { if (!t.snapshot!.acknowledgedBatches.includes(batch.batchId)) t.snapshot!.acknowledgedBatches.push(batch.batchId); });
      }
    }
    this.check();
    if (status.status === 'RECEIVING' || (status.status === 'NEEDS_ATTENTION' && manual)) {
      // POST without a body is required by the v3 contract.
      await gpsRequest(this.account, `${endpoint}/complete`, undefined, 'POST');
      this.check(); status = await getRecordingStatus(this.account, tripId, receiptId);
    }
    this.check(); validate(status);
    if (status.status === 'COMPLETE') {
      const result = await getRecordingResult(this.account, tripId, receiptId); this.check(); validate(result);
      if (result.status !== 'COMPLETE' || !result.result) throw new Error('Server chưa trả kết quả của hành trình đã đồng bộ.');
      await changeLocalTrip(this.account, id, t => { t.receipt = result; t.result = result.result!; t.finalProcessed = true; t.syncStatus = 'SYNCED'; t.lastError = null; t.nextRetryAt = null; t.retryCount = 0; });
    } else if (status.status === 'NEEDS_ATTENTION') {
      throw new ApiError(status.lastError ?? 'Hành trình cần kiểm tra lại.', 422, 'GPS_NEEDS_ATTENTION');
    } else {
      await changeLocalTrip(this.account, id, t => {
        t.receipt = status; t.processingPolls = (t.processingPolls ?? 0) + 1;
        if (t.processingPolls >= 6) { t.syncStatus = 'WAITING_NETWORK'; t.nextRetryAt = null; t.retryCount = 4; t.lastError = 'Dữ liệu đã gửi, máy chủ đang xử lý lâu hơn dự kiến. Bạn có thể kiểm tra đồng bộ lại sau.'; }
        else { t.syncStatus = 'PROCESSING'; t.nextRetryAt = new Date(Date.now() + 5000).toISOString(); t.retryCount = 0; }
      });
    }
    this.changed(tripId);
  }
}
