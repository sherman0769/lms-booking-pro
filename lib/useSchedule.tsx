'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  FirestoreDataConverter,
} from 'firebase/firestore';
import { addDays, format } from 'date-fns';
import { db } from './firebase';

/* ------------ 型別 ------------ */
export type SlotStatus = 'available' | 'off' | 'booked';

export interface SlotData {
  date: string;
  timeKey: string;
  status: SlotStatus;
  name?: string;
}

export type WeekSchedule = Record<string, Record<string, SlotData>>;

/* 固定 8 個時段 key */
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

/* ------------ Firestore Converter ------------ */
const converter: FirestoreDataConverter<SlotData> = {
  toFirestore: (d) => {
    // Firestore 不接受 undefined 欄位，需先過濾
    const data: Record<string, any> = { ...d };
    if (data.name === undefined) delete data.name;
    return data;
  },
  fromFirestore: (snap) => snap.data() as SlotData,
};

/* ------------ React Context ------------ */
interface ScheduleCtx {
  week: WeekSchedule;
  bookSlot: (d: string, t: string, n: string) => void;
  toggleSlotByCoach: (d: string, t: string) => void;
}

const Ctx = createContext<ScheduleCtx | null>(null);

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const [week, setWeek] = useState<WeekSchedule>({});

  /* 1) 初始載入 & 即時監聽 */
  useEffect(() => {
    const col = collection(db, 'schedule').withConverter(converter);

    // 一次性載入
    getDocs(col).then((snap) => {
      const data: WeekSchedule = {};
      snap.forEach((d) => {
        const s = d.data();
        if (!data[s.date]) data[s.date] = {};
        data[s.date][s.timeKey] = s;
      });
      setWeek(data);
    });

    // 即時監聽
    const unsub = onSnapshot(col, (snap) => {
      setWeek((prev) => {
        const copy = { ...prev };
        snap.docChanges().forEach((chg) => {
          const s = chg.doc.data();
          if (!copy[s.date]) copy[s.date] = {};
          copy[s.date][s.timeKey] = s;
        });
        return copy;
      });
    });

    return () => unsub();
  }, []);

  /* 2) 學生預約 */
  const bookSlot = async (date: string, timeKey: string, name: string) => {
    const id = `${date}_${timeKey}`;
    await setDoc(
      doc(db, 'schedule', id).withConverter(converter),
      { date, timeKey, status: 'booked', name },
      { merge: true }
    );
  };

  /* 3) 教練切換狀態 */
  const toggleSlotByCoach = async (date: string, timeKey: string) => {
    const cur = week[date]?.[timeKey];
    let next: SlotStatus = 'available';
    if (!cur || cur.status === 'available') next = 'off';
    else if (cur.status === 'off') next = 'booked';

    const id = `${date}_${timeKey}`;
    await setDoc(
      doc(db, 'schedule', id).withConverter(converter),
      {
        date,
        timeKey,
        status: next,
        name: next === 'booked' ? cur?.name : undefined,
      },
      { merge: true }
    );
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
