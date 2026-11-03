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
    var out = [];
    var cur = 0;
    var bits = 0;

    function emit(code) {
      cur |= code << bits;
      bits += codeSize;
      while (bits >= 8) {
        out.push(cur & 255);
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
    if (bits > 0) out.push(cur & 255);
    return out;
  }

  /* ------------------------------------------------------------- writer */

  function Writer() {
    this.buf = [];
  }
  Writer.prototype.u8 = function (v) { this.buf.push(v & 255); };
  Writer.prototype.u16 = function (v) { this.buf.push(v & 255, (v >> 8) & 255); };
  Writer.prototype.str = function (s) {
    for (var i = 0; i < s.length; i++) this.buf.push(s.charCodeAt(i) & 255);
  };
  Writer.prototype.block = function (bytes) {
    for (var p = 0; p < bytes.length; p += 255) {
      var n = Math.min(255, bytes.length - p);
      this.u8(n);
      for (var k = 0; k < n; k++) this.buf.push(bytes[p + k]);
    }
    this.u8(0);
  };

  /**
   * Build an animated GIF.
   * @param {Object} o {width, height, palette, frames:[{indices, delayCs}], loop}
   * @returns {Uint8Array}
   */
  function build(o) {
    var w = o.width, h = o.height;
    var pal = o.palette || [[0, 0, 0]];
    var frames = o.frames || [];
    if (!frames.length) throw new Error('GIF needs at least one frame');

    var W = new Writer();
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

    frames.forEach(function (f) {
      var delay = Math.max(1, Math.round(f.delayCs || 4));
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
      W.block(lzw(f.indices, 8));
    });

    W.u8(0x3B);
    return new Uint8Array(W.buf);
  }

  OS.Gif = { build: build, palette: palette, lut: lut, quantize: quantize, lzw: lzw };
})(window.OS = window.OS || {});
