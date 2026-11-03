/* ==========================================================================
   Twitch Overlay Studio — app.js
   Boot, panels, command palette, context menu, quickbar, shortcuts.
   ========================================================================== */
(function (OS) {
  'use strict';
  var U = OS.U, M = OS.Model, R = OS.Render, E = OS.Editor, I = OS.Inspector, X = OS.Exporter, P = OS.Presets;

  var App = {
    clipboard: [],
    preview: false,
    _drawQueued: false,
    _pal: { items: [], idx: 0, open: false },

    /* ------------------------------------------------------------------ */
    init: function () {
      var saved = M.load();
      M.init(saved || M.newDoc());
      M.ensureValid();

      R.init({ stage: U.$('#stage'), bg: U.$('#stageBg'), host: U.$('#stageLayers') });
      E.init({
        stage: U.$('#stage'),
        fit: U.$('#stageFit'),
        scroll: U.$('#stageScroll'),
        overlay: U.$('#stageSel'),
        guides: U.$('#stageGuides'),
        marquee: U.$('#stageMarquee')
      });
      I.init({ host: U.$('#inspector'), layers: U.$('#layers'), title: U.$('#inspTitle'), sub: U.$('#inspSub') });

      this.fillFontList();
      this.restorePrefs();
      this.bindTop();
      this.bindAnimate();
      this.bindTabs();
      this.bindScenes();
      this.bindAdd();
      this.bindThemes();
      this.bindPacks();
      this.bindBrand();
      this.bindStageTools();
      this.bindLayers();
      this.bindKeys();
      this.bindModal();
      this.bindPalette();
      this.bindContextMenu();
      this.bindQuickbar();

      var self = this;
      M.on('change', function () { self.scheduleDraw(); self.scheduleThumbs(); });
      M.on('reset', function () { self.renderAll(); });
      M.on('sel', function () {
        E.updateOverlay();
        I.render();
        I.renderLayers();
        self.updateQuickbar();
      });
      M.on('commit', function () {
        self.paintScenes();
        self.countLayers();
        self.markSaved();
      });
      M.on('history', function () { self.updateHistory(); });
      M.on('scenes', function () { self.paintScenes(); });

      this.renderAll();
      this.renderFrameGrid();
      this.startClock();
      window.addEventListener('resize', U.debounce(function () { E.setZoom(0); }, 160));
      setTimeout(function () { E.setZoom(0); }, 40);
    },

    onZoom: function (z) {
      var el = U.$('#zoomLabel');
      if (el) el.textContent = Math.round(z * 100) + '%';
    },

    fillFontList: function () {
      var dl = U.$('#fontlist');
      if (!dl) return;
      dl.innerHTML = P.FONTS.map(function (f) {
        return '<option value="' + U.esc(f.value) + '">' + U.esc(f.label) + '</option>';
      }).join('');
    },

    /* ---------------- render scheduling ---------------- */
    scheduleDraw: function () {
      if (this._drawQueued) return;
      this._drawQueued = true;
      var self = this;
      requestAnimationFrame(function () {
        self._drawQueued = false;
        R.draw();
        E.updateOverlay();
        self.countLayers();
      });
    },
    scheduleThumbs: U.debounce(function () {
      this.refreshThumbs();
    }, 420),

    /* ------------------------------------------------------------------ */
    renderAll: function () {
      R.draw();
      E.updateOverlay();
      I.render();
      I.renderLayers();
      this.paintScenes();
      this.paintThemes();
      this.paintBrand();
      this.countLayers();
      this.updateHistory();
      this.updateQuickbar();
      this.markSaved();

      U.$('#projectName').value = M.doc.name || '';
      var s = M.scene();
      U.$('#sceneName').textContent = s ? s.name : '—';
      U.$('#bgToggle').checked = !!(s && s.bgOn);
    },

    countLayers: function () {
      var n = M.layers().length;
      U.$('#layerCount').textContent = n;
      U.$('#stageMeta').textContent = '1920 × 1080 · ' + n + ' layers';
      U.$('#statusScene').textContent = (M.scene() ? M.scene().name : '') + ' — ' + n + ' layers';
      U.$('#projBadge').textContent = M.doc.scenes.length + ' scene' + (M.doc.scenes.length === 1 ? '' : 's');
    },

    markSaved: function () {
      var el = U.$('#statusSaved');
      if (!el) return;
      var d = new Date();
      el.textContent = 'saved ' + U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
    },

    updateHistory: function () {
      var u = U.$('#btnUndo'), r = U.$('#btnRedo');
      if (u) { u.disabled = !M.canUndo(); u.style.opacity = u.disabled ? .35 : 1; }
      if (r) { r.disabled = !M.canRedo(); r.style.opacity = r.disabled ? .35 : 1; }
    },

    /* ------------------------------------------------------------------ */
    /* scenes (with live thumbnails)                                      */
    /* ------------------------------------------------------------------ */
    paintScenes: function () {
      var host = U.$('#sceneList');
      if (!host) return;
      var doc = M.doc, self = this;
      host.innerHTML = '';

      doc.scenes.forEach(function (s) {
        var item = document.createElement('div');
        item.className = 'scene-item' + (s.id === doc.currentSceneId ? ' active' : '');
        item.dataset.id = s.id;
        item.title = s.name;
        item.setAttribute('role', 'button');
        item.tabIndex = 0;
        item.innerHTML =
          '<span class="scene-thumb"><canvas width="160" height="90"></canvas></span>' +
          '<span class="scene-meta"><b></b><i></i></span>' +
          '<span class="scene-act">' +
          '<button class="sact" data-sact="dup" title="Duplicate scene"><svg class="ic" style="width:12px;height:12px"><use href="#i-copy"/></svg></button>' +
          '<button class="sact" data-sact="del" title="Delete scene">✕</button>' +
          '</span>';
        item.querySelector('b').textContent = s.name;
        item.querySelector('i').textContent = s.layers.length + ' layers · ' + (s.bgOn ? 'full' : 'transparent');
        self.drawThumb(s, item.querySelector('canvas'));

        item.addEventListener('click', function (e) {
          var act = e.target.closest('[data-sact]');
          if (act) {
            e.stopPropagation();
            if (act.dataset.sact === 'dup') M.duplicateScene(s.id);
            if (act.dataset.sact === 'del') {
              if (doc.scenes.length <= 1) { U.toast('Keep at least one scene', 'warn'); return; }
              self.confirm('Delete scene', 'Remove “' + s.name + '” and its layers?', function () { M.deleteScene(s.id); });
            }
            return;
          }
          if (s.id !== M.doc.currentSceneId) M.selectScene(s.id);
        });
        item.addEventListener('dblclick', function (e) {
          if (e.target.closest('[data-sact]')) return;
          self.promptRename(s);
        });
        item.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') M.selectScene(s.id);
        });
        host.appendChild(item);
      });
    },

    drawThumb: function (scene, canvas) {
      if (!canvas) return;
      try {
        var theme = P.themeById(scene.themeId || M.doc.themeId);
        var shot = X.renderScene(scene, 1 / 12, theme, M.doc, {});
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 160, 90);
        ctx.drawImage(shot, 0, 0, 160, 90);
      } catch (e) { /* thumbnails are cosmetic */ }
    },

    refreshThumbs: function () {
      var host = U.$('#sceneList');
      if (!host) return;
      var self = this;
      U.$$('.scene-item', host).forEach(function (item) {
        var s = M.sceneById(item.dataset.id);
        if (!s) return;
        self.drawThumb(s, item.querySelector('canvas'));
        item.title = s.name;
        var meta = item.querySelector('i');
        if (meta) meta.textContent = s.layers.length + ' layers · ' + (s.bgOn ? 'full' : 'transparent');
      });
    },

    promptRename: function (scene) {
      var name = prompt('Scene name', scene.name);
      if (name && name.trim()) M.renameScene(scene.id, name.trim());
    },

    bindScenes: function () {
      U.$('#btnAddScene').addEventListener('click', function () { M.addScene(); E.setZoom(0); });
    },

    /* ------------------------------------------------------------------ */
    /* add / components                                                   */
    /* ------------------------------------------------------------------ */
    bindAdd: function () {
      var self = this;
      U.$('#addGrid').addEventListener('click', function (e) {
        var b = e.target.closest('[data-add]');
        if (b) self.addElement(b.dataset.add);
      });
      U.$('#compList').addEventListener('click', function (e) {
        var b = e.target.closest('[data-comp]');
        if (b) self.addComponent(b.dataset.comp);
      });
    },

    /* Visual picker for every rim-frame style */
    renderFrameGrid: function () {
      var host = U.$('#frameGrid');
      if (!host || !OS.Frames) return;
      var theme = M.theme();
      host.innerHTML = '';
      var count = U.$('#frameCount');
      if (count) count.textContent = String(OS.Frames.STYLES.length);
      OS.Frames.STYLES.forEach(function (pair) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'frame-chip';
        b.dataset.add = 'frame-' + pair[0];
        b.title = 'Add ' + pair[1];
        var prev = document.createElement('span');
        prev.className = 'fc-prev';
        try {
          prev.appendChild(OS.Frames.svg({
            frame: { style: pair[0], thickness: 2, cut: 16, gap: 6, accent: 'left', accentColor: '@secondary' },
            border: { color: '@line' }
          }, theme, 128, 64));
        } catch (e) { /* preview is optional */ }
        var nm = document.createElement('span');
        nm.className = 'fc-name';
        nm.textContent = pair[1];
        b.appendChild(prev);
        b.appendChild(nm);
        b.addEventListener('click', function () { OS.App.addElement('frame-' + pair[0]); });
        host.appendChild(b);
      });
    },

    addElement: function (type) {
      var theme = M.theme();
      var cx = 960, cy = 540;
      var layer;
      if (type === 'panel') {
        layer = P.panel(cx - 320, cy - 180, 640, 360, {
          name: 'Panel', cut: theme.cut || 18,
          border: { w: 2, color: '@line', glow: 20, glowColor: '@glow' }
        });
      } else if (type === 'text') {
        layer = P.text(cx - 400, cy - 70, 800, 140, 'YOUR TEXT', {
          name: 'Text', text: { size: 76, weight: 900, ls: 4, glow: 26, glowColor: '@glow' }
        });
      } else if (type === 'image') {
        layer = P.make('image', { name: 'Image', x: cx - 240, y: cy - 160, w: 480, h: 320 });
      } else if (type === 'camera') {
        layer = P.make('camera', {
          name: 'Camera', x: cx - 320, y: cy - 180, w: 640, h: 360, cut: 16,
          border: { w: 2, color: '@line', glow: 18, glowColor: '@glow' }
        });
      } else if (type === 'chat') {
        layer = P.make('chat', { name: 'Twitch chat', x: 1480, y: 540, w: 400, h: 480 });
      } else if (type === 'clock') {
        layer = P.text(cx - 260, cy - 60, 520, 120, '{{time}}', {
          name: 'Clock',
          text: { size: 64, weight: 800, color: '@text', glow: 16, glowColor: '@glow' }
        });
      } else if (type === 'icon') {
        var search = U.$('#iconSearch');
        if (search) {
          search.focus();
          if (search.scrollIntoView) search.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        return;
      } else if (type.indexOf('frame-') === 0) {
        var style = type.slice(6);
        var meta = (OS.Frames.STYLES || []).filter(function (p) { return p[0] === style; })[0];
        layer = P.make('frame', {
          name: meta ? meta[1] : style,
          x: cx - 320, y: cy - 180, w: 640, h: 360, cut: 0,
          frame: { style: style, thickness: 3, cut: 22, gap: 9, accent: 'left', accentColor: '@secondary', glow: 16 }
        });
      }
      if (layer) {
        M.add(layer);
        E.updateOverlay();
        I.render();
        U.toast('Added ' + layer.name);
      }
    },

    addComponent: function (kind) {
      var layers = [];
      if (kind === 'label') {
        layers.push(P.panel(0, 0, 340, 64, { name: 'Button', cut: 14, border: { w: 2, color: '@line', glow: 14, glowColor: '@glow' } }));
        layers.push(P.text(0, 6, 340, 52, 'ABOUT ME', { name: 'Button label', text: { size: 24, weight: 800, ls: 4 } }));
      } else if (kind === 'alert') {
        layers.push(P.panel(0, 0, 340, 84, { name: 'Alert frame', cut: 18, border: { w: 2, color: '@line', glow: 16, glowColor: '@glow' } }));
        layers.push(P.panel(0, 14, 5, 56, {
          name: 'Alert accent', cut: 0,
          fill: { type: 'solid', c1: '@primary' }, border: { w: 0, color: 'transparent' }
        }));
        layers.push(P.text(18, 10, 300, 28, 'NEW FOLLOWER', { name: 'Alert label', text: { size: 17, weight: 700, ls: 5, color: '@accent' } }));
        layers.push(P.text(18, 40, 300, 34, 'username', { name: 'Alert value', text: { size: 24, weight: 800 } }));
      } else if (kind === 'title') {
        layers.push(P.text(0, 0, 900, 44, 'S T R E A M   I S', { name: 'Kicker', text: { size: 24, weight: 700, ls: 16, color: '@accent' } }));
        layers.push(P.text(0, 44, 900, 170, 'STARTING SOON', { name: 'Headline', text: { size: 120, weight: 900, lh: 1, glow: 34, glowColor: '@glow' } }));
      } else if (kind === 'divider') {
        layers.push(P.panel(0, 0, 480, 5, {
          name: 'Divider', cut: 0,
          fill: { type: 'gradient', c1: 'rgba(0,0,0,0)', c2: '@secondary', angle: 90 },
          border: { w: 0, color: 'transparent' }
        }));
      } else if (kind === 'socials') {
        ['{{twitch}}', '{{twitter}}', '{{youtube}}', '{{discord}}'].forEach(function (k, i) {
          var x = i * 320;
          layers.push(P.panel(x, 0, 300, 62, { name: 'Social ' + (i + 1), cut: 14, border: { w: 2, color: '@line', glow: 14, glowColor: '@glow' } }));
          layers.push(P.text(x, 8, 300, 50, k, { name: 'Social text ' + (i + 1), text: { size: 21, weight: 700, ls: 2, color: '@accent' } }));
        });
      } else if (kind === 'webcam') {
        layers.push(P.panel(0, 0, 600, 320, {
          name: 'Webcam frame', cut: 20, border: { w: 3, color: '@primary', glow: 24, glowColor: '@glow' }
        }));
        layers.push(P.make('camera', { name: 'Camera', x: 10, y: 10, w: 580, h: 300, cut: 14 }));
      }

      if (!layers.length) return;
      var box = { w: 0, h: 0 };
      layers.forEach(function (l) {
        box.w = Math.max(box.w, l.x + l.w);
        box.h = Math.max(box.h, l.y + l.h);
      });
      var ox = Math.round(960 - box.w / 2), oy = Math.round(540 - box.h / 2);
      layers.forEach(function (l) { l.x += ox; l.y += oy; });
      M.addMany(layers);
      M.select(layers.map(function (l) { return l.id; }));
      E.updateOverlay();
      I.render();
      I.renderLayers();
    },

    /* ------------------------------------------------------------------ */
    /* themes                                                             */
    /* ------------------------------------------------------------------ */
    paintThemes: function () {
      var host = U.$('#themeList');
      if (!host) return;
      var current = M.doc.themeId;
      host.innerHTML = '';
      P.THEMES.forEach(function (t) {
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'theme-card' + (t.id === current ? ' active' : '');
        card.innerHTML =
          '<span class="theme-swatch">' + t.swatch.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</span>' +
          '<b>' + U.esc(t.name) + '</b><span>' + U.esc(t.note) + '</span>';
        card.addEventListener('click', function () {
          M.applyTheme(t.id);
          App.paintThemes();
          U.toast('Theme · ' + t.name);
        });
        host.appendChild(card);
      });
    },

    bindThemes: function () { this.paintThemes(); },

    /* ------------------------------------------------------------------ */
    /* packs                                                              */
    /* ------------------------------------------------------------------ */
    bindPacks: function () {
      var host = U.$('#templateList');
      var self = this;
      P.TEMPLATES.forEach(function (t) {
        var card = document.createElement('div');
        card.className = 'tpl-card';
        card.innerHTML = '<b>' + U.esc(t.name) + '</b><p>' + U.esc(t.note) + '</p>' +
          '<div class="tpl-actions"><button data-mode="replace">Replace</button>' +
          '<button data-mode="add">Add</button></div>';
        card.addEventListener('click', function (e) {
          var b = e.target.closest('button[data-mode]');
          if (!b) return;
          if (b.dataset.mode === 'replace') {
            self.confirm('Replace scene', 'Rebuild “' + M.scene().name + '” as “' + t.name + '”?', function () {
              M.applyTemplate(t.id, 'replace');
              E.setZoom(0);
              U.toast('Scene rebuilt');
            });
          } else {
            M.applyTemplate(t.id, 'add');
            U.toast('Pack added on top');
          }
        });
        host.appendChild(card);
      });
    },

    /* ------------------------------------------------------------------ */
    /* brand                                                              */
    /* ------------------------------------------------------------------ */
    paintBrand: function () {
      var host = U.$('#brandForm');
      if (!host) return;
      if (!host.dataset.built) {
        [['channel', 'Channel'], ['twitch', 'Twitch'], ['twitter', 'X / Twitter'],
          ['youtube', 'YouTube'], ['discord', 'Discord'], ['instagram', 'Instagram'], ['tiktok', 'TikTok']
        ].forEach(function (f) {
          var label = document.createElement('label');
          label.textContent = f[1];
          var inp = document.createElement('input');
          inp.type = 'text';
          inp.dataset.key = f[0];
          inp.addEventListener('input', function () {
            M.doc.settings[f[0]] = inp.value;
            M._softCommit();
            R.draw();
            I.syncValues();
          });
          label.appendChild(inp);
          host.appendChild(label);
        });
        host.dataset.built = '1';
      }
      this.syncBrand();
    },
    syncBrand: function () {
      var s = M.doc.settings || {};
      U.$$('#brandForm input').forEach(function (inp) {
        if (document.activeElement === inp) return;
        inp.value = s[inp.dataset.key] || '';
      });
    },
    bindBrand: function () { this.paintBrand(); },

    /* ------------------------------------------------------------------ */
    /* tabs                                                               */
    /* ------------------------------------------------------------------ */
    bindTabs: function () {
      U.$('#leftTabs').addEventListener('click', function (e) {
        var b = e.target.closest('button[data-tab]');
        if (!b) return;
        U.$$('#leftTabs button').forEach(function (x) { x.classList.toggle('active', x === b); });
        U.$$('.tab-panel').forEach(function (p) { p.classList.toggle('active', p.dataset.panel === b.dataset.tab); });
        if (b.dataset.tab === 'brand') App.syncBrand();
      });
    },

    /* ------------------------------------------------------------------ */
    /* stage tools                                                        */
    /* ------------------------------------------------------------------ */
    bindStageTools: function () {
      U.$('#zoomIn').addEventListener('click', function () { E.zoomBy(0.1); });
      U.$('#zoomOut').addEventListener('click', function () { E.zoomBy(-0.1); });
      U.$('#zoomFit').addEventListener('click', function () { E.setZoom(0); });
      U.$('#zoomLabel').addEventListener('click', function () { E.setZoom(E.z > 0.99 ? 0 : 1); });
      U.$('#snapToggle').addEventListener('change', function (e) {
        E.snap = e.target.checked;
        App.savePrefs();
      });
      U.$('#bgToggle').addEventListener('change', function (e) {
        var s = M.scene();
        if (!s) return;
        s.bgOn = e.target.checked;
        M.commit();
      });
      U.$('#btnUndo').addEventListener('click', function () { M.undo(); });
      U.$('#btnRedo').addEventListener('click', function () { M.redo(); });
    },

    savePrefs: function () {
      try { localStorage.setItem('tos.prefs', JSON.stringify({ snap: E.snap })); } catch (e) { /* ignore */ }
    },
    restorePrefs: function () {
      try {
        var p = JSON.parse(localStorage.getItem('tos.prefs') || '{}');
        if (p.snap === false) { E.snap = false; U.$('#snapToggle').checked = false; }
      } catch (e) { /* ignore */ }
    },

    /* ------------------------------------------------------------------ */
    /* top bar                                                            */
    /* ------------------------------------------------------------------ */
    bindTop: function () {
      var self = this;
      U.$('#projectName').addEventListener('input', function (e) {
        M.doc.name = e.target.value || 'Untitled Overlay Bundle';
        M._softCommit();
      });

      U.$('#btnImport').addEventListener('click', function () { U.$('#fileImport').click(); });
      U.$('#fileImport').addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) return;
        var fr = new FileReader();
        fr.onload = function () {
          try {
            M.fromJSON(String(fr.result));
            self.renderAll();
            E.setZoom(0);
            U.toast('Project imported');
          } catch (err) {
            U.toast('Import failed: ' + err.message, 'error');
          }
        };
        fr.readAsText(f);
        e.target.value = '';
      });

      U.$('#btnPNG').addEventListener('click', function () { X.exportPNG(); });
      U.$('#btnVideo').addEventListener('click', function () { self.openVideo(); });
      U.$('#btnExport').addEventListener('click', function () { self.openExport(); });
      U.$('#btnHelp').addEventListener('click', function () { self.openHelp(); });
      U.$('#btnPreview').addEventListener('click', function () { self.togglePreview(); });

      /* paste a copied image straight onto the stage */
      document.addEventListener('paste', function (e) {
        var files = e.clipboardData && e.clipboardData.files;
        if (!files || !files.length) return;
        e.preventDefault();
        OS.Images.addFiles(files, { x: 960, y: 540 });
      });
    },

    /* ------------------------------------------------------------------ */
    /* modal helpers                                                      */
    /* ------------------------------------------------------------------ */
    openModal: function (html) {
      U.$('#modalBox').innerHTML = html;
      U.$('#modal').classList.remove('hidden');
      return U.$('#modalBox');
    },
    closeModal: function () { U.$('#modal').classList.add('hidden'); },
    bindModal: function () {
      var self = this;
      U.$('#modal').addEventListener('click', function (e) {
        if (e.target.id === 'modal' || e.target.dataset.close) self.closeModal();
      });
    },
    confirm: function (title, message, onYes) {
      var box = this.openModal(
        '<h2>' + U.esc(title) + '</h2><p>' + U.esc(message) + '</p>' +
        '<div class="modal-close" style="gap:8px">' +
        '<button class="btn" data-close="1" style="margin-right:8px">Cancel</button>' +
        '<button class="btn primary" data-yes="1">Continue</button></div>'
      );
      box.querySelector('[data-yes]').addEventListener('click', function () {
        App.closeModal();
        onYes();
      });
    },

    bindAnimate: function () {
      U.$$('[data-animate]').forEach(function (b) {
        b.addEventListener('click', function () { OS.ImageAnim.open(); });
      });
    },

    openExport: function () {
      var box = this.openModal(
        '<h2>Export</h2>' +
        '<p>Everything is generated in your browser — no server, no uploads.</p>' +
        '<div class="modal-actions">' +
        '<button data-x="bundle"><span class="k">⬇</span><span><b>Bundle · .zip</b><span>' + M.doc.scenes.length +
        ' scenes · html + css + runtime + baked backgrounds + project.json</span></span></button>' +
        '<button data-x="png"><span class="k">▣</span><span><b>PNG · current scene</b><span>3840×2160 still of “' +
        U.esc(M.scene().name) + '”</span></span></button>' +
        '<button data-x="pngall"><span class="k">▤</span><span><b>PNG · all scenes</b><span>Every scene as a 1920×1080 still, zipped</span></span></button>' +
        '<button data-x="video"><span class="k">▶</span><span><b>Video · .mp4</b><span>Offline render with animation, encoded in the browser</span></span></button>' +
        '<button data-x="anim"><span class="k">GIF</span><span><b>Animated · GIF / APNG</b><span>Transparent animated file for overlays and socials</span></span></button>' +
        '<button data-x="twitch"><span class="k">T</span><span><b>Twitch · panel / banner</b><span>Just the selection, fitted to exact Twitch sizes</span></span></button>' +
        '<button data-x="imageanim"><span class="k">✦</span><span><b>Animate an image</b><span>Still artwork → transparent GIF with glow, embers, sheen</span></span></button>' +
        '<button data-x="json"><span class="k">{ }</span><span><b>Project · .json</b><span>Backup, or hand it to another editor</span></span></button>' +
        '</div>' +
        '<div class="modal-close"><button class="btn" data-close="1">Close</button></div>'
      );
      box.addEventListener('click', function (e) {
        var b = e.target.closest('[data-x]');
        if (!b) return;
        var what = b.dataset.x;
        App.closeModal();
        if (what === 'bundle') X.exportBundleAndDownload();
        if (what === 'png') X.exportPNG();
        if (what === 'pngall') X.exportAllPNG();
        if (what === 'json') {
          U.download(new Blob([M.toJSON()], { type: 'application/json' }), U.slug(M.doc.name) + '.json');
          U.toast('Project JSON exported');
        }
        if (what === 'video') App.openVideo('mp4');
        if (what === 'anim') App.openVideo('gif');
        if (what === 'twitch') App.openTwitch();
        if (what === 'imageanim') OS.ImageAnim.open();
      });
    },

    openHelp: function () {
      var box = this.openModal(
        '<h2>Studio guide</h2>' +
        '<p>A scene is 1920 × 1080. Each scene becomes one OBS browser source on export.</p>' +
        '<h3>Shortcuts</h3>' +
        '<div class="help-grid">' +
        '<kbd>Ctrl K</kbd><span>Command palette</span>' +
        '<kbd>Ctrl Z</kbd><span>Undo</span>' +
        '<kbd>Ctrl ⇧ Z</kbd><span>Redo</span>' +
        '<kbd>Ctrl D</kbd><span>Duplicate selection</span>' +
        '<kbd>Ctrl C V</kbd><span>Copy / paste layers</span>' +
        '<kbd>Ctrl A</kbd><span>Select all layers</span>' +
        '<kbd>Del</kbd><span>Delete selection</span>' +
        '<kbd>Arrows</kbd><span>Nudge 1px, ⇧ for 10px</span>' +
        '<kbd>Alt drag</kbd><span>Duplicate while dragging</span>' +
        '<kbd>Drag empty</kbd><span>Marquee select</span>' +
        '<kbd>Ctrl wheel</kbd><span>Zoom</span>' +
        '<kbd>Middle drag</kbd><span>Pan</span>' +
        '<kbd>Right click</kbd><span>Context menu</span>' +
        '<kbd>Esc</kbd><span>Deselect / exit preview</span>' +
        '</div>' +
        '<h3>Tokens</h3>' +
        '<p><code>{{channel}} {{twitch}} {{twitter}} {{youtube}} {{discord}} {{time}} {{date}}</code> are filled from the Brand tab and stay live in the exported bundle.</p>' +
        '<h3>Export</h3>' +
        '<p>One HTML file per scene, a shared stylesheet, a small runtime (clock, chat, webcam) and <code>project.json</code>. Backgrounds are baked to PNG so OBS paints them once.</p>' +
        '<div class="modal-close"><button class="btn primary" data-close="1">Got it</button></div>'
      );
      box.addEventListener('click', function (e) { if (e.target.dataset.close) App.closeModal(); });
    },

    /* ------------------------------------------------------------------ */
    togglePreview: function () {
      this.preview = !this.preview;
      document.body.classList.toggle('preview-mode', this.preview);
      U.$('#btnPreview').innerHTML = this.preview
        ? '<svg class="ic"><use href="#i-play"/></svg>Exit'
        : '<svg class="ic"><use href="#i-play"/></svg>Preview';
      setTimeout(function () { E.setZoom(0); }, 40);
      this.updateQuickbar();
      if (this.preview) U.toast('Preview mode · Esc to return');
    },

    /* ------------------------------------------------------------------ */
    /* quickbar                                                           */
    /* ------------------------------------------------------------------ */
    bindQuickbar: function () {
      U.$('#quickbar').addEventListener('click', function (e) {
        var b = e.target.closest('[data-q]');
        if (!b) return;
        var q = b.dataset.q;
        if (q === 'dup') M.duplicate();
        if (q === 'front') M.selected().forEach(function (l) { M.reorder(l.id, 'top'); });
        if (q === 'back') M.selected().forEach(function (l) { M.reorder(l.id, 'bottom'); });
        if (q === 'lock') { M.setSel('locked', !M.selected()[0].locked); M.commit(true); I.render(); }
        if (q === 'delete') M.remove(M.selIds());
        App.updateQuickbar();
      });
    },

    updateQuickbar: function () {
      var bar = U.$('#quickbar');
      if (!bar) return;
      var sel = M.selected();
      bar.classList.toggle('hidden', !sel.length || this.preview);
      if (!sel.length) return;
      U.$('#qbarName').textContent = sel.length === 1 ? (sel[0].name || sel[0].type) : sel.length + ' layers';
    },

    /* ------------------------------------------------------------------ */
    /* layers panel                                                       */
    /* ------------------------------------------------------------------ */
    bindLayers: function () {
      var host = U.$('#layers');
      var dragId = null;

      host.addEventListener('click', function (e) {
        var row = e.target.closest('.layer-row');
        if (!row) return;
        var id = row.dataset.id;
        var btn = e.target.closest('.ly-btn');
        if (btn) {
          e.stopPropagation();
          var l = M.find(id);
          if (!l) return;
          if (btn.dataset.t === 'vis') l.hidden = !l.hidden;
          if (btn.dataset.t === 'lock') l.locked = !l.locked;
          M.commit(true);
          R.draw();
          I.renderLayers();
          I.render();
          return;
        }
        if (e.shiftKey) M.toggleSelect(id);
        else M.select([id]);
      });

      host.addEventListener('dblclick', function (e) {
        var row = e.target.closest('.layer-row');
        if (!row) return;
        var l = M.find(row.dataset.id);
        if (!l) return;
        var name = prompt('Layer name', l.name);
        if (name) { l.name = name; M.commit(); I.renderLayers(); }
      });

      host.addEventListener('dragstart', function (e) {
        var row = e.target.closest('.layer-row');
        if (!row) return;
        dragId = row.dataset.id;
        e.dataTransfer.effectAllowed = 'move';
      });
      host.addEventListener('dragover', function (e) {
        e.preventDefault();
        var row = e.target.closest('.layer-row');
        U.$$('.layer-row', host).forEach(function (r) { r.classList.remove('drag-over'); });
        if (row && row.dataset.id !== dragId) row.classList.add('drag-over');
      });
      host.addEventListener('dragleave', function () {
        U.$$('.layer-row', host).forEach(function (r) { r.classList.remove('drag-over'); });
      });
      host.addEventListener('drop', function (e) {
        e.preventDefault();
        var row = e.target.closest('.layer-row');
        if (!row || !dragId || row.dataset.id === dragId) return;
        var ls = M.layers();
        var from = M.indexOf(dragId), to = M.indexOf(row.dataset.id);
        if (from < 0 || to < 0) return;
        ls.splice(to, 0, ls.splice(from, 1)[0]);
        dragId = null;
        M.commit();
      });
    },

    /* ------------------------------------------------------------------ */
    /* command palette                                                    */
    /* ------------------------------------------------------------------ */
    commands: function () {
      var self = this, out = [];
      M.doc.scenes.forEach(function (s) {
        out.push({ g: 'Scenes', label: s.name, hint: s.layers.length + ' layers', run: function () { M.selectScene(s.id); E.setZoom(0); } });
      });
      ['panel', 'text', 'image', 'camera', 'chat', 'clock'].forEach(function (t) {
        out.push({ g: 'Add layer', label: 'Add ' + t, run: function () { self.addElement(t); } });
      });
      P.TEMPLATES.forEach(function (t) {
        out.push({ g: 'Packs', label: 'New scene · ' + t.name, run: function () { M.addScene(t.id); E.setZoom(0); } });
      });
      P.THEMES.forEach(function (t) {
        out.push({ g: 'Themes', label: 'Theme · ' + t.name, run: function () { M.applyTheme(t.id); self.paintThemes(); U.toast('Theme · ' + t.name); } });
      });
      [
        ['Export bundle (.zip)', function () { X.exportBundleAndDownload(); }],
        ['Export PNG (current scene)', function () { X.exportPNG(); }],
        ['Export all scenes as PNG', function () { X.exportAllPNG(); }],
        ['Save project', function () { M.save(); self.markSaved(); }],
        ['Toggle preview mode', function () { self.togglePreview(); }],
        ['Fit stage to window', function () { E.setZoom(0); }],
        ['Undo', function () { M.undo(); }],
        ['Redo', function () { M.redo(); }],
        ['Duplicate selection', function () { M.duplicate(); }],
        ['Select all layers', function () { M.select(M.layers().map(function (l) { return l.id; })); }],
        ['Open help', function () { self.openHelp(); }]
      ].forEach(function (a) {
        out.push({ g: 'Actions', label: a[0], run: a[1] });
      });
      return out;
    },

    bindPalette: function () {
      var self = this;
      U.$('#btnPalette').addEventListener('click', function () { self.openPalette(); });
      U.$('#palette').addEventListener('mousedown', function (e) { if (e.target.id === 'palette') self.closePalette(); });
      var inp = U.$('#paletteInput');
      inp.addEventListener('input', function () { self.renderPalette(inp.value); });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); self.movePalette(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); self.movePalette(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); self.runPalette(); }
        else if (e.key === 'Escape') { e.preventDefault(); self.closePalette(); }
      });
    },

    openPalette: function () {
      this._commands = this.commands();
      this._pal.open = true;
      U.$('#palette').classList.remove('hidden');
      U.$('#paletteInput').value = '';
      this.renderPalette('');
      U.$('#paletteInput').focus();
    },
    closePalette: function () {
      this._pal.open = false;
      U.$('#palette').classList.add('hidden');
    },
    renderPalette: function (query) {
      var q = String(query || '').trim().toLowerCase();
      var items = (this._commands || []).filter(function (c) {
        return !q || c.label.toLowerCase().indexOf(q) >= 0 || c.g.toLowerCase().indexOf(q) >= 0;
      }).slice(0, 40);
      this._pal.items = items;
      this._pal.idx = 0;

      var host = U.$('#paletteList');
      if (!items.length) {
        host.innerHTML = '<div class="palette-empty">Nothing matches “' + U.esc(query) + '”</div>';
        return;
      }
      var html = '', group = null;
      items.forEach(function (c, i) {
        if (c.g !== group) { group = c.g; html += '<div class="palette-group">' + U.esc(group) + '</div>'; }
        html += '<button class="palette-item' + (i === 0 ? ' on' : '') + '" data-i="' + i + '">' +
          U.esc(c.label) + (c.hint ? '<span class="pi-hint">' + U.esc(c.hint) + '</span>' : '') + '</button>';
      });
      host.innerHTML = html;
      var self = this;
      host.onclick = function (e) {
        var b = e.target.closest('[data-i]');
        if (!b) return;
        self._pal.idx = parseInt(b.dataset.i, 10);
        self.runPalette();
      };
    },
    movePalette: function (delta) {
      var items = this._pal.items;
      if (!items.length) return;
      this._pal.idx = (this._pal.idx + delta + items.length) % items.length;
      U.$$('#paletteList .palette-item').forEach(function (el, i) {
        el.classList.toggle('on', i === this._pal.idx);
        if (i === this._pal.idx) el.scrollIntoView({ block: 'nearest' });
      }, this);
    },
    runPalette: function () {
      var c = this._pal.items[this._pal.idx];
      this.closePalette();
      if (c && c.run) setTimeout(c.run, 0);
    },

    /* ------------------------------------------------------------------ */
    /* context menu                                                       */
    /* ------------------------------------------------------------------ */
    bindContextMenu: function () {
      var self = this;
      U.$('#stage').addEventListener('contextmenu', function (e) {
        e.preventDefault();
        var el = e.target.closest('[data-id]');
        var items;
        if (el) {
          var id = el.dataset.id;
          if (!M.isSelected(id)) M.select([id]);
          items = [
            { label: 'Duplicate', kbd: 'Ctrl D', run: function () { M.duplicate(); } },
            { label: 'Bring to front', run: function () { M.selected().forEach(function (l) { M.reorder(l.id, 'top'); }); } },
            { label: 'Send to back', run: function () { M.selected().forEach(function (l) { M.reorder(l.id, 'bottom'); }); } },
            { sep: true },
            { label: 'Lock / unlock', run: function () { M.setSel('locked', !M.selected()[0].locked); M.commit(true); I.render(); } },
            { label: 'Hide layer', run: function () { M.setSel('hidden', true); M.commit(true); R.draw(); I.renderLayers(); } },
            { sep: true },
            { label: 'Delete', kbd: 'Del', danger: true, run: function () { M.remove(M.selIds()); } }
          ];
        } else {
          items = [
            { label: 'Paste', kbd: 'Ctrl V', run: function () { self.paste(); } },
            { sep: true },
            { label: 'Add panel', run: function () { self.addElement('panel'); } },
            { label: 'Add text', run: function () { self.addElement('text'); } },
            { label: 'Add camera', run: function () { self.addElement('camera'); } },
            { sep: true },
            { label: 'Fit stage', run: function () { E.setZoom(0); } }
          ];
        }
        self.showContextMenu(e.clientX, e.clientY, items);
      });
      document.addEventListener('mousedown', function (e) {
        var menu = U.$('#ctxMenu');
        if (!menu.contains(e.target)) menu.classList.add('hidden');
      });
      window.addEventListener('blur', function () { U.$('#ctxMenu').classList.add('hidden'); });
    },

    showContextMenu: function (x, y, items) {
      var menu = U.$('#ctxMenu');
      menu.innerHTML = items.map(function (it, i) {
        if (it.sep) return '<div class="ctx-sep"></div>';
        return '<button data-i="' + i + '"' + (it.danger ? ' class="danger"' : '') + '>' +
          U.esc(it.label) + (it.kbd ? '<span class="ctx-hint">' + it.kbd + '</span>' : '') + '</button>';
      }).join('');
      menu.classList.remove('hidden');
      var r = menu.getBoundingClientRect();
      menu.style.left = Math.min(x, window.innerWidth - r.width - 12) + 'px';
      menu.style.top = Math.min(y, window.innerHeight - r.height - 12) + 'px';
      menu.onclick = function (e) {
        var b = e.target.closest('[data-i]');
        if (!b) return;
        menu.classList.add('hidden');
        var it = items[parseInt(b.dataset.i, 10)];
        if (it && it.run) setTimeout(it.run, 0);
      };
    },

    /* ------------------------------------------------------------------ */
    /* clipboard                                                          */
    /* ------------------------------------------------------------------ */
    copy: function () {
      this.clipboard = U.clone(M.selected());
      if (this.clipboard.length) U.toast(this.clipboard.length + ' layer' + (this.clipboard.length === 1 ? '' : 's') + ' copied');
    },
    paste: function () {
      if (!this.clipboard.length) return;
      var copies = this.clipboard.map(function (l) {
        var c = U.clone(l);
        c.id = U.uid('l');
        c.x += 28; c.y += 28;
        return c;
      });
      this.clipboard = U.clone(copies);
      M.addMany(copies);
      M.select(copies.map(function (l) { return l.id; }));
      I.render();
    },

    /* ------------------------------------------------------------------ */
    /* keyboard                                                           */
    /* ------------------------------------------------------------------ */
    bindKeys: function () {
      var self = this;
      document.addEventListener('keydown', function (e) {
        var tag = (e.target.tagName || '').toLowerCase();
        var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
        var ctrl = e.ctrlKey || e.metaKey;

        if (e.key === 'Escape') {
          if (!U.$('#ctxMenu').classList.contains('hidden')) { U.$('#ctxMenu').classList.add('hidden'); return; }
          if (self._pal.open) { self.closePalette(); return; }
          if (!U.$('#modal').classList.contains('hidden')) { self.closeModal(); return; }
          if (self.preview) { self.togglePreview(); return; }
          if (typing) { e.target.blur(); return; }
          M.select([]);
          return;
        }

        if (ctrl && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          if (self._pal.open) self.closePalette(); else self.openPalette();
          return;
        }
        if (typing) return;

        if (ctrl && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) M.redo(); else M.undo(); return; }
        if (ctrl && e.key.toLowerCase() === 'y') { e.preventDefault(); M.redo(); return; }
        if (ctrl && e.key.toLowerCase() === 's') { e.preventDefault(); M.save(); self.markSaved(); return; }
        if (ctrl && e.key.toLowerCase() === 'd') { e.preventDefault(); M.duplicate(); return; }
        if (ctrl && e.key.toLowerCase() === 'a') { e.preventDefault(); M.select(M.layers().map(function (l) { return l.id; })); return; }
        if (ctrl && e.key.toLowerCase() === 'c') { e.preventDefault(); self.copy(); return; }
        if (ctrl && e.key.toLowerCase() === 'v') {
          /* let the native paste event through when nothing was copied, so an
             image on the clipboard can be imported instead */
          if (self.clipboard.length) { e.preventDefault(); self.paste(); }
          return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (M.selIds().length) { e.preventDefault(); M.remove(M.selIds()); }
          return;
        }
        if (e.key === 'Escape') return;

        var step = e.shiftKey ? 10 : 1, moved = true;
        if (e.key === 'ArrowLeft') self.nudge(-step, 0);
        else if (e.key === 'ArrowRight') self.nudge(step, 0);
        else if (e.key === 'ArrowUp') self.nudge(0, -step);
        else if (e.key === 'ArrowDown') self.nudge(0, step);
        else moved = false;
        if (moved) e.preventDefault();
      });
    },

    /* ------------------------------------------------------------------ */
    /* animation clock                                                    */
    /* ------------------------------------------------------------------ */
    startClock: function () {
      var t0 = performance.now();
      function loop(now) {
        OS.Render.tick((now - t0) / 1000);
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    },

    /* ------------------------------------------------------------------ */
    /* video export                                                       */
    /* ------------------------------------------------------------------ */
    openVideo: function (format) {
      var startFmt = format || 'mp4';
      var box = this.openModal(
        '<h2>Render animation</h2>' +
        '<p>Frames are painted offline, so timing is exact. <b>GIF</b> and <b>APNG</b> keep a transparent background; MP4 cannot.</p>' +
        '<div class="vm-grid">' +
        '<label>Format<select id="vmFmt">' +
        '<option value="mp4"' + (startFmt === 'mp4' ? ' selected' : '') + '>MP4 · H.264</option>' +
        '<option value="gif"' + (startFmt === 'gif' ? ' selected' : '') + '>GIF · 1-bit alpha</option>' +
        '<option value="apng"' + (startFmt === 'apng' ? ' selected' : '') + '>APNG · full alpha</option>' +
        '</select></label>' +
        '<label>Source<select id="vmMode"><option value="scene">Current scene</option>' +
        '<option value="showcase">All scenes (' + M.doc.scenes.length + ')</option></select></label>' +
        '<label>Resolution<select id="vmRes">' +
        '<option value="640x360">640 × 360</option><option value="960x540">960 × 540</option>' +
        '<option value="1920x1080">1920 × 1080</option><option value="1280x720">1280 × 720</option>' +
        '<option value="2560x1440">2560 × 1440</option><option value="3840x2160">3840 × 2160</option></select></label>' +
        '<label>Frame rate<select id="vmFps"><option>30</option><option>60</option><option>24</option><option>15</option></select></label>' +
        '<label>Seconds per scene<input id="vmSec" type="number" value="8" min="1" max="180"></label>' +
        '</div>' +
        '<div class="vm-actions"><button class="btn" data-close="1">Cancel</button>' +
        '<button class="btn primary" id="vmGo">Render</button></div>' +
        '<div id="vmProg" class="vm-prog hidden"><div class="vm-bar"><i></i></div>' +
        '<span class="vm-label" id="vmLabel">0%</span>' +
        '<button class="btn" id="vmStop">Stop</button></div>' +
        '<div class="vm-note" id="vmNote"></div>'
      );

      var cancelled = false;
      box.querySelector('#vmStop').addEventListener('click', function () { cancelled = true; });

      function syncFormat() {
        var f = box.querySelector('#vmFmt').value;
        var note = box.querySelector('#vmNote');
        var resSel = box.querySelector('#vmRes');
        if (f === 'mp4') {
          note.innerHTML = '<b>MP4:</b> H.264 has no alpha, so transparent areas render over black. Camera and chat layers are placeholders.';
          if (resSel.value === '640x360' || resSel.value === '960x540') resSel.value = '1920x1080';
        } else if (f === 'gif') {
          note.innerHTML = '<b>GIF:</b> transparent background, but 1-bit alpha and 256 colours, so glows and soft edges turn hard. Capped at 960 × 540.';
          if (resSel.value === '1920x1080') resSel.value = '640x360';
        } else {
          note.innerHTML = '<b>APNG:</b> full 8-bit alpha and lossless colour — soft glows stay soft, and it drops straight onto a transparent OBS scene or any editor.';
          if (resSel.value === '1920x1080') resSel.value = '960x540';
        }
      }
      box.querySelector('#vmFmt').addEventListener('change', syncFormat);
      syncFormat();

      box.querySelector('#vmGo').addEventListener('click', function () {
        var res = String(box.querySelector('#vmRes').value || '1920x1080').split('x');
        var fmt = box.querySelector('#vmFmt').value;
        var opts = {
          mode: box.querySelector('#vmMode').value,
          seconds: Math.max(1, parseFloat(box.querySelector('#vmSec').value) || 8),
          fps: parseInt(box.querySelector('#vmFps').value, 10) || 30,
          width: parseInt(res[0], 10),
          height: parseInt(res[1], 10),
          format: fmt,
          transparent: fmt !== 'mp4'
        };
        var prog = box.querySelector('#vmProg');
        var bar = prog.querySelector('i');
        var label = box.querySelector('#vmLabel');
        var go = box.querySelector('#vmGo');
        var runner = fmt === 'mp4' ? OS.Video.export : OS.AnimExport.render;

        prog.classList.remove('hidden');
        go.disabled = true;
        go.textContent = 'Rendering…';

        runner(opts, {
          isCancelled: function () { return cancelled; },
          onProgress: function (p, info) {
            bar.style.width = Math.round(p * 100) + '%';
            label.textContent = info && info.frames
              ? info.frame + ' / ' + info.frames
              : Math.round(p * 100) + '%';
          }
        }).then(function (r) {
          U.download(r.blob, U.slug(M.doc.name) + '-overlay.' + r.ext);
          var secs = Math.round(r.ms / 1000);
          if (fmt === 'mp4') {
            U.toast(r.fallback
              ? 'Recorded ' + r.ext.toUpperCase() + ' in ' + secs + 's'
              : 'MP4 exported · ' + r.frames + ' frames · ' + secs + 's');
          } else {
            U.toast(fmt.toUpperCase() + ' exported · transparent · ' + r.frames + ' frames · ' + secs + 's');
          }
          App.closeModal();
        }).catch(function (err) {
          if (String(err && err.message) === 'cancelled') {
            U.toast('Render cancelled', 'warn');
            App.closeModal();
            return;
          }
          console.error(err);
          U.toast('Render failed: ' + (err && err.message), 'error');
          go.disabled = false;
          go.textContent = 'Render';
        });
      });
    },

    /* ------------------------------------------------------------------ */
    /* twitch panel / banner export                                       */
    /* ------------------------------------------------------------------ */
    openTwitch: function () {
      var sel = M.selected();
      var box = this.openModal(
        '<h2>Twitch · panel &amp; banner</h2>' +
        '<p>Exports only the selected layers, fitted and centred on a transparent background — ready to upload to Twitch.</p>' +
        (sel.length
          ? ''
          : '<p style="color:#ffc46b">Select the layers you want first (drag a box on the stage, or pick from the Layers tab).</p>') +
        '<div class="vm-grid">' +
        '<label>Size<select id="twPreset">' +
        '<option value="320x100">Twitch panel · 320 × 100</option>' +
        '<option value="320x160">Twitch panel · 320 × 160</option>' +
        '<option value="1200x480">Twitch banner · 1200 × 480</option>' +
        '<option value="1920x1080">Twitch offline card · 1920 × 1080</option>' +
        '<option value="1080x1080">Social square · 1080 × 1080</option>' +
        '<option value="natural">Selection · 1×</option>' +
        '<option value="natural2">Selection · 2×</option>' +
        '</select></label>' +
        '<label>Format<select id="twFmt">' +
        '<option value="png">PNG · still, full alpha</option>' +
        '<option value="gif">GIF · animated</option>' +
        '<option value="apng">APNG · animated, full alpha</option>' +
        '</select></label>' +
        '<label>Seconds<input id="twSec" type="number" value="3" min="1" max="60"></label>' +
        '<label>Frame rate<select id="twFps"><option>30</option><option>24</option><option>15</option></select></label>' +
        '</div>' +
        '<div class="vm-actions"><button class="btn" data-close="1">Cancel</button>' +
        '<button class="btn primary" id="twGo">Export</button></div>' +
        '<div id="twProg" class="vm-prog hidden"><div class="vm-bar"><i></i></div>' +
        '<span class="vm-label" id="twLabel">0%</span></div>' +
        '<div class="vm-note">Twitch panels show a still image, so <b>PNG</b> is the safe choice there. GIF and APNG are for OBS layers, alerts, thumbnails and socials.</div>'
      );

      var go = box.querySelector('#twGo');
      if (!sel.length) go.disabled = true;

      box.querySelector('#twGo').addEventListener('click', function () {
        var preset = box.querySelector('#twPreset').value;
        var opts = {
          format: box.querySelector('#twFmt').value,
          seconds: Math.max(1, parseFloat(box.querySelector('#twSec').value) || 3),
          fps: parseInt(box.querySelector('#twFps').value, 10) || 30
        };
        if (preset === 'natural') opts.scale = 1;
        else if (preset === 'natural2') opts.scale = 2;
        else { var xy = preset.split('x'); opts.width = parseInt(xy[0], 10); opts.height = parseInt(xy[1], 10); }

        var prog = box.querySelector('#twProg');
        var bar = prog.querySelector('i');
        var label = box.querySelector('#twLabel');
        prog.classList.remove('hidden');
        go.disabled = true;
        go.textContent = 'Rendering…';

        OS.AnimExport.renderSelection(opts, {
          onProgress: function (p, info) {
            bar.style.width = Math.round(p * 100) + '%';
            label.textContent = info && info.frames ? info.frame + ' / ' + info.frames : Math.round(p * 100) + '%';
          }
        }).then(function (r) {
          var tag = opts.width ? opts.width + 'x' + opts.height : 'selection';
          U.download(r.blob, U.slug(M.doc.name) + '-twitch-' + tag + '.' + r.ext);
          U.toast('Twitch export · ' + r.width + ' × ' + r.height + ' · ' + String(r.format).toUpperCase());
          App.closeModal();
        }).catch(function (err) {
          console.error(err);
          U.toast('Export failed: ' + (err && err.message), 'error');
          go.disabled = false;
          go.textContent = 'Export';
        });
      });
    },

    nudge: function (dx, dy) {
      var sel = M.selected();
      if (!sel.length) return;
      sel.forEach(function (l) {
        if (l.locked) return;
        l.x += dx;
        l.y += dy;
      });
      M.emit('change');
      M._softCommit();
      E.updateOverlay();
      I.syncValues();
    }
  };

  OS.App = App;
  document.addEventListener('DOMContentLoaded', function () {
    try {
      App.init();
    } catch (err) {
      console.error(err);
      document.body.innerHTML = '<pre style="color:#ff9b9b;padding:24px;font:13px Consolas,monospace">Startup error:\n' +
        (err && err.stack ? err.stack : err) + '</pre>';
    }
  });
})(window.OS = window.OS || {});
