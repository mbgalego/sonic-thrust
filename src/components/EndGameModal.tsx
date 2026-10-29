/**
 * Sonic Thrust - End Game Modal (Victory & Game Over)
 * Pixel-faithful recreation of the Mission Accomplished Cyberpunk Reference
 * Features live reactive FFT audio waveform, dynamic progress/time soundwave lines,
 * and rock-solid layout with zero size jitter.
 */

import React, { useEffect, useRef } from 'react';
import {
  RotateCcw,
  Home,
  Zap,
  Clock,
  Gauge,
  CircleDot,
  Music,
  Skull
} from 'lucide-react';
import { GameStats, DifficultyLevel } from '../types/game';
import { audio } from '../audio/AudioEngine';

const VICTORY_QUOTES = [
  '"Estás a ver este estilo? Isto não é para quem quer, é para quem pode!" (Duarte e Companhia)',
  '"Ó Chinês, traz a metralhadora que esmagámos o recorde!" (Duarte e Companhia)',
  '"Não havia necessidade nenhuma de humilhar o túnel desta maneira!" (Diácono Remédios)',
  '"I feel the need... the need for speed!"',
  '"Great shot, kid! You made the run in less than 12 parsecs."',
  '"He\'s beginning to believe. You are The One!"',
  '"Hasta la vista, obstacles. Mission accomplished!"',
  '"Yippee-ki-yay! Welcome to the party, pal."'
];

const STORAGE_KEY = 'sonic_thrust_victory_quote_bag';

/**
 * Non-repeating Shuffle Bag (Fisher-Yates deck without replacement).
 * Guarantees that ALL 8 quotes will appear in randomized order before
 * any quote can repeat, with 0% chance of consecutive repeats across cycles.
 */
class VictoryQuoteBag {
  private bag: number[] = [];
  private lastQuoteIndex: number = -1;

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const data = sessionStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed.bag) && parsed.bag.length > 0) {
          this.bag = parsed.bag.filter((n: unknown) => typeof n === 'number' && n >= 0 && n < VICTORY_QUOTES.length);
          this.lastQuoteIndex = typeof parsed.last === 'number' ? parsed.last : -1;
          if (this.bag.length > 0) return;
        }
      }
    } catch {
      // Safe fallback
    }
    this.refill();
  }

  private save(): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        bag: this.bag,
        last: this.lastQuoteIndex
      }));
    } catch {
      // Safe fallback
    }
  }

  private refill(): void {
    const indices = Array.from({ length: VICTORY_QUOTES.length }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    // Prevent consecutive repetition across bag boundaries:
    // indices.pop() removes the last element, so ensure indices[indices.length - 1] != lastQuoteIndex
    if (indices.length > 1 && indices[indices.length - 1] === this.lastQuoteIndex) {
      [indices[indices.length - 1], indices[0]] = [indices[0], indices[indices.length - 1]];
    }
    this.bag = indices;
  }

  public next(): string {
    if (this.bag.length === 0) {
      this.refill();
    }
    const idx = this.bag.pop()!;
    this.lastQuoteIndex = idx;
    this.save();
    return VICTORY_QUOTES[idx];
  }
}

const quoteBag = new VictoryQuoteBag();

interface EndGameModalProps {
  isVictory: boolean;
  outOfTime?: boolean;
  stats: GameStats;
  difficulty: DifficultyLevel;
  trackTitle: string;
  onRestart: () => void;
  onExitToMenu: () => void;
}

export const EndGameModal: React.FC<EndGameModalProps> = ({
  isVictory,
  outOfTime = false,
  stats,
  difficulty,
  trackTitle,
  onRestart,
  onExitToMenu
}) => {
  const elapsedMin = Math.floor(stats.timeElapsed / 60);
  const elapsedSec = Math.floor(stats.timeElapsed % 60);

  // Draw exactly one quote per modal mount from the non-repeating shuffle bag
  const victoryQuoteRef = useRef<string>('');
  if (isVictory && !victoryQuoteRef.current) {
    victoryQuoteRef.current = quoteBag.next();
  }
  const victoryQuote = victoryQuoteRef.current;

  // Dedicated HTML5 Canvas References for 60FPS Reactive Graphics (Zero React State re-renders)
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressoWaveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tempoWaveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const topVuLeftRef = useRef<HTMLCanvasElement | null>(null);
  const topVuRightRef = useRef<HTMLCanvasElement | null>(null);
  const bottomVuLeftRef = useRef<HTMLCanvasElement | null>(null);
  const bottomVuRightRef = useRef<HTMLCanvasElement | null>(null);
  const musicCountdownTextRef = useRef<HTMLSpanElement | null>(null);
  const musicProgressBarRef = useRef<HTMLDivElement | null>(null);
  const peakBarsRef = useRef<number[]>(new Array(56).fill(0));

  // 60FPS Hardware-Accelerated Animation Loop
  // Updates canvas pixels directly without triggering ANY React component layout recalculations!
  useEffect(() => {
    let animId: number;
    let time = 0;

    const renderLoop = () => {
      time += 0.04;
      const freqData = audio.getFrequencyData(0.25, 0.016);
      const rawFreq = freqData.frequencyArray;
      const bassVal = Math.max(0.1, freqData.bass);
      const midsVal = Math.max(0.1, freqData.mids);
      const trebleVal = Math.max(0.1, freqData.treble);

      // Track Time Left Countdown Update (Victory only, zero React state re-renders)
      if (isVictory) {
        const totalDuration = audio.getTrackDuration();
        const currentPlaybackTime = audio.getCurrentTime();
        const remaining = Math.max(0, totalDuration - currentPlaybackTime);
        const remMin = Math.floor(remaining / 60);
        const remSec = Math.floor(remaining % 60);

        if (musicCountdownTextRef.current) {
          if (remaining <= 0.4 && totalDuration > 0) {
            musicCountdownTextRef.current.textContent = 'FAIXA CONCLUÍDA';
            musicCountdownTextRef.current.className = 'font-orbitron font-bold text-[10px] sm:text-xs text-emerald-400 uppercase tracking-wider drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]';
          } else {
            musicCountdownTextRef.current.textContent = `${String(remMin).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
            musicCountdownTextRef.current.className = 'font-orbitron font-black text-xs sm:text-sm text-[#00f0ff] tabular-nums tracking-wider drop-shadow-[0_0_8px_#00f0ff]';
          }
        }
        if (musicProgressBarRef.current && totalDuration > 0) {
          const pct = Math.min(100, Math.max(0, (currentPlaybackTime / totalDuration) * 100));
          musicProgressBarRef.current.style.width = `${pct}%`;
        }
      }

      // 1. Draw High-Tech Cyberpunk Audio Spectrum & Oscilloscope Waveform
      const waveCanvas = waveformCanvasRef.current;
      if (waveCanvas) {
        const ctx = waveCanvas.getContext('2d');
        if (ctx) {
          const w = waveCanvas.width;
          const h = waveCanvas.height;
          const centerY = h / 2;

          ctx.clearRect(0, 0, w, h);

          // Subtle Sci-Fi Grid lines & Center Baseline
          ctx.lineWidth = 1;
          ctx.strokeStyle = isVictory ? 'rgba(0, 240, 255, 0.08)' : 'rgba(244, 63, 94, 0.08)';
          ctx.beginPath();
          ctx.moveTo(0, centerY - h * 0.32);
          ctx.lineTo(w, centerY - h * 0.32);
          ctx.moveTo(0, centerY + h * 0.32);
          ctx.lineTo(w, centerY + h * 0.32);
          ctx.stroke();

          // Center Zero-Axis line with tick marks
          ctx.strokeStyle = isVictory ? 'rgba(0, 240, 255, 0.28)' : 'rgba(244, 63, 94, 0.28)';
          ctx.beginPath();
          ctx.moveTo(0, centerY);
          ctx.lineTo(w, centerY);
          ctx.stroke();

          // Tick marks along center
          ctx.fillStyle = isVictory ? 'rgba(0, 240, 255, 0.35)' : 'rgba(244, 63, 94, 0.35)';
          for (let tx = 20; tx < w; tx += 30) {
            ctx.fillRect(tx, centerY - 2.5, 1, 5);
          }

          const isAudioActive = audio.isTrackPlaying();
          const barCount = 56;
          const barStep = w / barCount;
          const barWidth = Math.max(2.5, barStep - 2.2);

          const amplitudes: number[] = [];

          for (let i = 0; i < barCount; i++) {
            const distFromCenter = Math.abs(i - barCount / 2) / (barCount / 2);
            let sampleVal = 0;

            if (isAudioActive && rawFreq && rawFreq.length > 0) {
              const binIndex = Math.floor(Math.pow(1 - distFromCenter, 1.4) * 64) + 2;
              sampleVal = (rawFreq[binIndex % rawFreq.length] || 0) / 255;
            } else {
              // Living Holographic Standby Wave (ambient rhythmic breathing, never a dead line!)
              const ambientPhase = time * 2.2 + i * 0.22;
              sampleVal = (Math.sin(ambientPhase) * 0.20 + Math.cos(ambientPhase * 0.5) * 0.15 + 0.38) * 0.5;
            }

            const centerEnvelope = Math.cos(distFromCenter * (Math.PI / 2.2));
            const amp = Math.max(
              2,
              sampleVal * (h * 0.44) * (0.45 + centerEnvelope * 0.75)
            );
            amplitudes.push(amp);

            // Update peak hold meters
            if (amp > (peakBarsRef.current[i] || 0)) {
              peakBarsRef.current[i] = amp;
            } else {
              peakBarsRef.current[i] = Math.max(0, (peakBarsRef.current[i] || 0) - 0.38);
            }
          }

          // Layer A: Smooth Glow Area Backdrop (Continuous Curvature)
          ctx.beginPath();
          ctx.moveTo(0, centerY);
          for (let i = 0; i < barCount; i++) {
            const x = i * barStep + barStep / 2;
            ctx.lineTo(x, centerY - amplitudes[i] * 0.85);
          }
          ctx.lineTo(w, centerY);
          for (let i = barCount - 1; i >= 0; i--) {
            const x = i * barStep + barStep / 2;
            ctx.lineTo(x, centerY + amplitudes[i] * 0.85);
          }
          ctx.closePath();

          const areaGrad = ctx.createLinearGradient(0, 0, 0, h);
          if (isVictory) {
            areaGrad.addColorStop(0, 'rgba(0, 240, 255, 0.22)');
            areaGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.12)');
            areaGrad.addColorStop(1, 'rgba(255, 0, 127, 0.22)');
          } else {
            areaGrad.addColorStop(0, 'rgba(244, 63, 94, 0.24)');
            areaGrad.addColorStop(0.5, 'rgba(190, 18, 60, 0.12)');
            areaGrad.addColorStop(1, 'rgba(126, 34, 206, 0.22)');
          }
          ctx.fillStyle = areaGrad;
          ctx.fill();

          // Layer B: Symmetrical High-Precision Neon Spectrum Pillars
          for (let i = 0; i < barCount; i++) {
            const x = i * barStep + (barStep - barWidth) / 2;
            const distFromCenter = Math.abs(i - barCount / 2) / (barCount / 2);
            const amp = amplitudes[i];

            const barGrad = ctx.createLinearGradient(x, centerY - amp, x, centerY + amp);
            if (isVictory) {
              if (distFromCenter < 0.35) {
                barGrad.addColorStop(0, '#ff007f');
                barGrad.addColorStop(0.5, '#ec4899');
                barGrad.addColorStop(1, '#ff007f');
              } else if (distFromCenter < 0.7) {
                barGrad.addColorStop(0, '#a855f7');
                barGrad.addColorStop(0.5, '#c084fc');
                barGrad.addColorStop(1, '#a855f7');
              } else {
                barGrad.addColorStop(0, '#00f0ff');
                barGrad.addColorStop(0.5, '#38bdf8');
                barGrad.addColorStop(1, '#00f0ff');
              }
            } else {
              if (distFromCenter < 0.4) {
                barGrad.addColorStop(0, '#f43f5e');
                barGrad.addColorStop(0.5, '#fda4af');
                barGrad.addColorStop(1, '#f43f5e');
              } else {
                barGrad.addColorStop(0, '#fb7185');
                barGrad.addColorStop(0.5, '#c084fc');
                barGrad.addColorStop(1, '#fb7185');
              }
            }

            ctx.fillStyle = barGrad;
            ctx.shadowColor = isVictory ? (distFromCenter < 0.4 ? '#ff007f' : '#00f0ff') : '#f43f5e';
            ctx.shadowBlur = 5;

            // Draw rounded bar top and bottom
            const barH = amp * 2;
            const barTop = centerY - amp;
            const r = Math.min(barWidth / 2, 2);
            ctx.beginPath();
            ctx.roundRect(x, barTop, barWidth, Math.max(3, barH), r);
            ctx.fill();

            // Layer C: Floating Peak Hold Markers
            const peakVal = peakBarsRef.current[i] || amp;
            if (peakVal > amp + 1) {
              ctx.fillStyle = isVictory ? '#ffffff' : '#ffd1d9';
              ctx.shadowColor = isVictory ? '#00f0ff' : '#f43f5e';
              ctx.shadowBlur = 4;
              ctx.fillRect(x, centerY - peakVal - 1.5, barWidth, 1.5);
              ctx.fillRect(x, centerY + peakVal, barWidth, 1.5);
            }
          }

          // Layer D: Center Laser Oscilloscope Core Line
          ctx.beginPath();
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = isVictory ? '#ffffff' : '#fecdd3';
          ctx.shadowColor = isVictory ? '#00f0ff' : '#f43f5e';
          ctx.shadowBlur = 7;
          for (let i = 0; i < barCount; i++) {
            const x = i * barStep + barStep / 2;
            const osc = Math.sin(time * 6 + i * 0.45) * Math.min(6, amplitudes[i] * 0.25);
            const y = centerY + osc;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          ctx.shadowBlur = 0;
        }
      }

      // Helper for dynamic oscillating soundwave lines
      const drawDynamicWaveLine = (
        canvas: HTMLCanvasElement | null,
        color: string,
        shadowColor: string,
        energy: number,
        startRatio: number,
        endRatio: number,
        timeScale: number
      ) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        const midY = h / 2;

        ctx.clearRect(0, 0, w, h);

        ctx.beginPath();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = color;
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const segments = 48;
        for (let i = 0; i <= segments; i++) {
          const progress = i / segments;
          const x = progress * w;
          let y = midY;

          // Soundwave erupts in the active region
          if (progress >= startRatio && progress <= endRatio) {
            const relProgress = (progress - startRatio) / (endRatio - startRatio);
            const envelope = Math.sin(relProgress * Math.PI);
            const sampleIdx = Math.floor(relProgress * 20);
            const sample = rawFreq && rawFreq.length > sampleIdx ? rawFreq[sampleIdx] / 255 : 0.5;

            // Oscillating soundwave formula with high-frequency ripples
            const wave = Math.sin(time * timeScale + i * 1.1) * Math.cos(time * (timeScale * 0.6) + i * 0.5);
            const amp = envelope * (h * 0.44) * (0.35 + energy * 0.75 + sample * 0.35);
            y = midY + wave * amp;
          }

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
      };

      // 2. Draw Dynamic Soundwave Line under PROGRESSO (Cyan)
      drawDynamicWaveLine(
        progressoWaveCanvasRef.current,
        '#00f0ff',
        '#00f0ff',
        bassVal,
        0.18,
        0.82,
        8.0
      );

      // 3. Draw Dynamic Soundwave Line under TEMPO VOO (Magenta)
      drawDynamicWaveLine(
        tempoWaveCanvasRef.current,
        '#ec4899',
        '#ff007f',
        midsVal,
        0.18,
        0.82,
        9.5
      );

      // Helper for drawing segmented mini VU equalizer bars
      const drawMiniVU = (
        canvas: HTMLCanvasElement | null,
        levels: number[],
        invertColors: boolean = false
      ) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const barCount = 5;
        const segments = 4;
        const barW = 3;
        const barGap = 2;
        const segH = 2.5;
        const segGap = 1.2;

        for (let i = 0; i < barCount; i++) {
          const x = i * (barW + barGap);
          const activeLevel = Math.max(0.1, Math.min(1, levels[i % levels.length]));
          const activeSegments = Math.round(activeLevel * segments);

          for (let s = 0; s < segments; s++) {
            const y = h - (s + 1) * (segH + segGap);
            const isActive = s < activeSegments;
            
            const isTop = s >= 2;
            const primaryColor = invertColors
              ? (isTop ? '#00f0ff' : '#ff007f')
              : (isTop ? '#ff007f' : '#00f0ff');

            ctx.fillStyle = isActive ? primaryColor : 'rgba(255, 255, 255, 0.08)';
            
            if (isActive) {
              ctx.shadowColor = primaryColor;
              ctx.shadowBlur = 3;
            } else {
              ctx.shadowBlur = 0;
            }

            ctx.fillRect(x, y, barW, segH);
          }
        }
        ctx.shadowBlur = 0;
      };

      // 4. Draw Mini VU bars on Canvas (Zero DOM layout jitter)
      drawMiniVU(topVuLeftRef.current, [bassVal * 0.9, bassVal * 1.1, midsVal * 0.8, bassVal * 1.2, midsVal * 0.7]);
      drawMiniVU(topVuRightRef.current, [trebleVal * 0.8, trebleVal * 1.2, midsVal * 0.9, trebleVal * 1.1, bassVal * 0.7], true);
      drawMiniVU(bottomVuLeftRef.current, [midsVal * 0.8, bassVal * 1.1, midsVal * 0.6, bassVal * 1.0, midsVal * 0.9]);
      drawMiniVU(bottomVuRightRef.current, [bassVal * 1.0, trebleVal * 0.9, bassVal * 0.7, trebleVal * 1.2, midsVal * 0.8], true);

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Accessibility: Focus trap + Escape key handler + Auto-focus first button
  const modalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = modalContainerRef.current;
    if (!container) return;

    // Focus first focusable element on mount
    const focusable = container.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) focusable.focus();

    // Focus trap
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const focusableElements = container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onExitToMenu();
      }
    };
    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [onExitToMenu]);

  // Canvas resize handler for responsive DPR and container size changes
  const canvasRefs = [
    waveformCanvasRef,
    progressoWaveCanvasRef,
    tempoWaveCanvasRef,
    topVuLeftRef,
    topVuRightRef,
    bottomVuLeftRef,
    bottomVuRightRef,
  ];
  useEffect(() => {
    const resizeCanvases = () => {
      const dpr = window.devicePixelRatio || 1;
      canvasRefs.forEach((ref) => {
        const canvas = ref.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      });
    };
    const ro = new ResizeObserver(resizeCanvases);
    canvasRefs.forEach((ref) => {
      if (ref.current) ro.observe(ref.current);
    });
    // Initial resize
    resizeCanvases();
    return () => ro.disconnect();
  }, []);

  const destructionLabels = {
    CEILING: 'Colisão Imediata com o Teto Vetorial',
    FLOOR: 'Impacto Severo com o Solo Néon',
    OBSTACLE: 'Colisão com Obstáculo Sonorreativo',
    LASER: 'Desintegração por Barreira Laser (Agudos)',
    TIME_UP: 'Tempo Esgotado — A Faixa Terminou'
  };

  const reasonText = stats.destructionReason
    ? destructionLabels[stats.destructionReason] || 'Contacto Ilegal com o Terreno'
    : 'Contacto Ilegal com o Terreno';

  return (
    <div
      ref={modalContainerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="endgame-title"
      aria-describedby="endgame-subtitle"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#03010c]/90 backdrop-blur-xl overflow-y-auto select-none"
    >
      
      {/* Background Starfield Particles & Ambient Neon Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-cyan-500/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/4 w-[500px] h-[500px] bg-fuchsia-500/12 rounded-full blur-[140px]" />
      </div>

      {/* Main Rigid Container (Fixed max-width, zero dimension jitter) */}
      <div className="relative z-10 w-full max-w-[440px] sm:max-w-[480px] flex flex-col items-center my-auto py-2 shrink-0">
        
        {/* ================= 1. Top Trophy Emblem ================= */}
        {isVictory ? (
          <div className="relative flex items-center justify-center mb-1 shrink-0">
            {/* Concentric Neon Rings */}
            <div className="absolute w-32 h-32 sm:w-44 sm:h-44 rounded-full border border-cyan-400/35 shadow-[0_0_30px_rgba(0,240,255,0.25)] pointer-events-none animate-pulse" />
            <div className="absolute w-28 h-28 sm:w-40 sm:h-40 rounded-full border border-fuchsia-500/35 shadow-[0_0_20px_rgba(217,70,239,0.3)] pointer-events-none" />
            <div className="absolute w-24 h-24 sm:w-36 sm:h-36 rounded-full border border-cyan-300/40 shadow-[0_0_15px_rgba(0,240,255,0.35)] pointer-events-none" />

            {/* Orbiting Stardust Sparkles */}
            <div className="absolute w-32 h-32 sm:w-44 sm:h-44 pointer-events-none animate-spin" style={{ animationDuration: '30s' }}>
              <div className="absolute top-2 left-10 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#00f0ff]" />
              <div className="absolute bottom-3 right-10 w-1.5 h-1.5 rounded-full bg-pink-400 shadow-[0_0_8px_#ff007f]" />
              <div className="absolute top-1/2 -left-1 w-1 h-1 rounded-full bg-white shadow-[0_0_4px_#fff]" />
              <div className="absolute top-1/3 -right-1 w-1 h-1 rounded-full bg-cyan-200 shadow-[0_0_4px_#00f0ff]" />
              <div className="absolute -top-1 right-1/3 w-1.5 h-1.5 rounded-full bg-fuchsia-300 shadow-[0_0_6px_#ec4899]" />
            </div>

            {/* Glowing Core with Neon Trophy */}
            <div className="relative z-10 w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-[#0a0522]/90 border border-cyan-400/60 flex items-center justify-center shadow-[0_0_25px_rgba(0,240,255,0.45)]">
              <svg
                className="w-11 h-11 sm:w-16 sm:h-16 drop-shadow-[0_0_12px_#00f0ff] drop-shadow-[0_0_8px_#ff007f]"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Trophy Cup Bowl */}
                <path
                  d="M20 12 H44 V26 C44 33.5 38.6 39.5 32 39.5 C25.4 39.5 20 33.5 20 26 Z"
                  stroke="#00f0ff"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Trophy Inner Rim Accent */}
                <path
                  d="M23 15 H41"
                  stroke="#ff007f"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                {/* Left Handle */}
                <path
                  d="M20 16 H14 C10.5 16 8 18.5 8 22 C8 27.5 12.5 31.5 20 32"
                  stroke="#00f0ff"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Right Handle */}
                <path
                  d="M44 16 H50 C53.5 16 56 18.5 56 22 C56 27.5 51.5 31.5 44 32"
                  stroke="#00f0ff"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Stem / Neck */}
                <path
                  d="M32 39.5 V46"
                  stroke="#00f0ff"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
                {/* Pedestal Tiered Base */}
                <path
                  d="M24 46 H40 L45 54 H19 Z"
                  stroke="#00f0ff"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 54 H47"
                  stroke="#ff007f"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        ) : (
          /* Game Over Skull Emblem */
          <div className="relative flex items-center justify-center mb-1 shrink-0">
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-[#180309]/90 border border-rose-500/60 flex items-center justify-center shadow-[0_0_25px_rgba(244,63,94,0.45)]">
              <Skull className="w-10 h-10 sm:w-12 sm:h-12 text-rose-500 drop-shadow-[0_0_12px_#f43f5e] animate-pulse" />
            </div>
          </div>
        )}

        {/* ================= 2. Title & Subtitle ================= */}
        <h1
          className={`font-orbitron font-black text-2xl sm:text-3xl md:text-4xl tracking-wider uppercase text-center mt-2.5 shrink-0 ${
            isVictory
              ? 'bg-gradient-to-b from-[#00f0ff] via-[#99f6ff] to-[#ff007f] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(0,240,255,0.7)] drop-shadow-[0_0_25px_rgba(255,0,127,0.6)]'
              : 'text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]'
          }`}
        >
          {isVictory ? 'MISSÃO CUMPRIDA!' : outOfTime ? 'TEMPO ESGOTADO' : 'GAME OVER'}
        </h1>

        <p
          id="endgame-subtitle"
          className="font-rajdhani font-medium text-xs sm:text-sm text-[#7dd3fc] tracking-wide text-center leading-relaxed mt-1 px-4 max-w-md shrink-0">
          {isVictory ? (
            victoryQuote
          ) : outOfTime ? (
            'A faixa musical terminou antes de alcançares o Portal de Meta — a missão expirou.'
          ) : (
            reasonText
          )}
        </p>

        {/* ================= 3. Mission Statistics Cyber Card ================= */}
        <div className="w-full mt-4 p-[1.5px] rounded-2xl bg-gradient-to-r from-[#00f0ff] via-[#c084fc] to-[#ec4899] shadow-[0_0_25px_rgba(0,240,255,0.25)] shrink-0">
          <div className="w-full rounded-[calc(1rem-1.5px)] bg-[#09041e]/95 backdrop-blur-md p-3.5 sm:p-5 flex flex-col gap-3.5 relative overflow-hidden">
            
            {/* Card Header Notch: ESTATÍSTICAS DA MISSÃO with dynamic mini VU bars (Canvas based, 0 layout shifts) */}
            <div className="flex items-center justify-between pb-2.5 border-b border-cyan-500/25 h-7 shrink-0">
              {/* Left Dynamic Mini VU Bars Canvas */}
              <canvas
                ref={topVuLeftRef}
                width={26}
                height={16}
                className="w-[26px] h-[16px] block shrink-0"
              />

              {/* Title Badge */}
              <div className="px-3.5 py-0.5 rounded-md bg-[#0d0728] border border-cyan-400/40 shadow-[0_0_8px_rgba(0,240,255,0.25)] shrink-0">
                <span className="font-orbitron font-bold text-[11px] sm:text-xs text-white tracking-widest uppercase">
                  ESTATÍSTICAS DA MISSÃO
                </span>
              </div>

              {/* Right Dynamic Mini VU Bars Canvas */}
              <canvas
                ref={topVuRightRef}
                width={26}
                height={16}
                className="w-[26px] h-[16px] block shrink-0"
              />
            </div>

            {/* Telemetry Row 1: PROGRESSO & TEMPO VOO */}
            <div className="grid grid-cols-2 gap-4 pt-1 shrink-0">
              {/* Left: PROGRESSO */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20 shrink-0" />
                  <span className="font-orbitron font-semibold text-[11px] sm:text-xs tracking-wider text-cyan-300/90 uppercase">
                    PROGRESSO
                  </span>
                </div>
                <span className="font-orbitron font-black text-2xl sm:text-3xl text-white mt-1 tabular-nums tracking-wide">
                  {isVictory ? '100%' : `${Math.min(99, Math.floor(stats.percentCompleted))}%`}
                </span>
                
                {/* 60FPS Dynamic Cyan Soundwave Canvas Line */}
                <div className="w-full h-4 mt-1 relative overflow-hidden flex items-center shrink-0">
                  <canvas
                    ref={progressoWaveCanvasRef}
                    width={180}
                    height={16}
                    className="w-full h-4 block"
                  />
                </div>
              </div>

              {/* Right: TEMPO VOO */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-fuchsia-300">
                  <Clock className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
                  <span className="font-orbitron font-semibold text-[11px] sm:text-xs tracking-wider text-fuchsia-300/90 uppercase">
                    TEMPO VOO
                  </span>
                </div>
                <span className="font-orbitron font-black text-2xl sm:text-3xl text-white mt-1 tabular-nums tracking-wide">
                  {String(elapsedMin).padStart(2, '0')}:{String(elapsedSec).padStart(2, '0')}
                </span>

                {/* 60FPS Dynamic Magenta Soundwave Canvas Line */}
                <div className="w-full h-4 mt-1 relative overflow-hidden flex items-center shrink-0">
                  <canvas
                    ref={tempoWaveCanvasRef}
                    width={180}
                    height={16}
                    className="w-full h-4 block"
                  />
                </div>
              </div>
            </div>

            {/* Telemetry Row 2: VEL. MÁX & ORBES */}
            <div className="grid grid-cols-2 gap-4 pt-1 shrink-0">
              {/* Left: VEL. MÁX */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-fuchsia-300">
                  <Gauge className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
                  <span className="font-orbitron font-semibold text-[11px] sm:text-xs tracking-wider text-fuchsia-300/90 uppercase">
                    VEL. MÁX
                  </span>
                </div>
                <div className="font-orbitron font-black text-xl sm:text-2xl text-white mt-1 flex items-baseline gap-1.5">
                  <span className="tabular-nums">{Math.round(stats.maxSpeed * 0.7)}</span>
                  <span className="text-xs font-rajdhani font-semibold text-gray-400">km/h</span>
                </div>
              </div>

              {/* Right: ORBES */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <CircleDot className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="font-orbitron font-semibold text-[11px] sm:text-xs tracking-wider text-cyan-300/90 uppercase">
                    ORBES
                  </span>
                </div>
                <span className="font-orbitron font-black text-xl sm:text-2xl text-white mt-1 tabular-nums">
                  {stats.powerUpsCollected ?? 0}
                </span>
              </div>
            </div>

            {/* Horizontal Cyber Separator */}
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent my-0.5 shrink-0" />

            {/* Row 3: Music Badge & Difficulty */}
            <div className="flex items-center justify-between gap-2 text-xs shrink-0">
              {/* Left: Music Note & Track Name */}
              <div className="flex items-center gap-1.5 min-w-0">
                <Music className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="font-rajdhani font-bold text-sm text-white truncate drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]">
                  {trackTitle || 'Redux Abyssum'}
                </span>
              </div>

              {/* Right: Difficulty Label in Cyan Neon */}
              <span className="font-orbitron font-black text-xs sm:text-sm text-[#00f0ff] uppercase tracking-wider shrink-0 drop-shadow-[0_0_6px_#00f0ff]">
                {difficulty}
              </span>
            </div>

            {/* ================= Live Dynamic Audio Waveform Visualizer ================= */}
            <div className="w-full h-16 sm:h-20 relative mt-1 shrink-0 overflow-hidden rounded-xl border border-cyan-500/25 bg-[#050212]/90 shadow-[inset_0_0_20px_rgba(0,240,255,0.06),0_0_15px_rgba(0,0,0,0.5)]">
              <canvas
                ref={waveformCanvasRef}
                width={480}
                height={80}
                className="w-full h-full block"
              />
            </div>

            {/* Victory Track Time Left (Countdown to listen to the rest of the song) */}
            {isVictory && (
              <div className="w-full flex flex-col gap-1 px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.12)] shrink-0">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                    </span>
                    <span className="font-orbitron font-semibold text-[10px] sm:text-xs text-cyan-200 uppercase tracking-wider">
                      TEMPO RESTANTE DA FAIXA
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <span
                      ref={musicCountdownTextRef}
                      className="font-orbitron font-black text-xs sm:text-sm text-[#00f0ff] tabular-nums tracking-wider drop-shadow-[0_0_8px_#00f0ff]"
                    >
                      --:--
                    </span>
                  </div>
                </div>
                {/* Mini progress bar of track completion */}
                <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden relative">
                  <div
                    ref={musicProgressBarRef}
                    className="h-full bg-gradient-to-r from-cyan-400 via-sky-300 to-fuchsia-400 rounded-full transition-all duration-200 shadow-[0_0_8px_rgba(0,240,255,0.6)]"
                    style={{ width: '0%' }}
                  />
                </div>
              </div>
            )}

            {/* Bottom Corner Decorative Mini Equalizers (Canvas based, 0 layout shifts) */}
            <div className="flex items-center justify-between pt-0.5 h-4 shrink-0">
              {/* Bottom-Left VU Bar Canvas */}
              <canvas
                ref={bottomVuLeftRef}
                width={26}
                height={14}
                className="w-[26px] h-[14px] block shrink-0"
              />

              {/* Bottom-Right VU Bar Canvas */}
              <canvas
                ref={bottomVuRightRef}
                width={26}
                height={14}
                className="w-[26px] h-[14px] block shrink-0"
              />
            </div>

          </div>
        </div>

        {/* ================= 4. Action Buttons ================= */}
        <div className="w-full flex flex-col gap-2.5 mt-4 shrink-0">
          
          {/* Primary Action Button: TENTAR NOVAMENTE */}
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#00f0ff] via-[#38bdf8] to-[#00f0ff] shadow-[0_0_30px_rgba(0,240,255,0.7)] hover:shadow-[0_0_40px_rgba(0,240,255,0.9)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between"
          >
            {/* Left Soundwave Vibration Arcs */}
            <div className="flex items-center gap-0.5 text-black/70 font-mono text-sm tracking-tighter select-none">
              <span className="opacity-30">(</span>
              <span className="opacity-50">(</span>
              <span className="opacity-70">(</span>
              <span className="opacity-90">(</span>
              <span className="opacity-100">(</span>
            </div>

            {/* Center Icon & Title */}
            <div className="flex items-center justify-center gap-2 text-black">
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              <span className="font-orbitron font-black text-xs sm:text-sm tracking-widest uppercase">
                TENTAR NOVAMENTE
              </span>
            </div>

            {/* Right Soundwave Vibration Arcs */}
            <div className="flex items-center gap-0.5 text-black/70 font-mono text-sm tracking-tighter select-none">
              <span className="opacity-100">)</span>
              <span className="opacity-90">)</span>
              <span className="opacity-70">)</span>
              <span className="opacity-50">)</span>
              <span className="opacity-30">)</span>
            </div>
          </button>

          {/* Secondary Action Button: MENU INICIAL */}
          <button
            type="button"
            onClick={onExitToMenu}
            className="w-full py-3 px-4 rounded-2xl bg-[#090520]/80 border border-purple-500/40 hover:border-cyan-400 hover:bg-[#0f0930] hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4 text-cyan-400" />
            <span className="font-orbitron font-bold text-xs sm:text-sm tracking-widest text-cyan-200 hover:text-white uppercase">
              MENU INICIAL
            </span>
          </button>

        </div>

      </div>
    </div>
  );
};
