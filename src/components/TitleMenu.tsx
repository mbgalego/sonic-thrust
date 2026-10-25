/**
 * Sonic Thrust - Title Menu & Mission Setup Component
 * Pixel-faithful recreation of the Synthwave Cyberpunk Reference Mock-up
 * Features live reactive FFT mini-equalizer & inline scrollable track dropdown.
 */

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Loader2,
  Settings,
  HelpCircle,
  Maximize,
  Minimize,
  Sliders,
  Compass,
  Activity,
  AlertTriangle,
  Shield,
  Volume2,
  VolumeX,
  CheckCircle2,
  FastForward,
  ChevronDown,
  User
} from 'lucide-react';
import {
  DifficultyLevel,
  TrackMetadata,
  GameOptions
} from '../types/game';
import { DIFFICULTY_PRESETS } from '../physics/PhysicsWorld';
import { SynthwaveVisualizer } from './SynthwaveVisualizer';
import { MiniEqualizer } from './MiniEqualizer';
import { audio } from '../audio/AudioEngine';

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
  isStartingMission?: boolean;
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
  loadingTrackId,
  isStartingMission = false
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDifficultyOpen, setIsDifficultyOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(audio.isMenuMusicMuted());
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  const handleToggleMenuMusic = () => {
    const newMuted = audio.toggleMenuMusicMute();
    setIsMuted(newMuted);
  };

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

  // Cycling difficulty helper
  const diffOrder: DifficultyLevel[] = ['NORMAL', 'PRO', 'EXTREME'];

  const handleSetDifficulty = (level: DifficultyLevel) => {
    onSelectDifficulty(level);
    onOptionsChange({ ...options, flightAssist: false });
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-3 sm:p-5 md:p-8 bg-[#060216]/95 backdrop-blur-md overflow-y-auto overflow-x-hidden select-none">
      
      {/* Background Radial Glows */}
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-cyan-500/10 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-fuchsia-500/15 rounded-full blur-[130px] pointer-events-none" />

      {/* Top Bar Row: Controls located cleanly above the header so they never overlap the game title */}
      <div className="relative z-20 flex items-center justify-between w-full max-w-6xl mx-auto px-1 sm:px-4 pt-1 sm:pt-2 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
          <span className="font-orbitron text-[10px] sm:text-xs tracking-wider text-cyan-400/90 font-bold uppercase">
            SONIC ARCADE
          </span>
        </div>

        {/* Audio Mute & Fullscreen Controls */}
        <div className="flex items-center gap-2">
          {/* Menu Audio Mute / Unmute Button */}
          <button
            type="button"
            onClick={handleToggleMenuMusic}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-mono transition-all shadow-md cursor-pointer ${
              isMuted
                ? 'border-rose-500/50 bg-rose-950/60 text-rose-300 hover:border-rose-400 hover:bg-rose-900/70 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                : 'border-cyan-500/40 bg-slate-950/80 text-cyan-300 hover:border-cyan-300 hover:bg-cyan-950/60 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
            }`}
            title={isMuted ? 'Ativar música do menu' : 'Silenciar música do menu'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Música: Mudo</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="hidden sm:inline">
                  {previewingTrackId ? 'Pré-Escuta' : 'Música: Ligada'}
                </span>
              </>
            )}
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-slate-950/70 hover:bg-cyan-950/60 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-mono transition-all shadow-md cursor-pointer"
            title={isFullscreen ? 'Sair de Ecrã Inteiro (F11)' : 'Ativar Ecrã Inteiro (F11)'}
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Janela</span>
              </>
            ) : (
              <>
                <Maximize className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Ecrã Inteiro</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Header with Sonic Thrust Neon Brand Title (Unobstructed at all resolutions) */}
      <header className="relative z-10 flex flex-col items-center justify-center text-center pt-1 sm:pt-2 pb-3 shrink-0">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black italic tracking-wider uppercase font-orbitron flex items-center justify-center gap-3">
          <span className="neon-text-cyan text-[#00f0ff]">SONIC</span>
          <span className="neon-text-magenta text-[#ff007f]">THRUST</span>
        </h1>
        <p className="text-[#38bdf8] text-xs sm:text-sm md:text-base font-rajdhani font-medium max-w-xl mt-1.5 tracking-wide leading-relaxed px-4">
          Navega por desfiladeiros de néon que vibram com as frequências sonoras e testa os teus reflexos.
        </p>
      </header>

      {/* Main Content: Left Column (Cards) & Right Column (Synthwave Visualizer Landscape) */}
      <main className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center max-w-6xl w-full mx-auto my-auto py-2">
        
        {/* Left Column: The 4 Menu Sections from Mock-up */}
        <section className="lg:col-span-6 flex flex-col gap-4.5 max-w-lg mx-auto lg:mx-0 w-full">
          
          {/* Card 1: INICIAR (Primary Action Pill Button with Circulating Loading Indicator) */}
          <div
            className={`relative rounded-2xl p-[2px] overflow-hidden transition-all duration-300 select-none ${
              isStartingMission
                ? 'pointer-events-none shadow-[0_0_35px_rgba(0,240,255,0.7)]'
                : 'menu-gradient-card group cursor-pointer hover:shadow-[0_0_35px_rgba(0,240,255,0.7)]'
            }`}
            onClick={isStartingMission ? undefined : onStartMission}
          >
            {/* When loading: circulating neon laser comet via high-speed rotating conic gradient */}
            {isStartingMission && (
              <div
                className="absolute inset-[-150%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,#00f0ff_315deg,#ffffff_350deg,#ff007f_360deg)] animate-[spin_1.1s_linear_infinite] pointer-events-none"
              />
            )}

            {/* When loading: circulating razor-sharp SVG neon laser line & counter-orbiting particle dot */}
            {isStartingMission && (
              <svg
                className="absolute -inset-[2px] w-[calc(100%+4px)] h-[calc(100%+4px)] pointer-events-none z-30 overflow-visible"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <defs>
                  <filter id="iniciar-laser-glow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#00f0ff" floodOpacity="0.9" />
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ff007f" floodOpacity="0.7" />
                  </filter>
                </defs>
                {/* Subtle base track */}
                <rect
                  x="1.5"
                  y="1.5"
                  width="97"
                  height="97"
                  rx="14"
                  fill="none"
                  stroke="rgba(0, 240, 255, 0.35)"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
                {/* Primary circulating laser beam line */}
                <rect
                  x="1.5"
                  y="1.5"
                  width="97"
                  height="97"
                  rx="14"
                  fill="none"
                  stroke="#00f0ff"
                  strokeWidth="3.5"
                  strokeDasharray="22 78"
                  strokeLinecap="round"
                  pathLength="100"
                  className="animate-laser-sweep"
                  filter="url(#iniciar-laser-glow)"
                  vectorEffect="non-scaling-stroke"
                />
                {/* Secondary reverse counter-orbiting energetic dot */}
                <rect
                  x="1.5"
                  y="1.5"
                  width="97"
                  height="97"
                  rx="14"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeDasharray="3 97"
                  strokeLinecap="round"
                  pathLength="100"
                  className="animate-laser-sweep-reverse"
                  filter="url(#iniciar-laser-glow)"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}

            <div className="relative z-10 rounded-[calc(1rem-2px)] p-1 bg-[#0a0520]">
              <div
                className={`relative flex items-center justify-center gap-3.5 py-3.5 sm:py-4 px-6 rounded-xl transition-all ${
                  isStartingMission
                    ? 'bg-gradient-to-r from-[#ff007f] via-[#c084fc] to-[#00f0ff] shadow-[0_0_30px_rgba(0,240,255,0.8)]'
                    : 'bg-gradient-to-r from-[#ff007f] via-[#ec4899] to-[#00f0ff] shadow-[0_0_25px_rgba(236,72,153,0.5)] group-hover:shadow-[0_0_35px_rgba(0,240,255,0.7)] group-hover:scale-[1.01] active:scale-[0.99]'
                }`}
              >
                {isStartingMission ? (
                  <>
                    {/* Spinning Cyber Loader Icon */}
                    <div className="flex items-center text-black">
                      <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 animate-spin stroke-[2.5]" />
                    </div>

                    {/* Dynamic Loading Label */}
                    <div className="flex flex-col items-center">
                      <span className="font-orbitron font-black text-lg sm:text-xl text-black tracking-widest leading-none uppercase">
                        A CARREGAR...
                      </span>
                      <span className="font-rajdhani font-bold text-[10px] sm:text-xs text-black/80 tracking-wider uppercase mt-0.5">
                        A SINCRONIZAR MP3 & TERRENO
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Black Double Chevron Play / FastForward Icon */}
                    <div className="flex items-center text-black">
                      <FastForward className="w-7 h-7 sm:w-8 sm:h-8 fill-black stroke-black" />
                    </div>

                    {/* Single clean title: INICIAR */}
                    <span className="font-orbitron font-black text-xl sm:text-2xl text-black tracking-widest leading-none uppercase">
                      INICIAR
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: SELECIONAR FAIXA with Inline Scrollable Dropdown */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold tracking-wider text-[#00f0ff] uppercase font-orbitron drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
                SELECIONAR FAIXA
              </h2>

              {isDropdownOpen && (
                <span className="text-[10px] font-mono text-cyan-400/80">
                  {tracks.length} FAIXAS NO CATÁLOGO
                </span>
              )}
            </div>

            <div className="menu-gradient-card">
              <div className="menu-gradient-card-inner p-3.5 sm:p-4 flex flex-col">
                
                {/* Active Track Row (Full-width metadata & clickable dropdown toggle) */}
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Play / Preview Circle Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedTrack) onPreviewTrack(selectedTrack);
                    }}
                    className="w-11 h-11 rounded-xl border border-cyan-400/80 bg-cyan-950/60 hover:bg-cyan-500/20 text-cyan-300 hover:text-white flex items-center justify-center shrink-0 transition-all shadow-[0_0_12px_rgba(6,182,212,0.35)] cursor-pointer"
                    title={previewingTrackId === selectedTrack?.id ? 'Parar pré-escuta' : 'Pré-escutar faixa'}
                  >
                    {loadingTrackId === selectedTrack?.id ? (
                      <Loader2 className="w-5 h-5 animate-spin text-cyan-300" />
                    ) : previewingTrackId === selectedTrack?.id ? (
                      <Pause className="w-4 h-4 fill-current text-cyan-300 animate-pulse" />
                    ) : (
                      <Play className="w-4 h-4 fill-current text-cyan-300 ml-0.5" />
                    )}
                  </button>

                  {/* Expanded Track Information & Live Equalizer (Clicking toggles dropdown) */}
                  <div
                    onClick={() => setIsDropdownOpen(prev => !prev)}
                    className="flex flex-col min-w-0 flex-1 cursor-pointer group/track py-0.5"
                    title={isDropdownOpen ? 'Fechar catálogo de músicas' : 'Clica para ver e escolher outras músicas'}
                  >
                    {/* Header Row: Title + Badges + Expand Chevron */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-orbitron font-bold text-sm sm:text-base text-white group-hover/track:text-cyan-300 transition-colors tracking-wide truncate">
                          {selectedTrack?.title || 'Ayla'}
                        </span>
                        {selectedTrack?.isProcedural && (
                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-fuchsia-950/80 border border-fuchsia-500/40 text-fuchsia-300 shrink-0">
                            Synth
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0 text-cyan-400 group-hover/track:text-cyan-200 transition-colors">
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-fuchsia-400' : ''}`} />
                      </div>
                    </div>

                    {/* Metadata Row: Author / Artist + BPM + Duration */}
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-xs">
                      <span className="text-cyan-300/90 font-rajdhani font-semibold truncate flex items-center gap-1">
                        <User className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span className="text-gray-400 font-normal">Artista:</span>
                        <span className="text-cyan-300 font-medium">{selectedTrack?.artist || 'Kosmischer Wanderer'}</span>
                      </span>
                      <span className="text-slate-600 hidden sm:inline">•</span>
                      <span className="font-mono text-[11px] text-cyan-400/80 tracking-wider">
                        {selectedTrack?.estimatedBpm || 136} BPM
                      </span>
                      <span className="text-slate-600 hidden sm:inline">•</span>
                      <span className="font-mono text-[11px] text-gray-300">
                        {Math.floor((selectedTrack?.duration || 206) / 60)}:
                        {String(Math.floor((selectedTrack?.duration || 206) % 60)).padStart(2, '0')}
                      </span>
                    </div>

                    {/* Full-width 60FPS Reactive Mini Equalizer Canvas - Only reacts when track preview is active */}
                    <div className="w-full h-6 mt-1.5">
                      <MiniEqualizer
                        className="w-full h-6"
                        active={Boolean(previewingTrackId && previewingTrackId === selectedTrack?.id)}
                      />
                    </div>
                  </div>
                </div>

                {/* Inline Scrollable Drop-Down List */}
                {isDropdownOpen && (
                  <div className="mt-3 pt-3 border-t border-cyan-500/25 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px] font-orbitron font-semibold text-cyan-300/90 px-1 pb-1">
                      <span>CATÁLOGO DE MÚSICAS ({tracks.length})</span>
                      <span className="text-[10px] font-mono text-gray-400">Escolhe ou pré-escuta</span>
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                      {tracks.map((track) => {
                        const isSelected = selectedTrack?.id === track.id;
                        const isPlayingThis = previewingTrackId === track.id;
                        const isLoadingThis = loadingTrackId === track.id;

                        return (
                          <div
                            key={track.id}
                            onClick={() => {
                              onSelectTrack(track);
                              setIsDropdownOpen(false);
                            }}
                            className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                              isSelected
                                ? 'border-cyan-400 bg-cyan-950/70 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                                : 'border-white/10 bg-slate-900/60 hover:border-cyan-500/40 hover:bg-slate-900/90'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectTrack(track);
                                  onPreviewTrack(track);
                                }}
                                disabled={isLoadingThis}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition cursor-pointer ${
                                  isPlayingThis
                                    ? 'bg-cyan-400 text-black shadow-md shadow-cyan-400/50'
                                    : isSelected
                                      ? 'bg-cyan-500 text-black'
                                      : 'bg-white/10 text-cyan-300 hover:bg-cyan-500/20'
                                }`}
                                title={isPlayingThis ? 'Parar pré-escuta' : 'Pré-escutar faixa'}
                              >
                                {isLoadingThis ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-300" />
                                ) : isPlayingThis ? (
                                  <Pause className="w-3.5 h-3.5 fill-current text-black animate-pulse" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 ml-0.5" />
                                )}
                              </button>

                              <div className="truncate">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-orbitron font-semibold text-xs text-white truncate">
                                    {track.title}
                                  </span>
                                  {track.isProcedural && (
                                    <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-fuchsia-950/80 border border-fuchsia-500/40 text-fuchsia-300">
                                      Synth
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-gray-400 font-rajdhani truncate">
                                  {track.artist}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 font-mono text-[10px]">
                              <span className="text-cyan-400 tabular-nums">{track.estimatedBpm || 128} BPM</span>
                              <span className="text-gray-400">·</span>
                              <span className="text-gray-300 tabular-nums">
                                {Math.floor((track.duration || 90) / 60)}:
                                {String(Math.floor((track.duration || 90) % 60)).padStart(2, '0')}
                              </span>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Section: DIFICULDADE (Inline Scrollable Dropdown) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold tracking-wider text-[#00f0ff] uppercase font-orbitron drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
                DIFICULDADE
              </h2>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                difficulty === 'NORMAL'
                  ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300'
                  : difficulty === 'PRO'
                    ? 'bg-fuchsia-950/80 border-fuchsia-500/40 text-fuchsia-300'
                    : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
              }`}>
                {difficulty}
              </span>
            </div>

            <div className="menu-gradient-card">
              <div className="menu-gradient-card-inner p-3.5 sm:p-4 flex flex-col">
                {/* Active Difficulty Header (Click to toggle dropdown) */}
                <div
                  onClick={() => setIsDifficultyOpen(prev => !prev)}
                  className="flex items-center justify-between gap-3 cursor-pointer group/diff select-none"
                  title={isDifficultyOpen ? 'Fechar menu de dificuldade' : 'Clica para escolher a dificuldade'}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                      difficulty === 'NORMAL'
                        ? 'border-cyan-400/80 bg-cyan-950/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                        : difficulty === 'PRO'
                          ? 'border-fuchsia-400/80 bg-fuchsia-950/60 text-fuchsia-300 shadow-[0_0_12px_rgba(217,70,239,0.35)]'
                          : 'border-rose-500/80 bg-rose-950/60 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                    }`}>
                      {difficulty === 'NORMAL' && <Shield className="w-5 h-5 text-cyan-400" />}
                      {difficulty === 'PRO' && <Activity className="w-5 h-5 text-fuchsia-400" />}
                      {difficulty === 'EXTREME' && <AlertTriangle className="w-5 h-5 text-rose-400" />}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-orbitron font-extrabold text-sm sm:text-base tracking-wider ${
                          difficulty === 'NORMAL'
                            ? 'text-cyan-300'
                            : difficulty === 'PRO'
                              ? 'text-fuchsia-300'
                              : 'text-rose-400'
                        }`}>
                          {difficulty}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
                          {currentDiffConfig.initialLives} Vidas
                        </span>
                      </div>
                      <span className="font-rajdhani text-xs text-gray-300 font-medium truncate mt-0.5">
                        {difficulty === 'NORMAL' && 'Gravidade 70% • 1 Escudo • Flight Assist Ativo'}
                        {difficulty === 'PRO' && 'Gravidade 100% • Sem Escudos • Dinâmico'}
                        {difficulty === 'EXTREME' && 'Gravidade 130% • 2 Vidas • Sem Assistência'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-cyan-400 group-hover/diff:text-white transition-colors shrink-0">
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDifficultyOpen ? 'rotate-180 text-fuchsia-400' : ''}`} />
                  </div>
                </div>

                {/* Inline Scrollable Dropdown List of Difficulties */}
                {isDifficultyOpen && (
                  <div className="mt-3 pt-3 border-t border-cyan-500/25 flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                    {diffOrder.map((diffKey) => {
                      const config = DIFFICULTY_PRESETS[diffKey];
                      const isSelected = difficulty === diffKey;

                      return (
                        <div
                          key={diffKey}
                          onClick={() => {
                            handleSetDifficulty(diffKey);
                            setIsDifficultyOpen(false);
                          }}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                            isSelected
                              ? diffKey === 'NORMAL'
                                ? 'border-cyan-400 bg-cyan-950/70 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                                : diffKey === 'PRO'
                                  ? 'border-fuchsia-400 bg-fuchsia-950/70 shadow-[0_0_12px_rgba(217,70,239,0.3)]'
                                  : 'border-rose-500 bg-rose-950/70 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                              : 'border-white/10 bg-slate-900/60 hover:border-cyan-500/40 hover:bg-slate-900/90'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`font-orbitron font-bold text-xs uppercase tracking-wider ${
                                diffKey === 'NORMAL' ? 'text-cyan-300' : diffKey === 'PRO' ? 'text-fuchsia-300' : 'text-rose-400'
                              }`}>
                                {diffKey}
                              </span>
                              <span className="text-[10px] font-mono text-gray-300">
                                {config.initialLives} Vidas · {config.initialShields > 0 ? `${config.initialShields} Escudo` : 'Sem Escudo'}
                              </span>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className={`w-4 h-4 ${
                                diffKey === 'NORMAL' ? 'text-cyan-400' : diffKey === 'PRO' ? 'text-fuchsia-400' : 'text-rose-400'
                              }`} />
                            )}
                          </div>

                          <p className="text-[11px] font-rajdhani text-gray-300 leading-snug">
                            {config.description}
                          </p>

                          <div className="flex items-center gap-2 text-[10px] font-mono pt-0.5">
                            <span className="text-gray-400">Gravidade: <strong className="text-cyan-300">{Math.round(config.gravityMultiplier * 100)}%</strong></span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-400">Flight Assist: <strong className={config.allowFlightAssist ? 'text-cyan-300' : 'text-rose-400'}>{config.allowFlightAssist ? 'Permitido' : 'Bloqueado'}</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: OPÇÕES (ÁUDIO E VOO) (Inline Scrollable Dropdown) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold tracking-wider text-[#00f0ff] uppercase font-orbitron drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
                OPÇÕES (ÁUDIO E VOO)
              </h2>
              <span className="text-[10px] font-mono text-cyan-400/80">
                VOO MANUAL
              </span>
            </div>

            <div className="menu-gradient-card">
              <div className="menu-gradient-card-inner p-3.5 sm:p-4 flex flex-col">
                {/* Header Row (Click to toggle dropdown) */}
                <div
                  onClick={() => setIsOptionsOpen(prev => !prev)}
                  className="flex items-center justify-between gap-3 cursor-pointer group/opt select-none"
                  title={isOptionsOpen ? 'Fechar opções' : 'Abrir configurações de áudio e voo'}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl border border-cyan-400/60 bg-cyan-950/60 text-cyan-400 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.3)] group-hover/opt:scale-105 transition-all">
                      <Settings className="w-5 h-5 text-cyan-400 group-hover/opt:rotate-45 transition-transform duration-300" />
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-orbitron font-bold text-xs sm:text-sm text-white group-hover/opt:text-cyan-300 transition-colors tracking-wide truncate">
                        CONFIGURAÇÕES DE VOO E ÁUDIO
                      </span>
                      <span className="font-rajdhani text-xs text-gray-300 font-medium truncate mt-0.5">
                        Voo Manual (100% Reflexos) • Mús {Math.round(options.musicVolume * 100)}% • SFX {Math.round(options.sfxVolume * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-cyan-400 group-hover/opt:text-white transition-colors shrink-0">
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOptionsOpen ? 'rotate-180 text-fuchsia-400' : ''}`} />
                  </div>
                </div>

                {/* Inline Scrollable Options Dropdown Panel */}
                {isOptionsOpen && (
                  <div className="mt-3 pt-3 border-t border-cyan-500/25 flex flex-col gap-3 max-h-64 sm:max-h-72 overflow-y-auto pr-1 text-xs font-rajdhani">
                    {/* Flight Assist (Always Deactivated) */}
                    <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <div className="font-orbitron font-semibold text-white text-xs">
                            Flight Assist (Auto-Estabilização)
                          </div>
                          <div className="text-[11px] text-gray-400 leading-tight">
                            Desativado permanentemente — Voo 100% manual e reflexos puros
                          </div>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-white/10 text-gray-400 shrink-0">
                        DESATIVADO
                      </span>
                    </div>

                    {/* Drift Compensation Toggle */}
                    <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <div className="font-orbitron font-semibold text-white text-xs">
                            Compensação de Deriva
                          </div>
                          <div className="text-[11px] text-gray-400 leading-tight">
                            A nave mantém a posição sem avanço automático à direita
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOptionsChange({ ...options, driftCompensation: !options.driftCompensation })}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer shrink-0 ${
                          options.driftCompensation
                            ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                            : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                      >
                        {options.driftCompensation ? 'LIGADO' : 'DESLIGADO'}
                      </button>
                    </div>

                    {/* Volume Controls */}
                    <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/10 space-y-2.5">
                      <div className="flex items-center gap-2 text-cyan-400 font-orbitron font-semibold text-xs">
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>NÍVEIS DE VOLUME</span>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-mono text-gray-300 mb-1">
                          <span>VOLUME MÚSICA</span>
                          <span className="text-cyan-400 tabular-nums">{Math.round(options.musicVolume * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={options.musicVolume}
                          onChange={(e) => onOptionsChange({ ...options, musicVolume: parseFloat(e.target.value) })}
                          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-mono text-gray-300 mb-1">
                          <span>VOLUME SFX / MOTORES</span>
                          <span className="text-fuchsia-400 tabular-nums">{Math.round(options.sfxVolume * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={options.sfxVolume}
                          onChange={(e) => onOptionsChange({ ...options, sfxVolume: parseFloat(e.target.value) })}
                          className="w-full accent-fuchsia-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: CONTROLOS E REGRAS (Inline Scrollable Dropdown) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold tracking-wider text-[#00f0ff] uppercase font-orbitron drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
                CONTROLOS E REGRAS
              </h2>
              <span className="text-[10px] font-mono text-cyan-400/80">
                GUIA DE VOO
              </span>
            </div>

            <div className="menu-gradient-card">
              <div className="menu-gradient-card-inner p-3.5 sm:p-4 flex flex-col">
                {/* Header Row (Click to toggle dropdown) */}
                <div
                  onClick={() => setIsControlsOpen(prev => !prev)}
                  className="flex items-center justify-between gap-3 cursor-pointer group/ctrl select-none"
                  title={isControlsOpen ? 'Fechar guia de controlos' : 'Abrir guia de pilotagem e regras'}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl border border-cyan-400/60 bg-cyan-950/60 text-cyan-400 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.3)] group-hover/ctrl:scale-105 transition-all">
                      <HelpCircle className="w-5 h-5 text-cyan-400" />
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-orbitron font-bold text-xs sm:text-sm text-white group-hover/ctrl:text-cyan-300 transition-colors tracking-wide truncate">
                        MANUAL DO PILOTO E REGRAS
                      </span>
                      <span className="font-rajdhani text-xs text-gray-300 font-medium truncate mt-0.5">
                        Dual-Thrusters, Vidas (-20s) e 8 Power-Ups
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-cyan-400 group-hover/ctrl:text-white transition-colors shrink-0">
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isControlsOpen ? 'rotate-180 text-fuchsia-400' : ''}`} />
                  </div>
                </div>

                {/* Inline Scrollable Controls Panel */}
                {isControlsOpen && (
                  <div className="mt-3 pt-3 border-t border-cyan-500/25 flex flex-col gap-2.5 max-h-72 sm:max-h-80 overflow-y-auto pr-1 text-xs font-rajdhani">
                    {/* Rule of Zero Contact & Lives */}
                    <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200">
                      <div className="flex items-center gap-2 font-orbitron font-bold text-red-400 text-xs uppercase mb-1">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>Zero Contact & Penalização (-20s)</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        3 vidas (2 em Extreme). Cada colisão desprotegida consome 1 vida e aplica <strong>-20 segundos</strong> de penalização. Invulnerabilidade temporária de 1.8s após impacto.
                      </p>
                    </div>

                    {/* Dual-Thruster Controls */}
                    <div className="p-2.5 rounded-xl bg-slate-900/70 border border-cyan-500/30 space-y-2">
                      <div className="font-orbitron font-bold text-cyan-400 text-xs uppercase flex items-center gap-2">
                        <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Propulsores Dual-Thruster</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[10px]">
                        <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/30">
                          <div className="text-cyan-300 font-bold">MOTOR ESQ.</div>
                          <div className="text-gray-300 text-[10px]">[A] / [←] ou Toque Esq.</div>
                        </div>
                        <div className="p-2 rounded-lg bg-pink-950/40 border border-pink-500/30">
                          <div className="text-pink-300 font-bold">MOTOR DIR.</div>
                          <div className="text-gray-300 text-[10px]">[D] / [→] ou Toque Dir.</div>
                        </div>
                      </div>
                    </div>

                    {/* Power-Ups */}
                    <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/10 space-y-1.5">
                      <div className="font-orbitron font-bold text-cyan-400 text-xs uppercase flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-cyan-400" />
                        <span>8 Power-Ups de Ressonância</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] font-mono">
                        <div className="p-1.5 rounded-lg bg-sky-950/40 border border-sky-400/30">
                          <span className="text-sky-300 font-bold">ESCUDO DE FASE</span>: Absorve 1 colisão.
                        </div>
                        <div className="p-1.5 rounded-lg bg-yellow-950/40 border border-yellow-400/30">
                          <span className="text-yellow-300 font-bold">SURTO LOW-G</span>: Reduz 50% gravidade por 5s.
                        </div>
                        <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-400/30">
                          <span className="text-emerald-300 font-bold">PULSO SÓNICO</span>: Limpa obstáculos e lasers.
                        </div>
                        <div className="p-1.5 rounded-lg bg-purple-950/40 border border-purple-400/30">
                          <span className="text-purple-300 font-bold">MODO FANTASMA</span>: Atravessa obstáculos por 6s.
                        </div>
                        <div className="p-1.5 rounded-lg bg-amber-950/40 border border-amber-400/30">
                          <span className="text-amber-300 font-bold">AMORTECEDOR</span>: Absorve impactos cinéticos.
                        </div>
                        <div className="p-1.5 rounded-lg bg-cyan-950/40 border border-cyan-400/30">
                          <span className="text-cyan-300 font-bold">DISTORÇÃO TEMPORAL</span>: Câmara lenta a 50%.
                        </div>
                        <div className="p-1.5 rounded-lg bg-indigo-950/40 border border-indigo-400/30">
                          <span className="text-indigo-300 font-bold">SINGULARIDADE</span>: Atrai power-ups próximos.
                        </div>
                        <div className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-400/30">
                          <span className="text-rose-300 font-bold">IMORTALIDADE</span>: Invulnerabilidade total por 6s.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </section>

        {/* Right Column: 3D Synthwave Visualizer (Mountain Equalizer + Oscilloscope Ribbons + Perspective Grid) */}
        <section className="lg:col-span-6 relative w-full h-[360px] sm:h-[420px] lg:h-[480px] flex items-center justify-center overflow-hidden rounded-2xl">
          <SynthwaveVisualizer
            className="w-full h-full"
          />
        </section>

      </main>

      {/* Footer: Version and Last Update Date on left, Author on right */}
      <footer className="relative z-10 flex items-center justify-between text-xs sm:text-sm font-mono text-cyan-400/90 pt-3 pb-2 border-t border-white/10 max-w-6xl w-full mx-auto px-2">
        <span className="tracking-wide">v1.18.0 · 25/10/2026</span>
        <span className="tracking-wide font-semibold text-gray-200">Por Miguel Galego</span>
      </footer>

    </div>
  );
};
