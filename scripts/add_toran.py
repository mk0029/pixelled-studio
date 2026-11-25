p="src/engine/mathCatalog.ts"
s=open(p).read()
needle="];\n\n// ---- Basic & Shape animations (SDF + motion) ----"
addition='''  { name: "Toran Pillar & White Diamond Mesh", category: "Classic Indian Toran", fn: (c, m) => {
    const s = c.scale ?? c.density ?? 1;
    return toranPillarDiamond(c.x, c.y, c.w, c.h, c.t, s, c.speed ?? 1, c.direction ?? "normal");
  } },
  { name: "Toran Horizontal Bands & White Lattice", category: "Classic Indian Toran", fn: (c, m) => {
    const s = c.scale ?? c.density ?? 1;
    return toranHorizontalBands(c.x, c.y, c.w, c.h, c.t, s, c.speed ?? 1, c.direction ?? "normal");
  } },
  { name: "Toran Twin-Pillar Window / Ladder", category: "Classic Indian Toran", fn: (c, m) => {
    const s = c.scale ?? c.density ?? 1;
    return toranTwinPillar(c.x, c.y, c.w, c.h, c.t, s, c.speed ?? 1, c.direction ?? "normal");
  } },
'''
# add import at top? We'll use require-like not needed; add import line instead.
s=s.replace('import type { ShaderContext } from "./mathShaders";', 'import type { ShaderContext } from "./mathShaders";\nimport { toranPillarDiamond, toranHorizontalBands, toranTwinPillar } from "./effects/toranClones";', 1)
assert needle in s
s=s.replace(needle, addition + needle, 1)
open(p,"w").write(s)
print("done")
PY