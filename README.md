# aether

A generative **vector-field instrument** you shape in real time. A Perlin flow
field drives thousands of particles that trail luminous strokes across a canvas;
tune the parameters, flip attract/repel, pick a palette, and export a still.

Built as a zero-build static site — plain HTML, CSS, and native ES modules. No
framework, no bundler, no backend.

## Controls

| Input | Action |
|-------|--------|
| Move cursor / drag | Disturb the field within a radius |
| Click / tap canvas | Flip attract ↔ repel |
| `space` | Pause / resume |
| `r` | Randomize all parameters |
| `c` | Clear the canvas |
| `e` | Export current frame as PNG |
| `h` | Hide / show the UI |

Sliders: **particles**, **flow scale**, **velocity**, **persistence**, **cursor
force**. Palette swatches recolor the field and accent. On phones, tap the
**controls** button to open the console sheet.

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
  perlin.js             seeded 2D Perlin noise (pure)
  palettes.js           palette stops + gradient sampling (pure)
  state.js              shared params + recompute()
  field.js              canvas, particle simulation, render loop, PNG export
  controls.js           DOM wiring: sliders, swatches, buttons, keys, toast
  main.js               boot + render loop
```
