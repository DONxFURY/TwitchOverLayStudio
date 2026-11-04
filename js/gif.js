/* ==========================================================================
   Twitch Overlay Studio — gif.js
   A from-scratch animated GIF89a encoder: median-cut palette, 5-bit lookup
   cache for fast nearest-colour mapping, transparent index 0, and LZW
   compression with proper clear/EOI handling.

   GIF only has 1-bit transparency, so soft glows become hard edges.
   APNG (apng.js) keeps full alpha — offer both.
   ========================================================================== */
(function (OS) {
  'use strict';

  /* ------------------------------------------------------------ palette */

  function channel(packed, ch) {
    return (packed >> ch) & 255;
  }

  function boxRange(box) {
    var minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
    for (var i = 0; i < box.length; i++) {
      var p = box[i];
      var r = (p >> 16) & 255, g = (p >> 8) & 255, b = p & 255;
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      if (g < minG) minG = g;
      if (g > maxG) maxG = g;
      if (b < minB) minB = b;
      if (b > maxB) maxB = b;
    }
    var dr = maxR - minR, dg = maxG - minG, db = maxB - minB;
    var max = Math.max(dr, dg, db);
    return { max: max, ch: max === dr ? 16 : (max === dg ? 8 : 0) };
  }

  function boxAvg(box) {
    var r = 0, g = 0, b = 0;
    for (var i = 0; i < box.length; i++) {
      r += (box[i] >> 16) & 255;
      g += (box[i] >> 8) & 255;
      b += box[i] & 255;
    }
    var n = box.length || 1;
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  }

  /**
   * Median-cut palette from one or more RGBA buffers.
   * @returns {Array<[r,g,b]>} at most maxColors entries
   */
  function palette(buffers, maxColors) {
    maxColors = Math.max(2, Math.min(255, maxColors || 255));
    var pts = [];
    var step = 1;
    var total = 0;
    for (var b = 0; b < buffers.length; b++) total += buffers[b].length / 4;
    var want = 24000;
    step = Math.max(1, Math.floor(total / want));
    for (var f = 0; f < buffers.length; f++) {
      var buf = buffers[f];
      var pixels = buf.length / 4;
      for (var i = 0; i < pixels; i += step) {
        var o = i * 4;
        if (buf[o + 3] < 128) continue;
        pts.push((buf[o] << 16) | (buf[o + 1] << 8) | buf[o + 2]);
      }
    }
    if (!pts.length) return [[0, 0, 0], [255, 255, 255]];

    var boxes = [pts];
    while (boxes.length < maxColors) {
      var pick = -1, bestRange = -1;
      for (var k = 0; k < boxes.length; k++) {
        if (boxes[k].length < 2) continue;
        var rng = boxRange(boxes[k]);
        if (rng.max > bestRange) { bestRange = rng.max; pick = k; }
      }
      if (pick < 0 || bestRange === 0) break;
      var box = boxes[pick];
      var ch = boxRange(box).ch;
      box.sort(function (a, c) { return channel(a, ch) - channel(c, ch); });
      var mid = box.length >> 1;
      boxes.splice(pick, 1, box.slice(0, mid), box.slice(mid));
    }
    return boxes.map(boxAvg);
  }

  /** 32×32×32 nearest-colour cache; entry 0 is the transparent index. */
  function lut(pal) {
    var table = new Uint8Array(32768);
    for (var r = 0; r < 32; r++) {
      for (var g = 0; g < 32; g++) {
        for (var b = 0; b < 32; b++) {
          var R = r * 8 + 4, G = g * 8 + 4, B = b * 8 + 4;
          var best = 0, bestD = 1e12;
          for (var i = 0; i < pal.length; i++) {
            var dr = R - pal[i][0], dg = G - pal[i][1], db = B - pal[i][2];
            var d = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
            if (d < bestD) { bestD = d; best = i; }
          }
          table[(r << 10) | (g << 5) | b] = best + 1;
        }
      }
    }
    return table;
  }

  function quantize(rgba, w, h, table, alphaThreshold) {
    var out = new Uint8Array(w * h);
    var minA = alphaThreshold == null ? 128 : alphaThreshold;
    for (var i = 0, o = 0; i < out.length; i++, o += 4) {
      if (rgba[o + 3] < minA) { out[i] = 0; continue; }
      out[i] = table[((rgba[o] >> 3) << 10) | ((rgba[o + 1] >> 3) << 5) | (rgba[o + 2] >> 3)];
    }
    return out;
  }

  /* ---------------------------------------------------------------- LZW */

  function lzw(indices, minCodeSize) {
    var clearCode = 1 << minCodeSize;
    var eoiCode = clearCode + 1;
    var codeSize = minCodeSize + 1;
    var nextCode = eoiCode + 1;
    var dict = new Map();
    /* A plain array of numbers costs 8 bytes per byte of output and doubles on
       every regrow; a typed buffer costs one, which is what keeps big exports
       inside the tab's memory budget. */
    var out = new Uint8Array(Math.max(4096, (indices.length >> 1) + 1024));
    var olen = 0;
    var cur = 0;
    var bits = 0;

    function push(b) {
      if (olen >= out.length) {
        var grown = new Uint8Array(out.length * 2);
        grown.set(out);
        out = grown;
      }
      out[olen++] = b;
    }

    function emit(code) {
      cur |= code << bits;
      bits += codeSize;
      while (bits >= 8) {
        push(cur & 255);
        cur >>>= 8;
        bits -= 8;
      }
    }

    emit(clearCode);
    var prefix = indices[0];
    for (var i = 1; i < indices.length; i++) {
      var k = indices[i];
      var key = prefix * 256 + k;
      var found = dict.get(key);
      if (found !== undefined) { prefix = found; continue; }
      emit(prefix);
      if (nextCode < 4096) {
        dict.set(key, nextCode);
        nextCode++;
        /* the decoder's table lags the encoder by one entry, so widen codes one
           step after its own 2^size boundary — this keeps both in lockstep. */
        if (nextCode === (1 << codeSize) + 1 && codeSize < 12) codeSize++;
      } else {
        emit(clearCode);
        dict.clear();
        nextCode = eoiCode + 1;
        codeSize = minCodeSize + 1;
      }
      prefix = k;
    }
    emit(prefix);
    emit(eoiCode);
    if (bits > 0) push(cur & 255);
    return out.subarray(0, olen);
  }

  /* ------------------------------------------------------------- writer */

  function Writer(size) {
    this.buf = new Uint8Array(Math.max(4096, size || 1 << 16));
    this.len = 0;
  }
  Writer.prototype.grow = function (need) {
    if (this.len + need <= this.buf.length) return;
    var cap = this.buf.length;
    while (cap < this.len + need) cap *= 2;
    var next = new Uint8Array(cap);
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
  };
  Writer.prototype.u8 = function (v) { this.grow(1); this.buf[this.len++] = v & 255; };
  Writer.prototype.u16 = function (v) { this.u8(v); this.u8(v >> 8); };
  Writer.prototype.raw = function (bytes) {
    this.grow(bytes.length);
    this.buf.set(bytes, this.len);
    this.len += bytes.length;
  };
  Writer.prototype.str = function (s) {
    this.grow(s.length);
    for (var i = 0; i < s.length; i++) this.buf[this.len++] = s.charCodeAt(i) & 255;
  };
  Writer.prototype.block = function (bytes) {
    for (var p = 0; p < bytes.length; p += 255) {
      var n = Math.min(255, bytes.length - p);
      this.u8(n);
      this.raw(bytes.subarray(p, p + n));
    }
    this.u8(0);
  };
  Writer.prototype.bytes = function () { return this.buf.slice(0, this.len); };

  /**
   * Build an animated GIF.
   * @param {Object} o {width, height, palette, frames:[{indices, delayCs}], loop}
   * @returns {Uint8Array}
   */
  /**
   * Incremental GIF: write the header once, then hand it one frame at a time.
   * Exporters use this so a long animation never has to hold every frame's
   * pixels — peak memory is the compressed file plus the frame being encoded.
   * @returns {{frame: function(Uint8Array, number), bytes: function(): Uint8Array}}
   */
  /**
   * GIF header, shared by the serial and worker-backed writers so the two can
   * never drift apart.
   */
  function header(o) {
    var w = o.width, h = o.height;
    var pal = o.palette || [[0, 0, 0]];
    var W = new Writer(1 << 18);
    W.str('GIF89a');
    W.u16(w);
    W.u16(h);
    W.u8(0xF7);          /* global table, 256 entries, 8-bit colour */
    W.u8(0);             /* background index */
    W.u8(0);             /* pixel aspect */
    /* index 0 is the transparent slot, so colours start at entry 1 — this must
       match quantize(), which biases every mapped colour index by +1. */
    W.u8(0); W.u8(0); W.u8(0);
    for (var i = 1; i < 256; i++) {
      var c = pal[i - 1] || [0, 0, 0];
      W.u8(c[0]);
      W.u8(c[1]);
      W.u8(c[2]);
    }

    /* NETSCAPE2.0 loop extension */
    W.u8(0x21); W.u8(0xFF); W.u8(11);
    W.str('NETSCAPE2.0');
    W.u8(3); W.u8(1); W.u16(o.loop == null ? 0 : o.loop); W.u8(0);
    return { W: W, w: w, h: h };
  }

  function frameBlock(W, w, h, bytes, delayCs) {
    var delay = Math.max(1, Math.round(delayCs || 4));
    /* graphic control: disposal 2 (restore to background) + transparency */
    W.u8(0x21); W.u8(0xF9); W.u8(4);
    W.u8(0x09);
    W.u16(delay);
    W.u8(0);   /* transparent index */
    W.u8(0);   /* block terminator */
    /* image descriptor */
    W.u8(0x2C);
    W.u16(0); W.u16(0); W.u16(w); W.u16(h); W.u8(0);
    W.u8(8);
    W.block(bytes);
  }

  function writer(o) {
    var hd = header(o), W = hd.W;
    return {
      frame: function (indices, delayCs) {
        frameBlock(W, hd.w, hd.h, lzw(indices, 8), delayCs);
      },
      bytes: function () { W.u8(0x3B); return W.bytes(); }
    };
  }

  /**
   * Worker-backed writer with the same interface as writer().
   *
   * Once the palette is fixed every frame compresses independently, so the LZW
   * pass — the bulk of a GIF export — is handed to a pool of workers and the
   * export uses every core instead of one. Blocks are appended strictly in
   * order, so the bytes match the single-threaded writer exactly. `frame()`
   * resolves when a worker picks the frame up, which keeps one frame of pixels
   * queued in the page no matter how long the animation is.
   *
   * @returns {Object|null} null when workers are unavailable
   */
  function par(o, requested) {
    if (typeof Worker === 'undefined') return null;
    var cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
    var n = Math.max(1, Math.min(requested || cores, 8));
    var hd = header(o), W = hd.W;
    var workers = [], i;
    for (i = 0; i < n; i++) {
      try { workers.push(new Worker('js/gifworker.js')); } catch (e) { break; }
    }
    if (!workers.length) return null;

    var idle = workers.slice();
    var waiting = [];      /* painted, not yet picked up */
    var done = {};         /* id -> compressed bytes */
    var delayOf = {};      /* id -> delay in centiseconds */
    var seq = 0, expect = 0, total = 0, live = 0;
    var settle = null;

    function emit() {
      while (done[expect] !== undefined) {
        frameBlock(W, hd.w, hd.h, done[expect], delayOf[expect]);
        delete done[expect];
        delete delayOf[expect];
        expect++;
      }
      if (settle && !live && !waiting.length && expect === total) {
        var fn = settle;
        settle = null;
        fn();
      }
    }

    function assign(wk) {
      var job = waiting.shift();
      idle.push(wk);
      if (!job) return;
      idle.pop();
      wk.job = job;
      live++;
      wk.postMessage({ id: job.id, indices: job.indices, minCode: 8 });
      job.resolve();
    }

    function pump() {
      while (idle.length && waiting.length) assign(idle.pop());
      /* if every worker died, finish the rest here rather than hang */
      while (!workers.length && waiting.length) {
        var job = waiting.shift();
        done[job.id] = lzw(job.indices, 8).slice();
        job.resolve();
      }
      emit();
    }

    workers.forEach(function (wk) {
      wk.onmessage = function (ev) {
        done[ev.data.id] = new Uint8Array(ev.data.bytes);
        wk.job = null;
        live--;
        idle.push(wk);
        pump();
      };
      /* A dead worker must not lose its frame: compress that one on this thread
         and carry on with one fewer worker. */
      wk.onerror = function () {
        var job = wk.job;
        wk.job = null;
        if (job && done[job.id] === undefined) {
          done[job.id] = lzw(job.indices, 8).slice();
          if (live) live--;
        }
        try { wk.terminate(); } catch (e) { /* ignore */ }
        var at = workers.indexOf(wk);
        if (at >= 0) workers.splice(at, 1);
        pump();
      };
    });

    return {
      frame: function (indices, delayCs) {
        var id = seq++;
        total++;
        delayOf[id] = delayCs;
        return new Promise(function (resolve) {
          waiting.push({ id: id, indices: indices, resolve: resolve });
          pump();
        });
      },
      bytes: function () {
        return new Promise(function (resolve) { settle = resolve; pump(); })
          .then(function () {
            workers.forEach(function (wk) { try { wk.terminate(); } catch (e) { /* ignore */ } });
            W.u8(0x3B);
            return W.bytes();
          });
      }
    };
  }

  /* Centisecond delays are the hard ceiling on GIF smoothness: the smallest
     delay a browser honours is 2cs, so 50 fps is the fastest a GIF can play.
     Anything above that has to be resampled down, not encoded faster. */
  var MAX_FPS = 50;

  function rate(fps) {
    return Math.max(1, Math.min(MAX_FPS, Math.round(fps || 20)));
  }

  /**
   * Per-frame delays in centiseconds for `count` frames at `fps`.
   * Rounding 100 / fps once and reusing it drifts (24 fps becomes 25, 30 becomes
   * 33.3 and a 60 fps request becomes 50), so every delay is derived from the
   * intended timeline and absorbs the previous rounding error instead.
   */
  function delays(count, fps, step) {
    var r = rate(fps);
    step = step || 1;
    var out = [], emitted = 0;
    for (var i = 1; i <= count; i++) {
      var want = Math.round((i * step / r) * 100);
      var d = Math.max(2, want - emitted);
      out.push(d);
      emitted += d;
    }
    return out;
  }

  /**
   * Frame budget. A GIF holds every compressed frame until the file is
   * assembled, so thin the frame count when frames × pixels would be absurd.
   * The caller multiplies the frame delay by `step`, so the loop still lasts as
   * long as the animation it came from — choppier, never a crashed tab.
   */
  function plan(frames, w, h, maxPixels) {
    var budget = maxPixels || 200e6;
    var step = Math.max(1, Math.ceil((frames * w * h) / budget));
    return { step: step, count: Math.max(1, Math.ceil(frames / step)) };
  }

  function build(o) {
    var frames = o.frames || [];
    if (!frames.length) throw new Error('GIF needs at least one frame');
    var g = writer(o);
    for (var i = 0; i < frames.length; i++) g.frame(frames[i].indices, frames[i].delayCs);
    return g.bytes();
  }

  OS.Gif = {
    build: build, writer: writer, par: par, plan: plan, delays: delays, rate: rate, MAX_FPS: MAX_FPS,
    palette: palette, lut: lut, quantize: quantize, lzw: lzw
  };
})(typeof window !== 'undefined' ? (window.OS = window.OS || {}) : (self.OS = self.OS || {}));
