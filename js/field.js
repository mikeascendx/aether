// Canvas, curl-noise particle simulation, render loop, resize, PNG export.

import { perlin2, fbm2, reseed } from "./perlin.js";
import { sampleGradient, BG, BG_SOLID } from "./palettes.js";
import { state } from "./state.js";

let canvas, ctx, tFps, tCount;
let W = 0, H = 0, dpr = 1;
let P = [];
let raf, last = performance.now(), frames = 0, acc = 0, fps = 60;

// reused per-frame scratch so symmetry trig is computed once, not per particle
const SYC = [], SYS = [];
const COL = [0, 0, 0];   // scratch color so the hot loop allocates nothing

export function initField() {
  canvas = document.getElementById("field");
  ctx = canvas.getContext("2d");
  tFps = document.getElementById("t-fps");
  tCount = document.getElementById("t-count");
  return canvas;
}

export function paintSolid() {
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = BG_SOLID;
  ctx.fillRect(0, 0, W, H);
}

export function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + "px"; canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  paintSolid();
}

// ---- particles ----
function makeP() {
  const x = Math.random() * W, y = Math.random() * H;
  return { x, y, px: x, py: y, t: Math.random(), life: 60 + Math.random() * 300 };
}
function respawn(p) {
  p.x = Math.random() * W; p.y = Math.random() * H; p.px = p.x; p.py = p.y;
  p.t = Math.random(); p.life = 60 + Math.random() * 300;
}
export function initParticles(n) {
  P = new Array(n);
  for (let i = 0; i < n; i++) P[i] = makeP();
  state.perf.active = Math.min(state.perf.active, n);
}

// Re-seed the noise field and clear — used by seed changes / randomize / presets.
export function reseedField(seed) {
  reseed(seed);
  paintSolid();
}

// ---- audio reactivity (opt-in) ----
let analyser = null, audioBuf = null, audioCtx = null, micStream = null;
export async function enableAudio() {
  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") { try { await audioCtx.resume(); } catch {} }  // iOS starts suspended
  const src = audioCtx.createMediaStreamSource(micStream);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  audioBuf = new Uint8Array(analyser.frequencyBinCount);
  src.connect(analyser);
}
export function disableAudio() {
  if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }  // release the mic + clear OS indicator
  if (audioCtx) { audioCtx.close().catch(() => {}); }
  analyser = null; audioBuf = null; audioCtx = null;
  state.audio.level = 0;
}
function sampleAudio() {
  if (!analyser) return;
  analyser.getByteTimeDomainData(audioBuf);
  let sum = 0;
  for (let i = 0; i < audioBuf.length; i++) { const v = (audioBuf[i] - 128) / 128; sum += v * v; }
  const rms = Math.sqrt(sum / audioBuf.length);          // 0..~1
  const target = Math.min(1, rms * 3.2);
  state.audio.level += (target - state.audio.level) * 0.25;  // smooth attack/decay
}

// ---- idle auto-drift: a ghost cursor wanders when nobody is touching ----
const ghost = { x: 0, y: 0 };
function ghostAt(t) {
  const amp = state.reducedMotion ? 0.55 : 1, spd = state.reducedMotion ? 0.5 : 1;   // calm mode: slower, smaller wander
  ghost.x = W * 0.5 + Math.cos(t * 0.7 * spd) * W * 0.32 * amp + Math.cos(t * 1.9 * spd + 1.3) * W * 0.12 * amp;
  ghost.y = H * 0.5 + Math.sin(t * 0.9 * spd) * H * 0.30 * amp + Math.sin(t * 1.5 * spd + 0.7) * H * 0.10 * amp;
  return ghost;
}

// ---- adaptive performance: hold ~60fps by scaling the active particle budget ----
function adapt() {
  const pf = state.perf;
  if (fps < 44) pf.scale = Math.max(0.2, pf.scale - 0.08);
  else if (fps > 57) pf.scale = Math.min(1, pf.scale + 0.05);
  pf.active = Math.max(60, Math.min(P.length, Math.round(state.raw.count * pf.scale)));
  if (tCount) tCount.textContent = pf.active;
}

// ---- symmetry: draw a segment + its kaleidoscope copies (trig precomputed) ----
// All 2N copies batch into ONE path -> a single stroke() per particle, not 2N.
function drawSym(ax, ay, bx, by, cx, cy, n) {
  const oax = ax - cx, oay = ay - cy, obx = bx - cx, oby = by - cy;
  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    const cs = SYC[k], sn = SYS[k];
    ctx.moveTo(cx + oax * cs - oay * sn, cy + oax * sn + oay * cs);
    ctx.lineTo(cx + obx * cs - oby * sn, cy + obx * sn + oby * cs);
    // mirrored copy (reflect across the vertical axis, then rotate) -> kaleidoscope
    ctx.moveTo(cx - oax * cs - oay * sn, cy - oax * sn + oay * cs);
    ctx.lineTo(cx - obx * cs - oby * sn, cy - obx * sn + oby * cs);
  }
  ctx.stroke();
}

// ---- render loop ----
const EPS = 0.0006, R = 160, R2 = R * R, TAU = 6.28318;

function frame(now) {
  raf = requestAnimationFrame(frame);
  const delta = now - last; last = now;
  acc += delta; frames++;
  if (acc >= 500) { fps = Math.round(1000 * frames / acc); frames = 0; acc = 0; tFps.textContent = fps; adapt(); }

  if (state.paused) return;

  if (state.audio.enabled) sampleAudio();
  const energy = 1 + state.audio.level * (state.reducedMotion ? 0.6 : 1.6);   // calm mode: no sudden audio spikes

  const d = state.derived;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(" + BG[0] + "," + BG[1] + "," + BG[2] + "," + d.fade + ")";
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "lighter";

  state.time += 0.0016 * (d.speed * 0.8 + 0.4) * energy;
  const t = state.time, sc = d.scale, sp = d.speed * energy, warp = d.warp, oct = d.octaves;
  const stops = state.palette.stops, force = d.force * energy, mode = state.mode;
  const cx0 = W * 0.5, cy0 = H * 0.5;

  // global tilt bias (opt-in)
  const tx = state.tilt.enabled ? state.tilt.x * sp * 0.9 : 0;
  const ty = state.tilt.enabled ? state.tilt.y * sp * 0.9 : 0;

  // symmetry transforms for this frame
  const sym = state.symmetry | 0, useSym = sym > 1;
  if (useSym) { const step = TAU / sym; for (let k = 0; k < sym; k++) { SYC[k] = Math.cos(step * k); SYS[k] = Math.sin(step * k); } }

  // gather active attractors: live pointers, else an idle ghost
  const pts = [];
  for (const v of state.pointers.values()) pts.push(v);
  if (pts.length === 0 && now - state.lastInputAt > 2600) pts.push(ghostAt(t));

  const n = state.perf.active;
  for (let i = 0; i < n; i++) {
    const p = P[i];
    p.px = p.x; p.py = p.y;

    // domain-warped curl noise -> divergence-free, fluid flow
    let sx = p.x * sc, sy = p.y * sc + t;
    if (warp > 0) {
      sx += warp * perlin2(p.x * sc * 0.5 + 19.3, p.y * sc * 0.5 - t * 0.5);
      sy += warp * perlin2(p.x * sc * 0.5 - 7.7, p.y * sc * 0.5 + t * 0.5);
    }
    const n1 = fbm2(sx, sy + EPS, oct), n2 = fbm2(sx, sy - EPS, oct);
    const n3 = fbm2(sx + EPS, sy, oct), n4 = fbm2(sx - EPS, sy, oct);
    const vx = n1 - n2, vy = -(n3 - n4);            // curl vector; direction is all we need
    const mag = Math.sqrt(vx * vx + vy * vy);
    if (mag > 1e-9) { const k = sp / mag; p.x += vx * k + tx; p.y += vy * k + ty; }
    else { p.x += tx; p.y += ty; }

    // cursor / touch forces (every active attractor)
    if (force > 0) {
      for (let k = 0; k < pts.length; k++) {
        const dx = p.x - pts[k].x, dy = p.y - pts[k].y, d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 0.01) {
          const dist = Math.sqrt(d2), fall = 1 - dist / R, inv = 1 / dist, f = force * fall;
          if (mode === "vortex") {
            p.x += (-dy * inv) * f - dx * inv * f * 0.25;   // tangential + slight inward = spiral
            p.y += ( dx * inv) * f - dy * inv * f * 0.25;
          } else {
            const sign = mode === "attract" ? -1 : 1;
            p.x += dx * inv * f * sign;
            p.y += dy * inv * f * sign;
          }
        }
      }
    }

    // color + speed-mapped stroke weight
    const seg = Math.abs(p.x - p.px) + Math.abs(p.y - p.py);
    const c = sampleGradient(stops, p.t, COL);
    ctx.strokeStyle = "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + (0.40 + Math.min(seg * 0.05, 0.30)).toFixed(3) + ")";
    ctx.lineWidth = 0.9 + Math.min(seg * 0.04, 0.9);

    if (useSym) drawSym(p.px, p.py, p.x, p.y, cx0, cy0, sym);
    else { ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke(); }

    if (--p.life <= 0 || p.x < -2 || p.x > W + 2 || p.y < -2 || p.y > H + 2) respawn(p);
  }
}

export function startLoop() {
  raf = requestAnimationFrame(frame);
}

// ---- battery: fully stop the rAF loop when the tab is hidden, resume on return.
// tracked separately from state.paused (space bar / pause button) so a user-paused
// field stays paused after the tab comes back ----
let hiddenPaused = false;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (raf) { cancelAnimationFrame(raf); raf = null; hiddenPaused = true; }
  } else if (hiddenPaused) {
    hiddenPaused = false;
    last = performance.now();   // avoid a huge delta on resume
    raf = requestAnimationFrame(frame);
  }
});

export function exportCanvas() {
  const name = "aether-" + state.palette.name + "-" + state.seed + ".png";
  const grab = url => { const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
  if (canvas.toBlob) {
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      grab(url);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, "image/png");
  } else {
    grab(canvas.toDataURL("image/png"));
  }
}
