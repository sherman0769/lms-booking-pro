'use client';

import Link from 'next/link';
import { addDays, format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { TIME_KEYS, useSchedule } from '@/lib/useSchedule';
import { useMode } from '@/lib/useMode';
import {
  findMatchingWeeklyTemplate,
  getWeekdayFromDateKey,
  resolveScheduleSlot,
} from '@/lib/resolveScheduleSlot';
import { useWeeklyTemplates } from '@/lib/useWeeklyTemplates';
import type { SlotData, SlotDisplayStatus, WeeklyTemplate } from '@/types';

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
type TimeKey = (typeof TIME_KEYS)[number];

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

interface SingleCancelItem {
  date: string;
  weekdayLabel: string;
  weekday: number;
  timeKey: string;
  templateId: string;
  name?: string;
  publicLabel?: string;
  note?: string;
}

type SingleCancelRangeFilter = '7' | '28' | 'all';

interface QuickTemplateSelection {
  weekday: number;
  timeKey: TimeKey;
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

export default function CoachDashboardPage() {
  const { isCoach, enterCoach } = useMode();
  const { week, isLoading, loadError, setSlotByCoach, clearSlotByCoach } = useSchedule();
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
  const [quickTemplateSelection, setQuickTemplateSelection] = useState<QuickTemplateSelection | null>(null);
  const [quickTemplateForm, setQuickTemplateForm] = useState({
    name: '',
    publicLabel: '',
    note: '',
  });
  const [templateSubmitStatus, setTemplateSubmitStatus] = useState<'idle' | 'saving'>('idle');
  const [quickTemplateSubmitStatus, setQuickTemplateSubmitStatus] = useState<'idle' | 'saving'>('idle');
  const [disablingTemplateId, setDisablingTemplateId] = useState<string | null>(null);
  const [cancelingProjectionKey, setCancelingProjectionKey] = useState<string | null>(null);
  const [undoingSingleCancelKey, setUndoingSingleCancelKey] = useState<string | null>(null);
  const [singleCancelRangeFilter, setSingleCancelRangeFilter] = useState<SingleCancelRangeFilter>('28');
  const [singleCancelWeekdayFilter, setSingleCancelWeekdayFilter] = useState('all');
  const [singleCancelTimeFilter, setSingleCancelTimeFilter] = useState('all');
  const [singleCancelKeyword, setSingleCancelKeyword] = useState('');
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
  const activeTemplateBySlot = useMemo(() => {
    const map = new Map<string, WeeklyTemplate>();
    activeTemplates.forEach((template) => {
      map.set(`${template.weekday}_${template.timeKey}`, template);
    });
    return map;
  }, [activeTemplates]);

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
        const { status } = resolveScheduleSlot({
          date: dateKey,
          timeKey,
          scheduleSlot: week[dateKey]?.[timeKey],
          activeTemplates,
        });
        if (status === 'loading') continue;
        counts[status] += 1;
      }
    }

    return counts;
  }, [activeTemplates, week, weekDates]);

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
        const template = findMatchingWeeklyTemplate(dateKey, timeKey, activeTemplates);

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

  const singleCancelOverrides = useMemo(() => {
    const items: SingleCancelItem[] = [];

    for (const dateKey of auditDates) {
      const weekday = getWeekdayFromDateKey(dateKey);
      const weekdayLabel = WEEKDAY_LABELS[weekday] ?? `weekday ${weekday}`;

      for (const timeKey of TIME_KEYS) {
        const slot = week[dateKey]?.[timeKey];
        if (
          slot?.status === 'off' &&
          slot.source === 'coach' &&
          slot.overrideType === 'leave' &&
          slot.templateId
        ) {
          const template = activeTemplates.find((item) => item.id === slot.templateId);
          items.push({
            date: dateKey,
            weekdayLabel,
            weekday,
            timeKey,
            templateId: slot.templateId,
            name: slot.name || template?.name,
            publicLabel: slot.publicLabel || template?.publicLabel,
            note: slot.note,
          });
        }
      }
    }

    return items;
  }, [activeTemplates, auditDates, week]);

  const filteredSingleCancelOverrides = useMemo(() => {
    const rangeLimit =
      singleCancelRangeFilter === '7'
        ? 7
        : singleCancelRangeFilter === '28'
          ? 28
          : AUDIT_DAYS;
    const visibleDates = new Set(auditDates.slice(0, rangeLimit));
    const keyword = singleCancelKeyword.trim().toLowerCase();

    return singleCancelOverrides.filter((item) => {
      if (!visibleDates.has(item.date)) return false;
      if (singleCancelWeekdayFilter !== 'all' && item.weekday !== Number(singleCancelWeekdayFilter)) {
        return false;
      }
      if (singleCancelTimeFilter !== 'all' && item.timeKey !== singleCancelTimeFilter) {
        return false;
      }
      if (!keyword) return true;

      const searchable = [
        item.name,
        item.publicLabel,
        item.note,
        item.templateId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [
    auditDates,
    singleCancelKeyword,
    singleCancelOverrides,
    singleCancelRangeFilter,
    singleCancelTimeFilter,
    singleCancelWeekdayFilter,
  ]);

  const todaySlots = TIME_KEYS.map((timeKey) => {
    const { slot, status } = resolveScheduleSlot({
      date: todayKey,
      timeKey,
      scheduleSlot: week[todayKey]?.[timeKey],
      activeTemplates,
      isLoading,
    });
    return {
      timeKey,
      label: TIME_LABELS[timeKey],
      status,
      text: getDisplayText(slot, status),
      note: slot?.note,
      isFromWeeklyTemplate: Boolean(slot?.isFromWeeklyTemplate),
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

  const updateQuickTemplateForm = (field: keyof typeof quickTemplateForm, value: string) => {
    setQuickTemplateForm((current) => ({ ...current, [field]: value }));
    setTemplateMessage('');
    setTemplateError('');
  };

  const selectQuickTemplateSlot = (selection: QuickTemplateSelection) => {
    const duplicated = activeTemplateBySlot.has(`${selection.weekday}_${selection.timeKey}`);
    if (duplicated) return;

    setQuickTemplateSelection(selection);
    setQuickTemplateForm({
      name: '',
      publicLabel: '',
      note: '',
    });
    setTemplateMessage('');
    setTemplateError('');
  };

  const cancelQuickTemplateCreate = () => {
    setQuickTemplateSelection(null);
    setQuickTemplateForm({
      name: '',
      publicLabel: '',
      note: '',
    });
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

  const submitQuickTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTemplateMessage('');
    setTemplateError('');

    if (!quickTemplateSelection) {
      setTemplateError('請先選擇星期與時段。');
      return;
    }
    if (!quickTemplateForm.name.trim()) {
      setTemplateError('請輸入名稱 / 班名。');
      return;
    }

    const duplicated = activeTemplateBySlot.has(
      `${quickTemplateSelection.weekday}_${quickTemplateSelection.timeKey}`
    );
    if (duplicated) {
      setTemplateError('這個星期與時段已經有固定課模板。');
      return;
    }

    setQuickTemplateSubmitStatus('saving');
    try {
      await addWeeklyTemplate({
        weekday: quickTemplateSelection.weekday,
        timeKey: quickTemplateSelection.timeKey,
        name: quickTemplateForm.name,
        publicLabel: quickTemplateForm.publicLabel,
        note: quickTemplateForm.note,
      });
      setQuickTemplateSelection(null);
      setQuickTemplateForm({
        name: '',
        publicLabel: '',
        note: '',
      });
      setTemplateMessage('已新增每週固定課模板');
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : '新增固定課模板失敗，請稍後再試。');
    } finally {
      setQuickTemplateSubmitStatus('idle');
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

  const handleCancelProjectionOnce = async (item: TemplateProjectionItem) => {
    const confirmed = window.confirm('確定要將這一天的固定課設為單次停課嗎？');
    if (!confirmed) return;

    const projectionKey = `${item.date}_${item.timeKey}_${item.templateId}`;
    setTemplateMessage('');
    setTemplateError('');
    setCancelingProjectionKey(projectionKey);

    try {
      await setSlotByCoach(item.date, item.timeKey, 'off', {
        templateId: item.templateId,
        overrideType: 'leave',
        note: '單次停課',
      });
      setTemplateMessage('已設定單次停課');
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : '設定單次停課失敗，請稍後再試。');
    } finally {
      setCancelingProjectionKey(null);
    }
  };

  const handleUndoSingleCancel = async (item: SingleCancelItem) => {
    const confirmed = window.confirm('確定要取消這次停課，恢復每週固定課嗎？');
    if (!confirmed) return;

    const overrideKey = `${item.date}_${item.timeKey}`;
    setTemplateMessage('');
    setTemplateError('');
    setUndoingSingleCancelKey(overrideKey);

    try {
      await clearSlotByCoach(item.date, item.timeKey);
      setTemplateMessage('已取消單次停課');
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : '取消單次停課失敗，請稍後再試。');
    } finally {
      setUndoingSingleCancelKey(null);
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
              <ProjectionList
                items={templateProjection.projected}
                cancelingProjectionKey={cancelingProjectionKey}
                onCancelOnce={handleCancelProjectionOnce}
              />
            )}
          </div>

          <div className="mt-4 rounded-md bg-sky-50 px-4 py-3 text-sm text-sky-900 ring-1 ring-sky-200">
            此區塊只做預覽，不會寫入 schedule。只有缺 schedule doc 的日期時段才會被列為每週固定課推導。
          </div>
        </section>

        <section className="mt-6 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">單次停課清單</h2>
              <p className="text-sm text-gray-500">
                列出今天起未來 {AUDIT_DAYS} 天內，由 schedule override 記錄的單次停課。
              </p>
            </div>
            {isLoading && <span className="text-sm font-medium text-gray-500">載入單次停課資料中...</span>}
          </div>

          <SingleCancelFilters
            rangeFilter={singleCancelRangeFilter}
            weekdayFilter={singleCancelWeekdayFilter}
            timeFilter={singleCancelTimeFilter}
            keyword={singleCancelKeyword}
            totalCount={singleCancelOverrides.length}
            filteredCount={filteredSingleCancelOverrides.length}
            onRangeChange={setSingleCancelRangeFilter}
            onWeekdayChange={setSingleCancelWeekdayFilter}
            onTimeChange={setSingleCancelTimeFilter}
            onKeywordChange={setSingleCancelKeyword}
          />

          {filteredSingleCancelOverrides.length === 0 ? (
            <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
              目前沒有符合條件的單次停課。
            </p>
          ) : (
            <SingleCancelList
              items={filteredSingleCancelOverrides}
              undoingSingleCancelKey={undoingSingleCancelKey}
              onUndo={handleUndoSingleCancel}
            />
          )}

          <div className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
            取消單次停課會刪除該日期時段的 schedule override。若 weeklyTemplate 仍為 active，固定課會重新顯示。
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
                {slot.isFromWeeklyTemplate && (
                  <div className="mt-1 text-xs font-semibold opacity-80">每週固定</div>
                )}
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

          <WeeklyTemplateQuickCreateGrid
            activeTemplateBySlot={activeTemplateBySlot}
            selectedSlot={quickTemplateSelection}
            form={quickTemplateForm}
            submitStatus={quickTemplateSubmitStatus}
            onSelectSlot={selectQuickTemplateSlot}
            onUpdateForm={updateQuickTemplateForm}
            onCancel={cancelQuickTemplateCreate}
            onSubmit={submitQuickTemplate}
          />

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

function ProjectionList({
  items,
  cancelingProjectionKey,
  onCancelOnce,
}: {
  items: TemplateProjectionItem[];
  cancelingProjectionKey: string | null;
  onCancelOnce: (item: TemplateProjectionItem) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-sky-200">
      <table className="w-full min-w-[960px] text-left text-sm">
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
            <th className="px-3 py-2">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sky-100">
          {items.map((item) => {
            const projectionKey = `${item.date}_${item.timeKey}_${item.templateId}`;
            const isCanceling = cancelingProjectionKey === projectionKey;

            return (
              <tr key={projectionKey}>
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
                <td className="px-3 py-2">
                  <button
                    type="button"
                    disabled={isCanceling}
                    onClick={() => onCancelOnce(item)}
                    className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isCanceling ? '設定中...' : '單次停課'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SingleCancelFilters({
  rangeFilter,
  weekdayFilter,
  timeFilter,
  keyword,
  totalCount,
  filteredCount,
  onRangeChange,
  onWeekdayChange,
  onTimeChange,
  onKeywordChange,
}: {
  rangeFilter: SingleCancelRangeFilter;
  weekdayFilter: string;
  timeFilter: string;
  keyword: string;
  totalCount: number;
  filteredCount: number;
  onRangeChange: (value: SingleCancelRangeFilter) => void;
  onWeekdayChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
}) {
  return (
    <div className="mb-4 rounded-md border border-amber-100 bg-amber-50/60 p-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm font-medium text-amber-950">
          顯示範圍
          <select
            value={rangeFilter}
            onChange={(event) => onRangeChange(event.target.value as SingleCancelRangeFilter)}
            className="mt-1 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none ring-amber-100 focus:ring-4"
          >
            <option value="7">未來 7 天</option>
            <option value="28">未來 28 天</option>
            <option value="all">全部可見範圍</option>
          </select>
        </label>

        <label className="block text-sm font-medium text-amber-950">
          星期
          <select
            value={weekdayFilter}
            onChange={(event) => onWeekdayChange(event.target.value)}
            className="mt-1 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none ring-amber-100 focus:ring-4"
          >
            <option value="all">全部星期</option>
            {WEEKDAY_LABELS.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-amber-950">
          時段
          <select
            value={timeFilter}
            onChange={(event) => onTimeChange(event.target.value)}
            className="mt-1 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none ring-amber-100 focus:ring-4"
          >
            <option value="all">全部時段</option>
            {TIME_KEYS.map((timeKey) => (
              <option key={timeKey} value={timeKey}>
                {TIME_LABELS[timeKey]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-amber-950">
          關鍵字
          <input
            type="search"
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            className="mt-1 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none ring-amber-100 focus:ring-4"
            placeholder="搜尋 name / note / templateId"
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-amber-900">
        目前顯示 {filteredCount} 筆，全部單次停課 {totalCount} 筆。
      </p>
    </div>
  );
}

function SingleCancelList({
  items,
  undoingSingleCancelKey,
  onUndo,
}: {
  items: SingleCancelItem[];
  undoingSingleCancelKey: string | null;
  onUndo: (item: SingleCancelItem) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-amber-200">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-amber-50 text-xs font-semibold text-amber-800">
          <tr>
            <th className="px-3 py-2">日期</th>
            <th className="px-3 py-2">星期</th>
            <th className="px-3 py-2">時段</th>
            <th className="px-3 py-2">note</th>
            <th className="px-3 py-2">templateId</th>
            <th className="px-3 py-2">狀態</th>
            <th className="px-3 py-2">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-amber-100">
          {items.map((item) => {
            const overrideKey = `${item.date}_${item.timeKey}`;
            const isUndoing = undoingSingleCancelKey === overrideKey;

            return (
              <tr key={overrideKey}>
                <td className="px-3 py-2 font-medium text-gray-800">{item.date}</td>
                <td className="px-3 py-2 text-gray-700">{item.weekdayLabel}</td>
                <td className="px-3 py-2 text-gray-700">
                  {TIME_LABELS[item.timeKey as keyof typeof TIME_LABELS] ?? item.timeKey}
                </td>
                <td className="px-3 py-2 text-gray-700">{item.note || '-'}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{item.templateId}</td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                    單次停課
                  </span>
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    disabled={isUndoing}
                    onClick={() => onUndo(item)}
                    className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-amber-200 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    {isUndoing ? '取消中...' : '取消單次停課'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WeeklyTemplateQuickCreateGrid({
  activeTemplateBySlot,
  selectedSlot,
  form,
  submitStatus,
  onSelectSlot,
  onUpdateForm,
  onCancel,
  onSubmit,
}: {
  activeTemplateBySlot: Map<string, WeeklyTemplate>;
  selectedSlot: QuickTemplateSelection | null;
  form: { name: string; publicLabel: string; note: string };
  submitStatus: 'idle' | 'saving';
  onSelectSlot: (selection: QuickTemplateSelection) => void;
  onUpdateForm: (field: keyof { name: string; publicLabel: string; note: string }, value: string) => void;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const selectedSlotKey = selectedSlot ? `${selectedSlot.weekday}_${selectedSlot.timeKey}` : null;
  const selectedWeekdayLabel = selectedSlot ? WEEKDAY_LABELS[selectedSlot.weekday] : '';
  const selectedTimeLabel = selectedSlot
    ? TIME_LABELS[selectedSlot.timeKey as keyof typeof TIME_LABELS] ?? selectedSlot.timeKey
    : '';

  return (
    <div className="mb-5 rounded-md border border-sky-100 bg-sky-50/60 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-sky-950">星期 × 時段快速新增固定課</h3>
          <p className="text-sm text-sky-800">
            點選空白格快速建立固定課。已設定格只顯示目前 active template，不提供編輯或停用。
          </p>
        </div>
        <span className="text-xs font-semibold text-sky-700">手機可左右滑動查看完整表格</span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border border-sky-200 bg-white">
        <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-sm">
          <thead className="bg-sky-50 text-xs font-semibold text-sky-800">
            <tr>
              <th className="sticky left-0 z-20 w-28 border-b border-sky-200 bg-sky-50 px-3 py-2">
                時段
              </th>
              {WEEKDAY_LABELS.map((label) => (
                <th key={label} className="border-b border-sky-200 px-3 py-2 text-center">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_KEYS.map((timeKey) => (
              <tr key={timeKey} className="border-b border-sky-100">
                <th className="sticky left-0 z-10 border-b border-sky-100 bg-white px-3 py-2 text-xs font-semibold text-gray-700">
                  {TIME_LABELS[timeKey]}
                </th>
                {WEEKDAY_LABELS.map((weekdayLabel, weekday) => {
                  const slotKey = `${weekday}_${timeKey}`;
                  const template = activeTemplateBySlot.get(slotKey);
                  const isSelected = selectedSlotKey === slotKey;
                  const displayName = template?.name || template?.publicLabel || '固定課';

                  return (
                    <td key={slotKey} className="border-b border-sky-100 px-2 py-2 align-top">
                      {template ? (
                        <div className="min-h-16 rounded-md border border-sky-200 bg-sky-100 px-2 py-2 text-sky-950">
                          <p className="line-clamp-2 text-xs font-bold">{displayName}</p>
                          {template.publicLabel && template.publicLabel !== template.name && (
                            <p className="mt-1 line-clamp-1 text-[11px] text-sky-800">
                              {template.publicLabel}
                            </p>
                          )}
                          <p className="mt-2 text-[11px] font-semibold text-sky-700">已設定</p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectSlot({ weekday, timeKey })}
                          className={`flex min-h-16 w-full flex-col items-center justify-center rounded-md border border-dashed px-2 py-2 text-xs font-semibold transition ${
                            isSelected
                              ? 'border-indigo-400 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-100'
                              : 'border-gray-300 bg-white text-gray-500 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800'
                          }`}
                          aria-label={`新增 ${weekdayLabel} ${TIME_LABELS[timeKey]} 固定課`}
                        >
                          <span className="text-lg leading-none">＋</span>
                          <span className="mt-1">新增</span>
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSlot && (
        <form
          className="mt-4 rounded-md border border-indigo-100 bg-white p-4"
          onSubmit={onSubmit}
        >
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-indigo-900">
                新增：{selectedWeekdayLabel} · {selectedTimeLabel}
              </p>
              <p className="text-xs text-gray-500">此操作會新增 active weeklyTemplate，不會寫入 schedule。</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="w-fit rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200"
            >
              取消
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm font-medium text-gray-700">
              名稱 / 班名
              <input
                value={form.name}
                onChange={(event) => onUpdateForm('name', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-4"
                placeholder="王同學、LMS 固定班"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              公開顯示名稱
              <input
                value={form.publicLabel}
                onChange={(event) => onUpdateForm('publicLabel', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-4"
                placeholder="私人訓練固定課"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              備註
              <input
                value={form.note}
                onChange={(event) => onUpdateForm('note', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring-4"
                placeholder="只給教練端看的內部備註"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={submitStatus === 'saving'}
            className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {submitStatus === 'saving' ? '新增中...' : '新增固定課'}
          </button>
        </form>
      )}
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
