import { SoundTrack, CueItem, AppSettings } from '../types';
import { PRESET_CATALOG, synthesizePresetBuffer, audioBufferToWavBlob } from './soundSynthesizer';

const DB_NAME = 'FestCue_DB_v1';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export async function resetDB(): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {}
    dbPromise = null;
  }
  await new Promise((r) => setTimeout(r, 60));
}

export function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('tracks')) {
            const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
            trackStore.createIndex('category', 'category', { unique: false });
            trackStore.createIndex('addedAt', 'addedAt', { unique: false });
          }
          if (!db.objectStoreNames.contains('cueItems')) {
            const cueStore = db.createObjectStore('cueItems', { keyPath: 'id' });
            cueStore.createIndex('order', 'order', { unique: false });
          }
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          const db = request.result;
          db.onclose = () => {
            dbPromise = null;
          };
          db.onversionchange = () => {
            try {
              db.close();
            } catch {}
            dbPromise = null;
          };
          db.onerror = () => {
            dbPromise = null;
          };
          resolve(db);
        };

        request.onerror = () => {
          dbPromise = null;
          reject(request.error || new Error('Failed to open IndexedDB'));
        };

        request.onblocked = () => {
          console.warn('IndexedDB request blocked');
          dbPromise = null;
        };
      } catch (err) {
        dbPromise = null;
        reject(err);
      }
    });
  }
  return dbPromise;
}

export const DEFAULT_SETTINGS: AppSettings = {
  masterVolume: 1.0,
  isMuted: false,
  soloBgmMode: false,
  keyboardShortcutsEnabled: true,
  defaultFadeOutSec: 2.5,
  themeMode: 'stage',
};

export const DEFAULT_CUE_ITEMS: CueItem[] = [
  {
    id: 'cue-1',
    order: 1,
    timeSlot: '09:00',
    title: '開会予告・校内放送チャイム',
    trackId: 'preset-school_chime',
    note: '放送開始の1分前にチャイムを鳴らし、静粛を促す',
    completed: false,
    actionType: 'play',
  },
  {
    id: 'cue-2',
    order: 2,
    timeSlot: '09:05',
    title: '開会式開幕・和太鼓の一打',
    trackId: 'preset-taiko',
    note: '体育館暗転と同時にドン！と鳴らしステージ照明点灯',
    completed: false,
    actionType: 'play',
  },
  {
    id: 'cue-3',
    order: 3,
    timeSlot: '09:06',
    title: 'オープニングスピーチBGM',
    trackId: 'preset-bgm_opening_loop',
    note: '実行委員長登壇。声が聞き取りやすい音量に調整',
    completed: false,
    actionType: 'play',
  },
  {
    id: 'cue-4',
    order: 4,
    timeSlot: '09:10',
    title: '開会宣言＆開幕ファンファーレ',
    trackId: 'preset-fanfare',
    note: '「文化祭スタート！」の掛け声直後にファンファーレ',
    completed: false,
    actionType: 'play',
  },
  {
    id: 'cue-5',
    order: 1,
    timeSlot: '09:15',
    title: '一般公開中・会場転換BGM',
    trackId: 'preset-bgm_acoustic_loop',
    note: '展示・模擬店巡りの時間帯。ループ再生を継続',
    completed: false,
    actionType: 'play',
  },
  {
    id: 'cue-6',
    order: 6,
    timeSlot: '15:00',
    title: '有志ステージ結果発表（ドラムロール）',
    trackId: 'preset-drumroll_crash',
    note: '司会の「優勝は……」でドラムロール再生、発表でシンバル',
    completed: false,
    actionType: 'play',
  },
  {
    id: 'cue-7',
    order: 7,
    timeSlot: '15:30',
    title: '閉会式・エンディング感動BGM',
    trackId: 'preset-bgm_emotional_piano',
    note: 'スライドショー放映＆閉会の挨拶。最後はゆっくりフェードアウト',
    completed: false,
    actionType: 'play',
  },
];

/**
 * Initialize database with a clean slate.
 * Removes any preloaded sample tracks and sample cues.
 */
export async function initializeDatabase(): Promise<{
  tracks: SoundTrack[];
  cues: CueItem[];
  settings: AppSettings;
}> {
  await getDB();
  const existingTracks = await getAllTracks();
  const existingCues = await getAllCues();

  // If there are any legacy preset tracks (preset-*) or sample cues (cue-1..cue-7), clean them out
  const nonPresetTracks = existingTracks.filter((t) => !t.isPreset && !t.id.startsWith('preset-'));
  if (nonPresetTracks.length !== existingTracks.length) {
    for (const t of existingTracks) {
      if (t.isPreset || t.id.startsWith('preset-')) {
        await deleteTrack(t.id);
      }
    }
  }

  const customCues = existingCues.filter((c) => !c.id.startsWith('cue-'));
  if (customCues.length !== existingCues.length) {
    for (const c of existingCues) {
      if (c.id.startsWith('cue-') && parseInt(c.id.replace('cue-', ''), 10) <= 7) {
        await deleteCue(c.id);
      }
    }
  }

  const cleanTracks = await getAllTracks();
  const cleanCues = await getAllCues();
  const settings = await getSettings();

  return {
    tracks: cleanTracks,
    cues: cleanCues,
    settings: settings || DEFAULT_SETTINGS,
  };
}

export async function clearAllTracksAndCues(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['tracks', 'cueItems'], 'readwrite');
    tx.objectStore('tracks').clear();
    tx.objectStore('cueItems').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllTracks(): Promise<void> {
  const tryClear = async () => {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction('tracks', 'readwrite');
        const store = tx.objectStore('tracks');
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  };

  try {
    await tryClear();
  } catch (err) {
    await resetDB();
    await tryClear();
  }
}

export async function getAllTracks(): Promise<SoundTrack[]> {
  const tryGet = async (): Promise<SoundTrack[]> => {
    const db = await getDB();
    // 1. Read tracks using readonly transaction without holding long-lived write locks
    const rawList = await new Promise<SoundTrack[]>((resolve, reject) => {
      try {
        const tx = db.transaction('tracks', 'readonly');
        const store = tx.objectStore('tracks');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => {
          e.preventDefault();
          reject(request.error || new Error('IDB getAll error'));
        };
        tx.onerror = (e) => {
          e.preventDefault();
          reject(tx.error || new Error('IDB getAll transaction error'));
        };
      } catch (err) {
        reject(err);
      }
    });

    const valid: SoundTrack[] = [];
    const corruptIds: string[] = [];

    // 2. In-memory validation and probe of blob viability
    for (const t of rawList) {
      if (t.audioData && (!t.audioBlob || !(t.audioBlob instanceof Blob))) {
        t.audioBlob = new Blob([t.audioData], { type: 'audio/mpeg' });
      }
      delete t.audioData;

      const hasBlob = Boolean(t.audioBlob && t.audioBlob instanceof Blob && t.audioBlob.size > 0);
      if (!hasBlob) {
        corruptIds.push(t.id);
        continue;
      }

      // Quick 16-byte probe to check if Chromium disk handle is alive
      try {
        const probe = await t.audioBlob!.slice(0, 16).arrayBuffer();
        if (!probe || probe.byteLength === 0) {
          corruptIds.push(t.id);
          continue;
        }
      } catch {
        corruptIds.push(t.id);
        continue;
      }

      valid.push(t);
    }

    // 3. Purge corrupt records in a separate, fast transaction if needed
    if (corruptIds.length > 0) {
      try {
        const tx = db.transaction('tracks', 'readwrite');
        const store = tx.objectStore('tracks');
        for (const id of corruptIds) {
          store.delete(id);
        }
      } catch (cleanErr) {
        console.warn('Failed to clean corrupted tracks from IDB:', cleanErr);
      }
    }

    return valid;
  };

  try {
    return await tryGet();
  } catch (err) {
    console.warn('getAllTracks failed, resetting DB connection and retrying:', err);
    await resetDB();
    return await tryGet();
  }
}

export async function saveTrack(track: SoundTrack): Promise<void> {
  const storable: any = { ...track };

  // If audioBlob is an OS File instance, slice it to a detached Blob without large heap copies
  if (storable.audioBlob && typeof File !== 'undefined' && storable.audioBlob instanceof File) {
    try {
      storable.audioBlob = storable.audioBlob.slice(0, storable.audioBlob.size, storable.audioBlob.type || 'audio/mpeg');
    } catch {
      // ignore
    }
  }

  const tryPut = async (item: any): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction('tracks', 'readwrite');
        const store = tx.objectStore('tracks');
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = (e) => {
          e.preventDefault();
          reject(request.error || new Error('IDB put error'));
        };
        tx.onerror = (e) => {
          e.preventDefault();
          reject(tx.error || new Error('IDB put transaction error'));
        };
        tx.onabort = (e) => {
          e.preventDefault();
          reject(tx.error || new Error('IDB put transaction aborted'));
        };
      } catch (err) {
        reject(err);
      }
    });
  };

  // Attempt 1: Standard store with Blob
  try {
    delete storable.audioData;
    await tryPut(storable);
    return;
  } catch (err) {
    console.warn(`saveTrack put failed for "${track.title}", resetting DB and attempting fallback:`, err);
    await resetDB();

    // Attempt 2: Fallback to storing ArrayBuffer directly (bypasses Chromium's external blob-storage file failure)
    if (storable.audioBlob) {
      try {
        const buf = await storable.audioBlob.arrayBuffer();
        const altRecord = { ...storable, audioData: buf };
        delete altRecord.audioBlob;
        await tryPut(altRecord);
        return;
      } catch (retryErr) {
        await resetDB();
        throw retryErr;
      }
    }

    throw err;
  }
}

export async function deleteTrack(id: string): Promise<void> {
  const tryDelete = async () => {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction('tracks', 'readwrite');
        const store = tx.objectStore('tracks');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  };

  try {
    await tryDelete();
  } catch (err) {
    await resetDB();
    await tryDelete();
  }
}

export async function getAllCues(): Promise<CueItem[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cueItems', 'readonly');
    const store = tx.objectStore('cueItems');
    const request = store.getAll();
    request.onsuccess = () => {
      const items: CueItem[] = request.result || [];
      items.sort((a, b) => a.order - b.order);
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveCue(cue: CueItem): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cueItems', 'readwrite');
    const store = tx.objectStore('cueItems');
    const request = store.put(cue);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteCue(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cueItems', 'readwrite');
    const store = tx.objectStore('cueItems');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveAllCues(cues: CueItem[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cueItems', 'readwrite');
    const store = tx.objectStore('cueItems');
    store.clear().onsuccess = () => {
      for (const cue of cues) {
        store.put(cue);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const request = store.get('app_config');
    request.onsuccess = () => {
      if (request.result && request.result.value) {
        resolve({ ...DEFAULT_SETTINGS, ...request.result.value });
      } else {
        resolve(DEFAULT_SETTINGS);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const request = store.put({ key: 'app_config', value: settings });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
