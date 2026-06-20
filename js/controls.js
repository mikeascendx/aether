// DOM wiring: sliders, swatches, presets, symmetry, buttons, pointers, keys, URL state.

import { PALETTES } from "./palettes.js";
import { state, recompute, MODES, SYMS, PRESETS, applyPreset, encode, decode } from "./state.js";
import {
  initParticles, paintSolid, exportCanvas, reseedField, enableAudio, disableAudio
} from "./field.js";

const el = {};

function cacheEls() {
  const ids = {
    sCount: "s-count", vCount: "v-count",
    sFlow: "s-flow", vFlow: "v-flow",
    sVel: "s-vel", vVel: "v-vel",
    sPer: "s-per", vPer: "v-per",
    sForce: "s-force", vForce: "v-force",
    sTurb: "s-turb", vTurb: "v-turb",
    bMode: "b-mode", bPause: "b-pause", bClear: "b-clear", bRandom: "b-random",
    bShare: "b-share", bFs: "b-fs", bAudio: "b-audio", bTilt: "b-tilt", bExport: "b-export",
    swatches: "swatches", presets: "presets", symmetry: "symmetry",
    tCount: "t-count", tMode: "t-mode", tSym: "t-sym", toast: "toast",
    canvas: "field", console: "console", consoleToggle: "console-toggle"
  };
  for (const k in ids) el[k] = document.getElementById(ids[k]);
}

// ---- builders ----
function buildSwatches() {
  PALETTES.forEach((pal, idx) => {
    const b = document.createElement("button");
    b.className = "swatch"; b.dataset.index = idx; b.dataset.name = pal.name;
    b.setAttribute("aria-label", "palette " + pal.name);
    b.style.background = "linear-gradient(135deg," + pal.stops.map(c => "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")").join(",") + ")";
    b.addEventListener("click", () => setPalette(idx));
    el.swatches.appendChild(b);
  });
}
function buildPresets() {
  PRESETS.forEach((p, idx) => {
    const b = document.createElement("button");
    b.className = "chip"; b.textContent = p.name;
    b.addEventListener("click", () => loadPreset(idx));
    el.presets.appendChild(b);
  });
}
function buildSymmetry() {
  SYMS.forEach(s => {
    const b = document.createElement("button");
    b.className = "seg__btn"; b.dataset.sym = s;
    b.textContent = s === 1 ? "off" : s + "×";
    b.setAttribute("aria-label", s === 1 ? "symmetry off" : s + "-fold symmetry");
    b.addEventListener("click", () => setSymmetry(s));
    el.symmetry.appendChild(b);
  });
}

// ---- state -> UI ----
function applyAccent() {
  const a = state.palette.stops[2];
  document.documentElement.style.setProperty("--accent", "rgb(" + a[0] + "," + a[1] + "," + a[2] + ")");
}
function markPalette(idx) { [...el.swatches.children].forEach((c, i) => c.dataset.active = (i === idx) ? "1" : "0"); }
function markSymmetry(s)  { [...el.symmetry.children].forEach(c => c.dataset.active = (+c.dataset.sym === s) ? "1" : "0"); }
function setModeUI() { el.bMode.textContent = state.mode; el.tMode.textContent = state.mode; }
function syncLabels() {
  el.vCount.textContent = state.raw.count;
  el.vFlow.textContent  = state.raw.flow;
  el.vVel.textContent   = (state.raw.velocity / 10).toFixed(1);
  el.vPer.textContent   = state.raw.persistence;
  el.vForce.textContent = state.raw.force;
  el.vTurb.textContent  = state.raw.turbulence;
  el.tCount.textContent = state.perf.active;
  el.tSym.textContent   = state.symmetry === 1 ? "off" : state.symmetry + "×";
}
function syncSliders() {
  el.sCount.value = state.raw.count;
  el.sFlow.value  = state.raw.flow;
  el.sVel.value   = state.raw.velocity;
  el.sPer.value   = state.raw.persistence;
  el.sForce.value = state.raw.force;
  el.sTurb.value  = state.raw.turbulence;
}
function syncUI() {
  syncSliders(); syncLabels(); setModeUI();
  markPalette(state.paletteIndex); markSymmetry(state.symmetry); applyAccent();
}

// rebuild the noise field + particle set (seed/count/preset changes)
function applyFieldReset() {
  reseedField(state.seed);
  initParticles(state.raw.count);
}

// ---- user actions ----
function setPalette(idx) {
  state.paletteIndex = idx; state.palette = PALETTES[idx];
  applyAccent(); markPalette(idx); scheduleHash();
}
function setSymmetry(s) {
  state.symmetry = s; markSymmetry(s); paintSolid();
  el.tSym.textContent = s === 1 ? "off" : s + "×"; scheduleHash();
}
function cycleMode() {
  state.mode = MODES[(MODES.indexOf(state.mode) + 1) % MODES.length];
  setModeUI(); scheduleHash();
}
function setPaused(v) { state.paused = v; el.bPause.textContent = v ? "resume" : "pause"; el.bPause.setAttribute("aria-pressed", v ? "true" : "false"); }

function rint(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }
function randomize() {
  state.raw.count       = rint(40, 200) * 10;
  state.raw.flow        = rint(8, 34);
  state.raw.velocity    = rint(6, 26);
  state.raw.persistence = rint(10, 28);
  state.raw.force       = rint(3, 14);
  state.raw.turbulence  = rint(10, 80);
  state.symmetry        = SYMS[rint(0, SYMS.length - 1)];
  state.mode            = MODES[rint(0, MODES.length - 1)];
  state.paletteIndex    = rint(0, PALETTES.length - 1);
  state.palette         = PALETTES[state.paletteIndex];
  state.seed            = rint(1, 1e9);
  recompute(); applyFieldReset(); syncUI(); scheduleHash();
}
function loadPreset(idx) {
  applyPreset(PRESETS[idx]); applyFieldReset(); syncUI(); scheduleHash();
}
function exportPNG() { try { exportCanvas(); flash("image saved"); } catch (e) { flash("export blocked"); } }

let toastTimer;
function flash(msg) {
  el.toast.textContent = msg; el.toast.dataset.show = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.dataset.show = "0", 1600);
}

// ---- share / fullscreen ----
async function share() {
  const url = location.origin + location.pathname + "#" + encode();
  try { await navigator.clipboard.writeText(url); flash("link copied"); }
  catch {
    const ta = document.createElement("textarea");
    ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand("copy"); flash("link copied"); } catch { flash("copy failed"); }
    ta.remove();
  }
}
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
}

// ---- audio / tilt (opt-in, permission-gated, fail-safe) ----
async function toggleAudio() {
  if (state.audio.enabled) {
    disableAudio(); state.audio.enabled = false;
    el.bAudio.dataset.on = "0"; el.bAudio.setAttribute("aria-pressed", "false"); flash("audio off"); return;
  }
  try {
    await enableAudio(); state.audio.enabled = true;
    el.bAudio.dataset.on = "1"; el.bAudio.setAttribute("aria-pressed", "true"); flash("audio reactive");
  } catch { flash("mic blocked"); }
}
function onTilt(e) {
  if (e.gamma == null || e.beta == null) return;
  state.tilt.x = Math.max(-1, Math.min(1, e.gamma / 30));
  state.tilt.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
}
async function toggleTilt() {
  if (state.tilt.enabled) {
    window.removeEventListener("deviceorientation", onTilt);
    state.tilt.enabled = false; state.tilt.x = 0; state.tilt.y = 0;
    el.bTilt.dataset.on = "0"; el.bTilt.setAttribute("aria-pressed", "false"); flash("tilt off"); return;
  }
  try {
    const DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === "function") {
      const res = await DOE.requestPermission();
      if (res !== "granted") { flash("tilt denied"); return; }
    }
    window.addEventListener("deviceorientation", onTilt);
    state.tilt.enabled = true; el.bTilt.dataset.on = "1"; el.bTilt.setAttribute("aria-pressed", "true"); flash("tilt steering");
  } catch { flash("tilt unavailable"); }
}

// ---- console collapse (mobile sheet) ----
function toggleConsole() {
  const open = document.body.classList.toggle("console-open");
  el.consoleToggle.setAttribute("aria-expanded", open ? "true" : "false");
  el.consoleToggle.textContent = open ? "close" : "controls";
}

// ---- URL hash (debounced, shareable) ----
let hashTimer;
function scheduleHash() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => { try { history.replaceState(null, "", "#" + encode()); } catch {} }, 400);
}

// ---- pointers: multi-touch attractors + tap-to-cycle-mode + hover ----
const downInfo = new Map();
function now() { return performance.now(); }
function onDown(e) {
  state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  downInfo.set(e.pointerId, { x: e.clientX, y: e.clientY, t: now() });
  state.lastInputAt = now();
}
function onMove(e) {
  if (e.pointerType === "mouse" || state.pointers.has(e.pointerId)) {
    state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    state.lastInputAt = now();
  }
}
function onUp(e) {
  const di = downInfo.get(e.pointerId); downInfo.delete(e.pointerId);
  if (e.pointerType !== "mouse") state.pointers.delete(e.pointerId);
  if (di) {
    const dx = e.clientX - di.x, dy = e.clientY - di.y;
    if (now() - di.t < 350 && dx * dx + dy * dy < 100) cycleMode();   // a tap, not a drag
  }
}
// a cancelled gesture (pinch-zoom hijack, system edge-swipe) is NOT a tap — just drop it
function onCancel(e) { downInfo.delete(e.pointerId); state.pointers.delete(e.pointerId); }
// drop the mouse attractor only when the cursor truly leaves the window, not when it
// crosses onto the console/header overlays (which fire a bubbling pointerout with a relatedTarget)
function onOut(e) { if (e.pointerType === "mouse" && !e.relatedTarget) state.pointers.delete(e.pointerId); }

// ---- listeners ----
function wireListeners() {
  el.sCount.addEventListener("input", e => { state.raw.count = +e.target.value; initParticles(state.raw.count); syncLabels(); scheduleHash(); });
  el.sFlow.addEventListener("input",  e => { state.raw.flow = +e.target.value; recompute(); syncLabels(); scheduleHash(); });
  el.sVel.addEventListener("input",   e => { state.raw.velocity = +e.target.value; recompute(); syncLabels(); scheduleHash(); });
  el.sPer.addEventListener("input",   e => { state.raw.persistence = +e.target.value; recompute(); syncLabels(); scheduleHash(); });
  el.sForce.addEventListener("input", e => { state.raw.force = +e.target.value; recompute(); syncLabels(); scheduleHash(); });
  el.sTurb.addEventListener("input",  e => { state.raw.turbulence = +e.target.value; recompute(); syncLabels(); scheduleHash(); });

  el.bMode.addEventListener("click", cycleMode);
  el.bPause.addEventListener("click", () => setPaused(!state.paused));
  el.bClear.addEventListener("click", () => paintSolid());
  el.bRandom.addEventListener("click", randomize);
  el.bShare.addEventListener("click", share);
  el.bFs.addEventListener("click", toggleFullscreen);
  el.bAudio.addEventListener("click", toggleAudio);
  el.bTilt.addEventListener("click", toggleTilt);
  el.bExport.addEventListener("click", exportPNG);
  el.consoleToggle.addEventListener("click", toggleConsole);

  el.canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
  window.addEventListener("pointerout", onOut);

  window.addEventListener("keydown", e => {
    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.key === " " && tag === "BUTTON") return;   // let a focused button handle its own Space activation
    const k = e.key.toLowerCase();
    if (e.key === " ") { e.preventDefault(); setPaused(!state.paused); }
    else if (k === "r") randomize();
    else if (k === "c") paintSolid();
    else if (k === "e") exportPNG();
    else if (k === "s") share();
    else if (k === "f") toggleFullscreen();
    else if (k === "m") cycleMode();
    else if (k === "h") document.body.classList.toggle("ui-hidden");
  });
}

export function initControls() {
  cacheEls();
  buildSwatches();
  buildPresets();
  buildSymmetry();
  wireListeners();

  // hide tilt on devices without a motion sensor (desktop)
  if (!window.matchMedia || !window.matchMedia("(pointer:coarse)").matches) el.bTilt.style.display = "none";
  // hide fullscreen where the API is absent (iPhone Safari)
  if (!document.documentElement.requestFullscreen) el.bFs.style.display = "none";

  // restore shared state from the URL, if present
  if (location.hash.length > 3) decode(location.hash);

  syncUI();
  applyFieldReset();
}
