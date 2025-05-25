'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { useMode } from '@/lib/useMode';
import { useSchedule } from '@/lib/useSchedule';
import NameModal from './NameModal';

interface Props {
  date: string;
  timeKey: string;
  status: 'available' | 'off' | 'booked';
  name?: string;
}

export default function Slot({ date, timeKey, status, name }: Props) {
  const { isCoach } = useMode();
  const { toggleSlotByCoach, bookSlot } = useSchedule();
  const [askName, setAskName] = useState(false);

  const click = () => {
    if (isCoach) toggleSlotByCoach(date, timeKey);
    else if (status === 'available') setAskName(true);
  };

  /* 顏色 class */
  const colorCls = {
    available: 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200',
    off: 'bg-red-500 text-white',
    booked: 'bg-orange-400 text-white',
  }[status];

  /* 標籤文字 */
  const label =
    status === 'available' ? '可預約' : status === 'off' ? '排休' : name ?? '已預約';

  return (
    <>
      <td className="h-12 sm:h-14 w-20 sm:w-28 p-1 align-middle">
        <button
          onClick={click}
          className={clsx(
            'h-full w-full rounded-md px-1 text-xs sm:text-sm font-semibold shadow ring-1 ring-gray-300 transition active:scale-95',
            colorCls,
            isCoach && 'cursor-pointer',
            !isCoach && status !== 'available' && 'cursor-not-allowed'
          )}
        >
          {label}
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
