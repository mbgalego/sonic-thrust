/**
 * Sonic Thrust - In-Game HUD Component
 * Low-occlusion, world-matched cyber display showing music progress, distance to finish portal,
 * velocity, altitude clearance, active power-up timers, and pause controls.
 * 
 * Optimized with Direct DOM Refs (Technical Proposal 1): high-frequency metrics
 * (speedometer, countdown timer, dual-thruster gauges, progress bar, active badges)
 * update directly via DOM references in the animation loop, reducing React reconciliation to zero.
 */

import React, { useImperativeHandle, useRef, forwardRef } from 'react';
import {
  Shield,
  Gauge,
  Pause,
  Zap,
  Activity,
  Maximize,
  Minimize,
  Clock,
  Radio,
  Heart,
  AlertTriangle,
  Ghost,
  Sparkles
} from 'lucide-react';
import { GameStats, DifficultyLevel, PowerUpAnnouncement, PowerUpType } from '../types/game';
import { ShipState } from '../physics/PhysicsWorld';

export interface GameHUDHandle {
  update: (stats: GameStats, ship: ShipState, launchGraceTimer?: number) => void;
}

/** Phase Shield display slots — matches PhysicsWorld.SHIELD_MAX_STOCK (v1.35.0) */
const SHIELD_DISPLAY_SLOTS = 4;

interface GameHUDProps {
  initialStats: GameStats;
  initialShip: ShipState;
  difficulty: DifficultyLevel;
  trackTitle: string;
  onPause: () => void;
  initialLaunchGraceTimer?: number;
  announcement?: PowerUpAnnouncement | null;
  oasisMode?: boolean; // OASIS retro 80s skin — shifts chrome to magenta/pink
}

export const GameHUD = forwardRef<GameHUDHandle, GameHUDProps>(({
  initialStats,
  initialShip,
  difficulty,
  trackTitle,
  onPause,
  initialLaunchGraceTimer = 0,
  announcement = null,
  oasisMode = false
}, ref) => {
  const [isFullscreen, setIsFullscreen] = React.useState(Boolean(document.fullscreenElement));

  // Direct DOM Element References
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const countdownTextRef = useRef<HTMLSpanElement | null>(null);
  const countdownLabelRef = useRef<HTMLSpanElement | null>(null);
  const speedTextRef = useRef<HTMLSpanElement | null>(null);
  const thrusterLBarRefs = useRef<(HTMLDivElement | null)[]>([]);
  const thrusterRBarRefs = useRef<(HTMLDivElement | null)[]>([]);
  const thrusterLLabelRef = useRef<HTMLSpanElement | null>(null);
  const thrusterRLabelRef = useRef<HTMLSpanElement | null>(null);
  const heartSlotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shieldSlotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const genChargeBarRef = useRef<HTMLDivElement | null>(null);
  const genChargeTextRef = useRef<HTMLSpanElement | null>(null);

  // Badges Refs
  const badgePenaltyRef = useRef<HTMLDivElement | null>(null);
  const badgePenaltyTextRef = useRef<HTMLSpanElement | null>(null);
  const badgeLaunchRef = useRef<HTMLDivElement | null>(null);
  const badgeLaunchTextRef = useRef<HTMLSpanElement | null>(null);
  const badgeDamperRef = useRef<HTMLDivElement | null>(null);
  const badgeDamperTextRef = useRef<HTMLSpanElement | null>(null);
  const badgeLowGRef = useRef<HTMLDivElement | null>(null);
  const badgeLowGTextRef = useRef<HTMLSpanElement | null>(null);
  const badgeInvulnerableRef = useRef<HTMLDivElement | null>(null);
  const badgeInvulnerableTextRef = useRef<HTMLSpanElement | null>(null);
  const badgeGhostRef = useRef<HTMLDivElement | null>(null);
  const badgeGhostTextRef = useRef<HTMLSpanElement | null>(null);
  const badgePulseRef = useRef<HTMLDivElement | null>(null);
  const badgeChronoRef = useRef<HTMLDivElement | null>(null);
  const badgeChronoTextRef = useRef<HTMLSpanElement | null>(null);
  const badgeSingularityRef = useRef<HTMLDivElement | null>(null);

  // Cached state to avoid redundant DOM writes
  const lastStateRef = useRef({
    timeStr: '',
    colorPhase: '',
    speedKmh: -1,
    progressPct: -1,
    leftPowerStep: -1,
    rightPowerStep: -1,
    lives: -1,
    shields: -1,
    genChargePct: -1
  });

  // OASIS retro 80s chrome: shift cyan accents to magenta/pink.
  // Semantic colors (rose hearts, amber generator) stay untouched.
  const isOasis = oasisMode === true;
  const A = isOasis ? 'fuchsia-400' : 'cyan-400';      // accent 400
  const A3 = isOasis ? 'fuchsia-300' : 'cyan-300';     // accent 300
  const AG = isOasis ? 'rgba(232,121,249,0.9)' : 'rgba(6,182,212,0.9)'; // glow

  useImperativeHandle(ref, () => ({
    update: (stats: GameStats, ship: ShipState, launchGraceTimer: number = 0) => {
      const cache = lastStateRef.current;

      // OASIS retro 80s chrome: shift cyan accents to magenta/pink.
      // 1. Progress Bar
      const pct = Math.max(1, Math.min(100, stats.percentCompleted));
      if (cache.progressPct !== pct && progressBarRef.current) {
        cache.progressPct = pct;
        progressBarRef.current.style.width = `${pct}%`;
      }

      // 2. Countdown Timer
      const remainingSec = Math.max(0, Math.round(stats.totalDuration - stats.timeElapsed));
      const remainingMin = Math.floor(remainingSec / 60);
      const remainingSecPadded = String(remainingSec % 60).padStart(2, '0');
      const timeStr = `${String(remainingMin).padStart(2, '0')}:${remainingSecPadded}`;

      if (cache.timeStr !== timeStr && countdownTextRef.current) {
        cache.timeStr = timeStr;
        countdownTextRef.current.textContent = timeStr;
      }

      const isCritical = remainingSec <= 25;
      const isWarning = remainingSec <= 45 && remainingSec > 25;
      const colorPhase = isCritical ? 'CRITICAL' : isWarning ? 'WARNING' : 'NORMAL';

      if (cache.colorPhase !== colorPhase) {
        cache.colorPhase = colorPhase;
        if (countdownTextRef.current && countdownLabelRef.current) {
          if (isCritical) {
            countdownTextRef.current.className =
              'text-3xl sm:text-5xl md:text-6xl font-black font-orbitron tracking-tighter whitespace-nowrap leading-none transition-colors duration-300 text-rose-400 drop-shadow-[0_0_22px_rgba(244,63,94,0.95)] animate-pulse';
            countdownLabelRef.current.className =
              'text-[9px] sm:text-[10px] font-mono tracking-[0.25em] sm:tracking-[0.3em] uppercase transition-colors duration-300 text-rose-400/90';
          } else if (isWarning) {
            countdownTextRef.current.className =
              'text-3xl sm:text-5xl md:text-6xl font-black font-orbitron tracking-tighter whitespace-nowrap leading-none transition-colors duration-300 text-amber-300 drop-shadow-[0_0_20px_rgba(251,191,36,0.85)]';
            countdownLabelRef.current.className =
              'text-[9px] sm:text-[10px] font-mono tracking-[0.25em] sm:tracking-[0.3em] uppercase transition-colors duration-300 text-amber-400/80';
          } else {
            countdownTextRef.current.className =
              'text-3xl sm:text-5xl md:text-6xl font-black font-orbitron tracking-tighter whitespace-nowrap leading-none transition-colors duration-300 text-' + A3 + ' drop-shadow-[0_0_20px_' + AG + ']';
            countdownLabelRef.current.className =
              'text-[9px] sm:text-[10px] font-mono tracking-[0.25em] sm:tracking-[0.3em] uppercase transition-colors duration-300 text-' + A + '/70';
          }
        }
      }

      // 3. Speedometer
      const speedKmh = Math.round(Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy) * 0.7);
      if (cache.speedKmh !== speedKmh && speedTextRef.current) {
        cache.speedKmh = speedKmh;
        speedTextRef.current.textContent = String(speedKmh);
      }

      // 4. Thruster Gauges
      const leftStep = Math.min(6, Math.floor(ship.leftThrusterPower * 6.5));
      if (cache.leftPowerStep !== leftStep) {
        cache.leftPowerStep = leftStep;
        for (let i = 0; i < 6; i++) {
          const bar = thrusterLBarRefs.current[i];
          if (bar) {
            const active = ship.leftThrusterPower >= (i + 1) / 6;
            bar.className = `w-2.5 rounded-sm transition-all duration-75 ${
              active
                ? isOasis
                  ? 'bg-fuchsia-400 shadow-[0_0_6px_rgba(232,121,249,0.9)]'
                  : 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.9)]'
                : 'bg-slate-800 border border-white/5'
            }`;
          }
        }
        if (thrusterLLabelRef.current) {
          thrusterLLabelRef.current.className = `text-[9px] font-bold pb-1 ${
            ship.leftThrusterPower > 0.1
              ? isOasis
                ? 'text-fuchsia-400 drop-shadow-[0_0_5px_rgba(232,121,249,0.9)]'
                : 'text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.9)]'
              : 'text-gray-600'
          }`;
        }
      }

      const rightStep = Math.min(6, Math.floor(ship.rightThrusterPower * 6.5));
      if (cache.rightPowerStep !== rightStep) {
        cache.rightPowerStep = rightStep;
        for (let i = 0; i < 6; i++) {
          const bar = thrusterRBarRefs.current[i];
          if (bar) {
            const active = ship.rightThrusterPower >= (i + 1) / 6;
            bar.className = `w-2.5 rounded-sm transition-all duration-75 ${
              active
                ? isOasis
                  ? 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.9)]'
                  : 'bg-fuchsia-400 shadow-[0_0_6px_rgba(232,121,249,0.9)]'
                : 'bg-slate-800 border border-white/5'
            }`;
          }
        }
        if (thrusterRLabelRef.current) {
          thrusterRLabelRef.current.className = `text-[9px] font-bold pb-1 ${
            ship.rightThrusterPower > 0.1
              ? isOasis
                ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.9)]'
                : 'text-fuchsia-400 drop-shadow-[0_0_5px_rgba(232,121,249,0.9)]'
              : 'text-gray-600'
          }`;
        }
      }

      // 5. Lives Indicator
      if (cache.lives !== ship.lives) {
        cache.lives = ship.lives;
        const maxLives = ship.maxLives || 3;
        for (let i = 0; i < maxLives; i++) {
          const slot = heartSlotRefs.current[i];
          if (slot) {
            const active = i < ship.lives;
            slot.className = `w-4 h-4 rounded flex items-center justify-center transition-all ${
              active
                ? 'bg-rose-500/25 border border-rose-400 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)] scale-105'
                : 'bg-slate-900 border border-white/10 text-gray-700 opacity-40'
            }`;
            const svgHeart = slot.querySelector('svg');
            if (svgHeart) {
              svgHeart.setAttribute('class', `w-2.5 h-2.5 ${active ? 'fill-rose-400' : 'fill-transparent'}`);
            }
          }
        }
      }

      // 5.5 Phase Shields + Shield Generator charge (v1.35.0)
      if (cache.shields !== ship.shields) {
        cache.shields = ship.shields;
        const displaySlots = SHIELD_DISPLAY_SLOTS;
        for (let i = 0; i < displaySlots; i++) {
          const slot = shieldSlotRefs.current[i];
          if (slot) {
            const active = i < ship.shields;
            slot.className = `w-4 h-4 rounded flex items-center justify-center transition-all ${
              active
                ? isOasis
                  ? 'bg-fuchsia-500/25 border border-fuchsia-400 text-fuchsia-300 shadow-[0_0_8px_rgba(232,121,249,0.85)] scale-105'
                  : 'bg-cyan-500/25 border border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.85)] scale-105'
                : 'bg-slate-900 border border-white/10 text-gray-700 opacity-40'
            }`;
            const svgShield = slot.querySelector('svg');
            if (svgShield) {
              svgShield.setAttribute('class', `w-2.5 h-2.5 ${active ? (isOasis ? 'fill-fuchsia-400/80' : 'fill-cyan-400/80') : 'fill-transparent'}`);
            }
          }
        }
      }
      {
        const genPct = Math.min(100, Math.round(ship.shieldGeneratorCharge * 100));
        if (cache.genChargePct !== genPct && genChargeBarRef.current) {
          cache.genChargePct = genPct;
          genChargeBarRef.current.style.width = `${genPct}%`;
          if (genChargeTextRef.current) {
            genChargeTextRef.current.textContent =
              genPct >= 100 ? 'PRONTO! ESCUDO NO BANCO' : `GERADOR ${genPct}%`;
            genChargeTextRef.current.className =
              genPct >= 100
                ? 'text-[9px] font-mono text-yellow-300 font-bold drop-shadow-[0_0_5px_rgba(253,224,71,0.9)] animate-pulse'
                : 'text-[9px] font-mono text-amber-400/90';
          }
        }
      }

      // 6. Active Power-Up & Status Badges
      if (badgePenaltyRef.current && badgePenaltyTextRef.current) {
        if (ship.timePenaltyNotifyTimer > 0) {
          badgePenaltyRef.current.style.display = 'flex';
          badgePenaltyTextRef.current.textContent = `-20s PENALIZAÇÃO! (${ship.lives} ${ship.lives === 1 ? 'VIDA RESTANTE' : 'VIDAS RESTANTES'})`;
        } else {
          badgePenaltyRef.current.style.display = 'none';
        }
      }

      if (badgeLaunchRef.current && badgeLaunchTextRef.current) {
        if (launchGraceTimer > 0) {
          badgeLaunchRef.current.style.display = 'flex';
          badgeLaunchTextRef.current.textContent = `ESTABILIZADOR ANTI-G: ${launchGraceTimer.toFixed(1)}s (FLUTUAÇÃO SEGURA)`;
        } else {
          badgeLaunchRef.current.style.display = 'none';
        }
      }

      if (badgeDamperRef.current && badgeDamperTextRef.current) {
        if (ship.damperActiveTimer > 0) {
          badgeDamperRef.current.style.display = 'flex';
          badgeDamperTextRef.current.textContent = `SONIC DAMPER: ${ship.damperActiveTimer.toFixed(1)}s`;
        } else {
          badgeDamperRef.current.style.display = 'none';
        }
      }

      if (badgeLowGRef.current && badgeLowGTextRef.current) {
        if (ship.lowGActiveTimer > 0) {
          badgeLowGRef.current.style.display = 'flex';
          badgeLowGTextRef.current.textContent = `LOW-G SURGE: ${ship.lowGActiveTimer.toFixed(1)}s`;
        } else {
          badgeLowGRef.current.style.display = 'none';
        }
      }

      if (badgeInvulnerableRef.current && badgeInvulnerableTextRef.current) {
        if (ship.invulnerableTime > 0) {
          badgeInvulnerableRef.current.style.display = 'flex';
          badgeInvulnerableTextRef.current.textContent = `INVULNERÁVEL: ${ship.invulnerableTime.toFixed(1)}s`;
        } else {
          badgeInvulnerableRef.current.style.display = 'none';
        }
      }

      if (badgeGhostRef.current && badgeGhostTextRef.current) {
        if (ship.etherealActiveTimer > 0) {
          badgeGhostRef.current.style.display = 'flex';
          badgeGhostTextRef.current.textContent = `MODO FANTASMA: ${ship.etherealActiveTimer.toFixed(1)}s`;
        } else {
          badgeGhostRef.current.style.display = 'none';
        }
      }

      if (badgePulseRef.current) {
        badgePulseRef.current.style.display = ship.sonicPulseNotifyTimer > 0 ? 'flex' : 'none';
      }

      if (badgeChronoRef.current && badgeChronoTextRef.current) {
        if (ship.chronoDilationTimer > 0) {
          badgeChronoRef.current.style.display = 'flex';
          badgeChronoTextRef.current.textContent = `DISTORÇÃO TEMPORAL: ${ship.chronoDilationTimer.toFixed(1)}s`;
        } else {
          badgeChronoRef.current.style.display = 'none';
        }
      }

      if (badgeSingularityRef.current) {
        badgeSingularityRef.current.style.display = ship.singularityNotifyTimer > 0 ? 'flex' : 'none';
      }
    }
  }));

  React.useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle error:', err);
    }
  };

  const initialRemainingSec = Math.max(0, Math.round(initialStats.totalDuration - initialStats.timeElapsed));
  const initialRemainingMin = Math.floor(initialRemainingSec / 60);
  const initialRemainingSecPadded = String(initialRemainingSec % 60).padStart(2, '0');
  const initialSpeedKmh = Math.round(Math.sqrt(initialShip.vx * initialShip.vx + initialShip.vy * initialShip.vy) * 0.7);

  const getAnnouncementIcon = (type: PowerUpType) => {
    switch (type) {
      case 'ETHEREAL':
        return <Ghost className="w-7 h-7 sm:w-8 sm:h-8 text-fuchsia-300 animate-pulse shrink-0 drop-shadow-[0_0_14px_rgba(217,70,239,0.9)]" />;
      case 'SHIELD':
        return <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-300 animate-spin shrink-0 drop-shadow-[0_0_14px_rgba(0,240,255,0.9)]" />;
      case 'DAMPER':
        return <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-300 animate-pulse shrink-0 drop-shadow-[0_0_14px_rgba(34,197,94,0.9)]" />;
      case 'LOW_G':
        return <Activity className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-300 animate-pulse shrink-0 drop-shadow-[0_0_14px_rgba(250,204,21,0.9)]" />;
      case 'PULSE':
        return <Radio className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-300 animate-ping shrink-0 drop-shadow-[0_0_14px_rgba(6,182,212,0.9)]" />;
      case 'INVULNERABLE':
        return <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-rose-300 animate-bounce shrink-0 drop-shadow-[0_0_14px_rgba(244,63,94,0.9)]" />;
      case 'CHRONO_DILATION':
        return <Clock className="w-7 h-7 sm:w-8 sm:h-8 text-teal-300 animate-spin shrink-0 drop-shadow-[0_0_14px_rgba(20,184,166,0.9)]" />;
      case 'SINGULARITY':
        return <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-purple-300 animate-spin shrink-0 drop-shadow-[0_0_14px_rgba(168,85,247,0.9)]" />;
      default:
        return <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-white shrink-0" />;
    }
  };

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-2 sm:p-3 md:p-6 select-none max-h-screen overflow-hidden">
      
      {/* Top Stack: HUD bar → countdown → power-up notifications */}
      <div className="flex flex-col items-center w-full gap-1.5 sm:gap-2">

        {/* Top Bar: Music Progress, Distance to Finish, Pause & Fullscreen Buttons */}
        <header className="flex flex-col gap-1.5 sm:gap-2 max-w-5xl w-full mx-auto">
          <div className="flex items-center justify-between gap-2 sm:gap-3 text-xs font-mono">
            
            {/* Track and Difficulty cluster */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-black/60 backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-lg border border-white/10 pointer-events-auto">
              <Activity className={`w-3.5 h-3.5 ${A} animate-pulse shrink-0`} />
              <span className="font-orbitron font-semibold text-white truncate max-w-[110px] sm:max-w-[180px] md:max-w-[260px] text-[11px] sm:text-xs">
                {trackTitle}
              </span>
              <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded ${isOasis ? 'bg-fuchsia-950/80' : 'bg-cyan-950/80'} ${isOasis ? 'text-fuchsia-300' : 'text-cyan-300'} border ${isOasis ? 'border-fuchsia-500/30' : 'border-cyan-500/30'} uppercase font-bold`}>
                {difficulty}
              </span>
            </div>

            {/* Top Controls Cluster: Fullscreen & Pause Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
              <button
                onClick={toggleFullscreen}
                className={`bg-black/60 hover:bg-slate-900 border border-white/20 hover:border-${A} text-white p-1.5 sm:p-2 rounded-lg transition cursor-pointer flex items-center gap-1 active:scale-95 shadow-sm`}
                title={isFullscreen ? 'Sair de Ecrã Inteiro (F11)' : 'Ecrã Inteiro (F11)'}
              >
                {isFullscreen ? (
                  <Minimize className={`w-3.5 sm:w-4 h-3.5 sm:h-4 ${isOasis ? 'text-fuchsia-400' : 'text-cyan-400'}`} />
                ) : (
                  <Maximize className={`w-3.5 sm:w-4 h-3.5 sm:h-4 ${isOasis ? 'text-fuchsia-400' : 'text-cyan-400'}`} />
                )}
              </button>

              <button
                onClick={onPause}
                className={`bg-black/60 hover:bg-slate-900 border border-white/20 hover:border-${A} text-white p-1.5 sm:p-2 rounded-lg transition cursor-pointer flex items-center gap-1 active:scale-95 shadow-sm`}
                title="Pausar jogo (ESC)"
              >
                <Pause className={`w-3.5 sm:w-4 h-3.5 sm:h-4 ${isOasis ? 'text-fuchsia-400' : 'text-cyan-400'}`} />
                <span className="hidden sm:inline font-orbitron text-xs">PAUSA</span>
              </button>
            </div>
          </div>

          {/* Global Progress Bar towards Goal Portal (Updated directly via DOM ref) */}
          <div className="relative w-full h-2 sm:h-2.5 bg-slate-900/80 rounded-full border border-white/15 overflow-hidden backdrop-blur-sm">
            <div
              ref={progressBarRef}
              className={`h-full bg-gradient-to-r ${isOasis ? 'from-fuchsia-500 via-purple-600 to-rose-500' : 'from-cyan-500 via-sky-400 to-fuchsia-500'} rounded-full shadow-[0_0_12px_rgba(${isOasis ? '232,121,249' : '6,182,212'},0.8)]`}
              style={{ width: `${Math.max(1, Math.min(100, initialStats.percentCompleted))}%` }}
            />
            {/* Finish Portal Pin marker */}
            <div className="absolute right-0 top-0 bottom-0 w-2.5 sm:w-3 bg-fuchsia-400 shadow-[0_0_8px_rgba(236,72,153,1)]" />
          </div>
        </header>

        {/* Big centered remaining-time display (Updated directly via DOM ref) */}
        <div className="flex flex-col items-center gap-0 pointer-events-none select-none">
          <span
            ref={countdownLabelRef}
            className="text-[9px] sm:text-[10px] font-mono tracking-[0.25em] sm:tracking-[0.3em] uppercase transition-colors duration-300 text-cyan-400/70"
          >
            Tempo Restante
          </span>
          <span
            ref={countdownTextRef}
            className="text-3xl sm:text-5xl md:text-6xl font-black font-orbitron tracking-tighter whitespace-nowrap leading-none transition-colors duration-300 text-cyan-300 drop-shadow-[0_0_20px_rgba(6,182,212,0.9)]"
          >
            {String(initialRemainingMin).padStart(2, '0')}:{initialRemainingSecPadded}
          </span>
        </div>

        {/* Power-up Announcement (Discrete React Banner) */}
        {announcement && (
          <div
            key={announcement.id}
            className="mt-1 flex flex-col items-center text-center pointer-events-none select-none animate-in fade-in zoom-in-95 duration-200 px-2"
          >
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              {getAnnouncementIcon(announcement.type)}
              <span
                className={`font-orbitron font-black text-2xl sm:text-3xl md:text-4xl tracking-wider uppercase ${announcement.color} drop-shadow-[0_0_20px_${announcement.glowColor}] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-tight`}
              >
                {announcement.title}
              </span>
            </div>
            <span className="font-rajdhani font-bold text-base sm:text-xl md:text-2xl text-white drop-shadow-[0_2px_5px_rgba(0,0,0,1)] drop-shadow-[0_0_16px_rgba(0,0,0,1)] tracking-wide mt-1.5 max-w-2xl text-center leading-snug">
              {announcement.subtitle}
            </span>
          </div>
        )}

        {/* Power-up Notifications Badges (Managed directly via DOM refs) */}
        <div className="mt-1 flex flex-col items-center gap-2 z-10 pointer-events-none">
          <div
            ref={badgePenaltyRef}
            style={{ display: initialShip.timePenaltyNotifyTimer > 0 ? 'flex' : 'none' }}
            className="items-center gap-2 px-3.5 py-1.5 rounded-lg bg-rose-950/95 border border-rose-500 text-rose-300 font-mono text-xs shadow-lg shadow-rose-950/80 animate-bounce"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
            <span ref={badgePenaltyTextRef} className="font-orbitron font-bold tracking-wide">
              -20s PENALIZAÇÃO!
            </span>
          </div>

          <div
            ref={badgeLaunchRef}
            style={{ display: initialLaunchGraceTimer > 0 ? 'flex' : 'none' }}
            className="items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950/90 border border-cyan-400 text-cyan-300 font-mono text-xs shadow-lg shadow-cyan-950/80 animate-pulse"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span ref={badgeLaunchTextRef}>
              ESTABILIZADOR ANTI-G: {initialLaunchGraceTimer.toFixed(1)}s (FLUTUAÇÃO SEGURA)
            </span>
          </div>

          <div
            ref={badgeDamperRef}
            style={{ display: initialShip.damperActiveTimer > 0 ? 'flex' : 'none' }}
            className="items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs shadow-lg shadow-emerald-950/50"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            <span ref={badgeDamperTextRef}>SONIC DAMPER: {initialShip.damperActiveTimer.toFixed(1)}s</span>
          </div>

          <div
            ref={badgeLowGRef}
            style={{ display: initialShip.lowGActiveTimer > 0 ? 'flex' : 'none' }}
            className="items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-950/80 border border-yellow-500/40 text-yellow-300 font-mono text-xs shadow-lg shadow-yellow-950/50"
          >
            <Activity className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
            <span ref={badgeLowGTextRef}>LOW-G SURGE: {initialShip.lowGActiveTimer.toFixed(1)}s</span>
          </div>

          <div
            ref={badgeInvulnerableRef}
            style={{ display: initialShip.invulnerableTime > 0 ? 'flex' : 'none' }}
            className="items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-300 font-mono text-xs shadow-lg shadow-rose-950/60 animate-pulse"
          >
            <Shield className="w-3.5 h-3.5 text-rose-400 animate-spin" />
            <span ref={badgeInvulnerableTextRef} className="drop-shadow-[0_0_6px_rgba(255,0,85,0.8)]">
              INVULNERÁVEL: {initialShip.invulnerableTime.toFixed(1)}s
            </span>
          </div>

          <div
            ref={badgeGhostRef}
            style={{ display: initialShip.etherealActiveTimer > 0 ? 'flex' : 'none' }}
            className="items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-950/80 border border-violet-500/50 text-violet-300 font-mono text-xs shadow-lg shadow-violet-950/60 animate-pulse"
          >
            <Activity className="w-3.5 h-3.5 text-violet-400 animate-spin" />
            <span ref={badgeGhostTextRef} className="drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]">
              MODO FANTASMA: {initialShip.etherealActiveTimer.toFixed(1)}s
            </span>
          </div>

          <div
            ref={badgePulseRef}
            style={{ display: initialShip.sonicPulseNotifyTimer > 0 ? 'flex' : 'none' }}
            className="items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 font-mono text-xs shadow-lg shadow-cyan-950/50 animate-pulse"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span className="drop-shadow-[0_0_6px_rgba(0,240,255,0.8)]">PULSO SÓNICO!</span>
          </div>

          <div
            ref={badgeChronoRef}
            style={{ display: initialShip.chronoDilationTimer > 0 ? 'flex' : 'none' }}
            className="items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-950/80 border border-teal-400/50 text-teal-300 font-mono text-xs shadow-lg shadow-teal-950/50 animate-pulse"
          >
            <Clock className="w-3.5 h-3.5 text-teal-400 animate-spin" />
            <span ref={badgeChronoTextRef} className="drop-shadow-[0_0_6px_rgba(20,184,166,0.8)]">
              DISTORÇÃO TEMPORAL: {initialShip.chronoDilationTimer.toFixed(1)}s
            </span>
          </div>

          <div
            ref={badgeSingularityRef}
            style={{ display: initialShip.singularityNotifyTimer > 0 ? 'flex' : 'none' }}
            className="items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-950/90 border border-purple-400/60 text-purple-300 font-mono text-xs shadow-lg shadow-purple-950/60 animate-pulse"
          >
            <Radio className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            <span className="drop-shadow-[0_0_8px_rgba(192,132,252,0.9)]">SINGULARIDADE DE RESSONÂNCIA!</span>
          </div>
        </div>
      </div>

      {/* Bottom Perimeter Cluster: Speed + Dual-Thruster pressure bars + Lives */}
      <footer className="flex items-end justify-start gap-2 sm:gap-4 max-w-5xl w-full mx-auto shrink-0">
        <div className="flex items-end gap-2 sm:gap-4 bg-black/60 backdrop-blur-md px-2 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-white/10 font-mono text-xs">
          
          {/* Speed */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Gauge className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
            <div className="min-w-[64px] sm:min-w-[82px] shrink-0">
              <div className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wider">Velocidade</div>
              <div className="font-orbitron font-bold text-sm text-white tabular-nums whitespace-nowrap flex items-baseline gap-1">
                <span ref={speedTextRef}>{initialSpeedKmh}</span>
                <span className="text-[9px] sm:text-[10px] font-normal text-gray-400">km/h</span>
              </div>
            </div>
          </div>

          <div className="w-px self-stretch bg-white/10 hidden sm:block" />

          {/* Dual-Thruster pressure gauges — segmented vertical bars (hidden on phones
              to keep every bottom HUD cluster visible; thruster feedback lives on the
              ship's flame cones and L/R gauges remain on sm+ screens) */}
          <div className="hidden sm:flex items-end gap-3.5">
            <div className="flex items-end gap-1.5">
              <span
                ref={thrusterLLabelRef}
                className={`text-[9px] font-bold pb-1 ${
                  initialShip.leftThrusterPower > 0.1
                    ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.9)]'
                    : 'text-gray-600'
                }`}
              >
                L
              </span>
              <div className="flex flex-col-reverse gap-[3px] h-8" aria-label="Motor esquerdo">
                {Array.from({ length: 6 }).map((_, i) => {
                  const active = initialShip.leftThrusterPower >= (i + 1) / 6;
                  return (
                    <div
                      key={i}
                      ref={(el) => { thrusterLBarRefs.current[i] = el; }}
                      className={`w-2.5 rounded-sm transition-all duration-75 ${
                        active
                          ? 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.9)]'
                          : 'bg-slate-800 border border-white/5'
                      }`}
                      style={{ height: '4px' }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex items-end gap-1.5">
              <div className="flex flex-col-reverse gap-[3px] h-8" aria-label="Motor direito">
                {Array.from({ length: 6 }).map((_, i) => {
                  const active = initialShip.rightThrusterPower >= (i + 1) / 6;
                  return (
                    <div
                      key={i}
                      ref={(el) => { thrusterRBarRefs.current[i] = el; }}
                      className={`w-2.5 rounded-sm transition-all duration-75 ${
                        active
                          ? 'bg-fuchsia-400 shadow-[0_0_6px_rgba(232,121,249,0.9)]'
                          : 'bg-slate-800 border border-white/5'
                      }`}
                      style={{ height: '4px' }}
                    />
                  );
                })}
              </div>
              <span
                ref={thrusterRLabelRef}
                className={`text-[9px] font-bold pb-1 ${
                  initialShip.rightThrusterPower > 0.1
                    ? 'text-fuchsia-400 drop-shadow-[0_0_5px_rgba(232,121,249,0.9)]'
                    : 'text-gray-600'
                }`}
              >
                R
              </span>
            </div>
          </div>

          <div className="w-px self-stretch bg-white/10" />

          {/* Lives (Vidas) indicator */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="min-w-[56px] sm:min-w-[68px]">
              <div className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Heart className="w-3 h-3 text-rose-400 fill-rose-400/80" />
                <span>Vidas</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {Array.from({ length: initialShip.maxLives || 3 }).map((_, i) => {
                  const active = i < initialShip.lives;
                  return (
                    <div
                      key={i}
                      ref={(el) => { heartSlotRefs.current[i] = el; }}
                      className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                        active
                          ? 'bg-rose-500/25 border border-rose-400 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)] scale-105'
                          : 'bg-slate-900 border border-white/10 text-gray-700 opacity-40'
                      }`}
                      title={`Vida ${i + 1}`}
                    >
                      <Heart className={`w-2.5 h-2.5 ${active ? 'fill-rose-400' : 'fill-transparent'}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="w-px self-stretch bg-white/10" />

          {/* Phase Shields + Shield Generator charge indicator (v1.35.0) */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="min-w-[80px] sm:min-w-[92px]">
              <div className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3 h-3 text-cyan-400" />
                <span>Escudos · Ger.</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {Array.from({ length: SHIELD_DISPLAY_SLOTS }).map((_, i) => {
                  const active = i < (initialShip.shields || 0);
                  return (
                    <div
                      key={i}
                      ref={(el) => { shieldSlotRefs.current[i] = el; }}
                      className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                        active
                          ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.85)] scale-105'
                          : 'bg-slate-900 border border-white/10 text-gray-700 opacity-40'
                      }`}
                      title={`Fase Shield ${i + 1}`}
                    >
                      <Shield className={`w-2.5 h-2.5 ${active ? 'fill-cyan-400/80' : 'fill-transparent'}`} />
                    </div>
                  );
                })}
              </div>
              {/* Shield Generator charge bar — fills with risky close-flight wall scrapes */}
              <div className="mt-1 h-1 rounded-full bg-slate-800 border border-white/5 w-full overflow-hidden">
                <div
                  ref={genChargeBarRef}
                  style={{ width: `${Math.min(100, Math.round((initialShip.shieldGeneratorCharge || 0) * 100))}%` }}
                  className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-yellow-300 rounded-full shadow-[0_0_6px_rgba(251,191,36,0.7)]"
                />
              </div>
              <span ref={genChargeTextRef} className="text-[9px] font-mono text-amber-400/90">
                GERADOR {Math.min(100, Math.round((initialShip.shieldGeneratorCharge || 0) * 100))}%
              </span>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
});

GameHUD.displayName = 'GameHUD';
