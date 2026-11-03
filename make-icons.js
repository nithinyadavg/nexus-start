// Builds icons.js from theSVG (MIT; most logos CC0): each brand's full-colour logo, or its single-colour
// logo in white when the brand colour is too dark to see on a dark page.
// Usage: node make-icons.js <path to @thesvg/icons/dist> <path to lucide-static/icons> > icons.js
const path = require('path');
const dir = process.argv[2];
const slugs = (function () { global.window = {}; require(path.resolve(__dirname, 'catalog.js')); const c = window.CATALOG, s = new Set();
  c.categories.forEach(k => k.sites.forEach(x => x.icon && s.add(x.icon))); c.suites.forEach(x => { s.add(x.icon); x.apps.forEach(a => a.icon && s.add(a.icon)); });
  c.engines.forEach(e => s.add(e.icon)); return [...s]; })();
function lum(hex) {
  const n = parseInt(hex, 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const out = {};
for (const s of slugs) {
  const o = require(path.join(dir, s + '.cjs')); const i = o.default || o, v = i.variants || {};
  let svg = v.dark || v.default || i.svg, how = v.dark ? 'dark' : 'colour';
  // Logos drawn in one dark colour would vanish: use the single-colour version in white.
  const fills = (svg.match(/fill="([^"]+)"/g) || []).map(f => f.slice(6, -1).toLowerCase());
  const darkOnly = !v.dark && lum(i.hex || '000000') < 0.12 && fills.every(f => /^(#000|#000000|#111|#181717|#1b1f23|#222|#24292f|black|currentcolor|#212c42|#222f3e)$/.test(f) || f === 'none');
  // Brands whose colour logo is too dark on glass, picked by eye from a contact sheet.
  const force = ['disney-plus', 'tryhackme', 'hackerone', 'amazon', 'prime-video', 'x', 'threads', 'notion', 'vercel', 'tiktok', 'imdb-dark', 'the-guardian', 'reuters', 'max', 'audible-dark'].indexOf(s) >= 0;
  if ((darkOnly || force) && v.mono) { svg = v.mono; how = 'mono-white'; }
  else if (force) { how = 'dark-fills-white'; }
  if (how === 'mono-white' || how === 'dark-fills-white') {
    svg = svg.replace(/<svg /, '<svg fill="#F5F5F7" ').replace(/(fill|stroke):\s*(#[0-9a-f]{3,6})/gi, function (m, a, c) {
      var h = c.replace('#', ''); if (h.length === 3) h = h.replace(/(.)/g, '$1$1');
      return lum(h) < 0.3 ? a + ':#F5F5F7' : m;
    }).replace(/(fill|stroke)="([^"]+)"/gi, function (m, a, c) {
      if (c === 'none' || /^url/.test(c)) return m;
      if (/currentcolor|black/i.test(c)) return a + '="#F5F5F7"';
      var h = c.replace('#', ''); if (h.length === 3) h = h.replace(/(.)/g, '$1$1');
      if (!/^[0-9a-f]{6}$/i.test(h)) return m;
      return lum(h) < 0.3 || how === 'mono-white' ? a + '="#F5F5F7"' : m;
    });
  }
  svg = svg.replace(/currentColor/g, '#F5F5F7');
  // Only the outer <svg> loses its fixed size; shapes inside keep theirs (clip paths need them).
  svg = svg.replace(/<svg[^>]*>/, function (tag) { return tag.replace(/\s(width|height)="[^"]*"/g, ''); }).replace(/<title>.*?<\/title>/, '');
  out[s] = svg;
  process.stderr.write(s.padEnd(16) + how + '  ' + (i.license || '') + '\n');
}
// Interface glyphs from Lucide (ISC), stroked in white; the app tints them where it needs colour.
const lucide = process.argv[3], glyphs = {};
if (lucide) {
  ['mail', 'image', 'folder-open', 'notebook-pen', 'file-text', 'sheet', 'presentation', 'map-pin', 'settings', 'search', 'plus', 'x',
   'layout-grid', 'sparkles', 'download', 'upload', 'rotate-ccw', 'check', 'chevron-left', 'chevron-right', 'globe', 'locate-fixed',
   'clock', 'palette', 'github', 'monitor'].forEach(function (n) {
    try { glyphs[n] = require('fs').readFileSync(path.join(lucide, n + '.svg'), 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/\s(width|height)="[^"]*"/g, '').replace(/class="[^"]*"/, '').trim(); } catch (e) {}
  });
}
process.stdout.write('/* Brand logos from theSVG (github.com/glincker/thesvg, MIT; logos CC0 unless noted). Logos belong to their owners. */\n' +
  'window.ICONS = ' + JSON.stringify(out) + ';\n' +
  '/* Interface glyphs: Lucide (lucide.dev, ISC). */\nwindow.GLYPHS = ' + JSON.stringify(glyphs) + ';\n');
