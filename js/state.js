// Shared instrument state, derived params, presets, and URL (de)serialization.

import { PALETTES } from "./palettes.js";

export const MODES = ["attract", "repel", "vortex"];
export const SYMS = [1, 2, 3, 4, 6, 8];

export const state = {
  raw: { count: 1100, flow: 12, velocity: 10, persistence: 22, force: 7, turbulence: 35 },
  derived: {},
  palette: PALETTES[0],
  paletteIndex: 0,
  symmetry: 1,
  mode: "attract",
  seed: 1337,
  paused: false,
  time: 0,
  pointers: new Map(),       // pointerId -> {x, y}  (live cursor/touch attractors)
  lastInputAt: -1e9,         // ms of last real input; drives idle auto-drift
  audio: { enabled: false, level: 0 },
  tilt:  { enabled: false, x: 0, y: 0 },
  perf:  { scale: 1, active: 1100 },  // adaptive particle budget (FPS-targeted)
  reducedMotion: false   // calm mode: prefers-reduced-motion
};

// ---- calm mode: gentle defaults on a fresh load; a shared link's decode() (called
// after this) still wins, so links always reproduce their exact field either way ----
const motionMQ = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
state.reducedMotion = !!(motionMQ && motionMQ.matches);
if (state.reducedMotion) Object.assign(state.raw, { count: 550, velocity: 6, turbulence: 14, persistence: 27 });
if (motionMQ) motionMQ.addEventListener("change", e => { state.reducedMotion = e.matches; });

export function recompute() {
  const s = state.raw;
  state.derived = {
    scale: s.flow / 10000,
    speed: s.velocity / 10,
    fade: 0.20 - (s.persistence - 1) / 29 * (0.20 - 0.012),
    force: s.force,
    warp: s.turbulence / 100 * 0.9,
    octaves: 2
  };
}
recompute();

// ---- presets: curated starting points (full instrument state) ----
export const PRESETS = [
  { name: "drift", raw: { count: 1100, flow: 12, velocity: 10, persistence: 22, force: 7,  turbulence: 35 }, symmetry: 1, mode: "attract", palette: 0, seed: 1337 },
  { name: "halo",  raw: { count: 1700, flow: 22, velocity: 8,  persistence: 20, force: 10, turbulence: 60 }, symmetry: 8, mode: "attract", palette: 4, seed: 21 },
  { name: "bloom", raw: { count: 1500, flow: 18, velocity: 9,  persistence: 18, force: 9,  turbulence: 55 }, symmetry: 6, mode: "vortex",  palette: 5, seed: 7 },
  { name: "ember", raw: { count: 1300, flow: 16, velocity: 14, persistence: 16, force: 8,  turbulence: 50 }, symmetry: 1, mode: "repel",   palette: 1, seed: 99 },
  { name: "glyph", raw: { count: 900,  flow: 28, velocity: 16, persistence: 14, force: 6,  turbulence: 30 }, symmetry: 4, mode: "vortex",  palette: 6, seed: 512 },
  { name: "abyss", raw: { count: 2000, flow: 10, velocity: 7,  persistence: 26, force: 7,  turbulence: 45 }, symmetry: 2, mode: "attract", palette: 8, seed: 3001 }
];

export function applyPreset(p) {
  Object.assign(state.raw, p.raw);
  state.symmetry = p.symmetry;
  state.mode = p.mode;
  state.paletteIndex = p.palette;
  state.palette = PALETTES[p.palette];
  state.seed = p.seed;
  recompute();
}

// ---- URL state: compact, order-fixed, validated ----
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function encode() {
  const s = state.raw;
  return [s.count, s.flow, s.velocity, s.persistence, s.force, s.turbulence,
          state.symmetry, MODES.indexOf(state.mode), state.paletteIndex, state.seed].join(",");
}

export function decode(str) {
  const a = (str || "").replace(/^#/, "").split(",").map(Number);
  if (a.length < 10 || a.some(n => !isFinite(n))) return false;
  state.raw.count       = clamp(Math.round(a[0]), 150, 2400);
  state.raw.flow        = clamp(Math.round(a[1]), 6, 40);
  state.raw.velocity    = clamp(Math.round(a[2]), 2, 30);
  state.raw.persistence = clamp(Math.round(a[3]), 1, 30);
  state.raw.force       = clamp(Math.round(a[4]), 0, 16);
  state.raw.turbulence  = clamp(Math.round(a[5]), 0, 100);
  state.symmetry        = SYMS.includes(a[6]) ? a[6] : 1;
  state.mode            = MODES[a[7]] || "attract";
  state.paletteIndex    = clamp(a[8] | 0, 0, PALETTES.length - 1);
  state.palette         = PALETTES[state.paletteIndex];
  state.seed            = (a[9] >>> 0) || 1337;
  recompute();
  return true;
}
