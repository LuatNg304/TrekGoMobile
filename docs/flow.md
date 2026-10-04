# FLOW NGHIỆP VỤ (nguồn sự thật, code phải làm đúng theo đây)

## FLOW 1: PUBLIC TRIP (liên quan role LEADER)

### A. Leader tạo trip
1. Leader chọn "Tạo Public Trip"
2. Hệ thống kiểm tra: Leader có quyền tạo Public Trip không?
   - KHÔNG → hiện thông báo "không đủ quyền", dừng.
   - CÓ → sang bước 3.
3. Leader chọn checkpoint và tạo trail
4. Leader nhập thông tin trip
5. Leader bấm gửi tạo trip
6. Hệ thống kiểm tra dữ liệu trip hợp lệ không?
   - KHÔNG → hiện thông báo lỗi, quay lại bước 4.
   - CÓ → lưu và publish trip.

### B. Ngày đi (Leader điều hành)
1. Leader cập nhật điểm danh người tham gia.
   - Check-in không hợp lệ hoặc trễ / no-show → ghi nhận.
2. Leader bấm "Xác nhận sẵn sàng khởi hành".
3. Leader bấm "Bắt đầu Trip" → trip chuyển sang trạng thái ĐANG DI CHUYỂN.
4. Trong lúc trek, hệ thống chạy GPS:
   - Tạo GPS session, tải route dự kiến và checkpoint
   - Theo dõi vị trí hiện tại, vẽ đường đã đi
   - Đã vào vùng checkpoint? CÓ → ghi nhận checkpoint event. KHÔNG → tiếp tục theo dõi.
   - Lệch route quá ngưỡng? CÓ → CẢNH BÁO LEADER. KHÔNG → tiếp tục trip.
   - Có tín hiệu GPS hợp lệ? KHÔNG → báo mất GPS, GIỮ session, chờ và thử lấy lại. CÓ → lưu tiếp.
   - Có mạng không? CÓ → đẩy dữ liệu GPS lên server. KHÔNG → giữ dữ liệu trong máy, đồng bộ sau.
5. Kết thúc: Leader bấm "Xác nhận kết thúc trip".
   - Hệ thống kiểm tra: ĐÃ ĐI ĐỦ required checkpoint chưa?
     - CHƯA → KHÔNG cho kết thúc.
     - ĐỦ → trip chuyển sang HOÀN THÀNH, đóng GPS session.

## FLOW 2: RENTAL (thuê thiết bị) — liên quan STAFF DELIVERY (giao nhận)

1. User chọn thuê thiết bị (phải có booking trip hợp lệ) → chọn loại và số lượng → gửi yêu cầu.
2. Hệ thống kiểm tra thiết bị còn khả dụng không → tính tiền → tạo đơn thanh toán.
3. Thanh toán thành công → "Xác nhận Rental Order". Thất bại → hủy reservation và báo lỗi.
4. Staff KHO: nhận danh sách đơn cần chuẩn bị → soạn, kiểm tra ngoại quan, chụp ảnh → đóng gói, dán QR, đánh dấu READY.
5. Hệ thống tạo TASK GIAO NHẬN cho Staff Delivery.
6. **STAFF DELIVERY làm:**
   a. Nhận task giao nhận và nhận package từ kho
   b. Di chuyển tới điểm tập trung, xác nhận thông tin user
   c. Kiểm tra và bàn giao thiết bị cùng user
7. Hệ thống chuyển đơn sang trạng thái ĐANG THUÊ.

## FLOW 3: RETURN (trả thiết bị) — liên quan STAFF DELIVERY

1. Hệ thống nhận được "chuyến đã hoàn thành" → tạo task trả đồ.
   => Task thu hồi CHỈ mở sau khi Leader xác nhận kết thúc trip.
2. **STAFF DELIVERY làm:** thu hồi thiết bị từ user → ghi nhận hiện trạng → bàn giao lại KHO.
3. Staff Kho nhận và đánh giá chuyên sâu. (Staff Delivery KHÔNG làm bước này.)
4. Hệ thống xử lý cọc, cập nhật trạng thái thiết bị (việc của hệ thống, không phải Staff Delivery).

## QUY TẮC CHUNG
- Không được bỏ bước, không được thêm bước ngoài flow.
- Bước có điều kiện thì phải chặn thật: chưa đủ điều kiện thì nút bị khóa hoặc báo lỗi, KHÔNG được cho qua.
- Mỗi flow phải có cả nhánh lỗi (không đủ quyền, dữ liệu sai, mất GPS, chưa đủ checkpoint...).