/* ==========================================================================
   Twitch Overlay Studio — util.js
   Small dependency-free helpers shared by every module.
   ========================================================================== */
(function (OS) {
  'use strict';
  var U = {};

  U.clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  U.uid = function (p) { return (p || 'id') + '_' + Math.random().toString(36).slice(2, 8); };
  U.round = function (v, d) { var m = Math.pow(10, d == null ? 1 : d); return Math.round(v * m) / m; };
  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  U.$ = function (sel, root) { return (root || document).querySelector(sel); };
  U.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  U.clone = function (v) { return v == null ? v : JSON.parse(JSON.stringify(v)); };
  U.debounce = function (fn, ms) {
    var t = 0;
    return function () {
      var a = arguments, c = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(c, a); }, ms);
    };
  };
  U.slug = function (s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'overlay';
  };
  U.download = function (blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
  };

  /* ---- dates --------------------------------------------------------- */
  U.pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  U.fmtTime = function (d) {
    var h = d.getHours(), m = d.getMinutes(), ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return h + ':' + U.pad(m) + ' ' + ap;
  };
  U.fmtDate = function (d) {
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return days[d.getDay()] + ', ' + mon[d.getMonth()] + ' ' + d.getDate();
  };

  /* ---- toasts -------------------------------------------------------- */
  U.toast = function (msg, kind) {
    var host = document.getElementById('toasts');
    if (!host) return;
    var el = document.createElement('div');
    el.className = 'toast toast-' + (kind || 'info');
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(function () { el.classList.add('out'); }, 2600);
    setTimeout(function () { el.remove(); }, 3200);
  };

  /* ---- data URLs <-> bytes ------------------------------------------- */
  U.dataURLToBytes = function (url) {
    var m = /^data:([^;,]+)?(;base64)?,(.*)$/.exec(url || '');
    if (!m) return null;
    var mime = m[1] || 'application/octet-stream';
    var bytes;
    if (m[2]) {
      var bin = atob(m[3]);
      bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else {
      bytes = new TextEncoder().encode(decodeURIComponent(m[3]));
    }
    return { bytes: bytes, mime: mime, ext: U.extForMime(mime) };
  };
  U.extForMime = function (mime) {
    var map = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' };
    return map[mime] || 'png';
  };

  /* ---- misc ---------------------------------------------------------- */
  U.copy = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    var ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    ta.remove();
    return Promise.resolve();
  };

  /* ---- tokens -------------------------------------------------------- */
  U.tokens = function (str, settings) {
    var d = new Date();
    var s = settings || {};
    return String(str == null ? '' : str)
      .replace(/\{\{\s*channel\s*\}\}/gi, s.channel || 'yourchannel')
      .replace(/\{\{\s*twitch\s*\}\}/gi, s.twitch || s.channel || 'twitch.tv/you')
      .replace(/\{\{\s*twitter\s*\}\}/gi, s.twitter || '@you')
      .replace(/\{\{\s*youtube\s*\}\}/gi, s.youtube || 'youtube.com/@you')
      .replace(/\{\{\s*discord\s*\}\}/gi, s.discord || 'discord.gg/you')
      .replace(/\{\{\s*instagram\s*\}\}/gi, s.instagram || '@you')
      .replace(/\{\{\s*tiktok\s*\}\}/gi, s.tiktok || '@you')
      .replace(/\{\{\s*time\s*\}\}/gi, U.fmtTime(d))
      .replace(/\{\{\s*date\s*\}\}/gi, U.fmtDate(d))
      .replace(/\{\{\s*year\s*\}\}/gi, String(d.getFullYear()));
  };

  OS.U = U;
})(window.OS = window.OS || {});
