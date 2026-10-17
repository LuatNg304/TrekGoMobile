# 📋 Đánh Giá Các Tính Năng Còn Thiếu Của Cung Đường Cá Nhân (Personal Trail) Trên Mobile

> **Tài liệu tham chiếu:** [`docs/TrekGO_Mobile_Live_Trail_Recording_Implementation_v2.md`](file:///c:/Users/Admin/Documents/tuHocReactJS/TrekGoMobile/docs/TrekGO_Mobile_Live_Trail_Recording_Implementation_v2.md)  
> **Mục tiêu:** Liệt kê chi tiết toàn bộ các tính năng, API và luồng nghiệp vụ mà **TrekGo Mobile hiện còn thiếu** liên quan đến phân hệ **Cung đường cá nhân (Personal Trail)** để đội ngũ phát triển có kế hoạch hoàn thiện đồng bộ với Backend.

---

## 1. Bảng Tổng Hợp Trạng Thái Tính Năng (Feature Matrix)

| Phân hệ / Tính năng | Hiện trạng trên Mobile | Đánh giá |
| :--- | :--- | :---: |
| **Ghi nhận GPS thực địa (Live Recording)** | Đã lưu raw GPS vào SQLite, lọc nhiễu EMA, tách segment khi Pause/Resume. | ✅ **Đã xong** |
| **Bảo toàn dữ liệu cục bộ (Offline-first)** | Đã dùng SQLite + AsyncStorage, có Crash Recovery khi app bị tắt bất ngờ. | ✅ **Đã xong** |
| **Hàng đợi gửi lên Backend (Sync Outbox)** | Đã tạo cấu trúc Outbox và hàm gửi batch điểm GPS + tạo trail lên server. | ✅ **Đã xong** |
| **Lấy danh sách cung đường từ Server về (`GET`)** | Chưa gọi API `GET /api/v1/personal-trails`, chỉ đọc từ local cache máy. | ❌ **Còn thiếu** |
| **Lấy toạ độ chi tiết & bản đồ từ Server về (`GET :id`)** | Chưa gọi API `GET /api/v1/personal-trails/:id`, hiển thị toạ độ tạm của máy. | ❌ **Còn thiếu** |
| **Cơ chế Polling xử lý cao độ vệ tinh (AWS Terrarium DEM)** | Chưa kiểm tra trạng thái `PROCESSING` ➔ `READY` sau khi gửi Finish. | ❌ **Còn thiếu** |
| **Phân biệt số đo Tạm thời (Provisional) vs Chính thức (Official)** | Giao diện chưa có nhãn phân biệt số đo máy tự tính và số đo chuẩn DEM từ server. | ❌ **Còn thiếu** |
| **Tự động kích hoạt đồng bộ khi có mạng (Auto Trigger Sync)** | Mới có hàm, chưa có Event Listener mạng (`NetInfo`) tự kích hoạt Outbox ngầm. | ❌ **Còn thiếu** |
| **Đồng bộ chỉnh sửa (PUT) và Xóa (DELETE) lên Server** | Mới cập nhật cục bộ trong AsyncStorage/mock state, chưa gọi API Server. | ❌ **Còn thiếu** |
| **Quy trình Gửi kiểm duyệt (Submit Verification)** | Nút gửi duyệt mới chỉ đổi state local, chưa gọi API `TrailSubmission` của Backend. | ❌ **Còn thiếu** |
| **Mapping quyền riêng tư (Visibility)** | Mobile đang dùng `PRIVATE` / `PUBLIC`, Backend Prisma dùng `PRIVATE` / `SHARED`. | ⚠️ **Cần chuẩn hóa** |
| **Ghi vị trí ngầm khi tắt màn hình (Background Location)** | Đang dùng Foreground tracking, có thể bị OS tạm dừng nếu tắt màn hình lâu. | ⚠️ **Cần bổ sung** |

---

## 2. Chi Tiết 8 Hạng Mục Mobile Còn Thiếu

### 🔴 2.1. Chiều Kéo Dữ Liệu Từ Server Về (Sync Down / GET APIs)

* **Thực trạng:**
  - Khi người dùng mở màn hình danh sách [`src/app/personal-trails/index.tsx`](file:///c:/Users/Admin/Documents/tuHocReactJS/TrekGoMobile/src/app/personal-trails/index.tsx) hoặc màn hình chi tiết [`src/app/personal-trails/[id].tsx`](file:///c:/Users/Admin/Documents/tuHocReactJS/TrekGoMobile/src/app/personal-trails/%5Bid%5D.tsx), app chỉ đọc từ state bộ nhớ máy (`personalTrails` trong `AppContext`).
  - **Hệ quả:** Nếu người dùng đăng nhập tài khoản trên một điện thoại khác, hoặc gỡ app cài lại, toàn bộ cung đường đã lưu trên Backend sẽ **không xuất hiện** trên Mobile.
* **Những gì cần làm:**
  1. Tạo hàm `getPersonalTrails()` gọi `GET /api/v1/personal-trails`.
  2. Tạo hàm `getPersonalTrailById(id)` gọi `GET /api/v1/personal-trails/:id`.
  3. Cập nhật `AppContext.tsx`: Khi có Internet và đã đăng nhập, tự động fetch danh sách từ Backend và hợp nhất (merge) với các bản ghi nháp cục bộ trong SQLite.

---

### 🔴 2.2. Cơ Chế Polling & Theo Dõi Trạng Thái Xử Lý DEM Của Server

* **Thực trạng:**
  - Theo thiết kế v2.0, khi Mobile bấm kết thúc (`POST .../finish`), Backend không trả về kết quả ngay mà trả về HTTP `202 Accepted` với trạng thái `PROCESSING`. Lúc này Backend đang chạy tác vụ ngầm lấy dữ liệu mô hình số độ cao vệ tinh (AWS Terrarium DEM) để nắn lại cao độ từng điểm và tính lại cự ly chính thức.
  - Mobile hiện **chưa có cơ chế Polling** định kỳ (ví dụ: mỗi 3–5 giây một lần) gọi `GET /api/v1/trail-recordings/:recordingId` để biết khi nào Backend xử lý xong (`PROCESSING` ➔ `READY`).
* **Những gì cần làm:**
  1. Bổ sung hàm polling trạng thái phiên ghi `pollRecordingStatus(recordingId)`.
  2. Hiển thị thông báo trạng thái trên giao diện: *"Đang hiệu chỉnh độ cao vệ tinh..."* và tự động cập nhật khi server xử lý xong.

---

### 🔴 2.3. Phân Biệt Số Đo Tạm Thời (Provisional) vs Chính Thức (Official DEM)

* **Thực trạng:**
  - Số đo hiện tại hiển thị trên màn hình chi tiết (Cự ly `km`, độ dốc `+m`) hoàn toàn là **số đo tạm thời (provisional)** do GPS điện thoại tự tính. Cảm biến GPS điện thoại thường có sai số cao độ từ 10m – 30m.
  - Mobile chưa có cơ chế hiển thị số đo chính thức (official) sau khi nhận kết quả DEM từ Backend.
* **Những gì cần làm:**
  1. Bổ sung nhãn trên giao diện:
     - Badge màu vàng: `Chờ đồng bộ độ cao` (Khi chưa xử lý xong DEM).
     - Badge màu xanh: `Độ cao vệ tinh chuẩn xác` (Đã được AWS Terrarium DEM nắn chỉnh).
  2. Khi Backend trả về kết quả `processedGeojson`, cập nhật biểu đồ Elevation Profile và chỉ số `elevationGainM` chính thức.

---

### 🔴 2.4. Bộ Kích Hoạt Đồng Bộ Tự Động (Auto-sync Trigger Khi Có Mạng)

* **Thực trạng:**
  - File [`syncService.ts`](file:///c:/Users/Admin/Documents/tuHocReactJS/TrekGoMobile/src/services/storage/syncService.ts) đã có hàm `processSyncOutbox()`, nhưng hiện tại hàm này chưa được móc (hook) vào bất kỳ cơ chế tự động nào.
* **Những gì cần làm:**
  1. Kích hoạt `syncService.processSyncOutbox()` ngay sau khi người dùng bấm **Lưu cung đường** trong [`LiveTrailRecorderModal.tsx`](file:///c:/Users/Admin/Documents/tuHocReactJS/TrekGoMobile/src/components/trail/LiveTrailRecorderModal.tsx).
  2. Kích hoạt tự động khi người dùng vừa mở app lên (`hydrateStorage` trong `AppContext.tsx`).
  3. Sử dụng `@react-native-community/netinfo` để lắng nghe sự kiện: ngay khi thiết bị chuyển từ **Mất mạng ➔ Có mạng**, tự động kích hoạt Outbox để đẩy các điểm GPS còn tồn đọng.

---

### 🔴 2.5. Đồng Bộ Thao Tác Chỉnh Sửa (PUT) & Xóa (DELETE) Lên Server

* **Thực trạng:**
  - Tại màn hình chỉnh sửa [`src/app/personal-trails/[id]/edit.tsx`](file:///c:/Users/Admin/Documents/tuHocReactJS/TrekGoMobile/src/app/personal-trails/%5Bid%5D/edit.tsx): Khi người dùng sửa tên, độ khó, địa hình hoặc thêm/bớt Checkpoint, hàm `saveTrail()` mới chỉ cập nhật React state và ghi đè vào AsyncStorage cục bộ.
  - Tại màn hình chi tiết [`src/app/personal-trails/[id].tsx`](file:///c:/Users/Admin/Documents/tuHocReactJS/TrekGoMobile/src/app/personal-trails/%5Bid%5D.tsx): Khi bấm nút Thùng rác xóa cung đường, hàm `deletePersonalTrail()` mới chỉ xóa trong bộ nhớ máy.
* **Những gì cần làm:**
  1. Gọi API `PUT /api/v1/personal-trails/:id` khi lưu chỉnh sửa (hoặc đưa vào outbox nếu offline).
  2. Gọi API `DELETE /api/v1/personal-trails/:id` khi người dùng xác nhận xóa cung đường.

---

### 🔴 2.6. Luồng Gửi Duyệt Cung Đường (Submit Verification Flow)

* **Thực trạng:**
  - Nút **"Gửi xác minh"** (`submitForVerification`) trên Mobile hiện chỉ đổi biến `verificationStatus = "PENDING"` trong mock state của máy.
  - Schema Backend Prisma sử dụng bảng riêng là `TrailSubmission` để Admin duyệt cung đường chuyển thành System Trail (cung đường công khai).
* **Những gì cần làm:**
  1. Kết nối API gửi kiểm duyệt: `POST /api/v1/personal-trails/:id/submit-verification` (hoặc tạo `TrailSubmission`).
  2. Nhận lý do từ chối (`rejectionReason`) từ Server về để hiển thị trên màn hình khi Admin gửi phản hồi yêu cầu chỉnh sửa.

---

### 🟡 2.7. Chuẩn Hóa Giá Trị Quyền Riêng Tư (Visibility Mapping)

* **Thực trạng:**
  - **Trên Mobile hiện tại:** Enum `PersonalTrailVisibility = "PRIVATE" | "PUBLIC"`.
  - **Trên Backend Prisma:** Enum `PersonalTrail.visibility = "PRIVATE" | "SHARED"`. Backend không cho phép cá nhân tự ý đổi thành `PUBLIC` (muốn thành công khai toàn hệ thống phải qua kiểm duyệt của Admin).
* **Những gì cần làm:**
  - Chuẩn hóa trên Mobile: Chuyển tùy chọn hiển thị thành `PRIVATE` (Chỉ mình tôi) hoặc `SHARED` (Chia sẻ link cho bạn bè trong đoàn).

---

### 🟡 2.8. Ghi Tọa Độ Khi Khóa Màn Hình (Background Location Tracking)

* **Thực trạng:**
  - `LiveTrailRecorderModal.tsx` đang dùng `Location.watchPositionAsync` ở chế độ Foreground (chỉ chạy khi màn hình app đang sáng).
  - Khi đi trekking thực tế kéo dài 4 – 8 tiếng, người dùng thường khóa màn hình bỏ điện thoại vào túi áo/balo. Cả iOS và Android sẽ tự động tạm dừng (pause/kill) việc cấp toạ độ nếu app không đăng ký Background Location đúng chuẩn.
* **Những gì cần làm:**
  1. Tích hợp `expo-task-manager` và `Location.startLocationUpdatesAsync`.
  2. Cấu hình quyền `ACCESS_BACKGROUND_LOCATION` (Android) và `UIBackgroundModes: ["location"]` (iOS) để đảm bảo app tiếp tục nhận tọa độ đều đặn khi tắt màn hình.

---

## 3. Lộ Trình Triển Khai Tiếp Theo (Action Plan)

| Giai đoạn | Nhiệm vụ chính | Ưu tiên |
| :--- | :--- | :---: |
| **Giai đoạn 1 (Cần ngay)** | Viết module API `GET /api/v1/personal-trails` và `GET .../:id`, tích hợp vào `AppContext` để đồng bộ 2 chiều. | 🔴 Cao nhất |
| **Giai đoạn 2** | Kết nối `PUT` (sửa) và `DELETE` (xóa) vào server; tự động kích hoạt `syncService` khi lưu trail hoặc mở app. | 🔴 Cao |
| **Giai đoạn 3** | Thêm cơ chế Polling chờ Backend tính độ cao DEM; hiển thị badge phân biệt số đo tạm thời và chính thức. | 🟡 Trung bình |
| **Giai đoạn 4** | Cấu hình Background Location với TaskManager để ghi GPS liên tục khi khóa màn hình. | 🟡 Trung bình |
