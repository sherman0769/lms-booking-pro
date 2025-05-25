'use client';

import { ScheduleProvider } from '@/lib/useSchedule';
import { ModeProvider } from '@/lib/useMode';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ModeProvider>
      <ScheduleProvider>{children}</ScheduleProvider>
    </ModeProvider>
  );
}
