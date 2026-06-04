# LMS Booking Pro 使用與維護說明

## 1. 專案簡介

LMS Booking Pro 是 Li's Meet Pro / Fitness 的個人課程與固定課預約系統。

- 前台提供學生查看課表、切換週期與預約可預約時段。
- 後台 `/coach` 提供教練管理每週固定課、單次停課與排程資料檢查。
- 系統使用 Firestore 即時同步資料，並以 `schedule > weeklyTemplate > unset` 作為課表顯示核心邏輯。

## 2. 正式網址

前台：

```text
https://lms-booking-pro-5467.vercel.app
```

後台：

```text
https://lms-booking-pro-5467.vercel.app/coach
```

GitHub repo：

```text
https://github.com/sherman0769/lms-booking-pro.git
```

## 3. 目前核心功能

### 前台

- 顯示 7 天課表。
- 支援「上一週 / 本週 / 下一週」切換。
- 支援 `?start=YYYY-MM-DD` deep-link，例如 `/?start=2026-06-10`。
- 可預約時段可點擊並輸入姓名預約。
- 已預約 / 固定課 / 未開放 / 暫未開放不可點擊。
- 支援 `weeklyTemplates` 推導固定課。
- `schedule` 優先於 `weeklyTemplate`。
- 固定課可優先顯示 `publicLabel`，沒有 `publicLabel` 時顯示 `name`。

### 後台 `/coach`

- 前端密碼保護。
- 本週摘要。
- 今日課表。
- 固定課模板列表。
- 新增每週固定課模板。
- 停用每週固定課模板。
- 每週固定課未來 28 天推導預覽。
- 排程資料健康檢查。
- 單次停課。
- 取消單次停課。

## 4. 資料模型

### `schedule`

用途：

- 單日實際資料。
- 學生預約。
- 教練手動設定。
- 單次停課 override。

目前欄位：

```ts
{
  date: string,
  timeKey: string,
  status: 'available' | 'booked' | 'fixed' | 'off',
  name?: string,
  publicLabel?: string,
  note?: string,
  source?: 'coach' | 'student' | 'system' | 'template',
  templateId?: string,
  overrideType?: 'leave' | 'off' | 'cancel' | 'makeup',
  updatedAt?: Timestamp
}
```

說明：

- `name`：姓名、班名或固定課名稱。
- `publicLabel`：公開顯示名稱，前台學生端會優先顯示。
- `note`：教練端內部備註，前台不顯示。
- `source`：資料來源，目前常見為 `coach` 或 `student`。
- `templateId`：若此 schedule 是針對某個 weeklyTemplate 的單日 override，記錄模板 id。
- `overrideType: 'leave'`：目前用於單次停課。
- `overrideType: 'makeup'`：型別已保留，但補課功能尚未實作。

### `weeklyTemplates`

用途：

- 每週固定課模板。
- 例如每週三 08:00 固定課。

目前欄位：

```ts
{
  weekday: number,
  timeKey: string,
  status: 'fixed',
  name?: string,
  publicLabel?: string,
  note?: string,
  active: boolean,
  source: 'coach',
  createdAt?: Timestamp,
  updatedAt?: Timestamp
}
```

說明：

- `weekday` 使用 JavaScript `Date.getDay()` 規則：`0 = Sunday`、`1 = Monday`、...、`6 = Saturday`。
- `active: true` 代表此固定課模板會被前台與後台推導顯示。
- 停用模板時不刪除週期規則的語意，只將 `active` 設為 `false`。

## 5. 核心解析邏輯

目前前台與 `/coach` 都使用以下優先順序：

```text
schedule > weeklyTemplate > unset
```

也就是：

1. 有 `schedule` doc，使用 `schedule`。
2. 沒有 `schedule` doc，但命中 active `weeklyTemplate`，顯示固定課。
3. 都沒有，顯示 unset / 暫未開放。

重要觀念：

- `schedule` 是單日實際資料或單日 override。
- `weeklyTemplate` 是長期固定規則。
- 單次停課就是寫入 `schedule` override。
- 取消單次停課就是刪除該 `schedule` override，讓 `weeklyTemplate` 重新生效。

## 6. 教練操作流程

### 新增固定課

1. 進入 `/coach`。
2. 輸入教練密碼。
3. 在「新增每週固定課」中選擇星期與時段。
4. 輸入名稱 / 班名。
5. 可選填公開顯示名稱與備註。
6. 新增後固定課會每週自動推導。

### 停用固定課

1. 在固定課模板列表中找到該模板。
2. 點擊「停用」。
3. 該模板 `active` 變成 `false`。
4. 未來不再推導該固定課。

### 單次停課

1. 在「每週固定課未來推導預覽」中找到某一天的固定課。
2. 點擊「單次停課」。
3. 系統寫入 `schedule` override：

```ts
{
  status: 'off',
  source: 'coach',
  overrideType: 'leave',
  note: '單次停課',
  templateId
}
```

4. 該天前台顯示「未開放」。
5. 下週固定課仍正常推導。

### 取消單次停課

1. 在「單次停課清單」找到該筆。
2. 點擊「取消單次停課」。
3. 系統刪除該日該時段的 `schedule` override。
4. `weeklyTemplate` 重新生效。

## 7. 開發與部署流程

目前建議的安全開發流程：

```text
建立 feature branch
→ 修改小範圍功能
→ npm run build
→ push branch
→ Vercel preview 驗證
→ 確認無誤
→ merge main
→ production 驗證
```

常用命令：

```bash
git status --short --branch
npm run build
git checkout -b codex/your-task-name
git add .
git commit -m "..."
git push origin branch-name
```

Windows PowerShell 可能遇到 `npm.ps1` 問題，必要時可使用：

```bash
"C:\Program Files\nodejs\npm.cmd" run build
```

開發模式：

```bash
npm run dev
```

若 PowerShell `npm.ps1` 有問題：

```bash
"C:\Program Files\nodejs\npm.cmd" run dev
```

## 8. 環境變數

專案透過 Firebase 存取雲端資料，需在本機 `.env.local` 與 Vercel 環境變數設定：

```text
NEXT_PUBLIC_FIREBASE_API_KEY=your-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## 9. 技術棧與主要結構

技術棧：

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS 4
- Firebase Firestore
- Vercel

主要結構：

```text
app/
  components/        前台課表與共用 UI 元件
  coach/page.tsx     教練後台
  globals.css        全域樣式
  layout.tsx         App Providers
  page.tsx           前台首頁
lib/
  firebase.ts        Firebase 初始化
  resolveScheduleSlot.ts
  useSchedule.tsx
  useWeeklyTemplates.tsx
types/
  index.ts           共用型別
public/
  coach.png
```

## 10. 已知問題與未完成事項

- hydration errors `#425/#418/#423` 曾出現，需另開批次處理。
- `.next` 被 git 追蹤問題尚未處理。
- ESLint 尚未設定。
- npm audit 尚未處理。
- schedule placeholder 尚未標記。
- 缺 source 舊資料尚未補 source。
- students collection 尚未做。
- 固定學生管理尚未做。
- 補課功能尚未做。
- 手機版表格進階優化尚未做。
- 藝術化 UI 尚未做。
- Firebase Auth 尚未導入，目前仍是前端密碼。

## 11. 不要誤動的舊專案

不要使用：

```text
D:\MyGitHub\booking-pro
```

目前正確主線是：

```text
D:\MyGitHub\lms-booking-pro
```

GitHub repo：

```text
https://github.com/sherman0769/lms-booking-pro.git
```

## 12. 本 README 的維護原則

- 文件更新不應修改 Firestore。
- 文件更新不應修改 UI 或功能邏輯。
- 若新增功能，請同步更新核心功能、資料模型、操作流程與已知問題。
- 若涉及 production 驗證，請記錄最終 production commit 與驗證結果。
