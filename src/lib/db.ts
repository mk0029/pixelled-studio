import type { Project } from "@/types/project";

const DB_NAME = "tohran-led-studio";
const STORE = "projects";
const LIBRARY = "library";
const KEY = "current";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(LIBRARY)) db.createObjectStore(LIBRARY);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((db) => new Promise<T>((resolve, reject) => {
    const req = run(db.transaction(store, mode).objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function write(store: string, value: unknown, key?: string): Promise<void> {
  return open().then((db) => new Promise<void>((resolve, reject) => {
    const t = db.transaction(store, "readwrite");
    t.objectStore(store).put(value, key);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  }));
}

export function loadProject(): Promise<Project | null> {
  return tx<Project | undefined>(STORE, "readonly", (s) => s.get(KEY)).then((v) => v ?? null);
}

export function saveProject(project: Project): Promise<void> {
  return write(STORE, project, KEY);
}

export function deleteCurrentProject(): Promise<void> {
  return open().then((db) => new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    t.objectStore(STORE).delete(KEY);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  }));
}

/** Multiple named projects live in IndexedDB; localStorage keeps only their small index. */
export function saveLibraryProject(project: Project): Promise<void> {
  return write(LIBRARY, project, project.id);
}

export function loadLibraryProject(id: string): Promise<Project | null> {
  return tx<Project | undefined>(LIBRARY, "readonly", (s) => s.get(id)).then((v) => v ?? null);
}

export function deleteLibraryProject(id: string): Promise<void> {
  return open().then((db) => new Promise<void>((resolve, reject) => {
    const t = db.transaction(LIBRARY, "readwrite");
    t.objectStore(LIBRARY).delete(id);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  }));
}
