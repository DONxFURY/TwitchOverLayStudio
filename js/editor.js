/* ==========================================================================
   Twitch Overlay Studio — editor.js
   Direct manipulation: select, marquee, drag, snap, resize, rotate, zoom, pan.
   Selection chrome lives in screen space so handles stay crisp at any zoom.
   ========================================================================== */
(function (OS) {
  'use strict';
  var U = OS.U, M = OS.Model, R = OS.Render;

  var SIGNS = {
    nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0],
    se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0]
  };

  var E = {
    stage: null,
    fit: null,
    scroll: null,
    overlay: null,
    guidesHost: null,
    marqueeEl: null,
    sizeEl: null,
    z: 1,
    snap: true,
    drag: null,
    pan: null,
    _guides: { v: [], h: [] },

    init: function (cfg) {
      this.stage = cfg.stage;
      this.fit = cfg.fit;
      this.scroll = cfg.scroll;
      this.overlay = cfg.overlay;
      this.guidesHost = cfg.guides;
      this.marqueeEl = cfg.marquee;
      this.sizeEl = U.$('#selSize');
      this.bind();
    },

    /* ------------------------------------------------------------------ */
    /* zoom                                                               */
    /* ------------------------------------------------------------------ */
    fitZoom: function () {
      var pad = 72;
      var availW = Math.max(120, this.scroll.clientWidth - pad);
      var availH = Math.max(80, this.scroll.clientHeight - pad);
      return U.clamp(Math.min(availW / 1920, availH / 1080), 0.06, 1);
    },
    setZoom: function (z) {
      if (!z) z = this.fitZoom();
      this.z = U.clamp(z, 0.06, 2);
      this.stage.style.transform = 'scale(' + this.z + ')';
      this.fit.style.width = 1920 * this.z + 'px';
      this.fit.style.height = 1080 * this.z + 'px';
      this.updateOverlay();
      if (OS.App) OS.App.onZoom(this.z);
    },
    zoomBy: function (delta) { this.setZoom(this.z + delta); },

    /* ------------------------------------------------------------------ */
    pt: function (ev) {
      var r = this.stage.getBoundingClientRect();
      return { x: (ev.clientX - r.left) / this.z, y: (ev.clientY - r.top) / this.z };
    },

    /* ------------------------------------------------------------------ */
    bind: function () {
      var self = this;

      this.stage.addEventListener('pointerdown', function (e) { self.onDown(e); });

      this.overlay.addEventListener('pointerdown', function (e) {
        var h = e.target.dataset && e.target.dataset.h;
        if (!h) return;
        e.preventDefault();
        e.stopPropagation();
        self.startHandle(e, h);
      });

      document.addEventListener('pointermove', function (e) { self.onMove(e); });
      document.addEventListener('pointerup', function (e) { self.onUp(e); });

      this.scroll.addEventListener('wheel', function (e) {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          self.setZoom(self.z * (e.deltaY < 0 ? 1.08 : 0.92));
        }
      }, { passive: false });

      this.stage.addEventListener('dblclick', function (e) {
        var el = e.target.closest('[data-id]');
        if (!el) return;
        var l = M.find(el.dataset.id);
        if (!l) return;
        M.select([l.id]);
        if (l.type === 'text' && OS.Inspector) {
          var box = OS.Inspector.focusField('text.value');
          if (box) box.focus();
        }
      });

      /* drop images onto the stage (multi-file: PNG, JPG, GIF, WebP, SVG) */
      this.stage.addEventListener('dragover', function (e) {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        self.stage.classList.add('is-dropping');
      });
      this.stage.addEventListener('dragleave', function () { self.stage.classList.remove('is-dropping'); });
      this.stage.addEventListener('drop', function (e) {
        e.preventDefault();
        self.stage.classList.remove('is-dropping');
        var files = e.dataTransfer && e.dataTransfer.files;
        if (!files || !files.length) return;
        var p = self.pt(e);
        OS.Images.addFiles(files, { x: p.x, y: p.y });
      });
    },

    /* ------------------------------------------------------------------ */
    /* pointer down                                                       */
    /* ------------------------------------------------------------------ */
    onDown: function (e) {
      if (e.button === 1) { this.startPan(e); return; }
      if (e.button !== 0) return;

      var lyEl = e.target.closest('[data-id]');

      if (!lyEl) {
        if (!e.shiftKey) M.select([]);
        this.startMarquee(e);
        return;
      }

      var id = lyEl.dataset.id;
      var layer = M.find(id);
      if (!layer) return;

      if (e.shiftKey) M.toggleSelect(id);
      else if (!M.isSelected(id)) M.select([id]);

      if (layer.locked) { U.toast('Layer is locked', 'warn'); return; }

      /* Alt+drag duplicates in place before moving */
      if (e.altKey) {
        M.duplicateSilent();
      }

      var moving = M.selected().filter(function (l) { return !l.locked; });
      this.drag = {
        mode: 'move',
        start: this.pt(e),
        layers: moving.map(function (l) { return { l: l, x: l.x, y: l.y }; }),
        moved: false
      };
      document.body.classList.add('is-dragging');
    },

    startPan: function (e) {
      this.pan = {
        startClient: { x: e.clientX, y: e.clientY },
        startScroll: { left: this.scroll.scrollLeft, top: this.scroll.scrollTop }
      };
      this.scroll.classList.add('is-panning');
    },

    startMarquee: function (e) {
      this.drag = {
        mode: 'marquee',
        start: this.pt(e),
        add: e.shiftKey,
        base: M.selIds(),
        moved: false
      };
      document.body.classList.add('is-dragging');
    },

    startHandle: function (e, h) {
      var sel = M.selected();
      if (sel.length !== 1) return;
      var l = sel[0];
      var p = this.pt(e);

      if (h === 'rot') {
        var cx = l.x + l.w / 2, cy = l.y + l.h / 2;
        this.drag = {
          mode: 'rotate', layer: l, center: { x: cx, y: cy },
          offset: Math.atan2(p.y - cy, p.x - cx) - (l.rot || 0) * Math.PI / 180,
          moved: false
        };
      } else {
        this.drag = {
          mode: 'resize', layer: l, sign: SIGNS[h], start: p,
          box: { x: l.x, y: l.y, w: l.w, h: l.h, rot: l.rot || 0 },
          moved: false
        };
        this.overlay.classList.add('is-resizing');
      }
      document.body.classList.add('is-dragging');
    },

    /* ------------------------------------------------------------------ */
    /* pointer move                                                       */
    /* ------------------------------------------------------------------ */
    onMove: function (e) {
      if (this.pan) {
        this.scroll.scrollLeft = this.pan.startScroll.left - (e.clientX - this.pan.startClient.x);
        this.scroll.scrollTop = this.pan.startScroll.top - (e.clientY - this.pan.startClient.y);
        return;
      }
      var d = this.drag;
      if (!d) return;
      var p = this.pt(e);
      if (d.mode !== 'marquee') d.moved = true;

      if (d.mode === 'marquee') this.moveMarquee(d, p);
      else if (d.mode === 'move') this.moveLayers(d, p, e.shiftKey);
      else if (d.mode === 'resize') this.resizeLayer(d, p, e.shiftKey);
      else if (d.mode === 'rotate') this.rotateLayer(d, p, e.shiftKey);
    },

    moveMarquee: function (d, p) {
      var x = Math.min(d.start.x, p.x);
      var y = Math.min(d.start.y, p.y);
      var w = Math.abs(p.x - d.start.x);
      var h = Math.abs(p.y - d.start.y);
      d.moved = w > 2 || h > 2;

      if (this.marqueeEl) {
        this.marqueeEl.innerHTML = d.moved
          ? '<div class="marquee-rect" style="left:' + x * this.z + 'px;top:' + y * this.z +
            'px;width:' + w * this.z + 'px;height:' + h * this.z + 'px"></div>'
          : '';
      }
      if (!d.moved) return;

      var hits = M.layers().filter(function (l) {
        if (l.hidden) return false;
        return !(l.x > x + w || l.x + l.w < x || l.y > y + h || l.y + l.h < y);
      }).map(function (l) { return l.id; });

      var ids = d.add ? d.base.concat(hits.filter(function (id) { return d.base.indexOf(id) < 0; })) : hits;
      M.select(ids);
    },

    moveLayers: function (d, p, shift) {
      var dx = p.x - d.start.x;
      var dy = p.y - d.start.y;
      if (shift) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0;
      }
      var primary = d.layers[0];
      if (!primary) return;

      var nx = primary.x + dx, ny = primary.y + dy;
      this._guides = { v: [], h: [] };
      if (this.snap) {
        var s = this.snapPos(primary.l, nx, ny);
        nx = s.x; ny = s.y;
      }
      var ax = nx - primary.x, ay = ny - primary.y;

      d.layers.forEach(function (o) {
        o.l.x = Math.round(o.x + ax);
        o.l.y = Math.round(o.y + ay);
        R.updateLive(o.l);
      });
      this.drawGuides();
      this.updateOverlay();
      if (OS.Inspector) OS.Inspector.syncValues();
    },

    resizeLayer: function (d, p, shift) {
      var l = d.layer, b = d.box, sg = d.sign;
      var rad = b.rot * Math.PI / 180;
      var cos = Math.cos(rad), sin = Math.sin(rad);
      var ex = p.x - d.start.x, ey = p.y - d.start.y;
      var ldx = ex * cos + ey * sin;
      var ldy = -ex * sin + ey * cos;

      var nw = sg[0] === 0 ? b.w : Math.max(16, b.w + sg[0] * ldx);
      var nh = sg[1] === 0 ? b.h : Math.max(16, b.h + sg[1] * ldy);

      if (shift && sg[0] !== 0 && sg[1] !== 0) {
        var ratio = b.w / b.h;
        if (nw / nh > ratio) nw = nh * ratio; else nh = nw / ratio;
      }

      var aOff = { x: -sg[0] * b.w / 2, y: -sg[1] * b.h / 2 };
      var bcx = b.x + b.w / 2, bcy = b.y + b.h / 2;
      var axw = bcx + aOff.x * cos - aOff.y * sin;
      var ayw = bcy + aOff.x * sin + aOff.y * cos;

      var nOff = { x: -sg[0] * nw / 2, y: -sg[1] * nh / 2 };
      var ncx = axw - (nOff.x * cos - nOff.y * sin);
      var ncy = ayw - (nOff.x * sin + nOff.y * cos);

      l.w = Math.round(nw);
      l.h = Math.round(nh);
      l.x = Math.round(ncx - nw / 2);
      l.y = Math.round(ncy - nh / 2);

      R.updateLive(l);
      this.updateOverlay();
      if (this.sizeEl) this.sizeEl.textContent = Math.round(l.w) + ' × ' + Math.round(l.h);
      if (OS.Inspector) OS.Inspector.syncValues();
    },

    rotateLayer: function (d, p, shift) {
      var c = d.center;
      var ang = Math.atan2(p.y - c.y, p.x - c.x) - d.offset;
      var deg = ang * 180 / Math.PI;
      if (shift) deg = Math.round(deg / 15) * 15;
      d.layer.rot = Math.round(deg * 10) / 10;
      R.updateLive(d.layer);
      this.updateOverlay();
      if (this.sizeEl) this.sizeEl.textContent = Math.round(d.layer.rot) + '°';
      if (OS.Inspector) OS.Inspector.syncValues();
    },

    /* ------------------------------------------------------------------ */
    onUp: function () {
      document.body.classList.remove('is-dragging');
      this.scroll.classList.remove('is-panning');
      if (this.overlay) this.overlay.classList.remove('is-resizing');
      if (this.pan) { this.pan = null; return; }

      var d = this.drag;
      this.drag = null;
      if (!d) return;

      if (d.mode === 'marquee') {
        if (this.marqueeEl) this.marqueeEl.innerHTML = '';
        return;
      }
      if (d.moved) {
        M.commit(true);
        if (OS.Inspector) OS.Inspector.render();
      }
      this._guides = { v: [], h: [] };
      this.drawGuides();
      this.updateOverlay();
    },

    /* ------------------------------------------------------------------ */
    /* snapping                                                           */
    /* ------------------------------------------------------------------ */
    snapPos: function (layer, x, y) {
      var thr = 8 / this.z;
      var v = [], h = [];
      M.layers().forEach(function (l) {
        if (l.id === layer.id || l.hidden) return;
        v.push(l.x, l.x + l.w / 2, l.x + l.w);
        h.push(l.y, l.y + l.h / 2, l.y + l.h);
      });
      v.push(0, 960, 1920);
      h.push(0, 540, 1080);

      var ex = [x, x + layer.w / 2, x + layer.w];
      var ey = [y, y + layer.h / 2, y + layer.h];
      var bestX = null, bestY = null;

      ex.forEach(function (e1) {
        v.forEach(function (t) {
          var dd = t - e1;
          if (Math.abs(dd) < thr && (!bestX || Math.abs(dd) < Math.abs(bestX.d))) bestX = { d: dd, at: t };
        });
      });
      ey.forEach(function (e1) {
        h.forEach(function (t) {
          var dd = t - e1;
          if (Math.abs(dd) < thr && (!bestY || Math.abs(dd) < Math.abs(bestY.d))) bestY = { d: dd, at: t };
        });
      });

      this._guides = { v: [], h: [] };
      if (bestX) { x += bestX.d; this._guides.v = [bestX.at]; }
      if (bestY) { y += bestY.d; this._guides.h = [bestY.at]; }
      return { x: x, y: y };
    },

    drawGuides: function () {
      var host = this.guidesHost;
      if (!host) return;
      host.innerHTML = '';
      var z = this.z;
      this._guides.v.forEach(function (gx) {
        var el = document.createElement('div');
        el.className = 'guide guide-v';
        el.style.left = gx * z + 'px';
        host.appendChild(el);
      });
      this._guides.h.forEach(function (gy) {
        var el = document.createElement('div');
        el.className = 'guide guide-h';
        el.style.top = gy * z + 'px';
        host.appendChild(el);
      });
    },

    /* ------------------------------------------------------------------ */
    /* selection chrome                                                   */
    /* ------------------------------------------------------------------ */
    updateOverlay: function () {
      var sel = M.selected();
      var ov = this.overlay;
      if (!ov) return;

      if (R.host) {
        Array.prototype.forEach.call(R.host.children, function (el) {
          el.classList.toggle('is-selected', M.isSelected(el.dataset.id));
        });
      }

      if (!sel.length) {
        ov.style.display = 'none';
        return;
      }

      if (sel.length === 1) {
        var l = sel[0];
        ov.style.display = 'block';
        ov.classList.remove('is-multi');
        ov.style.left = l.x * this.z + 'px';
        ov.style.top = l.y * this.z + 'px';
        ov.style.width = Math.max(1, l.w) * this.z + 'px';
        ov.style.height = Math.max(1, l.h) * this.z + 'px';
        ov.style.transform = 'rotate(' + (l.rot || 0) + 'deg)';
        if (this.sizeEl && !ov.classList.contains('is-resizing')) {
          this.sizeEl.textContent = Math.round(l.w) + ' × ' + Math.round(l.h);
        }
      } else {
        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        sel.forEach(function (l) {
          minX = Math.min(minX, l.x); minY = Math.min(minY, l.y);
          maxX = Math.max(maxX, l.x + l.w); maxY = Math.max(maxY, l.y + l.h);
        });
        ov.style.display = 'block';
        ov.classList.add('is-multi');
        ov.style.left = minX * this.z + 'px';
        ov.style.top = minY * this.z + 'px';
        ov.style.width = (maxX - minX) * this.z + 'px';
        ov.style.height = (maxY - minY) * this.z + 'px';
        ov.style.transform = 'none';
      }
    }
  };

  OS.Editor = E;
})(window.OS = window.OS || {});
