/* ==========================================================================
   Twitch Overlay Studio — logo3d.js
   Logo → 3D: take a flat logo, extrude it into a solid slab, light it like a
   machined badge and spin it on a turntable.

   How this works without WebGL or a mesh file:
     · the artwork is drawn as a stack of N slices, each displaced along the
       model's Z axis. The two outermost slices carry the real artwork (the
       back one mirrored), everything between uses the material.
     · the stack is projected orthographically —
           x' = x·cos(yaw) + z·sin(yaw)
           y' = y·cos(pitch) − z·sin(pitch)
       and painted back to front, so the exposed slice edges read as a solid
       extruded rim with real parallax.
     · a directional light gradient plus a travelling specular band are masked
       by the composite alpha. That is what makes it look like metal.
   The projection is deterministic, so the preview, the PNG and every frame of
   the GIF / APNG export are pixel-identical.
   ========================================================================== */
(function (OS) {
  'use strict';
  var U = OS.U;
  var DEG = Math.PI / 180;

  var MODES = [
    { t: 'art', n: 'Painted' },
    { t: 'gold', n: 'Gold' },
    { t: 'steel', n: 'Steel' },
    { t: 'tint', n: 'Tint' }
  ];

  var PRESETS = [
    { id: 'turntable', n: 'Turntable', d: 'full 360° spin',
      v: { spin: true, dir: 1, speed: 1, yaw: -24, pitch: 14, sway: 0, depth: 0.22, bevel: 0.5, mode: 'art', gloss: 0.5, shine: 0.6, reflect: true, shadow: true, light: 120 } },
    { id: 'coin', n: 'Gold coin', d: 'thick, polished rim',
      v: { spin: true, dir: 1, speed: 0.8, yaw: -30, pitch: 20, sway: 0, depth: 0.34, bevel: 0.9, mode: 'gold', gloss: 0.8, shine: 0.9, reflect: true, shadow: true, light: 105 } },
    { id: 'chrome', n: 'Chrome badge', d: 'thin, hard highlights',
      v: { spin: true, dir: 1, speed: 1.2, yaw: -18, pitch: 8, sway: 0, depth: 0.15, bevel: 0.7, mode: 'steel', gloss: 0.85, shine: 0.85, reflect: true, shadow: true, light: 135 } },
    { id: 'showcase', n: 'Showcase', d: 'sways, never full spin',
      v: { spin: false, dir: 1, speed: 1, yaw: -28, pitch: 16, sway: 26, depth: 0.28, bevel: 0.6, mode: 'art', gloss: 0.6, shine: 0.7, reflect: true, shadow: true, light: 110 } },
    { id: 'hover', n: 'Hover', d: 'tilts toward the viewer',
      v: { spin: false, dir: 1, speed: 1, yaw: -12, pitch: 24, sway: 10, depth: 0.3, bevel: 0.75, mode: 'tint', tint: '#ffd166', gloss: 0.65, shine: 0.7, reflect: true, shadow: true, light: 100 } },
    { id: 'flat', n: 'Flat spin', d: 'card spinning on its axis',
      v: { spin: true, dir: 1, speed: 1.4, yaw: -40, pitch: 6, sway: 0, depth: 0.04, bevel: 0, mode: 'art', gloss: 0.4, shine: 0.35, reflect: false, shadow: false, light: 120 } }
  ];

  var SWATCHES = ['#ffcf6b', '#ff5470', '#6d8dff', '#2ee6d6', '#8fe36a', '#c78bff', '#ffffff', '#9aa8bf'];

  /* ---------------------------------------------------------------- state */
  var S = {
    img: null, src: '', name: '', w: 0, h: 0, work: null, ready: false,

    yaw: -24, pitch: 14, sway: 0,
    depth: 0.22, bevel: 0.5, slices: 36,
    light: 120, gloss: 0.5, shine: 0.6,
    mode: 'art', tint: '#ffcf6b',
    spin: true, speed: 1, dir: 1,
    reflect: true, shadow: true,

    outW: 720, fps: 20, seconds: 4,
    time: 0, playing: true,

    shell: null, canvas: null, raf: 0, last: 0,
    busy: false, cancelled: false
  };

  /* ------------------------------------------------------------ canvases */
  var faceF = document.createElement('canvas');
  var faceB = document.createElement('canvas');
  var matC = document.createElement('canvas');
  var modelC = document.createElement('canvas');
  var lightC = document.createElement('canvas');
  var litC = document.createElement('canvas');
  var reflC = document.createElement('canvas');

  var HAS_FILTER = (function () {
    try {
      var c = document.createElement('canvas').getContext('2d');
      return 'filter' in c && c.filter !== undefined;
    } catch (e) { return false; }
  })();

  /* ---------------------------------------------------------------- maths */
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function hexRgb(hex) {
    var h = String(hex || '#ffffff').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
  }

  function mix(a, b, t) {
    return 'rgb(' + [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ].join(',') + ')';
  }

  function rgba(hex, a) {
    var c = hexRgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')';
  }

  function sizeTo(canvas, W, H) {
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    } else {
      canvas.getContext('2d').clearRect(0, 0, W, H);
    }
  }

  /* ------------------------------------------------------------- prepare */
  function prepare() {
    if (!S.img) return;
    var maxW = 640;
    var k = Math.min(1, maxW / Math.max(1, S.w));
    var w = Math.max(16, Math.round(S.w * k));
    var h = Math.max(16, Math.round(S.h * k));
    S.work = { w: w, h: h };

    [faceF, faceB].forEach(function (c) { c.width = w; c.height = h; });

    var f = faceF.getContext('2d');
    f.clearRect(0, 0, w, h);
    f.imageSmoothingEnabled = true;
    f.imageSmoothingQuality = 'high';
    f.drawImage(S.img, 0, 0, w, h);

    var b = faceB.getContext('2d');
    b.clearRect(0, 0, w, h);
    b.save();
    b.translate(w, 0);
    b.scale(-1, 1);
    b.drawImage(S.img, 0, 0, w, h);
    b.restore();

    buildMaterial();
    S.ready = true;
  }

  function buildMaterial() {
    if (!S.work) return;
    var w = S.work.w, h = S.work.h;
    sizeTo(matC, w, h);
    var c = matC.getContext('2d');
    c.globalCompositeOperation = 'source-over';
    c.drawImage(faceF, 0, 0, w, h);
    c.globalCompositeOperation = 'source-in';

    var g = c.createLinearGradient(0, 0, w * 0.35, h);
    if (S.mode === 'gold') {
      g.addColorStop(0, '#fff6cf');
      g.addColorStop(0.22, '#f6cf62');
      g.addColorStop(0.48, '#c78f24');
      g.addColorStop(0.74, '#8a5910');
      g.addColorStop(1, '#4d3006');
    } else if (S.mode === 'steel') {
      g.addColorStop(0, '#f6faff');
      g.addColorStop(0.24, '#b9c6da');
      g.addColorStop(0.5, '#78859c');
      g.addColorStop(0.76, '#454f66');
      g.addColorStop(1, '#242c3d');
    } else if (S.mode === 'tint') {
      var base = hexRgb(S.tint);
      g.addColorStop(0, mix(base, [255, 255, 255], 0.62));
      g.addColorStop(0.3, mix(base, [255, 255, 255], 0.16));
      g.addColorStop(0.55, mix(base, [0, 0, 0], 0.1));
      g.addColorStop(0.8, mix(base, [0, 0, 0], 0.55));
      g.addColorStop(1, mix(base, [0, 0, 0], 0.78));
    } else {
      /* painted: keep the artwork itself on the walls, just lift the top edge */
      g.addColorStop(0, 'rgba(255,255,255,0.14)');
      g.addColorStop(0.45, 'rgba(255,255,255,0)');
      g.addColorStop(0.75, 'rgba(0,0,0,0.12)');
      g.addColorStop(1, 'rgba(0,0,0,0.34)');
    }
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'source-over';
  }

  /* ------------------------------------------------------------- lighting */
  function buildLight(W, H, cx, cy, w0, h0, time) {
    sizeTo(lightC, W, H);
    var g = lightC.getContext('2d');
    var L = S.light * DEG;
    var dx = Math.cos(L), dy = Math.sin(L);
    var rad = Math.max(w0, h0) * 0.95;

    var lg = g.createLinearGradient(cx - dx * rad, cy - dy * rad, cx + dx * rad, cy + dy * rad);
    lg.addColorStop(0, 'rgba(255,255,255,' + (0.6 * S.gloss).toFixed(3) + ')');
    lg.addColorStop(0.44, 'rgba(255,255,255,0)');
    lg.addColorStop(0.58, 'rgba(0,0,0,0)');
    lg.addColorStop(1, 'rgba(0,0,0,' + (0.58 * S.gloss).toFixed(3) + ')');
    g.fillStyle = lg;
    g.fillRect(0, 0, W, H);

    if (S.shine > 0.01) {
      var ph = (((time / (S.seconds || 4)) % 1) + 1) % 1;
      var bx = cx + Math.cos(ph * Math.PI * 2) * w0 * 0.6;
      var by = cy + Math.sin(ph * Math.PI * 2) * h0 * 0.22;
      g.globalCompositeOperation = 'lighter';
      var band = g.createLinearGradient(bx - w0 * 0.18, by - h0 * 0.55, bx + w0 * 0.18, by + h0 * 0.55);
      band.addColorStop(0, 'rgba(255,255,255,0)');
      band.addColorStop(0.5, 'rgba(255,255,255,' + (0.5 * S.shine).toFixed(3) + ')');
      band.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = band;
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
    }

    /* only light the model, never the empty canvas */
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(modelC, 0, 0);
    g.globalCompositeOperation = 'source-over';
  }

  /* --------------------------------------------------------------- render */
  function renderModel(W, H, time) {
    sizeTo(modelC, W, H);
    var mc = modelC.getContext('2d');
    var work = S.work;
    var reflect = !!S.reflect;

    var fitW = W * 0.62;
    var fitH = H * (reflect ? 0.50 : 0.62);
    var s = Math.min(fitW / (work.w * (1 + S.depth * 0.9)), fitH / work.h);
    s = Math.max(0.01, s);

    var w0 = work.w * s;
    var h0 = work.h * s;
    var depthPx = Math.max(1, S.depth * w0);
    var cx = W * 0.5;
    var cy = H * (reflect ? 0.43 : 0.5);

    var dur = S.seconds || 4;
    var yaw = (S.yaw + (S.spin ? S.dir * 360 * (time / dur) : 0)) * DEG;
    var pitch = (S.pitch + Math.sin(((time / dur) % 1 + 1) % 1 * Math.PI * 2) * S.sway) * DEG;

    var cY = Math.cos(yaw), sY = Math.sin(yaw);
    var cP = Math.cos(pitch), sP = Math.sin(pitch);
    var kx = Math.max(0.05, Math.abs(cY));
    var ky = Math.max(0.05, Math.abs(cP));

    var n = Math.max(4, Math.min(64, Math.round(S.slices || 36)));
    var list = [];
    for (var i = 0; i < n; i++) {
      var u = i / (n - 1);
      var zf = u * 2 - 1;
      var edge = Math.abs(zf);
      list.push({
        dz: zf * depthPx * 0.5,
        u: u,
        shade: 0.26 + 0.74 * Math.pow(edge, 0.45),
        taper: 1 - S.bevel * Math.pow(edge, 1.7) * 0.085,
        key: zf * cY
      });
    }
    /* painter's algorithm: farthest slice first */
    list.sort(function (a, b) { return a.key - b.key; });

    mc.setTransform(1, 0, 0, 1, 0, 0);
    mc.globalCompositeOperation = 'source-over';
    mc.imageSmoothingEnabled = true;
    mc.imageSmoothingQuality = 'high';

    for (var j = 0; j < list.length; j++) {
      var sl = list[j];
      var content = sl.u >= 0.9 ? faceF : (sl.u <= 0.1 ? faceB : matC);
      var sw = w0 * sl.taper;
      var sh = h0 * sl.taper;
      mc.save();
      mc.translate(cx + sl.dz * sY, cy - sl.dz * sP);
      mc.scale(kx, ky);
      if (HAS_FILTER) mc.filter = 'brightness(' + sl.shade.toFixed(3) + ')';
      else mc.globalAlpha = Math.min(1, 0.3 + sl.shade * 0.75);
      mc.drawImage(content, -sw / 2, -sh / 2, sw, sh);
      mc.restore();
    }

    buildLight(W, H, cx, cy, w0, h0, time);

    sizeTo(litC, W, H);
    var lc = litC.getContext('2d');
    lc.globalCompositeOperation = 'source-over';
    lc.drawImage(modelC, 0, 0);
    lc.drawImage(lightC, 0, 0);

    return { cx: cx, cy: cy, w0: w0, h0: h0, kx: kx, ky: ky, depthPx: depthPx };
  }

  function drawFrame(ctx, W, H, time) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!S.img || !S.ready || !S.work) return;

    var geo = renderModel(W, H, time);

    if (S.shadow) {
      var sr = Math.max(6, geo.h0 * 0.1);
      ctx.save();
      if (HAS_FILTER) ctx.filter = 'blur(' + sr.toFixed(1) + 'px)';
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(geo.cx, geo.cy + geo.h0 * geo.ky * 0.57, geo.w0 * 0.42, geo.h0 * 0.07, 0, 0, 6.283);
      ctx.fill();
      ctx.restore();
    }

    if (S.reflect) {
      sizeTo(reflC, W, H);
      var r = reflC.getContext('2d');
      r.save();
      r.translate(0, 2 * (geo.cy + geo.h0 * geo.ky * 0.5));
      r.scale(1, -1);
      r.globalAlpha = 0.3;
      r.drawImage(litC, 0, 0);
      r.restore();
      r.globalCompositeOperation = 'destination-in';
      var baseY = geo.cy + geo.h0 * geo.ky * 0.5;
      var rg = r.createLinearGradient(0, baseY, 0, baseY + geo.h0 * 1.6);
      rg.addColorStop(0, 'rgba(0,0,0,0.9)');
      rg.addColorStop(0.5, 'rgba(0,0,0,0.28)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      r.fillStyle = rg;
      r.fillRect(0, 0, W, H);
      r.globalCompositeOperation = 'source-over';
      ctx.drawImage(reflC, 0, 0);
    }

    ctx.drawImage(litC, 0, 0);
  }

  /* --------------------------------------------------------------- preview */
  function drawPreview() {
    if (!S.canvas) return;
    var ctx = S.canvas.getContext('2d');
    drawFrame(ctx, S.canvas.width, S.canvas.height, S.time);
  }

  function start() {
    stop();
    S.last = performance.now();
    function step(now) {
      if (!S.shell || S.shell.classList.contains('hidden')) { S.raf = 0; return; }
      var dt = Math.min(0.12, (now - S.last) / 1000);
      S.last = now;
      if (S.playing && S.img) {
        S.time = (S.time + dt * S.speed) % (S.seconds || 4);
        drawPreview();
      }
      S.raf = requestAnimationFrame(step);
    }
    S.raf = requestAnimationFrame(step);
  }

  function stop() {
    if (S.raf) cancelAnimationFrame(S.raf);
    S.raf = 0;
  }

  /* ------------------------------------------------------------- file load */
  function addFile(file) {
    if (!file) return;
    OS.Images.readFile(file).then(function (m) {
      S.src = m.src;
      S.name = m.name;
      var img = new Image();
      img.onload = function () {
        S.img = img;
        S.w = img.naturalWidth || m.w;
        S.h = img.naturalHeight || m.h;
        prepare();
        S.time = 0;
        updateMeta();
        drawPreview();
        U.toast('Loaded ' + m.name + ' · ' + S.w + ' × ' + S.h);
      };
      img.onerror = function () { U.toast('That image could not be decoded', 'error'); };
      img.src = m.src;
    }).catch(function (err) {
      U.toast(err && err.message ? err.message : 'Could not read that file', 'error');
    });
  }

  /* --------------------------------------------------------------- export */
  function exportSize() {
    var W = Math.round(S.outW || 720);
    return { w: W, h: Math.max(2, Math.round(W * 0.7)) };
  }

  function frameCount() { return Math.max(1, Math.round((S.seconds || 4) * (S.fps || 20))); }

  function toPng(canvas) {
    return new Promise(function (res, rej) {
      canvas.toBlob(function (b) {
        if (!b) return rej(new Error('PNG encode failed'));
        b.arrayBuffer().then(function (buf) { res(new Uint8Array(buf)); }, rej);
      }, 'image/png');
    });
  }

  async function exportAnim(format, hooks) {
    if (!S.img || !S.ready) throw new Error('Add a logo first');
    var t0 = performance.now();
    var size = exportSize();
    var W = size.w, H = size.h;
    var requested = W + ' × ' + H;
    if (format === 'gif' && W > 960) {
      var k = 960 / W;
      W = 960;
      H = Math.max(2, Math.round(H * k));
    }

    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: format === 'gif' });
    var count = frameCount();
    var fps = S.fps || 20;
    var i, f;

    if (format === 'png') {
      drawFrame(ctx, W, H, S.time % (S.seconds || 4));
      var blob = await new Promise(function (res, rej) {
        canvas.toBlob(function (b) { b ? res(b) : rej(new Error('PNG encode failed')); }, 'image/png');
      });
      return { blob: blob, ext: 'png', format: 'png', frames: 1, width: W, height: H, alpha: '8-bit', ms: Math.round(performance.now() - t0), requested: requested };
    }

    if (format === 'gif') {
      /* palette from a dozen samples, then quantise frame by frame so all the
         RGBA frames never have to be held at once */
      var stride = Math.max(1, Math.floor(count / 12));
      var sample = [];
      for (i = 0; i < count; i += stride) {
        if (hooks && hooks.isCancelled && hooks.isCancelled()) throw new Error('cancelled');
        drawFrame(ctx, W, H, i / fps);
        sample.push(ctx.getImageData(0, 0, W, H).data);
        if (hooks && hooks.onProgress) hooks.onProgress(0.35 * Math.min(1, (i + stride) / count), { frames: count, phase: 'palette' });
        await sleep(0);
      }
      var pal = OS.Gif.palette(sample, 255);
      var table = OS.Gif.lut(pal);
      var frames = [];
      for (f = 0; f < count; f++) {
        if (hooks && hooks.isCancelled && hooks.isCancelled()) throw new Error('cancelled');
        drawFrame(ctx, W, H, f / fps);
        frames.push({
          indices: OS.Gif.quantize(ctx.getImageData(0, 0, W, H).data, W, H, table, 128),
          delayCs: Math.max(2, Math.round(100 / fps))
        });
        if (hooks && hooks.onProgress) hooks.onProgress(0.35 + 0.65 * ((f + 1) / count), { frame: f + 1, frames: count, phase: 'encoding' });
        if (f % 2 === 0) await sleep(0);
      }
      var gifBytes = OS.Gif.build({ width: W, height: H, palette: pal, frames: frames, loop: 0 });
      return { blob: new Blob([gifBytes], { type: 'image/gif' }), ext: 'gif', format: 'gif', frames: count, width: W, height: H, alpha: '1-bit', ms: Math.round(performance.now() - t0), requested: requested };
    }

    var pngs = [];
    for (i = 0; i < count; i++) {
      if (hooks && hooks.isCancelled && hooks.isCancelled()) throw new Error('cancelled');
      drawFrame(ctx, W, H, i / fps);
      pngs.push(await toPng(canvas));
      if (hooks && hooks.onProgress) hooks.onProgress((i + 1) / count, { frame: i + 1, frames: count, phase: 'encoding' });
      if (i % 2 === 0) await sleep(0);
    }
    var apng = OS.Apng.build(pngs, Math.round(1000 / fps));
    return { blob: new Blob([apng], { type: 'image/png' }), ext: 'png', format: 'apng', frames: count, width: W, height: H, alpha: '8-bit', ms: Math.round(performance.now() - t0), requested: requested };
  }

  /* ----------------------------------------------------------------- shell */
  function q(sel) { return S.shell ? S.shell.querySelector(sel) : null; }

  function fmtVal(v, fmt) {
    if (fmt === 'deg') return Math.round(v) + '°';
    if (fmt === 'pct') return Math.round(v * 100) + '%';
    if (fmt === 'x') return (+v).toFixed(2) + '×';
    if (fmt === 'int') return String(Math.round(v));
    return (+v).toFixed(2);
  }

  function slider(key, label, min, max, step, fmt) {
    return '<label class="l3-field"><span>' + label + '</span>' +
      '<input type="range" data-k="' + key + '" data-fmt="' + (fmt || '') + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + S[key] + '">' +
      '<em data-val="' + key + '">' + fmtVal(S[key], fmt) + '</em></label>';
  }

  function check(key, label) {
    return '<label class="l3-toggle"><input type="checkbox" data-k="' + key + '"' + (S[key] ? ' checked' : '') + '><span>' + label + '</span></label>';
  }

  function shell() {
    var modeBtns = MODES.map(function (m) {
      return '<button type="button" data-mode="' + m.t + '">' + m.n + '</button>';
    }).join('');

    return '' +
    '<div class="l3-backdrop" id="l3Backdrop">' +
      '<div class="l3-shell" role="dialog" aria-label="3D logo spinner">' +
        '<header class="l3-top">' +
          '<div class="l3-title"><b>3D logo spinner</b><span>Extrude a logo into a solid, light it like metal, spin it on a turntable</span></div>' +
          '<div class="l3-top-actions">' +
            '<button class="btn ghost" id="l3Reset" type="button">Reset view</button>' +
            '<button class="btn ic-btn" id="l3Close" type="button" title="Close (Esc)">✕</button>' +
          '</div>' +
        '</header>' +
        '<div class="l3-grid">' +
          '<aside class="l3-side" id="l3Side">' +
            '<div class="l3-drop" id="l3Drop" tabindex="0" role="button">' +
              '<b>Drop a logo</b>' +
              '<span>PNG with a transparent background works best</span>' +
              '<input type="file" id="l3File" accept="image/*" hidden>' +
            '</div>' +
            '<div class="l3-meta" id="l3Meta">No logo yet</div>' +
            '<div class="l3-presets" id="l3Presets"></div>' +
            '<div class="l3-group"><h4>Shape</h4>' +
              slider('depth', 'Depth', 0.02, 0.5, 0.01, 'pct') +
              slider('bevel', 'Bevel', 0, 1, 0.01, 'pct') +
              slider('slices', 'Edge detail', 8, 64, 1, 'int') +
            '</div>' +
            '<div class="l3-group"><h4>Material</h4>' +
              '<div class="l3-modes" id="l3Modes">' + modeBtns + '</div>' +
              '<div class="l3-sw-row">' + SWATCHES.map(function (c) {
                return '<button type="button" class="l3-sw" data-tint="' + c + '" style="background:' + c + '" title="' + c + '"></button>';
              }).join('') + '</div>' +
              '<label class="l3-field color"><span>Tint</span><input type="color" data-k="tint" value="' + S.tint + '"></label>' +
            '</div>' +
            '<div class="l3-group"><h4>Light</h4>' +
              slider('light', 'Angle', 0, 360, 1, 'deg') +
              slider('gloss', 'Contrast', 0, 1, 0.01, 'pct') +
              slider('shine', 'Sheen', 0, 1, 0.01, 'pct') +
            '</div>' +
            '<div class="l3-group"><h4>Motion</h4>' +
              check('spin', 'Spin 360°') +
              slider('speed', 'Speed', 0.2, 3, 0.05, 'x') +
              '<div class="l3-dir"><span>Direction</span><button type="button" id="l3Dir">Clockwise</button></div>' +
              slider('pitch', 'Tilt', -60, 60, 1, 'deg') +
              slider('sway', 'Sway', 0, 40, 1, 'deg') +
              check('reflect', 'Floor reflection') +
              check('shadow', 'Drop shadow') +
            '</div>' +
            '<div class="l3-group"><h4>Output</h4>' +
              '<label class="l3-field"><span>Width</span><select data-k="outW">' +
                '<option value="480">480 px</option><option value="720">720 px</option>' +
                '<option value="960">960 px</option><option value="1280">1280 px</option>' +
              '</select></label>' +
              '<label class="l3-field"><span>Seconds</span><input type="number" data-k="seconds" min="1" max="20" step="0.5" value="' + S.seconds + '"></label>' +
              '<label class="l3-field"><span>FPS</span><select data-k="fps">' +
                '<option value="12">12</option><option value="15">15</option><option value="20">20</option>' +
                '<option value="24">24</option><option value="30">30</option>' +
              '</select></label>' +
            '</div>' +
          '</aside>' +
          '<section class="l3-stage">' +
            '<div class="l3-view"><canvas id="l3Canvas" width="960" height="672"></canvas>' +
              '<p class="l3-hint" id="l3Hint">Drag the model to turn it</p></div>' +
            '<div class="l3-under">' +
              '<button class="btn" id="l3Play" type="button">Pause</button>' +
              '<button class="btn primary" id="l3Gif" type="button">GIF · transparent</button>' +
              '<button class="btn" id="l3Apng" type="button">APNG · full alpha</button>' +
              '<button class="btn" id="l3Png" type="button">PNG frame</button>' +
              '<div class="l3-prog hidden" id="l3Prog"><div class="l3-bar"><i></i></div><span id="l3Label">0%</span>' +
                '<button class="btn" id="l3Stop" type="button">Stop</button></div>' +
            '</div>' +
            '<p class="l3-note">Transparent background — drop the GIF or APNG straight into OBS, or use a PNG still for panels.</p>' +
          '</section>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function updateMeta() {
    var m = q('#l3Meta');
    if (!m) return;
    m.textContent = S.img
      ? S.name + ' · ' + S.w + ' × ' + S.h + ' · ' + (S.work ? S.work.w + '² working grid' : '')
      : 'No logo yet';
    m.classList.toggle('has', !!S.img);
  }

  function syncControls() {
    if (!S.shell) return;
    Array.prototype.forEach.call(S.shell.querySelectorAll('[data-k]'), function (inp) {
      var k = inp.dataset.k;
      if (!(k in S)) return;
      if (inp.type === 'checkbox') inp.checked = !!S[k];
      else if (String(inp.value) !== String(S[k])) inp.value = S[k];
      var em = inp.parentNode.querySelector('[data-val]');
      if (em) em.textContent = fmtVal(S[k], inp.dataset.fmt);
    });
    Array.prototype.forEach.call(S.shell.querySelectorAll('[data-mode]'), function (b) {
      b.classList.toggle('on', b.dataset.mode === S.mode);
    });
    var dir = q('#l3Dir');
    if (dir) dir.textContent = S.dir > 0 ? 'Clockwise' : 'Anti-clockwise';
    var play = q('#l3Play');
    if (play) play.textContent = S.playing ? 'Pause' : 'Play';
  }

  function field(inp) {
    var k = inp.dataset.k;
    if (!k || !(k in S)) return;
    var v;
    if (inp.type === 'checkbox') v = inp.checked;
    else if (inp.type === 'color') v = inp.value;
    else if (inp.type === 'range' || inp.type === 'number' || k === 'outW' || k === 'fps') v = parseFloat(inp.value);
    else v = inp.value;

    S[k] = v;
    if (k === 'mode' || k === 'tint') buildMaterial();
    if (k === 'slices') { /* no rebuild needed */ }

    var em = inp.parentNode.querySelector('[data-val]');
    if (em) em.textContent = fmtVal(v, inp.dataset.fmt);
    drawPreview();
  }

  function applyPreset(id) {
    var p = null;
    for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) p = PRESETS[i];
    if (!p) return;
    Object.keys(p.v).forEach(function (k) { S[k] = p.v[k]; });
    buildMaterial();
    syncControls();
    drawPreview();
    U.toast(p.n + ' — ' + p.d);
  }

  /* ------------------------------------------------------------------ bind */
  function bind() {
    var drop = q('#l3Drop');
    var file = q('#l3File');

    drop.addEventListener('click', function () { file.click(); });
    drop.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); file.click(); }
    });
    file.addEventListener('change', function () {
      if (file.files && file.files[0]) addFile(file.files[0]);
      file.value = '';
    });
    ['dragenter', 'dragover'].forEach(function (t) {
      drop.addEventListener(t, function (ev) { ev.preventDefault(); drop.classList.add('on'); });
    });
    ['dragleave', 'dragend'].forEach(function (t) {
      drop.addEventListener(t, function () { drop.classList.remove('on'); });
    });
    drop.addEventListener('drop', function (ev) {
      ev.preventDefault();
      drop.classList.remove('on');
      var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
      if (f) addFile(f);
    });

    var side = q('#l3Side');
    side.addEventListener('input', function (ev) {
      if (ev.target.matches('[data-k]')) field(ev.target);
    });
    side.addEventListener('change', function (ev) {
      if (ev.target.matches('[data-k]')) field(ev.target);
    });
    side.addEventListener('click', function (ev) {
      var m = ev.target.closest('[data-mode]');
      if (m) { S.mode = m.dataset.mode; buildMaterial(); syncControls(); drawPreview(); return; }
      var sw = ev.target.closest('[data-tint]');
      if (sw) {
        S.tint = sw.dataset.tint;
        S.mode = 'tint';
        buildMaterial();
        syncControls();
        drawPreview();
      }
    });

    q('#l3Presets').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-preset]');
      if (b) applyPreset(b.dataset.preset);
    });

    q('#l3Dir').addEventListener('click', function () {
      S.dir = S.dir > 0 ? -1 : 1;
      syncControls();
      drawPreview();
    });

    q('#l3Play').addEventListener('click', function () {
      S.playing = !S.playing;
      syncControls();
      if (S.playing) drawPreview();
    });

    q('#l3Reset').addEventListener('click', function () { applyPreset('turntable'); });
    q('#l3Close').addEventListener('click', close);

    q('#l3Gif').addEventListener('click', function () { runExport('gif'); });
    q('#l3Apng').addEventListener('click', function () { runExport('apng'); });
    q('#l3Png').addEventListener('click', function () { runExport('png'); });
    q('#l3Stop').addEventListener('click', function () { S.cancelled = true; });

    /* drag to turn the model */
    S.canvas.addEventListener('pointerdown', function (ev) {
      if (!S.img) return;
      ev.preventDefault();
      var x0 = ev.clientX, y0 = ev.clientY;
      var yaw0 = S.yaw, pitch0 = S.pitch;
      S.spin = false;
      syncControls();
      try { S.canvas.setPointerCapture(ev.pointerId); } catch (e) {}
      function move(e) {
        S.yaw = yaw0 + (e.clientX - x0) * 0.55;
        S.pitch = U.clamp(pitch0 - (e.clientY - y0) * 0.35, -60, 60);
        syncControls();
        drawPreview();
      }
      function up() {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });

    document.addEventListener('keydown', onKey, true);
  }

  function onKey(ev) {
    if (!S.shell || S.shell.classList.contains('hidden')) return;
    if (ev.key === 'Escape') {
      ev.stopPropagation();
      close();
    } else if (ev.key === ' ' && !/INPUT|SELECT|TEXTAREA|BUTTON/i.test((ev.target && ev.target.tagName) || '')) {
      ev.preventDefault();
      S.playing = !S.playing;
      syncControls();
    }
  }

  /* ----------------------------------------------------------------- export */
  function runExport(format) {
    if (S.busy) return;
    if (!S.img) { U.toast('Add a logo first', 'warn'); return; }
    S.busy = true;
    S.cancelled = false;

    var prog = q('#l3Prog');
    var bar = prog.querySelector('i');
    var label = q('#l3Label');
    prog.classList.remove('hidden');
    bar.style.width = '0%';
    label.textContent = '0%';
    [q('#l3Gif'), q('#l3Apng'), q('#l3Png')].forEach(function (b) { if (b) b.disabled = true; });

    function done() {
      S.busy = false;
      prog.classList.add('hidden');
      [q('#l3Gif'), q('#l3Apng'), q('#l3Png')].forEach(function (b) { if (b) b.disabled = false; });
    }

    exportAnim(format, {
      isCancelled: function () { return S.cancelled; },
      onProgress: function (p, info) {
        bar.style.width = Math.round(p * 100) + '%';
        label.textContent = info && info.frames && info.frame
          ? info.frame + ' / ' + info.frames
          : Math.round(p * 100) + '%';
      }
    }).then(function (r) {
      U.download(r.blob, U.slug(S.name || 'logo') + '-3d.' + r.ext);
      var secs = ((r.ms || 0) / 1000).toFixed(1);
      U.toast((format === 'apng' ? 'APNG' : format.toUpperCase()) + ' exported · ' +
        r.width + ' × ' + r.height + ' · ' + r.frames + ' frame' + (r.frames === 1 ? '' : 's') + ' · ' + secs + 's');
      if (r.requested && r.requested !== r.width + ' × ' + r.height) {
        U.toast('GIF capped at 960 px wide to stay fast', 'warn');
      }
      done();
    }).catch(function (err) {
      if (String(err && err.message) === 'cancelled') U.toast('Export cancelled', 'warn');
      else {
        console.error(err);
        U.toast('Export failed: ' + (err && err.message), 'error');
      }
      done();
    });
  }

  /* ------------------------------------------------------------------ open */
  function open() {
    if (S.shell) {
      S.shell.classList.remove('hidden');
      syncControls();
      drawPreview();
      start();
      return;
    }
    var host = document.createElement('div');
    host.innerHTML = shell();
    S.shell = host.firstChild;
    document.body.appendChild(S.shell);
    S.canvas = q('#l3Canvas');
    bind();
    q('#l3Presets').innerHTML = PRESETS.map(function (p) {
      return '<button type="button" data-preset="' + p.id + '"><b>' + p.n + '</b><i>' + p.d + '</i></button>';
    }).join('');
    syncControls();
    updateMeta();
    if (S.img) { prepare(); drawPreview(); start(); }
  }

  function close() {
    stop();
    if (!S.shell) return;
    S.shell.classList.add('hidden');
  }

  OS.Logo3D = {
    open: open,
    close: close,
    exportAnim: exportAnim,
    state: S,
    presets: PRESETS
  };
})(window.OS = window.OS || {});
