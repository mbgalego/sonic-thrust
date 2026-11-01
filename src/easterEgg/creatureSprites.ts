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


const CREATURE_CONFIG = {
  trex: {
    frameWidth: 840,
    frameHeight: 400,
    frameCount: 12,
    fps: 8,
    baseX: 1200,
    baseY: 0,
    scale: 0.4, // 40% do tamanho original — proporcional como obstáculo no túnel
  },
  kong: {
    frameWidth: 281,
    frameHeight: 471,
    frameCount: 10,
    fps: 8,
    baseX: 1800,
    baseY: 0,
    scale: 0.4, // 40% do tamanho original — proporcional como obstáculo no túnel
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