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
  HelpCircle,
  Zap,
  Music,
  CheckCircle2,
  Maximize,
  Minimize,
  Activity
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

      {/* Top Bar Controls: Fullscreen Toggle */}
      <div className="absolute top-4 right-4 md:top-6 md:right-8 z-40 flex items-center gap-2">
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

      {/* Header & Bespoke Title Lockup */}
      <header className="relative z-10 flex flex-col items-center justify-center text-center pt-2 pb-4">
        <h1 className="text-4xl md:text-6xl font-black tracking-wider uppercase italic font-orbitron neon-text-cyan flex items-center justify-center gap-3">
          <Zap className="w-9 h-9 md:w-12 md:h-12 text-cyan-400 stroke-[2.5]" />
          <span>SONIC <span className="text-fuchsia-400 neon-text-magenta">THRUST</span></span>
        </h1>
        <p className="text-gray-400 text-sm md:text-base max-w-xl mt-1 font-rajdhani">
          Pilota da Plataforma de Descolagem até ao Portal de Meta. O terreno deforma-se ao ritmo da música através da análise FFT.
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

          <p className="text-[11px] text-gray-400 font-mono">
            * Para adicionar música: coloca o ficheiro em <code className="text-cyan-300">/public/tracks/</code> e regista-o em <code className="text-cyan-300">tracks.json</code>.
          </p>
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
              {(['PRINCIPIANTE', 'PRO', 'EXTREME'] as DifficultyLevel[]).map((level) => {
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
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl w-full mx-auto pt-3 border-t border-white/10">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer font-mono"
        >
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span>{showHelp ? 'Ocultar Guia' : 'Ver Guia de Controlos & Regra Zero Contact'}</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right font-mono text-[11px] text-gray-400">
            <div>[A] ou [←] Motor Esquerdo · [D] ou [→] Motor Direito</div>
            <div className="text-cyan-400">[A+D] Subida Vertical · [ESC] Pausa</div>
          </div>

          <button
            onClick={onStartMission}
            className="px-8 py-3.5 rounded-lg bg-gradient-to-r from-cyan-500 via-sky-500 to-fuchsia-500 text-black font-orbitron font-black text-sm md:text-base tracking-widest uppercase shadow-lg shadow-cyan-500/40 hover:shadow-cyan-400/60 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer flex items-center gap-3"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>INICIAR MISSÃO</span>
          </button>
        </div>
      </footer>

      {/* Help Modal Overlay */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg">
          <div className="max-w-lg w-full bg-slate-950 border border-cyan-500/40 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-orbitron font-bold text-cyan-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                MANUAL DO PILOTO: SONIC THRUST
              </h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-gray-400 hover:text-white font-mono text-sm px-2 py-1 rounded bg-white/5"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs md:text-sm text-gray-300 font-rajdhani leading-relaxed">
              <div className="p-3 rounded bg-red-950/40 border border-red-500/40 text-red-200">
                <span className="font-bold font-orbitron text-red-400 uppercase">Regra de Ouro (Zero Contact):</span>{' '}
                Qualquer contacto da nave contra o teto, chão ou obstáculos resulta na destruição imediata. Somente o Escudo de Fase absorve impactos!
              </div>

              <div className="space-y-1">
                <div className="font-orbitron font-semibold text-cyan-400 text-xs">CONTROLOS DUAL-THRUSTER:</div>
                <ul className="list-disc pl-5 space-y-1 font-mono text-xs text-gray-300">
                  <li><strong className="text-white">Motor Esquerdo (A / Seta Esquerda / Metade Esquerda):</strong> Impulso para cima/direita e rotação horária.</li>
                  <li><strong className="text-white">Motor Direito (D / Seta Direita / Metade Direita):</strong> Impulso para cima/esquerda e rotação anti-horária.</li>
                  <li><strong className="text-white">Subida Vertical (A + D / Toque duplo):</strong> Ativa ambos os propulsores para subir em linha reta.</li>
                </ul>
              </div>

              <div className="space-y-1">
                <div className="font-orbitron font-semibold text-cyan-400 text-xs">POWER-UPS DO PERCURSO:</div>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                  <div className="p-2 rounded bg-sky-950/60 border border-sky-500/40 text-sky-300">
                    <div>ESCUDO (AZUL)</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Absorve 1 colisão</div>
                  </div>
                  <div className="p-2 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                    <div>DAMPER (VERDE)</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Acalma terreno 6s</div>
                  </div>
                  <div className="p-2 rounded bg-yellow-950/60 border border-yellow-500/40 text-yellow-300">
                    <div>LOW-G (AMARELO)</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">50% gravidade 5s</div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 rounded bg-cyan-500 text-black font-orbitron font-bold text-xs uppercase cursor-pointer hover:bg-cyan-400"
            >
              ENTENDIDO, VOLTAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
