# Trip GPS v2 — triển khai mobile

Ngày 26/10/2026. Đã triển khai code mobile; chưa xác nhận gate rollout trên thiết bị thật.

Tham chiếu nghiệp vụ: [thiết kế](./TRIP_GPS_OFFLINE_SYNC_V2.md), [API handoff](./TRIP_GPS_V2_API_HANDOFF.md).
Contract đã đối chiếu trực tiếp tại `Vina_TrekGO/api/src/modules/geo/presentation/dtos/trip-gps-sync.dto.ts`,
`application/gps-sync.service.ts`, gateway, recording adapter và `contracts/openapi/trip-gps.json`.
Không thay code, migration, cấu hình hay dữ liệu server trong công việc mobile này.

## Chế độ hiện tại: trip chỉ ghi fake GPS

Theo yêu cầu mới của người dùng, trip luôn mô phỏng GPS theo trail; không còn nút chuyển sang GPS thật.
Runtime không khởi động collector thiết bị hoặc yêu cầu quyền GPS cho trip. Callback thiết bị đến muộn
bị bỏ, kể cả caller cũ yêu cầu tắt fake. Các task native còn sót chỉ được dừng, không bật lại.
Personal recording không thay đổi. Phiên/dữ liệu GPS thật cũ vẫn giữ nguyên, không tự xóa hoặc viết lại.
Quy tắc v2 về SQLite, pause/resume local và đồng bộ sau finish không đổi.
Simulator hiện chạy trong màn hình GPS; không cam kết mô phỏng khi app bị suspend/kill hoặc rời màn hình.
Những mô tả collector GPS thật/quyền nền bên dưới là lịch sử triển khai trước yêu cầu fake-only này.

## Màn tổng kết ưu tiên SQLite

Theo yêu cầu mới, sau commit STOPPED, mobile đọc lại điểm GPS từ SQLite trước khi mở tổng kết;
không chờ upload/worker. Đường minh họa dùng tọa độ gốc local, số điểm là số điểm đã lưu,
thời gian dùng intervals local trừ pause, quãng đường ghi nhãn tạm tính và không cộng đoạn qua pause/signal gap.
Tính quãng đường lịch sử không dùng bộ lọc tuổi điểm realtime, tránh mất số liệu của điểm cũ.
Không hiển thị checkpoint. Sau SYNCED vẫn giữ số liệu local; chỉ badge/trạng thái sync và báo rejection cập nhật riêng.
Đã chạy TypeScript và 39/39 tests (có DTO server), gồm finish đọc lại SQLite, số liệu local không bị READY/EMPTY server thay thế,
và tính distance với điểm lịch sử cũ/pause/gap. Chưa kiểm tra trực tiếp giao diện trên điện thoại.

## Quy tắc đồng bộ sau Kết thúc

Đã cập nhật theo handoff/server mới: phiên mới chỉ gửi timeline điều khiển sau finish.
Batches, manifest và complete chỉ gửi sau khi phiên local STOPPED và toàn bộ timeline gồm FINISH đã được server ACK.
Complete luôn có `final=true` và `endedAt` gốc của người dùng.

| Tình huống | Mobile thực hiện |
| --- | --- |
| Đang ghi/pause, mở app hoặc mạng trở lại | Timeline và lịch sử giữ SQLite, không gọi metadata. Khi ACTIVE, vị trí mới nhất vẫn publish qua socket |
| Bấm Kết thúc, có mạng | Dừng producer, commit STOPPED local, gửi FINISH metadata rồi upload lịch sử |
| Bấm Kết thúc khi offline | Giữ STOPPED và toàn bộ dữ liệu local, chờ mạng |
| Có mạng lại/mở app với phiên STOPPED chưa xong | Tự tiếp tục từ receipt/checkpoint đã ACK |
| Đồng bộ thủ công | Nút chỉ xuất hiện cho phiên STOPPED; không upload giữa phiên |

Phiên mới không gọi `syncMetadata` sau start/pause/resume hoặc reconnect; coordinator và storage cũng chặn
metadata khi phiên còn ACTIVE/PAUSED. Lệnh đầu tiên sequence=1, không có request metadata rỗng lúc start.
Sau finish, timeline trên 100 lệnh chia thành các payload bất biến, sequence liên tục;
chỉ request cuối chứa FINISH. Chưa ACK hết timeline thì không tạo/upload snapshot.

### Trạng thái local và phiên cũ

- `controlSyncMode` lưu trong JSON session của SQLite, cố định trong suốt phiên.
- Phiên tạo mới: `LOCAL_UNTIL_FINISH`. Khi local PAUSED, server thường vẫn ACTIVE vì chưa nhận timeline.
  Collector/publisher dựa trạng thái local; refresh REST không ghi đè PAUSED/STOPPED local.
  Người xem đoàn không thấy PAUSED/RESUMED tức thời, chỉ thấy marker cuối và socket presence.
- Migration mobile version 3 giữ toàn bộ phiên v2 cũ chưa có mode ở `IMMEDIATE_LEGACY`.
  Chọn bảo toàn chế độ cũ kể cả chưa có ACK, vì request trước nâng cấp có thể đã tới server.
  Không đổi command IDs, sequence, requestId, payload hay receipts hiện có.
- Phiên `IMMEDIATE_LEGACY` tiếp tục gửi metadata tức thời/reconnect đến finish như trước.
  Publisher không gửi khi còn revision điều khiển chưa ACK, đặc biệt RESUME sau server PAUSED.
  Phiên đã khởi tạo revision 1 vẫn bắt đầu command sequence 2; không đánh lại số.
- Cả hai mode đều chỉ upload tọa độ sau STOPPED. Không sửa trạng thái DB server để ép resume.

## Mobile chỉ dùng GPS v2

Theo yêu cầu mới của người dùng, màn GPS không còn import/chạy hook v1 hoặc fallback sang v1.
Không còn cần `EXPO_PUBLIC_TRIP_GPS_V2_ENABLED`; biến cũ có thể giữ trong `.env` nhưng không tác động luồng này.
Server phải công bố `supportedSyncProtocols` chứa `2` để tạo phiên; nếu không hỗ trợ, báo lỗi rõ và không tạo phiên v1.
Phiên v1 cũ còn mở được báo không hỗ trợ, không tự đổi protocol/finish/xóa dữ liệu.
Mã nguồn hook v1 cũ và bảng dữ liệu cũ giữ nguyên để tránh xóa lịch sử, nhưng không được gọi bởi màn GPS mới.
`IMMEDIATE_LEGACY` trong SQLite là mode điều khiển của phiên **v2** cũ, không phải protocol v1;
mode đó vẫn được giữ đến finish theo quy tắc chuyển đổi của handoff.
Không thay cấu hình/feature flag server hay sửa `.env`.

## Thành phần

- `hooks/useTripGpsV2.ts`: API hook chính qua barrel `features/trip-gps/index.ts`; phục hồi local trước refresh mạng,
  điều khiển local, hiển thị kết quả local/server. Không gọi `hooks/useTripGps.ts`.
- `services/trip-gps.v2-storage.ts`: migration additive, transaction SQLite, khóa theo tài khoản/session,
  context/state cache, start ID cố định, raw samples, command sequence, metadata payload, snapshot/batch/manifest receipts.
  Bảng v1 và dữ liệu personal recording giữ nguyên. Không dùng session version thay metadata revision.
- `services/trip-gps.collector.ts`: task `trekgo-trip-gps-v2-location`, producer background riêng cho trip;
  nếu không được cấp quyền nền thì dùng foreground subscription và thông báo giới hạn trên UI.
  ID sample xác định theo session/timestamp/tọa độ, ghi raw trước khi publish; map matching chỉ tác động hiển thị.
- `TripGpsLifecycle.tsx` + `services/trip-gps.runtime.ts`: gắn ở root bên trong AuthProvider;
  collector, publisher, reconnect và coordinator không phụ thuộc màn hình navigation.
  Logout/đổi account dừng collector/socket và hủy coordinator cũ; không xóa outbox.
- `services/trip-gps.coordinator.ts`: một uploader lịch sử trên thiết bị; phiên mới đang mở không gọi sync API.
  Nhánh gửi metadata giữa phiên chỉ dành cho `IMMEDIATE_LEGACY`.
  Sau STOPPED: metadata FINISH → batch → manifest pages → complete → status.
  Snapshot và payload retry bất biến, ACK checkpoint lưu SQLite; metadata mới chờ snapshot đang xử lý xong.
  Retry request lần đầu + tối đa ba lần sau 5/15/30 giây; tôn trọng thời gian backoff server nếu dài hơn.
  Retry budget/checkpoint tồn tại sau restart. Manual/reconnect hợp lệ mở lượt mới.
- `services/trip-gps.sync-api.ts`: bearer được kiểm tra theo account của outbox trước mỗi request;
  tối đa một refresh sau 401, không replay outbox bằng token tài khoản khác.
- `services/trip-gps.hash.ts`: canonical JSON và SHA-256 UTF-8 cùng quy tắc server.
- `services/trip-gps.merge.ts`: roster, location và presence merge bằng version độc lập.
- Socket dùng publish riêng, giữ tối đa một điểm mới nhất chờ gửi và một request đang chờ ACK;
  sequence lưu SQLite. Nhịp 5 giây/5 m, đường gửi chậm 15 giây khi có bằng chứng chuyển động;
  không heartbeat tọa độ, không phát lại backlog qua socket. Subscription xem bản đồ độc lập publisher.
- Map animate marker trong 1,5 giây; tọa độ trùng/cũ không làm lùi marker. Đổi session,
  điểm cũ hơn 30 giây hoặc khoảng nhảy trên 200 m cập nhật trực tiếp. Hai ngưỡng hiển thị này
  là giá trị kỹ thuật cần đo thực địa, không loại bỏ dữ liệu gốc hay thay policy GPS.

## Bảo toàn dữ liệu và giới hạn

- Pause/resume/finish lưu status, intervals và command trong một transaction; finish lưu thêm ranh giới sequence cuối.
  Snapshot upload được tạo sau khi timeline tương ứng đã ACK; command/ý định finish luôn tồn tại dù offline.
  Finish không chờ network. SQLite ghi lỗi thì thao tác báo thất bại, không tuyên bố đã lưu thành công.
- `STOPPED` và trạng thái đồng bộ riêng nhau. Server ACTIVE cũ không ghi đè local STOPPED.
- HTTP 202 chưa phải hoàn thành. Chỉ xác nhận snapshot khi status COMPLETE và processed revision khớp;
  receipts được archive, rejection IDs/codes và raw samples giữ lại.
- Không tự xóa dữ liệu local sau đồng bộ: chưa có số ngày retention được chốt. Dữ liệu chưa ACK luôn giữ.
- Worker NEEDS_ATTENTION: manual tạo completion ID mới trên snapshot/manifest cũ, bỏ qua batches/pages đã ACK.
  Lỗi protocol/revision/idempotency/validation giữ dữ liệu, báo cần kiểm tra; không tự đổi ID/payload để vượt conflict.
- Snapshot `final=false` còn lưu từ bản thử nghiệm trước không được đổi payload rồi gửi dưới ID cũ.
  Nếu server đã xử lý xong snapshot cũ, mobile đối soát/archive rồi tạo snapshot cuối đúng revision.
  Nếu snapshot cũ còn PROCESSING, chờ status; nếu chưa xử lý/NEEDS_ATTENTION, giữ dữ liệu và báo cần đối soát,
  không gửi lại final=false vào contract mới và không xóa điểm/receipt để che conflict.
- Snapshot tối đa 10000 điểm, batch tối đa min(policy, server, 200), body chủ động giữ dưới 120000 byte
  (và dưới giới hạn capability), tối đa 1000 manifest entries/100 pages. Vượt giới hạn báo lỗi và giữ local.
  Giới hạn tổng accepted points của phiên/lịch sử do server kiểm tra; client không tự bỏ điểm để vượt giới hạn.
- Bắt đầu mới vẫn cần mạng. Mất response start giữ nguyên clientSessionId. Không tự dựng một phiên v2 mới
  từ remote session khi đã mất trạng thái local/receipt của thiết bị; UI báo cần kiểm tra thay vì đoán revisions.
- Trip COMPLETED vẫn mở được GPS để tự finish và sync phiên cá nhân. Checkpoint/deviation chính thức từ xử lý lịch sử;
  các số liệu local chỉ tạm tính. Chưa bổ sung nghiệp vụ local warning riêng.
- Foreground/background thực tế phụ thuộc quyền và OS; không bảo đảm tiếp tục khi force-stop/OS kill.
  Hai tài khoản và hai thiết bị cần kiểm tra thực tế, ngoài unit/SQLite tests.

## Kiểm chứng

```powershell
node node_modules/typescript/bin/tsc --noEmit --pretty false
npm.cmd run test:trip-gps
```

Để chạy thêm kiểm chứng bằng chính DTO server:

```powershell
$env:TRIP_GPS_SERVER_ROOT='C:/Users/Admin/Documents/tuHocNestJs/Vina_TrekGO/api'
npm.cmd run test:trip-gps
```

Test contract chỉ đọc source DTO/Zod và validate payload local trong bộ nhớ; không gọi API, không chạm DB server.
Bộ test dùng SQLite thật trên file tạm bằng Node 22 (`node:sqlite`), đóng/mở lại file để kiểm tra restart.
Test publisher dùng clock/socket giả; không thay thế kiểm thử Socket.IO/native thực tế.

Kết quả sau chuyển mobile sang chỉ v2 và chặn callback GPS thật đến muộn: 38/38 tests qua khi có server root, không skip.
Bao gồm phiên mới không gọi metadata giữa phiên, migration giữ mode/receipt cũ, chặn publish trước RESUME ACK,
timeline trên 100 lệnh bắt đầu sequence 1, finish offline/restart, và DTO server từ chối final=false/thiếu endedAt.
Bộ test hiện chỉ chạy storage/coordinator/collector/hook v2 và GPS processor; không chạy suite hook v1 nữa.

### Điều tra fake GPS còn chậm/điểm xa trail

- Bỏ hoàn toàn nhánh v1 để không có đường khởi động producer/stopwatch v1 ngoài dự kiến.
- Đánh revision cho lần đọc local: response cũ không được ghi đè phiên vừa start/pause/finish;
  regression tái hiện read SQLite bắt đầu trước Start nhưng trả về sau Start đã commit.
- Collector phân biệt nguồn DEVICE/SIMULATOR. Callback OS đã xếp hàng trước khi dừng GPS thật
  không được ghi vào SQLite khi đang chọn fake; callback simulator đến muộn cũng bị bỏ sau khi chọn GPS thật.
- Bản development ghi log `[TripGps v2 start]` cho các bước nhận context, nhận phiên, commit SQLite,
  collector ready, kèm stageMs/totalMs/source; không log token hay tọa độ. Dùng log này để xác định
  thời gian chờ thực tế trên máy thay vì suy đoán server/native/SQLite.
- Chưa đo được độ trễ trên điện thoại của người dùng. Test nguồn và request giả không thay thế đo thiết bị thật.

## Rà soát từ vào GPS đến màn tổng kết

Phạm vi: đọc code đầu vào `TripGpsButton`, navigation, hook v2/v1, storage, collector,
runtime/socket, coordinator/API và result modal; đối chiếu mục 6/8/9/13/15 của thiết kế và API handoff.
Đây là rà soát source + kiểm thử SQLite/hook/service; chưa phải báo cáo E2E trên Android/iOS.

| Bước | Kết quả rà soát/kiểm chứng |
| --- | --- |
| Vào GPS, khôi phục | SQLite trước network; PAUSED/STOPPED local không bị server ACTIVE ghi đè; account đổi cô lập dữ liệu |
| Bắt đầu | Có mạng, ID start ổn định, lưu SQLite trước producer; đã sửa chọn fake mode trước khi bật collector để tránh thu GPS thật trong phiên fake |
| Ghi/fake GPS | Raw points lưu trước publish; simulator giữ tiến độ qua refresh/pause; đồng hồ xử lý intervals rỗng; sửa thêm việc phiên cũ intervals rỗng không nhận điểm |
| Pause/resume | Phiên mới chỉ lưu local; phiên legacy giữ mode cũ và đợi RESUME ACK trước publish; lỗi commit trả thất bại và phục hồi fake producer đang ACTIVE |
| Finish | Dừng producer, chờ writes rồi commit STOPPED; lỗi write đang chờ được truyền ra thay vì bị catch của queue nuốt; lỗi local không mở màn hoàn tất |
| Finish offline | STOPPED, endedAt, commands/raw points tồn tại sau restart; có mạng tiếp tục sync; không bật lại collector theo status server |
| Upload | FINISH ACK phải xác nhận STOPPED và đúng endedAt trước batch; timeline phân trang, ID/hash/payload giữ nguyên; một uploader/thiết bị |
| Retry | Lần đầu + ba retry, giữ checkpoint; đã sửa giữ ý định manual khi bấm trong lúc status/uploader khác đang chạy |
| Thu hồi quyền | Event revoke, REST 403 hoặc publish ACK FORBIDDEN dừng collector/socket, giữ dữ liệu và không tự tạo FINISH |
| Màn tổng kết | Chưa xác nhận xử lý thì dùng route/count/distance local, không lấy tuyến server cũ; nhãn điểm đã lưu và checkpoint chờ đối soát; chỉ dùng READY/EMPTY chính thức khi sync xác nhận |

Lỗi cụ thể đã sửa trong lượt rà soát: producer thật có thể khởi động trước fake mode; intervals rỗng ở phiên cũ;
fake producer đứng sau lỗi commit; lỗi write đang chờ bị nuốt khi finish; summary dùng kết quả server cũ;
response route cũ ghi đè version mới; manual retry bị mất khi coalesce/chờ uploader; revoke bị bỏ qua ở publisher/REST;
giới hạn uploader chưa đúng mục 9; thiếu kiểm tra STOPPED/endedAt trong FINISH ACK.

Kiểm thử mới tái hiện start fake, lỗi pause/finish, đồng hồ đóng băng sau finish,
in-flight SQLite failure, kết quả local/chính thức/EMPTY, giữ manual retry và revoke không xóa pending.
Không thay nghiệp vụ pause/resume, sync trigger, quyền, thời hạn hay retention của hai tài liệu.
Không sửa server hoặc bật cờ trong `.env`.

### Sửa bổ sung lúc tạo phiên fake

Cleanup simulator trước đây gọi `setSimulated(false)` khi sessionId đổi từ rỗng sang ID mới,
dù người dùng vẫn chọn fake. Reconcile đang chờ có thể khởi động GPS thật, gây chờ quyền/native
và ghi một điểm thực ở xa đầu trail. Đã tách cleanup instance khỏi chế độ collector; chỉ đổi mode
khi lựa chọn fake/thật thay đổi hoặc rời màn hình. Thêm revision để vô hiệu hóa lượt khởi động
collector thật đã cũ khi chế độ vừa đổi. Chọn lại cùng mode không dừng/khởi động collector thêm lần nữa.
Regression test đã đi qua chuyển đổi chưa có session → có session và tình huống real startup đang chờ.
Nút Start vẫn chờ GET context, POST sessions và lưu SQLite theo yêu cầu tạo phiên online;
không bắt đồng hồ chạy khi chưa có phiên được lưu. Clock được cập nhật ngay khi nhận phiên local.

## Gate còn phải chạy trên thiết bị/staging

1. Development build Android/iOS có quyền location nền: rời navigation, khóa màn hình, foreground lại;
   xác nhận raw points vào bảng trip, không vào personal recording, không có hai producer.
2. Bắt đầu online → tắt mạng → pause/resume nhiều lần → finish → kill/reopen offline:
   STOPPED, endedAt, timeline và raw samples giữ nguyên; không tự thu GPS lại.
3. Phiên mới reconnect khi ACTIVE/PAUSED: không có request metadata/batches/manifests/complete; timeline và lịch sử vẫn ở SQLite.
   Sau finish, reconnect mạng yếu/mất response: batch retry cùng ID/hash, worker xử lý đúng snapshot;
   kiểm tra kết quả READY/EMPTY và rejection trên UI.
4. Hai mobile kết nối hai API instances: location/presence đúng version, giữ marker offline,
   subscribe lại lấy state; kiểm tra token expiry, revoke và account switch khi request đang chạy.
5. Leader complete trip khi thành viên vẫn ghi: thành viên tiếp tục, tự finish sau completedAt,
   hạn upload tính từ endedAt cá nhân theo policy.
6. Đo pin, bộ nhớ, thời gian SQLite, traffic và animation với dữ liệu tới giới hạn server.
   Chưa thực hiện load test hoặc công bố p95/bandwidth.

Chỉ rollout cờ v2 cho người dùng thật sau khi các gate tương ứng được kiểm chứng và ghi nhận kết quả.
