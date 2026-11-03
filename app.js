/*
 * Nexus: the date, the weather where you are, world clocks on flip cards, a search bar and rows of glass tiles.
 * Mouse, trackpad, touch, keyboard or a TV remote. The weather paints the sky behind it (sky.js); the tile you're on
 * lends it its own light. The first visit runs a short setup; the answers stay in this browser (localStorage) and
 * nothing is sent anywhere but the weather lookup. The sites it can offer are in catalog.js. Plain JavaScript.
 */
(function () {
  'use strict';

  var CAT = window.CATALOG, ICONS = window.ICONS || {}, GLYPHS = window.GLYPHS || {};
  var query = (function () {
    var out = {}, q = (location.search || '').replace(/^\?/, '').split('&');
    for (var i = 0; i < q.length; i++) { var kv = q[i].split('='); if (kv[0]) out[kv[0]] = decodeURIComponent(kv[1] || ''); }
    return out;
  })();
  function $(id) { return document.getElementById(id); }
  function store(k, v) { try { localStorage.setItem('nexus.' + k, JSON.stringify(v)); } catch (e) {} }
  function stored(k) { try { return JSON.parse(localStorage.getItem('nexus.' + k)); } catch (e) { return null; } }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function logo(slug) { return ICONS[slug] ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ICONS[slug]) : ''; }
  /** A Lucide glyph as an image, stroked in `color`. */
  function glyph(name, color) {
    var g = GLYPHS[name];
    return g ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(g.replace(/currentColor/g, color || '#F5F5F7')) : '';
  }

  // MARK: - Your setup (kept in this browser)

  var localZone = (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } })();
  function defaults() {
    return {v: 1, name: '', mono: '', place: {mode: 'auto'}, units: /^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage)|^Pacific\/Honolulu/.test(localZone) ? 'F' : 'C',
      hour12: true, clocks: [{city: 'Local time', zone: localZone}], engine: 'google', sites: CAT.popular.slice(), suites: CAT.popularSuites.slice(),
      motion: true};
  }
  var cfg = stored('config');
  var firstRun = !cfg || query.setup === '1';
  if (!cfg) cfg = defaults();
  function save() { store('config', cfg); }

  document.title = cfg.name ? cfg.name + '’s Nexus' : 'Nexus';

  // MARK: - Flip clocks

  function Flip(parent) {
    var el = document.createElement('div');
    el.className = 'flip';
    el.innerHTML = '<div class="half top"><span></span></div><div class="half bottom"><span></span></div>' +
      '<div class="half top flapTop"><span></span></div><div class="half bottom flapBottom"><span></span></div><div class="fold"></div>';
    parent.appendChild(el);
    var s = el.getElementsByTagName('span'), cur = null, timer = null;
    this.set = function (v) {
      v = String(v);
      if (v === cur) return;
      if (cur === null) { s[0].textContent = s[1].textContent = s[2].textContent = s[3].textContent = v; cur = v; return; }
      s[0].textContent = v; s[1].textContent = cur; s[2].textContent = cur; s[3].textContent = v;
      el.className = 'flip'; void el.offsetWidth; el.className = 'flip go';
      clearTimeout(timer);
      timer = setTimeout(function () { s[1].textContent = v; }, 620);
      cur = v;
    };
  }

  /** A clock for an IANA time zone, read through Intl so summer time is always right. */
  function Clock(conf) {
    var root = document.createElement('div');
    root.className = 'clock';
    root.innerHTML = '<div class="city"></div><div class="flips"></div>';
    root.firstChild.textContent = conf.city;
    $('clocks').appendChild(root);
    var box = root.lastChild, d = [new Flip(box), new Flip(box)];
    var colon = document.createElement('span'); colon.className = 'colon'; colon.textContent = ':'; box.appendChild(colon);
    d.push(new Flip(box)); d.push(new Flip(box));
    var ampm = document.createElement('span'); ampm.className = 'ampm'; box.appendChild(ampm);
    var fmt = null;
    try { fmt = new Intl.DateTimeFormat('en-GB', {timeZone: conf.zone, hour: 'numeric', minute: '2-digit', hour12: false}); } catch (e) {}
    this.update = function (now) {
      var h = now.getHours(), m = now.getMinutes();
      if (fmt) {
        var parts = fmt.formatToParts(now);
        for (var i = 0; i < parts.length; i++) {
          if (parts[i].type === 'hour') h = +parts[i].value % 24;
          if (parts[i].type === 'minute') m = +parts[i].value;
        }
      }
      var hs = pad(cfg.hour12 ? (h % 12 || 12) : h), ms = pad(m);
      d[0].set(hs.charAt(0)); d[1].set(hs.charAt(1)); d[2].set(ms.charAt(0)); d[3].set(ms.charAt(1));
      ampm.textContent = cfg.hour12 ? (h < 12 ? 'AM' : 'PM') : '';
    };
  }

  var clocks = [];
  function buildClocks() {
    $('clocks').innerHTML = '';
    clocks = (cfg.clocks || []).slice(0, 3).map(function (c) { return new Clock(c); });
  }

  // MARK: - The date: short month, short day, and the day of the month rolling up

  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  var shownDay = null;
  function updateDate(now) {
    $('month').textContent = MONTHS[now.getMonth()];
    $('year').textContent = now.getFullYear();
    $('dow').textContent = DAYS[now.getDay()];
    var d = String(now.getDate()), box = $('day');
    if (d === shownDay) return;
    var old = box.getElementsByTagName('span');
    if (shownDay === null || !old.length) {
      box.innerHTML = '<span>' + d + '</span>';
    } else {
      var o = old[old.length - 1];
      o.className = 'out';
      var n = document.createElement('span'); n.className = 'in'; n.textContent = d; box.appendChild(n);
      setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 1000);
    }
    shownDay = d;
  }

  var lastMinute = -1;
  function tick() {
    var now = new Date();
    if (now.getMinutes() === lastMinute) return;
    lastMinute = now.getMinutes();
    for (var i = 0; i < clocks.length; i++) clocks[i].update(now);
    updateDate(now);
  }

  // MARK: - Weather where you are

  var WMO = {
    0: ['clear', 'Clear', 0.05], 1: ['partly', 'Mostly clear', 0.25], 2: ['partly', 'Partly cloudy', 0.5], 3: ['cloudy', 'Cloudy', 0.92],
    45: ['fog', 'Fog', 0.8], 48: ['fog', 'Freezing fog', 0.8],
    51: ['drizzle', 'Light drizzle', 0.85], 53: ['drizzle', 'Drizzle', 0.9], 55: ['drizzle', 'Heavy drizzle', 0.9],
    56: ['drizzle', 'Freezing drizzle', 0.9], 57: ['drizzle', 'Freezing drizzle', 0.9],
    61: ['rain', 'Light rain', 0.9], 63: ['rain', 'Rain', 0.95], 65: ['heavy', 'Heavy rain', 1], 66: ['rain', 'Freezing rain', 0.95], 67: ['heavy', 'Freezing rain', 1],
    71: ['snow', 'Light snow', 0.9], 73: ['snow', 'Snow', 0.95], 75: ['snow', 'Heavy snow', 1], 77: ['snow', 'Snow grains', 0.9],
    80: ['rain', 'Showers', 0.8], 81: ['rain', 'Showers', 0.85], 82: ['heavy', 'Heavy showers', 0.95],
    85: ['snow', 'Snow showers', 0.85], 86: ['snow', 'Snow showers', 0.95],
    95: ['storm', 'Thunderstorm', 1], 96: ['storm', 'Thunderstorm', 1], 99: ['storm', 'Thunderstorm', 1]
  };
  function wmo(code) { return WMO[code] || ['cloudy', 'Cloudy', 0.8]; }
  function wet(kind) { return /drizzle|rain|heavy|storm|snow/.test(kind); }

  function getJSON(url, done) {
    var x = new XMLHttpRequest(), finished = false;
    x.open('GET', url, true);
    x.timeout = 12000;
    x.onreadystatechange = function () {
      if (x.readyState !== 4 || finished) return;
      finished = true;
      var body = null;
      try { if (x.status >= 200 && x.status < 300) body = JSON.parse(x.responseText); } catch (e) {}
      done(body);
    };
    x.ontimeout = function () { if (!finished) { finished = true; done(null); } };
    x.send();
  }

  /** Where the monitor is: from its internet address, kept for 6 hours; else the city in config. */
  function locate(done) {
    if (cfg.place && cfg.place.mode === 'city' && cfg.place.lat != null) { done(cfg.place); return; }
    var cached = stored('place');
    if (cached && Date.now() - cached.at < 6 * 3600000) { done(cached); return; }
    getJSON('https://get.geojs.io/v1/ip/geo.json', function (r) {
      if (r && r.latitude && r.longitude) {
        var p = {lat: +r.latitude, lon: +r.longitude, city: r.city || r.region || '', at: Date.now()};
        store('place', p);
        done(p);
        return;
      }
      done(cached || {lat: 51.5072, lon: -0.1276, city: 'London'});
    });
  }

  // "2026-11-03T18:00" in the place's own time → that moment, as ms.
  function at(s, offsetSec) {
    var p = s.split(/[-T:]/);
    return Date.UTC(+p[0], +p[1] - 1, +p[2], +p[3] || 0, +p[4] || 0) - offsetSec * 1000;
  }
  function hourLabel(s) {
    var h = +s.split('T')[1].split(':')[0];
    return (h % 12 || 12) + (h < 12 ? ' am' : ' pm');
  }

  function describe(w) {
    var c = w.current, h = w.hourly, off = w.utc_offset_seconds || 0, now = Date.now();
    var kind = wmo(c.weather_code)[0];
    var start = 0;
    for (var i = 0; i < h.time.length; i++) if (at(h.time[i], off) <= now) start = i;
    var end = Math.min(h.time.length, start + 13);
    if (wet(kind)) {
      for (i = start + 1; i < end; i++) {
        if (h.precipitation_probability[i] < 30 && !wet(wmo(h.weather_code[i])[0])) return 'Dry by ' + hourLabel(h.time[i]);
      }
      return kind === 'snow' ? 'Snow for a while' : 'Rain for a while';
    }
    var best = -1, bestP = 0;
    for (i = start + 1; i < end; i++) {
      if (h.precipitation_probability[i] > bestP) { bestP = h.precipitation_probability[i]; best = i; }
      if (bestP >= 50) break;
    }
    if (best > 0 && bestP >= 30) {
      var what = wmo(h.weather_code[best])[0] === 'snow' ? 'Snow' : 'Rain';
      var hr = +h.time[best].split('T')[1].split(':')[0];
      var later = hr >= 18 || hr < 5 ? 'tonight' : 'around ' + hourLabel(h.time[best]);
      return what + (bestP >= 50 ? ' likely ' : ' possible ') + later;
    }
    var d = w.daily;
    if (d && d.temperature_2m_max) return 'H ' + Math.round(d.temperature_2m_max[0]) + '°   L ' + Math.round(d.temperature_2m_min[0]) + '°';
    return '';
  }

  function phaseOf(w) {
    var off = w.utc_offset_seconds || 0, now = Date.now(), d = w.daily;
    if (!d || !d.sunrise) return w.current.is_day ? 'day' : 'night';
    var rise = at(d.sunrise[0], off), set = at(d.sunset[0], off), win = 45 * 60000;
    if (Math.abs(now - rise) < win) return 'dawn';
    if (Math.abs(now - set) < win) return 'dusk';
    return w.current.is_day ? 'day' : 'night';
  }

  function showWeather(w, place) {
    var c = w.current, info = wmo(c.weather_code), phase = phaseOf(w);
    var isDay = !!c.is_day;
    $('temp').textContent = String(Math.round(c.temperature_2m)).replace('-', '\u2212') + '°';
    $('cond').textContent = info[1];
    $('hint').textContent = describe(w);
    $('place').textContent = place.city || '';
    $('wicon').innerHTML = weatherIcon(info[0], isDay);
    var cloud = c.cloud_cover != null ? Math.max(info[2] * 0.5, c.cloud_cover / 100) : info[2];
    Sky.setWeather({kind: info[0], isDay: isDay, phase: phase, cloud: cloud, wind: Math.min(1, (c.wind_speed_10m || 10) / 40)});
  }

  function refreshWeather() {
    if (query.wx) { previewWeather(query.wx); return; }
    locate(function (place) {
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + (+place.lat).toFixed(3) + '&longitude=' + (+place.lon).toFixed(3) +
        '&current=temperature_2m,weather_code,is_day,cloud_cover,wind_speed_10m' +
        '&hourly=precipitation_probability,weather_code&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min' +
        '&timezone=auto&forecast_days=2' + (cfg.units === 'F' ? '&temperature_unit=fahrenheit&wind_speed_unit=mph' : '');
      getJSON(url, function (w) {
        if (w && w.current) { store('weather', {w: w, place: place, at: Date.now()}); showWeather(w, place); return; }
        var old = stored('weather');
        if (old && Date.now() - old.at < 12 * 3600000) showWeather(old.w, old.place);
        else { $('cond').textContent = 'Weather unavailable'; $('place').textContent = place.city || ''; }
      });
    });
  }

  /** ?wx=rain (or clear, partly, cloudy, fog, drizzle, heavy, snow, storm) in a desktop browser, with &night=1. */
  function previewWeather(kind) {
    var codes = {clear: 0, partly: 2, cloudy: 3, fog: 45, drizzle: 53, rain: 63, heavy: 65, snow: 73, storm: 95};
    var code = codes[kind] != null ? codes[kind] : 3, night = query.night === '1';
    var hours = [], probs = [], wc = [], base = new Date();
    for (var i = 0; i < 24; i++) {
      var d = new Date(base.getTime() + (i - 1) * 3600000);
      hours.push(d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':00');
      probs.push(kind === 'cloudy' && i > 4 ? 60 : wet(wmo(code)[0]) ? (i < 3 ? 90 : 10) : 5);
      wc.push(kind === 'cloudy' && i > 4 ? 61 : wet(wmo(code)[0]) && i >= 3 ? 3 : code);
    }
    showWeather({utc_offset_seconds: -base.getTimezoneOffset() * 60,
      current: {temperature_2m: kind === 'snow' ? -1 : 9, weather_code: code, is_day: night ? 0 : 1, cloud_cover: wmo(code)[2] * 100, wind_speed_10m: 14},
      hourly: {time: hours, precipitation_probability: probs, weather_code: wc},
      daily: {temperature_2m_max: [12], temperature_2m_min: [5]}}, {city: (cfg.place && cfg.place.city) || 'Your city'});
  }

  // Simple drawn weather symbols, lightly animated.
  var CLOUD = 'M38 86h60a19 19 0 0 0 3.2-37.7A27 27 0 0 0 50 41.5 21.5 21.5 0 0 0 38 86z';
  function weatherIcon(kind, day) {
    var sun = '<g><circle cx="58" cy="44" r="17" fill="#FFD27A"/><g stroke="#FFD27A" stroke-width="4" stroke-linecap="round">' +
      '<animateTransform attributeName="transform" type="rotate" from="0 58 44" to="360 58 44" dur="40s" repeatCount="indefinite"/>' +
      '<path d="M58 15v-7M58 80v-7M29 44h-7M94 44h-7M37.5 23.5l-5-5M83.5 69.5l-5-5M37.5 64.5l-5 5M83.5 18.5l-5 5"/></g></g>';
    var moon = '<path d="M70 18a28 28 0 1 0 22 44A24 24 0 0 1 70 18z" fill="#E9E6FF"/>';
    var cloud = function (fill, dx) {
      return '<g><animateTransform attributeName="transform" type="translate" values="0 0;' + (dx || 4) + ' 0;0 0" dur="9s" repeatCount="indefinite"/>' +
        '<path d="' + CLOUD + '" fill="' + fill + '"/></g>';
    };
    var lines = function (stroke, dash, n) {
      var s = '<g stroke="' + stroke + '" stroke-width="3.5" stroke-linecap="round">';
      for (var i = 0; i < n; i++) {
        var x = 52 + i * 14;
        s += '<line x1="' + x + '" y1="92" x2="' + (x - 5) + '" y2="' + (92 + dash) + '"><animate attributeName="opacity" values="1;0.2;1" dur="1.2s" begin="' + (i * 0.3) + 's" repeatCount="indefinite"/></line>';
      }
      return s + '</g>';
    };
    var svg = '<svg viewBox="0 0 132 104">';
    switch (kind) {
      case 'clear': svg += day ? sun : moon; break;
      case 'partly': svg += '<g transform="translate(-8,-8)">' + (day ? sun : moon) + '</g>' + cloud('#E8ECF2'); break;
      case 'cloudy': svg += '<g transform="translate(16,-10) scale(.8)" opacity=".6">' + '<path d="' + CLOUD + '" fill="#B9C0CC"/></g>' + cloud('#E8ECF2'); break;
      case 'fog': svg += cloud('#C9CFD8') + '<g stroke="#C9CFD8" stroke-width="4" stroke-linecap="round" opacity=".8"><path d="M30 96h56M48 104h52"/></g>'; break;
      case 'drizzle': svg += cloud('#D5DAE2') + lines('#8FC3FF', 7, 3); break;
      case 'rain': svg += cloud('#D5DAE2') + lines('#7DB8FF', 12, 4); break;
      case 'heavy': svg += cloud('#AEB6C2') + lines('#6AAEFF', 16, 5); break;
      case 'snow':
        svg += cloud('#E8ECF2') + '<g fill="#fff">';
        for (var i = 0; i < 4; i++) svg += '<circle cx="' + (50 + i * 14) + '" cy="96" r="3.5"><animate attributeName="cy" values="92;102;92" dur="2.4s" begin="' + (i * 0.4) + 's" repeatCount="indefinite"/></circle>';
        svg += '</g>'; break;
      case 'storm': svg += cloud('#9EA6B3') + '<path d="M70 84l-12 18h10l-6 14 18-22H70l6-10z" fill="#FFD45E"><animate attributeName="opacity" values="1;1;0.2;1;1" dur="3s" repeatCount="indefinite"/></path>'; break;
    }
    return svg + '</svg>';
  }

  // MARK: - The catalogue, looked up by id

  var SITES = {}, SUITES = {};
  CAT.categories.forEach(function (c) { c.sites.forEach(function (s) { s.cat = c; SITES[s.id] = s; }); });
  CAT.suites.forEach(function (s) { SUITES[s.id] = s; });
  function engineOf(id) { for (var i = 0; i < CAT.engines.length; i++) if (CAT.engines[i].id === id) return CAT.engines[i]; return CAT.engines[0]; }

  function face(item, big) {
    if (item.icon === 'sign') return '<img class="sign" src="sign.png" alt="">';
    if (item.icon && ICONS[item.icon]) return '<img src="' + logo(item.icon) + '" alt="">';
    if (item.glyph && GLYPHS[item.glyph]) return '<img class="glyph" src="' + glyph(item.glyph, item.tint) + '" alt="">';
    return '<span class="word' + (big ? '' : ' small') + '">' + esc(item.name) + '</span>';
  }

  // MARK: - "Most used": counted in this browser only, by how often and how lately

  function usage() { return stored('usage') || {}; }
  function count(id) {
    var u = usage(), now = Date.now();
    u[id] = {n: ((u[id] && u[id].n) || 0) + 1, t: now};
    store('usage', u);
  }
  function mostUsed() {
    var u = usage(), now = Date.now(), list = [], total = 0;
    for (var id in u) {
      if (!Object.prototype.hasOwnProperty.call(u, id) || !SITES[id]) continue;
      var days = (now - u[id].t) / 86400000;
      total += u[id].n;
      list.push({id: id, score: u[id].n / (1 + days / 7)});
    }
    if (total < 5) return [];
    list.sort(function (a, b) { return b.score - a.score; });
    return list.slice(0, 7).map(function (x) { return x.id; });
  }

  // MARK: - Rows of tiles

  var rows = [], rowItems = [];   // tile elements per row, and what each tile stands for
  function buildRows() {
    var sections = [], picked = {};
    (cfg.sites || []).forEach(function (id) { picked[id] = true; });
    var top = mostUsed();
    if (top.length) sections.push({title: 'Most used', motif: 'spotlight', items: top.map(function (id) { return {site: SITES[id]}; })});
    var suites = (cfg.suites || []).filter(function (id) { return SUITES[id]; });
    if (suites.length) sections.push({title: 'Apps', motif: 'grid', items: suites.map(function (id) { return {suite: SUITES[id]}; })});
    CAT.categories.forEach(function (c) {
      var items = c.sites.filter(function (s) { return picked[s.id]; }).map(function (s) { return {site: s}; });
      if (items.length) sections.push({title: c.title, motif: c.motif, items: items});
    });
    (cfg.custom || []).length && sections.push({title: 'Mine', motif: 'arc', items: cfg.custom.map(function (s) { return {site: s}; })});

    var html = '';
    sections.forEach(function (sec, r) {
      html += '<section class="section"><h2>' + esc(sec.title) + '</h2><div class="track">';
      sec.items.forEach(function (it, c) {
        var x = it.site || it.suite, color = x.color || '#ffffff';
        var href = it.site ? esc(it.site.url) : '#';
        html += '<a class="tile' + (it.suite ? ' suitetile' : '') + '" href="' + href + '" data-r="' + r + '" data-c="' + c + '" style="--c:' + esc(color) + '88">' +
          '<span class="glass">' + face(x, true) + (it.suite ? '<span class="badge">' + x.apps.length + ' apps</span>' : '') + '</span>' +
          '<span class="name">' + esc(x.name) + '</span></a>';
      });
      html += '</div></section>';
    });
    if (!sections.length) html = '<p class="empty">Nothing here yet. <button type="button" id="emptySetup">Pick your sites</button></p>';
    $('rows').innerHTML = html;
    if ($('emptySetup')) $('emptySetup').onclick = function () { openSetup(3); };

    rows = []; rowItems = [];
    sections.forEach(function (sec) { rowItems.push(sec); });
    var tiles = $('rows').querySelectorAll('.tile');
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i], r = +t.getAttribute('data-r');
      (rows[r] = rows[r] || []).push(t);
      t.addEventListener('mouseenter', onHover);
      t.addEventListener('focus', onFocus);
      t.addEventListener('click', onOpen);
    }
  }

  function itemOf(t) { var sec = rowItems[+t.getAttribute('data-r')]; return sec && sec.items[+t.getAttribute('data-c')]; }
  function light(t) {
    var it = itemOf(t), sec = rowItems[+t.getAttribute('data-r')];
    if (!it) return;
    var x = it.site || it.suite;
    Sky.setApp({color: x.color || '#ffffff', motif: (it.site && it.site.cat && it.site.cat.motif) || sec.motif || 'none'});
  }
  function onFocus(e) { light(e.currentTarget); store('last', [+e.currentTarget.getAttribute('data-r'), +e.currentTarget.getAttribute('data-c')]); }
  function onOpen(e) {
    var it = itemOf(e.currentTarget);
    if (!it) return;
    if (it.suite) { e.preventDefault(); openSuite(it.suite); return; }
    if (it.site && it.site.id) count(it.site.id);
  }

  // Scrolling slides tiles under a resting pointer: only a pointer that really moved takes focus.
  var pointerLive = false, px = -1, py = -1;
  document.addEventListener('mousemove', function (e) {
    if (Math.abs(e.clientX - px) + Math.abs(e.clientY - py) > 2) pointerLive = true;
    px = e.clientX; py = e.clientY;
  });
  function onHover(e) {
    var moved = Math.abs(e.clientX - px) + Math.abs(e.clientY - py) > 2;
    px = e.clientX; py = e.clientY;
    if (!pointerLive && !moved) return;
    pointerLive = true;
    if (document.activeElement === $('q') && $('q').value) return;   // don't steal a search being typed
    e.currentTarget.focus({preventScroll: true});
  }

  function focusIn(list, r, c) {
    if (!list.length) return;
    r = Math.max(0, Math.min(list.length - 1, r));
    c = Math.max(0, Math.min(list[r].length - 1, c));
    var t = list[r][c];
    t.focus({preventScroll: true});
    t.scrollIntoView({block: 'nearest', inline: 'nearest', behavior: 'smooth'});
  }
  function focusTile(r, c) { focusIn(rows, r, c); }
  function nearest(list, x) {
    var best = 0, bestD = Infinity;
    for (var i = 0; i < list.length; i++) {
      var b = list[i].getBoundingClientRect(), d = Math.abs(b.left + b.width / 2 - x);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }
  /** Arrow keys over a set of rows: across, and up/down to whatever sits under the same spot on screen. */
  function arrows(list, t, k) {
    var r = +t.getAttribute('data-r'), c = +t.getAttribute('data-c'), b = t.getBoundingClientRect(), x = b.left + b.width / 2;
    if (k === 'ArrowRight') focusIn(list, r, c + 1);
    else if (k === 'ArrowLeft') focusIn(list, r, c - 1);
    else if (k === 'ArrowDown') { if (r < list.length - 1) focusIn(list, r + 1, nearest(list[r + 1], x)); }
    else if (k === 'ArrowUp') { if (r > 0) focusIn(list, r - 1, nearest(list[r - 1], x)); else return false; }
    return true;
  }

  // MARK: - Suites: one tile, a whole family of apps

  var openSheet = null, suiteRows = [];
  function openSuite(s) {
    $('suiteTitle').textContent = s.name;
    var html = '', perRow = 4;
    s.apps.forEach(function (a, i) {
      html += '<a class="tile mini" href="' + esc(a.url) + '" data-r="' + Math.floor(i / perRow) + '" data-c="' + (i % perRow) + '" style="--c:' + esc(a.tint || s.color) + '88">' +
        '<span class="glass">' + face(a, false) + '</span><span class="name">' + esc(a.name) + '</span></a>';
    });
    $('suiteGrid').innerHTML = html;
    suiteRows = [];
    var tiles = $('suiteGrid').querySelectorAll('.tile');
    for (var i = 0; i < tiles.length; i++) {
      var r = +tiles[i].getAttribute('data-r');
      (suiteRows[r] = suiteRows[r] || []).push(tiles[i]);
      tiles[i].addEventListener('mouseenter', function (e) { if (pointerLive) e.currentTarget.focus({preventScroll: true}); });
    }
    Sky.setApp({color: s.color, motif: 'grid'});
    showSheet('suite');
    focusIn(suiteRows, 0, 0);
  }

  var returnFocus = null;
  function showSheet(id) {
    returnFocus = document.activeElement;
    openSheet = id;
    $(id).classList.add('open');
  }
  function closeSheet() {
    if (!openSheet) return;
    $(openSheet).classList.remove('open');
    openSheet = null;
    if (returnFocus && returnFocus.focus) returnFocus.focus({preventScroll: true});
  }
  ['suite', 'menu'].forEach(function (id) {
    $(id).addEventListener('click', function (e) { if (e.target === $(id)) closeSheet(); });
  });

  // MARK: - Search

  function showEngine() {
    var e = engineOf(cfg.engine);
    $('engine').innerHTML = '<img src="' + logo(e.icon) + '" alt="">';
    $('engine').title = e.name + ' (Tab to switch)';
    $('q').placeholder = 'Search ' + e.name + '  ·  !yt  !gh  !w  !m  !r  !c';
  }
  function nextEngine() {
    var ids = CAT.engines.map(function (e) { return e.id; }), i = ids.indexOf(cfg.engine);
    cfg.engine = ids[(i + 1) % ids.length]; save(); showEngine();
  }
  $('engine').addEventListener('click', function () { nextEngine(); $('q').focus(); });
  $('search').addEventListener('submit', function (e) {
    e.preventDefault();
    var q = $('q').value.trim();
    if (!q) return;
    var m = /^(![a-z]+)\s+(.*)$/i.exec(q) || /^(.*?)\s+(![a-z]+)$/i.exec(q);
    if (m) {
      var bang = m[1].charAt(0) === '!' ? m[1] : m[2], term = m[1].charAt(0) === '!' ? m[2] : m[1];
      var url = CAT.bangs[bang.toLowerCase()];
      if (url) { location.href = url + encodeURIComponent(term); return; }
    }
    if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(q)) { location.href = /^https?:/.test(q) ? q : 'https://' + q; return; }   // a web address
    location.href = engineOf(cfg.engine).url + encodeURIComponent(q);
  });

  // MARK: - Header: greeting and your initials

  function greeting() {
    var h = new Date().getHours(), part = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    $('greet').textContent = cfg.name ? part + ', ' + cfg.name : '';
    var mono = cfg.mono || (cfg.name || '').split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
    $('mono').innerHTML = mono ? esc(mono) : '<img src="' + glyph('settings') + '" alt="">';
  }

  // MARK: - TV mode (full screen)

  function toggleTV() {
    var d = document, el = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else if (el.requestFullscreen) el.requestFullscreen(); else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }
  $('tv').addEventListener('click', toggleTV);
  function onFull() {
    var on = !!(document.fullscreenElement || document.webkitFullscreenElement);
    document.body.classList.toggle('tv', on);
    $('tv').textContent = on ? 'Exit TV mode' : 'TV mode';
  }
  document.addEventListener('fullscreenchange', onFull);
  document.addEventListener('webkitfullscreenchange', onFull);
  var idleTimer = null;
  document.addEventListener('mousemove', function () {
    document.body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { document.body.classList.add('idle'); }, 2500);
  });

  // MARK: - Settings: change the setup, back up, restore, reset

  $('settings').addEventListener('click', function () { showSheet('menu'); $('menu').querySelector('button').focus(); });
  $('me').addEventListener('click', function () { showSheet('menu'); $('menu').querySelector('button').focus(); });
  $('menu').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]');
    if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'setup') { closeSheet(); openSetup(1); }
    else if (act === 'glucose') { closeSheet(); NexusGlucose.open(); }
    else if (act === 'export') {
      var blob = new Blob([JSON.stringify({nexus: 1, config: cfg}, null, 2)], {type: 'application/json'});
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'nexus-setup.json';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      toast('Saved nexus-setup.json');
    } else if (act === 'import') $('importFile').click();
    else if (act === 'usage') { store('usage', {}); render(); toast('“Most used” cleared'); }
    else if (act === 'reset') {
      if (b.getAttribute('data-sure')) {
        ['config', 'usage', 'last', 'place', 'weather', 'glucose'].forEach(function (k) { try { localStorage.removeItem('nexus.' + k); } catch (x) {} });
        location.reload();
      } else { b.setAttribute('data-sure', '1'); b.textContent = 'Sure? Press again to wipe this browser’s setup'; }
    }
  });
  $('importFile').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var data = JSON.parse(rd.result), c = data && data.config;
        if (!c || !c.v) throw new Error('not a Nexus backup');
        cfg = c; save(); closeSheet(); render(); toast('Setup restored');
      } catch (e) { toast('That file isn’t a Nexus backup'); }
    };
    rd.readAsText(f);
    this.value = '';
  });

  var toastTimer = null;
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }
  // MARK: - The setup: a few questions on the first visit, and from Settings any time

  var draft = null, stepIdx = 0, setupOpen = false;
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function chip(id, on, inner, attrs) { return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-id="' + esc(id) + '"' + (attrs || '') + '>' + inner + '</button>'; }
  function opt(name, value, on, label) { return '<button type="button" class="opt' + (on ? ' on' : '') + '" data-name="' + name + '" data-value="' + esc(value) + '">' + label + '</button>'; }

  var STEPS = [
    { title: 'Welcome to Nexus', render: function () {
      return '<p class="lead">A start page with the sky outside behind it, your clocks, and the sites you use in glass tiles.</p>' +
        '<ul class="points"><li>No account, no sign-in.</li><li>Your answers stay in this browser. Only the weather lookup leaves it.</li>' +
        '<li>Change anything later in <b>Settings</b>, or fork it on GitHub and make it yours.</li></ul>';
    }},
    { title: 'What should we call you?', render: function () {
      return '<label class="field"><span>Your name (optional)</span><input id="sName" type="text" maxlength="30" placeholder="For the greeting" value="' + esc(draft.name || '') + '"></label>' +
        '<label class="field"><span>Initials for the corner (optional)</span><input id="sMono" type="text" maxlength="2" placeholder="Taken from your name" value="' + esc(draft.mono || '') + '"></label>';
    }, collect: function () { draft.name = $('sName').value.trim(); draft.mono = $('sMono').value.trim().toUpperCase(); } },
    { title: 'Weather and time', render: function () {
      var auto = draft.place.mode !== 'city';
      var clocks = draft.clocks.map(function (c, i) { return chip('clock' + i, true, esc(c.city) + ' <i>×</i>', ' data-clock="' + i + '"'); }).join('');
      return '<div class="group"><span class="label">Weather for</span><div class="opts">' +
          opt('place', 'auto', auto, '<img src="' + glyph('locate-fixed') + '" alt=""> Where I am') +
          opt('place', 'city', !auto, '<img src="' + glyph('map-pin') + '" alt=""> ' + (draft.place.city && !auto ? esc(draft.place.city) : 'A city I choose')) + '</div>' +
          '<div id="placeFind" class="find"' + (auto ? ' hidden' : '') + '><input id="placeQ" type="text" placeholder="Search a city"><div class="results" id="placeRes"></div></div></div>' +
        '<div class="group"><span class="label">Units</span><div class="opts">' + opt('units', 'C', draft.units === 'C', '°C') + opt('units', 'F', draft.units === 'F', '°F') +
          opt('hour12', '1', draft.hour12, '12-hour') + opt('hour12', '0', !draft.hour12, '24-hour') + '</div></div>' +
        '<div class="group"><span class="label">Clocks (up to 3)</span><div class="chips" id="clockChips">' + clocks + '</div>' +
          (draft.clocks.length < 3 ? '<div class="find"><input id="clockQ" type="text" placeholder="Add a city"><div class="results" id="clockRes"></div></div>' : '') + '</div>';
    }, wire: function () {
      cityFinder('placeQ', 'placeRes', function (r) { draft.place = {mode: 'city', city: r.name, lat: r.latitude, lon: r.longitude}; drawStep(); });
      cityFinder('clockQ', 'clockRes', function (r) { draft.clocks.push({city: r.name, zone: r.timezone}); drawStep(); });
    }, click: function (b) {
      var n = b.getAttribute('data-name'), v = b.getAttribute('data-value');
      if (n === 'place') { if (v === 'auto') draft.place = {mode: 'auto'}; else draft.place = {mode: 'city', city: draft.place.city, lat: draft.place.lat, lon: draft.place.lon}; drawStep(); if (v === 'city') $('placeQ').focus(); }
      else if (n === 'units') { draft.units = v; drawStep(); }
      else if (n === 'hour12') { draft.hour12 = v === '1'; drawStep(); }
      else if (b.hasAttribute('data-clock')) { draft.clocks.splice(+b.getAttribute('data-clock'), 1); drawStep(); }
    }, collect: function () { if (draft.place.mode === 'city' && draft.place.lat == null) draft.place = {mode: 'auto'}; } },
    { title: 'Pick the sites you use', render: function () {
      var on = {}; draft.sites.forEach(function (id) { on[id] = true; });
      var html = '<div class="tools"><button type="button" class="ghost" data-tool="popular">Popular picks</button><button type="button" class="ghost" data-tool="none">Clear</button>' +
        '<span class="count" id="siteCount">' + draft.sites.length + ' picked</span></div><div class="cats">';
      CAT.categories.forEach(function (c) {
        html += '<div class="cat"><span class="label">' + esc(c.title) + '</span><div class="chips">';
        c.sites.forEach(function (s) { html += chip(s.id, on[s.id], (s.icon && ICONS[s.icon] ? '<img src="' + logo(s.icon) + '" alt="">' : '') + esc(s.name)); });
        html += '</div></div>';
      });
      return html + '</div>';
    }, click: function (b) {
      var tool = b.getAttribute('data-tool');
      if (tool === 'popular') { draft.sites = CAT.popular.slice(); drawStep(); return; }
      if (tool === 'none') { draft.sites = []; drawStep(); return; }
      var id = b.getAttribute('data-id'); if (!id || !SITES[id]) return;
      var i = draft.sites.indexOf(id);
      if (i >= 0) draft.sites.splice(i, 1); else draft.sites.push(id);
      b.classList.toggle('on', i < 0);
      $('siteCount').textContent = draft.sites.length + ' picked';
    }},
    { title: 'Your app suites', render: function () {
      return '<p class="lead small">One tile opens the whole family, like the app grid in Google’s corner.</p><div class="suites">' +
        CAT.suites.map(function (s) {
          var on = draft.suites.indexOf(s.id) >= 0;
          return '<button type="button" class="suite' + (on ? ' on' : '') + '" data-id="' + s.id + '"><img src="' + logo(s.icon) + '" alt=""><b>' + esc(s.name) + '</b>' +
            '<span>' + s.apps.map(function (a) { return esc(a.name); }).join(' · ') + '</span></button>';
        }).join('') + '</div>';
    }, click: function (b) {
      var id = b.getAttribute('data-id'); if (!id || !SUITES[id]) return;
      var i = draft.suites.indexOf(id);
      if (i >= 0) draft.suites.splice(i, 1); else draft.suites.push(id);
      b.classList.toggle('on', i < 0);
    }},
    { title: 'Search and motion', render: function () {
      return '<div class="group"><span class="label">Search with</span><div class="opts wrap">' +
          CAT.engines.map(function (e) { return opt('engine', e.id, draft.engine === e.id, '<img src="' + logo(e.icon) + '" alt=""> ' + esc(e.name)); }).join('') + '</div>' +
          '<p class="note">Start a search with <b>!yt</b>, <b>!gh</b>, <b>!w</b>, <b>!m</b>, <b>!r</b>, <b>!c</b> to search YouTube, GitHub, Wikipedia, Maps, Reddit or Claude instead.</p></div>' +
        '<div class="group"><span class="label">The sky</span><div class="opts">' + opt('motion', '1', draft.motion, '<img src="' + glyph('sparkles') + '" alt=""> Alive, with the weather') +
          opt('motion', '0', !draft.motion, 'Still, to save battery') + '</div></div>';
    }, click: function (b) {
      var n = b.getAttribute('data-name'), v = b.getAttribute('data-value');
      if (n === 'engine') draft.engine = v; else if (n === 'motion') draft.motion = v === '1';
      drawStep();
    }},
    { title: 'Your glucose (optional)', render: function () {
      if (!draft.glu) draft.glu = NexusGlucose.draft();
      return '<p class="lead small">Wear a CGM? Nexus can show your latest reading in a small card under the clocks. Skip this if it’s not for you.</p><div id="gstep"></div>';
    }, wire: function () { NexusGlucose.drawForm($('gstep'), draft.glu); },
    collect: function () {
      var g = draft.glu; delete draft.glu;
      if (!g) return;
      var err = NexusGlucose.save(g);
      if (err && g.src !== 'libre') toast(err + ' — you can add it later in Settings');
    }},
    { title: 'All set', render: function () {
      return '<p class="lead">Make Nexus open with every new window or tab:</p><ul class="points">' +
        '<li><b>Chrome, Edge, Brave:</b> Settings → On start-up → Open a specific page → paste this page’s address. For new tabs, add Nexus as an extension (see the README on GitHub).</li>' +
        '<li><b>Safari:</b> Settings → General → Homepage, and “New windows/tabs open with: Homepage”.</li>' +
        '<li><b>Firefox:</b> Settings → Home → Homepage and new windows → Custom URLs.</li></ul>' +
        '<p class="note">Keys: <kbd>/</kbd> search · <kbd>←↑→↓</kbd> move · <kbd>↵</kbd> open · <kbd>⇧F</kbd> TV mode. Or just start typing.</p>';
    }}
  ];

  /** A city box backed by Open-Meteo's free geocoding: type, pick, done. */
  function cityFinder(inputId, listId, picked) {
    var input = $(inputId), list = $(listId), timer = null, results = [];
    if (!input) return;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      var q = input.value.trim();
      if (q.length < 2) { list.innerHTML = ''; return; }
      timer = setTimeout(function () {
        getJSON('https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name=' + encodeURIComponent(q), function (r) {
          results = (r && r.results) || [];
          list.innerHTML = results.length ? results.map(function (x, i) {
            return '<button type="button" data-i="' + i + '">' + esc(x.name) + '<span>' + esc([x.admin1, x.country].filter(Boolean).join(', ')) + '</span></button>';
          }).join('') : '<em>No match</em>';
        });
      }, 280);
    });
    list.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-i]');
      if (b) picked(results[+b.getAttribute('data-i')]);
    });
  }

  function drawStep() {
    var s = STEPS[stepIdx];
    $('step').innerHTML = '<h1 id="setupTitle">' + s.title + '</h1>' + s.render();
    $('dots').innerHTML = STEPS.map(function (x, i) { return '<i class="' + (i === stepIdx ? 'on' : i < stepIdx ? 'done' : '') + '"></i>'; }).join('');
    $('back').style.visibility = stepIdx ? 'visible' : 'hidden';
    $('skip').style.display = stepIdx === 0 && firstRun ? '' : 'none';
    $('next').textContent = stepIdx === 0 ? 'Set it up' : stepIdx === STEPS.length - 1 ? 'Open Nexus' : 'Next';
    if (s.wire) s.wire();
  }
  function go(d) {
    var s = STEPS[stepIdx];
    if (d > 0 && s.collect) s.collect();
    if (stepIdx + d >= STEPS.length) { finishSetup(); return; }
    stepIdx = Math.max(0, stepIdx + d);
    drawStep();
    var f = $('step').querySelector('input, .chip, .opt, .suite');
    ($('next')).focus({preventScroll: true});
    if (f && f.tagName === 'INPUT') f.focus();
  }
  function openSetup(at) {
    draft = clone(cfg);
    stepIdx = at || 0;
    setupOpen = true;
    $('setup').classList.add('open');
    drawStep();
    $('next').focus();
  }
  function finishSetup() {
    delete draft.glu;
    var placeChanged = JSON.stringify(cfg.place) !== JSON.stringify(draft.place) || cfg.units !== draft.units;
    cfg = draft; save();
    firstRun = false;
    setupOpen = false;
    $('setup').classList.remove('open');
    if (placeChanged) { try { localStorage.removeItem('nexus.weather'); } catch (e) {} }
    render(placeChanged);
    var l = stored('last') || [0, 0];
    focusTile(l[0], l[1]);
  }
  $('next').addEventListener('click', function () { go(1); });
  $('back').addEventListener('click', function () { go(-1); });
  $('skip').addEventListener('click', function () { draft = defaults(); finishSetup(); });
  $('step').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b && STEPS[stepIdx].click) STEPS[stepIdx].click(b);
  });

  // MARK: - The keyboard

  document.addEventListener('keydown', function (e) {
    var k = e.key, a = document.activeElement, typing = a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA');
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (window.NexusGlucose && NexusGlucose.isOpen()) return;   // the glucose form has the keys

    if (setupOpen) {
      if (k === 'Escape' && !firstRun) { setupOpen = false; $('setup').classList.remove('open'); }
      else if (k === 'Enter' && typing && a.id !== 'placeQ' && a.id !== 'clockQ') { e.preventDefault(); go(1); }
      return;
    }
    if (openSheet) {
      if (k === 'Escape') { e.preventDefault(); closeSheet(); return; }
      if (openSheet === 'suite' && a && a.classList.contains('tile') && /^Arrow/.test(k)) { e.preventDefault(); pointerLive = false; arrows(suiteRows, a, k); }
      return;
    }
    if (a === $('q')) {
      if (k === 'Tab') { e.preventDefault(); nextEngine(); }
      else if (k === 'Escape' || (k === 'ArrowDown' && !$('q').value)) { e.preventDefault(); $('q').blur(); var l = stored('last') || [0, 0]; focusTile(l[0], l[1]); }
      return;
    }
    if (typing) return;
    if (k === '/') { e.preventDefault(); $('q').focus(); return; }
    if (k === 'F' && e.shiftKey) { e.preventDefault(); toggleTV(); return; }
    // Typing anywhere starts a search: the key lands in the search bar.
    if (k.length === 1 && k !== ' ') { $('q').focus(); return; }
    var t = a && a.classList.contains('tile') && a.closest('#rows') ? a : null;
    if (!t) { if (/^Arrow/.test(k)) { e.preventDefault(); var l2 = stored('last') || [0, 0]; focusTile(l2[0], l2[1]); } return; }
    if (/^Arrow/.test(k)) {
      e.preventDefault(); pointerLive = false;
      if (!arrows(rows, t, k)) { $('q').focus(); window.scrollTo({top: 0, behavior: 'smooth'}); }
    } else if (k === 'Escape') t.blur();
  });

  // MARK: - Start

  function render(refetch) {
    document.title = cfg.name ? cfg.name + '’s Nexus' : 'Nexus';
    greeting();
    buildClocks();
    lastMinute = -1; tick();
    showEngine();
    buildRows();
    document.body.classList.toggle('still', !cfg.motion);
    Sky.setStill(!cfg.motion);
    if (refetch) refreshWeather();
    var first = rows[0] && rows[0][0];
    if (first) light(first);
  }

  Sky.start($('sky'));
  render(false);
  refreshWeather();
  setInterval(tick, 1000);
  setInterval(function () { refreshWeather(); greeting(); }, 20 * 60000);
  if (firstRun) openSetup(0);
  else if (query.focus) { var p = query.focus.split(','); focusTile(+p[0], +p[1]); }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    lastMinute = -1; tick(); greeting();
    var w = stored('weather');
    if (!w || Date.now() - w.at > 15 * 60000) refreshWeather();
  });
})();
