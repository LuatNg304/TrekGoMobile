# 📚 Kiến Trúc Lưu Trữ Dữ Liệu & Bản Đồ Ngoại Tuyến (Offline Storage)

Tài liệu này mô tả chi tiết kiến trúc tầng lưu trữ cục bộ (**Data Persistence Layer**) sử dụng `@react-native-async-storage/async-storage` và cơ chế quản lý dữ liệu bản đồ ngoại tuyến (**Offline Map Package**) được thiết lập cho dự án **TrekGo Mobile**.

---

## 1. Mục tiêu kiến trúc

1. **Hiệu năng cao (0ms UI latency)**: Áp dụng cơ chế **Optimistic Update** (Cập nhật lạc quan) — cập nhật React state ngay lập tức để giao diện mượt mà, sau đó ghi ngầm xuống bộ nhớ cục bộ ở background.
2. **Khôi phục trạng thái (State Hydration)**: Đảm bảo khi người dùng tắt hẳn app và mở lại, mọi dữ liệu cung đường đã lưu, cung đường tự tạo, thông tin hồ sơ và gói bản đồ đã tải vẫn còn nguyên.
3. **Phân tách trách nhiệm (Clean Architecture)**: Không gọi trực tiếp `AsyncStorage` từ giao diện (Screen/Component), mà quản lý qua một **Service Layer** tập trung với đầy đủ TypeScript types và xử lý ngoại lệ an toàn.

---

## 2. Cấu trúc thư mục

Toàn bộ logic lưu trữ được tổ chức tại `src/services/storage/`:

```
src/services/storage/
├── keys.ts                 # Quản lý tập trung các Storage Key (Namespaced & Versioned)
├── trailStorage.ts          # Xử lý: Cung đường đã lưu (Saved) & Cung đường cá nhân (Personal)
├── offlineMapStorage.ts     # Xử lý: Quản lý các gói bản đồ 3D offline đã tải về
├── accountStorage.ts        # Xử lý: Hồ sơ Trekker, liên hệ khẩn cấp & giỏ hàng thuê đồ
└── index.ts                 # Barrel export tập trung
```

---

## 3. Chi tiết các Module

### 3.1. Quản lý Khóa (`keys.ts`)
Tất cả các khóa lưu trữ đều có tiền tố `@trekgo/` và hậu tố phiên bản `-v1`. Điều này giúp:
- Tránh trùng lặp key với các thư viện thứ ba.
- Dễ dàng thực hiện Migration dữ liệu khi ứng dụng nâng cấp cấu trúc schema trong tương lai.

```typescript
export const STORAGE_KEYS = {
  SAVED_TRAILS: "@trekgo/saved-trail-ids-v1",
  PERSONAL_TRAILS: "@trekgo/personal-trails-v1",
  OFFLINE_PACKAGES: "@trekgo/offline-map-packages-v1",
  TREKKER_ACCOUNT: "@trekgo/trekker-account-v1",
  RENTAL_CART: "@trekgo/rental-cart-v1",
} as const;
```

---

### 3.2. Cung đường (`trailStorage.ts`)
Phục vụ lưu trữ các thông tin liên quan đến trail:
- `getSavedTrailIds(): Promise<string[] | null>`: Đọc danh sách ID cung đường đã bookmark.
- `saveTrailIds(ids: string[]): Promise<void>`: Lưu danh sách ID cung đường đã bookmark.
- `getPersonalTrails(): Promise<PersonalTrail[] | null>`: Đọc các cung đường cá nhân do người dùng thiết kế.
- `savePersonalTrails(trails: PersonalTrail[]): Promise<void>`: Lưu toàn bộ danh sách cung đường cá nhân.

---

### 3.3. Bản đồ Ngoại tuyến (`offlineMapStorage.ts`)
Quản lý trạng thái và metadata của các gói bản đồ 3D tải về:

```typescript
export interface OfflineMapPackage {
  trailId: string;
  trailName: string;
  downloadedAt: string;
  sizeMb: number;
  status: "DOWNLOADED" | "DOWNLOADING" | "ERROR";
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  tileCount?: number;
}
```

- `getPackages(): Promise<Record<string, OfflineMapPackage>>`: Lấy danh sách toàn bộ gói map đã tải.
- `savePackage(pkg: OfflineMapPackage): Promise<void>`: Lưu / cập nhật gói bản đồ.
- `removePackage(trailId: string): Promise<void>`: Xoá gói bản đồ ngoại tuyến khỏi thiết bị.

---

### 3.4. Tài khoản & Giỏ hàng (`accountStorage.ts`)
- `getTrekkerAccount()` & `saveTrekkerAccount()`: Lưu thông tin nhóm máu, dị ứng, tiền sử bệnh lý và liên hệ SOS khẩn cấp.
- `getRentalCart()` & `saveRentalCart()`: Lưu giỏ hàng thuê thiết bị dã ngoại.

---

## 4. Tích hợp vào `AppContext`

Toàn bộ hệ thống lưu trữ được tích hợp trong `src/context/AppContext.tsx`:

```
┌────────────────────────────────────────────────────────┐
│                   App Khởi Động                        │
│                         │                              │
│                         ▼                              │
│            hydrateStorage() (useEffect)                │
│  Đọc song song từ AsyncStorage bằng Promise.all:       │
│  - trailStorage.getSavedTrailIds()                     │
│  - trailStorage.getPersonalTrails()                    │
│  - offlineMapStorage.getPackages()                     │
│  - accountStorage.getTrekkerAccount()                  │
│  - accountStorage.getRentalCart()                      │
│                         │                              │
│                         ▼                              │
│  Nạp vào React State -> setIsStorageHydrated(true)     │
└────────────────────────────────────────────────────────┘
```

### Các API mới được cung cấp trong `useApp()`:

| Thuộc tính / Phương thức | Kiểu dữ liệu | Ý nghĩa |
| :--- | :--- | :--- |
| `isStorageHydrated` | `boolean` | `true` khi đã hoàn tất đọc dữ liệu từ ổ cứng lúc mở app |
| `savedTrailIds` | `string[]` | Danh sách ID cung đường đã lưu (tự động đồng bộ) |
| `toggleSavedTrail(id)` | `(id: string) => void` | Bật/tắt lưu cung đường (ghi ngầm AsyncStorage) |
| `personalTrails` | `PersonalTrail[]` | Danh sách cung đường cá nhân (tự động đồng bộ) |
| `offlinePackages` | `Record<string, OfflineMapPackage>` | Danh sách các gói bản đồ ngoại tuyến đã tải |
| `downloadOfflineTrail(id)` | `(id: string) => Promise<void>` | Bắt đầu tải bản đồ offline cho một cung đường |
| `removeOfflineTrail(id)` | `(id: string) => Promise<void>` | Xoá dữ liệu offline của cung đường |
| `isTrailOfflineReady(id)` | `(id: string) => boolean` | Kiểm tra xem cung đường đã sẵn sàng đi offline chưa |

---

## 5. Hướng dẫn sử dụng cho Lập trình viên

### Ví dụ 1: Nút Lưu / Bỏ lưu cung đường (Bookmarks)
```tsx
import { useApp } from "@/context/AppContext";

export function TrailBookmarkButton({ trailId }: { trailId: string }) {
  const { savedTrailIds, toggleSavedTrail } = useApp();
  const isSaved = savedTrailIds.includes(trailId);

  return (
    <TouchableOpacity onPress={() => toggleSavedTrail(trailId)}>
      <Ionicons 
        name={isSaved ? "bookmark" : "bookmark-outline"} 
        size={22} 
        color={isSaved ? "#38ef7d" : "#ffffff"} 
      />
    </TouchableOpacity>
  );
}
```

### Ví dụ 2: Tải gói bản đồ 3D Ngoại tuyến trước khi đi trek
```tsx
import { useApp } from "@/context/AppContext";

export function OfflineMapDownloadCard({ trailId }: { trailId: string }) {
  const { offlinePackages, downloadOfflineTrail, removeOfflineTrail, isTrailOfflineReady } = useApp();
  const pkg = offlinePackages[trailId];
  const isReady = isTrailOfflineReady(trailId);

  if (pkg?.status === "DOWNLOADING") {
    return <Text>Đang tải bản đồ 3D ({pkg.sizeMb} MB)...</Text>;
  }

  if (isReady) {
    return (
      <View>
        <Text>Đã sẵn sàng Offline ({pkg.sizeMb} MB)</Text>
        <Button title="Xoá bản đồ ngoại tuyến" onPress={() => removeOfflineTrail(trailId)} />
      </View>
    );
  }

  return (
    <Button 
      title="Tải bản đồ 3D ngoại tuyến" 
      onPress={() => downloadOfflineTrail(trailId)} 
    />
  );
}
```

---

## 6. Tiêu chuẩn mở rộng (Extension Guidelines)

Khi cần lưu trữ thêm loại dữ liệu mới (ví dụ: `historyTracking`, `offlineWaypoints`):
1. **Bước 1**: Khai báo key mới trong `src/services/storage/keys.ts`.
2. **Bước 2**: Tạo file service mới tương ứng (hoặc thêm vào service có sẵn) trong `src/services/storage/`.
3. **Bước 3**: Export ra từ `src/services/storage/index.ts`.
4. **Bước 4**: Thêm hàm đọc vào `hydrateStorage()` và gọi hàm ghi trong action tương ứng tại `src/context/AppContext.tsx`.
