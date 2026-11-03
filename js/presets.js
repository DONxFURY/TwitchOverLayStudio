/* ==========================================================================
   Twitch Overlay Studio — presets.js
   Themes, fonts, the layer factory and the starter template packs.
   Colours are stored as tokens ("@primary") and resolved at render time so
   switching a theme instantly re-skins every scene.
   ========================================================================== */
(function (OS) {
  'use strict';
  var U = OS.U;

  /* ------------------------------------------------------------------ */
  /* Fonts                                                              */
  /* ------------------------------------------------------------------ */
  var FONTS = [
    { label: 'Bahnschrift Condensed (Win)', value: '"Bahnschrift","Segoe UI Semibold","Arial Narrow",Impact,sans-serif' },
    { label: 'Impact', value: 'Impact,"Haettenschweiler","Arial Narrow Bold",sans-serif' },
    { label: 'Arial Black', value: '"Arial Black","Arial Bold",Gadget,sans-serif' },
    { label: 'Franklin Gothic', value: '"Franklin Gothic Medium","Arial Narrow",Arial,sans-serif' },
    { label: 'Segoe UI', value: '"Segoe UI",Tahoma,Geneva,sans-serif' },
    { label: 'Arial', value: 'Arial,Helvetica,sans-serif' },
    { label: 'Verdana', value: 'Verdana,Geneva,sans-serif' },
    { label: 'Trebuchet MS', value: '"Trebuchet MS",Helvetica,sans-serif' },
    { label: 'Tahoma', value: 'Tahoma,Verdana,sans-serif' },
    { label: 'Georgia', value: 'Georgia,"Times New Roman",serif' },
    { label: 'Consolas', value: 'Consolas,"Courier New",monospace' },
    { label: 'Courier New', value: '"Courier New",Courier,monospace' }
  ];

  /* ------------------------------------------------------------------ */
  /* Themes                                                             */
  /* ------------------------------------------------------------------ */
  var THEMES = [
    {
      id: 'aurora',
      name: 'Neon Aurora',
      note: 'Deep blue sci-fi with ember dust',
      fontHead: '"Bahnschrift","Segoe UI Semibold",Impact,sans-serif',
      fontBody: '"Bahnschrift","Segoe UI",Tahoma,sans-serif',
      cut: 22,
      palette: {
        deep: '#01060f', panel: 'rgba(5,18,46,0.82)', panel2: 'rgba(3,10,28,0.6)',
        line: '#2f7dff', primary: '#1e6bff', secondary: '#00c8ff', accent: '#7ce9ff',
        text: '#eaf5ff', muted: '#93b6e0', glow: '#2f9dff', glowSoft: 'rgba(47,157,255,0.35)'
      },
      swatch: ['#0a1f45', '#1e6bff', '#00c8ff', '#7ce9ff'],
      bg: {
        base: ['#040c1e', '#071a40', '#020611'],
        angle: 150,
        radial: [
          { x: 0.5, y: 0.08, r: 0.62, color: 'rgba(40,130,255,0.55)' },
          { x: 0.12, y: 0.9, r: 0.45, color: 'rgba(255,110,20,0.16)' },
          { x: 0.9, y: 0.85, r: 0.4, color: 'rgba(0,190,255,0.12)' }
        ],
        rays: { count: 26, color: 'rgba(120,200,255,0.045)', x: 0.5, y: -0.12 },
        embers: { count: 130, colors: ['rgba(255,120,20,0.95)', 'rgba(255,185,70,0.85)', 'rgba(120,200,255,0.7)'] },
        stars: { count: 150, color: 'rgba(200,230,255,0.75)' },
        vignette: 0.85
      }
    },
    {
      id: 'cyber',
      name: 'Cyber Grid',
      note: 'Magenta synthwave grid and planet',
      fontHead: '"Bahnschrift","Segoe UI Semibold",Impact,sans-serif',
      fontBody: '"Segoe UI",Tahoma,sans-serif',
      cut: 6,
      palette: {
        deep: '#0a0212', panel: 'rgba(28,5,44,0.6)', panel2: 'rgba(14,2,24,0.45)',
        line: '#ff45e0', primary: '#c72bff', secondary: '#ff45e0', accent: '#ffb3f4',
        text: '#ffe9ff', muted: '#c78dd8', glow: '#ff3fe0', glowSoft: 'rgba(255,63,224,0.35)'
      },
      swatch: ['#2a0736', '#c72bff', '#ff45e0', '#ffb3f4'],
      bg: {
        base: ['#150320', '#2c0738', '#07010d'],
        angle: 160,
        radial: [{ x: 0.5, y: 0.02, r: 0.55, color: 'rgba(210,50,255,0.4)' }],
        circles: [{ x: 0.5, y: 0.46, r: 0.3, color: 'rgba(240,70,225,0.5)', ring: 'rgba(255,140,245,0.5)' }],
        grid: { step: 96, color: 'rgba(185,95,255,0.16)', width: 1 },
        stars: { count: 220, color: 'rgba(255,215,255,0.85)' },
        vignette: 0.55
      }
    },
    {
      id: 'ember',
      name: 'Ember Forge',
      note: 'Molten orange on black rock',
      fontHead: 'Impact,"Arial Black",sans-serif',
      fontBody: '"Segoe UI",Tahoma,sans-serif',
      cut: 16,
      palette: {
        deep: '#0a0402', panel: 'rgba(20,8,4,0.72)', panel2: 'rgba(10,3,2,0.5)',
        line: '#ff6a00', primary: '#ff5a00', secondary: '#ffb000', accent: '#ffc46b',
        text: '#fff3e6', muted: '#c09070', glow: '#ff7a1a', glowSoft: 'rgba(255,122,26,0.35)'
      },
      swatch: ['#1c0703', '#ff5a00', '#ffb000', '#ffc46b'],
      bg: {
        base: ['#0c0503', '#1e0805', '#040101'],
        angle: 165,
        radial: [
          { x: 0.5, y: 0.5, r: 0.6, color: 'rgba(255,95,10,0.28)' },
          { x: 0.5, y: 0.95, r: 0.35, color: 'rgba(255,140,0,0.18)' }
        ],
        embers: { count: 240, colors: ['rgba(255,90,10,0.95)', 'rgba(255,165,45,0.9)', 'rgba(255,45,20,0.75)'] },
        vignette: 0.95
      }
    },
    {
      id: 'violet',
      name: 'Violet Frame',
      note: 'Clean purple outline panels',
      fontHead: '"Bahnschrift","Segoe UI Semibold",Impact,sans-serif',
      fontBody: '"Segoe UI",Tahoma,sans-serif',
      cut: 12,
      palette: {
        deep: '#07040d', panel: 'rgba(18,10,32,0.55)', panel2: 'rgba(10,6,20,0.4)',
        line: '#8b45ff', primary: '#7b2bff', secondary: '#b06bff', accent: '#d7b3ff',
        text: '#f3ecff', muted: '#a58bc4', glow: '#9a5bff', glowSoft: 'rgba(154,91,255,0.32)'
      },
      swatch: ['#0d0718', '#7b2bff', '#b06bff', '#d7b3ff'],
      bg: {
        base: ['#08040f', '#100a1d', '#04020a'],
        angle: 140,
        radial: [
          { x: 0.5, y: 0.35, r: 0.72, color: 'rgba(120,50,255,0.16)' },
          { x: 0.2, y: 0.1, r: 0.4, color: 'rgba(190,110,255,0.12)' }
        ],
        grid: { step: 140, color: 'rgba(140,80,255,0.07)', width: 1 },
        stars: { count: 70, color: 'rgba(230,215,255,0.6)' },
        vignette: 0.7
      }
    },
    {
      id: 'nightcity',
      name: 'Night City',
      note: 'Cyan + pink duotone',
      fontHead: '"Bahnschrift","Segoe UI Semibold",Impact,sans-serif',
      fontBody: 'Consolas,"Courier New",monospace',
      cut: 0,
      palette: {
        deep: '#04070a', panel: 'rgba(8,16,22,0.78)', panel2: 'rgba(4,9,13,0.55)',
        line: '#00e5ff', primary: '#00e5ff', secondary: '#ff2e88', accent: '#7cf9ff',
        text: '#e9fbff', muted: '#7e9aa5', glow: '#00e5ff', glowSoft: 'rgba(0,229,255,0.3)'
      },
      swatch: ['#08131a', '#00e5ff', '#ff2e88', '#7cf9ff'],
      bg: {
        base: ['#040a0e', '#07161f', '#02050a'],
        angle: 120,
        radial: [
          { x: 0.85, y: 0.1, r: 0.45, color: 'rgba(255,46,136,0.22)' },
          { x: 0.15, y: 0.85, r: 0.5, color: 'rgba(0,229,255,0.18)' }
        ],
        grid: { step: 120, color: 'rgba(0,229,255,0.09)', width: 1 },
        scan: { gap: 4, alpha: 0.1, color: '#000' },
        vignette: 0.8
      }
    },
    {
      id: 'mono',
      name: 'Clean Mono',
      note: 'Minimal greyscale for reactive overlays',
      fontHead: '"Segoe UI Semibold","Segoe UI",Arial,sans-serif',
      fontBody: '"Segoe UI",Arial,sans-serif',
      cut: 0,
      palette: {
        deep: '#08090b', panel: 'rgba(18,20,24,0.7)', panel2: 'rgba(10,11,14,0.5)',
        line: '#4a5160', primary: '#cfd6e4', secondary: '#8f9bb3', accent: '#ffffff',
        text: '#f2f5fa', muted: '#8b93a3', glow: '#ffffff', glowSoft: 'rgba(255,255,255,0.25)'
      },
      swatch: ['#121418', '#4a5160', '#8f9bb3', '#f2f5fa'],
      bg: {
        base: ['#0a0b0e', '#14161b', '#060708'],
        angle: 135,
        radial: [{ x: 0.5, y: 0.4, r: 0.7, color: 'rgba(255,255,255,0.05)' }],
        vignette: 0.6
      }
    },

    /* ---------------- second batch: 20 more themes ---------------- */

    {
      id: 'bloodmoon',
      name: 'Blood Moon',
      note: 'Crimson eclipse with drifting embers',
      fontHead: 'Impact,"Arial Black",sans-serif',
      fontBody: '"Segoe UI",Tahoma,sans-serif',
      cut: 18,
      palette: {
        deep: '#0b0204', panel: 'rgba(30,6,10,0.78)', panel2: 'rgba(16,3,6,0.55)',
        line: '#ff2d55', primary: '#c8102e', secondary: '#ff3b5c', accent: '#ff9db0',
        text: '#fff0f3', muted: '#c08a94', glow: '#ff2d55', glowSoft: 'rgba(255,45,85,0.35)'
      },
      swatch: ['#1a0509', '#c8102e', '#ff3b5c', '#ff9db0'],
      bg: {
        base: ['#0d0305', '#21070d', '#030102'],
        angle: 160,
        radial: [
          { x: 0.5, y: 0.1, r: 0.6, color: 'rgba(200,16,46,0.45)' },
          { x: 0.5, y: 0.95, r: 0.4, color: 'rgba(255,60,90,0.18)' }
        ],
        embers: { count: 120, colors: ['rgba(255,45,70,0.9)', 'rgba(255,120,140,0.7)'] },
        stars: { count: 80, color: 'rgba(255,220,225,0.5)' },
        vignette: 0.95
      }
    },
    {
      id: 'toxic',
      name: 'Toxic Lime',
      note: 'Acid green terminal grid',
      fontHead: '"Bahnschrift","Segoe UI Semibold",Impact,sans-serif',
      fontBody: 'Consolas,"Courier New",monospace',
      cut: 10,
      palette: {
        deep: '#04080a', panel: 'rgba(8,22,14,0.8)', panel2: 'rgba(4,12,8,0.55)',
        line: '#9dff00', primary: '#7ee000', secondary: '#c6ff3d', accent: '#e8ff9c',
        text: '#f2ffe8', muted: '#8fae78', glow: '#9dff00', glowSoft: 'rgba(157,255,0,0.3)'
      },
      swatch: ['#0a1a0c', '#7ee000', '#c6ff3d', '#e8ff9c'],
      bg: {
        base: ['#050c08', '#0a1a10', '#020504'],
        angle: 130,
        radial: [{ x: 0.5, y: 0.9, r: 0.55, color: 'rgba(126,224,0,0.25)' }],
        grid: { step: 70, color: 'rgba(157,255,0,0.08)', width: 1 },
        scan: { gap: 3, alpha: 0.12, color: '#000' },
        vignette: 0.85
      }
    },
    {
      id: 'arctic',
      name: 'Arctic Mint',
      note: 'Frozen teal with a clean glass feel',
      fontHead: '"Segoe UI Semibold","Segoe UI",Arial,sans-serif',
      fontBody: '"Segoe UI",Tahoma,sans-serif',
      cut: 14,
      palette: {
        deep: '#02141a', panel: 'rgba(6,32,40,0.72)', panel2: 'rgba(3,18,24,0.5)',
        line: '#5ff0d0', primary: '#14b8a6', secondary: '#67e8f9', accent: '#c8fff4',
        text: '#eafeff', muted: '#89b8bf', glow: '#5ff0d0', glowSoft: 'rgba(95,240,208,0.3)'
      },
      swatch: ['#072229', '#14b8a6', '#67e8f9', '#c8fff4'],
      bg: {
        base: ['#04161c', '#072a33', '#010a0d'],
        angle: 145,
        radial: [
          { x: 0.8, y: 0.15, r: 0.5, color: 'rgba(95,240,208,0.3)' },
          { x: 0.15, y: 0.8, r: 0.45, color: 'rgba(103,232,249,0.16)' }
        ],
        stars: { count: 110, color: 'rgba(220,255,255,0.65)' },
        vignette: 0.75
      }
    },
    {
      id: 'sandstorm',
      name: 'Sand Storm',
      note: 'Dune amber on warm rock',
      fontHead: 'Georgia,"Times New Roman",serif',
      fontBody: '"Segoe UI",Tahoma,sans-serif',
      cut: 8,
      palette: {
        deep: '#0e0a03', panel: 'rgba(38,28,12,0.74)', panel2: 'rgba(20,14,6,0.5)',
        line: '#e0a83c', primary: '#c98a1e', secondary: '#f0c070', accent: '#ffe6b0',
        text: '#fff8e8', muted: '#bfa37a', glow: '#e0a83c', glowSoft: 'rgba(224,168,60,0.3)'
      },
      swatch: ['#241a0c', '#c98a1e', '#f0c070', '#ffe6b0'],
      bg: {
        base: ['#12100a', '#241c10', '#080604'],
        angle: 170,
        radial: [{ x: 0.5, y: 0.5, r: 0.65, color: 'rgba(224,168,60,0.22)' }],
        grid: { step: 160, color: 'rgba(224,168,60,0.06)', width: 1 },
        vignette: 0.9
      }
    },
    {
      id: 'deepsea',
      name: 'Deep Sea',
      note: 'Abyss blue with bioluminescent teal',
      fontHead: '"Bahnschrift","Segoe UI Semibold",Impact,sans-serif',
      fontBody: '"Segoe UI",Tahoma,sans-serif',
      cut: 20,
      palette: {
        deep: '#01080f', panel: 'rgba(4,20,38,0.8)', panel2: 'rgba(2,10,20,0.55)',
        line: '#1e9bff', primary: '#0a6ed1', secondary: '#00d9c0', accent: '#7ef0ff',
        text: '#e6f7ff', muted: '#7ba6c4', glow: '#00d9c0', glowSoft: 'rgba(0,217,192,0.28)'
      },
      swatch: ['#062238', '#0a6ed1', '#00d9c0', '#7ef0ff'],
      bg: {
        base: ['#020b16', '#04203a', '#01060c'],
        angle: 160,
        radial: [{ x: 0.5, y: -0.05, r: 0.6, color: 'rgba(30,155,255,0.35)' }],
        stars: { count: 160, color: 'rgba(160,225,255,0.5)' },
        vignette: 1
      }
    },
    {
      id: 'sakura',
      name: 'Sakura',
      note: 'Blossom pink and plum',
      fontHead: '"Segoe UI Semibold","Segoe UI",Arial,sans-serif',
      fontBody: '"Segoe UI",Tahoma,sans-serif',
      cut: 16,
      palette: {
        deep: '#170810', panel: 'rgba(48,16,32,0.72)', panel2: 'rgba(28,8,18,0.5)',
        line: '#ff9ec7', primary: '#e05c93', secondary: '#ffd6e7', accent: '#fff0f7',
        text: '#fff4f8', muted: '#c79aae', glow: '#ff9ec7', glowSoft: 'rgba(255,158,199,0.3)'
      },
      swatch: ['#2a0f1c', '#e05c93', '#ffd6e7', '#fff0f7'],
      bg: {
        base: ['#1a0a12', '#2e1220', '#0a0407'],
        angle: 140,
        radial: [
          { x: 0.2, y: 0.2, r: 0.5, color: 'rgba(255,158,199,0.28)' },
          { x: 0.85, y: 0.8, r: 0.45, color: 'rgba(224,92,147,0.22)' }
        ],
        stars: { count: 90, color: 'rgba(255,225,238,0.7)' },
        vignette: 0.7
      }
    },
    {
      id: 'terminal',
      name: 'Terminal Green',
      note: 'Phosphor console with scanlines',
      fontHead: 'Consolas,"Courier New",monospace',
      fontBody: 'Consolas,"Courier New",monospace',
      cut: 0,
      palette: {
        deep: '#010601', panel: 'rgba(4,20,8,0.8)', panel2: 'rgba(2,10,4,0.6)',
        line: '#3dff7a', primary: '#22c55e', secondary: '#7dffab', accent: '#b6ffcf',
        text: '#dcffe8', muted: '#7fae8c', glow: '#3dff7a', glowSoft: 'rgba(61,255,122,0.3)'
      },
      swatch: ['#05170b', '#22c55e', '#7dffab', '#b6ffcf'],
      bg: {
        base: ['#020a04', '#04140a', '#000401'],
        angle: 180,
        scan: { gap: 3, alpha: 0.16, color: '#000' },
        radial: [{ x: 0.5, y: 0.5, r: 0.7, color: 'rgba(34,197,94,0.16)' }],
        vignette: 1
      }
    },
    {
      id: 'ambercrt',
      name: 'Amber CRT',
      note: 'Warm mono phosphor, scanline heavy',
      fontHead: 'Consolas,"Courier New",monospace',
      fontBody: 'Consolas,"Courier New",monospace',
      cut: 0,
      palette: {
        deep: '#0a0500', panel: 'rgba(32,16,2,0.82)', panel2: 'rgba(18,8,1,0.6)',
        line: '#ffa41b', primary: '#e78f00', secondary: '#ffc357', accent: '#ffe2a8',
        text: '#fff3dd', muted: '#b8925f', glow: '#ffa41b', glowSoft: 'rgba(255,164,27,0.3)'
      },
      swatch: ['#241303', '#e78f00', '#ffc357', '#ffe2a8'],
      bg: {
        base: ['#0d0702', '#1c1003', '#050200'],
        angle: 175,
        scan: { gap: 4, alpha: 0.18, color: '#000' },
        radial: [{ x: 0.5, y: 0.45, r: 0.6, color: 'rgba(255,164,27,0.2)' }],
        vignette: 1
      }
    },
    {
      id: 'cobalt',
      name: 'Cobalt Steel',
      note: 'Cold industrial blue, brushed metal',
      fontHead: '"Bahnschrift","Segoe UI Semibold",Impact,sans-serif',
      fontBody: '"Segoe UI",Tahoma,sans-serif',
      cut: 6,
      palette: {
        deep: '#050a12', panel: 'rgba(16,26,40,0.76)', panel2: 'rgba(8,14,24,0.55)',
        line: '#4c7dd6', primary: '#2f5fd0', secondary: '#8fb4ff', accent: '#cfe0ff',
        text: '#eef4ff', muted: '#8b9cba', glow: '#4c7dd6', glowSoft: 'rgba(76,125,214,0.3)'
      },
      swatch: ['#0d1826', '#2f5fd0', '#8fb4ff', '#cfe0ff'],
      bg: {
        base: ['#060c16', '#0c1828', '#03060c'],
        angle: 135,
        radial: [{ x: 0.5, y: 0.1, r: 0.55, color: 'rgba(47,95,208,0.3)' }],
        grid: { step: 120, color: 'rgba(76,125,214,0.07)', width: 1 },
        vignette: 0.8
      }
    },
    {
      id: 'candypop',
      name: 'Candy Pop',
      note: 'Playful purple, cyan and lemon',
      fontHead: '"Trebuchet MS","Segoe UI",sans-serif',
      fontBody: '"Trebuchet MS","Segoe UI",sans-serif',
      cut: 24,
      palette: {
        deep: '#100820', panel: 'rgba(42,18,64,0.72)', panel2: 'rgba(24,10,38,0.5)',
        line: '#ff7ad9', primary: '#a855f7', secondary: '#22d3ee', accent: '#ffe066',
        text: '#fff5ff', muted: '#b39ad4', glow: '#ff7ad9', glowSoft: 'rgba(255,122,217,0.32)'
      },
      swatch: ['#2a1140', '#a855f7', '#22d3ee', '#ffe066'],
      bg: {
        base: ['#160b28', '#2a1140', '#0a0414'],
        angle: 150,
        circles: [{ x: 0.8, y: 0.2, r: 0.28, color: 'rgba(255,122,217,0.35)', ring: 'rgba(255,224,102,0.5)' }],
        stars: { count: 140, color: 'rgba(255,235,255,0.7)' },
        vignette: 0.65
      }
    },
    {
      id: 'auroragreen',
      name: 'Aurora Borealis',
      note: 'Mint and violet northern lights',
      fontHead: '"Bahnschrift","Segoe UI Semibold",Impact,sans-serif',
      fontBody: '"Segoe UI",Tahoma,sans-serif',
      cut: 18,
      palette: {
        deep: '#020d12', panel: 'rgba(4,26,30,0.74)', panel2: 'rgba(2,14,18,0.5)',
        line: '#37f0a4', primary: '#00c48c', secondary: '#8b5cf6', accent: '#b8ffe4',
        text: '#eafff7', muted: '#79a8a4', glow: '#37f0a4', glowSoft: 'rgba(55,240,164,0.3)'
      },
      swatch: ['#062224', '#00c48c', '#8b5cf6', '#b8ffe4'],
      bg: {
        base: ['#03121a', '#06262c', '#01080c'],
        angle: 155,
        radial: [
          { x: 0.3, y: 0.2, r: 0.55, color: 'rgba(55,240,164,0.3)' },
          { x: 0.75, y: 0.3, r: 0.5, color: 'rgba(139,92,246,0.28)' }
        ],
        stars: { count: 180, color: 'rgba(210,255,240,0.7)' },
        vignette: 0.85
      }
    },
    {
      id: 'gold',
      name: 'Black Gold',
      note: 'Luxury gold rules on charcoal',
      fontHead: 'Georgia,"Times New Roman",serif',
      fontBody: '"Segoe UI",Tahoma,sans-serif',
      cut: 12,
      palette: {
        deep: '#070604', panel: 'rgba(26,22,12,0.78)', panel2: 'rgba(14,12,6,0.55)',
        line: '#d4af37', primary: '#b8912f', secondary: '#f0d478', accent: '#fff0b8',
        text: '#fffbea', muted: '#b8a978', glow: '#d4af37', glowSoft: 'rgba(212,175,55,0.3)'
      },
      swatch: ['#1a160c', '#b8912f', '#f0d478', '#fff0b8'],
      bg: {
        base: ['#0a0906', '#16130c', '#030302'],
        angle: 160,
        radial: [{ x: 0.5, y: 0.05, r: 0.6, color: 'rgba(212,175,55,0.22)' }],
        grid: { step: 180, color: 'rgba(212,175,55,0.05)', width: 1 },
        vignette: 0.95
      }
    },
    {
      id: 'forest',
      name: 'Forest Moss',
      note: 'Earthy green with soft mist',
      fontHead: 'Georgia,"Times New Roman",serif',
      fontBody: '"Segoe UI",Tahoma,sans-serif',
      cut: 10,
      palette: {
        deep: '#040a05', panel: 'rgba(14,30,18,0.76)', panel2: 'rgba(7,16,10,0.55)',
        line: '#5fa855', primary: '#3f7d3a', secondary: '#a3d977', accent: '#d8f0b8',
        text: '#f0fff0', muted: '#8fb08a', glow: '#7dc46a', glowSoft: 'rgba(125,196,106,0.28)'
      },
      swatch: ['#0c1c11', '#3f7d3a', '#a3d977', '#d8f0b8'],
      bg: {
        base: ['#060e08', '#0c1c12', '#020503'],
        angle: 140,
        radial: [{ x: 0.5, y: 0.8, r: 0.6, color: 'rgba(125,196,106,0.18)' }],
        stars: { count: 70, color: 'rgba(220,255,200,0.4)' },
        vignette: 0.9
      }
    },
    {
      id: 'ultraviolet',
      name: 'Ultraviolet',
      note: 'Electric violet and hot pink',
      fontHead: '"Bahnschrift","Segoe UI Semibold",Impact,sans-serif',
      fontBody: 'Consolas,"Courier New",monospace',
      cut: 22,
      palette: {
        deep: '#06010f', panel: 'rgba(22,6,46,0.8)', panel2: 'rgba(12,2,26,0.55)',
        line: '#a855f7', primary: '#7c3aed', secondary: '#ec4899', accent: '#e9d5ff',
        text: '#f8f0ff', muted: '#a68bc4', glow: '#a855f7', glowSoft: 'rgba(168,85,247,0.34)'
      },
      swatch: ['#160a2c', '#7c3aed', '#ec4899', '#e9d5ff'],
      bg: {
        base: ['#08031a', '#140730', '#03010a'],
        angle: 150,
        radial: [
          { x: 0.5, y: 0.15, r: 0.55, color: 'rgba(124,58,237,0.35)' },
          { x: 0.8, y: 0.85, r: 0.4, color: 'rgba(236,72,153,0.25)' }
        ],
        grid: { step: 100, color: 'rgba(168,85,247,0.09)', width: 1 },
        vignette: 0.9
      }
    },
    {
      id: 'copper',
      name: 'Copper Patina',
      note: 'Burnt copper with oxidised teal',
      fontHead: '"Bahnschrift","Segoe UI Semibold",Impact,sans-serif',
      fontBody: '"Segoe UI",Tahoma,sans-serif',
      cut: 14,
      palette: {
        deep: '#0a0603', panel: 'rgba(34,20,12,0.78)', panel2: 'rgba(18,10,6,0.55)',
        line: '#c97a3d', primary: '#b4602c', secondary: '#4fd1b5', accent: '#ffd0a8',
        text: '#fff4ec', muted: '#bf9779', glow: '#ff8b3d', glowSoft: 'rgba(255,139,61,0.3)'
      },
      swatch: ['#22140c', '#b4602c', '#4fd1b5', '#ffd0a8'],
      bg: {
        base: ['#0e0805', '#1e120b', '#040201'],
        angle: 165,
        radial: [
          { x: 0.25, y: 0.2, r: 0.5, color: 'rgba(180,96,44,0.25)' },
          { x: 0.8, y: 0.8, r: 0.45, color: 'rgba(79,209,181,0.14)' }
        ],
        vignette: 0.9
      }
    },
    {
      id: 'bubblegum',
      name: 'Bubblegum',
      note: 'Hot pink and periwinkle pop',
      fontHead: '"Trebuchet MS","Segoe UI",sans-serif',
      fontBody: '"Trebuchet MS","Segoe UI",sans-serif',
      cut: 26,
      palette: {
        deep: '#12061a', panel: 'rgba(46,12,42,0.7)', panel2: 'rgba(26,6,24,0.5)',
        line: '#ff8ad4', primary: '#ff2e9a', secondary: '#8a7dff', accent: '#ffd6f5',
        text: '#fff2fb', muted: '#c79ac0', glow: '#ff2e9a', glowSoft: 'rgba(255,46,154,0.32)'
      },
      swatch: ['#2c0b28', '#ff2e9a', '#8a7dff', '#ffd6f5'],
      bg: {
        base: ['#1a0722', '#2c0b28', '#0a0310'],
        angle: 145,
        radial: [
          { x: 0.15, y: 0.85, r: 0.5, color: 'rgba(255,46,154,0.28)' },
          { x: 0.85, y: 0.15, r: 0.45, color: 'rgba(138,125,255,0.28)' }
        ],
        stars: { count: 120, color: 'rgba(255,220,246,0.7)' },
        vignette: 0.6
      }
    },
    {
      id: 'indigo',
      name: 'Midnight Indigo',
      note: 'Quiet indigo with a starfield',
      fontHead: '"Segoe UI Semibold","Segoe UI",Arial,sans-serif',
      fontBody: '"Segoe UI",Tahoma,sans-serif',
      cut: 8,
      palette: {
        deep: '#02040f', panel: 'rgba(10,16,42,0.8)', panel2: 'rgba(5,8,24,0.55)',
        line: '#5566ff', primary: '#3d4ce0', secondary: '#8fa1ff', accent: '#cdd8ff',
        text: '#eef1ff', muted: '#8692c0', glow: '#5566ff', glowSoft: 'rgba(85,102,255,0.3)'
      },
      swatch: ['#0a1029', '#3d4ce0', '#8fa1ff', '#cdd8ff'],
      bg: {
        base: ['#03050f', '#070c22', '#010206'],
        angle: 160,
        radial: [{ x: 0.5, y: 0.05, r: 0.6, color: 'rgba(61,76,224,0.32)' }],
        stars: { count: 200, color: 'rgba(200,215,255,0.7)' },
        vignette: 0.9
      }
    },
    {
      id: 'tangerine',
      name: 'Neon Tangerine',
      note: 'High-energy orange with embers',
      fontHead: 'Impact,"Arial Black",sans-serif',
      fontBody: '"Segoe UI",Tahoma,sans-serif',
      cut: 20,
      palette: {
        deep: '#0c0400', panel: 'rgba(32,12,4,0.78)', panel2: 'rgba(18,6,2,0.55)',
        line: '#ff7a1a', primary: '#ff4d0f', secondary: '#ffb020', accent: '#ffd89b',
        text: '#fff5ec', muted: '#c39577', glow: '#ff7a1a', glowSoft: 'rgba(255,122,26,0.32)'
      },
      swatch: ['#24100a', '#ff4d0f', '#ffb020', '#ffd89b'],
      bg: {
        base: ['#100602', '#220d04', '#050200'],
        angle: 155,
        radial: [{ x: 0.5, y: 0.85, r: 0.55, color: 'rgba(255,77,15,0.3)' }],
        embers: { count: 180, colors: ['rgba(255,77,15,0.9)', 'rgba(255,176,32,0.8)'] },
        vignette: 0.9
      }
    },
    {
      id: 'sepia',
      name: 'Vintage Sepia',
      note: 'Old film warmth and grain',
      fontHead: 'Georgia,"Times New Roman",serif',
      fontBody: 'Georgia,"Times New Roman",serif',
      cut: 6,
      palette: {
        deep: '#0b0805', panel: 'rgba(38,30,20,0.78)', panel2: 'rgba(20,16,10,0.55)',
        line: '#a8834e', primary: '#8c6a3f', secondary: '#c9a678', accent: '#e8d3b0',
        text: '#f6efe2', muted: '#b3a186', glow: '#c9a678', glowSoft: 'rgba(201,166,120,0.28)'
      },
      swatch: ['#241c12', '#8c6a3f', '#c9a678', '#e8d3b0'],
      bg: {
        base: ['#0e0b07', '#1c160e', '#050402'],
        angle: 170,
        radial: [{ x: 0.5, y: 0.4, r: 0.7, color: 'rgba(201,166,120,0.16)' }],
        scan: { gap: 6, alpha: 0.08, color: '#000' },
        vignette: 1
      }
    },
    {
      id: 'glacier',
      name: 'Glacier · Light',
      note: 'Bright frosted theme with dark ink text',
      fontHead: '"Segoe UI Semibold","Segoe UI",Arial,sans-serif',
      fontBody: '"Segoe UI",Tahoma,sans-serif',
      cut: 14,
      palette: {
        deep: '#dfeaf7', panel: 'rgba(255,255,255,0.86)', panel2: 'rgba(255,255,255,0.6)',
        line: '#5c9fd6', primary: '#2b7fd4', secondary: '#38b6a0', accent: '#0f4c81',
        text: '#10263a', muted: '#5a7288', glow: '#7fc4ff', glowSoft: 'rgba(127,196,255,0.35)'
      },
      swatch: ['#eaf2fb', '#2b7fd4', '#38b6a0', '#10263a'],
      bg: {
        base: ['#eef5fc', '#dbe8f6', '#c9dcee'],
        angle: 150,
        radial: [
          { x: 0.5, y: 0.15, r: 0.6, color: 'rgba(255,255,255,0.85)' },
          { x: 0.8, y: 0.9, r: 0.5, color: 'rgba(127,196,255,0.35)' }
        ],
        vignette: 0.12
      }
    }
  ];

  function themeById(id) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
    return THEMES[0];
  }

  /* ------------------------------------------------------------------ */
  /* Token + style helpers                                              */
  /* ------------------------------------------------------------------ */
  function color(v, theme) {
    if (v == null) return 'transparent';
    v = String(v);
    if (v.charAt(0) === '@') {
      var key = v.slice(1);
      var p = (theme && theme.palette) || {};
      return p[key] != null ? p[key] : v;
    }
    return v;
  }

  function font(v, theme) {
    if (!v) return (theme && theme.fontBody) || 'sans-serif';
    v = String(v);
    if (v === '@fontHead') return theme.fontHead;
    if (v === '@fontBody') return theme.fontBody;
    return v;
  }

  function fillCSS(fill, theme) {
    if (!fill || fill.type === 'none') return 'transparent';
    if (fill.type === 'gradient') {
      var deg = fill.angle == null ? 160 : fill.angle;
      return 'linear-gradient(' + deg + 'deg, ' + color(fill.c1, theme) + ' 0%, ' + color(fill.c2, theme) + ' 100%)';
    }
    return color(fill.c1, theme);
  }

  /* Corner-cut geometry ------------------------------------------------ */
  function polyPts(w, h, cz, c) {
    cz = cz || { tl: 1, tr: 1, br: 1, bl: 1 };
    c = Math.max(0, Math.min(c || 0, Math.min(w, h) / 2 - 1));
    var tl = cz.tl ? c : 0, tr = cz.tr ? c : 0, br = cz.br ? c : 0, bl = cz.bl ? c : 0;
    var p = [];
    p.push([tl, 0]);
    p.push([w - tr, 0]);
    if (tr) p.push([w, tr]);
    p.push([w, h - br]);
    if (br) p.push([w - br, h]);
    p.push([bl, h]);
    if (bl) p.push([0, h - bl]);
    p.push([0, tl]);
    return p;
  }

  function pathStr(pts) {
    var out = 'M';
    for (var i = 0; i < pts.length; i++) out += (i ? ' L' : '') + U.round(pts[i][0], 2) + ' ' + U.round(pts[i][1], 2);
    return out + ' Z';
  }

  /** Clip path for a layer box. `inset` pushes the polygon inward. */
  function clip(layer, w, h, inset) {
    inset = inset || 0;
    if (!layer || !layer.cut) return 'none';
    var sw = w - inset * 2, sh = h - inset * 2;
    if (sw <= 2 || sh <= 2) return 'none';
    var pts = polyPts(sw, sh, layer.cz, Math.max(0, (layer.cut || 0) - inset))
      .map(function (p) { return [p[0] + inset, p[1] + inset]; });
    return 'path("' + pathStr(pts) + '")';
  }

  /** Outline ring clip: outer polygon with an inner hole (nonzero winding). */
  function ring(layer, w, h, bw) {
    if (!layer || !layer.cut || !bw) return 'none';
    var outer = polyPts(w, h, layer.cz, layer.cut);
    var inner = polyPts(w - bw * 2, h - bw * 2, layer.cz, Math.max(0, layer.cut - bw))
      .map(function (p) { return [p[0] + bw, p[1] + bw]; })
      .reverse();
    return 'path("' + pathStr(outer) + ' ' + pathStr(inner) + '")';
  }

  function radius(layer, inset) {
    if (!layer || layer.cut) return 0;
    return Math.max(0, (layer.radius || 0) - (inset || 0));
  }

  /* ------------------------------------------------------------------ */
  /* Layer factory                                                      */
  /* ------------------------------------------------------------------ */
  var NAMES = { panel: 'Panel', text: 'Text', image: 'Image', camera: 'Camera', chat: 'Chat' };

  function make(type, o) {
    o = o || {};
    var base = {
      id: U.uid('l'),
      type: type,
      name: o.name || NAMES[type] || 'Layer',
      x: 0, y: 0, w: 400, h: 200,
      rot: 0, opacity: 1, locked: false, hidden: false,
      fill: { type: 'solid', c1: '@panel', c2: '@panel2', angle: 160 },
      border: { w: 2, color: '@line', glow: 0, glowColor: '@glow' },
      cz: { tl: true, tr: true, br: true, bl: true },
      cut: 18, radius: 0,
      shadow: 0, shadowColor: 'rgba(0,0,0,0.55)',
      blend: 'normal',
      frame: { style: 'rim', thickness: 3, cut: 18, gap: 8, accent: 'none', accentColor: '@secondary', glow: 0 },
      anim: {
        type: 'none', speed: 4, delay: 0, amp: 14,
        enter: 'none', enterDur: 0.7, enterEase: 'easeOutCubic',
        exit: 'none', exitDur: 0.6, exitEase: 'easeInOutCubic'
      },
      text: {
        value: 'Text', font: '@fontHead', size: 48, weight: 800,
        color: '@text', ls: 2, lh: 1.05, align: 'center', upper: false,
        glow: 0, glowColor: '@glow', italic: false
      },
      img: { src: '', fit: 'cover' },
      cam: { label: 'CAMERA', mirror: true },
      chat: { channel: '', size: 24, color: '@text', userColor: '@accent' }
    };
    if (type !== 'panel') {
      base.fill = { type: 'none', c1: '@panel', c2: '@panel2', angle: 160 };
      base.border = { w: 0, color: '@line', glow: 0, glowColor: '@glow' };
      base.cut = 0;
    }
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    Object.keys(o).forEach(function (k) { out[k] = o[k]; });
    ['fill', 'border', 'cz', 'anim', 'text', 'img', 'cam', 'chat', 'frame'].forEach(function (k) {
      if (o[k]) {
        var merged = {};
        Object.keys(base[k]).forEach(function (kk) { merged[kk] = base[k][kk]; });
        Object.keys(o[k]).forEach(function (kk) { merged[kk] = o[k][kk]; });
        out[k] = merged;
      }
    });
    return out;
  }

  function panel(x, y, w, h, o) {
    o = o || {};
    o.x = x; o.y = y; o.w = w; o.h = h;
    if (o.cut == null) o.cut = 20;
    return make('panel', o);
  }

  function text(x, y, w, h, value, o) {
    o = o || {};
    o.x = x; o.y = y; o.w = w; o.h = h;
    o.text = o.text || {};
    o.text.value = value;
    return make('text', o);
  }

  /* ------------------------------------------------------------------ */
  /* Templates                                                          */
  /* ------------------------------------------------------------------ */
  var SOCIAL_KEYS = ['{{twitch}}', '{{twitter}}', '{{youtube}}', '{{discord}}'];

  function socialRow(y, opts) {
    opts = opts || {};
    var n = SOCIAL_KEYS.length, w = opts.w || 320, gap = 20;
    var total = n * w + (n - 1) * gap;
    var x0 = (1920 - total) / 2;
    var out = [];
    SOCIAL_KEYS.forEach(function (key, i) {
      var x = x0 + i * (w + gap);
      out.push(panel(x, y, w, 62, {
        name: 'Social chip ' + (i + 1), cut: 14,
        fill: { type: 'solid', c1: '@panel' },
        border: { w: 2, color: '@line', glow: 14, glowColor: '@glow' }
      }));
      out.push(text(x, y + 8, w, 50, key, {
        name: 'Social label ' + (i + 1),
        text: { size: 22, weight: 700, ls: 3, color: '@accent' }
      }));
    });
    return out;
  }

  var TEMPLATES = [
    {
      id: 'starting',
      name: 'Stream Starting',
      note: 'Opener with a big countdown title and social rail',
      build: function () {
        var layers = [
          panel(660, 66, 600, 78, {
            name: 'Brand plate', cut: 22,
            fill: { type: 'solid', c1: '@panel' },
            border: { w: 2, color: '@line', glow: 22, glowColor: '@glow' }
          }),
          text(660, 72, 600, 66, '{{channel}}', {
            name: 'Channel name',
            text: { size: 30, weight: 800, ls: 10, upper: true, color: '@accent', glow: 12 }
          }),
          panel(420, 103, 210, 4, {
            name: 'Rail left', cut: 0,
            fill: { type: 'gradient', c1: 'rgba(0,0,0,0)', c2: '@primary', angle: 90 },
            border: { w: 0, color: 'transparent' }
          }),
          panel(1290, 103, 210, 4, {
            name: 'Rail right', cut: 0,
            fill: { type: 'gradient', c1: '@primary', c2: 'rgba(0,0,0,0)', angle: 90 },
            border: { w: 0, color: 'transparent' }
          }),
          text(0, 560, 1920, 44, 'S T R E A M   I S', {
            name: 'Kicker',
            text: { size: 26, weight: 700, ls: 18, color: '@accent', glow: 10 }
          }),
          text(0, 606, 1920, 230, 'STARTING SOON', {
            name: 'Headline',
            text: { size: 172, weight: 900, ls: 4, lh: 1, color: '@text', glow: 44, glowColor: '@glow' }
          }),
          panel(720, 860, 480, 5, {
            name: 'Underline', cut: 0,
            fill: { type: 'gradient', c1: 'rgba(0,0,0,0)', c2: '@secondary', angle: 90 },
            border: { w: 0, color: 'transparent' }
          }),
          text(0, 884, 1920, 40, 'LOADING THE GOOD STUFF · {{date}}', {
            name: 'Subline',
            text: { size: 22, weight: 600, ls: 8, color: '@muted' }
          })
        ];
        return layers.concat(socialRow(948));
      }
    },
    {
      id: 'live',
      name: 'Live Gameplay',
      note: 'Transparent gameplay layout: camera, chat, alerts',
      transparent: true,
      build: function () {
        var layers = [
          panel(240, 34, 1440, 66, {
            name: 'Top bar', cut: 24,
            fill: { type: 'solid', c1: '@panel' },
            border: { w: 2, color: '@line', glow: 18, glowColor: '@glow' }
          }),
          text(240, 39, 1440, 56, '{{channel}}', {
            name: 'Channel name',
            text: { size: 28, weight: 800, ls: 9, upper: true, color: '@text', glow: 12 }
          })
        ];
        ['NEW FOLLOWER', 'NEW SUBSCRIBER', 'NEW RAID'].forEach(function (label, i) {
          var y = 210 + i * 108;
          layers.push(panel(44, y, 340, 84, {
            name: label + ' frame', cut: 18,
            fill: { type: 'solid', c1: '@panel' },
            border: { w: 2, color: '@line', glow: 16, glowColor: '@glow' }
          }));
          layers.push(panel(44, y + 14, 5, 56, {
            name: label + ' accent', cut: 0,
            fill: { type: 'solid', c1: '@primary' },
            border: { w: 0, color: 'transparent' }
          }));
          layers.push(text(62, y + 10, 300, 28, label, {
            name: label + ' label',
            text: { size: 17, weight: 700, ls: 5, color: '@accent' }
          }));
          layers.push(text(62, y + 40, 300, 34, '—', {
            name: label + ' value',
            text: { size: 24, weight: 800, ls: 2, color: '@text' }
          }));
        });
        layers.push(panel(40, 700, 600, 320, {
          name: 'Camera frame', cut: 20,
          fill: { type: 'solid', c1: '@panel2' },
          border: { w: 3, color: '@primary', glow: 26, glowColor: '@glow' }
        }));
        layers.push(make('camera', {
          name: 'Camera', x: 50, y: 710, w: 580, h: 300, cut: 14,
          border: { w: 1, color: '@line', glow: 0, glowColor: '@glow' }
        }));
        layers.push(panel(40, 962, 300, 54, {
          name: 'Name plate', cut: 14,
          fill: { type: 'solid', c1: '@panel' },
          border: { w: 2, color: '@line', glow: 12, glowColor: '@glow' }
        }));
        layers.push(text(40, 967, 300, 46, '{{channel}}', {
          name: 'Name plate text',
          text: { size: 22, weight: 800, ls: 6, upper: true, color: '@text' }
        }));
        layers.push(panel(1372, 500, 508, 46, {
          name: 'Chat header', cut: 12,
          fill: { type: 'solid', c1: '@panel' },
          border: { w: 2, color: '@line', glow: 14, glowColor: '@glow' }
        }));
        layers.push(text(1372, 505, 508, 36, 'LIVE CHAT', {
          name: 'Chat header text',
          text: { size: 18, weight: 800, ls: 8, color: '@accent' }
        }));
        layers.push(panel(1372, 552, 508, 490, {
          name: 'Chat panel', cut: 16,
          fill: { type: 'solid', c1: 'rgba(3,10,26,0.62)' },
          border: { w: 2, color: '@line', glow: 0, glowColor: '@glow' }
        }));
        layers.push(make('chat', { name: 'Twitch chat', x: 1392, y: 570, w: 468, h: 454, chat: { size: 23 } }));
        return layers.concat(socialRow(996, { w: 246 }));
      }
    },
    {
      id: 'intermission',
      name: 'Intermission',
      note: 'Full-bleed break scene with a video area',
      transparent: false,
      build: function () {
        return [
          text(0, 96, 1920, 70, 'I N T E R M I S S I O N', {
            name: 'Title',
            text: { size: 46, weight: 800, ls: 16, color: '@text', glow: 26, glowColor: '@glow' }
          }),
          text(0, 168, 1920, 34, 'WE WILL BE RIGHT BACK', {
            name: 'Subtitle',
            text: { size: 20, weight: 600, ls: 10, color: '@accent' }
          }),
          panel(300, 226, 1320, 566, {
            name: 'Video frame', cut: 30,
            fill: { type: 'solid', c1: '@panel2' },
            border: { w: 3, color: '@line', glow: 30, glowColor: '@glow' }
          }),
          make('camera', {
            name: 'Camera', x: 318, y: 244, w: 1284, h: 530, cut: 22,
            border: { w: 1, color: '@line', glow: 0, glowColor: '@glow' }
          }),
          panel(300, 826, 420, 132, {
            name: 'Info 1', cut: 18,
            fill: { type: 'solid', c1: '@panel' },
            border: { w: 2, color: '@line', glow: 14, glowColor: '@glow' }
          }),
          text(300, 842, 420, 26, 'NOW PLAYING', {
            name: 'Info 1 label',
            text: { size: 16, weight: 700, ls: 6, color: '@accent' }
          }),
          text(300, 872, 420, 60, 'lofi beats', {
            name: 'Info 1 value',
            text: { size: 30, weight: 700, color: '@text' }
          }),
          panel(750, 826, 420, 132, {
            name: 'Info 2', cut: 18,
            fill: { type: 'solid', c1: '@panel' },
            border: { w: 2, color: '@line', glow: 14, glowColor: '@glow' }
          }),
          text(750, 842, 420, 26, 'UP NEXT', {
            name: 'Info 2 label',
            text: { size: 16, weight: 700, ls: 6, color: '@accent' }
          }),
          text(750, 872, 420, 60, 'ranked grind', {
            name: 'Info 2 value',
            text: { size: 30, weight: 700, color: '@text' }
          }),
          panel(1200, 826, 420, 132, {
            name: 'Info 3', cut: 18,
            fill: { type: 'solid', c1: '@panel' },
            border: { w: 2, color: '@line', glow: 14, glowColor: '@glow' }
          }),
          text(1200, 842, 420, 26, 'LOCAL TIME', {
            name: 'Info 3 label',
            text: { size: 16, weight: 700, ls: 6, color: '@accent' }
          }),
          text(1200, 872, 420, 60, '{{time}}', {
            name: 'Clock',
            text: { size: 34, weight: 800, color: '@text', glow: 14, glowColor: '@glow' }
          })
        ];
      }
    },
    {
      id: 'brb',
      name: 'Be Right Back',
      note: 'Break card with camera and chat',
      transparent: false,
      build: function () {
        return [
          text(0, 240, 1920, 210, 'BE RIGHT BACK', {
            name: 'Headline',
            text: { size: 168, weight: 900, ls: 2, lh: 1, color: '@text', glow: 40, glowColor: '@glow' }
          }),
          text(0, 452, 1920, 40, 'STREAM WILL RESUME SHORTLY', {
            name: 'Subline',
            text: { size: 24, weight: 600, ls: 12, color: '@accent' }
          }),
          panel(790, 512, 340, 74, {
            name: 'Timer frame', cut: 16,
            fill: { type: 'solid', c1: '@panel' },
            border: { w: 2, color: '@line', glow: 16, glowColor: '@glow' }
          }),
          text(790, 520, 340, 60, '{{time}}', {
            name: 'Clock',
            text: { size: 38, weight: 800, color: '@text', glow: 14, glowColor: '@glow' }
          }),
          panel(80, 640, 520, 300, {
            name: 'Camera frame', cut: 20,
            fill: { type: 'solid', c1: '@panel2' },
            border: { w: 3, color: '@primary', glow: 24, glowColor: '@glow' }
          }),
          make('camera', { name: 'Camera', x: 90, y: 650, w: 500, h: 280, cut: 14 }),
          panel(1320, 600, 520, 430, {
            name: 'Chat panel', cut: 18,
            fill: { type: 'solid', c1: 'rgba(3,10,26,0.62)' },
            border: { w: 2, color: '@line', glow: 0, glowColor: '@glow' }
          }),
          make('chat', { name: 'Twitch chat', x: 1340, y: 618, w: 480, h: 394 })
        ];
      }
    },
    {
      id: 'offline',
      name: 'Offline Screen',
      note: 'Channel offline card with schedule',
      transparent: false,
      build: function () {
        return [
          text(0, 210, 1920, 180, 'STREAM IS OFFLINE', {
            name: 'Headline',
            text: { size: 128, weight: 900, ls: 2, lh: 1, color: '@text', glow: 36, glowColor: '@glow' }
          }),
          text(0, 400, 1920, 40, 'FOLLOW TO CATCH THE NEXT ONE', {
            name: 'Subline',
            text: { size: 22, weight: 600, ls: 10, color: '@accent' }
          }),
          panel(220, 520, 460, 150, {
            name: 'Schedule 1', cut: 18,
            fill: { type: 'solid', c1: '@panel' },
            border: { w: 2, color: '@line', glow: 14, glowColor: '@glow' }
          }),
          text(220, 540, 460, 30, 'MON — FRI', {
            name: 'Schedule 1 day',
            text: { size: 20, weight: 700, ls: 8, color: '@accent' }
          }),
          text(220, 578, 460, 60, '7 PM · 1 AM', {
            name: 'Schedule 1 time',
            text: { size: 32, weight: 800, color: '@text' }
          }),
          panel(730, 520, 460, 150, {
            name: 'Schedule 2', cut: 18,
            fill: { type: 'solid', c1: '@panel' },
            border: { w: 2, color: '@line', glow: 14, glowColor: '@glow' }
          }),
          text(730, 540, 460, 30, 'SATURDAY', {
            name: 'Schedule 2 day',
            text: { size: 20, weight: 700, ls: 8, color: '@accent' }
          }),
          text(730, 578, 460, 60, 'COMMUNITY GAMES', {
            name: 'Schedule 2 time',
            text: { size: 28, weight: 800, color: '@text' }
          }),
          panel(1240, 520, 460, 150, {
            name: 'Schedule 3', cut: 18,
            fill: { type: 'solid', c1: '@panel' },
            border: { w: 2, color: '@line', glow: 14, glowColor: '@glow' }
          }),
          text(1240, 540, 460, 30, 'SUNDAY', {
            name: 'Schedule 3 day',
            text: { size: 20, weight: 700, ls: 8, color: '@accent' }
          }),
          text(1240, 578, 460, 60, 'CHILL STREAM', {
            name: 'Schedule 3 time',
            text: { size: 28, weight: 800, color: '@text' }
          })
        ].concat(socialRow(760));
      }
    },
    {
      id: 'ending',
      name: 'Stream Ending',
      note: 'Sign-off card with next-stream note',
      transparent: false,
      build: function () {
        return [
          text(0, 300, 1920, 200, 'THANKS FOR WATCHING', {
            name: 'Headline',
            text: { size: 132, weight: 900, ls: 2, lh: 1, color: '@text', glow: 40, glowColor: '@glow' }
          }),
          text(0, 500, 1920, 40, 'NEXT STREAM · {{date}}', {
            name: 'Subline',
            text: { size: 24, weight: 600, ls: 10, color: '@accent' }
          }),
          panel(760, 570, 400, 66, {
            name: 'Follow chip', cut: 16,
            fill: { type: 'gradient', c1: '@primary', c2: '@secondary', angle: 90 },
            border: { w: 0, color: 'transparent', glow: 24, glowColor: '@glow' }
          }),
          text(760, 578, 400, 52, 'FOLLOW FOR MORE', {
            name: 'Follow text',
            text: { size: 24, weight: 900, ls: 4, color: '#ffffff', glow: 10 }
          })
        ].concat(socialRow(720));
      }
    },
    {
      id: 'chatting',
      name: 'Just Chatting',
      note: 'Face-cam first layout with chat column',
      transparent: true,
      build: function () {
        return [
          panel(80, 150, 1140, 670, {
            name: 'Camera frame', cut: 28,
            fill: { type: 'solid', c1: '@panel2' },
            border: { w: 3, color: '@line', glow: 30, glowColor: '@glow' }
          }),
          make('camera', { name: 'Camera', x: 98, y: 168, w: 1104, h: 634, cut: 22 }),
          panel(1280, 150, 560, 670, {
            name: 'Chat panel', cut: 22,
            fill: { type: 'solid', c1: 'rgba(3,10,26,0.62)' },
            border: { w: 2, color: '@line', glow: 16, glowColor: '@glow' }
          }),
          make('chat', { name: 'Twitch chat', x: 1300, y: 170, w: 520, h: 630 }),
          panel(80, 848, 560, 96, {
            name: 'About', cut: 18,
            fill: { type: 'solid', c1: '@panel' },
            border: { w: 2, color: '@line', glow: 14, glowColor: '@glow' }
          }),
          text(80, 872, 560, 50, 'ABOUT ME', {
            name: 'About text',
            text: { size: 28, weight: 800, ls: 6, color: '@text' }
          }),
          panel(1280, 848, 560, 96, {
            name: 'Links', cut: 18,
            fill: { type: 'solid', c1: '@panel' },
            border: { w: 2, color: '@line', glow: 14, glowColor: '@glow' }
          }),
          text(1280, 872, 560, 50, 'ALL LINKS', {
            name: 'Links text',
            text: { size: 28, weight: 800, ls: 6, color: '@text' }
          })
        ].concat(socialRow(966, { w: 300 }));
      }
    }
  ];

  TEMPLATES.push({
    id: 'rimkit',
    name: 'Rim Frame Kit',
    note: 'Vector panels, brackets and HUD plates built from the frame engine',
    transparent: false,
    build: function () {
      var f = function (style, x, y, w, h, o) {
        return make('frame', {
          name: (o && o.name) || style + ' frame',
          x: x, y: y, w: w, h: h, cut: 0,
          frame: Object.assign({ style: style, thickness: 3, cut: 22, gap: 9, accent: 'left', accentColor: '@secondary', glow: 18 }, o && o.frame)
        });
      };
      return [
        f('rim', 80, 70, 760, 300, { name: 'Hero rim' }),
        f('bracket', 900, 70, 420, 300, { name: 'Bracket block', frame: { thickness: 4, accent: 'none' } }),
        f('tech', 1380, 70, 460, 300, { name: 'Tech panel' }),
        f('hud', 80, 410, 1000, 110, { name: 'HUD bar', frame: { accent: 'none', glow: 12 } }),
        f('hex', 1120, 400, 260, 300, { name: 'Hex card' }),
        f('pod', 1430, 410, 410, 96, { name: 'Alert pod' }),
        f('sidebar', 80, 560, 300, 420, { name: 'Sidebar' }),
        f('notch', 420, 560, 640, 420, { name: 'Notched plate' }),
        f('rim', 1120, 560, 720, 200, { name: 'Lower rim', frame: { accent: 'top' } }),
        text(0, 200, 1920, 40, 'R I M   F R A M E   K I T', {
          name: 'Label',
          text: { size: 26, weight: 700, ls: 14, color: '@accent', glow: 12 }
        })
      ];
    }
  });

  /* ------------------------------------------------------------------ */
  /* Rim-frame kits                                                     */
  /* ------------------------------------------------------------------ */
  function frame(style, x, y, w, h, o) {
    o = o || {};
    return make('frame', {
      name: o.name || (style + ' frame'),
      x: x, y: y, w: w, h: h, cut: 0, rot: o.rot || 0,
      opacity: o.opacity == null ? 1 : o.opacity,
      frame: Object.assign({
        style: style, thickness: 3, cut: 22, gap: 9,
        accent: 'left', accentColor: '@secondary', glow: 18
      }, o.frame)
    });
  }

  function kitLabel(x, y, w, value, o) {
    o = o || {};
    return text(x, y, w, 26, value, {
      name: o.name || ('Label ' + value),
      text: { size: o.size || 15, weight: 700, ls: 4, color: o.color || '@accent', glow: o.glow == null ? 8 : o.glow }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Extra scene templates                                              */
  /* ------------------------------------------------------------------ */
  TEMPLATES.push({
    id: 'podcast',
    name: 'Podcast · Two Cams',
    note: 'Side-by-side hosts, nameplates and a topic bar',
    transparent: true,
    build: function () {
      return [
        panel(60, 120, 880, 500, {
          name: 'Host frame', cut: 26,
          fill: { type: 'solid', c1: '@panel2' },
          border: { w: 3, color: '@line', glow: 26, glowColor: '@glow' }
        }),
        make('camera', { name: 'Host camera', x: 78, y: 138, w: 844, h: 464, cut: 20 }),
        panel(980, 120, 880, 500, {
          name: 'Guest frame', cut: 26,
          fill: { type: 'solid', c1: '@panel2' },
          border: { w: 3, color: '@line', glow: 26, glowColor: '@glow' }
        }),
        make('camera', { name: 'Guest camera', x: 998, y: 138, w: 844, h: 464, cut: 20 }),
        panel(78, 552, 400, 56, {
          name: 'Host plate', cut: 12,
          fill: { type: 'solid', c1: '@panel' },
          border: { w: 2, color: '@line', glow: 10, glowColor: '@glow' }
        }),
        text(78, 560, 400, 42, 'HOST NAME', {
          name: 'Host name',
          text: { size: 22, weight: 800, ls: 5, color: '@text' }
        }),
        panel(998, 552, 400, 56, {
          name: 'Guest plate', cut: 12,
          fill: { type: 'solid', c1: '@panel' },
          border: { w: 2, color: '@line', glow: 10, glowColor: '@glow' }
        }),
        text(998, 560, 400, 42, 'GUEST NAME', {
          name: 'Guest name',
          text: { size: 22, weight: 800, ls: 5, color: '@text' }
        }),
        frame('bar', 60, 660, 1800, 86, { name: 'Topic bar', frame: { thickness: 2.5, glow: 14 } }),
        text(60, 684, 1800, 44, 'TODAY · {{date}}', {
          name: 'Topic',
          text: { size: 26, weight: 700, ls: 6, color: '@accent' }
        }),
        text(60, 40, 1800, 64, '{{channel}} · PODCAST', {
          name: 'Show title',
          text: { size: 34, weight: 900, ls: 8, color: '@text', glow: 16, glowColor: '@glow' }
        })
      ].concat(socialRow(790, { w: 300 }));
    }
  });

  TEMPLATES.push({
    id: 'raid',
    name: 'Raid Incoming',
    note: 'Full-bleed takeover card for incoming raids',
    transparent: false,
    build: function () {
      return [
        frame('cyber', 260, 150, 1400, 600, { name: 'Raid frame', frame: { thickness: 4, cut: 44, glow: 40 } }),
        text(260, 214, 1400, 54, 'R A I D   I N C O M I N G', {
          name: 'Kicker',
          text: { size: 26, weight: 700, ls: 16, color: '@accent', glow: 16 }
        }),
        text(260, 292, 1400, 200, '{{channel}}', {
          name: 'Raider name',
          text: { size: 148, weight: 900, lh: 1, color: '@text', glow: 44, glowColor: '@glow' }
        }),
        text(260, 514, 1400, 44, 'IS RAIDING · SAY HI IN CHAT', {
          name: 'Subline',
          text: { size: 24, weight: 600, ls: 9, color: '@muted' }
        }),
        panel(760, 596, 400, 62, {
          name: 'Hype chip', cut: 16,
          fill: { type: 'gradient', c1: '@primary', c2: '@secondary', angle: 90 },
          border: { w: 0, color: 'transparent', glow: 24, glowColor: '@glow' }
        }),
        text(760, 604, 400, 44, 'WELCOME RAID', {
          name: 'Hype text',
          text: { size: 22, weight: 900, ls: 6, color: '#ffffff', glow: 12 }
        })
      ].concat(socialRow(880, { w: 320 }));
    }
  });

  TEMPLATES.push({
    id: 'subathon',
    name: 'Subathon · Timer',
    note: 'Countdown clock with three goal bars',
    transparent: true,
    build: function () {
      var out = [
        frame('hex', 620, 60, 680, 300, { name: 'Timer frame', frame: { thickness: 3.5, cut: 46, glow: 34 } }),
        text(620, 106, 680, 40, 'T I M E   L E F T', {
          name: 'Timer kicker',
          text: { size: 22, weight: 700, ls: 12, color: '@accent', glow: 12 }
        }),
        text(620, 150, 680, 176, '{{time}}', {
          name: 'Timer',
          text: { size: 132, weight: 900, lh: 1, color: '@text', glow: 38, glowColor: '@glow' }
        })
      ];
      ['SUB GOAL', 'FOLLOW GOAL', 'DONATION GOAL'].forEach(function (label, i) {
        var y = 420 + i * 132;
        out.push(panel(260, y, 1400, 96, {
          name: label + ' plate', cut: 16,
          fill: { type: 'solid', c1: 'rgba(3,10,26,0.6)' },
          border: { w: 2, color: '@line', glow: 12, glowColor: '@glow' }
        }));
        out.push(panel(280, y + 54, 1180 * (0.35 + i * 0.15), 14, {
          name: label + ' bar', cut: 0,
          fill: { type: 'gradient', c1: '@primary', c2: '@secondary', angle: 90 },
          border: { w: 0, color: 'transparent', glow: 18, glowColor: '@glow' }
        }));
        out.push(text(280, y + 14, 900, 34, label, {
          name: label + ' label',
          text: { size: 20, weight: 700, ls: 6, color: '@accent' }
        }));
        out.push(text(1120, y + 10, 520, 38, '0 / 100', {
          name: label + ' value',
          text: { size: 24, weight: 800, align: 'right', color: '@text' }
        }));
      });
      return out.concat(socialRow(830, { w: 300 }));
    }
  });

  TEMPLATES.push({
    id: 'ending',
    name: 'Stream Ending',
    note: 'Sign-off screen with thanks and next-stream note',
    transparent: false,
    build: function () {
      return [
        frame('steps', 420, 120, 1080, 420, { name: 'Sign-off frame', frame: { thickness: 3, glow: 28 } }),
        text(420, 176, 1080, 46, 'T H A N K S   F O R   W A T C H I N G', {
          name: 'Kicker',
          text: { size: 24, weight: 700, ls: 12, color: '@accent', glow: 14 }
        }),
        text(420, 236, 1080, 200, 'SEE YOU SOON', {
          name: 'Headline',
          text: { size: 118, weight: 900, lh: 1, color: '@text', glow: 40, glowColor: '@glow' }
        }),
        text(420, 448, 1080, 40, 'NEXT STREAM · {{date}}', {
          name: 'Next stream',
          text: { size: 22, weight: 600, ls: 8, color: '@muted' }
        }),
        panel(660, 600, 600, 66, {
          name: 'Follow chip', cut: 16,
          fill: { type: 'gradient', c1: '@primary', c2: '@secondary', angle: 90 },
          border: { w: 0, color: 'transparent', glow: 24, glowColor: '@glow' }
        }),
        text(660, 610, 600, 46, 'FOLLOW FOR THE NEXT ONE', {
          name: 'Follow text',
          text: { size: 22, weight: 900, ls: 3, color: '#ffffff', glow: 10 }
        }),
        text(0, 760, 1920, 40, 'REPLAYS STAY UP FOR 14 DAYS', {
          name: 'VOD note',
          text: { size: 20, weight: 600, ls: 6, color: '@muted' }
        })
      ].concat(socialRow(880, { w: 320 }));
    }
  });

  TEMPLATES.push({
    id: 'match',
    name: 'Match Day',
    note: 'Scoreboard with team plates and map strip',
    transparent: true,
    build: function () {
      return [
        frame('bento', 360, 40, 1200, 200, { name: 'Score frame', frame: { thickness: 3, cut: 26, glow: 24 } }),
        text(400, 96, 420, 40, 'TEAM A', {
          name: 'Team A label',
          text: { size: 24, weight: 800, ls: 8, color: '@accent' }
        }),
        text(900, 74, 120, 96, '2', {
          name: 'Score A',
          text: { size: 84, weight: 900, color: '@text', glow: 26, glowColor: '@glow' }
        }),
        text(1000, 96, 120, 52, ':', {
          name: 'Score divider',
          text: { size: 40, weight: 800, color: '@muted' }
        }),
        text(1050, 74, 120, 96, '1', {
          name: 'Score B',
          text: { size: 84, weight: 900, color: '@text', glow: 26, glowColor: '@glow' }
        }),
        text(1180, 96, 340, 40, 'TEAM B', {
          name: 'Team B label',
          text: { size: 24, weight: 800, ls: 8, color: '@accent' }
        }),
        panel(60, 300, 660, 68, {
          name: 'Map plate', cut: 14,
          fill: { type: 'solid', c1: '@panel' },
          border: { w: 2, color: '@line', glow: 12, glowColor: '@glow' }
        }),
        text(60, 310, 660, 48, 'MAP · DUST II', {
          name: 'Map text',
          text: { size: 24, weight: 700, ls: 5, color: '@text' }
        }),
        panel(1200, 300, 660, 68, {
          name: 'Round plate', cut: 14,
          fill: { type: 'solid', c1: '@panel' },
          border: { w: 2, color: '@line', glow: 12, glowColor: '@glow' }
        }),
        text(1200, 310, 660, 48, 'ROUND 12 · LIVE', {
          name: 'Round text',
          text: { size: 24, weight: 700, ls: 5, color: '@accent' }
        })
      ].concat(socialRow(880, { w: 320 }));
    }
  });

  TEMPLATES.push({
    id: 'retro',
    name: 'Retro Terminal',
    note: 'CRT console with boot lines and a scanline deck',
    transparent: false,
    build: function () {
      var lines = [
        '> BOOT SEQUENCE OK',
        '> CAMERA LINK ........ 60 FPS',
        '> CHAT RELAY ......... ONLINE',
        '> SIGNAL ............. LOCKED'
      ];
      var out = [
        frame('screws', 120, 90, 1680, 900, { name: 'Console plate', frame: { thickness: 3, gap: 10, accent: 'none', glow: 22 } }),
        text(160, 130, 1200, 44, 'S Y S T E M   O N L I N E', {
          name: 'Boot kicker',
          text: { size: 24, weight: 700, ls: 10, color: '@accent', glow: 18, font: '@fontBody' }
        })
      ];
      lines.forEach(function (line, i) {
        out.push(text(170, 320 + i * 54, 1300, 42, line, {
          name: 'Boot line ' + (i + 1),
          text: { size: 24, weight: 600, ls: 2, align: 'left', color: '@text', font: '@fontBody', glow: 8 }
        }));
      });
      out.push(frame('scanline', 120, 590, 1680, 300, { name: 'Log deck', frame: { thickness: 2.5, glow: 16 } }));
      out.push(text(160, 960, 1600, 34, 'PRESS START · {{time}}', {
        name: 'Prompt',
        text: { size: 20, weight: 600, ls: 6, color: '@muted', font: '@fontBody' }
      }));
      return out;
    }
  });

  TEMPLATES.push({
    id: 'minimalsoon',
    name: 'Minimal Starting Soon',
    note: 'Clock-led holding screen with a hairline frame',
    transparent: false,
    build: function () {
      return [
        frame('ring', 460, 210, 1000, 480, { name: 'Hairline ring', frame: { thickness: 1.5, gap: 14, accent: 'none', glow: 8 } }),
        text(460, 300, 1000, 190, '{{time}}', {
          name: 'Clock',
          text: { size: 150, weight: 200, lh: 1, color: '@text' }
        }),
        text(460, 512, 1000, 40, 'STARTING SOON', {
          name: 'Label',
          text: { size: 24, weight: 700, ls: 14, color: '@accent' }
        }),
        text(460, 748, 1000, 34, '{{channel}}', {
          name: 'Channel',
          text: { size: 20, weight: 600, ls: 6, color: '@muted' }
        })
      ].concat(socialRow(840, { w: 300 }));
    }
  });

  TEMPLATES.push({
    id: 'brb',
    name: 'Be Right Back',
    note: 'BRB card with timer and a progress rule',
    transparent: false,
    build: function () {
      return [
        frame('neon', 300, 260, 1320, 460, { name: 'BRB frame', frame: { thickness: 3, cut: 40, gap: 12, glow: 34 } }),
        text(300, 330, 1320, 44, 'B E   R I G H T   B A C K', {
          name: 'Kicker',
          text: { size: 24, weight: 700, ls: 16, color: '@accent', glow: 14 }
        }),
        text(300, 392, 1320, 180, 'BACK IN 5', {
          name: 'Headline',
          text: { size: 132, weight: 900, lh: 1, color: '@text', glow: 40, glowColor: '@glow' }
        }),
        panel(420, 600, 1080, 8, {
          name: 'Progress track', cut: 0,
          fill: { type: 'solid', c1: 'rgba(255,255,255,0.14)' },
          border: { w: 0, color: 'transparent' }
        }),
        panel(420, 600, 520, 8, {
          name: 'Progress fill', cut: 0,
          fill: { type: 'gradient', c1: '@primary', c2: '@secondary', angle: 90 },
          border: { w: 0, color: 'transparent', glow: 20, glowColor: '@glow' }
        }),
        text(300, 780, 1320, 34, 'CHAT IS STILL OPEN · {{twitch}}', {
          name: 'Note',
          text: { size: 20, weight: 600, ls: 6, color: '@muted' }
        })
      ];
    }
  });

  /* every style on one board */
  TEMPLATES.push({
    id: 'framegallery',
    name: 'Frame Gallery · every frame',
    note: 'Every rim-frame style on one board — pick a look, then restyle',
    transparent: false,
    build: function () {
      var styles = (OS.Frames && OS.Frames.STYLES) || [];
      var out = [text(0, 20, 1920, 38, 'R I M   F R A M E   G A L L E R Y', {
        name: 'Gallery title',
        text: { size: 22, weight: 800, ls: 12, color: '@accent', glow: 14 }
      })];
      var cols = 8, cw = 214, ch = 104, gx = 16, gy = 16;
      var x0 = Math.round((1920 - (cols * cw + (cols - 1) * gx)) / 2);
      var y0 = 72;
      styles.forEach(function (pair, i) {
        var x = x0 + (i % cols) * (cw + gx);
        var y = y0 + Math.floor(i / cols) * (ch + gy);
        out.push(frame(pair[0], x, y, cw, ch, {
          name: pair[1],
          frame: { thickness: 2.5, cut: 16, gap: 7, accent: 'none', glow: 10 }
        }));
        out.push(text(x, y + ch - 26, cw, 18, pair[1].toUpperCase(), {
          name: pair[1] + ' label',
          text: { size: 10.5, weight: 700, ls: 2, color: '@text', glow: 0 }
        }));
      });
      return out;
    }
  });

  TEMPLATES.push({
    id: 'rimkitneon',
    name: 'Rim Kit · Neon Grid',
    note: 'Synthwave hero panels, capsules and ticket stubs',
    transparent: false,
    build: function () {
      return [
        frame('rim', 80, 86, 900, 400, { name: 'Hero rim', frame: { thickness: 4, cut: 34, gap: 14, glow: 34 } }),
        frame('double', 1020, 86, 380, 190, { name: 'Double card', frame: { thickness: 2.5, cut: 18, gap: 10, accent: 'none' } }),
        frame('capsule', 1440, 86, 400, 84, { name: 'Capsule pill', frame: { thickness: 3, glow: 24 } }),
        frame('spikes', 1020, 296, 380, 190, { name: 'Spike block', frame: { thickness: 3, accent: 'top', glow: 22 } }),
        frame('hex', 1440, 200, 400, 286, { name: 'Hex card', frame: { thickness: 3.5, cut: 40, glow: 26 } }),
        frame('bar', 80, 516, 900, 96, { name: 'Neon bar', frame: { thickness: 2.5, glow: 20 } }),
        frame('chevron', 1020, 516, 380, 170, { name: 'Chevron plate', frame: { thickness: 3, glow: 20 } }),
        frame('ticket', 1440, 516, 400, 170, { name: 'Ticket stub', frame: { thickness: 3, glow: 22 } }),
        frame('tag', 80, 652, 420, 180, { name: 'Tag', frame: { thickness: 3, glow: 18 } }),
        frame('bubble', 540, 652, 420, 180, { name: 'Chat bubble', frame: { thickness: 3, accent: 'none', glow: 16 } }),
        frame('stem', 1000, 652, 400, 180, { name: 'Callout stem', frame: { thickness: 3, glow: 18 } }),
        frame('grid', 1440, 722, 400, 250, { name: 'Grid plate', frame: { thickness: 2.5, cut: 26, glow: 16 } }),
        kitLabel(80, 862, 900, 'N E O N   R I M   K I T', { size: 17 })
      ];
    }
  });

  TEMPLATES.push({
    id: 'rimkithud',
    name: 'Rim Kit · Broadcast HUD',
    note: 'HUD bars, scanline decks and crosshair targeting',
    transparent: true,
    build: function () {
      return [
        frame('bar', 60, 54, 1800, 76, { name: 'Top bar', frame: { thickness: 2.5, glow: 14 } }),
        frame('crosshair', 60, 166, 520, 300, { name: 'Crosshair', frame: { thickness: 3, gap: 14, accent: 'none', glow: 12 } }),
        frame('scanline', 60, 500, 520, 260, { name: 'Scanline deck', frame: { thickness: 3, glow: 16 } }),
        frame('grid', 620, 166, 700, 340, { name: 'Grid plate', frame: { thickness: 2.5, cut: 24, glow: 14 } }),
        frame('bracket', 1360, 166, 500, 240, { name: 'Brackets', frame: { thickness: 4, accent: 'none', glow: 18 } }),
        frame('notch', 1360, 440, 500, 120, { name: 'Notched strip', frame: { thickness: 3, accent: 'right', glow: 14 } }),
        frame('hud', 620, 540, 700, 120, { name: 'HUD bar', frame: { thickness: 3, accent: 'none', glow: 16 } }),
        frame('sidebar', 1360, 594, 500, 300, { name: 'Sidebar rail', frame: { thickness: 3, glow: 16 } }),
        frame('cornerl', 60, 800, 520, 200, { name: 'Corner L', frame: { thickness: 3, accent: 'none', glow: 12 } }),
        frame('photo', 620, 700, 700, 300, { name: 'Photo mat', frame: { thickness: 2.5, accent: 'none', glow: 12 } }),
        kitLabel(60, 1010, 700, 'H U D   K I T', { size: 16 })
      ];
    }
  });

  TEMPLATES.push({
    id: 'rimkitember',
    name: 'Rim Kit · Ember Alerts',
    note: 'Alert pods, riveted plates and hazard frames',
    transparent: false,
    build: function () {
      return [
        frame('pod', 70, 76, 720, 116, { name: 'Alert pod A', frame: { thickness: 3, glow: 30 } }),
        frame('pod', 70, 214, 720, 116, { name: 'Alert pod B', frame: { thickness: 3, glow: 30 } }),
        frame('rivet', 70, 362, 440, 280, { name: 'Riveted plate', frame: { thickness: 3, accent: 'none', glow: 18 } }),
        frame('shield', 540, 362, 300, 340, { name: 'Shield badge', frame: { thickness: 3.5, glow: 24 } }),
        frame('bevel', 870, 362, 440, 280, { name: 'Bevelled card', frame: { thickness: 3, accent: 'top', glow: 18 } }),
        frame('tech', 1340, 76, 500, 300, { name: 'Tech panel', frame: { thickness: 3, cut: 30, glow: 26 } }),
        frame('angular', 1340, 404, 500, 238, { name: 'Angular cut', frame: { thickness: 3, glow: 20 } }),
        frame('ribbon', 70, 672, 720, 150, { name: 'Ribbon banner', frame: { thickness: 3, accent: 'none', glow: 22 } }),
        frame('chevron', 830, 672, 460, 150, { name: 'Chevron', frame: { thickness: 3, glow: 18 } }),
        frame('corner', 70, 852, 560, 170, { name: 'Cut corners', frame: { thickness: 3, glow: 16 } }),
        frame('dash', 670, 852, 620, 170, { name: 'Dashed frame', frame: { thickness: 3, accent: 'none', glow: 16 } }),
        frame('tech', 1330, 672, 510, 350, { name: 'Alert stack', frame: { thickness: 2.5, cut: 24, glow: 20 } }),
        kitLabel(70, 1032, 720, 'E M B E R   K I T', { size: 16 })
      ];
    }
  });

  TEMPLATES.push({
    id: 'rimkitminimal',
    name: 'Rim Kit · Minimal',
    note: 'Hairline frames for clean lower-thirds and labels',
    transparent: true,
    build: function () {
      return [
        frame('rim', 70, 90, 860, 300, { name: 'Hairline rim', frame: { thickness: 1.5, cut: 20, gap: 8, accent: 'left', glow: 8 } }),
        frame('photo', 960, 90, 900, 300, { name: 'Photo mat', frame: { thickness: 1.5, accent: 'none', glow: 6 } }),
        frame('dash', 70, 420, 860, 210, { name: 'Dashed rim', frame: { thickness: 1.5, accent: 'none', glow: 6 } }),
        frame('double', 960, 420, 900, 210, { name: 'Double line', frame: { thickness: 1.5, cut: 16, gap: 9, accent: 'none', glow: 6 } }),
        frame('capsule', 70, 670, 620, 84, { name: 'Capsule', frame: { thickness: 1.5, glow: 6 } }),
        frame('bar', 720, 670, 1140, 84, { name: 'Hairline bar', frame: { thickness: 1.5, glow: 6 } }),
        frame('cornerl', 70, 790, 860, 200, { name: 'Corner L', frame: { thickness: 2, accent: 'none', glow: 6 } }),
        frame('tag', 960, 790, 440, 200, { name: 'Tag', frame: { thickness: 1.5, glow: 6 } }),
        frame('crosshair', 1420, 790, 440, 200, { name: 'Crosshair', frame: { thickness: 1.5, gap: 12, accent: 'none', glow: 6 } }),
        kitLabel(70, 1010, 860, 'M I N I M A L   K I T', { size: 15 })
      ];
    }
  });

  function templateById(id) {
    for (var i = 0; i < TEMPLATES.length; i++) if (TEMPLATES[i].id === id) return TEMPLATES[i];
    return null;
  }

  function buildTemplate(id) {
    var t = templateById(id) || TEMPLATES[0];
    return { name: t.name, bgOn: !t.transparent, layers: t.build() };
  }

  /* ------------------------------------------------------------------ */
  var DEFAULT_SETTINGS = {
    channel: 'yourchannel',
    twitch: 'twitch.tv/yourchannel',
    twitter: '@yourchannel',
    youtube: 'youtube.com/@yourchannel',
    discord: 'discord.gg/yourchannel',
    instagram: '@yourchannel',
    tiktok: '@yourchannel'
  };

  OS.Presets = {
    FONTS: FONTS,
    THEMES: THEMES,
    TEMPLATES: TEMPLATES,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    themeById: themeById,
    templateById: templateById,
    buildTemplate: buildTemplate,
    make: make,
    panel: panel,
    text: text,
    color: color,
    font: font,
    fillCSS: fillCSS,
    clip: clip,
    ring: ring,
    radius: radius,
    polyPts: polyPts
  };
})(window.OS = window.OS || {});
