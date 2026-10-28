import React, { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/AudioEngine';

/**
 * Timed lyric lines for "Sonic Thrust - Main Menu Theme" (looping, ≈234.8s).
 * `start` / `end` are seconds within the track — the theme loops, so these
 * timings repeat on every loop. Start times kindly provided by ear; durations
 * are approximations (each end ≈ next start − 1s, with a long final hold).
 * Entries must stay sorted by `start`.
 */
const MENU_THEME_LYRICS: { start: number; end: number; text: string }[] = [
  { start: 8.0, end: 17.0, text: 'System online...' },
  { start: 18.0, end: 33.0, text: 'Grid initialized.' },
  { start: 34.0, end: 38.5, text: 'Vector...' },
  { start: 39.0, end: 42.5, text: 'Pulse...' },
  { start: 43.0, end: 46.5, text: 'Sub-bass...' },
  { start: 47.0, end: 53.0, text: 'Ready.' },
  { start: 54.0, end: 68.0, text: 'Sonic Thrust.' },
  { start: 69.0, end: 84.0, text: 'Sonic Thrust.' },
  { start: 85.0, end: 97.0, text: 'Sonic Thrust.' },
  { start: 98.0, end: 104.5, text: 'Engage.' },
  { start: 133.0, end: 134.5, text: 'Frequency...' },
  { start: 135.0, end: 136.5, text: 'Resonance...' },
  { start: 137.0, end: 144.0, text: 'Harmonic flow.' },
  { start: 176.0, end: 179.0, text: 'Sonic...' },
  { start: 180.0, end: 186.0, text: 'Thrust.' },
  { start: 188.0, end: 191.0, text: 'Sonic...' },
  { start: 192.0, end: 198.0, text: 'Thrust.' },
  { start: 211.0, end: 222.0, text: 'Sonic Thrust.' },
];

/** Fast reveal on line activation (s) */
const FADE_IN_S = 0.3;
/** Slow dissolve when the line ends / music pauses (s) */
const FADE_OUT_S = 1.8;

interface MenuLyricsProps {
  /** Positioning classes inside the visualizer section (absolute, centered) */
  className?: string;
}

/**
 * Lyric overlay for the main menu theme: shows the currently active line just
 * above the equalizer bars, fading in quickly on activation and fading out
 * slowly when the line ends or the menu music pauses. Driven by the AudioEngine
 * singleton via a lightweight rAF loop that only re-renders on line change.
 */
export const MenuLyrics: React.FC<MenuLyricsProps> = ({ className = '' }) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  // Holds the last displayed line so its text stays visible while dissolving out
  const heldTextRef = useRef<string>('');

  useEffect(() => {
    let raf = 0;
    let last: number | null = -2;
    const tick = () => {
      let idx: number | null = null;
      if (audio.getIsMenuMusicPlaying()) {
        const t = audio.getMenuMusicPosition();
        for (let i = 0; i < MENU_THEME_LYRICS.length; i++) {
          if (t >= MENU_THEME_LYRICS[i].start && t < MENU_THEME_LYRICS[i].end) {
            idx = i;
            break;
          }
        }
      }
      if (idx !== last) {
        last = idx;
        if (idx !== null) heldTextRef.current = MENU_THEME_LYRICS[idx].text;
        setActiveIdx(idx);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const text = activeIdx !== null ? MENU_THEME_LYRICS[activeIdx].text : heldTextRef.current;

  return (
    <div className={className}>
      <p
        aria-live="polite"
        className="font-orbitron font-bold uppercase tracking-[0.25em] text-center text-white text-[10px] sm:text-sm leading-snug drop-shadow-[0_0_10px_rgba(0,240,255,0.9)]"
        style={{
          opacity: activeIdx !== null ? 1 : 0,
          transition: `opacity ${activeIdx !== null ? FADE_IN_S : FADE_OUT_S}s ease` + ', transform 0.4s ease',
          transform: activeIdx !== null ? 'translateY(0)' : 'translateY(3px)',
          textShadow: '0 0 14px rgba(0, 240, 255, 0.75), 0 0 34px rgba(217, 70, 239, 0.4)',
        }}
      >
        {text}
      </p>
    </div>
  );
};
