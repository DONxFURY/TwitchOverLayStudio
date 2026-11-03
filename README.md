# Twitch Overlay Studio

**A local, zero-dependency Twitch overlay designer.** Build scenes on a 1920×1080
canvas, animate every layer, restyle them with one click, and export a
ready-to-use OBS browser-source bundle, transparent GIF/APNG loops, or a
rendered `.mp4`.

[![License: MIT](https://img.shields.io/badge/license-MIT-3b82f6.svg)](LICENSE)
![Dependencies: none](https://img.shields.io/badge/dependencies-0-22c55e.svg)
![Build step: none](https://img.shields.io/badge/build-none-64748b.svg)
![Runs offline](https://img.shields.io/badge/network-not%20required-8b5cf6.svg)

No build step, no `npm install`, no internet connection. Classic scripts, plain
DOM, Canvas 2D and SVG — open it and it runs.

## Quick start

| Platform | How |
| --- | --- |
| **Windows** | double-click **`start.bat`** |
| Any OS with Node 14+ | `npm start` (or `node server.js`) |
| Any static server | `python3 -m http.server 8787 --bind 127.0.0.1`, then open <http://localhost:8787/> |
| No runtime at all | open `index.html` directly — everything works except ZIP bundle export |

`start.bat` tries Node, then Python, then falls back to opening the file
directly, so a machine with nothing installed still ends up in the editor. It
prints the URL it chose and stops on `Ctrl+C`.

`PORT=8787` changes the port and `NO_OPEN=1` stops it opening a browser tab.

## Requirements

- A current Chromium, Firefox or Safari. **MP4 export needs WebCodecs H.264**
  (Chrome/Edge 94+); without it the app records a real-time `.webm` instead and
  says so rather than failing.
- Nothing else: the icon set, the GIF/APNG/ZIP encoders and every visual are in
  this repository.

## What's in the editor

- **Scenes** — as many as you like; each becomes its own browser source on export
- **Layers** — panels, text, images, camera (webcam) frames, chat, clocks and
  vector rim frames
- **Precise control** — position, size, rotation, opacity, corner cuts per corner,
  gradient fills, borders with glow, drop shadows, blend modes
- **Editing** — drag, snap to canvas and other layers, resize/rotate handles with a
  live size readout, 8-point alignment, distribute, marquee select, alt-drag to
  duplicate, multi-select, z-ordering, layer locking, undo/redo, copy/paste
- **Command palette** (Ctrl+K) — jump to any scene, layer, theme, pack or action
- **Live scene thumbnails**, right-click context menus and a floating context bar
  for the current selection
- **Themes** — 26 skins that re-colour every scene instantly (layers use colour tokens)
- **Packs** — starting / live / intermission / BRB / offline / ending / just-chatting / rim kit
- **Brand tab** — channel name and socials feed `{{channel}}`, `{{twitch}}`, `{{time}}` …
- **Autosave** to localStorage, plus JSON import/export

## Motion

Every layer has its own animation clock, driven by one deterministic `state()`
function that the editor preview, the PNG export, the video renderer and the
exported browser source all share — so what you see is what you get.

- **21 loop motions** — pulse, heartbeat, breathe, float, drift, sway, swing,
  wobble, bounce, flicker, glitch, spin, orbit, shake, zoom pulse, light sweep,
  double scan, marquee, typewriter, count-up, none
- **11 entrances** — fade, rise, drop, slide from either side, zoom, pop, spin,
  settle, blur
- **7 exits** — fade, lift, drop away, slide left/right, shrink
- **Easings** — linear, cubic in/out, quint, back, elastic, bounce, sine
- **Timing** — cycle time, delay, amount and a per-layer time offset, plus a
  **Stagger selection** button that cascades a group instead of moving in lockstep
- **Sweep / scan** render as a light bar travelling across the layer (DOM, PNG and MP4)

Add a layer, set *Motion*, then use **Stagger** in the inspector to fan the
timing across a multi-selection.

## Panels and rim frames

**Panels** are cut-corner cards with per-corner chamfer, gradient fills, inner
glow borders and optional blend modes — the base building block for every
overlay card.

**Rim frames** are true vector geometry rather than bitmaps, drawn as SVG in the
editor, the PNG export and the bundle, and as canvas strokes in the video
renderer. **Thirty styles**, all in the *Add → Rim frames* picker with live
previews:

| Family | Styles |
| --- | --- |
| Structural | Rim frame, Double line, Notched plate, Bevelled, Angular cut, Cut corners |
| Tech / HUD | Tech panel, HUD bar, Crosshair, Circuit trace, Scanline deck, Grid plate |
| Cards | Hex card, Capsule, Speech bubble, Shield badge, Ticket stub, Photo mat |
| Broadcast | Corner brackets, Corner L, Sidebar rail, Top bar, Callout stem, Ribbon banner |
| Accents | Alert pod, Spike frame, Chevron, Dashed rim, Riveted plate, Tag |

Each frame exposes weight, chamfer, inner gap, accent side, accent colour and
glow — all resolved from theme colour tokens, so switching themes re-skins them.
Inner lines are true miter offsets of the outer polygon, so thin double rims stay
even at any size instead of drifting at the corners.

**Five kits** ship as scene packs — *Frame Gallery* (every style on one board),
*Neon Grid*, *Broadcast HUD*, *Ember Alerts* and *Minimal*. Add one with
**Add** (or **Replace**) in the Packs tab and edit the layers in place.

## Exporting

**Export bundle (.zip)** writes:

```
index.html            dashboard linking every scene
scenes/*.html         one 1920×1080 browser source per scene
assets/overlay.css    shared styling + vector frame rules
assets/bundle.js      runtime: tokens, live clock, chat, webcam, animation ticker
assets/bg/*.png       backgrounds baked at 1920×1080
assets/img/*          images you placed
project.json          re-importable full project
OBS-SETUP.txt         step-by-step OBS instructions
```

Add each scene to OBS as a **Browser** source (Local file, 1920×1080). Transparent
scenes layer over gameplay; full-screen scenes (starting, BRB, offline) get their
own OBS scene.

URL parameters on the exported pages: `?channel=name`, `?transparent=1`,
`?cam=1`, `?cam=DEVICE_ID`, `?widget=URL`.

Text tokens stay live in the export: `{{time}}`, `{{date}}`, `{{channel}}` and the
rest are resolved at runtime, and a demo chat feed keeps the chat panel populated
until you plug in a real widget (see `OBS-SETUP.txt`).

**Other exports**

- **PNG** — the current scene at 2× (transparent where the canvas is)
- **All scenes (zip of PNGs)** — one image per scene
- **Video · .mp4** — see below

## Video export

*Video · .mp4* renders offline rather than capturing the screen: each frame is
painted to a canvas, encoded with the browser's WebCodecs H.264 encoder and
muxed into a real MP4 by a small ISO-BMFF writer included in the app.

- **Source** — the current scene, or *all scenes* as one stitched showcase with
  cross-fades between them
- **Resolution** — 720p, 1080p, 1440p or 4K
- **Frame rate** — 24, 30 or 60 fps
- **Length** — seconds per scene
- Progress shows frame counts and can be stopped mid-render

Because rendering is offline it runs ahead of real time rather than recording the
screen: measured at roughly **1.9× real time for 720p30** (a 2-second clip in
about a second), so expect about real-time speed at 1080p and slower at 4K.

Two honest limitations:

- **H.264 has no alpha channel.** Transparent scenes render over black. Use the
  bundle for live OBS overlays; use MP4 for trailers, intros and social clips.
- **Camera and chat layers are placeholders** in a video render, since no live
  source exists at encode time.

If the browser lacks WebCodecs or H.264 encoding, the app automatically records a
real-time **.webm** (VP9/VP8) instead and tells you so.

## Animated transparent exports (GIF / APNG)

MP4 cannot carry alpha, so for overlays and socials use the transparent
animated formats — both come from the same offline frame renderer, with the
scene background dropped so everything outside a layer stays clear.

| Format | Alpha | Colour | Notes |
| --- | --- | --- | --- |
| **APNG** | 8-bit, soft edges | Lossless | Best quality; a real `.png` that animates. Larger files |
| **GIF** | 1-bit, hard edges | 256 colours | Widest compatibility; glows lose their soft falloff; capped at 960 × 540 |
| **MP4 / WebM** | none | 4:2:0 | Video for trailers only — renders over black |

Pick the format in **MP4 → Format**, or **Export → Animated · GIF / APNG**.
Progress shows frame counts, and a render can be stopped mid-way.

The GIF encoder is written from scratch (median-cut palette, per-pixel nearest
colour cache, LZW with clear/EOI handling, transparent index and NETSCAPE2.0
looping). APNG frames are real PNGs rewrapped with `acTL`/`fcTL`/`fdAT` chunks,
so transparency is exact rather than thresholded.

## Keyboard

| Key | Action |
| --- | --- |
| Ctrl+K | Command palette |
| Ctrl+Z / Ctrl+Shift+Z | Undo / redo |
| Alt+drag | Duplicate while dragging |
| Drag empty canvas | Marquee select |
| Right click | Context menu |
| Ctrl+D | Duplicate |
| Ctrl+C / Ctrl+V | Copy / paste layers |
| Ctrl+A | Select all |
| Delete | Delete selection |
| Arrows (Shift) | Nudge 1px (10px) |
| Ctrl+scroll | Zoom |
| Middle-drag | Pan |
| Shift+drag | Constrain axis |
| Esc | Deselect / exit preview |

## Notes

- Fonts are system fonts (Bahnschrift, Segoe UI, Impact…). If a font isn't installed
  on the machine rendering the overlay, the browser falls back — pick fonts your
  streaming PC actually has.
- Backgrounds are procedural (gradients, grids, volumetric glows, embers, stars) and
  baked to PNG at bundle export, so OBS doesn't re-render them every frame.
- Camera layers use `getUserMedia`; OBS must be allowed camera access the first time.
- Everything runs from `file://` except bundle export, which needs the local
  server for its worker-free fetch fallback.

## Importing your own images

Any image layer can hold your own artwork, and the studio keeps the format you
give it:

| Format | Notes |
| --- | --- |
| PNG / JPG / WebP | normal stills, drag one in and it is sized to fit |
| **GIF** | **stays animated** — the studio draws it live on the stage *and* in the exported bundle |
| SVG / AVIF | imported at their natural size |

Ways to add one:

- **Drag & drop** files onto the stage — several at once is fine, they cascade
  and arrive selected at the drop point.
- **Clipboard** — copy an image and press `Ctrl V` on the stage.
- **Inspector → Image → Choose file** to swap the picture on the selected
  image layer (drag-and-drop of one file onto a selected image layer also
  replaces it instead of adding a new layer).

Imported files are embedded in the project and written into the bundle under
`assets/img/` with their real extension, so an animated GIF is still an
animated GIF inside the exported scene.

## Twitch sizes

**Export → Twitch · panel / banner** renders *only the selection* on a
transparent background, auto-fitted and centred, at one of these exact sizes:

| Preset | Pixels | Use |
| --- | --- | --- |
| Twitch panel | 320 × 100 | the panels under a channel (classic) |
| Twitch panel (tall) | 320 × 160 | bigger panel art |
| Twitch banner | 1200 × 480 | header banner |
| Twitch offline card | 1920 × 1080 | full-screen offline / BRB artwork |
| Social square | 1080 × 1080 | feed posts |
| Selection · 1× / 2× | layer bounds | crisp icons and logos |

Panels are displayed as stills by Twitch, so **PNG** is the safe choice there.
GIF and APNG are there for OBS layers, alerts, thumbnails and socials — the
same selection can be exported as a short loop.

## Frames, icons and templates

**50 rim-frame styles** live in `js/frames.js` — every style is procedural vector
geometry (polylines), so it stays crisp at 4K, re-skins with the theme tokens and
renders identically in the editor, the exported HTML and the MP4/GIF/APNG
renderer. The newest batch:

| Style | Look |
| --- | --- |
| Octagon plate | eight-sided plate with clipped corners |
| Ring rail | rounded double ring with centre ticks |
| Arc corners | rounded quadrant corners, hairline body |
| Ladder rails | twin vertical rails with rungs |
| Bento grid | unequal cells divided like a bento board |
| Baseline strip | heavy bottom rule with side tabs |
| Neon rim | triple offset rim, glow-friendly |
| Screw plate | bolted corners with an inner hairline |
| Rune lattice | corner hatching, mirrored |
| Hazard corner | diagonal hazard ticks |
| Stepped corners | staircase notches |
| Fan blades | radial blades from the base |
| Wave edge | sine wave seam |
| Twin brackets | offset double corner brackets |
| Compass ticks | 12 tick marks, majors accented |
| Ruler edge | measured tick rule along the base |
| Heartbeat | ECG pulse line |
| Starburst | corner rays |
| Stencil gaps | dashed rim with sprayed notches |
| Cyber slabs | slab corners with an inner cut line |

`Add → Rim frames` shows all 50 as live thumbnails, and the **Frame Gallery**
scene puts every style on one board.

### Icon pack (Tabler Icons, MIT)

188 stream-friendly icons are bundled and inlined in `js/icondata.js`, so the
studio works fully offline and exported scenes need no icon requests:

- `Add → Icons` — searchable grid, pick a colour, click an icon.
- The icon lands as an **SVG image layer** (tinted, 192 px), fully editable,
  resizable and animatable like any other layer.
- Source: <https://github.com/tabler/tabler-icons> · licence text in
  `assets/icons/LICENSE-tabler.txt` (MIT, free for commercial use).

### Scene templates

New scene templates: **Podcast · Two Cams**, **Raid Incoming**,
**Subathon · Timer**, **Stream Ending**, **Match Day**, **Retro Terminal**,
**Minimal Starting Soon** and **Be Right Back**, joining the existing starting
soon / live / chatting / intermission layouts.

### Where to find more free art

The studio ships with its own vector frames, so nothing external is required.
If you want extra art to import (drag it onto the stage — PNG/JPG/GIF all work):

- StreamElements — free overlay "super themes" and widgets: <https://streamelements.com/features/overlays>
- Nerd or Die — free Twitch overlay templates: <https://nerdordie.com/resources/twitch-overlay-templates/>
- Hexeum — free stream overlay collection: <https://hexeum.net/designs/free-stream-overlays/>
- Tabler Icons — the full 5,200+ MIT icon set: <https://tabler.io/icons>

Check each pack's licence before uploading its art to a monetised channel.

## Themes — 26 palettes

Every colour in a scene is a token (`@line`, `@primary`, `@secondary`, `@accent`,
`@text`, `@muted`, `@glow`, `@panel`, `@panel2`), so the **Themes** tab
re-skins every scene at once. 26 palettes ship, each with its own fonts, corner
cut and painted background (gradients, grids, stars, embers, scanlines):

| Dark | Neon / tech | Warm | Light |
| --- | --- | --- | --- |
| Neon Aurora | Cyber Grid | Ember Forge | Glacier · Light |
| Violet Frame | Night City | Blood Moon | |
| Clean Mono | Deep Sea | Sand Storm | |
| Cobalt Steel | Arctic Mint | Gold | |
| Midnight Indigo | Terminal Green | Copper Patina | |
| Forest Moss | Amber CRT | Vintage Sepia | |
| Ultraviolet | Toxic Lime | Neon Tangerine | |
| Sakura | Aurora Borealis | | |
| Candy Pop | Bubblegum | | |

New palettes are plain objects in the `THEMES` array in `js/presets.js` — copy
one, change the palette and `bg` block, and it appears in the Themes tab and
the command palette automatically. All 26 pass a WCAG contrast check of at least
4.5:1 for body text on the panel colour.

## Image animator — still artwork → transparent animation

**Animate** in the top bar, the card at the top of the Add panel, or
Export → **Animate an image** opens the animator. Drop in a PNG frame kit
(transparent background), a logo or a badge and export a **GIF**, **APNG** or
**PNG** whose background stays transparent.

**Why it stays clean:** each effect is painted on a scratch canvas and then
masked with the artwork's own alpha (`destination-in`), so glow, scanlines and
edge light exist only on the pixels of the image — never in the transparent
area. Embers, sparkles and the glow halo are intentionally unmasked so light
can bleed past a silhouette, like a lantern lighting the air around it.

24 effects in four groups:

| Light | Fire | Particles | Texture & motion |
| --- | --- | --- | --- |
| Glow pulse | Flames (layered, flickering) | Sparkles | Energy lines |
| Flicker | Embers | Glitter field | Scan wave |
| Silhouette glow (blurred alpha rim) | Spark burst | Dust motes | Rain |
| Light sweep | Smoke plumes | Fireflies | Snow |
| Edge pulse | | | Heat haze (slice displacement) |
| Lightning (procedural bolts) | | | Breathe · Drift · Brightness · Hue shift |
| Pulse rings | | | |

Every effect exposes **amount, speed, size and colour**, with eight colour
swatches plus a full colour picker per effect.

Spot effects (glow, flicker, flames, lightning, rings, embers, bursts, smoke,
sparkles, edge) get a **draggable marker**: click the artwork to aim it, drag to
fine-tune. Stack as many effects as you like. **Recipes** — Campfire, Neon sign,
Metal sheen, Storm, Starlight, Biohazard, Desert dusk, Aurora — are one-click
starting points.

Export **GIF** (1-bit alpha, 256 colours, capped at 960 px wide), **APNG**
(full 8-bit alpha, so soft glows stay soft) or a **PNG frame** at the scrub
position. Seamless loop is on by default: every wave is quantised to whole
cycles across the clip, so the last frame flows back into the first.

## Project layout

```
index.html            editor shell: panels, inspector, stage, SVG icon sprite
server.js             zero-dependency static server used by start.bat
start.bat             Windows launcher: Node → Python → file:// fallback
css/app.css           the whole UI: panels, themes, animator
js/app.js             boot, panels, toolbar, command palette, autosave
js/model.js           document model, selection, undo/redo, colour tokens
js/editor.js          stage interaction: drag, snap, handles, marquee, zoom
js/render.js          DOM renderer and the shared animation tick
js/animate.js         deterministic time-based animation engine
js/painter.js         procedural backgrounds
js/frames.js          panel and rim-frame geometry (50 styles)
js/inspector.js       property panel, alignment, distribute, layer stack
js/presets.js         26 themes, fonts, layer factory, scene packs
js/icondata.js        188 Tabler icons inlined for offline use
js/iconpicker.js      searchable icon browser
js/images.js          image import: PNG, JPG, GIF, WebP, SVG, AVIF
js/exporter.js        PNG rendering and the OBS bundle (.zip) exporter
js/zip.js             ZIP writer (STORE method, UTF-8 names)
js/video.js           offline H.264 renderer with a WebM fallback
js/mp4.js             ISO-BMFF muxer for WebCodecs samples
js/animexport.js      shared offline frame renderer for transparent formats
js/gif.js             from-scratch GIF89a encoder (median cut + LZW)
js/apng.js            APNG assembler (acTL / fcTL / fdAT)
js/imageanim.js       image animator: 24 effects, markers, recipes
js/util.js            dependency-free helpers
assets/icons/         bundled Tabler icon licence
```

## Contributing

Issues and pull requests are welcome. Two rules keep this project what it is:

1. **No dependencies, no bundler, no build step.** Scripts are classic
   `<script>` tags in `index.html`, loaded in dependency order.
2. **Deterministic rendering.** The editor, PNG export, video renderer, animator
   and exported bundle must all paint the same frame from the same state. Any
   feature that only works in one of them is not finished.

CI runs `node --check` on every script and asserts each local asset referenced by
`index.html` exists. Before opening a PR, load the studio and confirm the affected
view still renders.

## License

[MIT](LICENSE). Bundled [Tabler Icons](https://github.com/tabler/tabler-icons) are
MIT, © Paweł Kuna — see
[`assets/icons/LICENSE-tabler.txt`](assets/icons/LICENSE-tabler.txt).

Sample artwork is not part of this repository: `samples/` is git-ignored, so drop
your own PNG/GIF frame kits there to try the animator and they will never be
committed.
