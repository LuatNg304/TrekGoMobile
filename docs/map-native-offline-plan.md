# Phương án hiện tại: WebView + MapLibre GL JS

- Giữ WebView để tiếp tục test bằng Expo Go trên Android/iOS; không cần web.
- Nền vector MapTiler qua API; không dùng SDK MapTiler.
- Giữ terrain núi nổi 3D từ AWS Terrarium DEM.
- Offline ngoài phạm vi hiện tại. Chưa chuyển sang MapLibre Native.
- Hai component map dùng URL style chung tại src/constants/map.ts, lấy API key và style ID từ .env.
- Attribution bản đồ được hiển thị trở lại.
- Sau khi đổi .env, khởi động lại Metro, có thể dùng npx expo start --clear.
- Cần test trên điện thoại: nền vector, nhãn, núi 3D, chuyển 2D/3D, route/checkpoint, follow GPS và map chuyến đi.

## Phân tích phương án Native trước đây — đã tạm hoãn

Phần dưới là lịch sử phân tích, không phải phạm vi triển khai hiện tại.

# Kế hoạch chuyển bản đồ TrekGo sang MapLibre Native

Ngày cập nhật: 23/10/2026.
Trạng thái: tài liệu thiết kế để đọc và thống nhất trước khi triển khai. Chưa thay đổi code, chưa cần API key.

## 1. Các quyết định đã chốt

- Dùng `@maplibre/maplibre-react-native` làm thư viện hiển thị bản đồ trên mobile.
- Không dùng SDK MapTiler; sử dụng MapTiler qua API cung cấp style/tiles.
- Dùng AWS Terrarium DEM với mục tiêu dựng địa hình núi nổi 3D; đây là yêu cầu đã xác nhận nhưng chưa đáp ứng được bằng MapLibre Native theo tài liệu đã kiểm tra.
- Chưa triển khai bản đồ offline trong đợt này; OfflineManager được để dành cho giai đoạn sau.
- Hỗ trợ cả Android và iOS; không triển khai map cho web.
- Bản đồ nền vector, dùng custom style MapTiler đã cung cấp.
- API key do người dùng điền vào .env; tài liệu này không chứa key.

“Không dùng SDK” trong tài liệu này nghĩa là không dùng SDK MapTiler. App vẫn cần thư viện MapLibre React Native.

## 2. Hiện trạng dự án

Dự án đang khai báo Expo ~57.0.26 và React Native 0.86.3.

Hai component hiện tại:
- `src/components/map/MapLibre3DView.tsx`: WebView chạy MapLibre GL JS; được dùng ở Explore, ghi hành trình trực tiếp và chi tiết hành trình cá nhân.
- `src/components/Trip3DMapView.tsx`: WebView hiển thị bản đồ chuyến đi.

Bản đồ hiện dùng ảnh vệ tinh Esri và DEM Terrarium từ AWS:
`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`

React Native truyền cập nhật vào WebView bằng injectJavaScript và nhận sự kiện bằng postMessage. Component hỗ trợ route dự kiến, route đã đi, checkpoint, vị trí hiện tại, camera, theo dõi người dùng và chuyển chế độ địa hình.

App đã có lưu dữ liệu hành trình cục bộ bằng SQLite. Giữ nguyên cơ chế lưu và ghi GPS hiện có khi thay renderer bản đồ.

## 3. Kiến trúc đề xuất

| Thành phần | Trách nhiệm |
| --- | --- |
| MapLibre React Native | Render bản đồ native, camera, sự kiện tương tác, các layer |
| MapTiler API | Style, bản đồ nền và tài nguyên liên quan như glyph/sprite |
| AWS Terrarium | Nguồn dữ liệu độ cao riêng |
| SQLite và dịch vụ ghi hành trình hiện có | Route, checkpoint, GPS và dữ liệu cần đồng bộ |

MapTiler và AWS là các nguồn dữ liệu độc lập. Không cần SDK MapTiler để kết hợp chúng.

Giữ interface props/ref của component map hiện tại khi khả thi để giảm thay đổi ở các màn hình sử dụng. Phần HTML, injectJavaScript và postMessage sẽ được thay bằng source/layer, camera và callback native.

Giữ dịch vụ GPS hiện có làm nguồn vị trí chính; tránh tạo thêm một luồng ghi GPS khác chỉ vì thay engine bản đồ.

## 4. Giới hạn quan trọng: DEM và địa hình 3D

Cần phân biệt:
- Nghiêng/xoay camera: thay đổi góc nhìn.
- Hillshade: đổ bóng để thể hiện địa hình trên bề mặt bản đồ.
- Terrain 3D: dùng DEM dựng bề mặt núi nổi thực sự.
- Độ cao route: dữ liệu số phục vụ biểu đồ, độ dốc và tổng lên/xuống.

Tài liệu MapLibre Style Spec được kiểm tra trong phiên trao đổi này đánh dấu terrain 3D chưa hỗ trợ trên Native Android/iOS. Vì vậy không cam kết giữ hiệu ứng setTerrain của GL JS khi chuyển sang Native.

RasterDEMSource có thể phục vụ hillshade, nhưng cần kiểm tra khả năng đọc Terrarium trên phiên bản được chọn. Upstream có ghi nhận vấn đề với encoding khi khai báo nguồn DEM qua một số API. Thử nghiệm cần xác nhận cấu hình thực sự được áp dụng, không chỉ kiểm tra map có hiển thị.

Người dùng đã xác nhận cần địa hình núi nổi 3D từ AWS DEM. Hillshade không đáp ứng yêu cầu này và không được tự động dùng thay thế.

Nếu núi nổi 3D là bắt buộc, dừng việc chuyển toàn bộ renderer để đánh giá lại phương án trước.

Hiển thị DEM không tự cung cấp biểu đồ độ cao. Nếu cần biểu đồ hoặc thống kê độ cao, phải thiết kế riêng nguồn giá trị độ cao, cách lấy mẫu và xử lý nhiễu.

## 5. Phạm vi đợt triển khai hiện tại

Tập trung chuyển renderer sang MapLibre Native, lấy bản đồ nền qua MapTiler API và thử nghiệm AWS DEM/hillshade khi có mạng.

Theo yêu cầu hiện tại, bỏ qua tải và hiển thị bản đồ offline. Đợt này không tích hợp OfflineManager, không tạo pack, không xây giao diện quản lý tải và không yêu cầu bản đồ nền hoạt động ở chế độ máy bay.

Offline là hướng phát triển sau, không phải điều kiện nghiệm thu hoặc yếu tố chặn đợt chuyển đổi này. Khi triển khai sau sẽ thiết kế riêng vùng tải, mức zoom, dung lượng và quyền sử dụng nguồn tiles.

Cơ chế lưu hành trình, ghi GPS và đồng bộ hiện có được giữ nguyên.

## 6. Expo và nền tảng

MapLibre React Native cần native build và Expo config plugin; không chạy trong Expo Go.

Trước khi sửa toàn bộ map:
- Chọn phiên bản package tương thích với Expo/RN hiện tại.
- Build thử trên thiết bị mục tiêu.
- Xác nhận map, marker, camera và sự kiện hoạt động.
- Thử AWS DEM/hillshade khi có mạng.

Phạm vi đã chốt: Android và iOS; không cần hỗ trợ map trên web.

Người dùng hiện chỉ test bằng Expo Go. Đây là điểm chưa tương thích với MapLibre Native: muốn triển khai thư viện này cần chuyển sang development build trên cả hai nền tảng. Chưa xác nhận việc chuyển môi trường test; không coi Expo Go là môi trường nghiệm thu native map.

Không xóa react-native-webview khỏi dự án chỉ vì chuyển map: các màn thanh toán vẫn đang sử dụng thư viện này.

## 7. Cấu hình API sau này

Các biến được chuẩn bị trong .env:
- `EXPO_PUBLIC_MAPTILER_API_KEY`
- `EXPO_PUBLIC_MAPTILER_STYLE_ID`

Style ID đã chốt: `01a16243-1ee5-7052-b55d-d4f7c7434358`.

URL style: `https://api.maptiler.com/maps/01a16243-1ee5-7052-b55d-d4f7c7434358/style.json?key=<EXPO_PUBLIC_MAPTILER_API_KEY>`.

Điền key vào `EXPO_PUBLIC_MAPTILER_API_KEY`; không dùng chuỗi INSERT_YOUR_OWN_API_KEY làm key thật. Việc thêm biến chưa kết nối style vào renderer hiện tại.

URL DEM là cấu hình nguồn riêng, không cần dùng chung key MapTiler.

Các biến EXPO_PUBLIC được đóng gói vào ứng dụng và không phải bí mật phía server. Chỉ dùng key phù hợp cho client; không đưa credential quản trị hoặc secret backend vào app. Không ghi key vào tài liệu, log hoặc commit.

Khi nhận cấu hình, cần xác nhận style ID, URL style, các nguồn dữ liệu trong style và điều kiện attribution. Giữ attribution phù hợp trên map.

## 8. Lộ trình triển khai

### Giai đoạn 1: Chứng minh khả năng kỹ thuật
- Tích hợp MapLibre và config plugin, build native.
- Render style MapTiler.
- Thử AWS Terrarium và hillshade.
- Quyết định cách xử lý nút 3D hiện tại dựa trên tính năng thực tế.

### Giai đoạn 2: Chuyển tính năng hiện có
- Route dự kiến và route đã đi, kể cả route có nhiều segment.
- Checkpoint, marker đầu/cuối và sự kiện bấm checkpoint.
- Vị trí GPS, follow user, locate và compass.
- Camera flyTo/easeTo/fitBounds và sự kiện người dùng thao tác.
- Trạng thái tải, lỗi và vòng đời component khi mở/đóng modal.

### Giai đoạn 3: Kiểm tra trước khi thay map cũ
- Kiểm tra các màn Explore, recorder, chi tiết trail và chuyến đi.
- Đo độ mượt, bộ nhớ và hành vi khi mở/đóng map nhiều lần.
- Đánh giá theo dõi GPS trên thiết bị thực, bao gồm khi màn hình tắt.
- Chỉ loại bỏ renderer WebView của map sau khi các chức năng cần thiết đã đạt yêu cầu.

## 9. Tiêu chí nghiệm thu

- Map mobile được render bằng MapLibre Native.
- Bản đồ nền lấy từ MapTiler API, không tích hợp SDK MapTiler.
- Route/checkpoint/GPS và camera hoạt động đúng trên các màn được chuyển đổi.
- Không nối sai đoạn giữa các segment GPS.
- AWS DEM hoạt động theo phạm vi đã thống nhất; không gọi hillshade là terrain 3D.
- Lỗi tải bản đồ không làm gián đoạn cơ chế ghi hành trình hiện có.
- Không lộ credential quản trị; attribution được hiển thị phù hợp.
- Tính năng WebView thanh toán vẫn hoạt động.

## 10. Thông tin đã xác nhận và các điểm còn cần giải quyết

| Nội dung | Xác nhận của người dùng |
| --- | --- |
| Nền tảng | Android và iOS, không cần web |
| Môi trường test hiện tại | Expo Go |
| Bản đồ nền | Vector |
| DEM | AWS Terrarium để dựng địa hình núi nổi 3D |
| MapTiler style ID | 01a16243-1ee5-7052-b55d-d4f7c7434358 |
| API key | Người dùng tự điền vào .env |
| Offline | Ngoài phạm vi đợt này |

Hai điểm cần giải quyết trước khi chuyển renderer:
1. MapLibre Native không chạy trong Expo Go. Cần thống nhất chuyển sang development build nếu tiếp tục dùng Native.
2. Yêu cầu terrain 3D chưa đáp ứng bởi MapLibre Native theo bảng hỗ trợ đã kiểm tra. Cần đánh giá lại renderer hoặc chờ khả năng hỗ trợ phù hợp; không tự hạ yêu cầu xuống hillshade.

Chưa triển khai renderer cho đến khi thống nhất phương án đáp ứng hai điểm trên. Style URL được cung cấp dùng placeholder key; chưa xác minh nội dung style hoặc gói dịch vụ MapTiler thực tế.

## 11. Tài liệu tham khảo

- MapLibre React Native: https://maplibre.org/maplibre-react-native/docs/setup/getting-started/
- Expo setup: https://maplibre.org/maplibre-react-native/docs/setup/expo/
- RasterDEMSource: https://maplibre.org/maplibre-react-native/docs/components/sources/raster-dem-source/
- Bảng hỗ trợ terrain: https://maplibre.org/maplibre-style-spec/terrain/
- Ghi nhận encoding Terrarium: https://github.com/maplibre/maplibre-native/issues/4357
- MapTiler Cloud terms: https://www.maptiler.com/terms/cloud/

Khả năng SDK và điều khoản có thể thay đổi. Kiểm tra lại các nguồn này khi chọn phiên bản triển khai.
