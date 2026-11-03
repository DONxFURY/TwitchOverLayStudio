/* ==========================================================================
   Twitch Overlay Studio — mp4.js
   Minimal ISO-BMFF (MP4) muxer for H.264 samples produced by WebCodecs.
   Layout: ftyp + mdat + moov. One sample per chunk, constant frame duration.
   ========================================================================== */
(function (OS) {
  'use strict';

  function bytes(str) {
    var out = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xFF;
    return out;
  }
  function u8(n) { return new Uint8Array([n & 0xFF]); }
  function u16(n) { return new Uint8Array([(n >> 8) & 0xFF, n & 0xFF]); }
  function u32(n) { return new Uint8Array([(n >>> 24) & 0xFF, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF]); }
  function zeros(n) { return new Uint8Array(n); }

  function cat(list) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += list[i].length;
    var out = new Uint8Array(total), at = 0;
    for (i = 0; i < list.length; i++) { out.set(list[i], at); at += list[i].length; }
    return out;
  }

  function box(type, parts) {
    var body = cat(parts);
    var head = new Uint8Array(8);
    var dv = new DataView(head.buffer);
    dv.setUint32(0, 8 + body.length);
    head.set(bytes(type), 4);
    return cat([head, body]);
  }

  function full(type, version, flags, parts) {
    var vf = new Uint8Array(4);
    vf[0] = version;
    vf[1] = (flags >> 16) & 0xFF;
    vf[2] = (flags >> 8) & 0xFF;
    vf[3] = flags & 0xFF;
    return box(type, [vf].concat(parts || []));
  }

  var MATRIX = cat([
    u32(0x00010000), u32(0), u32(0),
    u32(0), u32(0x00010000), u32(0),
    u32(0), u32(0), u32(0x40000000)
  ]);

  /**
   * @param {object} opts
   *   width, height, fps, avcC (Uint8Array), samples:[{data:Uint8Array, key:boolean}]
   * @returns {Uint8Array} mp4 file bytes
   */
  function build(opts) {
    var width = Math.round(opts.width);
    var height = Math.round(opts.height);
    var fps = opts.fps || 30;
    var samples = opts.samples || [];
    var desc = opts.avcC || new Uint8Array(0);
    var n = samples.length;
    if (!n) throw new Error('No video samples to mux');

    var MTIMESCALE = 90000;
    var SAMPLE_DELTA = Math.max(1, Math.round(MTIMESCALE / fps));
    var mediaDuration = SAMPLE_DELTA * n;
    var MOVIE_TIMESCALE = 1000;
    var movieDuration = Math.round((n / fps) * MOVIE_TIMESCALE);

    /* --- ftyp --- */
    var ftyp = box('ftyp', [
      bytes('isom'), u32(512),
      bytes('isom'), bytes('iso2'), bytes('avc1'), bytes('mp41')
    ]);

    /* --- mdat + sample offsets --- */
    var dataStart = ftyp.length + 8;
    var offsets = [];
    var sizes = new Uint8Array(n * 4), ptr = 0;
    var cursor = dataStart;
    var payloads = [];
    for (var i = 0; i < n; i++) {
      offsets.push(cursor);
      sizes[ptr++] = (samples[i].data.length >>> 24) & 0xFF;
      sizes[ptr++] = (samples[i].data.length >>> 16) & 0xFF;
      sizes[ptr++] = (samples[i].data.length >>> 8) & 0xFF;
      sizes[ptr++] = samples[i].data.length & 0xFF;
      cursor += samples[i].data.length;
      payloads.push(samples[i].data);
    }

    /* --- sample description --- */
    var avc1 = box('avc1', [
      zeros(6), u16(1),
      zeros(16),
      u16(width), u16(height),
      u32(0x00480000), u32(0x00480000),
      zeros(4), u16(1),
      zeros(32),
      u16(0x0018), u16(0xFFFF),
      box('avcC', [desc])
    ]);

    var stsd = full('stsd', 0, 0, [u32(1), avc1]);
    var stts = full('stts', 0, 0, [u32(1), u32(n), u32(SAMPLE_DELTA)]);

    var keyCount = 0;
    for (var k = 0; k < n; k++) if (samples[k].key) keyCount++;
    var stss = null;
    if (keyCount && keyCount < n) {
      var parts = [u32(keyCount)];
      for (var m = 0; m < n; m++) if (samples[m].key) parts.push(u32(m + 1));
      stss = full('stss', 0, 0, parts);
    }

    var stsc = full('stsc', 0, 0, [u32(1), u32(1), u32(1), u32(1)]);
    var stsz = full('stsz', 0, 0, [u32(0), u32(n), sizes]);

    var offParts = [u32(n)];
    for (var o = 0; o < offsets.length; o++) offParts.push(u32(offsets[o]));
    var stco = full('stco', 0, 0, offParts);

    var stblItems = [stsd, stts];
    if (stss) stblItems.push(stss);
    stblItems.push(stsc, stsz, stco);
    var stbl = box('stbl', stblItems);

    var vmhd = full('vmhd', 0, 1, [u16(0), u16(0), u16(0), u16(0)]);
    var url = full('url ', 0, 1, []);
    var dref = full('dref', 0, 0, [u32(1), url]);
    var dinf = box('dinf', [dref]);
    var minf = box('minf', [vmhd, dinf, stbl]);

    var hdlr = full('hdlr', 0, 0, [
      u32(0), bytes('vide'), zeros(12), bytes('VideoHandler'), u8(0)
    ]);

    var mdhd = full('mdhd', 0, 0, [
      u32(0), u32(0), u32(MTIMESCALE), u32(mediaDuration), u16(0x55C4), u16(0)
    ]);

    var mdia = box('mdia', [mdhd, hdlr, minf]);

    var tkhd = full('tkhd', 0, 7, [
      u32(0), u32(0), u32(1), u32(0), u32(movieDuration),
      zeros(8), u16(0), u16(0), u16(0), u16(0),
      MATRIX,
      u32(width * 65536), u32(height * 65536)
    ]);

    var trak = box('trak', [tkhd, mdia]);

    var mvhd = full('mvhd', 0, 0, [
      u32(0), u32(0), u32(MOVIE_TIMESCALE), u32(movieDuration),
      u32(0x00010000), u16(0x0100), u16(0), zeros(8),
      MATRIX,
      zeros(24), u32(2)
    ]);

    var moov = box('moov', [mvhd, trak]);

    var mdat = box('mdat', payloads);
    return cat([ftyp, mdat, moov]);
  }

  OS.Mp4 = { build: build, _box: box, _u32: u32 };
})(window.OS = window.OS || {});
