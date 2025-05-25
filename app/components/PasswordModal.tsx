'use client';

import { useState } from 'react';
import { useMode } from '@/lib/useMode';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function PasswordModal({ isOpen, onClose }: Props) {
  const { enterCoach } = useMode();
  const [input, setInput] = useState('');

  if (!isOpen) return null;

  const confirm = () => {
    if (enterCoach(input)) {
      onClose();
    } else {
      alert('密碼錯誤，請再試一次');
      setInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-72 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-bold">教練模式密碼</h2>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="輸入密碼"
          className="mb-4 w-full rounded border px-2 py-1"
        />
        <div className="flex justify-end gap-2">
          <button
            className="rounded bg-gray-200 px-3 py-1 text-sm"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
            onClick={confirm}
          >
            確認
          </button>
        </div>
      </div>
    </div>
  );
}
