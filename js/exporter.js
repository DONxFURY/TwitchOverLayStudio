/* ==========================================================================
   Twitch Overlay Studio — exporter.js
   PNG rendering (canvas, pixel-identical to the editor) and the bundle
   exporter that writes a self-contained OBS-ready folder as a .zip.
   ========================================================================== */
(function (OS) {
  'use strict';
  var U = OS.U, P = OS.Presets, M = OS.Model, Painter = window.OverlayPainter;

  var PNG_SCALE = 2;

  /* ---------------- canvas helpers ---------------- */
  function polygon(ctx, layer, x, y, w, h, cornerCut) {
    ctx.beginPath();
    if (!layer.cut) {
      ctx.rect(x, y, w, h);
      return;
    }
    var pts = P.polyPts(w, h, layer.cz, cornerCut == null ? layer.cut : cornerCut);
    pts.forEach(function (p, i) {
      if (i === 0) ctx.moveTo(x + p[0], y + p[1]);
      else ctx.lineTo(x + p[0], y + p[1]);
    });
    ctx.closePath();
  }

  function loadImages(doc) {
    var srcs = [];
    doc.scenes.forEach(function (s) {
      s.layers.forEach(function (l) {
        if (l.type === 'image' && l.img && l.img.src && srcs.indexOf(l.img.src) < 0) srcs.push(l.img.src);
      });
    });
    return Promise.all(srcs.map(function (src) {
      return new Promise(function (resolve) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () { resolve([src, img]); };
        img.onerror = function () { resolve([src, null]); };
        img.src = src;
      });
    })).then(function (pairs) {
      var map = {};
      pairs.forEach(function (p) { map[p[0]] = p[1]; });
      return map;
    });
  }

  /* ---------------- layer painting ---------------- */
  var BLEND = {
    normal: 'source-over', screen: 'screen', overlay: 'overlay',
    multiply: 'multiply', difference: 'difference', 'plus-lighter': 'lighter'
  };

  function paintLayer(ctx, layer, theme, doc, imgs, state, time) {
    var bw = (layer.border && layer.border.w) || 0;
    var fill = layer.fill || { type: 'none' };
    var x = -layer.w / 2, y = -layer.h / 2;
    state = state || { dx: 0, dy: 0, scale: 1, rot: 0, opacity: 1 };

    ctx.save();
    ctx.translate(layer.x + layer.w / 2 + (state.dx || 0), layer.y + layer.h / 2 + (state.dy || 0));
    ctx.rotate((((layer.rot || 0) + (state.rot || 0)) * Math.PI) / 180);
    if (state.scale && state.scale !== 1) ctx.scale(state.scale, state.scale);
    ctx.globalAlpha = (layer.opacity == null ? 1 : layer.opacity) * (state.opacity == null ? 1 : state.opacity);
    if (layer.blend && BLEND[layer.blend]) ctx.globalCompositeOperation = BLEND[layer.blend];

    if (layer.shadow) {
      ctx.shadowColor = layer.shadowColor || 'rgba(0,0,0,.6)';
      ctx.shadowBlur = layer.shadow;
      ctx.shadowOffsetY = layer.shadow * 0.35;
    }

    /* border ring */
    if (bw > 0 && layer.border) {
      if (layer.border.glow) {
        ctx.shadowColor = P.color(layer.border.glowColor, theme);
        ctx.shadowBlur = layer.border.glow * 1.6;
        ctx.shadowOffsetY = 0;
      }
      ctx.fillStyle = P.color(layer.border.color, theme);
      polygon(ctx, layer, x, y, layer.w, layer.h);
      ctx.fill();
    }

    /* fill */
    if (fill.type !== 'none') {
      ctx.shadowBlur = layer.shadow ? layer.shadow : 0;
      ctx.shadowOffsetY = layer.shadow ? layer.shadow * 0.35 : 0;
      var fx = x + bw, fy = y + bw, fw = layer.w - bw * 2, fh = layer.h - bw * 2;
      var paint;
      if (fill.type === 'gradient') {
        var a = ((fill.angle == null ? 160 : fill.angle) * Math.PI) / 180;
        var cx = layer.w / 2, cy = layer.h / 2;
        var len = Math.abs(Math.cos(a)) * layer.w + Math.abs(Math.sin(a)) * layer.h;
        paint = ctx.createLinearGradient(
          cx - Math.cos(a) * len / 2, cy - Math.sin(a) * len / 2,
          cx + Math.cos(a) * len / 2, cy + Math.sin(a) * len / 2
        );
        paint.addColorStop(0, P.color(fill.c1, theme));
        paint.addColorStop(1, P.color(fill.c2, theme));
      } else {
        paint = P.color(fill.c1, theme);
      }
      ctx.fillStyle = paint;
      polygon(ctx, layer, fx, fy, fw, fh, Math.max(0, layer.cut - bw));
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    /* content */
    if (layer.type === 'text') drawText(ctx, layer, theme, doc, time);
    if (layer.type === 'image') drawImage(ctx, layer, imgs, theme);
    if (layer.type === 'camera') drawCamera(ctx, layer, theme);
    if (layer.type === 'chat') drawChat(ctx, layer, theme);
    if (layer.type === 'frame' && OS.Frames) OS.Frames.draw(ctx, layer, theme, layer.w, layer.h, x, y);

    ctx.restore();
  }

  function drawText(ctx, layer, theme, doc, time) {
    var t = layer.text || {};
    var value = (OS.Anim && OS.Anim.dynamicText(layer))
      ? OS.Anim.text(layer, time || 0, doc)
      : U.tokens(t.value, doc && doc.settings);
    var size = t.size || 48;
    var family = P.font(t.font, theme);
    ctx.font = (t.italic ? 'italic ' : '') + (t.weight || 400) + ' ' + size + 'px ' + family;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    var lines = String(value).split('\n');
    var lh = size * (t.lh || 1.05);
    var totalH = lines.length * lh;
    var top = -layer.h / 2 + layer.h / 2 - totalH / 2;
    var ls = t.ls || 0;
    var pad = 4;

    lines.forEach(function (line, i) {
      var text = t.upper ? line.toUpperCase() : line;
      var chars = Array.from(text);
      var width = 0;
      chars.forEach(function (c) { width += ctx.measureText(c).width + ls; });
      width = Math.max(0, width - ls);

      var x0;
      if (t.align === 'left') x0 = -layer.w / 2 + pad;
      else if (t.align === 'right') x0 = layer.w / 2 - pad - width;
      else x0 = -width / 2;

      var yy = top + lh * (i + 0.5);
      if (t.glow) {
        ctx.shadowColor = P.color(t.glowColor, theme);
        ctx.shadowBlur = t.glow;
      }
      ctx.fillStyle = P.color(t.color, theme);
      var cx = x0;
      chars.forEach(function (c) {
        ctx.fillText(c, cx, yy);
        cx += ctx.measureText(c).width + ls;
      });
      ctx.shadowBlur = 0;
    });
  }

  function drawImage(ctx, layer, imgs, theme) {
    var src = layer.img && layer.img.src;
    var img = src && imgs ? imgs[src] : null;
    if (!img) {
      ctx.strokeStyle = P.color('@line', theme);
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.strokeRect(-layer.w / 2 + 2, -layer.h / 2 + 2, layer.w - 4, layer.h - 4);
      ctx.setLineDash([]);
      return;
    }
    var fit = (layer.img && layer.img.fit) || 'cover';
    var ar = img.width / img.height;
    var boxAr = layer.w / layer.h;
    var dw = layer.w, dh = layer.h, dx = -dw / 2, dy = -dh / 2;

    if (fit === 'contain') {
      if (ar > boxAr) { dh = layer.w / ar; dy = -dh / 2; }
      else { dw = layer.h * ar; dx = -dw / 2; }
    } else if (fit === 'cover') {
      if (ar > boxAr) { dw = layer.h * ar; dx = -dw / 2; }
      else { dh = layer.w / ar; dy = -dh / 2; }
    }
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function drawCamera(ctx, layer, theme) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(-layer.w / 2, -layer.h / 2, layer.w, layer.h);
    ctx.strokeStyle = P.color('@line', theme);
    ctx.setLineDash([12, 10]);
    ctx.lineWidth = 2;
    ctx.strokeRect(-layer.w / 2 + 6, -layer.h / 2 + 6, layer.w - 12, layer.h - 12);
    ctx.setLineDash([]);
    ctx.fillStyle = P.color('@muted', theme);
    ctx.font = '600 ' + Math.max(16, Math.min(44, layer.h * 0.09)) + 'px ' + P.font('@fontBody', theme);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(((layer.cam && layer.cam.label) || 'CAMERA') + ' · browser source', 0, 0);
  }

  function drawChat(ctx, layer, theme) {
    var size = (layer.chat && layer.chat.size) || 24;
    var pad = 14;
    ctx.font = '500 ' + size + 'px ' + P.font('@fontBody', theme);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    var mock = [
      ['pixel_nova', 'that clutch was insane'],
      ['zerograv', 'W stream'],
      ['hollow_', 'first time here, the layout is clean'],
      ['kayla.exe', 'chat is moving today'],
      ['rustydust', 'gg wp'],
      ['mira_', 'poggers']
    ];
    var lh = size * 1.55;
    var maxY = layer.h - pad;
    var y = maxY - (mock.length - 1) * lh;
    mock.forEach(function (m) {
      if (y < pad) return;
      var name = m[0] + ': ';
      ctx.fillStyle = P.color(layer.chat.userColor, theme);
      ctx.fillText(name, -layer.w / 2 + pad, y);
      var nw = ctx.measureText(name).width;
      ctx.fillStyle = P.color(layer.chat.color, theme);
      var msg = m[1];
      while (ctx.measureText(msg).width > layer.w - pad * 2 - nw) msg = msg.slice(0, -1);
      ctx.fillText(msg, -layer.w / 2 + pad + nw, y);
      y += lh;
    });
  }

  /* ---------------- scene render ---------------- */
  function renderScene(scene, scale, theme, doc, imgs, time) {
    scale = scale || 1;
    var canvas = document.createElement('canvas');
    canvas.width = 1920 * scale;
    canvas.height = 1080 * scale;
    var ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    if (scene.bgOn) {
      Painter.paint(ctx, 1920, 1080, scene.bg || theme.bg, scene.id);
    }
    (scene.layers || []).forEach(function (l) {
      if (l.hidden) return;
      var st = OS.Anim ? OS.Anim.state(l, time || 0, 0) : null;
      paintLayer(ctx, l, theme, doc, imgs || {}, st, time || 0);
    });
    return canvas;
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve) {
      if (canvas.toBlob) canvas.toBlob(resolve, 'image/png');
      else resolve(null);
    });
  }

  /* ---------------- export: PNG ---------------- */
  function exportPNG(scale) {
    var doc = M.doc;
    var scene = M.scene();
    var theme = M.theme();
    scale = scale || PNG_SCALE;
    loadImages(doc).then(function (imgs) {
      var canvas = renderScene(scene, scale, theme, doc, imgs);
      canvasToBlob(canvas).then(function (blob) {
        U.download(blob, U.slug(doc.name) + '-' + U.slug(scene.name) + '.png');
        U.toast('PNG exported (' + canvas.width + '×' + canvas.height + ')');
      });
    });
  }

  function exportAllPNG() {
    var doc = M.doc;
    loadImages(doc).then(function (imgs) {
      var files = [];
      var chain = Promise.resolve();
      doc.scenes.forEach(function (scene) {
        chain = chain.then(function () {
          var theme = P.themeById(scene.themeId || doc.themeId);
          var canvas = renderScene(scene, 1, theme, doc, imgs);
          return canvasToBlob(canvas).then(function (blob) {
            return blob.arrayBuffer().then(function (buf) {
              files.push({ name: U.slug(scene.name) + '.png', data: new Uint8Array(buf) });
            });
          });
        });
      });
      chain.then(function () {
        var blob = OS.Zip.build(files);
        U.download(blob, U.slug(doc.name) + '-stills.zip');
        U.toast(doc.scenes.length + ' scene images exported');
      });
    });
  }

  /* ---------------- export: bundle ---------------- */
  function esc(s) { return U.esc(s == null ? '' : s); }

  function layerStyle(layer) {
    return 'left:' + layer.x + 'px;top:' + layer.y + 'px;width:' + Math.max(1, layer.w) + 'px;height:' +
      Math.max(1, layer.h) + 'px;transform:rotate(' + (layer.rot || 0) + 'deg);opacity:' +
      (layer.opacity == null ? 1 : layer.opacity);
  }

  function layerMarkup(layer, theme, assetsPrefix) {
    var bw = (layer.border && layer.border.w) || 0;
    var parts = [];
    var animCfg = null;
    var a = layer.anim || {};
    var moving = (a.type && a.type !== 'none') || (a.enter && a.enter !== 'none') || (a.exit && a.exit !== 'none');
    if (moving) {
      animCfg = {
        type: a.type || 'none', speed: a.speed || 4, delay: a.delay || 0, amp: a.amp == null ? 14 : a.amp,
        enter: a.enter || 'none', enterDur: a.enterDur == null ? 0.7 : a.enterDur, enterEase: a.enterEase || 'easeOutCubic',
        exit: a.exit || 'none', exitDur: a.exitDur == null ? 0.6 : a.exitDur, exitEase: a.exitEase || 'easeInOutCubic',
        rot: layer.rot || 0, op: layer.opacity == null ? 1 : layer.opacity
      };
      if (a.type === 'typewriter' || a.type === 'countup') animCfg.raw = (layer.text && layer.text.value) || '';
    }

    parts.push('<div class="ly ly-' + layer.type + (layer.hidden ? ' is-hidden' : '') + '"' +
      ' data-id="' + esc(layer.id) + '" data-name="' + esc(layer.name) + '"' +
      (animCfg ? ' data-anim="' + esc(JSON.stringify(animCfg)) + '"' : '') +
      ' style="' + layerStyle(layer) +
      (layer.blend && layer.blend !== 'normal' ? ';mix-blend-mode:' + layer.blend : '') + '">');

    var filters = [];
    if (layer.shadow) filters.push('drop-shadow(0 ' + Math.round((layer.shadow || 0) * 0.35) + 'px ' + layer.shadow + 'px ' + (layer.shadowColor || 'rgba(0,0,0,.6)') + ')');
    if (layer.border && layer.border.glow) filters.push('drop-shadow(0 0 ' + layer.border.glow + 'px ' + P.color(layer.border.glowColor, theme) + ')');
    if (layer.frame && layer.frame.glow) filters.push('drop-shadow(0 0 ' + layer.frame.glow + 'px ' + P.color(layer.frame.accentColor || '@glow', theme) + ')');

    parts.push('<div class="ly-glow"' + (filters.length ? ' style="filter:' + filters.join(' ') + '"' : '') + '>');
    if (bw > 0) {
      parts.push('<div class="ly-frame" style="background:' + P.color(layer.border.color, theme) +
        ';clip-path:' + (layer.cut ? P.ring(layer, layer.w, layer.h, bw) : 'none') +
        ';border-radius:' + P.radius(layer, 0) + 'px"></div>');
    }
    parts.push('<div class="ly-inner" style="inset:' + bw + 'px;background:' + P.fillCSS(layer.fill, theme) +
      ';clip-path:' + (layer.cut ? P.clip(layer, layer.w, layer.h, bw) : 'none') +
      ';border-radius:' + P.radius(layer, bw) + 'px">');

    if (layer.type === 'text') {
      var t = layer.text;
      var st = 'font-family:' + P.font(t.font, theme) + ';font-size:' + t.size + 'px;font-weight:' + t.weight +
        ';font-style:' + (t.italic ? 'italic' : 'normal') + ';color:' + P.color(t.color, theme) +
        ';letter-spacing:' + (t.ls || 0) + 'px;line-height:' + (t.lh || 1.05) +
        ';text-align:' + (t.align || 'center') + ';text-transform:' + (t.upper ? 'uppercase' : 'none') +
        (t.glow ? ';text-shadow:0 0 ' + t.glow + 'px ' + P.color(t.glowColor, theme) : '');
      parts.push('<div class="ly-text" data-raw="' + esc(t.value) + '" style="' + st + '">' + esc(t.value) + '</div>');
    } else if (layer.type === 'image') {
      if (layer.img && layer.img.src) {
        var src = layer.img.src.indexOf('data:') === 0 ? layer.img.src : layer.img.src;
        parts.push('<div class="ly-img" style="background-image:url(&quot;' + src + '&quot;);background-size:' +
          (layer.img.fit === 'contain' ? 'contain' : (layer.img.fit === 'fill' ? '100% 100%' : 'cover')) +
          ';background-position:center;background-repeat:no-repeat"></div>');
      }
    } else if (layer.type === 'camera') {
      parts.push('<div class="ly-cam"><video autoplay muted playsinline></video><div class="cam-ph">' +
        '<span class="cam-ico">◉</span><span>' + esc((layer.cam && layer.cam.label) || 'CAMERA') + '</span>' +
        '<em>browser source · allow camera in OBS</em></div></div>');
    } else if (layer.type === 'chat') {
      parts.push('<div class="ly-chat" data-chat="1" style="font-size:' + ((layer.chat && layer.chat.size) || 24) + 'px;color:' +
        P.color(layer.chat.color, theme) + '"></div>');
    } else if (layer.type === 'frame' && OS.Frames) {
      parts.push(OS.Frames.svgMarkup(layer, theme, layer.w, layer.h));
    }

    parts.push('</div></div></div>');
    return parts.join('');
  }

  function scenePage(scene, theme, cfg, bgRel, assetsRel) {
    var layersHTML = (scene.layers || []).map(function (l) { return layerMarkup(l, theme, assetsRel); }).join('\n');
    var title = esc(scene.name + ' — ' + cfg.docName);
    var bodyClass = scene.bgOn ? 'has-bg' : 'transparent';
    return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
      '<title>' + title + '</title>\n' +
      '<link rel="stylesheet" href="' + assetsRel + 'overlay.css">\n' +
      '</head>\n<body class="osc ' + bodyClass + '">\n' +
      '<div class="stage" id="stage">\n' +
      (scene.bgOn ? '<img class="stage-bg" src="' + bgRel + '" alt="">\n' : '') +
      '<div class="layers">\n' + layersHTML + '\n</div>\n</div>\n' +
      '<script>window.OSC_CONFIG = ' + JSON.stringify(cfg, null, 2) + ';</script>\n' +
      '<script src="' + assetsRel + 'bundle.js"></script>\n' +
      '</body>\n</html>\n';
  }

  var OVERLAY_CSS = [
    'html,body{margin:0;padding:0;background:transparent;overflow:hidden}',
    'body.osc{width:100vw;height:100vh;display:block}',
    '.stage{position:absolute;top:0;left:0;width:1920px;height:1080px;transform-origin:top left;overflow:hidden}',
    'body.transparent .stage{background:transparent}',
    '.stage-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}',
    '.layers{position:absolute;inset:0;z-index:1;animation:osc-in .55s ease both}',
    '@keyframes osc-in{from{opacity:0}to{opacity:1}}',
    '.ly{position:absolute;transform-origin:center center;will-change:transform,opacity}',
    '.ly.is-hidden{display:none}',
    '.ly-glow{position:absolute;inset:0}',
    '.ly-frame{position:absolute;inset:0}',
    '.ly-inner{position:absolute;overflow:hidden;display:flex}',
    '.ly-text{width:100%;display:flex;align-items:center;justify-content:center;padding:0 4px;position:relative;z-index:2;text-align:inherit;white-space:pre-wrap}',
    '.ly-inner .ly-text{justify-content:center}',
    '.ly-img{position:absolute;inset:0;z-index:1}',
    '.ly-cam{position:absolute;inset:0;overflow:hidden;z-index:1;background:rgba(0,0,0,.45)}',
    '.ly-cam video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none}',
    '.ly-cam.is-live video{display:block}',
    '.ly-cam.is-live .cam-ph{display:none}',
    '.cam-ph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:rgba(190,225,255,.75);font:600 22px "Segoe UI",Arial,sans-serif;letter-spacing:.08em;text-align:center}',
    '.cam-ph em{font-style:normal;font-size:14px;opacity:.65;letter-spacing:.05em}',
    '.cam-ico{font-size:34px;opacity:.8}',
    '.ly-chat{position:absolute;inset:0;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:14px 16px;font-family:"Segoe UI",Arial,sans-serif}',
    '.ly-chat iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent}',
    '.ly-vector{position:absolute;inset:0;width:100%;height:100%;overflow:visible;z-index:1}',
    '.ly-sweep{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:3}',
    '.ly-sweep i{position:absolute;top:0;bottom:0;left:0;width:140%;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.3) 50%,transparent 62%);transform:translateX(-120%)}',
    '.chat-row{line-height:1.35;opacity:0;animation:chat-in .45s ease forwards;word-wrap:break-word}',
    '.chat-row b{font-weight:700}',
    '@keyframes chat-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}',
    '@keyframes osc-pulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.45)}}',
    '@keyframes osc-float{0%,100%{transform:translateY(0) rotate(var(--rot,0deg))}50%{transform:translateY(-14px) rotate(var(--rot,0deg))}}',
    '@keyframes osc-flicker{0%,100%{opacity:1}42%{opacity:1}45%{opacity:.45}47%{opacity:1}62%{opacity:.7}64%{opacity:1}}',
    '@keyframes osc-sweep{0%{background-position:-60% 0}100%{background-position:160% 0}}',
    '@keyframes osc-rise{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}',
    '.anim-pulse .ly-glow{animation:osc-pulse var(--dur,4s) ease-in-out infinite;animation-delay:var(--delay,0s)}',
    '.anim-float{animation:osc-float var(--dur,4s) ease-in-out infinite;animation-delay:var(--delay,0s)}',
    '.anim-flicker{animation:osc-flicker var(--dur,4s) steps(1,end) infinite;animation-delay:var(--delay,0s)}',
    '.anim-sweep .ly-inner::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.22) 50%,transparent 65%);background-size:220% 100%;animation:osc-sweep var(--dur,4s) linear infinite;animation-delay:var(--delay,0s);pointer-events:none}',
    '.anim-rise{animation:osc-rise var(--dur,4s) ease-out both;animation-delay:var(--delay,0s)}',
    '@media (prefers-reduced-motion:reduce){*{animation:none!important}}'
  ].join('\n');

  var BUNDLE_JS = [
    '(function(){',
    '  var cfg = window.OSC_CONFIG || {};',
    '  var params = new URLSearchParams(location.search);',
    '  var settings = Object.assign({}, cfg.settings || {});',
    '  if (params.get("channel")) settings.channel = params.get("channel");',
    '  var stage = document.getElementById("stage");',
    '  var userScale = parseFloat(params.get("scale") || "1") || 1;',
    '  function pad(n){ return n < 10 ? "0" + n : "" + n; }',
    '  function fmtTime(d){ var h = d.getHours(), m = pad(d.getMinutes()), ap = h >= 12 ? "PM" : "AM"; h = h % 12; if(!h) h = 12; return h + ":" + m + " " + ap; }',
    '  function fmtDate(d){ var dn=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]; var mn=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return dn[d.getDay()] + ", " + mn[d.getMonth()] + " " + d.getDate(); }',
    '  function resolve(str){',
    '    var d = new Date();',
    '    return String(str == null ? "" : str)',
    '      .replace(/\\{\\{\\s*channel\\s*\\}\\}/gi, settings.channel || "yourchannel")',
    '      .replace(/\\{\\{\\s*twitch\\s*\\}\\}/gi, settings.twitch || settings.channel || "twitch.tv/you")',
    '      .replace(/\\{\\{\\s*twitter\\s*\\}\\}/gi, settings.twitter || "@you")',
    '      .replace(/\\{\\{\\s*youtube\\s*\\}\\}/gi, settings.youtube || "youtube.com/@you")',
    '      .replace(/\\{\\{\\s*discord\\s*\\}\\}/gi, settings.discord || "discord.gg/you")',
    '      .replace(/\\{\\{\\s*instagram\\s*\\}\\}/gi, settings.instagram || "@you")',
    '      .replace(/\\{\\{\\s*tiktok\\s*\\}\\}/gi, settings.tiktok || "@you")',
    '      .replace(/\\{\\{\\s*time\\s*\\}\\}/gi, fmtTime(d))',
    '      .replace(/\\{\\{\\s*date\\s*\\}\\}/gi, fmtDate(d))',
    '      .replace(/\\{\\{\\s*year\\s*\\}\\}/gi, d.getFullYear());',
    '  }',
    '  function paintTokens(){',
    '    document.querySelectorAll(".ly-text[data-raw]").forEach(function(el){',
    '      var next = resolve(el.getAttribute("data-raw"));',
    '      if(el.textContent !== next) el.textContent = next;',
    '    });',
    '  }',
    '  paintTokens();',
    '  setInterval(paintTokens, 1000);',
    '',
    '  /* fit the 1920x1080 stage to any window size */',
    '  function fit(){',
    '    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080) * userScale;',
    '    stage.style.transform = "scale(" + s + ")";',
    '    stage.style.left = ((window.innerWidth - 1920 * s) / 2) + "px";',
    '    stage.style.top = ((window.innerHeight - 1080 * s) / 2) + "px";',
    '  }',
    '  fit();',
    '  window.addEventListener("resize", fit);',
    '  if(params.get("transparent") === "1" || params.get("bg") === "off") document.body.classList.add("transparent");',
    '',
    '  /* demo chat so the layout looks right with zero setup */',
    '  var demo = [',
    '    ["pixel_nova","that clutch was insane"],["zerograv","W stream"],',
    '    ["hollow_","first time here, the layout is clean"],["kayla.exe","chat is moving today"],',
    '    ["rustydust","gg wp"],["mira_","poggers"]',
    '  ];',
    '  document.querySelectorAll(".ly-chat").forEach(function(box){',
    '    var widget = cfg.chatWidget || params.get("widget");',
    '    if(widget){',
    '      var f = document.createElement("iframe");',
    '      if(widget.indexOf("http") === 0){ f.src = widget.replace("{channel}", encodeURIComponent(settings.channel || "")); }',
    '      else { f.src = "https://www.twitch.tv/embed/" + encodeURIComponent(settings.channel || "") + "/chat?darkpopout"; }',
    '      box.innerHTML = "";',
    '      box.appendChild(f);',
    '      return;',
    '    }',
    '    var i = 0;',
    '    function add(){',
    '      var m = demo[i % demo.length]; i++;',
    '      var row = document.createElement("div");',
    '      row.className = "chat-row";',
    '      var b = document.createElement("b");',
    '      b.textContent = m[0] + ": ";',
    '      b.style.color = cfg.chatUserColor || "#7ce9ff";',
    '      row.appendChild(b);',
    '      row.appendChild(document.createTextNode(m[1]));',
    '      box.appendChild(row);',
    '      while(box.children.length > 8) box.removeChild(box.firstChild);',
    '    }',
    '    for(var k = 0; k < 6; k++) add();',
    '    setInterval(add, 4200);',
    '  });',
    '',
    '  /* camera layers -> webcam */',
    '  var cams = document.querySelectorAll(".ly-cam");',
    '  if(cams.length && navigator.mediaDevices && navigator.mediaDevices.getUserMedia){',
    '    var constraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };',
    '    var dev = params.get("cam");',
    '    if(dev && dev !== "1") constraints.video.deviceId = { exact: dev };',
    '    navigator.mediaDevices.getUserMedia(constraints).then(function(stream){',
    '      cams.forEach(function(box){',
    '        var v = box.querySelector("video");',
    '        if(!v) return;',
    '        v.srcObject = stream;',
    '        v.muted = true;',
    '        v.play().catch(function(){});',
    '        box.classList.add("is-live");',
    '      });',
    '    }).catch(function(err){ console.warn("[overlay] camera unavailable:", err && err.name); });',
    '  }',
    '',
    '  /* animation tick — same maths as the studio renderer */',
    '  (function(){',
    '    var els = [].slice.call(document.querySelectorAll(".ly[data-anim]"));',
    '    if(!els.length) return;',
    '    var E = {',
    '      linear:function(t){return t},',
    '      easeInCubic:function(t){return t*t*t},',
    '      easeOutCubic:function(t){return 1-Math.pow(1-t,3)},',
    '      easeInOutCubic:function(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2},',
    '      easeOutQuint:function(t){return 1-Math.pow(1-t,5)},',
    '      easeOutBack:function(t){var c=1.70158;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)},',
    '      easeOutElastic:function(t){return t===0||t===1?t:Math.pow(2,-10*t)*Math.sin((t*10-.75)*(2*Math.PI/3))+1},',
    '      easeOutBounce:function(t){var n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d)return n*(t-=1.5/d)*t+.75;if(t<2.5/d)return n*(t-=2.25/d)*t+.9375;return n*(t-=2.625/d)*t+.984375},',
    '      easeInOutSine:function(t){return -(Math.cos(Math.PI*t)-1)/2}',
    '    };',
    '    function ease(n,t){return (E[n]||E.linear)(Math.max(0,Math.min(1,t))) }',
    '    function rnd(s){var x=Math.sin(s*127.1+311.7)*43758.5453;return x-Math.floor(x)}',
    '    function st(a,t){',
    '      var o={dx:0,dy:0,scale:1,rot:0,opacity:1,sweep:-1};',
    '      var speed=a.speed||4, delay=a.delay||0, amp=a.amp==null?14:a.amp;',
    '      var p=speed>0?((t-delay)%speed)/speed:0; if(p<0)p+=1;',
    '      var tau=p*Math.PI*2, wave=.5-.5*Math.cos(tau);',
    '      switch(a.type){',
    '        case "pulse":o.scale=1+.025*wave;break;',
    '        case "breathe":o.opacity=.7+.3*wave;break;',
    '        case "float":o.dy=-amp*wave;break;',
    '        case "sway":o.dx=amp*Math.sin(tau)*.9;o.dy=-amp*.35*wave;break;',
    '        case "flicker":o.opacity=rnd(Math.floor(p*37)+1)>.82?.35:1;break;',
    '        case "rotate":o.rot=360*p;break;',
    '        case "orbit":o.dx=amp*Math.cos(tau);o.dy=amp*Math.sin(tau);break;',
    '        case "shake":o.dx=Math.sin(tau*9)*amp*.35;o.dy=Math.cos(tau*11)*amp*.25;break;',
    '        case "glitch":o.dx=(rnd(Math.floor(p*60))>.55?1:-1)*amp*.3*(rnd(Math.floor(p*19))>.45?1:0);o.opacity=rnd(Math.floor(p*41))>.9?.75:1;break;',
    '        case "zoom":o.scale=1+.14*wave;break;',
    '        case "sweep":o.sweep=p;break;',
    '        case "marquee":o.dx=-amp*(p*2-1);break;',
    '        default:break;',
    '      }',
    '      if(a.enter&&a.enter!=="none"){',
    '        var ed=a.enterDur==null?.7:a.enterDur, s=Math.max(0,Math.min(1,(t-delay)/Math.max(.01,ed))), e=ease(a.enterEase||"easeOutCubic",s);',
    '        o.opacity*=e;',
    '        if(a.enter==="up")o.dy+=(1-e)*46;',
    '        if(a.enter==="down")o.dy-=(1-e)*46;',
    '        if(a.enter==="left")o.dx+=(1-e)*70;',
    '        if(a.enter==="right")o.dx-=(1-e)*70;',
    '        if(a.enter==="zoom")o.scale*=.86+.14*e;',
    '      }',
    '      return o;',
    '    }',
    '    function tick(){',
    '      var t = (performance.now() - t0) / 1000;',
    '      for(var i=0;i<els.length;i++){',
    '        var el=els[i], a=JSON.parse(el.getAttribute("data-anim")), o=st(a,t);',
    '        el.style.transform="translate3d("+o.dx.toFixed(2)+"px,"+o.dy.toFixed(2)+"px,0) rotate("+(Math.round((a.rot+o.rot)*100)/100)+"deg) scale("+o.scale.toFixed(4)+")";',
    '        el.style.opacity=(a.op*Math.max(0,Math.min(1,o.opacity))).toFixed(3);',
    '        if(a.type==="sweep"){var sw=el.querySelector(".ly-sweep");if(sw)sw.style.transform="translateX("+(-120+o.sweep*240).toFixed(2)+"%)";}',
    '        if(a.type==="typewriter"){var tx=el.querySelector(".ly-text");if(tx)tx.textContent=resolve(a.raw).slice(0,Math.max(0,Math.floor((t-(a.delay||0))*(a.amp||18))));}',
    '        if(a.type==="countup"){var t2=el.querySelector(".ly-text");if(t2){var target=parseFloat(resolve(a.raw).replace(/[^0-9.-]/g,""))||0;var pr=Math.max(0,Math.min(1,(t-(a.delay||0))/Math.max(.2,a.speed||2)));t2.textContent=String(Math.round(target*ease("easeOutCubic",pr)));}}',
    '      }',
    '      requestAnimationFrame(tick);',
    '    }',
    '    var t0 = performance.now();',
    '    requestAnimationFrame(tick);',
    '  })();',
    '',
    '  /* tiny API for stream tools */',
    '  window.Overlay = {',
    '    setText: function(name, value){',
    '      document.querySelectorAll(".ly-text").forEach(function(el){',
    '        var host = el.closest(".ly");',
    '        if(host && host.getAttribute("data-name") === name) el.setAttribute("data-raw", value);',
    '      });',
    '      paintTokens();',
    '    },',
    '    show: function(name){ document.querySelectorAll("[data-name=\\"" + name + "\\"]").forEach(function(el){ el.classList.remove("is-hidden"); }); },',
    '    hide: function(name){ document.querySelectorAll("[data-name=\\"" + name + "\\"]").forEach(function(el){ el.classList.add("is-hidden"); }); },',
    '    resolve: resolve',
    '  };',
    '})();'
  ].join('\n');

  function indexPage(doc, scenes) {
    var cards = scenes.map(function (s) {
      return '      <a class="card" href="scenes/' + s.slug + '.html" target="_blank">' +
        '<div class="swatch" style="background:linear-gradient(135deg,' + s.colors[0] + ',' + s.colors[1] + ')"></div>' +
        '<div class="card-body"><h3>' + esc(s.name) + '</h3>' +
        '<code>' + s.slug + '.html</code>' +
        '<p>' + (s.bgOn ? 'Full-screen background baked in.' : 'Transparent — layer over gameplay.') + '</p>' +
        '</div></a>';
    }).join('\n');

    return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
      '<title>' + esc(doc.name) + ' — overlay bundle</title>\n' +
      '<style>' + [
        '*{box-sizing:border-box}',
        'body{margin:0;background:#080a10;color:#e8eefb;font:16px/1.5 "Segoe UI",Arial,sans-serif;padding:48px 32px 80px}',
        'header{max-width:1180px;margin:0 auto 36px}',
        'h1{margin:0 0 6px;font-size:34px;letter-spacing:-.02em}',
        '.sub{color:#8ea0bd}',
        'a.card{display:flex;flex-direction:column;border:1px solid #1e2736;border-radius:14px;overflow:hidden;background:#0d111a;color:inherit;text-decoration:none;transition:.18s}',
        'a.card:hover{transform:translateY(-3px);border-color:#3a6df0;box-shadow:0 18px 40px rgba(0,0,0,.45)}',
        '.swatch{height:86px}',
        '.card-body{padding:14px 16px 18px}',
        '.card-body h3{margin:0 0 4px;font-size:18px}',
        '.card-body code{font:12px/1.4 Consolas,monospace;color:#7ce9ff}',
        '.card-body p{margin:8px 0 0;color:#8ea0bd;font-size:13px}',
        '.grid{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px}',
        '.note{max-width:1180px;margin:40px auto 0;padding:18px 20px;border-radius:12px;border:1px solid #1e2736;background:#0b0f17;color:#a9bad4;font-size:14px}',
        '.note b{color:#e8eefb}',
        'code.k{background:#141a26;padding:2px 6px;border-radius:5px;color:#7ce9ff}'
      ].join('\n') + '</style>\n</head>\n<body>\n' +
      '<header><h1>' + esc(doc.name) + '</h1>' +
      '<div class="sub">' + scenes.length + ' browser sources · 1920×1080 · generated by Twitch Overlay Studio</div></header>\n' +
      '<div class="grid">\n' + cards + '\n</div>\n' +
      '<div class="note"><b>How to use:</b> in OBS add a <b>Browser</b> source, tick <i>Local file</i>, and pick a scene below. ' +
      'Set width 1920, height 1080. Add <code class="k">?channel=yourname</code> to the URL to switch channels without editing files. ' +
      'Camera layers need <i>Allow camera</i> enabled on the source. Read <code class="k">OBS-SETUP.txt</code> for the full walkthrough.</div>\n' +
      '</body>\n</html>\n';
  }

  var README_TXT = [
    'TWITCH OVERLAY BUNDLE',
    '=====================',
    '',
    'Open  index.html  to see every scene. Each file in  scenes/  is a',
    'standalone 1920x1080 browser source.',
    '',
    'Folder layout',
    '  index.html            dashboard with links to every scene',
    '  scenes/*.html         one page per scene (use these in OBS)',
    '  assets/overlay.css    shared styling',
    '  assets/bundle.js      runtime: tokens, clock, chat, webcam',
    '  assets/bg/*.png       baked background images',
    '  assets/img/*          images you placed in the editor',
    '  project.json          re-open this file in Twitch Overlay Studio',
    '',
    'URL PARAMETERS',
    '  ?channel=name         override the channel name used by tokens',
    '  ?transparent=1        hide the baked background (keep effects)',
    '  ?cam=1                use the default webcam',
    '  ?cam=DEVICE_ID        pick a specific webcam',
    '  ?widget=URL           replace the demo chat with a chat widget URL',
    '',
    'TEXT TOKENS (editable in the studio, resolved at runtime)',
    '  {{channel}} {{twitch}} {{twitter}} {{youtube}} {{discord}}',
    '  {{instagram}} {{tiktok}} {{time}} {{date}} {{year}}',
    '',
    'JAVASCRIPT API (for Streamer.bot, OBS scripts, custom pages)',
    '  Overlay.setText("Layer name", "new text")',
    '  Overlay.show("Layer name") / Overlay.hide("Layer name")',
    '',
    'The chat panel shows demo messages by default so the layout looks',
    'correct with no configuration. For real chat pass ?widget=NAME,',
    'which loads https://www.twitch.tv/embed/NAME/chat?darkpopout , or',
    'pass a full URL (use {channel} as the placeholder) to any widget',
    'host that allows embedding, e.g. a StreamElements chat box.',
    ''
  ].join('\n');

  var OBS_TXT = [
    'OBS SETUP (5 MINUTES)',
    '=====================',
    '',
    '1.  In OBS, open your scene collection.',
    '2.  Sources  ->  +  ->  Browser.',
    '3.  Name it after the overlay scene (e.g. "Starting").',
    '4.  Tick "Local file" and browse to  scenes/the-scene.html .',
    '5.  Width 1920  Height 1080.',
    '6.  Tick "Shutdown source when not visible" and "Refresh browser when',
    '    scene becomes active" so the clock and animations restart cleanly.',
    '7.  If the scene uses a camera layer, tick "Control audio via OBS" is',
    '    not needed, but you DO need to allow the camera prompt the first',
    '    time the source loads.',
    '',
    'LAYERING',
    '  Gameplay capture      bottom',
    '  This overlay source   above it (transparent scenes only)',
    '  Alerts / widgets      top',
    '  Full-screen scenes (starting / brb / offline) go on their own OBS',
    '  scene with nothing underneath.',
    '',
    'CHAT',
    '  Default is a demo feed. For live chat add ?widget=yourchannel to the',
    '  browser source URL (Twitch embed) or a full widget URL with',
    '  {channel} where the name belongs.',
    '',
    'TROUBLESHOOTING',
    '  * Text is missing  -> the font is not installed. Open the studio and',
    '    pick a different font (Bahnschrift / Segoe UI ship with Windows).',
    '  * Camera is black  -> OBS blocked the camera. Source properties ->',
    '    "Interact", allow camera, then refresh the source.',
    '  * Blurry overlay   -> make sure the source is 1920x1080 and not being',
    '    scaled by a transform in OBS.',
    ''
  ].join('\n');

  /* Collect data-url images into real files. */
  function extractImages(doc, files) {
    var seen = {};
    var n = 1;
    doc.scenes.forEach(function (s) {
      s.layers.forEach(function (l) {
        if (l.type !== 'image' || !l.img || !l.img.src) return;
        var src = l.img.src;
        if (src.indexOf('data:') !== 0) return;
        if (!seen[src]) {
          var parsed = U.dataURLToBytes(src);
          if (!parsed) return;
          var name = 'assets/img/img_' + n + '.' + parsed.ext;
          n++;
          files.push({ name: name, data: parsed.bytes });
          seen[src] = '../' + name;
        }
        l.img.src = seen[src];
      });
    });
  }

  function exportBundle() {
    var doc = M.doc;
    var files = [];
    var jobs = [];

    var prepared = U.clone(doc);
    extractImages(prepared, files);

    var sceneMeta = [];

    prepared.scenes.forEach(function (scene) {
      var theme = P.themeById(scene.themeId || prepared.themeId);
      var slug = U.slug(scene.name);
      var bgRel = '../assets/bg/' + slug + '.png';

      if (scene.bgOn) {
        jobs.push(new Promise(function (resolve) {
          var canvas = document.createElement('canvas');
          canvas.width = 1920; canvas.height = 1080;
          Painter.paint(canvas.getContext('2d'), 1920, 1080, scene.bg || theme.bg, scene.id);
          canvasToBlob(canvas).then(function (blob) {
            if (!blob) return resolve();
            blob.arrayBuffer().then(function (buf) {
              files.push({ name: 'assets/bg/' + slug + '.png', data: new Uint8Array(buf) });
              resolve();
            });
          });
        }));
      }

      var cfg = {
        docName: prepared.name,
        scene: scene.name,
        channel: prepared.settings.channel,
        settings: prepared.settings,
        chatWidget: '',
        generated: new Date().toISOString()
      };

      files.push({
        name: 'scenes/' + slug + '.html',
        data: scenePage(scene, theme, cfg, bgRel, '../assets/')
      });

      sceneMeta.push({
        slug: slug,
        name: scene.name,
        bgOn: !!scene.bgOn,
        colors: [theme.swatch[1], theme.swatch[2]]
      });
    });

    files.push({ name: 'assets/overlay.css', data: OVERLAY_CSS });
    files.push({ name: 'assets/bundle.js', data: BUNDLE_JS });
    files.push({ name: 'index.html', data: indexPage(prepared, sceneMeta) });
    files.push({ name: 'README.txt', data: README_TXT });
    files.push({ name: 'OBS-SETUP.txt', data: OBS_TXT });
    files.push({ name: 'project.json', data: JSON.stringify(doc, null, 2) });

    return Promise.all(jobs).then(function () {
      return OS.Zip.build(files);
    });
  }

  function exportBundleAndDownload() {
    U.toast('Building bundle…');
    return exportBundle().then(function (blob) {
      U.download(blob, U.slug(M.doc.name) + '-overlay-bundle.zip');
      U.toast('Bundle exported (' + M.doc.scenes.length + ' scenes)');
      return blob;
    }).catch(function (err) {
      console.error(err);
      U.toast('Export failed: ' + err.message, 'error');
    });
  }

  OS.Exporter = {
    scenePage: scenePage,
    paintLayer: paintLayer,
    renderScene: renderScene,
    loadImages: loadImages,
    exportPNG: exportPNG,
    exportAllPNG: exportAllPNG,
    exportBundle: exportBundle,
    exportBundleAndDownload: exportBundleAndDownload,
    OVERLAY_CSS: OVERLAY_CSS,
    BUNDLE_JS: BUNDLE_JS
  };
})(window.OS = window.OS || {});
