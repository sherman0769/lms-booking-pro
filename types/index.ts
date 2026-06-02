// types/index.ts
export type SlotStatus = 'available' | 'booked' | 'fixed' | 'off';
export type SlotDisplayStatus = SlotStatus | 'unset' | 'loading';

export interface SlotData {
  date: string;       // YYYY-MM-DD
  timeKey: string;    // e.g. 08:00
  status: SlotStatus;
  name?: string;      // 姓名、班名或固定課名稱
  publicLabel?: string; // 學生端優先顯示的公開名稱
  note?: string;      // 教練端內部備註
  updatedAt?: unknown;
  source?: 'coach' | 'student' | 'system' | 'template';
}

export interface WeeklyTemplate {
  id: string;
  weekday: number;    // JS Date.getDay(): 0 = Sunday, 1 = Monday, ... 6 = Saturday
  timeKey: string;    // e.g. 08:00
  status: 'fixed';
  name?: string;      // 姓名、班名或固定課名稱
  publicLabel?: string; // 學生端可使用的公開名稱
  note?: string;      // 教練端內部備註
  active: boolean;
  source: 'coach';
  createdAt?: unknown;
  updatedAt?: unknown;
}
