/**
 * Sonic Thrust - Game Types & Interface Definitions
 */

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAMEOVER';

export type DifficultyLevel = 'NORMAL' | 'PRO' | 'EXTREME';

export interface DifficultyConfig {
  name: DifficultyLevel;
  label: string;
  tunnelWidth: number;          // Base tunnel vertical space
  deformMax: number;            // 0.28, 0.48, 0.70
  gravityMultiplier: number;    // 0.70, 1.00, 1.30
  initialShields: number;       // 1, 0, 0
  initialLives: number;         // 3, 3, 2
  laserDensity: number;         // laser beam spawn multiplier (0.55 principiante, 1.0 pro, 1.2 extreme)
  laserGateThreshold: number;   // treble energy needed to fire the beam
  description: string;
}

export interface TrackMetadata {
  id: string;
  title: string;
  artist: string;
  filename: string;
  estimatedBpm?: number;
  duration?: number;
  description?: string;
  isProcedural?: boolean;
  audioBuffer?: AudioBuffer;
  isLocal?: boolean;
  // Unlock system fields
  unlockCondition?: {
    mode: 'PRO' | 'EXTREME';
    description: string;
  };
  secret?: boolean; // Hidden from list until unlocked
}

export type PowerUpType = 
  | 'SHIELD' 
  | 'DAMPER' 
  | 'LOW_G' 
  | 'PULSE' 
  | 'ETHEREAL' 
  | 'INVULNERABLE' 
  | 'CHRONO_DILATION' 
  | 'SINGULARITY';

export interface PowerUpAnnouncement {
  title: string;
  subtitle: string;
  type: PowerUpType;
  color: string;
  borderColor: string;
  glowColor: string;
  id: number;
}

export interface PowerUpItem {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
  baseY: number;
  radius: number;
  collected: boolean;
  color: string;
  pulsePhase: number;
  orbitAngle: number;
  rhythmBounce: number;
}

export type ObstacleType = 
  | 'VU_TOWER'        // Retro-LED Equalizer VU Pillar rising from floor or ceiling on bass kicks
  | 'RESONANCE_MINE'   // Floating pulsing geometric mines
  | 'ROTATING_BLADE'   // Rotating neon hazard cross
  | 'LASER_CURTAIN';   // Oscillating electric plasma gate

export interface ObstaclePlatform {
  id: string;
  type: ObstacleType;
  x: number;
  y: number;
  baseY: number;
  width: number;
  height: number;
  angle: number;
  baseAngle: number;
  rotSpeed: number;
  band: 'bass' | 'mids' | 'treble';
  color: string;
  energyThreshold: number;
  active: boolean;
  isCeiling?: boolean;
  extension: number;          // 0.0 (inside wall) to 1.0 (fully extended into channel)
  maxExtensionHeight: number; // px extended into tunnel
  warningPhase: number;       // telegraph indicator 0.0 to 1.0
  beatTriggerTimer: number;   // rhythm timer
  disabled?: boolean;         // permanently neutralized (e.g. disarmed by a Sonic Pulse)
  // VU tower per-tower audio analysis config & adaptive normalization state
  binStart?: number;          // raw FFT bin range start (adaptive on this tower)
  binEnd?: number;            // raw FFT bin range end (exclusive)
  vuAvg?: number;             // rolling moving-average baseline for this tower
  vuPeak?: number;            // rolling peak for this tower
}

export interface LaserGate {
  id: string;
  x: number;
  yTop: number;
  yBottom: number;
  active: boolean;
  pulsePhase: number;
  alpha: number;
  sweepOffset: number;
  beamCenter: number;  // current Y center of the traveling oval energy beam
  beamHalf: number;    // current half-height (px) of the semi-oval beam (pulses with music)
  rearmTimer: number;  // >0 = beam discharged by a sonic pulse, recharging
}

export interface AudioFrequencyData {
  bass: number;     // 20Hz - 250Hz (0.0 to 1.0 normalized & lerped)
  mids: number;     // 250Hz - 4kHz
  treble: number;   // 4kHz - 20kHz
  energy: number;   // Overall energy (0.0 to 1.0)
  isBeat: boolean;  // Peak beat impulse
  frequencyArray: Uint8Array;

  // Enriched multi-band envelope follower metrics (for clean musical rhythm & ripples)
  subBass: number;  // 20Hz - 85Hz: Deep sub-bass foundation & shockwave thrust
  lowMids: number;  // 250Hz - 900Hz: Bass warmth & harmonic wave spacing
  highMids: number; // 900Hz - 4500Hz: Snare/vocal/synth transients & luminous edge flash
  beatPulse: number; // Smooth decaying impulse (1.0 on beat, 180ms exponential decay)

  // Macro energy dynamics (tracking musical sections: breakdowns vs builds vs drops)
  macroEnergy: number;   // 0.0 (quiet ambient intro/breakdown) to 1.0 (peak drop / full climax)
  energyContrast: number; // Instantaneous burst above macro baseline (produced, not yet consumed)
}

export interface GameOptions {
  driftCompensation: boolean; // neutralizes the ship's slight rightward drift when ON
  musicVolume: number; // 0.0 - 1.0
  sfxVolume: number;   // 0.0 - 1.0
  performanceMode?: boolean; // locks DPR to 1.0 & optimizes VFX for ultra-high FPS on 1440p/4K
}

export interface GameStats {
  distanceTravelled: number;
  totalDistance: number;
  percentCompleted: number;
  timeElapsed: number;
  totalDuration: number;
  timePenalty: number;
  maxSpeed: number;
  shieldsUsed: number;
  powerUpsCollected: number;
  currentBpm: number;
  destructionReason?: 'CEILING' | 'FLOOR' | 'OBSTACLE' | 'LASER' | 'TIME_UP';
}
