/**
 * Prehistoric Wireframe Creatures (v1.39.0 addendum)
 * T-Rex e King Kong em wireframe (sem texturas), animação procedural.
 * Aparecem apenas no Modo OASIS, no espaço do túnel esquerdo (x < 0).
 */

export interface Vec3 { x: number; y: number; z: number }
export interface Edge { a: number; b: number }

export interface WireframeModel {
  name: string
  vertices: Vec3[]
  edges: Edge[]
}

export interface Camera3D {
  x: number
  y: number
  z: number
  rotY: number // rotação em torno do eixo Y (radianos)
}

/**
 * Projeção perspetiva simples 3D → 2D.
 * Devolve null se o ponto estiver atrás da câmara.
 */
export function projectPoint(
  v: Vec3,
  cam: Camera3D,
  focalLength: number,
  screenW: number,
  screenH: number
): { x: number; y: number } | null {
  let dx = v.x - cam.x
  let dy = v.y - cam.y
  let dz = v.z - cam.z

  // Rotação em torno do Y (virar a criatura para olhar para o jogador)
  const cos = Math.cos(cam.rotY)
  const sin = Math.sin(cam.rotY)
  const rx = dx * cos + dz * sin
  const rz = -dx * sin + dz * cos

  dx = rx
  dz = rz

  if (dz <= 0.1) return null

  const scale = focalLength / dz
  const x = screenW / 2 + dx * scale
  const y = screenH / 2 - dy * scale // ecrã: y para baixo

  return { x, y }
}

// ------------------------------------------------------------
// Modelos wireframe (vértices em unidades do mundo, y = cima)
// ------------------------------------------------------------

/** T-Rex visto de perfil (virado para a esquerda). Gigante, rugindo. */
export const TREX_MODEL: WireframeModel = {
  name: 'T-Rex',
  vertices: [
    { x: -3, y: 4, z: 0 },    // 0 topo cabeça
    { x: -5, y: 3, z: 0 },    // 1 nariz
    { x: -4, y: 2, z: 0 },    // 2 queixo
    { x: -1, y: 3.5, z: 0 },  // 3 pescoço
    { x: 0, y: 4, z: 0 },     // 4 ombro
    { x: 2, y: 4.5, z: 0 },   // 5 costas
    { x: 4, y: 4.5, z: 0 },   // 6 ancas
    { x: 6, y: 3, z: 0 },     // 7 base cauda
    { x: 9, y: 1.5, z: 0 },   // 8 ponta cauda
    { x: 1, y: 2.5, z: 0 },   // 9 peito
    { x: 1, y: 0, z: 0 },     // 10 quadril frente
    { x: 1, y: -2, z: 0 },    // 11 pé frente
    { x: 3, y: -2, z: 0 },    // 12 pé trás
    { x: 3, y: 0, z: 0 },     // 13 quadril trás
    { x: -2, y: 2.5, z: -1 }, // 14 braço esquerdo ombro
    { x: -2.5, y: 1.5, z: -1 }, // 15 braço esquerdo cotovelo
    { x: -2, y: 2.5, z: 1 },  // 16 braço direito ombro
    { x: -2.5, y: 1.5, z: 1 }, // 17 braço direito cotovelo
    { x: -3, y: 3, z: 1 },    // 18 olho
    { x: -4.5, y: 2.5, z: 0.5 }, // 19 dente cima
    { x: -4.5, y: 2, z: 0.5 },  // 20 dente baixo
  ],
  edges: [
    // Cabeça
    { a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }, { a: 3, b: 0 },
    // Pescoço e tronco
    { a: 3, b: 4 }, { a: 4, b: 5 }, { a: 5, b: 6 }, { a: 6, b: 7 },
    // Cauda
    { a: 7, b: 8 },
    // Barriga
    { a: 6, b: 13 }, { a: 13, b: 10 }, { a: 10, b: 4 },
    // Pernas
    { a: 10, b: 11 }, { a: 11, b: 12 }, { a: 12, b: 13 },
    // Braços
    { a: 4, b: 14 }, { a: 14, b: 15 }, { a: 4, b: 16 }, { a: 16, b: 17 },
    // Olho e dentes
    { a: 3, b: 18 }, { a: 1, b: 19 }, { a: 19, b: 20 },
  ],
}

/** King Kong visto de frente, a bater no peito. */
export const KONG_MODEL: WireframeModel = {
  name: 'King Kong',
  vertices: [
    { x: 0, y: 4, z: 0 },    // 0 topo cabeça
    { x: -1.5, y: 3, z: 0 }, // 1 lado esquerdo cabeça
    { x: 1.5, y: 3, z: 0 },  // 2 lado direito cabeça
    { x: -1, y: 2, z: 0 },   // 3 queixo esquerdo
    { x: 1, y: 2, z: 0 },    // 4 queixo direito
    { x: -2, y: 2, z: -1 },  // 5 ombro esquerdo
    { x: 2, y: 2, z: -1 },   // 6 ombro direito
    { x: -2.5, y: 0, z: -1 }, // 7 mão esquerda
    { x: 2.5, y: 0, z: -1 },  // 8 mão direita
    { x: -1.5, y: 1, z: 0 },  // 9 peito esquerdo
    { x: 1.5, y: 1, z: 0 },   // 10 peito direito
    { x: -1.5, y: -1, z: 0 }, // 11 ancas esquerda
    { x: 1.5, y: -1, z: 0 },  // 12 ancas direita
    { x: -2, y: -1, z: -1 },  // 13 pé esquerdo
    { x: 2, y: -1, z: -1 },   // 14 pé direito
    { x: -1, y: 1.5, z: 0 },  // 15 ombro interno esquerdo
    { x: 1, y: 1.5, z: 0 },   // 16 ombro interno direito
    { x: -0.5, y: 2.5, z: 0.5 }, // 17 olho esquerdo
    { x: 0.5, y: 2.5, z: 0.5 },  // 18 olho direito
  ],
  edges: [
    // Cabeça
    { a: 0, b: 1 }, { a: 1, b: 3 }, { a: 3, b: 4 }, { a: 4, b: 2 }, { a: 2, b: 0 },
    // Ombros
    { a: 1, b: 5 }, { a: 2, b: 6 }, { a: 5, b: 6 },
    // Braços
    { a: 5, b: 7 }, { a: 6, b: 8 },
    // Peito
    { a: 5, b: 9 }, { a: 6, b: 10 }, { a: 9, b: 10 },
    // Cintura
    { a: 9, b: 11 }, { a: 10, b: 12 }, { a: 11, b: 12 },
    // Pernas
    { a: 11, b: 13 }, { a: 12, b: 14 },
    // Olhos
    { a: 1, b: 17 }, { a: 2, b: 18 },
  ],
}

export type CreatureType = 'trex' | 'kong'

/**
 * Uma criatura pré-histórica com animação procedural.
 * Aparece no túnel esquerdo, ruge / bate no peito ao ritmo da música.
 */
export class PrehistoricCreature {
  type: CreatureType
  model: WireframeModel

  // Posição no mundo
  x = 0
  y = 0
  z = 0

  scale = 1
  rotY = 0
  time = 0

  active = false
  lifeTime = 0 // segundos restantes
  maxLife = 0

  // Parâmetros de animação
  roarOpen = 0 // 0..1 (T-Rex: abertura da mandíbula)
  chestPound = 0 // 0..1 (Kong: braços no peito)

  constructor(type: CreatureType) {
    this.type = type
    this.model = type === 'trex' ? TREX_MODEL : KONG_MODEL
    this.scale = type === 'trex' ? 5.5 : 4.5
  }

  spawn(worldX: number, worldY: number, worldZ: number, durationSec: number): void {
    this.x = worldX
    this.y = worldY
    this.z = worldZ
    this.time = 0
    this.active = true
    this.lifeTime = durationSec
    this.maxLife = durationSec
    this.rotY = this.type === 'trex' ? -0.4 : 0 // T-Rex olha ligeiramente para o jogador
  }

  update(dt: number, isBeat: boolean): void {
    if (!this.active) return

    this.time += dt
    this.lifeTime -= dt
    if (this.lifeTime <= 0) {
      this.active = false
      return
    }

    // Animação procedural
    if (this.type === 'trex') {
      // Rugido: mandíbula abre no beat, fecha suavemente depois
      if (isBeat) this.roarOpen = 1.0
      this.roarOpen *= Math.exp(-dt * 3) // decai rápido

      // Cabeça sobe/desce levemente
      this.rotY = -0.4 + Math.sin(this.time * 2) * 0.05
    } else {
      // King Kong: bater no peito no beat
      if (isBeat) this.chestPound = 1.0
      this.chestPound *= Math.exp(-dt * 4)

      // Ombro oscila
      this.rotY = Math.sin(this.time * 1.5) * 0.08
    }
  }

  /**
   * Desenha o wireframe da criatura.
   * `cam` é a câmara do jogo (posição + rotação Y).
   */
  render(
    ctx: CanvasRenderingContext2D,
    cam: Camera3D,
    focalLength: number,
    screenW: number,
    screenH: number,
    isBeat: boolean
  ): void {
    if (!this.active) return

    const alpha = 0.55 + 0.25 * Math.sin(this.time * 6)
    const lifePct = this.lifeTime / this.maxLife

    // Cores alternam magenta/ciano, mais brilhante ao beat
    const baseHue = Math.floor(this.time * 1.5) % 2 === 0 ? 300 : 180 // magenta / ciano
    const beatBoost = isBeat ? 40 : 0
    ctx.strokeStyle = `hsla(${baseHue + beatBoost}, 100%, 60%, ${alpha * lifePct})`
    ctx.lineWidth = 4
    ctx.shadowColor = `hsla(${baseHue}, 100%, 50%, 0.8)`
    ctx.shadowBlur = 15

    ctx.save()

    // Aplica animações específicas aos vértices antes de projetar
    const animatedVertices = this.model.vertices.map((v) => ({
      ...v,
      _animX: v.x,
      _animY: v.y,
      _animZ: v.z,
    } as Vec3 & { _animX: number; _animY: number; _animZ: number }))

    if (this.type === 'trex') {
      // Mandíbula: vértices 1 (nariz), 2 (queixo), 19, 20 (dentes)
      // Rotaciona em torno do ponto 3 (pescoço/queixo) quando rugindo
      if (this.roarOpen > 0.05) {
        const angle = this.roarOpen * 0.5 // radianos
        const cx = animatedVertices[3].x
        const cy = animatedVertices[3].y
        for (const idx of [1, 19, 20]) {
          const v = animatedVertices[idx]
          const dx = v.x - cx
          const dy = v.y - cy
          v._animX = cx + dx * Math.cos(angle) - dy * Math.sin(angle)
          v._animY = cy + dx * Math.sin(angle) + dy * Math.cos(angle)
        }
      }
    } else {
      // King Kong: braços movem-se em direção ao peito ao bater
      if (this.chestPound > 0.05) {
        const t = this.chestPound
        // Mão esquerda (7) e direita (8) aproximam-se do centro (x=0)
        animatedVertices[7]._animX = -2 + (0.5 - 2) * t
        animatedVertices[8]._animX = 2 - (2 - 0.5) * t
        animatedVertices[7]._animY = 0 + (1 - 0) * t
        animatedVertices[8]._animY = 0 + (1 - 0) * t
      }
    }

    // Desenha arestas
    for (const edge of this.model.edges) {
      const v1 = animatedVertices[edge.a]
      const v2 = animatedVertices[edge.b]

      // Aplica escala e translada para a posição da criatura no mundo
      const p1 = projectPoint(
        { x: v1._animX * this.scale + this.x, y: v1._animY * this.scale + this.y, z: v1._animZ * this.scale + this.z },
        cam,
        focalLength,
        screenW,
        screenH
      )
      const p2 = projectPoint(
        { x: v2._animX * this.scale + this.x, y: v2._animY * this.scale + this.y, z: v2._animZ * this.scale + this.z },
        cam,
        focalLength,
        screenW,
        screenH
      )

      if (p1 && p2) {
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      }
    }

    ctx.restore()
  }
}

// ------------------------------------------------------------
// Gerador de criaturas
// ------------------------------------------------------------

/** Posições relativas de spawn no túnel esquerdo (x < 0), em relação ao jogador. */
const SPAWN_OFFSETS: Array<{ dx: number; y: number; dz: number }> = [
  { dx: -300, y: 2, dz: 150 },   // T-Rex perto do jogador, à esquerda
  { dx: -500, y: 3, dz: 200 },   // King Kong médio
  { dx: -700, y: 1, dz: 250 },   // T-Rex mais longe mas ainda visível
]

/** Spawn aleatório de uma criatura no túnel esquerdo, relativo à posição da câmara. */
export function spawnRandomCreature(
  type: CreatureType,
  durationSec: number,
  camX: number = 0,
  camZ: number = 0
): PrehistoricCreature {
  const c = new PrehistoricCreature(type)
  const offset = SPAWN_OFFSETS[Math.floor(Math.random() * SPAWN_OFFSETS.length)]
  c.spawn(camX + offset.dx, offset.y, camZ + offset.dz, durationSec)
  return c
}