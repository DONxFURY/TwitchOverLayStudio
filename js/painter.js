/* ==========================================================================
   Twitch Overlay Studio — painter.js
   Procedural scene backgrounds. No image assets, fully deterministic:
   the same spec always paints the same background, in the editor, in the
   exported PNG and (via the baked image) in the exported bundle.
   ========================================================================== */
(function (global) {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash(str) {
    var h = 2166136261;
    str = String(str || 'seed');
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /**
   * Paint a background spec into a 2D context.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} W
   * @param {number} H
   * @param {object} bg  background spec
   * @param {string} seed
   */
  function paint(ctx, W, H, bg, seed) {
    if (!bg || !ctx) return;
    seed = hash(seed);
    ctx.save();
    ctx.clearRect(0, 0, W, H);

    /* --- base gradient ------------------------------------------------ */
    var ang = ((bg.angle == null ? 150 : bg.angle) * Math.PI) / 180;
    var cx = W / 2, cy = H / 2;
    var len = Math.abs(Math.cos(ang)) * W + Math.abs(Math.sin(ang)) * H;
    var dx = (Math.cos(ang) * len) / 2, dy = (Math.sin(ang) * len) / 2;
    var lg = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    var base = bg.base || ['#05070d'];
    for (var i = 0; i < base.length; i++) {
      lg.addColorStop(base.length === 1 ? 0 : i / (base.length - 1), base[i]);
    }
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, H);

    /* --- volumetric glows --------------------------------------------- */
    ctx.globalCompositeOperation = 'lighter';
    (bg.radial || []).forEach(function (r) {
      var g = ctx.createRadialGradient(r.x * W, r.y * H, 0, r.x * W, r.y * H, r.r * Math.max(W, H));
      g.addColorStop(0, r.color);
      g.addColorStop(0.55, fade(r.color, 0.35));
      g.addColorStop(1, fade(r.color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });

    /* --- planets / big circles ---------------------------------------- */
    (bg.circles || []).forEach(function (c) {
      var rr = c.r * W;
      var g2 = ctx.createRadialGradient(c.x * W - rr * 0.35, c.y * H - rr * 0.45, rr * 0.02, c.x * W, c.y * H, rr);
      g2.addColorStop(0, fade(c.color, 0.98));
      g2.addColorStop(0.55, fade(c.color, 0.55));
      g2.addColorStop(1, fade(c.color, 0));
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(c.x * W, c.y * H, rr, 0, Math.PI * 2); ctx.fill();
      if (c.ring) {
        ctx.lineWidth = Math.max(2, W * 0.0014);
        ctx.strokeStyle = c.ring;
        ctx.beginPath(); ctx.arc(c.x * W, c.y * H, rr * 0.995, 0, Math.PI * 2); ctx.stroke();
      }
    });

    /* --- light beams --------------------------------------------------- */
    if (bg.rays && bg.rays.count) {
      var R = bg.rays;
      var ox = (R.x == null ? 0.5 : R.x) * W;
      var oy = (R.y == null ? -0.1 : R.y) * H;
      var radius = Math.max(W, H) * 1.8;
      var baseAngle = (seed % 628) / 100;
      ctx.fillStyle = R.color;
      for (var k = 0; k < R.count; k++) {
        var a = (k / R.count) * Math.PI * 2 + baseAngle;
        var spread = (Math.PI * 2 / R.count) * 0.42;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.arc(ox, oy, radius, a - spread, a + spread);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    /* --- grid ---------------------------------------------------------- */
    if (bg.grid && bg.grid.step) {
      var gspec = bg.grid, step = gspec.step;
      ctx.strokeStyle = gspec.color;
      ctx.lineWidth = gspec.width || 1;
      ctx.beginPath();
      for (var gx = 0; gx <= W; gx += step) { ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, H); }
      for (var gy = 0; gy <= H; gy += step) { ctx.moveTo(0, gy + 0.5); ctx.lineTo(W, gy + 0.5); }
      ctx.stroke();
    }

    /* --- stars --------------------------------------------------------- */
    if (bg.stars && bg.stars.count) {
      var rnd = mulberry32(seed ^ 0x9E3779B9);
      ctx.fillStyle = bg.stars.color;
      for (var s = 0; s < bg.stars.count; s++) {
        var sx = rnd() * W, sy = rnd() * H, sr = rnd() * 1.8 + 0.35;
        ctx.globalAlpha = 0.15 + rnd() * 0.8;
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /* --- embers / dust ------------------------------------------------- */
    if (bg.embers && bg.embers.count) {
      var rnde = mulberry32(seed ^ 0x51ED270B);
      var e = bg.embers;
      ctx.globalCompositeOperation = 'lighter';
      for (var n = 0; n < e.count; n++) {
        var ex = rnde() * W, ey = rnde() * H, er = 1.4 + rnde() * 4.2;
        var col = e.colors[(rnde() * e.colors.length) | 0];
        ctx.globalAlpha = 0.25 + rnde() * 0.7;
        ctx.shadowColor = col;
        ctx.shadowBlur = er * 6;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(ex, ey, er * 0.55, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    /* --- scanlines ----------------------------------------------------- */
    if (bg.scan && bg.scan.gap) {
      ctx.globalAlpha = bg.scan.alpha == null ? 0.14 : bg.scan.alpha;
      ctx.fillStyle = bg.scan.color || '#000';
      for (var sl = 0; sl < H; sl += bg.scan.gap) ctx.fillRect(0, sl, W, Math.max(1, bg.scan.gap / 2));
      ctx.globalAlpha = 1;
    }

    /* --- vignette ------------------------------------------------------ */
    if (bg.vignette) {
      var vg = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.22, cx, cy, Math.max(W, H) * 0.78);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,' + bg.vignette + ')');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  /* Turn any css colour with alpha into the same colour at a new alpha. */
  function fade(color, alpha) {
    color = String(color || '').trim();
    var a = Math.max(0, Math.min(1, alpha));
    var hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
    if (hex) {
      var h = hex[1];
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }
    var rgb = /^rgba?\(([^)]+)\)$/i.exec(color);
    if (rgb) {
      var parts = rgb[1].split(',').map(function (p) { return p.trim(); });
      return 'rgba(' + parts[0] + ',' + parts[1] + ',' + parts[2] + ',' + a + ')';
    }
    return color;
  }

  global.OverlayPainter = { paint: paint, fade: fade, mulberry32: mulberry32, hash: hash };
})(window);
