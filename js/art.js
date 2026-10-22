'use strict';
// Hand-drawn rendering kit: wobbly ink paths ("line boil"), characters, critters, props, icons.
(function (MB) {
  const U = MB.U;
  const A = (MB.A = {});

  A.INK = '#2b1b33';
  A.lw = 3;
  A.amp = 0.9;
  A.boil = 0; // advances ~7 times a second, re-jitters every outline
  A.F = {
    display: '"Lilita One", "Arial Black", Impact, sans-serif',
    hand: '"Patrick Hand", "Comic Sans MS", "Segoe Print", cursive',
    script: '"Caveat", "Segoe Script", "Comic Sans MS", cursive',
  };
  A.C = {
    paper: '#fbf3e4', cream: '#fff6e6', ink: A.INK, inkSoft: '#5a4360',
    red: '#e0524a', orange: '#f08a3c', yellow: '#f6c945', green: '#6cbf6a', teal: '#3fa7a0',
    blue: '#4a7fd1', purple: '#8a5ac2', pink: '#ef7fa6', mint: '#9fe0c4', sky: '#8fd3f4',
    wood: '#c98a4b', woodDark: '#8f5a30', woodLight: '#e2ab6c',
    brass: '#d9a63e', lampGreen: '#2f7a5a', chair: '#3c6e71', chairDark: '#2b5254',
    books: ['#c94f3d', '#e39b3a', '#3f7f6e', '#2f5d8a', '#7b4a8c', '#d9c27a', '#5f8f3e', '#a83f5d', '#e8dcc0', '#344a5e', '#d8734a', '#5b8fb0'],
  };

  A.j = (seed, amp) => (U.hash(seed * 3.137 + A.boil * 17.31) - 0.5) * 2 * amp;

  // --- path builders ------------------------------------------------------
  A.rr = function (ctx, x, y, w, h, r, seed = 0, amp = A.amp) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    const j = (k) => A.j(seed + k, amp);
    const x0 = x + j(1), y0 = y + j(2), x1 = x + w + j(3), y1 = y + j(4);
    const x2 = x + w + j(5), y2 = y + h + j(6), x3 = x + j(7), y3 = y + h + j(8);
    ctx.beginPath();
    ctx.moveTo((x0 + x1) / 2, (y0 + y1) / 2);
    ctx.arcTo(x1, y1, x2, y2, r);
    ctx.arcTo(x2, y2, x3, y3, r);
    ctx.arcTo(x3, y3, x0, y0, r);
    ctx.arcTo(x0, y0, x1, y1, r);
    ctx.closePath();
  };
  A.el = function (ctx, cx, cy, rx, ry, seed = 0, amp = A.amp, n = 10) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * U.TAU;
      const k = 1 + A.j(seed + i * 1.7, amp) / Math.max(6, (rx + ry) / 2);
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    A.smoothPath(ctx, pts, true);
  };
  // Lumpy blob (bushes, hair, clouds)
  A.blob = function (ctx, cx, cy, rx, ry, seed = 0, lump = 0.15, n = 9) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * U.TAU;
      const k = 1 + (U.hash(seed + i * 9.1) - 0.5) * 2 * lump + A.j(seed + i, 0.6) / 20;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    A.smoothPath(ctx, pts, true);
  };
  A.smoothPath = function (ctx, pts, close = true) {
    const n = pts.length;
    ctx.beginPath();
    if (close) {
      const m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
      ctx.moveTo(m0[0], m0[1]);
      for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[(i + 1) % n];
        ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
      }
      ctx.closePath();
    } else {
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < n - 1; i++) {
        const p = pts[i], q = pts[i + 1];
        ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
      }
      ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
    }
  };
  A.poly = function (ctx, pts, seed = 0, amp = A.amp, close = true) {
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = p[0] + A.j(seed + i * 2.3, amp), y = p[1] + A.j(seed + i * 2.3 + 1, amp);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    if (close) ctx.closePath();
  };
  A.fs = function (ctx, fill, lw = A.lw, ink = A.INK) {
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (lw) {
      ctx.lineWidth = lw;
      ctx.strokeStyle = ink;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  };
  // Fill a path, shade inside it via clip, then outline. pathFn rebuilds the same path.
  A.shape = function (ctx, pathFn, fill, shadeFn, lw = A.lw) {
    pathFn();
    ctx.fillStyle = fill;
    ctx.fill();
    if (shadeFn) {
      ctx.save();
      pathFn();
      ctx.clip();
      shadeFn(ctx);
      ctx.restore();
    }
    if (lw) {
      pathFn();
      A.fs(ctx, null, lw);
    }
  };
  A.line = function (ctx, x1, y1, x2, y2, seed = 0, lw = A.lw, col = A.INK, amp = A.amp) {
    const mx = (x1 + x2) / 2 + A.j(seed, amp), my = (y1 + y2) / 2 + A.j(seed + 1, amp);
    ctx.beginPath();
    ctx.moveTo(x1 + A.j(seed + 2, amp * 0.5), y1 + A.j(seed + 3, amp * 0.5));
    ctx.quadraticCurveTo(mx, my, x2 + A.j(seed + 4, amp * 0.5), y2 + A.j(seed + 5, amp * 0.5));
    ctx.lineWidth = lw;
    ctx.strokeStyle = col;
    ctx.lineCap = 'round';
    ctx.stroke();
  };
  A.capsule = function (ctx, x1, y1, x2, y2, w, col, lw = 2.6) {
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 + A.j(x1 + y2, 0.4), y2 + A.j(x2 + y1, 0.4));
    ctx.strokeStyle = A.INK;
    ctx.lineWidth = w + lw * 2;
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.stroke();
  };
  A.shadow = function (ctx, x, y, rx, ry, a = 0.28) {
    ctx.fillStyle = `rgba(35,15,45,${a})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, U.TAU);
    ctx.fill();
  };

  // Shade/tint a hex color: amt -1..1
  const shadeCache = {};
  A.shade = function (hex, amt) {
    const key = hex + amt;
    if (shadeCache[key]) return shadeCache[key];
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    let r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    if (amt < 0) {
      // darken toward a plum shadow rather than grey
      const t = -amt;
      r = r * (1 - t) + 43 * t;
      g = g * (1 - t) + 20 * t;
      b = b * (1 - t) + 60 * t;
    } else {
      r = r + (255 - r) * amt;
      g = g + (246 - g) * amt;
      b = b + (230 - b) * amt;
    }
    const out = '#' + [r, g, b].map((v) => Math.round(U.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
    shadeCache[key] = out;
    return out;
  };
  A.rgba = function (hex, a) {
    let c = hex.replace('#', '');
    const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  };

  // --- text ------------------------------------------------------------------
  A.text = function (ctx, str, x, y, o = {}) {
    ctx.font = `${o.weight || ''} ${o.size || 24}px ${o.font || A.F.display}`;
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.base || 'middle';
    if (o.shadow) {
      ctx.fillStyle = o.shadowColor || 'rgba(30,10,40,0.45)';
      ctx.fillText(str, x + (o.shadowX ?? 0), y + (o.shadow === true ? 4 : o.shadow));
    }
    if (o.outline !== 0) {
      ctx.lineWidth = o.outline || 6;
      ctx.strokeStyle = o.ink || A.INK;
      ctx.lineJoin = 'round';
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = o.color || '#fff';
    ctx.fillText(str, x, y);
  };
  A.wrap = function (ctx, str, maxW) {
    const words = str.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  A.bubble = function (ctx, x, y, str, o = {}) {
    const size = o.size || 17;
    ctx.font = `${size}px ${o.font || A.F.hand}`;
    const lines = o.maxW ? A.wrap(ctx, str, o.maxW) : [str];
    let w = 0;
    lines.forEach((l) => (w = Math.max(w, ctx.measureText(l).width)));
    w += 18;
    const h = lines.length * (size + 2) + 10;
    const bx = U.clamp(x - w / 2, 6, MB.W - w - 6), by = y - h - 12;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    A.rr(ctx, bx, by, w, h, 10, x * 0.1, 0.7);
    ctx.fillStyle = o.bg || '#fffaf0';
    ctx.fill();
    // tail
    ctx.beginPath();
    ctx.moveTo(x - 6, by + h - 1);
    ctx.lineTo(x + (o.tail ?? 2), y - 2);
    ctx.lineTo(x + 7, by + h - 1);
    ctx.fill();
    A.rr(ctx, bx, by, w, h, 10, x * 0.1, 0.7);
    A.fs(ctx, null, 2.5);
    ctx.beginPath();
    ctx.moveTo(x - 6, by + h + 1);
    ctx.lineTo(x + (o.tail ?? 2), y - 2);
    ctx.lineTo(x + 7, by + h + 1);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = A.INK;
    ctx.stroke();
    ctx.fillStyle = o.bg || '#fffaf0';
    ctx.fillRect(x - 5, by + h - 3, 11, 3.5);
    ctx.fillStyle = o.color || A.INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, bx + w / 2, by + 6 + size / 2 + i * (size + 2)));
    ctx.restore();
  };

  // --- characters -------------------------------------------------------------
  // L: look {skin, hair, hairStyle, top, top2, pants, shoes, acc, headScale, chair}
  // s: {pose, face:'down'|'up'|'side', dir, t, emo, sq, scale, hold, moving, alpha}
  A.person = function (ctx, x, y, L, s) {
    const t = s.t || 0;
    const sc = s.scale || 1;
    const pose = s.pose || 'stand';
    ctx.save();
    ctx.translate(x, y);
    if (s.alpha != null) ctx.globalAlpha *= s.alpha;
    if (pose !== 'seat' && pose !== 'sleep' && !s.noShadow) A.shadow(ctx, 0, 0, 15 * sc, 5 * sc);
    ctx.scale(sc, sc);
    const sq = s.sq || 0;
    ctx.scale(1 + sq * 0.16, 1 - sq * 0.16);
    let bob = 0;
    if (pose === 'cheer') bob = -Math.abs(Math.sin(t * 9)) * 7;
    if (pose === 'walk') bob = -Math.abs(Math.sin(t * 13)) * 2;
    ctx.translate(0, bob);
    const face = s.face || 'down';
    const dir = s.dir || 1;
    const seed = L.seed || 1;
    const hs = L.headScale || 1;
    const walkP = pose === 'walk' ? t * 13 : 0;
    const carrying = pose === 'carry';

    if (pose === 'seat' || pose === 'type' || pose === 'sleep') {
      // chair back
      A.shape(ctx, () => A.rr(ctx, -17, -54, 34, 44, 9, seed + 40), L.chair || A.C.chair, (c) => {
        c.fillStyle = A.shade(L.chair || A.C.chair, -0.25);
        c.fillRect(6, -60, 20, 60);
      });
    }

    // back hair / tails
    const headY = (pose === 'sleep' ? -26 : pose === 'seat' || pose === 'type' ? -51 : -54) + (s.lean || 0);
    if (pose !== 'sleep') backHair(ctx, L, 0, headY, face, dir, t, hs);

    // legs
    if (pose !== 'seat' && pose !== 'type' && pose !== 'sleep' && pose !== 'floor') {
      const l1 = Math.max(0, Math.sin(walkP)) * 4, l2 = Math.max(0, -Math.sin(walkP)) * 4;
      A.rr(ctx, -9, -16 - l1 * 0.4, 8, 16 - l1 * 0.6, 3, seed + 11);
      A.fs(ctx, L.pants || '#3b4a6b', 2.5);
      A.rr(ctx, 1, -16 - l2 * 0.4, 8, 16 - l2 * 0.6, 3, seed + 12);
      A.fs(ctx, L.pants || '#3b4a6b', 2.5);
      A.el(ctx, -5.5, -1.5 - l1, 6, 3.4, seed + 13, 0.4, 8);
      A.fs(ctx, L.shoes || '#f2efe6', 2.2);
      A.el(ctx, 5.5, -1.5 - l2, 6, 3.4, seed + 14, 0.4, 8);
      A.fs(ctx, L.shoes || '#f2efe6', 2.2);
    }
    if (pose === 'floor') {
      // sitting cross-legged on a rug
      A.el(ctx, 0, -6, 16, 7, seed + 15);
      A.fs(ctx, L.pants || '#3b4a6b', 2.5);
    }

    // torso
    const tY = pose === 'sleep' ? -40 : pose === 'floor' ? -40 : -42;
    const top = L.top || '#e0524a';
    const torsoPath = () => A.rr(ctx, -14, tY, 28, pose === 'floor' ? 34 : 29, 9, seed + 20);
    A.shape(ctx, torsoPath, top, (c) => {
      c.fillStyle = A.shade(top, -0.28);
      c.fillRect(face === 'up' ? -16 : 5 * (face === 'side' ? -dir : 1), tY - 4, 14, 44);
      c.fillStyle = A.shade(top, -0.18);
      c.fillRect(-16, tY + 24, 32, 8);
      if (L.top2) {
        c.fillStyle = L.top2;
        if (L.pattern === 'stripe') {
          c.fillRect(-16, tY + 10, 32, 4);
          c.fillRect(-16, tY + 17, 32, 3);
        } else if (L.pattern === 'vest') {
          c.fillRect(-4, tY, 8, 30);
        } else if (face !== 'up') {
          c.beginPath();
          c.arc(face === 'side' ? dir * 4 : -4, tY + 11, 3.2, 0, U.TAU);
          c.fill();
        }
      }
    });
    if (face !== 'up' && pose !== 'sleep') {
      // hood / collar
      ctx.strokeStyle = A.shade(top, -0.35);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, tY + 1, 8, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      if (!L.pattern) {
        // pocket
        ctx.beginPath();
        ctx.moveTo(-7, tY + 23);
        ctx.quadraticCurveTo(0, tY + 17, 7, tY + 23);
        ctx.stroke();
      }
      if (L.lanyard) {
        ctx.strokeStyle = L.lanyard;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-6, tY + 1);
        ctx.lineTo(0, tY + 16);
        ctx.lineTo(6, tY + 1);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.fillRect(-3, tY + 15, 6, 7);
      }
    }

    // arms
    const skin = L.skin || '#e8b48e';
    const sh = tY + 6;
    let hands;
    if (pose === 'type' || pose === 'seat') {
      const b1 = pose === 'type' ? Math.sin(t * 28) * 2 : 0, b2 = pose === 'type' ? Math.cos(t * 26) * 2 : 0;
      hands = [[-8, -5 + b1], [8, -5 + b2]];
    } else if (pose === 'sleep') {
      hands = [[-4, -16], [4, -16]];
    } else if (pose === 'cheer') {
      hands = [[-20, -74 + Math.sin(t * 14) * 4], [20, -74 + Math.cos(t * 14) * 4]];
    } else if (carrying) {
      hands = [[-11, -74], [11, -74]];
    } else if (pose === 'scroll') {
      hands = [[-4, tY + 14], [4, tY + 14]];
    } else if (pose === 'talk') {
      hands = [[-16, tY + 22], [12 * dir, tY - 6 + Math.sin(t * 6) * 2]];
    } else if (pose === 'shh') {
      hands = [[-16, tY + 24], [2, headY + 8]];
    } else if (pose === 'floor') {
      hands = [[-10, -10], [10, -10]];
    } else {
      const sw = Math.sin(walkP) * 4;
      hands = [[-16 - (s.moving ? 0 : 0), tY + 25 + sw], [16, tY + 25 - sw]];
    }
    if (pose === 'sleep') {
      A.capsule(ctx, -13, sh + 4, hands[0][0], hands[0][1], 6, top);
      A.capsule(ctx, 13, sh + 4, hands[1][0], hands[1][1], 6, top);
      A.capsule(ctx, -14, -16, 14, -16, 7, top);
    }

    // head
    if (pose === 'sleep') {
      ctx.save();
      ctx.translate(0, headY);
      ctx.rotate(0.35);
      drawHead(ctx, L, 0, 0, 'up', dir, t, 'sleep', hs, seed);
      ctx.restore();
    } else {
      drawHead(ctx, L, 0, headY, face, dir, t, s.emo, hs, seed);
    }

    if (pose !== 'sleep') {
      const armCol = top;
      if (face === 'up' && !carrying) {
        A.capsule(ctx, -12, sh, hands[0][0], hands[0][1], 6, armCol);
        A.capsule(ctx, 12, sh, hands[1][0], hands[1][1], 6, armCol);
      } else {
        A.capsule(ctx, -12, sh, hands[0][0], hands[0][1], 6, armCol);
        A.capsule(ctx, 12, sh, hands[1][0], hands[1][1], 6, armCol);
      }
      for (const h of hands) {
        A.el(ctx, h[0], h[1], 3.8, 3.8, seed + h[0], 0.3, 7);
        A.fs(ctx, skin, 2.2);
      }
    }
    if (pose === 'scroll') {
      A.rr(ctx, -5, tY + 6, 10, 14, 2, seed + 70, 0.4);
      A.fs(ctx, '#2a2a3a', 2);
      ctx.fillStyle = '#9fe0ff';
      ctx.fillRect(-3, tY + 8, 6, 9);
    }
    if (pose === 'shh' && face !== 'up') {
      // finger to lips
      ctx.fillStyle = skin;
      ctx.strokeStyle = A.INK;
      ctx.lineWidth = 1.8;
      A.rr(ctx, 0, headY + 4, 4, 9, 2, seed + 80, 0.2);
      A.fs(ctx, skin, 1.8);
    }
    if (s.hold && MB.A.item) MB.A.item(ctx, s.hold, carrying ? 0 : 0, carrying ? -84 : tY + 18, t, s);
    ctx.restore();
  };

  function backHair(ctx, L, x, y, face, dir, t, hs) {
    const col = L.hair || '#2b1d1a';
    const st = L.hairStyle;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(hs, hs);
    const sx = face === 'side' ? -dir * 3 : 0;
    if (st === 'long') {
      A.rr(ctx, -19 + sx, -12, 38, 36, 12, (L.seed || 1) + 50);
      A.fs(ctx, col, 2.6);
    } else if (st === 'afro') {
      A.blob(ctx, sx, -4, 24, 22, (L.seed || 1) + 51, 0.08, 12);
      A.fs(ctx, col, 2.6);
    } else if (st === 'curly') {
      A.blob(ctx, sx, -4, 21, 19, (L.seed || 1) + 52, 0.12, 11);
      A.fs(ctx, col, 2.6);
    } else if (st === 'ponytail') {
      const sw = Math.sin(t * 5) * 3;
      const px = face === 'side' ? -dir * 16 : 13;
      A.el(ctx, px + sw, 6, 6, 13, (L.seed || 1) + 53);
      A.fs(ctx, col, 2.6);
    } else if (st === 'bob') {
      A.rr(ctx, -19 + sx, -14, 38, 30, 12, (L.seed || 1) + 54);
      A.fs(ctx, col, 2.6);
    } else if (st === 'bunny') {
      for (const s of [-1, 1]) {
        A.el(ctx, s * 8, -26, 5, 13, (L.seed || 1) + 55 + s);
        A.fs(ctx, L.hair2 || '#f4e9dc', 2.4);
        A.el(ctx, s * 8, -25, 2.2, 8, (L.seed || 1) + 57 + s);
        A.fs(ctx, '#f3a6b9', 0);
      }
    }
    ctx.restore();
  }

  function drawHead(ctx, L, x, y, face, dir, t, emo, hs, seed) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(hs, hs);
    const skin = L.skin || '#e8b48e';
    const r = 16;
    // head
    A.shape(ctx, () => A.el(ctx, 0, 0, r, r - 1, seed + 30, 0.7, 11), skin, (c) => {
      c.fillStyle = A.shade(skin, -0.2);
      c.beginPath();
      c.ellipse(face === 'side' ? -dir * 10 : 9, 6, 12, 13, 0.4, 0, U.TAU);
      c.fill();
    });
    const fx = face === 'side' ? dir * 5 : 0;
    if (face === 'up') {
      // back of head: hair covers
      if (L.hairStyle !== 'buzz' && L.hairStyle !== 'bald') {
        A.el(ctx, 0, -2, r + 1.5, r - 1, seed + 31, 0.6, 11);
        A.fs(ctx, L.hair || '#2b1d1a', 2.6);
      } else {
        A.el(ctx, 0, -4, r, r - 4, seed + 31, 0.6, 11);
        A.fs(ctx, L.hair || '#2b1d1a', 2.6);
      }
      frontHat(ctx, L, face, dir, t, seed);
      ctx.restore();
      return;
    }
    // face features
    drawFace(ctx, fx, emo, L, t, face, dir);
    frontHair(ctx, L, face, dir, t, seed);
    frontHat(ctx, L, face, dir, t, seed);
    // accessories
    if (L.acc === 'glasses' || L.acc === 'glasses2') {
      ctx.strokeStyle = A.INK;
      ctx.lineWidth = 1.8;
      ctx.fillStyle = 'rgba(200,230,255,0.25)';
      for (const ex of [-5.5, 5.5]) {
        ctx.beginPath();
        if (L.acc === 'glasses2') ctx.rect(fx + ex - 5, -6, 10, 8);
        else ctx.arc(fx + ex, -2, 5, 0, U.TAU);
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(fx - 0.8, -3);
      ctx.lineTo(fx + 0.8, -3);
      ctx.stroke();
    }
    if (L.acc === 'headphones') {
      ctx.strokeStyle = A.INK;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, -2, 19, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      ctx.strokeStyle = L.accCol || '#ef7fa6';
      ctx.lineWidth = 3;
      ctx.stroke();
      for (const s of [-1, 1]) {
        A.rr(ctx, s * 18 - 4, -6, 8, 13, 3, seed + 90 + s, 0.4);
        A.fs(ctx, L.accCol || '#ef7fa6', 2.2);
      }
    }
    ctx.restore();
  }

  function drawFace(ctx, fx, emo, L, t, face, dir) {
    const ey = -1;
    const ink = A.INK;
    const blink = (Math.sin(t * 1.3 + (L.seed || 0)) > 0.985);
    ctx.fillStyle = ink;
    ctx.strokeStyle = ink;
    ctx.lineCap = 'round';
    const eyes = face === 'side' ? [fx + dir * 2] : [fx - 5.5, fx + 5.5];
    // cheeks
    ctx.fillStyle = emo === 'blush' ? 'rgba(240,90,110,0.65)' : 'rgba(240,120,130,0.38)';
    for (const ex of face === 'side' ? [fx + dir * 1] : [fx - 9.5, fx + 9.5]) {
      ctx.beginPath();
      ctx.ellipse(ex, ey + 5.5, emo === 'blush' ? 4.5 : 3.5, 2.2, 0, 0, U.TAU);
      ctx.fill();
    }
    ctx.fillStyle = ink;
    ctx.lineWidth = 2;
    const mouthY = ey + 8;
    switch (emo) {
      case 'happy':
        for (const ex of eyes) {
          ctx.beginPath();
          ctx.arc(ex, ey + 1, 3, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(fx - 4.5, mouthY - 1);
        ctx.quadraticCurveTo(fx, mouthY + 7, fx + 4.5, mouthY - 1);
        ctx.closePath();
        ctx.fillStyle = '#8a2b3a';
        ctx.fill();
        ctx.stroke();
        break;
      case 'focus':
        for (const ex of eyes) {
          ctx.beginPath();
          ctx.ellipse(ex, ey + 0.5, 2.1, 2.4, 0, 0, U.TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(ex - 3.5, ey - 5 + (ex < fx ? -1 : 1));
          ctx.lineTo(ex + 3.5, ey - 5 + (ex < fx ? 1 : -1));
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(fx - 2.5, mouthY);
        ctx.lineTo(fx + 2.5, mouthY);
        ctx.stroke();
        break;
      case 'stress':
        for (const ex of eyes) {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(ex, ey, 3.3, 0, U.TAU);
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = ink;
          ctx.beginPath();
          ctx.arc(ex + Math.sin(t * 20) * 0.6, ey, 1.3, 0, U.TAU);
          ctx.fill();
        }
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(fx - 4, mouthY);
        for (let i = 1; i <= 4; i++) ctx.lineTo(fx - 4 + i * 2, mouthY + (i % 2 ? -1.6 : 0.6));
        ctx.stroke();
        // sweat
        ctx.fillStyle = '#9fd8ff';
        ctx.beginPath();
        ctx.moveTo(fx + 13, ey - 10);
        ctx.quadraticCurveTo(fx + 17, ey - 3, fx + 13, ey - 2);
        ctx.quadraticCurveTo(fx + 9, ey - 3, fx + 13, ey - 10);
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.stroke();
        break;
      case 'shock':
        for (const ex of eyes) {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(ex, ey - 1, 4, 0, U.TAU);
          ctx.fill();
          ctx.lineWidth = 1.6;
          ctx.stroke();
          ctx.fillStyle = ink;
          ctx.beginPath();
          ctx.arc(ex, ey - 1, 1.6, 0, U.TAU);
          ctx.fill();
        }
        ctx.fillStyle = '#8a2b3a';
        ctx.beginPath();
        ctx.ellipse(fx, mouthY + 1, 2.6, 3.4, 0, 0, U.TAU);
        ctx.fill();
        ctx.stroke();
        break;
      case 'sleep':
        for (const ex of eyes) {
          ctx.beginPath();
          ctx.arc(ex, ey - 1, 2.6, Math.PI * 0.15, Math.PI * 0.85);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(fx, mouthY + 1, 1.6, 0, U.TAU);
        ctx.stroke();
        break;
      case 'sad':
      case 'angry':
        for (const ex of eyes) {
          ctx.beginPath();
          ctx.ellipse(ex, ey, 2.2, 2.9, 0, 0, U.TAU);
          ctx.fill();
          const inward = ex < fx ? 1 : -1;
          const up = emo === 'sad' ? -1 : 1;
          ctx.beginPath();
          ctx.moveTo(ex - 3.2 * inward, ey - 5);
          ctx.lineTo(ex + 3.2 * inward, ey - 5 + 2 * up);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(fx, mouthY + 3, 3.2, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        break;
      case 'blush':
        for (const ex of eyes) {
          ctx.beginPath();
          ctx.moveTo(ex - 3, ey + 1);
          ctx.lineTo(ex, ey - 2);
          ctx.lineTo(ex + 3, ey + 1);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(fx - 3, mouthY);
        ctx.quadraticCurveTo(fx - 1.5, mouthY - 2, fx, mouthY);
        ctx.quadraticCurveTo(fx + 1.5, mouthY + 2, fx + 3, mouthY);
        ctx.stroke();
        break;
      case 'scroll':
        for (const ex of eyes) {
          ctx.beginPath();
          ctx.ellipse(ex, ey + 2.5, 2.2, 1.6, 0, 0, U.TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(ex - 3, ey);
          ctx.lineTo(ex + 3, ey);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(fx, mouthY + 1, 1.8, 0, Math.PI);
        ctx.stroke();
        break;
      default:
        for (const ex of eyes) {
          if (blink) {
            ctx.beginPath();
            ctx.moveTo(ex - 2.5, ey);
            ctx.lineTo(ex + 2.5, ey);
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.ellipse(ex, ey, 2.3, 3.1, 0, 0, U.TAU);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ex + 0.8, ey - 1.2, 0.9, 0, U.TAU);
            ctx.fill();
            ctx.fillStyle = ink;
          }
        }
        ctx.beginPath();
        ctx.arc(fx, mouthY - 1.5, 2.8, Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke();
    }
  }

  function frontHair(ctx, L, face, dir, t, seed) {
    const col = L.hair || '#2b1d1a';
    const st = L.hairStyle || 'short';
    if (st === 'bald' || st === 'beanie' || st === 'dino' || st === 'cap') return;
    const r = 17;
    const sx = face === 'side' ? -dir * 2 : 0;
    const pts = [];
    if (st === 'curly' || st === 'afro') {
      const n = 7;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (1.05 + (i / (n - 1)) * 0.9);
        const rr = st === 'afro' ? 7.5 : 6.2;
        A.el(ctx, sx + Math.cos(a) * (r - 3), -2 + Math.sin(a) * (r - 4), rr, rr, seed + 100 + i, 0.4, 7);
        A.fs(ctx, col, 2.2);
      }
      return;
    }
    // arc across the top
    const steps = 9;
    for (let i = 0; i <= steps; i++) {
      const a = Math.PI * (0.95 + (i / steps) * 1.1);
      pts.push([sx + Math.cos(a) * r, -1 + Math.sin(a) * (r - 0.5)]);
    }
    // fringe back across forehead (right to left)
    if (st === 'spiky') {
      const fr = [[14, -6], [9, -11], [5, -5], [0, -12], [-5, -5], [-9, -11], [-14, -6]];
      fr.forEach((p) => pts.push([p[0] + sx, p[1]]));
      // spikes on top
      const top = [];
      A.poly(ctx, [[-14 + sx, -10], [-12 + sx, -24], [-6 + sx, -15], [-2 + sx, -27], [3 + sx, -16], [9 + sx, -26], [12 + sx, -14], [15 + sx, -8]], seed + 120, 0.5, true);
      A.fs(ctx, col, 2.4);
    } else if (st === 'buzz') {
      pts.push([13 + sx, -9], [0 + sx, -12], [-13 + sx, -9]);
    } else if (st === 'ponytail' || st === 'bun') {
      pts.push([12 + sx, -8], [0 + sx, -13], [-12 + sx, -8]);
    } else if (st === 'long' || st === 'bob') {
      pts.push([16 + sx, 4], [12 + sx, -8], [3 + sx, -10], [-2 + sx, -6], [-12 + sx, -9], [-16 + sx, 4]);
    } else {
      // short side-swept
      pts.push([14 + sx, -4], [8 + sx, -6], [2 + sx, -9], [-6 + sx, -5], [-14 + sx, -2]);
    }
    const jp = pts.map((p, i) => [p[0] + A.j(seed + 140 + i, 0.5), p[1] + A.j(seed + 160 + i, 0.5)]);
    A.smoothPath(ctx, jp, true);
    A.fs(ctx, col, 2.4);
    // shine
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx - 3, -4, 11, Math.PI * 1.25, Math.PI * 1.5);
    ctx.stroke();
    if (st === 'bun') {
      A.el(ctx, sx, -19, 8, 7, seed + 170, 0.5, 8);
      A.fs(ctx, col, 2.4);
    }
  }

  function frontHat(ctx, L, face, dir, t, seed) {
    const st = L.hairStyle;
    const sx = face === 'side' ? -dir * 2 : 0;
    if (st === 'beanie') {
      const col = L.hair2 || '#e0524a';
      A.shape(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(-17 + sx, -3);
        ctx.quadraticCurveTo(-17 + sx, -22, sx, -22 + A.j(seed, 0.6));
        ctx.quadraticCurveTo(17 + sx, -22, 17 + sx, -3);
        ctx.closePath();
      }, col, (c) => {
        c.fillStyle = A.shade(col, -0.2);
        c.fillRect(-20, -9, 40, 7);
      }, 2.4);
      A.el(ctx, sx, -24, 5, 5, seed + 3, 0.5, 7);
      A.fs(ctx, A.shade(col, 0.4), 2.2);
    } else if (st === 'cap') {
      const col = L.hair2 || '#2f5d8a';
      A.shape(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(-16 + sx, -4);
        ctx.quadraticCurveTo(-16 + sx, -20, sx, -20);
        ctx.quadraticCurveTo(16 + sx, -20, 16 + sx, -4);
        ctx.closePath();
      }, col, null, 2.4);
      if (face !== 'up') {
        A.el(ctx, sx + (face === 'side' ? dir * 10 : 0), -4, face === 'side' ? 11 : 15, 4, seed + 4, 0.4, 8);
        A.fs(ctx, A.shade(col, -0.2), 2.2);
      }
    } else if (st === 'dino') {
      const col = L.hair2 || '#6cbf6a';
      A.shape(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(-18 + sx, 6);
        ctx.quadraticCurveTo(-19 + sx, -22, sx, -21);
        ctx.quadraticCurveTo(19 + sx, -22, 18 + sx, 6);
        ctx.quadraticCurveTo(12 + sx, -6, sx, -7);
        ctx.quadraticCurveTo(-12 + sx, -6, -18 + sx, 6);
        ctx.closePath();
      }, col, null, 2.4);
      // spikes
      for (let i = 0; i < 3; i++) {
        A.poly(ctx, [[-9 + i * 9 + sx, -19], [-5 + i * 9 + sx, -28], [-1 + i * 9 + sx, -19]], seed + i * 5, 0.4, false);
        A.fs(ctx, '#f6c945', 2);
      }
      ctx.fillStyle = '#fff';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * 8 + sx, -7);
        ctx.lineTo(s * 6 + sx, -3);
        ctx.lineTo(s * 4 + sx, -7);
        ctx.fill();
      }
    } else if (st === 'witch') {
      const col = '#3a2a4a';
      A.el(ctx, sx, -12, 24, 5, seed + 5, 0.6, 9);
      A.fs(ctx, col, 2.4);
      A.poly(ctx, [[-12 + sx, -14], [sx + 6, -46], [12 + sx, -14]], seed + 6, 0.8);
      A.fs(ctx, col, 2.4);
      ctx.fillStyle = '#f08a3c';
      ctx.fillRect(-11 + sx, -20, 22, 4);
    }
  }

  // --- held items / props ---------------------------------------------------
  A.item = function (ctx, kind, x, y, t, s) {
    ctx.save();
    ctx.translate(x, y);
    switch (kind) {
      case 'coffee': A.coffee(ctx, 0, 6, t); break;
      case 'bucket': A.bucket(ctx, 0, 12, 0.8); break;
      case 'pizza': A.pizzaBox(ctx, 0, 8, s && s.slices != null ? s.slices : 4); break;
      case 'toddler': if (s && s.toddler) A.person(ctx, 0, 22, s.toddler, { pose: 'cheer', t: t * 1.6, emo: 'happy', scale: 0.55, noShadow: true }); break;
      case 'usb': A.usb(ctx, 0, 0); break;
    }
    ctx.restore();
  };

  A.coffee = function (ctx, x, y, t) {
    A.poly(ctx, [[x - 7, y - 16], [x + 7, y - 16], [x + 5, y], [x - 5, y]], 301, 0.4);
    A.fs(ctx, '#fff6e6', 2.2);
    ctx.fillStyle = '#b8743c';
    ctx.fillRect(x - 6.5, y - 11, 12.5, 6);
    A.rr(ctx, x - 8.5, y - 20, 17, 5, 2, 302, 0.3);
    A.fs(ctx, '#5a3a2a', 2);
    if (t != null) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        const yy = y - 24 - ((t * 20 + i * 8) % 16);
        ctx.moveTo(x - 2 + i * 4, yy + 8);
        ctx.quadraticCurveTo(x + 3 + i * 4 + Math.sin(t * 4 + i) * 3, yy + 4, x - 1 + i * 4, yy);
        ctx.stroke();
      }
    }
  };
  A.bucket = function (ctx, x, y, s = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = A.INK;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, -16, 11, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    A.poly(ctx, [[-12, -16], [12, -16], [9, 2], [-9, 2]], 310, 0.5);
    A.fs(ctx, '#f6c945', 2.6);
    ctx.fillStyle = 'rgba(160,90,20,0.3)';
    ctx.fillRect(2, -14, 7, 15);
    A.el(ctx, 0, -16, 12, 4, 311, 0.4, 8);
    A.fs(ctx, '#7a5a20', 2.2);
    ctx.restore();
  };
  A.pizzaBox = function (ctx, x, y, slices) {
    A.rr(ctx, x - 20, y - 12, 40, 14, 3, 320, 0.5);
    A.fs(ctx, '#e8c9a0', 2.4);
    ctx.fillStyle = 'rgba(160,90,40,0.35)';
    ctx.beginPath();
    ctx.ellipse(x + 8, y - 6, 4, 2.5, 0, 0, U.TAU);
    ctx.fill();
    ctx.fillStyle = '#c94f3d';
    ctx.font = `10px ${A.F.display}`;
    ctx.textAlign = 'center';
    ctx.fillText('PIZZA', x - 4, y - 4);
    if (slices != null) {
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i < slices ? '#f6c945' : 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.arc(x - 9 + i * 6, y - 17, 2.4, 0, U.TAU);
        ctx.fill();
      }
    }
  };
  A.usb = function (ctx, x, y) {
    A.rr(ctx, x - 4, y - 8, 8, 13, 2, 330, 0.3);
    A.fs(ctx, '#4a7fd1', 2);
    ctx.fillStyle = '#ccc';
    ctx.fillRect(x - 2.5, y - 12, 5, 4);
  };
  A.phone = function (ctx, x, y, lit, t) {
    ctx.save();
    ctx.translate(x + (lit ? Math.sin(t * 60) * 1.3 : 0), y);
    ctx.rotate(-0.2);
    A.rr(ctx, -5, -8, 10, 16, 2.5, 340, 0.3);
    A.fs(ctx, '#2a2433', 2);
    ctx.fillStyle = lit ? '#bdf0ff' : '#3d4a5c';
    ctx.fillRect(-3.3, -6, 6.6, 12);
    if (lit) {
      ctx.fillStyle = '#ef7fa6';
      ctx.fillRect(-2.5, -4.5, 5, 2);
      ctx.fillStyle = '#6cbf6a';
      ctx.fillRect(-2.5, -1, 4, 2);
    }
    ctx.restore();
  };
  A.laptop = function (ctx, x, y, col, sticker, screenCol) {
    // lid seen from behind, standing on the table at (x, y)
    A.rr(ctx, x - 19, y - 2, 38, 5, 2, x + 400, 0.3);
    A.fs(ctx, A.shade(col, -0.25), 2);
    A.shape(ctx, () => A.rr(ctx, x - 17, y - 25, 34, 24, 3.5, x + 401, 0.5), col, (c) => {
      c.fillStyle = A.shade(col, -0.15);
      c.fillRect(x - 20, y - 8, 40, 10);
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.fillRect(x - 14, y - 23, 3, 18);
    }, 2.4);
    if (screenCol) {
      ctx.strokeStyle = screenCol;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 16, y - 25.5);
      ctx.lineTo(x + 16, y - 25.5);
      ctx.stroke();
    }
    // stickers
    const s = sticker || 0;
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = A.INK;
    if (s % 3 === 0) {
      ctx.fillStyle = '#f6c945';
      star(ctx, x + 7, y - 16, 5, 2.3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ef7fa6';
      ctx.beginPath();
      ctx.arc(x - 6, y - 9, 3.5, 0, U.TAU);
      ctx.fill();
      ctx.stroke();
    } else if (s % 3 === 1) {
      ctx.fillStyle = '#6cbf6a';
      ctx.beginPath();
      ctx.ellipse(x - 5, y - 15, 5, 3.5, -0.3, 0, U.TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 2, y - 11, 10, 6);
      ctx.strokeRect(x + 2, y - 11, 10, 6);
    } else {
      ctx.fillStyle = '#e0524a';
      heart(ctx, x + 6, y - 14, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#8fd3f4';
      ctx.beginPath();
      ctx.arc(x - 7, y - 12, 3, 0, U.TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  };
  function star(ctx, x, y, r1, r2) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? r2 : r1;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  }
  function heart(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s);
    ctx.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.6, y - s * 1.4, x, y - s * 0.4);
    ctx.bezierCurveTo(x + s * 0.6, y - s * 1.4, x + s * 1.6, y - s * 0.2, x, y + s);
    ctx.closePath();
  }
  A.star = star;
  A.heart = heart;

  A.lamp = function (ctx, x, y, on, seed = 0) {
    // banker's lamp standing on table top at (x, y)
    A.el(ctx, x, y, 10, 3.5, seed + 1, 0.4, 8);
    A.fs(ctx, A.C.brass, 2);
    ctx.strokeStyle = A.INK;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 20);
    ctx.stroke();
    ctx.strokeStyle = A.C.brass;
    ctx.lineWidth = 2;
    ctx.stroke();
    A.shape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(x - 17, y - 18 + A.j(seed + 3, 0.5));
      ctx.quadraticCurveTo(x - 15, y - 31, x, y - 31);
      ctx.quadraticCurveTo(x + 15, y - 31, x + 17, y - 18);
      ctx.closePath();
    }, A.C.lampGreen, (c) => {
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.fillRect(x - 10, y - 30, 4, 12);
      c.fillStyle = A.shade(A.C.lampGreen, -0.3);
      c.fillRect(x + 6, y - 32, 14, 16);
    }, 2.4);
    if (on) {
      ctx.fillStyle = '#fff2b8';
      ctx.beginPath();
      ctx.ellipse(x, y - 18, 14, 2.5, 0, 0, U.TAU);
      ctx.fill();
    }
  };

  A.bookPile = function (ctx, x, y, n, seed) {
    for (let i = 0; i < n; i++) {
      const w = 22 + U.hash(seed + i) * 10;
      const col = A.C.books[Math.floor(U.hash(seed + i * 3) * A.C.books.length)];
      const ox = (U.hash(seed + i * 7) - 0.5) * 10;
      const rot = (U.hash(seed + i * 5) - 0.5) * 0.5;
      ctx.save();
      ctx.translate(x + ox, y - i * 6);
      ctx.rotate(rot);
      A.rr(ctx, -w / 2, -6, w, 7, 1.5, seed + i * 11, 0.4);
      A.fs(ctx, col, 2);
      ctx.fillStyle = '#fbf3e4';
      ctx.fillRect(-w / 2 + 2, -1.5, w - 4, 1.5);
      ctx.restore();
    }
  };

  // --- critters & machines ---------------------------------------------------
  A.pigeon = function (ctx, x, y, t, dir, flying, bat) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    const flap = flying ? Math.sin(t * 30) : 0;
    if (bat) {
      const wc = '#3a2747';
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.scale(s, 1);
        ctx.rotate(-flap * 0.5);
        A.poly(ctx, [[2, -4], [22, -14 - flap * 6], [18, -6], [24, -2], [16, 0], [14, 4], [4, 2]], 500 + s, 0.6);
        A.fs(ctx, wc, 2.2);
        ctx.restore();
      }
      A.el(ctx, 0, 0, 8, 8, 503, 0.5, 8);
      A.fs(ctx, '#4a3358', 2.4);
      A.poly(ctx, [[-6, -5], [-4, -13], [-1, -6]], 504, 0.3);
      A.fs(ctx, '#4a3358', 2);
      A.poly(ctx, [[6, -5], [4, -13], [1, -6]], 505, 0.3);
      A.fs(ctx, '#4a3358', 2);
      ctx.fillStyle = '#f6c945';
      ctx.beginPath();
      ctx.arc(-3, -1, 1.8, 0, U.TAU);
      ctx.arc(3, -1, 1.8, 0, U.TAU);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-2, 3);
      ctx.lineTo(-1, 6);
      ctx.lineTo(0, 3);
      ctx.fill();
      ctx.restore();
      return;
    }
    // back wing
    if (flying) {
      ctx.save();
      ctx.rotate(-0.4 - flap * 0.8);
      A.el(ctx, -4, -10, 6, 14, 510, 0.6, 9);
      A.fs(ctx, '#8d9ab5', 2.2);
      ctx.restore();
    }
    // tail
    A.poly(ctx, [[-10, 0], [-20, -3], [-20, 4]], 511, 0.4);
    A.fs(ctx, '#6c7896', 2.2);
    // body
    A.shape(ctx, () => A.el(ctx, 0, 0, 13, 9, 512, 0.6, 10), '#a6b2c9', (c) => {
      c.fillStyle = '#7d89a6';
      c.fillRect(-14, 3, 28, 8);
    }, 2.4);
    // neck sheen
    ctx.fillStyle = '#5fb39a';
    ctx.beginPath();
    ctx.ellipse(8, -4, 4.5, 5, 0.4, 0, U.TAU);
    ctx.fill();
    ctx.fillStyle = '#9a6bc0';
    ctx.beginPath();
    ctx.ellipse(9, -2, 3, 3, 0.4, 0, U.TAU);
    ctx.fill();
    // head
    const peck = !flying ? Math.max(0, Math.sin(t * 9)) * 4 : 0;
    A.el(ctx, 12, -8 + peck, 6, 6, 513, 0.4, 8);
    A.fs(ctx, '#8d9ab5', 2.2);
    ctx.fillStyle = '#f08a3c';
    ctx.beginPath();
    ctx.arc(14, -9 + peck, 1.8, 0, U.TAU);
    ctx.fill();
    ctx.fillStyle = A.INK;
    ctx.beginPath();
    ctx.arc(14.3, -9 + peck, 0.9, 0, U.TAU);
    ctx.fill();
    A.poly(ctx, [[17, -8 + peck], [22, -6 + peck], [17, -5 + peck]], 514, 0.2);
    A.fs(ctx, '#e8c26a', 1.6);
    // front wing
    if (flying) {
      ctx.save();
      ctx.rotate(-0.2 + flap * 0.9);
      A.el(ctx, 0, -10, 7, 15, 515, 0.6, 9);
      A.fs(ctx, '#b9c3d8', 2.2);
      ctx.restore();
    } else {
      A.el(ctx, -2, -1, 9, 5, 516, 0.4, 8);
      A.fs(ctx, '#8d9ab5', 2);
      // legs
      ctx.strokeStyle = '#e0726a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-2, 8);
      ctx.lineTo(-3, 13);
      ctx.moveTo(3, 8);
      ctx.lineTo(3, 13);
      ctx.stroke();
    }
    ctx.restore();
  };

  A.raccoon = function (ctx, x, y, t, dir, hasUsb, running) {
    ctx.save();
    ctx.translate(x, y);
    A.shadow(ctx, 0, 0, 18, 5);
    ctx.scale(dir, 1);
    const b = running ? Math.abs(Math.sin(t * 18)) * 3 : 0;
    ctx.translate(0, -b);
    // tail
    const tw = Math.sin(t * (running ? 16 : 4)) * 0.3;
    ctx.save();
    ctx.translate(-12, -10);
    ctx.rotate(-0.5 + tw);
    A.shape(ctx, () => A.el(ctx, -12, 0, 13, 6, 520, 0.5, 9), '#8f8a96', (c) => {
      c.fillStyle = '#3e3647';
      for (let i = 0; i < 3; i++) c.fillRect(-22 + i * 7, -8, 3.5, 16);
    }, 2.3);
    ctx.restore();
    // legs
    ctx.fillStyle = '#3e3647';
    const lp = running ? Math.sin(t * 18) * 3 : 0;
    A.rr(ctx, -9 + lp, -6, 5, 7, 2, 521, 0.3);
    A.fs(ctx, '#3e3647', 2);
    A.rr(ctx, 6 - lp, -6, 5, 7, 2, 522, 0.3);
    A.fs(ctx, '#3e3647', 2);
    // body
    A.shape(ctx, () => A.el(ctx, 0, -12, 16, 10, 523, 0.6, 10), '#a39fae', (c) => {
      c.fillStyle = '#7f7a8c';
      c.fillRect(-17, -8, 34, 10);
    }, 2.5);
    // head
    ctx.translate(14, -18);
    A.poly(ctx, [[-6, -6], [-3, -14], [1, -6]], 524, 0.3);
    A.fs(ctx, '#a39fae', 2);
    A.poly(ctx, [[2, -6], [6, -13], [8, -4]], 525, 0.3);
    A.fs(ctx, '#a39fae', 2);
    A.el(ctx, 0, 0, 10, 8.5, 526, 0.5, 9);
    A.fs(ctx, '#c4c0cc', 2.4);
    // mask
    ctx.fillStyle = '#2e2836';
    ctx.beginPath();
    ctx.ellipse(0, -1, 9, 3.6, 0, 0, U.TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-3.5, -1.5, 1.8, 0, U.TAU);
    ctx.arc(3.5, -1.5, 1.8, 0, U.TAU);
    ctx.fill();
    ctx.fillStyle = A.INK;
    ctx.beginPath();
    ctx.arc(-3.2, -1.3, 1, 0, U.TAU);
    ctx.arc(3.8, -1.3, 1, 0, U.TAU);
    ctx.fill();
    // snout
    A.el(ctx, 8, 3, 4.5, 3.5, 527, 0.3, 7);
    A.fs(ctx, '#ece8ef', 1.8);
    ctx.fillStyle = A.INK;
    ctx.beginPath();
    ctx.arc(11.5, 2.5, 1.6, 0, U.TAU);
    ctx.fill();
    if (hasUsb) {
      ctx.save();
      ctx.translate(9, 8);
      ctx.rotate(0.5);
      A.usb(ctx, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  };

  A.roomba = function (ctx, x, y, t, flipped, angle, angry) {
    ctx.save();
    ctx.translate(x, y);
    A.shadow(ctx, 0, 3, 22, 8);
    if (flipped) {
      A.el(ctx, 0, -6, 21, 13, 540, 0.6, 12);
      A.fs(ctx, '#5c5866', 2.6);
      ctx.fillStyle = '#3a3642';
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * 10, -6);
        A.rr(ctx, -3, -5, 6, 10, 2, 541 + s, 0.3);
        A.fs(ctx, '#2b2733', 2);
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1.2;
        const sp = (t * 30) % 10;
        ctx.beginPath();
        ctx.moveTo(-3, -5 + sp);
        ctx.lineTo(3, -5 + sp);
        ctx.stroke();
        ctx.restore();
      }
      // brush spinning
      ctx.save();
      ctx.translate(0, -1);
      ctx.rotate(t * 12);
      ctx.strokeStyle = '#f6c945';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.rotate(U.TAU / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(7, 0);
        ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
      return;
    }
    A.rr(ctx, -21, -10, 42, 12, 6, 542, 0.5);
    A.fs(ctx, '#3c3946', 2.6);
    A.shape(ctx, () => A.el(ctx, 0, -10, 21, 12, 543, 0.6, 12), '#d8d4de', (c) => {
      c.fillStyle = '#b4afbe';
      c.fillRect(-22, -6, 44, 10);
    }, 2.6);
    A.el(ctx, 0, -11, 11, 6, 544, 0.4, 9);
    A.fs(ctx, '#86819a', 2);
    // bumper in movement direction
    const bx = Math.cos(angle), by = Math.sin(angle);
    ctx.strokeStyle = '#2b2733';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, -9, 20, 11.5, 0, angle - 0.8, angle + 0.8);
    ctx.stroke();
    // angry eyes sticker
    if (angry) {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = A.INK;
      ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(s * 5 + bx * 4, -12 + by * 2, 3.2, 0, U.TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = A.INK;
        ctx.beginPath();
        ctx.arc(s * 5 + bx * 5, -12 + by * 2.5, 1.4, 0, U.TAU);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(s * 9 + bx * 4, -17);
        ctx.lineTo(s * 1 + bx * 4, -14);
        ctx.stroke();
      }
    }
    // LED
    ctx.fillStyle = Math.sin(t * 16) > 0 ? '#ff4d4d' : '#7a2020';
    ctx.beginPath();
    ctx.arc(0, -17, 2.2, 0, U.TAU);
    ctx.fill();
    ctx.restore();
  };

  A.ghost = function (ctx, x, y, t, alpha = 0.85, scared) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 2.5) * 5);
    ctx.globalAlpha *= alpha;
    // body sheet
    const wav = (i) => Math.sin(t * 6 + i) * 3;
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.quadraticCurveTo(-24, -46, 0, -48);
    ctx.quadraticCurveTo(24, -46, 22, 0);
    for (let i = 0; i < 4; i++) {
      const x0 = 22 - (i + 0.5) * 11, x1 = 22 - (i + 1) * 11;
      ctx.quadraticCurveTo(x0, 10 + wav(i), x1, 2);
    }
    ctx.closePath();
    ctx.fillStyle = '#f2ecff';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#c9bdf0';
    ctx.fillRect(6, -50, 24, 70);
    ctx.restore();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = A.INK;
    ctx.stroke();
    // reading glasses + face
    ctx.fillStyle = A.INK;
    const ey = -28;
    if (scared) {
      ctx.beginPath();
      ctx.arc(-7, ey, 4, 0, U.TAU);
      ctx.arc(7, ey, 4, 0, U.TAU);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(-7, ey, 3, 4.5, 0, 0, U.TAU);
      ctx.ellipse(7, ey, 3, 4.5, 0, 0, U.TAU);
      ctx.fill();
    }
    ctx.strokeStyle = A.INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(-7, ey, 6, 0, U.TAU);
    ctx.moveTo(13, ey);
    ctx.arc(7, ey, 6, 0, U.TAU);
    ctx.moveTo(-1, ey);
    ctx.lineTo(1, ey);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -15, 4, 5, 0, 0, U.TAU);
    ctx.fill();
    // tiny book
    ctx.save();
    ctx.translate(-18, -8);
    ctx.rotate(-0.3);
    A.rr(ctx, -8, -6, 16, 11, 2, 560, 0.4);
    A.fs(ctx, '#7b4a8c', 2);
    ctx.restore();
    ctx.restore();
  };

  // --- HUD icons --------------------------------------------------------------
  A.icon = function (ctx, name, x, y, r = 14, bg = '#fffaf0') {
    ctx.save();
    ctx.translate(x, y);
    if (bg) {
      A.el(ctx, 0, 0, r, r, 600 + x * 0.01, 0.5, 10);
      A.fs(ctx, bg, 2.5);
    }
    const s = r / 14;
    ctx.scale(s, s);
    ctx.lineWidth = 2;
    ctx.strokeStyle = A.INK;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const C = A.C;
    switch (name) {
      case 'phone':
        A.rr(ctx, -5, -8, 10, 16, 2.5, 1, 0.2);
        A.fs(ctx, '#2a2433', 2);
        ctx.fillStyle = '#9fe0ff';
        ctx.fillRect(-3, -6, 6, 11);
        ctx.strokeStyle = C.red;
        ctx.beginPath();
        ctx.arc(0, 0, 10, -0.6, 0.6);
        ctx.stroke();
        break;
      case 'talk':
        A.rr(ctx, -9, -8, 18, 12, 4, 2, 0.2);
        A.fs(ctx, C.orange, 2);
        ctx.beginPath();
        ctx.moveTo(-4, 4);
        ctx.lineTo(-6, 9);
        ctx.lineTo(1, 4);
        ctx.fillStyle = C.orange;
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = `bold 10px ${A.F.display}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!!', 0, -2);
        break;
      case 'roomba':
        A.el(ctx, 0, 1, 10, 7, 3, 0.2, 10);
        A.fs(ctx, '#d8d4de', 2);
        ctx.fillStyle = C.red;
        ctx.beginPath();
        ctx.arc(0, -1, 2.4, 0, U.TAU);
        ctx.fill();
        break;
      case 'books':
        ctx.scale(0.62, 0.62);
        A.bookPile(ctx, 0, 10, 3, 7);
        break;
      case 'printer':
        A.rr(ctx, -9, -4, 18, 10, 2, 4, 0.2);
        A.fs(ctx, '#d9d2c3', 2);
        A.rr(ctx, -6, -10, 12, 7, 1, 5, 0.2);
        A.fs(ctx, '#fff', 2);
        ctx.fillStyle = C.red;
        ctx.fillRect(4, 0, 3, 3);
        break;
      case 'wifi':
        ctx.strokeStyle = C.blue;
        ctx.lineWidth = 2.6;
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.arc(0, 6, i * 4, Math.PI * 1.2, Math.PI * 1.8);
          ctx.stroke();
        }
        ctx.strokeStyle = C.red;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(8, 8);
        ctx.stroke();
        break;
      case 'bird':
        ctx.scale(0.62, 0.62);
        A.pigeon(ctx, -2, 4, 0, 1, false, false);
        break;
      case 'bat':
        ctx.scale(0.7, 0.7);
        A.pigeon(ctx, 0, 2, 0.1, 1, true, true);
        break;
      case 'zzz':
        ctx.fillStyle = C.purple;
        ctx.font = `14px ${A.F.display}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('z', -4, 3);
        ctx.font = `10px ${A.F.display}`;
        ctx.fillText('z', 4, -4);
        break;
      case 'toddler':
        A.el(ctx, 0, 0, 8, 8, 6, 0.2, 9);
        A.fs(ctx, '#f6d2b4', 2);
        A.poly(ctx, [[-6, -5], [0, -13], [6, -5]], 7, 0.2);
        A.fs(ctx, C.green, 2);
        ctx.fillStyle = A.INK;
        ctx.beginPath();
        ctx.arc(-3, 0, 1.2, 0, U.TAU);
        ctx.arc(3, 0, 1.2, 0, U.TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 4, 2, 0, U.TAU);
        ctx.stroke();
        break;
      case 'drop':
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.quadraticCurveTo(9, 2, 0, 8);
        ctx.quadraticCurveTo(-9, 2, 0, -10);
        ctx.fillStyle = C.sky;
        ctx.fill();
        ctx.stroke();
        break;
      case 'chat':
        A.el(ctx, -2, -2, 8, 6, 8, 0.2, 9);
        A.fs(ctx, C.pink, 2);
        A.el(ctx, 4, 3, 6, 5, 9, 0.2, 9);
        A.fs(ctx, '#fff', 2);
        break;
      case 'bolt':
        A.poly(ctx, [[2, -11], [-6, 1], [0, 1], [-3, 11], [7, -3], [1, -3]], 10, 0.2);
        A.fs(ctx, C.yellow, 2);
        break;
      case 'alarm':
        A.el(ctx, 0, 0, 9, 9, 11, 0.2, 10);
        A.fs(ctx, C.red, 2);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, U.TAU);
        ctx.fill();
        break;
      case 'raccoon':
        A.el(ctx, 0, 0, 9, 8, 12, 0.2, 9);
        A.fs(ctx, '#c4c0cc', 2);
        ctx.fillStyle = '#2e2836';
        ctx.fillRect(-8, -3, 16, 4);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-3, -1, 1.3, 0, U.TAU);
        ctx.arc(3, -1, 1.3, 0, U.TAU);
        ctx.fill();
        break;
      case 'ghost':
        ctx.scale(0.42, 0.42);
        A.ghost(ctx, 0, 22, 0, 1);
        break;
      case 'pizza':
        A.poly(ctx, [[-9, -7], [9, -7], [0, 10]], 13, 0.3);
        A.fs(ctx, C.yellow, 2);
        ctx.fillStyle = C.red;
        ctx.beginPath();
        ctx.arc(-2, -3, 2, 0, U.TAU);
        ctx.arc(3, -2, 1.6, 0, U.TAU);
        ctx.arc(0, 3, 1.6, 0, U.TAU);
        ctx.fill();
        break;
      case 'coffee':
        A.coffee(ctx, 0, 9, null);
        break;
      case 'bucket':
        A.bucket(ctx, 0, 8, 0.6);
        break;
      case 'shh':
        ctx.fillStyle = '#f6d2b4';
        A.el(ctx, 0, 0, 9, 9, 14, 0.2, 9);
        A.fs(ctx, '#f6d2b4', 2);
        A.rr(ctx, -1.5, -9, 3, 14, 1.5, 15, 0.1);
        A.fs(ctx, '#f6d2b4', 1.8);
        break;
      case 'dash':
        ctx.strokeStyle = C.orange;
        ctx.lineWidth = 2.6;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-9, -5 + i * 5);
          ctx.lineTo(-2 + i * 2, -5 + i * 5);
          ctx.stroke();
        }
        A.poly(ctx, [[0, -8], [9, 0], [0, 8]], 16, 0.2);
        A.fs(ctx, C.orange, 2);
        break;
      case 'check':
        ctx.strokeStyle = C.green;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(-2, 6);
        ctx.lineTo(8, -7);
        ctx.stroke();
        break;
      case 'envelope':
        A.rr(ctx, -10, -7, 20, 14, 2, 17, 0.2);
        A.fs(ctx, '#fff6e6', 2);
        ctx.beginPath();
        ctx.moveTo(-10, -6);
        ctx.lineTo(0, 2);
        ctx.lineTo(10, -6);
        ctx.stroke();
        break;
      case 'usb':
        A.usb(ctx, 0, 4);
        break;
      case 'star':
        A.star(ctx, 0, 0, 10, 4.5);
        A.fs(ctx, C.yellow, 2);
        break;
    }
    ctx.restore();
  };
})(window.MB);
