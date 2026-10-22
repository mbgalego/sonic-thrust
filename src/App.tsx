/**
 * Sonic Thrust - 2D Neon Audio Physics Navigator
 * Main Application & Game Loop Orchestrator
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { audio } from './audio/AudioEngine';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { GameRenderer } from './graphics/GameRenderer';
import {
  GameState,
  DifficultyLevel,
  TrackMetadata,
  GameOptions,
  GameStats
} from './types/game';
import { TitleMenu } from './components/TitleMenu';
import { GameHUD } from './components/GameHUD';
import { PauseModal } from './components/PauseModal';
import { EndGameModal } from './components/EndGameModal';

const DEFAULT_TRACKS: TrackMetadata[] = [
  {
    "id": "kosmonova-ayla",
    "title": "Ayla",
    "artist": "Kosmonova",
    "filename": "Kosmonova_-_Ayla.mp3",
    "estimatedBpm": 136,
    "duration": 206,
    "description": "Hino lendário do Trance com arpeggio cósmico icónico, sub-graves penetrantes e ritmo hipnótico a 136 BPM.",
    "isProcedural": false
  },
  {
    "id": "kosmonova-take-me-away",
    "title": "Take Me Away (Club Mix)",
    "artist": "Kosmonova",
    "filename": "Kosmonova_-_Take_Me_Away__Club_Mix__1997.mp3",
    "estimatedBpm": 135,
    "duration": 389,
    "description": "Clássico Euro-Trance épico de 1997 com sintetizadores rápidos, linhas de baixo pulsantes e adrenalina a 135 BPM.",
    "isProcedural": false
  },
  {
    "id": "cant-feel-my-face",
    "title": "Can't Feel My Face",
    "artist": "Walk off the Earth (feat. Scott Helman)",
    "filename": "Can t Feel My Face - Walk off the Earth (feat. Scott Helman).mp3",
    "estimatedBpm": 108,
    "duration": 220,
    "description": "Cover acústico enérgico com ritmo pop vibrante e excelente dinâmica.",
    "isProcedural": false
  },
  {
    "id": "i-knew-you-were-trouble",
    "title": "I Knew You Were Trouble",
    "artist": "Walk off the Earth Feat. KRNFX",
    "filename": "I Knew You Were Trouble - WALK OFF THE EARTH Feat. KRNFX.mp3",
    "estimatedBpm": 120,
    "duration": 219,
    "description": "Beatbox poderoso e harmonias vocais com picos rítmicos marcados.",
    "isProcedural": false
  },
  {
    "id": "clean-bandit-symphony",
    "title": "Symphony",
    "artist": "Clean Bandit (feat. Zara Larsson)",
    "filename": "Clean Bandit - Symphony (feat. Zara Larsson).mp3",
    "estimatedBpm": 123,
    "duration": 246,
    "description": "Pop orquestral e eletrónico dinâmico com progressões melódicas contínuas.",
    "isProcedural": false
  },
  {
    "id": "carl-poppa",
    "title": "Carl Poppa (La Jiggy Jar Jar Doo)",
    "artist": "Bad Lip Reading",
    "filename": "CARL POPPA — Lyric Video [Q9aM9Ch97U8].mp3",
    "estimatedBpm": 135,
    "duration": 327,
    "description": "Batida hip-hop rítmica com graves sólidos e andamento cativante.",
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

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [tracks, setTracks] = useState<TrackMetadata[]>(DEFAULT_TRACKS);
  const [selectedTrack, setSelectedTrack] = useState<TrackMetadata | null>(DEFAULT_TRACKS[0]);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('PRINCIPIANTE');
  const [options, setOptions] = useState<GameOptions>({
    flightAssist: true,
    musicVolume: 0.85,
    sfxVolume: 0.8
  });
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  // HUD State (synced at throttled frequency to keep 60fps canvas buttery smooth)
  const [hudStats, setHudStats] = useState<GameStats>({
    distanceTravelled: 0,
    totalDistance: 18000,
    percentCompleted: 0,
    timeElapsed: 0,
    totalDuration: 96,
    maxSpeed: 0,
    shieldsUsed: 0,
    powerUpsCollected: 0,
    currentBpm: 132
  });

  const [shipHudInfo, setShipHudInfo] = useState({
    shields: 1,
    damperActiveTimer: 0,
    lowGActiveTimer: 0,
    leftThrusterPower: 0,
    rightThrusterPower: 0,
    vx: 0,
    vy: 0
  });

  const [altitudeRatio, setAltitudeRatio] = useState<number>(0.5);

  // Canvas & Engine References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const worldRef = useRef<PhysicsWorld | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const hudThrottleTimerRef = useRef<number>(0);

  // Input states
  const keysHeld = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const touchesHeld = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const touchMapRef = useRef<Map<number, 'left' | 'right'>>(new Map());

  // Latest-callback ref so the stable keyboard listener never captures
  // stale mission parameters (selectedTrack / difficulty / options).
  const startMissionRef = useRef<() => void>(() => {});

  // 1. Fetch available tracks from /tracks/tracks.json on mount
  useEffect(() => {
    let isMounted = true;
    const fetchManifest = async () => {
      try {
        const response = await fetch('/tracks/tracks.json');
        if (response.ok) {
          const data: TrackMetadata[] = await response.json();
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setTracks(data);
            setSelectedTrack((prev) => {
              if (prev && prev.id !== DEFAULT_TRACKS[0].id) {
                return prev;
              }
              return data[0] || prev;
            });
          }
        }
      } catch {
        // Safe fallback to bundled DEFAULT_TRACKS
      }
    };
    fetchManifest();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Audio volume syncing
  useEffect(() => {
    audio.setVolumes(options.musicVolume, options.sfxVolume);
  }, [options.musicVolume, options.sfxVolume]);

  // 4. Responsive Track Preview in Menu (One-click instantaneous switch)
  const handlePreviewTrack = async (track: TrackMetadata) => {
    await audio.init();

    // If already playing this track, toggle it off
    if (previewingTrackId === track.id) {
      audio.stopTrack();
      setPreviewingTrackId(null);
      setLoadingTrackId(null);
      return;
    }

    // Switch instantly: stop old track and load new one
    audio.stopTrack();
    setPreviewingTrackId(null);
    setLoadingTrackId(track.id);

    try {
      const buffer = await audio.loadTrack(track);
      audio.playTrack(buffer, 0);
      setPreviewingTrackId(track.id);
      setLoadingTrackId(null);
    } catch {
      audio.stopTrack();
      setPreviewingTrackId(null);
      setLoadingTrackId(null);
    }
  };

  // 5. Start Mission
  const handleStartMission = async () => {
    if (!selectedTrack) return;
    audio.playButtonSfx();
    audio.silenceAllContinuous();
    audio.stopTrack();
    setPreviewingTrackId(null);
    setLoadingTrackId(null);

    await audio.init();
    const trackBuffer = await audio.loadTrack(selectedTrack);
    const trackDuration = trackBuffer.duration || selectedTrack.duration || 90;
    const trackBpm = selectedTrack.estimatedBpm || 135;

    // Create Physics World with music-seeded terrain derived from track ID and BPM
    const newWorld = new PhysicsWorld(difficulty, options.flightAssist, trackDuration, selectedTrack.id, trackBpm);
    newWorld.stats.currentBpm = trackBpm;

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
        setGameState('GAMEOVER');
      }, 700);
    };

    newWorld.onShieldAbsorbed = () => {
      audio.playShieldHitSfx();
      if (rendererRef.current) {
        rendererRef.current.emitShieldAbsorb(newWorld.ship.x, newWorld.ship.y);
      }
    };

    newWorld.onPowerUpCollected = (type) => {
      audio.playPowerUpSfx(type);
      if (rendererRef.current) {
        const color = type === 'SHIELD' ? '#38bdf8' : type === 'DAMPER' ? '#4ade80' : type === 'LOW_G' ? '#facc15' : type === 'INVULNERABLE' ? '#ff0055' : '#a855f7';
        rendererRef.current.emitPowerUpCollect(newWorld.ship.x, newWorld.ship.y, color);
      }
    };

    newWorld.onGoalReached = () => {
      audio.silenceAllContinuous();
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
    audio.silenceAllContinuous();
    startMissionRef.current();
  }, []);

  const handleExitToMenu = useCallback(() => {
    audio.silenceAllContinuous();
    audio.stopTrack();
    setPreviewingTrackId(null);
    setLoadingTrackId(null);
    setGameState('MENU');
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

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
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

        // Extract real-time FFT
        const audioFreq = audio.getFrequencyData(0.24);

        // Step physics only when PLAYING
        if (gameState === 'PLAYING') {
          // Update continuous procedural sound for dual thrusters. Gated to
          // PLAYING so pause / game-over / victory stay silent even if the ship
          // retains a non-zero thruster power value.
          audio.updateThrusterAudio(world.ship.leftThrusterPower, world.ship.rightThrusterPower);

          const trackCurrentTime = audio.getCurrentTime();
          world.update(dt, leftPressed, rightPressed, audioFreq, trackCurrentTime);

          // Throttled HUD update (~12Hz) to prevent React state from slowing down 60fps canvas
          hudThrottleTimerRef.current += dt;
          if (hudThrottleTimerRef.current > 0.08) {
            hudThrottleTimerRef.current = 0;
            setHudStats({ ...world.stats });
            setShipHudInfo({
              shields: world.ship.shields,
              damperActiveTimer: world.ship.damperActiveTimer,
              lowGActiveTimer: world.ship.lowGActiveTimer,
              leftThrusterPower: world.ship.leftThrusterPower,
              rightThrusterPower: world.ship.rightThrusterPower,
              vx: world.ship.vx,
              vy: world.ship.vy
            });

            const terrain = world.getTerrainAt(world.ship.x);
            const totalH = terrain.floorY - terrain.ceilY;
            const relY = (world.ship.y - terrain.ceilY) / (totalH || 1);
            setAltitudeRatio(Math.max(0, Math.min(1, relY)));
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
          altitudeRatio={altitudeRatio}
          launchGraceTimer={worldRef.current.launchGraceTimer}
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
            }
          }}
          onStartMission={handleStartMission}
          onPreviewTrack={handlePreviewTrack}
          previewingTrackId={previewingTrackId}
          loadingTrackId={loadingTrackId}
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
            }
          }}
          allowFlightAssist={difficulty !== 'EXTREME'}
        />
      )}

      {/* End Game Modal (Victory / Game Over) */}
      {(gameState === 'VICTORY' || gameState === 'GAMEOVER') && (
        <EndGameModal
          isVictory={gameState === 'VICTORY'}
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
