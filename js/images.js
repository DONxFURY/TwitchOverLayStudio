/* ==========================================================================
   Twitch Overlay Studio — images.js
   Image import for panels: PNG, JPG, GIF (stays animated), WebP, SVG/AVIF.
   Handles multi-file drops, clipboard paste, aspect-preserving placement and
   src replacement on an existing image layer.
   ========================================================================== */
(function (OS) {
  'use strict';
  var U = OS.U;

  var ACCEPT = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml,image/avif,.png,.jpg,.jpeg,.gif,.webp,.svg,.avif';

  function extOf(name, mime) {
    var m = /\.([a-z0-9]+)$/i.exec(name || '');
    var e = m ? m[1].toLowerCase() : '';
    if (e === 'jpeg') e = 'jpg';
    if (!e) e = U.extForMime(mime || 'image/png');
    return e;
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) { reject(new Error('No file')); return; }
      if (file.type && file.type.indexOf('image') !== 0) { reject(new Error('Not an image')); return; }
      var fr = new FileReader();
      fr.onerror = function () { reject(new Error('Could not read ' + (file.name || 'file'))); };
      fr.onload = function () {
        var src = String(fr.result);
        var baseName = (file.name || 'image').replace(/\.[^.]+$/, '') || 'Image';
        var img = new Image();
        img.onload = function () {
          resolve({
            src: src, name: baseName,
            ext: extOf(file.name, file.type),
            w: img.naturalWidth || 400,
            h: img.naturalHeight || 300
          });
        };
        img.onerror = function () {
          /* SVG or odd formats without intrinsic size still import */
          resolve({ src: src, name: baseName, ext: extOf(file.name, file.type), w: 400, h: 300 });
        };
        img.src = src;
      };
      fr.readAsDataURL(file);
    });
  }

  function clampSize(w, h, maxW, maxH) {
    var s = Math.min(1, maxW / w, maxH / h);
    return { w: Math.max(24, Math.round(w * s)), h: Math.max(24, Math.round(h * s)) };
  }

  /**
   * Import image files as layers.
   * With one file and an image layer selected, the src is replaced instead.
   * @param {FileList|Array<File>} files
   * @param {{x:number,y:number}} [point] drop position in stage coordinates
   */
  async function addFiles(files, point) {
    var list = Array.prototype.slice.call(files || []).filter(function (f) {
      return f && (!f.type || f.type.indexOf('image') === 0);
    });
    if (!list.length) {
      U.toast('That is not an image — use PNG, JPG, GIF, WebP or SVG', 'warn');
      return [];
    }

    var metas = [];
    for (var i = 0; i < list.length; i++) {
      try { metas.push(await readFile(list[i])); } catch (e) { console.warn(e); }
    }
    if (!metas.length) { U.toast('Those files could not be read', 'error'); return []; }

    /* single file + an image layer selected => replace its picture */
    if (metas.length === 1) {
      var sel = OS.Model.selected().filter(function (l) { return l.type === 'image'; })[0];
      if (sel) {
        OS.Model.setLayer(sel.id, 'img.src', metas[0].src);
        OS.Model.setLayer(sel.id, 'name', metas[0].name);
        OS.Model.commit();
        U.toast('Image replaced · ' + metas[0].ext.toUpperCase());
        return [sel.id];
      }
    }

    var base = point || { x: 960, y: 540 };
    var ids = [];
    metas.forEach(function (meta, idx) {
      var size = clampSize(meta.w, meta.h, 720, 480);
      var off = idx * 28;
      var layer = OS.Presets.make('image', {
        name: meta.name,
        x: Math.round(base.x - size.w / 2 + off),
        y: Math.round(base.y - size.h / 2 + off),
        w: size.w, h: size.h, cut: 0,
        img: { src: meta.src, fit: 'cover' }
      });
      OS.Model.add(layer);
      ids.push(layer.id);
    });
    OS.Model.select(ids);
    U.toast(ids.length === 1
      ? 'Added ' + metas[0].name + ' · ' + metas[0].ext.toUpperCase()
      : 'Added ' + ids.length + ' images');
    return ids;
  }

  /** Read an image URL (already a src string) without a File. */
  function probe(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
      img.onerror = function () { resolve({ w: 400, h: 300 }); };
      img.src = src;
    });
  }

  OS.Images = { ACCEPT: ACCEPT, readFile: readFile, addFiles: addFiles, probe: probe, extOf: extOf };
})(window.OS = window.OS || {});
