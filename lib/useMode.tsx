'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const PASS_KEY = 'lms-booking-pass';
const DEFAULT_PASS = '123456';

interface ModeCtx {
  isCoach: boolean;
  enterCoach: (pass: string) => boolean;
  exitCoach: () => void;
  changePassword: (oldP: string, newP: string) => boolean;
}

const Ctx = createContext<ModeCtx | null>(null);

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [isCoach, setIsCoach] = useState(false);
  const [password, setPassword] = useState(DEFAULT_PASS);

  // 讀取儲存的密碼
  useEffect(() => {
    const p = localStorage.getItem(PASS_KEY);
    if (p) setPassword(p);
  }, []);

  /* 進入教練模式 */
  const enterCoach = (pass: string) => {
    if (pass === password) {
      setIsCoach(true);
      return true;
    }
    return false;
  };

  /* 返回學生模式 */
  const exitCoach = () => setIsCoach(false);

  /* 修改密碼（這裡先保留 API，UI 之後再加） */
  const changePassword = (oldP: string, newP: string) => {
    if (oldP === password) {
      setPassword(newP);
      localStorage.setItem(PASS_KEY, newP);
      return true;
    }
    return false;
  };

  const value: ModeCtx = { isCoach, enterCoach, exitCoach, changePassword };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMode() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMode 必須在 <ModeProvider> 內使用');
  return ctx;
}
