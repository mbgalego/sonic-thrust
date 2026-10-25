/**
 * Sonic Thrust - Canvas 2D Neon Renderer
 * High-performance 60FPS renderer featuring vector neon terrain, glowing ships,
 * dual thruster exhaust particles, audio-reactive warp grids, and camera smoothing.
 */

import { PhysicsWorld } from '../physics/PhysicsWorld';
import { AudioFrequencyData, PowerUpItem, ObstaclePlatform, LaserGate } from '../types/game';
import { ParticleSystem } from './ParticleSystem';

export interface TemporalTrailSegment {
  lx: number;
  ly: number;
  rx: number;
  ry: number;
  age: number;
  maxAge: number;
  speedRatio: number;
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

  // DeLorean 88 MPH High-Speed Temporal Effects
  private temporalTrail: TemporalTrailSegment[] = [];
  private lastTrailX: number = 0;
  private lastTrailY: number = 0;
  private currentSpeedRatio: number = 0;

  // Persistent continuous gravitational ripple phase accumulator (monotonic, rhythm-synced)
  private ripplePhase: number = 0;

  // Adaptive normalization state for bedrock equalizer waves (persists across frames)
  private eqAvg: number[] = [0.12, 0.12, 0.10, 0.08, 0.06];
  private eqPeak: number[] = [0.5, 0.5, 0.4, 0.35, 0.3];

  // Drop Flash — consumes AudioFrequencyData.energyContrast: full-arena bloom when the music
  // bursts above its own macro baseline (the classic EDM "drop hit" moment).
  private dropFlash: number = 0;              // 0..1 flash envelope (fast rise, ~0.45s decay)
  private dropFlashCooldown: number = 0;      // seconds before another flash may trigger
  private prevEnergyContrast: number = 0;     // rising-edge detection pocket
  private static readonly DROP_FLASH_TRIGGER = 0.62; // cross this to fire
  private static readonly DROP_FLASH_COOLDOWN_S = 1.5; // min seconds between flashes

  // Dynamic Mobile Screen & Viewport Detection + Adaptive Play Area Zoom
  private cameraZoom: number = 1.0;
  private isMobileViewport: boolean = false;

  // Quality setting: 'high' (full effects) or 'low' (reduced particles, lower blur)
  public quality: 'high' | 'low' = 'high';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get Canvas 2D context');
    this.ctx = context;
    this.particleSystem = new ParticleSystem(this.quality === 'low' ? 200 : 450);

    this.resize();
    this.initStars();
  }

  public resize(): void {
    const dpr = this.quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || window.innerWidth;
    this.height = rect.height || window.innerHeight;

    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const isTouch = 'ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
    const isSmall = Math.min(this.width, this.height) < 680;
    this.isMobileViewport = Boolean(isTouch || isSmall || (typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)));
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

  public reset(): void {
    this.temporalTrail = [];
    this.currentSpeedRatio = 0;
    this.lastTrailX = 0;
    this.lastTrailY = 0;
    this.particleSystem.reset();
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

    // Dynamic Mobile Screen Detection & Play Area Framing
    const isTouch = 'ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
    const isSmallScreen = Math.min(w, h) < 680;
    const isMobile = this.isMobileViewport || isTouch || isSmallScreen || (typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    const isPortrait = w < h;

    // Active corridor geometry at ship's current location
    const currentTerrain = world.getTerrainAt(world.ship.x);
    const corridorCenterY = (currentTerrain.ceilY + currentTerrain.floorY) * 0.5;
    const corridorH = Math.max(220, currentTerrain.floorY - currentTerrain.ceilY);

    // Target dynamic zoom & framing
    let targetZoom = 1.0;
    let shipScreenFracX = 0.28;
    let corridorScreenFracY = 0.50;

    if (isMobile || isSmallScreen) {
      if (isPortrait) {
        // Mobile Portrait: screen is narrow & tall (e.g. 390x844).
        // The tunnel flight path is horizontal, so we dynamically zoom out to frame ~640px
        // of world runway ahead, and anchor the ship at 18% of screen width so over 80%
        // is clear reaction lookahead for upcoming bends, obstacles, and gates.
        const zoomW = w / 640;
        const zoomH = h / 960;
        targetZoom = Math.max(0.55, Math.min(0.82, Math.min(zoomW, zoomH)));
        shipScreenFracX = 0.18;
        corridorScreenFracY = 0.50;
      } else {
        // Mobile Landscape: screen is wide & short (e.g. 844x390).
        // Vertical headroom is the most constrained axis. We zoom out so the full play arena
        // (~460-500px: 300px corridor + 150px bedrock equalizer ribbons) fits comfortably
        // between the top HUD controls and bottom thruster telemetry.
        const desiredPlayHeight = Math.max(460, corridorH + 150);
        const zoomH = h / desiredPlayHeight;
        const zoomW = w / 840;
        targetZoom = Math.max(0.58, Math.min(0.92, Math.min(zoomH, zoomW)));
        shipScreenFracX = 0.22;
        corridorScreenFracY = 0.53; // slight downward bias for top HUD clearance
      }
    } else {
      // Desktop / High-res widescreen display: crisp 1:1 scale
      targetZoom = 1.0;
      shipScreenFracX = 0.28;
      corridorScreenFracY = 0.50;
    }

    // Smooth exponential zoom interpolation (prevents jarring snaps on resize or orientation change)
    const zoomDt = isPaused ? 0 : dt;
    this.cameraZoom += (targetZoom - this.cameraZoom) * Math.min(1.0, zoomDt * 8.0 + 0.08);
    const zoom = Math.max(0.4, this.cameraZoom);

    const visibleWorldW = w / zoom;
    const visibleWorldH = h / zoom;

    // Horizontal camera follow: anchors ship at shipScreenFracX of screen width
    const targetCamX = world.ship.x - shipScreenFracX * visibleWorldW;

    // Vertical camera follow: leads the corridor center (70%) and ship (30%)
    // so the camera smoothly anticipates roller-coaster climbs and dips while tracking the craft
    const focusY = corridorCenterY * 0.70 + world.ship.y * 0.30;
    const targetCamY = focusY - corridorScreenFracY * visibleWorldH;

    this.cameraX += (targetCamX - this.cameraX) * 0.14;
    this.cameraY += (targetCamY - this.cameraY) * 0.12;

    // Clamp cameraY so world boundaries don't wrap or get lost
    const minCamY = -60;
    const maxCamY = world.worldHeight - visibleWorldH + 60;
    if (maxCamY > minCamY) {
      this.cameraY = Math.max(minCamY, Math.min(maxCamY, this.cameraY));
    }

    // Clear background
    ctx.fillStyle = '#06070c';
    ctx.fillRect(0, 0, w, h);

    // Advance gravitational ripple phase monotonically (strictly forward in time, synced to music tempo & beat impulses)
    const animDt = isPaused ? 0 : dt;
    const macroE = audioFreq.macroEnergy ?? audioFreq.energy;
    // In quiet breakdowns: ripples drift in a calm, hypnotic glide (0.55 rad/s)
    // In energetic sections & drops: accelerates smoothly up to 3.8 - 4.5 rad/s
    const speedBase = 0.55 + 1.9 * Math.pow(macroE, 1.3);
    const speedImpulse = (audioFreq.subBass || 0) * 1.8 + (audioFreq.beatPulse || 0) * 2.2;
    this.ripplePhase += (speedBase + speedImpulse) * animDt;

    // Drop Flash detection & decay (rising-edge of energyContrast with cooldown to avoid strobing)
    if (!isPaused) {
      const contrast = audioFreq.energyContrast || 0;
      if (this.dropFlashCooldown > 0) this.dropFlashCooldown -= dt;
      if (
        contrast > GameRenderer.DROP_FLASH_TRIGGER &&
        this.prevEnergyContrast <= GameRenderer.DROP_FLASH_TRIGGER &&
        this.dropFlashCooldown <= 0
      ) {
        this.dropFlash = 1.0;
        this.screenShake = Math.max(this.screenShake, 10.0);
        this.dropFlashCooldown = GameRenderer.DROP_FLASH_COOLDOWN_S;
      }
      this.prevEnergyContrast = contrast;
    }
    this.dropFlash *= Math.exp(-(isPaused ? 0 : dt) / 0.45);

    // High-Speed Atmospheric & Temporal Trail Calculation (starts strictly at 500)
    const shipSpeed = Math.hypot(world.ship.vx, world.ship.vy);
    const HIGH_SPEED_MIN = 500;
    const HIGH_SPEED_MAX = 780;
    const targetSpeedRatio = Math.max(0, Math.min(1.0, (shipSpeed - HIGH_SPEED_MIN) / (HIGH_SPEED_MAX - HIGH_SPEED_MIN)));
    this.currentSpeedRatio += (targetSpeedRatio - this.currentSpeedRatio) * (isPaused ? 0 : 0.22);
    this.updateTemporalTrail(world, isPaused ? 0 : dt);

    // Save for world translation with dynamic camera zoom
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-this.cameraX + shakeX / zoom, -this.cameraY + shakeY / zoom);

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
    this.renderTerrain(world, audioFreq, dt);

    // 7. Particles & Shockwaves (frozen while paused)
    this.renderParticlesAndShockwaves(isPaused ? 0 : dt);

    // 7.5. DeLorean High-Speed Fiery Temporal Trail (smoothly dissipating wake)
    this.renderTemporalTrails();

    // 8. Player Ship & Jet Exhausts
    if (!world.ship.isDestroyed) {
      this.renderShip(world, isPaused, audioFreq);
    }

    ctx.restore();

    // 9. Audio Waveform Spectrum Radar (Mini overlay in bottom left corner)
    this.renderAudioSpectrumMini(audioFreq);

    // 10. Drop Flash overlay (last: blooms the whole arena)
    if (this.dropFlash > 0.015) {
      this.renderDropFlashOverlay();
    }
  }

  /**
   * Drop Flash full-arena bloom: additive light burst that engulfs the screen
   * when the music detonates above its macro baseline (the "drop hits" moment).
   */
  private renderDropFlashOverlay(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const maxR = Math.hypot(w, h) * 0.5;
    const a = Math.pow(this.dropFlash, 1.5); // snappy attack, smooth perceptual falloff

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Core bloom from the viewport center
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    core.addColorStop(0, `rgba(190, 240, 255, ${(0.16 * a).toFixed(3)})`);
    core.addColorStop(1, 'rgba(190, 240, 255, 0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, w, h);

    // Edge bloom: bedrock edges ignite outward-in
    const edge = ctx.createRadialGradient(cx, cy, maxR * 0.45, cx, cy, maxR * 1.05);
    edge.addColorStop(0, 'rgba(150, 200, 255, 0)');
    edge.addColorStop(1, `rgba(150, 200, 255, ${(0.20 * a).toFixed(3)})`);
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  private renderBackgroundGrid(world: PhysicsWorld, audioFreq: AudioFrequencyData): void {
    const ctx = this.ctx;
    const visibleW = this.width / this.cameraZoom;
    const visibleH = this.height / this.cameraZoom;

    // Parallax stars
    ctx.fillStyle = '#64748b';
    for (const star of this.backgroundStars) {
      const screenX = (star.x - this.cameraX * star.speed) % (visibleW * 2);
      const drawX = screenX < 0 ? screenX + visibleW * 2 : screenX;
      const drawY = (star.y - this.cameraY * star.speed * 0.3) % (visibleH * 1.5);
      const finalY = drawY < 0 ? drawY + visibleH * 1.5 : drawY;

      ctx.globalAlpha = star.alpha * (0.8 + audioFreq.treble * 0.5);
      ctx.fillRect(this.cameraX + drawX - visibleW * 0.5, this.cameraY + finalY - visibleH * 0.25, star.size, star.size);
    }
    ctx.globalAlpha = 1.0;

    // Perspective neon grid lines
    const gridSpacing = 90;
    const startGridX = Math.floor(this.cameraX / gridSpacing) * gridSpacing;
    const endGridX = startGridX + visibleW + gridSpacing * 2;

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

  private renderTerrain(world: PhysicsWorld, audioFreq: AudioFrequencyData, dt: number): void {
    const ctx = this.ctx;
    const points = world.terrainPoints;
    if (points.length < 2) return;

    // Render visible segments with lookahead padding (scaled by dynamic camera zoom)
    const visibleW = this.width / this.cameraZoom;
    const startX = this.cameraX - 180;
    const endX = this.cameraX + visibleW + 180;

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
    ctx.shadowBlur = (audioFreq.isBeat ? 24 : 8) + (audioFreq.macroEnergy ?? audioFreq.energy) * 16 + audioFreq.bass * 10 + this.dropFlash * 26;
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
    ctx.shadowBlur = (audioFreq.isBeat ? 24 : 8) + (audioFreq.macroEnergy ?? audioFreq.energy) * 16 + audioFreq.bass * 10 + this.dropFlash * 26;
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
    // Multi-layer neon gravitational shockwaves propagating outward into bedrock (above ceiling and below floor),
    // physically modeling concentric ripples radiating away from an impact in still water.
    // Dynamic Energy Architecture:
    // - Quiet Breakdowns (ambient intro/melodic breakdowns): Outer layers sleep in dark rock; primary wave is serene, flat, sleek, and tight.
    // - Buildups & Climaxes: Outer layers progressively awaken and illuminate the bedrock.
    // - Bass Drops & Transients: Massive shockwaves thrust up to 80-100px deep into stone, with explosive neon luminescence and surging tidal crests.
    // Pass 4: Vintage Hi-Fi Graphic Equalizer Waves (5 Frequency Bands in Bedrock)
    // Multi-band undulating equalizer ribbons outside the playable corridor (above ceiling and below floor).
    // Modeled after vintage audio equalizers with responsive multi-frequency LED displays:
    // - Band 0: Sub-Bass (20 - 85 Hz): Deep rolling ocean swell, heaves outward on kicks and sub-drops
    // - Band 1: Punch Bass (85 - 250 Hz): Bounces forcefully with kick drums and basslines
    // - Band 2: Low-Mids (250 - 900 Hz): Harmonic undulating wave driven by synth and chord body
    // - Band 3: High-Mids (900 - 4500 Hz): Spikes with rapid crests & luminous flashes on snares, vocals, claps
    // - Band 4: Treble (4500 - 16000 Hz): High-frequency jitter shimmer reacting to hi-hats, rides, and cymbals
    //
    // Crucially:
    // 1. All 5 bands have distinct baseline spacing into bedrock so they NEVER collapse into one line.
    // 2. Each band's wave amplitude, line thickness, and glow jump dynamically with that band's exact energy.
    // 3. Independent of audible volume/mute: the pre-fader tap ensures the waves always dance at 100% full fidelity!
    const eqBands = [
      {
        name: 'SUB_BASS',
        energy: 0, // computed from raw FFT bins
        ceilColor: '#00f0ff',
        floorColor: '#ef4444',
        spatialFreq: 0.0032,
        speedMult: 0.85,
        baseDist: 14,
        maxAmp: 13,
        phaseOffset: 0,
        // raw bin range for adaptive normalization
        binStart: 1, binEnd: 8
      },
      {
        name: 'BASS',
        energy: 0,
        ceilColor: '#38bdf8',
        floorColor: '#f97316',
        spatialFreq: 0.0062,
        speedMult: 1.05,
        baseDist: 28,
        maxAmp: 12,
        phaseOffset: 0.80,
        binStart: 8, binEnd: 20
      },
      {
        name: 'LOW_MIDS',
        energy: 0,
        ceilColor: '#818cf8',
        floorColor: '#eab308',
        spatialFreq: 0.0105,
        speedMult: 1.25,
        baseDist: 42,
        maxAmp: 11,
        phaseOffset: 1.60,
        binStart: 20, binEnd: 45
      },
      {
        name: 'HIGH_MIDS',
        energy: 0,
        ceilColor: '#c084fc',
        floorColor: '#10b981',
        spatialFreq: 0.0175,
        speedMult: 1.50,
        baseDist: 56,
        maxAmp: 10,
        phaseOffset: 2.40,
        binStart: 45, binEnd: 90
      },
      {
        name: 'TREBLE',
        energy: 0,
        ceilColor: '#f43f5e',
        floorColor: '#06b6d4',
        spatialFreq: 0.0280,
        speedMult: 1.85,
        baseDist: 70,
        maxAmp: 9,
        phaseOffset: 3.20,
        binStart: 90, binEnd: 160
      }
    ];

    // Adaptive normalization state for bedrock waves (persists across frames)
    if (!this.eqAvg) {
      this.eqAvg = [0.12, 0.12, 0.10, 0.08, 0.06];
      this.eqPeak = [0.5, 0.5, 0.4, 0.35, 0.3];
    }

    const beatPulseVal = audioFreq.beatPulse || (audioFreq.isBeat ? 1.0 : 0.0);
    const fa = audioFreq.frequencyArray;

    for (let b = 0; b < eqBands.length; b++) {
      const band = eqBands[b];

      // 1) Raw bin average for this band's frequency range
      let raw = 0;
      const count = Math.max(1, band.binEnd - band.binStart);
      for (let i = band.binStart; i < band.binEnd && i < fa.length; i++) raw += (fa[i] || 0) / 255;
      raw /= count;

      // 2) Adaptive normalization: moving avg baseline + rolling peak
      const avgAlpha = 1.0 - Math.exp(-dt / 2.5); // ~2.5s baseline
      this.eqAvg[b] += (raw - this.eqAvg[b]) * avgAlpha;
      this.eqPeak[b] = Math.max(raw, this.eqPeak[b] * Math.exp(-dt / 1.8));
      const span = Math.max(0.08, this.eqPeak[b] - this.eqAvg[b]);
      const bandE = Math.min(1.0, Math.max(0.0, (raw - this.eqAvg[b]) / span));

      // Dynamic amplitude: idle breathing (2.5px) up to (2.5 + maxAmp) on heavy rhythm hits!
      const beatBoost = (b <= 1 ? beatPulseVal * 8.0 : (b === 3 ? beatPulseVal * 5.0 : 0));
      const dropFlashBoost = this.dropFlash * 6.0; // Arena-wide surge on drop hits
      const amp = 2.5 + bandE * band.maxAmp + beatBoost + dropFlashBoost;

      // Dynamic glow, thickness, and opacity reflecting vintage Hi-Fi equalizer LED meters
      const alpha = Math.max(0.30, Math.min(0.95, 0.35 + bandE * 0.55 + dropFlashBoost * 0.04 + (b === 0 ? 0.08 : 0)));
      const lineWidth = 1.4 + bandE * 2.4 + (b <= 1 ? beatPulseVal * 0.8 : 0) + dropFlashBoost * 0.25;
      const shadowBlur = 4 + bandE * 18 + (audioFreq.isBeat && b <= 1 ? 14 : 0) + this.dropFlash * 24;

      const wavePhase = this.ripplePhase * band.speedMult + band.phaseOffset;

      // --- Ceiling Equalizer Wave (UPWARDS into bedrock above currentCeilY) ---
      ctx.save();
      ctx.strokeStyle = band.ceilColor;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = band.ceilColor;
      ctx.shadowBlur = shadowBlur;
      ctx.lineWidth = lineWidth;

      ctx.beginPath();
      for (let i = firstVisibleIdx; i <= lastVisibleIdx; i++) {
        const curr = points[i];
        // Harmonic synthesis: primary wave + secondary overtone
        const s1 = Math.sin(curr.x * band.spatialFreq - wavePhase);
        const s2 = Math.cos(curr.x * (band.spatialFreq * 0.45) - wavePhase * 0.6) * 0.30;
        const waveY = (s1 + s2) * amp;

        // Guaranteed strictly above ceiling
        const totalOffset = Math.max(8, band.baseDist + waveY);
        const y = curr.currentCeilY - totalOffset;

        if (i === firstVisibleIdx) {
          ctx.moveTo(curr.x, y);
        } else {
          const prev = points[i - 1];
          const prevS1 = Math.sin(prev.x * band.spatialFreq - wavePhase);
          const prevS2 = Math.cos(prev.x * (band.spatialFreq * 0.45) - wavePhase * 0.6) * 0.30;
          const prevWaveY = (prevS1 + prevS2) * amp;
          const prevOffset = Math.max(8, band.baseDist + prevWaveY);
          const prevY = prev.currentCeilY - prevOffset;

          const midX = (prev.x + curr.x) / 2;
          const midY = (prevY + y) / 2;
          ctx.quadraticCurveTo(prev.x, prevY, midX, midY);
        }
      }
      ctx.stroke();
      ctx.restore();

      // --- Floor Equalizer Wave (DOWNWARDS into bedrock below currentFloorY) ---
      ctx.save();
      ctx.strokeStyle = band.floorColor;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = band.floorColor;
      ctx.shadowBlur = shadowBlur;
      ctx.lineWidth = lineWidth;

      ctx.beginPath();
      for (let i = firstVisibleIdx; i <= lastVisibleIdx; i++) {
        const curr = points[i];
        const s1 = Math.sin(curr.x * band.spatialFreq - wavePhase);
        const s2 = Math.cos(curr.x * (band.spatialFreq * 0.45) - wavePhase * 0.6) * 0.30;
        const waveY = (s1 + s2) * amp;

        // Guaranteed strictly below floor
        const totalOffset = Math.max(8, band.baseDist + waveY);
        const y = curr.currentFloorY + totalOffset;

        if (i === firstVisibleIdx) {
          ctx.moveTo(curr.x, y);
        } else {
          const prev = points[i - 1];
          const prevS1 = Math.sin(prev.x * band.spatialFreq - wavePhase);
          const prevS2 = Math.cos(prev.x * (band.spatialFreq * 0.45) - wavePhase * 0.6) * 0.30;
          const prevWaveY = (prevS1 + prevS2) * amp;
          const prevOffset = Math.max(8, band.baseDist + prevWaveY);
          const prevY = prev.currentFloorY + prevOffset;

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
    const visibleW = this.width / this.cameraZoom;
    ctx.save();

    for (const p of powerUps) {
      if (p.collected) continue;
      if (p.x < this.cameraX - 160 || p.x > this.cameraX + visibleW + 160) continue;

      const terrain = world.getTerrainAt(p.x);

      // 1. Friendly Vertical Light Column (Ceiling to Floor) - Instantly distinguishes collectibles from hazards!
      ctx.save();
      const colGrad = ctx.createLinearGradient(0, terrain.ceilY, 0, terrain.floorY);
      colGrad.addColorStop(0, 'rgba(0, 240, 255, 0.02)');
      colGrad.addColorStop(0.5, `${p.color}26`);
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

      } else if (p.type === 'INVULNERABLE') {
        // D) INVULNERABLE: Crimson neon shield core — rotating hexagon barrier + orbiting sigils + blazing core
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 24 + (audioFreq.isBeat ? 22 : 0);
        ctx.rotate(p.orbitAngle);

        // Outer rotating hexagon barrier (neon glow fill)
        ctx.beginPath();
        for (let a = 0; a < 6; a++) {
          const angle = (a * Math.PI) / 3 + p.pulsePhase * 0.8;
          const hx = Math.cos(angle) * rad * 0.85;
          const hy = Math.sin(angle) * rad * 0.85;
          if (a === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 0, 85, 0.25)';
        ctx.fill();

        // Counter-rotating inner spin ring
        ctx.rotate(-p.orbitAngle * 2.2);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, rad * 0.5, 0, Math.PI * 2);
        ctx.stroke();

        // 4 orbiting sigils with comet trails
        for (let s = 0; s < 4; s++) {
          const sAngle = p.pulsePhase * 2 + (s * Math.PI * 2) / 4;
          const sigilRad = rad * 0.65 + Math.sin(Date.now() * 0.005 + s * 1.3) * 3;
          const sx = Math.cos(sAngle) * sigilRad;
          const sy = Math.sin(sAngle) * sigilRad;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sx * 0.55, sy * 0.55);
          ctx.lineTo(sx, sy);
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Blazing white-hot core
        ctx.fillStyle = '#fff';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(0, 0, 5.5 + (audioFreq.bass * 2.5), 0, Math.PI * 2);
        ctx.fill();

      } else if (p.type === 'ETHEREAL') {
        // E) ETHEREAL: Violet neon ghost prism — dashed glowing ring + orbiting wisps + spectral core
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 5]);
        ctx.lineDashOffset = -p.pulsePhase * 14;
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(168, 85, 247, 0.22)';
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, Math.PI * 2);
        ctx.fill();

        // Inner spectral wave ribbon
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let w = -rad * 0.6; w <= rad * 0.6; w += 3) {
          const wy = Math.sin(w * 0.35 + p.pulsePhase * 3.2) * (rad * 0.28);
          if (w === -rad * 0.6) ctx.moveTo(w, wy);
          else ctx.lineTo(w, wy);
        }
        ctx.stroke();

        // 3 orbiting ghost wisps with glow trails
        for (let s = 0; s < 3; s++) {
          const sAngle = p.orbitAngle * 1.4 + (s * Math.PI * 2) / 3;
          const wx = Math.cos(sAngle) * (rad + 7);
          const wy = Math.sin(sAngle) * (rad + 7);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(wx, wy, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(wx, wy, 6.5 + Math.sin(Date.now() * 0.008 + s) * 2, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Spectral core — white-violet pulsing eye
        ctx.fillStyle = '#faf5ff';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 26 + (audioFreq.bass * 10);
        ctx.beginPath();
        ctx.arc(0, 0, 4 + (audioFreq.bass * 2), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(168, 85, 247, 0.85)';
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.fill();

      } else if (p.type === 'PULSE') {
        // F) PULSE: concentric sonic rings — double oscillating shockwave emblem + cyan core
        ctx.strokeStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, rad * (0.9 + Math.sin(Date.now() * 0.006) * 0.10), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, rad * (1.25 + Math.sin(Date.now() * 0.006 + 1.2) * 0.14), 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, rad * (0.55 + Math.cos(Date.now() * 0.008) * 0.08), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Spokes (sound propagation ticks)
        for (let s = 0; s < 8; s++) {
          const a = (s * Math.PI * 2) / 8 + p.orbitAngle * 0.6;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.4 + 0.4 * Math.abs(Math.sin(p.pulsePhase * 1.5 + s));
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * rad * 1.05, Math.sin(a) * rad * 1.05);
          ctx.lineTo(Math.cos(a) * rad * 1.34, Math.sin(a) * rad * 1.34);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Resonant cyan-white core
        ctx.fillStyle = '#e0ffff';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 24 + (audioFreq.bass * 14);
        ctx.beginPath();
        ctx.arc(0, 0, 4.5 + (audioFreq.bass * 2.4) + Math.sin(Date.now() * 0.012) * 1, 0, Math.PI * 2);
        ctx.fill();

      } else if (p.type === 'CHRONO_DILATION') {
        // G) CHRONO DILATION: Temporal matrix clock with ticking dial ticks & hourglass aura
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(0, 0, rad * 0.85, 0, Math.PI * 2);
        ctx.stroke();

        // 12 clock ticks
        for (let t = 0; t < 12; t++) {
          const a = (t * Math.PI * 2) / 12;
          ctx.lineWidth = t % 3 === 0 ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * rad * 0.7, Math.sin(a) * rad * 0.7);
          ctx.lineTo(Math.cos(a) * rad * 0.85, Math.sin(a) * rad * 0.85);
          ctx.stroke();
        }

        // Rotating clock hands
        const tAngle = Date.now() * 0.004;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(tAngle) * rad * 0.55, Math.sin(tAngle) * rad * 0.55);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

      } else if (p.type === 'SINGULARITY') {
        // H) SINGULARITY: Event horizon gravitational vortex with cosmic spiral & dark void
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 24;

        // Spiral accretion swirl
        ctx.beginPath();
        const spin = -Date.now() * 0.008;
        for (let a = 0; a <= 36; a++) {
          const theta = (a / 36) * Math.PI * 4 + spin;
          const r = (a / 36) * rad * 0.9;
          const px = Math.cos(theta) * r;
          const py = Math.sin(theta) * r;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Dark central void
        ctx.fillStyle = '#090514';
        ctx.beginPath();
        ctx.arc(0, 0, rad * 0.42, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
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
      const label =
        p.type === 'SHIELD' ? 'ESCUDO' :
        p.type === 'DAMPER' ? 'DAMPER' :
        p.type === 'LOW_G' ? 'LOW-G' :
        p.type === 'PULSE' ? 'PULSO' :
        p.type === 'ETHEREAL' ? 'FANTASMA' :
        p.type === 'INVULNERABLE' ? 'IMUNE' :
        p.type === 'CHRONO_DILATION' ? 'CRONO' :
        'SINGULARIDADE';
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
    const visibleW = this.width / this.cameraZoom;
    ctx.save();

    for (const obs of obstacles) {
      if (obs.disabled) continue; // neutralized by a sonic pulse
      if (obs.x < this.cameraX - 160 || obs.x > this.cameraX + visibleW + 160) continue;

      const terrain = world.getTerrainAt(obs.x);

      if (obs.type === 'VU_TOWER') {
        // A) PILAR DE EQUALIZADOR VU: Segmented retro-LED graphic equalizer column bursting to bass drops
        const reach = obs.maxExtensionHeight * obs.extension;
        const w = obs.width;
        const isCeil = obs.isCeiling;
        const baseY = isCeil ? terrain.ceilY : terrain.floorY;
        const tipY = isCeil ? baseY + reach : baseY - reach;

        ctx.save();
        // 1. Sleek acrylic chassis casing — tinted with this tower's band color so
        //    cluster members are instantly distinguishable (cyan bass vs violet mids...)
        const casingTop = isCeil ? baseY : baseY - reach - 4;
        const casingHeight = reach + 6;
        const bandColor = obs.color ?? '#10b981';
        ctx.fillStyle = '#0a0a14';
        ctx.strokeStyle = bandColor;
        ctx.shadowColor = bandColor;
        ctx.shadowBlur = obs.active ? 16 : 6;
        ctx.lineWidth = 1.8;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(obs.x - w / 2, casingTop, w, casingHeight, 4);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(obs.x - w / 2, casingTop, w, casingHeight);
          ctx.strokeRect(obs.x - w / 2, casingTop, w, casingHeight);
        }

        // 2. Segmented LED Bars
        const segHeight = 6;
        const segGap = 3;
        const totalSegments = Math.max(3, Math.floor((reach - 4) / (segHeight + segGap)));

        for (let s = 0; s < totalSegments; s++) {
          const segProgress = s / totalSegments; // 0 (near base) to 1 (near tip)
          const segY = isCeil 
            ? baseY + 4 + s * (segHeight + segGap)
            : baseY - 4 - (s + 1) * (segHeight + segGap);

          // Vintage Hi-Fi 3-Color Gradient: Green -> Amber -> Peak Red
          let segColor = '#22c55e';
          if (segProgress > 0.82) {
            segColor = '#ef4444'; // Red CLIP
          } else if (segProgress > 0.55) {
            segColor = '#eab308'; // Amber MID
          }

          ctx.fillStyle = segColor;
          ctx.shadowColor = segColor;
          ctx.shadowBlur = obs.active ? 10 : 3;
          ctx.fillRect(obs.x - w / 2 + 4, segY, w - 8, segHeight);

          // White inner LED core highlight
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fillRect(obs.x - w / 2 + 7, segY + 1.5, (w - 14) * 0.45, 1.5);
        }

        // 3. Peak Overload Clip LED at the dangerous tip
        if (reach > 14) {
          ctx.fillStyle = '#ff0055';
          ctx.shadowColor = '#ff0055';
          ctx.shadowBlur = obs.active ? 20 : 8;
          const peakY = isCeil ? tipY - 4 : tipY;
          ctx.fillRect(obs.x - w / 2 + 2, peakY, w - 4, 4);

        }

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

    // Laser Energy Beams: concentrated semi-oval plasma traveling floor→ceiling and back.
    // Deliberately ill-defined: layered soft blobs instead of crisp outlines, with stacked
    // sine harmonics breathing the radii so the boundary never reads as a defined shape.
    for (const laser of lasers) {
      if (laser.x < this.cameraX - 160 || laser.x > this.cameraX + visibleW + 160) continue;
      if (laser.alpha <= 0.05) continue;

      const curX = laser.x + laser.sweepOffset;
      const coreY = laser.beamCenter;
      const halfH = laser.beamHalf;
      const tNow = Date.now();

      // Two slow breathing harmonics give every blob its own unstable rhythm
      const w1 = Math.sin(tNow * 0.0035 + laser.pulsePhase * 1.7);
      const w2 = Math.sin(tNow * 0.0021 + laser.pulsePhase * 0.8 + 2.1);
      const w3 = Math.sin(tNow * 0.0047 + laser.pulsePhase * 2.6);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const blob = (x: number, y: number, rx: number, ry: number, a: number): void => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
        g.addColorStop(0, `rgba(250, 204, 21, ${a.toFixed(3)})`);
        g.addColorStop(0.45, `rgba(250, 204, 21, ${(a * 0.55).toFixed(3)})`);
        g.addColorStop(1, 'rgba(250, 204, 21, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
        ctx.fill();
      };

      // 1. Ambient aura: barely-there outer haze with drifting center
      blob(curX + w2 * 5, coreY + w1 * 6, 26 + w2 * 5, halfH * 1.95 * (1 + w3 * 0.05), laser.alpha * 0.14);

      // 2. Body: three overlapping fuzzy ovals at slightly offset centers/heights
      blob(curX + w1 * 2.5, coreY, 13 + w1 * 2.5, halfH * 1.04 + w2 * 6, laser.alpha * 0.28);
      blob(curX + w2 * 2, coreY - halfH * 0.2, 10 + w2 * 2, halfH * 0.70 + w1 * 5, laser.alpha * 0.23);
      blob(curX - w1 * 2, coreY + halfH * 0.22, 10 + w1 * 2, halfH * 0.58 + w2 * 4, laser.alpha * 0.20);

      // 3. Hot spine: narrow bright core that slides along the axis
      blob(
        curX + w3 * 1.5,
        coreY + Math.sin(tNow * 0.005) * halfH * 0.08,
        5 + w1 * 1.3,
        halfH * 0.48 + w2 * 3,
        laser.alpha * (laser.active ? 0.55 : 0.25)
      );

      // 4. Loose plasma granulation: specks drifting along the beam (softer, hotter)
      for (let k = 0; k < 5; k++) {
        const p = laser.pulsePhase * 1.3 + k * 2.4 + tNow * 0.0009 * (k % 2 === 0 ? 1 : -1);
        const py = coreY + Math.sin(p) * halfH * 0.85;
        const px = curX + Math.cos(p * 1.7) * (5 + k * 2.2);
        blob(px, py, 4 + (k % 2) * 3, 7 + Math.abs(Math.sin(p * 0.6)) * 5, laser.alpha * 0.16);
      }

      // 5. Faint travel rails (telegraph of the beam's vertical path)
      ctx.strokeStyle = `rgba(250, 204, 21, ${(laser.alpha * 0.15).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 13]);
      ctx.beginPath();
      ctx.moveTo(curX, laser.yTop - 4);
      ctx.lineTo(curX, laser.yBottom + 4);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
    }

    // Sonic Pulse shockwave: expanding double ring + core flare around the pickup point
    if (world.sonicPulseWave) {
      const wave = world.sonicPulseWave;
      const progress = Math.min(1, wave.r / wave.maxR);
      const fade = 1 - Math.pow(progress, 1.6);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 18;
      ctx.globalAlpha = 0.75 * fade;
      ctx.lineWidth = 4.5 * (1 - progress * 0.4);
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.4 * fade;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.r * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.r * 0.55, 0, Math.PI * 2);
      ctx.stroke();

      // Fading core flare at wave origin
      const g = ctx.createRadialGradient(wave.x, wave.y, 0, wave.x, wave.y, 40);
      g.addColorStop(0, `rgba(0, 240, 255, ${(0.35 * fade).toFixed(3)})`);
      g.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Cosmic Singularity EMP Shockwave (EXTREME Tier): expanding deep purple event horizon
    if (world.singularityWave) {
      const wave = world.singularityWave;
      const progress = Math.min(1, wave.r / wave.maxR);
      const fade = 1 - Math.pow(progress, 1.4);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#c084fc';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 24;
      ctx.globalAlpha = 0.85 * fade;
      ctx.lineWidth = 6.0 * (1 - progress * 0.4);
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.r, 0, Math.PI * 2);
      ctx.stroke();

      // Inner gravitational suction rings
      ctx.globalAlpha = 0.5 * fade;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.r * 0.85, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.r * 0.65, 0, Math.PI * 2);
      ctx.stroke();

      // Dark matter core
      const g = ctx.createRadialGradient(wave.x, wave.y, 0, wave.x, wave.y, 60);
      g.addColorStop(0, `rgba(192, 132, 252, ${(0.45 * fade).toFixed(3)})`);
      g.addColorStop(1, 'rgba(192, 132, 252, 0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  private renderShip(world: PhysicsWorld, isPaused: boolean, _audioFreq?: AudioFrequencyData): void {
    const ctx = this.ctx;
    const ship = world.ship;

    // Emit jet particles when thrusters are active (frozen while paused)
    if (!isPaused) {
      this.emitThrusterParticles(ship);
    }

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    // Flashing invulnerability shimmer (clean and intuitive)
    if (ship.invulnerableTime > 0) {
      const flash = Math.floor(ship.invulnerableTime * 20) % 2 === 0;
      if (flash) ctx.globalAlpha = 0.40;
    }

    // Ethereal Ghost Mode: reduced craft opacity with crisp silhouette
    const isEthereal = ship.etherealActiveTimer > 0;
    if (isEthereal) {
      ctx.globalAlpha = (ctx.globalAlpha ?? 1.0) * 0.55;
    }

    // 1. Anti-Gravity Launch Stabilizer Field (during first 2.8s)
    if (world.launchGraceTimer > 0) {
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
    }

    // 2. Phase Shield Energy Bubble — concentric circles for multiple shields
    if (ship.shields > 0) {
      for (let i = 0; i < ship.shields; i++) {
        const shieldPulse = 1.0 + Math.sin(Date.now() * 0.01 + i * 0.7) * 0.06;
        const baseRadius = 24 + i * 3;
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

    // 3. Sonic Damper Active Acoustic Absorption Cushion (PRO / EXTREME)
    if (ship.damperActiveTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 1.5;
      const damperOsc = Math.sin(Date.now() * 0.015) * 2;
      ctx.beginPath();
      ctx.arc(0, 0, 27 + damperOsc, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Chrono Dilation: slow-motion temporal halo
    if (ship.chronoDilationTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#14b8a6';
      ctx.shadowColor = '#14b8a6';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.lineDashOffset = (Date.now() * 0.004);
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Ship Aerodynamic Neon Geometry (Wedge Dart)
    const w = ship.width;
    const h = ship.height;

    // Palette & Styling:
    // When in Ethereal Ghost Mode: pulsing cyan neon border + reduced opacity ensuring distinct silhouette!
    let hullStroke = '#38bdf8';
    let hullFill = '#0f172a';
    let hullGlow = '#06b6d4';
    let cockpitColor = '#06b6d4';
    let hullLineWidth = 2.5;

    if (isEthereal) {
      const cyanPulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.009);
      hullStroke = '#00f0ff';
      hullFill = 'rgba(6, 182, 212, 0.22)';
      hullGlow = '#00f0ff';
      cockpitColor = '#00f0ff';
      hullLineWidth = 2.8;
      ctx.shadowBlur = 14 + cyanPulse * 14;
    } else {
      ctx.shadowBlur = 12;
    }

    ctx.shadowColor = hullGlow;
    ctx.lineWidth = hullLineWidth;
    ctx.strokeStyle = hullStroke;
    ctx.fillStyle = hullFill;

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
    ctx.fillStyle = cockpitColor;
    ctx.shadowColor = cockpitColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.15, 4.5, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Left Engine Pod & Active Flame
    const leftPodX = -w * 0.32;
    const rightPodX = w * 0.32;
    const podY = h * 0.38;

    ctx.fillStyle = isEthereal ? '#0284c7' : '#64748b';
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

    // 5. Hypersonic Atmospheric Bow Shock Wave & Compression Plasma (speeds > 500)
    if (this.currentSpeedRatio > 0.04) {
      this.renderAtmosphericFrontEffect(ship, this.currentSpeedRatio);
    }

    ctx.restore();
  }

  /**
   * Updates and emits twin temporal trails behind the craft at high speed
   */
  private updateTemporalTrail(world: PhysicsWorld, dt: number): void {
    const ship = world.ship;

    // Age existing trail segments
    if (dt > 0) {
      for (let i = this.temporalTrail.length - 1; i >= 0; i--) {
        this.temporalTrail[i].age += dt;
        if (this.temporalTrail[i].age >= this.temporalTrail[i].maxAge) {
          this.temporalTrail.splice(i, 1);
        }
      }
    }

    if (this.currentSpeedRatio < 0.04 || ship.isDestroyed) {
      return;
    }

    // Emit new twin track coordinates when moving at high speeds
    const distSq = (ship.x - this.lastTrailX) ** 2 + (ship.y - this.lastTrailY) ** 2;
    if (distSq >= 6 * 6) {
      const cos = Math.cos(ship.angle);
      const sin = Math.sin(ship.angle);
      const podDist = ship.width * 0.35;
      const podY = ship.height * 0.36;

      const lx = ship.x + (-podDist * cos - podY * sin);
      const ly = ship.y + (-podDist * sin + podY * cos);
      const rx = ship.x + (podDist * cos - podY * sin);
      const ry = ship.y + (podDist * sin + podY * cos);

      this.temporalTrail.push({
        lx,
        ly,
        rx,
        ry,
        age: 0,
        maxAge: 1.35 + this.currentSpeedRatio * 0.55,
        speedRatio: this.currentSpeedRatio
      });

      this.lastTrailX = ship.x;
      this.lastTrailY = ship.y;

      // Keep array memory bounded
      if (this.temporalTrail.length > 250) {
        this.temporalTrail.shift();
      }

      // Shed glowing incandescent embers into particle system along the wake
      if (this.currentSpeedRatio > 0.3 && Math.random() < 0.42) {
        const emberColor = Math.random() > 0.4 ? '#facc15' : (Math.random() > 0.5 ? '#ff3300' : '#00f0ff');
        const driftVx = -ship.vx * 0.22 + (Math.random() - 0.5) * 45;
        const driftVy = (Math.random() - 0.5) * 45;
        this.particleSystem.emitTemporalSpark(
          Math.random() > 0.5 ? lx : rx,
          Math.random() > 0.5 ? ly : ry,
          driftVx,
          driftVy,
          emberColor,
          1.8 + Math.random() * 2.2,
          0.3 + Math.random() * 0.4
        );
      }
    }
  }

  /**
   * Renders the iconic DeLorean twin burning fiery tire / plasma tracks that smoothly dissipate
   */
  private renderTemporalTrails(): void {
    if (this.temporalTrail.length < 2) return;
    const ctx = this.ctx;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < this.temporalTrail.length; i++) {
      const p0 = this.temporalTrail[i - 1];
      const p1 = this.temporalTrail[i];

      // Guard against teleport / world wrap gaps
      const segDist = Math.hypot(p1.lx - p0.lx, p1.ly - p0.ly);
      if (segDist > 80) continue;

      const avgAge = (p0.age + p1.age) * 0.5;
      const avgMaxAge = (p0.maxAge + p1.maxAge) * 0.5;
      const progress = Math.min(1.0, avgAge / avgMaxAge);
      // Smooth exponential dissipation curve — seamless fading with no abrupt cuts
      const fade = Math.pow(1.0 - progress, 1.35);
      const intensity = (p0.speedRatio + p1.speedRatio) * 0.5;
      const alpha = fade * (0.25 + 0.75 * intensity);

      if (alpha <= 0.015) continue;

      const baseWidth = 2.8 + intensity * 2.2;

      // Pass 1: Wide fiery plasma dissipation aura (diffuses outward as it ages)
      ctx.strokeStyle = `rgba(255, 65, 0, ${alpha * 0.42})`;
      ctx.lineWidth = baseWidth * 3.4;
      ctx.shadowBlur = 14 + intensity * 8;
      ctx.shadowColor = progress < 0.45 ? '#ff4400' : '#ec4899';
      ctx.beginPath();
      ctx.moveTo(p0.lx, p0.ly);
      ctx.lineTo(p1.lx, p1.ly);
      ctx.moveTo(p0.rx, p0.ry);
      ctx.lineTo(p1.rx, p1.ry);
      ctx.stroke();

      // Pass 2: Hot electric amber / incandescent body
      ctx.strokeStyle = `rgba(255, 175, 20, ${alpha * 0.85})`;
      ctx.lineWidth = baseWidth * 1.8;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#facc15';
      ctx.beginPath();
      ctx.moveTo(p0.lx, p0.ly);
      ctx.lineTo(p1.lx, p1.ly);
      ctx.moveTo(p0.rx, p0.ry);
      ctx.lineTo(p1.rx, p1.ry);
      ctx.stroke();

      // Pass 3: Searing white-hot temporal core
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
      ctx.lineWidth = Math.max(1.0, baseWidth * 0.7);
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(p0.lx, p0.ly);
      ctx.lineTo(p1.lx, p1.ly);
      ctx.moveTo(p0.rx, p0.ry);
      ctx.lineTo(p1.rx, p1.ry);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Renders the Hypersonic Atmospheric Bow Shock Wave & Compression Plasma Cushion
   * Simulates atmospheric entry / supersonic compression cone ahead of the craft at speeds > 500
   */
  private renderAtmosphericFrontEffect(ship: PhysicsWorld['ship'], speedRatio: number): void {
    const ctx = this.ctx;
    const w = ship.width;
    const h = ship.height;
    const noseY = -h * 0.65;
    const time = Date.now() * 0.001;

    ctx.save();

    // 1. Aerodynamic Stagnation Compression Cushion (Glowing thermal plasma on the nosecone)
    const cushionRadius = (7 + Math.sin(time * 18) * 1.5) * (0.8 + speedRatio * 0.6);
    const cushionGrad = ctx.createRadialGradient(0, noseY + 2, 0, 0, noseY + 2, cushionRadius * 2.2);
    cushionGrad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1.0, 0.95 * speedRatio)})`);
    cushionGrad.addColorStop(0.3, `rgba(0, 240, 255, ${Math.min(1.0, 0.85 * speedRatio)})`);
    cushionGrad.addColorStop(0.65, `rgba(56, 189, 248, ${0.4 * speedRatio})`);
    cushionGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');

    ctx.fillStyle = cushionGrad;
    ctx.beginPath();
    ctx.arc(0, noseY + 2, cushionRadius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // 2. Primary Hypersonic Bow Shock Wave (Curved aerodynamic compression envelope wrapping the prow)
    const bowStandOff = 8 + speedRatio * 14 + Math.sin(time * 24) * 1.2;
    const wingSweepY = noseY + h * 0.75;
    const wingSweepX = w * 0.85 + speedRatio * 6;

    // Outer vapor envelope (cyan atmospheric glow)
    ctx.save();
    ctx.strokeStyle = `rgba(0, 240, 255, ${Math.min(0.9, 0.45 + speedRatio * 0.45)})`;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12 + speedRatio * 12;
    ctx.lineWidth = 3.2 + speedRatio * 2.0;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-wingSweepX, wingSweepY);
    ctx.quadraticCurveTo(0, noseY - bowStandOff, wingSweepX, wingSweepY);
    ctx.stroke();

    // Inner searing sonic barrier crest (white-hot leading compression line)
    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1.0, 0.85 + speedRatio * 0.15)})`;
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#ffffff';
    ctx.lineWidth = 1.4 + speedRatio * 0.8;
    ctx.beginPath();
    ctx.moveTo(-wingSweepX * 0.92, wingSweepY - 4);
    ctx.quadraticCurveTo(0, noseY - bowStandOff + 1.5, wingSweepX * 0.92, wingSweepY - 4);
    ctx.stroke();
    ctx.restore();

    // 3. Secondary Outer Prandtl-Glauert Vapor Condensation Waves (Expanding compression pulses)
    const shockPulseCount = 2;
    for (let sp = 0; sp < shockPulseCount; sp++) {
      const pulsePhase = ((Date.now() * 0.06 + sp * 24) % 48);
      const pulseT = pulsePhase / 48; // 0..1
      const pulseAlpha = Math.pow(1 - pulseT, 1.4) * speedRatio * 0.55;
      if (pulseAlpha <= 0.02) continue;

      const pStandOff = bowStandOff + pulsePhase * 0.7;
      const pSpreadX = wingSweepX + pulsePhase * 0.9;
      const pSpreadY = wingSweepY + pulsePhase * 0.4;

      ctx.save();
      ctx.strokeStyle = `rgba(56, 189, 248, ${pulseAlpha})`;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-pSpreadX, pSpreadY);
      ctx.quadraticCurveTo(0, noseY - pStandOff, pSpreadX, pSpreadY);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Aerodynamic Mach Vapor Streamlines (High-speed air streamlines along the flanks)
    const streamlineCount = Math.floor(4 + speedRatio * 4);
    ctx.save();
    ctx.lineCap = 'round';
    for (let sl = 0; sl < streamlineCount; sl++) {
      const side = sl % 2 === 0 ? -1 : 1;
      const t = (sl / streamlineCount);
      const startX = side * (w * 0.15 + t * w * 0.45);
      const startY = noseY + 4 + t * (h * 0.4);
      const streamLen = (18 + Math.random() * 22) + speedRatio * 32;
      const streamAlpha = (0.25 + 0.65 * speedRatio) * (0.6 + Math.random() * 0.4);

      ctx.strokeStyle = sl % 3 === 0 ? `rgba(255, 255, 255, ${streamAlpha})` : `rgba(0, 240, 255, ${streamAlpha * 0.8})`;
      ctx.lineWidth = 1.0 + Math.random() * 1.2;
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + side * (3 + t * 4), startY + streamLen);
      ctx.stroke();
    }
    ctx.restore();

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
    const isMobilePortrait = this.width < 520;

    const barCount = isMobilePortrait ? 8 : (this.width < 720 ? 10 : 16);
    const barWidth = isMobilePortrait ? 3 : 4;
    const barGap = isMobilePortrait ? 2 : 3;
    const totalBarsWidth = barCount * barWidth + (barCount - 1) * barGap;

    // Position calculations:
    // On mobile portrait, place in the bottom-right corner safely away from the bottom-left velocity gauge.
    let startX: number;
    let startY: number;
    let maxHeight: number;

    if (isMobilePortrait) {
      startX = this.width - totalBarsWidth - 14;
      maxHeight = 24;
      startY = this.height - 12;
    } else {
      const containerW = Math.min(this.width, 1024);
      const containerOffsetX = (this.width - containerW) / 2;
      startX = containerOffsetX + containerW - totalBarsWidth - 20;
      maxHeight = 32;
      startY = this.height - 20;
    }

    const segH = isMobilePortrait ? 2.5 : 3;
    const segGap = isMobilePortrait ? 1.2 : 1.5;
    const maxSegments = Math.floor(maxHeight / (segH + segGap));

    ctx.save();
    // Glass HUD chassis
    ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1;
    const padX = isMobilePortrait ? 6 : 8;
    const padTop = isMobilePortrait ? 14 : 18;
    const padBottom = isMobilePortrait ? 6 : 8;

    ctx.fillRect(startX - padX, startY - maxHeight - padTop, totalBarsWidth + padX * 2, maxHeight + padTop + padBottom);
    ctx.strokeRect(startX - padX, startY - maxHeight - padTop, totalBarsWidth + padX * 2, maxHeight + padTop + padBottom);

    // Header label
    ctx.font = isMobilePortrait ? 'bold 7px Orbitron, monospace' : 'bold 8px Orbitron, monospace';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.fillText(isMobilePortrait ? 'HI-FI EQ' : 'HI-FI EQUALIZER', startX - 2, startY - maxHeight - (isMobilePortrait ? 5 : 8));

    const step = Math.max(1, Math.floor(audioFreq.frequencyArray.length / barCount));
    for (let i = 0; i < barCount; i++) {
      // Tilting boost across spectrum bins so higher frequencies have equal visual presence
      const boost = 1.0 + (i / barCount) * 1.5;
      const rawVal = (audioFreq.frequencyArray[i * step] || 0) / 255;
      const val = Math.min(1.0, rawVal * boost);
      const activeSegs = Math.max(1, Math.round(val * maxSegments));
      const x = startX + i * (barWidth + barGap);

      for (let s = 0; s < maxSegments; s++) {
        const segY = startY - (s + 1) * (segH + segGap);
        const isActive = s < activeSegs;

        if (isActive) {
          // Classic vintage Hi-Fi LED colors: Green base, Amber mids, Crimson peak
          const ratio = s / maxSegments;
          ctx.fillStyle = ratio > 0.78 ? '#ef4444' : ratio > 0.50 ? '#f59e0b' : '#10b981';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = ratio > 0.78 ? 5 : 2;
        } else {
          // Dim inactive LED segment
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.shadowBlur = 0;
        }

        ctx.fillRect(x, segY, barWidth, segH);
      }
    }
    ctx.restore();
  }
}
