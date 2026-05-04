# SmartFin 移动客户端（Expo / React Native）

## 运行

1. 复制 `.env.example` 为 `.env`，设置 `EXPO_PUBLIC_API_BASE_URL`（与后端同源，含 `https://`，无尾部 `/`）。
2. `npm install`
3. `npm run start`，用 Expo Go 扫码或 `npm run android` / `npm run ios`。

## 已实现

- JWT 登录（`/api/mobile/auth/login`）、Token 存 **SecureStore**
- **费用上传（与网页 `/expenses/upload` 对齐）**  
  - 选择 `expense_type` + **业务场景 category**（与设计文档 `smartfin-expense-revenue-design.md` 一致）  
  - 选文件后 **「OCR + AI 自动匹配」**：图片先 `POST /api/ocr/workers-vision` 再 `POST /api/expenses/detect`；PDF 等由服务端 `runOcrPipeline` 处理  
  - 保存：`presign`（`company` + `expense`）→ `PUT /api/upload/direct` → `POST /api/expenses/upload`（公司级，无项目）  
- 结果页、本机「上传记录」；旧进项记录仍可打开 OCR 状态页

## 说明

- 本机调试时 API 地址请填电脑局域网 IP（手机与电脑同 Wi‑Fi），不要用 `localhost`。
- 服务端需 `npm run dev:cf` 或部署环境，且 **`BETTER_AUTH_SECRET`、R2、队列** 等绑定可用。

## 常见问题：网页有项目，手机列表为空

几乎总是 **`EXPO_PUBLIC_API_BASE_URL` 指向的环境与浏览器不一致**（例如网页是 `localhost:5173`，手机却指向线上空库）。请让手机与浏览器访问**同一基地址**（同一 Worker 域名或同一局域网 IP + 端口），改完 `.env` 后需重启 `npx expo start`。
