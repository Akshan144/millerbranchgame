'use strict';
// Menus and between-night screens, plus the painted library exterior backdrop.
(function (MB) {
  const U = MB.U, A = MB.A, Au = MB.Audio, FX = MB.FX, HUD = MB.HUD;
  const W = MB.W, H = MB.H;
  const In = MB.Input;
  const S = (MB.Screens = {});

  // --- exterior backdrop (based on the real Miller Branch: stone wall, glass wing, copper tower) ---
  const BD = { back: null, front: [], built: false };
  function buildBackdrop() {
    const RS = 2;
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = W * RS;
      c.height = H * RS;
      const x = c.getContext('2d');
      x.scale(RS, RS);
      return [c, x];
    };
    const [bc, b] = mk();
    const g = b.createLinearGradient(0, 0, 0, 560);
    g.addColorStop(0, '#272a63');
    g.addColorStop(0.45, '#6a5a9c');
    g.addColorStop(0.8, '#e59d94');
    g.addColorStop(1, '#f6c39a');
    b.fillStyle = g;
    b.fillRect(0, 0, W, H);
    BD.back = bc;
    const save = A.boil;
    for (let v = 0; v < 2; v++) {
      A.boil = v * 9 + 2;
      const [fc, f] = mk();
      drawFront(f);
      BD.front.push(fc);
    }
    A.boil = save;
    BD.built = true;
  }

  function drawFront(ctx) {
    const rnd = U.rng(99);
    const GY = 578;
    // distant tree line
    ctx.fillStyle = '#3a3f66';
    for (let i = 0; i < 40; i++) {
      const x = i * 34 + rnd() * 20, r = 30 + rnd() * 30;
      ctx.beginPath();
      ctx.ellipse(x, 520 - rnd() * 30, r, r * 1.2, 0, 0, U.TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#2b3052';
    for (let i = 0; i < 30; i++) {
      const x = i * 46 + rnd() * 20, r = 26 + rnd() * 24;
      ctx.beginPath();
      ctx.ellipse(x, 548 - rnd() * 16, r, r, 0, 0, U.TAU);
      ctx.fill();
    }
    ctx.fillRect(0, 548, W, 40);

    // stone low wing (left)
    stoneFill(ctx, [[478, 470], [570, 462], [570, GY + 4], [478, GY + 4]], 1);
    // glass wing
    const gx0 = 556, gx1 = 892;
    const roofL = 418, roofR = 352;
    const roofAt = (x) => U.lerp(roofL, roofR, (x - gx0) / (gx1 - gx0));
    // interior glow
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(gx0, roofAt(gx0) + 12);
    ctx.lineTo(gx1, roofAt(gx1) + 12);
    ctx.lineTo(gx1, GY);
    ctx.lineTo(gx0, GY);
    ctx.closePath();
    const ig = ctx.createLinearGradient(0, 360, 0, GY);
    ig.addColorStop(0, '#ffe39a');
    ig.addColorStop(0.5, '#ffc86e');
    ig.addColorStop(1, '#f39a4e');
    ctx.fillStyle = ig;
    ctx.fill();
    ctx.clip();
    // shelves + people silhouettes inside
    const mid = (x) => U.lerp(roofAt(x) + 12, GY, 0.48);
    for (let x = gx0 + 8; x < gx1 - 10; x += 26) {
      ctx.fillStyle = 'rgba(120,60,40,0.55)';
      ctx.fillRect(x, mid(x) - 34, 18, 30);
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = A.C.books[(x + k * 3) % A.C.books.length];
        ctx.globalAlpha = 0.6;
        ctx.fillRect(x + 2 + k * 4, mid(x) - 30, 3, 10);
        ctx.fillRect(x + 2 + k * 4, mid(x) - 17, 3, 10);
        ctx.globalAlpha = 1;
      }
    }
    for (let i = 0; i < 7; i++) {
      const x = gx0 + 30 + i * 46 + rnd() * 10;
      const y = GY - 26;
      ctx.fillStyle = 'rgba(80,40,50,0.8)';
      ctx.beginPath();
      ctx.arc(x, y - 16, 7, 0, U.TAU);
      ctx.fill();
      ctx.fillRect(x - 8, y - 9, 16, 18);
      ctx.fillStyle = 'rgba(170,220,255,0.9)';
      ctx.fillRect(x - 7, y - 3, 14, 8);
    }
    ctx.restore();
    // mullions
    ctx.strokeStyle = '#2a2430';
    ctx.lineWidth = 3;
    for (let x = gx0; x <= gx1; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, roofAt(x) + 12);
      ctx.lineTo(x, GY);
      ctx.stroke();
    }
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(gx0, mid(gx0));
    ctx.lineTo(gx1, mid(gx1));
    ctx.stroke();
    // reflection streaks
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 5; i++) {
      const x = gx0 + 40 + i * 70;
      ctx.beginPath();
      ctx.moveTo(x, roofAt(x) + 14);
      ctx.lineTo(x + 14, roofAt(x) + 14);
      ctx.lineTo(x - 30, GY);
      ctx.lineTo(x - 44, GY);
      ctx.fill();
    }
    // copper fascia overhang
    A.poly(ctx, [[gx0 - 26, roofL - 4], [gx1 + 10, roofR - 6], [gx1 + 10, roofR + 12], [gx0 - 26, roofL + 16]], 500, 1);
    A.fs(ctx, '#b48c76', 3);
    ctx.fillStyle = 'rgba(255,230,210,0.35)';
    ctx.beginPath();
    ctx.moveTo(gx0 - 24, roofL - 1);
    ctx.lineTo(gx1 + 8, roofR - 3);
    ctx.lineTo(gx1 + 8, roofR + 1);
    ctx.lineTo(gx0 - 24, roofL + 3);
    ctx.fill();
    ctx.strokeStyle = A.INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(gx0, roofAt(gx0) + 12, 0, GY - roofAt(gx0) - 12);
    A.line(ctx, gx0, roofAt(gx0) + 12, gx0, GY, 501, 3);

    // stone feature wall
    const sx0 = 872, sx1 = 1064;
    stoneFill(ctx, [[sx0, 300], [sx1, 286], [sx1, GY + 10], [sx0, GY + 10]], 2);
    // small square windows
    for (let i = 0; i < 4; i++) {
      const x = sx0 + 26 + i * 38, y = 372 - i * 3;
      A.rr(ctx, x, y, 22, 22, 2, 510 + i, 0.5);
      A.fs(ctx, '#ffd27a', 3, '#3a2a2e');
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(x + 3, y + 3, 6, 16);
    }
    // uplight wash
    const ug = ctx.createRadialGradient(sx0 + 96, GY + 10, 10, sx0 + 96, GY + 10, 220);
    ug.addColorStop(0, 'rgba(255,190,110,0.55)');
    ug.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = ug;
    ctx.fillRect(sx0, 280, sx1 - sx0, GY - 270);

    // copper tower
    const tx0 = 1052, tx1 = 1216;
    ctx.save();
    A.poly(ctx, [[tx0, 196], [tx1, 182], [tx1, GY + 12], [tx0, GY + 12]], 520, 0.8);
    const cg = ctx.createLinearGradient(tx0, 0, tx1, 0);
    cg.addColorStop(0, '#cf9776');
    cg.addColorStop(1, '#9c6650');
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.clip();
    ctx.strokeStyle = 'rgba(70,40,40,0.35)';
    ctx.lineWidth = 2;
    for (let x = tx0 + 16; x < tx1; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 150);
      ctx.lineTo(x, GY + 20);
      ctx.stroke();
    }
    const tg = ctx.createLinearGradient(0, GY, 0, 300);
    tg.addColorStop(0, 'rgba(255,200,130,0.45)');
    tg.addColorStop(1, 'rgba(255,200,130,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(tx0, 300, tx1 - tx0, GY - 280);
    ctx.restore();
    A.poly(ctx, [[tx0, 196], [tx1, 182], [tx1, GY + 12], [tx0, GY + 12]], 520, 0.8);
    A.fs(ctx, null, 3);
    // side face
    A.poly(ctx, [[tx1, 182], [tx1 + 34, 192], [tx1 + 34, GY + 6], [tx1, GY + 12]], 521, 0.8);
    A.fs(ctx, '#7a4c3e', 3);
    // tall window strip
    A.rr(ctx, tx0 + 10, 236, 20, GY - 246, 2, 522, 0.6);
    A.fs(ctx, '#ffd27a', 3, '#3a2a2e');
    ctx.fillStyle = '#3a2a2e';
    for (let y = 270; y < GY; y += 34) ctx.fillRect(tx0 + 10, y, 20, 3);
    A.rr(ctx, tx1 - 22, 300, 10, 150, 2, 523, 0.5);
    A.fs(ctx, '#ffd27a', 2.5, '#3a2a2e');
    // library sign on tower
    ctx.save();
    ctx.translate(tx0 + 92, 520);
    ctx.fillStyle = '#fbf3e4';
    ctx.font = `13px ${A.F.display}`;
    ctx.textAlign = 'center';
    ctx.fillText('MILLER BRANCH', 0, 0);
    ctx.font = `10px ${A.F.display}`;
    ctx.fillText('LIBRARY', 0, 14);
    ctx.restore();

    // lawn
    const lg = ctx.createLinearGradient(0, GY, 0, H);
    lg.addColorStop(0, '#4f8a43');
    lg.addColorStop(1, '#2f6a35');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(0, GY + 6);
    ctx.quadraticCurveTo(640, GY - 6, W, GY + 2);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 140 - 200, H);
      ctx.lineTo(i * 140 - 130, H);
      ctx.lineTo(i * 140 + 120, GY);
      ctx.lineTo(i * 140 + 80, GY);
      ctx.fill();
    }
    // shrubs along the base
    for (let i = 0; i < 20; i++) {
      const x = 480 + i * 40 + rnd() * 16, y = GY + 4 + rnd() * 6;
      A.blob(ctx, x, y, 22 + rnd() * 10, 13 + rnd() * 5, 600 + i, 0.18, 9);
      A.fs(ctx, i % 3 ? '#2f5e3a' : '#3d6e42', 2.6);
      if (rnd() < 0.5) {
        for (let k = 0; k < 5; k++) {
          ctx.fillStyle = rnd() < 0.5 ? '#e0526a' : '#f08aa0';
          ctx.beginPath();
          ctx.arc(x + (rnd() - 0.5) * 30, y - rnd() * 10, 2.5, 0, U.TAU);
          ctx.fill();
        }
      }
    }
    // small round trees
    for (const [x, s] of [[820, 1], [1124, 0.9], [520, 0.8]]) {
      ctx.strokeStyle = A.INK;
      ctx.lineWidth = 6 * s;
      ctx.beginPath();
      ctx.moveTo(x, GY + 26);
      ctx.lineTo(x, GY - 30 * s);
      ctx.stroke();
      ctx.strokeStyle = '#5a3a2a';
      ctx.lineWidth = 3 * s;
      ctx.stroke();
      A.blob(ctx, x, GY - 52 * s, 34 * s, 40 * s, 610 + x, 0.14, 11);
      A.fs(ctx, '#4f8a43', 3);
      A.blob(ctx, x + 8 * s, GY - 46 * s, 20 * s, 24 * s, 611 + x, 0.14, 9);
      A.fs(ctx, '#6aa255', 0);
    }
    // iron fence
    const fy = 620;
    ctx.strokeStyle = '#141018';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(760, fy - 34);
    ctx.lineTo(W, fy - 40);
    ctx.moveTo(760, fy - 6);
    ctx.lineTo(W, fy - 10);
    ctx.stroke();
    ctx.lineWidth = 2.4;
    for (let x = 764; x < W; x += 12) {
      const yb = fy + 4 - ((x - 760) / 520) * 4;
      ctx.beginPath();
      ctx.moveTo(x, yb);
      ctx.lineTo(x, yb - 48);
      ctx.stroke();
      ctx.fillStyle = '#141018';
      ctx.beginPath();
      ctx.moveTo(x - 3, yb - 46);
      ctx.lineTo(x, yb - 54);
      ctx.lineTo(x + 3, yb - 46);
      ctx.fill();
    }
    // foreground leafy branch (left, soft)
    ctx.save();
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 14; i++) {
      const x = 20 + rnd() * 160, y = 260 + rnd() * 260;
      A.blob(ctx, x, y, 26 + rnd() * 20, 18 + rnd() * 14, 700 + i, 0.25, 8);
      A.fs(ctx, i % 2 ? '#1d2a2a' : '#26343a', 0);
    }
    ctx.strokeStyle = '#1a1418';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-10, 600);
    ctx.quadraticCurveTo(90, 440, 160, 300);
    ctx.stroke();
    ctx.restore();
  }

  function stoneFill(ctx, pts, seed) {
    const rnd = U.rng(seed * 77);
    ctx.save();
    A.poly(ctx, pts, seed * 10, 0.6);
    ctx.fillStyle = '#8e5040';
    ctx.fill();
    ctx.clip();
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const stones = ['#a8634a', '#8e5040', '#b9785a', '#7d4a3c', '#c48c66', '#9b6b52', '#b46e55', '#80503f'];
    for (let y = y0; y < y1; y += 9 + Math.floor(rnd() * 4)) {
      let x = x0 - rnd() * 20;
      const rh = 8 + rnd() * 5;
      while (x < x1) {
        const sw = 12 + rnd() * 24;
        ctx.fillStyle = stones[Math.floor(rnd() * stones.length)];
        ctx.fillRect(x + 1, y + 1, sw - 2, rh - 1.5);
        x += sw;
      }
    }
    ctx.restore();
    A.poly(ctx, pts, seed * 10, 0.6);
    A.fs(ctx, null, 3);
  }

  S.drawBackdrop = function (ctx, t, dim = 0) {
    if (!BD.built) buildBackdrop();
    ctx.drawImage(BD.back, 0, 0, W, H);
    // stars
    for (let i = 0; i < 60; i++) {
      const x = U.hash(i * 3.3) * W, y = U.hash(i * 7.7) * 260;
      ctx.fillStyle = `rgba(255,248,220,${(0.3 + 0.5 * Math.sin(t * (1 + U.hash(i)) + i)) * 0.7})`;
      ctx.fillRect(x, y, 2, 2);
    }
    // moon
    ctx.fillStyle = 'rgba(255,240,215,0.25)';
    ctx.beginPath();
    ctx.arc(1020, 100, 60, 0, U.TAU);
    ctx.fill();
    ctx.fillStyle = '#fff1d8';
    ctx.beginPath();
    ctx.arc(1020, 100, 26, 0, U.TAU);
    ctx.fill();
    // clouds
    for (let i = 0; i < 7; i++) {
      const cx = ((i * 230 + t * (8 + i * 2)) % (W + 400)) - 200;
      const cy = 160 + (i % 4) * 46;
      ctx.fillStyle = `rgba(255,${200 + i * 5},${210 + i * 4},0.22)`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 120, 16, 0, 0, U.TAU);
      ctx.ellipse(cx + 50, cy - 12, 70, 16, 0, 0, U.TAU);
      ctx.fill();
    }
    // a bird or two
    for (let i = 0; i < 3; i++) {
      const bx = ((t * 40 + i * 400) % (W + 200)) - 100, by = 240 + Math.sin(t + i) * 20 + i * 30;
      const f = Math.sin(t * 10 + i) * 4;
      ctx.strokeStyle = '#2a1f3a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx - 8, by - f);
      ctx.quadraticCurveTo(bx - 3, by - 3, bx, by);
      ctx.quadraticCurveTo(bx + 3, by - 3, bx + 8, by - f);
      ctx.stroke();
    }
    ctx.drawImage(BD.front[A.boil % 2], 0, 0, W, H);
    // window flicker glow
    const gl = ctx.createRadialGradient(724, 470, 20, 724, 470, 260);
    gl.addColorStop(0, `rgba(255,200,110,${0.18 + Math.sin(t * 2) * 0.03})`);
    gl.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(400, 250, 640, 400);
    // falling leaves
    for (let i = 0; i < 14; i++) {
      const lx = (U.hash(i * 5.1) * W + t * 30 + Math.sin(t + i) * 30) % W;
      const ly = (U.hash(i * 2.7) * H + t * (40 + i * 3)) % H;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(t * 2 + i);
      ctx.fillStyle = ['#e39b3a', '#c94f3d', '#d9c27a', '#b8643a'][i % 4];
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 3, 0, 0, U.TAU);
      ctx.fill();
      ctx.restore();
    }
    if (dim) {
      ctx.fillStyle = `rgba(18,10,30,${dim})`;
      ctx.fillRect(0, 0, W, H);
    }
  };

  // --- menu helpers ------------------------------------------------------------------------------
  function menuInput(st, n, opts = {}) {
    const vertical = opts.vertical !== false;
    const prev = vertical ? 'up' : 'left', next = vertical ? 'down' : 'right';
    if (In.hit(prev)) {
      st.sel = (st.sel + n - 1) % n;
      Au.play('select');
    }
    if (In.hit(next)) {
      st.sel = (st.sel + 1) % n;
      Au.play('select');
    }
    // mouse
    if (st.rects) {
      st.rects.forEach((r, i) => {
        if (r && U.inRect(In.mouse.x, In.mouse.y, r)) {
          if (In.mouse.moved && st.sel !== i) {
            st.sel = i;
            Au.play('select');
          }
          if (In.mouse.clicked) st.clickSel = i;
        }
      });
    }
    const click = st.clickSel != null;
    if (click) {
      st.sel = st.clickSel;
      st.clickSel = null;
    }
    return click || In.hit('act');
  }
  S.menuInput = menuInput;

  function drawMenuItem(ctx, label, x, y, sel, t, sub) {
    const wob = sel ? Math.sin(t * 6) * 0.02 : 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(wob);
    A.text(ctx, label, 0, 0, { size: sel ? 38 : 32, color: sel ? '#ffe08a' : '#fbf3e4', outline: 8, align: 'left', shadow: 4 });
    if (sub) A.text(ctx, sub, 4, 30, { size: 16, font: A.F.hand, color: '#e8d8ff', outline: 4, align: 'left' });
    ctx.restore();
    ctx.font = `${sel ? 38 : 32}px ${A.F.display}`;
    const w = ctx.measureText(label).width;
    if (sel) {
      // pencil cursor
      ctx.save();
      ctx.translate(x - 34 + Math.sin(t * 8) * 4, y);
      ctx.rotate(0);
      A.poly(ctx, [[-24, -6], [6, -6], [16, 0], [6, 6], [-24, 6]], 900, 0.4);
      A.fs(ctx, '#f6c945', 2.5);
      ctx.fillStyle = '#f2d6b0';
      ctx.beginPath();
      ctx.moveTo(6, -6);
      ctx.lineTo(16, 0);
      ctx.lineTo(6, 6);
      ctx.fill();
      ctx.fillStyle = A.INK;
      ctx.beginPath();
      ctx.moveTo(12, -2);
      ctx.lineTo(16, 0);
      ctx.lineTo(12, 2);
      ctx.fill();
      ctx.fillStyle = '#ef7fa6';
      ctx.fillRect(-28, -6, 6, 12);
      ctx.restore();
    }
    return { x: x - 10, y: y - 24, w: w + 20, h: 48 };
  }

  function overlayFade(ctx, a) {
    ctx.fillStyle = `rgba(18,10,30,${a})`;
    ctx.fillRect(0, 0, W, H);
  }

  function logo(ctx, x, y, t, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(-0.04 + Math.sin(t * 1.3) * 0.008);
    A.text(ctx, 'THE', -170, -78, { size: 30, color: '#ffe08a', outline: 7, align: 'left', shadow: 4 });
    A.text(ctx, 'MILLER BRANCH', 0, -40, { size: 62, color: '#fbf3e4', outline: 11, shadow: 7 });
    ctx.save();
    ctx.translate(0, 34);
    ctx.rotate(0.02);
    A.text(ctx, 'LIBRARY', 0, 0, { size: 104, color: '#f6c945', outline: 13, shadow: 9 });
    ctx.restore();
    // ribbon
    ctx.save();
    ctx.translate(30, 108);
    ctx.rotate(0.03);
    const label = 'APPLICATIONS DUE NOV 1 · 11:59 PM';
    ctx.font = `18px ${A.F.display}`;
    const w = ctx.measureText(label).width + 40;
    A.poly(ctx, [[-w / 2 - 16, 0], [-w / 2, -15], [w / 2, -15], [w / 2 + 16, 0], [w / 2, 15], [-w / 2, 15]], 40, 0.6);
    A.fs(ctx, '#c94f3d', 3);
    A.text(ctx, label, 0, 1, { size: 18, color: '#fff6e6', outline: 0 });
    ctx.restore();
    ctx.restore();
  }

  // --- title -----------------------------------------------------------------------------------------
  S.title = function () {
    const st = { name: 'title', t: 0, sel: 0, ready: Au.ready, rects: [] };
    if (Au.ready) Au.Music.set({ song: 'menu', intensity: 0, crunch: 0 });
    const items = [
      { label: 'START STUDYING', sub: '5-night campaign · the Nov 1 deadline', go: () => MB.go(S.difficulty('campaign')) },
      { label: 'ROLLING ADMISSIONS', sub: 'endless nights · chase a high score', go: () => MB.go(S.difficulty('endless')) },
      { label: 'TUTORIAL', sub: 'orientation night with Ms. Okafor', go: () => { const run = MB.newRun(U.store.get('char', 0), 'campaign'); MB.go(new MB.Tutorial(run, () => MB.go(S.title()))); } },
      { label: 'HOW TO PLAY', go: () => MB.go(S.howto(S.title)) },
      { label: 'SETTINGS', go: () => MB.go(S.settings(S.title)) },
    ];
    st.update = (dt) => {
      st.t += dt;
      if (!st.ready) {
        if (In.anyHit()) {
          Au.init();
          Au.Music.set({ song: 'menu', intensity: 0, crunch: 0 });
          st.ready = true;
          Au.play('confirm');
        }
        return;
      }
      if (In.hit('mute')) Au.toggleMute();
      if (menuInput(st, items.length)) {
        Au.play('confirm');
        items[st.sel].go();
      }
    };
    st.draw = (ctx) => {
      S.drawBackdrop(ctx, st.t);
      const gl = ctx.createLinearGradient(0, 0, 640, 0);
      gl.addColorStop(0, 'rgba(18,10,30,0.55)');
      gl.addColorStop(1, 'rgba(18,10,30,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(0, 0, 700, H);
      const intro = U.ease.outBack(U.clamp(st.t / 0.8, 0, 1));
      logo(ctx, 330, 150, st.t, intro);
      if (!st.ready) {
        const a = 0.6 + 0.4 * Math.sin(st.t * 4);
        ctx.save();
        ctx.globalAlpha = a;
        A.text(ctx, 'PRESS ANY KEY OR CLICK', 330, 420, { size: 30, color: '#fff6e6', outline: 7 });
        ctx.restore();
        A.text(ctx, 'sound on for the full lo-fi experience', 330, 458, { size: 18, font: A.F.hand, color: '#e8d8ff', outline: 4 });
      } else {
        st.rects = items.map((it, i) => drawMenuItem(ctx, it.label, 110, 318 + i * 64, st.sel === i, st.t, st.sel === i ? it.sub : null));
      }
      const best = U.store.get('best', {});
      const dk = U.store.get('diff', 'normal');
      const bits = [];
      if (best['campaign_' + dk]) bits.push('Best story (' + MB.DIFFS[dk].name + '): ' + U.fmtNum(best['campaign_' + dk]));
      const be = best['endless_' + dk];
      if (be) bits.push('Best rolling (' + MB.DIFFS[dk].name + '): ' + U.fmtNum(be.score) + ' · ' + be.nights + ' nights');
      bits.push('M mutes');
      A.text(ctx, bits.join('   ·   '), 24, H - 22, { size: 16, font: A.F.hand, color: '#e8d8ff', outline: 4, align: 'left' });
      Wd().drawPost(ctx, 0.4);
    };
    return st;
  };
  const Wd = () => MB.World;

  // --- difficulty -----------------------------------------------------------------------------------
  S.difficulty = function (mode) {
    const ids = ['easy', 'normal', 'hard'];
    const st = { name: 'difficulty', t: 0, sel: Math.max(0, ids.indexOf(U.store.get('diff', 'normal'))), rects: [] };
    const words = {
      easy: ['Light workload', 'Long breathers between waves', 'Short essays'],
      normal: ['Heavier workload', 'Short breathers, steady trickle', 'Longer essays, bigger waves'],
      hard: ['Brutal workload', 'Rare breathers, constant trickle', 'Long essays, huge waves'],
    };
    st.update = (dt) => {
      st.t += dt;
      if (In.hit('pause')) {
        Au.play('back');
        return MB.go(S.title());
      }
      if (st.t > 0.3 && menuInput(st, ids.length, { vertical: false })) {
        Au.play('confirm');
        U.store.set('diff', ids[st.sel]);
        MB.go(S.select(mode));
      }
    };
    st.draw = (ctx) => {
      S.drawBackdrop(ctx, st.t, 0.6);
      A.text(ctx, 'HOW INTENSE IS THIS WEEK?', W / 2, 74, { size: 42, color: '#fbf3e4', outline: 9, shadow: 5 });
      A.text(ctx, mode === 'endless' ? 'Rolling Admissions gets harder every night on any setting.' : 'You can change this every time you start a new run.', W / 2, 116, { size: 20, font: A.F.hand, color: '#e8d8ff', outline: 5 });
      const cw = 320, ch = 420, gap = 34;
      const x0 = W / 2 - (3 * cw + 2 * gap) / 2;
      st.rects = ids.map((id, i) => {
        const d = MB.DIFFS[id];
        const sel = st.sel === i;
        const appear = U.ease.outBack(U.clamp((st.t - i * 0.08) / 0.4, 0, 1));
        const x = x0 + i * (cw + gap), y = 158 + (sel ? -12 : 0) + (1 - appear) * 260;
        ctx.save();
        ctx.translate(x + cw / 2, y + ch / 2);
        ctx.rotate((i - 1) * 0.025 * (sel ? 0.3 : 1));
        if (!sel) ctx.globalAlpha = 0.85;
        A.rr(ctx, -cw / 2 + 6, -ch / 2 + 8, cw, ch, 14, 640 + i, 0.6);
        A.fs(ctx, 'rgba(10,5,20,0.5)', 0);
        A.rr(ctx, -cw / 2, -ch / 2, cw, ch, 14, 650 + i, 0.6);
        A.fs(ctx, sel ? '#fff8ec' : '#ece2d4', sel ? 4.5 : 3, sel ? d.col : A.INK);
        A.rr(ctx, -cw / 2, -ch / 2, cw, 70, 14, 660 + i, 0.6);
        A.fs(ctx, d.col, 3);
        A.text(ctx, d.name, 0, -ch / 2 + 37, { size: 40, color: '#fff', outline: 6 });
        for (let k = 0; k < 3; k++) {
          const sx = -40 + k * 40, sy = -ch / 2 + 104;
          A.star(ctx, sx, sy, 15, 6.5);
          A.fs(ctx, k <= i ? '#f6c945' : '#d8cfd8', 2.5, k <= i ? A.INK : '#b0a6b8');
        }
        A.text(ctx, d.title, 0, -ch / 2 + 148, { size: 26, font: A.F.script, color: A.C.inkSoft, outline: 0 });
        ctx.font = `17px ${A.F.hand}`;
        A.wrap(ctx, d.blurb, cw - 50).forEach((l, k) => A.text(ctx, l, 0, -ch / 2 + 182 + k * 21, { size: 17, font: A.F.hand, color: A.INK, outline: 0 }));
        const ext = d.ext[mode === 'endless' ? 1 : 0];
        const bullets = words[id].concat([ext + (ext === 1 ? ' extension' : ' extensions'), 'Score x' + d.score]);
        bullets.forEach((b, k) => {
          const by = -ch / 2 + 262 + k * 28;
          ctx.fillStyle = d.col;
          ctx.beginPath();
          ctx.arc(-cw / 2 + 32, by, 5, 0, U.TAU);
          ctx.fill();
          A.text(ctx, b, -cw / 2 + 46, by + 1, { size: 15, color: A.INK, outline: 0, align: 'left' });
        });
        if (id === 'normal') A.text(ctx, 'recommended', 0, ch / 2 - 16, { size: 13, font: A.F.hand, color: '#a094a8', outline: 0 });
        ctx.restore();
        return { x, y, w: cw, h: ch };
      });
      A.text(ctx, '← → choose   ·   ' + HUD.keyName('act') + ' / click to confirm   ·   ESC back', W / 2, H - 28, { size: 18, font: A.F.hand, color: '#fff6e6', outline: 4 });
      Wd().drawPost(ctx, 0.4);
    };
    return st;
  };

  // --- character select ------------------------------------------------------------------------------
  S.select = function (mode) {
    const st = { name: 'select', t: 0, sel: U.store.get('char', 0), rects: [] };
    st.update = (dt) => {
      st.t += dt;
      if (In.hit('pause')) {
        Au.play('back');
        return MB.go(S.difficulty(mode));
      }
      if (menuInput(st, MB.CHARACTERS.length, { vertical: false })) {
        Au.play('confirm');
        U.store.set('char', st.sel);
        const run = MB.newRun(st.sel, mode);
        if (mode === 'campaign') MB.playScene(MB.STORY.prologue(run), run, MB.NIGHTS[0], () => MB.go(new MB.Tutorial(run, () => MB.go(S.intro(run)))));
        else MB.go(S.intro(run));
      }
    };
    st.draw = (ctx) => {
      S.drawBackdrop(ctx, st.t, 0.55);
      A.text(ctx, 'WHO IS RUNNING THE STUDY GROUP?', W / 2, 70, { size: 40, color: '#fbf3e4', outline: 9, shadow: 5 });
      A.text(ctx, mode === 'endless' ? 'Rolling Admissions: the nights never end. How long can you keep them focused?' : 'Five nights until the Nov 1 deadline. Your friends are counting on you.', W / 2, 112, { size: 20, font: A.F.hand, color: '#e8d8ff', outline: 5 });
      const n = MB.CHARACTERS.length;
      const cw = 270, gap = 22;
      const x0 = W / 2 - (n * cw + (n - 1) * gap) / 2;
      st.rects = MB.CHARACTERS.map((ch, i) => {
        const sel = st.sel === i;
        const x = x0 + i * (cw + gap), y = 150 + (sel ? -10 : 8);
        const h = 470;
        ctx.save();
        ctx.translate(x + cw / 2, y + h / 2);
        ctx.rotate(sel ? 0 : (i % 2 ? 0.02 : -0.02));
        if (!sel) ctx.globalAlpha = 0.82;
        A.rr(ctx, -cw / 2 + 5, -h / 2 + 7, cw, h, 16, 300 + i, 0.6);
        A.fs(ctx, 'rgba(10,5,20,0.5)', 0);
        A.rr(ctx, -cw / 2, -h / 2, cw, h, 16, 310 + i, 0.6);
        A.fs(ctx, sel ? '#fff6e6' : '#e9dfd3', sel ? 4 : 3, sel ? '#f6c945' : A.INK);
        if (sel) {
          A.rr(ctx, -cw / 2, -h / 2, cw, h, 16, 310 + i, 0.6);
          A.fs(ctx, null, 2, A.INK);
        }
        // spotlight
        const sg = ctx.createRadialGradient(0, -60, 10, 0, -60, 120);
        sg.addColorStop(0, A.rgba(ch.look.top, 0.45));
        sg.addColorStop(1, A.rgba(ch.look.top, 0));
        ctx.fillStyle = sg;
        ctx.fillRect(-cw / 2 + 4, -h / 2 + 4, cw - 8, 240);
        A.person(ctx, 0, 0, ch.look, { pose: sel ? 'cheer' : 'stand', t: st.t + i, emo: sel ? 'happy' : 'neutral', scale: 2.7 });
        A.text(ctx, ch.name.toUpperCase(), 0, 38, { size: 38, color: A.INK, outline: 0 });
        A.text(ctx, ch.title, 0, 70, { size: 22, font: A.F.hand, color: '#c94f3d', outline: 0 });
        ctx.font = `17px ${A.F.hand}`;
        const lines = A.wrap(ctx, ch.blurb, cw - 40);
        lines.forEach((l, k) => A.text(ctx, l, 0, 100 + k * 20, { size: 17, font: A.F.hand, color: A.C.inkSoft, outline: 0 }));
        ch.perks.forEach((pk, k) => {
          const py = 160 + k * 24;
          ctx.fillStyle = '#6cbf6a';
          ctx.beginPath();
          ctx.arc(-cw / 2 + 28, py, 5, 0, U.TAU);
          ctx.fill();
          A.text(ctx, pk, -cw / 2 + 40, py + 1, { size: 15, font: A.F.display, color: A.INK, outline: 0, align: 'left' });
        });
        ctx.restore();
        return { x, y, w: cw, h };
      });
      A.text(ctx, '← → choose   ·   SPACE / click to start   ·   ESC back', W / 2, H - 28, { size: 18, font: A.F.hand, color: '#fff6e6', outline: 4 });
      Wd().drawPost(ctx, 0.4);
    };
    return st;
  };

  // --- night intro (calendar page) -------------------------------------------------------------------
  S.intro = function (run) {
    MB.snapshotRun(run);
    const def = MB.nightDef(run);
    run.currentDef = def;
    run.currentDefIdx = run.nightIdx;
    const dif = MB.diffOf(run);
    const st = { name: 'intro', t: 0 };
    const prevDeck = run.mode === 'endless' ? [] : run.nightIdx > 0 ? MB.NIGHTS[run.nightIdx - 1].deck : [];
    const fresh = def.deck.filter((d) => !prevDeck.includes(d));
    const shown = run.mode === 'endless' && run.nightIdx === 0 ? [] : fresh;
    const song = Au.SONGS[def.song] || Au.SONGS.n1;
    Au.Music.set({ song: def.song, intensity: 0, crunch: 0 });
    st.update = (dt) => {
      st.t += dt;
      if (In.hit('mute')) Au.toggleMute();
      if (st.t > 0.5 && (In.hit('act') || In.mouse.clicked)) {
        Au.play('confirm');
        if (run.mode === 'campaign') MB.playScene(MB.STORY.night(run, def.n), run, def, () => MB.go(new MB.Night(run)));
        else MB.go(new MB.Night(run));
      }
      if (In.hit('pause')) {
        Au.play('back');
        MB.go(S.title());
      }
    };
    st.draw = (ctx) => {
      S.drawBackdrop(ctx, st.t, 0.6);
      const k = U.ease.outBack(U.clamp(st.t / 0.5, 0, 1));
      const cw = 720, ch = 560;
      ctx.save();
      ctx.translate(W / 2, H / 2 + (1 - k) * 200);
      ctx.rotate(-0.015);
      A.rr(ctx, -cw / 2 + 6, -ch / 2 + 9, cw, ch, 14, 200, 0.6);
      A.fs(ctx, 'rgba(10,5,20,0.5)', 0);
      A.rr(ctx, -cw / 2, -ch / 2, cw, ch, 14, 201, 0.6);
      A.fs(ctx, '#fff8ec', 3.5);
      // binding
      A.rr(ctx, -cw / 2, -ch / 2, cw, 64, 14, 202, 0.6);
      A.fs(ctx, def.halloween ? '#d8733a' : '#c94f3d', 3.5);
      for (let i = 0; i < 9; i++) {
        const rx = -cw / 2 + 60 + i * 75;
        ctx.fillStyle = '#2b1b33';
        ctx.beginPath();
        ctx.arc(rx, -ch / 2 + 10, 7, 0, U.TAU);
        ctx.fill();
        ctx.strokeStyle = '#b8b0c0';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(rx, -ch / 2 + 2, 9, Math.PI * 0.1, Math.PI * 0.9, true);
        ctx.stroke();
      }
      const label = (run.mode === 'endless' ? 'ROLLING ADMISSIONS · NIGHT ' + def.endlessIdx : 'NIGHT ' + def.n + ' OF 5') + ' · ' + dif.name;
      A.text(ctx, label, 0, -ch / 2 + 36, { size: 26, color: '#fff6e6', outline: 0 });
      A.text(ctx, def.day, 0, -ch / 2 + 108, { size: 60, color: A.INK, outline: 0 });
      A.text(ctx, def.date.replace('OCT', 'OCTOBER').replace('NOV', 'NOVEMBER'), 0, -ch / 2 + 152, { size: 26, color: '#c94f3d', outline: 0 });
      A.text(ctx, '“' + def.title + '”', 0, -ch / 2 + 196, { size: 34, font: A.F.script, color: A.C.inkSoft, outline: 0 });
      const nightsLeft = run.mode === 'endless' ? null : 5 - def.n;
      const lines = [
        'Tonight: ' + def.task,
        'Get ' + def.quota + ' of ' + (def.friends + 1) + ' applications in before midnight.',
      ];
      lines.push('Extensions left: ' + (run.extensions || 0) + ' (a missed quota uses one)');
      if (nightsLeft != null) lines.push(nightsLeft === 0 ? 'THE DEADLINE IS TONIGHT. Happy Halloween.' : nightsLeft + (nightsLeft === 1 ? ' night' : ' nights') + ' until the Nov 1 deadline.');
      else lines.push('Every distraction is fair game. Score: ' + U.fmtNum(run.score));
      lines.forEach((l, i) => A.text(ctx, l, 0, -ch / 2 + 232 + i * 26, { size: 20, font: A.F.hand, color: i === 3 && nightsLeft === 0 ? '#d23c34' : i === 2 ? '#d8733a' : A.INK, outline: 0 }));
      // new distractions
      if (shown.length) {
        A.text(ctx, 'NEW DISTRACTIONS', 0, -ch / 2 + 340, { size: 20, color: '#c94f3d', outline: 0 });
        const cols = shown.length > 3 ? 2 : 1;
        shown.forEach((type, i) => {
          const meta = Object.assign({}, MB.EVENTS[type], type === 'birds' && def.halloween ? { name: 'Bat Invasion', icon: 'bat' } : {});
          const col = cols === 2 ? i % 2 : 0;
          const row = cols === 2 ? Math.floor(i / 2) : i;
          const x = cols === 2 ? -cw / 2 + 40 + col * 340 : -200;
          const y = -ch / 2 + 380 + row * 52;
          A.icon(ctx, meta.icon, x + 18, y, 17, meta.good ? '#e8ffd8' : '#ffe6e0');
          A.text(ctx, meta.name, x + 44, y - 10, { size: 18, color: A.INK, outline: 0, align: 'left' });
          A.text(ctx, meta.hint, x + 44, y + 11, { size: 15, font: A.F.hand, color: A.C.inkSoft, outline: 0, align: 'left' });
        });
      } else {
        A.text(ctx, run.mode === 'endless' ? 'ALL DISTRACTIONS ACTIVE' : '', 0, -ch / 2 + 360, { size: 20, color: '#c94f3d', outline: 0 });
        const tips = ['Tip: pep-talk wandering friends before their focus tanks the group.', 'Tip: fix things fast to stack your Flow multiplier.', 'Tip: coffee from the vending machine wakes nappers and turbo-charges typing.'];
        A.text(ctx, tips[(def.n + (def.endlessIdx || 0)) % tips.length], 0, -ch / 2 + 400, { size: 18, font: A.F.hand, color: A.C.inkSoft, outline: 0 });
      }
      const bob = Math.sin(st.t * 4) * 2;
      const track = 'tonight\'s track: “' + song.title + '”';
      ctx.font = `18px ${A.F.hand}`;
      const tw = ctx.measureText(track).width;
      A.icon(ctx, 'note', -tw / 2 - 4, ch / 2 - 28 + bob, 11, '#efe4ff');
      A.text(ctx, track, 14, ch / 2 - 28, { size: 18, font: A.F.hand, color: '#8a5ac2', outline: 0 });
      ctx.restore();
      if (st.t > 0.5) {
        ctx.save();
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(st.t * 5);
        A.text(ctx, 'PRESS ' + HUD.keyName('act') + ' TO HIT THE BOOKS', W / 2, H - 28, { size: 24, color: '#ffe08a', outline: 6 });
        ctx.restore();
      }
      Wd().drawPost(ctx, 0.4);
    };
    return st;
  };

  // --- results (report card) ---------------------------------------------------------------------------
  S.results = function (res) {
    const run = MB.run;
    FX.clear();
    const st = { name: 'results', t: 0, sel: 0, rects: [], stamped: false };
    const finalNight = !res.endless && res.def.n === 5;
    const rows = [
      ['Applications in', res.count + ' / ' + res.total + '  (needed ' + res.quota + ')'],
      ['Distractions handled', String(res.handled)],
      ['Best flow', 'x' + res.bestFlow],
      ['Night points', U.fmtNum(res.base)],
      ['Full house bonus', res.fullBonus ? '+' + U.fmtNum(res.fullBonus) : '—'],
      ['Early finish bonus', res.timeBonus ? '+' + U.fmtNum(res.timeBonus) : '—'],
      [res.diff.name[0] + res.diff.name.slice(1).toLowerCase() + ' difficulty bonus', res.diffBonus ? '+' + U.fmtNum(res.diffBonus) + '  (x' + res.diff.score + ')' : '—'],
      ['Essay lines that wowed', res.essay ? res.essay.perfect + ' / ' + res.essay.written : '—'],
      ['Groove modes', String(res.grooves || 0)],
    ];
    let options;
    if (res.cont) {
      options = finalNight ? [{ label: 'MIDNIGHT...', go: () => MB.playScene(MB.STORY.finale(run), run, MB.NIGHTS[4], () => MB.go(S.ending())) }] : [{ label: 'PICK A STUDY HACK', go: () => MB.go(S.upgrade()) }];
    } else if (res.endless) {
      options = [{ label: 'PLAY AGAIN', go: () => MB.go(S.difficulty('endless')) }, { label: 'TITLE', go: () => MB.go(S.title()) }];
    } else {
      options = [{ label: 'RETRY THE NIGHT', go: () => { MB.restoreRun(run); MB.go(S.intro(run)); } }, { label: 'TITLE', go: () => MB.go(S.title()) }];
    }
    if (res.endless) saveBest('endless', run.score, run.nightIdx + (res.cont ? 1 : 0));
    st.update = (dt) => {
      st.t += dt;
      const stampAt = 0.6 + rows.length * 0.35 + 0.4;
      if (!st.stamped && st.t > stampAt) {
        st.stamped = true;
        Au.play('stamp');
        st.shake = 10;
        if (res.cont) {
          FX.confetti(W / 2 + 240, 400, res.pass ? 60 : 20);
          Au.play(res.grade.startsWith('A') ? 'submit' : 'ding');
        } else Au.play('fail');
      }
      st.shake = Math.max(0, (st.shake || 0) - dt * 30);
      FX.update(dt);
      if (st.t < stampAt) {
        if (In.hit('act')) st.t = stampAt;
        return;
      }
      if (st.t > stampAt + 0.3 && menuInput(st, options.length, { vertical: false })) {
        Au.play('confirm');
        FX.clear();
        options[st.sel].go();
      }
    };
    st.draw = (ctx) => {
      S.drawBackdrop(ctx, st.t, 0.65);
      ctx.save();
      if (st.shake) ctx.translate(U.rand(-st.shake, st.shake), U.rand(-st.shake, st.shake));
      const cw = 860, ch = 600;
      const k = U.ease.outBack(U.clamp(st.t / 0.45, 0, 1));
      ctx.translate(W / 2, H / 2 - 20 + (1 - k) * 300);
      ctx.rotate(0.012);
      A.rr(ctx, -cw / 2 + 6, -ch / 2 + 9, cw, ch, 10, 400, 0.6);
      A.fs(ctx, 'rgba(10,5,20,0.5)', 0);
      A.rr(ctx, -cw / 2, -ch / 2, cw, ch, 10, 401, 0.6);
      A.fs(ctx, '#fffaf0', 3.5);
      // ruled lines
      ctx.strokeStyle = 'rgba(80,120,200,0.18)';
      ctx.lineWidth = 1.5;
      for (let y = -ch / 2 + 90; y < ch / 2 - 10; y += 30) {
        ctx.beginPath();
        ctx.moveTo(-cw / 2 + 10, y);
        ctx.lineTo(cw / 2 - 10, y);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(224,82,74,0.4)';
      ctx.beginPath();
      ctx.moveTo(-cw / 2 + 60, -ch / 2 + 6);
      ctx.lineTo(-cw / 2 + 60, ch / 2 - 6);
      ctx.stroke();
      const title = res.endless ? 'ROLLING NIGHT ' + res.def.endlessIdx + ' · REPORT CARD' : 'NIGHT ' + res.def.n + ' · REPORT CARD';
      A.text(ctx, title, 0, -ch / 2 + 44, { size: 32, color: A.INK, outline: 0 });
      A.text(ctx, res.def.day + ', ' + res.def.date + ' · "' + res.def.title + '"', 0, -ch / 2 + 76, { size: 18, font: A.F.hand, color: A.C.inkSoft, outline: 0 });
      // people
      res.names.forEach((p, i) => {
        const y = -ch / 2 + 130 + i * 62;
        const x = -cw / 2 + 120;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - 40, y - 34, 80, 56);
        ctx.clip();
        A.person(ctx, x, y + 46, p.look, { pose: 'stand', emo: p.ok ? 'happy' : 'sad', scale: 1, noShadow: true, t: st.t });
        ctx.restore();
        A.text(ctx, p.name, x + 46, y - 8, { size: 20, color: A.INK, outline: 0, align: 'left' });
        A.text(ctx, p.ok ? 'submitted ✓' : 'stuck at ' + Math.floor(p.progress) + '%', x + 46, y + 14, { size: 17, font: A.F.hand, color: p.ok ? '#3f8f5e' : '#c94f3d', outline: 0, align: 'left' });
      });
      // tally
      rows.forEach((r, i) => {
        const appear = U.clamp((st.t - 0.6 - i * 0.35) / 0.25, 0, 1);
        if (appear <= 0) return;
        const y = -ch / 2 + 130 + i * 34;
        ctx.save();
        ctx.globalAlpha = appear;
        A.text(ctx, r[0], -20, y, { size: 20, font: A.F.hand, color: A.C.inkSoft, outline: 0, align: 'left' });
        ctx.strokeStyle = 'rgba(43,27,51,0.3)';
        ctx.setLineDash([2, 5]);
        ctx.beginPath();
        ctx.moveTo(150, y + 6);
        ctx.lineTo(cw / 2 - 200, y + 6);
        ctx.stroke();
        ctx.setLineDash([]);
        A.text(ctx, r[1], cw / 2 - 40, y, { size: 20, color: A.INK, outline: 0, align: 'right' });
        ctx.restore();
      });
      const ty = -ch / 2 + 130 + rows.length * 34 + 10;
      if (st.t > 0.6 + rows.length * 0.35) {
        A.text(ctx, 'NIGHT TOTAL', -20, ty, { size: 24, color: A.INK, outline: 0, align: 'left' });
        A.text(ctx, U.fmtNum(res.counted), cw / 2 - 40, ty, { size: 28, color: res.cont ? '#3f8f5e' : '#c94f3d', outline: 0, align: 'right' });
        A.text(ctx, 'RUN SCORE ' + U.fmtNum(run.score), cw / 2 - 40, ty + 34, { size: 18, color: A.C.inkSoft, outline: 0, align: 'right' });
        if (res.usedExt) A.text(ctx, 'half points: extension used', -20, ty + 34, { size: 16, font: A.F.hand, color: '#d8733a', outline: 0, align: 'left' });
        else if (!res.cont) A.text(ctx, 'not counted: quota missed', -20, ty + 34, { size: 16, font: A.F.hand, color: '#c94f3d', outline: 0, align: 'left' });
        if (res.essay && res.essay.best) {
          ctx.font = `17px ${A.F.script}`;
          A.text(ctx, 'Best line tonight:', -20, ty + 66, { size: 15, color: A.C.inkSoft, outline: 0, align: 'left' });
          A.wrap(ctx, '“' + res.essay.best + '”', 380).slice(0, 2).forEach((l, i) => A.text(ctx, l, -20, ty + 90 + i * 22, { size: 21, font: A.F.script, color: '#2f5d8a', outline: 0, align: 'left' }));
        }
      }
      // stamp
      if (st.stamped) {
        const sk = U.clamp((st.t - (0.6 + rows.length * 0.35 + 0.4)) / 0.18, 0, 1);
        const sc = U.lerp(2.4, 1, U.ease.outCubic(sk));
        ctx.save();
        ctx.translate(-cw / 2 + 210, ch / 2 - 96);
        ctx.rotate(-0.2);
        ctx.scale(sc, sc);
        ctx.globalAlpha = res.pass ? sk : 0;
        const col = res.pass ? (res.grade.startsWith('A') ? '#3f8f5e' : '#d8733a') : '#d23c34';
        ctx.strokeStyle = col;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, 64, 0, U.TAU);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 54, 0, U.TAU);
        ctx.stroke();
        A.text(ctx, res.pass ? res.grade : 'F', 0, 2, { size: 64, color: col, outline: 0 });
        ctx.restore();
        if (res.usedExt) {
          ctx.save();
          ctx.translate(-cw / 2 + 250, ch / 2 - 84);
          ctx.scale(sc, sc);
          ctx.rotate(-0.1);
          ctx.globalAlpha = sk * 0.95;
          A.rr(ctx, -190, -46, 380, 92, 8, 411, 1);
          A.fs(ctx, null, 6, '#d8733a');
          A.text(ctx, 'EXTENSION', 0, -6, { size: 52, color: '#d8733a', outline: 0 });
          A.text(ctx, 'quota missed · ' + res.extLeft + ' extension' + (res.extLeft === 1 ? '' : 's') + ' left', 0, 30, { size: 16, color: '#d8733a', outline: 0 });
          ctx.restore();
        } else if (!res.pass) {
          ctx.save();
          ctx.translate(-cw / 2 + 250, ch / 2 - 84);
          ctx.scale(sc, sc);
          ctx.rotate(-0.12);
          ctx.globalAlpha = sk * 0.9;
          A.rr(ctx, -170, -40, 340, 80, 8, 410, 1);
          A.fs(ctx, null, 6, '#d23c34');
          A.text(ctx, res.endless ? 'RUN OVER' : 'DEFERRED', 0, 4, { size: 60, color: '#d23c34', outline: 0 });
          ctx.restore();
        }
      }
      ctx.restore();
      if (st.stamped) {
        st.rects = options.map((o, i) => {
          const x = W / 2 + (i - (options.length - 1) / 2) * 340;
          const y = H - 40;
          const sel = st.sel === i;
          ctx.font = `${sel ? 30 : 26}px ${A.F.display}`;
          const w = ctx.measureText(o.label).width + 40;
          A.rr(ctx, x - w / 2, y - 24, w, 48, 12, 420 + i, 0.6);
          A.fs(ctx, sel ? '#f6c945' : '#fff6e6', 3);
          A.text(ctx, o.label, x, y + 1, { size: sel ? 26 : 22, color: A.INK, outline: 0 });
          return { x: x - w / 2, y: y - 24, w, h: 48 };
        });
      }
      FX.draw(ctx, 'top');
      Wd().drawPost(ctx, 0.35);
    };
    return st;
  };

  function saveBest(kind, score, nights) {
    const best = U.store.get('best', {});
    const key = kind + '_' + ((MB.run && MB.run.diff) || 'normal');
    let isNew = false;
    if (kind === 'campaign') {
      if (!best[key] || score > best[key]) {
        best[key] = score;
        isNew = true;
      }
    } else if (!best[key] || score > best[key].score) {
      best[key] = { score, nights };
      isNew = true;
    }
    U.store.set('best', best);
    return isNew;
  }

  // --- upgrade pick -------------------------------------------------------------------------------------
  S.upgrade = function () {
    const run = MB.run;
    const pool = MB.UPGRADES.filter((u) => (run.upgrades[u.id] || 0) < u.max);
    const choices = U.shuffle(pool).slice(0, 3);
    if (!choices.length) {
      run.nightIdx++;
      return S.intro(run);
    }
    const st = { name: 'upgrade', t: 0, sel: 1 % choices.length, rects: [] };
    st.update = (dt) => {
      st.t += dt;
      if (st.t < 0.5) return;
      if (menuInput(st, choices.length, { vertical: false })) {
        const u = choices[st.sel];
        run.upgrades[u.id] = (run.upgrades[u.id] || 0) + 1;
        Au.play('submit');
        run.nightIdx++;
        MB.go(S.intro(run));
      }
    };
    st.draw = (ctx) => {
      S.drawBackdrop(ctx, st.t, 0.6);
      A.text(ctx, 'PICK A STUDY HACK', W / 2, 80, { size: 46, color: '#ffe08a', outline: 10, shadow: 5 });
      A.text(ctx, 'It sticks with you for the rest of the run.', W / 2, 124, { size: 20, font: A.F.hand, color: '#e8d8ff', outline: 5 });
      const cw = 300, ch = 400, gap = 40;
      const x0 = W / 2 - (choices.length * cw + (choices.length - 1) * gap) / 2;
      st.rects = choices.map((u, i) => {
        const sel = st.sel === i;
        const appear = U.ease.outBack(U.clamp((st.t - i * 0.12) / 0.4, 0, 1));
        const x = x0 + i * (cw + gap), y = 170 + (sel ? -14 : 0) + (1 - appear) * 300;
        ctx.save();
        ctx.translate(x + cw / 2, y + ch / 2);
        ctx.rotate((i - 1) * 0.035 * (sel ? 0.3 : 1));
        A.rr(ctx, -cw / 2 + 6, -ch / 2 + 8, cw, ch, 10, 600 + i, 0.6);
        A.fs(ctx, 'rgba(10,5,20,0.5)', 0);
        A.rr(ctx, -cw / 2, -ch / 2, cw, ch, 10, 610 + i, 0.6);
        A.fs(ctx, '#fff8ec', sel ? 4.5 : 3, sel ? '#f6c945' : A.INK);
        // catalog card details
        ctx.strokeStyle = '#d23c34';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-cw / 2 + 12, -ch / 2 + 54);
        ctx.lineTo(cw / 2 - 12, -ch / 2 + 54);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(80,120,200,0.22)';
        ctx.lineWidth = 1.2;
        for (let ly = -ch / 2 + 84; ly < ch / 2 - 40; ly += 26) {
          ctx.beginPath();
          ctx.moveTo(-cw / 2 + 12, ly);
          ctx.lineTo(cw / 2 - 12, ly);
          ctx.stroke();
        }
        ctx.fillStyle = '#2b1b33';
        ctx.beginPath();
        ctx.arc(0, ch / 2 - 22, 9, 0, U.TAU);
        ctx.fill();
        A.text(ctx, 'STUDY HACK No. ' + (100 + MB.UPGRADES.indexOf(u)), -cw / 2 + 18, -ch / 2 + 32, { size: 14, font: A.F.display, color: '#d23c34', outline: 0, align: 'left' });
        const lvl = run.upgrades[u.id] || 0;
        if (u.max > 1) A.text(ctx, 'LV ' + (lvl + 1) + '/' + u.max, cw / 2 - 18, -ch / 2 + 32, { size: 14, color: A.C.inkSoft, outline: 0, align: 'right' });
        A.icon(ctx, u.icon, 0, -ch / 2 + 130, 44, sel ? '#ffe9a8' : '#f0e6d8');
        ctx.font = `28px ${A.F.display}`;
        const nl = A.wrap(ctx, u.name, cw - 40);
        nl.forEach((l, k) => A.text(ctx, l, 0, -ch / 2 + 214 + k * 30, { size: 28, color: A.INK, outline: 0 }));
        ctx.font = `21px ${A.F.hand}`;
        const dl = A.wrap(ctx, u.desc, cw - 50);
        dl.forEach((l, k) => A.text(ctx, l, 0, -ch / 2 + 220 + nl.length * 30 + 14 + k * 26, { size: 21, font: A.F.hand, color: A.C.inkSoft, outline: 0 }));
        ctx.restore();
        return { x, y, w: cw, h: ch };
      });
      A.text(ctx, '← → choose   ·   ' + HUD.keyName('act') + ' / click to take it', W / 2, H - 30, { size: 20, font: A.F.hand, color: '#fff6e6', outline: 4 });
      Wd().drawPost(ctx, 0.4);
    };
    return st;
  };

  // --- ending: decision day -------------------------------------------------------------------------------
  S.ending = function () {
    const run = MB.run;
    FX.clear();
    const isNew = saveBest('campaign', run.score);
    const people = [{ id: run.ch.id, name: run.ch.name, look: run.ch.look, college: run.ch.college, done: run.records.__me || 0, of: 5, you: true }];
    run.friends.forEach((f, i) => {
      const of = MB.NIGHTS.filter((n) => n.friends > i).length;
      people.push({ id: f.id, name: f.name, look: f.look, college: f.college, done: run.records[f.name] || 0, of });
    });
    for (const p of people) p.result = p.done >= Math.ceil(p.of * 0.6) ? 'ACCEPTED' : p.done >= 1 ? 'WAITLISTED' : 'DEFERRED';
    const accepted = people.filter((p) => p.result === 'ACCEPTED').length;
    const groupSize = people.length;
    // and one more letter, 39 years late
    people.push({ id: 'ghost', name: 'Dewey', ghost: true, college: 'Yale (Class of 1992)', result: 'ACCEPTED', note: 'fax received after 39 years' });
    const ranks = [[260000, 'Legend of Miller Branch'], [200000, 'Valedictorian Energy'], [140000, "Dean's List"], [80000, 'Solid Applicant'], [0, 'Late Bloomer']];
    const rank = ranks.find((r) => run.score >= r[0])[1];
    const st = { name: 'ending', t: 0, sel: 0, rects: [], opened: 0 };
    const options = [{ label: 'PLAY AGAIN', go: () => MB.go(S.difficulty('campaign')) }, { label: 'ROLLING ADMISSIONS', go: () => MB.go(S.difficulty('endless')) }, { label: 'TITLE', go: () => MB.go(S.title()) }];
    Au.Music.set({ song: 'triumph', intensity: 1, crunch: 0 });
    st.update = (dt) => {
      st.t += dt;
      FX.update(dt);
      const shouldOpen = Math.min(people.length, Math.floor((st.t - 1.2) / 1.1) + 1);
      while (st.opened < shouldOpen) {
        const p = people[st.opened];
        st.opened++;
        const x = slotX(st.opened - 1);
        if (p.result === 'ACCEPTED') {
          FX.confetti(x, 470, 50);
          Au.play('submit');
        } else Au.play('ding');
        Au.play('stamp');
      }
      if (st.opened >= people.length && st.t > 1.2 + people.length * 1.1 + 0.6) {
        if (!st.cheered) {
          st.cheered = true;
          Au.play('fanfare');
          for (let i = 0; i < 5; i++) FX.confetti(200 + i * 220, 720, 40, 1.5);
        }
        if (menuInput(st, options.length, { vertical: false })) {
          Au.play('confirm');
          FX.clear();
          options[st.sel].go();
        }
      } else if (In.hit('act') && st.t > 1) st.t = 1.2 + people.length * 1.1 + 0.7;
    };
    const slotX = (i) => W / 2 + (i - (people.length - 1) / 2) * 236;
    st.draw = (ctx) => {
      S.drawBackdrop(ctx, st.t, 0.55);
      A.text(ctx, 'DECEMBER 15 · DECISION DAY', W / 2, 66, { size: 44, color: '#ffe08a', outline: 10, shadow: 5 });
      A.text(ctx, 'Max, Akshan, Rishit and Bryan open their portals...', W / 2, 108, { size: 21, font: A.F.hand, color: '#e8d8ff', outline: 5 });
      people.forEach((p, i) => {
        const x = slotX(i), y = 360;
        const open = i < st.opened;
        if (p.ghost) {
          ctx.save();
          ctx.translate(x, y - 40);
          ctx.scale(1.3, 1.3);
          A.ghost(ctx, 0, 0, st.t, 0.85, false);
          ctx.restore();
        } else A.person(ctx, x, y - 30, p.look, { pose: open ? (p.result === 'ACCEPTED' ? 'cheer' : 'stand') : 'scroll', t: st.t + i, emo: open ? (p.result === 'ACCEPTED' ? 'happy' : p.result === 'WAITLISTED' ? 'neutral' : 'sad') : 'scroll', scale: 1.7 });
        A.text(ctx, p.name + (p.you ? ' (you)' : ''), x, y + 4, { size: 22, color: '#fff6e6', outline: 6 });
        if (open && st.t - (1.2 + i * 1.1) > 0.4) {
          const quote = p.ghost ? 'Class of 1992! Fashionably late.' : MB.VOICE[p.id].dd[p.result];
          A.bubble(ctx, x, y - 150, quote, { size: 15, maxW: 200 });
        }
        // letter
        ctx.save();
        ctx.translate(x, y + 120);
        ctx.rotate((i % 2 ? 1 : -1) * 0.03);
        A.rr(ctx, -100, -80, 200, 160, 8, 700 + i, 0.6);
        A.fs(ctx, open ? '#fffaf0' : '#efe2c8', 3);
        if (!open) {
          ctx.strokeStyle = A.INK;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-100, -78);
          ctx.lineTo(0, 0);
          ctx.lineTo(100, -78);
          ctx.stroke();
          ctx.fillStyle = '#c94f3d';
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, U.TAU);
          ctx.fill();
          ctx.stroke();
        } else {
          A.text(ctx, p.college, 0, -54, { size: 18, color: A.INK, outline: 0 });
          A.text(ctx, 'Office of Admissions', 0, -32, { size: 14, font: A.F.hand, color: A.C.inkSoft, outline: 0 });
          const col = p.result === 'ACCEPTED' ? '#3f8f5e' : p.result === 'WAITLISTED' ? '#d8733a' : '#d23c34';
          ctx.save();
          ctx.rotate(-0.14);
          A.rr(ctx, -84, -8, 168, 44, 6, 720 + i, 0.8);
          A.fs(ctx, null, 4, col);
          A.text(ctx, p.result, 0, 15, { size: 28, color: col, outline: 0 });
          ctx.restore();
          A.text(ctx, p.note || p.done + ' of ' + p.of + ' nights submitted', 0, 60, { size: 14, font: A.F.hand, color: A.C.inkSoft, outline: 0 });
        }
        ctx.restore();
      });
      if (st.cheered) {
        const done = HUD.card(ctx, W / 2 - 260, 556, 520, 92, -0.01, '#fff6e6', 800);
        A.text(ctx, 'FINAL SCORE ' + U.fmtNum(run.score), 0, -18, { size: 30, color: A.INK, outline: 0 });
        A.text(ctx, rank + ' · ' + accepted + '/' + groupSize + ' accepted' + (isNew ? ' · NEW BEST!' : ''), 0, 18, { size: 20, font: A.F.hand, color: isNew ? '#c94f3d' : A.C.inkSoft, outline: 0 });
        done();
        st.rects = options.map((o, i) => {
          const x = W / 2 + (i - 1) * 330, y = H - 30;
          const sel = st.sel === i;
          ctx.font = `${sel ? 24 : 21}px ${A.F.display}`;
          const w = ctx.measureText(o.label).width + 36;
          A.rr(ctx, x - w / 2, y - 20, w, 40, 10, 820 + i, 0.6);
          A.fs(ctx, sel ? '#f6c945' : '#fff6e6', 3);
          A.text(ctx, o.label, x, y + 1, { size: sel ? 24 : 21, color: A.INK, outline: 0 });
          return { x: x - w / 2, y: y - 20, w, h: 40 };
        });
      }
      FX.draw(ctx, 'top');
      Wd().drawPost(ctx, 0.35);
    };
    return st;
  };

  // --- how to play -----------------------------------------------------------------------------------------
  S.howto = function (back) {
    const st = { name: 'howto', t: 0 };
    st.update = (dt) => {
      st.t += dt;
      if (st.t > 0.3 && (In.hit('act') || In.hit('pause') || In.mouse.clicked)) {
        Au.play('back');
        MB.go(back());
      }
    };
    st.draw = (ctx) => {
      S.drawBackdrop(ctx, st.t, 0.7);
      const done = HUD.card(ctx, 70, 30, W - 140, H - 96, -0.006, '#fff8ec', 900);
      const L = -(W - 140) / 2 + 36, T = -(H - 96) / 2;
      A.text(ctx, 'HOW TO SURVIVE THE MILLER BRANCH', 0, T + 40, { size: 32, color: A.INK, outline: 0 });
      A.text(ctx, 'Five nights. One Nov 1 deadline. Get enough of your study group to hit SUBMIT before midnight, every night.', 0, T + 74, { size: 19, font: A.F.hand, color: A.C.inkSoft, outline: 0 });
      A.text(ctx, 'CONTROLS', L, T + 116, { size: 18, color: '#c94f3d', outline: 0, align: 'left' });
      const keys = [
        [['W', 'A', 'S', 'D'], 'or arrow keys: run around'],
        [['SHIFT'], 'DASH: flip roombas, bonk birds, tackle raccoons'],
        [['Q'], 'SHHH: silences talkers, gossips, toddlers, ghosts'],
        [['SPACE'], 'do things: confiscate, fix, grab, pep talk, sit'],
        [['←', '↑', '→'], 'while seated: pick your next essay line  ·  ↓ stand'],
        [['ESC'], 'pause    ·    M: mute'],
      ];
      keys.forEach((k, i) => {
        let x = L;
        const y = T + 152 + i * 50;
        k[0].forEach((kk) => {
          ctx.font = `13px ${A.F.display}`;
          const w = Math.max(24, ctx.measureText(kk).width + 14);
          HUD.keycap(ctx, kk, x + w / 2, y);
          x += w + 6;
        });
        A.text(ctx, k[1], L + 150, y + 1, { size: 19, font: A.F.hand, color: A.INK, outline: 0, align: 'left' });
      });
      A.text(ctx, 'Gamepad and touch work too.', L, T + 152 + 6 * 50, { size: 17, font: A.F.hand, color: A.C.inkSoft, outline: 0, align: 'left' });
      const tips = [
        ['FOCUS RING', 'Noise drains it. At zero, a friend wanders off to doomscroll. Walk up and pep talk them back.'],
        ['PROGRESS', 'Focused friends write faster. A full bar means SUBMITTED. Miss the nightly quota and you are deferred.'],
        ['YOUR ESSAY', 'Pick lines that match what the reader craves: HEART, WIT or GRIT. Once yours is in, keep writing to proofread for friends.'],
        ['GROOVE + FLOW', 'A calm library fills the Groove meter: everyone speeds up and points double. Fix things fast to build Flow.'],
        ['COFFEE + PIZZA', 'Coffee wakes nappers and boosts anyone, you included. Share pizza slices for instant focus.'],
      ];
      const RX = 40;
      tips.forEach((t, i) => {
        const y = T + 116 + i * 72;
        A.text(ctx, t[0], RX, y, { size: 18, color: '#c94f3d', outline: 0, align: 'left' });
        ctx.font = `17px ${A.F.hand}`;
        A.wrap(ctx, t[1], 470).forEach((l, k) => A.text(ctx, l, RX, y + 22 + k * 19, { size: 17, font: A.F.hand, color: A.INK, outline: 0, align: 'left' }));
      });
      // the usual suspects
      A.text(ctx, 'THE USUAL SUSPECTS', 0, T + 470, { size: 18, color: '#c94f3d', outline: 0 });
      const types = Object.keys(MB.EVENTS);
      types.forEach((ty, i) => {
        const meta = MB.EVENTS[ty];
        const col = i % 8, row = Math.floor(i / 8);
        const x = -((W - 140) / 2) + 90 + col * 138, y = T + 510 + row * 64;
        A.icon(ctx, meta.icon, x, y, 16, meta.good ? '#e8ffd8' : '#ffe6e0');
        A.text(ctx, meta.name, x, y + 27, { size: 13, font: A.F.display, color: A.INK, outline: 0 });
      });
      done();
      A.text(ctx, 'PRESS ' + HUD.keyName('act') + ' TO GO BACK', W / 2, H - 30, { size: 22, color: '#ffe08a', outline: 6 });
    };
    return st;
  };

  // --- settings ---------------------------------------------------------------------------------------------
  S.settings = function (back, overlayNight) {
    const st = { name: 'settings', t: 0, sel: 0, rects: [] };
    const s = Au.settings;
    const items = [
      { label: () => 'MUSIC  ' + bar(s.music), adj: (d) => { s.music = U.clamp(Math.round((s.music + d * 0.1) * 10) / 10, 0, 1); Au.applySettings(); } },
      { label: () => 'SOUND FX  ' + bar(s.sfx), adj: (d) => { s.sfx = U.clamp(Math.round((s.sfx + d * 0.1) * 10) / 10, 0, 1); Au.applySettings(); Au.play('coin'); } },
      { label: () => 'SCREEN SHAKE  ' + (MB.settings.shake ? 'ON' : 'OFF'), adj: () => { MB.settings.shake = !MB.settings.shake; U.store.set('settings', MB.settings); } },
      { label: () => 'MUTE ALL  ' + (s.muted ? 'ON' : 'OFF'), adj: () => Au.toggleMute() },
      { label: () => 'BACK', back: true },
    ];
    function bar(v) {
      return '■'.repeat(Math.round(v * 10)) + '□'.repeat(10 - Math.round(v * 10));
    }
    st.update = (dt) => {
      st.t += dt;
      if (In.hit('pause')) {
        Au.play('back');
        return MB.go(back());
      }
      const it = items[st.sel];
      if (In.hit('left') && it.adj) { it.adj(-1); Au.play('select'); }
      if (In.hit('right') && it.adj) { it.adj(1); Au.play('select'); }
      if (menuInput(st, items.length)) {
        if (it.back || items[st.sel].back) {
          Au.play('back');
          return MB.go(back());
        }
        items[st.sel].adj(1);
        Au.play('confirm');
      }
    };
    st.draw = (ctx) => {
      if (overlayNight) {
        overlayNight.draw(ctx);
        overlayFade(ctx, 0.7);
      } else S.drawBackdrop(ctx, st.t, 0.65);
      A.text(ctx, 'SETTINGS', W / 2, 120, { size: 52, color: '#ffe08a', outline: 10, shadow: 5 });
      st.rects = items.map((it, i) => {
        const y = 240 + i * 74;
        const sel = st.sel === i;
        A.text(ctx, it.label(), W / 2, y, { size: sel ? 34 : 28, color: sel ? '#ffe08a' : '#fbf3e4', outline: 7 });
        return { x: W / 2 - 260, y: y - 28, w: 520, h: 56 };
      });
      A.text(ctx, '↑ ↓ select  ·  ← → adjust  ·  ESC back', W / 2, H - 40, { size: 20, font: A.F.hand, color: '#fff6e6', outline: 4 });
    };
    return st;
  };

  // --- pause ------------------------------------------------------------------------------------------------
  S.pause = function (night) {
    const st = { name: 'pause', t: 0, sel: 0, rects: [], night };
    Au.Music.filter(700, 0.1);
    const resume = () => {
      Au.Music.filter(night.dark ? 500 : 9000, 0.1);
      MB.scene = night;
    };
    const items = [
      { label: 'RESUME', go: resume },
      { label: 'RESTART NIGHT', go: () => { Au.Music.filter(9000, 0.1); MB.restoreRun(night.run); MB.go(S.intro(night.run)); } },
      { label: 'HOW TO PLAY', go: () => MB.go(S.howto(() => st)) },
      { label: 'SETTINGS', go: () => MB.go(S.settings(() => st, night)) },
      { label: 'QUIT TO TITLE', go: () => { Au.Music.filter(9000, 0.1); Au.Music.duck(1); MB.go(S.title()); } },
    ];
    st.update = (dt) => {
      st.t += dt;
      if (In.hit('pause')) {
        Au.play('back');
        return resume();
      }
      if (menuInput(st, items.length)) {
        Au.play('confirm');
        items[st.sel].go();
      }
    };
    st.draw = (ctx) => {
      night.draw(ctx);
      overlayFade(ctx, 0.62);
      const done = HUD.card(ctx, W / 2 - 220, 120, 440, 470, 0.01, '#fff8ec', 950);
      A.text(ctx, 'PAUSED', 0, -180, { size: 50, color: A.INK, outline: 0 });
      A.text(ctx, night.def.day + ' · ' + U.clockText(night.minutes).hm + ' ' + U.clockText(night.minutes).ampm + ' · ' + night.diff.name, 0, -140, { size: 20, font: A.F.hand, color: A.C.inkSoft, outline: 0 });
      done();
      st.rects = items.map((it, i) => {
        const y = 300 + i * 56;
        const sel = st.sel === i;
        A.text(ctx, it.label, W / 2, y, { size: sel ? 32 : 26, color: sel ? '#c94f3d' : A.INK, outline: 0 });
        return { x: W / 2 - 180, y: y - 24, w: 360, h: 48 };
      });
    };
    return st;
  };
  MB.pause = (night) => {
    Au.play('back');
    MB.scene = S.pause(night);
  };
})(window.MB);
