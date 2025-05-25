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
        className="fixed bottom-6 right-6 sm:static sm:mb-4 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-3 text-sm font-medium text-white shadow-lg active:scale-95"
      >
        {isCoach ? '學生模式' : '教練模式'}
      </button>

      <PasswordModal isOpen={showPass} onClose={() => setShowPass(false)} />
    </>
  );
}
