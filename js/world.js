'use strict';
// The library floor: layout, collision, pathfinding, pre-rendered art, sky and lighting.
(function (MB) {
  const U = MB.U, A = MB.A;
  const Wd = (MB.World = {});
  const W = MB.W, H = MB.H;

  Wd.FLOOR_Y = 178;
  Wd.bounds = { x1: 22, x2: 1258, y1: 194, y2: 702 };
  Wd.entrance = { x: 660, y: 760, inside: { x: 660, y: 670 } };

  // --- layout -------------------------------------------------------------------
  // Furniture footprint (x, y, w, d) on the floor, h = visual height above it.
  Wd.tables = [
    { id: 'T1', x: 330, y: 292, w: 240, d: 56, h: 24 },
    { id: 'T2', x: 670, y: 292, w: 240, d: 56, h: 24 },
    { id: 'T3', x: 500, y: 474, w: 240, d: 56, h: 24 },
  ];
  Wd.seats = [];
  Wd.tables.forEach((t, ti) => {
    [60, 180].forEach((ox, si) => {
      Wd.seats.push({ id: t.id + (si ? 'R' : 'L'), table: t, x: t.x + ox, y: t.y - t.h + 4, side: si });
    });
  });
  Wd.playerSeat = Wd.seats.find((s) => s.id === 'T3L');

  Wd.shelves = [
    { id: 'S1', x: 990, y: 300, w: 250, d: 30, h: 80, label: 'FICTION A–G' },
    { id: 'S2', x: 990, y: 410, w: 250, d: 30, h: 80, label: 'TEST PREP' },
    { id: 'S3', x: 990, y: 520, w: 250, d: 30, h: 80, label: 'BIOGRAPHY' },
  ];
  Wd.stations = {
    printer: { x: 935, y: 202, w: 76, d: 34, h: 46, use: { x: 973, y: 262 } },
    vending: { x: 1170, y: 196, w: 72, d: 40, h: 118, use: { x: 1206, y: 262 } },
    router: { x: 34, y: 198, w: 58, d: 30, h: 68, use: { x: 66, y: 256 } },
    cart: { x: 34, y: 372, w: 70, d: 36, h: 38, use: { x: 72, y: 430 } },
    desk: { x: 860, y: 630, w: 250, d: 46, h: 40 },
    bookReturn: { x: 760, y: 676, w: 46, d: 24, h: 40 },
    breaker: { x: 172, y: 118, use: { x: 172, y: 214 } },
    alarm: { x: 1100, y: 128, use: { x: 1100, y: 214 } },
    rug: { x: 165, y: 588, rx: 112, ry: 70 },
    jail: { x: 905, y: 604 },
    dock: { x: 44, y: 690 },
  };
  Wd.decor = [
    { kind: 'plant', x: 612, y: 206, w: 40, d: 24, h: 0 },
    { kind: 'plant', x: 1132, y: 676, w: 40, d: 24, h: 0 },
    { kind: 'armchair', x: 236, y: 388, w: 56, d: 40, h: 34 },
    { kind: 'toychest', x: 286, y: 648, w: 62, d: 30, h: 28 },
  ];
  Wd.pois = [
    { x: 1206, y: 262 }, { x: 452, y: 214 }, { x: 800, y: 214 }, { x: 165, y: 586 },
    { x: 985, y: 700 }, { x: 264, y: 446 }, { x: 1120, y: 368 }, { x: 760, y: 610 },
  ];

  // Collision rects
  Wd.rects = [];
  const addRect = (r, pad = 0) => Wd.rects.push({ x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.d + pad * 2 });
  Wd.tables.forEach((t) => addRect(t));
  Wd.shelves.forEach((s) => addRect(s));
  ['printer', 'vending', 'router', 'cart', 'desk', 'bookReturn'].forEach((k) => addRect(Wd.stations[k]));
  Wd.decor.forEach((d) => addRect(d));
  Wd.seats.forEach((s) => Wd.rects.push({ x: s.x - 17, y: s.y - 24, w: 34, h: 22, seat: s }));

  Wd.blocked = function (x, y, r = 10) {
    const b = Wd.bounds;
    if (x < b.x1 || x > b.x2) return true;
    if (y < b.y1) return true;
    if (y > b.y2 && !(x > 610 && x < 710)) return true;
    for (const R of Wd.rects) if (U.circleRect(x, y, r, R.x, R.y, R.w, R.h)) return true;
    return false;
  };

  // Move a circle with axis-separated collision; returns true if it hit something.
  Wd.moveCircle = function (o, dx, dy, r = 11, allowExit = false) {
    let hit = false;
    const test = (x, y) => {
      const b = Wd.bounds;
      if (x < b.x1 || x > b.x2 || y < b.y1) return true;
      if (y > b.y2 && !(allowExit && x > 610 && x < 710)) return true;
      for (const R of Wd.rects) if (U.circleRect(x, y, r, R.x, R.y, R.w, R.h)) return true;
      return false;
    };
    if (dx) {
      if (!test(o.x + dx, o.y)) o.x += dx;
      else hit = true;
    }
    if (dy) {
      if (!test(o.x, o.y + dy)) o.y += dy;
      else hit = true;
    }
    return hit;
  };

  // --- pathfinding grid --------------------------------------------------------------
  const CELL = 16, GW = Math.ceil(W / CELL), GH = Math.ceil(780 / CELL);
  const grid = new Uint8Array(GW * GH);
  Wd.buildGrid = function () {
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        const x = gx * CELL + CELL / 2, y = gy * CELL + CELL / 2;
        let b = false;
        if (x < Wd.bounds.x1 || x > Wd.bounds.x2 || y < Wd.bounds.y1) b = true;
        else if (y > Wd.bounds.y2 && !(x > 616 && x < 704)) b = true;
        else for (const R of Wd.rects) if (U.circleRect(x, y, 13, R.x, R.y, R.w, R.h)) { b = true; break; }
        grid[gy * GW + gx] = b ? 1 : 0;
      }
    }
  };
  const cellBlocked = (gx, gy) => gx < 0 || gy < 0 || gx >= GW || gy >= GH || grid[gy * GW + gx] === 1;
  function nearestFree(gx, gy) {
    if (!cellBlocked(gx, gy)) return [gx, gy];
    for (let r = 1; r < 8; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        if (!cellBlocked(gx + dx, gy + dy)) return [gx + dx, gy + dy];
      }
    }
    return [gx, gy];
  }
  Wd.lineFree = function (x1, y1, x2, y2) {
    const d = U.dist(x1, y1, x2, y2);
    const n = Math.ceil(d / 8);
    for (let i = 1; i < n; i++) {
      const x = U.lerp(x1, x2, i / n), y = U.lerp(y1, y2, i / n);
      if (cellBlocked(Math.floor(x / CELL), Math.floor(y / CELL))) return false;
    }
    return true;
  };
  Wd.findPath = function (sx, sy, tx, ty) {
    const [ax, ay] = nearestFree(Math.floor(sx / CELL), Math.floor(sy / CELL));
    const [bx, by] = nearestFree(Math.floor(tx / CELL), Math.floor(ty / CELL));
    const N = GW * GH;
    const g = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const heap = [];
    const push = (i, f) => {
      heap.push([f, i]);
      let k = heap.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (heap[p][0] <= heap[k][0]) break;
        [heap[p], heap[k]] = [heap[k], heap[p]];
        k = p;
      }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let k = 0;
        for (;;) {
          const l = 2 * k + 1, r = l + 1;
          let m = k;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === k) break;
          [heap[m], heap[k]] = [heap[k], heap[m]];
          k = m;
        }
      }
      return top;
    };
    const h = (x, y) => {
      const dx = Math.abs(x - bx), dy = Math.abs(y - by);
      return dx + dy + (1.414 - 2) * Math.min(dx, dy);
    };
    const start = ay * GW + ax, goal = by * GW + bx;
    g[start] = 0;
    push(start, h(ax, ay));
    let found = false, iter = 0;
    while (heap.length && iter++ < 6000) {
      const [, cur] = pop();
      if (cur === goal) { found = true; break; }
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cx = cur % GW, cy = (cur / GW) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (cellBlocked(nx, ny)) continue;
        if (dx && dy && (cellBlocked(cx + dx, cy) || cellBlocked(cx, cy + dy))) continue;
        const ni = ny * GW + nx;
        const ng = g[cur] + (dx && dy ? 1.414 : 1);
        if (ng < g[ni]) {
          g[ni] = ng;
          came[ni] = cur;
          push(ni, ng + h(nx, ny));
        }
      }
    }
    if (!found) return [{ x: tx, y: ty }];
    const cells = [];
    for (let c = goal; c !== -1; c = came[c]) cells.push(c);
    cells.reverse();
    const pts = cells.map((c) => ({ x: (c % GW) * CELL + CELL / 2, y: ((c / GW) | 0) * CELL + CELL / 2 }));
    pts.push({ x: tx, y: ty });
    // string-pull
    const out = [];
    let anchor = { x: sx, y: sy };
    let i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !Wd.lineFree(anchor.x, anchor.y, pts[j].x, pts[j].y)) j--;
      out.push(pts[j]);
      anchor = pts[j];
      i = j + 1;
    }
    return out;
  };
  Wd.randomFloorPoint = function (area) {
    for (let k = 0; k < 60; k++) {
      const x = area ? U.rand(area.x1, area.x2) : U.rand(60, 1220);
      const y = area ? U.rand(area.y1, area.y2) : U.rand(215, 690);
      if (!cellBlocked(Math.floor(x / CELL), Math.floor(y / CELL)) && !Wd.blocked(x, y, 14)) return { x, y };
    }
    return { x: 640, y: 420 };
  };

  // --- sprites ----------------------------------------------------------------------
  const RS = 2; // sprite render scale
  Wd.makeSprite = function (bx, by, bw, bh, fn, variants = 3) {
    const cs = [];
    const save = A.boil;
    for (let v = 0; v < variants; v++) {
      A.boil = v * 7 + 3;
      const c = document.createElement('canvas');
      c.width = Math.ceil(bw * RS);
      c.height = Math.ceil(bh * RS);
      const cx = c.getContext('2d');
      cx.scale(RS, RS);
      cx.translate(-bx, -by);
      fn(cx);
      cs.push(c);
    }
    A.boil = save;
    return { cs, bx, by, bw, bh };
  };
  Wd.drawSprite = function (ctx, spr, x, y, ox = 0, oy = 0) {
    const c = spr.cs[Math.floor(A.boil / 1) % spr.cs.length];
    ctx.drawImage(c, x + spr.bx + ox, y + spr.by + oy, spr.bw, spr.bh);
  };

  function woodGrain(ctx, x, y, w, h, base, rnd) {
    ctx.fillStyle = base;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = A.shade(base, -0.18);
    ctx.lineWidth = 1;
    for (let i = 0; i < h / 6; i++) {
      const yy = y + 3 + i * 6 + rnd() * 3;
      ctx.beginPath();
      ctx.moveTo(x + 2, yy);
      for (let xx = x; xx < x + w; xx += 20) ctx.lineTo(xx + 20, yy + Math.sin(xx * 0.05 + i) * 1.5);
      ctx.stroke();
    }
  }

  function drawTable(ctx, t) {
    const rnd = U.rng(t.x * 7 + 3);
    const w = t.w, d = t.d, h = t.h;
    // floor shadow
    ctx.fillStyle = 'rgba(35,15,45,0.22)';
    A.rr(ctx, 4, 6, w - 8, d - 2, 10, 1, 0.4);
    ctx.fill();
    // legs
    for (const lx of [12, w - 22]) {
      A.rr(ctx, lx, -h + d + 4, 10, h + 2, 2, lx, 0.5);
      A.fs(ctx, A.C.woodDark, 2.5);
    }
    // slab front
    A.rr(ctx, -2, -h + d - 4, w + 4, 11, 4, 9, 0.6);
    A.fs(ctx, A.C.woodDark, 2.8);
    // top
    A.shape(ctx, () => A.rr(ctx, -2, -h, w + 4, d, 8, 10, 0.7), A.C.wood, (c) => {
      woodGrain(c, -2, -h, w + 4, d, A.C.wood, rnd);
      c.fillStyle = 'rgba(255,240,210,0.35)';
      c.fillRect(-2, -h, w + 4, 4);
      c.fillStyle = 'rgba(80,30,40,0.15)';
      c.fillRect(-2, -h + d - 8, w + 4, 8);
    }, 3);
    // decor: papers + pencils + books between seats
    const mid = w / 2;
    ctx.save();
    ctx.translate(mid - 34, -h + 30);
    ctx.rotate(-0.15);
    A.rr(ctx, -12, -8, 24, 17, 1, 20, 0.4);
    A.fs(ctx, '#fbf3e4', 1.8);
    ctx.strokeStyle = '#a9b8d9';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-9, -4 + i * 3.5);
      ctx.lineTo(9, -4 + i * 3.5);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.translate(mid + 34, -h + 34);
    ctx.rotate(0.5);
    A.rr(ctx, -12, -2, 24, 4, 2, 21, 0.3);
    A.fs(ctx, A.C.yellow, 1.6);
    ctx.restore();
    if (rnd() < 0.7) A.bookPile(ctx, w - 18, -h + 40, 2 + Math.floor(rnd() * 2), t.x);
  }

  function drawShelf(ctx, s) {
    const rnd = U.rng(s.x + s.y * 13);
    const w = s.w, d = s.d, h = s.h;
    ctx.fillStyle = 'rgba(35,15,45,0.25)';
    ctx.fillRect(4, d - 6, w - 8, 12);
    // front frame
    A.shape(ctx, () => A.rr(ctx, 0, -h + d, w, h, 4, 30, 0.6), A.C.woodDark, null, 3);
    // inner cavity rows
    const rows = 3, rowH = (h - 12) / rows;
    for (let r = 0; r < rows; r++) {
      const ry = -h + d + 5 + r * rowH;
      ctx.fillStyle = '#3a2232';
      ctx.fillRect(7, ry, w - 14, rowH - 4);
      // books
      let x = 9;
      while (x < w - 12) {
        const bw = 5 + Math.floor(rnd() * 7);
        const bh = rowH - 6 - Math.floor(rnd() * 7);
        const col = A.C.books[Math.floor(rnd() * A.C.books.length)];
        const lean = rnd() < 0.08 && x < w - 30;
        ctx.save();
        ctx.translate(x, ry + rowH - 4);
        if (lean) ctx.rotate(0.25);
        ctx.fillStyle = col;
        ctx.fillRect(0, -bh, bw, bh);
        ctx.strokeStyle = A.INK;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(0, -bh, bw, bh);
        if (rnd() < 0.5) {
          ctx.fillStyle = rnd() < 0.5 ? '#f6c945' : '#fbf3e4';
          ctx.fillRect(0.8, -bh + 3, bw - 1.6, 1.6);
          ctx.fillRect(0.8, -6, bw - 1.6, 1.4);
        }
        ctx.restore();
        x += bw + (lean ? 6 : 0.6);
        if (rnd() < 0.05) x += 8;
      }
      // shelf plank
      A.rr(ctx, 4, ry + rowH - 5, w - 8, 5, 1, r + 31, 0.4);
      A.fs(ctx, A.C.wood, 2);
    }
    // top
    A.shape(ctx, () => A.rr(ctx, -3, -h, w + 6, d, 5, 32, 0.6), A.C.wood, (c) => {
      woodGrain(c, -3, -h, w + 6, d, A.C.wood, rnd);
      c.fillStyle = 'rgba(255,240,210,0.3)';
      c.fillRect(-3, -h, w + 6, 4);
    }, 3);
    // end-cap label
    A.rr(ctx, w / 2 - 44, -h + d - 4, 88, 14, 3, 33, 0.4);
    A.fs(ctx, '#fbf3e4', 2);
    ctx.fillStyle = A.INK;
    ctx.font = `11px ${A.F.display}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.label, w / 2, -h + d + 3);
  }

  function drawPrinter(ctx, s) {
    const w = s.w, d = s.d, h = s.h;
    ctx.fillStyle = 'rgba(35,15,45,0.25)';
    ctx.fillRect(2, d - 6, w - 4, 10);
    A.shape(ctx, () => A.rr(ctx, 0, -h + d, w, h, 5, 40, 0.6), '#d9d2c3', (c) => {
      c.fillStyle = '#bdb4a3';
      c.fillRect(w - 18, -h + d, 20, h);
      c.strokeStyle = '#9b927f';
      c.lineWidth = 2;
      for (let i = 0; i < 2; i++) {
        c.beginPath();
        c.moveTo(6, -h + d + 16 + i * 12);
        c.lineTo(w - 22, -h + d + 16 + i * 12);
        c.stroke();
      }
    }, 3);
    A.shape(ctx, () => A.rr(ctx, -2, -h, w + 4, d + 2, 5, 41, 0.6), '#ebe5d8', null, 3);
    // panel
    A.rr(ctx, w - 30, -h + 6, 22, 12, 2, 42, 0.3);
    A.fs(ctx, '#3b4a5c', 2);
    // output tray paper
    A.rr(ctx, 6, -h + 8, 34, 18, 1, 43, 0.4);
    A.fs(ctx, '#fff', 2);
    // sticky note
    ctx.save();
    ctx.translate(16, -h + d + 22);
    ctx.rotate(-0.12);
    ctx.fillStyle = '#f6e46a';
    ctx.fillRect(-8, -7, 16, 14);
    ctx.fillStyle = A.INK;
    ctx.font = `7px ${A.F.hand}`;
    ctx.textAlign = 'center';
    ctx.fillText('be', 0, -2);
    ctx.fillText('nice', 0, 4);
    ctx.restore();
  }

  function drawVending(ctx, s) {
    const w = s.w, d = s.d, h = s.h;
    ctx.fillStyle = 'rgba(35,15,45,0.3)';
    ctx.fillRect(2, d - 6, w - 2, 10);
    A.shape(ctx, () => A.rr(ctx, 0, -h + d, w, h, 6, 50, 0.6), '#c8414a', (c) => {
      c.fillStyle = '#a5323c';
      c.fillRect(w - 14, -h + d, 16, h);
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.fillRect(4, -h + d, 3, h);
    }, 3);
    // header
    A.rr(ctx, 5, -h + d + 4, w - 10, 14, 3, 51, 0.4);
    A.fs(ctx, '#fff2c8', 2);
    ctx.fillStyle = '#c8414a';
    ctx.font = `10px ${A.F.display}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('COFFEE+SNAX', w / 2, -h + d + 11.5);
    // glass
    A.rr(ctx, 6, -h + d + 22, w - 26, 70, 3, 52, 0.4);
    A.fs(ctx, '#1d2a3a', 2.5);
    const cols = ['#f6c945', '#6cbf6a', '#ef7fa6', '#4a7fd1', '#f08a3c', '#fbf3e4', '#8a5ac2'];
    const rnd = U.rng(77);
    for (let r = 0; r < 4; r++) {
      for (let i = 0; i < 4; i++) {
        const ix = 10 + i * 11, iy = -h + d + 28 + r * 17;
        ctx.fillStyle = r === 0 ? '#fff6e6' : cols[Math.floor(rnd() * cols.length)];
        if (r === 0) {
          ctx.fillRect(ix + 1, iy, 7, 10);
          ctx.fillStyle = '#7a4b2a';
          ctx.fillRect(ix + 1, iy + 3, 7, 3);
        } else ctx.fillRect(ix, iy, 9, 11);
        ctx.strokeStyle = A.INK;
        ctx.lineWidth = 1;
        ctx.strokeRect(ix + (r === 0 ? 1 : 0), iy, r === 0 ? 7 : 9, r === 0 ? 10 : 11);
      }
      ctx.fillStyle = '#9aa7b8';
      ctx.fillRect(8, -h + d + 39 + r * 17, w - 30, 1.5);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(10, -h + d + 24);
    ctx.lineTo(24, -h + d + 24);
    ctx.lineTo(12, -h + d + 90);
    ctx.lineTo(8, -h + d + 90);
    ctx.fill();
    // keypad
    A.rr(ctx, w - 18, -h + d + 26, 12, 22, 2, 53, 0.3);
    A.fs(ctx, '#2b2733', 2);
    ctx.fillStyle = '#6cf0a0';
    ctx.fillRect(w - 16, -h + d + 28, 8, 4);
    // pickup slot
    A.rr(ctx, 8, -h + d + 98, w - 28, 12, 2, 54, 0.3);
    A.fs(ctx, '#2b2733', 2);
    // top
    A.shape(ctx, () => A.rr(ctx, -1, -h, w + 2, d, 5, 55, 0.5), '#9e2f39', null, 3);
  }

  function drawRouter(ctx, s) {
    const w = s.w, d = s.d, h = s.h;
    ctx.fillStyle = 'rgba(35,15,45,0.25)';
    ctx.fillRect(2, d - 6, w - 4, 10);
    A.shape(ctx, () => A.rr(ctx, 0, -h + d, w, h, 4, 60, 0.6), '#3a3644', (c) => {
      c.fillStyle = '#2b2733';
      c.fillRect(w - 12, -h + d, 14, h);
    }, 3);
    for (let i = 0; i < 3; i++) {
      A.rr(ctx, 5, -h + d + 6 + i * 19, w - 18, 14, 2, 61 + i, 0.3);
      A.fs(ctx, '#55506a', 2);
    }
    A.shape(ctx, () => A.rr(ctx, -1, -h, w + 2, d, 4, 64, 0.5), '#4a4558', null, 3);
    // antennae
    ctx.strokeStyle = A.INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(14, -h + 10);
    ctx.lineTo(8, -h - 14);
    ctx.moveTo(w - 16, -h + 10);
    ctx.lineTo(w - 10, -h - 14);
    ctx.stroke();
    // sticky label
    ctx.fillStyle = '#fbf3e4';
    ctx.fillRect(8, -h + 6, 30, 10);
    ctx.fillStyle = A.INK;
    ctx.font = `8px ${A.F.display}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('WI-FI', 11, -h + 11.5);
  }

  function drawCart(ctx, s) {
    const w = s.w, d = s.d, h = s.h;
    ctx.fillStyle = 'rgba(35,15,45,0.25)';
    ctx.fillRect(2, d - 6, w - 4, 10);
    // frame
    A.rr(ctx, 2, -h + d + 6, w - 4, h - 10, 3, 70, 0.6);
    A.fs(ctx, '#6b7a8f', 3);
    for (const wx of [10, w - 10]) {
      A.el(ctx, wx, d - 1, 5, 5, 71 + wx, 0.3, 7);
      A.fs(ctx, '#2b2733', 2);
    }
    // stacked spare buckets
    A.bucket(ctx, 22, -h + d + 8, 0.95);
    A.bucket(ctx, 22, -h + d + 2, 0.95);
    // mop
    ctx.strokeStyle = A.INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(w - 18, -h + d + 4);
    ctx.lineTo(w - 10, -h - 40);
    ctx.stroke();
    ctx.strokeStyle = '#d9a63e';
    ctx.lineWidth = 2;
    ctx.stroke();
    A.blob(ctx, w - 18, -h + d + 2, 9, 6, 72, 0.25, 8);
    A.fs(ctx, '#e8dcc0', 2.2);
    // spray bottle
    A.rr(ctx, 40, -h + d - 10, 9, 16, 2, 73, 0.3);
    A.fs(ctx, '#6cbf6a', 2);
    ctx.fillStyle = '#fbf3e4';
    ctx.fillRect(39, -h + d - 18, 10, 8);
    ctx.strokeRect(39, -h + d - 18, 10, 8);
  }

  function drawDesk(ctx, s) {
    const w = s.w, d = s.d, h = s.h;
    ctx.fillStyle = 'rgba(35,15,45,0.25)';
    ctx.fillRect(4, d - 6, w - 8, 12);
    A.shape(ctx, () => A.rr(ctx, 0, -h + d, w, h, 5, 80, 0.6), '#7c4a2e', (c) => {
      c.strokeStyle = '#64391f';
      c.lineWidth = 3;
      for (let x = 14; x < w; x += 18) {
        c.beginPath();
        c.moveTo(x, -h + d + 6);
        c.lineTo(x, d - 4);
        c.stroke();
      }
    }, 3);
    A.shape(ctx, () => A.rr(ctx, -4, -h, w + 8, d, 7, 81, 0.6), '#e2c9a0', (c) => {
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.fillRect(-4, -h, w + 8, 4);
    }, 3);
    // sign
    A.rr(ctx, w / 2 - 50, -h + d - 2, 100, 18, 4, 82, 0.4);
    A.fs(ctx, '#2f5d8a', 2.4);
    ctx.fillStyle = '#fbf3e4';
    ctx.font = `12px ${A.F.display}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CHECK OUT', w / 2, -h + d + 7);
    // monitor back
    A.rr(ctx, w / 2 + 12, -h - 18, 40, 28, 3, 83, 0.4);
    A.fs(ctx, '#3a3644', 2.4);
    // phone jail basket
    A.rr(ctx, 24, -h + 4, 42, 22, 4, 84, 0.4);
    A.fs(ctx, '#d8734a', 2.4);
    ctx.strokeStyle = '#a24f2f';
    ctx.lineWidth = 1.5;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(24 + i * 8.4, -h + 6);
      ctx.lineTo(24 + i * 8.4, -h + 24);
      ctx.stroke();
    }
    ctx.fillStyle = '#fbf3e4';
    ctx.fillRect(28, -h + 10, 34, 10);
    ctx.fillStyle = A.INK;
    ctx.font = `8px ${A.F.display}`;
    ctx.fillText('PHONE JAIL', 45, -h + 15.5);
    A.bookPile(ctx, w - 30, -h + 26, 3, 85);
    // bell
    A.el(ctx, w / 2 - 20, -h + 22, 7, 5, 86, 0.3, 8);
    A.fs(ctx, A.C.brass, 2);
  }

  function drawBookReturn(ctx, s) {
    const w = s.w, d = s.d, h = s.h;
    ctx.fillStyle = 'rgba(35,15,45,0.25)';
    ctx.fillRect(2, d - 6, w - 4, 10);
    A.shape(ctx, () => A.rr(ctx, 0, -h + d, w, h, 4, 90, 0.6), '#2f5d8a', (c) => {
      c.fillStyle = '#244a70';
      c.fillRect(w - 10, -h + d, 12, h);
    }, 3);
    A.shape(ctx, () => A.rr(ctx, -2, -h, w + 4, d, 6, 91, 0.5), '#3d6f9e', null, 3);
    A.rr(ctx, 7, -h + d + 6, w - 14, 6, 2, 92, 0.3);
    A.fs(ctx, '#1a1622', 2);
    ctx.fillStyle = '#fbf3e4';
    ctx.font = `8px ${A.F.display}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BOOK', w / 2, -h + d + 21);
    ctx.fillText('RETURN', w / 2, -h + d + 30);
  }

  function drawPlant(ctx, s) {
    const cx = s.w / 2;
    ctx.fillStyle = 'rgba(35,15,45,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, s.d - 2, 22, 7, 0, 0, U.TAU);
    ctx.fill();
    const leaves = [[-26, -58, -0.9], [24, -62, 0.8], [-14, -84, -0.3], [14, -88, 0.3], [0, -70, 0], [-30, -36, -1.2], [30, -40, 1.2]];
    leaves.forEach(([lx, ly, rot], i) => {
      ctx.strokeStyle = A.INK;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx, s.d - 22);
      ctx.quadraticCurveTo(cx + lx * 0.3, ly * 0.4 + s.d - 20, cx + lx * 0.8, ly + s.d);
      ctx.stroke();
      ctx.save();
      ctx.translate(cx + lx, ly + s.d);
      ctx.rotate(rot);
      A.shape(ctx, () => A.blob(ctx, 0, 0, 13, 19, 100 + i, 0.12, 9), i % 2 ? '#3f8f5e' : '#2f7a5a', (c) => {
        c.strokeStyle = 'rgba(255,255,255,0.3)';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(0, -16);
        c.lineTo(0, 16);
        for (let k = -2; k <= 2; k++) {
          c.moveTo(0, k * 6);
          c.lineTo(9, k * 6 - 4);
          c.moveTo(0, k * 6);
          c.lineTo(-9, k * 6 - 4);
        }
        c.stroke();
      }, 2.4);
      ctx.restore();
    });
    A.shape(ctx, () => A.poly(ctx, [[cx - 18, s.d - 30], [cx + 18, s.d - 30], [cx + 14, s.d], [cx - 14, s.d]], 110, 0.6), '#d8734a', (c) => {
      c.fillStyle = '#b85a3a';
      c.fillRect(cx + 4, s.d - 32, 20, 34);
      c.fillStyle = '#c4643f';
      c.fillRect(cx - 20, s.d - 30, 40, 6);
    }, 2.8);
  }

  function drawArmchair(ctx, s) {
    const w = s.w, d = s.d, h = s.h;
    ctx.fillStyle = 'rgba(35,15,45,0.25)';
    ctx.fillRect(2, d - 6, w - 4, 10);
    const col = '#d98a3a';
    A.shape(ctx, () => A.rr(ctx, 4, -h - 18, w - 8, 34, 10, 120, 0.7), col, (c) => {
      c.fillStyle = A.shade(col, -0.25);
      c.fillRect(w - 18, -h - 20, 20, 40);
    }, 3);
    A.shape(ctx, () => A.rr(ctx, 4, -h + d - 22, w - 8, h + 4, 8, 121, 0.7), A.shade(col, -0.1), null, 3);
    A.rr(ctx, 9, -h + d - 30, w - 18, 14, 6, 122, 0.6);
    A.fs(ctx, A.shade(col, 0.15), 2.5);
    for (const ax of [-2, w - 12]) {
      A.rr(ctx, ax, -h + d - 36, 14, h + 18, 6, 123 + ax, 0.6);
      A.fs(ctx, col, 3);
    }
    // book left on the seat
    ctx.save();
    ctx.translate(w / 2, -h + d - 24);
    ctx.rotate(0.2);
    A.rr(ctx, -9, -4, 18, 7, 1, 124, 0.3);
    A.fs(ctx, '#4a7fd1', 2);
    ctx.restore();
  }

  function drawToyChest(ctx, s) {
    const w = s.w, d = s.d, h = s.h;
    ctx.fillStyle = 'rgba(35,15,45,0.25)';
    ctx.fillRect(2, d - 6, w - 4, 10);
    A.shape(ctx, () => A.rr(ctx, 0, -h + d, w, h, 5, 130, 0.6), '#4a7fd1', (c) => {
      c.fillStyle = '#f6c945';
      A.star(c, 16, -h + d + 14, 7, 3);
      c.fill();
      c.fillStyle = '#ef7fa6';
      c.beginPath();
      c.arc(42, -h + d + 14, 6, 0, U.TAU);
      c.fill();
    }, 3);
    A.shape(ctx, () => A.rr(ctx, -2, -h, w + 4, d, 6, 131, 0.5), '#6a96de', null, 3);
    // blocks on top
    const L = ['A', 'B', 'C'];
    L.forEach((ch, i) => {
      A.rr(ctx, 8 + i * 16, -h + 4 - (i === 1 ? 10 : 0), 14, 14, 2, 132 + i, 0.3);
      A.fs(ctx, ['#e0524a', '#6cbf6a', '#f6c945'][i], 2);
      ctx.fillStyle = '#fff';
      ctx.font = `10px ${A.F.display}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ch, 15 + i * 16, -h + 11.5 - (i === 1 ? 10 : 0));
    });
  }

  // Build sortable static props
  Wd.props = [];
  Wd.buildSprites = function () {
    Wd.props = [];
    Wd.tables.forEach((t) => {
      t.spr = Wd.makeSprite(-8, -t.h - 8, t.w + 16, t.d + t.h + 20, (c) => drawTable(c, t));
    });
    Wd.shelves.forEach((s) => {
      s.spr = Wd.makeSprite(-8, -s.h - 6, s.w + 16, s.d + s.h + 16, (c) => drawShelf(c, s), 2);
      Wd.props.push({ o: s, sortY: s.y + s.d, shake: 0 });
    });
    const st = Wd.stations;
    const mk = (o, fn, extraTop = 10, v = 3) => {
      o.spr = Wd.makeSprite(-10, -o.h - extraTop, o.w + 20, o.d + o.h + extraTop + 12, (c) => fn(c, o), v);
      Wd.props.push({ o, sortY: o.y + o.d, shake: 0 });
    };
    mk(st.printer, drawPrinter);
    mk(st.vending, drawVending);
    mk(st.router, drawRouter, 24);
    mk(st.cart, drawCart, 50);
    mk(st.desk, drawDesk, 30);
    mk(st.bookReturn, drawBookReturn);
    Wd.decor.forEach((d) => {
      if (d.kind === 'plant') {
        d.spr = Wd.makeSprite(-40, -110, d.w + 80, d.d + 120, (c) => drawPlant(c, d));
      } else if (d.kind === 'armchair') mk(d, drawArmchair, 30);
      else if (d.kind === 'toychest') mk(d, drawToyChest, 24);
      if (d.kind === 'plant') Wd.props.push({ o: d, sortY: d.y + d.d, shake: 0 });
    });
  };

  // --- background (floor + walls) -------------------------------------------------------
  Wd.bg = [];
  function drawFloor(ctx) {
    const rnd = U.rng(1234);
    const FY = Wd.FLOOR_Y;
    // planks
    const ph = 26;
    for (let y = FY; y < H; y += ph) {
      let x = -rnd() * 120;
      while (x < W) {
        const len = 110 + rnd() * 140;
        const base = ['#b97a46', '#b0703f', '#c3854f', '#a8693b'][Math.floor(rnd() * 4)];
        ctx.fillStyle = base;
        ctx.fillRect(x, y, len, ph);
        ctx.strokeStyle = 'rgba(90,40,30,0.25)';
        ctx.lineWidth = 1;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          const yy = y + 5 + k * 7 + rnd() * 3;
          ctx.moveTo(x + 4, yy);
          ctx.bezierCurveTo(x + len * 0.3, yy + rnd() * 3 - 1.5, x + len * 0.6, yy - rnd() * 3 + 1.5, x + len - 4, yy);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(60,25,30,0.55)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, len, ph);
        x += len;
      }
    }
    // study carpet
    const cx0 = 300, cy0 = 228, cw = 640, ch = 336;
    ctx.save();
    A.rr(ctx, cx0, cy0, cw, ch, 18, 900, 1.2);
    ctx.fillStyle = '#2f5a66';
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = '#3a6c78';
    for (let gy = 0; gy < ch; gy += 48) {
      for (let gx = 0; gx < cw; gx += 48) {
        const x = cx0 + gx + ((gy / 48) % 2 ? 24 : 0), y = cy0 + gy;
        ctx.beginPath();
        ctx.moveTo(x + 24, y + 6);
        ctx.lineTo(x + 42, y + 24);
        ctx.lineTo(x + 24, y + 42);
        ctx.lineTo(x + 6, y + 24);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(216,162,74,0.55)';
        ctx.beginPath();
        ctx.arc(x + 24, y + 24, 3, 0, U.TAU);
        ctx.fill();
        ctx.fillStyle = '#3a6c78';
      }
    }
    // speckle
    for (let i = 0; i < 1500; i++) {
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(cx0 + rnd() * cw, cy0 + rnd() * ch, 2, 2);
    }
    ctx.restore();
    A.rr(ctx, cx0 + 10, cy0 + 10, cw - 20, ch - 20, 12, 901, 1);
    ctx.strokeStyle = '#d8a24a';
    ctx.lineWidth = 4;
    ctx.stroke();
    A.rr(ctx, cx0, cy0, cw, ch, 18, 900, 1.2);
    A.fs(ctx, null, 3.5);

    // kids rug: rainbow rings
    const rug = Wd.stations.rug;
    const ringCols = ['#e0524a', '#f08a3c', '#f6c945', '#6cbf6a', '#4a7fd1', '#8a5ac2'];
    ringCols.forEach((c, i) => {
      const k = 1 - i * 0.15;
      A.el(ctx, rug.x, rug.y, rug.rx * k, rug.ry * k, 910 + i, 1, 16);
      A.fs(ctx, c, i === 0 ? 3.5 : 0);
    });
    A.el(ctx, rug.x, rug.y, rug.rx * 0.12, rug.ry * 0.12, 920, 0.5, 10);
    A.fs(ctx, '#fbf3e4', 2);
    ctx.save();
    ctx.font = `20px ${A.F.display}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    'STORYTIME'.split('').forEach((ch, i, arr) => {
      const a = Math.PI * 1.15 + (i / (arr.length - 1)) * Math.PI * 0.7;
      ctx.save();
      ctx.translate(rug.x + Math.cos(a) * rug.rx * 0.6, rug.y + Math.sin(a) * rug.ry * 0.6);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = A.INK;
      ctx.lineWidth = 3;
      ctx.strokeText(ch, 0, 0);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });
    ctx.restore();

    // bean bags on rug
    [[90, 640, '#ef7fa6'], [238, 628, '#9fe0c4']].forEach(([x, y, c], i) => {
      ctx.fillStyle = 'rgba(35,15,45,0.25)';
      ctx.beginPath();
      ctx.ellipse(x, y + 10, 26, 8, 0, 0, U.TAU);
      ctx.fill();
      A.shape(ctx, () => A.blob(ctx, x, y, 24, 17, 930 + i, 0.1, 9), c, (cc) => {
        cc.fillStyle = A.shade(c, -0.2);
        cc.fillRect(x + 4, y - 20, 30, 40);
      }, 3);
    });

    // entrance mat
    A.rr(ctx, 600, 674, 120, 40, 6, 940, 0.8);
    A.fs(ctx, '#5a3a3e', 3);
    ctx.fillStyle = '#d8a24a';
    ctx.font = `15px ${A.F.display}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WELCOME', 660, 694);
    // sliding door threshold
    ctx.fillStyle = '#6b7a8f';
    ctx.fillRect(596, 712, 128, 8);
    ctx.strokeStyle = A.INK;
    ctx.lineWidth = 2;
    ctx.strokeRect(596, 712, 128, 8);

    // roomba dock
    const dk = Wd.stations.dock;
    A.rr(ctx, dk.x - 18, dk.y - 6, 36, 14, 4, 950, 0.5);
    A.fs(ctx, '#3a3644', 2.5);
    ctx.fillStyle = '#6cf0a0';
    ctx.fillRect(dk.x - 3, dk.y - 3, 6, 3);

    // wall base shadow
    const g = ctx.createLinearGradient(0, FY, 0, FY + 50);
    g.addColorStop(0, 'rgba(30,10,40,0.55)');
    g.addColorStop(1, 'rgba(30,10,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, FY, W, 50);
    // side vignettes
    const g2 = ctx.createLinearGradient(0, 0, 40, 0);
    g2.addColorStop(0, 'rgba(30,10,40,0.45)');
    g2.addColorStop(1, 'rgba(30,10,40,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, FY, 40, H);
    const g3 = ctx.createLinearGradient(W, 0, W - 40, 0);
    g3.addColorStop(0, 'rgba(30,10,40,0.45)');
    g3.addColorStop(1, 'rgba(30,10,40,0)');
    ctx.fillStyle = g3;
    ctx.fillRect(W - 40, FY, 40, H);
  }

  Wd.windows = []; // transparent panes {x,y,w,h}
  function drawWall(ctx) {
    const rnd = U.rng(4321);
    const FY = Wd.FLOOR_Y;
    Wd.windows = [];
    // --- stone section (0..300)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 300, FY);
    const smallWins = [52, 104, 156, 208].map((x) => ({ x, y: 30, w: 30, h: 32 }));
    smallWins.forEach((w) => ctx.rect(w.x + w.w, w.y, -w.w, w.h)); // holes (reverse winding)
    ctx.clip('evenodd');
    ctx.fillStyle = '#8e5040';
    ctx.fillRect(0, 0, 300, FY);
    const stones = ['#a8634a', '#8e5040', '#b9785a', '#7d4a3c', '#c48c66', '#9b6b52', '#b46e55', '#80503f'];
    for (let y = 0; y < FY; y += 11 + Math.floor(rnd() * 4)) {
      let x = -rnd() * 30;
      const rowH = 9 + rnd() * 6;
      while (x < 300) {
        const sw = 18 + rnd() * 34;
        ctx.fillStyle = stones[Math.floor(rnd() * stones.length)];
        A.rr(ctx, x + 1, y + 1, sw - 2, rowH - 1, 3, x * 3 + y, 0.5);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,230,200,0.12)';
        ctx.fillRect(x + 2, y + 1.5, sw - 5, 2);
        x += sw;
      }
    }
    // uplight wash
    const ug = ctx.createLinearGradient(0, FY, 0, 0);
    ug.addColorStop(0, 'rgba(255,190,110,0.35)');
    ug.addColorStop(0.6, 'rgba(255,190,110,0.0)');
    ctx.fillStyle = ug;
    ctx.fillRect(0, 0, 300, FY);
    ctx.restore();
    smallWins.forEach((w) => {
      Wd.windows.push(w);
      A.rr(ctx, w.x - 3, w.y - 3, w.w + 6, w.h + 6, 2, w.x, 0.5);
      A.fs(ctx, null, 4, '#3a2a2e');
    });
    // flyer + bulletin board
    A.rr(ctx, 214, 84, 72, 70, 3, 960, 0.6);
    A.fs(ctx, '#b88a5a', 3);
    ctx.save();
    ctx.translate(230, 92);
    ctx.rotate(-0.05);
    ctx.fillStyle = '#fbf3e4';
    ctx.fillRect(0, 0, 40, 52);
    ctx.fillStyle = '#c94f3d';
    ctx.font = `9px ${A.F.display}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('COLLEGE', 3, 4);
    ctx.fillText('ESSAY', 3, 14);
    ctx.fillStyle = A.INK;
    ctx.font = `8px ${A.F.hand}`;
    ctx.fillText('workshop', 3, 25);
    ctx.fillText('thurs 7pm', 3, 34);
    ctx.fillText('rm 2', 3, 42);
    ctx.restore();
    ctx.fillStyle = '#f6e46a';
    ctx.save();
    ctx.translate(268, 120);
    ctx.rotate(0.12);
    ctx.fillRect(-10, -10, 20, 20);
    ctx.fillStyle = A.INK;
    ctx.font = `7px ${A.F.hand}`;
    ctx.textAlign = 'center';
    ctx.fillText('NOV 1!!', 0, 2);
    ctx.restore();
    // breaker panel
    const bk = Wd.stations.breaker;
    A.rr(ctx, bk.x - 22, bk.y - 26, 44, 54, 4, 961, 0.5);
    A.fs(ctx, '#8b95a5', 3);
    A.rr(ctx, bk.x - 16, bk.y - 20, 32, 42, 2, 962, 0.4);
    A.fs(ctx, '#6c7686', 2);
    ctx.fillStyle = '#f6c945';
    A.poly(ctx, [[bk.x - 4, bk.y - 34], [bk.x + 4, bk.y - 34], [bk.x, bk.y - 40]], 963, 0.2);
    ctx.fill();
    ctx.stroke();

    // --- copper fascia + glass curtain wall (300..980)
    const gx0 = 300, gx1 = 980;
    // soffit band
    A.rr(ctx, gx0 - 4, -6, gx1 - gx0 + 8, 22, 2, 970, 0.6);
    A.fs(ctx, '#a8806a', 3);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(gx0, 2, gx1 - gx0, 3);
    const bays = 8, bw = (gx1 - gx0) / bays;
    for (let i = 0; i < bays; i++) {
      const x = gx0 + i * bw;
      Wd.windows.push({ x: x + 5, y: 18, w: bw - 10, h: 80 });
      Wd.windows.push({ x: x + 5, y: 104, w: bw - 10, h: 54 });
    }
    // mullions
    ctx.fillStyle = '#2f2a33';
    for (let i = 0; i <= bays; i++) {
      const x = gx0 + i * bw;
      A.rr(ctx, x - 5, 14, 10, 150, 2, 980 + i, 0.4);
      A.fs(ctx, '#3a3440', 2.5);
    }
    A.rr(ctx, gx0, 97, gx1 - gx0, 8, 2, 990, 0.4);
    A.fs(ctx, '#3a3440', 2.5);
    // sill
    A.rr(ctx, gx0 - 6, 158, gx1 - gx0 + 12, 14, 3, 991, 0.5);
    A.fs(ctx, '#c9a28a', 3);
    // window seat cushions? reading sign hanging
    A.rr(ctx, 318, 106, 150, 26, 6, 992, 0.6);
    A.fs(ctx, '#2b5254', 3);
    ctx.strokeStyle = A.INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(336, 16);
    ctx.lineTo(336, 106);
    ctx.moveTo(450, 16);
    ctx.lineTo(450, 106);
    ctx.stroke();
    ctx.fillStyle = '#fbf3e4';
    ctx.font = `15px ${A.F.display}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('QUIET STUDY ZONE', 393, 120);

    // --- copper metal panels (980..1280)
    ctx.save();
    ctx.beginPath();
    ctx.rect(980, 0, 300, FY);
    const tall = { x: 1012, y: 20, w: 26, h: 140 };
    ctx.rect(tall.x + tall.w, tall.y, -tall.w, tall.h);
    ctx.clip('evenodd');
    const cg = ctx.createLinearGradient(980, 0, 1280, FY);
    cg.addColorStop(0, '#b48c76');
    cg.addColorStop(0.5, '#9a7462');
    cg.addColorStop(1, '#7c5a4c');
    ctx.fillStyle = cg;
    ctx.fillRect(980, 0, 300, FY);
    ctx.strokeStyle = 'rgba(60,30,30,0.45)';
    ctx.lineWidth = 2;
    for (let x = 1000; x < 1280; x += 44) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FY);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,230,210,0.18)';
    for (let x = 1002; x < 1280; x += 44) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FY);
      ctx.stroke();
    }
    ctx.restore();
    Wd.windows.push(tall);
    A.rr(ctx, tall.x - 4, tall.y - 4, tall.w + 8, tall.h + 8, 2, 995, 0.5);
    A.fs(ctx, null, 4, '#3a2a2e');
    ctx.fillStyle = '#3a2a2e';
    for (let i = 1; i < 4; i++) ctx.fillRect(tall.x, tall.y + i * 35, tall.w, 3);
    // fire alarm panel
    const al = Wd.stations.alarm;
    A.rr(ctx, al.x - 18, al.y - 22, 36, 44, 4, 996, 0.5);
    A.fs(ctx, '#d94a43', 3);
    A.rr(ctx, al.x - 11, al.y - 14, 22, 14, 2, 997, 0.4);
    A.fs(ctx, '#fbf3e4', 2);
    ctx.fillStyle = '#d94a43';
    ctx.font = `8px ${A.F.display}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FIRE', al.x, al.y - 7);
    ctx.fillStyle = '#fbf3e4';
    ctx.font = `7px ${A.F.display}`;
    ctx.fillText('PULL', al.x, al.y + 12);
    // clock face (hands drawn live)
    A.el(ctx, 1190, 64, 30, 30, 998, 0.6, 14);
    A.fs(ctx, '#fbf3e4', 4);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * U.TAU;
      ctx.fillStyle = A.INK;
      ctx.beginPath();
      ctx.arc(1190 + Math.cos(a) * 23, 64 + Math.sin(a) * 23, i % 3 === 0 ? 2.4 : 1.2, 0, U.TAU);
      ctx.fill();
    }

    // baseboard
    A.rr(ctx, -4, FY - 8, W + 8, 12, 2, 999, 0.5);
    A.fs(ctx, '#4a2a2a', 3);
    // vertical section seams
    ctx.strokeStyle = A.INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(300, 0);
    ctx.lineTo(300, FY);
    ctx.moveTo(980, 0);
    ctx.lineTo(980, FY);
    ctx.stroke();
  }

  Wd.buildBackground = function () {
    Wd.bg = [];
    const save = A.boil;
    for (let v = 0; v < 2; v++) {
      A.boil = v * 5 + 1;
      const c = document.createElement('canvas');
      c.width = W * RS;
      c.height = H * RS;
      const ctx = c.getContext('2d');
      ctx.scale(RS, RS);
      drawFloor(ctx);
      drawWall(ctx);
      Wd.bg.push(c);
    }
    A.boil = save;
  };

  // --- sky through the windows -------------------------------------------------------------
  const STARS = Array.from({ length: 90 }, (_, i) => ({ x: U.hash(i * 3.3) * W, y: U.hash(i * 7.7) * 150, s: U.hash(i * 1.9) }));
  const TREES = Array.from({ length: 26 }, (_, i) => ({ x: i * 52 + U.hash(i) * 30, r: 26 + U.hash(i * 5) * 22, h: 110 + U.hash(i * 9) * 30 }));
  Wd.weather = { rain: [], leaves: [] };
  Wd.drawSky = function (ctx, p, night, time) {
    // p: 0..1 progress from 9pm to midnight
    const halloween = night && night.halloween;
    const sky = halloween
      ? [['#1a0f2e', '#3a1f4a'], ['#4a2350', '#7a3a4a'], ['#d8733a', '#f0a050']]
      : [['#2a2f6a', '#141634'], ['#6f5f9e', '#2a2a5a'], ['#f2b0a0', '#4a3f7a']];
    const lerpC = (a, b, t) => {
      const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
      const r = U.lerp(pa >> 16, pb >> 16, t), g = U.lerp((pa >> 8) & 255, (pb >> 8) & 255, t), bb = U.lerp(pa & 255, pb & 255, t);
      return `rgb(${r | 0},${g | 0},${bb | 0})`;
    };
    const k = U.clamp(p * 1.3, 0, 1);
    const g = ctx.createLinearGradient(0, 0, 0, 170);
    g.addColorStop(0, lerpC(sky[0][0], sky[0][1], k));
    g.addColorStop(0.55, lerpC(sky[1][0], sky[1][1], k));
    g.addColorStop(1, lerpC(sky[2][0], sky[2][1], k));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, Wd.FLOOR_Y);
    // stars
    const starA = U.clamp((p - 0.15) * 1.5, 0, 1);
    if (starA > 0 && !(night && night.weather === 'rain')) {
      for (const s of STARS) {
        const tw = 0.5 + 0.5 * Math.sin(time * (1 + s.s * 3) + s.x);
        ctx.fillStyle = `rgba(255,248,220,${starA * tw * (0.4 + s.s * 0.6)})`;
        ctx.fillRect(s.x, s.y, 1.5 + s.s, 1.5 + s.s);
      }
    }
    // moon
    if (!(night && night.weather === 'rain')) {
      const mx = U.lerp(360, 900, p), my = 120 - Math.sin(p * Math.PI) * 80;
      const mr = halloween ? 30 : 20;
      const mg = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 4);
      mg.addColorStop(0, halloween ? 'rgba(255,170,80,0.5)' : 'rgba(255,245,220,0.35)');
      mg.addColorStop(1, 'rgba(255,245,220,0)');
      ctx.fillStyle = mg;
      ctx.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
      ctx.fillStyle = halloween ? '#ffb85c' : '#fff3d6';
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, U.TAU);
      ctx.fill();
      ctx.fillStyle = halloween ? 'rgba(200,100,40,0.35)' : 'rgba(200,190,170,0.4)';
      ctx.beginPath();
      ctx.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.25, 0, U.TAU);
      ctx.arc(mx + mr * 0.35, my + mr * 0.3, mr * 0.18, 0, U.TAU);
      ctx.fill();
    }
    // clouds
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 260 + time * (6 + i * 2)) % (W + 300)) - 150;
      const cy = 30 + (i % 3) * 22;
      ctx.fillStyle = night && night.weather === 'rain' ? 'rgba(60,60,90,0.55)' : `rgba(255,220,230,${0.12 + (1 - k) * 0.15})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 70, 12, 0, 0, U.TAU);
      ctx.ellipse(cx + 30, cy - 8, 40, 12, 0, 0, U.TAU);
      ctx.fill();
    }
    // distant parking lot lamps
    for (let i = 0; i < 5; i++) {
      const lx = 120 + i * 260;
      const lg = ctx.createRadialGradient(lx, 128, 1, lx, 128, 26);
      lg.addColorStop(0, 'rgba(255,210,140,0.9)');
      lg.addColorStop(1, 'rgba(255,210,140,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(lx - 26, 102, 52, 52);
    }
    // tree line silhouettes
    const sway = Math.sin(time * 0.8) * (night && night.weather === 'wind' ? 5 : 1.5);
    ctx.fillStyle = halloween ? '#1a0e22' : lerpC('#26324a', '#121428', k);
    for (const t of TREES) {
      ctx.beginPath();
      ctx.ellipse(t.x + sway * (t.r / 40), 178 - t.h * 0.5, t.r, t.h * 0.42, 0, 0, U.TAU);
      ctx.fill();
    }
    ctx.fillRect(0, 150, W, 30);
    // iron fence
    ctx.strokeStyle = 'rgba(10,8,16,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 148);
    ctx.lineTo(W, 148);
    for (let x = 0; x < W; x += 12) {
      ctx.moveTo(x, 172);
      ctx.lineTo(x, 140);
    }
    ctx.stroke();
    // weather
    if (night && night.weather === 'rain') {
      ctx.strokeStyle = 'rgba(190,210,255,0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 120; i++) {
        const x = (U.hash(i) * W + time * 60) % W;
        const y = (U.hash(i * 3.1) * 180 + time * 520) % 180;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3, y + 12);
      }
      ctx.stroke();
    }
    if (night && night.weather === 'fog') {
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = 'rgba(200,190,220,0.18)';
        ctx.beginPath();
        ctx.ellipse(((i * 380 + time * 12) % (W + 400)) - 200, 140 - i * 6, 260, 26, 0, 0, U.TAU);
        ctx.fill();
      }
    }
    if (night && night.weather === 'wind') {
      for (let i = 0; i < 14; i++) {
        const x = (U.hash(i * 2.2) * W + time * (120 + i * 8)) % W;
        const y = 40 + U.hash(i * 4.4) * 110 + Math.sin(time * 3 + i) * 12;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(time * 4 + i);
        ctx.fillStyle = ['#e39b3a', '#c94f3d', '#d9c27a'][i % 3];
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 2.5, 0, 0, U.TAU);
        ctx.fill();
        ctx.restore();
      }
    }
    if (halloween) {
      for (let i = 0; i < 5; i++) {
        const bx = ((time * (40 + i * 9) + i * 300) % (W + 100)) - 50;
        const by = 50 + Math.sin(time * 2 + i * 2) * 25 + i * 8;
        ctx.save();
        ctx.translate(bx, by);
        ctx.scale(0.5, 0.5);
        ctx.fillStyle = '#100818';
        const f = Math.sin(time * 20 + i) * 6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-22, -8 - f);
        ctx.lineTo(-14, 2);
        ctx.lineTo(0, 6);
        ctx.lineTo(14, 2);
        ctx.lineTo(22, -8 - f);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    // glass reflections drawn over panes
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 8; i++) {
      const x = 320 + i * 85;
      ctx.beginPath();
      ctx.moveTo(x + 10, 20);
      ctx.lineTo(x + 26, 20);
      ctx.lineTo(x + 6, 96);
      ctx.lineTo(x - 10, 96);
      ctx.fill();
    }
    ctx.restore();
  };

  Wd.drawClockHands = function (ctx, mins) {
    const cx = 1190, cy = 64;
    const total = 21 * 60 + mins;
    const ha = ((total / 60) % 12) / 12 * U.TAU - Math.PI / 2;
    const ma = ((total % 60) / 60) * U.TAU - Math.PI / 2;
    ctx.strokeStyle = A.INK;
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ha) * 13, cy + Math.sin(ha) * 13);
    ctx.stroke();
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ma) * 21, cy + Math.sin(ma) * 21);
    ctx.stroke();
    ctx.fillStyle = A.C.red;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, U.TAU);
    ctx.fill();
  };

  // --- lighting -------------------------------------------------------------------------------
  // Static lights (lamps, windows, laptops) are baked once per state; only moving lights draw per frame.
  const LS = 0.5;
  const LW = W * LS, LH = H * LS;
  let lightCanvas, lctx;
  function lightPass(c, L, glow) {
    for (const l of L) {
      if (glow && !l.glow) continue;
      const x = l.x * LS, y = l.y * LS, r = (glow ? l.r * 0.6 : l.r) * LS;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, glow ? l.glow : l.c);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      if (l.cone && !glow) {
        c.beginPath();
        c.moveTo(x, y);
        c.arc(x, y, r, l.cone.a - l.cone.w, l.cone.a + l.cone.w);
        c.closePath();
        c.fill();
      } else c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  Wd.bakeLights = function (L) {
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = LW;
      c.height = LH;
      return c;
    };
    const map = mk(), glow = mk();
    const m = map.getContext('2d'), g = glow.getContext('2d');
    m.globalCompositeOperation = 'lighter';
    g.globalCompositeOperation = 'lighter';
    lightPass(m, L, false);
    lightPass(g, L, true);
    return { map, glow };
  };
  Wd.renderLights = function (ctx, baked, dyn, ambient) {
    if (!lightCanvas) {
      lightCanvas = document.createElement('canvas');
      lightCanvas.width = LW;
      lightCanvas.height = LH;
      lctx = lightCanvas.getContext('2d');
    }
    lctx.globalCompositeOperation = 'source-over';
    lctx.fillStyle = ambient;
    lctx.fillRect(0, 0, LW, LH);
    lctx.globalCompositeOperation = 'lighter';
    if (baked) lctx.drawImage(baked.map, 0, 0);
    lightPass(lctx, dyn, false);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(lightCanvas, 0, 0, W, H);
    ctx.globalCompositeOperation = 'screen';
    if (baked) ctx.drawImage(baked.glow, 0, 0, W, H);
    for (const l of dyn) {
      if (!l.glow) continue;
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.6);
      g.addColorStop(0, l.glow);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    ctx.restore();
  };

  // Paper grain + vignette, baked once
  let postC = null, redC = null;
  function bakePost(col, strength, grain) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    vg.addColorStop(0, `rgba(${col},0)`);
    vg.addColorStop(1, `rgba(${col},${strength})`);
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);
    if (grain) {
      const rnd = U.rng(31337);
      for (let i = 0; i < 26000; i++) {
        const light = rnd() < 0.5;
        g.fillStyle = light ? 'rgba(255,245,225,0.06)' : 'rgba(30,10,40,0.07)';
        g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
      }
    }
    return c;
  }
  Wd.drawPost = function (ctx, vignette = 0.45, redPulse = 0) {
    if (!postC) {
      postC = bakePost('20,8,30', 0.5, true);
      redC = bakePost('130,10,30', 0.7, false);
    }
    ctx.save();
    ctx.globalAlpha = U.clamp(vignette / 0.5, 0, 1.4);
    ctx.drawImage(postC, 0, 0, W, H);
    if (redPulse > 0) {
      ctx.globalAlpha = U.clamp(redPulse, 0, 1);
      ctx.drawImage(redC, 0, 0, W, H);
    }
    ctx.restore();
  };
})(window.MB);
