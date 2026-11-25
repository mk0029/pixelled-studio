// Configurable .led hex header templates for Indian-market controllers.
// Offsets are documented byte positions; frame data follows the 512-byte header.

export interface LedHeaderTemplate {
  controllerId: string;
  magic: number[];
  ledsOffset: number;
  framesOffset: number;
  marker1: number;
  marker2: number;
}

export const LED_HEADERS: Record<string, LedHeaderTemplate> = {
  "T-1000S": { controllerId: "T-1000S", magic: [0x72, 0x7a, 0x62, 0x76, 0x30, 0x30, 0x31, 0x01], ledsOffset: 0x08, framesOffset: 0x0c, marker1: 0x55, marker2: 0xaa },
  "T-4000": { controllerId: "T-4000", magic: [0x72, 0x7a, 0x62, 0x76, 0x30, 0x30, 0x31, 0x01], ledsOffset: 0x08, framesOffset: 0x0c, marker1: 0x55, marker2: 0xaa },
  "T-8000A": { controllerId: "T-8000A", magic: [0x72, 0x7a, 0x62, 0x76, 0x30, 0x30, 0x31, 0x01], ledsOffset: 0x08, framesOffset: 0x0c, marker1: 0x55, marker2: 0xaa },
  "K-1000C": { controllerId: "K-1000C", magic: [0x72, 0x7a, 0x62, 0x76, 0x30, 0x30, 0x31, 0x01], ledsOffset: 0x08, framesOffset: 0x0c, marker1: 0x55, marker2: 0xaa },
  "K-8000C": { controllerId: "K-8000C", magic: [0x72, 0x7a, 0x62, 0x76, 0x30, 0x30, 0x31, 0x01], ledsOffset: 0x08, framesOffset: 0x0c, marker1: 0x55, marker2: 0xaa },
};

export function buildLedHeader(controllerId: string, leds: number, frames: number): Uint8Array {
  const t = LED_HEADERS[controllerId] ?? LED_HEADERS["T-8000A"];
  const header = new Uint8Array(512);
  header.set(t.magic, 0);
  header[t.ledsOffset] = leds & 0xff;
  header[t.ledsOffset + 1] = (leds >> 8) & 0xff;
  header[t.framesOffset] = (frames >> 8) & 0xff;
  header[t.framesOffset + 1] = frames & 0xff;
  header[0x15] = t.marker1;
  header[0x16] = t.marker2;
  header[0x1a] = t.marker2;
  header[0x1b] = t.marker2;
  return header;
}

// Optional reference header import utility (verifies a dropped .led file's header).
export function parseReferenceLedHeader(bytes: Uint8Array): LedHeaderTemplate | null {
  if (bytes.length < 512) return null;
  const magic = Array.from(bytes.slice(0, 8));
  for (const t of Object.values(LED_HEADERS)) {
    if (t.magic.every((b, i) => b === magic[i])) return t;
  }
  return null;
}
