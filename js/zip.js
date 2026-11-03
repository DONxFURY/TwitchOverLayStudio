/* ==========================================================================
   Twitch Overlay Studio — zip.js
   Minimal ZIP writer (STORE method, no compression, UTF-8 names).
   Everything is produced in the browser so exports need no server process
   beyond serving the app itself.
   ========================================================================== */
(function (OS) {
  'use strict';

  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(buf) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function enc(str) { return new TextEncoder().encode(str); }

  /**
   * Build a zip Blob.
   * @param {Array<{name:string, data:(string|Uint8Array)}>} files
   * @returns {Blob}
   */
  function build(files) {
    var now = new Date();
    var dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | ((now.getSeconds() / 2) | 0)) & 0xFFFF;
    var dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;

    var parts = [];
    var central = [];
    var offset = 0;

    files.forEach(function (f) {
      var data = typeof f.data === 'string' ? enc(f.data) : f.data;
      if (!data) data = new Uint8Array(0);
      if (!(data instanceof Uint8Array)) data = new Uint8Array(data);
      var name = enc(f.name);
      var crc = crc32(data);

      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true);
      lh.setUint16(4, 20, true);
      lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true);
      lh.setUint16(10, dosTime, true);
      lh.setUint16(12, dosDate, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true);
      lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true);
      lh.setUint16(28, 0, true);

      var local = new Uint8Array(30 + name.length);
      local.set(new Uint8Array(lh.buffer), 0);
      local.set(name, 30);
      parts.push(local, data);

      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true);
      ch.setUint16(4, 20, true);
      ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true);
      ch.setUint16(12, dosTime, true);
      ch.setUint16(14, dosDate, true);
      ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true);
      ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true);
      ch.setUint16(30, 0, true);
      ch.setUint16(32, 0, true);
      ch.setUint16(34, 0, true);
      ch.setUint16(36, 0, true);
      ch.setUint32(38, 0, true);
      ch.setUint32(42, offset, true);
      var cen = new Uint8Array(46 + name.length);
      cen.set(new Uint8Array(ch.buffer), 0);
      cen.set(name, 46);
      central.push(cen);

      offset += local.length + data.length;
    });

    var centralSize = central.reduce(function (a, b) { return a + b.length; }, 0);
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(4, 0, true);
    end.setUint16(6, 0, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);
    end.setUint16(20, 0, true);

    var all = parts.concat(central, [new Uint8Array(end.buffer)]);
    return new Blob(all, { type: 'application/zip' });
  }

  OS.Zip = { build: build, crc32: crc32 };
})(window.OS = window.OS || {});
