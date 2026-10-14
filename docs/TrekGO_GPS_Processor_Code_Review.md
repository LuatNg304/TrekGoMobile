# TrekGO — Đánh giá GPS Processor và Live Trail Recorder

**Bối cảnh:** Kiểm thử GPS bằng iPhone thật, React Native/Expo, MapLibre.  
**Phạm vi:** Đoạn `GpsProcessor` người dùng cung cấp và `LiveTrailRecorderModal.tsx` đã gửi.  
**Mục tiêu:** Tăng độ tin cậy của tọa độ, khoảng cách, elevation gain và đường vẽ khi Pause/Resume hoặc mất tín hiệu.

## 1. Đánh giá tổng quan

Code đã cải thiện so với phiên bản ban đầu: tách bộ xử lý GPS khỏi UI, kiểm tra `timestamp`, `accuracy`, giới hạn vận tốc, làm mượt độ cao bằng EMA và giữ khoảng cách tích lũy ở đơn vị mét.

Tuy nhiên, vẫn còn một số vấn đề cần sửa trước khi dùng cho các phiên trekking dài.

| Ưu tiên | Vấn đề | Hệ quả |
|---|---|---|
| Cao | EMA cập nhật trước khi điểm GPS được chấp nhận | Điểm bị loại vẫn có thể ảnh hưởng độ cao đã lọc |
| Cao | `breakSegment()` chỉ reset processor, không tách đường vẽ | MapLibre có thể nối qua đoạn Pause |
| Cao | Không có quy tắc xử lý khoảng trống GPS kéo dài | Có thể cộng đoạn nối thẳng chưa được quan sát |
| Trung bình | `maxWalkingSpeedMs = 4.5` cố định | Có thể loại điểm hợp lệ hoặc chấp nhận nhiễu |
| Trung bình | Elevation Gain chỉ dùng ngưỡng 5m | Vẫn có thể tích lũy nhiễu hoặc bỏ sót lên dốc nhẹ |
| Trung bình | Nút `+Bước` thêm điểm giả trực tiếp | Dữ liệu mô phỏng lẫn dữ liệu thật |
| Trung bình | Checkpoint thiếu độ cao bị thay bằng độ cao hiện tại hoặc 0 | Dữ liệu checkpoint không đúng nguồn đo |

## 2. Sửa thứ tự xử lý EMA

Trong `GpsProcessor.process()`, code đang cập nhật `smoothedElevation` trước khi kiểm tra `GPS_JUMP` và `GPS_JITTER`:

```ts
if (altitudeValid) {
  const altitude = c.altitude as number;
  this.smoothedElevation =
    this.smoothedElevation === null
      ? altitude
      : GPS_CONFIG.elevationAlpha * altitude +
        (1 - GPS_CONFIG.elevationAlpha) * this.smoothedElevation;
  point.elevation = this.smoothedElevation;
}
```

Điều này làm điểm bị từ chối vẫn thay đổi trạng thái bộ lọc. **Cần chuyển bước cập nhật EMA đến sau các bước xác nhận điểm**, hoặc tính giá trị tạm rồi chỉ commit trạng thái khi điểm được chấp nhận. Với điểm đầu segment, có thể khởi tạo EMA sau khi kiểm tra tọa độ, chất lượng và thời gian.

Ngoài ra, cần quyết định riêng cách xử lý độ cao khi vị trí không được thêm vào đường vẽ: nếu muốn cập nhật độ cao khi đứng yên, hãy xây dựng bộ lọc độ cao độc lập có kiểm tra chất lượng, không cập nhật âm thầm trạng thái EMA của tuyến đã chấp nhận.

## 3. Tách segment khi Pause/Resume

Code hiện tại:

```ts
breakSegment() {
  this.lastPoint = null;
  this.lastObservedTimestamp = 0;
  this.smoothedElevation = null;
  this.elevationAnchor = null;
}
```

Việc reset giúp không cộng khoảng cách giữa điểm cuối trước Pause và điểm đầu sau Resume. Tuy nhiên, `LiveTrailRecorderModal.tsx` vẫn nối mọi điểm vào một mảng:

```ts
setRecordedCoordinates(prev => [...prev, point]);
```

Vì vậy, nếu bản đồ vẽ một `LineString`, đường vẫn nối qua khoảng Pause.

**Khuyến nghị:** Lưu `segmentId` cùng mỗi điểm hoặc lưu `GpsPoint[][]`; mỗi lần Resume hoặc GPS gap tạo segment mới. Dùng `MultiLineString` để vẽ các đoạn tách biệt. Nếu API lưu tuyến hiện chỉ hỗ trợ `LineString`, cần mở rộng schema hoặc lưu metadata segment riêng; không âm thầm ghép đoạn gián đoạn thành tuyến liên tục.

## 4. Phát hiện mất GPS kéo dài

Ví dụ: điểm A được ghi lúc 10:00:00; mất tín hiệu; điểm B được ghi lúc 10:02:00. Vận tốc trung bình A–B có thể vẫn dưới giới hạn 4,5 m/s, dù không có bằng chứng người dùng đã đi theo đường thẳng.

Thêm cấu hình thử nghiệm:

```ts
export const GPS_CONFIG = {
  maxAccuracyM: 25,
  minMovementM: 5,
  maxWalkingSpeedMs: 4.5,
  maxPointAgeMs: 15000,
  maxTrackingGapMs: 15000,
  elevationAccuracyM: 15,
  elevationAlpha: 0.2,
  elevationThresholdM: 5,
};
```

`maxPointAgeMs` kiểm tra độ cũ của bản tin so với thời gian hiện tại; `maxTrackingGapMs` kiểm tra **khoảng cách thời gian giữa hai điểm**. Đây là hai điều kiện khác nhau.

Nếu khoảng trống vượt ngưỡng, bắt đầu segment mới, không cộng đoạn nối chưa quan sát. Cần đồng bộ `segmentId`/trạng thái segment với UI và dữ liệu lưu. Ngưỡng 15 giây chỉ là giá trị khởi đầu cần thử trên iPhone thật.

## 5. Giới hạn vận tốc và nhiễu GPS

```ts
maxWalkingSpeedMs: 4.5 // khoảng 16,2 km/h
```

Ngưỡng cố định hữu ích để chặn nhảy tọa độ lớn, nhưng không đủ để xác nhận một điểm hợp lệ. Một điểm nhiễu vẫn có thể có vận tốc trung bình thấp nếu `dt` lớn. Nên kết hợp `accuracy`, thời gian, độ dịch chuyển, bối cảnh di chuyển và khoảng trống GPS. Không nên giảm ngưỡng quá thấp vì có thể làm thiếu tuyến ở những đoạn xuống dốc hoặc di chuyển nhanh.

`noiseThreshold` hiện tại có thể khiến người đi chậm không tạo điểm trong thời gian dài. Nên thử nghiệm thêm cơ chế phát hiện dịch chuyển tích lũy thay vì coi mọi chuyển động dưới ngưỡng là đứng yên.

## 6. Elevation Gain

Bộ lọc EMA với ngưỡng ascent 5m là giải pháp MVP, nhưng chưa bảo đảm loại bỏ hết nhiễu độ cao. Cần xem xét:

- Chỉ nhận độ cao có `altitudeAccuracy` phù hợp.
- Không cho điểm bị loại cập nhật trạng thái EMA của tuyến.
- Xử lý khoảng trống và segment riêng.
- So sánh với dữ liệu tham chiếu trên tuyến có độ cao đã biết.
- Khi cần độ tin cậy cao hơn, cân nhắc bộ lọc có hysteresis/xác nhận xu hướng đỉnh–đáy hoặc hậu xử lý DEM với quy chiếu độ cao nhất quán.

Không nên xem giá trị GPS altitude và độ cao địa hình DEM là mặc nhiên tương đương.

## 7. Sửa `LiveTrailRecorderModal.tsx`

### 7.1. Tách chế độ mô phỏng

`handleSimulateStep()` đang thêm trực tiếp điểm giả:

```ts
setRecordedCoordinates(prev => [...prev, nextCoord]);
setDistanceKm(d => Number((d + 0.015).toFixed(3)));
```

Điều này làm tổng khoảng cách của processor không còn khớp dữ liệu hiển thị và tuyến lưu. **Ẩn nút `+Bước` trong phiên GPS thật**; nếu cần mô phỏng, dùng chế độ test riêng, gắn nhãn dữ liệu mô phỏng và không trộn với bản ghi thực tế.

### 7.2. Không tự điền độ cao checkpoint

Đoạn đang dùng:

```ts
elevation:
  cp.elevation != null
    ? Math.round(cp.elevation)
    : currentPosition?.elevation != null
      ? Math.round(currentPosition.elevation)
      : 0
```

Nếu checkpoint không có độ cao hợp lệ, cần để `null` hoặc không có trường đó (tùy kiểu dữ liệu/schema), không lấy độ cao hiện tại hay số 0 thay thế. Trường hợp type đang bắt buộc `number`, nên chỉnh type/schema và các màn hình tiêu thụ dữ liệu tương ứng.

### 7.3. Lưu dữ liệu phục vụ kiểm thử

Đề xuất kiểu điểm mở rộng:

```ts
export interface GpsPoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  timestamp: number;
  accuracy: number;
  altitudeAccuracy?: number;
  speed?: number;
  segmentId: number;
}
```

Lưu thêm dữ liệu gốc nếu có thể để phân tích lỗi và hiệu chỉnh thuật toán sau phiên ghi.

## 8. Thứ tự triển khai

1. Sửa việc commit EMA trước khi chấp nhận điểm.
2. Bổ sung `maxTrackingGapMs` và đánh dấu segment mới.
3. Tách segment thực sự trong state, đường vẽ MapLibre và dữ liệu lưu.
4. Tách Simulation khỏi bản ghi GPS thật.
5. Bỏ các giá trị độ cao checkpoint tự điền không có căn cứ.
6. Kiểm thử ngoài trời trên iPhone thật và tinh chỉnh bộ lọc độ cao/tọa độ.

## 9. Kịch bản kiểm thử

| Kịch bản | Kết quả mong đợi |
|---|---|
| Đứng yên ngoài trời 3–5 phút | Quãng đường và ascent không tăng bất thường |
| Đi bộ chậm trên đường bằng | Không mất quá nhiều điểm, tuyến bám tương đối sát đường |
| Pause, di chuyển, Resume | Không cộng và không vẽ nối đoạn di chuyển khi Pause |
| Mất GPS rồi bắt lại | Có segment mới, không cộng đoạn nối thiếu quan sát |
| Bấm chế độ mô phỏng | Không làm thay đổi bản ghi GPS thật |
| Checkpoint không có độ cao | Dữ liệu lưu thể hiện chưa xác định, không tự điền 0 |
| Đi tuyến lên/xuống dốc | Ascent được đối chiếu với tuyến tham chiếu |

## Kết luận

`GpsProcessor` là nền tảng hợp lý cho MVP, nhưng nên sửa EMA và quản lý GPS gap/segment trước khi dùng để ghi các chuyến trekking dài. Những thay đổi này cần được thực hiện đồng bộ ở **processor → React state → MapLibre → định dạng lưu trữ**, tránh chỉ sửa bộ lọc mà vẫn vẽ hoặc lưu một tuyến liên tục sai thực tế.
