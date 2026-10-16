# 🧭 TrekGo — Đặc Tả Nghiệp Vụ & Thiết Kế API Backend Cho Phân Hệ Cung Đường Cá Nhân (Personal Trail)

> **Tài liệu dành cho:** Đội ngũ Backend (BE / API Developers / Database Administrators)  
> **Dự án:** TrekGo Ecosystem (Mobile App & Backend Server)  
> **Phiên bản:** v2.1 (Cập nhật kiến trúc Offline-First, SQLite Outbox, bỏ mốc CP của trekker, chống tạo GPS giả)  
> **Ngày cập nhật:** 15/10/2026  

---

## 1. Tổng Quan Nghiệp Vụ (Executive Summary & Business Domain)

### 1.1. Khái niệm Cung Đường Cá Nhân (Personal Trail)
* **Personal Trail** là cung đường do người dùng cá nhân (**Trekker**) tạo lập trên ứng dụng TrekGo Mobile.
* Có 2 phương thức hình thành Personal Trail:
  1. **Ghi trực tiếp ngoài thực địa (Live GPS Recording)**: Người dùng mở modal *Live Trail Recorder*, cầm điện thoại di chuyển. Ứng dụng liên tục thu nhận toạ độ vệ tinh WGS84, lọc nhiễu qua `GpsProcessor`, lưu cục bộ vào SQLite (`trekgo_recordings.db`) và đồng bộ lên Backend.
  2. **Tạo mô phỏng thủ công (Manual Builder)**: Người dùng nhập thông số cung đường (Cự ly, độ cao, địa hình) và chọn mẫu lộ trình đồ hoạ 2D (Ridge, Forest, Waterfall).

### 1.2. Các Thay Đổi Nghiệp Vụ Cốt Lõi Vừa Cập Nhật (Quan Trọng Đối Với BE)

| STT | Nghiệp vụ trước đây | Nghiệp vụ MỚI (Hiện tại) | Lý do nghiệp vụ & Tác động lên BE |
| :---: | :--- | :--- | :--- |
| **1** | Trekker được bấm nút cắm mốc Checkpoint (Mốc CP1, CP2...) khi ghi trail. | **TREKKER KHÔNG ĐƯỢC CẮM MỐC CP.** Nút Mốc CP đã bị gỡ bỏ hoàn toàn khỏi Live Recorder. | Mốc CP (Checkpoint) là các trạm kiểm soát an toàn/tiếp tế chỉ có Ban tổ chức giải, Tour Leader hoặc Admin mới có thẩm quyền thiết lập trên Cung đường hệ thống. Cung đường cá nhân của trekker chỉ ghi nhận vệt di chuyển (Tracklog), `checkpoints` luôn là mảng rỗng `[]`. |
| **2** | Khi có 0 hoặc 1 điểm GPS, hệ thống tự sinh 2 điểm giả lệch `+0.00001` độ ở Tà Năng. | **LOẠI BỎ HOÀN TOÀN TẠO GPS GIẢ.** Bắt buộc phải có **tối thiểu 2 điểm GPS thực tế** (`recordedCoordinates.length >= 2`). | Không cho phép tạo cung đường rác vào database. Nếu người dùng đứng yên hoặc chưa bắt được GPS, ứng dụng sẽ từ chối lưu và yêu cầu di chuyển thực tế. |
| **3** | Lưu trữ cục bộ bằng `AsyncStorage` đơn thuần. | **SQLite WAL Mode + Outbox Pattern** (`trekgo_recordings.db`). | Đảm bảo tính bền vững dữ liệu (Crash-Resilient), ghi nhận từng mẫu raw GPS thô xuống đĩa ngay tức thì, hỗ trợ Crash Recovery khi app bị đóng đột ngột giữa rừng không mất mạng. |
| **4** | Toạ độ đường vẽ lưu dạng 1 `LineString` liền mạch duy nhất. | **MultiLineString 3D** (Mảng các phân đoạn `gpsSegments`). | Tách biệt vệt di chuyển khi người dùng bấm Tạm dừng (Pause/Resume) hoặc khi mất sóng GPS kéo dài (> 15s). Giúp bản đồ không vẽ các đường kẻ thẳng tắp đâm xuyên qua vách núi khi dừng chân nghỉ ngơi. |
| **5** | Đánh đồng `clientRecordingId` với `serverRecordingId`. | **Phân biệt rạch ròi Client ID vs Server ID**. | Mobile sinh `clientRecordingId` (UUID v4) và `clientSampleId` (UUID v4). Backend sử dụng các ID này để làm khoá **Idempotency** chống trùng lặp dữ liệu khi mobile gửi retry mạng. |

---

## 2. Vòng Đời & Trạng Thái Của Cung Đường (State Machine)

### 2.1. Trạng Thái Phiên Ghi (Recording Session Status)
```
[Bắt đầu] ──► RECORDING ◄────► PAUSED
                  │                │
                  ▼                ▼
           STOPPED_LOCAL ──► PENDING_SYNC ──► PROCESSING ──► READY
                                  │                  │
                                  ▼                  ▼
                             SYNC_FAILED     PROCESSING_FAILED
```
* **`RECORDING`**: Đang bật định vị và ghi nhận vệt GPS.
* **`PAUSED`**: Tạm dừng ghi (vẫn giữ session, dừng tăng thời gian).
* **`STOPPED_LOCAL`**: Đã bấm Hoàn tất & Lưu trên máy, đóng phiên ghi cục bộ.
* **`PENDING_SYNC`**: Đang nằm trong hàng đợi Outbox chờ có Internet để đẩy lên server.
* **`PROCESSING`**: Backend đã nhận đủ raw GPS, đang chạy worker xử lý hậu kỳ (nắn cao độ DEM vệ tinh).
* **`READY`**: Backend đã xử lý xong DEM, sinh file GeoJSON chuẩn và cập nhật telemetry chính thức.

### 2.2. Trạng Thái Xét Duyệt Cung Đường (Trail Verification Status)
* **`DRAFT`** (Mặc định): Cung đường cá nhân riêng tư, chỉ mình chủ sở hữu (Owner) nhìn thấy trong mục *Cung đường của bạn*.
* **`PENDING`**: Người dùng bấm *"Gửi để xác minh"* để xin công khai lên hệ thống TrekGo.
* **`VERIFIED`**: Ban quản trị (Admin) đã kiểm duyệt độ an toàn và hợp lệ, hiển thị công khai trên màn hình *Khám phá (Explore)* chung cho cộng đồng.
* **`REJECTED`**: Bị từ chối duyệt (kèm lý do `rejectionReason`: đường đi vào khu quân sự, rừng cấm, độ dốc nguy hiểm không có cảnh báo...).

---

## 3. Kiến Trúc Dữ Liệu GPS & Chuẩn Hình Học (GeoJSON 3D)

### 3.1. Phân biệt Dữ liệu Thô (Raw GPS) vs Tuyến đường hiển thị (Tracklog)

1. **Mẫu GPS Thô (`RawGpsSample`)**:
   * Lưu lại tất cả những gì chip GPS trên điện thoại bắt được, kể cả những điểm bị từ chối (`accepted: false`) do sai số cao.
   * Dùng để phục vụ Backend phân tích gian lận, tái lập cung đường chính xác cao, và nắn cao độ theo DEM.
2. **Tuyến đường hiển thị (`PersonalTrail.gpsSegments`)**:
   * Chỉ gồm các điểm đã được bộ lọc `GpsProcessor` chấp nhận (`accepted: true`).
   * Cấu trúc: `[number, number, number?][][]` — Mảng các phân đoạn toạ độ `[Kinh độ, Vĩ độ, Độ cao]`.

```json
{
  "type": "MultiLineString",
  "coordinates": [
    [
      [108.52904, 11.58312, 1420],
      [108.52915, 11.58325, 1422],
      [108.52928, 11.58339, 1425]
    ],
    [
      [108.53010, 11.58410, 1430],
      [108.53025, 11.58428, 1433]
    ]
  ]
}
```

> ⚠️ **Quy chuẩn toạ độ bắt buộc**: Chuẩn GeoJSON quy định thứ tự là **`[Kinh độ (Longitude), Vĩ độ (Latitude), Cao độ (Elevation)]`**. Tuyệt đối không đảo ngược thứ tự `[lat, lng]`.

---

## 4. Đặc Tả Chi Tiết RESTful API Contracts Cho Backend

Backend cung cấp prefix chung: `/api/v1`  
Header bắt buộc cho mọi request:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
```

---

### 🟢 4.1. Khởi Tạo Phiên Ghi Thực Địa (Start Recording Session)
Khi người dùng bấm nút *"Bắt đầu ghi cung đường"* trên Mobile.

* **Endpoint:** `POST /api/v1/trail-recordings/start`
* **Mô tả:** Đăng ký phiên ghi mới trên server để đồng bộ session.

#### Request Body:
```json
{
  "clientRecordingId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "startedAt": "2026-10-15T14:30:00.000Z",
  "deviceInfo": {
    "platform": "ios",
    "osVersion": "18.1",
    "deviceModel": "iPhone 15 Pro"
  }
}
```

#### Response Success (`201 Created`):
```json
{
  "success": true,
  "data": {
    "serverRecordingId": "rec_srv_88392019482",
    "clientRecordingId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "status": "RECORDING",
    "startedAt": "2026-10-15T14:30:00.000Z"
  }
}
```

---

### 🟢 4.2. Gửi Batch Mẫu GPS Thô (Upload Raw GPS Samples Batch)
Mobile gom các điểm GPS thô trong SQLite và đẩy lên server theo từng lô (Batch: 50 – 100 điểm) hoặc khi kết thúc cung đường.

* **Endpoint:** `POST /api/v1/trail-recordings/:recordingId/raw-samples`
* **Mô tả:** Lưu trữ toàn bộ dữ liệu mẫu GPS gốc. Phải hỗ trợ **Idempotency** (bỏ qua nếu `clientSampleId` đã tồn tại).

#### Request Body:
```json
{
  "clientRecordingId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "samples": [
    {
      "clientSampleId": "smp-001-uuid",
      "latitude": 11.58312,
      "longitude": 108.52904,
      "recordedAt": "2026-10-15T14:30:05.000Z",
      "accuracyM": 4.5,
      "altitudeM": 1420.5,
      "altitudeAccuracyM": 3.2,
      "speedMps": 1.25,
      "headingDeg": 45.0,
      "segmentId": 0,
      "accepted": true,
      "rejectReason": null
    },
    {
      "clientSampleId": "smp-002-uuid",
      "latitude": 11.58390,
      "longitude": 108.52990,
      "recordedAt": "2026-10-15T14:30:10.000Z",
      "accuracyM": 35.0,
      "altitudeM": 1450.0,
      "altitudeAccuracyM": 20.0,
      "speedMps": 6.8,
      "headingDeg": 48.0,
      "segmentId": 0,
      "accepted": false,
      "rejectReason": "LOW_ACCURACY"
    }
  ]
}
```

* Các giá trị hợp lệ của `rejectReason`:
  * `LOW_ACCURACY`: Sai số GPS mặt phẳng > 25m.
  * `SPEED_OUTLIER` / `GPS_JUMP`: Vận tốc nhảy vọt vượt ngưỡng người đi bộ/chạy địa hình (> 16.2 km/h).
  * `INVALID_COORDS`: Tọa độ NaN, Infinite hoặc vượt phạm vi [-90, 90], [-180, 180].
  * `GPS_JITTER`: Rung lắc tọa độ khi người dùng đang đứng yên một chỗ (< 5m).
  * `STALE_LOCATION`: Mẫu tọa độ cũ trễ quá 45 giây hoặc bị đảo lộn thời gian.
  * `INVALID_TIME`: Khoảng thời gian delta $dt \le 0$.

#### Response Success (`200 OK`):
```json
{
  "success": true,
  "data": {
    "receivedCount": 2,
    "insertedCount": 2,
    "duplicatedCount": 0
  }
}
```

---

### 🟢 4.3. Cập Nhật Trạng Thái Phiên Ghi (Pause / Resume)
* **Endpoint:** `PATCH /api/v1/trail-recordings/:recordingId/status`

#### Request Body:
```json
{
  "clientRecordingId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "status": "PAUSED", // hoặc "RECORDING"
  "timestamp": "2026-10-15T15:10:00.000Z",
  "currentSegmentId": 1
}
```

#### Response Success (`200 OK`):
```json
{
  "success": true,
  "data": {
    "status": "PAUSED",
    "updatedAt": "2026-10-15T15:10:00.000Z"
  }
}
```

---

### 🟢 4.4. Hoàn Tất Phiên Ghi & Kích Hoạt Xử Lý DEM (Finish & Process DEM)
Khi người dùng bấm *"Hoàn tất"* $\rightarrow$ *"Lưu & Đồng bộ"*.

* **Endpoint:** `POST /api/v1/trail-recordings/:recordingId/finish`
* **Mô tả:** Kết thúc phiên ghi. Backend nhận bản tóm tắt hành trình và đẩy job vào Background Queue (BullMQ / RabbitMQ) để nắn chỉnh mô hình số độ cao vệ tinh (AWS Terrarium DEM).

#### Request Body:
```json
{
  "clientRecordingId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "endedAt": "2026-10-15T16:00:00.000Z",
  "trailMetadata": {
    "title": "Đường mòn săn mây đỉnh 986m",
    "description": "Cung đường đi qua đồi thông, dốc thoải, suối cạn mùa này.",
    "region": "Lâm Đồng",
    "difficulty": "Trung bình",
    "terrainType": "Rừng & Đồi dốc",
    "visibility": "PRIVATE"
  },
  "provisionalTelemetry": {
    "distanceKm": 4.852,
    "elevationGainM": 215,
    "duration": "1 giờ 30 phút",
    "elapsedSeconds": 5400
  },
  "gpsSegments": [
    [
      [108.52904, 11.58312, 1420],
      [108.52915, 11.58325, 1422]
    ]
  ],
  "checkpoints": [] // LUÔN LÀ MẢNG RỖNG VỚI TREKKER
}
```

#### Response Success (`202 Accepted`):
```json
{
  "success": true,
  "message": "Đã tiếp nhận phiên ghi. Backend đang xử lý chuẩn hóa độ cao vệ tinh DEM.",
  "data": {
    "serverRecordingId": "rec_srv_88392019482",
    "serverPersonalTrailId": "ptrail_99482019284",
    "status": "PROCESSING",
    "estimatedProcessTimeSec": 5
  }
}
```

---

### 🟢 4.5. Polling Kiểm Tra Tiến Độ Xử Lý DEM (Poll Recording Status)
Mobile định kỳ gọi mỗi 3–5 giây một lần để biết khi nào Backend xử lý xong độ cao DEM.

* **Endpoint:** `GET /api/v1/trail-recordings/:recordingId/status`

#### Response khi đang xử lý (`200 OK`):
```json
{
  "success": true,
  "data": {
    "status": "PROCESSING",
    "progressPercent": 60,
    "message": "Đang truy vấn raster độ cao AWS Terrarium..."
  }
}
```

#### Response khi hoàn tất (`200 OK`):
```json
{
  "success": true,
  "data": {
    "status": "READY",
    "serverPersonalTrailId": "ptrail_99482019284",
    "officialTelemetry": {
      "distanceKm": 4.820,
      "elevationGainM": 238,
      "elevationLossM": 45,
      "maxElevationM": 1658,
      "minElevationM": 1420
    },
    "processedGeojson": {
      "type": "MultiLineString",
      "coordinates": [ ... ]
    }
  }
}
```

---

### 🟢 4.6. Lấy Danh Sách Cung Đường Cá Nhân Của Tôi (Get My Personal Trails)
* **Endpoint:** `GET /api/v1/personal-trails/my-trails`
* **Query Params:**
  * `page`: Trang (default: 1)
  * `limit`: Số bản ghi mỗi trang (default: 20)
  * `verificationStatus`: `DRAFT` | `PENDING` | `VERIFIED` | `REJECTED` (Optional)

#### Response Success (`200 OK`):
```json
{
  "success": true,
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 3,
    "totalPages": 1
  },
  "data": [
    {
      "id": "ptrail_99482019284",
      "name": "Đường mòn săn mây đỉnh 986m",
      "region": "Lâm Đồng",
      "difficulty": "Trung bình",
      "distanceKm": 4.82,
      "elevationGainM": 238,
      "duration": "1 giờ 30 phút",
      "terrainType": "Rừng & Đồi dốc",
      "visibility": "PRIVATE",
      "verificationStatus": "DRAFT",
      "demStatus": "READY",
      "thumbnailUrl": "https://cdn.trekgo.vn/trails/ptrail_99482019284/thumb.jpg",
      "createdAt": "2026-10-15T16:00:00.000Z",
      "updatedAt": "2026-10-15T16:00:15.000Z"
    }
  ]
}
```

---

### 🟢 4.7. Lấy Chi Tiết Cung Đường Cá Nhân (Get Personal Trail Detail)
* **Endpoint:** `GET /api/v1/personal-trails/:id`

#### Response Success (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "ptrail_99482019284",
    "ownerId": "usr_trekker_102938",
    "name": "Đường mòn săn mây đỉnh 986m",
    "region": "Lâm Đồng",
    "difficulty": "Trung bình",
    "distanceKm": 4.82,
    "elevationGainM": 238,
    "duration": "1 giờ 30 phút",
    "terrainType": "Rừng & Đồi dốc",
    "description": "Cung đường đi qua đồi thông, dốc thoải, suối cạn mùa này.",
    "visibility": "PRIVATE",
    "verificationStatus": "DRAFT",
    "routePreset": "RIDGE",
    "gpsSegments": [
      [
        [108.52904, 11.58312, 1420],
        [108.52915, 11.58325, 1422]
      ]
    ],
    "checkpoints": [],
    "elevationProfile": [
      { "distanceKm": 0.0, "elevationM": 1420 },
      { "distanceKm": 1.2, "elevationM": 1495 },
      { "distanceKm": 2.8, "elevationM": 1580 },
      { "distanceKm": 4.82, "elevationM": 1658 }
    ],
    "createdAt": "2026-10-15T16:00:00.000Z",
    "updatedAt": "2026-10-15T16:00:15.000Z"
  }
}
```

---

### 🟢 4.8. Cập Nhật Thông Tin Cung Đường (Update Personal Trail)
* **Endpoint:** `PUT /api/v1/personal-trails/:id`
* **Quyền hạn:** Chỉ `ownerId` của cung đường mới có quyền sửa.
* **Ghi chú nghiệp vụ:** Chỉ cho phép sửa tiêu đề, mô tả, khu vực, độ khó, quyền riêng tư (`visibility`). **Không cho phép client sửa đè mảng toạ độ `gpsSegments`** để bảo toàn tính xác thực của dữ liệu GPS đã ghi.

#### Request Body:
```json
{
  "name": "Đường mòn săn mây đỉnh 986m (Đã cập nhật)",
  "description": "Thêm ghi chú: Điểm gửi xe cách cổng trạm 200m.",
  "visibility": "PUBLIC"
}
```

---

### 🟢 4.9. Xóa Cung Đường Cá Nhân (Delete Personal Trail)
* **Endpoint:** `DELETE /api/v1/personal-trails/:id`
* **Quyền hạn:** Chủ sở hữu hoặc Admin.
* **Nghiệp vụ:** Soft-delete bản ghi trong cơ sở dữ liệu để phục vụ kiểm toán, cascade huỷ liên kết với recording session tương ứng.

---

### 🟢 4.10. Gửi Yêu Cầu Kiểm Duyệt Cung Đường (Submit For Verification)
* **Endpoint:** `POST /api/v1/personal-trails/:id/submit-verification`
* **Điều kiện hợp lệ từ Backend:**
  1. `distanceKm >= 0.5` (Cung đường phải dài tối thiểu 500m).
  2. `demStatus === "READY"` (Đã hoàn tất xử lý độ cao DEM).
  3. Trạng thái hiện tại phải là `DRAFT` hoặc `REJECTED`.

#### Request Body:
```json
{
  "noteToAdmin": "Cung đường thực tế tôi vừa đi khảo sát ngày 15/10, đường rất đẹp và an toàn."
}
```

#### Response Success (`200 OK`):
```json
{
  "success": true,
  "message": "Đã gửi cung đường cho Ban quản trị TrekGo kiểm duyệt.",
  "data": {
    "trailId": "ptrail_99482019284",
    "verificationStatus": "PENDING",
    "submittedAt": "2026-10-15T16:30:00.000Z"
  }
}
```

---

## 5. Thiết Kế Cơ Sở Dữ Liệu Backend (Database Schema & Prisma)

Mô hình khuyến nghị sử dụng **PostgreSQL** kết hợp extension **PostGIS** để lưu trữ và truy vấn không gian địa lý hiệu năng cao.

```prisma
// datasource db {
//   provider   = "postgresql"
//   url        = env("DATABASE_URL")
//   extensions = [postgis]
// }

enum DifficultyLevel {
  EASY          // Dễ
  MODERATE      // Trung bình
  HARD          // Khó
  EXTREME       // Thách thức
}

enum TrailVisibility {
  PRIVATE       // Riêng tư (chỉ chủ sở hữu xem được)
  PUBLIC        // Công khai (bạn bè hoặc mọi người)
}

enum VerificationStatus {
  DRAFT         // Bản nháp cá nhân
  PENDING       // Chờ duyệt
  VERIFIED      // Đã duyệt lên Explore chung
  REJECTED      // Từ chối
}

enum RecordingStatus {
  RECORDING
  PAUSED
  STOPPED_LOCAL
  PENDING_SYNC
  PROCESSING
  PROCESSING_FAILED
  READY
}

model PersonalTrail {
  id                    String              @id @default(uuid())
  ownerId               String              // Foreign key tới bảng User
  name                  String              @db.VarChar(255)
  region                String              @db.VarChar(100)
  difficulty            DifficultyLevel     @default(MODERATE)
  distanceKm            Float               // Cự ly chuẩn hóa từ DEM
  elevationGainM        Int                 // Độ dốc lũy kế chuẩn hóa từ DEM
  elevationLossM        Int?                // Độ dốc xuống lũy kế
  durationText          String              @db.VarChar(50) // VD: "1 giờ 30 phút"
  durationSeconds       Int                 // Số giây thực tế
  terrainType           String              @db.VarChar(100) // VD: "Rừng & Đồi dốc"
  description           String?             @db.Text
  visibility            TrailVisibility     @default(PRIVATE)
  verificationStatus    VerificationStatus  @default(DRAFT)
  rejectionReason       String?             @db.Text
  routePreset           String              @default("RIDGE") // "RIDGE" | "FOREST" | "WATERFALL"
  
  // Dữ liệu hình học GeoJSON 3D PostGIS
  // Hỗ trợ truy vấn ST_Length, ST_Distance, ST_Intersects
  geom                  Unsupported("geometry(MultiLineStringZ, 4326)")?
  gpsSegmentsJson       Json                // Lưu trữ dự phòng dạng JSON [lng, lat, elev][][]
  elevationProfileJson  Json?               // [{ distanceKm, elevationM }]
  
  // Liên kết phiên ghi gốc
  clientRecordingId     String?             @unique
  recordingSession      TrailRecording?     @relation(fields: [clientRecordingId], references: [clientRecordingId])

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  @@index([ownerId])
  @@index([verificationStatus])
  @@index([region])
}

model TrailRecording {
  id                    String              @id @default(uuid())
  clientRecordingId     String              @unique // UUID do Mobile sinh ra
  userId                String
  status                RecordingStatus     @default(RECORDING)
  startedAt             DateTime
  endedAt               DateTime?
  nextSegmentId         Int                 @default(0)
  
  // Telemetry tạm tính từ Mobile
  provisionalDistanceKm Float?
  provisionalElevationM Int?
  
  // Raw GPS Samples
  rawSamples            RawGpsSample[]
  personalTrail         PersonalTrail?

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  @@index([userId])
  @@index([status])
}

model RawGpsSample {
  id                    String              @id @default(uuid())
  clientSampleId        String              @unique // UUID do Mobile sinh ra (Idempotency)
  recordingId           String
  recording             TrailRecording      @relation(fields: [recordingId], references: [id], onDelete: Cascade)
  
  latitude              Float
  longitude             Float
  altitudeM             Float?              // Độ cao gốc từ GPS
  accuracyM             Float?              // Sai số GPS
  altitudeAccuracyM     Float?
  speedMps              Float?
  headingDeg            Float?
  segmentId             Int                 @default(0)
  accepted              Boolean             // Đã được mobile filter chấp nhận hay chưa
  rejectReason          String?             // LOW_ACCURACY, GPS_JUMP, etc.
  recordedAt            DateTime            // Thời điểm vệ tinh đo được

  createdAt             DateTime            @default(now())

  @@index([recordingId, accepted])
  @@index([recordingId, recordedAt])
}
```

---

## 6. Quy Trình Xử Lý DEM Độ Cao Vệ Tinh Trên Backend (Worker Job)

Khi Mobile gọi `POST .../finish`, Backend đưa job vào hàng đợi xử lý độ cao theo 4 bước:

```
[Mảng GPS Thô / Segments từ Mobile]
               │
               ▼
   [1. RANSAC / Douglas-Peucker] ────► Lược bớt điểm quá dày (giữ độ cong cung đường)
               │
               ▼
   [2. Nắn toạ độ qua AWS DEM] ──────► Lấy độ cao chuẩn từ Raster Map (AWS Terrarium Tile)
               │
               ▼
   [3. Tính toán Telemetry Chuẩn] ───► Tính cự ly 3D thực tế & độ dốc lũy kế không nhiễu
               │
               ▼
   [4. Tạo ST_MultiLineStringZ] ─────► Lưu vào PostGIS & gán ptrail status = READY
```

1. **Tại sao cần DEM vệ tinh?**
   * Chip GPS điện thoại di động có sai số phương thẳng đứng (Vertical Error) từ **±10m đến ±30m**. Nếu chỉ cộng dồn độ cao GPS đơn thuần, độ cao tích lũy (`elevationGainM`) sẽ bị phóng đại gấp 2 – 3 lần thực tế (ví dụ: đi đồi thoải nhưng báo leo +800m).
   * Backend dùng bản đồ độ cao số vệ tinh (Digital Elevation Model - DEM) như **AWS Terrarium** hoặc **Copernicus 30m** để chiếu tọa độ `(lat, lon)` xuống bề mặt địa hình thực tế, cho ra con số leo dốc chính xác chuẩn Strava/Garmin.

---

## 7. Bảng Mã Lỗi Chuẩn Hóa (Error Codes)

| HTTP Status | Error Code | Mô tả & Hướng dẫn xử lý cho Mobile Client |
| :---: | :--- | :--- |
| `400 Bad Request` | `INSUFFICIENT_GPS_POINTS` | Cung đường có ít hơn 2 điểm GPS hợp lệ. Không tạo được trail. |
| `400 Bad Request` | `INVALID_GEOJSON_COORDINATES` | Toạ độ nằm ngoài biên chuẩn WGS84 hoặc sai thứ tự `[lng, lat]`. |
| `401 Unauthorized`| `UNAUTHORIZED` | Token JWT hết hạn hoặc không hợp lệ. Mobile cần refresh token. |
| `403 Forbidden`   | `TRAIL_ACCESS_DENIED` | Người dùng không phải là chủ sở hữu của Personal Trail cần sửa/xóa. |
| `404 Not Found`   | `RECORDING_NOT_FOUND` | Không tìm thấy `clientRecordingId` tương ứng trên server. |
| `409 Conflict`    | `RECORDING_ALREADY_FINISHED` | Phiên ghi đã được đánh dấu kết thúc trước đó. |
| `422 Unprocessable`| `TRAIL_TOO_SHORT_FOR_VERIFY` | Cung đường ngắn hơn 500m, không đủ điều kiện gửi duyệt lên Explore. |
| `422 Unprocessable`| `DEM_NOT_READY` | Chưa xử lý xong độ cao vệ tinh, không thể gửi kiểm duyệt ngay. |
| `500 Server Error`| `DEM_PROCESSING_FAILED` | Lỗi khi fetch tile vệ tinh hoặc nắn độ cao. Server lưu provisional data làm dự phòng. |

---

## 8. Hướng Dẫn Tích Hợp Cho Đội Ngũ Backend

1. **Cài đặt PostGIS trên PostgreSQL**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
2. **Triển khai Idempotency Key**:
   * Tại endpoint nhận `raw-samples`, dùng câu lệnh `INSERT ... ON CONFLICT (client_sample_id) DO NOTHING` để việc gửi lại mạng của Mobile không bao giờ gây lỗi `500` hoặc trùng lặp bản ghi.
3. **Tuyệt đối không bắt buộc mảng `checkpoints`**:
   * Vì Mobile v2.1 đã bỏ tính năng cắm mốc CP của trekker, DTO tạo trail từ Mobile sẽ luôn gửi `checkpoints: []`. Backend schema cần cho phép `checkpoints` rỗng hoặc nullable.
4. **Hỗ trợ MultiLineString**:
   * Cột lưu trữ geometry phải là `MultiLineStringZ` (hoặc `GeometryCollection`), không ép kiểu về `LineString` đơn.
