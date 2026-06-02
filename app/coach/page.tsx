'use client';

import Link from 'next/link';
import { addDays, format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { TIME_KEYS, useSchedule, type SlotData, type SlotDisplayStatus } from '@/lib/useSchedule';
import { useMode } from '@/lib/useMode';
import { useWeeklyTemplates } from '@/lib/useWeeklyTemplates';
import type { WeeklyTemplate } from '@/types';

const TIME_LABELS: Record<(typeof TIME_KEYS)[number], string> = {
  '08:00': '08:00-09:00',
  '09:30': '09:30-10:30',
  '11:00': '11:00-12:00',
  '13:30': '13:30-14:30',
  '15:00': '15:00-16:00',
  '16:30': '16:30-17:30',
  '18:00': '18:00-19:00',
  '19:30': '19:30-20:30',
};

const STATUS_LABELS: Record<SlotDisplayStatus, string> = {
  available: '可預約',
  booked: '已預約',
  fixed: '固定課',
  off: '未開放',
  unset: '尚未設定',
  loading: '載入中',
};

const STATUS_STYLES: Record<SlotDisplayStatus, string> = {
  available: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  booked: 'border-rose-200 bg-rose-50 text-rose-900',
  fixed: 'border-sky-200 bg-sky-50 text-sky-900',
  off: 'border-slate-200 bg-slate-50 text-slate-700',
  unset: 'border-amber-200 bg-amber-50 text-amber-900',
  loading: 'border-gray-200 bg-gray-50 text-gray-500',
};

const WEEKDAY_LABELS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

function getDisplayText(slot: SlotData | undefined, status: SlotDisplayStatus) {
  if (!slot) return STATUS_LABELS[status];
  if (status === 'booked' || status === 'fixed') {
    return slot.name || slot.publicLabel || STATUS_LABELS[status];
  }
  return STATUS_LABELS[status];
}

export default function CoachDashboardPage() {
  const { isCoach, enterCoach } = useMode();
  const { week, isLoading, loadError } = useSchedule();
  const {
    activeTemplates,
    isLoading: isLoadingWeeklyTemplates,
    loadError: weeklyTemplatesError,
  } = useWeeklyTemplates(isCoach);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const today = useMemo(() => new Date(), []);
  const todayKey = format(today, 'yyyy-MM-dd');
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => format(addDays(today, index), 'yyyy-MM-dd')),
    [today]
  );

  const summary = useMemo(() => {
    const counts = {
      available: 0,
      booked: 0,
      fixed: 0,
      off: 0,
      unset: 0,
    };

    for (const dateKey of weekDates) {
      for (const timeKey of TIME_KEYS) {
        const status = week[dateKey]?.[timeKey]?.status;
        if (status) counts[status] += 1;
        else counts.unset += 1;
      }
    }

    return counts;
  }, [week, weekDates]);

  const todaySlots = TIME_KEYS.map((timeKey) => {
    const slot = week[todayKey]?.[timeKey];
    const status: SlotDisplayStatus = isLoading ? 'loading' : slot?.status ?? 'unset';
    return {
      timeKey,
      label: TIME_LABELS[timeKey],
      status,
      text: getDisplayText(slot, status),
      note: slot?.note,
    };
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (enterCoach(password)) {
      setPassword('');
      setPasswordError('');
      return;
    }
    setPasswordError('密碼錯誤，請再試一次。');
  };

  if (!isCoach) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900">
        <section className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center">
          <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <p className="mb-2 text-sm font-medium text-indigo-600">Li&apos;s Meet</p>
            <h1 className="text-2xl font-bold">Coach Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600">請輸入教練密碼進入排程管理後台。</p>

            <form className="mt-6 space-y-4" onSubmit={submit}>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="coach-password">
                  教練密碼
                </label>
                <input
                  id="coach-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-4"
                  placeholder="輸入密碼"
                />
                {passwordError && <p className="mt-2 text-sm text-rose-600">{passwordError}</p>}
              </div>

              <button
                type="submit"
                className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                進入後台
              </button>
            </form>

            <Link className="mt-4 inline-block text-sm font-medium text-gray-600 hover:text-gray-900" href="/">
              回到前台預約頁
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 text-gray-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-600">Li&apos;s Meet Coach Dashboard</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">教練排程管理後台</h1>
            <p className="mt-2 text-sm text-gray-600">
              今日日期：{format(today, 'yyyy/MM/dd（EEE）', { locale: zhTW })}
            </p>
          </div>

          <Link
            className="inline-flex w-fit items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
            href="/"
          >
            回到前台預約頁
          </Link>
        </header>

        {loadError && (
          <p className="mb-4 rounded-md bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 ring-1 ring-amber-200">
            {loadError}
          </p>
        )}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard label="可預約數" value={summary.available} className="text-emerald-700" />
          <SummaryCard label="已預約數" value={summary.booked} className="text-rose-700" />
          <SummaryCard label="固定課數" value={summary.fixed} className="text-sky-700" />
          <SummaryCard label="未開放數" value={summary.off} className="text-slate-700" />
          <SummaryCard label="尚未設定數" value={summary.unset} className="text-amber-700" />
        </section>

        <section className="mt-6 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">今日課表簡表</h2>
              <p className="text-sm text-gray-500">顯示今日 8 個主要授課時段。</p>
            </div>
            {isLoading && <span className="text-sm font-medium text-gray-500">載入預約資料中...</span>}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {todaySlots.map((slot) => (
              <div
                key={slot.timeKey}
                className={`rounded-md border p-3 ${STATUS_STYLES[slot.status]}`}
              >
                <div className="text-xs font-medium opacity-75">{slot.label}</div>
                <div className="mt-1 truncate text-sm font-bold">{slot.text}</div>
                {slot.note && <div className="mt-1 truncate text-xs opacity-75">{slot.note}</div>}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">固定課模板</h2>
              <p className="text-sm text-gray-500">
                目前先顯示 weeklyTemplates 只讀列表，新增與編輯功能將在後續版本加入。
              </p>
            </div>
            {isLoadingWeeklyTemplates && (
              <span className="text-sm font-medium text-gray-500">載入固定課模板中...</span>
            )}
          </div>

          {weeklyTemplatesError && (
            <p className="mb-4 rounded-md bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 ring-1 ring-amber-200">
              {weeklyTemplatesError}
            </p>
          )}

          {!isLoadingWeeklyTemplates && activeTemplates.length === 0 ? (
            <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
              目前尚未設定每週固定課模板。
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {activeTemplates.map((template) => (
                <WeeklyTemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}
        </section>

        <p className="mt-6 rounded-md bg-white px-4 py-3 text-sm text-gray-600 shadow-sm ring-1 ring-gray-200">
          固定課模板、學生管理、請假補課功能將在後續版本加入。
        </p>
      </div>
    </main>
  );
}

function WeeklyTemplateCard({ template }: { template: WeeklyTemplate }) {
  const displayName = template.name || template.publicLabel || '固定課';
  const publicLabel = template.publicLabel && template.publicLabel !== template.name
    ? template.publicLabel
    : null;
  const weekdayLabel = WEEKDAY_LABELS[template.weekday] ?? `weekday ${template.weekday}`;
  const timeLabel = TIME_LABELS[template.timeKey as keyof typeof TIME_LABELS] ?? template.timeKey;

  return (
    <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sky-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium opacity-75">
            {weekdayLabel} · {timeLabel}
          </p>
          <p className="mt-1 text-sm font-bold">{displayName}</p>
        </div>
        <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-semibold text-sky-700">
          固定課
        </span>
      </div>
      {publicLabel && <p className="mt-2 text-xs opacity-80">公開顯示：{publicLabel}</p>}
      {template.note && <p className="mt-1 text-xs opacity-80">備註：{template.note}</p>}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${className}`}>{value}</p>
    </div>
  );
}
