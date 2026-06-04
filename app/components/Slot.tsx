'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { useMode } from '@/lib/useMode';
import type { SlotDisplayStatus } from '@/lib/useSchedule';
import { useSchedule } from '@/lib/useSchedule';
import CoachSlotActionModal from './CoachSlotActionModal';
import NameModal from './NameModal';

interface Props {
  date: string;
  timeKey: string;
  status: SlotDisplayStatus;
  name?: string;
  publicLabel?: string;
  note?: string;
}

export default function Slot({
  date,
  timeKey,
  status,
  name,
  publicLabel,
  note,
}: Props) {
  const { isCoach } = useMode();
  const { setSlotByCoach, clearSlotByCoach, bookSlot, loadError } =
    useSchedule();
  const [askName, setAskName] = useState(false);
  const [showCoachActions, setShowCoachActions] = useState(false);
  const canWrite = !loadError && status !== 'loading';
  const isInteractive = canWrite && (status === 'available' || isCoach);

  const click = () => {
    if (!canWrite) return;
    if (isCoach) setShowCoachActions(true);
    else if (status === 'available') setAskName(true);
  };

  const statusStyle = {
    available:
      'bg-emerald-100 text-emerald-950 ring-emerald-300 hover:bg-emerald-200 hover:ring-emerald-500',
    booked: 'bg-stone-100 text-stone-700 ring-stone-200',
    fixed: 'bg-[#f1e8cf] text-[#5d451c] ring-[#d8c18a]',
    off: 'bg-slate-100 text-slate-500 ring-slate-200',
    unset: 'bg-[#f8f4ea] text-stone-400 ring-stone-200',
    loading: 'bg-stone-100 text-stone-500 ring-stone-200 animate-pulse',
  } satisfies Record<SlotDisplayStatus, string>;

  const studentLabel = publicLabel || name;
  const coachLabel = name || publicLabel;
  const label = {
    available: '可預約',
    booked: (isCoach ? coachLabel : studentLabel) || '已預約',
    fixed: (isCoach ? coachLabel : studentLabel) || '固定課',
    off: '未開放',
    unset: isCoach ? '尚未設定' : '暫未開放',
    loading: '載入中',
  } satisfies Record<SlotDisplayStatus, string>;
  const showCoachNote = isCoach && note && status !== 'loading';

  return (
    <>
      <td className="h-14 w-24 p-1 align-middle sm:h-14 sm:w-28">
        <button
          type="button"
          onClick={click}
          disabled={!isInteractive}
          className={clsx(
            'min-h-12 h-full w-full rounded-lg px-2 py-1 text-xs font-semibold leading-snug shadow-sm ring-1 transition sm:text-sm',
            statusStyle[status],
            isInteractive
              ? 'cursor-pointer active:scale-95'
              : 'cursor-not-allowed opacity-95'
          )}
        >
          <span className="block max-h-9 overflow-hidden break-words text-center">
            {label[status]}
          </span>
          {showCoachNote && (
            <span className="mt-0.5 block truncate text-[10px] font-normal opacity-75">
              {note}
            </span>
          )}
        </button>
      </td>

      {/* 學生輸入姓名彈窗 */}
      <NameModal
        isOpen={askName}
        onClose={() => setAskName(false)}
        onConfirm={(n) => bookSlot(date, timeKey, n)}
      />

      <CoachSlotActionModal
        isOpen={showCoachActions}
        name={name}
        publicLabel={publicLabel}
        onClose={() => setShowCoachActions(false)}
        onSetStatus={(nextStatus, options) =>
          setSlotByCoach(date, timeKey, nextStatus, options)
        }
        onClear={() => clearSlotByCoach(date, timeKey)}
      />
    </>
  );
}
