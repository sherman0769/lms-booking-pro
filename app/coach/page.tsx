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
const AUDIT_DAYS = 28;

type SourceKey = 'coach' | 'student' | 'template' | 'system' | 'missing';
type StatusKey = 'available' | 'booked' | 'fixed' | 'off' | 'other';

interface AuditRiskItem {
  date: string;
  timeKey: string;
  name?: string;
  publicLabel?: string;
  note?: string;
}

interface TemplateProjectionItem {
  date: string;
  weekdayLabel: string;
  timeKey: string;
  templateId: string;
  name?: string;
  publicLabel?: string;
  note?: string;
}

function getDisplayText(slot: SlotData | undefined, status: SlotDisplayStatus) {
  if (!slot) return STATUS_LABELS[status];
  if (status === 'booked' || status === 'fixed') {
    return slot.name || slot.publicLabel || STATUS_LABELS[status];
  }
  return STATUS_LABELS[status];
}

function getSourceKey(source: SlotData['source']): SourceKey {
  if (source === 'coach' || source === 'student' || source === 'template' || source === 'system') {
    return source;
  }
  return 'missing';
}

function getStatusKey(status: SlotData['status'] | undefined): StatusKey {
  if (status === 'available' || status === 'booked' || status === 'fixed' || status === 'off') {
    return status;
  }
  return 'other';
}

function toAuditRiskItem(date: string, timeKey: string, slot: SlotData): AuditRiskItem {
  return {
    date,
    timeKey,
    name: slot.name,
    publicLabel: slot.publicLabel,
    note: slot.note,
  };
}

function getWeekdayFromDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).getDay();
}

function findActiveTemplateForSlot(
  templates: WeeklyTemplate[],
  dateKey: string,
  timeKey: string
) {
  const weekday = getWeekdayFromDateKey(dateKey);
  return templates.find(
    (template) => template.weekday === weekday && template.timeKey === timeKey
  );
}

export default function CoachDashboardPage() {
  const { isCoach, enterCoach } = useMode();
  const { week, isLoading, loadError } = useSchedule();
  const {
    activeTemplates,
    isLoading: isLoadingWeeklyTemplates,
    loadError: weeklyTemplatesError,
    addWeeklyTemplate,
    disableWeeklyTemplate,
  } = useWeeklyTemplates(isCoach);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [templateForm, setTemplateForm] = useState({
    weekday: '1',
    timeKey: TIME_KEYS[0],
    name: '',
    publicLabel: '',
    note: '',
  });
  const [templateSubmitStatus, setTemplateSubmitStatus] = useState<'idle' | 'saving'>('idle');
  const [disablingTemplateId, setDisablingTemplateId] = useState<string | null>(null);
  const [templateMessage, setTemplateMessage] = useState('');
  const [templateError, setTemplateError] = useState('');

  const today = useMemo(() => new Date(), []);
  const todayKey = format(today, 'yyyy-MM-dd');
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => format(addDays(today, index), 'yyyy-MM-dd')),
    [today]
  );
  const auditDates = useMemo(
    () => Array.from({ length: AUDIT_DAYS }, (_, index) => format(addDays(today, index), 'yyyy-MM-dd')),
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

  const scheduleAudit = useMemo(() => {
    const statusCounts: Record<StatusKey, number> = {
      available: 0,
      booked: 0,
      fixed: 0,
      off: 0,
      other: 0,
    };
    const sourceCounts: Record<SourceKey, number> = {
      coach: 0,
      student: 0,
      template: 0,
      system: 0,
      missing: 0,
    };
    const missingSource = {
      booked: [] as AuditRiskItem[],
      off: [] as AuditRiskItem[],
      available: [] as AuditRiskItem[],
    };
    let scheduleDocCount = 0;
    let hasNameCount = 0;
    let hasPublicLabelCount = 0;
    let hasNoteCount = 0;

    for (const dateKey of auditDates) {
      for (const timeKey of TIME_KEYS) {
        const slot = week[dateKey]?.[timeKey];
        if (!slot) continue;

        scheduleDocCount += 1;
        statusCounts[getStatusKey(slot.status)] += 1;
        const sourceKey = getSourceKey(slot.source);
        sourceCounts[sourceKey] += 1;

        if (slot.name) hasNameCount += 1;
        if (slot.publicLabel) hasPublicLabelCount += 1;
        if (slot.note) hasNoteCount += 1;

        if (sourceKey === 'missing') {
          if (slot.status === 'booked') {
            missingSource.booked.push(toAuditRiskItem(dateKey, timeKey, slot));
          } else if (slot.status === 'off') {
            missingSource.off.push(toAuditRiskItem(dateKey, timeKey, slot));
          } else if (slot.status === 'available') {
            missingSource.available.push(toAuditRiskItem(dateKey, timeKey, slot));
          }
        }
      }
    }

    const totalSlots = auditDates.length * TIME_KEYS.length;
    return {
      totalSlots,
      scheduleDocCount,
      missingScheduleDocCount: totalSlots - scheduleDocCount,
      hasNameCount,
      hasPublicLabelCount,
      hasNoteCount,
      statusCounts,
      sourceCounts,
      missingSource,
    };
  }, [auditDates, week]);

  const templateProjection = useMemo(() => {
    const projected: TemplateProjectionItem[] = [];
    let blockedByScheduleCount = 0;
    let emptyWithoutTemplateCount = 0;

    for (const dateKey of auditDates) {
      const weekday = getWeekdayFromDateKey(dateKey);
      const weekdayLabel = WEEKDAY_LABELS[weekday] ?? `weekday ${weekday}`;

      for (const timeKey of TIME_KEYS) {
        const slot = week[dateKey]?.[timeKey];
        const template = findActiveTemplateForSlot(activeTemplates, dateKey, timeKey);

        if (slot) {
          if (template) blockedByScheduleCount += 1;
          continue;
        }

        if (template) {
          projected.push({
            date: dateKey,
            weekdayLabel,
            timeKey,
            templateId: template.id,
            name: template.name,
            publicLabel: template.publicLabel,
            note: template.note,
          });
        } else {
          emptyWithoutTemplateCount += 1;
        }
      }
    }

    return {
      activeTemplateCount: activeTemplates.length,
      projectedCount: projected.length,
      blockedByScheduleCount,
      emptyWithoutTemplateCount,
      projected,
    };
  }, [activeTemplates, auditDates, week]);

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

  const updateTemplateForm = (field: keyof typeof templateForm, value: string) => {
    setTemplateForm((current) => ({ ...current, [field]: value }));
    setTemplateMessage('');
    setTemplateError('');
  };

  const submitTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTemplateMessage('');
    setTemplateError('');

    if (!templateForm.name.trim()) {
      setTemplateError('請輸入名稱 / 班名。');
      return;
    }

    const duplicated = activeTemplates.some(
      (template) =>
        template.weekday === Number(templateForm.weekday) &&
        template.timeKey === templateForm.timeKey
    );
    if (duplicated) {
      setTemplateError('這個星期與時段已經有固定課模板。');
      return;
    }

    setTemplateSubmitStatus('saving');
    try {
      await addWeeklyTemplate({
        weekday: Number(templateForm.weekday),
        timeKey: templateForm.timeKey,
        name: templateForm.name,
        publicLabel: templateForm.publicLabel,
        note: templateForm.note,
      });
      setTemplateForm({
        weekday: '1',
        timeKey: TIME_KEYS[0],
        name: '',
        publicLabel: '',
        note: '',
      });
      setTemplateMessage('已新增每週固定課模板');
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : '新增固定課模板失敗，請稍後再試。');
    } finally {
      setTemplateSubmitStatus('idle');
    }
  };

  const handleDisableTemplate = async (template: WeeklyTemplate) => {
    const confirmed = window.confirm('確定要停用這個固定課模板嗎？');
    if (!confirmed) return;

    setTemplateMessage('');
    setTemplateError('');
    setDisablingTemplateId(template.id);

    try {
      await disableWeeklyTemplate(template.id);
      setTemplateMessage('已停用固定課模板');
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : '停用固定課模板失敗，請稍後再試。');
    } finally {
      setDisablingTemplateId(null);
    }
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
              <h2 className="text-lg font-bold">每週固定課未來推導預覽</h2>
              <p className="text-sm text-gray-500">
                只讀預覽今天起未來 {AUDIT_DAYS} 天中，缺 schedule doc 且符合 active weeklyTemplates 的時段。
              </p>
            </div>
            {isLoadingWeeklyTemplates && (
              <span className="text-sm font-medium text-gray-500">載入固定課模板中...</span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AuditMetric label="active templates" value={templateProjection.activeTemplateCount} />
            <AuditMetric label="可推導固定課" value={templateProjection.projectedCount} />
            <AuditMetric label="被 schedule 擋住" value={templateProjection.blockedByScheduleCount} />
            <AuditMetric label="空白且無 template" value={templateProjection.emptyWithoutTemplateCount} />
          </div>

          <div className="mt-4">
            {!isLoadingWeeklyTemplates && activeTemplates.length === 0 ? (
              <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
                目前尚未設定每週固定課模板。
              </p>
            ) : templateProjection.projected.length === 0 ? (
              <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
                目前沒有可推導的空白時段，因為對應日期時段已有單日 schedule 資料。
              </p>
            ) : (
              <ProjectionList items={templateProjection.projected} />
            )}
          </div>

          <div className="mt-4 rounded-md bg-sky-50 px-4 py-3 text-sm text-sky-900 ring-1 ring-sky-200">
            此區塊只做預覽，不會寫入 schedule。只有缺 schedule doc 的日期時段才會被列為每週固定課推導。
          </div>
        </section>

        <section className="mt-6 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">排程資料健康檢查</h2>
              <p className="text-sm text-gray-500">
                只讀盤點今天起未來 {AUDIT_DAYS} 天、每天 {TIME_KEYS.length} 個時段的 schedule 資料。
              </p>
            </div>
            {isLoading && <span className="text-sm font-medium text-gray-500">載入盤點資料中...</span>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AuditMetric label="總格數" value={scheduleAudit.totalSlots} />
            <AuditMetric label="有 schedule doc" value={scheduleAudit.scheduleDocCount} />
            <AuditMetric label="缺 schedule doc" value={scheduleAudit.missingScheduleDocCount} />
            <AuditMetric label="有 name" value={scheduleAudit.hasNameCount} />
            <AuditMetric label="有 publicLabel" value={scheduleAudit.hasPublicLabelCount} />
            <AuditMetric label="有 note" value={scheduleAudit.hasNoteCount} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <AuditCountTable
              title="status 統計"
              rows={[
                ['available', scheduleAudit.statusCounts.available],
                ['booked', scheduleAudit.statusCounts.booked],
                ['fixed', scheduleAudit.statusCounts.fixed],
                ['off', scheduleAudit.statusCounts.off],
                ['其他', scheduleAudit.statusCounts.other],
              ]}
            />
            <AuditCountTable
              title="source 統計"
              rows={[
                ['coach', scheduleAudit.sourceCounts.coach],
                ['student', scheduleAudit.sourceCounts.student],
                ['template', scheduleAudit.sourceCounts.template],
                ['system', scheduleAudit.sourceCounts.system],
                ['missing source', scheduleAudit.sourceCounts.missing],
              ]}
            />
          </div>

          <div className="mt-5 space-y-4">
            <AuditRiskList
              title="缺 source + booked"
              description="真實資料可能性高，請勿直接覆蓋。"
              items={scheduleAudit.missingSource.booked}
            />
            <AuditRiskList
              title="缺 source + off"
              description="可能是休息 / 未開放，需人工確認。"
              items={scheduleAudit.missingSource.off}
            />
            <AuditRiskList
              title="缺 source + available"
              description="可能是 placeholder 候選。"
              items={scheduleAudit.missingSource.available}
            />
          </div>

          <div className="mt-5 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
            目前 weeklyTemplates 只應覆蓋缺 schedule doc 的時段。缺 source 的舊資料暫時不應自動覆蓋。
            若要讓 weeklyTemplates 生效，需先人工確認哪些 available 舊資料可視為 placeholder。
          </div>
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
                目前先提供新增、停用與 weeklyTemplates 只讀列表，編輯功能將在後續版本加入。
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

          <form
            className="mb-5 rounded-md border border-gray-200 bg-gray-50 p-4"
            onSubmit={submitTemplate}
          >
            <h3 className="text-base font-bold">新增每週固定課</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="template-weekday">
                  星期
                </label>
                <select
                  id="template-weekday"
                  value={templateForm.weekday}
                  onChange={(event) => updateTemplateForm('weekday', event.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-4"
                >
                  {WEEKDAY_LABELS.map((label, index) => (
                    <option key={label} value={index}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="template-time">
                  時段
                </label>
                <select
                  id="template-time"
                  value={templateForm.timeKey}
                  onChange={(event) => updateTemplateForm('timeKey', event.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-4"
                >
                  {TIME_KEYS.map((timeKey) => (
                    <option key={timeKey} value={timeKey}>
                      {TIME_LABELS[timeKey]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="template-name">
                  名稱 / 班名
                </label>
                <input
                  id="template-name"
                  value={templateForm.name}
                  onChange={(event) => updateTemplateForm('name', event.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-4"
                  placeholder="王同學、LMS 固定班"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="template-public-label">
                  公開顯示名稱
                </label>
                <input
                  id="template-public-label"
                  value={templateForm.publicLabel}
                  onChange={(event) => updateTemplateForm('publicLabel', event.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-4"
                  placeholder="私人訓練固定課"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="template-note">
                備註
              </label>
              <textarea
                id="template-note"
                value={templateForm.note}
                onChange={(event) => updateTemplateForm('note', event.target.value)}
                className="min-h-20 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-4"
                placeholder="只給教練端看的內部備註"
              />
            </div>

            {templateError && (
              <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-100">
                {templateError}
              </p>
            )}
            {templateMessage && (
              <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-100">
                {templateMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={templateSubmitStatus === 'saving'}
              className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {templateSubmitStatus === 'saving' ? '新增中...' : '新增固定課模板'}
            </button>
          </form>

          {!isLoadingWeeklyTemplates && activeTemplates.length === 0 ? (
            <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
              目前尚未設定每週固定課模板。
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {activeTemplates.map((template) => (
                <WeeklyTemplateCard
                  key={template.id}
                  template={template}
                  isDisabling={disablingTemplateId === template.id}
                  onDisable={handleDisableTemplate}
                />
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

function AuditMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function AuditCountTable({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  return (
    <div className="rounded-md border border-gray-200">
      <div className="border-b border-gray-200 px-3 py-2 text-sm font-bold">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-64 text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
            <tr>
              <th className="px-3 py-2">項目</th>
              <th className="px-3 py-2 text-right">數量</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(([label, value]) => (
              <tr key={label}>
                <td className="px-3 py-2 font-medium text-gray-700">{label}</td>
                <td className="px-3 py-2 text-right text-gray-900">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditRiskList({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: AuditRiskItem[];
}) {
  return (
    <div className="rounded-md border border-gray-200">
      <div className="flex flex-col gap-1 border-b border-gray-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold">{title}</h3>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <span className="text-xs font-semibold text-gray-500">{items.length} 筆</span>
      </div>
      {items.length === 0 ? (
        <p className="px-3 py-4 text-sm text-gray-500">目前沒有符合條件的資料。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
              <tr>
                <th className="px-3 py-2">日期</th>
                <th className="px-3 py-2">時段</th>
                <th className="px-3 py-2">name</th>
                <th className="px-3 py-2">publicLabel</th>
                <th className="px-3 py-2">note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={`${item.date}-${item.timeKey}`}>
                  <td className="px-3 py-2 font-medium text-gray-700">{item.date}</td>
                  <td className="px-3 py-2 text-gray-700">{TIME_LABELS[item.timeKey as keyof typeof TIME_LABELS] ?? item.timeKey}</td>
                  <td className="px-3 py-2 text-gray-700">{item.name || '-'}</td>
                  <td className="px-3 py-2 text-gray-700">{item.publicLabel || '-'}</td>
                  <td className="px-3 py-2 text-gray-700">{item.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProjectionList({ items }: { items: TemplateProjectionItem[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-sky-200">
      <table className="w-full min-w-[840px] text-left text-sm">
        <thead className="bg-sky-50 text-xs font-semibold text-sky-800">
          <tr>
            <th className="px-3 py-2">日期</th>
            <th className="px-3 py-2">星期</th>
            <th className="px-3 py-2">時段</th>
            <th className="px-3 py-2">name</th>
            <th className="px-3 py-2">publicLabel</th>
            <th className="px-3 py-2">note</th>
            <th className="px-3 py-2">templateId</th>
            <th className="px-3 py-2">來源</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sky-100">
          {items.map((item) => (
            <tr key={`${item.date}-${item.timeKey}-${item.templateId}`}>
              <td className="px-3 py-2 font-medium text-gray-800">{item.date}</td>
              <td className="px-3 py-2 text-gray-700">{item.weekdayLabel}</td>
              <td className="px-3 py-2 text-gray-700">
                {TIME_LABELS[item.timeKey as keyof typeof TIME_LABELS] ?? item.timeKey}
              </td>
              <td className="px-3 py-2 text-gray-700">{item.name || '-'}</td>
              <td className="px-3 py-2 text-gray-700">{item.publicLabel || '-'}</td>
              <td className="px-3 py-2 text-gray-700">{item.note || '-'}</td>
              <td className="px-3 py-2 font-mono text-xs text-gray-600">{item.templateId}</td>
              <td className="px-3 py-2">
                <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">
                  每週固定推導
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeeklyTemplateCard({
  template,
  isDisabling,
  onDisable,
}: {
  template: WeeklyTemplate;
  isDisabling: boolean;
  onDisable: (template: WeeklyTemplate) => void;
}) {
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
      <button
        type="button"
        disabled={isDisabling}
        onClick={() => onDisable(template)}
        className="mt-3 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-sky-200 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:text-slate-400"
      >
        {isDisabling ? '停用中...' : '停用'}
      </button>
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
