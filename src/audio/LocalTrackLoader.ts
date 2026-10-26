/**
 * Sonic Thrust - Local Track Loader
 *
 * Turns player-uploaded files into playable TrackMetadata entries:
 *   File → ArrayBuffer → decode (duration + BPM detection) → IndexedDB
 *
 * Upload pipeline is CPU-bound only (decode runs on the main thread via the
 * Web Audio API); the raw bytes are stored compressed, never as PCM.
 */

import { TrackMetadata } from '../types/game';
import { localTrackDB } from './LocalTrackDB';
import { audio } from './AudioEngine';

export interface LocalUploadResult {
  added: TrackMetadata[];
  failed: string[]; // file names that could not be decoded/persisted
  persistent: boolean; // false = session-only fallback storage
}

function sanitizeName(name: string): string {
  // "My Song (2026).mp3" → "My Song (2026)"
  return name.replace(/\.[a-z0-9]{2,5}$/i, '').trim() || 'Faixa local';
}

async function readBytes(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

export const LocalTrackLoader = {
  /**
   * Loads the locally persisted catalog at menu startup.
   */
  async listLocalTracks(): Promise<TrackMetadata[]> {
    return localTrackDB.listTracks();
  },

  /**
   * Processes uploaded files: decodes each to measure duration/BPM, then
   * persists bytes + metadata. Failures are reported per-file, never thrown.
   */
  async addLocalFiles(files: File[]): Promise<LocalUploadResult> {
    const added: TrackMetadata[] = [];
    const failed: string[] = [];

    for (const file of files) {
      try {
        if (!/^audio\//.test(file.type || '') && !/\.(mp3|wav|ogg|flac|m4a|aac|opus)$/i.test(file.name)) {
          failed.push(file.name);
          continue;
        }
        const bytes = await readBytes(file);

        // Decode to measure real duration + BPM (same code path gameplay uses)
        await audio.init();
        if (!audio.getContext()) {
          failed.push(file.name);
          continue;
        }
        let decoded: AudioBuffer;
        try {
          decoded = await audio.getContext()!.decodeAudioData(bytes.slice(0));
        } catch {
          failed.push(file.name);
          continue;
        }

        const meta: TrackMetadata = localTrackDB.toLocalMetadata({
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: sanitizeName(file.name),
          artist: 'Biblioteca Local',
          filename: file.name,
          estimatedBpm: audio.detectBpmFromBuffer(decoded),
          duration: Math.round(decoded.duration),
          description: 'Faixa carregada por ti — guardada apenas neste dispositivo.',
          isProcedural: false
        });

        await localTrackDB.saveTrack(meta.id, bytes, meta);
        added.push(meta);
      } catch {
        failed.push(file.name);
      }
    }

    return { added, failed, persistent: localTrackDB.isPersistentAvailable() };
  },

  /**
   * Deletes one local track (bytes + metadata).
   */
  async deleteLocalTrack(id: string): Promise<void> {
    await localTrackDB.deleteTrack(id);
  },

  /**
   * Storage usage for the Info panel meter.
   */
  async getStorageUsage() {
    return localTrackDB.getStorageUsage();
  },

  isPersistentAvailable() {
    return localTrackDB.isPersistentAvailable();
  }
};
