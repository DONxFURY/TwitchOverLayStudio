/* ==========================================================================
   Twitch Overlay Studio — model.js
   Document model, selection, undo/redo history and persistence.
   ========================================================================== */
(function (OS) {
  'use strict';
  var U = OS.U, P = OS.Presets;

  var M = {
    doc: null,
    STORE: 'tos.project.v1',
    _listeners: {},
    _history: [],
    _hi: -1,
    _maxHistory: 90,
    _sel: [],

    /* ---------------- events ---------------- */
    on: function (name, fn) {
      (this._listeners[name] = this._listeners[name] || []).push(fn);
      return this;
    },
    emit: function (name, payload) {
      (this._listeners[name] || []).forEach(function (fn) {
        try { fn(payload); } catch (e) { console.error(e); }
      });
    },

    /* ---------------- lifecycle ---------------- */
    init: function (doc) {
      this.doc = doc;
      this._history = [];
      this._hi = -1;
      this._sel = [];
      this._snapshot();
      this.emit('reset');
    },

    newDoc: function (name) {
      var scenes = ['starting', 'live', 'brb'].map(function (id) {
        var t = P.buildTemplate(id);
        return { id: U.uid('s'), name: t.name, bgOn: t.bgOn, bg: null, layers: t.layers };
      });
      return {
        app: 'Twitch Overlay Studio',
        version: 1,
        name: name || 'Untitled Overlay Bundle',
        themeId: 'aurora',
        settings: U.clone(P.DEFAULT_SETTINGS),
        currentSceneId: scenes[0].id,
        scenes: scenes,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    },

    ensureValid: function () {
      if (!this.doc || !this.doc.scenes || !this.doc.scenes.length) this.doc = this.newDoc();
      var ids = this.doc.scenes.map(function (s) { return s.id; });
      if (ids.indexOf(this.doc.currentSceneId) < 0) this.doc.currentSceneId = ids[0];
      var scene = this.scene();
      var valid = {};
      (scene.layers || []).forEach(function (l) { valid[l.id] = true; });
      this._sel = this._sel.filter(function (id) { return valid[id]; });
      if (!this.doc.settings) this.doc.settings = U.clone(P.DEFAULT_SETTINGS);
    },

    /* ---------------- accessors ---------------- */
    scene: function () {
      var d = this.doc;
      if (!d) return null;
      for (var i = 0; i < d.scenes.length; i++) if (d.scenes[i].id === d.currentSceneId) return d.scenes[i];
      return d.scenes[0];
    },
    sceneById: function (id) {
      for (var i = 0; i < this.doc.scenes.length; i++) if (this.doc.scenes[i].id === id) return this.doc.scenes[i];
      return null;
    },
    theme: function () {
      var s = this.scene();
      return P.themeById((s && s.themeId) || this.doc.themeId);
    },
    layers: function () {
      var s = this.scene();
      return (s && s.layers) || [];
    },
    find: function (id) {
      var ls = this.layers();
      for (var i = 0; i < ls.length; i++) if (ls[i].id === id) return ls[i];
      return null;
    },
    indexOf: function (id) {
      var ls = this.layers();
      for (var i = 0; i < ls.length; i++) if (ls[i].id === id) return i;
      return -1;
    },
    selected: function () {
      var self = this;
      return this._sel.map(function (id) { return self.find(id); }).filter(Boolean);
    },
    selIds: function () { return this._sel.slice(); },
    isSelected: function (id) { return this._sel.indexOf(id) >= 0; },

    /* ---------------- selection ---------------- */
    select: function (ids) {
      this._sel = (ids || []).slice();
      this.emit('sel');
    },
    toggleSelect: function (id) {
      var i = this._sel.indexOf(id);
      if (i >= 0) this._sel.splice(i, 1); else this._sel.push(id);
      this.emit('sel');
    },

    /* ---------------- history ---------------- */
    _snapshot: function () {
      var s = JSON.stringify(this.doc);
      if (this._history[this._hi] === s) return;
      this._history = this._history.slice(0, this._hi + 1);
      this._history.push(s);
      if (this._history.length > this._maxHistory) this._history.shift();
      this._hi = this._history.length - 1;
      this.emit('history');
    },
    commit: function (silent) {
      this.doc.updatedAt = Date.now();
      this._snapshot();
      if (!silent) this.emit('change');
      this.emit('commit');
      this.autosave();
    },
    _softCommit: U.debounce(function () {
      this.doc.updatedAt = Date.now();
      this._snapshot();
      this.autosave();
    }, 500),
    undo: function () {
      if (this._hi <= 0) return;
      this._hi--;
      this.doc = JSON.parse(this._history[this._hi]);
      this.ensureValid();
      this.emit('reset');
      this.autosave();
    },
    redo: function () {
      if (this._hi >= this._history.length - 1) return;
      this._hi++;
      this.doc = JSON.parse(this._history[this._hi]);
      this.ensureValid();
      this.emit('reset');
      this.autosave();
    },
    canUndo: function () { return this._hi > 0; },
    canRedo: function () { return this._hi < this._history.length - 1; },

    /* ---------------- mutation ---------------- */
    add: function (layer, index) {
      var s = this.scene();
      if (index == null || index < 0 || index > s.layers.length) s.layers.push(layer);
      else s.layers.splice(index, 0, layer);
      this._sel = [layer.id];
      this.commit();
      return layer;
    },
    addMany: function (layers) {
      var s = this.scene();
      layers.forEach(function (l) { s.layers.push(l); });
      this.commit();
    },
    remove: function (ids) {
      var s = this.scene();
      s.layers = s.layers.filter(function (l) { return ids.indexOf(l.id) < 0; });
      this._sel = this._sel.filter(function (id) { return ids.indexOf(id) < 0; });
      this.commit();
    },
    duplicate: function () {
      var s = this.scene();
      var self = this;
      var newIds = [];
      this.selected().forEach(function (l) {
        var c = U.clone(l);
        c.id = U.uid('l');
        c.name = l.name + ' copy';
        c.x = l.x + 24; c.y = l.y + 24;
        s.layers.push(c);
        newIds.push(c.id);
      });
      if (newIds.length) {
        this._sel = newIds;
        this.commit();
      }
    },
    duplicateSilent: function () {
      var s = this.scene();
      var out = this.selected().map(function (l) {
        var c = U.clone(l);
        c.id = U.uid('l');
        c.x += 24; c.y += 24;
        s.layers.push(c);
        return c.id;
      });
      this._sel = out;
      this.commit();
      return out;
    },
    reorder: function (id, dir) {
      var ls = this.layers();
      var i = this.indexOf(id);
      if (i < 0) return;
      var j = i;
      if (dir === 'up') j = Math.min(ls.length - 1, i + 1);
      else if (dir === 'down') j = Math.max(0, i - 1);
      else if (dir === 'top') j = ls.length - 1;
      else if (dir === 'bottom') j = 0;
      if (j === i) return;
      var item = ls.splice(i, 1)[0];
      ls.splice(j, 0, item);
      this.commit();
    },

    getPath: function (obj, path) {
      return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
    },
    setPath: function (obj, path, value) {
      var parts = path.split('.');
      var cur = obj;
      for (var i = 0; i < parts.length - 1; i++) {
        if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = value;
    },
    /** Update one property on every selected layer (live, soft-committed). */
    setSel: function (path, value) {
      var self = this;
      this.selected().forEach(function (l) { self.setPath(l, path, value); });
      this._softCommit();
      this.emit('change');
    },
    setSelObj: function (obj) {
      var self = this;
      this.selected().forEach(function (l) {
        Object.keys(obj).forEach(function (k) { self.setPath(l, k, obj[k]); });
      });
      this._softCommit();
      this.emit('change');
    },
    setLayer: function (id, path, value) {
      var l = this.find(id);
      if (!l) return;
      this.setPath(l, path, value);
      this.emit('change');
    },

    /* ---------------- scenes ---------------- */
    selectScene: function (id) {
      this.doc.currentSceneId = id;
      this._sel = [];
      this.commit();
      this.emit('reset');
    },
    addScene: function (templateId) {
      var t;
      if (templateId) t = P.buildTemplate(templateId);
      else {
        t = {
          name: 'Scene ' + (this.doc.scenes.length + 1),
          bgOn: true,
          layers: [
            P.panel(560, 420, 800, 240, {
              name: 'Frame',
              border: { w: 3, color: '@line', glow: 26, glowColor: '@glow' }
            }),
            P.text(560, 470, 800, 140, 'NEW SCENE', {
              text: { size: 90, weight: 900, ls: 4, color: '@text', glow: 30, glowColor: '@glow' }
            })
          ]
        };
      }
      var scene = { id: U.uid('s'), name: t.name, bgOn: t.bgOn, bg: null, layers: t.layers };
      this.doc.scenes.push(scene);
      this.doc.currentSceneId = scene.id;
      this._sel = [];
      this.commit();
      this.emit('reset');
      return scene;
    },
    duplicateScene: function (id) {
      var src = this.sceneById(id);
      if (!src) return;
      var c = U.clone(src);
      c.id = U.uid('s');
      c.name = src.name + ' copy';
      c.layers.forEach(function (l) { l.id = U.uid('l'); });
      this.doc.scenes.push(c);
      this.doc.currentSceneId = c.id;
      this.commit();
      this.emit('reset');
    },
    deleteScene: function (id) {
      if (this.doc.scenes.length <= 1) { U.toast('You need at least one scene', 'warn'); return; }
      this.doc.scenes = this.doc.scenes.filter(function (s) { return s.id !== id; });
      if (this.doc.currentSceneId === id) this.doc.currentSceneId = this.doc.scenes[0].id;
      this._sel = [];
      this.commit();
      this.emit('reset');
    },
    renameScene: function (id, name) {
      var s = this.sceneById(id);
      if (s) { s.name = name; this.commit(); this.emit('scenes'); }
    },
    replaceSceneLayers: function (layers, keepName) {
      var s = this.scene();
      s.layers = layers;
      if (!keepName) s.name = s.name;
      this._sel = [];
      this.commit();
      this.emit('reset');
    },
    applyTemplate: function (templateId, mode) {
      var t = P.buildTemplate(templateId);
      if (mode === 'add') {
        var s = this.scene();
        t.layers.forEach(function (l) { s.layers.push(l); });
        this.commit();
        this.emit('reset');
      } else {
        var scene = this.scene();
        scene.layers = t.layers;
        scene.name = t.name;
        scene.bgOn = t.bgOn;
        scene.bg = null;
        this._sel = [];
        this.commit();
        this.emit('reset');
      }
    },

    /* ---------------- theme ---------------- */
    applyTheme: function (themeId) {
      this.doc.themeId = themeId;
      this.doc.scenes.forEach(function (s) { s.themeId = themeId; });
      this.commit();
      this.emit('reset');
    },

    /* ---------------- persistence ---------------- */
    autosave: U.debounce(function () {
      try { localStorage.setItem(this.STORE, JSON.stringify(this.doc)); } catch (e) { /* quota / file:// */ }
    }, 600),
    save: function () {
      try {
        localStorage.setItem(this.STORE, JSON.stringify(this.doc));
        U.toast('Project saved locally');
        return true;
      } catch (e) {
        U.toast('Could not save (storage blocked)', 'warn');
        return false;
      }
    },
    load: function () {
      try {
        var raw = localStorage.getItem(this.STORE);
        if (!raw) return null;
        var d = JSON.parse(raw);
        if (!d || !d.scenes || !d.scenes.length) return null;
        return d;
      } catch (e) { return null; }
    },
    clearSave: function () {
      try { localStorage.removeItem(this.STORE); } catch (e) { /* ignore */ }
    },
    toJSON: function () { return JSON.stringify(this.doc, null, 2); },
    fromJSON: function (text) {
      var d = JSON.parse(text);
      if (!d || !d.scenes) throw new Error('Not an Overlay Studio project');
      this.init(d);
      this.ensureValid();
    }
  };

  OS.Model = M;
})(window.OS = window.OS || {});
