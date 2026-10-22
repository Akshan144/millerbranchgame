'use strict';
// Shared namespace + small math/random helpers.
window.MB = window.MB || {};
(function (MB) {
  MB.W = 1280;
  MB.H = 720;

  const U = (MB.U = {});
  U.TAU = Math.PI * 2;
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.invLerp = (a, b, v) => U.clamp((v - a) / (b - a), 0, 1);
  U.rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  U.randi = (a, b) => Math.floor(U.rand(a, b + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  U.approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
  U.sign = (v) => (v < 0 ? -1 : 1);

  // Deterministic hash noise (used for hand-drawn wobble and static decor).
  U.hash = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  };
  U.noise = (x) => {
    const i = Math.floor(x), f = x - i;
    const u = f * f * (3 - 2 * f);
    return U.lerp(U.hash(i), U.hash(i + 1), u);
  };
  // Seeded PRNG (mulberry32) for repeatable pre-rendered art.
  U.rng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  U.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  // items: [[value, weight], ...]
  U.weighted = (items) => {
    let total = 0;
    for (const it of items) total += it[1];
    let r = Math.random() * total;
    for (const it of items) {
      r -= it[1];
      if (r <= 0) return it[0];
    }
    return items.length ? items[items.length - 1][0] : null;
  };

  U.ease = {
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inCubic: (t) => t * t * t,
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    outBack: (t) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    outElastic: (t) => {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
    },
  };

  // Circle vs axis-aligned rect overlap.
  U.circleRect = (cx, cy, r, rx, ry, rw, rh) => {
    const nx = U.clamp(cx, rx, rx + rw), ny = U.clamp(cy, ry, ry + rh);
    const dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  };
  U.inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

  // Minutes after 9:00 PM -> "10:42 PM"
  U.clockText = (mins) => {
    let total = 21 * 60 + Math.floor(mins);
    let h = Math.floor(total / 60) % 24;
    const m = total % 60;
    const ampm = h >= 12 && h < 24 ? 'PM' : 'AM';
    let hh = h % 12;
    if (hh === 0) hh = 12;
    return { hm: hh + ':' + String(m).padStart(2, '0'), ampm: h === 0 ? 'AM' : ampm };
  };

  U.fmtNum = (n) => Math.round(n).toLocaleString('en-US');

  U.store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem('mbl.' + key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(key, val) {
      try {
        localStorage.setItem('mbl.' + key, JSON.stringify(val));
      } catch (e) { /* storage unavailable */ }
    },
  };
})(window.MB);
