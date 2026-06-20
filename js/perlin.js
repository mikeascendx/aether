// Seeded 2D Perlin noise + fractal (fbm) + curl. Pure — no DOM, no shared state.

const perm = new Uint8Array(512);

// Reseedable permutation table. Same seed -> same field, so a field is shareable.
export function reseed(seed) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = ((seed >>> 0) % 2147483647) || 1;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}
reseed(1337);

const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + t * (b - a);

function grad(h, x, y) {
  const g = h & 7;
  const u = g < 4 ? x : y;
  const v = g < 4 ? y : x;
  return ((g & 1) ? -u : u) + ((g & 2) ? -2 * v : 2 * v);
}

export function perlin2(x, y) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
  x -= Math.floor(x); y -= Math.floor(y);
  const u = fade(x), v = fade(y);
  const aa = perm[perm[X] + Y],     ab = perm[perm[X] + Y + 1];
  const ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
  return lerp(lerp(grad(aa, x, y), grad(ba, x - 1, y), u),
              lerp(grad(ab, x, y - 1), grad(bb, x - 1, y - 1), u), v);
}

// Fractal Brownian motion: stacked octaves -> structure at many scales.
export function fbm2(x, y, octaves) {
  let amp = 0.5, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * perlin2(x * freq, y * freq);
    norm += amp; amp *= 0.5; freq *= 2;
  }
  return sum / norm;
}
