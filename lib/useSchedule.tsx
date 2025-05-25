'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { addDays, format } from 'date-fns';

/* 三種狀態：可預約 / 排休 / 已預約 */
export type SlotStatus = 'available' | 'off' | 'booked';

export interface SlotData {
  date: string;
  timeKey: string;
  status: SlotStatus;
  name?: string;
}

export type WeekSchedule = Record<string, Record<string, SlotData>>;

export const TIME_KEYS = [
  '08:00',
  '09:30',
  '11:00',
  '13:30',
  '15:00',
  '16:30',
  '18:00',
  '19:30',
] as const;

const STORAGE_KEY = 'lms-booking-schedule';

/* 預設一週：狀態一律 'booked'（橘色） */
function initEmptyWeek(): WeekSchedule {
  const today = new Date();
  const week: WeekSchedule = {};
  for (let i = 0; i < 7; i++) {
    const dateKey = format(addDays(today, i), 'yyyy-MM-dd');
    week[dateKey] = {};
    TIME_KEYS.forEach((t) => {
      week[dateKey][t] = {
        date: dateKey,
        timeKey: t,
        status: 'booked',
      };
    });
  }
  return week;
}

function loadFromStorage(): WeekSchedule {
  if (typeof window === 'undefined') return initEmptyWeek();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return initEmptyWeek();
  try {
    return JSON.parse(raw) as WeekSchedule;
  } catch {
    return initEmptyWeek();
  }
}

function saveToStorage(data: WeekSchedule) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ---------- React Context ---------- */

interface ScheduleCtx {
  week: WeekSchedule;
  bookSlot: (date: string, timeKey: string, name: string) => void;
  toggleSlotByCoach: (date: string, timeKey: string) => void;
}

const Ctx = createContext<ScheduleCtx | null>(null);

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  /* 初始為 null，避免伺服器端渲染資料 */
  const [week, setWeek] = useState<WeekSchedule | null>(null);

  /* 僅在瀏覽器端載入 localStorage */
  useEffect(() => {
    const data = loadFromStorage();
    setWeek(data);
  }, []);

  /* 資料變動後寫回 localStorage */
  useEffect(() => {
    if (week) saveToStorage(week);
  }, [week]);

  /* 若尚未載入資料，先不渲染子元件（避免 hydration mismatch） */
  if (week === null) return null;

  /* 學生預約：僅 available → booked */
  const bookSlot = (date: string, timeKey: string, name: string) => {
    setWeek((prev) => {
      if (!prev) return prev;
      const slot = prev[date][timeKey];
      if (slot.status !== 'available') return prev;
      return {
        ...prev,
        [date]: {
          ...prev[date],
          [timeKey]: { ...slot, status: 'booked', name },
        },
      };
    });
  };

  /* 教練循環切換：available → off → booked → available */
  const toggleSlotByCoach = (date: string, timeKey: string) => {
    setWeek((prev) => {
      if (!prev) return prev;
      const slot = prev[date][timeKey];
      let next: SlotStatus;
      if (slot.status === 'available') next = 'off';
      else if (slot.status === 'off') next = 'booked';
      else next = 'available';
      return {
        ...prev,
        [date]: {
          ...prev[date],
          [timeKey]: {
            ...slot,
            status: next,
            name: next === 'booked' ? slot.name : undefined,
          },
        },
      };
    });
  };

  return (
    <Ctx.Provider value={{ week, bookSlot, toggleSlotByCoach }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSchedule() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSchedule must be used inside <ScheduleProvider>');
  return ctx;
}
