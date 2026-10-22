/**
 * Sonic Thrust - Physics & World Simulation Engine
 * Integrates Matter.js concepts with precision 2D dual-thruster aerodynamics,
 * dynamic audio-reactive neon terrain deformation, and Zero Contact collision logic.
 */

import Matter from 'matter-js';
import {
  DifficultyConfig,
  DifficultyLevel,
  PowerUpItem,
  PowerUpType,
  ObstaclePlatform,
  LaserGate,
  AudioFrequencyData,
  GameStats
} from '../types/game';

export const DIFFICULTY_PRESETS: Record<DifficultyLevel, DifficultyConfig> = {
  PRINCIPIANTE: {
    name: 'PRINCIPIANTE',
    label: 'Principiante',
    tunnelWidth: 420,
    deformMax: 0.28,
    gravityMultiplier: 0.70,
    initialShields: 1,
    allowFlightAssist: true,
    defaultFlightAssist: true,
    description: 'Canal muito largo, deformação suave (28%), gravidade reduzida (70%) e 1 escudo inicial.'
  },
  PRO: {
    name: 'PRO',
    label: 'Pro',
    tunnelWidth: 330,
    deformMax: 0.48,
    gravityMultiplier: 1.00,
    initialShields: 0,
    allowFlightAssist: true,
    defaultFlightAssist: false,
    description: 'Canal dinâmico equilibrado, deformação ajustada (48%), gravidade padrão e sem escudos.'
  },
  EXTREME: {
    name: 'EXTREME',
    label: 'Extreme',
    tunnelWidth: 250,
    deformMax: 0.70,
    gravityMultiplier: 1.30,
    initialShields: 0,
    allowFlightAssist: false,
    defaultFlightAssist: false,
    description: 'Canal estreito, deformação forte (70%), gravidade 130% e Flight Assist desligado.'
  }
};

function computeTrackSeed(trackId: string, bpm: number, duration: number): number {
  let hash = 0;
  const str = `${trackId}::${bpm}::${Math.round(duration)}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) + 1;
}

export interface ShipState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
  width: number;
  height: number;
  mass: number;
  leftThrusterPower: number;
  rightThrusterPower: number;
  shields: number;
  invulnerableTime: number;
  isDestroyed: boolean;
  reachedGoal: boolean;
  damperActiveTimer: number; // 6s duration
  lowGActiveTimer: number;    // 5s duration
}

export interface TerrainVertex {
  x: number;
  baseCeilY: number;
  baseFloorY: number;
  currentCeilY: number;
  currentFloorY: number;
}

export class PhysicsWorld {
  public ship: ShipState;
  public difficulty: DifficultyConfig;
  public flightAssistEnabled: boolean;
  
  // World geometry
  public trackDuration: number = 90;
  public totalTrackLength: number = 18000; // in world pixels
  public baseForwardVelocity: number = 220; // px/sec
  public launchpadEnd: number = 800;
  public finishPortalX: number = 18000;
  public worldHeight: number = 900;
  
  // Anti-gravity launch grace period (2.8 seconds safe hover window on start)
  public launchGraceTimer: number = 2.8;

  // Dynamic terrain
  public terrainPoints: TerrainVertex[] = [];
  public segmentSpacing: number = 70;
  
  // Track & Music Seed
  public trackId: string;
  public trackBpm: number;
  public trackSeed: number;

  // Dynamic obstacles & items
  public powerUps: PowerUpItem[] = [];
  public obstacles: ObstaclePlatform[] = [];
  public laserGates: LaserGate[] = [];

  // Matter.js engine instance for rigid physics backing
  private engine: Matter.Engine;
  private shipBody: Matter.Body;

  // Stats tracking
  public stats: GameStats;

  // Callbacks
  public onShipDestroyed?: (reason: 'CEILING' | 'FLOOR' | 'OBSTACLE' | 'LASER') => void;
  public onPowerUpCollected?: (type: PowerUpType) => void;
  public onShieldAbsorbed?: () => void;
  public onGoalReached?: () => void;
  public onWallScrape?: (scrapeX: number, scrapeY: number, shipVx: number, isCeiling: boolean, intensity: number) => void;

  constructor(
    difficultyLevel: DifficultyLevel,
    flightAssist: boolean,
    trackDuration: number = 90,
    trackId: string = 'kosmonova-take-me-away',
    trackBpm: number = 135
  ) {
    this.difficulty = DIFFICULTY_PRESETS[difficultyLevel];
    this.flightAssistEnabled = this.difficulty.allowFlightAssist && flightAssist;
    this.trackDuration = Math.max(30, trackDuration);
    this.trackId = trackId;
    this.trackBpm = trackBpm;
    this.trackSeed = computeTrackSeed(trackId, trackBpm, this.trackDuration);
    this.launchGraceTimer = 2.8; // 2.8s anti-gravity stabilizer on mission start
    
    // Scale track length so average velocity gets ship to portal exactly when song finishes
    this.baseForwardVelocity = 230;
    this.totalTrackLength = this.baseForwardVelocity * this.trackDuration;
    this.finishPortalX = this.totalTrackLength;
    this.worldHeight = 1100; // Vertical headroom for dynamic roller-coaster curves

    // Matter.js setup
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 0.95 * this.difficulty.gravityMultiplier, scale: 0.001 }
    });

    const startX = 220;
    const startY = this.worldHeight / 2;

    this.shipBody = Matter.Bodies.polygon(startX, startY, 3, 20, {
      density: 0.002,
      frictionAir: 0.022,
      restitution: 0.1,
      angle: 0
    });
    Matter.World.add(this.engine.world, this.shipBody);

    this.ship = {
      x: startX,
      y: startY,
      vx: this.baseForwardVelocity * 0.7,
      vy: 0,
      angle: 0,
      angularVelocity: 0,
      width: 38,
      height: 26,
      mass: 1.0,
      leftThrusterPower: 0,
      rightThrusterPower: 0,
      shields: this.difficulty.initialShields,
      invulnerableTime: 0,
      isDestroyed: false,
      reachedGoal: false,
      damperActiveTimer: 0,
      lowGActiveTimer: 0
    };

    this.stats = {
      distanceTravelled: 0,
      totalDistance: this.totalTrackLength,
      percentCompleted: 0,
      timeElapsed: 0,
      totalDuration: this.trackDuration,
      maxSpeed: 0,
      shieldsUsed: 0,
      powerUpsCollected: 0,
      currentBpm: this.trackBpm
    };

    this.generateTerrainSpine();
    this.spawnEntities();
  }

  /**
   * Generates a unique, music-seeded roller-coaster tunnel.
   * Every song produces a distinct topographical landscape derived from its BPM and seed,
   * while strictly guaranteeing fair minimum clearance to prevent impossible passages.
   *
   * SAFE SPAWN GUARANTEE:
   * The spawn runway (x: 0 to 800) is locked dead-center at worldHeight / 2 with
   * generous clearance (at least 260px half-width) so the ship CAN NEVER spawn in walls.
   * A smooth cubic Hermite blend transitions seamlessly from x: 800 to 1400 into the track curves.
   */
  private generateTerrainSpine(): void {
    this.terrainPoints = [];
    const totalPoints = Math.ceil(this.totalTrackLength / this.segmentSpacing) + 25;
    const centerY = this.worldHeight / 2;
    const baseHalfWidth = this.difficulty.tunnelWidth / 2;

    // Seed-derived pseudo-random phases & harmonics
    const seed = this.trackSeed;
    const phaseHill = ((seed % 997) / 997) * Math.PI * 2;
    const phaseChicane = (((seed * 13) % 991) / 991) * Math.PI * 2;
    const phaseWobble = (((seed * 37) % 983) / 983) * Math.PI * 2;
    const phaseBreathe = (((seed * 53) % 977) / 977) * Math.PI * 2;

    // Tempo multiplier: faster BPM creates punchier chicanes; lower BPM creates sweeping glides
    const tempoMult = Math.max(0.8, Math.min(1.35, this.trackBpm / 128));
    const hillFreq = 0.00065 * tempoMult;
    const chicaneFreq = 0.0018 * tempoMult;
    const wobbleFreq = 0.0040 * tempoMult;

    // Amplitude modulation based on seed
    const hillAmp = 130 + ((seed % 60) - 30);
    const chicaneAmp = 75 + (((seed >> 4) % 30) - 15);

    for (let i = 0; i < totalPoints; i++) {
      const x = i * this.segmentSpacing;
      
      // Multi-Harmonic Roller-Coaster Curves unique to this track
      const sweepingHill = Math.sin(x * hillFreq + phaseHill) * hillAmp;
      const dynamicSChicanes = Math.sin(x * chicaneFreq + phaseChicane) * chicaneAmp;
      const sonicWobble = Math.cos(x * wobbleFreq + phaseWobble) * 32;
      const fullOffset = sweepingHill + dynamicSChicanes + sonicWobble;

      // Safe Launchpad Blending:
      // x < 750: Perfectly centered (blend = 0), perfectly flat runway
      // x between 750 and 1350: Smoothstep interpolation into roller-coaster terrain
      let blendFactor = 1.0;
      if (x < 750) {
        blendFactor = 0.0;
      } else if (x < 1350) {
        const t = (x - 750) / 600;
        blendFactor = t * t * (3 - 2 * t);
      }
      const macroCenter = centerY + fullOffset * blendFactor;

      // Dynamic channel breathing: cavernous chambers alternating with canyon straits
      const breathingWave = Math.sin(x * 0.0009 * tempoMult + phaseBreathe);
      
      // GUARANTEED FAIR PASSAGE:
      // Local half-width never dips below 82% of baseHalfWidth, guaranteeing ample room for 26px craft
      let localHalfWidth = baseHalfWidth * (0.92 + breathingWave * 0.16);
      const minFairHalf = Math.max(115, baseHalfWidth * 0.82);
      localHalfWidth = Math.max(minFairHalf, localHalfWidth);

      // Launchpad start area is spacious and flat for guaranteed safe liftoff
      if (x < 750) {
        localHalfWidth = Math.max(baseHalfWidth * 1.35, 260);
      } else if (x < 1350) {
        const t = (x - 750) / 600;
        const initialWide = Math.max(baseHalfWidth * 1.35, 260);
        localHalfWidth = initialWide * (1 - t) + localHalfWidth * t;
      }

      // Portal area widens for dramatic arrival
      if (x > this.finishPortalX - 600) {
        localHalfWidth = Math.max(localHalfWidth, baseHalfWidth * 1.25);
      }

      const baseCeilY = Math.max(70, macroCenter - localHalfWidth);
      const baseFloorY = Math.min(this.worldHeight - 70, macroCenter + localHalfWidth);

      this.terrainPoints.push({
        x,
        baseCeilY,
        baseFloorY,
        currentCeilY: baseCeilY,
        currentFloorY: baseFloorY
      });
    }
  }

  private spawnEntities(): void {
    this.powerUps = [];
    this.obstacles = [];
    this.laserGates = [];

    const startSafeX = this.launchpadEnd + 400;
    const endSafeX = this.finishPortalX - 500;
    const playableRange = endSafeX - startSafeX;

    // 1. Power-ups distribution (Shields, Dampers, Low-G) with distinct celestial palettes
    const powerUpTypes: PowerUpType[] = ['SHIELD', 'DAMPER', 'LOW_G'];
    const totalPowerUps = Math.max(8, Math.floor(this.trackDuration / 11));
    
    for (let i = 0; i < totalPowerUps; i++) {
      const progress = (i + 0.5) / totalPowerUps;
      const x = startSafeX + progress * playableRange + (Math.random() * 150 - 75);
      const type = powerUpTypes[i % powerUpTypes.length];
      const colors = {
        SHIELD: '#00f0ff', // Searing Electric Cyan
        DAMPER: '#00ff88', // Searing Mint/Cyber Emerald
        LOW_G: '#ffd700'   // Radiant Solar Gold
      };

      const terrain = this.getTerrainAt(x);
      const midY = (terrain.ceilY + terrain.floorY) / 2 + (Math.sin(i * 1.6) * 35);

      this.powerUps.push({
        id: `powerup-${i}`,
        type,
        x,
        y: midY,
        baseY: midY,
        radius: 16,
        collected: false,
        color: colors[type],
        pulsePhase: Math.random() * Math.PI * 2,
        orbitAngle: Math.random() * Math.PI * 2,
        rhythmBounce: 1.0
      });
    }

    // 2. Varied Musical Obstacles (Ejector Blocks, Sonic Spikes, Resonance Mines, Rotating Blades)
    // Distributed evenly with guaranteed clearance
    const totalObstacles = Math.max(12, Math.floor(this.trackDuration / 6.5));
    for (let i = 0; i < totalObstacles; i++) {
      const x = startSafeX + 300 + (i / totalObstacles) * playableRange;
      const terrain = this.getTerrainAt(x);
      const corridorHeight = terrain.floorY - terrain.ceilY;
      const patternChoice = (i + (this.trackSeed % 4)) % 4;

      if (patternChoice === 0) {
        // A) EJECTOR BLOCK (Bloco de impacto pneumático que emerge da parede no compasso musical)
        const isCeil = (i + (this.trackSeed % 2)) % 2 === 0;
        this.obstacles.push({
          id: `ejector-${i}`,
          type: 'EJECTOR_BLOCK',
          x,
          y: isCeil ? terrain.ceilY : terrain.floorY,
          baseY: isCeil ? terrain.ceilY : terrain.floorY,
          width: 76,
          height: 36,
          angle: 0,
          baseAngle: 0,
          rotSpeed: 0,
          band: 'mids',
          color: '#ff0055', // Neon Rose / Crimson
          energyThreshold: 0.28,
          active: false,
          isCeiling: isCeil,
          extension: 0.0,
          maxExtensionHeight: Math.min(88, corridorHeight * 0.32),
          warningPhase: 0.0,
          beatTriggerTimer: (i * 1.4) % 4.0
        });
      } else if (patternChoice === 1) {
        // B) SONIC SPIKE (Picos néon cristalinos que saltam do teto ou chão ao som dos graves)
        const isCeil = (i + (this.trackSeed % 2)) % 2 !== 0;
        this.obstacles.push({
          id: `spike-${i}`,
          type: 'SONIC_SPIKE',
          x,
          y: isCeil ? terrain.ceilY : terrain.floorY,
          baseY: isCeil ? terrain.ceilY : terrain.floorY,
          width: 52,
          height: 75,
          angle: 0,
          baseAngle: 0,
          rotSpeed: 0,
          band: 'bass',
          color: '#c026d3', // Searing Fuchsia / Electric Purple
          energyThreshold: 0.30,
          active: false,
          isCeiling: isCeil,
          extension: 0.15,
          maxExtensionHeight: Math.min(94, corridorHeight * 0.34),
          warningPhase: 0.0,
          beatTriggerTimer: (i * 1.8) % 3.0
        });
      } else if (patternChoice === 2) {
        // C) RESONANCE MINE (Mina flutuante com anéis orbitais e pulso sonoro)
        const midY = (terrain.ceilY + terrain.floorY) / 2 + (Math.sin(i * 2.2) * 35);
        this.obstacles.push({
          id: `mine-${i}`,
          type: 'RESONANCE_MINE',
          x,
          y: midY,
          baseY: midY,
          width: 44,
          height: 44,
          angle: 0,
          baseAngle: 0,
          rotSpeed: 2.2,
          band: 'bass',
          color: '#f97316', // Neon Electric Amber
          energyThreshold: 0.22,
          active: true,
          extension: 1.0,
          maxExtensionHeight: 44,
          warningPhase: 0.0,
          beatTriggerTimer: i * 0.7
        });
      } else {
        // D) ROTATING BLADE (Cruzeta de plasma giratória de alta voltagem)
        const attachTop = i % 2 === 0;
        const y = attachTop ? terrain.ceilY + 60 : terrain.floorY - 60;
        this.obstacles.push({
          id: `blade-${i}`,
          type: 'ROTATING_BLADE',
          x,
          y,
          baseY: y,
          width: 86,
          height: 18,
          angle: 0,
          baseAngle: (Math.random() - 0.5) * 0.4,
          rotSpeed: (i % 2 === 0 ? 1 : -1) * (1.8 + Math.random() * 1.5),
          band: 'mids',
          color: '#ef4444', // Neon Crimson
          energyThreshold: 0.25,
          active: true,
          extension: 1.0,
          maxExtensionHeight: 18,
          warningPhase: 0.0,
          beatTriggerTimer: i * 0.5
        });
      }
    }

    // 3. Laser curtains (reactive to Treble FFT with rhythmic sweep)
    const totalLasers = Math.max(8, Math.floor(this.trackDuration / 8));
    for (let i = 0; i < totalLasers; i++) {
      const x = startSafeX + 500 + (i / totalLasers) * playableRange;
      const terrain = this.getTerrainAt(x);

      this.laserGates.push({
        id: `laser-${i}`,
        x,
        yTop: terrain.ceilY + 10,
        yBottom: terrain.floorY - 10,
        active: false,
        pulsePhase: i * 0.9,
        alpha: 0,
        sweepOffset: 0
      });
    }
  }

  public getTerrainAt(worldX: number): { ceilY: number; floorY: number } {
    if (this.terrainPoints.length === 0) {
      return { ceilY: 150, floorY: this.worldHeight - 150 };
    }

    const indexFloat = worldX / this.segmentSpacing;
    const idx0 = Math.max(0, Math.min(this.terrainPoints.length - 1, Math.floor(indexFloat)));
    const idx1 = Math.min(this.terrainPoints.length - 1, idx0 + 1);
    const frac = indexFloat - idx0;

    const p0 = this.terrainPoints[idx0];
    const p1 = this.terrainPoints[idx1];

    const ceilY = p0.currentCeilY + (p1.currentCeilY - p0.currentCeilY) * frac;
    const floorY = p0.currentFloorY + (p1.currentFloorY - p0.currentFloorY) * frac;

    return { ceilY, floorY };
  }

  /**
   * Main Physics & Audio-Reaction Step (called at 60fps)
   */
  public update(
    dt: number,
    leftPressed: boolean,
    rightPressed: boolean,
    audioFreq: AudioFrequencyData,
    currentTime: number
  ): void {
    if (this.ship.isDestroyed || this.ship.reachedGoal) {
      return;
    }

    // Clamp dt to prevent frame leaps
    const safeDt = Math.min(dt, 0.045);

    // Update timers
    if (this.ship.invulnerableTime > 0) {
      this.ship.invulnerableTime -= safeDt;
    }
    if (this.ship.damperActiveTimer > 0) {
      this.ship.damperActiveTimer -= safeDt;
    }
    if (this.ship.lowGActiveTimer > 0) {
      this.ship.lowGActiveTimer -= safeDt;
    }

    // 1. Audio-Reactive Terrain Update (FFT)
    this.updateAudioTerrain(audioFreq);

    // 2. Flight Dynamics & Dual-Thruster Physics
    this.applyThrusterForces(leftPressed, rightPressed, safeDt);

    // 3. Update Obstacles & Laser Gates
    this.updateObstacles(audioFreq, safeDt);

    // 4. Update Power-up items & Collisions
    this.updatePowerUps(safeDt, audioFreq);

    // 5. Zero Contact Collision Detection
    this.checkCollisions();

    // 6. Check Goal / Finish Portal
    if (this.ship.x >= this.finishPortalX && !this.ship.reachedGoal) {
      this.ship.reachedGoal = true;
      if (this.onGoalReached) {
        this.onGoalReached();
      }
    }

    // 7. Update Stats
    this.stats.timeElapsed = currentTime;
    this.stats.distanceTravelled = Math.max(0, this.ship.x);
    this.stats.percentCompleted = Math.min(100, (this.ship.x / this.totalTrackLength) * 100);
    const speed = Math.sqrt(this.ship.vx * this.ship.vx + this.ship.vy * this.ship.vy);
    this.stats.maxSpeed = Math.max(this.stats.maxSpeed, Math.round(speed));
  }

  private updateAudioTerrain(audioFreq: AudioFrequencyData): void {
    // Sonic Damper calms down deformation if active
    const damperMult = this.ship.damperActiveTimer > 0 ? 0.22 : 1.0;
    const maxDeformPx = Math.min(36, (this.difficulty.tunnelWidth * 0.22) * this.difficulty.deformMax * damperMult);
    const bassVal = audioFreq.bass;

    // Deform each point in viewing radius
    for (let i = 0; i < this.terrainPoints.length; i++) {
      const pt = this.terrainPoints[i];
      // Skip launchpad start area to ensure safe liftoff
      if (pt.x < this.launchpadEnd) {
        pt.currentCeilY = pt.baseCeilY;
        pt.currentFloorY = pt.baseFloorY;
        continue;
      }

      // Traveling harmonic wave modulated by Bass
      const wavePhase = pt.x * 0.006 + (audioFreq.energy * 3.5);
      const deformSine = Math.sin(wavePhase);
      const deformCosine = Math.cos(wavePhase * 1.4);

      // Ceiling pushes down, floor pushes up (channel compression)
      const ceilOffset = (bassVal * 0.7 + deformSine * 0.3) * maxDeformPx;
      const floorOffset = (bassVal * 0.7 + deformCosine * 0.3) * maxDeformPx;

      // Smooth lerp
      pt.currentCeilY += (pt.baseCeilY + ceilOffset - pt.currentCeilY) * 0.18;
      pt.currentFloorY += (pt.baseFloorY - floorOffset - pt.currentFloorY) * 0.18;
    }
  }

  private applyThrusterForces(leftPressed: boolean, rightPressed: boolean, dt: number): void {
    // Ramp thruster power smoothly for sound & visuals
    const targetL = leftPressed ? 1.0 : 0.0;
    const targetR = rightPressed ? 1.0 : 0.0;
    this.ship.leftThrusterPower += (targetL - this.ship.leftThrusterPower) * 0.35;
    this.ship.rightThrusterPower += (targetR - this.ship.rightThrusterPower) * 0.35;

    // Gravity calculation: suspended during anti-gravity launch grace window (first 2.8s)
    if (this.launchGraceTimer > 0) {
      this.launchGraceTimer = Math.max(0, this.launchGraceTimer - dt);
      // Soft magnetic hover stabilization during launch grace
      if (!leftPressed && !rightPressed) {
        this.ship.vy *= 0.88;
        const targetHoverY = this.worldHeight / 2;
        this.ship.vy += (targetHoverY - this.ship.y) * 2.5 * dt;
      }
    } else {
      const baseG = 480 * this.difficulty.gravityMultiplier;
      const currentG = this.ship.lowGActiveTimer > 0 ? baseG * 0.5 : baseG;
      this.ship.vy += currentG * dt;
    }

    // Thruster thrust magnitude
    const mainThrust = 860; // Strong enough to easily overcome gravity and climb
    const torqueConstant = 7.8;

    // Left Thruster applies upward thrust + clockwise torque (nudges right)
    if (this.ship.leftThrusterPower > 0.02) {
      const p = this.ship.leftThrusterPower;
      const thrustX = Math.sin(this.ship.angle) * mainThrust * p * 0.85;
      const thrustY = -Math.cos(this.ship.angle) * mainThrust * p * 0.85;
      this.ship.vx += thrustX * dt;
      this.ship.vy += thrustY * dt;
      this.ship.angularVelocity += torqueConstant * p * dt;
    }

    // Right Thruster applies upward thrust + counter-clockwise torque (nudges left)
    if (this.ship.rightThrusterPower > 0.02) {
      const p = this.ship.rightThrusterPower;
      const thrustX = Math.sin(this.ship.angle) * mainThrust * p * 0.85;
      const thrustY = -Math.cos(this.ship.angle) * mainThrust * p * 0.85;
      this.ship.vx += thrustX * dt;
      this.ship.vy += thrustY * dt;
      this.ship.angularVelocity -= torqueConstant * p * dt;
    }

    // Both pressed simultaneously: balanced vertical power surge
    if (leftPressed && rightPressed) {
      const combinedUp = -Math.cos(this.ship.angle) * mainThrust * 0.35;
      this.ship.vy += combinedUp * dt;
    }

    // Flight Assist (Auto-Estabilização):
    // Smooth torque correction towards 0 radians when controls are released
    if (this.flightAssistEnabled && !leftPressed && !rightPressed) {
      const targetAngle = 0;
      const angleDiff = targetAngle - this.ship.angle;
      const springTorque = angleDiff * 8.5;
      const dampingTorque = -this.ship.angularVelocity * 4.2;
      this.ship.angularVelocity += (springTorque + dampingTorque) * dt;
    }

    // Atmospheric damping
    this.ship.angularVelocity *= 0.94;
    this.ship.vx *= 0.985;
    this.ship.vy *= 0.982;

    // Clamp angle to safe flight envelope (-75 deg to +75 deg)
    const maxAngle = Math.PI * 0.42;
    this.ship.angle = Math.max(-maxAngle, Math.min(maxAngle, this.ship.angle + this.ship.angularVelocity * dt));

    // Baseline forward cruise velocity (keeps navigation flowing along the music track)
    const forwardAcceleration = 140;
    if (this.ship.vx < this.baseForwardVelocity) {
      this.ship.vx += forwardAcceleration * dt;
    }

    // Update positions
    this.ship.x += this.ship.vx * dt;
    this.ship.y += this.ship.vy * dt;

    // HARD BOUNDARY ENFORCEMENT: Never allow the craft to penetrate ceiling or floor
    const currentTerrain = this.getTerrainAt(this.ship.x);
    const shipRadius = 14;
    const minSafeY = currentTerrain.ceilY + shipRadius;
    const maxSafeY = currentTerrain.floorY - shipRadius;

    if (this.ship.y <= minSafeY) {
      this.ship.y = minSafeY;
      if (this.ship.vy < 0) {
        this.ship.vy = Math.abs(this.ship.vy) * 0.35;
      }
    } else if (this.ship.y >= maxSafeY) {
      this.ship.y = maxSafeY;
      if (this.ship.vy > 0) {
        this.ship.vy = -Math.abs(this.ship.vy) * 0.35;
      }
    }

    // Sync with Matter body
    Matter.Body.setPosition(this.shipBody, { x: this.ship.x, y: this.ship.y });
    Matter.Body.setAngle(this.shipBody, this.ship.angle);
  }

  private updateObstacles(audioFreq: AudioFrequencyData, dt: number): void {
    for (const obs of this.obstacles) {
      if (Math.abs(obs.x - this.ship.x) > 1600) continue;

      const terrain = this.getTerrainAt(obs.x);

      if (obs.type === 'EJECTOR_BLOCK') {
        // Blocks thrust out on musical beats / mids energy
        obs.beatTriggerTimer += dt;
        obs.y = obs.isCeiling ? terrain.ceilY : terrain.floorY;

        // Periodic trigger + musical energy override
        const isTriggered = (obs.beatTriggerTimer % 3.0 < 1.3) || (audioFreq.mids > obs.energyThreshold) || audioFreq.isBeat;
        
        if (isTriggered) {
          // Rapid pneumatic thrust outwards
          obs.extension += (1.0 - obs.extension) * 0.32;
          obs.warningPhase = Math.min(1.0, obs.warningPhase + dt * 6.0);
          obs.active = obs.extension > 0.15;
        } else {
          // Smooth hydraulic retraction back into wall
          obs.extension += (0.0 - obs.extension) * 0.10;
          obs.warningPhase = Math.max(0.0, obs.warningPhase - dt * 3.5);
          obs.active = obs.extension > 0.15;
        }
      } else if (obs.type === 'SONIC_SPIKE') {
        // Sonic spikes burst out on bass pulses and drops
        obs.beatTriggerTimer += dt;
        obs.y = obs.isCeiling ? terrain.ceilY : terrain.floorY;

        const isBassDrop = audioFreq.bass > obs.energyThreshold || audioFreq.isBeat;
        if (isBassDrop) {
          obs.extension += (1.0 - obs.extension) * 0.45;
          obs.active = true;
        } else {
          obs.extension += (0.18 - obs.extension) * 0.12;
          obs.active = obs.extension > 0.22;
        }
      } else if (obs.type === 'RESONANCE_MINE') {
        // Floating resonance mines expand & contract and drift in rhythmic orbits
        obs.beatTriggerTimer += dt;
        obs.angle += obs.rotSpeed * (1.0 + audioFreq.energy * 2.8) * dt;
        const targetRadiusMult = 1.0 + (audioFreq.isBeat ? 0.75 : audioFreq.bass * 0.45);
        obs.extension += (targetRadiusMult - obs.extension) * 0.22;
        obs.y = obs.baseY + Math.sin(obs.beatTriggerTimer * 2.6) * 28;
        obs.active = true;
      } else if (obs.type === 'ROTATING_BLADE') {
        // Spinning hazard crosses accelerate with mids and treble
        obs.beatTriggerTimer += dt;
        obs.angle += obs.rotSpeed * (1.2 + audioFreq.mids * 3.8 + (audioFreq.isBeat ? 1.6 : 0)) * dt;
        obs.active = true;
        const attachTop = obs.isCeiling;
        const baseAnchorY = attachTop ? terrain.ceilY + 60 : terrain.floorY - 60;
        obs.y = baseAnchorY + Math.sin(obs.beatTriggerTimer * 2.2) * 18;
      }
    }

    // Laser curtains: rhythmic oscillation & treble energy
    for (const laser of this.laserGates) {
      if (Math.abs(laser.x - this.ship.x) > 1600) continue;
      const trebleEnergy = audioFreq.treble;
      laser.pulsePhase += dt * 4.2;
      laser.sweepOffset = Math.sin(laser.pulsePhase) * 52; // Rhythmic dynamic horizontal sweep!

      const targetAlpha = trebleEnergy > 0.28 ? Math.min(1.0, trebleEnergy * 2.0) : 0.05;
      laser.alpha += (targetAlpha - laser.alpha) * 0.25;
      laser.active = laser.alpha > 0.45;

      const t = this.getTerrainAt(laser.x + laser.sweepOffset);
      laser.yTop = t.ceilY + 5;
      laser.yBottom = t.floorY - 5;
    }
  }

  private updatePowerUps(dt: number, audioFreq: AudioFrequencyData): void {
    for (const p of this.powerUps) {
      if (p.collected) continue;
      p.pulsePhase += dt * 3.2;
      p.orbitAngle += dt * (2.4 + audioFreq.energy * 4.0);

      // Bounce & breathe on the beat
      if (audioFreq.isBeat) {
        p.rhythmBounce = 1.45;
      }
      p.rhythmBounce += (1.0 - p.rhythmBounce) * 0.12;

      p.y = p.baseY + Math.sin(p.pulsePhase) * 14 * p.rhythmBounce;

      // Check pickup
      const dx = this.ship.x - p.x;
      const dy = this.ship.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < p.radius + 20) {
        p.collected = true;
        this.stats.powerUpsCollected++;
        
        if (p.type === 'SHIELD') {
          this.ship.shields = Math.min(2, this.ship.shields + 1);
        } else if (p.type === 'DAMPER') {
          this.ship.damperActiveTimer = 6.0; // 6s duration
        } else if (p.type === 'LOW_G') {
          this.ship.lowGActiveTimer = 5.0;  // 5s duration
        }

        if (this.onPowerUpCollected) {
          this.onPowerUpCollected(p.type);
        }
      }
    }
  }

  /**
   * "Zero Contact" Golden Rule Collision Detection
   */
  private checkCollisions(): void {
    const terrain = this.getTerrainAt(this.ship.x);
    const shipRadius = 14;
    const minSafeY = terrain.ceilY + shipRadius;
    const maxSafeY = terrain.floorY - shipRadius;

    // Boundary hard clamp is active AT ALL TIMES (even during invulnerability or after death)
    if (this.ship.y <= minSafeY) {
      this.ship.y = minSafeY;
      if (this.ship.vy < 0) this.ship.vy = Math.abs(this.ship.vy) * 0.35;
      if (this.ship.invulnerableTime <= 0 && !this.ship.isDestroyed) {
        this.handleCollision('CEILING', 0, 1);
        return;
      }
    } else if (this.ship.y >= maxSafeY) {
      this.ship.y = maxSafeY;
      if (this.ship.vy > 0) this.ship.vy = -Math.abs(this.ship.vy) * 0.35;
      if (this.ship.invulnerableTime <= 0 && !this.ship.isDestroyed) {
        this.handleCollision('FLOOR', 0, -1);
        return;
      }
    }

    if (this.ship.invulnerableTime > 0) return;

    // 3. Multi-Archetype Obstacles collision check
    for (const obs of this.obstacles) {
      if (Math.abs(obs.x - this.ship.x) > 120) continue;

      if (obs.type === 'EJECTOR_BLOCK') {
        if (!obs.active) continue;
        const currentReach = obs.maxExtensionHeight * obs.extension;
        if (currentReach < 10) continue;

        const left = obs.x - obs.width / 2;
        const right = obs.x + obs.width / 2;

        if (this.ship.x + shipRadius >= left && this.ship.x - shipRadius <= right) {
          if (obs.isCeiling) {
            const blockBottom = terrain.ceilY + currentReach;
            if (this.ship.y - shipRadius <= blockBottom) {
              this.handleCollision('OBSTACLE', 0, 1);
              return;
            }
          } else {
            const blockTop = terrain.floorY - currentReach;
            if (this.ship.y + shipRadius >= blockTop) {
              this.handleCollision('OBSTACLE', 0, -1);
              return;
            }
          }
        }
      } else if (obs.type === 'SONIC_SPIKE') {
        const spikeReach = obs.maxExtensionHeight * obs.extension;
        if (spikeReach < 14) continue;

        const dx = Math.abs(this.ship.x - obs.x);
        if (dx < shipRadius + obs.width * 0.4) {
          if (obs.isCeiling) {
            const spikeTipY = terrain.ceilY + spikeReach;
            if (this.ship.y - shipRadius <= spikeTipY) {
              this.handleCollision('OBSTACLE', 0, 1);
              return;
            }
          } else {
            const spikeTipY = terrain.floorY - spikeReach;
            if (this.ship.y + shipRadius >= spikeTipY) {
              this.handleCollision('OBSTACLE', 0, -1);
              return;
            }
          }
        }
      } else if (obs.type === 'RESONANCE_MINE') {
        const dx = this.ship.x - obs.x;
        const dy = this.ship.y - obs.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const effectiveRadius = (obs.width / 2) * obs.extension;

        if (dist < shipRadius + effectiveRadius) {
          this.handleCollision('OBSTACLE', dx / (dist || 1), dy / (dist || 1));
          return;
        }
      } else if (obs.type === 'ROTATING_BLADE') {
        const dx = this.ship.x - obs.x;
        const dy = this.ship.y - obs.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < shipRadius + obs.width * 0.45) {
          this.handleCollision('OBSTACLE', dx / (dist || 1), dy / (dist || 1));
          return;
        }
      }
    }

    // 4. Laser gates with sweeping beam check
    for (const laser of this.laserGates) {
      if (!laser.active) continue;
      const laserCurX = laser.x + laser.sweepOffset;
      if (Math.abs(laserCurX - this.ship.x) < shipRadius + 6) {
        if (this.ship.y >= laser.yTop && this.ship.y <= laser.yBottom) {
          this.handleCollision('LASER', -1, 0);
          return;
        }
      }
    }

    // 5. High-Tech Proximity Radar & Cinematic Wall Scrape Check
    const clearanceCeil = (this.ship.y - shipRadius) - terrain.ceilY;
    const clearanceFloor = terrain.floorY - (this.ship.y + shipRadius);
    const minClearance = Math.min(clearanceCeil, clearanceFloor);
    const isCeilCloser = clearanceCeil < clearanceFloor;

    // Proximity Radar clicks start alerting within 85px of terrain
    const radarZone = 85;
    const radarIntensity = minClearance < radarZone ? Math.max(0, Math.min(1, 1.0 - (minClearance / radarZone))) : 0;

    if (radarIntensity > 0) {
      const contactY = isCeilCloser ? terrain.ceilY : terrain.floorY;
      if (this.onWallScrape) {
        this.onWallScrape(this.ship.x, contactY, this.ship.vx, isCeilCloser, radarIntensity);
      }
    } else {
      if (this.onWallScrape) {
        this.onWallScrape(this.ship.x, 0, this.ship.vx, false, 0);
      }
    }
  }

  private handleCollision(
    reason: 'CEILING' | 'FLOOR' | 'OBSTACLE' | 'LASER',
    normalX: number,
    normalY: number
  ): void {
    // Phase Shield protection
    if (this.ship.shields > 0) {
      this.ship.shields--;
      this.stats.shieldsUsed++;
      this.ship.invulnerableTime = 1.6; // 1.6 seconds invulnerability bounce

      // Relocate safely inward into corridor before applying bounce impulse
      const terrain = this.getTerrainAt(this.ship.x);
      const shipRadius = 14;
      if (reason === 'CEILING') {
        this.ship.y = terrain.ceilY + shipRadius + 6;
      } else if (reason === 'FLOOR') {
        this.ship.y = terrain.floorY - shipRadius - 6;
      }

      // Forceful bounce impulse away from surface
      this.ship.vx = normalX * 180 + this.baseForwardVelocity * 0.5;
      this.ship.vy = normalY * 320;
      this.ship.angularVelocity = (Math.random() - 0.5) * 4.0;
      Matter.Body.setPosition(this.shipBody, { x: this.ship.x, y: this.ship.y });

      if (this.onShieldAbsorbed) {
        this.onShieldAbsorbed();
      }
      return;
    }

    // Unprotected contact = Instant Destruction!
    this.ship.isDestroyed = true;
    this.stats.destructionReason = reason;

    if (this.onShipDestroyed) {
      this.onShipDestroyed(reason);
    }
  }

  public setFlightAssist(enabled: boolean): void {
    if (this.difficulty.allowFlightAssist) {
      this.flightAssistEnabled = enabled;
    }
  }
}
