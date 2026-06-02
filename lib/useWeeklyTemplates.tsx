'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  FirestoreDataConverter,
  getDocs,
  onSnapshot,
  query,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import type { WeeklyTemplate } from '@/types';

const converter: FirestoreDataConverter<WeeklyTemplate> = {
  toFirestore: (template) => {
    const data: Record<string, unknown> = { ...template };
    delete data.id;
    if (data.name === undefined) delete data.name;
    if (data.publicLabel === undefined) delete data.publicLabel;
    if (data.note === undefined) delete data.note;
    return data;
  },
  fromFirestore: (snap) => {
    const data = snap.data();
    return {
      id: snap.id,
      ...data,
    } as WeeklyTemplate;
  },
};

interface WeeklyTemplatesState {
  templates: WeeklyTemplate[];
  activeTemplates: WeeklyTemplate[];
  isLoading: boolean;
  loadError: string | null;
}

export function useWeeklyTemplates(enabled = true): WeeklyTemplatesState {
  const [templates, setTemplates] = useState<WeeklyTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setTemplates([]);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    if (!isFirebaseConfigured) {
      setLoadError('尚未設定 Firebase 環境變數，固定課模板暫時無法讀取。');
      setIsLoading(false);
      return;
    }

    const weeklyTemplatesQuery = query(
      collection(db, 'weeklyTemplates').withConverter(converter)
    );

    getDocs(weeklyTemplatesQuery)
      .then((snap) => {
        setTemplates(snap.docs.map((docSnap) => docSnap.data()));
        setLoadError(null);
      })
      .catch((err) => {
        console.warn('Failed to load weeklyTemplates', err);
        setLoadError('固定課模板載入失敗，請確認 Firebase 設定。');
      })
      .finally(() => {
        setIsLoading(false);
      });

    const unsub = onSnapshot(
      weeklyTemplatesQuery,
      (snap) => {
        setTemplates(snap.docs.map((docSnap) => docSnap.data()));
        setLoadError(null);
        setIsLoading(false);
      },
      (err) => {
        console.warn('Failed to subscribe weeklyTemplates', err);
        setLoadError('固定課模板同步失敗，請確認 Firebase 設定。');
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [enabled]);

  const activeTemplates = useMemo(
    () =>
      templates
        .filter((template) => template.active)
        .sort((a, b) => a.weekday - b.weekday || a.timeKey.localeCompare(b.timeKey)),
    [templates]
  );

  return {
    templates,
    activeTemplates,
    isLoading,
    loadError,
  };
}
