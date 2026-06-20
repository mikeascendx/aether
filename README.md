# aether

A generative **vector-field instrument** you shape, perform, and share in real
time. Thousands of particles ride a **curl-noise flow field** — divergence-free,
fluid, smoke-like motion — trailing luminous strokes across a canvas. Disturb the
field with the cursor or touch, mirror it into a **kaleidoscope**, tune the
parameters live, then copy a link that reproduces the exact field for anyone.

Built as a zero-build static site — plain HTML, CSS, and native ES modules. No
framework, no bundler, no backend.

## Controls

| Input | Action |
|-------|--------|
| Move / drag (or one+ fingers) | Disturb the field; every touch is its own attractor |
| Tap / click canvas | Cycle field mode: **attract → repel → vortex** |
| `space` | Pause / resume |
| `r` | Randomize everything (params, palette, symmetry, seed) |
| `c` | Clear the canvas |
| `e` | Export current frame as PNG |
| `s` | Copy a shareable link to this exact field |
| `f` | Toggle fullscreen |
| `m` | Cycle field mode |
| `h` | Hide / show the UI |

**Sliders:** particles · flow scale · velocity · persistence · cursor force ·
turbulence (domain-warp strength). **Symmetry:** off / 2 / 3 / 4 / 6 / 8-fold
kaleidoscope. **Presets:** curated starting points. **Palette** swatches recolor
the field and accent.

**Opt-in (permission-gated, fail-safe):**
- **audio** — the field pulses with microphone input.
- **tilt** — steer the global flow by tilting the device (touch devices with a
  motion sensor).

**Share:** the URL hash encodes the full instrument state. The address bar always
reflects the current field; `share` copies it. Opening a link restores the field
exactly (same noise seed → same shape).

**Performance:** the particle budget adapts to the measured frame rate, so phones
and tablets stay smooth even at high symmetry.

## Run locally

ES modules must be served over HTTP — opening `index.html` directly from disk
(`file://`) will fail with a CORS error. Use any static server:

```bash
# Python (built in on most systems)
python -m http.server 8787

# or Node
npx serve .
```

Then open <http://localhost:8787>.

## Structure

```
index.html              markup; loads css + main.js module
css/aether.css          all styles (theme tokens, layout, responsive)
js/
  perlin.js             seeded Perlin noise + fbm (reseedable; pure)
  palettes.js           palette stops + gradient sampling (pure)
  state.js              shared params, presets, URL encode/decode
  field.js              canvas, curl-noise sim, symmetry, audio, render loop, export
  controls.js           DOM wiring: sliders, swatches, presets, pointers, keys, share
  main.js               boot + render loop
```
