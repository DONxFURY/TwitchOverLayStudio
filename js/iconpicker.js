/* ==========================================================================
   Twitch Overlay Studio — iconpicker.js
   Searchable browser for the bundled Tabler icon set (MIT). Clicking an icon
   drops it on the stage as an SVG image layer, tinted with the picker colour.
   Icons are inlined as strings (js/icondata.js) so nothing is fetched at
   runtime and exported scenes stay self-contained.
   ========================================================================== */
(function (OS) {
  'use strict';
  var U = OS.U;
  var SET = OS.IconSet || { icons: [] };
  var ICONS = SET.icons || [];
  var DEFAULT_TINT = '#eaf6ff';

  function b64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (_, hex) {
      return String.fromCharCode(parseInt(hex, 16));
    }));
  }

  /** Inline the icon SVG at a given pixel size and tint. */
  function svgFor(icon, tint, size) {
    var px = size || 192;
    return String(icon.s)
      .replace(/currentColor/g, tint || DEFAULT_TINT)
      .replace(/width="[\d.]+"/, 'width="' + px + '"')
      .replace(/height="[\d.]+"/, 'height="' + px + '"');
  }

  function dataURL(icon, tint) {
    return 'data:image/svg+xml;base64,' + b64(svgFor(icon, tint, 192));
  }

  function tintValue() {
    var el = U.$('#iconColor');
    return (el && el.value) || DEFAULT_TINT;
  }

  /** Drop the icon on the stage as an image layer, centred on the selection. */
  function insert(icon, size) {
    if (!icon) return null;
    var px = size || 192;
    var sel = OS.Model.selected()[0];
    var cx = sel ? sel.x + sel.w / 2 : 960;
    var cy = sel ? sel.y + sel.h / 2 : 540;
    var layer = OS.Presets.make('image', {
      name: icon.n,
      x: Math.round(cx - px / 2),
      y: Math.round(cy - px / 2),
      w: px, h: px, cut: 0,
      img: { src: dataURL(icon, tintValue()), fit: 'contain' }
    });
    OS.Model.add(layer);
    OS.Model.select([layer.id]);
    U.toast('Added icon · ' + icon.n);
    return layer.id;
  }

  function render(query) {
    var host = U.$('#iconGrid');
    if (!host) return;
    var q = String(query || '').trim().toLowerCase();
    var list = q ? ICONS.filter(function (i) { return i.n.indexOf(q) !== -1; }) : ICONS;
    host.innerHTML = '';
    if (!list.length) {
      host.innerHTML = '<span class="icon-empty">No icon matches that search.</span>';
      return;
    }
    var frag = document.createDocumentFragment();
    list.forEach(function (icon) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'icon-chip';
      b.title = icon.n;
      b.dataset.icon = icon.n;
      b.innerHTML = svgFor(icon, 'currentColor', 24);
      b.addEventListener('click', function () { insert(icon); });
      frag.appendChild(b);
    });
    host.appendChild(frag);
  }

  function init() {
    var host = U.$('#iconGrid');
    if (!host) return;
    if (!ICONS.length) {
      host.innerHTML = '<span class="icon-empty">Icon pack not loaded.</span>';
      return;
    }
    var count = U.$('#iconCount');
    if (count) count.textContent = String(ICONS.length);
    var search = U.$('#iconSearch');
    if (search) {
      search.addEventListener('input', U.debounce(function () { render(search.value); }, 110));
      search.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { search.value = ''; render(''); search.blur(); }
        if (e.key === 'Enter') {
          var first = ICONS.filter(function (i) { return i.n.indexOf(search.value.trim().toLowerCase()) !== -1; })[0];
          if (first) insert(first);
        }
      });
    }
    render('');
  }

  OS.Icons = {
    list: ICONS,
    set: SET,
    insert: insert,
    dataURL: dataURL,
    svgFor: svgFor,
    render: render
  };

  document.addEventListener('DOMContentLoaded', init);
})(window.OS = window.OS || {});
