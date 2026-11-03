/* ==========================================================================
   Twitch Overlay Studio — inspector.js
   Property panel (labelled controls, alignment + distribute) and layer stack.
   ========================================================================== */
(function (OS) {
  'use strict';
  var U = OS.U, M = OS.Model, P = OS.Presets;

  function toHex(v) {
    v = String(v || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
    if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    var m = /^rgba?\(([^)]+)\)$/i.exec(v);
    if (m) {
      var p = m[1].split(',').map(function (n) { return parseFloat(n); });
      return '#' + [p[0], p[1], p[2]].map(function (n) {
        var h = Math.max(0, Math.min(255, Math.round(n))).toString(16);
        return h.length === 1 ? '0' + h : h;
      }).join('');
    }
    return '#ffffff';
  }

  var SCHEMA = [
    {
      title: 'Transform',
      fields: [
        { k: 'x', label: 'X', type: 'num', step: 1 },
        { k: 'y', label: 'Y', type: 'num', step: 1 },
        { k: 'w', label: 'Width', type: 'num', step: 1 },
        { k: 'h', label: 'Height', type: 'num', step: 1 },
        { k: 'rot', label: 'Rotation', type: 'num', step: 1, suffix: '°' },
        { k: 'opacity', label: 'Opacity', type: 'range', min: 0, max: 1, step: 0.01 }
      ]
    },
    {
      title: 'Shape',
      fields: [
        { k: 'cut', label: 'Corner cut', type: 'num', step: 1, suffix: 'px' },
        { k: 'radius', label: 'Radius', type: 'num', step: 1, suffix: 'px' },
        { k: 'cz.tl', label: 'TL', type: 'check' },
        { k: 'cz.tr', label: 'TR', type: 'check' },
        { k: 'cz.bl', label: 'BL', type: 'check' },
        { k: 'cz.br', label: 'BR', type: 'check' }
      ],
      note: 'Corner cut applies to the checked corners. Radius is used when cut is 0.'
    },
    {
      title: 'Fill',
      fields: [
        { k: 'fill.type', label: 'Type', type: 'select', full: true, options: [['solid', 'Solid'], ['gradient', 'Gradient'], ['none', 'None']] },
        { k: 'fill.c1', label: 'Colour', type: 'color', full: true },
        { k: 'fill.c2', label: 'Second colour', type: 'color', full: true },
        { k: 'fill.angle', label: 'Gradient angle', type: 'num', step: 1, suffix: '°', full: true }
      ]
    },
    {
      title: 'Border & glow',
      fields: [
        { k: 'border.w', label: 'Width', type: 'num', step: 1, suffix: 'px' },
        { k: 'border.glow', label: 'Glow', type: 'num', step: 1, suffix: 'px' },
        { k: 'border.color', label: 'Border colour', type: 'color', full: true },
        { k: 'border.glowColor', label: 'Glow colour', type: 'color', full: true }
      ]
    },
    {
      title: 'Typography',
      when: function (l) { return l.type === 'text'; },
      fields: [
        { k: 'text.value', label: 'Content', type: 'textarea', full: true },
        { k: 'text.font', label: 'Font', type: 'font', full: true },
        { k: 'text.size', label: 'Size', type: 'num', step: 1, suffix: 'px' },
        { k: 'text.weight', label: 'Weight', type: 'select', options: [['400', 'Regular'], ['600', 'Semi'], ['700', 'Bold'], ['800', 'Extra'], ['900', 'Black']] },
        { k: 'text.ls', label: 'Spacing', type: 'num', step: 0.5, suffix: 'px' },
        { k: 'text.lh', label: 'Line height', type: 'num', step: 0.05 },
        { k: 'text.align', label: 'Alignment', type: 'seg', full: true, options: [['left', 'Left'], ['center', 'Center'], ['right', 'Right']] },
        { k: 'text.color', label: 'Colour', type: 'color', full: true },
        { k: 'text.glow', label: 'Text glow', type: 'num', step: 1, suffix: 'px' },
        { k: 'text.glowColor', label: 'Glow colour', type: 'color' },
        { k: 'text.upper', label: 'Uppercase', type: 'check' },
        { k: 'text.italic', label: 'Italic', type: 'check' }
      ],
      note: 'Tokens: {{channel}} {{twitch}} {{twitter}} {{youtube}} {{discord}} {{time}} {{date}}'
    },
    {
      title: 'Image',
      when: function (l) { return l.type === 'image'; },
      fields: [
        { k: 'img.src', label: 'Source', type: 'image', full: true },
        { k: 'img.fit', label: 'Fit', type: 'seg', full: true, options: [['cover', 'Cover'], ['contain', 'Contain'], ['fill', 'Stretch']] }
      ]
    },
    {
      title: 'Camera',
      when: function (l) { return l.type === 'camera'; },
      fields: [
        { k: 'cam.label', label: 'Label', type: 'text', full: true },
        { k: 'cam.mirror', label: 'Mirror', type: 'check' }
      ],
      note: 'The exported page asks OBS for the webcam. Allow camera access on the browser source.'
    },
    {
      title: 'Chat',
      when: function (l) { return l.type === 'chat'; },
      fields: [
        { k: 'chat.size', label: 'Font size', type: 'num', step: 1, suffix: 'px' },
        { k: 'chat.color', label: 'Text', type: 'color' },
        { k: 'chat.userColor', label: 'Username', type: 'color' }
      ]
    },
    {
      title: 'Frame',
      when: function (l) { return l.type === 'frame'; },
      fields: [
        { k: 'frame.style', label: 'Rim style', type: 'select', full: true, options: OS.Frames.STYLES },
        { k: 'frame.thickness', label: 'Weight', type: 'num', step: 0.5, suffix: 'px' },
        { k: 'frame.cut', label: 'Chamfer', type: 'num', step: 1, suffix: 'px' },
        { k: 'frame.gap', label: 'Inner gap', type: 'num', step: 1, suffix: 'px' },
        {
          k: 'frame.accent', label: 'Accent bar', type: 'select', full: true,
          options: [['none', 'None'], ['left', 'Left'], ['right', 'Right'], ['top', 'Top'], ['bottom', 'Bottom']]
        },
        { k: 'frame.accentColor', label: 'Accent colour', type: 'color', full: true },
        { k: 'frame.glow', label: 'Rim glow', type: 'num', step: 1, suffix: 'px' }
      ]
    },
    {
      title: 'Motion',
      fields: [
        { k: 'anim.type', label: 'Loop motion', type: 'select', full: true, options: OS.Anim.TYPES },
        { k: 'anim.speed', label: 'Cycle time', type: 'num', step: 0.5, suffix: 's' },
        { k: 'anim.delay', label: 'Delay', type: 'num', step: 0.1, suffix: 's' },
        { k: 'anim.amp', label: 'Amount', type: 'num', step: 1 },
        { k: 'anim.offset', label: 'Time offset', type: 'num', step: 0.1, suffix: 's' },
        { k: 'anim.enter', label: 'Entrance', type: 'select', full: true, options: OS.Anim.ENTERS },
        { k: 'anim.enterDur', label: 'In time', type: 'num', step: 0.1, suffix: 's' },
        { k: 'anim.enterEase', label: 'Easing', type: 'select', options: OS.Anim.EASES },
        { k: 'anim.exit', label: 'Exit', type: 'select', full: true, options: OS.Anim.EXITS },
        { k: 'anim.exitDur', label: 'Out time', type: 'num', step: 0.1, suffix: 's' }
      ],
      action: { label: 'Stagger selection', fn: 'stagger' },
      note: 'Entrances play on load and in every video. Exits fire at the end of a video scene. Stagger offsets each selected layer so a group cascades instead of moving in lockstep.'
    },
    {
      title: 'Compositing',
      fields: [
        {
          k: 'blend', label: 'Blend mode', type: 'select', full: true, options: [
            ['normal', 'Normal'], ['screen', 'Screen'], ['overlay', 'Overlay'],
            ['multiply', 'Multiply'], ['difference', 'Difference'], ['plus-lighter', 'Add (lighter)']
          ]
        },
        { k: 'shadow', label: 'Drop shadow', type: 'num', step: 1, suffix: 'px', full: true }
      ]
    }
  ];

  var I = {
    host: null,
    layersHost: null,
    titleEl: null,
    subEl: null,

    init: function (cfg) {
      this.host = cfg.host;
      this.layersHost = cfg.layers;
      this.titleEl = cfg.title;
      this.subEl = cfg.sub;
      this.render();
      this.renderLayers();
    },

    /* ---------------- helpers ---------------- */
    mk: function (tag, cls, html) {
      var el = document.createElement(tag);
      if (cls) el.className = cls;
      if (html != null) el.innerHTML = html;
      return el;
    },

    fieldEl: function (label, full) {
      var row = this.mk('label', 'field' + (full ? ' full' : ''));
      var name = this.mk('span', 'fname');
      name.textContent = label;
      row.appendChild(name);
      return row;
    },

    /* ---------------- panel ---------------- */
    render: function () {
      if (!this.host) return;
      var sel = M.selected();
      var theme = M.theme();
      var self = this;
      this.host.innerHTML = '';

      if (this.titleEl) {
        this.titleEl.textContent = !sel.length ? 'No selection'
          : sel.length === 1 ? (sel[0].name || sel[0].type)
            : sel.length + ' layers selected';
      }
      if (this.subEl) {
        this.subEl.textContent = !sel.length ? 'Select a layer to edit it'
          : sel.length === 1
            ? sel[0].type + ' · ' + Math.round(sel[0].w) + ' × ' + Math.round(sel[0].h)
            : 'Editing shared properties';
      }

      if (!sel.length) {
        var empty = this.mk('div', 'insp-empty');
        empty.innerHTML = '<b>Nothing selected.</b><br>Drag on the canvas to marquee-select, click a layer, or start with one of these:';
        var chips = this.mk('div', 'empty-chips');
        ['panel', 'text', 'image', 'camera', 'chat'].forEach(function (t) {
          var b = self.mk('button', null, '＋ ' + t);
          b.type = 'button';
          b.addEventListener('click', function () { OS.App.addElement(t); });
          chips.appendChild(b);
        });
        empty.appendChild(chips);
        this.host.appendChild(empty);
        return;
      }

      /* alignment bar */
      var bar = this.mk('div', 'align-bar');
      var lbl = this.mk('span', 'lbl', 'Align');
      bar.appendChild(lbl);
      [['left', '⇤', 'Left'], ['hcenter', '↔', 'Centre'], ['right', '⇥', 'Right'],
        ['top', '⤒', 'Top'], ['vcenter', '↕', 'Middle'], ['bottom', '⤓', 'Bottom']
      ].forEach(function (a) {
        var b = self.mk('button', null, a[1]);
        b.type = 'button';
        b.title = a[2];
        b.addEventListener('click', function () { self.align(a[0]); });
        bar.appendChild(b);
      });
      if (sel.length > 2) {
        [['hdist', '⇹', 'Distribute horizontally'], ['vdist', '⇳', 'Distribute vertically']].forEach(function (a) {
          var b = self.mk('button', null, a[1]);
          b.type = 'button';
          b.title = a[2];
          b.addEventListener('click', function () { self.distribute(a[0]); });
          bar.appendChild(b);
        });
      }
      this.host.appendChild(bar);

      /* property groups */
      SCHEMA.forEach(function (group) {
        var applicable = sel.filter(function (l) { return !group.when || group.when(l); });
        if (!applicable.length) return;

        var sec = self.mk('section', 'insp-group');
        var h = self.mk('h4', null, group.title + '<span class="chev">▾</span>');
        sec.appendChild(h);
        var body = self.mk('div', 'insp-body');

        group.fields.forEach(function (f) {
          var value = M.getPath(applicable[0], f.k);
          var row = self.control(f, value, theme, applicable[0]);
          if (row) {
            row.dataset.path = f.k;
            body.appendChild(row);
          }
        });

        if (group.action) {
          var actRow = self.mk('div', 'act-row single');
          var actBtn = self.mk('button', null, group.action.label);
          actBtn.type = 'button';
          actBtn.addEventListener('click', function () { self[group.action.fn](); });
          actRow.appendChild(actBtn);
          body.appendChild(actRow);
        }

        if (group.note) {
          var note = self.mk('div', 'hint');
          note.textContent = group.note;
          body.appendChild(note);
        }
        sec.appendChild(body);
        h.addEventListener('click', function () { sec.classList.toggle('collapsed'); });
        self.host.appendChild(sec);
      });

      /* arrange */
      var arrange = this.mk('section', 'insp-group');
      arrange.appendChild(this.mk('h4', null, 'Arrange<span class="chev">▾</span>'));
      var ab = this.mk('div', 'insp-body');
      var orderRow = this.mk('div', 'act-row');
      [['top', 'Front'], ['up', 'Up'], ['down', 'Down'], ['bottom', 'Back']].forEach(function (o) {
        var b = self.mk('button', null, o[1]);
        b.type = 'button';
        b.addEventListener('click', function () { M.selected().forEach(function (l) { M.reorder(l.id, o[0]); }); });
        orderRow.appendChild(b);
      });
      ab.appendChild(orderRow);

      var actRow = this.mk('div', 'act-row');
      [['duplicate', 'Duplicate'], ['lock', sel[0].locked ? 'Unlock' : 'Lock'],
        ['hide', sel[0].hidden ? 'Show' : 'Hide'], ['delete', 'Delete']
      ].forEach(function (a) {
        var b = self.mk('button', a[0] === 'delete' ? 'danger' : null, a[1]);
        b.type = 'button';
        b.addEventListener('click', function () {
          if (a[0] === 'duplicate') M.duplicate();
          if (a[0] === 'delete') M.remove(M.selIds());
          if (a[0] === 'lock') { M.setSel('locked', !sel[0].locked); M.commit(true); }
          if (a[0] === 'hide') {
            M.setSel('hidden', !sel[0].hidden);
            M.commit(true);
            OS.Render.draw();
          }
          self.render();
          self.renderLayers();
        });
        actRow.appendChild(b);
      });
      ab.appendChild(actRow);
      arrange.appendChild(ab);
      this.host.appendChild(arrange);
    },

    /* ---------------- controls ---------------- */
    control: function (f, value, theme, layer) {
      var self = this;
      var row;

      function commit(v) {
        M.setSel(f.k, v);
        self.renderLayers();
      }

      if (f.type === 'num') {
        row = this.fieldEl(f.label, f.full);
        var inp = document.createElement('input');
        inp.type = 'number';
        inp.value = value == null ? 0 : value;
        if (f.step) inp.step = f.step;
        inp.dataset.kind = 'num';
        inp.addEventListener('input', function () {
          var v = parseFloat(inp.value);
          if (isNaN(v)) return;
          commit(v);
        });
        var wrap = this.mk('div', 'field-row');
        wrap.appendChild(inp);
        if (f.suffix) wrap.appendChild(this.mk('em', null, f.suffix));
        row.appendChild(wrap);
        return row;
      }

      if (f.type === 'range') {
        row = this.fieldEl(f.label, true);
        var r = document.createElement('input');
        r.type = 'range';
        r.min = f.min != null ? f.min : 0;
        r.max = f.max != null ? f.max : 1;
        r.step = f.step || 0.01;
        r.value = value == null ? 1 : value;
        r.dataset.kind = 'range';
        var out = this.mk('span', 'range-val', Math.round((value == null ? 1 : value) * 100) + '%');
        var rw = this.mk('div', 'field-row');
        rw.appendChild(r);
        rw.appendChild(out);
        r.addEventListener('input', function () {
          out.textContent = Math.round(parseFloat(r.value) * 100) + '%';
          commit(parseFloat(r.value));
        });
        row.appendChild(rw);
        return row;
      }

      if (f.type === 'check') {
        row = this.fieldEl(f.label);
        row.classList.add('field-check');
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!value;
        cb.dataset.kind = 'check';
        cb.addEventListener('change', function () { commit(cb.checked); });
        row.appendChild(cb);
        return row;
      }

      if (f.type === 'select') {
        row = this.fieldEl(f.label, f.full);
        var s = document.createElement('select');
        s.dataset.kind = 'select';
        f.options.forEach(function (o) {
          var op = document.createElement('option');
          op.value = o[0];
          op.textContent = o[1];
          if (String(value) === o[0]) op.selected = true;
          s.appendChild(op);
        });
        s.addEventListener('change', function () {
          var v = s.value;
          if (f.k === 'text.weight') v = parseInt(v, 10);
          commit(v);
        });
        row.appendChild(s);
        return row;
      }

      if (f.type === 'seg') {
        row = this.fieldEl(f.label, true);
        var seg = this.mk('div', 'seg');
        f.options.forEach(function (o) {
          var b = self.mk('button', String(value) === o[0] ? 'on' : null, o[1]);
          b.type = 'button';
          b.addEventListener('click', function () {
            U.$$('button', seg).forEach(function (x) { x.classList.remove('on'); });
            b.classList.add('on');
            commit(o[0]);
          });
          seg.appendChild(b);
        });
        row.appendChild(seg);
        return row;
      }

      if (f.type === 'textarea') {
        row = this.fieldEl(f.label, true);
        var ta = document.createElement('textarea');
        ta.value = value == null ? '' : value;
        ta.rows = 3;
        ta.dataset.kind = 'textarea';
        ta.addEventListener('input', function () { commit(ta.value); });
        row.appendChild(ta);
        return row;
      }

      if (f.type === 'text') {
        row = this.fieldEl(f.label, f.full);
        var ti = document.createElement('input');
        ti.type = 'text';
        ti.value = value == null ? '' : value;
        ti.dataset.kind = 'text';
        ti.addEventListener('input', function () { commit(ti.value); });
        row.appendChild(ti);
        return row;
      }

      if (f.type === 'color') {
        row = this.fieldEl(f.label, f.full !== false);
        var cr = this.mk('div', 'color-row');
        var swatch = document.createElement('input');
        swatch.type = 'color';
        swatch.value = toHex(P.color(value, theme));
        swatch.dataset.kind = 'color';
        var txt = document.createElement('input');
        txt.type = 'text';
        txt.value = value == null ? '' : value;
        txt.dataset.kind = 'colortext';
        swatch.addEventListener('input', function () {
          txt.value = swatch.value;
          commit(swatch.value);
        });
        txt.addEventListener('input', function () { commit(txt.value.trim()); });
        cr.appendChild(swatch);
        cr.appendChild(txt);
        row.appendChild(cr);
        return row;
      }

      if (f.type === 'font') {
        row = this.fieldEl(f.label, true);
        var fi = document.createElement('input');
        fi.type = 'text';
        fi.value = value || '';
        fi.setAttribute('list', 'fontlist');
        fi.dataset.kind = 'text';
        fi.addEventListener('input', function () { commit(fi.value); });
        row.appendChild(fi);
        var quick = document.createElement('select');
        quick.className = 'font-quick';
        quick.style.marginTop = '5px';
        var o0 = document.createElement('option');
        o0.textContent = 'Preset…';
        o0.value = '';
        quick.appendChild(o0);
        P.FONTS.forEach(function (ft) {
          var op = document.createElement('option');
          op.value = ft.value;
          op.textContent = ft.label;
          quick.appendChild(op);
        });
        quick.addEventListener('change', function () {
          if (!quick.value) return;
          fi.value = quick.value;
          commit(quick.value);
        });
        row.appendChild(quick);
        return row;
      }

      if (f.type === 'image') {
        row = this.fieldEl(f.label, true);
        var iw = this.mk('div', 'img-picker');
        var prev = this.mk('div', 'img-prev');
        if (value) prev.style.backgroundImage = 'url("' + value + '")';
        var file = document.createElement('input');
        file.type = 'file';
        file.accept = OS.Images ? OS.Images.ACCEPT : 'image/*';
        file.title = 'PNG, JPG, GIF (stays animated), WebP or SVG';
        file.addEventListener('change', function () {
          var f2 = file.files && file.files[0];
          if (!f2) return;
          var fr = new FileReader();
          fr.onload = function () {
            commit(fr.result);
            prev.style.backgroundImage = 'url("' + fr.result + '")';
          };
          fr.readAsDataURL(f2);
        });
        var url = document.createElement('input');
        url.type = 'text';
        url.placeholder = '…or paste an image URL';
        url.addEventListener('change', function () {
          if (!url.value.trim()) return;
          commit(url.value.trim());
          prev.style.backgroundImage = 'url("' + url.value.trim() + '")';
        });
        iw.appendChild(prev);
        iw.appendChild(file);
        iw.appendChild(url);
        row.appendChild(iw);
        return row;
      }

      return null;
    },

    focusField: function (path) {
      var row = this.host.querySelector('[data-path="' + path + '"]');
      return row ? row.querySelector('textarea, input[type="text"]') : null;
    },

    syncValues: function () {
      if (!this.host) return;
      var sel = M.selected();
      if (!sel.length) return;
      var layer = sel[0];
      U.$$('.field', this.host).forEach(function (row) {
        var path = row.dataset.path;
        if (!path) return;
        var v = M.getPath(layer, path);
        var inp = row.querySelector('[data-kind]');
        if (!inp || document.activeElement === inp) return;
        var kind = inp.dataset.kind;
        if (kind === 'num' && parseFloat(inp.value) !== v) inp.value = v;
        else if (kind === 'range') {
          if (parseFloat(inp.value) !== v) inp.value = v;
          var out = row.querySelector('.range-val');
          if (out) out.textContent = Math.round(v * 100) + '%';
        } else if (kind === 'colortext' && document.activeElement !== inp) inp.value = v;
      });
    },

    /* ---------------- alignment ---------------- */
    align: function (kind) {
      var sel = M.selected();
      if (!sel.length) return;
      if (sel.length === 1) {
        var l = sel[0];
        if (kind === 'left') l.x = 0;
        if (kind === 'right') l.x = 1920 - l.w;
        if (kind === 'hcenter') l.x = Math.round((1920 - l.w) / 2);
        if (kind === 'top') l.y = 0;
        if (kind === 'bottom') l.y = 1080 - l.h;
        if (kind === 'vcenter') l.y = Math.round((1080 - l.h) / 2);
      } else {
        var minX = Math.min.apply(null, sel.map(function (o) { return o.x; }));
        var maxX = Math.max.apply(null, sel.map(function (o) { return o.x + o.w; }));
        var minY = Math.min.apply(null, sel.map(function (o) { return o.y; }));
        var maxY = Math.max.apply(null, sel.map(function (o) { return o.y + o.h; }));
        sel.forEach(function (o) {
          if (kind === 'left') o.x = minX;
          if (kind === 'right') o.x = maxX - o.w;
          if (kind === 'hcenter') o.x = Math.round((minX + maxX) / 2 - o.w / 2);
          if (kind === 'top') o.y = minY;
          if (kind === 'bottom') o.y = maxY - o.h;
          if (kind === 'vcenter') o.y = Math.round((minY + maxY) / 2 - o.h / 2);
        });
      }
      M.commit();
      this.render();
    },

    stagger: function () {
      var sel = M.selected().slice();
      if (sel.length < 2) {
        U.toast('Select two or more layers to stagger', 'warn');
        return;
      }
      sel.forEach(function (l, i) {
        if (!l.anim) l.anim = {};
        l.anim.offset = Math.round(i * 12) / 100;
      });
      M.commit();
      this.render();
      U.toast('Staggered ' + sel.length + ' layers');
    },

    distribute: function (kind) {
      var sel = M.selected().slice();
      if (sel.length < 3) return;
      if (kind === 'hdist') {
        sel.sort(function (a, b) { return a.x - b.x; });
        var first = sel[0], last = sel[sel.length - 1];
        var span = (last.x + last.w) - first.x;
        var totalW = sel.reduce(function (s, l) { return s + l.w; }, 0);
        var gap = (span - totalW) / (sel.length - 1);
        if (gap >= 0) {
          var cursor = first.x;
          sel.forEach(function (l) { l.x = Math.round(cursor); cursor += l.w + gap; });
        } else {
          /* objects overlap: space centres evenly instead of forcing gaps */
          var c0 = first.x + first.w / 2, c1 = last.x + last.w / 2;
          var stepC = (c1 - c0) / (sel.length - 1);
          sel.forEach(function (l, i) { l.x = Math.round(c0 + stepC * i - l.w / 2); });
        }
      } else {
        sel.sort(function (a, b) { return a.y - b.y; });
        var firstY = sel[0], lastY = sel[sel.length - 1];
        var spanY = (lastY.y + lastY.h) - firstY.y;
        var totalH = sel.reduce(function (s, l) { return s + l.h; }, 0);
        var gapY = (spanY - totalH) / (sel.length - 1);
        if (gapY >= 0) {
          var cur = firstY.y;
          sel.forEach(function (l) { l.y = Math.round(cur); cur += l.h + gapY; });
        } else {
          var r0 = firstY.y + firstY.h / 2, r1 = lastY.y + lastY.h / 2;
          var stepR = (r1 - r0) / (sel.length - 1);
          sel.forEach(function (l, i) { l.y = Math.round(r0 + stepR * i - l.h / 2); });
        }
      }
      M.commit();
      this.render();
      U.toast('Distribution applied');
    },

    /* ---------------- layer stack ---------------- */
    renderLayers: function () {
      if (!this.layersHost) return;
      var host = this.layersHost;
      var layers = M.layers();
      host.innerHTML = '';

      if (!layers.length) {
        host.innerHTML = '<div class="layers-empty">No layers yet — add one from the left panel.</div>';
        return;
      }

      for (var i = layers.length - 1; i >= 0; i--) {
        var l = layers[i];
        var row = this.mk('div', 'layer-row' + (M.isSelected(l.id) ? ' is-selected' : '') + (l.hidden ? ' is-hidden' : ''));
        row.dataset.id = l.id;
        row.draggable = true;
        row.innerHTML =
          '<span class="ly-ico ly-ico-' + l.type + '"></span>' +
          '<span class="ly-name"></span>' +
          '<button class="ly-btn" data-t="vis" title="Show / hide"><svg class="ic"><use href="#i-eye"/></svg></button>' +
          '<button class="ly-btn" data-t="lock" title="Lock"><svg class="ic"><use href="#i-lock"/></svg></button>';
        row.querySelector('.ly-name').textContent = l.name || l.type;
        if (l.locked) row.querySelector('[data-t="lock"]').style.color = 'var(--a2)';
        if (l.hidden) row.querySelector('[data-t="vis"]').style.color = 'var(--a2)';
        host.appendChild(row);
      }
    }
  };

  OS.Inspector = I;
})(window.OS = window.OS || {});
