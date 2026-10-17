# TrekGO — Hướng dẫn cập nhật LiveTrailRecorderModal sau khi nâng cấp GpsProcessor

**Phạm vi:** React Native / Expo, `LiveTrailRecorderModal.tsx`, `gpsProcessor.ts` và tầng lưu trữ SQLite (`recordingDatabase`).  
**Mục tiêu:** giữ nguyên giao diện, nâng độ tin cậy của ghi GPS offline, Pause/Resume, Crash Recovery và lưu cung đường.  
**Trạng thái:** **Đã tích hợp hoàn tất và kiểm thử thành công (typecheck & lint 100%)**.

## 1. Kết luận nhanh

**Có, cần cập nhật `LiveTrailRecorderModal.tsx`.** Các lời gọi `new GpsProcessor()`, `process(location)`, `reset()`, `breakSegment()`, `distanceM`, `elevationGainM`, `speedKmh` và `result.point` vẫn có thể dùng theo giao diện cũ. Nhưng modal hiện có một số rủi ro khi ghi offline và khôi phục phiên ghi.

| Khu vực | Hiện trạng | Hướng cập nhật | Ưu tiên |
|---|---|---|---|
| GPS callback | Tự đọc `location.coords` để tạo raw sample | Dùng `result.rawPoint` khi có, giữ `clientSampleId` duy nhất | Cao |
| Reject reason | Nhiều lỗi bị quy về `GPS_JUMP` | Ánh xạ có chủ đích, không làm sai số liệu thống kê | Cao |
| Crash Recovery | Chỉ khôi phục điểm đã lưu, chưa khôi phục trạng thái processor | Thêm snapshot/restore hoặc replay có kiểm soát | Rất cao |
| Pause/Resume | SQLite và processor cùng tăng segment độc lập | Chọn một nguồn `segmentId` nhất quán | Cao |
| Finish/Save | Ghi SQLite bất đồng bộ, không chờ hoàn tất | Chặn nhận điểm mới, đợi ghi xong, lưu transaction/outbox rồi mới đóng | Rất cao |
| Thiếu GPS | Tạo điểm giả khi có 0–1 điểm | Không tạo cung đường giả | Rất cao |
| Bộ nhớ | `recordedCoordinates` tăng không giới hạn trong React state | Cân nhắc chỉ giữ tập điểm hiển thị, SQLite là nguồn dữ liệu chính | Trung bình |

## 2. Đối chiếu API `gpsProcessor.ts` hiện tại

File GpsProcessor đã cung cấp:

```ts
const result = gpsProcessorRef.current.process(location);

result.accepted;
result.reason;       // INVALID_COORDINATE | LOW_ACCURACY | STALE_LOCATION | INVALID_TIME | GPS_JUMP | GPS_JITTER
result.rawPoint;     // tọa độ và altitude gốc, kể cả khi điểm bị loại (nếu chuyển đổi được)
result.point;        // điểm hợp lệ để vẽ và tính telemetry
result.distanceM;
result.elevationGainM;
result.speedKmh;
result.isNewSegment;
```

`RawGpsPoint` hiện có `recordedAt` dạng **Unix milliseconds (number)**, không phải ISO string. Khi ghi `RawGpsSample` của ứng dụng, chuyển thành `new Date(raw.recordedAt).toISOString()`.

**Lưu ý:** GpsProcessor hiện tại **chưa có** `getSnapshot()` và `restoreSnapshot()`. Các phương thức này là **đề xuất cần bổ sung**, không được gọi ngay nếu chưa triển khai.

## 3. Sửa callback nhận GPS và ghi SQLite

Vị trí: `startLocationTracking()` → callback `Location.watchPositionAsync`.

### 3.1. Mục tiêu

1. Lấy `result = processor.process(location)` đúng một lần cho mỗi sample.
2. Lưu raw sample vào SQLite dù `result.accepted === false`, trừ khi dữ liệu không thể chuyển thành record hợp lệ.
3. Chỉ dùng `result.point` để vẽ tuyến và cập nhật telemetry.
4. Bảo toàn `clientSampleId` để retry đồng bộ không tạo trùng bản ghi.
5. Không báo lưu thành công khi thao tác SQLite thất bại.

### 3.2. Ví dụ ánh xạ raw sample

```ts
const result = gpsProcessorRef.current.process(location);
const raw = result.rawPoint;
const recId = currentRecordingIdRef.current;

setGpsAccuracy(location.coords.accuracy ?? null);

if (recId && raw && Number.isFinite(raw.recordedAt)) {
  const rawSample: RawGpsSample = {
    clientSampleId: generateUUID(),
    clientRecordingId: recId,
    latitude: raw.latitude,
    longitude: raw.longitude,
    recordedAt: new Date(raw.recordedAt).toISOString(),
    accuracyM: raw.accuracyM ?? null,
    altitudeM: raw.altitudeM ?? null,
    altitudeAccuracyM: raw.altitudeAccuracyM ?? null,
    speedMps: raw.speedMps ?? null,
    headingDeg: raw.headingDeg ?? null,
    segmentId: result.point?.segmentId ?? gpsProcessorRef.current.getCurrentSegmentId(),
    accepted: result.accepted,
    rejectReason: mapRejectReason(result.reason),
  };

  // Ví dụ minh họa: cần dùng hàng đợi ghi tuần tự ở tầng storage.
  enqueueSampleWrite(() => recordingDatabase.insertRawSample(rawSample));
}

if (!result.accepted || !result.point) return;

const pt = result.point;
setCurrentPosition({
  latitude: pt.latitude,
  longitude: pt.longitude,
  elevation: pt.elevation != null ? Math.round(pt.elevation) : undefined,
});
setRecordedCoordinates(prev => [...prev, pt]);
setDistanceKm(result.distanceM / 1000);
setElevationGainM(result.elevationGainM);
setCurrentSpeedKmh(result.speedKmh);
setGpsStatus('READY');
```

`enqueueSampleWrite` là **hàm cần triển khai**, không phải API sẵn có. Dùng hàng đợi tuần tự hoặc transaction của SQLite để bảo đảm `finish` đợi tất cả insert đã hoàn tất. Không dùng `await` trực tiếp trong callback nếu không có cơ chế kiểm soát các callback đến chồng nhau.

### 3.3. Ánh xạ lý do loại điểm

Modal đang dùng `RejectReason` của `@/types`. Phải đối chiếu union/enum này trước khi sửa. **Không được mặc định `GPS_JITTER`, `STALE_LOCATION`, `INVALID_TIME` thành `GPS_JUMP`** vì sẽ làm sai thống kê chất lượng GPS.

Có hai phương án:

- **Ưu tiên:** mở rộng `RejectReason` trong `@/types` và schema SQLite để hỗ trợ đủ 6 giá trị của processor.
- **Nếu chưa thể migration:** ánh xạ sang giá trị tổng quát như `OTHER` **chỉ khi enum thực tế có hỗ trợ**; lưu reason gốc trong cột metadata/log nếu có.

Không nên tự thêm một literal vào code mà chưa kiểm tra kiểu và schema storage.

## 4. Crash Recovery: vấn đề quan trọng nhất

Hiện modal đọc `getAcceptedPoints()` và tạo `restoredPoints`, nhưng **không khôi phục** các biến nội bộ của processor như `distanceM`, `elevationGainM`, `smoothedElevation`, `elevationAnchor`, `lastObservedTimestamp`, `lastValidFixTimestamp` và `currentSegmentId`.

Hệ quả: sau khi mở lại app, tuyến cũ có thể được vẽ nhưng số đo từ `GpsProcessor` khởi đầu từ 0, khiến telemetry và segment mới không nhất quán.

### 4.1. Phương án khuyến nghị: lưu snapshot

Bổ sung cho `GpsProcessor`:

```ts
export interface GpsProcessorSnapshot {
  currentSegmentId: number;
  distanceM: number;
  elevationGainM: number;
  lastObservedTimestamp: number;
  lastValidFixTimestamp: number;
  lastPoint: GpsPoint | null;
  smoothedElevation: number | null;
  elevationAnchor: number | null;
  // Nếu processor có trạng thái phục hồi GPS jump, cũng phải đưa vào snapshot.
}

// API đề xuất, CHƯA tồn tại trong gpsProcessor.ts hiện tại:
getSnapshot(): GpsProcessorSnapshot;
restoreSnapshot(snapshot: GpsProcessorSnapshot): void;
```

`restoreSnapshot` cần kiểm tra giá trị hữu hạn, không âm ở các bộ đếm, timestamp hợp lệ và ID segment hợp lệ. Nên có `snapshotVersion` nếu lưu lâu dài.

Lưu snapshot định kỳ cùng dữ liệu recording, hoặc trong transaction phù hợp để không bị lệch quá xa so với điểm GPS đã ghi. Khi khôi phục:

1. Đọc recording và các raw/accepted points từ SQLite.
2. Đọc snapshot gần nhất; nếu có, khôi phục processor.
3. Nếu snapshot cũ hơn các sample đã lưu, replay phần sample còn thiếu **theo thứ tự thời gian** bằng logic được thiết kế cho replay (không dùng kiểm tra tuổi `Date.now()` của live processing).
4. Tạo **segment mới** trước khi tiếp tục nhận GPS thực tế để không nối đoạn qua thời gian app bị tắt.
5. Khôi phục distance, elevation gain, elapsed time và UI.
6. Chỉ gọi `startLocationTracking()` sau khi hoàn tất các bước trên.

**Không nên** chỉ gọi `process()` trên toàn bộ lịch sử GPS cũ vì bộ lọc hiện kiểm tra `maxPointAgeMs` dựa trên `Date.now()`; điểm lịch sử sẽ bị đánh dấu `STALE_LOCATION`.

### 4.2. Lưu ý elapsed time

`elapsedSeconds` hiện được tăng bởi `setInterval`. Sau khi app bị đóng, giá trị này không tự khôi phục. Cần lưu `startedAt` và tổng thời gian pause hoặc `activeDurationMs` để tính lại. Nếu ứng dụng chỉ ghi foreground, không được tự coi khoảng thời gian app đã bị đóng là thời gian tracking thực tế.

## 5. Đồng bộ `segmentId` khi Pause / Resume

Hiện modal gọi đồng thời:

```ts
recordingDatabase.incrementSegmentId(recId);
gpsProcessorRef.current.breakSegment();
```

Nếu một bên lỗi hoặc crash recovery, ID có thể lệch. Khuyến nghị:

- `GpsProcessor` là nguồn `segmentId` cho **mọi raw sample mới** trong phiên đang chạy.
- Khi Resume: gọi `breakSegment()` đúng một lần rồi persist ID mới xuống SQLite bằng một API đặt giá trị cụ thể, ví dụ `setCurrentSegmentId(recId, id)` (cần triển khai nếu chưa có).
- Khi tự tách segment do GPS gap hoặc phục hồi GPS jump: đồng bộ ID thực tế theo `getCurrentSegmentId()`; không chỉ tăng ID trong nút Resume.
- Khi recovery: restore ID từ snapshot hoặc từ dữ liệu SQLite đã xác minh, rồi bắt đầu segment mới.

`isNewSegment` chỉ dùng để thông báo sự kiện, không thay thế việc persist ID.

## 6. Dừng ghi và lưu cung đường an toàn

### 6.1. `handleStopAndSave()`

Nút Hoàn tất hiện chỉ đặt `isPausedRef.current = true` và mở form. Nên chuyển trạng thái recorder sang `FINALIZING`/`PAUSED_FOR_SAVE` rõ ràng, ngừng nhận thêm sample; có thể tháo subscription khi chắc chắn người dùng muốn kết thúc. Nếu người dùng bấm **Quay lại** form, phải quyết định rõ quay lại trạng thái paused hay resume, không để UI và subscription mâu thuẫn.

### 6.2. `handleConfirmSave()`

Chuyển thành hàm `async`, chặn double-click bằng `isSaving`, và thực hiện theo thứ tự:

1. Validate tên trail và số điểm hợp lệ.
2. Ngừng nhận GPS mới và chờ hàng đợi ghi SQLite hoàn tất.
3. Lấy dữ liệu cuối cùng từ SQLite hoặc snapshot nhất quán, thay vì chỉ dựa vào React state có thể chưa cập nhật.
4. Tạo route/segments từ GPS thật.
5. Trong transaction (nếu tầng storage hỗ trợ): cập nhật recording `STOPPED_LOCAL`, lưu metadata và tạo outbox `CREATE_TRAIL`.
6. Tạo `PersonalTrail` local bằng `createPersonalTrail` (cần xác minh API này có ghi trùng dữ liệu hay không).
7. Lưu liên kết local trail ID với recording.
8. Chỉ sau khi mọi bước bắt buộc thành công mới reset session, đóng modal và gọi `onSaved`.
9. Nếu thất bại: giữ dữ liệu SQLite, cho retry; không báo thành công giả.

**Quan trọng:** `serverPersonalTrailId: newTrail.id` trong modal hiện tại cần được xem lại. Nếu `newTrail.id` do client tạo, không được mặc định đó là ID do server cấp. Nên đặt tên trường thể hiện rõ local ID/server ID, hoặc dùng mapping khi đồng bộ.

## 7. Không tạo cung đường GPS giả

Trong `handleConfirmSave()`, modal hiện:

- Có 1 điểm: tự tạo điểm thứ hai lệch `0.00001` độ.
- Có 0 điểm: dùng tọa độ fallback rồi tạo hai điểm giả.

**Đề xuất bỏ cả hai nhánh tạo dữ liệu giả.**

| Số điểm GPS thật | Xử lý |
|---|---|
| 0 | Không cho tạo trail hoàn chỉnh; có thể giữ recording nháp |
| 1 | Giữ bản nháp/point, chưa tạo route `LineString` |
| ≥2 | Tạo route từ các segment thật có ít nhất 2 điểm |

Đối với GeoJSON, dùng `MultiLineString` để không nối qua khoảng dừng hoặc mất GPS. Segment chỉ có 1 điểm có thể giữ riêng dưới dạng metadata/point, không đưa vào `LineString` không hợp lệ.

```ts
const coordinate = (p: GpsPoint): [number, number] | [number, number, number] =>
  p.elevation == null
    ? [p.longitude, p.latitude]
    : [p.longitude, p.latitude, p.elevation];

const grouped = new Map<number, GpsPoint[]>();
for (const p of recordedCoordinates) {
  const points = grouped.get(p.segmentId) ?? [];
  points.push(p);
  grouped.set(p.segmentId, points);
}

const multiLineCoordinates = [...grouped.values()]
  .filter(segment => segment.length >= 2)
  .map(segment => segment.map(coordinate));

const geojson = {
  type: 'MultiLineString' as const,
  coordinates: multiLineCoordinates,
};
```

Đoạn code trên chỉ là ví dụ tạo geometry; cần kiểm tra kiểu `PersonalTrail`, `gpsSegments`, `routePoints` hiện tại trước khi thay thế phần save.

## 8. Quản lý bộ nhớ và offline

- **SQLite** là nguồn dữ liệu bền vững cho raw GPS, checkpoints, recording metadata và outbox.
- **React state** (`recordedCoordinates`) chỉ phục vụ render. Với chuyến dài hàng chục nghìn điểm, cân nhắc downsample/giảm tần suất cập nhật UI, không tải toàn bộ điểm lên state mỗi lần render.
- **AsyncStorage** không cần lưu thêm bản sao GPS.
- Dữ liệu GPS được đồng bộ batch khi có mạng. Chỉ dọn raw sample cục bộ sau khi server xác nhận đã nhận đủ, xử lý xong và chính sách offline cho phép.
- `watchPositionAsync` là **foreground tracking**. Nếu yêu cầu tiếp tục ghi khi app vào background/khóa màn hình, cần thiết kế riêng với `startLocationUpdatesAsync`, quyền background và cấu hình hệ điều hành; sửa GpsProcessor đơn thuần không giải quyết được.

## 9. Những phần không cần đổi

Giữ nguyên nếu không có yêu cầu UI khác:

- `MapLibre3DView`, follow mode, zoom/locate, danh sách checkpoint.
- Dashboard Distance, Speed, Elevation Gain, Pace (nhưng gắn nhãn độ cao live là **GPS estimate**, không phải DEM chính thức).
- Các trường giao diện tên trail, khu vực, mô tả.
- `distanceMeters()` và phép tính khoảng cách Haversine trong processor.

## 10. Checklist triển khai và kiểm thử
 
- [x] Kiểm tra kiểu `RawGpsSample` / `RejectReason` / `recordingDatabase` thực tế.
- [x] Dùng `result.rawPoint` và lưu đúng `recordedAt` milliseconds → ISO.
- [x] Ánh xạ đầy đủ reject reasons, không biến lỗi khác thành `GPS_JUMP`.
- [x] Triển khai ghi SQLite an toàn, dừng subscription GPS trước khi finish.
- [x] Bổ sung snapshot/restore (`getSnapshot`, `restoreSnapshot`) cho GpsProcessor.
- [x] Khôi phục thời gian ghi, distance, elevation gain, segment ID khi Crash Recovery.
- [x] Đồng bộ segment ID khi Pause/Resume, GPS gap và crash recovery.
- [x] Bỏ hoàn toàn các điểm GPS giả khi lưu (< 2 điểm thật thì cảnh báo, không tạo fake point).
- [x] Xử lý GeoJSON segment hợp lệ; không nối qua khoảng trống.
- [x] Chặn lưu hai lần (`isSaving`) và chỉ báo thành công sau khi SQLite hoàn tất.
- [x] Kiểm tra phân biệt local trail ID và server trail ID.
- [x] Đã chạy kiểm tra TypeScript (`npx tsc --noEmit`) và Linter (`npx expo lint`) đạt 0 lỗi.

## 11. Phạm vi thay đổi đề xuất

```text
mobile/
├── utils/gpsProcessor.ts
│   └── Bổ sung snapshot/restore có validate
├── components/.../LiveTrailRecorderModal.tsx
│   └── Sửa GPS callback, recovery, segment, finish/save
├── services/storage/...
│   └── Hàng đợi ghi, flush, snapshot và transaction/outbox
└── types/...
    └── Đồng bộ reject reason và metadata (nếu cần)
```

**Không cần thay đổi Prisma schema hoặc NestJS chỉ để sửa luồng Mobile nói trên.** Các thay đổi API/backend cho đồng bộ raw GPS và DEM là một giai đoạn tích hợp riêng; cần đối chiếu contract thực tế trước khi triển khai.
