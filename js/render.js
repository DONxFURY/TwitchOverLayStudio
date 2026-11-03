/* ==========================================================================
   Twitch Overlay Studio — render.js
   DOM renderer. Builds layer elements once per document change, then an
   animation tick (same maths as the MP4 renderer) drives every frame.
   ========================================================================== */
(function (OS) {
  'use strict';
  var U = OS.U, P = OS.Presets;

  var MOCK_CHAT = [
    ['pixel_nova', 'that clutch was insane'],
    ['zerograv', 'W stream'],
    ['hollow_', 'first time here, the layout is clean'],
    ['kayla.exe', 'chat is moving today'],
    ['rustydust', 'gg wp'],
    ['mira_', 'poggers'],
    ['skyline', 'what are we playing next?']
  ];

  var R = {
    stage: null,
    bgCanvas: null,
    host: null,
    ctx: null,
    sceneDur: 0,
    _t0: 0,

    init: function (cfg) {
      this.stage = cfg.stage;
      this.bgCanvas = cfg.bg;
      this.host = cfg.host;
      this.ctx = this.bgCanvas.getContext('2d');
    },

    draw: function () {
      var M = OS.Model;
      var scene = M.scene();
      if (!scene) return;
      var theme = M.theme();
      this.stage.classList.toggle('is-transparent', !scene.bgOn);
      this.paintBg(scene, theme);
      this.host.innerHTML = '';
      var frag = document.createDocumentFragment();
      var self = this;
      (scene.layers || []).forEach(function (l) {
        frag.appendChild(self.layerEl(l, theme));
      });
      this.host.appendChild(frag);
    },

    paintBg: function (scene, theme) {
      if (!scene || !scene.bgOn) {
        this.ctx.clearRect(0, 0, 1920, 1080);
        return;
      }
      if (window.OverlayPainter) {
        OverlayPainter.paint(this.ctx, 1920, 1080, scene.bg || theme.bg, scene.id);
      }
    },

    /* ---------------- one layer ---------------- */
    layerEl: function (layer, theme) {
      theme = theme || OS.Model.theme();
      var el = document.createElement('div');
      el.className = 'ly ly-' + layer.type;
      el.dataset.id = layer.id;
      el.dataset.type = layer.type;
      if (layer.name) el.dataset.name = layer.name;
      this.applyBox(el, layer);
      if (layer.hidden) el.classList.add('is-hidden');
      if (layer.locked) el.classList.add('is-locked');
      if (layer.blend && layer.blend !== 'normal') el.style.mixBlendMode = layer.blend;

      var glow = document.createElement('div');
      glow.className = 'ly-glow';
      var f = [];
      if (layer.shadow) {
        f.push('drop-shadow(0 ' + Math.round((layer.shadow || 0) * 0.35) + 'px ' + layer.shadow + 'px ' + (layer.shadowColor || 'rgba(0,0,0,.6)') + ')');
      }
      var bw = (layer.border && layer.border.w) || 0;
      if (layer.border && layer.border.glow) {
        f.push('drop-shadow(0 0 ' + layer.border.glow + 'px ' + P.color(layer.border.glowColor, theme) + ')');
      }
      if (layer.frame && layer.frame.glow) {
        f.push('drop-shadow(0 0 ' + layer.frame.glow + 'px ' + P.color(layer.frame.accentColor || '@glow', theme) + ')');
      }
      if (f.length) glow.style.filter = f.join(' ');

      var frame = document.createElement('div');
      frame.className = 'ly-frame';
      if (bw > 0) {
        frame.style.background = P.color(layer.border.color, theme);
        frame.style.clipPath = layer.cut ? P.ring(layer, layer.w, layer.h, bw) : 'none';
        frame.style.borderRadius = P.radius(layer, 0) + 'px';
      } else {
        frame.style.display = 'none';
      }

      var inner = document.createElement('div');
      inner.className = 'ly-inner';
      inner.style.inset = bw + 'px';
      inner.style.background = P.fillCSS(layer.fill, theme);
      inner.style.clipPath = layer.cut ? P.clip(layer, layer.w, layer.h, bw) : 'none';
      inner.style.borderRadius = P.radius(layer, bw) + 'px';

      this.fillContent(inner, layer, theme);

      if (layer.anim && layer.anim.type === 'sweep') {
        var sweep = document.createElement('div');
        sweep.className = 'ly-sweep';
        sweep.innerHTML = '<i></i>';
        inner.appendChild(sweep);
      }

      glow.appendChild(frame);
      glow.appendChild(inner);
      el.appendChild(glow);
      return el;
    },

    applyBox: function (el, layer) {
      el.style.left = layer.x + 'px';
      el.style.top = layer.y + 'px';
      el.style.width = Math.max(1, layer.w) + 'px';
      el.style.height = Math.max(1, layer.h) + 'px';
      el.style.transform = 'rotate(' + (layer.rot || 0) + 'deg)';
      el.style.opacity = layer.opacity == null ? 1 : layer.opacity;
    },

    updateLive: function (layer) {
      var el = this.host.querySelector('[data-id="' + layer.id + '"]');
      if (el) this.applyBox(el, layer);
    },

    refresh: function (layer) {
      var el = this.host.querySelector('[data-id="' + layer.id + '"]');
      if (!el) return;
      el.parentNode.replaceChild(this.layerEl(layer), el);
    },

    /* ---------------- animated state ---------------- */
    tick: function (t) {
      var M = OS.Model;
      var scene = M.scene();
      if (!scene || !this.host) return;
      var doc = M.doc;
      var dur = this.sceneDur || 0;
      var layers = scene.layers;
      for (var i = 0; i < layers.length; i++) {
        var l = layers[i];
        if (l.hidden) continue;
        var el = this.host.querySelector('[data-id="' + l.id + '"]');
        if (!el) continue;
        var st = OS.Anim.state(l, t, dur);
        el.style.transform =
          'translate3d(' + st.dx.toFixed(2) + 'px,' + st.dy.toFixed(2) + 'px,0) rotate(' +
          (Math.round(((l.rot || 0) + st.rot) * 100) / 100) + 'deg) scale(' + st.scale.toFixed(4) + ')';
        el.style.opacity = (l.opacity == null ? 1 : l.opacity) * Math.max(0, Math.min(1, st.opacity));
        if (st.blur > 0.3) el.style.filter = 'blur(' + st.blur.toFixed(1) + 'px)';
        else if (el.style.filter) el.style.filter = '';

        if (OS.Anim.dynamicText(l)) {
          var tx = el.querySelector('.ly-text');
          if (tx) tx.textContent = OS.Anim.text(l, t, doc);
        }
        if (l.anim && l.anim.type === 'sweep') {
          var sw = el.querySelector('.ly-sweep');
          if (sw) sw.style.transform = 'translateX(' + (-120 + st.sweep * 240).toFixed(2) + '%)';
        }
      }
    },

    /* ---------------- content ---------------- */
    fillContent: function (box, layer, theme) {
      var doc = OS.Model.doc;

      if (layer.type === 'frame') {
        if (OS.Frames) box.appendChild(OS.Frames.svg(layer, theme, layer.w, layer.h));
        return;
      }

      if (layer.type === 'text') {
        var t = layer.text;
        var d = document.createElement('div');
        d.className = 'ly-text';
        d.style.fontFamily = P.font(t.font, theme) || 'inherit';
        d.style.fontSize = (t.size || 32) + 'px';
        if (t.weight) d.style.fontWeight = t.weight;
        d.style.fontStyle = t.italic ? 'italic' : 'normal';
        d.style.color = P.color(t.color, theme);
        d.style.letterSpacing = (t.ls || 0) + 'px';
        d.style.lineHeight = t.lh || 1.05;
        d.style.textAlign = t.align || 'center';
        d.style.textTransform = t.upper ? 'uppercase' : 'none';
        if (t.glow) d.style.textShadow = '0 0 ' + t.glow + 'px ' + P.color(t.glowColor, theme);
        d.textContent = OS.Anim.dynamicText(layer)
          ? OS.Anim.text(layer, this._t0, doc)
          : U.tokens(t.value, doc && doc.settings);
        box.appendChild(d);
        return;
      }

      if (layer.type === 'image') {
        var img = document.createElement('div');
        img.className = 'ly-img';
        if (layer.img && layer.img.src) {
          img.style.backgroundImage = 'url("' + layer.img.src + '")';
          img.style.backgroundSize = layer.img.fit === 'contain' ? 'contain' : (layer.img.fit === 'fill' ? '100% 100%' : 'cover');
          img.style.backgroundRepeat = 'no-repeat';
          img.style.backgroundPosition = 'center';
        } else {
          img.innerHTML = '<span class="ph-label">DROP IMAGE / PASTE URL</span>';
          img.classList.add('is-empty');
        }
        box.appendChild(img);
        return;
      }

      if (layer.type === 'camera') {
        var cam = document.createElement('div');
        cam.className = 'ly-cam';
        cam.innerHTML =
          '<div class="cam-ph">' +
          '<svg viewBox="0 0 24 24" width="46" height="46" aria-hidden="true"><path fill="currentColor" d="M4 7h3l1.6-2h6.8L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm8 3.2A4.3 4.3 0 1 0 16.3 14.5A4.3 4.3 0 0 0 12 10.2Z"/></svg>' +
          '<span>' + U.esc(layer.cam && layer.cam.label ? layer.cam.label : 'CAMERA') + '</span>' +
          '<em>browser source</em>' +
          '</div>';
        box.appendChild(cam);
        return;
      }

      if (layer.type === 'chat') {
        var chat = document.createElement('div');
        chat.className = 'ly-chat';
        chat.style.fontFamily = P.font('@fontBody', theme);
        var size = (layer.chat && layer.chat.size) || 24;
        chat.style.fontSize = size + 'px';
        chat.style.color = P.color(layer.chat.color, theme);
        chat.innerHTML = MOCK_CHAT.map(function (m) {
          return '<div class="chat-row"><b style="color:' + P.color(layer.chat.userColor, theme) + '">' + U.esc(m[0]) + ':</b> ' + U.esc(m[1]) + '</div>';
        }).join('');
        box.appendChild(chat);
        return;
      }
    }
  };

  OS.Render = R;
})(window.OS = window.OS || {});
