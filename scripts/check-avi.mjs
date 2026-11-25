import assert from 'node:assert/strict'

globalThis.ImageData ??= class {
  constructor(data, width, height) {
    this.data = data
    this.width = width
    this.height = height
  }
}

const {exportFramesToAvi} = await import('../src/lib/aviExporter.ts')
const W = 2, H = 2
const rgba = new Uint8ClampedArray([
  1, 2, 3, 255, 4, 5, 6, 255,
  7, 8, 9, 255, 10, 11, 12, 255,
])
const blob = exportFramesToAvi([new ImageData(rgba, W, H)], W, H, 20)
const bytes = new Uint8Array(await blob.arrayBuffer())
const view = new DataView(bytes.buffer)
const tag = (p) => String.fromCharCode(...bytes.subarray(p, p + 4))
const find = (s) => Buffer.from(bytes).indexOf(s)
const strf = find('strf')
const movi = find('movi')
const idx1 = find('idx1')

assert.equal(tag(0), 'RIFF')
assert.equal(tag(8), 'AVI ')
assert.ok(strf > 0 && movi > 0 && idx1 > 0)
assert.equal(view.getUint32(strf + 12, true), W)
assert.equal(view.getUint32(strf + 16, true), H)
assert.equal(view.getUint16(strf + 22, true), 24)
assert.equal(tag(movi + 4), '00db')
assert.deepEqual([...bytes.subarray(movi + 12, movi + 18)], [9, 8, 7, 12, 11, 10])
assert.equal(tag(idx1 + 8), '00db')
console.log('AVI self-check passed')
