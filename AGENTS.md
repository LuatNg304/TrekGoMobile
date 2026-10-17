This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md


## LUẬT BẮT BUỘC KHI SỬA CODE

1. Trước khi làm bất cứ việc gì, ĐỌC docs/flow.md. Code phải đúng theo flow đó.
2. Nếu code và flow khác nhau thì flow đúng. Không tự bỏ hay thêm bước.
3. Chỗ nào flow chưa rõ thì HỎI tôi, không được tự đoán.
4. Chỉ sửa đúng file tôi nói. Không sửa lan sang file khác.
5. Dữ liệu là mock (dữ liệu giả) nhưng phải chạy như app thật:
   - Trạng thái (trip đang chạy, đã điểm danh, đã bàn giao...) phải lưu trong AppContext (src/context/AppContext.tsx), KHÔNG lưu riêng trong từng màn bằng useState.
   - Nút quan trọng (Bắt đầu trip, Kết thúc trip, Hoàn tất bàn giao) phải KHÓA nếu chưa đủ điều kiện theo flow, và hiện lý do.
   - Mỗi thao tác giả lập chờ 0.5 giây rồi mới xong (giống gọi server), có trạng thái đang tải.
   - Có đủ trường hợp lỗi: không đủ quyền, thiếu dữ liệu, mất GPS, chưa đủ checkpoint.
   - Không ghi cứng số liệu (ví dụ "05/05"). Phải tính từ dữ liệu thật trong state.
6. Giao diện làm theo ảnh trong thư mục src/leader_delivery_batch/<tên màn>/screen.png.
7. Làm xong phải chạy: npx tsc --noEmit
8. Cuối câu trả lời, luôn liệt kê: (a) bước nào trong flow đã làm, (b) bước nào chưa làm hoặc chưa rõ.