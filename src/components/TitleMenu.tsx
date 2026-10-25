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
  Info,
  Maximize,
  Minimize,
  Compass,
  Activity,
  AlertTriangle,
  Shield,
  Volume2,
  VolumeX,
  CheckCircle2,
  FastForward,
  ChevronDown,
  User,
  Smartphone,
  Touchpad
} from 'lucide-react';
import {
  DifficultyLevel,
  TrackMetadata,
  GameOptions,
  PowerUpType
} from '../types/game';
import { DIFFICULTY_PRESETS } from '../physics/PhysicsWorld';
import { SynthwaveVisualizer } from './SynthwaveVisualizer';
import { MiniEqualizer } from './MiniEqualizer';
import { audio } from '../audio/AudioEngine';

/**
 * Pixel-accurate vector representation of each in-game power-up beacon
 */
const PowerUpGraphic: React.FC<{ type: PowerUpType; size?: number }> = ({ type, size = 44 }) => {
  switch (type) {
    case 'SHIELD':
      return (
        <svg width={size} height={size} viewBox="-24 -24 48 48" className="shrink-0 drop-shadow-[0_0_10px_rgba(0,240,255,0.7)]">
          <polygon points="0,-16 13.85,-8 13.85,8 0,16 -13.85,8 -13.85,-8" fill="rgba(0,240,255,0.22)" stroke="#00f0ff" strokeWidth="2.2" />
          <circle cx="0" cy="0" r="3.5" fill="#ffffff" />
          <circle cx="0" cy="-21" r="2.5" fill="#ffffff" />
          <circle cx="18.1" cy="10.5" r="2.5" fill="#ffffff" />
          <circle cx="-18.1" cy="10.5" r="2.5" fill="#ffffff" />
        </svg>
      );
    case 'DAMPER':
      return (
        <svg width={size} height={size} viewBox="-24 -24 48 48" className="shrink-0 drop-shadow-[0_0_10px_rgba(0,255,136,0.7)]">
          <circle cx="0" cy="0" r="18" fill="none" stroke="#00ff88" strokeWidth="2.2" />
          <circle cx="0" cy="0" r="11" fill="none" stroke="#00ff88" strokeWidth="1.5" strokeOpacity="0.7" />
          <path d="M-11,0 Q-5.5,-7 0,0 T11,0" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="0" cy="0" r="2.5" fill="#00ff88" />
        </svg>
      );
    case 'LOW_G':
      return (
        <svg width={size} height={size} viewBox="-24 -24 48 48" className="shrink-0 drop-shadow-[0_0_10px_rgba(255,215,0,0.7)]">
          <ellipse cx="0" cy="0" rx="18" ry="7" fill="none" stroke="#ffd700" strokeWidth="2.2" transform="rotate(-25)" />
          <ellipse cx="0" cy="0" rx="14" ry="5.5" fill="none" stroke="#ffd700" strokeWidth="1.5" strokeOpacity="0.8" transform="rotate(35)" />
          <circle cx="0" cy="0" r="4.5" fill="#ffffff" />
        </svg>
      );
    case 'PULSE':
      return (
        <svg width={size} height={size} viewBox="-24 -24 48 48" className="shrink-0 drop-shadow-[0_0_10px_rgba(6,182,212,0.7)]">
          <circle cx="0" cy="0" r="19" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="3 2" />
          <circle cx="0" cy="0" r="14" fill="none" stroke="#06b6d4" strokeWidth="2" />
          <circle cx="0" cy="0" r="8" fill="none" stroke="#06b6d4" strokeWidth="1.5" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line key={deg} x1="0" y1="-14" x2="0" y2="-18" stroke="#06b6d4" strokeWidth="1.5" transform={`rotate(${deg})`} />
          ))}
          <circle cx="0" cy="0" r="3.5" fill="#ffffff" />
        </svg>
      );
    case 'ETHEREAL':
      return (
        <svg width={size} height={size} viewBox="-24 -24 48 48" className="shrink-0 drop-shadow-[0_0_10px_rgba(168,85,247,0.7)]">
          <circle cx="0" cy="0" r="17" fill="rgba(168,85,247,0.22)" stroke="#a855f7" strokeWidth="2.2" strokeDasharray="4 3" />
          <path d="M-10,0 Q-5,-5 0,0 T10,0" fill="none" stroke="#e9d5ff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="0" cy="-21" r="2.5" fill="#c084fc" />
          <circle cx="18" cy="10" r="2.5" fill="#c084fc" />
          <circle cx="-18" cy="10" r="2.5" fill="#c084fc" />
          <circle cx="0" cy="0" r="4" fill="#faf5ff" />
        </svg>
      );
    case 'INVULNERABLE':
      return (
        <svg width={size} height={size} viewBox="-24 -24 48 48" className="shrink-0 drop-shadow-[0_0_12px_rgba(255,0,85,0.8)]">
          <polygon points="0,-17 14.7,-8.5 14.7,8.5 0,17 -14.7,8.5 -14.7,-8.5" fill="rgba(255,0,85,0.25)" stroke="#ff0055" strokeWidth="2.5" />
          <circle cx="0" cy="0" r="8" fill="none" stroke="#ff0055" strokeWidth="1.5" />
          <circle cx="0" cy="-12" r="2" fill="#ffffff" />
          <circle cx="12" cy="0" r="2" fill="#ffffff" />
          <circle cx="0" cy="12" r="2" fill="#ffffff" />
          <circle cx="-12" cy="0" r="2" fill="#ffffff" />
          <circle cx="0" cy="0" r="4" fill="#ffffff" />
        </svg>
      );
    case 'CHRONO_DILATION':
      return (
        <svg width={size} height={size} viewBox="-24 -24 48 48" className="shrink-0 drop-shadow-[0_0_10px_rgba(20,184,166,0.7)]">
          <circle cx="0" cy="0" r="16" fill="rgba(20,184,166,0.15)" stroke="#14b8a6" strokeWidth="2" />
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <line key={deg} x1="0" y1="-12" x2="0" y2="-15" stroke="#14b8a6" strokeWidth={deg % 90 === 0 ? 2 : 1} transform={`rotate(${deg})`} />
          ))}
          <line x1="0" y1="0" x2="0" y2="-8" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <line x1="0" y1="0" x2="6" y2="3" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
        </svg>
      );
    case 'SINGULARITY':
      return (
        <svg width={size} height={size} viewBox="-24 -24 48 48" className="shrink-0 drop-shadow-[0_0_12px_rgba(192,132,252,0.8)]">
          <path d="M0,0 C6,-6 14,-4 16,0 C18,6 12,14 6,16 C-2,18 -12,12 -16,4 C-19,-4 -12,-15 -2,-17 C8,-19 18,-11 19,-2" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
          <circle cx="0" cy="0" r="7" fill="#090514" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="2.5" fill="#c084fc" />
        </svg>
      );
    default:
      return null;
  }
};

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
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
          <span className="font-orbitron text-xs sm:text-sm tracking-wider text-cyan-400 font-bold uppercase">
            SONIC ARCADE
          </span>
        </div>

        {/* Audio Mute & Fullscreen Controls */}
        <div className="flex items-center gap-2">
          {/* Menu Audio Mute / Unmute Button */}
          <button
            type="button"
            onClick={handleToggleMenuMusic}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-mono transition-all shadow-md cursor-pointer ${
              isMuted
                ? 'border-rose-500/50 bg-rose-950/60 text-rose-300 hover:border-rose-400 hover:bg-rose-900/70 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                : 'border-cyan-500/40 bg-slate-950/80 text-cyan-300 hover:border-cyan-300 hover:bg-cyan-950/60 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
            }`}
            title={isMuted ? 'Ativar música do menu' : 'Silenciar música do menu'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-rose-400" />
                <span className="hidden sm:inline">Música: Mudo</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-slate-950/70 hover:bg-cyan-950/60 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs sm:text-sm font-mono transition-all shadow-md cursor-pointer"
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
      </div>

      {/* Header with Sonic Thrust Neon Brand Title (Unobstructed at all resolutions) */}
      <header className="relative z-10 flex flex-col items-center justify-center text-center pt-1 sm:pt-2 pb-2 sm:pb-3 shrink-0">
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black italic tracking-wider uppercase font-orbitron flex items-center justify-center gap-3 sm:gap-4 drop-shadow-[0_0_24px_rgba(0,240,255,0.4)]">
          <span className="neon-text-cyan text-[#00f0ff]">SONIC</span>
          <span className="neon-text-magenta text-[#ff007f]">THRUST</span>
        </h1>
        <p className="text-[#38bdf8] text-sm sm:text-base md:text-lg lg:text-xl font-rajdhani font-semibold max-w-2xl mt-1.5 sm:mt-2 tracking-wide leading-relaxed px-4 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">
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
                      <span className="font-rajdhani font-bold text-xs sm:text-sm text-black/90 tracking-wider uppercase mt-0.5">
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
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-wider text-[#00f0ff] uppercase font-orbitron drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
                SELECIONAR FAIXA
              </h2>
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
                    className="w-12 h-12 rounded-xl border border-cyan-400/80 bg-cyan-950/60 hover:bg-cyan-500/20 text-cyan-300 hover:text-white flex items-center justify-center shrink-0 transition-all shadow-[0_0_12px_rgba(6,182,212,0.35)] cursor-pointer"
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
                        <span className="font-orbitron font-bold text-base sm:text-lg text-white group-hover/track:text-cyan-300 transition-colors tracking-wide truncate">
                          {selectedTrack?.title || 'Ayla'}
                        </span>
                        {selectedTrack?.isProcedural && (
                          <span className="text-xs uppercase font-mono font-semibold px-2 py-0.5 rounded bg-fuchsia-950/80 border border-fuchsia-500/40 text-fuchsia-300 shrink-0">
                            Synth
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0 text-cyan-400 group-hover/track:text-cyan-200 transition-colors">
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-fuchsia-400' : ''}`} />
                      </div>
                    </div>

                    {/* Metadata Row: Author / Artist + BPM + Duration */}
                    <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 mt-1 text-sm">
                      <span className="text-cyan-300 font-rajdhani font-semibold truncate flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="text-gray-400 font-normal">Artista:</span>
                        <span className="text-cyan-300 font-medium">{selectedTrack?.artist || 'Kosmischer Wanderer'}</span>
                      </span>
                      <span className="text-slate-600 hidden sm:inline">•</span>
                      <span className="font-mono text-xs sm:text-sm text-cyan-300 font-medium tracking-wider">
                        {selectedTrack?.estimatedBpm || 136} BPM
                      </span>
                      <span className="text-slate-600 hidden sm:inline">•</span>
                      <span className="font-mono text-xs sm:text-sm text-gray-200 font-medium">
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
                    <div className="flex items-center justify-between text-xs sm:text-sm font-orbitron font-bold text-cyan-300/90 px-1 pb-1">
                      <span>CATÁLOGO DE MÚSICAS ({tracks.length})</span>
                      <span className="text-xs font-mono text-gray-400">Escolhe ou pré-escuta</span>
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
                            className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                              isSelected
                                ? 'border-cyan-400 bg-cyan-950/70 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                                : 'border-white/10 bg-slate-900/60 hover:border-cyan-500/40 hover:bg-slate-900/90'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectTrack(track);
                                  onPreviewTrack(track);
                                }}
                                disabled={isLoadingThis}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition cursor-pointer ${
                                  isPlayingThis
                                    ? 'bg-cyan-400 text-black shadow-md shadow-cyan-400/50'
                                    : isSelected
                                      ? 'bg-cyan-500 text-black'
                                      : 'bg-white/10 text-cyan-300 hover:bg-cyan-500/20'
                                }`}
                                title={isPlayingThis ? 'Parar pré-escuta' : 'Pré-escutar faixa'}
                              >
                                {isLoadingThis ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                                ) : isPlayingThis ? (
                                  <Pause className="w-4 h-4 fill-current text-black animate-pulse" />
                                ) : (
                                  <Play className="w-4 h-4 fill-current text-cyan-300 ml-0.5" />
                                )}
                              </button>

                              <div className="truncate">
                                <div className="flex items-center gap-2">
                                  <span className="font-orbitron font-bold text-sm sm:text-base text-white truncate">
                                    {track.title}
                                  </span>
                                  {track.isProcedural && (
                                    <span className="text-xs uppercase font-mono font-semibold px-1.5 py-0.5 rounded bg-fuchsia-950/80 border border-fuchsia-500/40 text-fuchsia-300">
                                      Synth
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs sm:text-sm text-gray-300 font-rajdhani font-medium truncate mt-0.5">
                                  {track.artist}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 font-mono text-xs sm:text-sm">
                              <span className="text-cyan-400 font-semibold tabular-nums">{track.estimatedBpm || 128} BPM</span>
                              <span className="text-gray-400">·</span>
                              <span className="text-gray-200 tabular-nums">
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
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-wider text-[#00f0ff] uppercase font-orbitron drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
                DIFICULDADE
              </h2>
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
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                      difficulty === 'NORMAL'
                        ? 'border-cyan-400/80 bg-cyan-950/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                        : difficulty === 'PRO'
                          ? 'border-fuchsia-400/80 bg-fuchsia-950/60 text-fuchsia-300 shadow-[0_0_12px_rgba(217,70,239,0.35)]'
                          : 'border-rose-500/80 bg-rose-950/60 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                    }`}>
                      {difficulty === 'NORMAL' && <Shield className="w-6 h-6 text-cyan-400" />}
                      {difficulty === 'PRO' && <Activity className="w-6 h-6 text-fuchsia-400" />}
                      {difficulty === 'EXTREME' && <AlertTriangle className="w-6 h-6 text-rose-400" />}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-orbitron font-black text-base sm:text-lg tracking-wider ${
                          difficulty === 'NORMAL'
                            ? 'text-cyan-300'
                            : difficulty === 'PRO'
                              ? 'text-fuchsia-300'
                              : 'text-rose-400'
                        }`}>
                          {difficulty}
                        </span>
                        <span className="text-xs sm:text-sm font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-gray-200">
                          {currentDiffConfig.initialLives} Vidas
                        </span>
                      </div>
                      <span className="font-rajdhani text-sm text-gray-200 font-medium truncate mt-0.5">
                        {difficulty === 'NORMAL' && 'Gravidade 70% • 1 Escudo • Voo Manual'}
                        {difficulty === 'PRO' && 'Gravidade 100% • Sem Escudos • Dinâmico'}
                        {difficulty === 'EXTREME' && 'Gravidade 130% • 2 Vidas • Sem Escudos'}
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
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
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
                              <span className={`font-orbitron font-bold text-sm sm:text-base uppercase tracking-wider ${
                                diffKey === 'NORMAL' ? 'text-cyan-300' : diffKey === 'PRO' ? 'text-fuchsia-300' : 'text-rose-400'
                              }`}>
                                {diffKey}
                              </span>
                              <span className="text-xs sm:text-sm font-mono text-gray-200 font-medium">
                                {config.initialLives} Vidas · {config.initialShields > 0 ? `${config.initialShields} Escudo` : 'Sem Escudo'}
                              </span>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className={`w-5 h-5 ${
                                diffKey === 'NORMAL' ? 'text-cyan-400' : diffKey === 'PRO' ? 'text-fuchsia-400' : 'text-rose-400'
                              }`} />
                            )}
                          </div>

                          <p className="text-xs sm:text-sm font-rajdhani text-gray-200 leading-relaxed">
                            {config.description}
                          </p>

                          <div className="flex items-center gap-2.5 text-xs font-mono pt-0.5">
                            <span className="text-gray-300">Gravidade: <strong className="text-cyan-300 font-bold">{Math.round(config.gravityMultiplier * 100)}%</strong></span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-300">Voo: <strong className="text-fuchsia-300 font-bold">100% Manual</strong></span>
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
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-wider text-[#00f0ff] uppercase font-orbitron drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
                OPÇÕES (ÁUDIO E VOO)
              </h2>
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
                    <div className="w-11 h-11 rounded-xl border border-cyan-400/60 bg-cyan-950/60 text-cyan-400 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.3)] group-hover/opt:scale-105 transition-all">
                      <Settings className="w-6 h-6 text-cyan-400 group-hover/opt:rotate-45 transition-transform duration-300" />
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-orbitron font-bold text-sm sm:text-base text-white group-hover/opt:text-cyan-300 transition-colors tracking-wide truncate">
                        CONFIGURAÇÕES DE VOO E ÁUDIO
                      </span>
                      <span className="font-rajdhani text-sm text-gray-200 font-medium truncate mt-0.5">
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
                    <div className="p-3 rounded-xl bg-slate-900/70 border border-white/10 flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <Compass className="w-5 h-5 text-cyan-400 shrink-0" />
                        <div>
                          <div className="font-orbitron font-bold text-white text-sm">
                            Flight Assist (Auto-Estabilização)
                          </div>
                          <div className="text-xs sm:text-sm text-gray-300 leading-snug mt-0.5">
                            Desativado permanentemente — Voo 100% manual e reflexos puros
                          </div>
                        </div>
                      </div>

                      <span className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-white/10 text-gray-400 shrink-0">
                        DESATIVADO
                      </span>
                    </div>

                    {/* Drift Compensation Toggle */}
                    <div className="p-3 rounded-xl bg-slate-900/70 border border-white/10 flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <Activity className="w-5 h-5 text-cyan-400 shrink-0" />
                        <div>
                          <div className="font-orbitron font-bold text-white text-sm">
                            Compensação de Deriva
                          </div>
                          <div className="text-xs sm:text-sm text-gray-300 leading-snug mt-0.5">
                            A nave mantém a posição sem avanço automático à direita
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOptionsChange({ ...options, driftCompensation: !options.driftCompensation })}
                        className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-mono font-bold transition cursor-pointer shrink-0 ${
                          options.driftCompensation
                            ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        {options.driftCompensation ? 'LIGADO' : 'DESLIGADO'}
                      </button>
                    </div>

                    {/* Volume Controls */}
                    <div className="p-3 rounded-xl bg-slate-900/70 border border-white/10 space-y-3">
                      <div className="flex items-center gap-2 text-cyan-400 font-orbitron font-bold text-sm">
                        <Volume2 className="w-4 h-4" />
                        <span>NÍVEIS DE VOLUME</span>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs sm:text-sm font-mono font-semibold text-gray-200 mb-1.5">
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
                          className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs sm:text-sm font-mono font-semibold text-gray-200 mb-1.5">
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
                          className="w-full accent-fuchsia-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: INFORMAÇÕES (Inline Scrollable Dropdown) */}
          <div className="flex flex-col gap-1.5">
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-wider text-[#00f0ff] uppercase font-orbitron drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
                INFORMAÇÕES
              </h2>
            </div>

            <div className="menu-gradient-card">
              <div className="menu-gradient-card-inner p-3.5 sm:p-4 flex flex-col">
                {/* Header Row (Click to toggle dropdown) */}
                <div
                  onClick={() => setIsControlsOpen(prev => !prev)}
                  className="flex items-center justify-between gap-3 cursor-pointer group/ctrl select-none"
                  title={isControlsOpen ? 'Fechar informações' : 'Abrir informações e guia'}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-xl border border-cyan-400/60 bg-cyan-950/60 text-cyan-400 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.3)] group-hover/ctrl:scale-105 transition-all">
                      <Info className="w-6 h-6 text-cyan-400" />
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-orbitron font-bold text-sm sm:text-base text-white group-hover/ctrl:text-cyan-300 transition-colors tracking-wide truncate">
                        INFORMAÇÕES & GUIA DO PILOTO
                      </span>
                      <span className="font-rajdhani text-sm text-gray-200 font-medium truncate mt-0.5">
                        Controlos (Ecrã Tátil & Teclado) e os 8 Power-Ups
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-cyan-400 group-hover/ctrl:text-white transition-colors shrink-0">
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isControlsOpen ? 'rotate-180 text-fuchsia-400' : ''}`} />
                  </div>
                </div>

                {/* Inline Scrollable Information Panel */}
                {isControlsOpen && (
                  <div className="mt-3.5 pt-3.5 border-t border-cyan-500/25 flex flex-col gap-3.5 max-h-80 sm:max-h-96 overflow-y-auto pr-1">
                    
                    {/* Visual Flight Controls for Touchscreen and Keyboard */}
                    <div className="p-3.5 rounded-xl bg-slate-900/85 border border-cyan-500/35 flex flex-col gap-3 shadow-lg">
                      <div className="flex items-center gap-2 font-orbitron font-bold text-cyan-300 text-sm uppercase">
                        <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>CONTROLOS DE VOO (ECRÃ TÁTIL & TECLADO)</span>
                      </div>

                      {/* Visual Interactive Cockpit / Screen Schematic */}
                      <div className="relative rounded-xl border border-cyan-500/40 bg-gradient-to-b from-[#090b16] to-[#05060d] p-3 flex flex-col gap-2.5 overflow-hidden shadow-inner">
                        <div className="grid grid-cols-2 gap-3 relative z-10">
                          
                          {/* Left Touch Zone */}
                          <div className="p-3 rounded-lg border border-cyan-400/50 bg-cyan-950/40 flex flex-col items-center text-center gap-2 shadow-[0_0_12px_rgba(6,182,212,0.18)]">
                            <div className="flex items-center justify-center gap-1.5 text-cyan-400">
                              <Touchpad className="w-5 h-5 animate-pulse" />
                              <span className="font-orbitron font-black text-xs sm:text-sm text-cyan-300">METADE ESQUERDA</span>
                            </div>
                            <div className="px-2.5 py-1 rounded bg-cyan-900/60 border border-cyan-400/50 font-mono font-bold text-xs sm:text-sm text-white">
                              [A] ou [←]
                            </div>
                            <span className="font-orbitron font-bold text-xs sm:text-sm text-cyan-200 uppercase">MOTOR ESQUERDO</span>
                            <p className="text-xs sm:text-sm font-rajdhani text-gray-200 leading-snug">
                              Toque contínuo ativa o motor esquerdo, inclinando a nave e rodando para a direita.
                            </p>
                          </div>

                          {/* Right Touch Zone */}
                          <div className="p-3 rounded-lg border border-fuchsia-400/50 bg-fuchsia-950/40 flex flex-col items-center text-center gap-2 shadow-[0_0_12px_rgba(217,70,239,0.18)]">
                            <div className="flex items-center justify-center gap-1.5 text-fuchsia-400">
                              <Touchpad className="w-5 h-5 animate-pulse" />
                              <span className="font-orbitron font-black text-xs sm:text-sm text-fuchsia-300">METADE DIREITA</span>
                            </div>
                            <div className="px-2.5 py-1 rounded bg-fuchsia-900/60 border border-fuchsia-400/50 font-mono font-bold text-xs sm:text-sm text-white">
                              [D] ou [→]
                            </div>
                            <span className="font-orbitron font-bold text-xs sm:text-sm text-fuchsia-200 uppercase">MOTOR DIREITO</span>
                            <p className="text-xs sm:text-sm font-rajdhani text-gray-200 leading-snug">
                              Toque contínuo ativa o motor direito, inclinando a nave e rodando para a esquerda.
                            </p>
                          </div>

                        </div>

                        {/* Simultaneous Dual-Touch / Both Keys: Straight Vertical Ascent */}
                        <div className="p-2.5 rounded-lg border border-cyan-400/30 bg-cyan-950/30 flex items-center justify-center gap-2 text-center">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                          <span className="font-orbitron font-bold text-xs sm:text-sm text-white uppercase tracking-wide">
                            AMBOS OS LADOS SIMULTÂNEOS:
                          </span>
                          <span className="font-rajdhani font-semibold text-xs sm:text-sm text-cyan-300">
                            Subida vertical a direito com propulsão equilibrada máxima
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* All 8 Power-Ups with in-game Vector Graphics & Succinct Explanations */}
                    <div className="p-3.5 rounded-xl bg-slate-900/85 border border-white/15 flex flex-col gap-3 shadow-lg">
                      <div className="flex items-center gap-2 font-orbitron font-bold text-cyan-300 text-sm uppercase">
                        <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>OS 8 POWER-UPS DE RESSONÂNCIA</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        
                        {/* 1. SHIELD */}
                        <div className="p-3 rounded-xl border border-cyan-400/40 bg-cyan-950/35 flex items-center gap-3">
                          <PowerUpGraphic type="SHIELD" size={48} />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-orbitron font-bold text-sm text-cyan-300">ESCUDO DE FASE</span>
                            </div>
                            <p className="font-rajdhani text-xs sm:text-sm text-gray-200 leading-snug mt-0.5">
                              Absorve 1 colisão contra o túnel ou obstáculos com repulsão segura.
                            </p>
                          </div>
                        </div>

                        {/* 2. DAMPER */}
                        <div className="p-3 rounded-xl border border-emerald-400/40 bg-emerald-950/35 flex items-center gap-3">
                          <PowerUpGraphic type="DAMPER" size={48} />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-orbitron font-bold text-sm text-emerald-300">AMORTECEDOR INERCIAL</span>
                            </div>
                            <p className="font-rajdhani text-xs sm:text-sm text-gray-200 leading-snug mt-0.5">
                              Amortece impactos violentos e estabiliza instantaneamente a trajetória e rotação.
                            </p>
                          </div>
                        </div>

                        {/* 3. LOW_G */}
                        <div className="p-3 rounded-xl border border-yellow-400/40 bg-yellow-950/35 flex items-center gap-3">
                          <PowerUpGraphic type="LOW_G" size={48} />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-orbitron font-bold text-sm text-yellow-300">GRAVIDADE REDUZIDA</span>
                            </div>
                            <p className="font-rajdhani text-xs sm:text-sm text-gray-200 leading-snug mt-0.5">
                              Surto de microgravidade com 50% menos gravidade durante 5s de voo ultra-leve.
                            </p>
                          </div>
                        </div>

                        {/* 4. PULSE */}
                        <div className="p-3 rounded-xl border border-cyan-400/40 bg-cyan-950/35 flex items-center gap-3">
                          <PowerUpGraphic type="PULSE" size={48} />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-orbitron font-bold text-sm text-cyan-300">PULSO SÓNICO</span>
                            </div>
                            <p className="font-rajdhani text-xs sm:text-sm text-gray-200 leading-snug mt-0.5">
                              Onda de choque que desativa lasers de energia e destrói minas de ressonância.
                            </p>
                          </div>
                        </div>

                        {/* 5. ETHEREAL */}
                        <div className="p-3 rounded-xl border border-purple-400/40 bg-purple-950/35 flex items-center gap-3">
                          <PowerUpGraphic type="ETHEREAL" size={48} />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-orbitron font-bold text-sm text-purple-300">MODO FANTASMA</span>
                            </div>
                            <p className="font-rajdhani text-xs sm:text-sm text-gray-200 leading-snug mt-0.5">
                              Transforma a nave em fantasma durante 6s, atravessando todos os obstáculos.
                            </p>
                          </div>
                        </div>

                        {/* 6. INVULNERABLE */}
                        <div className="p-3 rounded-xl border border-rose-400/40 bg-rose-950/35 flex items-center gap-3">
                          <PowerUpGraphic type="INVULNERABLE" size={48} />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-orbitron font-bold text-sm text-rose-300">INVULNERABILIDADE</span>
                            </div>
                            <p className="font-rajdhani text-xs sm:text-sm text-gray-200 leading-snug mt-0.5">
                              Imunidade total contra todos os danos e obstáculos durante 3.5 segundos.
                            </p>
                          </div>
                        </div>

                        {/* 7. CHRONO_DILATION */}
                        <div className="p-3 rounded-xl border border-teal-400/40 bg-teal-950/35 flex items-center gap-3">
                          <PowerUpGraphic type="CHRONO_DILATION" size={48} />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-orbitron font-bold text-sm text-teal-300">DISTORÇÃO TEMPORAL</span>
                            </div>
                            <p className="font-rajdhani text-xs sm:text-sm text-gray-200 leading-snug mt-0.5">
                              Câmara lenta a 50% por 5 segundos com reflexos hiper-acelerados.
                            </p>
                          </div>
                        </div>

                        {/* 8. SINGULARITY */}
                        <div className="p-3 rounded-xl border border-fuchsia-400/40 bg-fuchsia-950/35 flex items-center gap-3">
                          <PowerUpGraphic type="SINGULARITY" size={48} />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-orbitron font-bold text-sm text-fuchsia-300">SINGULARIDADE</span>
                            </div>
                            <p className="font-rajdhani text-xs sm:text-sm text-gray-200 leading-snug mt-0.5">
                              Vórtice cósmico que atrai e absorve automaticamente orbes de ressonância.
                            </p>
                          </div>
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
        <span className="tracking-wide">v1.20.0 · 25/10/2026</span>
        <span className="tracking-wide font-semibold text-gray-200">Por Miguel Galego</span>
      </footer>

    </div>
  );
};
