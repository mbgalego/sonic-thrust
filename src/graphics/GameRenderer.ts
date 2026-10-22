/**
 * Sonic Thrust - Canvas 2D Neon Renderer
 * High-performance 60FPS renderer featuring vector neon terrain, glowing ships,
 * dual thruster exhaust particles, audio-reactive warp grids, and camera smoothing.
 */

import { PhysicsWorld } from '../physics/PhysicsWorld';
import { AudioFrequencyData, PowerUpItem, ObstaclePlatform, LaserGate } from '../types/game';
import { ParticleSystem } from './ParticleSystem';

export interface NeonPulseWave {
  id: number;
  radius: number;
  maxRadius: number;
  speed: number;
  color: string;
  glowColor: string;
  maxAlpha: number;
  lineWidth: number;
  rotation: number;
  rotationSpeed: number;
  arcAngles: { start: number; end: number }[];
}

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 1200;
  private height: number = 700;

  // Camera
  private cameraX: number = 0;
  private cameraY: number = 0;
  private screenShake: number = 0;

  // Dedicated Particle & VFX System
  public particleSystem: ParticleSystem;
  private backgroundStars: { x: number; y: number; speed: number; size: number; alpha: number }[] = [];

  // Full-Screen Center-Outward Background Neon Pulse Waves
  private neonPulseWaves: NeonPulseWave[] = [];
  private pulseSpawnTimer: number = 0;
  private pulseIdCounter: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get Canvas 2D context');
    this.ctx = context;
    this.particleSystem = new ParticleSystem(450);

    this.resize();
    this.initStars();
  }

  public resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || window.innerWidth;
    this.height = rect.height || window.innerHeight;

    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx.scale(dpr, dpr);
  }

  private initStars(): void {
    this.backgroundStars = [];
    for (let i = 0; i < 90; i++) {
      this.backgroundStars.push({
        x: Math.random() * 2000,
        y: Math.random() * 1000,
        speed: 0.15 + Math.random() * 0.5,
        size: 0.8 + Math.random() * 1.6,
        alpha: 0.2 + Math.random() * 0.6
      });
    }
  }

  public triggerScreenShake(intensity: number = 12): void {
    this.screenShake = Math.max(this.screenShake, intensity);
  }

  public emitWallScrape(
    scrapeX: number,
    scrapeY: number,
    shipVx: number,
    isCeiling: boolean,
    intensity: number
  ): void {
    // Proximity clicks occur from 85px inward; visual grazing sparks occur when within ~30px
    if (intensity > 0.62) {
      const sparkIntensity = (intensity - 0.62) / 0.38;
      this.particleSystem.emitWallScrape(scrapeX, scrapeY, shipVx, isCeiling, sparkIntensity);
      if (sparkIntensity > 0.40) {
        this.triggerScreenShake(sparkIntensity * 3.5);
      }
    }
  }

  public emitExplosion(x: number, y: number): void {
    this.triggerScreenShake(24);
    this.particleSystem.emitExplosion(x, y);
  }

  public emitShieldAbsorb(x: number, y: number): void {
    this.triggerScreenShake(8);
    this.particleSystem.emitShieldAbsorb(x, y);
  }

  public emitPowerUpCollect(x: number, y: number, color: string): void {
    this.particleSystem.emitPowerUpCollect(x, y, color);
  }

  /**
   * Main Render Frame
   */
  public render(
    world: PhysicsWorld,
    audioFreq: AudioFrequencyData,
    dt: number,
    isPaused: boolean
  ): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Decay shake
    let shakeX = 0;
    let shakeY = 0;
    if (this.screenShake > 0.1) {
      shakeX = (Math.random() - 0.5) * this.screenShake;
      shakeY = (Math.random() - 0.5) * this.screenShake;
      this.screenShake *= 0.88;
    }

    // Camera follow (keep ship ~28% from left edge to give forward vision)
    const targetCamX = world.ship.x - w * 0.28;
    const targetCamY = world.ship.y - h * 0.5;
    this.cameraX += (targetCamX - this.cameraX) * 0.14;
    this.cameraY += (targetCamY - this.cameraY) * 0.10;

    // Clamp cameraY so tunnel doesn't get lost
    this.cameraY = Math.max(-100, Math.min(world.worldHeight - h + 100, this.cameraY));

    // Clear background
    ctx.fillStyle = '#06070c';
    ctx.fillRect(0, 0, w, h);

    // Full-screen background 'Neon Pulse' layer propagating outwards from center of viewport
    this.renderNeonPulse(audioFreq, isPaused ? 0 : dt);

    // Save for world translation
    ctx.save();
    ctx.translate(-this.cameraX + shakeX, -this.cameraY + shakeY);

    // 1. Cyber Grid & Parallax Starfield
    this.renderBackgroundGrid(world, audioFreq);

    // 2. Launchpad (Plataforma de Descolagem)
    this.renderLaunchpad(world);

    // 3. Finish Portal (Portal de Meta)
    this.renderFinishPortal(world, audioFreq);

    // 4. Power-ups (Holographic celestial beacons pulsing to music)
    this.renderPowerUps(world.powerUps, audioFreq, world);

    // 5. Obstacles & Laser Gates (Dynamic ejector blocks, sonic spikes, resonance mines, laser curtains)
    this.renderObstacles(world.obstacles, world.laserGates, audioFreq, world);

    // 6. Vector Neon Terrain (Ceiling and Floor)
    this.renderTerrain(world, audioFreq);

    // 7. Particles & Shockwaves (frozen while paused)
    this.renderParticlesAndShockwaves(isPaused ? 0 : dt);

    // 8. Player Ship & Jet Exhausts
    if (!world.ship.isDestroyed) {
      this.renderShip(world, isPaused);
    }

    ctx.restore();

    // 9. Audio Waveform Spectrum Radar (Mini overlay in bottom left corner)
    this.renderAudioSpectrumMini(audioFreq);
  }

  /**
   * Full-screen background 'Neon Pulse' layer:
   * Rhythmic, fading arc-like waves that propagate from the center of the viewport outwards,
   * reacting dynamically to the low-frequency (bass) energy and kick beats of the track.
   */
  private renderNeonPulse(audioFreq: AudioFrequencyData, dt: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const maxRadius = Math.hypot(w, h) * 0.68;
    const bass = audioFreq.bass;

    // 1. Subtle audio-reactive ambient radial core flare at viewport center (toned down to not interfere with craft)
    const corePulse = 1.0 + bass * 0.65 + (audioFreq.isBeat ? 0.35 : 0);
    const flareRadius = Math.min(w, h) * 0.45 * corePulse;

    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, flareRadius);
    const coreAlpha = (0.03 + bass * 0.08 + (audioFreq.isBeat ? 0.05 : 0));
    coreGrad.addColorStop(0, audioFreq.isBeat ? `rgba(255, 255, 255, ${coreAlpha * 1.4})` : `rgba(0, 240, 255, ${coreAlpha})`);
    coreGrad.addColorStop(0.35, `rgba(168, 85, 247, ${coreAlpha * 0.5})`);
    coreGrad.addColorStop(0.70, `rgba(236, 72, 153, ${coreAlpha * 0.2})`);
    coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.save();
    ctx.fillStyle = coreGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // 2. Pulse Wave Spawner reacting to bass and beat
    this.pulseSpawnTimer -= dt;
    const triggerThreshold = 0.38;
    if ((audioFreq.isBeat || bass > triggerThreshold) && this.pulseSpawnTimer <= 0) {
      this.pulseSpawnTimer = audioFreq.isBeat ? 0.16 : 0.26;

      const palette = [
        { color: '#00f0ff', glow: '#00f0ff' }, // Electric Cyan
        { color: '#ec4899', glow: '#ec4899' }, // Neon Rose / Magenta
        { color: '#a855f7', glow: '#a855f7' }, // Electric Violet
        { color: '#f43f5e', glow: '#f43f5e' }, // Searing Fuchsia
        { color: '#38bdf8', glow: '#38bdf8' }, // Sky Laser
        { color: '#fbbf24', glow: '#fbbf24' }  // Cyber Amber
      ];
      const pick = palette[this.pulseIdCounter % palette.length];

      // Generate distinct arc formations: dual sweeping arcs, tri-phase arcs, or quad cyber arcs
      const arcType = this.pulseIdCounter % 3;
      let arcAngles: { start: number; end: number }[] = [];
      if (arcType === 0) {
        // Dual sweeping arcs
        arcAngles = [
          { start: -Math.PI * 0.36, end: Math.PI * 0.36 },
          { start: Math.PI * 0.64, end: Math.PI * 1.36 }
        ];
      } else if (arcType === 1) {
        // Tri-phase rhythm arcs
        arcAngles = [
          { start: 0.15, end: 1.65 },
          { start: 2.25, end: 3.75 },
          { start: 4.35, end: 5.85 }
        ];
      } else {
        // Quad cyber arcs
        arcAngles = [
          { start: 0.15, end: 1.15 },
          { start: 1.72, end: 2.72 },
          { start: 3.29, end: 4.29 },
          { start: 4.86, end: 5.86 }
        ];
      }

      this.neonPulseWaves.push({
        id: this.pulseIdCounter++,
        radius: 20 + bass * 25,
        maxRadius,
        speed: 320 + bass * 380 + (audioFreq.isBeat ? 150 : 0),
        color: pick.color,
        glowColor: pick.glow,
        maxAlpha: 0.60 + bass * 0.35,
        lineWidth: 2.5 + bass * 3.5,
        rotation: (this.pulseIdCounter * 0.45) % (Math.PI * 2),
        rotationSpeed: (Math.random() - 0.5) * 0.85,
        arcAngles
      });
    }

    // 3. Update & Render propagating arc waves
    for (let i = this.neonPulseWaves.length - 1; i >= 0; i--) {
      const wave = this.neonPulseWaves[i];
      wave.radius += wave.speed * (1.0 + bass * 0.55) * dt;
      wave.rotation += wave.rotationSpeed * dt;

      // Calculate progress and non-linear fadeout
      const progress = wave.radius / wave.maxRadius;
      if (progress >= 1.0) {
        this.neonPulseWaves.splice(i, 1);
        continue;
      }

      // Quick smooth fade-in as it leaves center, then long fading arc trail outward
      const fadeIn = Math.min(1.0, progress / 0.08);
      const fadeOut = Math.max(0.0, 1.0 - Math.pow(progress, 1.35));
      const currentAlpha = fadeIn * fadeOut * wave.maxAlpha * (0.7 + bass * 0.6);

      if (currentAlpha < 0.01) continue;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(wave.rotation);

      ctx.strokeStyle = wave.color;
      ctx.globalAlpha = Math.min(0.85, currentAlpha);
      ctx.shadowColor = wave.glowColor;
      ctx.shadowBlur = 14 + bass * 20;
      ctx.lineWidth = wave.lineWidth * (1.0 - progress * 0.28);

      for (const arc of wave.arcAngles) {
        ctx.beginPath();
        ctx.arc(0, 0, wave.radius, arc.start, arc.end);
        ctx.stroke();

        // White energetic tip beads on arc terminals
        if (progress < 0.72) {
          ctx.fillStyle = '#ffffff';
          const p1x = Math.cos(arc.start) * wave.radius;
          const p1y = Math.sin(arc.start) * wave.radius;
          const p2x = Math.cos(arc.end) * wave.radius;
          const p2y = Math.sin(arc.end) * wave.radius;
          ctx.beginPath();
          ctx.arc(p1x, p1y, 2.5, 0, Math.PI * 2);
          ctx.arc(p2x, p2y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Secondary ghost harmonic echo wave for deeper depth
      if (progress > 0.12 && progress < 0.85) {
        ctx.globalAlpha = currentAlpha * 0.35;
        ctx.lineWidth = 1.2;
        for (const arc of wave.arcAngles) {
          ctx.beginPath();
          ctx.arc(0, 0, wave.radius * 0.94, arc.start + 0.05, arc.end - 0.05);
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    // 4. MASK OUT PLAYABLE FLIGHT CORRIDOR:
    // Ensures the central flight corridor remains completely clear and uncluttered,
    // while the dramatic neon pulses expand majestically into the outer screen perimeter, horizons, and corners.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const clearH = 340;
    const cutGrad = ctx.createLinearGradient(0, cy - clearH * 0.5, 0, cy + clearH * 0.5);
    cutGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    cutGrad.addColorStop(0.20, 'rgba(0, 0, 0, 0.88)');
    cutGrad.addColorStop(0.50, 'rgba(0, 0, 0, 1.0)');
    cutGrad.addColorStop(0.80, 'rgba(0, 0, 0, 0.88)');
    cutGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = cutGrad;
    ctx.fillRect(0, cy - clearH * 0.5, w, clearH);
    ctx.restore();
  }

  private renderBackgroundGrid(world: PhysicsWorld, audioFreq: AudioFrequencyData): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Parallax stars
    ctx.fillStyle = '#64748b';
    for (const star of this.backgroundStars) {
      const screenX = (star.x - this.cameraX * star.speed) % (w * 2);
      const drawX = screenX < 0 ? screenX + w * 2 : screenX;
      const drawY = (star.y - this.cameraY * star.speed * 0.3) % (h * 1.5);
      const finalY = drawY < 0 ? drawY + h * 1.5 : drawY;

      ctx.globalAlpha = star.alpha * (0.8 + audioFreq.treble * 0.5);
      ctx.fillRect(this.cameraX + drawX - w * 0.5, this.cameraY + finalY - h * 0.25, star.size, star.size);
    }
    ctx.globalAlpha = 1.0;

    // Perspective neon grid lines
    const gridSpacing = 90;
    const startGridX = Math.floor(this.cameraX / gridSpacing) * gridSpacing;
    const endGridX = startGridX + w + gridSpacing * 2;

    ctx.strokeStyle = `rgba(14, 165, 233, ${0.06 + audioFreq.bass * 0.1})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = startGridX; gx <= endGridX; gx += gridSpacing) {
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, world.worldHeight);
    }
    for (let gy = 0; gy <= world.worldHeight; gy += gridSpacing) {
      ctx.moveTo(startGridX, gy);
      ctx.lineTo(endGridX, gy);
    }
    ctx.stroke();
  }

  private renderLaunchpad(world: PhysicsWorld): void {
    const ctx = this.ctx;
    const padStartX = 80;
    const padEndX = world.launchpadEnd;
    const centerY = world.worldHeight / 2;
    const floorY = centerY + 180;

    // Landing strip base
    ctx.save();
    ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
    ctx.fillRect(padStartX, floorY - 12, padEndX - padStartX, 24);

    // Hazard warning stripes
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.5)';
    ctx.lineWidth = 3;
    for (let x = padStartX + 10; x < padEndX - 20; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, floorY + 10);
      ctx.lineTo(x + 16, floorY - 10);
      ctx.stroke();
    }

    // Launch runway neon guide lights
    const time = Date.now() * 0.005;
    for (let x = padStartX; x <= padEndX; x += 55) {
      const active = (Math.floor(time + x * 0.05) % 4) === 0;
      ctx.fillStyle = active ? '#38bdf8' : 'rgba(56, 189, 248, 0.2)';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = active ? 12 : 0;
      ctx.beginPath();
      ctx.arc(x, floorY - 14, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Holographic Launch Sign
    ctx.font = 'bold 13px Orbitron';
    ctx.fillStyle = '#06b6d4';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 8;
    ctx.fillText('▼ PLATAFORMA DE DESCOLAGEM / LIFTOFF ZONE', padStartX + 20, floorY - 32);
    ctx.restore();
  }

  private renderFinishPortal(world: PhysicsWorld, audioFreq: AudioFrequencyData): void {
    const ctx = this.ctx;
    const px = world.finishPortalX;
    const terrain = world.getTerrainAt(px);
    const py = (terrain.ceilY + terrain.floorY) / 2;
    const time = Date.now() * 0.003;

    ctx.save();
    ctx.translate(px, py);

    // Dynamic audio-pulsed portal radius
    const portalH = (terrain.floorY - terrain.ceilY) * 0.85;
    const pulse = 1.0 + audioFreq.bass * 0.35;

    // Glowing vertical aura column
    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, portalH * 0.5 * pulse);
    grad.addColorStop(0, 'rgba(236, 72, 153, 0.45)');
    grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 120 * pulse, portalH * 0.5 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    // Concentric swirling cyber rings
    const ringCount = 4;
    for (let i = 0; i < ringCount; i++) {
      const rot = (time * (i % 2 === 0 ? 1 : -1) * (1.2 + i * 0.5));
      const ringRx = (24 + i * 22) * pulse;
      const ringRy = (portalH * 0.2 + i * 35) * pulse;

      ctx.save();
      ctx.rotate(rot);
      ctx.strokeStyle = i % 2 === 0 ? '#ec4899' : '#06b6d4';
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 15;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.ellipse(0, 0, ringRx, ringRy, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Portal Meta text lockup
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ec4899';
    ctx.font = 'bold 15px Orbitron';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('PORTAL DE META', 0, -portalH * 0.45);
    ctx.font = '11px Rajdhani';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('FINAL DA MÚSICA', 0, -portalH * 0.45 + 18);

    ctx.restore();
  }

  private renderTerrain(world: PhysicsWorld, audioFreq: AudioFrequencyData): void {
    const ctx = this.ctx;
    const points = world.terrainPoints;
    if (points.length < 2) return;

    // Render only visible segments with padding
    const startX = this.cameraX - 150;
    const endX = this.cameraX + this.width + 150;

    let firstVisibleIdx = 0;
    let lastVisibleIdx = points.length - 1;

    for (let i = 0; i < points.length; i++) {
      if (points[i].x < startX) firstVisibleIdx = i;
      if (points[i].x > endX) {
        lastVisibleIdx = i;
        break;
      }
    }

    // Multi-pass neon vector glow
    // Pass 1: Semi-transparent solid fill above ceiling & below floor for physical boundary sense
    ctx.save();
    
    // Ceiling fill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.moveTo(points[firstVisibleIdx].x, 0);
    for (let i = firstVisibleIdx; i <= lastVisibleIdx; i++) {
      ctx.lineTo(points[i].x, points[i].currentCeilY);
    }
    ctx.lineTo(points[lastVisibleIdx].x, 0);
    ctx.closePath();
    ctx.fill();

    // Floor fill
    ctx.beginPath();
    ctx.moveTo(points[firstVisibleIdx].x, world.worldHeight);
    for (let i = firstVisibleIdx; i <= lastVisibleIdx; i++) {
      ctx.lineTo(points[i].x, points[i].currentFloorY);
    }
    ctx.lineTo(points[lastVisibleIdx].x, world.worldHeight);
    ctx.closePath();
    ctx.fill();

    // Pass 2: Ceiling Neon Vector Line
    const beatColor = audioFreq.isBeat ? '#ffffff' : '#06b6d4';
    ctx.shadowColor = audioFreq.isBeat ? '#ffffff' : '#06b6d4';
    ctx.shadowBlur = 16 + audioFreq.bass * 14;
    ctx.strokeStyle = beatColor;
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    ctx.moveTo(points[firstVisibleIdx].x, points[firstVisibleIdx].currentCeilY);
    for (let i = firstVisibleIdx + 1; i <= lastVisibleIdx; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.currentCeilY + curr.currentCeilY) / 2;
      ctx.quadraticCurveTo(prev.x, prev.currentCeilY, midX, midY);
    }
    ctx.stroke();

    // Pass 3: Floor Neon Vector Line
    const floorColor = audioFreq.isBeat ? '#ffffff' : '#a855f7';
    ctx.shadowColor = audioFreq.isBeat ? '#ffffff' : '#a855f7';
    ctx.shadowBlur = 16 + audioFreq.bass * 14;
    ctx.strokeStyle = floorColor;
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    ctx.moveTo(points[firstVisibleIdx].x, points[firstVisibleIdx].currentFloorY);
    for (let i = firstVisibleIdx + 1; i <= lastVisibleIdx; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.currentFloorY + curr.currentFloorY) / 2;
      ctx.quadraticCurveTo(prev.x, prev.currentFloorY, midX, midY);
    }
    ctx.stroke();

    // Pass 4: Gravitational Ripple Waves (Stone-in-Pond Shockwaves OUTSIDE the Playable Corridor)
    // 5 multi-layer neon harmonic ripples propagating strictly outward into the bedrock
    // (above ceiling and below floor), simulating gravitational shockwaves radiating away from the boundary surface
    // in exact sync with the musical beat, bass transients, and tempo.
    const echoColorsCeil = [
      '#00f0ff', // Layer 0: Searing Electric Cyan
      '#a855f7', // Layer 1: Radiant Neon Violet
      '#ec4899', // Layer 2: Vivid Neon Magenta
      '#fbbf24', // Layer 3: Laser Amber Gold
      '#22c55e'  // Layer 4: Neon Electric Lime
    ];
    const echoColorsFloor = [
      '#f43f5e', // Layer 0: Searing Hot Rose / Crimson
      '#c026d3', // Layer 1: Electric Fuchsia / Purple
      '#06b6d4', // Layer 2: Brilliant Neon Turquoise
      '#10b981', // Layer 3: Radiant Mint / Emerald
      '#f59e0b'  // Layer 4: Sunset Laser Orange
    ];

    const echoLayers = 5;
    const timeAnim = Date.now() * 0.0035;
    const rippleTravel = timeAnim * 6.5 + audioFreq.energy * 4.2;
    const bassAmpKick = 12 + audioFreq.bass * 26 + (audioFreq.isBeat ? 16 : 0);
    const accordionPulse = 1.0 + audioFreq.bass * 0.65 + (audioFreq.isBeat ? 0.40 : 0);

    for (let layer = 0; layer < echoLayers; layer++) {
      // Expanding gravitational wavefront propagating outward into bedrock
      const wavePhase = rippleTravel - layer * 1.15;
      const outwardExpansion = ((layer + 1) * 15 + Math.sin(wavePhase) * 5) * accordionPulse;
      
      // Exponential fadeout as ripples expand further away from the tunnel into the outer void
      const baseAlpha = (0.50 - layer * 0.085) * (0.75 + audioFreq.bass * 0.65);
      const alpha = Math.max(0.04, Math.min(0.85, baseAlpha));
      const lineWidth = Math.max(1.0, 3.2 - layer * 0.42);

      // --- Ceiling Gravitational Echo (Radiating UPWARDS into bedrock, outside playable space) ---
      ctx.save();
      ctx.strokeStyle = echoColorsCeil[layer];
      ctx.globalAlpha = alpha;
      ctx.shadowColor = echoColorsCeil[layer];
      ctx.shadowBlur = layer === 0 ? (16 + audioFreq.bass * 18) : (8 + audioFreq.bass * 10);
      ctx.lineWidth = lineWidth;

      ctx.beginPath();
      for (let i = firstVisibleIdx; i <= lastVisibleIdx; i++) {
        const curr = points[i];
        const primaryRipple = Math.sin(curr.x * 0.016 - rippleTravel * 1.8 + layer * 1.1) * bassAmpKick;
        const harmonicShimmer = Math.cos(curr.x * 0.035 + rippleTravel * 2.2) * (4 + audioFreq.mids * 10);
        // Strictly SUBTRACT so contour line is ABOVE ceiling (outside playable tunnel)
        const y = curr.currentCeilY - (outwardExpansion + primaryRipple + harmonicShimmer);

        if (i === firstVisibleIdx) {
          ctx.moveTo(curr.x, y);
        } else {
          const prev = points[i - 1];
          const prevPrimary = Math.sin(prev.x * 0.016 - rippleTravel * 1.8 + layer * 1.1) * bassAmpKick;
          const prevShimmer = Math.cos(prev.x * 0.035 + rippleTravel * 2.2) * (4 + audioFreq.mids * 10);
          const prevY = prev.currentCeilY - (outwardExpansion + prevPrimary + prevShimmer);
          const midX = (prev.x + curr.x) / 2;
          const midY = (prevY + y) / 2;
          ctx.quadraticCurveTo(prev.x, prevY, midX, midY);
        }
      }
      ctx.stroke();
      ctx.restore();

      // --- Floor Gravitational Echo (Radiating DOWNWARDS into bedrock, outside playable space) ---
      ctx.save();
      ctx.strokeStyle = echoColorsFloor[layer];
      ctx.globalAlpha = alpha;
      ctx.shadowColor = echoColorsFloor[layer];
      ctx.shadowBlur = layer === 0 ? (16 + audioFreq.bass * 18) : (8 + audioFreq.bass * 10);
      ctx.lineWidth = lineWidth;

      ctx.beginPath();
      for (let i = firstVisibleIdx; i <= lastVisibleIdx; i++) {
        const curr = points[i];
        const primaryRipple = Math.sin(curr.x * 0.016 - rippleTravel * 1.8 - layer * 1.1) * bassAmpKick;
        const harmonicShimmer = Math.cos(curr.x * 0.035 + rippleTravel * 2.2) * (4 + audioFreq.mids * 10);
        // Strictly ADD so contour line is BELOW floor (outside playable tunnel)
        const y = curr.currentFloorY + (outwardExpansion + primaryRipple + harmonicShimmer);

        if (i === firstVisibleIdx) {
          ctx.moveTo(curr.x, y);
        } else {
          const prev = points[i - 1];
          const prevPrimary = Math.sin(prev.x * 0.016 - rippleTravel * 1.8 - layer * 1.1) * bassAmpKick;
          const prevShimmer = Math.cos(prev.x * 0.035 + rippleTravel * 2.2) * (4 + audioFreq.mids * 10);
          const prevY = prev.currentFloorY + (outwardExpansion + prevPrimary + prevShimmer);
          const midX = (prev.x + curr.x) / 2;
          const midY = (prevY + y) / 2;
          ctx.quadraticCurveTo(prev.x, prevY, midX, midY);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Render Power-Ups with distinct celestial beacon columns,
   * beat-synced breathing scale and orbital satellite rings to ensure they are NEVER confused with red danger obstacles.
   */
  private renderPowerUps(powerUps: PowerUpItem[], audioFreq: AudioFrequencyData, world: PhysicsWorld): void {
    const ctx = this.ctx;
    ctx.save();

    for (const p of powerUps) {
      if (p.collected) continue;
      if (p.x < this.cameraX - 140 || p.x > this.cameraX + this.width + 140) continue;

      const terrain = world.getTerrainAt(p.x);

      // 1. Friendly Vertical Light Column (Ceiling to Floor) - Instantly distinguishes collectibles from hazards!
      ctx.save();
      const colGrad = ctx.createLinearGradient(0, terrain.ceilY, 0, terrain.floorY);
      colGrad.addColorStop(0, 'rgba(0, 240, 255, 0.02)');
      colGrad.addColorStop(0.5, p.color === '#00f0ff' ? 'rgba(0, 240, 255, 0.16)' : p.color === '#00ff88' ? 'rgba(0, 255, 136, 0.16)' : 'rgba(255, 215, 0, 0.16)');
      colGrad.addColorStop(1, 'rgba(0, 240, 255, 0.02)');
      
      ctx.fillStyle = colGrad;
      ctx.fillRect(p.x - 14, terrain.ceilY, 28, terrain.floorY - terrain.ceilY);

      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.35 + (audioFreq.isBeat ? 0.35 : 0);
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(p.x, terrain.ceilY);
      ctx.lineTo(p.x, terrain.floorY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 2. Audio Rhythm Pulse & 3D Celestial Geometry
      ctx.save();
      ctx.translate(p.x, p.y);

      const beatPulse = 1.0 + (p.rhythmBounce - 1.0) * 0.75 + (audioFreq.bass * 0.22);
      const rad = p.radius * beatPulse;

      ctx.shadowColor = p.color;
      ctx.shadowBlur = 18 + (audioFreq.isBeat ? 16 : 0);

      if (p.type === 'SHIELD') {
        // A) PHASE SHIELD: Hexagonal holographic crystal with 3 orbiting satellites
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;

        // Outer Hexagon
        ctx.beginPath();
        for (let a = 0; a < 6; a++) {
          const angle = (a * Math.PI) / 3 + p.pulsePhase * 0.6;
          const hx = Math.cos(angle) * rad;
          const hy = Math.sin(angle) * rad;
          if (a === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = 'rgba(0, 240, 255, 0.22)';
        ctx.fill();

        // 3 Orbiting Satellites
        for (let s = 0; s < 3; s++) {
          const sAngle = p.orbitAngle + (s * Math.PI * 2) / 3;
          const sx = Math.cos(sAngle) * (rad + 9);
          const sy = Math.sin(sAngle) * (rad + 9);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(sx, sy, 3, 0, Math.PI * 2);
          ctx.fill();
        }

      } else if (p.type === 'DAMPER') {
        // B) SONIC DAMPER: Concentric sonic wave resonator with animated sine wave
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, rad * 0.65, 0, Math.PI * 2);
        ctx.stroke();

        // Oscilloscope sine wave inside
        ctx.beginPath();
        for (let w = -rad * 0.65; w <= rad * 0.65; w += 3) {
          const wy = Math.sin(w * 0.35 + p.pulsePhase * 3.2) * (rad * 0.32);
          if (w === -rad * 0.65) ctx.moveTo(w, wy);
          else ctx.lineTo(w, wy);
        }
        ctx.stroke();

      } else {
        // C) LOW-G SURGE: Levitating anti-gravity gyroscope with gimbal rings
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;

        // Gimbal ring 1
        ctx.save();
        ctx.rotate(p.orbitAngle);
        ctx.beginPath();
        ctx.ellipse(0, 0, rad, rad * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Gimbal ring 2
        ctx.save();
        ctx.rotate(-p.orbitAngle * 1.3);
        ctx.beginPath();
        ctx.ellipse(0, 0, rad * 0.78, rad * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Center glowing sun sphere
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Clear Friendly Hologram Tag
      ctx.font = 'bold 9px Orbitron';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      const label = p.type === 'SHIELD' ? 'ESCUDO' : p.type === 'DAMPER' ? 'DAMPER' : 'LOW-G';
      ctx.shadowBlur = 8;
      ctx.fillText(label, 0, rad + 18);

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Render Multi-Archetype Obstacles:
   * Ejector Blocks (emerging from wall with hazard pistons),
   * Sonic Spikes (sharp stalactites/stalagmites bursting to bass),
   * Resonance Mines (pulsing with expanding shield petals),
   * Rotating Blades, and Laser Curtains.
   */
  private renderObstacles(
    obstacles: ObstaclePlatform[],
    lasers: LaserGate[],
    audioFreq: AudioFrequencyData,
    world: PhysicsWorld
  ): void {
    const ctx = this.ctx;
    ctx.save();

    for (const obs of obstacles) {
      if (obs.x < this.cameraX - 140 || obs.x > this.cameraX + this.width + 140) continue;

      const terrain = world.getTerrainAt(obs.x);

      if (obs.type === 'EJECTOR_BLOCK') {
        // A) EJECTOR BLOCK: Wall pneumatic ram with dual hydraulic rods & hazard chevrons
        const reach = obs.maxExtensionHeight * obs.extension;
        const w = obs.width;
        const isCeil = obs.isCeiling;
        const baseY = isCeil ? terrain.ceilY : terrain.floorY;
        const faceY = isCeil ? baseY + reach : baseY - reach;
        const blockHeight = 28;

        ctx.save();

        // Telegraph warning laser grid & flashing hazard zone before punching out
        if (obs.warningPhase > 0.05) {
          ctx.strokeStyle = '#facc15';
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 18 * obs.warningPhase;
          ctx.lineWidth = 2.5;
          ctx.setLineDash([6, 6]);
          const warnTop = isCeil ? baseY : baseY - obs.maxExtensionHeight;
          ctx.strokeRect(obs.x - w / 2 - 6, warnTop, w + 12, obs.maxExtensionHeight);
          ctx.setLineDash([]);

          // Strobe warning beacons on wall mount
          const beaconFlash = (Math.floor(Date.now() * 0.015) % 2 === 0);
          ctx.fillStyle = beaconFlash ? '#facc15' : 'rgba(250, 204, 21, 0.2)';
          ctx.beginPath();
          ctx.arc(obs.x - w / 2 + 6, baseY, 4, 0, Math.PI * 2);
          ctx.arc(obs.x + w / 2 - 6, baseY, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Heavy Industrial Dual Hydraulic Piston Rods
        if (reach > 8) {
          // Left Piston
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(obs.x - 22, baseY);
          ctx.lineTo(obs.x - 22, faceY);
          ctx.moveTo(obs.x + 22, baseY);
          ctx.lineTo(obs.x + 22, faceY);
          ctx.stroke();

          // Internal Hydraulic Neon Fluid Core
          ctx.strokeStyle = obs.color;
          ctx.shadowColor = obs.color;
          ctx.shadowBlur = 8;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(obs.x - 22, baseY);
          ctx.lineTo(obs.x - 22, faceY);
          ctx.moveTo(obs.x + 22, baseY);
          ctx.lineTo(obs.x + 22, faceY);
          ctx.stroke();
        }

        // Ram Block Chassis Face
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = obs.color;
        ctx.shadowColor = obs.color;
        ctx.shadowBlur = obs.active ? 24 : 8;
        ctx.lineWidth = 3.0;

        const blockY = isCeil ? faceY - blockHeight : faceY;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(obs.x - w / 2, blockY, w, blockHeight, 4) : ctx.rect(obs.x - w / 2, blockY, w, blockHeight);
        ctx.fill();
        ctx.stroke();

        // Inner glowing core plate
        ctx.fillStyle = obs.active ? 'rgba(255, 0, 85, 0.28)' : 'rgba(255, 0, 85, 0.08)';
        ctx.fillRect(obs.x - w / 2 + 4, blockY + 4, w - 8, blockHeight - 8);

        // Animated diagonal hazard chevrons
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.5;
        const chevronOffset = (Date.now() * 0.02) % 18;
        ctx.save();
        ctx.beginPath();
        ctx.rect(obs.x - w / 2 + 2, blockY + 2, w - 4, blockHeight - 4);
        ctx.clip();
        for (let cx = obs.x - w / 2 - 10 + chevronOffset; cx < obs.x + w / 2 + 20; cx += 18) {
          ctx.beginPath();
          ctx.moveTo(cx, blockY + 3);
          ctx.lineTo(cx + 10, blockY + blockHeight - 3);
          ctx.stroke();
        }
        ctx.restore();

        // High-voltage cutting edge on the impact face
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(obs.x - w / 2, faceY);
        ctx.lineTo(obs.x + w / 2, faceY);
        ctx.stroke();

        ctx.restore();

      } else if (obs.type === 'SONIC_SPIKE') {
        // B) SONIC SPIKE: Triple crystalline neon spear bursting to the bass
        const reach = obs.maxExtensionHeight * obs.extension;
        const isCeil = obs.isCeiling;
        const baseY = isCeil ? terrain.ceilY : terrain.floorY;
        const tipY = isCeil ? baseY + reach : baseY - reach;
        const halfW = obs.width / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(192, 38, 211, 0.35)';
        ctx.strokeStyle = obs.color;
        ctx.shadowColor = obs.color;
        ctx.shadowBlur = obs.active ? 26 : 10;
        ctx.lineWidth = 3.0;

        // Flanking secondary crystal shards
        const subReach = reach * 0.65;
        const subTipY = isCeil ? baseY + subReach : baseY - subReach;

        // Left sub-crystal
        ctx.beginPath();
        ctx.moveTo(obs.x - halfW - 6, baseY);
        ctx.lineTo(obs.x - halfW * 0.3, baseY);
        ctx.lineTo(obs.x - halfW * 0.65, subTipY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right sub-crystal
        ctx.beginPath();
        ctx.moveTo(obs.x + halfW * 0.3, baseY);
        ctx.lineTo(obs.x + halfW + 6, baseY);
        ctx.lineTo(obs.x + halfW * 0.65, subTipY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Main Primary Crystal Spear
        ctx.beginPath();
        ctx.moveTo(obs.x - halfW * 0.8, baseY);
        ctx.lineTo(obs.x + halfW * 0.8, baseY);
        ctx.lineTo(obs.x, tipY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Electric central lightning spine
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(obs.x, baseY);
        // Jagged lightning path
        const midY1 = baseY + (tipY - baseY) * 0.35;
        const midY2 = baseY + (tipY - baseY) * 0.70;
        const jag = Math.sin(Date.now() * 0.02 + obs.x) * 4;
        ctx.lineTo(obs.x + jag, midY1);
        ctx.lineTo(obs.x - jag, midY2);
        ctx.lineTo(obs.x, tipY);
        ctx.stroke();

        // High-energy spark point at needle tip
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(obs.x, tipY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

      } else if (obs.type === 'RESONANCE_MINE') {
        // C) RESONANCE MINE: Floating cyber mine with orbiting forcefield satellites
        ctx.save();
        ctx.translate(obs.x, obs.y);
        ctx.rotate(obs.angle);

        const currentRad = (obs.width / 2) * obs.extension;
        ctx.strokeStyle = obs.color;
        ctx.shadowColor = obs.color;
        ctx.shadowBlur = 20 + audioFreq.bass * 16;
        ctx.lineWidth = 2.5;

        // Rotating Hexagonal Energy Shield Field connecting satellites
        const satelliteCount = 5;
        const orbitRadius = currentRad * 1.35;
        ctx.strokeStyle = `rgba(249, 115, 22, ${0.4 + audioFreq.bass * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let s = 0; s < satelliteCount; s++) {
          const sAngle = (s * Math.PI * 2) / satelliteCount;
          const sx = Math.cos(sAngle) * orbitRadius;
          const sy = Math.sin(sAngle) * orbitRadius;
          if (s === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.stroke();

        // Satellites with glowing energy nodes
        for (let s = 0; s < satelliteCount; s++) {
          const sAngle = (s * Math.PI * 2) / satelliteCount;
          const sx = Math.cos(sAngle) * orbitRadius;
          const sy = Math.sin(sAngle) * orbitRadius;

          // Tether line to center
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(sx, sy);
          ctx.stroke();

          // Satellite beacon
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(sx, sy, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Armored Mine Core Body
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = obs.color;
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.arc(0, 0, currentRad * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pulsing Radioactive Core Eye
        const eyePulse = 1.0 + Math.sin(Date.now() * 0.01) * 0.25;
        ctx.fillStyle = audioFreq.isBeat ? '#ffffff' : '#f97316';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(0, 0, currentRad * 0.35 * eyePulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

      } else if (obs.type === 'ROTATING_BLADE') {
        // D) ROTATING BLADE: 4-blade aerodynamic plasma rotor with energy trail arcs
        ctx.save();
        ctx.translate(obs.x, obs.y);
        ctx.rotate(obs.angle);

        ctx.shadowColor = obs.color;
        ctx.shadowBlur = 24 + audioFreq.mids * 16;

        const bladeSpan = obs.width;
        const bladeThick = obs.height;

        // Plasma rotor blades (4 cross blades with tapered aerodynamic wings)
        for (let b = 0; b < 4; b++) {
          ctx.save();
          ctx.rotate((b * Math.PI) / 2);

          // Blade body
          ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
          ctx.strokeStyle = obs.color;
          ctx.lineWidth = 2.5;

          ctx.beginPath();
          ctx.moveTo(0, -bladeThick / 2);
          ctx.lineTo(bladeSpan / 2 - 8, -bladeThick / 3);
          ctx.lineTo(bladeSpan / 2, 0); // Tip
          ctx.lineTo(bladeSpan / 2 - 8, bladeThick / 3);
          ctx.lineTo(0, bladeThick / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Searing cutting edge
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(8, 0);
          ctx.lineTo(bladeSpan / 2, 0);
          ctx.stroke();

          // Plasma energy trail arc behind tip
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.45 + audioFreq.mids * 0.4})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, bladeSpan / 2, -0.35, 0);
          ctx.stroke();

          ctx.restore();
        }

        // Center armored rotor hub
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Strobe beacon in hub
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    // Laser curtains with rhythmic sweep
    for (const laser of lasers) {
      if (laser.x < this.cameraX - 100 || laser.x > this.cameraX + this.width + 100) continue;
      if (laser.alpha <= 0.05) continue;

      const curX = laser.x + laser.sweepOffset;

      ctx.save();
      ctx.strokeStyle = `rgba(250, 204, 21, ${laser.alpha})`;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = laser.active ? 22 : 6;
      ctx.lineWidth = laser.active ? 5.0 : 2;

      // Laser beam line
      ctx.beginPath();
      ctx.moveTo(curX, laser.yTop);
      ctx.lineTo(curX, laser.yBottom);
      ctx.stroke();

      // Core electric white thread
      if (laser.active) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(curX, laser.yTop);
        ctx.lineTo(curX, laser.yBottom);
        ctx.stroke();
      }

      // Laser emitters top and bottom
      ctx.fillStyle = '#facc15';
      ctx.fillRect(curX - 6, laser.yTop - 6, 12, 6);
      ctx.fillRect(curX - 6, laser.yBottom, 12, 6);

      ctx.restore();
    }

    ctx.restore();
  }

  private renderShip(world: PhysicsWorld, isPaused: boolean): void {
    const ctx = this.ctx;
    const ship = world.ship;

    // Emit jet particles when thrusters are active (frozen while paused)
    if (!isPaused) {
      this.emitThrusterParticles(ship);
    }

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    // Flashing invulnerability shimmer
    if (ship.invulnerableTime > 0) {
      const flash = Math.floor(ship.invulnerableTime * 20) % 2 === 0;
      if (flash) ctx.globalAlpha = 0.45;
    }

    // Anti-Gravity Launch Stabilizer Field (during first 2.8s)
    if (world.launchGraceTimer > 0) {
      const graceT = world.launchGraceTimer;
      const pulse = 1.0 + Math.sin(Date.now() * 0.009) * 0.07;
      const fieldRadius = 28 * pulse;

      ctx.save();
      ctx.strokeStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 18;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, fieldRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Outer rotating brackets
      const rot = (Date.now() * 0.0025) % (Math.PI * 2);
      ctx.rotate(rot);
      ctx.setLineDash([]);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 0, fieldRadius + 5, -0.4, 0.4);
      ctx.arc(0, 0, fieldRadius + 5, Math.PI - 0.4, Math.PI + 0.4);
      ctx.stroke();
      ctx.restore();

      // Holographic text banner above ship
      ctx.save();
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.textAlign = 'center';
      ctx.fillText(`ANTI-G [${graceT.toFixed(1)}s]`, 0, -ship.height * 0.95);
      ctx.restore();
    }

    // Phase Shield Energy Bubble — concentric circles for multiple shields
    if (ship.shields > 0) {
      for (let i = 0; i < ship.shields; i++) {
        const shieldPulse = 1.0 + Math.sin(Date.now() * 0.01 + i * 0.7) * 0.06;
        const baseRadius = 24 + i * 3; // 24, 27, 30, 33... (3px a mais que o anterior)
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 14 + i * 4;
        ctx.lineWidth = 2.0;

        ctx.beginPath();
        ctx.arc(0, 0, baseRadius * shieldPulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(56, 189, 248, ${0.08 - i * 0.015})`;
        ctx.fill();
        ctx.restore();
      }
    }

    // Ship Aerodynamic Neon Geometry (Wedge Dart)
    const w = ship.width;
    const h = ship.height;

    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#38bdf8';
    ctx.fillStyle = '#0f172a';

    // Main Hull Polygon
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.65);         // Nose (pointing UP/forward)
    ctx.lineTo(w * 0.5, h * 0.5);      // Right wingtip
    ctx.lineTo(w * 0.25, h * 0.35);    // Right engine notch
    ctx.lineTo(-w * 0.25, h * 0.35);   // Left engine notch
    ctx.lineTo(-w * 0.5, h * 0.5);     // Left wingtip
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Center Cockpit Canopy
    ctx.fillStyle = '#06b6d4';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.15, 4.5, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Left Engine Pod & Active Flame
    const leftPodX = -w * 0.32;
    const rightPodX = w * 0.32;
    const podY = h * 0.38;

    ctx.fillStyle = '#64748b';
    ctx.fillRect(leftPodX - 3, podY, 6, 5);
    ctx.fillRect(rightPodX - 3, podY, 6, 5);

    // Dynamic Left Thruster Jet Flame
    if (!isPaused && ship.leftThrusterPower > 0.05) {
      const p = ship.leftThrusterPower;
      const flameLen = (18 + Math.random() * 14) * p;
      ctx.save();
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(leftPodX - 4, podY + 5);
      ctx.lineTo(leftPodX + 4, podY + 5);
      ctx.lineTo(leftPodX, podY + 5 + flameLen);
      ctx.closePath();
      ctx.fill();

      // White inner jet core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(leftPodX - 2, podY + 5);
      ctx.lineTo(leftPodX + 2, podY + 5);
      ctx.lineTo(leftPodX, podY + 5 + flameLen * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Dynamic Right Thruster Jet Flame
    if (!isPaused && ship.rightThrusterPower > 0.05) {
      const p = ship.rightThrusterPower;
      const flameLen = (18 + Math.random() * 14) * p;
      ctx.save();
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.moveTo(rightPodX - 4, podY + 5);
      ctx.lineTo(rightPodX + 4, podY + 5);
      ctx.lineTo(rightPodX, podY + 5 + flameLen);
      ctx.closePath();
      ctx.fill();

      // White inner jet core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(rightPodX - 2, podY + 5);
      ctx.lineTo(rightPodX + 2, podY + 5);
      ctx.lineTo(rightPodX, podY + 5 + flameLen * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  private emitThrusterParticles(ship: PhysicsWorld['ship']): void {
    const cos = Math.cos(ship.angle);
    const sin = Math.sin(ship.angle);
    const podDist = ship.width * 0.32;
    const podY = ship.height * 0.38;

    // Left Thruster emission (cyan sparks)
    if (ship.leftThrusterPower > 0.08) {
      const count = Math.ceil(ship.leftThrusterPower * 3);
      for (let i = 0; i < count; i++) {
        const localX = -podDist;
        const localY = podY + 6;
        const wx = ship.x + (localX * cos - localY * sin);
        const wy = ship.y + (localX * sin + localY * cos);
        const exhaustAngle = ship.angle + Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        const color = Math.random() > 0.3 ? '#38bdf8' : '#ffffff';

        this.particleSystem.emitExhaust(wx, wy, exhaustAngle, ship.vx, ship.vy, color);
      }
    }

    // Right Thruster emission (magenta sparks)
    if (ship.rightThrusterPower > 0.08) {
      const count = Math.ceil(ship.rightThrusterPower * 3);
      for (let i = 0; i < count; i++) {
        const localX = podDist;
        const localY = podY + 6;
        const wx = ship.x + (localX * cos - localY * sin);
        const wy = ship.y + (localX * sin + localY * cos);
        const exhaustAngle = ship.angle + Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        const color = Math.random() > 0.3 ? '#ec4899' : '#ffffff';

        this.particleSystem.emitExhaust(wx, wy, exhaustAngle, ship.vx, ship.vy, color);
      }
    }
  }

  private renderParticlesAndShockwaves(dt: number): void {
    this.particleSystem.update(dt);
    this.particleSystem.render(this.ctx);
  }

  private renderAudioSpectrumMini(audioFreq: AudioFrequencyData): void {
    const ctx = this.ctx;
    const barCount = 18;
    const barWidth = 3;
    const barGap = 2;
    const startX = 20;
    const startY = this.height - 24;
    const maxHeight = 28;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.fillRect(startX - 6, startY - maxHeight - 6, (barWidth + barGap) * barCount + 12, maxHeight + 16);

    const step = Math.floor(audioFreq.frequencyArray.length / barCount);
    for (let i = 0; i < barCount; i++) {
      const val = audioFreq.frequencyArray[i * step] / 255;
      const h = Math.max(2, val * maxHeight);
      const x = startX + i * (barWidth + barGap);
      const y = startY - h;

      ctx.fillStyle = i < 4 ? '#06b6d4' : i < 11 ? '#ec4899' : '#facc15';
      ctx.fillRect(x, y, barWidth, h);
    }
    ctx.restore();
  }
}
