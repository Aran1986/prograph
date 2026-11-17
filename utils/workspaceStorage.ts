import { ProjectWorkspace } from '../types';

export const PROJECTS_STORAGE_KEY = 'graph_pro_projects_v1';
export const LEGACY_STORAGE_KEY = 'graph_pro_data';

const DB_NAME = 'graph_pro_workspace_db';
const DB_VERSION = 1;
const STORE_NAME = 'kv';
const WORKSPACE_KEY = 'workspace_v1';

export interface StoredWorkspacePayload {
  activeProjectId: string;
  projects: ProjectWorkspace[];
}

const openWorkspaceDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
};

const readFromIdb = async (): Promise<StoredWorkspacePayload | null> => {
  const db = await openWorkspaceDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(WORKSPACE_KEY);
    req.onsuccess = () => resolve((req.result as StoredWorkspacePayload) || null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
};

const writeToIdb = async (payload: StoredWorkspacePayload): Promise<void> => {
  const db = await openWorkspaceDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(payload, WORKSPACE_KEY);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
};

export const loadWorkspaceState = async (): Promise<StoredWorkspacePayload | null> => {
  try {
    const idbData = await readFromIdb();
    if (idbData && Array.isArray(idbData.projects) && idbData.projects.length > 0) {
      return idbData;
    }
  } catch {
    // Fallback to localStorage below
  }

  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.projects) && parsed.projects.length > 0) {
        const payload: StoredWorkspacePayload = {
          activeProjectId: parsed.activeProjectId || parsed.projects[0].id,
          projects: parsed.projects
        };
        try {
          await writeToIdb(payload);
        } catch {
          // ignore
        }
        return payload;
      }
    }
  } catch {
    // ignore
  }

  return null;
};

export const saveWorkspaceState = async (
  activeProjectId: string,
  projects: ProjectWorkspace[]
): Promise<{ ok: boolean; storage: 'indexeddb' | 'localstorage' | 'none' }> => {
  const payload: StoredWorkspacePayload = { activeProjectId, projects };
  let idbOk = false;

  try {
    await writeToIdb(payload);
    idbOk = true;
  } catch {
    idbOk = false;
  }

  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(payload));
    return { ok: true, storage: idbOk ? 'indexeddb' : 'localstorage' };
  } catch {
    // localStorage quota exceeded (e.g. heavy attached images); IndexedDB handles large blobs fine
    if (idbOk) {
      return { ok: true, storage: 'indexeddb' };
    }
    return { ok: false, storage: 'none' };
  }
};
