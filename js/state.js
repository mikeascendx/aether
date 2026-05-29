// Shared instrument state + derived-parameter computation.

import { PALETTES } from "./palettes.js";

export const state = {
  raw: { count: 900, flow: 14, velocity: 12, persistence: 20, force: 7 },
  derived: {},
  palette: PALETTES[0],
  mode: "attract",
  paused: false,
  time: 0,
  mx: 0, my: 0, mouseActive: false
};

export function recompute() {
  const s = state.raw;
  state.derived = {
    scale: s.flow / 10000,
    speed: s.velocity / 10,
    fade: 0.20 - (s.persistence - 1) / 29 * (0.20 - 0.012),
    force: s.force
  };
}

recompute();
