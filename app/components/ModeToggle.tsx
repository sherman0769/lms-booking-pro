'use client';

import { useState } from 'react';
import { useMode } from '@/lib/useMode';
import PasswordModal from './PasswordModal';

export default function ModeToggle() {
  const { isCoach, exitCoach } = useMode();
  const [showPass, setShowPass] = useState(false);

  const click = () => (isCoach ? exitCoach() : setShowPass(true));

  return (
    <>
      <button
        onClick={click}
        className="fixed bottom-6 right-6 z-30 rounded-full bg-emerald-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(6,78,59,0.28)] ring-1 ring-white/30 transition hover:bg-emerald-900 active:scale-95 sm:static sm:mb-4"
      >
        {isCoach ? '學生模式' : '教練模式'}
      </button>

      <PasswordModal isOpen={showPass} onClose={() => setShowPass(false)} />
    </>
  );
}
