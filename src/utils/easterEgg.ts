/**
 * Left Tunnel Easter Egg persistence
 * Stores collected code fragments + unlocked toggles in localStorage
 * so progress survives across sessions.
 */
export interface EasterEggSave {
  codeFragmentsCollected: number; // 0..3
  collectedIds: string[];         // fragment ids already banked (idempotent re-spawn protection)
  oasisMode: boolean;
  deloreanSkin: boolean;
}

const STORAGE_KEY = 'sonic_thrust_easter_egg';

const VALID_FRAGMENT_IDS = ['fragment-a', 'fragment-b', 'fragment-c'];

const DEFAULTS: EasterEggSave = {
  codeFragmentsCollected: 0,
  collectedIds: [],
  oasisMode: false,
  deloreanSkin: false,
};

/** Read the saved Easter Egg progress (safe fallback if localStorage is unavailable) */
export function getEasterEggSave(): EasterEggSave {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS, collectedIds: [] };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULTS, collectedIds: [] };
    // Normalize persisted fragment ids: dedupe + drop unknown entries
    const ids = Array.isArray(parsed.collectedIds)
      ? [...new Set(parsed.collectedIds.filter((v: unknown): v is string =>
          typeof v === 'string' && VALID_FRAGMENT_IDS.includes(v)))] as string[]
      : [];
    return {
      codeFragmentsCollected: Math.max(0, Math.min(3, Number(parsed.codeFragmentsCollected) || 0)),
      collectedIds: ids,
      oasisMode: Boolean(parsed.oasisMode),
      deloreanSkin: Boolean(parsed.deloreanSkin),
    };
  } catch {
    return { ...DEFAULTS, collectedIds: [] };
  }
}

/** Persist the full Easter Egg save state */
export function setEasterEggSave(save: EasterEggSave): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Ignore quota/private-mode errors
  }
}

/** Unlock both Easter Egg rewards (called once all 3 fragments are collected) */
export function unlockEasterEggRewards(currentFragments: number, collectedIds: string[] = []): EasterEggSave {
  const save = getEasterEggSave();
  save.codeFragmentsCollected = Math.min(3, currentFragments);
  save.collectedIds = collectedIds;
  save.oasisMode = true;
  save.deloreanSkin = true;
  setEasterEggSave(save);
  return save;
}

/** Reset all Easter Egg progress (debug/testing) */
export function resetEasterEggProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
