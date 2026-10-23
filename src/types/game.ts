/**
 * Sonic Thrust - Game Types & Interface Definitions
 */

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAMEOVER';

export type DifficultyLevel = 'PRINCIPIANTE' | 'PRO' | 'EXTREME';

export interface DifficultyConfig {
  name: DifficultyLevel;
  label: string;
  tunnelWidth: number;          // Base tunnel vertical space
  deformMax: number;            // 0.28, 0.48, 0.70
  gravityMultiplier: number;    // 0.70, 1.00, 1.30
  initialShields: number;       // 1, 0, 0
  allowFlightAssist: boolean;   // true, true, false
  defaultFlightAssist: boolean; // true, false, false
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
}

export type PowerUpType = 'SHIELD' | 'DAMPER' | 'LOW_G' | 'INVULNERABLE' | 'ETHEREAL';

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
  | 'EJECTOR_BLOCK'    // Blocks emerging from the walls on music beats
  | 'SONIC_SPIKE'      // Searing stalactite / stalagmite spikes from ceiling/floor
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
  flightAssist: boolean;
  driftCompensation: boolean; // neutralizes the ship's slight rightward drift when ON
  musicVolume: number; // 0.0 - 1.0
  sfxVolume: number;   // 0.0 - 1.0
}

export interface GameStats {
  distanceTravelled: number;
  totalDistance: number;
  percentCompleted: number;
  timeElapsed: number;
  totalDuration: number;
  maxSpeed: number;
  shieldsUsed: number;
  powerUpsCollected: number;
  currentBpm: number;
  destructionReason?: 'CEILING' | 'FLOOR' | 'OBSTACLE' | 'LASER';
}
