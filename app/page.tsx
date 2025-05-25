import ModeToggle from './components/ModeToggle';
import TimeTable from './components/TimeTable';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-6">
      {/* ---- 頁首：頭像 + 標題 + 姓名 ---- */}
      <header className="mb-6 flex w-full max-w-5xl flex-col items-center sm:flex-row sm:gap-4">
        {/* 圓形頭像 */}
        <img
          src="/coach.png"
          alt="李詩民 教練頭像"
          className="mb-2 h-20 w-20 rounded-full ring-4 ring-indigo-300 sm:mb-0"
        />

        {/* 標題與姓名 */}
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold">
            Li&apos;s Meet Pro 課程預約系統
          </h1>
          <p className="text-sm text-gray-600">教練：李詩民</p>
        </div>
      </header>

      {/* ---- 模式切換按鈕 ---- */}
      <ModeToggle />

      {/* ---- 時間表 ---- */}
      <TimeTable />

      {/* ---- 聯繫方式 ---- */}
      <p className="mt-6 text-sm text-gray-500">
        聯繫方式：LINE ID <code className="font-medium">0900286311</code>
      </p>
    </main>
  );
}
