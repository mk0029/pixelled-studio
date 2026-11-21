/**
 * LEDEdit .swf Flash effects — served from your cloud/CDN, NOT bundled in the project.
 *
 * Set NEXT_PUBLIC_SWF_BASE_URL to your cloud folder, e.g.:
 *   https://cdn.yourdomain.com/pixleled/swf/
 *
 * Then each effect loads `<BASE_URL>/<file>` only when the device is online.
 * If you prefer to self-host, drop .swf files into public/helper/ and set the
 * base URL to /helper/.
 */
export interface SwfEffect {
  id: string;
  name: string;
  file: string;
}

export const SWF_EFFECTS: SwfEffect[] = [
  { id: "swf-linear-1",   name: "Linear effect 1",   file: "1.swf" },
  { id: "swf-linear-2",   name: "Linear effect 2",   file: "2.swf" },
  { id: "swf-linear-3",   name: "Linear effect 3",   file: "3.swf" },
  { id: "swf-linear-4",   name: "Linear effect 4",   file: "4.swf" },
  { id: "swf-linear-5",   name: "Linear effect 5",   file: "5.swf" },
  { id: "swf-linear-6",   name: "Linear effect 6",   file: "6.swf" },
  { id: "swf-linear-7",   name: "Linear effect 7",   file: "7.swf" },
  { id: "swf-linear-8",   name: "Linear effect 8",   file: "8.swf" },
  { id: "swf-linear-9",   name: "Linear effect 9",   file: "9.swf" },
  { id: "swf-linear-10",  name: "Linear effect 10",  file: "10.swf" },
  { id: "swf-linear-11",  name: "Linear effect 11",  file: "11.swf" },
  { id: "swf-linear-12",  name: "Linear effect 12",  file: "12.swf" },
  { id: "swf-linear-13",  name: "Linear effect 13",  file: "13.swf" },
  { id: "swf-linear-14",  name: "Linear effect 14",  file: "14.swf" },
  { id: "swf-linear-15",  name: "Linear effect 15",  file: "15.swf" },
  { id: "swf-blue-white", name: "Blue and white",    file: "Blue and white.swf" },
  { id: "swf-blue-tail",  name: "Blue Tail",         file: "Blue Tail.swf" },
  { id: "swf-blue-yellow",name: "Blue Yellow",       file: "Blue Yellow.swf" },
  { id: "swf-blue-white-purple", name: "Blue_white_Purple", file: "Blue_white_Purple.swf" },
  { id: "swf-cyan-tail",  name: "Cyan Tail",         file: "Cyan Tail.swf" },
  { id: "swf-cyan-white", name: "Cyan White",        file: "Cyan White.swf" },
  { id: "swf-green-blue-yellow", name: "Green Blue Yellow", file: "Green Blue Yellow.swf" },
  { id: "swf-green-tailing", name: "Green tailing",   file: "Green tailing.swf" },
  { id: "swf-green-white",name: "Green_White",       file: "Green_White.swf" },
  { id: "swf-green-yellow-red-white", name: "Green_Yellow_Red_ White", file: "Green_Yellow_Red_ White.swf" },
  { id: "swf-red-white-purple", name: "Red and White Purple", file: "Red and White Purple.swf" },
  { id: "swf-red-white-tail", name: "Red and white tail", file: "Red and white tail.swf" },
  { id: "swf-red-blue-white", name: "Red blue and white", file: "Red blue and white.swf" },
  { id: "swf-red-tail",   name: "Red Tail",          file: "Red Tail.swf" },
  { id: "swf-red-green-yellow", name: "Red_green_yellow", file: "Red_green_yellow.swf" },
  { id: "swf-red-tailed", name: "Red-tailed",        file: "Red-tailed.swf" },
  { id: "swf-yellow-white", name: "Yellow and white", file: "Yellow and white.swf" },
  { id: "swf-yellow-tail",name: "Yellow Tail",       file: "Yellow Tail.swf" },
  { id: "swf-color-change", name: "Color change",    file: "Color change.swf" },
  { id: "swf-color-gradient", name: "Color gradient", file: "Color gradient.swf" },
  { id: "swf-passage",    name: "Passage",           file: "Passage.swf" },
  { id: "swf-over-down",  name: "Down",              file: "Down.swf" },
  { id: "swf-over-left",  name: "Left",              file: "Left.swf" },
  { id: "swf-over-right", name: "Right",             file: "Right.swf" },
  { id: "swf-over-up",    name: "Up",                file: "Up.swf" },
  { id: "swf-sym-double-angle-off", name: "Double angle off", file: "Double angle off.swf" },
  { id: "swf-sym-dual-angle-closure", name: "Dual-angle closure", file: "Dual-angle closure.swf" },
  { id: "swf-prolif-diamond", name: "Diamond-proliferation", file: "Diamond-proliferation.swf" },
  { id: "swf-prolif-diamond-systolic", name: "Diamond-shaped systolic", file: "Diamond-shaped systolic.swf" },
  { id: "swf-prolif-elliptical", name: "Elliptical contraction", file: "Elliptical contraction.swf" },
  { id: "swf-prolif-oval", name: "The proliferation of oval", file: "The proliferation of oval.swf" },
];

const BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SWF_BASE_URL) ||
  "/helper/";

export function swfFileFor(id: string): string | null {
  const e = SWF_EFFECTS.find((x) => x.id === id);
  if (!e) return null;
  const base = BASE_URL.endsWith("/") ? BASE_URL : BASE_URL + "/";
  return base + encodeURI(e.file);
}

export function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}
