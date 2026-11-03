/*
 * The living background: the sky as it is outside (rain, snow, clouds, stars, fog, storms, sun) and, over it, a light
 * that belongs to whichever app is in focus. One canvas at half the screen's size, scaled up by CSS, at most 30 fps,
 * a few hundred particles at the most, and nothing drawn while an app is open. Plain ES5.
 */
var Sky = (function () {
  'use strict';

  var W = 960, H = 540;
  var canvas, ctx, base, baseCtx, cloudSprite;
  var running = false, last = 0, t0 = 0, raf = null, still = false;
  var lite = /\blite\b/.test(document.documentElement.className);
  var scale = lite ? 0.5 : 1;   // particle counts

  var wx = {kind: 'clear', isDay: false, cloud: 0.1, phase: 'night', wind: 0.3};
  var app = {color: [201, 162, 74], motif: 'none'}, prevApp = null, appMix = 1;

  var stars = [], drops = [], flakes = [], clouds = [], motes = [], flash = 0, nextFlash = 0;

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function hex(c) {
    if (typeof c !== 'string') return c;
    var n = parseInt(c.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; }

  // MARK: - The sky's colours, painted once per change into `base`

  function palette() {
    var overcast = wx.cloud > 0.7 || /rain|drizzle|storm|snow|fog/.test(wx.kind);
    if (wx.phase === 'dawn' || wx.phase === 'dusk') {
      return overcast ? ['#0B0D13', '#1A1D26', '#3A2D2A'] : ['#0A1022', '#1C2340', '#5B3524'];
    }
    if (wx.isDay) return overcast ? ['#0E1218', '#1C222B', '#2A313B'] : ['#081429', '#123056', '#1F4C7A'];
    return overcast ? ['#05060A', '#0C0E14', '#14171E'] : ['#03050C', '#081024', '#0F1B36'];
  }

  function paintBase() {
    var p = palette();
    var g = baseCtx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, p[0]); g.addColorStop(0.55, p[1]); g.addColorStop(1, p[2]);
    baseCtx.fillStyle = g;
    baseCtx.fillRect(0, 0, W, H);
    // A low warm glow on the horizon at sunrise and sunset.
    if (wx.phase === 'dawn' || wx.phase === 'dusk') {
      var h = baseCtx.createRadialGradient(W * 0.5, H * 1.05, 10, W * 0.5, H * 1.05, W * 0.7);
      h.addColorStop(0, 'rgba(255,140,60,0.35)'); h.addColorStop(1, 'rgba(255,140,60,0)');
      baseCtx.fillStyle = h; baseCtx.fillRect(0, 0, W, H);
    }
  }

  function makeCloudSprite() {
    var c = document.createElement('canvas');
    c.width = 320; c.height = 140;
    var x = c.getContext('2d');
    var puffs = [[80, 84, 50], [135, 66, 56], [195, 74, 52], [245, 86, 40], [160, 88, 48]];
    for (var i = 0; i < puffs.length; i++) {
      var p = puffs[i], g = x.createRadialGradient(p[0], p[1], 0, p[0], p[1], p[2]);
      g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(0.55, 'rgba(255,255,255,0.2)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.beginPath(); x.arc(p[0], p[1], p[2], 0, 6.2832); x.fill();
    }
    return c;
  }

  // MARK: - Particles for the weather

  function seed() {
    var i, n;
    stars = [];
    for (i = 0; i < 140 * scale; i++) stars.push({x: rnd(0, W), y: rnd(0, H * 0.75), r: rnd(0.4, 1.3), p: rnd(0, 6.28), s: rnd(0.6, 1.8)});

    var rain = {drizzle: 90, rain: 220, heavy: 380, storm: 380}[wx.kind] || 0;
    drops = [];
    for (i = 0; i < rain * scale; i++) drops.push({x: rnd(-60, W + 60), y: rnd(-H, H), l: rnd(10, wx.kind === 'drizzle' ? 14 : 26), v: rnd(9, 15) * (wx.kind === 'drizzle' ? 0.6 : 1), a: rnd(0.15, 0.45)});

    flakes = [];
    n = wx.kind === 'snow' ? 170 : 0;
    for (i = 0; i < n * scale; i++) flakes.push({x: rnd(0, W), y: rnd(-H, H), r: rnd(0.8, 2.4), v: rnd(0.35, 1.1), p: rnd(0, 6.28)});

    clouds = [];
    n = Math.round(wx.cloud * 9);
    for (i = 0; i < n; i++) clouds.push({x: rnd(-320, W), y: rnd(-20, H * 0.45), s: rnd(0.8, 2.2), v: rnd(0.05, 0.18), a: rnd(0.25, 0.6)});
  }

  function drawWeather(t) {
    var i, d, night = !wx.isDay;

    // Stars and the odd shooting star, on clear and partly cloudy nights.
    if (night && wx.cloud < 0.75 && !/rain|drizzle|storm|snow|fog/.test(wx.kind)) {
      var vis = 1 - wx.cloud;
      for (i = 0; i < stars.length; i++) {
        d = stars[i];
        var tw = 0.55 + 0.45 * Math.sin(d.p + t * 0.001 * d.s);
        ctx.fillStyle = 'rgba(255,255,255,' + (tw * 0.8 * vis).toFixed(3) + ')';
        ctx.fillRect(d.x, d.y, d.r, d.r);
      }
      var sh = (t % 14000) / 1400;
      if (sh < 1) {
        var sx = W * 0.72 - sh * 260, sy = 40 + sh * 110;
        var g = ctx.createLinearGradient(sx, sy, sx + 70, sy - 30);
        g.addColorStop(0, 'rgba(255,255,255,' + (0.7 * (1 - sh)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 70, sy - 30); ctx.stroke();
      }
    }

    // The sun's glow on clear days.
    if (wx.isDay && wx.cloud < 0.7 && !/rain|storm|snow|fog/.test(wx.kind)) {
      var pulse = 0.85 + 0.15 * Math.sin(t * 0.0006);
      var sun = ctx.createRadialGradient(W * 0.5, -40, 10, W * 0.5, -40, 420);
      sun.addColorStop(0, 'rgba(255,214,150,' + (0.32 * pulse * (1 - wx.cloud)).toFixed(3) + ')');
      sun.addColorStop(1, 'rgba(255,214,150,0)');
      ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H);
    }

    // Clouds drift with the wind.
    for (i = 0; i < clouds.length; i++) {
      d = clouds[i];
      d.x += d.v * (0.6 + wx.wind);
      if (d.x > W + 20) { d.x = -320 * d.s; d.y = rnd(-20, H * 0.45); }
      ctx.globalAlpha = d.a * (night ? 0.35 : 0.55);
      ctx.drawImage(cloudSprite, d.x, d.y, 320 * d.s, 140 * d.s);
    }
    ctx.globalAlpha = 1;

    // Fog: slow bands.
    if (wx.kind === 'fog') {
      for (i = 0; i < 3; i++) {
        var y = H * (0.35 + i * 0.22), off = Math.sin(t * 0.00012 + i) * 120;
        var f = ctx.createLinearGradient(0, y - 70, 0, y + 70);
        f.addColorStop(0, 'rgba(200,205,215,0)'); f.addColorStop(0.5, 'rgba(200,205,215,0.13)'); f.addColorStop(1, 'rgba(200,205,215,0)');
        ctx.fillStyle = f; ctx.fillRect(off - 200, y - 70, W + 400, 140);
      }
    }

    // Rain: one path per frame.
    if (drops.length) {
      var slant = 1.6 + wx.wind * 2;
      ctx.strokeStyle = 'rgba(190,210,235,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (i = 0; i < drops.length; i++) {
        d = drops[i];
        d.y += d.v; d.x += slant * 0.5;
        if (d.y > H) { d.y = rnd(-60, -10); d.x = rnd(-60, W + 60); }
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + slant, d.y + d.l);
      }
      ctx.stroke();
    }

    // Snow.
    if (flakes.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (i = 0; i < flakes.length; i++) {
        d = flakes[i];
        d.y += d.v; d.x += Math.sin(d.p + t * 0.0012) * 0.4 + wx.wind * 0.3;
        if (d.y > H) { d.y = -5; d.x = rnd(0, W); }
        ctx.fillRect(d.x, d.y, d.r, d.r);
      }
    }

    // Lightning.
    if (wx.kind === 'storm') {
      if (t > nextFlash) { flash = 1; nextFlash = t + rnd(5000, 14000); }
      if (flash > 0.01) {
        ctx.fillStyle = 'rgba(210,220,255,' + (flash * 0.35).toFixed(3) + ')';
        ctx.fillRect(0, 0, W, H);
        flash *= 0.82;
      }
    }
  }

  // MARK: - The app's light

  function seedMotes() {
    motes = [];
    for (var i = 0; i < 26; i++) motes.push({x: rnd(0, W), y: rnd(0, H), vx: rnd(-0.25, 0.25), vy: rnd(-0.18, 0.18), p: rnd(0, 6.28)});
  }

  function drawApp(a, alpha, t) {
    if (!a || alpha <= 0.01) return;
    var c = a.color, i, g, k = alpha;

    // The brand's glow, low on the screen behind the grid.
    g = ctx.createRadialGradient(W * 0.5, H * 0.78, 20, W * 0.5, H * 0.78, W * 0.62);
    g.addColorStop(0, rgba(c, 0.30 * k)); g.addColorStop(0.5, rgba(c, 0.10 * k)); g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    switch (a.motif) {
      case 'pulse':   // rings rising from below
        for (i = 0; i < 3; i++) {
          var r = ((t * 0.04 + i * 160) % 480);
          ctx.strokeStyle = rgba(c, 0.22 * k * (1 - r / 480)); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(W * 0.5, H * 1.02, r + 40, Math.PI, 2 * Math.PI); ctx.stroke();
        }
        break;
      case 'ribbons':   // tall beams of light drifting sideways
        for (i = 0; i < 7; i++) {
          var x = (W * (i / 7) + t * 0.02 * (i % 2 ? 1 : -0.6)) % (W + 80) - 40;
          var w = 18 + (i * 13) % 40;
          g = ctx.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0, rgba(c, 0)); g.addColorStop(0.6, rgba(c, 0.05 * k)); g.addColorStop(1, rgba(c, 0.13 * k));
          ctx.fillStyle = g; ctx.fillRect(x, 0, w, H);
        }
        break;
      case 'shimmer':   // a band of light sweeping across
        var sx = ((t * 0.08) % (W + 600)) - 300;
        g = ctx.createLinearGradient(sx - 220, 0, sx + 220, H);
        g.addColorStop(0, rgba(c, 0)); g.addColorStop(0.5, rgba(c, 0.16 * k)); g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        break;
      case 'arc':   // sparkles travelling along a wide arc
        for (i = 0; i < 40; i++) {
          var u = ((i / 40) + t * 0.00004) % 1, ang = Math.PI * (1.08 + u * 0.84);
          var ax = W * 0.5 + Math.cos(ang) * W * 0.46, ay = H * 0.95 + Math.sin(ang) * H * 0.72;
          var tw = 0.5 + 0.5 * Math.sin(t * 0.004 + i);
          ctx.fillStyle = 'rgba(255,255,255,' + (0.55 * tw * k * Math.sin(u * Math.PI)).toFixed(3) + ')';
          ctx.fillRect(ax, ay, 1.6, 1.6);
        }
        break;
      case 'spotlight':   // a soft white light wandering above
        var lx = W * (0.5 + 0.25 * Math.sin(t * 0.00025));
        g = ctx.createRadialGradient(lx, -60, 10, lx, -60, 520);
        g.addColorStop(0, 'rgba(255,255,255,' + (0.16 * k).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        break;
      case 'waves':   // three flowing lines
        ctx.lineWidth = 2;
        for (i = 0; i < 3; i++) {
          ctx.strokeStyle = rgba(i === 1 ? [255, 120, 160] : c, 0.20 * k);
          ctx.beginPath();
          for (var wx2 = 0; wx2 <= W; wx2 += 24) {
            var wy = H * (0.72 + i * 0.05) + Math.sin(wx2 * 0.008 + t * 0.0012 + i * 1.7) * 26;
            if (wx2 === 0) ctx.moveTo(wx2, wy); else ctx.lineTo(wx2, wy);
          }
          ctx.stroke();
        }
        break;
      case 'nodes':   // floating points that link when close
        var m, n2, dx, dy;
        for (i = 0; i < motes.length; i++) {
          m = motes[i]; m.x += m.vx; m.y += m.vy;
          if (m.x < 0 || m.x > W) m.vx = -m.vx;
          if (m.y < 0 || m.y > H) m.vy = -m.vy;
        }
        ctx.strokeStyle = rgba(c, 0.14 * k); ctx.lineWidth = 1;
        ctx.beginPath();
        for (i = 0; i < motes.length; i++) {
          for (var j = i + 1; j < motes.length; j++) {
            m = motes[i]; n2 = motes[j]; dx = m.x - n2.x; dy = m.y - n2.y;
            if (dx * dx + dy * dy < 22000) { ctx.moveTo(m.x, m.y); ctx.lineTo(n2.x, n2.y); }
          }
        }
        ctx.stroke();
        ctx.fillStyle = rgba(c, 0.5 * k);
        for (i = 0; i < motes.length; i++) ctx.fillRect(motes[i].x - 1.5, motes[i].y - 1.5, 3, 3);
        break;
      case 'grid':   // a floor of lines moving towards the viewer
        ctx.strokeStyle = rgba(c, 0.13 * k); ctx.lineWidth = 1;
        ctx.beginPath();
        var hz = H * 0.6, off = (t * 0.03) % 1;
        for (i = 0; i < 12; i++) {
          var z = (i + off) / 12, gy = hz + (H - hz) * z * z;
          ctx.moveTo(0, gy); ctx.lineTo(W, gy);
        }
        for (i = -10; i <= 10; i++) { ctx.moveTo(W * 0.5 + i * 18, hz); ctx.lineTo(W * 0.5 + i * 120, H); }
        ctx.stroke();
        break;
    }
  }

  // MARK: - The loop

  function draw(t) {
    ctx.drawImage(base, 0, 0);
    drawWeather(t);
    if (appMix < 1) appMix = Math.min(1, appMix + 0.06);
    if (prevApp) drawApp(prevApp, 1 - appMix, t);
    drawApp(app, appMix, t);
  }

  function frame(now) {
    raf = null;
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (now - last < 33) return;   // 30 fps is plenty for a background
    last = now;
    draw(now - t0);
  }

  function start(el) {
    canvas = el;
    ctx = canvas.getContext('2d');
    base = document.createElement('canvas'); base.width = W; base.height = H;
    baseCtx = base.getContext('2d');
    cloudSprite = makeCloudSprite();
    t0 = (window.performance && performance.now) ? performance.now() : Date.now();
    paintBase(); seed(); seedMotes();
    resume();
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else if (!still) resume(); });
  }
  function resume() { if (running) return; running = true; if (!raf) raf = requestAnimationFrame(frame); }
  function pause() { running = false; if (raf) { cancelAnimationFrame(raf); raf = null; } }

  /** Still: one frame of the sky as it is, no animation (saves battery). */
  function setStill(v) {
    still = !!v;
    if (still) { pause(); if (ctx) { appMix = 1; draw(20000); } } else resume();
  }

  return {
    setStill: setStill,
    start: start,
    pause: pause,
    resume: resume,
    /** {kind: clear|partly|cloudy|fog|drizzle|rain|heavy|snow|storm, isDay, cloud 0-1, phase: day|night|dawn|dusk, wind 0-1} */
    setWeather: function (w) {
      for (var k in w) if (Object.prototype.hasOwnProperty.call(w, k)) wx[k] = w[k];
      if (!ctx) return;
      paintBase(); seed();
      if (still) draw(20000);
    },
    /** {color: '#E50914', motif: 'ribbons'} for the app in focus. */
    setApp: function (a) {
      prevApp = app;
      app = {color: hex(a.color), motif: a.motif || 'none'};
      appMix = still ? 1 : 0;
      if (still && ctx) draw(20000);
    }
  };
})();
