'use client';

import { useEffect, useState } from 'react';
import { addDays, format } from 'date-fns';
import DayHeader from './DayHeader';
import Slot from './Slot';
import { useSchedule } from '@/lib/useSchedule';

/* 時段與標籤 */
const ROWS = [
  { k: '08:00', label: '08:00-09:00' },
  { k: '09:30', label: '09:30-10:30' },
  { k: '11:00', label: '11:00-12:00' },
  { k: 'LUNCH', label: '午休時間' },
  { k: '13:30', label: '13:30-14:30' },
  { k: '15:00', label: '15:00-16:00' },
  { k: '16:30', label: '16:30-17:30' },
  { k: 'DINNER', label: '晚餐時間' },
  { k: '18:00', label: '18:00-19:00' },
  { k: '19:30', label: '19:30-20:30' },
];

/* -------- React Component -------- */
export default function TimeTable() {
  /* 用 tick 觸發午夜自動重刷 */
  const [, setTick] = useState(0);

  useEffect(() => {
    const now = new Date();
    const msToMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() -
      now.getTime();
    const tm = setTimeout(() => setTick((n) => n + 1), msToMidnight);
    return () => clearTimeout(tm);
  }, []);

  /* 今天起連續 7 天 */
  const dates = Array.from({ length: 7 }).map((_, i) =>
    addDays(new Date(), i)
  );

  const { week } = useSchedule();

  return (
    <div className="w-full overflow-x-auto">
      <table className="mx-auto rounded-lg shadow ring-1 ring-gray-200">
        <thead>
          <tr>
            <th className="w-28 bg-white"></th>
            {dates.map((d) => (
              <DayHeader key={d.toISOString()} date={d} />
            ))}
          </tr>
        </thead>

        <tbody>
          {ROWS.map(({ k, label }) =>
            k === 'LUNCH' || k === 'DINNER' ? (
              /* 午休 / 晚餐 行 */
              <tr key={k}>
                <th
                  colSpan={8}
                  className="h-8 sm:h-10 bg-gray-50 text-center text-xs sm:text-sm font-medium text-gray-500"
                >
                  {label}
                </th>
              </tr>
            ) : (
              /* 一般可互動行 */
              <tr key={k}>
                <th className="h-12 sm:h-14 w-28 bg-gray-50 text-center text-xs sm:text-sm ring-1 ring-gray-200">
                  {label}
                </th>
                {dates.map((d) => {
                  const dateKey = format(d, 'yyyy-MM-dd');
                  const slot = week[dateKey]?.[k] ?? {
                    status: 'booked' as const,
                  };
                  return (
                    <Slot
                      key={dateKey + k}
                      date={dateKey}
                      timeKey={k}
                      status={slot.status}
                      name={slot.name}
                    />
                  );
                })}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
