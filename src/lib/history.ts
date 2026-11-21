"use client";

import { useCallback, useRef, useState } from "react";
import type { Project } from "@/types/project";

interface HistoryState {
  past: Project[];
  present: Project;
  future: Project[];
}

/** Undo/redo with 600 ms coalescing so a clip drag is one history entry. */
export function useProjectHistory(initial: Project) {
  const [state, setState] = useState<HistoryState>({ past: [], present: initial, future: [] });
  const lastKey = useRef<string | null>(null);
  const lastAt = useRef(0);

  const commit = useCallback((next: Project | ((p: Project) => Project), key?: string) => {
    setState((s) => {
      const present = typeof next === "function" ? next(s.present) : next;
      if (present === s.present) return s;
      const now = Date.now();
      const coalesce = !!key && key === lastKey.current && now - lastAt.current < 600;
      lastKey.current = key ?? null;
      lastAt.current = now;
      return {
        past: coalesce ? s.past : [...s.past, s.present].slice(-80),
        present,
        future: [],
      };
    });
  }, []);

  const reset = useCallback((project: Project) => {
    lastKey.current = null;
    setState({ past: [], present: project, future: [] });
  }, []);

  const undo = useCallback(() => {
    lastKey.current = null;
    setState((s) => s.past.length
      ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] }
      : s);
  }, []);

  const redo = useCallback(() => {
    lastKey.current = null;
    setState((s) => s.future.length
      ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) }
      : s);
  }, []);

  return {
    project: state.present,
    commit,
    reset,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
