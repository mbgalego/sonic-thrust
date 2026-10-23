/**
 * Sonic Thrust - End Game Modal (Victory & Game Over)
 */

import React from 'react';
import { Trophy, Skull, RotateCcw, Home, Zap, Shield, Gauge, Clock } from 'lucide-react';
import { GameStats, DifficultyLevel } from '../types/game';

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

  const destructionLabels = {
    CEILING: 'Colisão Imediata com o Teto Vetorial',
    FLOOR: 'Impacto Severo com o Solo Néon',
    OBSTACLE: 'Colisão com Plataforma Rotativa (Médios)',
    LASER: 'Desintegração por Barreira Laser (Agudos)'
  };

  const reasonText = stats.destructionReason
    ? destructionLabels[stats.destructionReason] || 'Contacto Ilegal com o Terreno'
    : 'Contacto Ilegal com o Terreno';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg">
      <div
        className={`max-w-lg w-full bg-slate-950 border rounded-2xl p-6 md:p-8 shadow-2xl space-y-6 ${
          isVictory
            ? 'border-cyan-400/60 shadow-cyan-500/20'
            : 'border-rose-500/60 shadow-rose-500/20'
        }`}
      >
        {/* Header with Icon Lockup */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-full bg-black/60 border border-white/10 mb-1">
            {isVictory ? (
              <Trophy className="w-10 h-10 text-cyan-400 animate-bounce" />
            ) : (
              <Skull className="w-10 h-10 text-rose-500 animate-pulse" />
            )}
          </div>

          <h2
            className={`text-2xl md:text-3xl font-black font-orbitron tracking-widest uppercase ${
              isVictory ? 'text-cyan-300 neon-text-cyan' : 'text-rose-400 neon-text-magenta'
            }`}
          >
            {isVictory ? 'MISSÃO CUMPRIDA!' : outOfTime ? 'TEMPO ESGOTADO' : 'SINAL PERDIDO · NAVE DESTRUÍDA'}
          </h2>

          <p className="text-xs md:text-sm text-gray-300 font-rajdhani">
            {isVictory
              ? 'Atingiste o Portal de Meta no exato compasso de encerramento da faixa!'
              : outOfTime
                ? 'A faixa terminou antes de alcançares o Portal de Meta — a missão expirou.'
                : reasonText}
          </p>

          {!isVictory && (
            <div className="inline-block px-3 py-1 rounded bg-rose-950/60 border border-rose-500/30 text-[11px] font-mono text-rose-300">
              {outOfTime ? 'A MÚSICA NÃO ESPERA' : 'REGRA DE OURO: ZERO CONTACT'}
            </div>
          )}
        </div>

        {/* Mission Telemetry Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 rounded-xl bg-slate-900/60 border border-white/10 font-mono text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" /> Progresso
            </span>
            <span className="font-orbitron font-bold text-base text-white mt-1 tabular-nums">
              {Math.round(stats.percentCompleted)}%
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" /> Tempo Voo
            </span>
            <span className="font-orbitron font-bold text-base text-white mt-1 tabular-nums">
              {String(elapsedMin).padStart(2, '0')}:{String(elapsedSec).padStart(2, '0')}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase flex items-center gap-1">
              <Gauge className="w-3 h-3 text-fuchsia-400" /> Vel. Máx
            </span>
            <span className="font-orbitron font-bold text-base text-white mt-1 tabular-nums">
              {Math.round(stats.maxSpeed * 0.7)} <span className="text-[10px] font-normal text-gray-400">km/h</span>
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase flex items-center gap-1">
              <Shield className="w-3 h-3 text-sky-400" /> Orbes Coletados
            </span>
            <span className="font-orbitron font-bold text-base text-white mt-1 tabular-nums">
              {stats.powerUpsCollected}
            </span>
          </div>
        </div>

        {/* Track & Difficulty Info pill */}
        <div className="flex items-center justify-between text-xs font-mono px-3 py-2 rounded-lg bg-black/40 border border-white/5 text-gray-400">
          <span className="truncate max-w-[200px] text-gray-300">{trackTitle}</span>
          <span className="uppercase text-cyan-400 font-bold">{difficulty}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={onRestart}
            className={`flex-1 py-3.5 rounded-xl font-orbitron font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
              isVictory
                ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/30'
                : 'bg-rose-500 hover:bg-rose-400 text-black shadow-rose-500/30'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>TENTAR NOVAMENTE</span>
          </button>

          <button
            onClick={onExitToMenu}
            className="sm:w-44 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/20 text-white font-orbitron font-medium text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4 text-gray-400" />
            <span>MENU INICIAL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
