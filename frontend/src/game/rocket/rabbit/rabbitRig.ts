import type * as Three from 'three'

/**
 * Piyu's approved rabbit picture turned into 3D.
 *
 * The picture is "inflated" into a soft relief (like a plush toy): a distance
 * transform of its outline gives every pixel a height, a front and a back
 * shell are built from that height map, and the picture is the texture, so the
 * fur, face and ears stay exactly as drawn. The relief is cut into body, head
 * and ear layers so the head can tilt and the ear can twitch. Blinking swaps
 * in a closed-eye copy of the head texture. Every move is slow and small.
 */

export type RabbitMove = 'blink' | 'shake' | 'scratch' | 'eat'

export const MOVE_MS: Record<RabbitMove, number> = { blink: 700, shake: 2600, scratch: 3400, eat: 4600 }

/** Body, head and ear outlines in picture pixels (the picture is 76 × 114). */
const PARTS: Record<'body' | 'head' | 'ear', [number, number][]> = {
  body: [[0, 58], [76, 56], [76, 114], [0, 114]],
  head: [[0, 0], [27, 0], [27, 32], [38, 36], [76, 36], [76, 62], [0, 64]],
  ear: [[27, 0], [76, 0], [76, 36], [38, 36], [27, 32]],
}
const EYES: [number, number, number][] = [[6, 43, 2.6], [20.5, 44.5, 2.9]]
const MOUTH: [number, number] = [9, 51]

interface Assets {
  W: number
  H: number
  heights: Float32Array
  textures: Record<'body' | 'head' | 'ear' | 'headClosed', HTMLCanvasElement>
}

function buildAssets(img: HTMLImageElement): Assets {
  const W = img.naturalWidth
  const H = img.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d', { willReadFrequently: true })!
  g.drawImage(img, 0, 0)
  const alpha = g.getImageData(0, 0, W, H).data

  // Chamfer distance from the outline, two passes.
  const INF = 1e9
  const d = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) d[i] = alpha[i * 4 + 3] > 110 ? INF : 0
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : d[y * W + x])
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (d[i]) d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414)
    }
  for (let y = H - 1; y >= 0; y--)
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x
      if (d[i]) d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414)
    }

  // A rounded dome profile, then a light blur so the surface is soft.
  const R = 13
  const raw = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) {
    const v = Math.min(d[i], R)
    raw[i] = d[i] ? Math.sqrt(2 * R * v - v * v) + (d[i] > R ? (d[i] - R) * 0.25 : 0) : 0
  }
  const heights = new Float32Array(W * H)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let sum = 0
      let n = 0
      for (let j = -1; j <= 1; j++)
        for (let k = -1; k <= 1; k++) {
          const xx = x + k
          const yy = y + j
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue
          sum += raw[yy * W + xx]
          n++
        }
      heights[y * W + x] = sum / n
    }

  const part = (poly: [number, number][]) => {
    const c = document.createElement('canvas')
    c.width = W * 4
    c.height = H * 4
    const pg = c.getContext('2d')!
    pg.scale(4, 4)
    pg.beginPath()
    poly.forEach(([x, y], i) => (i ? pg.lineTo(x, y) : pg.moveTo(x, y)))
    pg.closePath()
    pg.clip()
    pg.imageSmoothingQuality = 'high'
    pg.drawImage(img, 0, 0)
    return c
  }
  const head = part(PARTS.head)

  // The same head with the eyes closed, painted in the rabbit's own fur colour.
  const closed = document.createElement('canvas')
  closed.width = W * 4
  closed.height = H * 4
  const cg = closed.getContext('2d')!
  cg.drawImage(head, 0, 0)
  cg.scale(4, 4)
  for (const [ex, ey, rx] of EYES) {
    const p = g.getImageData(Math.round(ex), Math.round(ey) - 5, 1, 1).data
    cg.fillStyle = `rgb(${p[0]},${p[1]},${p[2]})`
    cg.beginPath()
    cg.ellipse(ex, ey, rx, 3, 0, 0, Math.PI * 2)
    cg.fill()
    cg.strokeStyle = '#3a3550'
    cg.lineWidth = 0.7
    cg.lineCap = 'round'
    cg.beginPath()
    cg.arc(ex, ey - 1.2, rx * 0.85, Math.PI * 0.2, Math.PI * 0.8)
    cg.stroke()
  }

  return { W, H, heights, textures: { body: part(PARTS.body), head, ear: part(PARTS.ear), headClosed: closed } }
}

const bump = (x: number, a: number, b: number) => (x < a || x > b ? 0 : Math.sin(((x - a) / (b - a)) * Math.PI))

export interface RabbitRig {
  setFacing(right: boolean): void
  setHopping(hopping: boolean): void
  play(move: RabbitMove): void
  dispose(): void
}

/** Build the 3D rabbit on a canvas. Resolves once the picture has loaded. */
export async function createRabbitRig(THREE: typeof Three, canvas: HTMLCanvasElement, imageUrl: string, reducedMotion: boolean): Promise<RabbitRig> {
  const img = new Image()
  img.src = imageUrl
  await img.decode()
  const A = buildAssets(img)
  const { W, H, heights } = A

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const CW = canvas.clientWidth || 106
  const CH = canvas.clientHeight || 160
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(dpr)
  renderer.setSize(CW, CH, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(22, CW / CH, 1, 2000)
  camera.position.set(0, 2, 372)
  camera.lookAt(0, 1, 0)
  // Light intensities use physical units (π × the old values).
  scene.add(new THREE.HemisphereLight(0xffffff, 0xeadbd0, 0.78 * Math.PI))
  const key = new THREE.DirectionalLight(0xffffff, 0.62 * Math.PI)
  key.position.set(-120, 160, 220)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xe6defc, 0.25 * Math.PI)
  fill.position.set(160, 40, 120)
  scene.add(fill)

  const wx = (px: number) => px - 38
  const wy = (py: number) => 57 - py
  const hAt = (px: number, py: number) => {
    const x = Math.max(0, Math.min(W - 1, Math.round(px)))
    const y = Math.max(0, Math.min(H - 1, Math.round(py)))
    return heights[y * W + x]
  }
  const disposables: { dispose(): void }[] = []
  const texture = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    disposables.push(t)
    return t
  }

  const shell = (name: 'body' | 'head' | 'ear', ox: number, oy: number) => {
    const geo = new THREE.PlaneGeometry(W, H, W * 2, H * 2)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) pos.setZ(i, hAt(pos.getX(i) + W / 2, H / 2 - pos.getY(i)) * 1.05)
    geo.computeVertexNormals()
    geo.translate(-wx(ox), -wy(oy), 0)
    const material = new THREE.MeshStandardMaterial({ map: texture(A.textures[name]), alphaTest: 0.45, roughness: 0.9, metalness: 0, side: THREE.DoubleSide })
    disposables.push(geo, material)
    const group = new THREE.Group()
    const front = new THREE.Mesh(geo, material)
    const back = new THREE.Mesh(geo, material)
    back.scale.z = -0.85
    group.add(front, back)
    return { group, material }
  }

  const turn = new THREE.Group()
  const hop = new THREE.Group()
  scene.add(turn)
  turn.add(hop)
  hop.add(shell('body', 38, 57).group)
  const head = new THREE.Group()
  head.position.set(wx(22), wy(62), 0)
  hop.add(head)
  const headShell = shell('head', 22, 62)
  head.add(headShell.group)
  const openMap = headShell.material.map
  const closedMap = texture(A.textures.headClosed)
  const ear = new THREE.Group()
  ear.position.set(wx(36) - wx(22), wy(33) - wy(62), 0)
  head.add(ear)
  ear.add(shell('ear', 36, 33).group)

  const fur = new THREE.MeshStandardMaterial({ color: 0xfff2e4, roughness: 0.95 })
  const ball = new THREE.SphereGeometry(1, 20, 16)
  disposables.push(fur, ball)

  // Carrot: tip at the mouth, held by a paw.
  const mouthZ = hAt(...MOUTH) * 1.05
  const carrot = new THREE.Group()
  const orange = new THREE.MeshStandardMaterial({ color: 0xf2994a, roughness: 0.7 })
  const cone = new THREE.Mesh(new THREE.ConeGeometry(4, 23, 18), orange)
  cone.rotation.x = Math.PI
  cone.position.y = -11.5
  carrot.add(cone)
  const green = new THREE.MeshStandardMaterial({ color: 0x4caf6a })
  for (const a of [-0.45, 0, 0.45]) {
    const leaf = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 7, 6), green)
    leaf.position.set(Math.sin(a) * 2.8, -25.5, 0)
    leaf.rotation.z = Math.PI + a
    carrot.add(leaf)
  }
  const eatPaw = new THREE.Mesh(ball, fur)
  eatPaw.scale.set(3.6, 3, 3)
  eatPaw.position.set(3.2, -15, 2.5)
  carrot.add(eatPaw)
  carrot.position.set(wx(MOUTH[0]) - wx(22), wy(52.5) - wy(62), mouthZ + 6)
  carrot.rotation.set(0.3, 0, -0.75)
  carrot.visible = false
  head.add(carrot)
  disposables.push(orange, green)

  const paw = new THREE.Mesh(ball, fur)
  paw.scale.set(5.5, 4.5, 4.5)
  paw.visible = false
  hop.add(paw)

  let wantRight = false
  let hopping = false
  let yaw: number | null = null
  let move: { name: RabbitMove; t: number } | null = null
  let raf = 0
  let last = performance.now()
  const t0 = last
  let disposed = false

  function frame(now: number) {
    if (disposed) return
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const t = (now - t0) / 1000

    // Turn slowly; past edge-on, mirror so the front of the picture faces the child.
    const target = wantRight ? Math.PI - 0.32 : -0.32
    yaw = reducedMotion || yaw === null ? target : yaw + (target - yaw) * Math.min(1, dt * 3.2)
    if (yaw < Math.PI / 2) {
      turn.rotation.y = yaw
      turn.scale.x = 1
    } else {
      turn.rotation.y = Math.PI - yaw
      turn.scale.x = -1
    }

    hop.scale.set(1, reducedMotion ? 1 : 1 + Math.sin(t * 1.65) * 0.01, 1)
    if (hopping && !reducedMotion) {
      const j = Math.sin((((t % 0.95) / 0.95) * Math.PI))
      hop.position.y = j * 9
      hop.scale.set(1 + (1 - j) * 0.025, 1 - (1 - j) * 0.025 + j * 0.015, 1)
    } else {
      hop.position.y *= 0.85
    }

    head.rotation.set(0, 0, 0)
    ear.rotation.set(0, 0, 0)
    headShell.material.map = openMap
    carrot.visible = false
    paw.visible = false
    if (move) {
      const k = (now - move.t) / MOVE_MS[move.name]
      if (k >= 1) move = null
      else if (move.name === 'blink') {
        if (bump(k, 0.3, 0.7) > 0.4) headShell.material.map = closedMap
      } else if (move.name === 'shake') {
        head.rotation.z = Math.sin(k * Math.PI * 2) * 0.1 * (1 - k * 0.6)
        head.rotation.y = Math.sin(k * Math.PI * 2) * 0.2 * (1 - k * 0.6)
      } else if (move.name === 'scratch') {
        const up = bump(k, 0.1, 0.9)
        const rub = Math.sin(k * Math.PI * 8) * up
        head.rotation.z = -0.1 * up
        ear.rotation.z = rub * 0.07
        paw.visible = up > 0.03
        paw.position.set(wx(30) + (wx(44) - wx(30)) * up, wy(82) + (wy(34) - wy(82)) * up + rub * 1.5, 14 + 10 * up)
      } else if (move.name === 'eat') {
        const h = bump(k, 0.05, 0.95)
        carrot.visible = h > 0.05
        carrot.scale.setScalar(1 - k * 0.35)
        head.rotation.x = Math.sin(k * Math.PI * 10) * 0.02 * h
        head.rotation.z = 0.03 * h
      }
    }
    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(frame)

  return {
    setFacing(right) {
      wantRight = right
    },
    setHopping(next) {
      hopping = next
    },
    play(name) {
      if (reducedMotion && name !== 'blink') return
      move = { name, t: performance.now() }
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      disposables.forEach((item) => item.dispose())
      renderer.dispose()
    },
  }
}

export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}
