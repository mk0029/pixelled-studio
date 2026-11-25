/** Byte-level comparison helpers for LEDEdit probe exports. */

export interface ProbeDiff {
  offset: number;
  hexA: string;
  hexB: string;
  asciiA: string;
  asciiB: string;
  section: "header" | "payload";
}

export interface ProbeCompareResult {
  label: string;
  compared: number;
  totalDiffs: number;
  differences: ProbeDiff[];
  truncated: boolean;
  /** Most common payload byte in A — useful as the idle-fill guess. */
  idleFillA: number;
}

export interface ProbeCompareOptions {
  headerSize?: number;
  maxDiffs?: number;
}

const hex = (b: number) => b.toString(16).padStart(2, "0");
const ascii = (b: number) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : ".");

export function suggestIdleFillByte(bytes: Uint8Array, headerSize = 512): number {
  const votes = new Uint32Array(256);
  for (let i = headerSize; i < bytes.length; i++) votes[bytes[i]]++;
  let best = 0;
  for (let i = 1; i < 256; i++) if (votes[i] > votes[best]) best = i;
  return best;
}

/** Byte-by-byte diff, capped so a large probe pair cannot freeze the UI. */
export function compareLedBuffers(
  a: Uint8Array,
  b: Uint8Array,
  label: string,
  options: ProbeCompareOptions = {},
): ProbeCompareResult {
  const headerSize = Math.max(0, Math.round(options.headerSize ?? 512));
  const maxDiffs = Math.max(1, Math.round(options.maxDiffs ?? 500));
  const compared = Math.min(a.length, b.length);
  const differences: ProbeDiff[] = [];
  let totalDiffs = 0;

  for (let i = 0; i < compared; i++) {
    if (a[i] === b[i]) continue;
    totalDiffs++;
    if (differences.length < maxDiffs) {
      differences.push({
        offset: i,
        hexA: hex(a[i]),
        hexB: hex(b[i]),
        asciiA: ascii(a[i]),
        asciiB: ascii(b[i]),
        section: i < headerSize ? "header" : "payload",
      });
    }
  }
  return {
    label,
    compared,
    totalDiffs,
    differences,
    truncated: totalDiffs > differences.length || a.length !== b.length,
    idleFillA: suggestIdleFillByte(a, headerSize),
  };
}

export function compareProbeFiles(
  files: { name: string; bytes: Uint8Array }[],
  options: ProbeCompareOptions = {},
): ProbeCompareResult[] {
  const results: ProbeCompareResult[] = [];
  for (let i = 1; i < files.length; i++) {
    results.push(compareLedBuffers(files[0].bytes, files[i].bytes, `${files[0].name} ↔ ${files[i].name}`, options));
  }
  return results;
}
