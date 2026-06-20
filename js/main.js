// Boot: wire the field and controls, then start the render loop.

import { initField, resize, startLoop } from "./field.js";
import { initControls } from "./controls.js";

initField();
resize();
initControls();   // restores URL state, builds UI, seeds noise, inits particles

let resizeRaf;
window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(resize);
});

startLoop();
