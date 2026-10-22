'use strict';
// Boot, canvas scaling, input wiring (keys, mouse, touch, gamepad), scene transitions, main loop.
(function (MB) {
  const U = MB.U, A = MB.A, Wd = MB.World, In = MB.Input, Au = MB.Audio;
  const W = MB.W, H = MB.H;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let scale = 1, dpr = 1;

  MB.settings = Object.assign({ shake: true }, U.store.get('settings', {}));

  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    scale = Math.min(vw / W, vh / H);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.style.width = Math.floor(W * scale) + 'px';
    canvas.style.height = Math.floor(H * scale) + 'px';
    canvas.width = Math.round(W * scale * dpr);
    canvas.height = Math.round(H * scale * dpr);
  }
  window.addEventListener('resize', resize);
  resize();

  // --- scenes + iris transition --------------------------------------------------------
  MB.scene = null;
  let trans = null;
  MB.go = function (next) {
    if (trans) {
      trans.next = next;
      return;
    }
    trans = { t: 0, phase: 'out', next };
  };
  function drawIris(k) {
    // k: 0 = fully open, 1 = closed
    if (k <= 0) return;
    const maxR = Math.hypot(W, H) / 2 + 20;
    const r = maxR * (1 - U.ease.inOutSine(k));
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(W / 2, H / 2, Math.max(0, r), 0, U.TAU, true);
    ctx.fillStyle = '#120c1c';
    ctx.fill('evenodd');
    if (r > 2) {
      ctx.strokeStyle = '#f6c945';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, r, 0, U.TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- keyboard + mouse ------------------------------------------------------------------
  const BLOCK = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter']);
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey) return;
    if (BLOCK.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    In.keyDown(e.code);
  });
  window.addEventListener('keyup', (e) => In.keyUp(e.code));
  window.addEventListener('blur', () => In.down.clear());
  const toLogical = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    return [((cx - r.left) / r.width) * W, ((cy - r.top) / r.height) * H];
  };
  canvas.addEventListener('mousemove', (e) => {
    const [x, y] = toLogical(e.clientX, e.clientY);
    In.mouse.x = x;
    In.mouse.y = y;
    In.mouse.moved = true;
  });
  canvas.addEventListener('mousedown', (e) => {
    const [x, y] = toLogical(e.clientX, e.clientY);
    In.mouse.x = x;
    In.mouse.y = y;
    In.mouse.clicked = true;
    In.mouse.down = true;
    canvas.focus();
  });
  window.addEventListener('mouseup', () => (In.mouse.down = false));

  // --- touch -------------------------------------------------------------------------------
  const T = (MB.touch = {
    enabled: false,
    stick: { id: null, ox: 0, oy: 0, lastDir: null },
    buttons: [
      { id: 'act', x: 1176, y: 604, r: 54, label: 'ACT', down: false, pid: null },
      { id: 'dash', x: 1060, y: 652, r: 40, label: 'DASH', down: false, pid: null },
      { id: 'shush', x: 1190, y: 482, r: 40, label: 'SHHH', down: false, pid: null },
      { id: 'pause', x: 1250, y: 140, r: 22, label: 'II', down: false, pid: null },
    ],
  });
  const touchDown = new Set();
  function inNight() {
    return MB.scene && MB.scene.name === 'night';
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    e.preventDefault();
    T.enabled = true;
    In.lastDevice = 'touch';
    Au.init();
    const [x, y] = toLogical(e.clientX, e.clientY);
    if (!inNight()) {
      In.mouse.x = x;
      In.mouse.y = y;
      In.mouse.clicked = true;
      In.mouse.moved = true;
      return;
    }
    const sc = MB.scene;
    if (sc.player && sc.player.seated && sc.cardRects) {
      const i = sc.cardRects.findIndex((r) => r && U.inRect(x, y, r));
      if (i >= 0) {
        sc.essayPick(i);
        return;
      }
    }
    if (sc.dlg) {
      In.virtualPress('act');
      return;
    }
    for (const b of T.buttons) {
      if (U.dist(x, y, b.x, b.y) < b.r + 14) {
        b.down = true;
        b.pid = e.pointerId;
        touchDown.add(b.id);
        In.virtualPress(b.id);
        return;
      }
    }
    if (x < W * 0.6 && T.stick.id == null) {
      T.stick.id = e.pointerId;
      T.stick.ox = x;
      T.stick.oy = y;
      T.stick.lastDir = null;
    } else {
      // tap elsewhere = act (handy for typing)
      In.virtualPress('act');
    }
  }, { passive: false });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch' || e.pointerId !== T.stick.id) return;
    const [x, y] = toLogical(e.clientX, e.clientY);
    let dx = (x - T.stick.ox) / 50, dy = (y - T.stick.oy) / 50;
    const m = Math.hypot(dx, dy);
    if (m > 1) {
      dx /= m;
      dy /= m;
    }
    In.stick.x = Math.abs(dx) > 0.15 ? dx : 0;
    In.stick.y = Math.abs(dy) > 0.15 ? dy : 0;
    const dir = m > 0.6 ? (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up') : null;
    if (dir && dir !== T.stick.lastDir) In.virtualPress(dir);
    T.stick.lastDir = dir;
  });
  const endTouch = (e) => {
    if (e.pointerType !== 'touch') return;
    if (e.pointerId === T.stick.id) {
      T.stick.id = null;
      In.stick.x = In.stick.y = 0;
    }
    for (const b of T.buttons) {
      if (b.pid === e.pointerId) {
        b.down = false;
        b.pid = null;
        touchDown.delete(b.id);
      }
    }
  };
  canvas.addEventListener('pointerup', endTouch);
  canvas.addEventListener('pointercancel', endTouch);

  // --- gamepad --------------------------------------------------------------------------------
  const padPrev = {};
  const padDown = new Set();
  function pollPad() {
    padDown.clear();
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = pads && Array.from(pads).find((x) => x && x.connected);
    if (!p) return;
    const map = { 0: 'act', 1: 'dash', 2: 'shush', 3: 'shush', 9: 'pause', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
    for (const k in map) {
      const b = p.buttons[k];
      const d = b && b.pressed;
      if (d) padDown.add(map[k]);
      if (d && !padPrev[k]) {
        In.virtualPress(map[k]);
        In.lastDevice = 'pad';
        Au.init();
      }
      padPrev[k] = d;
    }
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    if (T.stick.id == null) {
      In.stick.x = Math.abs(ax) > 0.25 ? ax : 0;
      In.stick.y = Math.abs(ay) > 0.25 ? ay : 0;
      if (In.stick.x || In.stick.y) In.lastDevice = 'pad';
      const dir = Math.hypot(ax, ay) > 0.7 ? (Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'right' : 'left') : ay > 0 ? 'down' : 'up') : null;
      if (dir && dir !== padPrev.dir) In.virtualPress(dir);
      padPrev.dir = dir;
    }
  }

  // --- loop -----------------------------------------------------------------------------------
  let last = performance.now();
  let boilT = 0;
  let lastErr = null;
  MB.timeScale = 1;
  function frame(now) {
    const raw = Math.min(0.05, (now - last) / 1000);
    last = now;
    const dt = raw * MB.timeScale;
    pollPad();
    In.vDown = new Set([...touchDown, ...padDown]);
    boilT += raw;
    if (boilT > 0.14) {
      boilT = 0;
      A.boil = (A.boil + 1) % 6;
    }
    try {
      if (trans) {
        trans.t += raw;
        if (trans.phase === 'out' && trans.t >= 0.3) {
          MB.scene = trans.next;
          trans.phase = 'in';
          trans.t = 0;
        } else if (trans.phase === 'in' && trans.t >= 0.34) trans = null;
      }
      if (MB.scene && (!trans || trans.phase === 'in')) {
        // fixed-ish substeps keep dashes from tunneling through furniture on slow frames
        const steps = Math.max(1, Math.ceil(dt / 0.034));
        for (let i = 0; i < steps; i++) {
          const sc = MB.scene;
          sc.update(dt / steps);
          if (i === 0) {
            In.pressed.clear();
            In.vPressed.clear();
            In.typed = 0;
            In.mouse.clicked = false;
          }
          if (MB.scene !== sc || trans) break;
        }
      }
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      if (MB.scene) MB.scene.draw(ctx);
      if (trans) drawIris(trans.phase === 'out' ? trans.t / 0.3 : 1 - trans.t / 0.34);
    } catch (err) {
      if (!lastErr || lastErr.message !== err.message) console.error(err);
      lastErr = err;
      MB.lastError = err;
    }
    In.endFrame();
    In.mouse.moved = false;
    requestAnimationFrame(frame);
  }

  // --- boot ---------------------------------------------------------------------------------------
  function drawLoading(msg) {
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    ctx.fillStyle = '#120c1c';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fbf3e4';
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(msg, W / 2, H / 2);
  }
  async function boot() {
    drawLoading('Opening the library…');
    try {
      if (document.fonts && document.fonts.load) {
        await Promise.race([
          Promise.all(['40px "Lilita One"', '20px "Patrick Hand"', '20px "Caveat"'].map((f) => document.fonts.load(f))),
          new Promise((r) => setTimeout(r, 2500)),
        ]);
      }
    } catch (e) { /* fall back to system fonts */ }
    Wd.buildGrid();
    Wd.buildSprites();
    Wd.buildBackground();
    MB.scene = MB.Screens.title();
    canvas.focus();
    requestAnimationFrame(frame);
  }
  boot();
})(window.MB);
