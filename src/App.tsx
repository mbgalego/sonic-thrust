/**
 * Sonic Thrust - 2D Neon Audio Physics Navigator
 * Main Application & Game Loop Orchestrator
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { audio } from './audio/AudioEngine';
import { LocalTrackLoader, LocalUploadResult } from './audio/LocalTrackLoader';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { GameRenderer } from './graphics/GameRenderer';
import {
  GameState,
  DifficultyLevel,
  TrackMetadata,
  GameOptions,
  GameStats,
  PowerUpType,
  PowerUpAnnouncement
} from './types/game';
import { TitleMenu } from './components/TitleMenu';
import { GameHUD } from './components/GameHUD';
import { PauseModal } from './components/PauseModal';
import { EndGameModal } from './components/EndGameModal';

const DEFAULT_TRACKS: TrackMetadata[] = [
  {
    "id": "classical-cybernetic",
    "title": "Classical Cybernetic",
    "artist": "miguelius",
    "filename": "Classical Cybernetic.m4a",
    "estimatedBpm": 130,
    "duration": 245,
    "description": "Fusão eletrizante entre música clássica barroca e synthwave cibernético de alta voltagem.",
    "isProcedural": false
  },
  {
    "id": "cuig-noimead-eile",
    "title": "Cúig Nóiméad Eile",
    "artist": "miguelius",
    "filename": "Cúig Nóiméad Eile.mp3",
    "estimatedBpm": 128,
    "duration": 265,
    "description": "Viagem rítmica envolvente com influências celtas futuristas e batida pulsante.",
    "isProcedural": false
  },
  {
    "id": "high-tech-cello",
    "title": "High Tech Cello",
    "artist": "miguelius",
    "filename": "High Tech Cello.mp3",
    "estimatedBpm": 132,
    "duration": 239,
    "description": "Violoncelo futurista hiper-processado sobre graves analógicos e ritmo cortante.",
    "isProcedural": false
  },
  {
    "id": "no-fear-no-ending",
    "title": "No Fear, No Ending",
    "artist": "miguelius",
    "filename": "No Fear, No Ending.mp3",
    "estimatedBpm": 135,
    "duration": 245,
    "description": "Hino épico acelerado com guitarras sintetizadas e percussão enérgica para corridas de alta velocidade.",
    "isProcedural": false
  },
  {
    "id": "o-compasso-da-saudade",
    "title": "O Compasso da Saudade",
    "artist": "miguelius",
    "filename": "O Compasso da Saudade.mp3",
    "estimatedBpm": 120,
    "duration": 230,
    "description": "Melodia emotiva e nostálgica pontuada por batidas espaciais e atmosferas etéreas.",
    "isProcedural": false
  },
  {
    "id": "hyper-drive",
    "title": "Hyper-Drive",
    "artist": "miguelius",
    "filename": "Hyper-Drive.mp3",
    "estimatedBpm": 140,
    "duration": 268,
    "description": "Turbo synthwave a alta velocidade com arpeggios cortantes e graves em overdrive.",
    "isProcedural": false
  },
  {
    "id": "sonic-drift",
    "title": "Sonic Drift",
    "artist": "miguelius",
    "filename": "Sonic Drift.m4a",
    "estimatedBpm": 118,
    "duration": 249,
    "description": "Synthwave flutuante e cinematográfico, com grooves largos e atmosfera de estrada noturna.",
    "isProcedural": false
  },
  {
    "id": "sonic-drive",
    "title": "Sonic Drive",
    "artist": "miguelius",
    "filename": "Sonic Drive.m4a",
    "estimatedBpm": 126,
    "duration": 202,
    "description": "Corrida eletro-combustível com batida firme e linhas de baixo em ascensão contínua.",
    "isProcedural": false
  },
  {
    "id": "the-flight-has-ended",
    "title": "The flight... has ended",
    "artist": "miguelius",
    "filename": "The flight... has ended.m4a",
    "estimatedBpm": 96,
    "duration": 107,
    "description": "Coda melódica contemplativa com atmosfera de encerramento — ritmo lento e introspetivo.",
    "isProcedural": false
  },
  {
    "id": "redux-abyssum",
    "title": "Redux Abyssum",
    "artist": "Abyss Project",
    "filename": "Redux Abyssum.mp3",
    "estimatedBpm": 128,
    "duration": 300,
    "description": "Faixa synthwave abissal com graves profundos e pulsos rítmicos que criam uma atmosfera imersiva.",
    "isProcedural": false
  },
  {
    "id": "cyber-overdrive",
    "title": "Cyber Overdrive (Procedural Synth)",
    "artist": "Sonic Thrust Labs",
    "filename": "cyber-overdrive.mp3",
    "estimatedBpm": 132,
    "duration": 96,
    "description": "Synthwave frenético com graves pulsantes e arpeggios cortantes.",
    "isProcedural": true
  },
  {
    "id": "neon-velocity",
    "title": "Neon Velocity (High BPM)",
    "artist": "RetroPulse",
    "filename": "neon-velocity.mp3",
    "estimatedBpm": 145,
    "duration": 112,
    "description": "Darksynth acelerado com batidas secas e alta densidade de graves.",
    "isProcedural": true
  },
  {
    "id": "dark-matter-drift",
    "title": "Dark Matter Drift (Deep Bass)",
    "artist": "SubOrbit",
    "filename": "dark-matter-drift.mp3",
    "estimatedBpm": 115,
    "duration": 84,
    "description": "Ondas subsónicas profundas com fortes oscilações no teto e chão.",
    "isProcedural": true
  }
];

const POWER_UP_ANNOUNCEMENTS: Record<PowerUpType, { title: string; subtitle: string; color: string; borderColor: string; glowColor: string }> = {
  ETHEREAL: {
    title: 'Tu és um fantasma!',
    subtitle: 'Atravessa todos os obstáculos por 6 segundos',
    color: 'text-fuchsia-300',
    borderColor: 'border-fuchsia-400',
    glowColor: 'rgba(217, 70, 239, 0.9)'
  },
  SHIELD: {
    title: 'Escudo de Fase Ativado!',
    subtitle: 'Proteção impenetrável contra a próxima colisão',
    color: 'text-cyan-300',
    borderColor: 'border-cyan-400',
    glowColor: 'rgba(0, 240, 255, 0.9)'
  },
  DAMPER: {
    title: 'Amortecedor Sónico Ativado!',
    subtitle: 'O túnel deixa de pulsar com a música — deformação reduzida em 78% durante 6s',
    color: 'text-emerald-300',
    borderColor: 'border-emerald-400',
    glowColor: 'rgba(34, 197, 94, 0.9)'
  },
  LOW_G: {
    title: 'Gravidade Reduzida!',
    subtitle: 'Surto de microgravidade — voo ultra-leve por 5 segundos',
    color: 'text-yellow-300',
    borderColor: 'border-yellow-400',
    glowColor: 'rgba(250, 204, 21, 0.9)'
  },
  PULSE: {
    title: 'Pulso Sónico Disparado!',
    subtitle: 'Onda de choque que desativa lasers e minas de ressonância',
    color: 'text-cyan-300',
    borderColor: 'border-cyan-400',
    glowColor: 'rgba(6, 182, 212, 0.9)'
  },
  INVULNERABLE: {
    title: 'Invulnerabilidade Total!',
    subtitle: 'Imunidade completa contra todos os danos por 3.5 segundos',
    color: 'text-rose-300',
    borderColor: 'border-rose-500',
    glowColor: 'rgba(244, 63, 94, 0.9)'
  },
  CHRONO_DILATION: {
    title: 'Distorção Temporal Ativada!',
    subtitle: 'Câmara lenta a 50% — reflexos hiper-acelerados por 5 segundos',
    color: 'text-teal-300',
    borderColor: 'border-teal-400',
    glowColor: 'rgba(20, 184, 166, 0.9)'
  },
  SINGULARITY: {
    title: 'Singularidade Gravitacional!',
    subtitle: 'Vórtice atrai todos os orbes e cristais de ressonância',
    color: 'text-purple-300',
    borderColor: 'border-purple-400',
    glowColor: 'rgba(168, 85, 247, 0.9)'
  }
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [tracks, setTracks] = useState<TrackMetadata[]>(DEFAULT_TRACKS);
  const [selectedTrack, setSelectedTrack] = useState<TrackMetadata | null>(DEFAULT_TRACKS[0]);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('NORMAL');
  const [options, setOptions] = useState<GameOptions>({
    flightAssist: false, // Permanently deactivated
    driftCompensation: true,
    musicVolume: 0.85,
    sfxVolume: 0.8
  });
  const [activeAnnouncement, setActiveAnnouncement] = useState<PowerUpAnnouncement | null>(null);
  const announcementTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  // HUD State (synced at throttled frequency to keep 60fps canvas buttery smooth)
  const [hudStats, setHudStats] = useState<GameStats>({
    distanceTravelled: 0,
    totalDistance: 18000,
    percentCompleted: 0,
    timeElapsed: 0,
    totalDuration: 96,
    timePenalty: 0,
    maxSpeed: 0,
    shieldsUsed: 0,
    powerUpsCollected: 0,
    currentBpm: 132
  });

  const [shipHudInfo, setShipHudInfo] = useState({
    shields: 1,
    lives: 3,
    maxLives: 3,
    damperActiveTimer: 0,
    lowGActiveTimer: 0,
    invulnerableTime: 0,
    etherealActiveTimer: 0,
    chronoDilationTimer: 0,
    singularityNotifyTimer: 0,
    leftThrusterPower: 0,
    rightThrusterPower: 0,
    sonicPulseNotifyTimer: 0,
    timePenaltyNotifyTimer: 0,
    vx: 0,
    vy: 0
  });

  // Canvas & Engine References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const worldRef = useRef<PhysicsWorld | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const hudThrottleTimerRef = useRef<number>(0);

  // Input states
  const keysHeld = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const countTickLastSecRef = useRef<number>(-1);
  const timeUpRef = useRef(false);

  // Monotonic token guarding the async track-preview flow: after every await we
  // re-check it so a superseded request can never resolve and play a stale track.
  const previewRequestRef = useRef(0);
  const [outOfTime, setOutOfTime] = useState(false);
  const [isStartingMission, setIsStartingMission] = useState(false);
  const touchesHeld = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const touchMapRef = useRef<Map<number, 'left' | 'right'>>(new Map());

  // Latest-callback ref so the stable keyboard listener never captures
  // stale mission parameters (selectedTrack / difficulty / options).
  const startMissionRef = useRef<() => void>(() => {});

  // 1. Fetch available tracks: /tracks/tracks.json + locally uploaded (IndexedDB)
  useEffect(() => {
    let isMounted = true;
    audio.preloadMenuMusic().catch(() => {});
    const fetchManifest = async () => {
      // Remote manifest (bundled catalog), with bundled fallback
      let remote: TrackMetadata[] = DEFAULT_TRACKS;
      try {
        const response = await fetch('/tracks/tracks.json');
        if (response.ok) {
          const data: TrackMetadata[] = await response.json();
          if (Array.isArray(data) && data.length > 0) remote = data;
        }
      } catch {
        // Safe fallback to bundled DEFAULT_TRACKS
      }
      // Player-uploaded tracks persist only in this browser (IndexedDB)
      let local: TrackMetadata[] = [];
      try {
        local = await LocalTrackLoader.listLocalTracks();
      } catch {
        // Storage unavailable (e.g. private browsing) — bundled catalog only
      }
      if (!isMounted) return;
      const merged = [...remote, ...local];
      if (merged.length > 0) {
        setTracks(merged);
        setSelectedTrack((prev) => {
          if (prev && prev.id !== DEFAULT_TRACKS[0].id) {
            return prev;
          }
          return merged[0];
        });
      }
    };
    fetchManifest();
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Player uploads: decode + persist locally (IndexedDB), then merge into
   * the selectable catalog. Returns the per-file outcome for UI feedback.
   */
  const handleAddLocalTracks = useCallback(async (files: File[]): Promise<LocalUploadResult> => {
    const result = await LocalTrackLoader.addLocalFiles(files);
    if (result.added.length > 0) {
      setTracks((prev) => [...prev, ...result.added]);
    }
    return result;
  }, []);

  /** Removes a player-uploaded track from IndexedDB and the catalog. */
  const handleDeleteLocalTrack = async (id: string) => {
    await LocalTrackLoader.deleteLocalTrack(id);
    const remaining = tracks.filter((t) => t.id !== id);
    setTracks(remaining);
    setSelectedTrack((sel) => {
      if (sel && sel.id !== id) return sel;
      // Deleted track was selected: fall back to the first surviving entry
      return remaining[0] ?? null;
    });
  };

  // 2. Audio volume syncing
  useEffect(() => {
    audio.setVolumes(options.musicVolume, options.sfxVolume);
  }, [options.musicVolume, options.sfxVolume]);

  // Preload selected track in background so start mission is instant
  useEffect(() => {
    if (gameState === 'MENU' && selectedTrack) {
      audio.preloadTrack(selectedTrack).catch(() => {});
    }
  }, [gameState, selectedTrack]);

  // 3. Menu Music Management: plays procedural soundtrack on menu, pauses on preview, resumes after
  useEffect(() => {
    if (gameState !== 'MENU') return;

    audio.setOnTrackEnded(() => {
      setPreviewingTrackId(null);
      setLoadingTrackId(null);
      if (!audio.isMenuMusicMuted()) {
        audio.resumeMenuMusic();
      }
    });

    const tryStartMenuMusic = async () => {
      if (gameState === 'MENU' && !previewingTrackId && !audio.isTrackPlaying() && !audio.isMenuMusicMuted()) {
        await audio.playMenuMusic();
      }
    };

    const handleUserInteraction = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('button[title*="escuta"], button[title*="Pré-escutar"], button[title*="Parar"]')) {
        return;
      }
      tryStartMenuMusic();
    };

    window.addEventListener('pointerdown', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);

    tryStartMenuMusic();

    return () => {
      window.removeEventListener('pointerdown', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      // Clear the menu-music resume hook so a stale callback can never fire menu
      // music over gameplay/defeat screens once we leave the menu (C1).
      audio.setOnTrackEnded(null);
    };
  }, [gameState, previewingTrackId]);

  // 4. Responsive Track Preview in Menu (One-click instantaneous switch with Menu Music pause)
  const handlePreviewTrack = async (track: TrackMetadata) => {
    // Monotonic request token: only the LATEST preview request may touch audio
    // state after any await resolves (C2).
    const requestToken = ++previewRequestRef.current;

    // If already playing this track, toggle it off and resume menu music if not muted
    if (previewingTrackId === track.id) {
      audio.stopTrack();
      setPreviewingTrackId(null);
      setLoadingTrackId(null);
      if (!audio.isMenuMusicMuted()) {
        audio.resumeMenuMusic();
      }
      return;
    }

    // Switch instantly: pause menu music, stop old track, and load new one
    audio.pauseMenuMusic();
    audio.stopTrack();
    setPreviewingTrackId(null);
    setLoadingTrackId(track.id);

    try {
      await audio.init();
      if (requestToken !== previewRequestRef.current) return; // superseded while initializing
      const buffer = await audio.loadTrack(track);
      if (requestToken !== previewRequestRef.current) return; // superseded while loading
      audio.pauseMenuMusic(); // Double ensure menu music is silent
      audio.playTrack(buffer, 0);
      setPreviewingTrackId(track.id);
      setLoadingTrackId(null);
    } catch {
      if (requestToken !== previewRequestRef.current) return; // superseded request failed: ignore
      audio.stopTrack();
      setPreviewingTrackId(null);
      setLoadingTrackId(null);
      if (!audio.isMenuMusicMuted()) {
        audio.resumeMenuMusic();
      }
    }
  };


  // 5. Start Mission
  const handleStartMission = async () => {
    if (!selectedTrack || isStartingMission) return;
    setIsStartingMission(true);
    try {
      audio.playButtonSfx();
      audio.silenceAllContinuous();
      audio.stopMenuMusic();
      audio.stopTrack();
      // Defensive: ensure a stale menu-music resume callback can never fire over
      // gameplay audio (C1 — the menu effect cleanup also clears it on commit).
      audio.setOnTrackEnded(null);
      // Invalidate any in-flight preview request so a stale load can't hijack state.
      previewRequestRef.current++;
      setPreviewingTrackId(null);
      setLoadingTrackId(null);

      await audio.init();
      // Preload the Game Over jingle in the background so it's ready instantly
      // when a defeat screen appears (no-throw: failure just disables it).
      audio.preloadGameOverJingle();
      const trackBuffer = await audio.loadTrack(selectedTrack);
      const trackDuration = trackBuffer.duration || selectedTrack.duration || 90;
      const trackBpm = selectedTrack.estimatedBpm || 135;

      // Create Physics World with music-seeded terrain derived from track ID and BPM
      const newWorld = new PhysicsWorld(
        difficulty,
        options.flightAssist,
        trackDuration,
        selectedTrack.id,
        trackBpm,
        options.driftCompensation
      );
      newWorld.stats.currentBpm = trackBpm;
      countTickLastSecRef.current = -1; // reset countdown tick state for the new mission
      timeUpRef.current = false;
      setOutOfTime(false);

      // Attach callbacks
      newWorld.onWallScrape = (scrapeX, scrapeY, shipVx, isCeiling, intensity) => {
        if (rendererRef.current) {
          rendererRef.current.emitWallScrape(scrapeX, scrapeY, shipVx, isCeiling, intensity);
        }
        audio.updateRadarClicks(intensity);
      };

      newWorld.onShipDestroyed = () => {
        // Silence continuous thrusters immediately and fade out track as punishment
        audio.silenceAllContinuous();
        audio.fadeOutAndStopTrack(0.85);
        audio.playExplosionSfx();
        if (rendererRef.current) {
          rendererRef.current.emitExplosion(newWorld.ship.x, newWorld.ship.y);
        }
        setTimeout(() => {
          audio.playGameOverJingle();
          setGameState('GAMEOVER');
        }, 700);
      };

      newWorld.onShipDamaged = (_remainingLives, _penaltySec) => {
        audio.playDamageSfx();
        if (rendererRef.current) {
          rendererRef.current.emitShieldAbsorb(newWorld.ship.x, newWorld.ship.y);
        }
      };

      newWorld.onShieldAbsorbed = () => {
        audio.playShieldHitSfx();
        if (rendererRef.current) {
          rendererRef.current.emitShieldAbsorb(newWorld.ship.x, newWorld.ship.y);
        }
      };

      newWorld.onPowerUpCollected = (type) => {
        audio.playPowerUpSfx(type);
        if (announcementTimerRef.current) {
          clearTimeout(announcementTimerRef.current);
        }
        const announcementData = POWER_UP_ANNOUNCEMENTS[type];
        if (announcementData) {
          setActiveAnnouncement({
            ...announcementData,
            type,
            id: Date.now()
          });
          announcementTimerRef.current = setTimeout(() => {
            setActiveAnnouncement(null);
          }, 3000);
        }
        if (rendererRef.current) {
          const colorMap: Record<PowerUpType, string> = {
            SHIELD: '#00f0ff',
            DAMPER: '#00ff88',
            LOW_G: '#ffd700',
            PULSE: '#06b6d4',
            ETHEREAL: '#a855f7',
            INVULNERABLE: '#ff0055',
            CHRONO_DILATION: '#14b8a6',
            SINGULARITY: '#c084fc'
          };
          rendererRef.current.emitPowerUpCollect(newWorld.ship.x, newWorld.ship.y, colorMap[type]);
        }
      };

      newWorld.onGoalReached = () => {
        audio.silenceAllContinuous();
        audio.setLoopTrack(true);
        audio.playVictorySfx();
        setTimeout(() => {
          setGameState('VICTORY');
        }, 1000);
      };

      worldRef.current = newWorld;

      // Start Track Audio
      audio.playTrack(trackBuffer, 0);

      setGameState('PLAYING');
      lastTimeRef.current = performance.now();
    } catch (err) {
      console.error('Failed to start mission:', err);
    } finally {
      setIsStartingMission(false);
    }
  };

  // Keep the latest handleStartMission reachable by the stable keyboard listener
  useEffect(() => {
    startMissionRef.current = handleStartMission;
  });

  // 6. Pause & Resume
  const handlePause = useCallback(() => {
    if (gameState === 'PLAYING') {
      audio.silenceAllContinuous();
      audio.pauseTrack();
      setGameState('PAUSED');
    }
  }, [gameState]);

  const handleResume = useCallback(() => {
    if (gameState === 'PAUSED') {
      audio.resumeTrack();
      setGameState('PLAYING');
      lastTimeRef.current = performance.now();
    }
  }, [gameState]);

  const handleRestart = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.reset();
    }
    audio.setLoopTrack(false);
    audio.silenceAllContinuous();
    startMissionRef.current();
  }, []);

  const handleExitToMenu = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.reset();
    }
    audio.setLoopTrack(false);
    audio.silenceAllContinuous();
    audio.stopTrack();
    setPreviewingTrackId(null);
    setLoadingTrackId(null);
    setGameState('MENU');
    audio.playMenuMusic();
  }, []);

  // 7. Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        keysHeld.current.left = true;
      }
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        keysHeld.current.right = true;
      }

      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (gameState === 'PLAYING') handlePause();
        else if (gameState === 'PAUSED') handleResume();
      }

      if ((e.key === ' ' || e.key === 'Enter') && gameState === 'MENU') {
        startMissionRef.current();
      }

      if ((e.key === 'r' || e.key === 'R') && (gameState === 'GAMEOVER' || gameState === 'VICTORY')) {
        handleRestart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        keysHeld.current.left = false;
      }
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        keysHeld.current.right = false;
      }
    };

    const handleBlur = () => {
      keysHeld.current.left = false;
      keysHeld.current.right = false;
      touchesHeld.current.left = false;
      touchesHeld.current.right = false;
      touchMapRef.current.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [gameState, handlePause, handleResume, handleRestart]);

  // Reset held input whenever the game state transitions. Prevents a thruster
  // from "sticking" on when a key was pressed while the menu / pause / game-over
  // screens were up and its keyup was missed during the transition.
  useEffect(() => {
    keysHeld.current.left = false;
    keysHeld.current.right = false;
    touchesHeld.current.left = false;
    touchesHeld.current.right = false;
    touchMapRef.current.clear();
  }, [gameState]);

  // 8. Clean Dual-Zone Touch Event Listeners (No visible buttons)
  const updateTouchZones = (e: React.TouchEvent) => {
    if (gameState !== 'PLAYING') return;

    const screenWidth = window.innerWidth;
    let leftActive = false;
    let rightActive = false;

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch.clientX < screenWidth / 2) {
        leftActive = true;
      } else {
        rightActive = true;
      }
    }

    touchesHeld.current.left = leftActive;
    touchesHeld.current.right = rightActive;
  };

  const handleTouchStart = (e: React.TouchEvent) => updateTouchZones(e);
  const handleTouchMove = (e: React.TouchEvent) => updateTouchZones(e);
  const handleTouchEnd = (e: React.TouchEvent) => updateTouchZones(e);
  const handleTouchCancel = (e: React.TouchEvent) => updateTouchZones(e);

  // 9. Canvas Resize & Initialization
  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new GameRenderer(canvasRef.current);
    rendererRef.current = renderer;

    const handleResize = () => {
      renderer.resize();
    };

    const handleOrientationChange = () => {
      renderer.resize();
      // Mobile Safari / Chrome sometimes update innerWidth/innerHeight after a slight delay
      setTimeout(() => renderer.resize(), 100);
      setTimeout(() => renderer.resize(), 300);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // 10. Main 60FPS Game Loop
  useEffect(() => {
    let active = true;

    const loop = (timestamp: number) => {
      if (!active) return;

      const rawDt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      const dt = Math.min(rawDt, 0.045); // Clamp dt against browser hiccups

      const world = worldRef.current;
      const renderer = rendererRef.current;

      if (world && renderer) {
        // Combine keyboard and touch zones
        const leftPressed = keysHeld.current.left || touchesHeld.current.left;
        const rightPressed = keysHeld.current.right || touchesHeld.current.right;

        // Extract real-time multi-band FFT with envelope followers
        const audioFreq = audio.getFrequencyData(0.24, dt);

        // Step physics only when PLAYING
        if (gameState === 'PLAYING') {
          // Update continuous procedural sound for dual thrusters. Gated to
          // PLAYING so pause / game-over / victory stay silent even if the ship
          // retains a non-zero thruster power value.
          audio.updateThrusterAudio(world.ship.leftThrusterPower, world.ship.rightThrusterPower);

          const trackCurrentTime = audio.getCurrentTime();
          world.update(dt, leftPressed, rightPressed, audioFreq, trackCurrentTime);

          // Countdown tick: alternating tic-toc in the final 25 seconds (rising tension)
          const remainingWholeSec = Math.ceil(world.stats.totalDuration - world.stats.timeElapsed);
          if (remainingWholeSec <= 25 && remainingWholeSec > 0 && remainingWholeSec !== countTickLastSecRef.current) {
            countTickLastSecRef.current = remainingWholeSec;
            audio.playCountdownTick();
          }

          // Time's up: the song ended before the ship reached the goal portal → defeat
          if (remainingWholeSec <= 0 && !timeUpRef.current) {
            timeUpRef.current = true;
            audio.silenceAllContinuous();
            audio.playTimeUpSfx();
            setOutOfTime(true);
            setTimeout(() => {
              audio.playGameOverJingle();
              setGameState('GAMEOVER');
            }, 900);
          }

          // Throttled HUD update (~12Hz) to prevent React state from slowing down 60fps canvas
          hudThrottleTimerRef.current += dt;
          if (hudThrottleTimerRef.current > 0.08) {
            hudThrottleTimerRef.current = 0;
            setHudStats({ ...world.stats });
            setShipHudInfo({
              shields: world.ship.shields,
              lives: world.ship.lives,
              maxLives: world.ship.maxLives,
              damperActiveTimer: world.ship.damperActiveTimer,
              lowGActiveTimer: world.ship.lowGActiveTimer,
              invulnerableTime: world.ship.invulnerableTime,
              etherealActiveTimer: world.ship.etherealActiveTimer,
              chronoDilationTimer: world.ship.chronoDilationTimer,
              singularityNotifyTimer: world.ship.singularityNotifyTimer,
              leftThrusterPower: world.ship.leftThrusterPower,
              rightThrusterPower: world.ship.rightThrusterPower,
              sonicPulseNotifyTimer: world.ship.sonicPulseNotifyTimer,
              timePenaltyNotifyTimer: world.ship.timePenaltyNotifyTimer,
              vx: world.ship.vx,
              vy: world.ship.vy
            });
          }
        }

        // Render Frame
        renderer.render(world, audioFreq, dt, gameState === 'PAUSED');
      }

      animationFrameIdRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animationFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [gameState]);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-black select-none touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {/* 60FPS Fullscreen Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-crosshair"
      />

      {/* HUD during Gameplay */}
      {gameState === 'PLAYING' && worldRef.current && (
        <GameHUD
          stats={hudStats}
          ship={{
            ...worldRef.current.ship,
            ...shipHudInfo
          }}
          difficulty={difficulty}
          trackTitle={selectedTrack?.title || 'Sonic Orbit'}
          onPause={handlePause}
          launchGraceTimer={worldRef.current.launchGraceTimer}
          announcement={activeAnnouncement}
        />
      )}

      {/* Title & Setup Menu */}
      {gameState === 'MENU' && (
        <TitleMenu
          tracks={tracks}
          selectedTrack={selectedTrack}
          onSelectTrack={(t) => setSelectedTrack(t)}
          difficulty={difficulty}
          onSelectDifficulty={(d) => setDifficulty(d)}
          options={options}
          onOptionsChange={(o) => {
            setOptions(o);
            if (worldRef.current) {
              worldRef.current.setFlightAssist(o.flightAssist);
              worldRef.current.setDriftCompensation(o.driftCompensation);
            }
          }}
          onStartMission={handleStartMission}
          onPreviewTrack={handlePreviewTrack}
          previewingTrackId={previewingTrackId}
          loadingTrackId={loadingTrackId}
          isStartingMission={isStartingMission}
          onAddLocalTracks={handleAddLocalTracks}
          onDeleteLocalTrack={handleDeleteLocalTrack}
        />
      )}

      {/* Pause Modal */}
      {gameState === 'PAUSED' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onExitToMenu={handleExitToMenu}
          options={options}
          onOptionsChange={(o) => {
            setOptions(o);
            if (worldRef.current) {
              worldRef.current.setFlightAssist(o.flightAssist);
              worldRef.current.setDriftCompensation(o.driftCompensation);
            }
          }}
          allowFlightAssist={difficulty !== 'EXTREME'}
        />
      )}

      {/* End Game Modal (Victory / Game Over) */}
      {(gameState === 'VICTORY' || gameState === 'GAMEOVER') && (
        <EndGameModal
          isVictory={gameState === 'VICTORY'}
          outOfTime={outOfTime}
          stats={hudStats}
          difficulty={difficulty}
          trackTitle={selectedTrack?.title || 'Faixa Musical'}
          onRestart={handleRestart}
          onExitToMenu={handleExitToMenu}
        />
      )}
    </div>
  );
}
