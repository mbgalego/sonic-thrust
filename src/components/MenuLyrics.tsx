import React, { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/AudioEngine';

/**
 * Timed lyric lines for "Sonic Thrust - Main Menu Theme" (looping, ≈234.8s).
 * `start` / `end` are seconds within the track — the theme loops, so these
 * timings repeat on every loop. Tune the times by ear: edit the numbers here.
 * Entries must stay sorted by `start`.
 */
const MENU_THEME_LYRICS: { start: number; end: number; text: string }[] = [
  { start: 3.0, end: 7.0, text: 'System online...' },
  { start: 8.0, end: 12.5, text: 'Grid initialized.' },
  { start: 16.5, end: 19.5, text: 'Vector...' },
  { start: 20.5, end: 23.0, text: 'Pulse...' },
  { start: 24.0, end: 26.5, text: 'Sub-bass...' },
  { start: 27.5, end: 31.0, text: 'Ready.' },
  { start: 34.0, end: 39.5, text: 'Sonic... Thrust.' },
  { start: 44.0, end: 50.0, text: 'Sonic Thrust.' },
  { start: 51.5, end: 57.5, text: 'Sonic Thrust.' },
  { start: 59.0, end: 63.5, text: 'Engage.' },
  { start: 74.0, end: 78.5, text: 'Frequency...' },
  { start: 79.5, end: 84.0, text: 'Resonance...' },
  { start: 85.0, end: 91.0, text: 'Harmonic flow.' },
  { start: 108.0, end: 112.0, text: 'Sonic...' },
  { start: 113.0, end: 118.5, text: 'Thrust.' },
  { start: 124.0, end: 128.0, text: 'Sonic...' },
  { start: 129.0, end: 134.5, text: 'Thrust.' },
  { start: 140.0, end: 150.0, text: 'Sonic Thrust.' },
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
