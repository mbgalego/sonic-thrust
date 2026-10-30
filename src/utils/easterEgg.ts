/**
 * Left Tunnel Easter Egg persistence
 * Stores collected code fragments + unlocked toggles in localStorage
 * so progress survives across sessions.
 */
export interface EasterEggSave {
  codeFragmentsCollected: number; // 0..3
  oasisMode: boolean;
  deloreanSkin: boolean;
}

const STORAGE_KEY = 'sonic_thrust_easter_egg';

const DEFAULTS: EasterEggSave = {
  codeFragmentsCollected: 0,
  oasisMode: false,
  deloreanSkin: false,
};

/** Read the saved Easter Egg progress (safe fallback if localStorage is unavailable) */
export function getEasterEggSave(): EasterEggSave {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULTS };
    return {
      codeFragmentsCollected: Math.max(0, Math.min(3, Number(parsed.codeFragmentsCollected) || 0)),
      oasisMode: Boolean(parsed.oasisMode),
      deloreanSkin: Boolean(parsed.deloreanSkin),
    };
  } catch {
    return { ...DEFAULTS };
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

/** Record a newly collected fragment (idempotent). Returns the new total. */
export function collectCodeFragment(current: number): number {
  const next = Math.min(3, current + 1);
  setEasterEggSave({
    codeFragmentsCollected: next,
    oasisMode: false, // unlocks only apply once all 3 are collected
    deloreanSkin: false,
  });
  return next;
}

/** Unlock both Easter Egg rewards (called once all 3 fragments are collected) */
export function unlockEasterEggRewards(currentFragments: number): EasterEggSave {
  const save = getEasterEggSave();
  save.codeFragmentsCollected = Math.min(3, currentFragments);
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
