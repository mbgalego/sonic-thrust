/**
 * Sonic Thrust - Pause Modal Component
 */

import React from 'react';
import { Play, RotateCcw, Home } from 'lucide-react';
import { GameOptions } from '../types/game';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onExitToMenu: () => void;
  options: GameOptions;
  onOptionsChange: (newOptions: GameOptions) => void;
  allowFlightAssist: boolean;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onExitToMenu,
  options,
  onOptionsChange,
  allowFlightAssist
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="max-w-md w-full max-h-[94vh] overflow-y-auto my-auto bg-slate-950 border border-cyan-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-3 sm:space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black font-orbitron text-white tracking-widest uppercase neon-text-cyan">
            MISSÃO PAUSADA
          </h2>
          <p className="text-xs text-gray-400 font-mono">Pressiona ESC ou RETOMAR para continuar o voo</p>
        </div>

        {/* Quick Options */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-gray-300">Flight Assist</span>
            {allowFlightAssist ? (
              <button
                type="button"
                onClick={() => onOptionsChange({ ...options, flightAssist: !options.flightAssist })}
                className={`px-3 py-1 rounded text-xs font-mono font-bold cursor-pointer transition ${
                  options.flightAssist ? 'bg-cyan-500 text-black' : 'bg-white/10 text-gray-400'
                }`}
              >
                {options.flightAssist ? 'LIGADO' : 'DESLIGADO'}
              </button>
            ) : (
              <span className="text-[10px] text-rose-400">DESATIVADO (EXTREME)</span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-gray-300">Compensação de Deriva</span>
            <button
              type="button"
              onClick={() => onOptionsChange({ ...options, driftCompensation: !options.driftCompensation })}
              className={`px-3 py-1 rounded text-xs font-mono font-bold cursor-pointer transition ${
                options.driftCompensation ? 'bg-cyan-500 text-black' : 'bg-white/10 text-gray-400'
              }`}
              title="Desativa o avanço automático para a direita"
            >
              {options.driftCompensation ? 'LIGADO' : 'DESLIGADO'}
            </button>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-mono text-gray-400 mb-1">
              <span>Volume Música</span>
              <span>{Math.round(options.musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={options.musicVolume}
              onChange={(e) => onOptionsChange({ ...options, musicVolume: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-mono text-gray-400 mb-1">
              <span>Volume SFX</span>
              <span>{Math.round(options.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={options.sfxVolume}
              onChange={(e) => onOptionsChange({ ...options, sfxVolume: parseFloat(e.target.value) })}
              className="w-full accent-fuchsia-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-orbitron font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RETOMAR MISSÃO</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/20 text-white font-orbitron font-medium text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4 text-cyan-400" />
            <span>REINICIAR PISTA</span>
          </button>

          <button
            onClick={onExitToMenu}
            className="w-full py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-white/10 text-gray-300 font-orbitron font-medium text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4 text-gray-400" />
            <span>VOLTAR AO MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
