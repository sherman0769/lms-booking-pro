'use client';

import Link from 'next/link';
import { useMode } from '@/lib/useMode';

export default function CoachDashboardEntry() {
  const { isCoach } = useMode();

  if (!isCoach) return null;

  return (
    <div className="mb-4 flex w-full justify-center">
      <Link
        href="/coach"
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-900/20 bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(31,61,54,0.18)] transition hover:bg-emerald-800 active:scale-95"
      >
        進入後台管理
      </Link>
    </div>
  );
}
