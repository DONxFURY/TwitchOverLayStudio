/* ==========================================================================
   Twitch Overlay Studio — imageanim.js
   Image Animator: take a still PNG (a frame kit, a logo, a badge), place
   effects on parts of it, and export a transparent GIF / APNG / PNG.

   Effects are painted in two passes:
     clipped  — drawn on a scratch canvas, then masked by the image's own
                alpha, so glow/scan/edge light only exists on the artwork and
                never spills onto the transparent background or the gameplay.
     free     — embers, sparkles and halos, which are allowed to bleed outside
                the artwork (a lantern glows past its own silhouette).
   ========================================================================== */
(function (OS) {
  'use strict';
  var U = OS.U;

  /* ---------------------------------------------------------------- kinds */
  var KINDS = [
    /* light */
    { t: 'glow',      n: 'Glow pulse',      g: 'Light',     spot: true,  clip: true,  color: true, halo: true },
    { t: 'flicker',   n: 'Flicker',         g: 'Light',     spot: true,  clip: true,  color: true, halo: true },
    { t: 'halo',      n: 'Silhouette glow', g: 'Light',     special: true, color: true },
    { t: 'sweep',     n: 'Light sweep',     g: 'Light',     clip: true,  color: true },
    { t: 'edge',      n: 'Edge pulse',      g: 'Light',     spot: true,  clip: true,  color: true },
    { t: 'bolt',      n: 'Lightning',       g: 'Light',     spot: true,  color: true },
    { t: 'rings',     n: 'Pulse rings',     g: 'Light',     spot: true,  color: true },
    /* fire */
    { t: 'fire',      n: 'Flames',          g: 'Fire',      spot: true,  clip: true,  color: true },
    { t: 'embers',    n: 'Embers',          g: 'Fire',      spot: true,  color: true },
    { t: 'burst',     n: 'Spark burst',     g: 'Fire',      spot: true,  color: true },
    { t: 'smoke',     n: 'Smoke',           g: 'Fire',      spot: true,  color: true },
    /* particles */
    { t: 'sparkle',   n: 'Sparkles',        g: 'Particles', spot: true,  color: true },
    { t: 'glitter',   n: 'Glitter',         g: 'Particles', clip: true,  color: true },
    { t: 'dust',      n: 'Dust motes',      g: 'Particles', color: true },
    { t: 'fireflies', n: 'Fireflies',       g: 'Particles', color: true },
    { t: 'snow',      n: 'Snow',            g: 'Particles', clip: true,  color: true },
    /* texture */
    { t: 'lines',     n: 'Energy lines',    g: 'Texture',   clip: true,  color: true },
    { t: 'scan',      n: 'Scan wave',       g: 'Texture',   clip: true,  color: true },
    { t: 'rain',      n: 'Rain',            g: 'Texture',   clip: true,  color: true },
    /* motion */
    { t: 'haze',      n: 'Heat haze',       g: 'Motion',    pre: true },
    { t: 'breathe',   n: 'Breathe',         g: 'Motion',    pre: true },
    { t: 'drift',     n: 'Drift',           g: 'Motion',    pre: true },
    { t: 'bright',    n: 'Brightness',      g: 'Motion',    pre: true },
    { t: 'hue',       n: 'Hue shift',       g: 'Motion',    pre: true }
  ];

  var SWATCHES = ['#ff8a2b', '#ff2f63', '#ffd166', '#7dff6b', '#4fd1ff', '#8f7bff', '#ffffff', '#9aa3b5'];

  function kindOf(t) {
    for (var i = 0; i < KINDS.length; i++) if (KINDS[i].t === t) return KINDS[i];
    return KINDS[0];
  }

  var RECIPES = [
    { id: 'fire', n: 'Campfire', d: 'flames + embers + smoke',
      fx: [{ t: 'fire', x: 0.3, y: 0.55, r: 0.3, color: '#ffa03a', amount: 0.9, speed: 1.1 },
           { t: 'embers', x: 0.3, y: 0.5, r: 0.26, color: '#ffb347', amount: 0.8, speed: 1.2 },
           { t: 'smoke', x: 0.3, y: 0.4, r: 0.3, color: '#8f8a86', amount: 0.5, speed: 0.6 }] },
    { id: 'neon', n: 'Neon sign', d: 'glow + flicker + brightness',
      fx: [{ t: 'glow', x: 0.5, y: 0.42, r: 0.26, color: '#ff2f63', amount: 0.9, speed: 0.8 },
           { t: 'flicker', x: 0.5, y: 0.42, r: 0.2, color: '#ff7d9e', amount: 0.7, speed: 1.1 },
           { t: 'bright', amount: 0.3, speed: 1.2 }] },
    { id: 'sheen', n: 'Metal sheen', d: 'sweep + glitter + breathe',
      fx: [{ t: 'sweep', color: '#ffffff', amount: 0.65, speed: 0.7 },
           { t: 'glitter', color: '#ffffff', amount: 0.25, speed: 0.8 },
           { t: 'breathe', amount: 0.5, speed: 0.5 }] },
    { id: 'storm', n: 'Storm', d: 'rain + lightning + flash',
      fx: [{ t: 'rain', color: '#9fd4ff', amount: 0.55, speed: 1.1 },
           { t: 'bolt', x: 0.62, y: 0.4, r: 0.3, color: '#bcdcff', amount: 0.8, speed: 0.9 },
           { t: 'bright', amount: 0.25, speed: 2 }] },
    { id: 'stars', n: 'Starlight', d: 'sparkles + silhouette glow + drift',
      fx: [{ t: 'sparkle', x: 0.5, y: 0.4, r: 0.5, color: '#ffffff', amount: 0.8, speed: 0.9 },
           { t: 'halo', r: 0.3, color: '#7fb2ff', amount: 0.55, speed: 0.6 },
           { t: 'drift', amount: 0.4, speed: 0.4 }] },
    { id: 'bio', n: 'Biohazard', d: 'edge pulse + scan + dust',
      fx: [{ t: 'edge', x: 0.5, y: 0.5, r: 0.6, color: '#7dff6b', amount: 0.6, speed: 1.1 },
           { t: 'scan', color: '#9dff8a', amount: 0.4, speed: 0.7 },
           { t: 'dust', color: '#b6ff9c', amount: 0.5, speed: 0.7 }] },
    { id: 'desert', n: 'Desert dusk', d: 'heat haze + dust + warm edge',
      fx: [{ t: 'haze', amount: 0.8, speed: 1 },
           { t: 'dust', color: '#ffcf9e', amount: 0.6, speed: 0.5 },
           { t: 'edge', x: 0.5, y: 0.55, r: 0.6, color: '#ff6a2b', amount: 0.45, speed: 0.8 }] },
    { id: 'aurora', n: 'Aurora', d: 'energy lines + haze + halo',
      fx: [{ t: 'lines', color: '#5ff0c8', amount: 0.6, speed: 0.6 },
           { t: 'haze', amount: 0.5, speed: 0.6 },
           { t: 'halo', color: '#6be3ff', amount: 0.6, speed: 0.5 }] }
  ];

  /* ---------------------------------------------------------------- state */
  var S = {
    img: null, src: '', name: '', w: 0, h: 0,
    effects: [], sel: null,
    outW: 0, fps: 20, seconds: 4, loop: true,
    time: 0, playing: true,
    raf: 0, last: 0, busy: false, cancelled: false,
    shell: null, canvas: null, wrap: null, markers: null
  };

  var artC = document.createElement('canvas');
  var maskC = document.createElement('canvas');
  var fxC = document.createElement('canvas');

  /* ---------------------------------------------------------------- maths */
  function hash(n) {
    var x = Math.sin(n * 12.9898 + 4.1414) * 43758.5453;
    return x - Math.floor(x);
  }
  function mod(v, m) { return ((v % m) + m) % m; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /** Cycles elapsed, quantised to whole numbers for a seamless loop. */
  function cyc(t, dur, speed, off, loop) {
    var n = loop ? Math.max(1, Math.round(speed)) : speed;
    return (t / (dur || 1)) * n + (off || 0);
  }

  function rgba(hex, a) {
    var h = String(hex || '#ffffff').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16) || 0;
    var g = parseInt(h.slice(2, 4), 16) || 0;
    var b = parseInt(h.slice(4, 6), 16) || 0;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')';
  }

  function ensure(W, H) {
    [artC, maskC, fxC].forEach(function (c) {
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    });
  }

  /* ----------------------------------------------------------- geometry */
  function geoFor(W, H, t) {
    var fit = Math.min(W / (S.w || 1), H / (S.h || 1));
    var iw = (S.w || 1) * fit;
    var ih = (S.h || 1) * fit;
    var tr = { scale: 1, dx: 0, dy: 0, filters: [] };
    var dur = S.seconds || 1;
    S.effects.forEach(function (e) {
      var k = e.speed, a = e.amount;
      if (e.t === 'breathe') {
        tr.scale *= 1 + 0.025 * a * Math.sin(cyc(t, dur, k * 0.5, 0.11, S.loop) * Math.PI * 2);
      } else if (e.t === 'drift') {
        tr.dx += Math.min(W, H) * 0.02 * a * Math.sin(cyc(t, dur, k * 0.5, 0.27, S.loop) * Math.PI * 2);
        tr.dy += Math.min(W, H) * 0.014 * a * Math.cos(cyc(t, dur, k * 0.35, 0.61, S.loop) * Math.PI * 2);
      } else if (e.t === 'bright') {
        var br = 1 + 0.22 * a * Math.sin(cyc(t, dur, k, 0.19, S.loop) * Math.PI * 2);
        tr.filters.push('brightness(' + br.toFixed(3) + ')');
      } else if (e.t === 'hue') {
        var deg = 70 * a * Math.sin(cyc(t, dur, k * 0.5, 0.43, S.loop) * Math.PI * 2);
        tr.filters.push('hue-rotate(' + deg.toFixed(1) + 'deg)');
      }
    });
    return { W: W, H: H, bx: (W - iw) / 2, by: (H - ih) / 2, iw: iw, ih: ih, tr: tr };
  }

  function spotPos(e, g) {
    var tr = g.tr;
    var x = g.bx + e.x * g.iw;
    var y = g.by + e.y * g.ih;
    return {
      x: g.W / 2 + tr.dx + (x - g.W / 2) * tr.scale,
      y: g.H / 2 + tr.dy + (y - g.H / 2) * tr.scale,
      rad: e.r * Math.min(g.iw, g.ih) * tr.scale
    };
  }

  function paintBase(ctx, g, t) {
    var tr = g.tr;
    ctx.save();
    ctx.translate(g.W / 2 + tr.dx, g.H / 2 + tr.dy);
    ctx.scale(tr.scale, tr.scale);
    ctx.translate(-g.W / 2, -g.H / 2);
    if (tr.filters.length) ctx.filter = tr.filters.join(' ');

    var haze = null;
    S.effects.forEach(function (e) { if (e.t === 'haze') haze = e; });

    if (haze && S.img && S.img.height > 8) {
      /* horizontal slices displaced by a travelling sine = heat shimmer */
      var dur = S.seconds || 1;
      var amp = 0.012 * haze.amount * g.H * 0.5;
      var stripPx = Math.max(2, Math.round(3 * (g.W / 900)));
      for (var y = 0; y < g.H; y += stripPx) {
        var wave = Math.sin((y / g.H) * Math.PI * 6 + cyc(t, dur, haze.speed, 0, S.loop) * Math.PI * 2);
        var sy = ((y - g.by) / g.ih) * S.img.height;
        var sh = ((stripPx + 1) / g.ih) * S.img.height;
        if (sy < 0 || sy >= S.img.height) continue;
        ctx.drawImage(
          S.img, 0, sy, S.img.width, Math.min(sh, S.img.height - sy),
          g.bx + wave * amp, y, g.iw, stripPx + 1
        );
      }
    } else {
      ctx.drawImage(S.img, g.bx, g.by, g.iw, g.ih);
    }

    ctx.filter = 'none';
    ctx.restore();
  }

  function starPath(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x + r * 0.16, y - r * 0.16, x + r, y);
    ctx.quadraticCurveTo(x + r * 0.16, y + r * 0.16, x, y + r);
    ctx.quadraticCurveTo(x - r * 0.16, y + r * 0.16, x - r, y);
    ctx.quadraticCurveTo(x - r * 0.16, y - r * 0.16, x, y - r);
    ctx.closePath();
  }

  /* ------------------------------------------------------------- painting */
  function paintEffect(ctx, e, g, t, halo) {
    var k = kindOf(e.t);
    var p = spotPos(e, g);
    var a = Math.max(0, e.amount);
    var dur = S.seconds || 1;
    var px = g.W / 900; /* keeps particle sizes resolution-independent */

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    if (e.t === 'glow' || e.t === 'flicker') {
      var ph = cyc(t, dur, e.speed * (e.t === 'flicker' ? 2.2 : 0.8), hash(e.seed), S.loop) * Math.PI * 2;
      var inten = e.t === 'flicker'
        ? 0.55 + 0.2 * Math.sin(ph * 3.3) + 0.14 * Math.sin(ph * 7.9 + 1.7) + 0.1 * Math.sin(ph * 13.1 + 0.4)
        : 0.62 + 0.38 * Math.sin(ph);
      var alpha = Math.max(0, a * inten * (halo ? 0.2 : 0.95));
      var R = Math.max(6, p.rad * (halo ? 2.2 : 1.3));
      var gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
      gr.addColorStop(0, rgba(e.color, alpha));
      gr.addColorStop(0.4, rgba(e.color, alpha * 0.5));
      gr.addColorStop(0.75, rgba(e.color, alpha * 0.14));
      gr.addColorStop(1, rgba(e.color, 0));
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
      ctx.fill();

    } else if (e.t === 'embers') {
      var n = Math.round(14 + a * 46);
      var R0 = Math.max(10, p.rad);
      for (var i = 0; i < n; i++) {
        var s = hash(e.seed + i * 1.37);
        var ph2 = mod(cyc(t, dur, e.speed * (0.55 + s * 0.9), s, S.loop), 1);
        var wob = Math.sin(ph2 * 6.283 * 1.4 + s * 9);
        var ex = p.x + (s - 0.5) * R0 * 1.5 + wob * R0 * 0.18;
        var ey = p.y - ph2 * R0 * 2.6;
        var fade = (ph2 < 0.15 ? ph2 / 0.15 : 1) * Math.pow(1 - ph2, 1.3);
        ctx.fillStyle = rgba(e.color, a * fade * 1.1);
        ctx.beginPath();
        ctx.arc(ex, ey, Math.max(0.6, (0.6 + s * 2.1) * px), 0, 6.283);
        ctx.fill();
      }

    } else if (e.t === 'sparkle') {
      var n2 = Math.round(8 + a * 22);
      for (var j = 0; j < n2; j++) {
        var h1 = hash(e.seed + j * 2.31);
        var h2 = hash(e.seed + j * 5.17 + 3.3);
        var ph3 = mod(cyc(t, dur, e.speed * (0.4 + h1 * 0.8), h2, S.loop), 1);
        var tw = Math.pow(Math.sin(ph3 * Math.PI), 3);
        var sx = p.x + (h1 - 0.5) * p.rad * 2;
        var sy = p.y + (h2 - 0.5) * p.rad * 2;
        var sz = (2 + h1 * 5) * px * (0.6 + tw * 0.8);
        starPath(ctx, sx, sy, sz);
        ctx.fillStyle = rgba(e.color, a * tw);
        ctx.fill();
      }

    } else if (e.t === 'sweep') {
      var ph4 = mod(cyc(t, dur, e.speed * 0.5, 0.12, S.loop), 1);
      var band = Math.max(60, g.W * 0.16);
      var cx = -band * 1.5 + ph4 * (g.W + band * 3);
      var span = Math.hypot(g.W, g.H);
      ctx.translate(g.W / 2, g.H / 2);
      ctx.rotate(24 * Math.PI / 180);
      var sg = ctx.createLinearGradient(cx, 0, cx + band, 0);
      var aa = Math.min(1, a);
      sg.addColorStop(0, rgba(e.color, 0));
      sg.addColorStop(0.45, rgba(e.color, 0.16 * aa));
      sg.addColorStop(0.5, rgba(e.color, 0.5 * aa));
      sg.addColorStop(0.55, rgba(e.color, 0.16 * aa));
      sg.addColorStop(1, rgba(e.color, 0));
      ctx.fillStyle = sg;
      ctx.fillRect(cx, -span / 2, band, span);

    } else if (e.t === 'rain') {
      var n3 = Math.round(26 + a * 70);
      var lean = g.W * 0.012;
      ctx.lineWidth = Math.max(1, px);
      ctx.strokeStyle = rgba(e.color, 0.35 * Math.min(1.4, a));
      ctx.beginPath();
      for (var q = 0; q < n3; q++) {
        var hx = hash(e.seed + q * 3.7);
        var hs = 0.6 + hash(e.seed + q * 7.9) * 0.9;
        var py = mod(cyc(t, dur, e.speed * hs * 3, hx, S.loop), 1);
        var yy = py * (g.H + 260) - 130;
        var xx = hx * g.W + yy * 0.04;
        var len = (26 + hx * 60) * px;
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx - lean, yy + len);
      }
      ctx.stroke();

    } else if (e.t === 'scan') {
      var gap = Math.max(6, Math.min(g.W, g.H) * 0.03);
      var off = mod(cyc(t, dur, e.speed, 0, S.loop), 1) * gap * 2;
      ctx.fillStyle = rgba(e.color, 0.16 * Math.min(1, a));
      for (var ly = -gap * 2 + off; ly < g.H + gap; ly += gap * 2) {
        ctx.fillRect(0, ly, g.W, gap * 0.38);
      }
      var bandPh = mod(cyc(t, dur, e.speed * 0.6, 0.4, S.loop), 1);
      var bh = Math.max(20, g.H * 0.05);
      var by = bandPh * (g.H + bh) - bh;
      var bg = ctx.createLinearGradient(0, by, 0, by + bh);
      bg.addColorStop(0, rgba(e.color, 0));
      bg.addColorStop(0.5, rgba(e.color, 0.22 * a));
      bg.addColorStop(1, rgba(e.color, 0));
      ctx.fillStyle = bg;
      ctx.fillRect(0, by, g.W, bh);

    } else if (e.t === 'edge') {
      var ph6 = cyc(t, dur, e.speed * 0.7, 0.35, S.loop) * Math.PI * 2;
      var amt = 0.4 + 0.3 * Math.sin(ph6);
      var inner = Math.min(g.W, g.H) * 0.3;
      var outer = Math.max(g.W, g.H) * 0.62 * (0.9 + e.r * 0.4);
      var eg = ctx.createRadialGradient(p.x, p.y, inner, p.x, p.y, outer);
      eg.addColorStop(0, rgba(e.color, 0));
      eg.addColorStop(0.72, rgba(e.color, 0.1 * amt * a));
      eg.addColorStop(1, rgba(e.color, 0.55 * amt * a));
      ctx.fillStyle = eg;
      ctx.fillRect(0, 0, g.W, g.H);

    } else if (e.t === 'fire') {
      for (var fi = 0; fi < 7; fi++) {
        var fh = hash(e.seed + fi * 3.3);
        var top = p.rad * (1.2 + fh * 1.1);
        var sway = (hash(e.seed + fi * 9.1) - 0.5) * p.rad * 0.8;
        var flick = 0.65 + 0.35 * Math.sin(cyc(t, dur, e.speed * (1.1 + fh), fh, S.loop) * 6.283);
        for (var st2 = 0; st2 < 12; st2++) {
          var u = st2 / 12;
          var fy = p.y + p.rad * 0.34 - u * top;
          var fx2 = p.x + sway * u +
            Math.sin(u * 5 + cyc(t, dur, e.speed * 1.4, fh * 5, S.loop) * 6.283) * p.rad * 0.16 * u;
          var fr = Math.max(1, p.rad * (0.4 - u * 0.29) * (0.85 + 0.15 * flick));
          var fa = a * flick * (1 - u) * 0.55;
          var fc = u < 0.3 ? '#ffe9a8' : (u < 0.68 ? e.color : '#ff4d12');
          var fgrad = ctx.createRadialGradient(fx2, fy, 0, fx2, fy, fr);
          fgrad.addColorStop(0, rgba(fc, fa));
          fgrad.addColorStop(1, rgba(fc, 0));
          ctx.fillStyle = fgrad;
          ctx.beginPath();
          ctx.arc(fx2, fy, fr, 0, 6.283);
          ctx.fill();
        }
      }

    } else if (e.t === 'bolt') {
      var cycle = Math.floor(cyc(t, dur, e.speed * 0.9, hash(e.seed), S.loop));
      var flash = Math.pow(Math.abs(Math.sin(cyc(t, dur, e.speed * 1.5, 0.1, S.loop) * Math.PI)), 4);
      var bAlpha = a * (0.25 + 0.75 * flash);
      var blen = p.rad * 2.4;
      var jitter = p.rad * 0.42;
      for (var pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? rgba('#ffffff', bAlpha * 0.9) : rgba(e.color, bAlpha * 0.55);
        ctx.lineWidth = Math.max(1, (pass ? 1.6 : 5.5) * px);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        var bxp = p.x;
        var byp = p.y + blen * 0.45;
        ctx.moveTo(bxp, byp);
        for (var s3 = 1; s3 <= 9; s3++) {
          bxp += (hash(e.seed + cycle * 7.3 + s3 * 2.7) - 0.5) * jitter;
          byp -= blen / 9;
          ctx.lineTo(bxp, byp);
        }
        ctx.stroke();
      }

    } else if (e.t === 'rings') {
      for (var ri = 0; ri < 3; ri++) {
        var rph = mod(cyc(t, dur, e.speed * 0.6, hash(e.seed + ri * 1.7), S.loop), 1);
        var rr = p.rad * (0.12 + rph * 1.7);
        ctx.strokeStyle = rgba(e.color, a * (1 - rph) * 0.85);
        ctx.lineWidth = Math.max(1.2, p.rad * 0.07 * (1 - rph) + 1);
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr, 0, 6.283);
        ctx.stroke();
      }

    } else if (e.t === 'burst') {
      var bph = mod(cyc(t, dur, e.speed * 0.8, 0, S.loop), 1);
      var bn = Math.round(12 + a * 24);
      for (var bi = 0; bi < bn; bi++) {
        var bh = hash(e.seed + bi * 4.7);
        var bang = bh * Math.PI * 2;
        var bdist = p.rad * (0.1 + bph * 1.6) * (0.55 + bh * 0.9);
        ctx.fillStyle = rgba(e.color, a * (1 - bph) * (0.45 + bh * 0.55));
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(bang) * bdist, p.y + Math.sin(bang) * bdist, Math.max(0.6, (1 + bh * 2) * px), 0, 6.283);
        ctx.fill();
      }

    } else if (e.t === 'smoke') {
      var sn = Math.round(8 + a * 14);
      for (var si = 0; si < sn; si++) {
        var sh = hash(e.seed + si * 2.9);
        var sph = mod(cyc(t, dur, e.speed * (0.25 + sh * 0.35), sh, S.loop), 1);
        var sy = p.y - sph * p.rad * 2.4;
        var sx = p.x + Math.sin(sph * 4 + sh * 8) * p.rad * 0.55;
        var srad = Math.max(2, p.rad * (0.22 + sph * 0.55));
        var sgrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, srad);
        sgrad.addColorStop(0, rgba(e.color, a * 0.18 * Math.sin(sph * Math.PI)));
        sgrad.addColorStop(1, rgba(e.color, 0));
        ctx.fillStyle = sgrad;
        ctx.beginPath();
        ctx.arc(sx, sy, srad, 0, 6.283);
        ctx.fill();
      }

    } else if (e.t === 'glitter') {
      var gn = Math.round(70 + a * 180);
      for (var gi = 0; gi < gn; gi++) {
        var gh = hash(e.seed + gi * 1.91);
        var gv = hash(e.seed + gi * 4.13 + 2.2);
        var gtw = Math.pow(Math.max(0, Math.sin((t / dur * Math.max(1, Math.round(e.speed * 2)) + gh) * Math.PI * 2)), 8);
        if (gtw <= 0.02) continue;
        ctx.fillStyle = rgba(e.color, a * gtw);
        var gsz = Math.max(0.6, (0.6 + gv * 1.8) * px);
        ctx.fillRect(gh * g.W, gv * g.H, gsz, gsz);
      }

    } else if (e.t === 'dust') {
      var dn = Math.round(30 + a * 70);
      for (var di = 0; di < dn; di++) {
        var dh = hash(e.seed + di * 1.13);
        var dv = hash(e.seed + di * 2.71 + 0.7);
        var depth = 0.3 + hash(e.seed + di * 5.3) * 0.7;
        var dph = mod(cyc(t, dur, e.speed * (0.2 + depth * 0.4), dh, S.loop), 1);
        var ddx = mod(dh + dph * 0.12, 1) * g.W;
        var ddy = mod(dv - dph * 0.25, 1) * g.H;
        ctx.fillStyle = rgba(e.color, a * 0.5 * Math.sin(dph * Math.PI) * depth);
        ctx.beginPath();
        ctx.arc(ddx, ddy, Math.max(0.5, depth * 2.2 * px), 0, 6.283);
        ctx.fill();
      }

    } else if (e.t === 'fireflies') {
      var fn = Math.round(8 + a * 18);
      for (var ffi = 0; ffi < fn; ffi++) {
        var ffh = hash(e.seed + ffi * 3.7);
        var ffv = hash(e.seed + ffi * 6.1 + 1.9);
        var ffp = cyc(t, dur, e.speed * (0.3 + ffh * 0.5), ffh, S.loop);
        var ffx = (ffh + Math.sin(ffp * 6.283 + ffv * 9) * 0.06) * g.W;
        var ffy = (ffv + Math.cos(ffp * 6.283 * 0.7 + ffh * 7) * 0.05) * g.H;
        var blink = Math.pow(Math.max(0, Math.sin((t / dur * Math.max(1, Math.round(e.speed)) + ffv) * Math.PI * 2)), 3);
        if (blink <= 0.02) continue;
        var ffr = Math.max(2, (3 + ffh * 3) * px);
        var ffg = ctx.createRadialGradient(ffx, ffy, 0, ffx, ffy, ffr);
        ffg.addColorStop(0, rgba(e.color, a * blink));
        ffg.addColorStop(1, rgba(e.color, 0));
        ctx.fillStyle = ffg;
        ctx.beginPath();
        ctx.arc(ffx, ffy, ffr, 0, 6.283);
        ctx.fill();
      }

    } else if (e.t === 'snow') {
      var sn2 = Math.round(40 + a * 90);
      for (var si2 = 0; si2 < sn2; si2++) {
        var snh = hash(e.seed + si2 * 2.13);
        var sns = 0.5 + hash(e.seed + si2 * 4.39) * 0.9;
        var snp = mod(cyc(t, dur, e.speed * sns, snh, S.loop), 1);
        var sny = snp * (g.H + 60) - 30;
        var snx = snh * g.W + Math.sin(snp * 6.283 + snh * 8) * g.W * 0.02;
        ctx.fillStyle = rgba(e.color, a * 0.55 * (0.4 + snh * 0.6));
        ctx.beginPath();
        ctx.arc(snx, sny, Math.max(0.7, (0.8 + snh * 1.9) * px), 0, 6.283);
        ctx.fill();
      }

    } else if (e.t === 'lines') {
      var ln = Math.round(5 + a * 14);
      for (var li = 0; li < ln; li++) {
        var lh = hash(e.seed + li * 3.9);
        var ly = (0.05 + lh * 0.9) * g.H;
        var lph = mod(cyc(t, dur, e.speed * (0.4 + lh * 0.8), lh, S.loop), 1);
        var lx = -0.25 * g.W + lph * 1.5 * g.W;
        var lw = g.W * (0.12 + lh * 0.22);
        var lg = ctx.createLinearGradient(lx, ly, lx + lw, ly);
        lg.addColorStop(0, rgba(e.color, 0));
        lg.addColorStop(0.5, rgba(e.color, 0.6 * Math.min(1, a)));
        lg.addColorStop(1, rgba(e.color, 0));
        ctx.fillStyle = lg;
        ctx.fillRect(lx, ly, lw, Math.max(1.2, 2.4 * px));
      }
    }

    ctx.restore();
  }

  function drawTo(ctx, W, H, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!S.img) return;

    ensure(W, H);
    var g = geoFor(W, H, t);

    var mctx = maskC.getContext('2d');
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.clearRect(0, 0, W, H);
    paintBase(mctx, g);

    var actx = artC.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0);
    actx.clearRect(0, 0, W, H);
    actx.drawImage(maskC, 0, 0);

    var fctx = fxC.getContext('2d', { alpha: true });
    S.effects.forEach(function (e) {
      var k = kindOf(e.t);
      if (!k.clip || k.pre) return;
      fctx.setTransform(1, 0, 0, 1, 0, 0);
      fctx.globalCompositeOperation = 'source-over';
      fctx.clearRect(0, 0, W, H);
      paintEffect(fctx, e, g, t, false);
      fctx.globalCompositeOperation = 'destination-in';
      fctx.drawImage(maskC, 0, 0);
      fctx.globalCompositeOperation = 'source-over';
      actx.globalCompositeOperation = 'lighter';
      actx.drawImage(fxC, 0, 0);
      actx.globalCompositeOperation = 'source-over';
    });

    /* silhouette glow is drawn behind the artwork, so only its rim shows */
    S.effects.forEach(function (e) {
      if (e.t !== 'halo') return;
      var hctx = fxC.getContext('2d');
      hctx.setTransform(1, 0, 0, 1, 0, 0);
      hctx.globalCompositeOperation = 'source-over';
      hctx.clearRect(0, 0, W, H);
      var blur = Math.max(2, Math.min(48, e.amount * 0.05 * Math.min(W, H)));
      hctx.filter = 'blur(' + blur.toFixed(1) + 'px)';
      hctx.drawImage(maskC, 0, 0);
      hctx.filter = 'none';
      hctx.globalCompositeOperation = 'source-in';
      var hp = 0.55 + 0.45 * Math.sin(cyc(t, S.seconds, e.speed, 0.2, S.loop) * Math.PI * 2);
      hctx.fillStyle = rgba(e.color, Math.min(1, 0.95 * e.amount) * hp);
      hctx.fillRect(0, 0, W, H);
      hctx.globalCompositeOperation = 'source-over';
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(fxC, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    });

    ctx.drawImage(artC, 0, 0);

    S.effects.forEach(function (e) {
      var k = kindOf(e.t);
      if (k.pre || k.special) return;
      if (!k.clip) paintEffect(ctx, e, g, t, false);
      else if (k.halo) paintEffect(ctx, e, g, t, true);
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  /* --------------------------------------------------------------- export */
  function frameCount() { return Math.max(1, Math.round(S.seconds * S.fps)); }

  function outSize() {
    var w = S.outW || S.w || 960;
    var h = Math.round(w * ((S.h || 3) / (S.w || 4)));
    return { w: Math.round(w), h: Math.max(2, h) };
  }

  function toPng(canvas) {
    return new Promise(function (res, rej) {
      canvas.toBlob(function (b) {
        if (!b) return rej(new Error('PNG encode failed'));
        b.arrayBuffer().then(function (buf) { res(new Uint8Array(buf)); }, rej);
      }, 'image/png');
    });
  }

  async function exportAnim(format, hooks) {
    if (!S.img) throw new Error('Load an image first');
    var t0 = performance.now();
    var size = outSize();
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
    var fps = S.fps;

    if (format === 'png') {
      drawTo(ctx, W, H, Math.min(S.time, S.seconds - 0.001));
      var blob = await new Promise(function (res, rej) {
        canvas.toBlob(function (b) { b ? res(b) : rej(new Error('PNG encode failed')); }, 'image/png');
      });
      return { blob: blob, ext: 'png', format: 'png', frames: 1, width: W, height: H, alpha: '8-bit', ms: Math.round(performance.now() - t0), requested: requested };
    }

    if (format === 'gif') {
      /* pass 1 — palette from a dozen sample frames, so frames are never all held in RAM */
      var stride = Math.max(1, Math.floor(count / 12));
      var sample = [];
      for (var i = 0; i < count; i += stride) {
        if (hooks && hooks.isCancelled && hooks.isCancelled()) throw new Error('cancelled');
        drawTo(ctx, W, H, i / fps);
        sample.push(ctx.getImageData(0, 0, W, H).data);
        if (hooks && hooks.onProgress) hooks.onProgress(0.35 * Math.min(1, (i + stride) / count), { frames: count, phase: 'palette' });
        await sleep(0);
      }
      var pal = OS.Gif.palette(sample, 255);
      var table = OS.Gif.lut(pal);
      var gifFrames = [];
      for (var f = 0; f < count; f++) {
        if (hooks && hooks.isCancelled && hooks.isCancelled()) throw new Error('cancelled');
        drawTo(ctx, W, H, f / fps);
        gifFrames.push({
          indices: OS.Gif.quantize(ctx.getImageData(0, 0, W, H).data, W, H, table, 128),
          delayCs: Math.max(2, Math.round(100 / fps))
        });
        if (hooks && hooks.onProgress) hooks.onProgress(0.35 + 0.65 * ((f + 1) / count), { frame: f + 1, frames: count, phase: 'encoding' });
        if (f % 2 === 0) await sleep(0);
      }
      var bytes = OS.Gif.build({ width: W, height: H, palette: pal, frames: gifFrames, loop: 0 });
      return { blob: new Blob([bytes], { type: 'image/gif' }), ext: 'gif', format: 'gif', frames: count, width: W, height: H, alpha: '1-bit', ms: Math.round(performance.now() - t0), requested: requested };
    }

    var pngs = [];
    for (var p = 0; p < count; p++) {
      if (hooks && hooks.isCancelled && hooks.isCancelled()) throw new Error('cancelled');
      drawTo(ctx, W, H, p / fps);
      pngs.push(await toPng(canvas));
      if (hooks && hooks.onProgress) hooks.onProgress((p + 1) / count, { frame: p + 1, frames: count, phase: 'encoding' });
      if (p % 2 === 0) await sleep(0);
    }
    var apng = OS.Apng.build(pngs, Math.round(1000 / fps));
    return { blob: new Blob([apng], { type: 'image/png' }), ext: 'png', mime: 'image/png', format: 'apng', frames: count, width: W, height: H, alpha: '8-bit', ms: Math.round(performance.now() - t0), requested: requested };
  }

  /* ------------------------------------------------------------- shell UI */
  function shell() {
    var sizeOpts = '<option value="0">Natural size</option>' +
      '<option value="1920">1920 px wide</option>' +
      '<option value="1280">1280 px wide</option>' +
      '<option value="960">960 px wide</option>' +
      '<option value="640">640 px wide</option>';
    return '' +
    '<div class="ia-backdrop" id="iaBackdrop">' +
      '<div class="ia-shell" role="dialog" aria-label="Image animator">' +
        '<header class="ia-top">' +
          '<div class="ia-title"><b>Image animator</b><span>Turn any still artwork into a transparent animated GIF</span></div>' +
          '<div class="ia-top-actions">' +
            '<button class="btn ghost" id="iaRecipesBtn" type="button">Recipes</button>' +
            '<button class="btn ic-btn" id="iaClose" type="button" title="Close (Esc)">✕</button>' +
          '</div>' +
        '</header>' +
        '<div class="ia-grid">' +
          '<aside class="ia-col ia-setup">' +
            '<div class="ia-drop" id="iaDrop" tabindex="0">' +
              '<svg class="ic"><use href="#i-image"/></svg>' +
              '<b>Drop an image</b>' +
              '<span>PNG · JPG · WebP · SVG · or click to browse</span>' +
              '<input type="file" id="iaFile" accept="image/*" hidden>' +
            '</div>' +
            '<div class="ia-meta" id="iaMeta">No image yet</div>' +
            '<label class="ia-field"><span>Output width</span><select id="iaSize">' + sizeOpts + '</select></label>' +
            '<div class="ia-row2">' +
              '<label class="ia-field"><span>Seconds</span><input id="iaSec" type="number" min="1" max="30" step="0.5" value="4"></label>' +
              '<label class="ia-field"><span>FPS</span><select id="iaFps">' +
                '<option>12</option><option>15</option><option selected>20</option><option>24</option><option>30</option>' +
              '</select></label>' +
            '</div>' +
            '<label class="ia-check"><input type="checkbox" id="iaLoop" checked><span>Seamless loop</span></label>' +
            '<p class="ia-hint">Effects are masked by the artwork itself, so the background stays fully transparent — nothing spills onto your gameplay.</p>' +
          '</aside>' +
          '<section class="ia-col ia-center">' +
            '<div class="ia-holder" id="iaHolder">' +
              '<div class="ia-canvas-wrap" id="iaWrap">' +
                '<canvas id="iaCanvas" width="640" height="480"></canvas>' +
                '<div class="ia-markers" id="iaMarkers"></div>' +
              '</div>' +
            '</div>' +
            '<div class="ia-transport">' +
              '<button class="btn ic-btn" id="iaPlay" type="button" title="Play / pause (Space)">❚❚</button>' +
              '<input type="range" id="iaScrub" min="0" max="1000" value="0">' +
              '<span class="ia-time" id="iaTime">0.00 s</span>' +
            '</div>' +
            '<p class="ia-hint" id="iaPickHint">Pick an effect, then click the artwork to place it.</p>' +
          '</section>' +
          '<aside class="ia-col ia-fx">' +
            '<div class="ia-fx-head first"><span>Add effect</span></div>' +
            '<div class="ia-fx-grid" id="iaFxGrid"></div>' +
            '<div class="ia-fx-head"><span>Stack</span><button class="mini" id="iaClear" type="button">Clear</button></div>' +
            '<div class="ia-list" id="iaList"></div>' +
            '<div class="ia-recipes hidden" id="iaRecipes"></div>' +
          '</aside>' +
        '</div>' +
        '<footer class="ia-foot">' +
          '<button class="btn primary" id="iaGif" type="button">GIF · transparent</button>' +
          '<button class="btn" id="iaApng" type="button">APNG · full alpha</button>' +
          '<button class="btn" id="iaPng" type="button">PNG frame</button>' +
          '<div class="ia-prog hidden" id="iaProg"><div class="ia-bar"><i></i></div><span id="iaLabel">0%</span>' +
          '<button class="btn" id="iaStop" type="button">Stop</button></div>' +
          '<span class="ia-foot-note">GIF: 1-bit alpha, 256 colours. APNG: soft glows, full alpha.</span>' +
        '</footer>' +
      '</div>' +
    '</div>';
  }

  function q(sel) { return S.shell ? S.shell.querySelector(sel) : null; }
  function byId(id) {
    for (var i = 0; i < S.effects.length; i++) if (S.effects[i].id === id) return S.effects[i];
    return null;
  }

  function newEffect(t) {
    var e = { id: U.uid('fx'), t: t, seed: Math.random() * 1000, x: 0.5, y: 0.5, r: 0.24, amount: 0.8, speed: 1, color: '#ff9a3c' };
    if (t === 'rain') e.color = '#9fd4ff';
    if (t === 'sparkle') e.color = '#ffffff';
    if (t === 'scan') e.color = '#8fe6ff';
    if (t === 'edge') { e.color = '#ff2b3d'; e.amount = 0.6; }
    if (t === 'sweep') { e.color = '#ffffff'; e.amount = 0.6; }
    if (t === 'glow') e.color = '#ff8a2b';
    if (t === 'flicker') e.color = '#ffb347';
    return e;
  }

  function renderFxGrid() {
    var host = q('#iaFxGrid');
    if (!host) return;
    var groups = [];
    KINDS.forEach(function (k) { if (groups.indexOf(k.g) < 0) groups.push(k.g); });
    host.innerHTML = groups.map(function (gname) {
      return '<div class="ia-fx-group"><span>' + gname + '</span></div>' +
        KINDS.filter(function (k) { return k.g === gname; }).map(function (k) {
          return '<button type="button" data-addfx="' + k.t + '">' + k.n + '</button>';
        }).join('');
    }).join('');
  }

  function row(e, key, label, min, max, step) {
    var v = +e[key];
    return '<label class="ia-fx-row"><span>' + label + '</span>' +
      '<input type="range" data-k="' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '">' +
      '<em data-val="' + key + '">' + v.toFixed(2) + '</em></label>';
  }

  function card(e) {
    var k = kindOf(e.t);
    var html = '<div class="ia-card' + (S.sel === e.id ? ' on' : '') + '" data-fxid="' + e.id + '">' +
      '<div class="ia-card-head">' +
        '<i class="ia-swatch" style="background:' + (e.color || '#8fa8ff') + '"></i>' +
        '<b>' + k.n + '</b>' +
        (k.spot ? '<em data-xy="' + e.id + '">' + Math.round(e.x * 100) + '% · ' + Math.round(e.y * 100) + '%</em>' : '') +
        '<button class="ia-del" data-del="' + e.id + '" title="Remove">✕</button>' +
      '</div>' +
      row(e, 'amount', 'Amount', 0, 1.5, 0.05) +
      row(e, 'speed', 'Speed', 0.1, 4, 0.1) +
      (k.spot ? row(e, 'r', 'Size', 0.05, 0.9, 0.01) : '') +
      (k.color
        ? '<div class="ia-sw-row">' + SWATCHES.map(function (c) {
            return '<button type="button" class="ia-sw" data-c="' + c + '" data-cid="' + e.id + '"' +
              ' style="background:' + c + '" title="' + c + '" aria-label="' + c + '"></button>';
          }).join('') + '</div>' +
          '<label class="ia-fx-row color"><span>Colour</span><input type="color" data-k="color" value="' + (e.color || '#ffffff') + '"></label>'
        : '') +
      '</div>';
    return html;
  }

  function renderList() {
    var host = q('#iaList');
    if (!host) return;
    if (!S.effects.length) {
      host.innerHTML = '<p class="ia-empty">No effects yet. Add one above, or try a recipe.</p>';
    } else {
      host.innerHTML = S.effects.map(card).join('');
    }
    var hint = q('#iaPickHint');
    var sel = S.sel ? byId(S.sel) : null;
    if (hint) {
      hint.textContent = sel && kindOf(sel.t).spot
        ? 'Drag the marker on the artwork to aim “' + kindOf(sel.t).n + '”.'
        : 'Pick an effect, then click the artwork to place it.';
    }
  }

  function renderMarkers() {
    if (!S.markers) return;
    S.markers.innerHTML = S.effects.filter(function (e) { return kindOf(e.t).spot; }).map(function (e) {
      return '<i class="ia-mark' + (S.sel === e.id ? ' on' : '') + '" data-mk="' + e.id + '"' +
        ' style="left:' + (e.x * 100).toFixed(2) + '%;top:' + (e.y * 100).toFixed(2) + '%;--mk:' + (e.color || '#ffffff') + '"></i>';
    }).join('');
  }

  function moveMarker(id) {
    if (!S.markers) return;
    var el = S.markers.querySelector('[data-mk="' + id + '"]');
    var e = byId(id);
    if (!el || !e) return;
    el.style.left = (e.x * 100).toFixed(2) + '%';
    el.style.top = (e.y * 100).toFixed(2) + '%';
    var xy = S.shell.querySelector('[data-xy="' + id + '"]');
    if (xy) xy.textContent = Math.round(e.x * 100) + '% · ' + Math.round(e.y * 100) + '%';
  }

  function applyRecipe(id, silent) {
    var r = RECIPES.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    S.effects = r.fx.map(function (o) {
      return Object.assign(newEffect(o.t), o, { id: U.uid('fx'), seed: Math.random() * 1000 });
    });
    S.sel = S.effects.length ? S.effects[0].id : null;
    renderList();
    renderMarkers();
    drawPreview();
    var panel = q('#iaRecipes');
    if (panel) panel.classList.add('hidden');
    if (!silent) U.toast('Recipe · ' + r.n);
  }

  function renderRecipes() {
    var host = q('#iaRecipes');
    if (!host) return;
    host.innerHTML = '<div class="ia-fx-head first"><span>Recipes</span><button class="mini" id="iaRecipeClose" type="button">Close</button></div>' +
      RECIPES.map(function (r) {
        return '<button type="button" class="ia-recipe" data-recipe="' + r.id + '"><b>' + r.n + '</b><span>' + r.d + '</span></button>';
      }).join('');
  }

  /* --------------------------------------------------------------- preview */
  function syncCanvas() {
    if (!S.canvas || !S.img) return;
    var aspect = (S.h || 3) / (S.w || 4);
    var w = Math.min(S.w || 720, 760);
    var h = Math.round(w * aspect);
    if (h > 470) { h = 470; w = Math.round(h / aspect); }
    S.canvas.width = Math.max(2, w);
    S.canvas.height = Math.max(2, h);
  }

  function drawPreview() {
    if (!S.canvas) return;
    drawTo(S.canvas.getContext('2d'), S.canvas.width, S.canvas.height, S.time);
  }

  function syncScrub() {
    var sc = q('#iaScrub'), lbl = q('#iaTime');
    if (sc) sc.value = String(Math.round((S.time / (S.seconds || 1)) * 1000));
    if (lbl) lbl.textContent = S.time.toFixed(2) + ' s';
  }

  function updateMeta() {
    var el = q('#iaMeta');
    if (!el) return;
    if (!S.img) { el.textContent = 'No image yet'; return; }
    var size = outSize();
    el.innerHTML = '<b>' + U.esc(S.name || 'image') + '</b><span>' + S.w + ' × ' + S.h + ' source · ' + size.w + ' × ' + size.h + ' out</span>';
    var sel = q('#iaSize');
    if (sel && sel.options.length) sel.options[0].textContent = 'Natural · ' + S.w + ' × ' + S.h;
  }

  function updateSizeInfo() {
    var size = outSize();
    var el = q('#iaMeta');
    if (el && S.img) {
      el.innerHTML = '<b>' + U.esc(S.name || 'image') + '</b><span>' + S.w + ' × ' + S.h + ' source · ' + size.w + ' × ' + size.h + ' out</span>';
    }
  }

  function togglePlay() {
    S.playing = !S.playing;
    var b = q('#iaPlay');
    if (b) {
      b.textContent = S.playing ? '❚❚' : '▶';
      b.title = S.playing ? 'Pause (Space)' : 'Play (Space)';
    }
  }

  function start() {
    stop();
    S.last = performance.now();
    function step(now) {
      if (!S.shell || S.shell.classList.contains('hidden')) return;
      var dt = Math.min(0.12, (now - S.last) / 1000);
      S.last = now;
      if (S.playing && S.img) {
        S.time = (S.time + dt) % (S.seconds || 1);
        drawPreview();
        syncScrub();
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
    OS.Images.readFile(file).then(function (m) {
      S.src = m.src;
      S.name = m.name;
      var img = new Image();
      img.onload = function () {
        S.img = img;
        S.w = img.naturalWidth || m.w;
        S.h = img.naturalHeight || m.h;
        S.time = 0;
        if (!S.effects.length) applyRecipe('fire', true);
        syncCanvas();
        updateMeta();
        renderList();
        renderMarkers();
        drawPreview();
        syncScrub();
        U.toast('Loaded ' + m.name + ' · ' + S.w + ' × ' + S.h);
      };
      img.onerror = function () { U.toast('That image could not be decoded', 'error'); };
      img.src = m.src;
    }).catch(function (err) {
      U.toast(err && err.message ? err.message : 'Could not read that file', 'error');
    });
  }

  /* ---------------------------------------------------------------- export */
  function runExport(format) {
    if (S.busy) return;
    if (!S.img) { U.toast('Load an image first', 'warn'); return; }
    S.busy = true;
    S.cancelled = false;
    var wasPlaying = S.playing;
    if (S.playing) togglePlay();

    var prog = q('#iaProg');
    var bar = prog.querySelector('i');
    var label = q('#iaLabel');
    prog.classList.remove('hidden');
    bar.style.width = '0%';
    label.textContent = '0%';
    [q('#iaGif'), q('#iaApng'), q('#iaPng')].forEach(function (b) { if (b) b.disabled = true; });

    function done() {
      S.busy = false;
      prog.classList.add('hidden');
      [q('#iaGif'), q('#iaApng'), q('#iaPng')].forEach(function (b) { if (b) b.disabled = false; });
      if (wasPlaying && !S.playing) togglePlay();
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
      var base = U.slug(S.name || 'image') + '-animated';
      U.download(r.blob, base + '.' + r.ext);
      var secs = ((r.ms || 0) / 1000).toFixed(1);
      var tag = format === 'apng' ? 'APNG' : format.toUpperCase();
      U.toast(tag + ' exported · ' + r.width + ' × ' + r.height + ' · ' + r.frames + ' frames · ' + secs + 's');
      if (r.requested && r.requested !== r.width + ' × ' + r.height) {
        U.toast('GIF capped at 960 px wide to stay fast', 'warn');
      }
      done();
    }).catch(function (err) {
      if (String(err && err.message) === 'cancelled') {
        U.toast('Export cancelled', 'warn');
      } else {
        console.error(err);
        U.toast('Export failed: ' + (err && err.message), 'error');
      }
      done();
    });
  }

  /* --------------------------------------------------------------- field */
  function applyField(inp) {
    var key = inp.dataset.k;
    if (!key) return;
    var cardEl = inp.closest('[data-fxid]');
    if (!cardEl) return;
    var e = byId(cardEl.dataset.fxid);
    if (!e) return;
    e[key] = key === 'color' ? inp.value : parseFloat(inp.value);

    if (key === 'color') {
      var sw = cardEl.querySelector('.ia-swatch');
      if (sw) sw.style.background = inp.value;
      var mk = S.markers ? S.markers.querySelector('[data-mk="' + e.id + '"]') : null;
      if (mk) mk.style.setProperty('--mk', inp.value);
    }
    var out = cardEl.querySelector('[data-val="' + key + '"]');
    if (out) out.textContent = parseFloat(inp.value).toFixed(2);
    drawPreview();
  }

  function selectEffect(id) {
    S.sel = id;
    if (!S.shell) return;
    Array.prototype.forEach.call(S.shell.querySelectorAll('.ia-card'), function (c) {
      c.classList.toggle('on', c.dataset.fxid === id);
    });
    if (S.markers) {
      Array.prototype.forEach.call(S.markers.querySelectorAll('.ia-mark'), function (m) {
        m.classList.toggle('on', m.dataset.mk === id);
      });
    }
    var sel = byId(id);
    var hint = q('#iaPickHint');
    if (hint && sel) {
      hint.textContent = kindOf(sel.t).spot
        ? 'Drag the marker on the artwork to aim “' + kindOf(sel.t).n + '”.'
        : '“' + kindOf(sel.t).n + '” covers the whole artwork — tune it on the right.';
    }
  }

  /* ------------------------------------------------------------------ bind */
  function bind() {
    var drop = q('#iaDrop');
    var file = q('#iaFile');
    S.canvas = q('#iaCanvas');
    S.markers = q('#iaMarkers');
    S.wrap = q('#iaWrap');

    q('#iaClose').addEventListener('click', close);
    /* S.shell is the backdrop itself, so querySelector would never find it */
    S.shell.addEventListener('mousedown', function (e) {
      if (e.target === S.shell) close();
    });

    drop.addEventListener('click', function () { file.click(); });
    drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') file.click(); });
    file.addEventListener('change', function () {
      if (file.files && file.files[0]) addFile(file.files[0]);
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('on'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('on'); });
    });
    drop.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) addFile(f);
    });
    /* dropping anywhere in the shell also works */
    S.shell.addEventListener('dragover', function (e) { e.preventDefault(); });
    S.shell.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) { e.preventDefault(); addFile(f); }
    });

    q('#iaSize').addEventListener('change', function () {
      S.outW = parseInt(this.value, 10) || 0;
      updateSizeInfo();
    });
    q('#iaSec').addEventListener('change', function () {
      S.seconds = Math.max(1, Math.min(30, parseFloat(this.value) || 4));
      this.value = S.seconds;
      S.time = Math.min(S.time, S.seconds - 0.01);
      drawPreview();
      syncScrub();
    });
    q('#iaFps').addEventListener('change', function () {
      S.fps = parseInt(this.value, 10) || 20;
    });
    q('#iaLoop').addEventListener('change', function () {
      S.loop = !!this.checked;
      drawPreview();
    });

    q('#iaPlay').addEventListener('click', togglePlay);
    q('#iaScrub').addEventListener('input', function () {
      S.time = (parseInt(this.value, 10) / 1000) * (S.seconds || 1);
      drawPreview();
      var lbl = q('#iaTime');
      if (lbl) lbl.textContent = S.time.toFixed(2) + ' s';
    });

    q('#iaFxGrid').addEventListener('click', function (e) {
      var b = e.target.closest('[data-addfx]');
      if (!b) return;
      var fx = newEffect(b.dataset.addfx);
      S.effects.push(fx);
      S.sel = fx.id;
      renderList();
      renderMarkers();
      drawPreview();
    });

    q('#iaList').addEventListener('click', function (e) {
      var del = e.target.closest('[data-del]');
      if (del) {
        var id = del.dataset.del;
        S.effects = S.effects.filter(function (x) { return x.id !== id; });
        if (S.sel === id) S.sel = S.effects.length ? S.effects[0].id : null;
        renderList();
        renderMarkers();
        drawPreview();
        return;
      }
      var swatch = e.target.closest('[data-c]');
      if (swatch) {
        var ce = byId(swatch.dataset.cid);
        if (ce) {
          ce.color = swatch.dataset.c;
          var cardEl = swatch.closest('[data-fxid]');
          if (cardEl) {
            var dot = cardEl.querySelector('.ia-swatch');
            if (dot) dot.style.background = ce.color;
            var ci = cardEl.querySelector('input[data-k="color"]');
            if (ci) ci.value = ce.color;
          }
          var mk = S.markers.querySelector('[data-mk="' + ce.id + '"]');
          if (mk) mk.style.setProperty('--mk', ce.color);
          drawPreview();
        }
        return;
      }
      var c = e.target.closest('[data-fxid]');
      if (!c) return;
      /* never rebuild the list here — that would destroy an open colour picker */
      if (S.sel !== c.dataset.fxid) selectEffect(c.dataset.fxid);
    });

    q('#iaList').addEventListener('input', function (ev) {
      if (ev.target.matches('input')) applyField(ev.target);
    });
    q('#iaList').addEventListener('change', function (ev) {
      if (ev.target.matches('input')) applyField(ev.target);
    });

    q('#iaClear').addEventListener('click', function () {
      S.effects = [];
      S.sel = null;
      renderList();
      renderMarkers();
      drawPreview();
    });

    q('#iaRecipesBtn').addEventListener('click', function () {
      var panel = q('#iaRecipes');
      panel.classList.toggle('hidden');
      if (!panel.classList.contains('hidden')) renderRecipes();
    });
    q('#iaRecipes').addEventListener('click', function (e) {
      var b = e.target.closest('[data-recipe]');
      if (b) { applyRecipe(b.dataset.recipe); return; }
      if (e.target.id === 'iaRecipeClose') q('#iaRecipes').classList.add('hidden');
    });

    /* markers: drag to aim */
    S.markers.addEventListener('pointerdown', function (ev) {
      var mk = ev.target.closest('.ia-mark');
      if (!mk) return;
      ev.preventDefault();
      var id = mk.dataset.mk;
      S.sel = id;
      renderList();
      renderMarkers();
      function move(e2) {
        var r = S.canvas.getBoundingClientRect();
        var e3 = byId(id);
        if (!e3) return;
        e3.x = U.clamp((e2.clientX - r.left) / r.width, 0, 1);
        e3.y = U.clamp((e2.clientY - r.top) / r.height, 0, 1);
        moveMarker(id);
        drawPreview();
      }
      function up() {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });

    /* canvas click aims the selected spot effect */
    S.canvas.addEventListener('pointerdown', function (ev) {
      var sel = S.sel ? byId(S.sel) : null;
      if (!sel || !kindOf(sel.t).spot) return;
      var r = S.canvas.getBoundingClientRect();
      sel.x = U.clamp((ev.clientX - r.left) / r.width, 0, 1);
      sel.y = U.clamp((ev.clientY - r.top) / r.height, 0, 1);
      renderMarkers();
      drawPreview();
    });

    q('#iaGif').addEventListener('click', function () { runExport('gif'); });
    q('#iaApng').addEventListener('click', function () { runExport('apng'); });
    q('#iaPng').addEventListener('click', function () { runExport('png'); });
    q('#iaStop').addEventListener('click', function () { S.cancelled = true; });

    document.addEventListener('keydown', onKey, true);
  }

  function onKey(ev) {
    if (!S.shell || S.shell.classList.contains('hidden')) return;
    var tag = (ev.target && ev.target.tagName) || '';
    if (ev.key === 'Escape') {
      ev.stopPropagation();
      close();
    } else if (ev.key === ' ' && !/INPUT|SELECT|TEXTAREA|BUTTON/i.test(tag)) {
      ev.preventDefault();
      togglePlay();
    }
  }

  /* ------------------------------------------------------------------ open */
  function open() {
    if (S.shell) {
      S.shell.classList.remove('hidden');
      start();
      drawPreview();
      return;
    }
    var host = document.createElement('div');
    host.innerHTML = shell();
    S.shell = host.firstChild;
    document.body.appendChild(S.shell);
    bind();
    renderFxGrid();
    renderList();
    renderRecipes();
    if (S.img) {
      syncCanvas();
      updateMeta();
      renderMarkers();
      syncScrub();
      drawPreview();
    }
    start();
  }

  function close() {
    stop();
    if (!S.shell) return;
    S.shell.classList.add('hidden');
  }

  OS.ImageAnim = {
    open: open,
    close: close,
    exportAnim: exportAnim,
    state: S,
    recipes: RECIPES,
    kinds: KINDS
  };
})(window.OS = window.OS || {});
