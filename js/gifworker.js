/* ==========================================================================
   Twitch Overlay Studio — gifworker.js
   One GIF frame's LZW compression, off the main thread.

   The workers load the real encoder from gif.js with importScripts, so there is
   only ever one LZW implementation. The page assembles the returned blocks in
   frame order, which makes a parallel export byte-identical to a serial one.
   ========================================================================== */
importScripts('gif.js');

self.onmessage = function (ev) {
  var d = ev.data;
  if (!d || d.probe) { self.postMessage({ probe: true }); return; }
  var bytes = OS.Gif.lzw(new Uint8Array(d.indices), d.minCode || 8).slice();
  /* hand the buffer over instead of cloning it; the image can be megabytes */
  self.postMessage({ id: d.id, bytes: bytes }, [bytes.buffer]);
};
