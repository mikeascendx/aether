// Boot: wire the field and controls, then start the render loop.

import { initField, resize, initParticles, startLoop, centerCursor } from "./field.js";
import { initControls } from "./controls.js";
import { state } from "./state.js";

initField();
resize();
initControls();
initParticles(state.raw.count);

// Seed motion from center until the first real cursor input.
centerCursor();
setTimeout(() => { if (!("ontouchstart" in window)) state.mouseActive = false; }, 1400);

let resizeRaf;
window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(resize);
});

startLoop();
