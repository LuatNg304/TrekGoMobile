# Thiết kế bản đồ offline cho Explore và Trip

Ngày viết: 18/10/2026. Trạng thái: đã triển khai bước đầu riêng Explore; Trip vẫn là thiết kế cho giai đoạn sau.

## 0. Trạng thái triển khai Explore với MapTiler Cloud

Phần này mô tả code hiện có và được ưu tiên khi khác với phương án dự kiến ở các mục sau.

### Phạm vi và quyền tải

- Chỉ Explore được chuyển sang MapTiler: map cung đường hệ thống, cung đường cá nhân và modal ghi cung đường mở từ Explore. Map Trip và các caller khác giữ nguồn hiện tại.
- Nguồn vệ tinh thực đã kiểm tra bằng key trong `.env`: `satellite-v2` (JPEG 512×512); cao độ: `terrain-rgb-v2` (WebP 512×512, encoding Mapbox). Endpoint `satellite-v4` trả 404 khi kiểm tra, nên không sử dụng.
- API key chỉ dùng khi request từ thiết bị, không ghi vào database, HTML của WebView hay log lỗi.
- Theo [điều khoản MapTiler Cloud](https://www.maptiler.com/terms/cloud/), cache cá nhân tạm trên thiết bị được cho phép; tải hàng loạt cần thỏa thuận riêng. Không thể suy ra ngoại lệ từ việc API key Free gọi thành công.
- Với cấu hình hiện tại, chỉ cache tài nguyên của phần map đang được yêu cầu hiển thị. Bộ máy tải cả vùng đã có nhưng **tắt mặc định**. Không báo đã tải trọn vùng 2 km khi chỉ mới cache phần đã xem.
- Chỉ sau khi có quyền tải khu vực phù hợp, đặt `EXPO_PUBLIC_MAPTILER_OFFLINE_DOWNLOADS_ENABLED=true` và khởi động lại Metro. Biến này là cổng cấu hình kỹ thuật, không tự cấp quyền từ nhà cung cấp.

### Lưu dữ liệu và cầu nối WebView

- Bản đầu dùng database riêng `trekgo_explore_maps.db`: bảng `explore_tiles` lưu **BLOB nhị phân**, kích thước byte, thời điểm hết hạn và thời điểm dùng; bảng `explore_region` lưu JSON của kế hoạch vùng hiện tại, danh sách khóa và dấu đã thông báo.
- Chọn BLOB thay cho file riêng để ghi byte + metadata nguyên tử trong cùng bản ghi và tránh phụ thuộc cơ chế đọc `file://` khác nhau giữa Android/iOS. Không thêm thư viện native mới.
- Bản đồ dùng protocol `trekgo://satellite/z/x/y` và `trekgo://dem/z/x/y`. Resolver native lấy dữ liệu từ MapTiler khi online, từ SQLite khi mất mạng/lỗi nguồn. WebView nhận từng tile được yêu cầu, dưới dạng Base64 tạm qua bridge rồi giải mã thành ArrayBuffer; không đưa toàn bộ gói qua bridge và không lưu Base64 xuống đĩa.
- Đây là đánh đổi cho WebView: có chi phí sao chép byte. Cần đo RAM và độ mượt trên điện thoại; chưa khẳng định hiệu năng tương đương native renderer.
- Tối đa 3 HTTP request đồng thời trong toàn bộ dịch vụ Explore; request trùng khóa dùng chung; prefetch vùng chạy tuần tự để dành chỗ cho tile đang hiển thị.
- Ngân sách tile logic 200 MiB, dọn LRU ngoài vùng đang bảo vệ. Database này không chứa gói Trip nên không thể dọn nhầm tile Trip hiện tại. Khi triển khai Trip sau phải thiết kế thêm quan hệ giữ tài nguyên, không tự cho rằng đã có kho chung Explore/Trip hoàn chỉnh.
- Tôn trọng `no-store`, `no-cache` và `max-age` của nguồn. Hai tile thực kiểm tra trả `max-age=28800`, tương đương **8 giờ**; đây là cache tạm, không phải cam kết giữ offline vô thời hạn. Tile hết hạn không được tính READY; muốn có gói dài hạn cần làm rõ quyền và chính sách lưu với MapTiler.

### Giao diện và hành vi

- Nhãn Online/Offline/Một phần offline dựa trên kết quả phục vụ tile, không chỉ dựa vào biểu tượng Wi-Fi. Khi chưa lấy được tile không hiển thị giả là Online.
- Offline chặn camera vượt zoom 16; nếu tại tâm bản đồ chỉ có tile mức thấp hơn thì áp dụng mức đó. Kiểm tra tâm không chứng minh cả viewport được phủ; vùng thiếu hiển thị thông báo dữ liệu chưa đầy đủ.
- Giữ nguyên WebView, HTML và instance map khi đổi kết nối; chỉ làm mới URL tile của nguồn. Không thay toàn bộ style, không reset route/marker và không tự khôi phục zoom cao sau khi có mạng lại.
- Nút 2D/3D dùng chung ảnh vệ tinh; thiếu DEM thì hiển thị cảnh báo và tạm tắt terrain, không gọi đó là gói 3D hoàn chỉnh.
- Khi được bật hợp lệ: prefetch quanh GPS bán kính 2 km; cập nhật vùng khi đi 500 m; vệ tinh zoom 10–16, DEM zoom 10–12 kèm tile lân cận cho terrain. Chỉ READY sau khi kiểm tra toàn bộ tile; thông báo trong app hiển thị 6 giây và lưu dấu đã thông báo. Tiến độ và trạng thái đã tải vẫn được hiển thị riêng.
- GPS foreground chỉ phục vụ Explore. Hệ thống recording, checkpoint và điều kiện Trip trong `docs/flow.md` không thay đổi. Tải dừng khi rời Explore/app vào nền và có thể tiếp tục khi quay lại.
- MapLibre JS/CSS 4.7.1 và logo MapTiler được đóng gói local để không phụ thuộc CDN khi khởi động offline. Attribution và logo gói Free được giữ hiển thị; liên kết mở bên ngoài, không điều hướng WebView ra khỏi map.

### Cấu hình và kiểm tra

```env
EXPO_PUBLIC_MAPTILER_API_KEY=<key riêng của bạn>
# Mặc định không khai báo biến sau trên tài khoản Free chưa có thỏa thuận offline.
# EXPO_PUBLIC_MAPTILER_OFFLINE_DOWNLOADS_ENABLED=true
```

```sh
node --test src/services/maps/explore-map.regression.test.cjs
npx tsc --noEmit
npx expo lint
```

Kiểm thử tự động dùng SQLite thật, mock cầu nối native/network: lập kế hoạch vùng, BLOB/expiry, Free không prefetch, đọc cache offline, request trùng/concurrency, thiếu DEM chưa READY, acknowledgement thông báo, HTTP 429, no-store, protocol/cancel và cú pháp HTML cùng runtime đóng gói.

Kết quả kiểm tra triển khai: 11 regression tests đạt; typecheck đạt; lint các file mới và map Explore được sửa đạt; export bundle Android qua Metro/Hermes đạt. Lint toàn dự án vẫn báo 86 lỗi và 28 cảnh báo ở code hiện có ngoài phạm vi sửa; không sửa lan sang các flow khác để xử lý chúng. Export thử đã được xóa sau kiểm tra.

Chưa có thiết bị Android/iOS kết nối trong phiên triển khai. Cần xác nhận trực tiếp: lần đầu mở online, đổi 2D/3D, airplane mode, khởi động lạnh offline trước/sau khi cache hết hạn, mở modal recording, pinch/locate không vượt zoom offline và không reload map khi đổi kết nối. Web chưa được triển khai cho map Explore này.

## 1. Yêu cầu đã thống nhất

| Trường hợp | Cách tải | Khi sử dụng dữ liệu offline | Chính sách giữ dữ liệu |
|---|---|---|---|
| Explore | Tự tải ngầm vùng quanh vị trí người dùng khi có mạng | Khi mất mạng hoặc không truy cập được nguồn bản đồ | Có thể tự dọn vùng cũ theo giới hạn dung lượng |
| Trip | Người dùng chủ động chọn tải trước chuyến đi | Khi mất mạng hoặc không truy cập được nguồn bản đồ | Giữ đến khi người dùng chủ động xóa |

- Khi nguồn bản đồ truy cập được, màn hình sử dụng nguồn online. Tải offline là công việc độc lập chuẩn bị cho lúc mất mạng.
- Explore và Trip sử dụng chung tài nguyên đã tải để tránh lưu trùng.
- Không tự chuyển việc kéo bản đồ tới một nơi xa thành yêu cầu tải offline nơi đó. Explore mặc định tải quanh vị trí GPS của người dùng.
- Có dữ liệu offline không đồng nghĩa có dữ liệu cho mọi nơi, mọi mức zoom.
- Explore phải thông báo khi vùng offline hiện tại tải và kiểm tra xong; đồng thời luôn hiển thị map đang dùng Online hay Offline, độc lập với tiến độ tải.
- Chuyển Online/Offline trên cùng một map đang chạy: không reload WebView, không tạo lại map, không đưa người dùng về camera ban đầu.
- Cả Explore và Trip phải giới hạn zoom khi offline và hiển thị rõ giới hạn đang áp dụng.
- Cả Explore và Trip luôn hỗ trợ hai chế độ xem 2D và 3D. Mỗi gói offline bắt buộc chứa dữ liệu cho cả hai, không có tùy chọn chỉ tải 2D.
- Mất Internet và mất GPS là hai tình huống độc lập. Mất Internet không được làm dừng phiên GPS đang ghi theo flow nghiệp vụ.

## 2. Hiện trạng dự án

- Dự án dùng Expo SDK 57 và MapLibre GL JS trong WebView.
- `src/components/map/MapLibre3DView.tsx` và `src/components/Trip3DMapView.tsx` tải ảnh vệ tinh ArcGIS, dữ liệu địa hình và JavaScript/CSS từ Internet.
- `downloadOfflineTrail` trong `src/context/AppContext.tsx` hiện dùng bộ đếm thời gian để chuyển sang `DOWNLOADED`, chưa tải tile thật.
- `src/services/storage/offlineMapStorage.ts` chỉ lưu metadata trong AsyncStorage; số tile và dung lượng hiện tại không phải kết quả đo tải thực.
- SQLite `trekgo_recordings.db` đang lưu dữ liệu tuyến/recording; dữ liệu tọa độ này không thay thế ảnh bản đồ nền.

Tài liệu này không thay đổi `docs/flow.md`, trạng thái Trip, điều kiện bắt đầu/kết thúc Trip hay logic recording. Đây là thiết kế lớp lưu và đọc bản đồ bổ sung.

## 3. Thông số khởi đầu đề xuất

Các giá trị dưới đây phục vụ thử nghiệm, chưa phải thông số người dùng đã chốt hoặc cam kết dung lượng.

| Thông số | Giá trị thử nghiệm | Giải thích |
|---|---|---|
| Bán kính Explore | 2 km | Diện tích hình tròn xấp xỉ 12,57 km² |
| Khoảng di chuyển để cập nhật vùng | 500 m từ tâm vùng gần nhất | Giảm việc tạo kế hoạch tải sau mỗi cập nhật GPS |
| Khoảng đệm quanh tuyến Trip | 2 km | Có bản đồ quanh tuyến khi đi lệch |
| Zoom ảnh vệ tinh | 10–16 | Cần đo chất lượng và số tile trên thiết bị thật |
| Zoom camera tối đa khi offline | 16 | Mặc định thiết kế cho cả Explore và Trip; gói chỉ đủ tới mức thấp hơn thì giới hạn theo mức đã kiểm chứng |
| Zoom DEM | Theo mức nguồn hỗ trợ, thử 10–12 | Không tự giả định nguồn có DEM tới zoom 16 |
| Ngân sách riêng Explore | 200 MiB | Trần thử nghiệm, không phải dung lượng dự kiến của vùng 2 km |
| Số yêu cầu tải đồng thời | 3 | Điều chỉnh sau khi đo hiệu năng và giới hạn nhà cung cấp |

Nếu muốn cấu hình bằng diện tích: `radiusKm = sqrt(areaKm2 / PI)`. Khoảng cách tính theo mét địa lý; không cộng trực tiếp số km vào kinh độ/vĩ độ.

Tile là các hình vuông nên vùng tile tải thực tế thường lớn hơn vùng tròn/hành lang yêu cầu. Cùng diện tích, zoom càng cao càng nhiều tile; ở cùng vùng, tăng một mức zoom thường làm số tile tăng khoảng bốn lần. Dung lượng phải tính theo từng lớp dữ liệu và số byte thực, không gán cố định như 42,5 MB.

## 4. Luồng Explore

1. Mở Explore, hiển thị map online nếu truy cập được nguồn.
2. Lấy vị trí GPS hợp lệ. Không có quyền hoặc chưa có vị trí thì chưa tạo vùng mới; vẫn giữ dữ liệu đã lưu.
3. Tạo vùng tròn quanh vị trí và liệt kê tile giao vùng cho từng lớp/mức zoom đã cấu hình.
4. Kiểm tra kho chung, chỉ xếp hàng tải tài nguyên còn thiếu hoặc cần phiên bản mới.
5. Tải ưu tiên vùng gần người dùng và mức zoom đang xem; hoàn thiện các mức còn lại sau. Giới hạn tốc độ tải để không ảnh hưởng thao tác map.
6. Khi di chuyển đủ ngưỡng, tạo kế hoạch vùng mới; dùng lại tile trùng. Không hủy rồi tải lại cùng tài nguyên sau mỗi cập nhật GPS.
7. Mất mạng: dừng yêu cầu mạng, giữ tiến độ và dùng tile local đã hoàn tất. Vùng tải dở chỉ có khả năng xem một phần.
8. Có mạng lại: trở về nguồn online và tiếp tục tải phần thiếu, không tải lại toàn bộ.
9. Khi vượt ngân sách Explore: dọn tile cũ ít dùng, không còn thuộc vùng đang bảo vệ và không được Trip nào giữ.

### 4.1. Thông báo tải và trạng thái hiển thị

Hiển thị hai thông tin riêng, không suy ra nguồn map từ việc gói đã tải xong:

| Thông tin | Nội dung hiển thị ví dụ | Điều kiện |
|---|---|---|
| Nguồn map | “Online” | Nền bản đồ đang được cấp từ nguồn online |
| Nguồn map | “Offline · Zoom tối đa 16” | Nền bản đồ đang dùng tài nguyên local |
| Nguồn map hỗn hợp | “Online · Một phần dùng dữ liệu offline” | Ví dụ vệ tinh online nhưng DEM fallback local |
| Không có nền bản đồ | “Offline · Chưa có bản đồ khu vực này” | Không có mạng và không có tài nguyên local phù hợp |
| Tiến độ tải | “Đang tải bản đồ offline khu vực hiện tại · 65%” | Kế hoạch tải đã xác định, tài nguyên chưa đủ |
| Kiểm tra | “Đang kiểm tra bản đồ offline…” | Đang đối soát tài nguyên, chưa báo hoàn tất |
| Hoàn tất | “Bản đồ offline khu vực đã sẵn sàng · Zoom tối đa 16” | Vùng tải hiện tại đã chuyển sang READY |
| Tạm dừng/lỗi | “Tải offline tạm dừng do mất mạng” hoặc lý do lỗi | Không hiển thị 100% hay sẵn sàng khi còn thiếu |

- Khi lần đầu chuyển một phiên bản vùng từ chưa sẵn sàng sang READY, hiện thông báo trong app không chặn thao tác, đồng thời giữ trạng thái “Đã tải” trong phần thông tin offline. Không chỉ dùng thông báo thoáng qua làm bằng chứng đã tải.
- Thông báo hoàn tất phải nói rõ vùng đã tải và zoom tối đa thực tế; bán kính chỉ hiển thị theo cấu hình của vùng, không ghi cứng 2 km.
- Lưu dấu đã thông báo theo `packageId` và `coverageRevision` để không thông báo lại mỗi lần render/mở màn hình. Chỉ đánh dấu sau khi thông báo được đưa ra trong app.
- Khi app không ở foreground, giữ sự kiện hoàn tất chờ lần mở Explore tiếp theo. Không mặc định dùng push hoặc thông báo hệ thống.
- Nếu người dùng đã di chuyển sang vùng mới trước khi vùng cũ tải xong, không báo rằng “khu vực hiện tại” đã sẵn sàng; thông báo phải gắn đúng vùng/phiên bản hoặc gộp trong danh sách đã tải.
- Mất mạng trước khi đủ tài nguyên: hiển thị “Offline · Dữ liệu khu vực chưa đầy đủ”. Vùng cũ READY vẫn được giữ và hiển thị đúng phạm vi.
- Khi dọn tài nguyên làm vùng không còn đầy đủ, cập nhật lại trạng thái; thông báo hoàn tất trước đây không phải bảo đảm vĩnh viễn.

“Tải ngầm” ở phiên bản đầu nghĩa là tải không chặn giao diện khi app còn hoạt động. Không cam kết tiếp tục tải khi app bị đóng/khóa màn hình. Tải trong nền hệ điều hành là hạng mục riêng cần đánh giá Android/iOS.

Không có mạng từ lần mở đầu và chưa từng tải vùng nào: hiện trạng thái chưa có bản đồ offline, không hiển thị rằng đã sẵn sàng.

## 5. Luồng Trip

1. Người dùng mở Trip và chọn “Tải bản đồ offline”.
2. Lấy bản chụp tuyến, checkpoint và phiên bản tuyến hiện tại; kiểm tra tọa độ hợp lệ.
3. Tạo vùng bao tuyến cộng khoảng đệm. Phiên bản đầu có thể dùng bounding box mở rộng; sau đó tối ưu bằng hành lang quanh từng đoạn tuyến.
4. Liệt kê tài nguyên, trừ phần đã có trong kho chung; hiển thị dung lượng ước tính và dung lượng còn trống nếu có thể lấy được.
5. Người dùng bắt đầu tải; hiển thị tiến độ theo tài nguyên thực đã kiểm tra thành công.
6. Chỉ đánh dấu sẵn sàng sau khi toàn bộ tài nguyên bắt buộc và bản chụp tuyến/checkpoint đã lưu đầy đủ.
7. Mất mạng hoặc đóng app giữa chừng: giữ trạng thái có thể tiếp tục; mở lại app kiểm tra file và tải phần thiếu.
8. Khi offline, map đọc tile local và tuyến/checkpoint local. GPS vẫn hoạt động theo quyền và tín hiệu thiết bị.
9. Nếu tuyến trên server thay đổi, giữ bản tải cũ và báo có bản mới khi online. Chỉ đổi sang bản mới sau khi bản mới tải hoàn tất.
10. Người dùng xóa gói: xóa liên kết của gói; chỉ xóa tài nguyên khi không còn gói nào cần và không đang được map sử dụng.

Yêu cầu bắt buộc cho cả Explore và Trip: mỗi gói tải chung ảnh vệ tinh, DEM và tài nguyên hiển thị cần thiết để xem được cả 2D và 3D. Chỉ chuyển sang `READY` và thông báo hoàn tất khi cả hai chế độ có đủ dữ liệu trong phạm vi/zoom cam kết. 2D và 3D dùng chung ảnh nền; chuyển chế độ chỉ bật/tắt địa hình và cập nhật góc nhìn trên cùng map, không tải hai bộ ảnh nền, không reload WebView/map. Chế độ người dùng đang xem không làm thay đổi danh sách tài nguyên bắt buộc tải.

Nếu tải dở hoặc DEM hỏng/mất, có thể tạm hiển thị 2D từ dữ liệu còn hợp lệ kèm thông báo “Dữ liệu 3D chưa sẵn sàng”. Đây là trạng thái thiếu dữ liệu cần tải/khôi phục, không phải một gói 2D đã hoàn tất. Không hiển thị mặt phẳng rồi gắn nhãn 3D.

## 6. Các loại dữ liệu cần lưu

| Dữ liệu | Kiểu trên máy | Vai trò |
|---|---|---|
| Tile ảnh vệ tinh | Byte nhị phân JPEG/PNG theo nguồn | Nền bản đồ |
| Tile cao độ DEM | Byte nhị phân, thường PNG có encoding riêng | Dựng địa hình; phải lưu đúng encoding như Terrarium |
| Style | JSON dạng UTF-8 | Mô tả nguồn và các lớp hiển thị |
| JavaScript/CSS MapLibre với hướng WebView | File JS/CSS đóng gói cùng app | Khởi tạo map không cần CDN |
| Font/glyph, sprite nếu style cần | PBF, PNG và JSON tương ứng | Nhãn và biểu tượng offline |
| Tuyến | GeoJSON LineString | Vẽ tuyến dự kiến |
| Checkpoint | Danh sách tọa độ và thuộc tính | Hiển thị điểm dừng và dữ liệu cần thiết |
| Metadata gói/tài nguyên | Bản ghi SQLite | Quản lý phạm vi, trạng thái, tiến độ và file |

Không lưu ảnh bằng Base64 trong AsyncStorage hoặc gửi hàng loạt tile qua bridge WebView. Base64 làm tăng kích thước và chi phí bộ nhớ. Không biến DEM thành ảnh minh họa thông thường vì giá trị màu chứa thông tin cao độ.

## 7. Nơi lưu và ý nghĩa “kho offline”

Kho offline là vùng dữ liệu riêng của TrekGo trên bộ nhớ trong điện thoại. Đây là file/database trên đĩa, không phải RAM, server hoặc thư viện ảnh của người dùng.

Thiết kế đề xuất cho hướng giữ WebView:

```text
<thư mục dữ liệu bền vững riêng của app>/offline-maps/
  resources/
    <sourceId>/<sourceVersion>/<variant>/<z>/<x>/<y>.<extension>
  styles/
    <styleVersion>/style.json
  temp/
    <downloadId>.part

<vị trí database riêng của app>/trekgo_offline_maps.db
```

- Database lưu metadata, quan hệ và snapshot tuyến; file lưu byte tài nguyên bản đồ.
- Dùng đường dẫn tương đối trong database; xác định đường dẫn gốc bằng API hệ thống khi chạy, không ghi cứng đường dẫn Android/iOS.
- Tài nguyên đã cam kết offline phải ở vùng bền vững, không đặt toàn bộ trong thư mục cache mà hệ điều hành có thể dọn.
- `temp` chứa tải dở, không được tính là tile hợp lệ; kiểm tra và dọn khi khởi động.
- Dữ liệu tồn tại qua lần tắt/mở app; có thể mất khi gỡ app hoặc xóa dữ liệu ứng dụng. Không hứa khôi phục sau khi cài lại.
- Chính sách backup của hệ điều hành cần cấu hình/kiểm chứng để tránh sao lưu kho tile lớn ngoài ý muốn.
- Web là nền tảng riêng: thiết kế lưu trữ Android/iOS này không tự áp dụng cho trình duyệt.

Nếu chuyển sang MapLibre Native, có thể giao tile/style/font cho offline database của SDK. Khi đó schema tài nguyên dưới đây là mô hình logic tham khảo; không tạo thêm kho tile thủ công song song và không sửa trực tiếp database nội bộ của SDK.

## 8. Kiểu dữ liệu TypeScript đề xuất

Các kiểu sau là hợp đồng dữ liệu để triển khai, không phải code đã được tích hợp. SQLite dùng TEXT cho JSON/enum/thời gian và INTEGER cho bộ đếm/boolean.

```ts
type LngLat = [longitude: number, latitude: number];
type Bounds = [west: number, south: number, east: number, north: number];
type ISODateTime = string; // UTC, ví dụ 2026-10-18T03:00:00.000Z
type PackageKind = 'EXPLORE_AUTO' | 'TRIP_MANUAL';
type MapMode = 'SATELLITE_2D' | 'SATELLITE_3D';
type PackageStatus =
  | 'PLANNING' | 'QUEUED' | 'DOWNLOADING' | 'PAUSED'
  | 'VERIFYING' | 'READY' | 'ERROR' | 'DELETING';
type ResourceStatus = 'MISSING' | 'DOWNLOADING' | 'READY' | 'ERROR';
type ResourceKind = 'SATELLITE' | 'DEM' | 'STYLE' | 'GLYPH' | 'SPRITE';

interface MapSourceSnapshot {
  sourceId: string;
  sourceVersion: string; // phiên bản do app/provider quản lý, không phải access token
  resourceKind: ResourceKind;
  variant: string; // ví dụ tile256-jpeg hoặc tile256-terrarium-png
  tileScheme: 'XYZ' | 'TMS';
  tileSize: number;
  minZoom: number;
  maxZoom: number;
  demEncoding: 'terrarium' | 'mapbox' | null;
  attribution: string;
}

type Coverage =
  | { type: 'CIRCLE'; center: LngLat; radiusMeters: number }
  | { type: 'ROUTE_BUFFER'; routeRevision: string; bufferMeters: number };

interface OfflineMapPackage {
  id: string;
  schemaVersion: 1;
  kind: PackageKind;
  ownerId: string | null; // user sở hữu snapshot Trip; Explore công khai có thể null
  tripId: string | null; // bắt buộc có đối với TRIP_MANUAL
  name: string;
  supportedModes: ['SATELLITE_2D', 'SATELLITE_3D']; // mọi gói bắt buộc cả hai
  coverage: Coverage;
  coverageRevision: string; // đổi khi thay tâm/phạm vi/zoom hoặc kế hoạch tài nguyên
  bounds: Bounds; // vùng bao để tìm nhanh, không chứng minh mọi tile đã có
  sources: MapSourceSnapshot[]; // zoom có thể khác giữa vệ tinh và DEM
  styleVersion: string;
  offlineMinZoom: number; // mặc định 10, phạm vi camera đã cam kết cho gói
  offlineMaxZoom: number; // mặc định 16, không lớn hơn độ chi tiết nền đã kiểm chứng
  readyNotifiedRevision: string | null; // revision gần nhất đã thông báo hoàn tất
  status: PackageStatus;
  expectedResourceCount: number;
  readyResourceCount: number;
  estimatedMissingBytes: number | null;
  pinned: boolean; // Trip true; Explore false, vẫn cần bảo vệ vùng đang dùng
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  completedAt: ISODateTime | null;
  lastUsedAt: ISODateTime | null;
  lastErrorCode: string | null;
}

interface OfflineResource {
  key: string;
  sourceId: string;
  sourceVersion: string;
  variant: string;
  kind: ResourceKind;
  z: number | null; // null với style/glyph/sprite không dùng tọa độ tile
  x: number | null;
  y: number | null;
  assetId: string | null; // định danh style, font range hoặc sprite
  relativePath: string | null; // chỉ có file hoàn chỉnh mới được READY
  mimeType: string;
  byteSize: number; // byte thực tế, không phải MB ước lượng
  checksum: string | null; // SHA-256 nếu tính/đối chiếu được
  etag: string | null; // phục vụ kiểm tra phiên bản, không thay thế checksum
  status: ResourceStatus;
  lastAccessedAt: ISODateTime | null;
}

interface PackageResource {
  packageId: string;
  resourceKey: string;
  required: boolean;
}

interface OfflineTripSnapshot {
  packageId: string;
  tripId: string;
  routeRevision: string;
  route: { type: 'LineString'; coordinates: LngLat[] };
  checkpoints: {
    id: string;
    name: string;
    coordinate: LngLat;
    order: number;
    required: boolean;
  }[];
  savedAt: ISODateTime;
}

interface OfflineDownloadJob {
  id: string;
  resourceKey: string;
  status: 'QUEUED' | 'RUNNING' | 'PAUSED' | 'DONE' | 'ERROR';
  priority: number; // quy ước số lớn tải trước
  attempts: number;
  nextRetryAt: ISODateTime | null;
  lastErrorCode: string | null;
  updatedAt: ISODateTime;
}

// Trạng thái runtime dùng cho UI, không lưu cứng nguồn hiện tại vào database.
interface MapDisplayState {
  viewMode: MapMode; // chế độ đang xem, độc lập với khả năng của gói
  terrainStatus: 'READY' | 'PARTIAL' | 'UNAVAILABLE';
  networkReachable: boolean;
  activeSource: 'ONLINE' | 'OFFLINE' | 'MIXED' | 'UNAVAILABLE';
  activePackageIds: string[];
  coverageState: 'COMPLETE' | 'PARTIAL' | 'NONE';
  effectiveMinZoom: number | null;
  effectiveMaxZoom: number | null; // null khi chưa có vùng offline dùng được
  sourceRevision: number; // bỏ qua kết quả chuyển nguồn cũ đến trễ
}
```

Quy ước bắt buộc:

- Tọa độ GeoJSON là `[kinh độ, vĩ độ]`, đơn vị độ; bán kính/đệm là mét; dung lượng là byte.
- `resourceKey` tile ghép từ `sourceId/sourceVersion/variant/z/x/y` sau khi chuẩn hóa tọa độ về XYZ. Các tài nguyên khác dùng thêm `kind/assetId` và cách mã hóa khóa không gây trùng.
- URL chứa token không được dùng làm khóa và không lưu token trong manifest. Resolve endpoint/quyền truy cập ở lớp provider.
- `variant` phân biệt định dạng, kích thước, tỷ lệ pixel hoặc encoding; cùng z/x/y chưa đủ xác định cùng nội dung.
- ArcGIS hiện dùng thứ tự URL `{z}/{y}/{x}`; đây là thứ tự tham số URL, không tự động có nghĩa hệ tọa độ TMS. Adapter nguồn xử lý chính xác quy ước của nguồn.
- `readyResourceCount` phải được đối soát từ quan hệ và trạng thái tài nguyên. Không đặt READY chỉ dựa vào thời gian hoặc số tile giả.
- Quyền truy cập Trip vẫn phải được áp dụng khi đọc snapshot offline; danh tính chủ sở hữu không thay thế cơ chế kiểm tra quyền.

## 9. Schema SQLite đề xuất

Đây là bản mô tả bảng cho hướng tự quản lý kho WebView, chưa phải migration chạy thật.

| Bảng | Cột chính và kiểu SQLite | Khóa/ràng buộc |
|---|---|---|
| `offline_packages` | `id TEXT`, `schema_version INTEGER`, `kind TEXT`, `owner_id TEXT NULL`, `trip_id TEXT NULL`, `name TEXT`, `supported_modes_json TEXT`, `coverage_json TEXT`, `bounds_json TEXT`, `sources_json TEXT`, `style_version TEXT`, `status TEXT`, `expected_resource_count INTEGER`, `ready_resource_count INTEGER`, `estimated_missing_bytes INTEGER NULL`, `pinned INTEGER`, `created_at TEXT`, `updated_at TEXT`, `completed_at TEXT NULL`, `last_used_at TEXT NULL`, `last_error_code TEXT NULL` | PK `id`; CHECK enum, pinned IN (0,1), bộ đếm >= 0; Trip bắt buộc trip_id |
| `offline_resources` | `key TEXT`, `source_id TEXT`, `source_version TEXT`, `variant TEXT`, `kind TEXT`, `z INTEGER NULL`, `x INTEGER NULL`, `y INTEGER NULL`, `asset_id TEXT NULL`, `relative_path TEXT NULL`, `mime_type TEXT`, `byte_size INTEGER`, `checksum TEXT NULL`, `etag TEXT NULL`, `status TEXT`, `last_accessed_at TEXT NULL` | PK `key`; CHECK enum, byte_size >= 0; READY bắt buộc có relative_path |
| `offline_package_resources` | `package_id TEXT`, `resource_key TEXT`, `required INTEGER` | PK ghép; FK tới package và resource; xóa package chỉ cascade quan hệ |
| `offline_trip_snapshots` | `package_id TEXT`, `trip_id TEXT`, `route_revision TEXT`, `route_geojson TEXT`, `checkpoints_json TEXT`, `saved_at TEXT` | PK/FK package_id, cascade khi xóa package |
| `offline_download_jobs` | `id TEXT`, `resource_key TEXT`, `status TEXT`, `priority INTEGER`, `attempts INTEGER`, `next_retry_at TEXT NULL`, `last_error_code TEXT NULL`, `updated_at TEXT` | PK id; UNIQUE resource_key; FK resource_key |

Tạo index cho `offline_package_resources(resource_key)`, `offline_packages(kind, status)`, `offline_resources(status, last_accessed_at)` và `offline_download_jobs(status, priority, next_retry_at)`. Bật và kiểm tra foreign keys ở kết nối database. Validate JSON và tọa độ trước khi ghi.

Bổ sung vào `offline_packages`: `coverage_revision TEXT NOT NULL`, `offline_min_zoom INTEGER NOT NULL`, `offline_max_zoom INTEGER NOT NULL`, `ready_notified_revision TEXT NULL`. Ràng buộc `0 <= offline_min_zoom <= offline_max_zoom <= 16` theo chính sách offline phiên bản đầu. Chỉ đánh dấu READY khi đủ dữ liệu cho toàn bộ phạm vi zoom đã khai báo; không tự hạ mục tiêu gói tải dở rồi gọi là hoàn tất. `MapDisplayState` được tính khi chạy từ nguồn thực tế, không phục hồi nhãn Online từ phiên trước.

Cột `supported_modes_json` phải là `TEXT NOT NULL`, chứa đúng `["SATELLITE_2D","SATELLITE_3D"]`, được validate khi ghi. Gói phải có nguồn vệ tinh và DEM trong `sources_json`; liên kết DEM bắt buộc có `required = 1`. Chế độ đang xem thuộc `MapDisplayState.viewMode`, không dùng để quyết định gói đã đủ tài nguyên hay chưa.

Không lưu `refCount` riêng ở bản đầu: dùng truy vấn bảng liên kết để tránh bộ đếm lệch. Tổng dung lượng kho tính bằng tổng `byte_size` của tài nguyên duy nhất, không cộng dung lượng từng gói vì có tile dùng chung. Dung lượng báo cáo cần tính thêm database và file tạm khi kiểm tra ổ đĩa.

## 10. Ví dụ dữ liệu

Một tile được lưu một lần:

```json
{
  "key": "satellite-provider/imagery-v1/tile256-jpeg/14/13000/7500",
  "sourceId": "satellite-provider",
  "sourceVersion": "imagery-v1",
  "variant": "tile256-jpeg",
  "kind": "SATELLITE",
  "z": 14,
  "x": 13000,
  "y": 7500,
  "assetId": null,
  "relativePath": "resources/satellite-provider/imagery-v1/tile256-jpeg/14/13000/7500.jpg",
  "mimeType": "image/jpeg",
  "byteSize": 28640,
  "checksum": null,
  "etag": null,
  "status": "READY",
  "lastAccessedAt": "2026-10-18T03:00:00.000Z"
}
```

Các số tọa độ tile và byte ở ví dụ chỉ minh họa cấu trúc, không phải kết quả tải thật của vùng cụ thể.

Quan hệ có thể là:

```text
explore-region-001 ─┐
                   ├── cùng resourceKey ── một file ảnh trên đĩa
trip-package-123 ───┘
```

Xóa Explore chỉ gỡ liên kết Explore, file vẫn còn vì Trip đang dùng. Chỉ khi không còn liên kết và không có lượt đọc/tải đang giữ tài nguyên thì mới được xóa file.

## 11. Map đọc dữ liệu thế nào?

| Trạng thái | Nguồn hiển thị | Hành vi |
|---|---|---|
| Nguồn online truy cập được | Online | Kho offline được chuẩn bị độc lập |
| Mất Internet | Local | Không tiếp tục gọi mạng cho tile thiếu |
| Có Wi-Fi nhưng nguồn tile timeout/lỗi kết nối | Local với thông báo phù hợp | Phân biệt lỗi xác thực/quota với mất mạng để chẩn đoán đúng |
| Local thiếu tile ở zoom yêu cầu | Tile zoom thấp đã có nếu renderer hỗ trợ | Giới hạn độ chi tiết, báo vùng chưa được tải nếu không có |
| Có vệ tinh nhưng thiếu DEM | Tạm hiển thị 2D và báo “Dữ liệu 3D chưa sẵn sàng” | Gói chưa hoàn tất hoặc cần khôi phục; không đánh dấu READY |
| Ra ngoài vùng đã tải | Nền trống có thông báo | Có thể giữ marker/GPS/tuyến nếu renderer hoạt động; không bịa nền bản đồ |
| Có mạng trở lại ổn định | Online | Giữ camera và tuyến đang hiển thị, tiếp tục hàng đợi tải |

Mỗi lớp nguồn có thể lỗi độc lập: vệ tinh còn truy cập được nhưng DEM không truy cập được. Resolver cần theo dõi lỗi nguồn và fallback tương ứng, không chỉ dựa vào biểu tượng Wi-Fi. Dùng khoảng ổn định ngắn hoặc backoff để tránh đổi nguồn liên tục.

Với WebView hiện tại cần một adapter cấp tài nguyên local cho MapLibre. Database và file không tự trở thành URL mà WebView đọc được. Cần proof of concept trên Android/iOS để chọn cơ chế local request/protocol phù hợp, bảo toàn MIME type, quyền đọc, CORS và hiệu năng. Không mặc định đường dẫn `file://` hoặc custom protocol sẽ hoạt động trên cả hai nền tảng.

JavaScript/CSS phải có sẵn cùng app; style offline không được còn phụ thuộc URL CDN.

### 11.1. Chuyển nguồn không tải lại map — yêu cầu bắt buộc

- Giữ nguyên WebView và instance MapLibre trong suốt lần sử dụng màn hình. Không thay `key`, nạp lại HTML, gọi reload hoặc khởi tạo map mới chỉ vì đổi kết nối.
- Giữ đồ thị style/layer ổn định; adapter/resolver đổi nơi cung cấp tài nguyên giữa online và local, chỉ cập nhật những nguồn cần thiết. Không thay toàn bộ style làm mất lớp tuyến, marker hoặc gây màn hình trắng.
- Giữ tâm, bearing, pitch, marker, checkpoint, tuyến dự kiến, tuyến đã đi và trạng thái tương tác. Zoom chỉ thay đổi nếu vượt giới hạn offline như mục 11.2.
- Giữ tile đang hiển thị trong lúc yêu cầu tile thay thế; thay dần khi dữ liệu mới sẵn sàng, không bật màn hình loading toàn bản đồ. Tile mới vẫn cần thời gian đọc/tải; yêu cầu này không phải cam kết không có độ trễ I/O.
- Cập nhật nhãn theo nguồn đang thực sự phục vụ map, không đổi sang Online ngay khi phát hiện Wi-Fi mà nguồn chưa dùng được. Trong lúc chuyển có thể ghi “Đang chuyển sang Online/Offline” cùng nguồn hiện tại.
- Chuyển nguồn không dừng GPS/recording và không đặt lại phiên GPS. Các kết quả request cũ đến trễ không được đảo ngược trạng thái mới.
- Tile mới hoàn tất tải chỉ cập nhật vùng cần thiết. Không tạo lại map để thông báo tiến độ hoặc trạng thái READY.
- Cơ chế adapter đáp ứng các điều trên phải được chứng minh trên Android/iOS trước khi chọn hướng triển khai. Nếu WebView hiện tại không đáp ứng thì cần đánh giá renderer khác, không bỏ yêu cầu không reload.

### 11.2. Giới hạn zoom offline

Chính sách thiết kế phiên bản đầu: **camera offline tối đa zoom 16 cho cả Explore và Trip**. Đây là giới hạn sản phẩm đề xuất, không phải giới hạn mặc định của MapLibre hay mức zoom người dùng đã chọn.

| Trường hợp | Giới hạn và hành vi |
|---|---|
| Vùng READY có ảnh nền đầy đủ zoom 10–16 | Cho camera zoom 10–16, chặn thao tác vượt 16 |
| Gói có phạm vi được khai báo và kiểm chứng 10–14 | Cho camera zoom 10–14, hiển thị “Offline · Zoom tối đa 14” |
| Mất mạng khi đang online ở zoom 18 | Trên cùng map, đưa zoom về giới hạn hợp lệ bằng chuyển động ngắn; giữ tâm và hướng, không reload |
| Gói đang tải dở | Tính mức tối đa từ dữ liệu thực đủ cho vùng nhìn; không dùng tile zoom cao rời rạc để tuyên bố phủ cả vùng |
| Không có mức zoom hợp lệ ở vị trí đang xem | Hiện chưa có dữ liệu offline; không báo mức 16 như thể đã có nền đầy đủ |
| Zoom chạm giới hạn | Chặn cả pinch, nút zoom và lệnh camera trong code; hiện gợi ý ngắn, không lặp liên tục |
| Có mạng lại, chuyển online thành công | Phục hồi giới hạn online theo nguồn; giữ zoom hiện tại, không tự nhảy lại zoom 18 |

- `effectiveMaxZoom` không lớn hơn 16 hoặc mức chi tiết ảnh nền đã kiểm chứng tại vùng đang xem. Không phóng lớn tile zoom thấp để giả có chi tiết zoom cao hơn mức đã tải.
- DEM có thể chỉ tới zoom 12 nhưng camera vẫn được tới 16 nếu nền vệ tinh đủ tới 16 và renderer hỗ trợ dùng DEM mức thấp hơn. Zoom tile DEM không đồng nghĩa zoom camera.
- Phạm vi camera tối thiểu mặc định 10 để phù hợp dữ liệu nền đã lập kế hoạch. Muốn thu nhỏ hơn để xem tổng quan phải bổ sung tile ở mức thấp hơn và cập nhật metadata, không tự nhận đã hỗ trợ.
- Tile cha ở mức thấp có thể làm nền tạm khi một tile con bị thiếu, nhưng phải giữ trạng thái dữ liệu chưa đầy đủ. Việc thiếu tile không cho phép vượt giới hạn cam kết.
- Di chuyển ra ngoài vùng phủ không tự kéo camera về tâm vùng tải. Hiển thị rõ giới hạn vùng và dữ liệu còn có; tính lại giới hạn khả dụng khi quay về.

## 12. Độ tin cậy, tiến độ và xóa dữ liệu

- Tải vào file `.part`, kiểm tra mã HTTP, kiểu nội dung, khả năng giải mã và kích thước; checksum nếu có. HTML báo lỗi trả HTTP 200 không phải tile hợp lệ.
- Chỉ đưa file vào vị trí chính thức sau khi kiểm tra xong, rồi cập nhật database bằng transaction. File system và SQLite không có transaction chung, cần đối soát file mồ côi/bản ghi thiếu file sau crash.
- Khi app mở lại, job RUNNING cũ chuyển về trạng thái có thể tiếp tục. Chỉ resume byte nếu server hỗ trợ Range và validator phù hợp; nếu không thì tải lại riêng file đó.
- Retry có giới hạn và backoff. 401/403 cần xử lý quyền, 429 tôn trọng giới hạn; không retry vô hạn.
- `READY` khi tất cả tài nguyên bắt buộc còn tồn tại và hợp lệ, snapshot cần thiết đã có. Thiếu tài nguyên bắt buộc thì gói không còn READY.
- Tiến độ theo số tài nguyên hoàn tất/tổng tài nguyên đã lập kế hoạch. Dung lượng ước tính hiển thị là ước tính; byte tải thực báo riêng.
- Trip được ưu tiên hơn tải Explore. Mỗi resource chỉ có một job tải dù nhiều gói yêu cầu.
- Dọn Explore theo LRU ở cấp tài nguyên, giữ vùng đang dùng và toàn bộ tài nguyên được Trip giữ. Nếu vẫn không đủ chỗ, dừng tải và báo lý do, không xóa Trip tự động.
- Quy trình xóa phải phối hợp với downloader/renderer: đánh dấu xóa, gỡ quan hệ, chờ tài nguyên hết được sử dụng rồi xóa. Không để download đang chạy tạo lại file sau khi xóa.
- Đăng xuất phải ngăn đọc snapshot Trip của tài khoản trước theo chính sách dữ liệu riêng tư. Tile nền công khai có thể dùng chung; dữ liệu có quyền riêng không được dùng chung chỉ vì trùng tọa độ.

## 13. Hướng triển khai cần kiểm chứng

### Giữ MapLibre GL JS trong WebView

- Dùng mô hình file + SQLite mô tả ở trên, chủ động tải và giải quyết yêu cầu local.
- Phải làm thử một vùng nhỏ: khởi động lạnh khi airplane mode, ảnh vệ tinh + DEM + tuyến đều hoạt động trên Android/iOS.
- Đây là phần cần kiểm chứng trước khi xây UI tải hàng loạt; chưa có adapter local hoạt động trong code hiện tại.

### Chuyển sang MapLibre Native

- SDK có khái niệm offline region/database, có thể giảm phần tự quản lý tài nguyên.
- Cần kiểm chứng phiên bản tích hợp React Native, Expo SDK 57, DEM và khả năng đáp ứng yêu cầu chỉ dùng gói khi offline.
- Không mặc định native tải đúng hành lang thay vì bounding box hoặc cho phép kiểm soát từng tile; cần kiểm tra API thực tế.
- Chuyển renderer là thay đổi kỹ thuật riêng, chưa được triển khai hoặc quyết định bởi tài liệu này.

Trước cả hai hướng, phải xác nhận quyền và hạn mức tải offline của từng nguồn. URL tile xem online hiện tại không tự chứng minh quyền tải hàng loạt/offline. Không cam kết ArcGIS World Imagery endpoint hiện tại đáp ứng cho đến khi kiểm tra điều kiện dịch vụ và cơ chế được hỗ trợ.

## 14. Tiêu chí nghiệm thu khi triển khai

1. Explore tự tải vùng cấu hình khi có mạng, không chặn thao tác map và không tải lại tile trùng.
2. Tắt mạng trong lúc tải Explore vẫn xem được phần đã hoàn tất; vùng thiếu được báo đúng.
3. Cả Explore và Trip tải đủ ảnh nền, DEM và tài nguyên bắt buộc mới báo sẵn sàng. Khởi động lạnh không có Internet phải xem được cả 2D và 3D; Trip phải có thêm tuyến và checkpoint local.
4. Khóa màn hình/đóng app giữa lúc tải rồi mở lại không mất tiến độ tài nguyên đã hoàn tất.
5. Explore và Trip trùng vùng chỉ lưu mỗi tài nguyên một lần.
6. Dọn Explore/xóa một gói không làm mất dữ liệu của Trip khác.
7. Bộ nhớ đầy, file hỏng, server lỗi, nguồn hết quota và không có GPS có trạng thái xử lý rõ ràng.
8. Mất mạng không làm dừng GPS recording, thay đổi điều kiện checkpoint hoặc kết thúc Trip trong `docs/flow.md`.
9. Có mạng lại không làm mất vị trí camera, tuyến đã đi hoặc phiên GPS đang chạy.
10. Thử trên thiết bị Android/iOS thực; đo dung lượng, RAM, độ mượt và thời gian tải trước khi chốt bán kính/zoom/ngân sách.
11. Explore chỉ báo hoàn tất sau VERIFYING và READY của đúng vùng/revision; không thông báo lặp khi render, mở lại màn hình hoặc vùng cũ hoàn tất sau khi người dùng đã chuyển vùng.
12. Nhãn Online/Offline luôn hiện và phản ánh nguồn hiển thị; tiến độ tải offline là thông tin riêng. Kiểm tra cả mất mạng, mất nguồn DEM riêng và Wi-Fi không có Internet.
13. Đổi Online → Offline → Online không remount WebView/map, không reset camera/marker/tuyến, không xuất hiện loading toàn màn hình hoặc xóa trắng map nếu vùng đã có dữ liệu. Đếm số lần khởi tạo map để kiểm chứng.
14. Offline không vượt zoom 16; gói chỉ tới 14 không vượt 14. Thử pinch, nút zoom, lệnh camera và chuyển từ online zoom 18. Chỉ đổi zoom khi cần tuân thủ giới hạn.
15. Đối chiếu mức zoom ghi trên UI, metadata gói và mức thực tế map cho phép; phải thống nhất sau tải dở, dọn tài nguyên, đổi vùng và mở lại app.
16. Chuyển 2D ↔ 3D khi offline trên cùng map không reload, không tải mạng và không nhân đôi kho ảnh nền. Thiếu DEM phải báo rõ, gói không được READY; kiểm tra cả hai chế độ tại giới hạn zoom offline.

## 15. Những gì đã chốt và còn cần chốt

Đã chốt: Explore tự tải quanh vị trí và thông báo khi tải xong; Trip cho người dùng chủ động tải trước; dùng bản đồ offline khi không truy cập mạng; luôn hiển thị nguồn Online/Offline; chuyển nguồn không reload map; bắt buộc giới hạn và hiển thị zoom offline; dữ liệu phải tồn tại trên máy qua các lần mở app.

Đã chốt bổ sung: luôn có cả 2D và 3D trong mỗi gói offline của Explore và Trip; không có gói chỉ tải 2D. DEM là tài nguyên bắt buộc để hoàn tất gói.

Cần chốt trước triển khai sản phẩm: bán kính Explore, zoom từng lớp, xác nhận trần camera offline đề xuất là 16, giới hạn dung lượng, chính sách dữ liệu di động/Wi-Fi, nguồn được phép offline và lựa chọn WebView/Native. Các thông số trong mục 3 là đề xuất thử nghiệm, không phải bước bổ sung vào flow nghiệp vụ.

Đã thực hiện trong tài liệu: mô tả luồng, hợp đồng dữ liệu, vị trí lưu, quan hệ dùng chung, fallback và tiêu chí nghiệm thu. Chưa thực hiện: tải tile thật, migration database, adapter local, giao diện tải và kiểm thử offline trên thiết bị.

## 16. Tài liệu tham khảo

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/): phiên bản phù hợp với package.json hiện tại.
- [Expo SQLite SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/): API database; database được giữ qua lần khởi động app.
- [Expo FileSystem SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/): cần kiểm tra API và đường dẫn chính thức khi viết phần lưu file.
- [MapLibre React Native OfflineManager](https://github.com/maplibre/maplibre-react-native/blob/main/docs/content/modules/offline-manager.md): hướng native, không phải API của GL JS trong WebView.
- [ArcGIS: Take a map offline](https://pro.arcgis.com/en/pro-app/2.6/help/projects/take-a-map-offline.htm): mô hình đưa bản đồ offline và giới hạn tải; không phải xác nhận quyền tải endpoint đang dùng trong app.

