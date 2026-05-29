// DOM wiring: sliders, swatches, buttons, keyboard, toast, console toggle.

import { PALETTES } from "./palettes.js";
import { state, recompute } from "./state.js";
import { initParticles, paintSolid, exportCanvas } from "./field.js";

const el = {};

function cacheEls() {
  const ids = {
    sCount: "s-count", vCount: "v-count",
    sFlow: "s-flow", vFlow: "v-flow",
    sVel: "s-vel", vVel: "v-vel",
    sPer: "s-per", vPer: "v-per",
    sForce: "s-force", vForce: "v-force",
    bMode: "b-mode", bPause: "b-pause", bClear: "b-clear",
    bRandom: "b-random", bExport: "b-export",
    swatches: "swatches",
    tCount: "t-count", tMode: "t-mode", toast: "toast",
    canvas: "field", console: "console", consoleToggle: "console-toggle"
  };
  for (const k in ids) el[k] = document.getElementById(ids[k]);
}

// ---- palette ----
function buildSwatches() {
  PALETTES.forEach((pal, idx) => {
    const b = document.createElement("button");
    b.className = "swatch"; b.dataset.index = idx; b.dataset.name = pal.name;
    b.style.background = "linear-gradient(135deg," + pal.stops.map(c => "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")").join(",") + ")";
    b.addEventListener("click", () => setPalette(idx));
    el.swatches.appendChild(b);
  });
}
function setPalette(idx) {
  state.palette = PALETTES[idx];
  const accent = state.palette.stops[2];
  document.documentElement.style.setProperty("--accent", "rgb(" + accent[0] + "," + accent[1] + "," + accent[2] + ")");
  [...el.swatches.children].forEach((c, i) => c.dataset.active = (i === idx) ? "1" : "0");
}

// ---- ui sync ----
function setMode(m) {
  state.mode = m;
  el.bMode.textContent = m;
  el.tMode.textContent = m;
}
function setPaused(v) {
  state.paused = v;
  el.bPause.textContent = v ? "resume" : "pause";
}
function syncLabels() {
  el.vCount.textContent = state.raw.count;
  el.vFlow.textContent = state.raw.flow;
  el.vVel.textContent = (state.raw.velocity / 10).toFixed(1);
  el.vPer.textContent = state.raw.persistence;
  el.vForce.textContent = state.raw.force;
  el.tCount.textContent = state.raw.count;
}
function syncSliders() {
  el.sCount.value = state.raw.count;
  el.sFlow.value = state.raw.flow;
  el.sVel.value = state.raw.velocity;
  el.sPer.value = state.raw.persistence;
  el.sForce.value = state.raw.force;
}

// ---- actions ----
function rint(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }
function randomize() {
  state.raw.count       = rint(40, 180) * 10;   // 400..1800
  state.raw.flow        = rint(8, 34);
  state.raw.velocity    = rint(6, 26);
  state.raw.persistence = rint(10, 28);
  state.raw.force       = rint(3, 14);
  setMode(Math.random() < 0.5 ? "attract" : "repel");
  setPalette(rint(0, PALETTES.length - 1));
  recompute(); syncSliders(); syncLabels();
  initParticles(state.raw.count);
}
function exportPNG() {
  try { exportCanvas(); flash("image saved"); }
  catch (err) { flash("export blocked"); }
}
let toastTimer;
function flash(msg) {
  el.toast.textContent = msg;
  el.toast.dataset.show = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.dataset.show = "0", 1600);
}

// ---- console collapse (mobile) ----
function toggleConsole() {
  const open = document.body.classList.toggle("console-open");
  el.consoleToggle.setAttribute("aria-expanded", open ? "true" : "false");
  el.consoleToggle.textContent = open ? "close" : "controls";
}

// ---- listeners ----
function wireListeners() {
  el.sCount.addEventListener("input", e => { state.raw.count = +e.target.value; syncLabels(); initParticles(state.raw.count); });
  el.sFlow.addEventListener("input",  e => { state.raw.flow = +e.target.value; syncLabels(); recompute(); });
  el.sVel.addEventListener("input",   e => { state.raw.velocity = +e.target.value; syncLabels(); recompute(); });
  el.sPer.addEventListener("input",   e => { state.raw.persistence = +e.target.value; syncLabels(); recompute(); });
  el.sForce.addEventListener("input", e => { state.raw.force = +e.target.value; syncLabels(); recompute(); });

  el.bMode.addEventListener("click", () => setMode(state.mode === "attract" ? "repel" : "attract"));
  el.bPause.addEventListener("click", () => setPaused(!state.paused));
  el.bClear.addEventListener("click", () => paintSolid());
  el.bRandom.addEventListener("click", randomize);
  el.bExport.addEventListener("click", exportPNG);
  el.consoleToggle.addEventListener("click", toggleConsole);

  el.canvas.addEventListener("pointerdown", () => setMode(state.mode === "attract" ? "repel" : "attract"));
  window.addEventListener("pointermove", e => { state.mx = e.clientX; state.my = e.clientY; state.mouseActive = true; });
  window.addEventListener("pointerout", () => state.mouseActive = false);

  window.addEventListener("keydown", e => {
    const k = e.key.toLowerCase();
    if (e.key === " ") { e.preventDefault(); setPaused(!state.paused); }
    else if (k === "r") randomize();
    else if (k === "c") paintSolid();
    else if (k === "e") exportPNG();
    else if (k === "h") document.body.classList.toggle("ui-hidden");
  });
}

export function initControls() {
  cacheEls();
  buildSwatches();
  wireListeners();
  setPalette(0);
  syncSliders();
  syncLabels();
}
