import type { SlotData, SlotDisplayStatus, WeeklyTemplate } from '@/types';

export type ResolvedScheduleSlotData = SlotData & {
  templateId?: string;
  isFromWeeklyTemplate?: boolean;
};

export interface ResolvedScheduleSlot {
  status: SlotDisplayStatus;
  slot?: ResolvedScheduleSlotData;
}

export interface ResolveScheduleSlotInput {
  date: string;
  timeKey: string;
  scheduleSlot?: SlotData;
  activeTemplates: WeeklyTemplate[];
  isLoading?: boolean;
}

export function getWeekdayFromDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).getDay();
}

export function findMatchingWeeklyTemplate(
  dateKey: string,
  timeKey: string,
  activeTemplates: WeeklyTemplate[]
) {
  const weekday = getWeekdayFromDateKey(dateKey);
  return activeTemplates.find(
    (template) => template.weekday === weekday && template.timeKey === timeKey
  );
}

export function resolveScheduleSlot({
  date,
  timeKey,
  scheduleSlot,
  activeTemplates,
  isLoading = false,
}: ResolveScheduleSlotInput): ResolvedScheduleSlot {
  if (isLoading) return { status: 'loading' };

  if (scheduleSlot) {
    return { status: scheduleSlot.status, slot: scheduleSlot };
  }

  const template = findMatchingWeeklyTemplate(date, timeKey, activeTemplates);
  if (template) {
    return {
      status: 'fixed',
      slot: {
        date,
        timeKey,
        status: 'fixed',
        name: template.name,
        publicLabel: template.publicLabel,
        note: template.note,
        source: 'template',
        templateId: template.id,
        isFromWeeklyTemplate: true,
      },
    };
  }

  return { status: 'unset' };
}
