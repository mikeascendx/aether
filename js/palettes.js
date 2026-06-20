// Palette data (rgb stops) + gradient sampling. Pure.

export const PALETTES = [
  { name: "aether",  stops: [[43, 26, 140], [109, 43, 209], [217, 79, 209], [70, 224, 208]] },
  { name: "ember",   stops: [[60, 16, 8], [214, 52, 24], [255, 140, 48], [255, 224, 150]] },
  { name: "verdant", stops: [[6, 38, 31], [15, 122, 90], [63, 214, 160], [214, 255, 158]] },
  { name: "solaris", stops: [[34, 18, 4], [255, 140, 0], [255, 208, 0], [255, 243, 176]] },
  { name: "glacier", stops: [[4, 26, 46], [16, 110, 189], [89, 193, 255], [205, 235, 255]] },
  { name: "bloom",   stops: [[42, 10, 42], [255, 61, 129], [255, 154, 139], [255, 214, 165]] },
  { name: "mono",    stops: [[26, 26, 30], [120, 120, 128], [210, 210, 216], [255, 255, 255]] },
  { name: "cobalt",  stops: [[8, 12, 48], [38, 64, 196], [82, 158, 255], [180, 234, 255]] },
  { name: "aurora",  stops: [[10, 32, 38], [22, 178, 142], [120, 230, 170], [236, 130, 222]] }
];

export const BG = [5, 6, 11];
export const BG_SOLID = "#05060b";

export function sampleGradient(stops, t, out) {
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const n = stops.length - 1, f = t * n, i = Math.floor(f), frac = f - i;
  const a = stops[i], b = stops[Math.min(i + 1, n)];
  const o = out || [0, 0, 0];   // reuse caller's array in hot loops; allocate only if absent
  o[0] = a[0] + (b[0] - a[0]) * frac;
  o[1] = a[1] + (b[1] - a[1]) * frac;
  o[2] = a[2] + (b[2] - a[2]) * frac;
  return o;
}
