/* ==========================================================================
   Twitch Overlay Studio — animate.js
   Deterministic, time-based animation engine.
   One function of (layer, time) drives the editor preview, the MP4 renderer
   and the exported bundle, so what you see is what gets recorded.
   ========================================================================== */
(function (OS) {
  'use strict';
  var U = OS.U;

  var EASE = {
    linear: function (t) { return t; },
    easeInCubic: function (t) { return t * t * t; },
    easeOutCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    easeInOutCubic: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    easeOutQuint: function (t) { return 1 - Math.pow(1 - t, 5); },
    easeOutBack: function (t) { var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    easeOutElastic: function (t) {
      if (t === 0 || t === 1) return t;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
    },
    easeOutBounce: function (t) {
      var n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    },
    easeInOutSine: function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; }
  };

  /* deterministic pseudo-random for flicker / glitch */
  function rnd(seed) {
    var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  var TYPES = [
    ['none', 'None'],
    ['pulse', 'Pulse (scale)'],
    ['heartbeat', 'Heartbeat'],
    ['breathe', 'Breathe (fade)'],
    ['float', 'Float'],
    ['drift', 'Drift (slow orbit)'],
    ['sway', 'Sway'],
    ['swing', 'Swing (tilt)'],
    ['wobble', 'Wobble'],
    ['bounce', 'Bounce'],
    ['flicker', 'Neon flicker'],
    ['glitch', 'Glitch'],
    ['rotate', 'Spin'],
    ['orbit', 'Orbit'],
    ['shake', 'Shake'],
    ['zoom', 'Zoom pulse'],
    ['sweep', 'Light sweep'],
    ['scan', 'Scan (double sweep)'],
    ['marquee', 'Marquee scroll'],
    ['typewriter', 'Typewriter'],
    ['countup', 'Count up']
  ];

  var ENTERS = [
    ['none', 'None'],
    ['fade', 'Fade in'],
    ['up', 'Rise up'],
    ['down', 'Drop down'],
    ['left', 'From right'],
    ['right', 'From left'],
    ['zoom', 'Zoom in'],
    ['pop', 'Pop in'],
    ['spin', 'Spin in'],
    ['settle', 'Settle in'],
    ['blur', 'Blur in']
  ];

  var EXITS = [
    ['none', 'None'],
    ['fade', 'Fade out'],
    ['up', 'Lift up'],
    ['down', 'Drop away'],
    ['left', 'Slide left'],
    ['right', 'Slide right'],
    ['zoom', 'Shrink out']
  ];

  var EASES = Object.keys(EASE).map(function (k) {
    return [k, k.replace('ease', 'Ease ').replace(/([A-Z])/g, ' $1').trim()];
  });

  var ANIMS = {
    TYPES: TYPES,
    ENTERS: ENTERS,
    EXITS: EXITS,
    EASES: EASES,
    ease: function (name, t) { return (EASE[name] || EASE.linear)(U.clamp(t, 0, 1)); }
  };

  /**
   * Evaluate a layer at time t (seconds).
   * Returns a transform state that both DOM and canvas renderers apply.
   */
  ANIMS.state = function (layer, t, sceneDur) {
    var a = (layer && layer.anim) || {};
    var out = { dx: 0, dy: 0, scale: 1, rot: 0, opacity: 1, sweep: -1, blur: 0 };

    var speed = a.speed || 4;
    var delay = (a.delay || 0) + (a.offset || 0);
    var amp = a.amp == null ? 14 : a.amp;
    var p = speed > 0 ? ((t - delay) % speed) / speed : 0;
    if (p < 0) p += 1;
    var tau = p * Math.PI * 2;
    var wave = 0.5 - 0.5 * Math.cos(tau);

    switch (a.type) {
      case 'pulse': out.scale = 1 + 0.025 * wave; break;
      case 'breathe': out.opacity = 0.7 + 0.3 * wave; break;
      case 'float': out.dy = -amp * wave; break;
      case 'sway': out.dx = amp * Math.sin(tau) * 0.9; out.dy = -amp * 0.35 * wave; break;
      case 'flicker':
        out.opacity = rnd(Math.floor(p * 37) + 1) > 0.82 ? 0.35 : 1;
        break;
      case 'rotate': out.rot = 360 * p; break;
      case 'orbit': out.dx = amp * Math.cos(tau); out.dy = amp * Math.sin(tau); break;
      case 'shake': out.dx = Math.sin(tau * 9) * amp * 0.35; out.dy = Math.cos(tau * 11) * amp * 0.25; break;
      case 'glitch':
        out.dx = (rnd(Math.floor(p * 60)) > 0.55 ? 1 : -1) * amp * 0.3 * (rnd(Math.floor(p * 19)) > 0.45 ? 1 : 0);
        out.opacity = rnd(Math.floor(p * 41)) > 0.9 ? 0.75 : 1;
        break;
      case 'zoom': out.scale = 1 + 0.14 * wave; break;
      case 'sweep': out.sweep = p; break;
      case 'scan': out.sweep = (p * 2) % 1; break;
      case 'marquee': out.dx = -amp * (p * 2 - 1); break;
      case 'swing': out.rot = Math.sin(tau) * amp * 0.55; break;
      case 'wobble':
        out.rot = Math.sin(tau * 2) * amp * 0.3;
        out.dx = Math.sin(tau) * amp * 0.45;
        break;
      case 'heartbeat': out.scale = 1 + 0.055 * Math.pow(Math.max(0, Math.sin(tau)), 8); break;
      case 'drift':
        out.dx = amp * Math.cos(tau * 0.5);
        out.dy = amp * 0.45 * Math.sin(tau * 0.5);
        break;
      case 'bounce': out.dy = -Math.abs(Math.sin(tau)) * amp * 0.8; break;
      default: break;
    }

    var enter = a.enter || 'none';
    if (enter !== 'none') {
      var ed = a.enterDur == null ? 0.7 : a.enterDur;
      var s = U.clamp((t - delay) / Math.max(0.01, ed), 0, 1);
      var e = ANIMS.ease(a.enterEase || 'easeOutCubic', s);
      out.opacity *= e;
      if (enter === 'up') out.dy += (1 - e) * 46;
      if (enter === 'down') out.dy -= (1 - e) * 46;
      if (enter === 'left') out.dx += (1 - e) * 70;
      if (enter === 'right') out.dx -= (1 - e) * 70;
      if (enter === 'zoom') out.scale *= 0.86 + 0.14 * e;
      if (enter === 'pop') out.scale *= 0.82 + 0.18 * e;
      if (enter === 'spin') out.rot += (1 - e) * 120;
      if (enter === 'settle') { out.dy += (1 - e) * 22; out.scale *= 0.96 + 0.04 * e; }
      if (enter === 'blur') out.blur = (1 - e) * 14;
    }

    if (sceneDur && a.exit && a.exit !== 'none') {
      var xd = a.exitDur == null ? 0.6 : a.exitDur;
      var xs = U.clamp((t - (sceneDur - xd)) / Math.max(0.01, xd), 0, 1);
      var xe = ANIMS.ease(a.exitEase || 'easeInOutCubic', xs);
      out.opacity *= 1 - xe;
      out.scale *= 1 - 0.1 * xe;
      if (a.exit === 'up') out.dy -= 60 * xe;
      if (a.exit === 'down') out.dy += 60 * xe;
      if (a.exit === 'left') out.dx -= 80 * xe;
      if (a.exit === 'right') out.dx += 80 * xe;
    }

    return out;
  };

  /** Text content at time t for the text-affecting animation types. */
  ANIMS.text = function (layer, t, doc) {
    var a = (layer && layer.anim) || {};
    var raw = U.tokens((layer.text && layer.text.value) || '', doc && doc.settings);
    if (a.type === 'typewriter') {
      var cps = a.amp || 18;
      var n = Math.floor(Math.max(0, t - ((a.delay || 0) + (a.offset || 0))) * cps);
      return raw.slice(0, Math.min(raw.length, n));
    }
    if (a.type === 'countup') {
      var target = parseFloat(a.to);
      if (isNaN(target)) target = parseFloat(String(raw).replace(/[^\d.-]/g, '')) || 0;
      var dur = Math.max(0.2, a.speed || 2);
      var p = U.clamp((t - ((a.delay || 0) + (a.offset || 0))) / dur, 0, 1);
      var v = target * ANIMS.ease('easeOutCubic', p);
      return String(Math.round(v * 100) / 100);
    }
    return raw;
  };

  /** True when a layer needs a per-frame text refresh. */
  ANIMS.dynamicText = function (layer) {
    var t = layer && layer.anim && layer.anim.type;
    return t === 'typewriter' || t === 'countup';
  };

  OS.Anim = ANIMS;
})(window.OS = window.OS || {});
