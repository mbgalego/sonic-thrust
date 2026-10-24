/**
 * Sonic Thrust - Title Menu & Mission Setup Component
 */

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Loader2,
  Shield,
  Sliders,
  Compass,
  AlertTriangle,
  Music,
  CheckCircle2,
  Maximize,
  Minimize,
  Activity,
  BookOpen
} from 'lucide-react';
import {
  DifficultyLevel,
  TrackMetadata,
  GameOptions
} from '../types/game';
import { DIFFICULTY_PRESETS } from '../physics/PhysicsWorld';

interface TitleMenuProps {
  tracks: TrackMetadata[];
  selectedTrack: TrackMetadata | null;
  onSelectTrack: (track: TrackMetadata) => void;
  difficulty: DifficultyLevel;
  onSelectDifficulty: (diff: DifficultyLevel) => void;
  options: GameOptions;
  onOptionsChange: (newOptions: GameOptions) => void;
  onStartMission: () => void;
  onPreviewTrack: (track: TrackMetadata) => void;
  previewingTrackId: string | null;
  loadingTrackId: string | null;
}

export const TitleMenu: React.FC<TitleMenuProps> = ({
  tracks,
  selectedTrack,
  onSelectTrack,
  difficulty,
  onSelectDifficulty,
  options,
  onOptionsChange,
  onStartMission,
  onPreviewTrack,
  previewingTrackId,
  loadingTrackId
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  useEffect(() => {
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

  const currentDiffConfig = DIFFICULTY_PRESETS[difficulty];

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-4 md:p-8 bg-black/90 backdrop-blur-md overflow-y-auto">
      {/* Background Neon Ambient Glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar Controls: Guide Access & Fullscreen Toggle */}
      <div className="absolute top-4 right-4 md:top-6 md:right-8 z-40 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-400/50 bg-cyan-950/70 hover:bg-cyan-900/80 hover:border-cyan-300 text-cyan-300 hover:text-white text-xs font-orbitron tracking-wider transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
          title="Abrir Manual do Piloto e Guia de Voo"
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Manual de Voo</span>
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-slate-900/80 hover:bg-cyan-950/60 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-mono transition-all shadow-md shadow-black/50 cursor-pointer"
          title={isFullscreen ? 'Sair de Ecrã Inteiro (F11)' : 'Ativar Ecrã Inteiro (F11)'}
        >
          {isFullscreen ? (
            <>
              <Minimize className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Janela</span>
            </>
          ) : (
            <>
              <Maximize className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Ecrã Inteiro</span>
            </>
          )}
        </button>
      </div>

      {/* Header & Bespoke Title Lockup (without lightning bolt before title) */}
      <header className="relative z-10 flex flex-col items-center justify-center text-center pt-2 pb-4">
        <h1 className="text-4xl md:text-6xl font-black tracking-wider uppercase italic font-orbitron neon-text-cyan flex items-center justify-center">
          <span>SONIC <span className="text-fuchsia-400 neon-text-magenta">THRUST</span></span>
        </h1>
        <p className="text-gray-400 text-sm md:text-base max-w-xl mt-1 font-rajdhani">
          Navega por desfiladeiros de néon que vibram com as frequências sonoras e testa os teus reflexos.
        </p>
      </header>

      {/* Main Grid: Track Selector, Difficulty, Options */}
      <main className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl w-full mx-auto my-auto py-2">
        
        {/* Left Column: Track Selector (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-1 border-b border-white/10">
            <h2 className="text-sm font-semibold tracking-wider text-cyan-400 uppercase font-orbitron flex items-center gap-2">
              <Music className="w-4 h-4" />
              1. Seleciona a Faixa Musical
            </h2>
            <span className="text-xs font-mono text-cyan-400/60 uppercase tracking-widest">
              {tracks.length} Faixas Disponíveis
            </span>
          </div>

          {/* Tracks List */}
          <div className="flex flex-col gap-2.5 max-h-[290px] overflow-y-auto pr-1">
            {tracks.map((track) => {
              const isSelected = selectedTrack?.id === track.id;
              const isPlayingThis = previewingTrackId === track.id;
              const isLoadingThis = loadingTrackId === track.id;

              return (
                <div
                  key={track.id}
                  onClick={() => onSelectTrack(track)}
                  className={`group relative p-3.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-950/40 neon-border-cyan'
                      : 'border-white/10 bg-slate-900/50 hover:border-cyan-500/40 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTrack(track);
                        onPreviewTrack(track);
                      }}
                      disabled={isLoadingThis}
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition cursor-pointer ${
                        isPlayingThis
                          ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/50'
                          : isSelected
                            ? 'bg-cyan-500/80 text-black shadow-md shadow-cyan-500/30 hover:bg-cyan-400'
                            : 'bg-white/10 text-cyan-400 group-hover:bg-cyan-500/20 hover:text-white'
                      }`}
                      title={isPlayingThis ? 'Parar pré-escuta' : 'Pré-escutar faixa'}
                    >
                      {isLoadingThis ? (
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                      ) : isPlayingThis ? (
                        <Pause className="w-4 h-4 fill-current text-black animate-pulse" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                      )}
                    </button>

                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-orbitron font-semibold text-sm text-white truncate">
                          {track.title}
                        </span>
                        {track.isProcedural && (
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-fuchsia-950/60 border border-fuchsia-500/40 text-fuchsia-300">
                            Synth
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 font-rajdhani truncate mt-0.5">
                        {track.artist} {track.description ? `· ${track.description}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* BPM & Duration pill */}
                  <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                    <span className="px-2 py-1 rounded bg-black/60 border border-white/10 text-cyan-400 tabular-nums">
                      {track.estimatedBpm || 128} BPM
                    </span>
                    <span className="px-2 py-1 rounded bg-black/60 border border-white/10 text-gray-300 tabular-nums">
                      {Math.floor((track.duration || 90) / 60)}:
                      {String(Math.floor((track.duration || 90) % 60)).padStart(2, '0')}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Difficulty & Flight Settings (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Difficulty Selector */}
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold tracking-wider text-cyan-400 uppercase font-orbitron flex items-center gap-2 pb-1 border-b border-white/10">
              <Shield className="w-4 h-4" />
              2. Nível de Dificuldade
            </h2>

            <div className="grid grid-cols-3 gap-2">
              {(['NORMAL', 'PRO', 'EXTREME'] as DifficultyLevel[]).map((level) => {
                const config = DIFFICULTY_PRESETS[level];
                const active = difficulty === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      onSelectDifficulty(level);
                      // Align flight assist default with the difficulty preset
                      if (!config.allowFlightAssist) {
                        onOptionsChange({ ...options, flightAssist: false });
                      } else {
                        onOptionsChange({ ...options, flightAssist: config.defaultFlightAssist });
                      }
                    }}
                    className={`p-2.5 rounded-lg border text-center transition flex flex-col items-center justify-center cursor-pointer ${
                      active
                        ? level === 'EXTREME'
                          ? 'border-rose-500 bg-rose-950/40 text-rose-300 shadow-md shadow-rose-500/20'
                          : 'border-cyan-400 bg-cyan-950/40 text-cyan-300 neon-border-cyan'
                        : 'border-white/10 bg-slate-900/40 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    <span className="font-orbitron font-bold text-xs uppercase tracking-wide">
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Settings & Flight Assist */}
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold tracking-wider text-cyan-400 uppercase font-orbitron flex items-center gap-2 pb-1 border-b border-white/10">
              <Sliders className="w-4 h-4" />
              3. Parâmetros de Voo & Áudio
            </h2>

            {/* Flight Assist Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/50 border border-white/10">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-xs font-orbitron font-medium text-white">Flight Assist (Auto-Estabilização)</div>
                  <div className="text-[11px] text-gray-400 font-rajdhani">Aplica torque corretivo para nivelar a nave a 0°</div>
                </div>
              </div>

              {currentDiffConfig.allowFlightAssist ? (
                <button
                  type="button"
                  onClick={() => onOptionsChange({ ...options, flightAssist: !options.flightAssist })}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                    options.flightAssist
                      ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                      : 'bg-white/10 text-gray-400 hover:bg-white/20'
                  }`}
                >
                  {options.flightAssist ? 'LIGADO' : 'DESLIGADO'}
                </button>
              ) : (
                <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-rose-950/80 border border-rose-500/40 text-rose-300">
                  BLOQUEADO (EXTREME)
                </span>
              )}
            </div>

            {/* Drift Compensation Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/50 border border-white/10">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-xs font-orbitron font-medium text-white">Compensação de Deriva</div>
                  <div className="text-[11px] text-gray-400 font-rajdhani">A nave mantém a posição — sem avanço automático para a direita</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOptionsChange({ ...options, driftCompensation: !options.driftCompensation })}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                  options.driftCompensation
                    ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                {options.driftCompensation ? 'LIGADO' : 'DESLIGADO'}
              </button>
            </div>

            {/* Volumes */}
            <div className="grid grid-cols-2 gap-3 p-2.5 rounded-lg bg-slate-900/50 border border-white/10">
              <div>
                <div className="flex justify-between text-[11px] font-mono text-gray-400 mb-1">
                  <span>MÚSICA</span>
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
                  <span>SFX / MOTORES</span>
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
          </div>
        </section>
      </main>

      {/* Footer / Mission Start & Help CTAs */}
      <footer className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 max-w-6xl w-full mx-auto pt-3 border-t border-white/10">
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="px-4 py-2 rounded-xl bg-slate-900/90 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white flex items-center gap-2.5 transition cursor-pointer font-orbitron text-xs tracking-wider shadow-[0_0_12px_rgba(6,182,212,0.2)] hover:shadow-[0_0_18px_rgba(6,182,212,0.4)]"
        >
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <span>MANUAL DE VOO & GUIA TÉCNICO</span>
        </button>

        {/* Flight instructions and Start Mission Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full md:w-auto justify-end">
          {/* Sleek Cyber-Neon Flight Instructions Console */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-950/80 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.12)] font-mono text-xs">
            {/* Left thruster keycap */}
            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/60 text-cyan-300 font-bold font-orbitron text-[11px] shadow-[0_0_6px_rgba(6,182,212,0.35)]">A</span>
              <span className="text-gray-500 text-[10px]">/</span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/60 text-cyan-300 font-bold font-orbitron text-[11px] shadow-[0_0_6px_rgba(6,182,212,0.35)]">←</span>
              <span className="text-[10px] text-cyan-300 font-sans ml-0.5 hidden lg:inline">Prop. Esq</span>
            </div>
            
            <div className="w-px h-5 bg-white/15" />

            {/* Vertical climb combo */}
            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-fuchsia-950/80 border border-fuchsia-400/60 text-fuchsia-300 font-bold font-orbitron text-[11px] shadow-[0_0_6px_rgba(236,72,153,0.35)]">A+D</span>
              <span className="text-[10px] text-fuchsia-300 font-sans ml-0.5">Subida Vertical</span>
            </div>

            <div className="w-px h-5 bg-white/15" />

            {/* Right thruster keycap */}
            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-pink-950/80 border border-pink-400/60 text-pink-300 font-bold font-orbitron text-[11px] shadow-[0_0_6px_rgba(244,63,94,0.35)]">D</span>
              <span className="text-gray-500 text-[10px]">/</span>
              <span className="px-1.5 py-0.5 rounded bg-pink-950/80 border border-pink-400/60 text-pink-300 font-bold font-orbitron text-[11px] shadow-[0_0_6px_rgba(244,63,94,0.35)]">→</span>
              <span className="text-[10px] text-pink-300 font-sans ml-0.5 hidden lg:inline">Prop. Dir</span>
            </div>
          </div>

          <button
            onClick={onStartMission}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-fuchsia-500 text-black font-orbitron font-black text-sm md:text-base tracking-widest uppercase shadow-lg shadow-cyan-500/40 hover:shadow-cyan-400/60 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-3"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>INICIAR MISSÃO</span>
          </button>
        </div>
      </footer>

      {/* Comprehensive Cyber-Neon Pilot Guide Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-xl">
          <div className="max-w-3xl w-full max-h-[90vh] bg-slate-950 border border-cyan-500/50 rounded-2xl p-5 md:p-7 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col space-y-5 overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-cyan-400" />
                <div>
                  <h3 className="text-base sm:text-lg font-orbitron font-black text-cyan-400 tracking-wider">
                    MANUAL DO PILOTO: SONIC THRUST
                  </h3>
                  <p className="text-[11px] font-mono text-cyan-300/70 uppercase">
                    Protocolos de Voo Dinâmico · Ressonância FFT & Defesas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="text-gray-400 hover:text-white font-mono text-base px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="space-y-4 overflow-y-auto pr-1.5 text-xs text-gray-300 font-rajdhani leading-relaxed">
              
              {/* 1. Golden Rule (Zero Contact & Vidas) */}
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/50 text-red-200 shadow-md shadow-red-950/50">
                <div className="flex items-center gap-2 font-orbitron font-bold text-red-400 text-xs sm:text-sm uppercase mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Sistema de Vidas & Penalização de Tempo (-20s)</span>
                </div>
                <p>
                  A nave dispõe de 3 vidas (2 em Extreme). Quando sofres uma colisão desprotegida (sem Escudo de Fase), perdes 1 vida e sofres uma penalização imediata de <strong>-20 segundos</strong> no tempo restante da missão. A nave beneficia de 1.8s de invulnerabilidade e ressalta para o canal seguro. Se esgotares as vidas ou o cronómetro chegar a 0:00, a nave é destruída.
                </p>
              </div>

              {/* 2. Controls & Flight Mechanics */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-cyan-500/30 space-y-2">
                <div className="font-orbitron font-bold text-cyan-400 text-xs uppercase flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  Mecânica dos Propulsores Dual-Thruster
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30">
                    <div className="text-cyan-300 font-bold mb-0.5">MOTOR ESQUERDO</div>
                    <div className="text-gray-300 text-[10px]">Tecla [A], [←] ou Metade Esquerda do Ecrã: Impulso e rotação horária.</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-pink-950/40 border border-pink-500/30">
                    <div className="text-pink-300 font-bold mb-0.5">MOTOR DIREITO</div>
                    <div className="text-gray-300 text-[10px]">Tecla [D], [→] ou Metade Direita do Ecrã: Impulso e rotação anti-horária.</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-fuchsia-950/40 border border-fuchsia-500/30">
                    <div className="text-fuchsia-300 font-bold mb-0.5">SUBIDA VERTICAL</div>
                    <div className="text-gray-300 text-[10px]">Premir [A+D] ou ambos os lados simultaneamente: Empuxo vertical direto.</div>
                  </div>
                </div>
              </div>

              {/* 3. The 8 Active Power-Ups */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-orbitron font-bold text-cyan-400 text-xs uppercase flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    Os 8 Power-Ups de Ressonância
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">Distribuição Equilibrada por Dificuldade</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  {/* Phase Shield */}
                  <div className="p-2.5 rounded-lg bg-sky-950/40 border border-sky-400/40 flex items-start gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-sky-300">ESCUDO DE FASE <span className="text-[9px] text-gray-400 font-normal">(Todos os Níveis)</span></div>
                      <div className="text-[10px] text-gray-300 mt-0.5">Bólide hexagonal de proteção quântica. Absorve 1 colisão de qualquer tipo. Acumulável até 3 camadas.</div>
                    </div>
                  </div>

                  {/* Low-G Surge */}
                  <div className="p-2.5 rounded-lg bg-yellow-950/40 border border-yellow-400/40 flex items-start gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_#facc15] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-yellow-300">SURTO LOW-G <span className="text-[9px] text-gray-400 font-normal">(Todos os Níveis)</span></div>
                      <div className="text-[10px] text-gray-300 mt-0.5">Giroscópio anti-gravítico que reduz a gravidade em 50% por 5 segundos, facilitando a ascensão vertical.</div>
                    </div>
                  </div>

                  {/* Sonic Pulse */}
                  <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-400/40 flex items-start gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-cyan-300">PULSO SÓNICO <span className="text-[9px] text-gray-400 font-normal">(Todos os Níveis)</span></div>
                      <div className="text-[10px] text-gray-300 mt-0.5">Onda de choque acústica omnidirecional instantânea que desativa minas de ressonância e feixes laser na proximidade.</div>
                    </div>
                  </div>

                  {/* Ethereal Ghost Mode */}
                  <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-400/40 flex items-start gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-cyan-300">MODO FANTASMA <span className="text-[9px] text-gray-400 font-normal">(Todos os Níveis)</span></div>
                      <div className="text-[10px] text-gray-300 mt-0.5">Envolve a nave numa borda pulsante de néon ciano com opacidade translúcida. Permite atravessar obstáculos físicos sem sofrer danos por 5s mantendo a silhueta perfeitamente visível.</div>
                    </div>
                  </div>

                  {/* Sonic Damper */}
                  <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-400/40 flex items-start gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_#22c55e] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-emerald-300">AMORTECEDOR SÓNICO <span className="text-[9px] text-emerald-400 font-normal">(Pro & Extreme)</span></div>
                      <div className="text-[10px] text-gray-300 mt-0.5">Acalma as ondas sísmicas de áudio no leito rochoso e absorve impactos de raspão nas paredes por 6s.</div>
                    </div>
                  </div>

                  {/* Chrono Dilation */}
                  <div className="p-2.5 rounded-lg bg-teal-950/40 border border-teal-400/40 flex items-start gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-teal-400 shadow-[0_0_8px_#14b8a6] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-teal-300">DISTORÇÃO TEMPORAL <span className="text-[9px] text-teal-400 font-normal">(Pro & Extreme)</span></div>
                      <div className="text-[10px] text-gray-300 mt-0.5">Matriz de tempo em câmara lenta (50% de velocidade durante 4s), permitindo esquivas cirúrgicas em secções críticas.</div>
                    </div>
                  </div>

                  {/* Sonic Immortality */}
                  <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/50 flex items-start gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_#ff0055] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-rose-300">IMORTALIDADE SÓNICA <span className="text-[9px] text-rose-400 font-bold uppercase">(Apenas Extreme)</span></div>
                      <div className="text-[10px] text-gray-300 mt-0.5">Invulnerabilidade total e contínua durante 6s, protegendo contra qualquer colisão física ou feixe laser.</div>
                    </div>
                  </div>

                  {/* Resonance Singularity */}
                  <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-400/40 flex items-start gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-purple-300">SINGULARIDADE DE RESSONÂNCIA <span className="text-[9px] text-gray-400 font-normal">(Todos os Níveis)</span></div>
                      <div className="text-[10px] text-gray-300 mt-0.5">Vórtice gravitacional cósmico que suga e desintegra todos os perigos no ecrã e reduz o avanço descontrolado da nave.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Hazards & Obstacles Guide */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 space-y-2">
                <div className="font-orbitron font-bold text-cyan-400 text-xs uppercase flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Perigos Sonoros do Túnel
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="p-2 rounded bg-slate-950 border border-white/10">
                    <span className="text-emerald-400 font-bold">PILAR DE EQUALIZADOR VU:</span> Torres retro-LED segmentadas (verde $\rightarrow$ âmbar $\rightarrow$ vermelho) com balística áudio suave e ataque dinâmico sincronizado com os graves.
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-white/10">
                    <span className="text-rose-400 font-bold">LÂMINAS GIRATÓRIAS NÉON:</span> Cruzetas cinéticas de rotação sónica aceleradas pelas frequências médias.
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-white/10">
                    <span className="text-orange-400 font-bold">MINAS DE RESSONÂNCIA:</span> Minas espaciais com satélites orbitais que expandem com a pulsação musical.
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-white/10">
                    <span className="text-amber-300 font-bold">FEIXES E CORTINAS LASER:</span> Feixes de plasma verticais oscilantes através do túnel.
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer CTA */}
            <div className="pt-2 border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-black font-orbitron font-black text-xs md:text-sm tracking-wider uppercase cursor-pointer hover:opacity-95 transition shadow-lg shadow-cyan-500/30"
              >
                ENTENDIDO · REGRESSAR AO MENU
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
