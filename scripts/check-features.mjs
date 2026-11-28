import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = mkdtempSync(join(tmpdir(), 'pixleled-features-'))
try {
  // Node cannot resolve extensionless TS imports; emit plain CJS first.
  try {
    execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'),
      'src/engine/effects/dotsLines.ts', 'src/engine/sparkleOverlay.ts',
      'src/lib/randomScatterEngine.ts', 'src/lib/spriteCharacterEngine.ts', 'src/lib/text3dRenderer.ts',
      '--rootDir', 'src', '--outDir', out, '--module', 'commonjs', '--target', 'es2022',
      '--skipLibCheck', '--esModuleInterop', '--noEmitOnError', 'false'], { cwd: root, stdio: 'pipe' })
  } catch {
    // Type-only @/ imports are unresolved outside the app tsconfig; JS is emitted anyway.
  }
  const load = (path) => import(pathToFileURL(join(out, path)).href).then((m) => m.default ?? m)
  const { bounceCoord, renderDotsLinesLayer } = await load('engine/effects/dotsLines.js')
  const { applySparkleOverlay } = await load('engine/sparkleOverlay.js')
  const { getRecommendedScatterCount, createDefaultScatterConfig, renderRandomScatterBuffer,
    buildScatterBlankMask } = await load('lib/randomScatterEngine.js')
  const {
    SPRITE_CHARACTER_PRESETS, PIXEL_SPRITES,
    createDefaultSpriteCharacterConfig, normalizeSpriteCharacterConfig, normalizeSpriteCharacterPresetId,
    renderSpriteCharacterRGBA,
  } = await load('lib/spriteCharacterEngine.js')

  assert.equal(bounceCoord(25, 20), 15)
  assert.equal(bounceCoord(-5, 20), 5)
  assert.equal(bounceCoord(40, 20), 0)

  const layer = {
    dotsGenerator: 'gravity-stack', dotsMode: 'gravity-stack',
    color: '#ffffff', gradient: [],
    dotsParticleSpeed: 60, dotsSeed: 1,
    dotsPalette: ['#ff0000', '#00ff00'],
    dotsGravityDirection: 'top-bottom', dotsGravityFill: 'all',
    dotsGravityColorMode: 'palette', dotsGravityOnComplete: 'cycle-hold',
    dotsGravityHoldFrames: 20, dotsBounce: false, dotsWrap: true,
  }
  const cols = 3, rows = 5
  const alphaAt = (buf, x, y) => buf[(y * cols + x) * 4 + 3]
  const early = renderDotsLinesLayer(layer, cols, rows, 0.1, 20)
  assert.ok(alphaAt(early, 0, 0) > 0, 'first dot starts at the top')
  assert.equal(alphaAt(early, 0, 4), 0, 'bottom is still empty')
  const filled = renderDotsLinesLayer(layer, cols, rows, 0.75, 20)
  assert.ok(alphaAt(filled, 0, 0) > 0 && alphaAt(filled, 0, 4) > 0, 'column fills bottom-up')
  assert.equal(filled[(4 * cols) * 4], 255, 'landed dot uses palette colour')

  const project = {
    sparkleOverlay: true, sparkleOverlayColorMode: 'solid',
    sparkleOverlayColor: '#ffffff', sparkleOverlayDensity: 25, sparkleOverlaySpeed: 4,
  }
  const a = new Uint8ClampedArray(10 * 10 * 3)
  const b = new Uint8ClampedArray(10 * 10 * 3)
  applySparkleOverlay(a, 10, 10, 0.25, project)
  applySparkleOverlay(b, 10, 10, 0.25, project)
  assert.deepEqual(a, b, 'sparkle frame is deterministic')
  assert.ok(a.some((v) => v === 255), 'sparkles reach full brightness')

  assert.equal(getRecommendedScatterCount(30, 20), 114, '600 LEDs auto-defaults to 114')
  assert.equal(createDefaultScatterConfig(30, 20).count, 114)
  assert.equal(createDefaultScatterConfig(30, 20).tailLength, 3, 'default tail length scales with height')
  assert.equal(createDefaultScatterConfig(30, 20).blankAreaOnly, false, 'blank-area scatter is opt-in')
  assert.equal(createDefaultScatterConfig(30, 20).blankPadding, 2, 'default padding halo is two LEDs')
  const scatter = {
    ...createDefaultScatterConfig(10, 10), enabled: true, count: 25,
    blinkStyle: 'always-on', primaryColor: '#ff0000',
  }
  const s1 = new Uint8ClampedArray(10 * 10 * 3).fill(20)
  const s2 = new Uint8ClampedArray(10 * 10 * 3).fill(20)
  renderRandomScatterBuffer(s1, 10, 10, 7, 30, scatter)
  renderRandomScatterBuffer(s2, 10, 10, 7, 30, scatter)
  assert.deepEqual(s1, s2, 'scatter frame is deterministic')
  assert.ok(s1.some((v) => v === 255), 'scatter writes pure LED colour')
  const off = new Uint8ClampedArray(10 * 10 * 3).fill(20)
  renderRandomScatterBuffer(off, 10, 10, 7, 30, { ...scatter, enabled: false })
  assert.deepEqual(off, new Uint8ClampedArray(10 * 10 * 3).fill(20), 'disabled scatter leaves pixels untouched')

  const maskBefore = new Uint8ClampedArray(10 * 10 * 3)
  const maskAfter = new Uint8ClampedArray(10 * 10 * 3)
  maskAfter[(5 * 10 + 5) * 3] = 255
  const blankMask = buildScatterBlankMask(maskBefore, maskAfter, 10, 10, 2)
  assert.equal(blankMask[5 * 10 + 5], 1, 'mask blocks the animation pixel')
  assert.equal(blankMask[3 * 10 + 3], 1, 'padding halo is masked')
  assert.equal(blankMask[2 * 10 + 2], 0, 'space past the padding stays available')
  const blocked = new Uint8ClampedArray(10 * 10 * 3).fill(20)
  renderRandomScatterBuffer(blocked, 10, 10, 7, 30, scatter, new Uint8Array(100).fill(1))
  assert.deepEqual(blocked, new Uint8ClampedArray(10 * 10 * 3).fill(20), 'masked pixels stay scatter-free')

  const moving = { ...scatter, movement: 'fall-down' }
  const litPixels = (buf) => {
    let n = 0
    for (let i = 0; i < buf.length; i += 3) if (buf[i] || buf[i + 1] || buf[i + 2]) n++
    return n
  }
  const noTail = new Uint8ClampedArray(10 * 10 * 3)
  const withTail = new Uint8ClampedArray(10 * 10 * 3)
  renderRandomScatterBuffer(noTail, 10, 10, 20, 30, moving)
  renderRandomScatterBuffer(withTail, 10, 10, 20, 30, { ...moving, showTail: true })
  assert.ok(litPixels(withTail) > litPixels(noTail), 'moving scatter tail adds trailing pixels')

  const tailMoving = { ...moving, count: 6 }
  const shortTail = new Uint8ClampedArray(10 * 10 * 3)
  const longTail = new Uint8ClampedArray(10 * 10 * 3)
  renderRandomScatterBuffer(shortTail, 10, 10, 20, 30, { ...tailMoving, showTail: true, tailLength: 2 })
  renderRandomScatterBuffer(longTail, 10, 10, 20, 30, { ...tailMoving, showTail: true, tailLength: 20 })
  assert.ok(litPixels(longTail) > litPixels(shortTail), 'tail length control changes trail size')
  const cappedTail = new Uint8ClampedArray(10 * 10 * 3)
  const heightTail = new Uint8ClampedArray(10 * 10 * 3)
  renderRandomScatterBuffer(cappedTail, 10, 10, 20, 30, { ...tailMoving, showTail: true, tailLength: 100 })
  renderRandomScatterBuffer(heightTail, 10, 10, 20, 30, { ...tailMoving, showTail: true, tailLength: 10 })
  assert.deepEqual(cappedTail, heightTail, 'tail length caps at matrix height')

  const staticA = new Uint8ClampedArray(10 * 10 * 3)
  const staticB = new Uint8ClampedArray(10 * 10 * 3)
  renderRandomScatterBuffer(staticA, 10, 10, 20, 30, scatter)
  renderRandomScatterBuffer(staticB, 10, 10, 20, 30, { ...scatter, showTail: true })
  assert.deepEqual(staticA, staticB, 'twinkle-static ignores tail')

  assert.equal(SPRITE_CHARACTER_PRESETS.length, 21, 'all 21 2D presets are registered')
  assert.equal(normalizeSpriteCharacterPresetId('bhangra-silhouette'), 'bhangra-dancer', 'legacy preset migrates')
  for (const [id, frames] of Object.entries(PIXEL_SPRITES)) {
    assert.ok(frames.length >= 2, `${id} has animation frames`)
    const size = id === 'dancing-peacock' ? 20 : 16
    for (const rows of frames) {
      assert.equal(rows.length, size, `${id} frame is ${size} rows`)
      for (const row of rows) assert.equal(row.length, size, `${id} row is ${size} pixels`)
    }
  }
  assert.equal(PIXEL_SPRITES['dancing-peacock'].length, 3, 'peacock has three fan frames')
  const litSprites = (buf) => {
    let n = 0
    for (let i = 3; i < buf.length; i += 4) if (buf[i]) n++
    return n
  }
  for (const preset of SPRITE_CHARACTER_PRESETS) {
    const cfg = createDefaultSpriteCharacterConfig(preset.id)
    const rgba = renderSpriteCharacterRGBA(32, 32, 8, 30, cfg)
    assert.ok(litSprites(rgba) > 0, `${preset.id} renders solid pixels`)
    assert.ok([...rgba].every((v, i) => i % 4 !== 3 || v === 0 || v === 255), `${preset.id} alpha is hard quantized`)
    const themed = renderSpriteCharacterRGBA(32, 32, 8, 30, {
      ...cfg,
      usePresetColors: false,
      primaryColor: '#123456',
      secondaryColor: '#654321',
      glowColor: '#abcdef',
    })
    assert.ok(litSprites(themed) > 0, `${preset.id} has visible custom-theme body colors`)
  }
  const peacockCfg = createDefaultSpriteCharacterConfig('dancing-peacock')
  assert.notDeepEqual(
    renderSpriteCharacterRGBA(40, 40, 0, 30, peacockCfg),
    renderSpriteCharacterRGBA(40, 40, 8, 30, peacockCfg),
    'peacock feather eyes animate',
  )
  const lotusCfg = createDefaultSpriteCharacterConfig('blooming-lotus')
  const lotusA = renderSpriteCharacterRGBA(32, 32, 8, 30, lotusCfg)
  const lotusB = renderSpriteCharacterRGBA(32, 32, 8, 30, lotusCfg)
  assert.deepEqual(lotusA, lotusB, 'sprite frame is deterministic')
  assert.notDeepEqual(lotusA, renderSpriteCharacterRGBA(32, 32, 0, 30, lotusCfg), 'flower opens across frames')
  const roseCfg = createDefaultSpriteCharacterConfig('blooming-rose')
  assert.notDeepEqual(
    renderSpriteCharacterRGBA(32, 32, 0, 30, roseCfg),
    renderSpriteCharacterRGBA(32, 32, 30, 30, roseCfg),
    'layered rose bloom changes over time',
  )
  const diyaCfg = createDefaultSpriteCharacterConfig('diya-lamp')
  assert.notDeepEqual(
    renderSpriteCharacterRGBA(32, 32, 0, 30, diyaCfg),
    renderSpriteCharacterRGBA(32, 32, 0, 30, { ...diyaCfg, flipX: true }),
    'flipX mirrors sprite',
  )
  const singleWide = renderSpriteCharacterRGBA(64, 32, 8, 30, lotusCfg)
  const tiledWide = renderSpriteCharacterRGBA(64, 32, 8, 30, { ...lotusCfg, tileRepeat: true })
  assert.ok(litSprites(tiledWide) > litSprites(singleWide), 'tileRepeat fills wide matrices')
  const spriteMoving = normalizeSpriteCharacterConfig({ ...diyaCfg, xMovement: 'scroll-right', xSpeed: 50 })
  assert.notDeepEqual(
    renderSpriteCharacterRGBA(64, 32, 30, 30, diyaCfg),
    renderSpriteCharacterRGBA(64, 32, 30, 30, spriteMoving),
    'x movement changes position',
  )
  const cycleCfg = normalizeSpriteCharacterConfig({
    ...createDefaultSpriteCharacterConfig('bhangra-dancer'),
    switchMode: 'cycle-timed',
    playlist: ['bhangra-dancer', 'dhol-player'],
    switchIntervalSec: 2,
  })
  assert.notDeepEqual(
    renderSpriteCharacterRGBA(32, 32, 0, 30, cycleCfg),
    renderSpriteCharacterRGBA(32, 32, 60, 30, cycleCfg),
    'timed switcher changes character',
  )
  const passCfg = normalizeSpriteCharacterConfig({
    ...createDefaultSpriteCharacterConfig('bhangra-dancer'),
    switchMode: 'cycle-on-pass',
    playlist: ['bhangra-dancer', 'dhol-player'],
    xMovement: 'scroll-right',
    xSpeed: 100,
  })
  assert.notDeepEqual(
    renderSpriteCharacterRGBA(64, 32, 30, 30, passCfg),
    renderSpriteCharacterRGBA(64, 32, 210, 30, passCfg),
    'pass switcher changes character',
  )
  // 3D text + emoji: grapheme-safe, deterministic, and shared by preview/AVI.
  const {
    splitGraphemes, isEmojiGrapheme, renderStyledTextWithEmojis,
    EMOJI_FONT_FALLBACK,
  } = await load('lib/text3dRenderer.js')
  assert.equal(splitGraphemes('❤️🎉🪔').length, 3, 'multi-codepoint emojis stay intact')
  assert.equal(splitGraphemes('शुभ')[0], 'शु', 'Devanagari matra stays with its consonant')
  assert.ok(isEmojiGrapheme('❤️') && isEmojiGrapheme('🪔'), 'emoji graphemes are detected')
  assert.ok(!isEmojiGrapheme('शु'), 'Hindi grapheme is not treated as emoji')
  assert.ok(EMOJI_FONT_FALLBACK.includes('Noto Color Emoji'), 'colour emoji fallback is registered')

  const drawCalls = []
  const fakeCtx = {
    font: '', textAlign: '', textBaseline: '', fillStyle: '', strokeStyle: '',
    lineWidth: 0, lineJoin: '', filter: 'none', shadowColor: 'transparent', shadowBlur: 0,
    save() {}, restore() {}, translate() {}, scale() {}, transform() {},
    measureText: () => ({ width: 10 }),
    fillText: (g, x, y) => drawCalls.push({ kind: 'fill', g, x, y, fill: fakeCtx.fillStyle }),
    strokeText: (g, x, y) => drawCalls.push({ kind: 'stroke', g, x, y }),
  }
  const cfg3D = {
    enabled: true, style: 'rainbow-depth', depth: 3, angleDeg: 135,
    extrudeColor: '#7A0010', autoDarken: true, separatorStroke: true,
    motion: '3d-wave', motionSpeed: 40,
  }
  const styledWidth = renderStyledTextWithEmojis({
    ctx: fakeCtx, text: '❤️🎉', x: 20, y: 30, fontSize: 24, fontFamily: 'sans-serif',
    fillColor: '#ffffff', frameIndex: 12, fps: 30, config3D: cfg3D,
  })
  assert.equal(styledWidth, 20, 'measured width includes letter spacing baseline')
  assert.ok(drawCalls.length > 2, '3D extrusion adds depth passes')
  const frontFills = drawCalls.slice(-2)
  assert.deepEqual(frontFills.map((c) => c.g), ['❤️', '🎉'], 'front pass draws intact emoji graphemes')
  assert.ok(frontFills.every((c) => c.fill === '#FFFFFF'), 'emoji front face uses native colour path')

  const text3dSource = readFileSync(join(root, 'src/lib/text3dRenderer.ts'), 'utf8')
  assert.ok(!text3dSource.includes(".split('')"), 'renderer never splits with .split("")')
  assert.ok(text3dSource.includes('Intl.Segmenter'), 'renderer uses Intl.Segmenter')
  const textRendererSource = readFileSync(join(root, 'src/engine/textRenderer.ts'), 'utf8')
  assert.ok(textRendererSource.includes('renderStyledTextWithEmojis'), 'text layer uses the shared 3D/emoji renderer')
  const aviSource = readFileSync(join(root, 'src/engine/aviEncoder.ts'), 'utf8')
  assert.ok(aviSource.includes('document.fonts.ready'), 'AVI export waits for fonts before rendering frames')

  // Matrix-only shell: wiring modules, fields, strings and overlays are gone.
  for (const gone of [
    'src/engine/wiringMapper.ts',
    'src/engine/layouts/index.ts',
    'src/components/studio/panels/LayoutsPanel.tsx',
  ]) {
    assert.ok(!existsSync(join(root, gone)), `${gone} should be deleted`)
  }
  const sourceFiles = []
  const walk = (dir) => {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      const rel = join(dir, entry.name)
      if (entry.isDirectory()) walk(rel)
      else if (/\.(ts|tsx|mjs)$/.test(entry.name)) sourceFiles.push(rel)
    }
  }
  walk('src')
  const wiringTrace = /wiringMapper|buildWiringMap|WiringMap|CONNECTION PATTERN|NUM OF CONTROLLERS|MAX PORTS|MAX PIXELS|ROUND FRAME|Connection OK|Radial Spokes|Concentric Rings|wiring\.csv/i
  const wiringHits = sourceFiles.filter((file) => wiringTrace.test(readFileSync(join(root, file), 'utf8')))
  assert.deepEqual(wiringHits, [], `wiring traces remain in: ${wiringHits.join(', ')}`)

  const hardwareSource = readFileSync(join(root, 'src/types/hardware.ts'), 'utf8')
  for (const preset of ['16 × 60', '16 × 120', '20 × 30', '32 × 64', '48 × 96']) {
    assert.ok(hardwareSource.includes(preset), `matrix preset ${preset} is registered`)
  }
  for (const removed of ['startCorner', 'routing', 'activePorts', 'portChain', 'showWiring', 'showIndices', 'showZLinks']) {
    assert.ok(!hardwareSource.includes(removed), `hardware field ${removed} should be removed`)
  }
  const matrixPanel = readFileSync(join(root, 'src/components/studio/panels/MatrixLayoutPanel.tsx'), 'utf8')
  for (const label of ['Width', 'Height', 'Swap', 'Total:']) {
    assert.ok(matrixPanel.includes(label), `Matrix Layout panel needs ${label}`)
  }
  assert.match(matrixPanel, /\b4\b/, 'width/height minimum is 4')
  assert.match(matrixPanel, /\b512\b/, 'width/height maximum is 512')
  const compositorSource = readFileSync(join(root, 'src/engine/compositor.ts'), 'utf8')
  assert.match(compositorSource, /export function renderFrame\(project: Project, time: number, audioLevel/, 'renderFrame takes time and audio only')

  // Emoji engine in character-video layers.
  const spriteEngineSource = readFileSync(join(root, 'src/lib/spriteCharacterEngine.ts'), 'utf8')
  assert.ok(spriteEngineSource.includes('export function renderEmojiCharacterLayer'), 'emoji renderer is implemented')
  assert.ok(spriteEngineSource.includes('seededRand'), 'emoji renderer is deterministic')
  assert.ok(compositorSource.includes('renderEmojiCharacterLayerRGBA'), 'compositor renders emoji layers')
  const charPanelSource = readFileSync(join(root, 'src/components/studio/panels/CharacterSpritesPanel.tsx'), 'utf8')
  assert.ok(charPanelSource.includes('Source type') && charPanelSource.includes('Quick Fill 6'), 'character panel exposes emoji source and multi-emoji tools')
  // Text vertical position.
  const textRendererSource2 = readFileSync(join(root, 'src/engine/textRenderer.ts'), 'utf8')
  assert.ok(textRendererSource2.includes('textYOffsetLed'), 'text renderer honours vertical offset')
  const textPanelSource = readFileSync(join(root, 'src/components/studio/panels/TextPanel.tsx'), 'utf8')
  assert.ok(textPanelSource.includes('Vertical Position (Y)'), 'text panel exposes vertical position')

  // Sidebar: project bar and LAYER STACK each render once in the main shell.
  const sidebarSource = readFileSync(join(root, 'src/components/studio/shell/OverlaySidebar.tsx'), 'utf8')
  assert.equal((sidebarSource.match(/Layer stack/g) || []).length, 1, 'Layer stack renders once in the sidebar')
  assert.ok(sidebarSource.includes('CompactLayerList'), 'Layer stack uses the compact reorderable list')
  assert.equal((sidebarSource.match(/aria-label="Project title"/g) || []).length, 1, 'editable project title renders once in the sidebar shell')
  for (const item of ['New Show', 'Saved Shows / Open', 'Save Show', 'Backup Project (.json)', 'Reset Canvas']) {
    assert.ok(sidebarSource.includes(item), `Project menu needs ${item}`)
  }
  assert.ok(sidebarSource.includes('h-10') && sidebarSource.includes('h-[38px]'), 'header has 40px project row and 38px action row')
  assert.ok(sidebarSource.includes('{!hideProjectHeader &&'), 'project header is suppressed while a panel/modal is open')
  assert.ok(sidebarSource.includes('Close ${activeTab.label}'), 'secondary sidebar panels have a single Close control')
  const layerListSource = readFileSync(join(root, 'src/components/studio/panels/CompactLayerList.tsx'), 'utf8')
  assert.ok(layerListSource.includes('Add Layer') && !layerListSource.includes('/>+ Layer'), 'add-layer button has a single plus')
  const inspectorSource = readFileSync(join(root, 'src/components/studio/Inspector.tsx'), 'utf8')
  assert.ok(inspectorSource.includes('p.embedded ? "space-y-3 p-3"'), 'embedded inspector uses the parent scroll container')

  console.log('feature self-check passed')
} finally {
  rmSync(out, { recursive: true, force: true })
}
