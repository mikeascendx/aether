// Canvas, particle simulation, render loop, resize, and PNG export.

import { perlin2 } from "./perlin.js";
import { sampleGradient, BG, BG_SOLID } from "./palettes.js";
import { state } from "./state.js";

let canvas, ctx, tFps;
let W = 0, H = 0, dpr = 1;
let P = [];
let raf, last = performance.now(), frames = 0, acc = 0, fps = 60;

export function initField() {
  canvas = document.getElementById("field");
  ctx = canvas.getContext("2d");
  tFps = document.getElementById("t-fps");
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
}

// ---- render loop ----
function frame(now) {
  raf = requestAnimationFrame(frame);
  const delta = now - last; last = now;
  acc += delta; frames++;
  if (acc >= 500) { fps = Math.round(1000 * frames / acc); frames = 0; acc = 0; tFps.textContent = fps; }

  if (state.paused) return;

  const d = state.derived;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(" + BG[0] + "," + BG[1] + "," + BG[2] + "," + d.fade + ")";
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = "lighter";
  ctx.lineWidth = 1.05;

  state.time += 0.0016 * (d.speed * 0.8 + 0.4);
  const sc = d.scale, sp = d.speed, t = state.time, stops = state.palette.stops;
  const mAct = state.mouseActive, mx = state.mx, my = state.my, force = d.force;
  const sign = state.mode === "attract" ? -1 : 1, R = 160, R2 = R * R;

  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    p.px = p.x; p.py = p.y;
    const ang = perlin2(p.x * sc, p.y * sc + t) * 6.28318 * 1.3;
    p.x += Math.cos(ang) * sp;
    p.y += Math.sin(ang) * sp;

    if (mAct && force > 0) {
      const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
      if (d2 < R2 && d2 > 0.01) {
        const dist = Math.sqrt(d2), fall = 1 - dist / R, inv = 1 / dist;
        p.x += dx * inv * force * fall * sign;
        p.y += dy * inv * force * fall * sign;
      }
    }

    const c = sampleGradient(stops, p.t);
    ctx.strokeStyle = "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ",0.52)";
    ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();

    if (--p.life <= 0 || p.x < -2 || p.x > W + 2 || p.y < -2 || p.y > H + 2) respawn(p);
  }
}

export function startLoop() {
  raf = requestAnimationFrame(frame);
}

// Seed a little motion before first cursor input.
export function centerCursor() {
  state.mx = W * 0.5; state.my = H * 0.5; state.mouseActive = true;
}

export function exportCanvas() {
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url; a.download = "aether-field.png";
  document.body.appendChild(a); a.click(); a.remove();
}
