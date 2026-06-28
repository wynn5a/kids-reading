"use client";
import { useCallback, useEffect, useState } from "react";
import { EMPTY_PROGRESS, markRead as markReadPure, todayISO, type Progress } from "@/lib/progress";

const KEY = "kids-reading:progress:v1";

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_PROGRESS;
    const p = JSON.parse(raw);
    if (!Array.isArray(p?.readLessonIds) || typeof p?.activity !== "object" || p.activity === null) {
      return EMPTY_PROGRESS;
    }
    return { readLessonIds: p.readLessonIds, activity: p.activity };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProgress(load());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(progress));
  }, [progress, loaded]);

  const markRead = useCallback((id: number) => {
    setProgress((p) => markReadPure(p, id, todayISO()));
  }, []);

  return { progress, loaded, markRead };
}
