/**
 * Prehistoric Creature Sprite Animation (v1.39.0 addendum)
 * T-Rex + King Kong animated sprites on the RIGHT side of tunnel (x > 0)
 * Only visible in OASIS mode. Creatures face LEFT, watching the player pass.
 */

export interface CreatureSpriteFrames {
  frames: HTMLImageElement[]
  frameWidth: number
  frameHeight: number
  frameCount: number
  fps: number
}

export interface CreatureInstance {
  type: 'trex' | 'kong'
  x: number      // world X (right side, x > 0)
  y: number      // world Y (ground level)
  frames: CreatureSpriteFrames
  currentFrame: number
  frameTimer: number
  scale: number
  active: boolean
}

const CREATURE_CONFIG = {
  trex: {
    frameWidth: 305,
    frameHeight: 476,
    frameCount: 10,
    fps: 8,
    baseX: 1200,
    baseY: 0,
    scale: 1.0,
  },
  kong: {
    frameWidth: 281,
    frameHeight: 471,
    frameCount: 10,
    fps: 8,
    baseX: 1800,
    baseY: 0,
    scale: 1.0,
  },
} as const

/**
 * Loads all creature frames from /assets/skins/frames/
 * Returns a map of creature type -> loaded frames
 */
export async function loadCreatureFrames(): Promise<Record<'trex' | 'kong', CreatureSpriteFrames>> {
  const loadFrames = async (type: 'trex' | 'kong'): Promise<CreatureSpriteFrames> => {
    const config = CREATURE_CONFIG[type]
    const frames: HTMLImageElement[] = []

    for (let i = 0; i < config.frameCount; i++) {
      const img = new Image()
      img.src = `/assets/skins/frames/${type}_frame${i.toString().padStart(2, '0')}.png`
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error(`Failed to load ${type}_frame${i}`))
      })
      frames.push(img)
    }

    return {
      frames,
      frameWidth: config.frameWidth,
      frameHeight: config.frameHeight,
      frameCount: config.frameCount,
      fps: config.fps,
    }
  }

  const [trexFrames, kongFrames] = await Promise.all([
    loadFrames('trex'),
    loadFrames('kong'),
  ])

  return { trex: trexFrames, kong: kongFrames }
}

/**
 * Creates creature instances positioned on the right side of the tunnel
 * They only spawn when OASIS mode is active and player is in range
 */
export function createCreatureInstances(
  frames: Record<'trex' | 'kong', CreatureSpriteFrames>,
  world: any // PhysicsWorld - for terrain queries
): CreatureInstance[] {
  const instances: CreatureInstance[] = []

  // T-Rex at x = 1200
  const trexGround = world.getTerrainAt(CREATURE_CONFIG.trex.baseX)
  instances.push({
    type: 'trex',
    x: CREATURE_CONFIG.trex.baseX,
    y: trexGround.floorY - CREATURE_CONFIG.trex.frameHeight * CREATURE_CONFIG.trex.scale,
    frames: frames.trex,
    currentFrame: 0,
    frameTimer: 0,
    scale: CREATURE_CONFIG.trex.scale,
    active: true,
  })

  // King Kong at x = 1800
  const kongGround = world.getTerrainAt(CREATURE_CONFIG.kong.baseX)
  instances.push({
    type: 'kong',
    x: CREATURE_CONFIG.kong.baseX,
    y: kongGround.floorY - CREATURE_CONFIG.kong.frameHeight * CREATURE_CONFIG.kong.scale,
    frames: frames.kong,
    currentFrame: 0,
    frameTimer: 0,
    scale: CREATURE_CONFIG.kong.scale,
    active: true,
  })

  return instances
}

/**
 * Updates all creature animations
 */
export function updateCreatures(
  creatures: CreatureInstance[],
  dt: number
): void {
  for (const c of creatures) {
    if (!c.active) continue

    c.frameTimer += dt
    const frameDuration = 1 / c.frames.fps
    if (c.frameTimer >= frameDuration) {
      c.frameTimer -= frameDuration
      c.currentFrame = (c.currentFrame + 1) % c.frames.frameCount
    }
  }
}

/**
 * Renders all active creatures
 * They face LEFT (toward player), drawn after terrain but before particles
 */
export function renderCreatures(
  ctx: CanvasRenderingContext2D,
  creatures: CreatureInstance[],
  cameraX: number,
  cameraY: number,
  zoom: number,
  screenW: number,
  screenH: number
): void {
  for (const c of creatures) {
    if (!c.active) continue

    // Screen position (creatures are at fixed world positions)
    const screenX = (c.x - cameraX) * zoom
    const screenY = (c.y - cameraY) * zoom

    // Skip if off-screen
    const dw = c.frames.frameWidth * c.scale * zoom
    const dh = c.frames.frameHeight * c.scale * zoom
    if (screenX + dw < 0 || screenX > screenW || screenY + dh < 0 || screenY > screenH) continue

    const frame = c.frames.frames[c.currentFrame]
    if (!frame.complete) continue

    ctx.save()

    // Draw facing LEFT (toward player) - frames are already facing left
    ctx.drawImage(
      frame,
      screenX,
      screenY,
      dw,
      dh
    )

    ctx.restore()
  }
}