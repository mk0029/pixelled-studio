export function toranPillarDiamond(col: number, row: number, cols: number, rows: number, t: number, s: number, speed: number, dir: string): number {
  const dirSign = dir === "reverse" || dir === "left" || dir === "up" ? -1 : 1;
  const u = Math.floor((col * s) + t * speed * dirSign);
  const P = Math.max(4, Math.round(12 / Math.max(0.2, s)));
  const mod = ((u % P) + P) % P;
  if (mod < 4) return 1;
  return ((col + row) % 2 === 0) ? 1 : 0;
}

export function toranHorizontalBands(col: number, row: number, cols: number, rows: number, t: number, s: number, speed: number, dir: string): number {
  const dirSign = dir === "reverse" || dir === "left" || dir === "up" ? -1 : 1;
  const v = Math.floor((row * s) + t * speed * dirSign);
  const P = Math.max(4, Math.round(8 / Math.max(0.2, s)));
  const mod = ((v % P) + P) % P;
  if (mod < 3) return 1;
  return (col + row) % 2 === 0 ? 1 : 0;
}

export function toranTwinPillar(col: number, row: number, cols: number, rows: number, t: number, s: number, speed: number, dir: string): number {
  const dirSign = dir === "reverse" || dir === "left" || dir === "up" ? -1 : 1;
  const u = Math.floor((col * s) + t * speed * dirSign);
  const P = Math.max(4, Math.round(7 / Math.max(0.2, s)));
  const mod = ((u % P) + P) % P;
  const isBar = mod < 2;
  const top = row === 0;
  const mid = row === Math.floor(rows / 2);
  const bottom = row === rows - 1;
  if (isBar) return 1;
  if ((top || mid || bottom) && !isBar) return 1;
  return 0;
}
