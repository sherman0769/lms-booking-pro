'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'lis-meet-install-hint-dismissed';

export default function AddToHomeScreenHint() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY) !== 'true') {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) return null;

  const dismiss = () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  return (
    <section className="mb-4 w-full sm:hidden" aria-label="加入主畫面提示">
      <div className="rounded-2xl border border-emerald-900/10 bg-white/85 px-4 py-3 text-stone-800 shadow-[0_14px_40px_rgba(31,41,31,0.10)] backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-900 text-sm font-bold text-[#f7f1e8]">
            LM
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-6">
              將 Li&apos;s Meet 加入手機主畫面，像 App 一樣快速查看課表。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsExpanded((current) => !current)}
                className="rounded-full bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
              >
                如何加入？
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600"
              >
                關閉
              </button>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 rounded-xl bg-[#f8f4ea] px-3 py-3 text-xs leading-6 text-stone-700 ring-1 ring-stone-200">
            <p>
              <span className="font-semibold text-emerald-950">iPhone Safari：</span>
              點分享按鈕 → 加入主畫面
            </p>
            <p>
              <span className="font-semibold text-emerald-950">Android Chrome：</span>
              點右上角選單 → 加到主畫面 / 安裝應用程式
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
