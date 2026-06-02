// types/index.ts
export type SlotStatus = 'available' | 'booked' | 'fixed' | 'off';
export type SlotDisplayStatus = SlotStatus | 'unset' | 'loading';

export interface SlotData {
  date: string;       // YYYY-MM-DD
  timeKey: string;    // e.g. 08:00
  status: SlotStatus;
  name?: string;      // booked 時顯示
}
