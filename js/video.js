/* ==========================================================================
   Twitch Overlay Studio — video.js
   Offline renderer: paints every frame deterministically, encodes with
   WebCodecs (H.264) and muxes a real .mp4 with mp4.js.
   Falls back to MediaRecorder (WebM) when WebCodecs is unavailable.
   ========================================================================== */
(function (OS) {
  'use strict';
  var U = OS.U;

  var CODECS = ['avc1.640028', 'avc1.4d0028', 'avc1.42E02A', 'avc1.42001F'];

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function bitrateFor(w, h, fps) {
    return Math.min(40000000, Math.max(4000000, Math.round(w * h * fps * 0.13)));
  }

  async function pickCodec(cfg) {
    if (typeof window.VideoEncoder === 'undefined') return null;
    for (var i = 0; i < CODECS.length; i++) {
      try {
        var res = await window.VideoEncoder.isConfigSupported({
          codec: CODECS[i], width: cfg.width, height: cfg.height,
          bitrate: cfg.bitrate, framerate: cfg.framerate
        });
        if (res && res.supported) return CODECS[i];
      } catch (e) { /* try the next profile */ }
    }
    return null;
  }

  /* ---------------- timeline ---------------- */
  function buildPlan(opts) {
    var doc = OS.Model.doc;
    var scenes = opts.mode === 'showcase' ? doc.scenes.slice() : [OS.Model.scene()];
    var per = Math.max(1, opts.seconds || 8);
    var fade = opts.mode === 'showcase' ? (opts.fade == null ? 0.6 : opts.fade) : 0;
    var t = 0;
    var plan = [];
    scenes.forEach(function (s, i) {
      var theme = OS.Presets.themeById(s.themeId || doc.themeId);
      plan.push({
        scene: s, theme: theme, t0: t, t1: t + per, dur: per,
        fadeIn: i === 0 ? 0 : fade
      });
      t = t + per - (i === scenes.length - 1 ? 0 : fade);
    });
    return plan;
  }

  function segmentAt(plan, t) {
    for (var i = 0; i < plan.length; i++) {
      if (t >= plan[i].t0 && t < plan[i].t1) return i;
    }
    return plan.length - 1;
  }

  function drawScene(ctx, seg, tLocal, doc, imgs, alpha) {
    var scene = seg.scene;
    var theme = seg.theme;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    if (scene.bgOn) {
      window.OverlayPainter.paint(ctx, 1920, 1080, scene.bg || theme.bg, scene.id);
    }
    (scene.layers || []).forEach(function (l) {
      if (l.hidden) return;
      var st = OS.Anim.state(l, tLocal, seg.dur);
      OS.Exporter.paintLayer(ctx, l, theme, doc, imgs, st, tLocal);
    });
    ctx.restore();
  }

  function paintAt(ctx, plan, t, doc, imgs) {
    var idx = segmentAt(plan, t);
    var seg = plan[idx];
    var local = t - seg.t0;
    if (seg.fadeIn > 0 && local < seg.fadeIn && idx > 0) {
      var prev = plan[idx - 1];
      var a = local / seg.fadeIn;
      drawScene(ctx, prev, t - prev.t0, doc, imgs, 1);
      drawScene(ctx, seg, local, doc, imgs, a);
    } else {
      drawScene(ctx, seg, local, doc, imgs, 1);
    }
  }

  /* ---------------- WebCodecs + MP4 ---------------- */
  async function encodeWebCodecs(opts, plan, frames, doc, imgs, codec, hooks) {
    var W = opts.width, H = opts.height, fps = opts.fps;
    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d', { alpha: false });

    var samples = [];
    var description = null;
    var failure = null;

    var encoder = new window.VideoEncoder({
      output: function (chunk, meta) {
        if (!description && meta && meta.decoderConfig && meta.decoderConfig.description) {
          description = new Uint8Array(meta.decoderConfig.description);
        }
        var buf = new Uint8Array(chunk.byteLength);
        chunk.copyTo(buf);
        samples.push({ data: buf, key: chunk.type === 'key' });
      },
      error: function (e) { failure = e; }
    });

    encoder.configure({
      codec: codec,
      width: W,
      height: H,
      bitrate: bitrateFor(W, H, fps),
      framerate: fps,
      latencyMode: 'quality',
      avc: { format: 'avc' }
    });

    for (var i = 0; i < frames; i++) {
      if (hooks && hooks.isCancelled && hooks.isCancelled()) {
        try { encoder.close(); } catch (e) { /* ignore */ }
        throw new Error('cancelled');
      }
      if (failure) throw failure;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.scale(W / 1920, H / 1080);
      paintAt(ctx, plan, i / fps, doc, imgs);

      var vf = new window.VideoFrame(canvas, {
        timestamp: Math.round((i * 1000000) / fps),
        duration: Math.round(1000000 / fps)
      });
      encoder.encode(vf, { keyFrame: i % (fps * 2) === 0 });
      vf.close();

      if (encoder.encodeQueueSize > 8) await sleep(4);
      if (i % 4 === 0) {
        if (hooks && hooks.onProgress) hooks.onProgress((i + 1) / frames, { frame: i + 1, frames: frames });
        await sleep(0);
      }
    }

    await encoder.flush();
    encoder.close();
    if (failure) throw failure;
    if (!samples.length) throw new Error('Encoder produced no frames');
    if (!description) throw new Error('Encoder gave no H.264 config');

    var bytes = OS.Mp4.build({
      width: W, height: H, fps: fps,
      avcC: description,
      samples: samples
    });
    return { blob: new Blob([bytes], { type: 'video/mp4' }), mime: 'video/mp4', ext: 'mp4', frames: frames };
  }

  /* ---------------- MediaRecorder fallback (WebM, real-time) ---------------- */
  async function encodeRecorder(opts, plan, frames, doc, imgs, hooks) {
    var W = opts.width, H = opts.height, fps = opts.fps;
    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d', { alpha: false });
    var stream = canvas.captureStream(fps);
    var mime = '';
    ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].forEach(function (m) {
      if (!mime && window.MediaRecorder && MediaRecorder.isTypeSupported(m)) mime = m;
    });
    if (!mime) throw new Error('This browser cannot record video');

    var rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrateFor(W, H, fps) });
    var chunks = [];
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    rec.start(200);

    var total = frames / fps;
    var started = performance.now();
    while (true) {
      var elapsed = (performance.now() - started) / 1000;
      if (elapsed >= total) break;
      if (hooks && hooks.isCancelled && hooks.isCancelled()) { rec.stop(); throw new Error('cancelled'); }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.scale(W / 1920, H / 1080);
      paintAt(ctx, plan, Math.min(elapsed, total), doc, imgs);
      if (hooks && hooks.onProgress) hooks.onProgress(Math.min(1, elapsed / total), { realtime: true });
      await sleep(1000 / fps);
    }
    await new Promise(function (r) { rec.onstop = r; rec.stop(); });
    stream.getTracks().forEach(function (t) { t.stop(); });
    return {
      blob: new Blob(chunks, { type: mime }),
      mime: mime,
      ext: 'webm',
      frames: frames,
      fallback: true
    };
  }

  /* ---------------- public ---------------- */
  async function exportVideo(opts, hooks) {
    var t0 = performance.now();
    var plan = buildPlan(opts);
    var totalDur = plan[plan.length - 1].t1;
    var frames = Math.max(1, Math.round(totalDur * opts.fps));
    var doc = OS.Model.doc;
    var imgs = await OS.Exporter.loadImages(doc);

    if (hooks && hooks.onProgress) hooks.onProgress(0, { frame: 0, frames: frames, phase: 'preparing' });

    var codec = await pickCodec({ width: opts.width, height: opts.height, bitrate: bitrateFor(opts.width, opts.height, opts.fps), framerate: opts.fps });
    var res;
    if (codec) {
      res = await encodeWebCodecs(opts, plan, frames, doc, imgs, codec, hooks);
      res.codec = codec;
    } else {
      res = await encodeRecorder(opts, plan, frames, doc, imgs, hooks);
    }
    res.ms = Math.round(performance.now() - t0);
    res.seconds = totalDur;
    return res;
  }

  function capabilities() {
    var hasWC = typeof window.VideoEncoder !== 'undefined';
    var hasMR = typeof window.MediaRecorder !== 'undefined';
    return { webcodecs: hasWC, mediaRecorder: hasMR, mp4: hasWC, webm: hasMR };
  }

  OS.Video = {
    export: exportVideo,
    capabilities: capabilities,
    buildPlan: buildPlan,
    paintAt: paintAt,
    bitrateFor: bitrateFor
  };
})(window.OS = window.OS || {});
