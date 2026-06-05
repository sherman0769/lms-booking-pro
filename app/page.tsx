import ModeToggle from './components/ModeToggle';
import TimeTable from './components/TimeTable';

export default function Home() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f5ee_0%,#eef3ed_46%,#f7f7f2_100%)] px-4 py-6 text-stone-900 sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center">
      {/* ---- 頁首：頭像 + 標題 + 姓名 ---- */}
      <header className="mb-5 flex w-full flex-col items-center gap-4 rounded-2xl border border-white/70 bg-white/80 px-5 py-5 shadow-[0_20px_60px_rgba(31,41,31,0.10)] backdrop-blur sm:flex-row sm:px-6">
        {/* 圓形頭像 */}
        <div className="rounded-full bg-gradient-to-br from-emerald-900 via-stone-700 to-amber-600 p-1 shadow-lg">
          <img
            src="/coach.png"
            alt="李詩民 教練頭像"
            className="h-20 w-20 rounded-full object-cover ring-4 ring-white sm:h-24 sm:w-24"
          />
        </div>

        {/* 標題與姓名 */}
        <div className="text-center sm:text-left">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
            Li&apos;s Meet Pro
          </p>
          <h1 className="text-2xl font-semibold tracking-normal text-stone-950 sm:text-3xl">
            Li&apos;s Meet Pro Fitness
          </h1>
          <p className="mt-1 text-sm font-medium text-stone-600">
            個人行程與課程預約系統
          </p>
          <p className="mt-2 text-sm text-emerald-900">教練：李詩民</p>
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
      </div>
    </main>
  );
}
