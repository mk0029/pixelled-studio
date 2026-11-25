p="src/engine/mathCatalog.ts"
s=open(p).read()
needle="];\n\n// Expand each kernel into 4 variants"
block='''
// ---- Basic & Shape animations (SDF + motion) ----
const shapeFns: { name: string; fn: (sx: number, sy: number, sr: number, th: number) => number }[] = [
  { name: "Heart", fn: (sx, sy) => { const x=sx*1.2, y=sy*1.2; return Math.max(0, 1 - (Math.pow(x*x + (y-0.2)**2 - 0.16, 2) + (x*x*Math.pow(y+0.3,3))) * 8); } },
  { name: "Flower5", fn: (sx, sy, sr, th) => Math.max(0, 1 - Math.abs(sr - (0.25 + 0.1*Math.cos(5*th))) * 12) },
  { name: "Lotus8", fn: (sx, sy, sr, th) => Math.max(0, 1 - Math.abs(sr - (0.3 + 0.08*Math.cos(8*th))) * 14) },
  { name: "Sunflower", fn: (sx, sy, sr, th) => Math.max(0, 1 - Math.abs(sr - (0.35 + 0.05*Math.cos(12*th))) * 16) },
  { name: "Rose", fn: (sx, sy, sr, th) => Math.max(0, 1 - Math.abs(sr - (0.3*Math.abs(Math.cos(3*th)))) * 12) },
  { name: "Star", fn: (sx, sy, sr, th) => Math.max(0, 1 - Math.abs(sr - (0.2 + 0.15*Math.cos(5*th))) * 14) },
  { name: "Diya", fn: (sx, sy) => { const flame = Math.max(0, 1 - Math.abs(sx)*3) * Math.max(0, 1 - (sy+0.3)*2); const base = Math.max(0, 1 - Math.abs(sx)*2 - Math.abs(sy-0.2)*2); return Math.max(flame, base*0.6); } },
  { name: "Crescent", fn: (sx, sy, sr) => Math.max(0, 1 - Math.abs(sr - 0.3) * 10) * (sx > -0.1 ? 1 : 0.2) },
  { name: "Butterfly", fn: (sx, sy, sr, th) => Math.max(0, 1 - Math.abs(sr - (0.25 + 0.1*Math.sin(2*th))) * 12) },
  { name: "Crown", fn: (sx, sy) => Math.max(0, 1 - Math.abs(sy-0.1)*4) * Math.max(0, 1 - Math.abs(sx)*3) },
  { name: "Diamond", fn: (sx, sy) => Math.max(0, 1 - (Math.abs(sx)+Math.abs(sy))*2.5) },
  { name: "Bell", fn: (sx, sy) => Math.max(0, 1 - Math.abs(sx)*2.5 - Math.abs(sy)*2) },
  { name: "Kalash", fn: (sx, sy) => Math.max(0, 1 - Math.abs(sx)*2 - Math.abs(sy-0.1)*2.5) },
  { name: "RibbonBow", fn: (sx, sy) => Math.max(0, 1 - Math.abs(sx*sy)*8) },
  { name: "FireworkBurst", fn: (sx, sy, sr, th) => Math.max(0, 1 - Math.abs(sr - 0.3)*8) * (0.5 + 0.5*Math.cos(8*th)) },
  { name: "Infinity", fn: (sx, sy, sr, th) => Math.max(0, 1 - Math.abs(sr - (0.2+0.1*Math.sin(2*th)))*12) },
  { name: "Smiley", fn: (sx, sy, sr) => Math.max(0, 1 - Math.abs(sr-0.3)*8) },
  { name: "Arrow", fn: (sx, sy) => Math.max(0, 1 - Math.abs(sx)*2) * Math.max(0, 1 - Math.abs(sy+0.2)*3) },
  { name: "ConcentricRings", fn: (sx, sy, sr) => Math.max(0, 1 - Math.abs(fract(sr*6)-0.5)*4) },
  { name: "CrossPlus", fn: (sx, sy) => Math.max(Math.max(0,1-Math.abs(sx)*6)*Math.max(0,1-Math.abs(sy)*1.5), Math.max(0,1-Math.abs(sy)*6)*Math.max(0,1-Math.abs(sx)*1.5)) },
  { name: "Hexagon", fn: (sx, sy) => Math.max(0, 1 - (Math.abs(sx)*1.15 + Math.abs(sy))*2) },
];
const motionStyles: { name: string; fn: (base: number, t: number, s: number, m: number) => number }[] = [
  { name: "Pulse", fn: (base, t) => base * (0.6 + 0.4*Math.sin(t*2)) },
  { name: "Tunnel", fn: (base, t, s) => Math.max(0, 1 - Math.abs(base - (t*0.3 % 1))*4) },
  { name: "Spin", fn: (base, t, s, m) => base },
  { name: "Bounce", fn: (base, t) => Math.max(0, base - Math.abs(Math.sin(t*2))*0.2) },
  { name: "Rain", fn: (base, t, s, m) => Math.max(0, base + 0.1*Math.sin(t*3)) },
  { name: "Parade", fn: (base, t) => base * (0.5 + 0.5*Math.cos(t)) },
  { name: "Chase", fn: (base, t) => Math.pow(Math.max(0, base), 2) * (0.5 + 0.5*Math.sin(t*4)) },
  { name: "Wipe", fn: (base, t) => base * Math.max(0, Math.min(1, t*0.5 % 1)) },
];
for (const sh of shapeFns) {
  for (const mo of motionStyles) {
    kernels.push({
      name: sh.name + " " + mo.name,
      category: "Basic & Shape Animations",
      fn: (c, m) => {
        const s = c.scale ?? c.density ?? 1;
        const sx = ((c.nx) * 2 - 1) * s;
        const sy = ((c.ny) * 2 - 1) * s;
        const sr = Math.hypot(sx, sy);
        const th = Math.atan2(sy, sx);
        const base = sh.fn(sx, sy, sr, th);
        return Math.max(0, Math.min(1, mo.fn(base, c.t * (c as any).speed ?? 1, s, m)));
      },
    });
  }
}
'''
s=s.replace(needle, block + needle, 1)
open(p,"w").write(s)
print("done")
PY