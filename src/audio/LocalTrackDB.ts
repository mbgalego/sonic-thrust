/**
 * Sonic Thrust - Local Track Database (IndexedDB)
 *
 * Persists player-uploaded music entirely in the browser: raw audio bytes are
 * stored in an IndexedDB object store (NOT decoded PCM — an AudioBuffer of a
 * 3-minute stereo track is ~85MB, while the compressed bytes are 5-15MB).
 * Decoding happens on demand through AudioEngine.loadTrack()'s isLocal branch.
 *
 * Nothing ever leaves the device — there is no server upload path by design.
 *
 * Graceful degradation: when IndexedDB is unavailable (e.g. private browsing
 * in Safari), the DB transparently falls back to in-memory Maps — tracks stay
 * usable for the current session and every consumer is told so through
 * isPersistentAvailable().
 */

import { TrackMetadata } from '../types/game';

const DB_NAME = 'sonic-thrust-local-tracks';
const DB_VERSION = 1;
const FILES_STORE = 'files';
const META_STORE = 'meta';

export interface LocalStorageUsageInfo {
  usageBytes: number | null;
  quotaBytes: number | null;
}

class LocalTrackDB {
  private db: IDBDatabase | null = null;
  // In-memory fallback when IndexedDB is unavailable (private browsing)
  private memoryFiles = new Map<string, ArrayBuffer>();
  private memoryMeta = new Map<string, TrackMetadata>();
  private fallbackOnly = false;

  constructor() {
    // Fire and forget: browsers may still deny, but when granted the data
    // becomes much more resilient to automatic eviction (best-effort).
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }
  }

  /** Opens (or upgrades) the DB. Never throws — sets fallbackOnly instead. */
  private open(): Promise<IDBDatabase | null> {
    if (this.db) return Promise.resolve(this.db);
    if (this.fallbackOnly || typeof indexedDB === 'undefined') {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      let request: IDBOpenDBRequest;
      try {
        request = indexedDB.open(DB_NAME, DB_VERSION);
      } catch {
        this.fallbackOnly = true;
        resolve(null);
        return;
      }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          db.createObjectStore(FILES_STORE);
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE);
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onerror = () => {
        this.fallbackOnly = true;
        resolve(null);
      };
    });
  }

  private runTx<T>(
    storeName: string,
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T | null> {
    return this.open().then((db) => {
      if (!db) return null;
      return new Promise<T | null>((resolve) => {
        let tx: IDBTransaction;
        try {
          tx = db.transaction(storeName, mode);
        } catch {
          resolve(null);
          return;
        }
        const req = fn(tx.objectStore(storeName));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
    });
  }

  /** true when data is actually persisted (false = session-only fallback). */
  public isPersistentAvailable(): boolean {
    return !!this.db && !this.fallbackOnly;
  }

  /** Marks a local-only metadata object as coming from player storage. */
  public toLocalMetadata(meta: TrackMetadata): TrackMetadata {
    return { ...meta, isLocal: true };
  }

  /**
   * Saves one uploaded track (bytes + metadata). IDs come from the loader
   * (timestamp-based) so re-uploads of the same file are distinct entries.
   */
  public async saveTrack(id: string, bytes: ArrayBuffer, meta: TrackMetadata): Promise<void> {
    await this.runTx(FILES_STORE, 'readwrite', (s) => s.put(bytes, id));
    await this.runTx(META_STORE, 'readwrite', (s) => s.put(this.sanitizeMeta(meta), id) as unknown as IDBRequest<void>);
    // Mirror into memory so the fallback store is always up to date when IDB
    // partially succeeded (or failed outright).
    this.memoryFiles.set(id, bytes);
    this.memoryMeta.set(id, this.sanitizeMeta(meta));
  }

  /** Lists every stored track, pruning metadata whose bytes are missing. */
  public async listTracks(): Promise<TrackMetadata[]> {
    const metas = await this.runTx<TrackMetadata[]>(META_STORE, 'readonly', (s) => s.getAll() as IDBRequest<TrackMetadata[]>);
    if (!metas) return Array.from(this.memoryMeta.values());
    const out: TrackMetadata[] = [];
    for (const raw of metas) {
      if (!raw || typeof raw !== 'object') continue;
      const hasBytes = await this.hasBytes(raw.id);
      if (!hasBytes) {
        // Orphan metadata (crash between two puts) — self-heal by removing it
        await this.deleteTrack(raw.id);
        continue;
      }
      out.push(this.toLocalMetadata(raw));
    }
    return out;
  }

  private async hasBytes(id: string): Promise<boolean> {
    if (this.memoryFiles.has(id)) return true;
    const exists = await this.runTx(FILES_STORE, 'readonly', (s) => s.count(id) as unknown as IDBRequest<number>);
    return !!exists && exists > 0;
  }

  /** Raw stored bytes for on-demand decoding (caller MUST pass a copy). */
  public async getBytes(id: string): Promise<ArrayBuffer | null> {
    const mem = this.memoryFiles.get(id);
    if (mem) return mem.slice(0);
    const stored = await this.runTx<ArrayBuffer>(FILES_STORE, 'readonly', (s) => s.get(id) as IDBRequest<ArrayBuffer>);
    return stored ? stored.slice(0) : null;
  }

  public async deleteTrack(id: string): Promise<void> {
    await this.runTx(FILES_STORE, 'readwrite', (s) => s.delete(id) as unknown as IDBRequest<undefined>);
    await this.runTx(META_STORE, 'readwrite', (s) => s.delete(id) as unknown as IDBRequest<undefined>);
    this.memoryFiles.delete(id);
    this.memoryMeta.delete(id);
  }

  public async deleteAll(): Promise<void> {
    await this.runTx(FILES_STORE, 'readwrite', (s) => s.clear() as unknown as IDBRequest<undefined>);
    await this.runTx(META_STORE, 'readwrite', (s) => s.clear() as unknown as IDBRequest<undefined>);
    this.memoryFiles.clear();
    this.memoryMeta.clear();
  }

  /** Best-effort storage usage report (null fields when unsupported). */
  public async getStorageUsage(): Promise<LocalStorageUsageInfo> {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      try {
        const est = await navigator.storage.estimate();
        return { usageBytes: est.usage ?? null, quotaBytes: est.quota ?? null };
      } catch {
        // Fall through
      }
    }
    return { usageBytes: null, quotaBytes: null };
  }

  /** Strips non-serializable fields (audioBuffer) before writing to IDB. */
  private sanitizeMeta(meta: TrackMetadata): TrackMetadata {
    const { audioBuffer: _audioBuffer, ...rest } = meta;
    return rest;
  }
}

export const localTrackDB = new LocalTrackDB();
