'use client';

import { useEffect, useState } from 'react';
import type { SlotStatus } from '@/lib/useSchedule';

interface Props {
  isOpen: boolean;
  name?: string;
  publicLabel?: string;
  onClose: () => void;
  onClear: () => void;
  onSetStatus: (
    status: SlotStatus,
    options?: { name?: string; publicLabel?: string }
  ) => void;
}

export default function CoachSlotActionModal({
  isOpen,
  name,
  publicLabel,
  onClose,
  onClear,
  onSetStatus,
}: Props) {
  const [fixedName, setFixedName] = useState(name ?? '');
  const [fixedPublicLabel, setFixedPublicLabel] = useState(publicLabel ?? '');

  useEffect(() => {
    if (isOpen) {
      setFixedName(name ?? '');
      setFixedPublicLabel(publicLabel ?? '');
    }
  }, [isOpen, name, publicLabel]);

  if (!isOpen) return null;

  const setFixed = () => {
    onSetStatus('fixed', {
      name: fixedName,
      publicLabel: fixedPublicLabel,
    });
    onClose();
  };

  const clear = () => {
    if (!window.confirm('確定要清除這個時段設定嗎？')) return;
    onClear();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-80 rounded-lg bg-white p-5 shadow-lg">
        <h2 className="mb-4 text-lg font-bold">設定時段狀態</h2>

        <div className="space-y-2">
          <button
            className="w-full rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white"
            onClick={() => {
              onSetStatus('available');
              onClose();
            }}
          >
            設為可預約
          </button>

          <div className="rounded border border-gray-200 p-3">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              固定課名稱或班名
            </label>
            <input
              value={fixedName}
              onChange={(e) => setFixedName(e.target.value)}
              placeholder="可留空"
              className="mb-2 w-full rounded border px-2 py-1 text-sm"
            />
            <label className="mb-2 block text-sm font-medium text-gray-700">
              公開顯示名稱
            </label>
            <input
              value={fixedPublicLabel}
              onChange={(e) => setFixedPublicLabel(e.target.value)}
              placeholder="留空則顯示名稱或班名"
              className="mb-2 w-full rounded border px-2 py-1 text-sm"
            />
            <button
              className="w-full rounded bg-sky-600 px-3 py-2 text-sm font-medium text-white"
              onClick={setFixed}
            >
              設為固定課
            </button>
          </div>

          <button
            className="w-full rounded bg-slate-600 px-3 py-2 text-sm font-medium text-white"
            onClick={() => {
              onSetStatus('off');
              onClose();
            }}
          >
            設為未開放
          </button>

          <button
            className="w-full rounded bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900"
            onClick={clear}
          >
            清除設定
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            className="rounded bg-gray-200 px-3 py-1 text-sm"
            onClick={onClose}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
