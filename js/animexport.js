/* ==========================================================================
   Twitch Overlay Studio — animexport.js
   Transparent animated exports: GIF (1-bit alpha) and APNG (full alpha).

   Frames are painted offline from the same deterministic animation state as
   the editor and the MP4 renderer, on a cleared canvas, so anything outside a
   layer stays fully transparent.
   ========================================================================== */
(function (OS) {
  'use strict';

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function segmentAt(plan, t) {
    for (var i = 0; i < plan.length; i++) {
      if (t >= plan[i].t0 && t < plan[i].t1) return i;
    }
    return plan.length - 1;
  }

  /** Paint one timeline instant. Scene backgrounds are skipped when transparent. */
  function paintFrame(ctx, plan, t, doc, imgs, transparent) {
    var idx = segmentAt(plan, t);
    var seg = plan[idx];
    var local = Math.max(0, t - seg.t0);

    function draw(s, lt, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      if (!transparent && s.scene.bgOn) {
        window.OverlayPainter.paint(ctx, 1920, 1080, s.scene.bg || s.theme.bg, s.scene.id);
      }
      (s.scene.layers || []).forEach(function (l) {
        if (l.hidden) return;
        var st = OS.Anim.state(l, lt, s.dur);
        OS.Exporter.paintLayer(ctx, l, s.theme, doc, imgs, st, lt);
      });
      ctx.restore();
    }

    if (seg.fadeIn > 0 && local < seg.fadeIn && idx > 0) {
      var prev = plan[idx - 1];
      draw(prev, Math.max(0, t - prev.t0), 1);
      draw(seg, local, local / seg.fadeIn);
    } else {
      draw(seg, local, 1);
    }
  }

  function timeline(opts) {
    var plan = OS.Video.buildPlan(opts);
    var totalDur = plan[plan.length - 1].t1;
    var frames = Math.max(1, Math.round(totalDur * opts.fps));
    return { plan: plan, frames: frames, totalDur: totalDur };
  }

  async function renderGif(opts, hooks) {
    var W = opts.width, H = opts.height, fps = opts.fps;
    var tl = timeline(opts);
    var doc = OS.Model.doc;
    var imgs = await OS.Exporter.loadImages(doc);

    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });

    /* This used to paint every frame into an RGBA array first: a 1080p minute
       at 30 fps is 15 GB and killed the tab. Frames are now painted twice —
       once for the palette sample, once to encode — and never accumulated. */
    /* Centisecond delays cap GIF at 50 fps, so a 60 fps request is resampled to
       50 and timing is diffused — otherwise the scene plays 20% slow. */
    var rate = OS.Gif.rate(fps);
    if (rate < fps && OS.U && OS.U.toast) OS.U.toast('GIF tops out at 50 fps — pick APNG or MP4 for ' + fps + ' fps', 'warn');
    var gifFrameTotal = Math.max(1, Math.round(tl.totalDur * rate));
    var plan = OS.Gif.plan(gifFrameTotal, W, H);
    var dly = OS.Gif.delays(plan.count, rate, plan.step);

    function paintFrameAt(i) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.scale(W / 1920, H / 1080);
      paintFrame(ctx, tl.plan, (i * plan.step) / rate, doc, imgs, true);
    }

    /* pass 1 — palette from a dozen evenly spaced frames */
    var stride = Math.max(1, Math.floor(plan.count / 12));
    var sample = [];
    for (var s = 0; s < plan.count; s += stride) {
      if (hooks && hooks.isCancelled && hooks.isCancelled()) throw new Error('cancelled');
      paintFrameAt(s);
      sample.push(ctx.getImageData(0, 0, W, H).data);
      if (hooks && hooks.onProgress) {
        hooks.onProgress(0.25 * Math.min(1, (s + 1) / plan.count), { frame: s + 1, frames: plan.count, phase: 'palette' });
      }
      await sleep(0);
    }
    var pal = OS.Gif.palette(sample, 255);
    var table = OS.Gif.lut(pal);

    /* pass 2 — paint, quantise and compress straight into the file */
    var g = (OS.Gif.par && OS.Gif.par({ width: W, height: H, palette: pal, loop: 0 })) ||
            OS.Gif.writer({ width: W, height: H, palette: pal, loop: 0 });
    for (var f = 0; f < plan.count; f++) {
      if (hooks && hooks.isCancelled && hooks.isCancelled()) throw new Error('cancelled');
      paintFrameAt(f);
      await g.frame(
        OS.Gif.quantize(ctx.getImageData(0, 0, W, H).data, W, H, table, opts.alphaThreshold || 128),
        dly[f]
      );
      if (hooks && hooks.onProgress) {
        hooks.onProgress(0.25 + 0.75 * ((f + 1) / plan.count), { frame: f + 1, frames: plan.count, phase: 'encoding' });
      }
      if (f % 2 === 0) await sleep(0);
    }

    var bytes = await g.bytes();
    return {
      blob: new Blob([bytes], { type: 'image/gif' }),
      ext: 'gif', frames: plan.count, width: W, height: H, alpha: '1-bit'
    };
  }

  function toPng(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) { reject(new Error('PNG encode failed')); return; }
        blob.arrayBuffer().then(function (buf) { resolve(new Uint8Array(buf)); }, reject);
      }, 'image/png');
    });
  }

  async function renderApng(opts, hooks) {
    var W = opts.width, H = opts.height, fps = opts.fps;
    var tl = timeline(opts);
    var doc = OS.Model.doc;
    var imgs = await OS.Exporter.loadImages(doc);

    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d', { alpha: true });

    var pngs = [];
    for (var i = 0; i < tl.frames; i++) {
      if (hooks && hooks.isCancelled && hooks.isCancelled()) throw new Error('cancelled');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.scale(W / 1920, H / 1080);
      paintFrame(ctx, tl.plan, i / fps, doc, imgs, true);
      pngs.push(await toPng(canvas));
      if (hooks && hooks.onProgress) {
        hooks.onProgress((i + 1) / tl.frames, { frame: i + 1, frames: tl.frames, phase: 'encoding' });
      }
      if (i % 2 === 0) await sleep(0);
    }

    var bytes = OS.Apng.build(pngs, Math.round(1000 / fps), fps);
    return {
      blob: new Blob([bytes], { type: 'image/apng' }),
      ext: 'png', mime: 'image/png', frames: tl.frames, width: W, height: H, alpha: '8-bit'
    };
  }

  async function render(opts, hooks) {
    var t0 = performance.now();
    var gif = opts.format === 'gif';
    if (opts.width * opts.height > 960 * 540 && gif) {
      /* keep the browser responsive; GIF gets big fast */
      opts = Object.assign({}, opts, { width: 960, height: 540 });
    }
    var res = gif ? await renderGif(opts, hooks) : await renderApng(opts, hooks);
    res.ms = Math.round(performance.now() - t0);
    res.format = gif ? 'gif' : 'apng';
    return res;
  }

  function toPngBlob(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) {
        if (b) resolve(b); else reject(new Error('PNG encode failed'));
      }, 'image/png');
    });
  }

  /** Union bounds of layers, in stage pixels (rotation not included). */
  function boundsOf(layers) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    layers.forEach(function (l) {
      x0 = Math.min(x0, l.x);
      y0 = Math.min(y0, l.y);
      x1 = Math.max(x1, l.x + l.w);
      y1 = Math.max(y1, l.y + l.h);
    });
    if (!isFinite(x0)) return { x: 0, y: 0, w: 1920, h: 1080 };
    return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
  }

  /**
   * Render the current selection on a transparent canvas, fitted into an exact
   * pixel size (Twitch panel 320x100, banner 1200x480, ...) or natural size.
   * opts: {format:'png'|'gif'|'apng', width, height, scale, fps, seconds}
   */
  async function renderSelection(opts, hooks) {
    opts = opts || {};
    var layers = OS.Model.selected();
    if (!layers.length) throw new Error('Select a layer or group first');

    var doc = OS.Model.doc;
    var theme = OS.Model.theme();
    var imgs = await OS.Exporter.loadImages(doc);
    var box = boundsOf(layers);
    var W = Math.max(8, Math.round(opts.width || box.w * (opts.scale || 1)));
    var H = Math.max(8, Math.round(opts.height || box.h * (opts.scale || 1)));
    var fit = Math.min(W / box.w, H / box.h);
    var ox = (W - box.w * fit) / 2;
    var oy = (H - box.h * fit) / 2;

    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });

    function paint(t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.setTransform(fit, 0, 0, fit, ox - box.x * fit, oy - box.y * fit);
      layers.forEach(function (l) {
        if (l.hidden) return;
        var st = OS.Anim.state(l, t, 0);
        OS.Exporter.paintLayer(ctx, l, theme, doc, imgs, st, t);
      });
    }

    var t0 = performance.now();
    var format = opts.format || 'png';

    if (format === 'png') {
      paint(0);
      if (hooks && hooks.onProgress) hooks.onProgress(1, { frame: 1, frames: 1, phase: 'encoding' });
      return {
        blob: await toPngBlob(canvas), ext: 'png', mime: 'image/png', format: 'png',
        frames: 1, width: W, height: H, alpha: '8-bit', ms: Math.round(performance.now() - t0)
      };
    }

    var fps = opts.fps || 30;
    var count = Math.max(1, Math.round((opts.seconds || 3) * fps));
    var gif = format === 'gif';
    var buffers = [];

    for (var i = 0; i < count; i++) {
      if (hooks && hooks.isCancelled && hooks.isCancelled()) throw new Error('cancelled');
      paint(i / fps);
      if (gif) buffers.push(ctx.getImageData(0, 0, W, H).data);
      else buffers.push(await toPng(canvas));
      if (hooks && hooks.onProgress) {
        hooks.onProgress((i + 1) / count, { frame: i + 1, frames: count, phase: 'painting' });
      }
      if (i % 2 === 0) await sleep(0);
    }

    if (gif) {
      var stride = Math.max(1, Math.floor(count / 12));
      var sample = buffers.filter(function (_, k) { return k % stride === 0; });
      var pal = OS.Gif.palette(sample, 255);
      var table = OS.Gif.lut(pal);
      var gifFrames = buffers.map(function (buf) {
        return {
          indices: OS.Gif.quantize(buf, W, H, table, opts.alphaThreshold || 128),
          delayCs: Math.max(2, Math.round(100 / fps))
        };
      });
      var bytes = OS.Gif.build({ width: W, height: H, palette: pal, frames: gifFrames, loop: 0 });
      return {
        blob: new Blob([bytes], { type: 'image/gif' }), ext: 'gif', format: 'gif',
        frames: count, width: W, height: H, alpha: '1-bit', ms: Math.round(performance.now() - t0)
      };
    }

    var apng = OS.Apng.build(buffers, Math.round(1000 / fps), fps);
    return {
      blob: new Blob([apng], { type: 'image/png' }), ext: 'png', mime: 'image/png', format: 'apng',
      frames: count, width: W, height: H, alpha: '8-bit', ms: Math.round(performance.now() - t0)
    };
  }

  OS.AnimExport = { render: render, renderSelection: renderSelection, boundsOf: boundsOf, paintFrame: paintFrame };
})(window.OS = window.OS || {});
