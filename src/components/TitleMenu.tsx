/**
 * Sonic Thrust - Title Menu & Mission Setup Component
 * Pixel-faithful recreation of the Synthwave Cyberpunk Reference Mock-up
 * Features live reactive FFT mini-equalizer & inline scrollable track dropdown.
 */

import React, { useState, useEffect, useRef } from 'react';
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
  ChevronLeft,
  ChevronRight,
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
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
  const handleCycleDifficulty = (direction: 1 | -1) => {
    const curIndex = diffOrder.indexOf(difficulty);
    const nextIndex = (curIndex + direction + diffOrder.length) % diffOrder.length;
    const nextDiff = diffOrder[nextIndex];
    onSelectDifficulty(nextDiff);
    const config = DIFFICULTY_PRESETS[nextDiff];
    if (!config.allowFlightAssist) {
      onOptionsChange({ ...options, flightAssist: false });
    } else {
      onOptionsChange({ ...options, flightAssist: config.defaultFlightAssist });
    }
  };

  const handleSetDifficulty = (level: DifficultyLevel) => {
    onSelectDifficulty(level);
    const config = DIFFICULTY_PRESETS[level];
    if (!config.allowFlightAssist) {
      onOptionsChange({ ...options, flightAssist: false });
    } else {
      onOptionsChange({ ...options, flightAssist: config.defaultFlightAssist });
    }
  };

  // Sliding / swiping difficulty gesture support
  const railRef = useRef<HTMLDivElement>(null);
  const isDraggingDiffRef = useRef(false);
  const touchStartXRef = useRef<number | null>(null);

  const updateDifficultyByPosition = (clientX: number) => {
    if (!railRef.current) return;
    const rect = railRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    let targetDiff: DifficultyLevel;
    if (ratio < 0.35) {
      targetDiff = 'NORMAL';
    } else if (ratio < 0.68) {
      targetDiff = 'PRO';
    } else {
      targetDiff = 'EXTREME';
    }
    if (targetDiff !== difficulty) {
      handleSetDifficulty(targetDiff);
    }
  };

  const handleRailPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingDiffRef.current = true;
    touchStartXRef.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    updateDifficultyByPosition(e.clientX);
  };

  const handleRailPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingDiffRef.current) return;
    updateDifficultyByPosition(e.clientX);
  };

  const handleRailPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingDiffRef.current && touchStartXRef.current !== null) {
      const deltaX = e.clientX - touchStartXRef.current;
      if (Math.abs(deltaX) > 28) {
        handleCycleDifficulty(deltaX > 0 ? 1 : -1);
      }
    }
    isDraggingDiffRef.current = false;
    touchStartXRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleRailTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      isDraggingDiffRef.current = true;
      touchStartXRef.current = e.touches[0].clientX;
      updateDifficultyByPosition(e.touches[0].clientX);
    }
  };

  const handleRailTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingDiffRef.current || e.touches.length === 0) return;
    updateDifficultyByPosition(e.touches[0].clientX);
  };

  const handleRailTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isDraggingDiffRef.current && touchStartXRef.current !== null && e.changedTouches.length > 0) {
      const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
      if (Math.abs(deltaX) > 28) {
        handleCycleDifficulty(deltaX > 0 ? 1 : -1);
      }
    }
    isDraggingDiffRef.current = false;
    touchStartXRef.current = null;
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
          
          {/* Card 1: INICIAR (Primary Action Pill Button) */}
          <div className="menu-gradient-card group cursor-pointer" onClick={onStartMission}>
            <div className="rounded-[calc(1rem-1.5px)] p-1 bg-[#0a0520]">
              <div className="relative flex items-center justify-center gap-3.5 py-3.5 sm:py-4 px-6 rounded-xl bg-gradient-to-r from-[#ff007f] via-[#ec4899] to-[#00f0ff] shadow-[0_0_25px_rgba(236,72,153,0.5)] group-hover:shadow-[0_0_35px_rgba(0,240,255,0.7)] group-hover:scale-[1.01] active:scale-[0.99] transition-all">
                {/* Black Double Chevron Play / FastForward Icon */}
                <div className="flex items-center text-black">
                  <FastForward className="w-7 h-7 sm:w-8 sm:h-8 fill-black stroke-black" />
                </div>
                
                {/* Single clean title: INICIAR */}
                <span className="font-orbitron font-black text-xl sm:text-2xl text-black tracking-widest leading-none uppercase">
                  INICIAR
                </span>
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

                    {/* Full-width 60FPS Reactive Mini Equalizer Canvas */}
                    <div className="w-full h-6 mt-1.5">
                      <MiniEqualizer className="w-full h-6" />
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

          {/* Section: DIFICULDADE */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold tracking-wider text-[#00f0ff] uppercase font-orbitron drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
                DIFICULDADE
              </h2>
              <span className="text-[10px] font-mono text-cyan-400/70 tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Desliza ou clica
              </span>
            </div>

            <div className="menu-gradient-card">
              <div className="menu-gradient-card-inner p-3.5 sm:p-4">
                
                {/* Horizontal Stepper Rail with full Touch / Pointer Sliding Support */}
                <div
                  ref={railRef}
                  onPointerDown={handleRailPointerDown}
                  onPointerMove={handleRailPointerMove}
                  onPointerUp={handleRailPointerUp}
                  onTouchStart={handleRailTouchStart}
                  onTouchMove={handleRailTouchMove}
                  onTouchEnd={handleRailTouchEnd}
                  className="relative flex items-center justify-between gap-3 touch-pan-y cursor-ew-resize select-none py-1"
                  title="Desliza horizontalmente com o dedo ou clica para alternar"
                >
                  
                  {/* Glowing purple rail background line */}
                  <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-cyan-500/50 via-fuchsia-500/40 to-purple-800/40 -z-0" />

                  {/* Node 1: NORMAL */}
                  <div className="relative z-10">
                    {difficulty === 'NORMAL' ? (
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-400 text-black shadow-[0_0_18px_rgba(6,182,212,0.7)] border border-cyan-300">
                          <button
                            type="button"
                            onClick={() => handleCycleDifficulty(-1)}
                            className="hover:scale-125 transition cursor-pointer text-black"
                            title="Nível anterior"
                          >
                            <ChevronLeft className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                          <span className="font-orbitron font-extrabold text-xs uppercase tracking-wider text-black">
                            NORMAL
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCycleDifficulty(1)}
                            className="hover:scale-125 transition cursor-pointer text-black"
                            title="Próximo nível"
                          >
                            <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                        {/* 5-step mini meter */}
                        <div className="flex gap-1 mt-1.5">
                          <div className="w-3 h-1 bg-cyan-400 rounded-xs shadow-[0_0_5px_#00f0ff]" />
                          <div className="w-3 h-1 bg-cyan-400 rounded-xs shadow-[0_0_5px_#00f0ff]" />
                          <div className="w-3 h-1 bg-slate-800 rounded-xs" />
                          <div className="w-3 h-1 bg-slate-800 rounded-xs" />
                          <div className="w-3 h-1 bg-slate-800 rounded-xs" />
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetDifficulty('NORMAL')}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-fuchsia-400/80 hover:text-white font-orbitron font-semibold text-xs tracking-wider transition cursor-pointer"
                      >
                        <div className="w-2 h-2 rounded-full border border-fuchsia-400/80 bg-[#0c0824]" />
                        <span>NORMAL</span>
                      </button>
                    )}
                  </div>

                  {/* Node 2: PRO */}
                  <div className="relative z-10">
                    {difficulty === 'PRO' ? (
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-400 text-black shadow-[0_0_18px_rgba(6,182,212,0.7)] border border-cyan-300">
                          <button
                            type="button"
                            onClick={() => handleCycleDifficulty(-1)}
                            className="hover:scale-125 transition cursor-pointer text-black"
                            title="Nível anterior"
                          >
                            <ChevronLeft className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                          <span className="font-orbitron font-extrabold text-xs uppercase tracking-wider text-black">
                            PRO
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCycleDifficulty(1)}
                            className="hover:scale-125 transition cursor-pointer text-black"
                            title="Próximo nível"
                          >
                            <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                        {/* 5-step mini meter */}
                        <div className="flex gap-1 mt-1.5">
                          <div className="w-3 h-1 bg-cyan-400 rounded-xs shadow-[0_0_5px_#00f0ff]" />
                          <div className="w-3 h-1 bg-cyan-400 rounded-xs shadow-[0_0_5px_#00f0ff]" />
                          <div className="w-3 h-1 bg-cyan-400 rounded-xs shadow-[0_0_5px_#00f0ff]" />
                          <div className="w-3 h-1 bg-cyan-400 rounded-xs shadow-[0_0_5px_#00f0ff]" />
                          <div className="w-3 h-1 bg-slate-800 rounded-xs" />
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetDifficulty('PRO')}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-fuchsia-400/80 hover:text-white font-orbitron font-semibold text-xs tracking-wider transition cursor-pointer"
                      >
                        <div className="w-2 h-2 rounded-full border border-fuchsia-400/80 bg-[#0c0824]" />
                        <span>PRO</span>
                      </button>
                    )}
                  </div>

                  {/* Node 3: EXTREME */}
                  <div className="relative z-10">
                    {difficulty === 'EXTREME' ? (
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500 text-white shadow-[0_0_18px_rgba(244,63,94,0.7)] border border-rose-300">
                          <button
                            type="button"
                            onClick={() => handleCycleDifficulty(-1)}
                            className="hover:scale-125 transition cursor-pointer text-white"
                            title="Nível anterior"
                          >
                            <ChevronLeft className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                          <span className="font-orbitron font-extrabold text-xs uppercase tracking-wider text-white">
                            EXTREME
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCycleDifficulty(1)}
                            className="hover:scale-125 transition cursor-pointer text-white"
                            title="Próximo nível"
                          >
                            <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                        {/* 5-step mini meter */}
                        <div className="flex gap-1 mt-1.5">
                          <div className="w-3 h-1 bg-rose-500 rounded-xs shadow-[0_0_5px_#f43f5e]" />
                          <div className="w-3 h-1 bg-rose-500 rounded-xs shadow-[0_0_5px_#f43f5e]" />
                          <div className="w-3 h-1 bg-rose-500 rounded-xs shadow-[0_0_5px_#f43f5e]" />
                          <div className="w-3 h-1 bg-rose-500 rounded-xs shadow-[0_0_5px_#f43f5e]" />
                          <div className="w-3 h-1 bg-rose-500 rounded-xs shadow-[0_0_5px_#f43f5e]" />
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetDifficulty('EXTREME')}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-fuchsia-400/80 hover:text-rose-400 font-orbitron font-semibold text-xs tracking-wider transition cursor-pointer"
                      >
                        <div className="w-2 h-2 rounded-full border border-fuchsia-400/80 bg-[#0c0824]" />
                        <span>EXTREME</span>
                      </button>
                    )}
                  </div>

                </div>

              </div>
            </div>
          </div>

          {/* Section: OPÇÕES (Two stacked cards: Audio/Flight Settings + Controls & Rules) */}
          <div className="flex flex-col gap-2">
            <h2 className="text-xs sm:text-sm font-bold tracking-wider text-[#00f0ff] uppercase font-orbitron drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
              OPÇÕES
            </h2>

            {/* Card 4A: OPÇÕES (ÁUDIO E VOO) */}
            <div
              className="menu-gradient-card cursor-pointer group"
              onClick={() => setShowOptionsModal(true)}
            >
              <div className="menu-gradient-card-inner p-3 sm:p-3.5 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-400/50 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-all">
                  <Settings className="w-6 h-6 text-cyan-400 group-hover:rotate-45 transition-transform duration-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-orbitron font-bold text-xs sm:text-sm text-white tracking-wider group-hover:text-cyan-300 transition-colors">
                    OPÇÕES (ÁUDIO E VOO)
                  </span>
                  <span className="font-rajdhani text-xs text-cyan-300/70 font-medium tracking-wide">
                    Configurações, volume e assistência
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4B: CONTROLOS E REGRAS */}
            <div
              className="menu-gradient-card cursor-pointer group"
              onClick={() => setShowHelp(true)}
            >
              <div className="menu-gradient-card-inner p-3 sm:p-3.5 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-400/50 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-all">
                  <HelpCircle className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-orbitron font-bold text-xs sm:text-sm text-white tracking-wider group-hover:text-cyan-300 transition-colors">
                    CONTROLOS E REGRAS
                  </span>
                </div>
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

      {/* Subtle Footer Note */}
      <footer className="relative z-10 flex items-center justify-between text-[11px] font-mono text-cyan-500/60 pt-2 border-t border-white/5 max-w-6xl w-full mx-auto">
        <span>SONIC THRUST · PROTOCOLO DUAL-THRUSTER</span>
        <span className="hidden sm:inline">ZERO CONTACT · HARMONIC FLIGHT</span>
      </footer>

      {/* MODAL 1: Options (Áudio e Voo) */}
      {showOptionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-xl">
          <div className="max-w-md w-full bg-[#0c0824] border border-cyan-500/50 rounded-2xl p-5 md:p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-orbitron font-bold text-cyan-400 tracking-wider">
                  OPÇÕES (ÁUDIO E VOO)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOptionsModal(false)}
                className="text-gray-400 hover:text-white font-mono text-base px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 text-xs font-rajdhani">
              {/* Flight Assist */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <div className="font-orbitron font-semibold text-white text-xs">
                      Flight Assist (Auto-Estabilização)
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Aplica torque corretivo para nivelar a nave a 0°
                    </div>
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
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/80 border border-rose-500/40 text-rose-300">
                    BLOQUEADO
                  </span>
                )}
              </div>

              {/* Drift Compensation */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <div className="font-orbitron font-semibold text-white text-xs">
                      Compensação de Deriva
                    </div>
                    <div className="text-[11px] text-gray-400">
                      A nave mantém a posição sem avanço automático à direita
                    </div>
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
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-orbitron font-semibold text-xs">
                  <Volume2 className="w-4 h-4" />
                  <span>NÍVEIS DE VOLUME</span>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono text-gray-300 mb-1">
                    <span>MÚSICA</span>
                    <span className="text-cyan-400 tabular-nums">{Math.round(options.musicVolume * 100)}%</span>
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
                  <div className="flex justify-between text-[11px] font-mono text-gray-300 mb-1">
                    <span>SFX / MOTORES</span>
                    <span className="text-fuchsia-400 tabular-nums">{Math.round(options.sfxVolume * 100)}%</span>
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

            {/* Footer */}
            <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowOptionsModal(false)}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-orbitron font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                FECHAR CONFIGURAÇÕES
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: Pilot Guide & Rules */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-xl">
          <div className="max-w-3xl w-full max-h-[90vh] bg-[#0c0824] border border-cyan-500/50 rounded-2xl p-5 md:p-7 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col space-y-5 overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-6 h-6 text-cyan-400" />
                <div>
                  <h3 className="text-base sm:text-lg font-orbitron font-black text-cyan-400 tracking-wider">
                    CONTROLOS E REGRAS: SONIC THRUST
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
