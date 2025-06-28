# Li's Meet Pro Fitness 預約系統

一個以 **Next.js** 搭配 **Tailwind CSS** 與 **Firebase** 打造的簡易預約系統範例，可讓學生在線上預約課程，教練亦能切換模式管理時段。此專案主要作為教學與快速起手用的模板。

## 技術棧

- **Next.js 14** – 採用 App Router 架構
- **React 18**
- **TypeScript**
- **Tailwind CSS 4** – 快速設計 UI
- **Firebase Firestore** – 儲存與即時同步預約資料

## 專案結構

```
app/            Next.js App Router 相關檔案
  components/   React 元件
  globals.css   全域樣式（引用 Tailwind）
  layout.tsx    頁面外框與 Providers
  page.tsx      首頁
lib/            共用函式與狀態管理（Firebase、排程等）
public/         靜態資源，例如教練頭像
```

## 環境變數

專案透過 Firebase 存取雲端資料，需在根目錄建立 `.env.local` 並設定以下參數：

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

以上資訊可從 Firebase 專案設定取得。

## 安裝與執行

1. 先安裝相依套件：
   ```bash
   npm install
   ```
2. 開發模式啟動伺服器：
   ```bash
   npm run dev
   ```
   伺服器預設在 <http://localhost:3000>。
3. 如需建置正式版：
   ```bash
   npm run build
   npm start
   ```

## 功能說明

- **學生模式**：可檢視可預約的時段，點擊後輸入姓名完成預約。
- **教練模式**：輸入密碼後切換，點擊時段可以在「可預約 → 排休 → 已預約」之間切換。
- **即時更新**：利用 Firestore `onSnapshot` 監聽資料變動，所有使用者畫面會即時同步。

## 自訂與延伸

- 若要變更密碼或新增功能，可參考 `lib/useMode.tsx` 與 `app/components` 中的元件。
- Tailwind 設定位於 `tailwind.config.js`，可依需求調整主題顏色或插件。
- 若要部署到雲端（如 Vercel），請確保環境變數已在平台上設定完成。

歡迎依照自身需求修改、擴充，打造符合情境的預約系統！

