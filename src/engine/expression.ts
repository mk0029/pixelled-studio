/**
 * Tiny, whitelisted expression compiler used by the custom shader layer.
 * No eval, no Function, no property access — only numbers and known functions.
 */

export type ExprVars = Record<string, number>;

type Node =
  | { k: "num"; v: number }
  | { k: "var"; name: string }
  | { k: "un"; op: string; a: Node }
  | { k: "bin"; op: string; a: Node; b: Node }
  | { k: "call"; name: string; args: Node[] };

type Fn = { arity: number; call: (...v: number[]) => number };
const TAU = Math.PI * 2;
const fract = (v: number) => v - Math.floor(v);
const fractFn: Fn = { arity: 1, call: fract };
const hash = (x: number, y = 0) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);

export const EXPR_FUNCTIONS: Record<string, Fn> = {
  sin: { arity: 1, call: Math.sin }, cos: { arity: 1, call: Math.cos }, tan: { arity: 1, call: Math.tan },
  asin: { arity: 1, call: Math.asin }, acos: { arity: 1, call: Math.acos }, atan: { arity: 1, call: Math.atan },
  atan2: { arity: 2, call: Math.atan2 }, abs: { arity: 1, call: Math.abs },
  min: { arity: 2, call: Math.min }, max: { arity: 2, call: Math.max },
  floor: { arity: 1, call: Math.floor }, ceil: { arity: 1, call: Math.ceil }, round: { arity: 1, call: Math.round },
  sqrt: { arity: 1, call: Math.sqrt }, pow: { arity: 2, call: Math.pow }, log: { arity: 1, call: Math.log },
  exp: { arity: 1, call: Math.exp }, sign: { arity: 1, call: Math.sign },
  fract: fractFn, hypot: { arity: 2, call: Math.hypot },
  clamp: { arity: 3, call: (v, lo, hi) => Math.max(lo, Math.min(hi, v)) },
  mod: { arity: 2, call: (a, b) => ((a % b) + b) % b },
  step: { arity: 2, call: (edge, v) => (v < edge ? 0 : 1) },
  lerp: { arity: 3, call: (a, b, t) => a + (b - a) * t },
  hash: { arity: 2, call: hash },
  if: { arity: 3, call: (c, a, b) => (c !== 0 ? a : b) },
  sat: { arity: 1, call: (v) => Math.max(0, Math.min(1, v)) },
  tri: { arity: 1, call: (v) => Math.abs(fract(v) * 2 - 1) },
  wave: { arity: 1, call: (v) => (Math.sin(v * TAU) + 1) / 2 },
};

export const EXPR_VARS = ["x", "y", "nx", "ny", "u", "v", "t", "i", "r", "a", "d", "w", "h", "aspect", "cx", "cy", "pi"] as const;

export class ExprError extends Error {}

const tokenize = (src: string): string[] => {
  const out: string[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i));
      if (!m) throw new ExprError(`Bad number at ${i}`);
      out.push(m[0]); i += m[0].length; continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      const m = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(src.slice(i))!;
      out.push(m[0]); i += m[0].length; continue;
    }
    const two = src.slice(i, i + 2);
    if (["<=", ">=", "==", "!=", "&&", "||"].includes(two)) { out.push(two); i += 2; continue; }
    if ("+-*/%^(),<>!?:".includes(c)) { out.push(c); i++; continue; }
    throw new ExprError(`Unsupported character "${c}" at ${i}`);
  }
  return out;
};

class Parser {
  private pos = 0;
  constructor(private tokens: string[], private vars: Set<string>) {}
  private peek() { return this.tokens[this.pos]; }
  private eat(t: string) { if (this.peek() !== t) throw new ExprError(`Expected "${t}"`); this.pos++; }
  parse(): Node {
    const n = this.ternary();
    if (this.pos !== this.tokens.length) throw new ExprError(`Unexpected "${this.peek()}"`);
    return n;
  }
  private ternary(): Node {
    const c = this.or();
    if (this.peek() !== "?") return c;
    this.pos++;
    const a = this.ternary();
    this.eat(":");
    return { k: "call", name: "if", args: [c, a, this.ternary()] };
  }
  private or(): Node {
    let a = this.and();
    while (this.peek() === "||") { this.pos++; a = { k: "bin", op: "||", a, b: this.and() }; }
    return a;
  }
  private and(): Node {
    let a = this.cmp();
    while (this.peek() === "&&") { this.pos++; a = { k: "bin", op: "&&", a, b: this.cmp() }; }
    return a;
  }
  private cmp(): Node {
    let a = this.add();
    while (["<", ">", "<=", ">=", "==", "!="].includes(this.peek())) {
      const op = this.peek(); this.pos++;
      a = { k: "bin", op, a, b: this.add() };
    }
    return a;
  }
  private add(): Node {
    let a = this.mul();
    while (this.peek() === "+" || this.peek() === "-") {
      const op = this.peek(); this.pos++;
      a = { k: "bin", op, a, b: this.mul() };
    }
    return a;
  }
  private mul(): Node {
    let a = this.unary();
    while (this.peek() === "*" || this.peek() === "/" || this.peek() === "%") {
      const op = this.peek(); this.pos++;
      a = { k: "bin", op, a, b: this.unary() };
    }
    return a;
  }
  private unary(): Node {
    if (this.peek() === "-" || this.peek() === "+" || this.peek() === "!") {
      const op = this.peek(); this.pos++;
      return { k: "un", op, a: this.unary() };
    }
    return this.power();
  }
  private power(): Node {
    const a = this.atom();
    if (this.peek() === "^") { this.pos++; return { k: "bin", op: "^", a, b: this.unary() }; }
    return a;
  }
  private atom(): Node {
    const t = this.peek();
    if (t === undefined) throw new ExprError("Unexpected end of expression");
    if (t === "(") { this.pos++; const n = this.ternary(); this.eat(")"); return n; }
    if (/^[0-9]/.test(t) || t.startsWith(".")) { this.pos++; return { k: "num", v: Number(t) }; }
    if (/^[a-zA-Z_]/.test(t)) {
      this.pos++;
      if (this.peek() === "(") {
        this.pos++;
        const args: Node[] = [];
        if (this.peek() !== ")") {
          do { args.push(this.ternary()); if (this.peek() !== ",") break; this.pos++; } while (true);
        }
        this.eat(")");
        const fn = EXPR_FUNCTIONS[t];
        if (!fn) throw new ExprError(`Unknown function "${t}"`);
        if (args.length !== fn.arity) throw new ExprError(`${t}() needs ${fn.arity} argument(s)`);
        return { k: "call", name: t, args };
      }
      if (!this.vars.has(t) && t !== "pi") throw new ExprError(`Unknown variable "${t}"`);
      return { k: "var", name: t };
    }
    throw new ExprError(`Unexpected "${t}"`);
  }
}

const evaluate = (n: Node, v: ExprVars): number => {
  switch (n.k) {
    case "num": return n.v;
    case "var": return n.name === "pi" ? Math.PI : (v[n.name] ?? 0);
    case "un": return n.op === "-" ? -evaluate(n.a, v) : n.op === "!" ? (evaluate(n.a, v) === 0 ? 1 : 0) : evaluate(n.a, v);
    case "call": return EXPR_FUNCTIONS[n.name].call(...n.args.map((a) => evaluate(a, v)));
    case "bin": {
      const a = evaluate(n.a, v), b = evaluate(n.b, v);
      switch (n.op) {
        case "+": return a + b; case "-": return a - b; case "*": return a * b;
        case "/": return b === 0 ? 0 : a / b; case "%": return b === 0 ? 0 : a % b;
        case "^": return Math.pow(a, b);
        case "<": return a < b ? 1 : 0; case ">": return a > b ? 1 : 0;
        case "<=": return a <= b ? 1 : 0; case ">=": return a >= b ? 1 : 0;
        case "==": return a === b ? 1 : 0; case "!=": return a !== b ? 1 : 0;
        case "&&": return a !== 0 && b !== 0 ? 1 : 0; case "||": return a !== 0 || b !== 0 ? 1 : 0;
      }
      return 0;
    }
  }
};

const parse = (src: string): Node => new Parser(tokenize(src), new Set(EXPR_VARS)).parse();

const cache = new Map<string, Node>();
const invalid = new Map<string, string>();

/** Returns null when the expression compiles, otherwise a human-readable error. */
export function validateExpression(src: string): string | null {
  if (!src.trim()) return "Expression is empty";
  const cached = invalid.get(src);
  if (cached) return cached;
  if (cache.has(src)) return null;
  try { cache.set(src, parse(src)); return null; }
  catch (e) { const msg = e instanceof Error ? e.message : "Invalid expression"; invalid.set(src, msg); return msg; }
}

/** Compiled evaluator; unknown/invalid expressions render black, never throw. */
export function compileExpression(src: string): (v: ExprVars) => number {
  if (validateExpression(src)) return () => 0;
  const node = cache.get(src)!;
  return (v) => {
    const value = evaluate(node, v);
    return Number.isFinite(value) ? value : 0;
  };
}

/** Assert-based self-check; runs in development only. */
export function runExpressionSelfCheck(): void {
  const eq = (src: string, vars: ExprVars, want: number) => {
    const got = compileExpression(src)(vars);
    if (Math.abs(got - want) > 0.001) throw new Error(`expression self-check failed: ${src} → ${got}, expected ${want}`);
  };
  eq("1 + 2 * 3", {}, 7);
  eq("(1 + 2) * 3", {}, 9);
  eq("2 ^ 3 ^ 2", {}, 512);
  eq("if(x > 0.5, 1, 0)", { x: 0.8 }, 1);
  eq("x > 0.5 ? 1 : 0", { x: 0.2 }, 0);
  eq("clamp(x, 0, 1)", { x: 2 }, 1);
  eq("sin(pi / 2)", {}, 1);
  eq("1 / 0", {}, 0);
  if (!validateExpression("alert(1)")) throw new Error("expression self-check: function whitelist failed");
  if (!validateExpression("x; y")) throw new Error("expression self-check: character whitelist failed");
}

if (typeof process === "undefined" || process.env.NODE_ENV !== "production") {
  try {
    runExpressionSelfCheck();
  } catch (error) {
    console.error(error);
  }
}
