/* ==========================================================================
   Twitch Overlay Studio — frames.js
   Panel + rim-frame geometry engine.

   50 procedural frame styles. Frames are vector geometry (lists of polylines),
   not images, so the same definition renders as inline SVG in the editor and
   the exported bundle, and as canvas strokes in the MP4 renderer —
   resolution independent, crisp at 4K, and re-skinned by colour tokens.
   ========================================================================== */
(function (OS) {
  'use strict';

  var STYLES = [
    ['rim', 'Rim frame'],
    ['bracket', 'Corner brackets'],
    ['tech', 'Tech panel'],
    ['hud', 'HUD bar'],
    ['hex', 'Hex card'],
    ['pod', 'Alert pod'],
    ['sidebar', 'Sidebar rail'],
    ['notch', 'Notched plate'],
    ['crosshair', 'Crosshair'],
    ['circuit', 'Circuit trace'],
    ['scanline', 'Scanline deck'],
    ['corner', 'Cut corners'],
    ['ribbon', 'Ribbon banner'],
    ['capsule', 'Capsule'],
    ['double', 'Double line'],
    ['grid', 'Grid plate'],
    ['spikes', 'Spike frame'],
    ['bubble', 'Speech bubble'],
    ['ticket', 'Ticket stub'],
    ['chevron', 'Chevron'],
    ['shield', 'Shield badge'],
    ['bar', 'Top bar'],
    ['angular', 'Angular cut'],
    ['cornerl', 'Corner L'],
    ['photo', 'Photo mat'],
    ['dash', 'Dashed rim'],
    ['rivet', 'Riveted plate'],
    ['bevel', 'Bevelled'],
    ['tag', 'Tag'],
    ['stem', 'Callout stem'],
    ['octa', 'Octagon plate'],
    ['ring', 'Ring rail'],
    ['arcs', 'Arc corners'],
    ['ladder', 'Ladder rails'],
    ['bento', 'Bento grid'],
    ['strip', 'Baseline strip'],
    ['neon', 'Neon rim'],
    ['screws', 'Screw plate'],
    ['lattice', 'Rune lattice'],
    ['stripe', 'Hazard corner'],
    ['steps', 'Stepped corners'],
    ['fan', 'Fan blades'],
    ['wave', 'Wave edge'],
    ['twin', 'Twin brackets'],
    ['compass', 'Compass ticks'],
    ['ruler', 'Ruler edge'],
    ['pulse', 'Heartbeat'],
    ['starburst', 'Starburst'],
    ['stencil', 'Stencil gaps'],
    ['cyber', 'Cyber slabs']
  ];

  /* ---------------------------------------------------------------- maths */

  function add(out, pts, role, mult, closed) {
    out.push({ pts: pts, closed: !!closed, role: role || 'rim', weight: mult == null ? 1 : mult });
  }

  function centroid(pts) {
    var cx = 0, cy = 0;
    for (var i = 0; i < pts.length; i++) { cx += pts[i][0]; cy += pts[i][1]; }
    return [cx / pts.length, cy / pts.length];
  }

  /** Inset a convex polygon along its edge normals (proper miter offset). */
  function offsetPoly(pts, d) {
    var n = pts.length;
    if (!d) return pts.map(function (p) { return [p[0], p[1]]; });
    var c = centroid(pts);
    var lines = [];
    for (var i = 0; i < n; i++) {
      var a = pts[i], b = pts[(i + 1) % n];
      var ex = b[0] - a[0], ey = b[1] - a[1];
      var len = Math.sqrt(ex * ex + ey * ey) || 1;
      var nx = ey / len, ny = -ex / len;
      var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if ((c[0] - mx) * nx + (c[1] - my) * ny < 0) { nx = -nx; ny = -ny; }
      lines.push({ px: a[0] + nx * d, py: a[1] + ny * d, dx: ex / len, dy: ey / len });
    }
    var out = [];
    for (var j = 0; j < n; j++) {
      var l1 = lines[(j - 1 + n) % n], l2 = lines[j];
      var det = l1.dx * l2.dy - l1.dy * l2.dx;
      if (Math.abs(det) < 1e-7) { out.push([l2.px, l2.py]); continue; }
      var t = ((l2.px - l1.px) * l2.dy - (l2.py - l1.py) * l2.dx) / det;
      out.push([l1.px + l1.dx * t, l1.py + l1.dy * t]);
    }
    return out;
  }

  function chamfer(w, h, c) {
    c = Math.max(0, Math.min(c, Math.min(w, h) / 2));
    if (!c) return [[0, 0], [w, 0], [w, h], [0, h]];
    return [
      [c, 0], [w - c, 0], [w, c], [w, h - c],
      [w - c, h], [c, h], [0, h - c], [0, c]
    ];
  }

  function arcPts(cx, cy, rx, ry, a0, a1, steps) {
    steps = steps || 6;
    var out = [];
    for (var i = 0; i <= steps; i++) {
      var a = a0 + (a1 - a0) * (i / steps);
      out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    return out;
  }

  function roundRect(x, y, w, h, r, steps) {
    r = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    if (r < 0.5) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    return []
      .concat(arcPts(x + w - r, y + r, r, r, -Math.PI / 2, 0, steps))
      .concat(arcPts(x + w - r, y + h - r, r, r, 0, Math.PI / 2, steps))
      .concat(arcPts(x + r, y + h - r, r, r, Math.PI / 2, Math.PI, steps))
      .concat(arcPts(x + r, y + r, r, r, Math.PI, Math.PI * 1.5, steps));
  }

  function square(x, y, s) {
    return [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]];
  }

  function diamond(x, y, s) {
    return [[x, y - s], [x + s, y], [x, y + s], [x - s, y], [x, y - s]];
  }

  function dashedRect(w, h, dash, gap, out, role, mult) {
    var pts = [[0, 0], [w, 0], [w, h], [0, h]];
    for (var i = 0; i < 4; i++) {
      var a = pts[i], b = pts[(i + 1) % 4];
      var len = Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2));
      var d = 0;
      while (d < len - 1) {
        var e = Math.min(len, d + dash);
        var s0 = d / len, s1 = e / len;
        add(out, [
          [a[0] + (b[0] - a[0]) * s0, a[1] + (b[1] - a[1]) * s0],
          [a[0] + (b[0] - a[0]) * s1, a[1] + (b[1] - a[1]) * s1]
        ], role, mult, false);
        d = e + gap;
      }
    }
  }

  /* shared accent marks, used by the simpler frames */
  function accentMark(out, kind, w, h, o) {
    var g = Math.max(2, o.gap * 0.6);
    if (kind === 'left') add(out, [[g, h * 0.24], [g, h * 0.76]], 'accent', 2.4, false);
    else if (kind === 'right') add(out, [[w - g, h * 0.24], [w - g, h * 0.76]], 'accent', 2.4, false);
    else if (kind === 'top') add(out, [[w * 0.32, g], [w * 0.68, g]], 'accent', 2.4, false);
    else if (kind === 'bottom') add(out, [[w * 0.32, h - g], [w * 0.68, h - g]], 'accent', 2.4, false);
  }

  /* ---------------------------------------------------------------- styles */

  var GEO = {

    rim: function (w, h, o) {
      var out = [], a = chamfer(w, h, o.cut);
      add(out, a, 'rim', 1, true);
      add(out, offsetPoly(a, o.gap + o.t), 'faint', 0.55, true);
      accentMark(out, o.accent, w, h, o);
      return out;
    },

    bracket: function (w, h, o) {
      var out = [];
      var L = Math.min(w, h) * (o.length || 0.24);
      [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]].forEach(function (cn) {
        add(out, [[cn[0], cn[1] + L * cn[3]], [cn[0], cn[1]], [cn[0] + L * cn[2], cn[1]]], 'rim', 1, false);
        add(out, [
          [cn[0] + 7 * cn[2], cn[1] + (L + 10) * cn[3]],
          [cn[0] + 7 * cn[2], cn[1] + 7 * cn[3]],
          [cn[0] + (L + 10) * cn[2], cn[1] + 7 * cn[3]]
        ], 'faint', 0.5, false);
      });
      return out;
    },

    tech: function (w, h, o) {
      var out = [], a = chamfer(w, h, o.cut);
      add(out, a, 'rim', 1, true);
      add(out, offsetPoly(a, o.gap + o.t), 'faint', 0.5, true);
      for (var v = 0; v < 3; v++) {
        var vy = h * (0.3 + v * 0.2);
        add(out, [[3, vy], [16, vy]], 'accent', 0.9, false);
        add(out, [[w - 16, vy], [w - 3, vy]], 'accent', 0.9, false);
      }
      var nw = Math.min(30, w * 0.3);
      add(out, [[w / 2 - nw, 0], [w / 2, Math.min(13, h * 0.18)], [w / 2 + nw, 0]], 'accent', 1, false);
      add(out, square(9, 9, 5), 'faint', 0.55, true);
      add(out, square(w - 14, 9, 5), 'faint', 0.55, true);
      accentMark(out, o.accent, w, h, o);
      return out;
    },

    hud: function (w, h, o) {
      var out = [], hh = h * 0.74;
      add(out, [[0, h], [0, hh], [w * 0.1, 0], [w * 0.9, 0], [w, hh], [w, h]], 'rim', 1, true);
      add(out, [[w * 0.34, 0], [w * 0.5, h * 0.26], [w * 0.66, 0]], 'accent', 1, false);
      add(out, [[w * 0.06, h * 0.62], [w * 0.06, h * 0.86]], 'faint', 0.6, false);
      add(out, [[w * 0.94, h * 0.62], [w * 0.94, h * 0.86]], 'faint', 0.6, false);
      add(out, [[w * 0.2, h * 0.86], [w * 0.8, h * 0.86]], 'faint', 0.45, false);
      return out;
    },

    hex: function (w, h, o) {
      var out = [];
      var hex = [[w * 0.22, 0], [w * 0.78, 0], [w, h / 2], [w * 0.78, h], [w * 0.22, h], [0, h / 2]];
      add(out, hex, 'rim', 1, true);
      add(out, offsetPoly(hex, o.gap + o.t), 'faint', 0.55, true);
      accentMark(out, o.accent, w, h, o);
      return out;
    },

    pod: function (w, h, o) {
      var out = [];
      var pod = [[0, 0], [w - 26, 0], [w, h / 2], [w - 26, h], [0, h], [14, h / 2]];
      add(out, pod, 'rim', 1, true);
      add(out, [[14, h * 0.24], [14, h * 0.76]], 'accent', 2.2, false);
      var ds = Math.max(2.5, Math.min(9, h * 0.14, w * 0.07));
      add(out, diamond(Math.max(ds + 4, w - 46), h / 2, ds), 'faint', 0.6, true);
      if (w > 170) add(out, [[w - 70, h / 2], [w - 60, h / 2]], 'faint', 0.55, false);
      return out;
    },

    sidebar: function (w, h, o) {
      var out = [];
      add(out, [[0, 0], [w, 0], [w, h], [0, h]], 'rim', 1, true);
      add(out, [[0, 0], [0, h]], 'accent', 2.6, false);
      for (var i = 1; i <= 4; i++) {
        var y = (h * i) / 5;
        add(out, [[w - 30, y], [w, y]], 'faint', 0.6, false);
      }
      add(out, [[8, 14], [w - 30, 14]], 'faint', 0.4, false);
      add(out, [[8, h - 14], [w - 30, h - 14]], 'faint', 0.4, false);
      return out;
    },

    notch: function (w, h, o) {
      var out = [], n = Math.min(26, Math.min(w, h) * 0.18);
      var plate = [[n, 0], [w - n, 0], [w, n], [w, h], [0, h], [0, n]];
      add(out, plate, 'rim', 1, true);
      add(out, offsetPoly(plate, o.gap), 'faint', 0.5, true);
      add(out, [[n * 0.5, 0], [0, n * 0.5]], 'faint', 0.5, false);
      add(out, [[w - n * 0.5, 0], [w, n * 0.5]], 'faint', 0.5, false);
      accentMark(out, o.accent, w, h, o);
      return out;
    },

    crosshair: function (w, h, o) {
      var out = [], L = Math.min(w, h) * 0.16, g = o.gap;
      [[g, g, 1, 1], [w - g, g, -1, 1], [g, h - g, 1, -1], [w - g, h - g, -1, -1]].forEach(function (c) {
        add(out, [[c[0], c[1] + L * c[3]], [c[0], c[1]], [c[0] + L * c[2], c[1]]], 'rim', 1, false);
      });
      add(out, [[w / 2 - L * 0.5, h / 2], [w / 2 + L * 0.5, h / 2]], 'accent', 1.1, false);
      add(out, [[w / 2, h / 2 - L * 0.5], [w / 2, h / 2 + L * 0.5]], 'accent', 1.1, false);
      add(out, [[w / 2 - 4, h / 2 - 4], [w / 2 + 4, h / 2 - 4], [w / 2 + 4, h / 2 + 4], [w / 2 - 4, h / 2 + 4]], 'faint', 0.6, true);
      return out;
    },

    circuit: function (w, h, o) {
      var out = [], m = o.gap + o.t + 4;
      add(out, [[0, 0], [w, 0], [w, h], [0, h]], 'rim', 1, true);
      var t1 = [[m, h * 0.3], [w * 0.16, h * 0.3], [w * 0.22, h * 0.22], [w * 0.22, m]];
      var t2 = [[m, h * 0.7], [w * 0.3, h * 0.7], [w * 0.36, h * 0.78], [w * 0.36, h - m]];
      var t3 = [[w - m, h * 0.34], [w * 0.8, h * 0.34], [w * 0.74, h * 0.26], [w * 0.74, m]];
      var t4 = [[w - m, h * 0.72], [w * 0.62, h * 0.72], [w * 0.56, h * 0.64], [w * 0.56, h - m]];
      [t1, t2, t3, t4].forEach(function (tr) { add(out, tr, 'faint', 0.5, false); });
      [[w * 0.22, m - 6], [w * 0.74, m - 6], [w * 0.36, h - m + 6], [w * 0.56, h - m + 6]].forEach(function (p) {
        add(out, square(p[0] - 3, p[1] - 3, 6), 'accent', 0.8, true);
      });
      add(out, [[w * 0.5, h * 0.5 - 7], [w * 0.5 + 7, h * 0.5], [w * 0.5, h * 0.5 + 7], [w * 0.5 - 7, h * 0.5]], 'accent', 0.9, true);
      return out;
    },

    scanline: function (w, h, o) {
      var out = [];
      add(out, [[0, 0], [w, 0], [w, h], [0, h]], 'rim', 1, true);
      add(out, [[0, 0], [0, h]], 'accent', 2.4, false);
      var rows = Math.max(3, Math.min(7, Math.round(h / 34)));
      for (var i = 0; i < rows; i++) {
        var y = h * (0.42 + 0.48 * (rows === 1 ? 0 : i / (rows - 1)));
        add(out, [[w * 0.16, y], [w * 0.62, y]], 'faint', 0.45, false);
      }
      add(out, [[w * 0.16, h * 0.16], [w * 0.4, h * 0.16]], 'faint', 0.6, false);
      add(out, [[w * 0.86, h * 0.16], [w * 0.86, h * 0.4]], 'faint', 0.6, false);
      return out;
    },

    corner: function (w, h, o) {
      var out = [];
      var c1 = Math.min(w, h) * 0.2, c2 = Math.min(w, h) * 0.05;
      var pts = [
        [c1, 0], [w - c2, 0], [w, c2], [w, h - c1],
        [w - c1, h], [c2, h], [0, h - c2], [0, c1]
      ];
      add(out, pts, 'rim', 1, true);
      add(out, offsetPoly(pts, o.gap + o.t), 'faint', 0.55, true);
      add(out, [[c1 * 0.6, 0], [0, c1 * 0.6]], 'accent', 1.4, false);
      add(out, [[w - c1 * 0.6, h], [w, h - c1 * 0.6]], 'accent', 1.4, false);
      return out;
    },

    ribbon: function (w, h, o) {
      var out = [], n = Math.min(w * 0.16, h * 0.5);
      var pts = [[n, 0], [w - n, 0], [w, h / 2], [w - n, h], [n, h], [0, h / 2]];
      add(out, pts, 'rim', 1, true);
      add(out, offsetPoly(pts, o.gap + o.t), 'faint', 0.5, true);
      add(out, [[n, h * 0.24], [n, h * 0.76]], 'accent', 2, false);
      return out;
    },

    capsule: function (w, h, o) {
      var out = [], r = h / 2;
      var pts = roundRect(0, 0, w, h, r, 7);
      add(out, pts, 'rim', 1, true);
      add(out, roundRect(o.gap + o.t, o.gap + o.t, Math.max(2, w - (o.gap + o.t) * 2), Math.max(2, h - (o.gap + o.t) * 2), Math.max(1, r - o.gap - o.t), 6), 'faint', 0.5, true);
      accentMark(out, o.accent, w, h, o);
      return out;
    },

    double: function (w, h, o) {
      var out = [], a = chamfer(w, h, o.cut);
      add(out, a, 'rim', 1, true);
      add(out, offsetPoly(a, o.gap), 'faint', 0.7, true);
      add(out, offsetPoly(a, o.gap * 2 + o.t), 'faint', 0.4, true);
      return out;
    },

    grid: function (w, h, o) {
      var out = [], a = chamfer(w, h, o.cut), ins = o.gap + o.t;
      add(out, a, 'rim', 1, true);
      add(out, offsetPoly(a, ins), 'faint', 0.5, true);
      for (var i = 1; i <= 3; i++) {
        var x = ins + (w - ins * 2) * (i / 4);
        add(out, [[x, ins], [x, h - ins]], 'faint', 0.3, false);
      }
      for (var j = 1; j <= 2; j++) {
        var y = ins + (h - ins * 2) * (j / 3);
        add(out, [[ins, y], [w - ins, y]], 'faint', 0.3, false);
      }
      add(out, [[0, h * 0.4], [0, h * 0.6]], 'accent', 2, false);
      add(out, [[w, h * 0.4], [w, h * 0.6]], 'accent', 2, false);
      return out;
    },

    spikes: function (w, h, o) {
      var out = [], s = Math.min(w, h) * 0.12;
      add(out, [[0, 0], [w, 0], [w, h], [0, h]], 'rim', 1, true);
      add(out, [[w / 2 - s, 0], [w / 2, s], [w / 2 + s, 0]], 'accent', 1.1, false);
      add(out, [[w / 2 - s, h], [w / 2, h - s], [w / 2 + s, h]], 'accent', 1.1, false);
      add(out, [[0, h / 2 - s], [s, h / 2], [0, h / 2 + s]], 'faint', 0.8, false);
      add(out, [[w, h / 2 - s], [w - s, h / 2], [w, h / 2 + s]], 'faint', 0.8, false);
      add(out, [[s * 1.6, s * 1.6], [s * 1.6, h - s * 1.6]], 'faint', 0.35, false);
      return out;
    },

    bubble: function (w, h, o) {
      var out = [], tail = Math.min(w, h) * 0.14;
      var body = roundRect(0, 0, w, h - tail * 0.6, Math.min(22, h * 0.14), 6);
      add(out, body, 'rim', 1, true);
      add(out, [[w * 0.16, h - tail * 0.6], [w * 0.16, h], [w * 0.32, h - tail * 0.6]], 'rim', 1, false);
      add(out, roundRect(o.gap + o.t, o.gap + o.t, Math.max(2, w - (o.gap + o.t) * 2), Math.max(2, h - tail * 0.6 - (o.gap + o.t) * 2), Math.min(14, h * 0.1), 6), 'faint', 0.45, true);
      add(out, [[w * 0.72, h * 0.2], [w * 0.72, h * 0.52]], 'accent', 1.6, false);
      return out;
    },

    ticket: function (w, h, o) {
      var out = [], r = Math.min(h * 0.22, 26);
      add(out, [[0, 0], [w, 0], [w, h], [0, h]], 'rim', 1, true);
      add(out, arcPts(0, h / 2, r, r, -Math.PI / 2, Math.PI / 2, 6), 'rim', 1, false);
      add(out, arcPts(w, h / 2, r, r, Math.PI / 2, Math.PI * 1.5, 6), 'rim', 1, false);
      for (var i = 0; i < 6; i++) {
        var y = h * 0.14 + i * (h * 0.72 / 5);
        add(out, [[w * 0.66, y], [w * 0.82, y]], 'faint', 0.45, false);
      }
      add(out, [[w * 0.34, h * 0.14], [w * 0.34, h * 0.86]], 'faint', 0.3, false);
      add(out, [[0, h * 0.24], [0, h * 0.76]], 'accent', 2, false);
      return out;
    },

    chevron: function (w, h, o) {
      var out = [], k = Math.min(w * 0.1, h * 0.45);
      var pts = [[k, 0], [w, 0], [w - k, h], [0, h]];
      add(out, pts, 'rim', 1, true);
      add(out, offsetPoly(pts, o.gap + o.t), 'faint', 0.5, true);
      add(out, [[k * 0.6, h * 0.3], [k * 0.6, h * 0.7]], 'accent', 2, false);
      return out;
    },

    shield: function (w, h, o) {
      var out = [];
      var pts = [
        [w * 0.5, 0], [w, h * 0.18], [w, h * 0.62],
        [w * 0.5, h], [0, h * 0.62], [0, h * 0.18]
      ];
      add(out, pts, 'rim', 1, true);
      add(out, offsetPoly(pts, o.gap + o.t), 'faint', 0.5, true);
      add(out, [[w * 0.5, h * 0.16], [w * 0.5, h * 0.42]], 'accent', 2, false);
      add(out, [[w * 0.5 - 5, h * 0.5], [w * 0.5, h * 0.56], [w * 0.5 + 6, h * 0.46]], 'accent', 1.6, false);
      return out;
    },

    bar: function (w, h, o) {
      var out = [];
      add(out, [[0, 0], [w, 0], [w, h], [0, h]], 'rim', 1, true);
      add(out, [[0, h - Math.max(3, h * 0.1)], [w, h - Math.max(3, h * 0.1)]], 'accent', 2, false);
      var e = Math.min(18, w * 0.04);
      add(out, [[e, h * 0.22], [e, h * 0.62]], 'faint', 0.6, false);
      add(out, [[w - e, h * 0.22], [w - e, h * 0.62]], 'faint', 0.6, false);
      var dots = w > 150 ? 3 : 1;
      var spread = Math.min(18, w * 0.12);
      for (var i = 0; i < dots; i++) {
        add(out, diamond(w * 0.5 + (dots === 1 ? 0 : (i - 1) * spread), h * 0.36, Math.max(2, Math.min(4, w * 0.03))), 'faint', 0.5, true);
      }
      return out;
    },

    angular: function (w, h, o) {
      var out = [], c = Math.min(w, h) * 0.18;
      var pts = [[c, 0], [w - c, 0], [w, c], [w, h - c], [w - c, h], [c, h], [0, h - c], [0, c]];
      add(out, pts, 'rim', 1, true);
      add(out, offsetPoly(pts, o.gap + o.t), 'faint', 0.5, true);
      add(out, [[c * 0.9, 0], [0, c * 0.9]], 'accent', 1.8, false);
      add(out, [[w - c * 0.9, h], [w, h - c * 0.9]], 'accent', 1.8, false);
      return out;
    },

    cornerl: function (w, h, o) {
      var out = [], L = Math.min(w, h) * 0.5;
      add(out, [[0, h], [0, 0], [w, 0]], 'rim', 1, false);
      add(out, [[0, h], [0, 0], [L, 0]], 'accent', 1.6, false);
      add(out, [[o.gap + o.t, h - o.gap], [o.gap + o.t, o.gap + o.t], [w - o.gap, o.gap + o.t]], 'faint', 0.45, false);
      add(out, [[0, h * 0.78], [w * 0.18, h * 0.78]], 'faint', 0.6, false);
      add(out, [[w * 0.82, 0], [w, h * 0.14]], 'faint', 0.6, false);
      return out;
    },

    photo: function (w, h, o) {
      var out = [], m = Math.max(10, Math.min(w, h) * 0.1);
      add(out, [[0, 0], [w, 0], [w, h], [0, h]], 'rim', 1, true);
      add(out, [[m, m], [w - m, m], [w - m, h - m], [m, h - m]], 'faint', 0.55, true);
      var k = Math.min(w, h) * 0.08;
      [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]].forEach(function (c) {
        add(out, [[c[0], c[1] + k * c[3]], [c[0], c[1]], [c[0] + k * c[2], c[1]]], 'accent', 1.3, false);
      });
      return out;
    },

    dash: function (w, h, o) {
      var out = [];
      dashedRect(w, h, Math.max(14, w * 0.05), Math.max(7, w * 0.022), out, 'rim', 1);
      var k = Math.min(w, h) * 0.12;
      [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]].forEach(function (c) {
        add(out, [[c[0] + k * c[2], c[1]], [c[0], c[1]], [c[0], c[1] + k * c[3]]], 'accent', 1.5, false);
      });
      accentMark(out, o.accent === 'none' ? 'bottom' : o.accent, w, h, o);
      return out;
    },

    rivet: function (w, h, o) {
      var out = [];
      add(out, [[0, 0], [w, 0], [w, h], [0, h]], 'rim', 1, true);
      var s = Math.max(2.5, Math.min(w, h) * 0.018), p = Math.max(10, Math.min(w, h) * 0.07);
      [[p, p], [w / 2, p], [w - p, p], [p, h / 2], [w - p, h / 2],
      [p, h - p], [w / 2, h - p], [w - p, h - p]].forEach(function (c) {
        add(out, diamond(c[0], c[1], s), 'faint', 0.7, true);
      });
      add(out, [[p * 1.8, p * 1.8], [w - p * 1.8, p * 1.8], [w - p * 1.8, h - p * 1.8], [p * 1.8, h - p * 1.8]], 'faint', 0.25, true);
      add(out, [[0, h * 0.42], [0, h * 0.58]], 'accent', 2.2, false);
      return out;
    },

    bevel: function (w, h, o) {
      var out = [], c = Math.min(w, h) * 0.16;
      add(out, [[0, 0], [w, 0], [w, h], [0, h]], 'rim', 1, true);
      add(out, [[0, c], [c, 0]], 'faint', 0.8, false);
      add(out, [[w - c, 0], [w, c]], 'faint', 0.8, false);
      add(out, [[w, h - c], [w - c, h]], 'faint', 0.8, false);
      add(out, [[c, h], [0, h - c]], 'faint', 0.8, false);
      add(out, [[0, c], [c, c], [c, 0]], 'accent', 1.2, false);
      add(out, [[w, h - c], [w - c, h - c], [w - c, h]], 'accent', 1.2, false);
      return out;
    },

    tag: function (w, h, o) {
      var out = [], n = Math.min(w * 0.16, h * 0.4);
      var pts = [[0, h * 0.5], [n, 0], [w, 0], [w, h], [n, h]];
      add(out, pts, 'rim', 1, true);
      add(out, offsetPoly(pts, o.gap + o.t), 'faint', 0.5, true);
      var hr = Math.max(3, Math.min(n * 0.42, h * 0.1, w * 0.1));
      add(out, arcPts(n * 0.62, h * 0.5, hr, hr, 0, Math.PI * 2, 10), 'accent', 1.4, true);
      return out;
    },

    stem: function (w, h, o) {
      var out = [], arm = Math.min(w * 0.14, 70);
      add(out, [[0, 0], [w - arm, 0], [w - arm, h * 0.36], [w, h * 0.36], [w, h * 0.64], [w - arm, h * 0.64], [w - arm, h], [0, h]], 'rim', 1, true);
      add(out, [[6, 6], [Math.max(6, w - arm - 6), 6]], 'faint', 0.4, false);
      add(out, [[6, h - 6], [Math.max(6, w - arm - 6), h - 6]], 'faint', 0.4, false);
      add(out, [[0, h * 0.26], [0, h * 0.74]], 'accent', 2.4, false);
      var ds = Math.max(3, Math.min(h * 0.08, w * 0.05, 12));
      var cx = Math.min(w - ds - 2, Math.max(ds + 2, w - arm * 0.4));
      add(out, diamond(cx, h * 0.5, ds), 'accent', 1.2, true);
      return out;
    },

    /* ---------------- second batch: 20 more styles ---------------- */

    octa: function (w, h, o) {
      var out = [], c = Math.min(w, h) * 0.22;
      var pts = [[c, 0], [w - c, 0], [w, c], [w, h - c], [w - c, h], [c, h], [0, h - c], [0, c]];
      add(out, pts, 'rim', 1, true);
      add(out, offsetPoly(pts, o.gap + o.t), 'faint', 0.5, true);
      add(out, [[c * 0.45, 0], [0, c * 0.45]], 'accent', 1.6, false);
      add(out, [[w - c * 0.45, h], [w, h - c * 0.45]], 'accent', 1.6, false);
      return out;
    },

    ring: function (w, h, o) {
      var out = [], r = Math.min(20, Math.min(w, h) * 0.14), g = o.gap + o.t;
      add(out, roundRect(0, 0, w, h, r, 6), 'rim', 1, true);
      add(out, roundRect(g, g, Math.max(2, w - g * 2), Math.max(2, h - g * 2), Math.max(1, r - g), 6), 'faint', 0.55, true);
      var arm = Math.min(30, w * 0.2);
      add(out, [[w / 2 - arm, h / 2], [w / 2 + arm, h / 2]], 'accent', 1.2, false);
      add(out, [[w / 2, h / 2 - arm * 0.4], [w / 2, h / 2 + arm * 0.4]], 'accent', 1.2, false);
      return out;
    },

    arcs: function (w, h, o) {
      var out = [], r = Math.min(w, h) * 0.26, g = o.gap + o.t;
      add(out, [[r, 0], [w - r, 0]], 'rim', 1, false);
      add(out, [[r, h], [w - r, h]], 'rim', 1, false);
      add(out, [[0, r], [0, h - r]], 'rim', 1, false);
      add(out, [[w, r], [w, h - r]], 'rim', 1, false);
      [[0, 0, 0], [w, 0, 1], [w, h, 2], [0, h, 3]].forEach(function (c) {
        var a0 = c[2] * Math.PI / 2, a1 = a0 + Math.PI / 2;
        add(out, arcPts(c[0], c[1], r, r, a0, a1, 8), 'rim', 1, false);
      });
      add(out, [[g * 1.6, h / 2], [g * 1.6, h * 0.62]], 'accent', 2, false);
      add(out, [[w - g * 1.6, h / 2], [w - g * 1.6, h * 0.62]], 'accent', 2, false);
      return out;
    },

    ladder: function (w, h, o) {
      var out = [], r = Math.max(6, Math.min(w * 0.1, h * 0.14));
      add(out, [[r, 0], [w - r, 0], [w - r, h], [r, h]], 'rim', 1, true);
      add(out, [[0, 0], [0, h]], 'faint', 0.7, false);
      add(out, [[w, 0], [w, h]], 'faint', 0.7, false);
      var n = Math.max(2, Math.min(7, Math.round(h / 60)));
      for (var i = 1; i < n; i++) {
        var y = h * (i / n);
        add(out, [[0, y], [r, y]], 'faint', 0.5, false);
        add(out, [[w - r, y], [w, y]], 'faint', 0.5, false);
      }
      add(out, [[w / 2 - 14, 0], [w / 2 + 14, 0]], 'accent', 2, false);
      add(out, [[w / 2 - 14, h], [w / 2 + 14, h]], 'accent', 2, false);
      return out;
    },

    bento: function (w, h, o) {
      var out = [], a = chamfer(w, h, Math.min(o.cut, Math.min(w, h) * 0.14));
      add(out, a, 'rim', 1, true);
      var vx = w * 0.56, hy = h * 0.46;
      add(out, [[vx, 0], [vx, h]], 'faint', 0.45, false);
      add(out, [[0, hy], [w, hy]], 'faint', 0.45, false);
      add(out, [[vx, h * 0.72], [w, h * 0.72]], 'faint', 0.28, false);
      add(out, [[vx * 0.5, 0], [vx * 0.5, hy]], 'faint', 0.26, false);
      add(out, [[0, hy * 0.55], [vx, hy * 0.55]], 'faint', 0.22, false);
      add(out, [[0, h * 0.5], [0, h * 0.72]], 'accent', 2.2, false);
      return out;
    },

    strip: function (w, h, o) {
      var out = [], sh = Math.min(30, Math.max(12, h * 0.18));
      add(out, [[0, 0], [w, 0], [w, h], [0, h]], 'rim', 1, true);
      add(out, [[0, h - sh], [w * 0.4, h - sh]], 'accent', 2, false);
      add(out, [[w * 0.66, h - sh], [w, h - sh]], 'faint', 0.5, false);
      add(out, [[6, 8], [6, h - sh - 8]], 'faint', 0.32, false);
      add(out, [[w - 6, 8], [w - 6, h - sh - 8]], 'faint', 0.32, false);
      add(out, [[w * 0.5 - 9, h - sh], [w * 0.5 + 9, h - sh]], 'accent', 1.6, false);
      return out;
    },

    neon: function (w, h, o) {
      var out = [], a = chamfer(w, h, o.cut), g = o.gap + o.t;
      add(out, a, 'rim', 1.6, true);
      add(out, offsetPoly(a, g), 'rim', 0.7, true);
      add(out, offsetPoly(a, g * 2.2), 'faint', 0.28, true);
      add(out, [[0, h / 2], [g * 0.9, h / 2]], 'accent', 2.6, false);
      add(out, [[w - g * 0.9, h / 2], [w, h / 2]], 'accent', 2.6, false);
      return out;
    },

    screws: function (w, h, o) {
      var out = [], m = Math.max(9, Math.min(20, Math.min(w, h) * 0.1));
      add(out, [[0, 0], [w, 0], [w, h], [0, h]], 'rim', 1, true);
      add(out, [[m * 1.4, m * 1.4], [w - m * 1.4, m * 1.4], [w - m * 1.4, h - m * 1.4], [m * 1.4, h - m * 1.4]], 'faint', 0.3, true);
      var r = Math.max(2.5, Math.min(6, m * 0.34));
      [[m, m], [w - m, m], [m, h - m], [w - m, h - m]].forEach(function (c) {
        add(out, arcPts(c[0], c[1], r, r, 0, Math.PI * 2, 8), 'faint', 0.7, true);
        add(out, [[c[0] - r * 0.75, c[1]], [c[0] + r * 0.75, c[1]]], 'faint', 0.45, false);
      });
      add(out, [[0, h * 0.44], [0, h * 0.56]], 'accent', 2.2, false);
      return out;
    },

    lattice: function (w, h, o) {
      var out = [];
      add(out, [[0, 0], [w, 0], [w, h], [0, h]], 'rim', 1, true);
      var span = Math.min(w, h) * 0.28;
      for (var i = 0; i < 4; i++) {
        var d = span * (0.24 + i * 0.19);
        add(out, [[d, h], [0, h - d]], 'faint', 0.3, false);
        add(out, [[w - d, 0], [w, d]], 'faint', 0.3, false);
      }
      add(out, [[w / 2, 0], [w / 2, Math.min(12, h * 0.1)]], 'accent', 2, false);
      add(out, [[w / 2, h - Math.min(12, h * 0.1)], [w / 2, h]], 'accent', 2, false);
      return out;
    },

    stripe: function (w, h, o) {
      var out = [];
      add(out, [[0, 0], [w, 0], [w, h], [0, h]], 'rim', 1, true);
      var s = Math.min(11, Math.min(w, h) * 0.16);
      for (var i = 1; i <= 3; i++) add(out, [[i * s, 0], [0, i * s]], 'accent', 1.2, false);
      for (var j = 1; j <= 3; j++) add(out, [[w - j * s, h], [w, h - j * s]], 'faint', 0.4, false);
      add(out, [[w * 0.36, h], [w * 0.64, h]], 'faint', 0.5, false);
      return out;
    },

    steps: function (w, h, o) {
      var out = [], s = Math.min(w, h) * 0.13;
      var pts = [
        [s, 0], [w - s, 0], [w - s, s], [w, s], [w, h - s], [w - s, h - s],
        [w - s, h], [s, h], [s, h - s], [0, h - s], [0, s], [s, s]
      ];
      add(out, pts, 'rim', 1, true);
      add(out, [[s, 0], [0, s]], 'accent', 1.8, false);
      add(out, [[w - s, h], [w, h - s]], 'accent', 1.8, false);
      return out;
    },

    fan: function (w, h, o) {
      var out = [], r = Math.min(h * 0.92, w * 0.34), cx = w / 2, cy = h;
      add(out, [[0, 0], [w, 0], [w, h], [0, h]], 'rim', 1, true);
      var n = 5;
      for (var i = 0; i < n; i++) {
        var a = Math.PI + (i + 0.5) * (Math.PI / n);
        add(out, [[cx, cy], [cx + Math.cos(a) * r, cy + Math.sin(a) * r]], 'faint', 0.26, false);
      }
      add(out, arcPts(cx, cy, r * 0.6, r * 0.6, Math.PI, Math.PI * 2, 10), 'faint', 0.32, false);
      add(out, [[w / 2 - 16, 0], [w / 2 + 16, 0]], 'accent', 2, false);
      return out;
    },

    wave: function (w, h, o) {
      var out = [], amp = Math.min(13, h * 0.11), y0 = h - amp * 1.8;
      add(out, [[0, 0], [w, 0], [w, h], [0, h]], 'rim', 1, true);
      var segs = 24, pts = [];
      for (var i = 0; i <= segs; i++) {
        pts.push([(w * i) / segs, y0 + Math.sin((i / segs) * Math.PI * 4) * amp]);
      }
      add(out, pts, 'faint', 0.42, false);
      add(out, [[0, y0], [0, h]], 'accent', 2.2, false);
      add(out, [[w, y0], [w, h]], 'accent', 1.4, false);
      return out;
    },

    twin: function (w, h, o) {
      var out = [], L = Math.min(w, h) * 0.24, g = o.gap;
      [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]].forEach(function (c) {
        add(out, [[c[0] + g * c[2], c[1] + (L + g) * c[3]], [c[0] + g * c[2], c[1] + g * c[3]], [c[0] + (L + g) * c[2], c[1] + g * c[3]]], 'rim', 1, false);
        add(out, [[c[0], c[1] + L * c[3]], [c[0], c[1]], [c[0] + L * c[2], c[1]]], 'accent', 1.5, false);
      });
      add(out, [[w / 2 - L * 0.36, h / 2], [w / 2 + L * 0.36, h / 2]], 'faint', 0.35, false);
      return out;
    },

    compass: function (w, h, o) {
      var out = [], m = o.gap + o.t, cx = w / 2, cy = h / 2;
      var rx = w / 2 - m, ry = h / 2 - m, tick = Math.min(9, Math.min(w, h) * 0.09);
      add(out, roundRect(m, m, Math.max(2, w - m * 2), Math.max(2, h - m * 2), Math.min(28, h * 0.3), 6), 'faint', 0.35, true);
      for (var i = 0; i < 12; i++) {
        var a = (i / 12) * Math.PI * 2, major = i % 3 === 0;
        add(out, [
          [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry],
          [cx + Math.cos(a) * (rx - tick * (major ? 2 : 1)), cy + Math.sin(a) * (ry - tick * (major ? 2 : 1))]
        ], major ? 'accent' : 'faint', major ? 1.5 : 0.45, false);
      }
      return out;
    },

    ruler: function (w, h, o) {
      var out = [], y = h - Math.max(11, h * 0.17);
      add(out, [[0, 0], [w, 0], [w, h], [0, h]], 'rim', 1, true);
      add(out, [[0, y], [w, y]], 'faint', 0.45, false);
      var n = Math.max(6, Math.min(26, Math.round(w / 36)));
      for (var i = 0; i <= n; i++) {
        var x = (w * i) / n, big = i % 5 === 0;
        add(out, [[x, y], [x, y + (big ? Math.min(13, h * 0.13) : Math.min(6, h * 0.07))]], big ? 'accent' : 'faint', big ? 1.1 : 0.45, false);
      }
      add(out, [[w * 0.035, 0], [w * 0.035, h * 0.22]], 'accent', 1.6, false);
      return out;
    },

    pulse: function (w, h, o) {
      var out = [], cy = h / 2, amp = Math.min(h * 0.3, 26);
      add(out, [[0, 0], [w, 0], [w, h], [0, h]], 'rim', 1, true);
      add(out, [[0, cy], [w * 0.05, cy]], 'faint', 0.45, false);
      var seg = [[0.05, 0], [0.28, 0], [0.34, -amp * 0.4], [0.4, amp], [0.46, -amp * 1.3], [0.52, 0], [0.74, 0]];
      add(out, seg.map(function (p) { return [w * p[0], cy + p[1]]; }), 'accent', 1.8, false);
      add(out, [[w * 0.78, cy], [w * 0.95, cy]], 'faint', 0.45, false);
      return out;
    },

    starburst: function (w, h, o) {
      var out = [], L = Math.min(w, h) * 0.3;
      add(out, [[0, 0], [w, 0], [w, h], [0, h]], 'rim', 1, true);
      [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]].forEach(function (c) {
        [0, Math.PI / 4, Math.PI / 2].forEach(function (a, i) {
          add(out, [[c[0], c[1]], [c[0] + Math.cos(a) * L * c[2], c[1] + Math.sin(a) * L * c[3]]], i === 1 ? 'accent' : 'faint', i === 1 ? 1.2 : 0.28, false);
        });
      });
      return out;
    },

    stencil: function (w, h, o) {
      var out = [], s = Math.min(15, h * 0.2);
      dashedRect(w, h, Math.max(12, w * 0.04), Math.max(8, w * 0.03), out, 'rim', 1);
      add(out, [[0, h / 2 - s], [0, h / 2 + s]], 'faint', 0.5, false);
      add(out, [[w, h / 2 - s], [w, h / 2 + s]], 'faint', 0.5, false);
      add(out, [[w * 0.3, 0], [w * 0.7, 0]], 'accent', 1.8, false);
      add(out, [[w * 0.3, h], [w * 0.7, h]], 'faint', 0.55, false);
      return out;
    },

    cyber: function (w, h, o) {
      var out = [], c = Math.min(w, h) * 0.22, d = Math.min(20, Math.min(w, h) * 0.09);
      add(out, [[0, c], [c, 0], [w - c, 0], [w, c], [w, h - c], [w - c, h], [c, h], [0, h - c]], 'rim', 1, true);
      add(out, [[0, c], [d, c], [d, d], [c, d], [c, 0]], 'faint', 0.45, false);
      add(out, [[w, h - c], [w - d, h - c], [w - d, h - d], [w - c, h - d], [w - c, h]], 'faint', 0.45, false);
      add(out, [[w / 2 - d, 0], [w / 2 + d, 0]], 'accent', 2.2, false);
      add(out, [[w / 2 - d, h], [w / 2 + d, h]], 'accent', 2.2, false);
      add(out, [[0, h / 2 - d], [0, h / 2 + d]], 'accent', 1.8, false);
      return out;
    }
  };

  /**
   * Build the stroke geometry for a frame.
   * @returns {Array<{pts:Array, closed:boolean, role:string, weight:number}>}
   */
  function paths(style, w, h, o) {
    o = o || {};
    var opt = {
      t: o.thickness == null ? 3 : o.thickness,
      cut: o.cut == null ? Math.min(w, h) * 0.08 : o.cut,
      gap: o.gap == null ? 8 : o.gap,
      accent: o.accent || 'none',
      length: o.length
    };
    var fn = GEO[style] || GEO.rim;
    return fn(w, h, opt);
  }

  function styleFor(role, theme, layer) {
    var P = OS.Presets;
    var rim = P.color((layer.border && layer.border.color) || '@line', theme);
    var accent = P.color((layer.frame && layer.frame.accentColor) || (layer.border && layer.border.glowColor) || '@secondary', theme);
    if (role === 'accent') return accent;
    return rim;
  }

  function weightFor(p, base) {
    return base * (p.weight == null ? 1 : p.weight);
  }

  /* ---- DOM: inline SVG ---- */
  function svg(layer, theme, w, h) {
    var f = layer.frame || {};
    var geo = paths(f.style || 'rim', w, h, {
      thickness: f.thickness == null ? 3 : f.thickness,
      cut: f.cut, gap: f.gap, accent: f.accent || 'none', length: f.length
    });
    var base = f.thickness == null ? 3 : f.thickness;
    var NS = 'http://www.w3.org/2000/svg';
    var el = document.createElementNS(NS, 'svg');
    el.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    el.setAttribute('preserveAspectRatio', 'none');
    el.setAttribute('class', 'ly-vector');
    el.style.position = 'absolute';
    el.style.inset = '0';
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.overflow = 'visible';

    geo.forEach(function (p) {
      var path = document.createElementNS(NS, 'path');
      var d = p.pts.map(function (pt, i) { return (i ? 'L' : 'M') + Math.round(pt[0] * 100) / 100 + ' ' + Math.round(pt[1] * 100) / 100; }).join(' ');
      path.setAttribute('d', d + (p.closed ? ' Z' : ''));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', styleFor(p.role, theme, layer));
      path.setAttribute('stroke-width', weightFor(p, base));
      path.setAttribute('stroke-linejoin', 'miter');
      path.setAttribute('stroke-linecap', 'square');
      if (p.role === 'faint') path.setAttribute('opacity', '0.55');
      el.appendChild(path);
    });
    return el;
  }

  /* ---- markup string for the exported bundle ---- */
  function svgMarkup(layer, theme, w, h) {
    var f = layer.frame || {};
    var geo = paths(f.style || 'rim', w, h, {
      thickness: f.thickness == null ? 3 : f.thickness,
      cut: f.cut, gap: f.gap, accent: f.accent || 'none', length: f.length
    });
    var base = f.thickness == null ? 3 : f.thickness;
    var parts = geo.map(function (p) {
      var d = p.pts.map(function (pt, i) { return (i ? 'L' : 'M') + Math.round(pt[0] * 100) / 100 + ' ' + Math.round(pt[1] * 100) / 100; }).join(' ');
      return '<path d="' + d + (p.closed ? ' Z' : '') + '" fill="none" stroke="' + styleFor(p.role, theme, layer) +
        '" stroke-width="' + weightFor(p, base) + '" stroke-linejoin="miter" stroke-linecap="square"' +
        (p.role === 'faint' ? ' opacity="0.55"' : '') + '/>';
    }).join('');
    return '<svg class="ly-vector" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' + parts + '</svg>';
  }

  /* ---- canvas: stroke geometry ---- */
  function draw(ctx, layer, theme, w, h, x, y) {
    var f = layer.frame || {};
    var geo = paths(f.style || 'rim', w, h, {
      thickness: f.thickness == null ? 3 : f.thickness,
      cut: f.cut, gap: f.gap, accent: f.accent || 'none', length: f.length
    });
    var base = f.thickness == null ? 3 : f.thickness;
    var baseAlpha = ctx.globalAlpha;
    geo.forEach(function (p) {
      ctx.beginPath();
      p.pts.forEach(function (pt, i) {
        if (i === 0) ctx.moveTo(x + pt[0], y + pt[1]);
        else ctx.lineTo(x + pt[0], y + pt[1]);
      });
      if (p.closed) ctx.closePath();
      ctx.strokeStyle = styleFor(p.role, theme, layer);
      ctx.lineWidth = weightFor(p, base);
      ctx.lineJoin = 'miter';
      ctx.lineCap = 'square';
      ctx.globalAlpha = baseAlpha * (p.role === 'faint' ? 0.55 : 1);
      ctx.stroke();
    });
    ctx.globalAlpha = baseAlpha;
  }

  OS.Frames = {
    STYLES: STYLES,
    paths: paths,
    svg: svg,
    svgMarkup: svgMarkup,
    draw: draw
  };
})(window.OS = window.OS || {});
