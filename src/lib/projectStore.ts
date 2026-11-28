import type { Project } from "@/types/project";
import { deleteLibraryProject, loadLibraryProject, loadProject, saveLibraryProject, saveProject } from "./db";

const LIST_KEY = "pixleled_saved_projects_v1";
const AUTO_KEY = "pixleled_autosave_v1";

export interface ProjectMeta {
  id: string;
  name: string;
  savedAt: number;
  cols: number;
  rows: number;
  layerCount: number;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full */ }
}

const metaOf = (p: Project): ProjectMeta => ({
  id: p.id, name: p.name, savedAt: Date.now(),
  cols: p.hardware.cols, rows: p.hardware.rows,
  layerCount: p.layers.length,
});

export function listSavedProjects(): ProjectMeta[] {
  const v = readJson<ProjectMeta[]>(LIST_KEY, []);
  return Array.isArray(v) ? v : [];
}

export function readAutosave(): ProjectMeta | null {
  return readJson<ProjectMeta | null>(AUTO_KEY, null);
}

/** Called by the debounced autosave: keeps the library entry, live session and index in sync. */
export async function saveProjectRecord(project: Project): Promise<ProjectMeta> {
  await Promise.all([saveLibraryProject(project), saveProject(project)]);
  const meta = metaOf(project);
  writeJson(LIST_KEY, [meta, ...listSavedProjects().filter((m) => m.id !== meta.id)].slice(0, 12));
  writeJson(AUTO_KEY, meta);
  return meta;
}

export async function openSavedProject(id: string): Promise<Project | null> {
  const p = await loadLibraryProject(id);
  if (p) {
    await saveProject(p);
    writeJson(AUTO_KEY, metaOf(p));
  }
  return p;
}

export async function deleteSavedProject(id: string): Promise<void> {
  await deleteLibraryProject(id);
  writeJson(LIST_KEY, listSavedProjects().filter((m) => m.id !== id));
  if (readAutosave()?.id === id) {
    try { localStorage.removeItem(AUTO_KEY); } catch { /* ignore */ }
  }
}

export { loadProject };
