/**
 * Sonic Thrust - In-Game HUD Component
 * Low-occlusion, world-matched cyber display showing music progress, distance to finish portal,
 * velocity, altitude clearance, shield status, active power-up timers, and pause controls.
 */

import React from 'react';
import {
  Shield,
  Gauge,
  Pause,
  Zap,
  Activity,
  Maximize,
  Minimize
} from 'lucide-react';
import { GameStats, DifficultyLevel } from '../types/game';
import { ShipState } from '../physics/PhysicsWorld';

interface GameHUDProps {
  stats: GameStats;
  ship: ShipState;
  difficulty: DifficultyLevel;
  trackTitle: string;
  onPause: () => void;
  launchGraceTimer?: number;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  ship,
  difficulty,
  trackTitle,
  onPause,
  launchGraceTimer = 0
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(Boolean(document.fullscreenElement));

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

  const remainingSec = Math.max(0, Math.round(stats.totalDuration - stats.timeElapsed));
  const remainingMin = Math.floor(remainingSec / 60);
  const remainingSecPadded = String(remainingSec % 60).padStart(2, '0');

  // Countdown color phases: sane cyan → amber at 45s → red with pulsing tension at 25s
  const isCountWarning = remainingSec <= 45 && remainingSec > 25;
  const isCountCritical = remainingSec <= 25;

  const speedKmh = Math.round(Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy) * 0.7);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 md:p-6 select-none">
      
      {/* Top Stack: HUD bar → countdown → power-up notifications */}
      <div className="flex flex-col items-center w-full gap-2">

      {/* Top Bar: Music Progress, Distance to Finish, Pause & Fullscreen Buttons */}
      <header className="flex flex-col gap-2 max-w-5xl w-full mx-auto">
        <div className="flex items-center justify-between gap-3 text-xs font-mono">
          
          {/* Track and Difficulty cluster */}
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 pointer-events-auto">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="font-orbitron font-semibold text-white truncate max-w-[150px] md:max-w-[260px]">
              {trackTitle}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 uppercase font-bold">
              {difficulty}
            </span>
          </div>

          {/* Top Controls Cluster: Fullscreen & Pause Buttons */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={toggleFullscreen}
              className="bg-black/60 hover:bg-slate-900 border border-white/20 hover:border-cyan-400 text-white p-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
              title={isFullscreen ? 'Sair de Ecrã Inteiro (F11)' : 'Ecrã Inteiro (F11)'}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4 text-cyan-400" />
              ) : (
                <Maximize className="w-4 h-4 text-cyan-400" />
              )}
            </button>

            <button
              onClick={onPause}
              className="bg-black/60 hover:bg-slate-900 border border-white/20 hover:border-cyan-400 text-white p-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
              title="Pausar jogo (ESC)"
            >
              <Pause className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline font-orbitron text-xs">PAUSA</span>
            </button>
          </div>
        </div>

        {/* Global Progress Bar towards Goal Portal */}
        <div className="relative w-full h-2.5 bg-slate-900/80 rounded-full border border-white/15 overflow-hidden backdrop-blur-sm">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-fuchsia-500 transition-all duration-150 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.8)]"
            style={{ width: `${Math.max(1, Math.min(100, stats.percentCompleted))}%` }}
          />
          {/* Finish Portal Pin marker */}
          <div className="absolute right-0 top-0 bottom-0 w-3 bg-fuchsia-400 shadow-[0_0_8px_rgba(236,72,153,1)]" />
        </div>
      </header>

      {/* Big centered remaining-time display — close under the HUD bar */}
      <div className="flex flex-col items-center gap-0.5 pointer-events-none select-none">
        <span className={`text-[10px] font-mono tracking-[0.3em] uppercase transition-colors duration-300 ${
          isCountCritical ? 'text-rose-400/90' : isCountWarning ? 'text-amber-400/80' : 'text-cyan-400/70'
        }`}>Tempo Restante</span>
        <span className={`text-5xl md:text-7xl font-black font-orbitron tracking-tighter whitespace-nowrap leading-none transition-colors duration-300 ${
          isCountCritical
            ? 'text-rose-400 drop-shadow-[0_0_22px_rgba(244,63,94,0.95)] animate-pulse'
            : isCountWarning
              ? 'text-amber-300 drop-shadow-[0_0_20px_rgba(251,191,36,0.85)]'
              : 'text-cyan-300 drop-shadow-[0_0_20px_rgba(6,182,212,0.9)]'
        }`}>
          {String(remainingMin).padStart(2, '0')}:{remainingSecPadded}
        </span>
      </div>

      {/* Power-up Notifications — right below the countdown timer */}
      <div className="mt-1 flex flex-col items-center gap-2 z-10 pointer-events-none">
        {launchGraceTimer > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950/90 border border-cyan-400 text-cyan-300 font-mono text-xs shadow-lg shadow-cyan-950/80 animate-pulse">
            <Zap className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span>ESTABILIZADOR ANTI-G: {launchGraceTimer.toFixed(1)}s (FLUTUAÇÃO SEGURA)</span>
          </div>
        )}

        {ship.damperActiveTimer > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs shadow-lg shadow-emerald-950/50">
            <Zap className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            <span>SONIC DAMPER: {ship.damperActiveTimer.toFixed(1)}s</span>
          </div>
        )}

        {ship.lowGActiveTimer > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-950/80 border border-yellow-500/40 text-yellow-300 font-mono text-xs shadow-lg shadow-yellow-950/50">
            <Activity className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
            <span>LOW-G SURGE: {ship.lowGActiveTimer.toFixed(1)}s</span>
          </div>
        )}

        {ship.invulnerableTime > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-300 font-mono text-xs shadow-lg shadow-rose-950/60 animate-pulse">
            <Shield className="w-3.5 h-3.5 text-rose-400 animate-spin" />
            <span className="drop-shadow-[0_0_6px_rgba(255,0,85,0.8)]">INVULNERÁVEL: {ship.invulnerableTime.toFixed(1)}s</span>
          </div>
        )}

        {ship.etherealActiveTimer > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-950/80 border border-violet-500/50 text-violet-300 font-mono text-xs shadow-lg shadow-violet-950/60 animate-pulse">
            <Activity className="w-3.5 h-3.5 text-violet-400 animate-spin" />
            <span className="drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]">MODO FANTASMA: {ship.etherealActiveTimer.toFixed(1)}s</span>
          </div>
        )}

        {ship.sonicPulseNotifyTimer > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 font-mono text-xs shadow-lg shadow-cyan-950/50 animate-pulse">
            <Zap className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span className="drop-shadow-[0_0_6px_rgba(0,240,255,0.8)]">PULSO SÓNICO!</span>
          </div>
        )}
      </div>
      </div>

      {/* Bottom Perimeter Cluster: Speed + Dual-Thruster pressure bars */}
      <footer className="flex items-end justify-start gap-4 max-w-5xl w-full mx-auto">

        <div className="flex items-end gap-4 bg-black/60 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/10 font-mono text-xs">
          {/* Speed */}
          <div className="flex items-center gap-2 shrink-0">
            <Gauge className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-[82px] shrink-0">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Velocidade</div>
              <div className="font-orbitron font-bold text-sm text-white tabular-nums whitespace-nowrap flex items-baseline gap-1">
                <span>{speedKmh}</span>
                <span className="text-[10px] font-normal text-gray-400">km/h</span>
              </div>
            </div>
          </div>

          <div className="w-px self-stretch bg-white/10" />

          {/* Dual-Thruster pressure gauges — segmented vertical bars (L = cyan, R = fuchsia) */}
          <div className="flex items-end gap-3.5">
            <div className="flex items-end gap-1.5">
              <span className={`text-[9px] font-bold pb-1 ${ship.leftThrusterPower > 0.1 ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.9)]' : 'text-gray-600'}`}>
                L
              </span>
              <div className="flex flex-col-reverse gap-[3px] h-8" aria-label="Motor esquerdo">
                {Array.from({ length: 6 }).map((_, i) => {
                  const active = ship.leftThrusterPower >= (i + 1) / 6;
                  return (
                    <div
                      key={i}
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
                  const active = ship.rightThrusterPower >= (i + 1) / 6;
                  return (
                    <div
                      key={i}
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
              <span className={`text-[9px] font-bold pb-1 ${ship.rightThrusterPower > 0.1 ? 'text-fuchsia-400 drop-shadow-[0_0_5px_rgba(232,121,249,0.9)]' : 'text-gray-600'}`}>
                R
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
