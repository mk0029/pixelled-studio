"use client";

import { useCallback, useRef, useState } from "react";
import type { Project } from "@/types/project";

export interface HistoryEntry {
  project: Project;
  label: string;
  timestamp: number;
}

interface HistoryState {
  entries: HistoryEntry[];
  index: number;
}

const initialEntry = (project: Project): HistoryEntry => ({ project, label: "Initial", timestamp: Date.now() });

export function useProjectHistory(initial: Project) {
  const [state, setState] = useState<HistoryState>(() => ({
    entries: [initialEntry(initial)],
    index: 0,
  }));
  const lastKey = useRef<string | null>(null);
  const lastAt = useRef(0);

  const commit = useCallback((next: Project | ((p: Project) => Project), label?: string) => {
    setState((s) => {
      const entries = Array.isArray(s?.entries) && s.entries.length ? s.entries : [initialEntry(initial)];
      const idx = Math.min(Math.max(0, s?.index ?? 0), entries.length - 1);
      const present = entries[idx].project;
      const resolved = typeof next === "function" ? (next as (p: Project) => Project)(present) : next;
      if (resolved === present) return { entries, index: idx };
      const now = Date.now();
      const key = label ?? null;
      const coalesce = !!key && key === lastKey.current && now - lastAt.current < 600;
      lastKey.current = key;
      lastAt.current = now;
      const newEntry = { project: resolved, label: label ?? "Edit", timestamp: now };
      if (coalesce && idx === entries.length - 1) {
        const updated = [...entries];
        updated[idx] = newEntry;
        return { entries: updated, index: idx };
      }
      const updated = [...entries.slice(0, idx + 1), newEntry].slice(-31);
      return { entries: updated, index: updated.length - 1 };
    });
  }, [initial]);

  const reset = useCallback((project: Project) => {
    lastKey.current = null;
    setState({ entries: [initialEntry(project)], index: 0 });
  }, []);

  const undo = useCallback(() => {
    lastKey.current = null;
    setState((s) => {
      const idx = s?.index ?? 0;
      return idx > 0 ? { ...s, index: idx - 1 } : s;
    });
  }, []);

  const redo = useCallback(() => {
    lastKey.current = null;
    setState((s) => {
      const entries = s?.entries ?? [];
      const idx = s?.index ?? 0;
      return idx < entries.length - 1 ? { ...s, index: idx + 1 } : s;
    });
  }, []);

  const jumpTo = useCallback((index: number) => {
    lastKey.current = null;
    setState((s) => {
      const entries = s?.entries ?? [];
      if (index >= 0 && index < entries.length) return { ...s, index };
      return s;
    });
  }, []);

  const clear = useCallback(() => {
    lastKey.current = null;
    setState((s) => {
      const entries = s?.entries ?? [];
      const idx = Math.min(Math.max(0, s?.index ?? 0), Math.max(0, entries.length - 1));
      const cur = entries[idx];
      return cur ? { entries: [cur], index: 0 } : s;
    });
  }, []);

  const safeState = state ?? { entries: [initialEntry(initial)], index: 0 };
  const currentEntry = safeState.entries[safeState.index] ?? safeState.entries[0] ?? initialEntry(initial);

  return {
    project: currentEntry.project,
    commit,
    reset,
    undo,
    redo,
    jumpTo,
    clear,
    canUndo: safeState.index > 0,
    canRedo: safeState.index < safeState.entries.length - 1,
    entries: safeState.entries,
    currentIndex: safeState.index,
  };
}
