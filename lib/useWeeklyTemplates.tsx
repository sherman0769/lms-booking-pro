'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  FirestoreDataConverter,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import type { WeeklyTemplate } from '@/types';

export interface AddWeeklyTemplateInput {
  weekday: number;
  timeKey: string;
  name: string;
  publicLabel?: string;
  note?: string;
}

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
  addWeeklyTemplate: (input: AddWeeklyTemplateInput) => Promise<void>;
  disableWeeklyTemplate: (templateId: string) => Promise<void>;
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

  const addWeeklyTemplate = async (input: AddWeeklyTemplateInput) => {
    if (!isFirebaseConfigured) {
      throw new Error('尚未設定 Firebase 環境變數，無法新增固定課模板。');
    }

    const weekday = Number(input.weekday);
    const timeKey = input.timeKey.trim();
    const name = input.name.trim();
    const publicLabel = input.publicLabel?.trim();
    const note = input.note?.trim();

    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      throw new Error('請選擇星期。');
    }
    if (!timeKey) {
      throw new Error('請選擇時段。');
    }
    if (!name) {
      throw new Error('請輸入名稱 / 班名。');
    }

    const duplicated = activeTemplates.some(
      (template) => template.weekday === weekday && template.timeKey === timeKey
    );
    if (duplicated) {
      throw new Error('這個星期與時段已經有固定課模板。');
    }

    const data: Record<string, unknown> = {
      weekday,
      timeKey,
      status: 'fixed',
      name,
      active: true,
      source: 'coach',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (publicLabel) data.publicLabel = publicLabel;
    if (note) data.note = note;

    await addDoc(collection(db, 'weeklyTemplates'), data);
  };

  const disableWeeklyTemplate = async (templateId: string) => {
    if (!isFirebaseConfigured) {
      throw new Error('尚未設定 Firebase 環境變數，無法停用固定課模板。');
    }

    const trimmedTemplateId = templateId.trim();
    if (!trimmedTemplateId) {
      throw new Error('缺少固定課模板 ID。');
    }

    await updateDoc(doc(db, 'weeklyTemplates', trimmedTemplateId), {
      active: false,
      updatedAt: serverTimestamp(),
    });
  };

  return {
    templates,
    activeTemplates,
    isLoading,
    loadError,
    addWeeklyTemplate,
    disableWeeklyTemplate,
  };
}
