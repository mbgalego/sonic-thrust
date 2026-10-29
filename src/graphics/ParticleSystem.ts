/**
 * Sonic Thrust - Dedicated Particle & Cinematic VFX System
 * Handles wall scrape sparks, friction debris, thruster exhaust, explosions,
 * shockwaves, and near-miss danger feedback.
 * 
 * Optimized with Object Pooling and Canvas 2D Batching to eliminate GC pressure
 * and CPU state overhead during high-speed gameplay.
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
  active: boolean;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  lineWidth: number;
  active: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private shockwaves: Shockwave[] = [];
  private readonly maxParticles: number;
  private readonly maxShockwaves: number = 36;
  private particleHead: number = 0;
  private shockwaveHead: number = 0;

  constructor(maxParticles: number = 450) {
    this.maxParticles = maxParticles;
    this.initPools();
  }

  /**
   * Pre-allocates memory for both particle and shockwave pools to guarantee zero GC spikes.
   */
  private initPools(): void {
    this.particles = new Array(this.maxParticles);
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles[i] = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 2,
        color: '#ffffff',
        type: 'SPARK',
        drag: 0.95,
        gravity: 0,
        active: false
      };
    }

    this.shockwaves = new Array(this.maxShockwaves);
    for (let i = 0; i < this.maxShockwaves; i++) {
      this.shockwaves[i] = {
        x: 0,
        y: 0,
        radius: 0,
        maxRadius: 100,
        alpha: 0,
        color: '#ffffff',
        lineWidth: 2,
        active: false
      };
    }
  }

  public reset(): void {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].active = false;
    }
    for (let i = 0; i < this.shockwaves.length; i++) {
      this.shockwaves[i].active = false;
    }
    this.particleHead = 0;
    this.shockwaveHead = 0;
  }

  /**
   * Acquires a recycled slot from the particle pool without allocations.
   */
  private acquireParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    maxLife: number,
    size: number,
    color: string,
    type: 'SPARK' | 'DEBRIS' | 'SMOKE' | 'EXHAUST' | 'ENERGY',
    drag: number,
    gravity: number
  ): Particle {
    const total = this.particles.length;
    // Circular search for inactive slot
    for (let i = 0; i < total; i++) {
      const idx = (this.particleHead + i) % total;
      const slot = this.particles[idx];
      if (!slot.active) {
        this.particleHead = (idx + 1) % total;
        slot.active = true;
        slot.x = x;
        slot.y = y;
        slot.vx = vx;
        slot.vy = vy;
        slot.life = 0;
        slot.maxLife = maxLife;
        slot.size = size;
        slot.color = color;
        slot.type = type;
        slot.drag = drag;
        slot.gravity = gravity;
        return slot;
      }
    }

    // If pool is full, reuse slot at head (round-robin eviction of oldest)
    const slot = this.particles[this.particleHead];
    this.particleHead = (this.particleHead + 1) % total;
    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.vx = vx;
    slot.vy = vy;
    slot.life = 0;
    slot.maxLife = maxLife;
    slot.size = size;
    slot.color = color;
    slot.type = type;
    slot.drag = drag;
    slot.gravity = gravity;
    return slot;
  }

  /**
   * Acquires a recycled slot from the shockwave pool without allocations.
   */
  private acquireShockwave(
    x: number,
    y: number,
    radius: number,
    maxRadius: number,
    alpha: number,
    color: string,
    lineWidth: number
  ): Shockwave {
    const total = this.shockwaves.length;
    for (let i = 0; i < total; i++) {
      const idx = (this.shockwaveHead + i) % total;
      const slot = this.shockwaves[idx];
      if (!slot.active) {
        this.shockwaveHead = (idx + 1) % total;
        slot.active = true;
        slot.x = x;
        slot.y = y;
        slot.radius = radius;
        slot.maxRadius = maxRadius;
        slot.alpha = alpha;
        slot.color = color;
        slot.lineWidth = lineWidth;
        return slot;
      }
    }

    const slot = this.shockwaves[this.shockwaveHead];
    this.shockwaveHead = (this.shockwaveHead + 1) % total;
    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.radius = radius;
    slot.maxRadius = maxRadius;
    slot.alpha = alpha;
    slot.color = color;
    slot.lineWidth = lineWidth;
    return slot;
  }

  /**
   * Generates cinematic wall scrape sparks and hot friction debris
   * when the ship grazes the ceiling or floor without colliding.
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
      const sprayAngle = Math.PI + (Math.random() - 0.5) * 0.75 + (isCeiling ? 0.35 : -0.35);
      const speed = (180 + Math.random() * 320) * (0.6 + clampedIntensity * 0.8);
      
      const vx = Math.cos(sprayAngle) * speed + shipVx * 0.3;
      const vy = Math.sin(sprayAngle) * speed;

      this.acquireParticle(
        scrapeX + (Math.random() - 0.5) * 8,
        scrapeY + (isCeiling ? 2 : -2),
        vx,
        vy,
        0.15 + Math.random() * 0.35,
        1.5 + Math.random() * 2.8 * clampedIntensity,
        sparkColors[Math.floor(Math.random() * sparkColors.length)],
        'SPARK',
        0.94,
        isCeiling ? 180 : -80
      );
    }

    // Occasional heavier incandescent debris chunks
    if (Math.random() < 0.35 * clampedIntensity) {
      const debrisAngle = Math.PI + (Math.random() - 0.5) * 0.9;
      const debrisSpeed = 90 + Math.random() * 190;
      this.acquireParticle(
        scrapeX,
        scrapeY,
        Math.cos(debrisAngle) * debrisSpeed + shipVx * 0.2,
        (isCeiling ? 1 : -1) * (40 + Math.random() * 110),
        0.45 + Math.random() * 0.4,
        2.2 + Math.random() * 2.5,
        Math.random() > 0.4 ? '#f97316' : '#e11d48',
        'DEBRIS',
        0.97,
        380
      );
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
    const speed = 160 + Math.random() * 190;
    this.acquireParticle(
      wx,
      wy,
      Math.cos(exhaustAngle) * speed + shipVx * 0.35,
      Math.sin(exhaustAngle) * speed + shipVy * 0.35,
      0.22 + Math.random() * 0.25,
      2.0 + Math.random() * 2.5,
      color,
      'EXHAUST',
      0.95,
      0
    );
  }

  /**
   * Emits catastrophic ship explosion
   */
  public emitExplosion(x: number, y: number): void {
    this.acquireShockwave(x, y, 5, 200, 1.0, '#ec4899', 4);

    const colors = ['#06b6d4', '#ec4899', '#facc15', '#ffffff', '#fb923c'];
    for (let i = 0; i < 75; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 460;
      this.acquireParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.6 + Math.random() * 0.9,
        2.5 + Math.random() * 4.0,
        colors[Math.floor(Math.random() * colors.length)],
        'ENERGY',
        0.96,
        120
      );
    }
  }

  /**
   * Emits shield absorption energy ring and spark deflection
   */
  public emitShieldAbsorb(x: number, y: number): void {
    this.acquireShockwave(x, y, 12, 100, 0.9, '#38bdf8', 3);

    for (let i = 0; i < 32; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * 280;
      this.acquireParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.35 + Math.random() * 0.4,
        2.0 + Math.random() * 3.0,
        '#38bdf8',
        'SPARK',
        0.95,
        0
      );
    }
  }

  /**
   * Emits Shield Generator charge-complete burst — golden energy ring + amber
   * spark shower, signaling a new Phase Shield being forged (v1.35.0)
   */
  public emitGeneratorShieldCharged(x: number, y: number): void {
    this.acquireShockwave(x, y, 14, 110, 0.9, '#fbbf24', 3);

    const colors = ['#fbbf24', '#fde047', '#facc15', '#ffffff'];
    for (let i = 0; i < 26; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 240;
      this.acquireParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.3 + Math.random() * 0.4,
        1.8 + Math.random() * 2.6,
        colors[Math.floor(Math.random() * colors.length)],
        'SPARK',
        0.95,
        0
      );
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
    this.acquireParticle(
      x,
      y,
      vx,
      vy,
      life,
      size,
      color,
      'SPARK',
      0.94,
      (Math.random() - 0.5) * 30
    );
  }

  /**
   * Emits power-up collection spark burst
   */
  public emitPowerUpCollect(x: number, y: number, color: string): void {
    this.acquireShockwave(x, y, 8, 60, 0.85, color, 2.5);

    for (let i = 0; i < 26; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 220;
      this.acquireParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.45 + Math.random() * 0.45,
        2.2 + Math.random() * 2.5,
        color,
        'ENERGY',
        0.96,
        0
      );
    }
  }

  /**
   * Physics update & cleanup (recycles slots without splice)
   */
  public update(dt: number): void {
    // 1. Shockwaves update
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      if (!sw.active) continue;

      sw.radius += (sw.maxRadius - sw.radius) * 0.2;
      sw.alpha -= dt * 1.9;

      if (sw.alpha <= 0.02 || sw.radius >= sw.maxRadius * 0.98) {
        sw.active = false;
      }
    }

    // 2. Particles update
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
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
   * Batched Canvas 2D rendering.
   * Eliminates per-particle ctx.save()/ctx.restore() and shadowBlur calls,
   * leveraging 'lighter' composite operation for luminous neon glow.
   */
  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. Shockwaves
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      if (!sw.active) continue;

      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = Math.max(0, Math.min(1, sw.alpha));
      ctx.lineWidth = sw.lineWidth;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Particles - rendered without individual save/restore overhead
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      const progress = p.life / p.maxLife;
      const alpha = Math.max(0, Math.min(1, 1.0 - progress));
      const currentSize = Math.max(0.8, p.size * (1 - progress * 0.4));
      ctx.globalAlpha = alpha;

      if (p.type === 'SPARK') {
        const speedSq = p.vx * p.vx + p.vy * p.vy;
        const speed = Math.sqrt(speedSq) || 1;
        const streakLen = Math.min(12, speed * 0.02);
        const normVx = p.vx / speed;
        const normVy = p.vy / speed;

        ctx.lineWidth = currentSize;
        ctx.strokeStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(p.x - normVx * streakLen, p.y - normVy * streakLen);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
