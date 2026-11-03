/* ==========================================================================
   Twitch Overlay Studio — apng.js
   Assembles animated PNGs from regular PNG frames: rewraps each frame's IDAT
   into fdAT chunks with fcTL control chunks. APNG keeps full 8-bit alpha and
   lossless colour, so glows and soft edges stay smooth — unlike GIF.
   ========================================================================== */
(function (OS) {
  'use strict';

  var SIG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

  var CRC_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes, start, end) {
    var c = 0xFFFFFFFF;
    for (var i = start; i < end; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function u32(n) {
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  }

  function chunk(type, data) {
    var len = data.length;
    var out = new Uint8Array(12 + len);
    out.set(u32(len), 0);
    for (var i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i) & 255;
    out.set(data, 8);
    out.set(u32(crc32(out, 4, 8 + len)), 8 + len);
    return out;
  }

  /** Split a PNG into its IHDR bytes and concatenated IDAT payload. */
  function parsePng(bytes) {
    for (var s = 0; s < 8; s++) if (bytes[s] !== SIG[s]) throw new Error('Not a PNG frame');
    var p = 8, ihdr = null, idat = [], w = 0, h = 0;
    while (p + 8 <= bytes.length) {
      var len = ((bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3]) >>> 0;
      var type = String.fromCharCode(bytes[p + 4], bytes[p + 5], bytes[p + 6], bytes[p + 7]);
      var data = bytes.subarray(p + 8, p + 8 + len);
      if (type === 'IHDR') {
        ihdr = data.slice();
        w = ((data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3]) >>> 0;
        h = ((data[4] << 24) | (data[5] << 16) | (data[6] << 8) | data[7]) >>> 0;
      } else if (type === 'IDAT') {
        for (var i = 0; i < data.length; i++) idat.push(data[i]);
      } else if (type === 'IEND') {
        break;
      }
      p += 12 + len;
    }
    if (!ihdr) throw new Error('PNG frame has no IHDR');
    return { ihdr: ihdr, idat: new Uint8Array(idat), width: w, height: h };
  }

  function concat(parts) {
    var total = 0;
    for (var i = 0; i < parts.length; i++) total += parts[i].length;
    var out = new Uint8Array(total);
    var at = 0;
    for (var j = 0; j < parts.length; j++) { out.set(parts[j], at); at += parts[j].length; }
    return out;
  }

  /**
   * Build an APNG.
   * @param {Array<Uint8Array>} pngFrames encoded PNGs, same size
   * @param {number} delayMs per-frame delay
   * @returns {Uint8Array}
   */
  function build(pngFrames, delayMs) {
    if (!pngFrames || !pngFrames.length) throw new Error('APNG needs at least one frame');
    var first = parsePng(pngFrames[0]);
    var w = first.width, h = first.height;
    var delay = Math.max(1, Math.round(delayMs || 40));

    var parts = [];
    parts.push(new Uint8Array(SIG));
    parts.push(chunk('IHDR', first.ihdr));

    var actl = new Uint8Array(8);
    actl.set(u32(pngFrames.length), 0);
    actl.set(u32(0), 4);            /* loop forever */
    parts.push(chunk('acTL', actl));

    var seq = 0;
    pngFrames.forEach(function (png, i) {
      var parsed = i === 0 ? first : parsePng(png);
      if (parsed.width !== w || parsed.height !== h) throw new Error('APNG frames must match size');

      var fctl = new Uint8Array(26);
      fctl.set(u32(seq++), 0);
      fctl.set(u32(w), 4);
      fctl.set(u32(h), 8);
      fctl.set(u32(0), 12);
      fctl.set(u32(0), 16);
      fctl[20] = (delay >> 8) & 255;
      fctl[21] = delay & 255;
      fctl[22] = 0x03;               /* denominator 1000 */
      fctl[23] = 0xE8;
      fctl[24] = 0;                  /* dispose: none */
      fctl[25] = 0;                  /* blend: source (keeps alpha) */
      parts.push(chunk('fcTL', fctl));

      if (i === 0) {
        parts.push(chunk('IDAT', parsed.idat));
      } else {
        var fdat = new Uint8Array(4 + parsed.idat.length);
        fdat.set(u32(seq++), 0);
        fdat.set(parsed.idat, 4);
        parts.push(chunk('fdAT', fdat));
      }
    });

    parts.push(chunk('IEND', new Uint8Array(0)));
    return concat(parts);
  }

  OS.Apng = { build: build, parsePng: parsePng, crc32: crc32 };
})(window.OS = window.OS || {});
