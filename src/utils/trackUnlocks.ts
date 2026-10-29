/**
 * Track Unlock System
 * Manages unlocking of secret tracks based on game achievements
 * Persists to localStorage for permanence across sessions
 */

export interface UnlockCondition {
  mode: 'PRO' | 'EXTREME';
  description: string;
}

const STORAGE_KEY = 'sonic_thrust_unlocked_tracks';

/**
 * Get the set of unlocked track IDs from localStorage
 */
export function getUnlockedTracks(): Set<string> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((id: unknown) => typeof id === 'string'));
      }
    }
  } catch {
    // Safe fallback
  }
  return new Set();
}

/**
 * Check if a track is unlocked (or doesn't require unlocking)
 */
export function isTrackUnlocked(track: { id: string; unlockCondition?: UnlockCondition; secret?: boolean }): boolean {
  // Tracks without unlock condition are always available
  if (!track.unlockCondition) return true;
  
  // Secret tracks need explicit unlock
  if (track.secret) {
    const unlocked = getUnlockedTracks();
    return unlocked.has(track.id);
  }
  
  return true;
}

/**
 * Unlock a track by ID
 */
export function unlockTrack(trackId: string): boolean {
  const unlocked = getUnlockedTracks();
  if (unlocked.has(trackId)) return false; // Already unlocked
  
  unlocked.add(trackId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(unlocked)));
    return true; // Newly unlocked
  } catch {
    return false;
  }
}

/**
 * Try to unlock tracks based on completed difficulty
 * Returns array of newly unlocked track IDs
 */
export function checkAndUnlockTracks(completedDifficulty: 'PRO' | 'EXTREME', allTracks: Array<{ id: string; unlockCondition?: UnlockCondition; secret?: boolean }>): string[] {
  const newlyUnlocked: string[] = [];
  
  for (const track of allTracks) {
    if (track.unlockCondition && track.unlockCondition.mode === completedDifficulty && track.secret) {
      if (unlockTrack(track.id)) {
        newlyUnlocked.push(track.id);
      }
    }
  }
  
  return newlyUnlocked;
}

/**
 * Get all unlockable tracks that are still locked
 */
export function getLockedTracks(allTracks: Array<{ id: string; unlockCondition?: UnlockCondition; secret?: boolean }>): Array<{ id: string; unlockCondition?: UnlockCondition; secret?: boolean }> {
  return allTracks.filter(track => track.unlockCondition && track.secret && !isTrackUnlocked(track));
}

/**
 * Get unlock progress summary
 */
export function getUnlockProgress(allTracks: Array<{ id: string; unlockCondition?: UnlockCondition; secret?: boolean }>): { total: number; unlocked: number; locked: number } {
  const secretTracks = allTracks.filter(t => t.unlockCondition && t.secret);
  const unlocked = secretTracks.filter(t => isTrackUnlocked(t)).length;
  return {
    total: secretTracks.length,
    unlocked,
    locked: secretTracks.length - unlocked
  };
}

/**
 * Reset all unlocks (for testing/debugging)
 */
export function resetAllUnlocks(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}