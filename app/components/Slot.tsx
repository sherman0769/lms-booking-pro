'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { useMode } from '@/lib/useMode';
import type { SlotDisplayStatus } from '@/lib/useSchedule';
import { useSchedule } from '@/lib/useSchedule';
import NameModal from './NameModal';

interface Props {
  date: string;
  timeKey: string;
  status: SlotDisplayStatus;
  name?: string;
}

export default function Slot({ date, timeKey, status, name }: Props) {
  const { isCoach } = useMode();
  const { toggleSlotByCoach, bookSlot, loadError } = useSchedule();
  const [askName, setAskName] = useState(false);
  const canWrite = !loadError && status !== 'loading';
  const isInteractive = canWrite && (status === 'available' || isCoach);

  const click = () => {
    if (!canWrite) return;
    if (isCoach) toggleSlotByCoach(date, timeKey);
    else if (status === 'available') setAskName(true);
  };

  const statusStyle = {
    available:
      'bg-emerald-100 text-emerald-900 ring-emerald-300 hover:bg-emerald-200 hover:ring-emerald-500',
    booked: 'bg-rose-50 text-rose-800 ring-rose-200',
    fixed: 'bg-sky-50 text-sky-800 ring-sky-200',
    off: 'bg-slate-100 text-slate-600 ring-slate-200',
    unset: 'bg-amber-50 text-amber-800 ring-amber-200',
    loading: 'bg-gray-100 text-gray-500 ring-gray-200 animate-pulse',
  } satisfies Record<SlotDisplayStatus, string>;

  const label = {
    available: '可預約',
    booked: isCoach && name ? name : '已預約',
    fixed: isCoach && name ? name : '固定課',
    off: '未開放',
    unset: isCoach ? '尚未設定' : '暫未開放',
    loading: '載入中',
  } satisfies Record<SlotDisplayStatus, string>;

  return (
    <>
      <td className="h-12 sm:h-14 w-20 sm:w-28 p-1 align-middle">
        <button
          type="button"
          onClick={click}
          disabled={!isInteractive}
          className={clsx(
            'h-full w-full rounded-md px-1 text-xs font-semibold leading-tight shadow-sm ring-1 transition sm:text-sm',
            statusStyle[status],
            isInteractive
              ? 'cursor-pointer active:scale-95'
              : 'cursor-not-allowed opacity-90'
          )}
        >
          {label[status]}
        </button>
      </td>

      {/* 學生輸入姓名彈窗 */}
      <NameModal
        isOpen={askName}
        onClose={() => setAskName(false)}
        onConfirm={(n) => bookSlot(date, timeKey, n)}
      />
    </>
  );
}
