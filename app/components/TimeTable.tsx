'use client';

import { useEffect, useState } from 'react';
import { addDays, format } from 'date-fns';
import DayHeader from './DayHeader';
import Slot from './Slot';
import { useSchedule } from '@/lib/useSchedule';
import { resolveScheduleSlot } from '@/lib/resolveScheduleSlot';
import { useWeeklyTemplates } from '@/lib/useWeeklyTemplates';

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

function parseStartDateParam(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  return format(date, 'yyyy-MM-dd') === value ? date : null;
}

/* -------- React Component -------- */
export default function TimeTable() {
  /* 用 tick 觸發午夜自動重刷 */
  const [, setTick] = useState(0);
  const [startDateOverride, setStartDateOverride] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();
    const msToMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() -
      now.getTime();
    const tm = setTimeout(() => setTick((n) => n + 1), msToMidnight);
    return () => clearTimeout(tm);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setStartDateOverride(parseStartDateParam(params.get('start')));
  }, []);

  /* 預設今天起連續 7 天；合法 start query 只覆寫顯示起始日 */
  const baseDate = startDateOverride ?? new Date();
  const dates = Array.from({ length: 7 }).map((_, i) => addDays(baseDate, i));
  const previousWeekHref = `/?start=${format(addDays(baseDate, -7), 'yyyy-MM-dd')}`;
  const nextWeekHref = `/?start=${format(addDays(baseDate, 7), 'yyyy-MM-dd')}`;
  const rangeLabel = `${format(dates[0], 'yyyy/MM/dd')} - ${format(
    dates[6],
    'yyyy/MM/dd'
  )}`;

  const { week, isLoading, loadError } = useSchedule();
  const {
    activeTemplates,
    isLoading: isLoadingWeeklyTemplates,
    loadError: weeklyTemplatesError,
  } = useWeeklyTemplates();
  const hasScheduleData = Object.values(week).some(
    (day) => Object.keys(day).length > 0
  );
  const isResolvingSchedule = isLoading || isLoadingWeeklyTemplates;
  const hasTemplateData = activeTemplates.length > 0;
  const notice = isResolvingSchedule
    ? '載入預約資料中...'
    : loadError ??
      weeklyTemplatesError ??
      (!hasScheduleData && !hasTemplateData ? '目前尚無已設定的預約時段。' : null);

  return (
    <div className="w-full overflow-x-auto">
      <div className="mx-auto mb-3 flex w-fit max-w-full flex-col items-center gap-2 rounded-md bg-white px-3 py-2 text-sm text-gray-700 shadow-sm ring-1 ring-gray-200 sm:flex-row sm:gap-3">
        <p className="font-medium">{rangeLabel}</p>
        <div className="flex items-center gap-2">
          <a
            href={previousWeekHref}
            className="rounded-md border border-gray-200 px-3 py-1.5 font-medium text-gray-700 transition hover:bg-gray-50 active:bg-gray-100"
          >
            上一週
          </a>
          <a
            href="/"
            className="rounded-md border border-gray-200 px-3 py-1.5 font-medium text-gray-700 transition hover:bg-gray-50 active:bg-gray-100"
          >
            本週
          </a>
          <a
            href={nextWeekHref}
            className="rounded-md border border-gray-200 px-3 py-1.5 font-medium text-gray-700 transition hover:bg-gray-50 active:bg-gray-100"
          >
            下一週
          </a>
        </div>
      </div>
      {notice && (
        <p className="mx-auto mb-3 w-fit rounded-md bg-white px-3 py-2 text-center text-sm font-medium text-gray-600 shadow-sm ring-1 ring-gray-200">
          {notice}
        </p>
      )}
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
                  const { slot, status } = resolveScheduleSlot({
                    date: dateKey,
                    timeKey: k,
                    scheduleSlot: week[dateKey]?.[k],
                    activeTemplates,
                    isLoading: isResolvingSchedule,
                  });
                  return (
                    <Slot
                      key={dateKey + k}
                      date={dateKey}
                      timeKey={k}
                      status={status}
                      name={slot?.name}
                      publicLabel={slot?.publicLabel}
                      note={slot?.note}
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
