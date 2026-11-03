/*
 * Nexus glucose card: your latest CGM reading and how it has been flowing, under the clocks.
 *
 * Sources, read straight from this browser:
 *   Dexcom      the Share feed the Dexcom Follow app reads (Share on, at least one follower), up to 24 hours back.
 *   Nightscout  any CGM that feeds a Nightscout site. FreeStyle Libre comes in this way: Abbott's LibreLinkUp
 *               servers refuse requests from web pages, so it goes Libre → Nightscout → Nexus.
 * The sign-in stays in this browser (localStorage, key nexus.glucose), is never in a backup, and is sent only to
 * Dexcom or to your own Nightscout. A glance, not a medical device.
 *
 * Needs in the page: #glucose (the card), #gsheet with #gbody #gsave #gremove #gcancel (the form), #toast.
 * Exposes window.NexusGlucose = {open, draft, drawForm, save} for a setup wizard. ?glucose=112&trend=Flat shows a
 * preview with made-up numbers and saves nothing.
 */
(function () {
  'use strict';

  var query = (function () {
    var out = {}, q = (location.search || '').replace(/^\?/, '').split('&');
    for (var i = 0; i < q.length; i++) { var kv = q[i].split('='); if (kv[0]) out[kv[0]] = decodeURIComponent(kv[1] || ''); }
    return out;
  })();
  function $(id) { return document.getElementById(id); }
  function store(k, v) { try { localStorage.setItem('nexus.' + k, JSON.stringify(v)); } catch (e) {} }
  function stored(k) { try { return JSON.parse(localStorage.getItem('nexus.' + k)); } catch (e) { return null; } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function opt(name, value, on, label) { return '<button type="button" class="opt' + (on ? ' on' : '') + '" data-name="' + name + '" data-value="' + esc(value) + '">' + label + '</button>'; }
  function defaultUnit() { var c = stored('config'); return c && c.units === 'F' ? 'mgdl' : 'mmol'; }

  var toastTimer = null;
  function toast(msg) {
    var el = $('toast'); if (!el) return;
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }
  var sheetOpen = false, returnFocus = null;
  function showSheet() { returnFocus = document.activeElement; sheetOpen = true; $('gsheet').classList.add('open'); }
  function closeSheet() {
    if (!sheetOpen) return;
    $('gsheet').classList.remove('open'); sheetOpen = false; $('gbody').innerHTML = '';
    if (returnFocus && returnFocus.focus) returnFocus.focus({preventScroll: true});
  }

  // MARK: - Reading it

  var DEX = {
    ous: {base: 'https://shareous1.dexcom.com/ShareWebServices/Services/', app: 'd89443d2-327c-4a6f-89e5-496bbb0317db', label: 'Outside the US'},
    us: {base: 'https://share2.dexcom.com/ShareWebServices/Services/', app: 'd89443d2-327c-4a6f-89e5-496bbb0317db', label: 'United States'},
    jp: {base: 'https://share.dexcom.jp/ShareWebServices/Services/', app: 'd8665ade-9673-4e27-9ff6-92db4ce13d13', label: 'Japan'}
  };
  var ARROWS = {DoubleUp: '⇈', SingleUp: '↑', FortyFiveUp: '↗', Flat: '→', FortyFiveDown: '↘', SingleDown: '↓', DoubleDown: '⇊'};
  var TREND_N = ['', 'DoubleUp', 'SingleUp', 'FortyFiveUp', 'Flat', 'FortyFiveDown', 'SingleDown', 'DoubleDown'];
  var NONE = '00000000-0000-0000-0000-000000000000';
  var RANGES = [3, 6, 12, 24];
  var glu = {session: null, timer: null, last: null, preview: false, saved: false, pconf: null};

  function gconf() { return glu.preview ? glu.pconf : stored('glucose'); }

  function request(method, url, body, done) {
    var x = new XMLHttpRequest(), finished = false;
    x.open(method, url, true);
    if (body) x.setRequestHeader('Content-Type', 'application/json');
    x.setRequestHeader('Accept', 'application/json');
    x.timeout = 15000;
    x.onreadystatechange = function () {
      if (x.readyState !== 4 || finished) return;
      finished = true;
      var out = null;
      try { out = JSON.parse(x.responseText); } catch (e) {}
      done(x.status, out);
    };
    x.ontimeout = function () { if (!finished) { finished = true; done(0, null); } };
    x.send(body ? JSON.stringify(body) : null);
  }

  function dexWhy(status, body) {
    var code = body && body.Code ? body.Code : '';
    if (!status) return 'Can’t reach Dexcom';
    if (code === 'AccountPasswordInvalid') return 'Wrong username or password';
    if (/NotFound/.test(code)) return 'Account not found — check region';
    if (/MaxAttempts/.test(code)) return 'Too many tries — wait 10 min';
    if (/Session/.test(code)) return 'Session expired';
    return 'Dexcom error ' + (code || status);
  }

  function dexLogin(c, done) {
    var r = DEX[c.region] || DEX.ous;
    request('POST', r.base + 'General/AuthenticatePublisherAccount', {accountName: c.user, password: c.pass, applicationId: r.app}, function (st, acc) {
      if (st !== 200 || typeof acc !== 'string' || acc === NONE) { done(null, dexWhy(st, acc)); return; }
      request('POST', r.base + 'General/LoginPublisherAccountById', {accountId: acc, password: c.pass, applicationId: r.app}, function (st2, sid) {
        if (st2 !== 200 || typeof sid !== 'string' || sid === NONE) { done(null, dexWhy(st2, sid)); return; }
        done(sid, '');
      });
    });
  }

  /** The last 24 hours, oldest first, as {mgdl, at, trend}. */
  function readDexcom(c, attempt, done) {
    if (!glu.session) {
      dexLogin(c, function (sid, why) {
        if (!sid) { done({error: why}); return; }
        glu.session = sid;
        readDexcom(c, attempt + 1, done);
      });
      return;
    }
    var r = DEX[c.region] || DEX.ous;
    request('POST', r.base + 'Publisher/ReadPublisherLatestGlucoseValues?sessionId=' + encodeURIComponent(glu.session) + '&minutes=1440&maxCount=288', {}, function (st, list) {
      if (st !== 200) {
        glu.session = null;   // the session ran out: sign in again, at most twice
        if (attempt < 2) readDexcom(c, attempt + 1, done); else done({error: 'Dexcom isn’t answering'});
        return;
      }
      if (!list || !list.length) { done({error: 'No reading — is Share on?'}); return; }
      var hist = list.map(function (g) {
        var m = /\((\d+)/.exec(g.WT || g.ST || g.DT || '');
        return {mgdl: +g.Value, at: m ? +m[1] : 0, trend: typeof g.Trend === 'number' ? TREND_N[g.Trend] : g.Trend};
      }).filter(function (p) { return p.at && p.mgdl; });
      finish(hist, done);
    });
  }

  function nsBase(url) {
    url = String(url || '').trim().replace(/\/+$/, '');
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    return url;
  }
  function readNightscout(c, done) {
    var u = nsBase(c.url) + '/api/v1/entries/sgv.json?count=1500&find%5Bdate%5D%5B%24gte%5D=' + (Date.now() - 86400000) +
      (c.token ? '&token=' + encodeURIComponent(c.token) : '');
    request('GET', u, null, function (st, list) {
      if (!st) { done({error: 'Can’t reach your Nightscout'}); return; }
      if (st === 401 || st === 403) { done({error: 'Nightscout wants a token'}); return; }
      if (st !== 200 || !list) { done({error: 'Nightscout error ' + st}); return; }
      var hist = list.map(function (e) { return {mgdl: +e.sgv, at: +e.date, trend: e.direction}; }).filter(function (p) { return p.at && p.mgdl; });
      if (!hist.length) { done({error: 'No reading yet'}); return; }
      finish(hist, done);
    });
  }
  function finish(hist, done) {
    hist.sort(function (a, b) { return a.at - b.at; });
    var last = hist[hist.length - 1];
    done({mgdl: last.mgdl, trend: last.trend, at: last.at, hist: hist});
  }

  function readGlucose() {
    var c = gconf();
    if (!c || glu.preview) return;
    var got = function (r) {
      if (!r.error) glu.last = r;
      // A failed refresh keeps showing a recent good reading rather than blanking the card.
      showGlucose(r.error && glu.last && Date.now() - glu.last.at < 20 * 60000 ? glu.last : r);
    };
    if (c.src === 'ns') readNightscout(c, got); else readDexcom(c, 0, got);
  }

  // MARK: - The card

  function hours() { var h = +stored('grange'); return RANGES.indexOf(h) >= 0 ? h : 3; }
  function fmt(mgdl, mmol) { return mmol ? (mgdl / 18.016).toFixed(1) : String(Math.round(mgdl)); }

  function build() {
    var el = $('glucose');
    if (el.getAttribute('data-built')) return;
    el.setAttribute('data-built', '1');
    el.innerHTML =
      '<button type="button" class="gmain" aria-label="Glucose settings">' +
        '<span class="gcap">Glucose</span>' +
        '<span class="gline"><span class="gval">—</span><span class="garrow"></span></span>' +
        '<span class="gunit"></span><span class="gmeta"></span>' +
      '</button>' +
      '<div class="gflow">' +
        '<div class="gchart" aria-hidden="true"><svg viewBox="0 0 300 100" preserveAspectRatio="none"></svg>' +
          '<span class="gtick hi"></span><span class="gtick lo"></span><span class="gdot"></span></div>' +
        '<div class="granges" role="group" aria-label="Time shown">' +
          RANGES.map(function (h) { return '<button type="button" data-h="' + h + '">' + h + 'h</button>'; }).join('') + '</div>' +
      '</div>';
    el.querySelector('.gmain').addEventListener('click', open);
    el.querySelector('.granges').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-h]');
      if (!b) return;
      store('grange', +b.getAttribute('data-h'));
      if (glu.last) showGlucose(glu.last); else paintRanges();
    });
  }
  function paintRanges() {
    var h = hours(), bs = $('glucose').querySelectorAll('.granges button');
    for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('on', +bs[i].getAttribute('data-h') === h);
  }

  function showGlucose(r) {
    var el = $('glucose'), c = gconf();
    if (!c) { el.hidden = true; return; }
    build();
    el.hidden = false;
    paintRanges();
    var mmol = c.unit !== 'mgdl', q = function (s) { return el.querySelector(s); };
    q('.gunit').textContent = mmol ? 'mmol/L' : 'mg/dL';
    if (!r || r.error) {
      q('.gval').textContent = '—'; q('.garrow').textContent = '';
      q('.gmeta').textContent = r && r.error ? r.error : 'Connecting…';
      el.className = 'err';
      drawChart([], c);
      return;
    }
    var mins = Math.max(0, Math.round((Date.now() - r.at) / 60000));
    q('.gval').textContent = fmt(r.mgdl, mmol);
    q('.garrow').textContent = ARROWS[r.trend] || '';
    q('.gmeta').textContent = mins < 1 ? 'just now' : mins < 60 ? mins + ' min ago' : 'over an hour ago';
    var lo = r.mgdl < (c.low || 70), hi = r.mgdl > (c.high || 180);
    el.className = (lo ? 'low' : hi ? 'high' : 'inrange') + (mins > 15 ? ' stale' : '');
    el.setAttribute('aria-label', 'Glucose ' + q('.gval').textContent + ' ' + q('.gunit').textContent + ', ' + q('.gmeta').textContent);
    drawChart(r.hist || [{mgdl: r.mgdl, at: r.at}], c);
  }

  /** The flow: a smooth line over the chosen hours, the in-range band behind it, gold above and red below. */
  function drawChart(hist, c) {
    var box = $('glucose').querySelector('.gchart'), svg = box.querySelector('svg');
    var W = 300, H = 100, now = Date.now(), span = hours() * 3600000, from = now - span;
    var mmol = c.unit !== 'mgdl', low = c.low || 70, high = c.high || 180;
    var pts = hist.filter(function (p) { return p.at >= from - 300000; });
    // The scale follows the readings, so the flow shows, but always keeps the whole in-range band in view.
    var lo = 400, hi = 0;
    pts.forEach(function (p) { lo = Math.min(lo, p.mgdl); hi = Math.max(hi, p.mgdl); });
    var bottom = Math.max(40, Math.min(low - 15, lo - 15)), top = Math.min(400, Math.max(high + 25, hi + 20));
    var X = function (t) { return Math.max(0, Math.min(W, (t - from) / span * W)); };
    var Y = function (v) { return H - (Math.max(bottom, Math.min(top, v)) - bottom) / (top - bottom) * H; };
    var yHi = Y(high), yLo = Y(low);

    // Break the line where the sensor went quiet for more than 16 minutes.
    var segs = [], seg = [];
    pts.forEach(function (p, i) {
      if (i && p.at - pts[i - 1].at > 16 * 60000) { if (seg.length) segs.push(seg); seg = []; }
      seg.push([X(p.at), Y(p.mgdl)]);
    });
    if (seg.length) segs.push(seg);

    var line = '', area = '';
    segs.forEach(function (s) {
      var d = smooth(s);
      line += d;
      if (s.length > 1) area += d + 'L' + s[s.length - 1][0].toFixed(1) + ' ' + H + 'L' + s[0][0].toFixed(1) + ' ' + H + 'Z';
    });
    var hiO = (yHi / H).toFixed(3), loO = (yLo / H).toFixed(3);
    svg.innerHTML =
      '<defs><linearGradient id="gStroke" x1="0" y1="0" x2="0" y2="' + H + '" gradientUnits="userSpaceOnUse">' +
        '<stop offset="0" stop-color="#FFC857"/><stop offset="' + hiO + '" stop-color="#FFC857"/>' +
        '<stop offset="' + hiO + '" stop-color="#DDF8E6"/><stop offset="' + loO + '" stop-color="#DDF8E6"/>' +
        '<stop offset="' + loO + '" stop-color="#FF6B7D"/><stop offset="1" stop-color="#FF6B7D"/></linearGradient>' +
      '<linearGradient id="gFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>' +
      '<rect class="band" x="0" y="' + yHi.toFixed(1) + '" width="' + W + '" height="' + (yLo - yHi).toFixed(1) + '"/>' +
      '<line class="edge" x1="0" x2="' + W + '" y1="' + yHi.toFixed(1) + '" y2="' + yHi.toFixed(1) + '"/>' +
      '<line class="edge" x1="0" x2="' + W + '" y1="' + yLo.toFixed(1) + '" y2="' + yLo.toFixed(1) + '"/>' +
      (area ? '<path class="area" d="' + area + '"/>' : '') +
      (line ? '<path class="line" d="' + line + '"/>' : '');

    var hiT = box.querySelector('.gtick.hi'), loT = box.querySelector('.gtick.lo'), dot = box.querySelector('.gdot');
    hiT.textContent = fmt(high, mmol); hiT.style.top = (yHi / H * 100) + '%';
    loT.textContent = fmt(low, mmol); loT.style.top = (yLo / H * 100) + '%';
    var last = pts[pts.length - 1];
    if (last) {
      dot.style.display = '';
      dot.style.left = (X(last.at) / W * 100) + '%';
      dot.style.top = (Y(last.mgdl) / H * 100) + '%';
      dot.className = 'gdot ' + (last.mgdl < low ? 'low' : last.mgdl > high ? 'high' : 'inrange');
    } else dot.style.display = 'none';
  }

  /** A Catmull-Rom curve through the points, as cubic Béziers: smooth, and it still passes every reading. */
  function smooth(p) {
    if (p.length === 1) return 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1) + 'h0.1';
    var d = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1);
    for (var i = 0; i < p.length - 1; i++) {
      var p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += 'C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }

  function startGlucose() {
    clearInterval(glu.timer);
    glu.session = null; glu.last = null;
    if (query.glucose && !glu.saved) {
      var real = stored('glucose');
      glu.pconf = {src: 'dex', unit: query.unit || (real && real.unit) || defaultUnit(), preview: true};
      glu.preview = true;
      glu.last = previewData(+query.glucose, query.trend || 'Flat');
      showGlucose(glu.last);
      return;
    }
    glu.preview = false;
    if (!gconf()) { showGlucose(null); return; }
    showGlucose({error: 'Connecting…'});
    readGlucose();
    glu.timer = setInterval(readGlucose, 5 * 60000);
  }

  /** 24 hours of made-up readings that drift and end on `now` with the given trend, for screenshots and demos. */
  function previewData(now, trend) {
    var hist = [], t = Date.now() - 2 * 60000, slope = {DoubleUp: 3, SingleUp: 2, FortyFiveUp: 1, Flat: 0, FortyFiveDown: -1, SingleDown: -2, DoubleDown: -3}[trend] || 0;
    for (var i = 287; i >= 0; i--) {
      var k = i / 12;   // hours back
      var w = Math.min(1, k / 1.2);   // the last hour follows the trend; before that, a day's ups and downs
      var v = now - slope * 6 * Math.min(i, 8) * Math.max(0, 1 - i / 24) + w * (14 + 24 * Math.sin(k / 1.15 - 1.2) + 30 * Math.sin(k / 3.9 + 0.6) + 6 * Math.sin(k * 2.3));
      hist.push({mgdl: Math.max(45, Math.round(v)), at: t - i * 300000, trend: i ? 'Flat' : trend});
    }
    hist[hist.length - 1].mgdl = now;
    return {mgdl: now, trend: trend, at: t, hist: hist};
  }

  // MARK: - The form (in Settings, or a setup step)

  function drawForm(box, st) {
    function sync() {
      var q = function (n) { var i = box.querySelector('[name=' + n + ']'); return i ? i.value : null; };
      ['user', 'pass', 'url', 'token'].forEach(function (n) { var v = q('g' + n); if (v !== null) st[n] = v; });
    }
    function draw() {
      var src = st.src || 'off', h = '<div class="gform">';
      h += '<div class="group"><span class="label">Show my glucose from</span><div class="opts wrap">' +
        opt('gsrc', 'off', src === 'off', 'Don’t show it') + opt('gsrc', 'dex', src === 'dex', 'Dexcom') +
        opt('gsrc', 'libre', src === 'libre', 'FreeStyle Libre') + opt('gsrc', 'ns', src === 'ns', 'Nightscout') + '</div></div>';
      if (src === 'dex') {
        h += '<label class="field"><span>Dexcom username, email or phone</span><input name="guser" type="text" autocomplete="username" spellcheck="false" value="' + esc(st.user || '') + '"></label>' +
          '<label class="field"><span>Dexcom password</span><input name="gpass" type="password" autocomplete="current-password" value="' + esc(st.pass || '') + '"></label>' +
          '<div class="group"><span class="label">Account region</span><div class="opts wrap">' +
          opt('gregion', 'ous', st.region !== 'us' && st.region !== 'jp', DEX.ous.label) + opt('gregion', 'us', st.region === 'us', DEX.us.label) + opt('gregion', 'jp', st.region === 'jp', DEX.jp.label) + '</div></div>' +
          '<p class="note">Turn on <b>Share</b> in the Dexcom app and invite at least one follower; Nexus reads that same feed. Use the account that wears the sensor.</p>';
      } else if (src === 'ns') {
        h += '<label class="field"><span>Your Nightscout address</span><input name="gurl" type="text" inputmode="url" spellcheck="false" placeholder="yourname.herokuapp.com" value="' + esc(st.url || '') + '"></label>' +
          '<label class="field"><span>Access token (if your site is locked)</span><input name="gtoken" type="text" spellcheck="false" placeholder="readable-1234abcd…" value="' + esc(st.token || '') + '"></label>' +
          '<p class="note">Make a read-only token in Nightscout: Admin tools → Subjects → add one with the <b>readable</b> role.</p>';
      } else if (src === 'libre') {
        h += '<p class="note big">Abbott’s LibreLinkUp doesn’t let web pages read it, so Libre comes in through <b>Nightscout</b>: a free site that bridges LibreLinkUp (or Juggluco, xDrip+) to anything. Set one up, then pick Nightscout here.</p>' +
          '<div class="opts">' + opt('gsrc', 'ns', false, 'Use Nightscout') + '</div>';
      }
      if (src === 'dex' || src === 'ns') {
        h += '<div class="group"><span class="label">Units</span><div class="opts">' +
          opt('gunit', 'mmol', st.unit !== 'mgdl', 'mmol/L') + opt('gunit', 'mgdl', st.unit === 'mgdl', 'mg/dL') + '</div></div>' +
          '<p class="note">Kept only in this browser and sent only to ' + (src === 'dex' ? 'Dexcom' : 'your Nightscout') + '. Never in a backup. A glance, not a medical device: check your CGM app before you treat.</p>';
      }
      box.innerHTML = h + '</div>';
    }
    box.onclick = function (e) {
      var b = e.target.closest('button.opt');
      if (!b) return;
      sync();
      var n = b.getAttribute('data-name'), v = b.getAttribute('data-value');
      if (n === 'gsrc') st.src = v; else if (n === 'gregion') st.region = v; else if (n === 'gunit') st.unit = v;
      draw();
      var f = box.querySelector('input'); if (f && n === 'gsrc') f.focus();
    };
    st.sync = sync;
    draw();
  }
  function draft() {
    var c = stored('glucose');
    return c ? {src: c.src, user: c.user, pass: c.pass, region: c.region, unit: c.unit, url: c.url, token: c.token}
      : {src: 'off', region: 'ous', unit: defaultUnit()};
  }
  /** Check what was typed and keep it. Returns an error to show, or '' when saved. */
  function save(st) {
    if (st.sync) st.sync();
    if (st.src === 'dex') {
      if (!String(st.user || '').trim() || !st.pass) return 'Enter your Dexcom username and password';
      store('glucose', {src: 'dex', user: st.user.trim(), pass: st.pass, region: st.region || 'ous', unit: st.unit || 'mmol'});
    } else if (st.src === 'ns') {
      if (!/^https?:\/\/[^\s/]+\.[^\s/]+/.test(nsBase(st.url))) return 'Enter your Nightscout address';
      store('glucose', {src: 'ns', url: nsBase(st.url), token: String(st.token || '').trim(), unit: st.unit || 'mmol'});
    } else if (st.src === 'libre') {
      return 'Libre comes in through Nightscout — pick Nightscout';
    } else {
      try { localStorage.removeItem('nexus.glucose'); } catch (e) {}
    }
    glu.saved = true;
    startGlucose();
    return '';
  }

  var gst = null;
  function open() {
    gst = draft();
    drawForm($('gbody'), gst);
    $('gremove').hidden = !stored('glucose');
    showSheet();
    $('gsave').focus({preventScroll: true});
  }
  $('gsave').addEventListener('click', function () {
    var err = save(gst);
    if (err) { toast(err); return; }
    closeSheet();
    toast(gconf() ? 'Glucose on — reading now' : 'Glucose hidden');
    if (gconf()) window.scrollTo({top: 0, behavior: 'smooth'});
  });
  $('gremove').addEventListener('click', function () {
    try { localStorage.removeItem('nexus.glucose'); } catch (e) {}
    glu.saved = true; startGlucose(); closeSheet(); toast('Glucose removed from this browser');
  });
  $('gcancel').addEventListener('click', closeSheet);
  $('gsheet').addEventListener('click', function (e) { if (e.target === $('gsheet')) closeSheet(); });
  document.addEventListener('keydown', function (e) {
    if (!sheetOpen) return;
    var a = document.activeElement;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSheet(); }
    else if (e.key === 'Enter' && a && a.tagName === 'INPUT') { e.preventDefault(); e.stopPropagation(); $('gsave').click(); }
  }, true);
  var opener = $('gopen'); if (opener) opener.addEventListener('click', open);

  window.NexusGlucose = {open: open, draft: draft, drawForm: drawForm, save: save, isOpen: function () { return sheetOpen; }};

  startGlucose();
  setInterval(function () { if (glu.last && !glu.preview) showGlucose(glu.last); }, 60000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && gconf() && !glu.preview && (!glu.last || Date.now() - glu.last.at > 5 * 60000)) readGlucose();
  });
})();
