/* ==========================================================================
   Twitch Overlay Studio — gl3d.js
   GPU slice renderer for the 3D logo spinner.

   logo3d.js builds its solid by painting the artwork N times along the model's
   Z axis. On a 2D canvas that is 36–64 scaled, brightness-filtered blits per
   frame, which is what used to hold the preview near 50 fps at export sizes.

   Here the identical stack is drawn as instanced quads in one draw call: each
   instance carries its Z offset, bevel taper, shade and which of the three
   textures it uses (front face, back face, material wall). Instances are drawn
   in array order, so the painter's-algorithm ordering that gives the extrusion
   its rim is preserved exactly — the result is composited onto the 2D canvas in
   a single copy, so the rest of the pipeline (lighting, reflection, shadow,
   GIF/APNG encoding) is untouched.

   Everything is a classic script with hand-written GLSL: no build step, no
   module imports, works on GitHub Pages.
   ========================================================================== */
(function (OS) {
  'use strict';

  var VS = [
    '#version 300 es',
    'in vec2 a_pos;',
    'in float a_dz;',
    'in float a_taper;',
    'in float a_shade;',
    'in float a_layer;',
    'uniform vec2 u_view;',
    'uniform vec2 u_center;',
    'uniform vec2 u_scale;',
    'uniform vec2 u_size;',
    'uniform float u_sinY;',
    'uniform float u_sinP;',
    'out vec2 v_uv;',
    'out float v_shade;',
    'out float v_layer;',
    'void main() {',
    '  float sw = u_size.x * a_taper;',
    '  float sh = u_size.y * a_taper;',
    '  vec2 px = u_center + vec2(a_dz * u_sinY, -a_dz * u_sinP)',
    '          + vec2((a_pos.x - 0.5) * sw, (a_pos.y - 0.5) * sh) * u_scale;',
    '  gl_Position = vec4(px.x / u_view.x * 2.0 - 1.0, 1.0 - px.y / u_view.y * 2.0, 0.0, 1.0);',
    '  v_uv = a_pos;',
    '  v_shade = a_shade;',
    '  v_layer = a_layer;',
    '}'
  ].join('\n');

  /* Canvas colours are premultiplied, so scaling every channel by the slice's
     shade is exactly the 2D path's brightness() filter, and one/one-minus-src
     is the matching premultiplied blend. */
  var FS = [
    '#version 300 es',
    'precision highp float;',
    'precision highp sampler2DArray;',
    'in vec2 v_uv;',
    'in float v_shade;',
    'in float v_layer;',
    'uniform sampler2DArray u_tex;',
    'out vec4 outColor;',
    'void main() {',
    '  vec4 c = texture(u_tex, vec3(v_uv, v_layer));',
    '  outColor = c * v_shade;',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error('shader: ' + gl.getShaderInfoLog(s));
    }
    return s;
  }

  function link(gl, vsSrc, fsSrc) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error('link: ' + gl.getProgramInfoLog(p));
    }
    return p;
  }

  /**
   * @returns {Object|null} null when WebGL2 is missing or the shader refuses
   */
  function create() {
    var canvas = document.createElement('canvas');
    var gl = null;
    try {
      gl = canvas.getContext('webgl2', {
        alpha: true,
        antialias: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: true,
        depth: false,
        powerPreference: 'high-performance'
      });
    } catch (e) { return null; }
    if (!gl) return null;

    var prog;
    try { prog = link(gl, VS, FS); } catch (e) { return null; }

    var at = {
      pos: gl.getAttribLocation(prog, 'a_pos'),
      dz: gl.getAttribLocation(prog, 'a_dz'),
      taper: gl.getAttribLocation(prog, 'a_taper'),
      shade: gl.getAttribLocation(prog, 'a_shade'),
      layer: gl.getAttribLocation(prog, 'a_layer')
    };
    var un = {
      view: gl.getUniformLocation(prog, 'u_view'),
      center: gl.getUniformLocation(prog, 'u_center'),
      scale: gl.getUniformLocation(prog, 'u_scale'),
      size: gl.getUniformLocation(prog, 'u_size'),
      sinY: gl.getUniformLocation(prog, 'u_sinY'),
      sinP: gl.getUniformLocation(prog, 'u_sinP'),
      tex: gl.getUniformLocation(prog, 'u_tex')
    };

    var quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 0, 1, 0, 0, 1,
      0, 1, 1, 0, 1, 1
    ]), gl.STATIC_DRAW);

    var inst = gl.createBuffer();
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(at.pos);
    gl.vertexAttribPointer(at.pos, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, inst);
    [['dz', 0], ['taper', 4], ['shade', 8], ['layer', 12]].forEach(function (a) {
      var loc = at[a[0]];
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 1, gl.FLOAT, false, 16, a[1]);
      gl.vertexAttribDivisor(loc, 1);
    });
    gl.bindVertexArray(null);

    var tex = gl.createTexture();
    var texW = 0, texH = 0, texRev = -1, dead = false;
    var data = null;

    /**
     * Draw the slice stack and composite it onto a 2D context.
     * @param {Object} o {target, W, H, list, cx, cy, kx, ky, w0, h0, sY, sP, rev, faceF, faceB, mat}
     * @returns {boolean} false if the caller should fall back to canvas 2D
     */
    function paint(o) {
      if (dead || !o.list || !o.list.length) return false;
      try {
        var n = o.list.length;
        if (canvas.width !== o.W || canvas.height !== o.H) {
          canvas.width = o.W;
          canvas.height = o.H;
          texRev = -1;
        }
        if (!data || data.length < n * 4) data = new Float32Array(n * 4);
        for (var i = 0; i < n; i++) {
          var s = o.list[i], at4 = i * 4;
          data[at4] = s.dz;
          data[at4 + 1] = s.taper;
          data[at4 + 2] = s.shade;
          /* 0 = artwork front, 1 = mirrored back, 2 = material wall */
          data[at4 + 3] = s.u >= 0.9 ? 0 : (s.u <= 0.1 ? 1 : 2);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, inst);
        gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, n * 4), gl.DYNAMIC_DRAW);

        if (texRev !== o.rev) {
          var tw = o.faceF.width, th = o.faceF.height;
          gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
          if (texW !== tw || texH !== th) {
            gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, tw, th, 3, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            texW = tw;
            texH = th;
          }
          [o.faceF, o.faceB, o.mat].forEach(function (src, k) {
            gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, k, tw, th, 1, gl.RGBA, gl.UNSIGNED_BYTE, src);
          });
          texRev = o.rev;
        }

        gl.viewport(0, 0, o.W, o.H);
        gl.useProgram(prog);
        gl.uniform2f(un.view, o.W, o.H);
        gl.uniform2f(un.center, o.cx, o.cy);
        gl.uniform2f(un.scale, o.kx, o.ky);
        gl.uniform2f(un.size, o.w0, o.h0);
        gl.uniform1f(un.sinY, o.sY);
        gl.uniform1f(un.sinP, o.sP);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
        gl.uniform1i(un.tex, 0);

        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.bindVertexArray(vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
        gl.bindVertexArray(null);

        /* the 2D target is where every later stage reads the model from */
        o.target.drawImage(canvas, 0, 0);
        return true;
      } catch (e) {
        /* a driver refusing a frame must not take the export down with it */
        dead = true;
        return false;
      }
    }

    return { canvas: canvas, paint: paint, dead: function () { return dead; } };
  }

  OS.GL3D = { create: create };
})(typeof window !== 'undefined' ? (window.OS = window.OS || {}) : (self.OS = self.OS || {}));
