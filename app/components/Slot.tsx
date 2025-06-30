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
    available: 'bg-orange-100 text-orange-900 hover:bg-orange-200',
    off: 'bg-red-500 text-white',
    booked: 'bg-gray-300 text-gray-600',
  }[status];

  /* 預約後按鍵加深外框 */
  const ringColor = status === 'booked' ? 'ring-gray-500' : 'ring-gray-300';

  /* 標籤文字 */
  const label =
    status === 'available' ? '可預約' : status === 'off' ? '排休' : name ?? '已預約';

  return (
    <>
      <td className="h-12 sm:h-14 w-20 sm:w-28 p-1 align-middle">
        <button
          onClick={click}
          className={clsx(
            'h-full w-full rounded-md px-1 text-xs sm:text-sm font-semibold shadow ring-1 transition active:scale-95',
            ringColor,
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
