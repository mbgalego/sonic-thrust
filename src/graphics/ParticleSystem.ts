/**
 * Sonic Thrust - Dedicated Particle & Cinematic VFX System
 * Handles wall scrape sparks, friction debris, thruster exhaust, explosions,
 * shockwaves, and near-miss danger feedback.
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'SPARK' | 'DEBRIS' | 'SMOKE' | 'EXHAUST' | 'ENERGY';
  drag: number;
  gravity: number;
  bounces?: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  lineWidth: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private shockwaves: Shockwave[] = [];
  private maxParticles: number = 400;

  constructor(maxParticles: number = 400) {
    this.maxParticles = maxParticles;
  }

  public reset(): void {
    this.particles = [];
    this.shockwaves = [];
  }

  /**
   * Generates cinematic wall scrape sparks and hot friction debris
   * when the ship grazes the ceiling or floor without colliding.
   * @param scrapeX - Point of closest contact on the wall
   * @param scrapeY - Y coordinate of the wall surface
   * @param shipVx - Ship forward velocity
   * @param isCeiling - true if scraping ceiling, false if scraping floor
   * @param intensity - 0.0 (just inside danger zone) to 1.0 (extreme close shave)
   */
  public emitWallScrape(
    scrapeX: number,
    scrapeY: number,
    shipVx: number,
    isCeiling: boolean,
    intensity: number
  ): void {
    const clampedIntensity = Math.max(0.1, Math.min(1.0, intensity));
    const sparkCount = Math.floor(2 + clampedIntensity * 7);

    // Color palette: searing white hot -> electric amber -> neon orange -> friction spark
    const sparkColors = ['#ffffff', '#fef08a', '#facc15', '#fb923c', '#f43f5e'];

    for (let i = 0; i < sparkCount; i++) {
      if (this.particles.length >= this.maxParticles) break;

      // Friction sparks spray backwards from the contact point with physics spread
      const sprayAngle = Math.PI + (Math.random() - 0.5) * 0.75 + (isCeiling ? 0.35 : -0.35);
      const speed = (180 + Math.random() * 320) * (0.6 + clampedIntensity * 0.8);
      
      const vx = Math.cos(sprayAngle) * speed + shipVx * 0.3;
      const vy = Math.sin(sprayAngle) * speed;

      this.particles.push({
        x: scrapeX + (Math.random() - 0.5) * 8,
        y: scrapeY + (isCeiling ? 2 : -2),
        vx,
        vy,
        life: 0,
        maxLife: 0.15 + Math.random() * 0.35,
        size: 1.5 + Math.random() * 2.8 * clampedIntensity,
        color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
        type: 'SPARK',
        drag: 0.94,
        gravity: isCeiling ? 180 : -80 // Sparks bounce down from ceiling or arc up from floor
      });
    }

    // Occasional heavier incandescent debris chunks
    if (Math.random() < 0.35 * clampedIntensity && this.particles.length < this.maxParticles) {
      const debrisAngle = Math.PI + (Math.random() - 0.5) * 0.9;
      const debrisSpeed = 90 + Math.random() * 190;
      this.particles.push({
        x: scrapeX,
        y: scrapeY,
        vx: Math.cos(debrisAngle) * debrisSpeed + shipVx * 0.2,
        vy: (isCeiling ? 1 : -1) * (40 + Math.random() * 110),
        life: 0,
        maxLife: 0.45 + Math.random() * 0.4,
        size: 2.2 + Math.random() * 2.5,
        color: Math.random() > 0.4 ? '#f97316' : '#e11d48',
        type: 'DEBRIS',
        drag: 0.97,
        gravity: isCeiling ? 380 : 380
      });
    }
  }

  /**
   * Emits thruster exhaust sparks from engine nozzle
   */
  public emitExhaust(
    wx: number,
    wy: number,
    exhaustAngle: number,
    shipVx: number,
    shipVy: number,
    color: string
  ): void {
    if (this.particles.length >= this.maxParticles) return;

    const speed = 160 + Math.random() * 190;
    this.particles.push({
      x: wx,
      y: wy,
      vx: Math.cos(exhaustAngle) * speed + shipVx * 0.35,
      vy: Math.sin(exhaustAngle) * speed + shipVy * 0.35,
      life: 0,
      maxLife: 0.22 + Math.random() * 0.25,
      size: 2.0 + Math.random() * 2.5,
      color,
      type: 'EXHAUST',
      drag: 0.95,
      gravity: 0
    });
  }

  /**
   * Emits catastrophic ship explosion
   */
  public emitExplosion(x: number, y: number): void {
    this.shockwaves.push({
      x,
      y,
      radius: 5,
      maxRadius: 200,
      alpha: 1.0,
      color: '#ec4899',
      lineWidth: 4
    });

    const colors = ['#06b6d4', '#ec4899', '#facc15', '#ffffff', '#fb923c'];
    for (let i = 0; i < 80; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 460;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.9,
        size: 2.5 + Math.random() * 4.0,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: 'ENERGY',
        drag: 0.96,
        gravity: 120
      });
    }
  }

  /**
   * Emits shield absorption energy ring and spark deflection
   */
  public emitShieldAbsorb(x: number, y: number): void {
    this.shockwaves.push({
      x,
      y,
      radius: 12,
      maxRadius: 100,
      alpha: 0.9,
      color: '#38bdf8',
      lineWidth: 3
    });

    for (let i = 0; i < 35; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * 280;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.4,
        size: 2.0 + Math.random() * 3.0,
        color: '#38bdf8',
        type: 'SPARK',
        drag: 0.95,
        gravity: 0
      });
    }
  }

  /**
   * Emits temporal ionization sparks and incandescent wake embers (DeLorean High-Speed VFX)
   */
  public emitTemporalSpark(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string = '#00f0ff',
    size: number = 2.0,
    life: number = 0.35
  ): void {
    if (this.particles.length >= this.maxParticles) return;
    this.particles.push({
      x,
      y,
      vx,
      vy,
      life: 0,
      maxLife: life,
      size,
      color,
      type: 'SPARK',
      drag: 0.94,
      gravity: (Math.random() - 0.5) * 30
    });
  }

  /**
   * Emits power-up collection spark burst
   */
  public emitPowerUpCollect(x: number, y: number, color: string): void {
    this.shockwaves.push({
      x,
      y,
      radius: 8,
      maxRadius: 60,
      alpha: 0.85,
      color,
      lineWidth: 2.5
    });

    for (let i = 0; i < 28; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 220;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.45,
        size: 2.2 + Math.random() * 2.5,
        color,
        type: 'ENERGY',
        drag: 0.96,
        gravity: 0
      });
    }
  }

  /**
   * Physics update & cleanup
   */
  public update(dt: number): void {
    // 1. Shockwaves update
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * 0.2;
      sw.alpha -= dt * 1.9;

      if (sw.alpha <= 0.02 || sw.radius >= sw.maxRadius * 0.98) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 2. Particles update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      // Physics integration
      p.vy += p.gravity * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  /**
   * Render all active particles and shockwaves on Canvas
   */
  public render(ctx: CanvasRenderingContext2D): void {
    // Shockwaves
    for (const sw of this.shockwaves) {
      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.shadowColor = sw.color;
      ctx.shadowBlur = 14;
      ctx.globalAlpha = Math.max(0, sw.alpha);
      ctx.lineWidth = sw.lineWidth;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Particles (batch by composite for performance)
    for (const p of this.particles) {
      const progress = p.life / p.maxLife;
      const alpha = 1.0 - progress;
      const currentSize = Math.max(0.8, p.size * (1 - progress * 0.4));

      ctx.save();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.type === 'SPARK' ? 8 : 4;
      ctx.globalAlpha = Math.max(0, alpha);

      ctx.beginPath();
      if (p.type === 'SPARK') {
        // Elongated spark streak along velocity vector
        const streakLen = Math.min(10, Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 0.02);
        const normVx = p.vx / (Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1);
        const normVy = p.vy / (Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1);
        
        ctx.lineWidth = currentSize;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x - normVx * streakLen, p.y - normVy * streakLen);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else {
        // Circular debris / puff
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
