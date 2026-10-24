'use strict';
// In-game HUD: clock card, quota, score/flow, abilities, meters, prompts, essay laptop, minigames.
(function (MB) {
  const U = MB.U, A = MB.A, Wd = MB.World, FX = MB.FX;
  const W = MB.W, H = MB.H;
  const HUD = (MB.HUD = {});
  const PAPER = '#fbf3e4';

  HUD.keyName = function (action) {
    const dev = MB.Input.lastDevice;
    if (dev === 'touch') return { act: 'TAP', dash: 'DASH', shush: 'SHHH' }[action];
    if (dev === 'pad') return { act: 'A', dash: 'B', shush: 'X' }[action];
    return { act: 'SPACE', dash: 'SHIFT', shush: 'Q' }[action];
  };
  HUD.keycap = function (ctx, label, x, y, o = {}) {
    ctx.font = `${o.size || 13}px ${A.F.display}`;
    const w = Math.max(24, ctx.measureText(label).width + 14);
    const h = (o.size || 13) + 11;
    A.rr(ctx, x - w / 2, y - h / 2 + 3, w, h, 6, x, 0.3);
    A.fs(ctx, A.INK, 0);
    A.rr(ctx, x - w / 2, y - h / 2, w, h, 6, x + 1, 0.3);
    A.fs(ctx, o.bg || '#fff6e6', 2.2);
    ctx.fillStyle = A.INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 1);
    return w;
  };
  function card(ctx, x, y, w, h, rot, fill = PAPER, seed = 0) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rot);
    A.rr(ctx, -w / 2 + 3, -h / 2 + 5, w, h, 10, seed + 1, 0.6);
    A.fs(ctx, 'rgba(20,8,30,0.45)', 0);
    A.rr(ctx, -w / 2, -h / 2, w, h, 10, seed, 0.6);
    A.fs(ctx, fill, 3);
    return () => ctx.restore();
  }
  HUD.card = card;
  function tape(ctx, x, y, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = 'rgba(246,201,69,0.75)';
    ctx.fillRect(-18, -6, 36, 12);
    ctx.restore();
  }
  HUD.tape = tape;

  HUD.draw = function (ctx, g) {
    drawStudentUI(ctx, g);
    drawPlayerUI(ctx, g);
    drawClock(ctx, g);
    drawStatus(ctx, g);
    drawQuota(ctx, g);
    drawScore(ctx, g);
    drawAbilities(ctx, g);
    drawEssay(ctx, g);
    drawAlerts(ctx, g);
    FX.draw(ctx, 'ui');
    drawBanners(ctx, g);
    if (g.minigame) drawMinigame(ctx, g);
    if (g.phase === 'countdown') drawCountdown(ctx, g);
    if (MB.touch && MB.touch.enabled) drawTouch(ctx, g);
  };

  // --- students ----------------------------------------------------------------------
  function drawStudentUI(ctx, g) {
    for (const s of g.students) {
      const hp = s.headPos();
      const x = hp.x, y = hp.y - 6;
      if (s.state === 'submitted') {
        A.rr(ctx, x - 44, y - 10, 88, 20, 8, s.idx * 9, 0.5);
        A.fs(ctx, '#6cbf6a', 2.4);
        A.text(ctx, 'SUBMITTED', x, y + 1, { size: 13, color: '#fff', outline: 0 });
      } else {
        // name
        A.text(ctx, s.name, x + 8, y - 18, { size: 15, font: A.F.hand, color: '#fff', outline: 4 });
        // progress bar
        const bw = 64, bx = x - bw / 2 + 8;
        A.rr(ctx, bx, y - 6, bw, 12, 5, s.idx * 3, 0.4);
        A.fs(ctx, '#3a2a44', 2.4);
        const pw = (bw - 4) * U.clamp(s.progress / 100, 0, 1);
        if (pw > 1) {
          ctx.fillStyle = s.boostT > 0 ? '#f6c945' : s.progressBlocked() ? '#8a8a9a' : '#6cbf6a';
          ctx.beginPath();
          ctx.roundRect(bx + 2, y - 4, pw, 8, 3);
          ctx.fill();
          ctx.save();
          ctx.clip();
          ctx.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx.lineWidth = 3;
          const off = (g.realT * 30) % 12;
          for (let k = -12; k < bw + 12; k += 12) {
            ctx.beginPath();
            ctx.moveTo(bx + k + off, y + 6);
            ctx.lineTo(bx + k + off + 8, y - 6);
            ctx.stroke();
          }
          ctx.restore();
        }
        ctx.font = `11px ${A.F.display}`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.floor(s.progress) + '%', bx + bw / 2, y + 1);
        // focus ring
        const fx = x - 34, fy = y;
        const f = s.state === 'study' ? s.focus / 100 : 0;
        const jit = s.drainNow > 6 && s.state === 'study' ? U.rand(-1.2, 1.2) : 0;
        ctx.fillStyle = '#3a2a44';
        ctx.beginPath();
        ctx.arc(fx + jit, fy, 11, 0, U.TAU);
        ctx.fill();
        ctx.strokeStyle = f > 0.66 ? '#6cbf6a' : f > 0.33 ? '#f6c945' : '#e0524a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(fx + jit, fy, 8, -Math.PI / 2, -Math.PI / 2 + U.TAU * f);
        ctx.stroke();
        ctx.strokeStyle = A.INK;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(fx + jit, fy, 11.5, 0, U.TAU);
        ctx.stroke();
        if (s.drainNow > 0.5 && s.state === 'study') {
          ctx.fillStyle = '#ff9a8a';
          ctx.font = `10px ${A.F.display}`;
          ctx.fillText('▼', fx + jit, fy + 0.5);
        }
        // state icons
        let ic = null;
        if (s.flags.wifi) ic = 'wifi';
        else if (s.flags.usb) ic = 'usb';
        else if (s.flags.asleep) ic = 'zzz';
        else if (s.flags.chat) ic = 'chat';
        else if (s.flags.phone) ic = 'phone';
        if (ic) A.icon(ctx, ic, bx + bw + 14, y, 10);
      }
      // wandering: big help marker
      if (s.state === 'wander' || s.state === 'scroll') {
        const b = Math.abs(Math.sin(g.realT * 6)) * 8;
        A.el(ctx, s.x, s.y - 112 - b, 15, 15, s.idx, 0.6, 10);
        A.fs(ctx, '#e0524a', 3);
        A.text(ctx, '!', s.x, s.y - 111 - b, { size: 22, color: '#fff', outline: 0 });
        ctx.font = `13px ${A.F.display}`;
        A.text(ctx, 'PEP TALK!', s.x, s.y - 136 - b, { size: 13, color: '#ffe08a', outline: 4 });
      }
      if (s.bubble && s.bubbleT > 0) {
        const bx = s.seated ? s.seat.x : s.x;
        const by = s.seated ? s.seat.y - 102 : s.y - 92;
        A.bubble(ctx, bx, by, s.bubble, { size: 15, alpha: Math.min(1, s.bubbleT * 3), maxW: 170 });
      }
    }
    // librarian line
    if (g.libLine && g.libLineT > 0) A.bubble(ctx, 985, 530, g.libLine, { size: 15, alpha: Math.min(1, g.libLineT * 3), bg: '#efe2ff' });
  }

  // --- alerts -------------------------------------------------------------------------
  function drawAlerts(ctx, g) {
    for (const ev of g.events) {
      if (ev.resolved) continue;
      const a = ev.alert();
      if (!a) continue;
      const pop = ev.t < 0.35 ? U.ease.outBack(ev.t / 0.35) : 1;
      const bob = Math.sin(g.realT * 5 + ev.t) * 3;
      const ax = U.clamp(a.x, 24, W - 24), ay = U.clamp(a.y, 120, H - 24);
      ctx.save();
      ctx.translate(ax, ay + bob);
      ctx.scale(pop, pop);
      const pulse = (g.realT * 1.6 + ev.t) % 1;
      ctx.strokeStyle = `rgba(255,90,80,${1 - pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 16 + pulse * 14, 0, U.TAU);
      ctx.stroke();
      const meta = MB.EVENTS[ev.type];
      if (meta.life) {
        const left = U.clamp(1 - ev.t / g.lifeOf(ev), 0, 1);
        ctx.strokeStyle = 'rgba(43,27,51,0.6)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, U.TAU);
        ctx.stroke();
        ctx.strokeStyle = left > 0.35 ? '#ffe08a' : '#ff9a8a';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, 20, -Math.PI / 2, -Math.PI / 2 + U.TAU * left);
        ctx.stroke();
      }
      const icon = ev.type === 'birds' && g.def.halloween ? 'bat' : meta.icon;
      A.icon(ctx, icon, 0, 0, 16, meta.good ? '#e8ffd8' : '#fffaf0');
      // tail
      ctx.fillStyle = A.INK;
      ctx.beginPath();
      ctx.moveTo(-5, 15);
      ctx.lineTo(0, 23);
      ctx.lineTo(5, 15);
      ctx.fill();
      ctx.restore();
    }
  }

  // --- player prompt, hold ring, speech -----------------------------------------------------
  function drawPlayerUI(ctx, g) {
    const p = g.player;
    if (p.speak && p.speakT > 0) A.bubble(ctx, p.x, p.y - 84, p.speak, { size: 16, bg: '#fff3c4' });
    const ia = g.focusIA;
    if (!ia || g.phase !== 'play' || p.seated) return;
    const x = p.x, y = p.y - 98;
    let key = HUD.keyName(ia.key || 'act');
    let label = ia.label;
    let verb = '';
    if (ia.mash) verb = 'MASH';
    if (ia.hold) verb = 'HOLD';
    ctx.font = `17px ${A.F.hand}`;
    const lw = ctx.measureText(label).width;
    ctx.font = `13px ${A.F.display}`;
    const kw = Math.max(24, ctx.measureText(key).width + 14) + (verb ? ctx.measureText(verb).width + 8 : 0);
    const w = lw + kw + 26;
    const bx = U.clamp(x - w / 2, 8, W - w - 8);
    ctx.save();
    ctx.globalAlpha = ia.hintOnly ? 0.85 : 1;
    A.rr(ctx, bx, y - 17, w, 34, 12, 3, 0.5);
    A.fs(ctx, ia.disabled ? '#d8cfd8' : ia.hintOnly ? '#ffe3a8' : '#fffaf0', 2.6);
    let cx = bx + 10;
    if (verb) {
      ctx.fillStyle = '#e0524a';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = `13px ${A.F.display}`;
      ctx.fillText(verb, cx, y + 1);
      cx += ctx.measureText(verb).width + 6;
    }
    ctx.font = `13px ${A.F.display}`;
    const keyW = Math.max(24, ctx.measureText(key).width + 14);
    HUD.keycap(ctx, key, cx + keyW / 2, y);
    cx += keyW + 8;
    ctx.fillStyle = A.INK;
    ctx.font = `17px ${A.F.hand}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, y + 1);
    ctx.restore();
    // hold ring
    if (ia.hold && g.hold.id === ia.id && g.hold.p > 0) {
      const k = U.clamp(g.hold.p / ia.hold.need, 0, 1);
      ctx.strokeStyle = '#3a2a44';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 40, 30, 0, U.TAU);
      ctx.stroke();
      ctx.strokeStyle = '#6cbf6a';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 40, 30, -Math.PI / 2, -Math.PI / 2 + U.TAU * k);
      ctx.stroke();
    }
  }

  // --- top bar ------------------------------------------------------------------------------
  function drawClock(ctx, g) {
    const crunch = g.crunch || 0;
    const final = crunch > 0;
    const pulse = final ? 1 + Math.sin(g.realT * (8 + 6 * crunch)) * (0.025 + 0.025 * crunch) : 1;
    ctx.save();
    ctx.translate(124, 62);
    ctx.scale(pulse, pulse);
    ctx.translate(-124, -62);
    const done = card(ctx, 18, 14, 212, 96, -0.025, final ? '#ffd9cf' : PAPER, 21);
    tape(ctx, 0, -48, 0.08);
    const ct = U.clockText(g.minutes);
    A.text(ctx, g.def.day.slice(0, 3) + ' · ' + g.def.date, -96, -28, { size: 16, font: A.F.hand, color: A.C.inkSoft, outline: 0, align: 'left' });
    A.text(ctx, ct.hm, -96, 6, { size: 44, color: final ? '#d23c34' : A.INK, outline: 0, align: 'left' });
    ctx.font = `44px ${A.F.display}`;
    const tw = ctx.measureText(ct.hm).width;
    A.text(ctx, ct.ampm, -96 + tw + 6, 16, { size: 18, color: A.C.inkSoft, outline: 0, align: 'left' });
    // deadline bar
    A.rr(ctx, -96, 28, 184, 10, 4, 22, 0.4);
    A.fs(ctx, '#e8dcc8', 2);
    ctx.fillStyle = final ? '#e0524a' : '#8a5ac2';
    ctx.fillRect(-94, 30, 180 * g.p01, 6);
    if (final) {
      const sec = Math.ceil(g.timeLeft);
      A.text(ctx, Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') + ' LEFT', 88, -28, { size: 14, color: '#d23c34', outline: 0, align: 'right' });
    } else A.text(ctx, 'DUE 12:00', 84, -28, { size: 12, color: '#e0524a', outline: 0, align: 'right' });
    done();
    ctx.restore();
  }

  // Groove meter / wave status, tucked under the clock card
  function drawStatus(ctx, g) {
    if (g.tutorialNoStatus) return;
    const x = 26, y = 116, w = 200, h = 26;
    const trouble = g.activeTrouble();
    A.rr(ctx, x + 2, y + 3, w, h, 10, 130, 0.4);
    A.fs(ctx, 'rgba(20,8,30,0.45)', 0);
    A.rr(ctx, x, y, w, h, 10, 131, 0.4);
    A.fs(ctx, '#3a2a44', 2.6);
    ctx.save();
    A.rr(ctx, x, y, w, h, 10, 131, 0.4);
    ctx.clip();
    if (g.grooveT > 0) {
      const k = g.grooveT / g.stats.grooveTime;
      ctx.fillStyle = '#f6c945';
      ctx.fillRect(x, y, w * k, h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      const off = (g.realT * 60) % 20;
      for (let i = -20; i < w; i += 20) ctx.fillRect(x + i + off, y, 6, h);
    } else {
      ctx.fillStyle = '#c99a2e';
      ctx.fillRect(x, y, w * g.groove, h);
    }
    ctx.restore();
    A.rr(ctx, x, y, w, h, 10, 131, 0.4);
    A.fs(ctx, null, 2.6);
    A.icon(ctx, 'note', x + 16, y + h / 2, 10, null);
    let label, col = '#fff6e6';
    if (g.grooveT > 0) {
      label = 'GROOVE MODE ' + Math.ceil(g.grooveT) + 's';
      col = '#2b1b33';
    } else if (trouble > 0) {
      label = 'TROUBLE! fix it to groove';
      col = '#ffb3a6';
    } else label = 'CALM · groove building';
    A.text(ctx, label, x + 30, y + h / 2 + 1, { size: 14, color: col, outline: g.grooveT > 0 ? 0 : 3, align: 'left' });
  }

  function drawQuota(ctx, g) {
    const cx = W / 2;
    // ribbon
    ctx.save();
    ctx.translate(cx, 26);
    const label = g.endless ? 'ROLLING ADMISSIONS · NIGHT ' + g.def.endlessIdx : 'NIGHT ' + g.def.n + ' · ' + g.def.title.toUpperCase();
    ctx.font = `20px ${A.F.display}`;
    const w = ctx.measureText(label).width + 50;
    A.poly(ctx, [[-w / 2 - 18, 4], [-w / 2, -14], [w / 2, -14], [w / 2 + 18, 4], [w / 2, 16], [-w / 2, 16]], 30, 0.6);
    A.fs(ctx, g.def.halloween ? '#d8733a' : '#c94f3d', 3);
    A.text(ctx, label, 0, 2, { size: 20, color: '#fff6e6', outline: 0 });
    ctx.restore();
    // envelopes
    const n = g.people();
    const sp = 40;
    const x0 = cx - ((n - 1) * sp) / 2 - 30;
    const subs = [g.mySubmitted].concat(g.students.map((s) => s.state === 'submitted'));
    A.rr(ctx, x0 - 24, 50, (n - 1) * sp + 48, 32, 12, 39, 0.5);
    A.fs(ctx, 'rgba(43,27,51,0.6)', 0);
    for (let i = 0; i < n; i++) {
      const x = x0 + i * sp, y = 66;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(i * 1.7) * 0.08);
      A.rr(ctx, -15, -10, 30, 21, 3, 40 + i, 0.4);
      A.fs(ctx, subs[i] ? '#fff6e6' : 'rgba(255,246,230,0.35)', 2.4);
      ctx.strokeStyle = A.INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-15, -9);
      ctx.lineTo(0, 2);
      ctx.lineTo(15, -9);
      ctx.stroke();
      if (subs[i]) {
        ctx.fillStyle = '#e0524a';
        ctx.beginPath();
        ctx.arc(0, 2, 5, 0, U.TAU);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
    const count = g.submittedCount();
    const met = count >= g.def.quota;
    const tx = x0 + n * sp - 6;
    A.rr(ctx, tx, 54, 84, 26, 8, 50, 0.5);
    A.fs(ctx, met ? '#6cbf6a' : '#fffaf0', 2.5);
    A.text(ctx, met ? 'QUOTA MET' : 'NEED ' + g.def.quota, tx + 42, 68, { size: 14, color: met ? '#fff' : A.INK, outline: 0 });
    const ext = g.run.extensions || 0;
    for (let i = 0; i < ext; i++) A.icon(ctx, 'ticket', tx + 104 + i * 26, 67, 11, null);

  }

  function drawScore(ctx, g) {
    const total = g.run.score + g.nightScore;
    const done = card(ctx, W - 224, 14, 206, 96, 0.022, PAPER, 60);
    tape(ctx, 0, -48, -0.1);
    A.text(ctx, 'SCORE', -88, -28, { size: 14, color: A.C.inkSoft, outline: 0, align: 'left' });
    A.text(ctx, U.fmtNum(total), 88, 0, { size: 34, color: A.INK, outline: 0, align: 'right' });
    // flow
    const f = g.flow;
    const col = ['#b9b0c0', '#f6c945', '#f6c945', '#f08a3c', '#f08a3c', '#e0524a', '#e0524a', '#c25b8f', '#8a5ac2'][f];
    ctx.save();
    ctx.translate(-56, 28);
    ctx.rotate(-0.06);
    A.rr(ctx, -34, -11, 68, 22, 8, 61, 0.4);
    A.fs(ctx, col, 2.4);
    A.text(ctx, 'FLOW x' + f, 0, 1, { size: 14, color: '#fff', outline: 3 });
    ctx.restore();
    if (f > 1) {
      A.rr(ctx, -16, 24, 104, 8, 3, 62, 0.3);
      A.fs(ctx, '#e8dcc8', 2);
      ctx.fillStyle = col;
      ctx.fillRect(-14, 26, 100 * U.clamp(g.flowT / (6 * g.stats.flowMul), 0, 1), 4);
    } else {
      A.text(ctx, 'fix stuff fast!', 34, 28, { size: 14, font: A.F.hand, color: A.C.inkSoft, outline: 0 });
    }
    done();
  }

  // --- abilities --------------------------------------------------------------------------
  function badge(ctx, x, y, icon, key, cd, extra) {
    A.el(ctx, x + 2, y + 4, 27, 27, x, 0.5, 12);
    A.fs(ctx, 'rgba(20,8,30,0.45)', 0);
    A.el(ctx, x, y, 27, 27, x + 1, 0.5, 12);
    A.fs(ctx, cd > 0 ? '#c9bfcc' : '#fffaf0', 3);
    A.icon(ctx, icon, x, y, 15, null);
    if (cd > 0) {
      ctx.fillStyle = 'rgba(43,27,51,0.55)';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, 25, -Math.PI / 2, -Math.PI / 2 + U.TAU * cd);
      ctx.closePath();
      ctx.fill();
    }
    HUD.keycap(ctx, key, x, y + 36, { size: 11 });
    if (extra) extra();
  }
  function drawAbilities(ctx, g) {
    const p = g.player;
    const y = H - 62;
    badge(ctx, 50, y, 'dash', HUD.keyName('dash'), p.charges > 0 ? 0 : 1 - p.rechargeT / (0.95 * g.stats.dashCd), () => {
      for (let i = 0; i < p.maxCharges; i++) {
        ctx.fillStyle = i < p.charges ? '#f08a3c' : '#5a4360';
        ctx.beginPath();
        ctx.arc(50 - (p.maxCharges - 1) * 6 + i * 12, y - 33, 4.5, 0, U.TAU);
        ctx.fill();
        ctx.strokeStyle = A.INK;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });
    badge(ctx, 116, y, 'shh', HUD.keyName('shush'), p.shushCd > 0 ? p.shushCd / g.stats.shushCd : 0);
    // hands
    const hx = 182;
    A.el(ctx, hx, y, 27, 27, hx + 1, 0.5, 12);
    A.fs(ctx, p.carry ? '#fff3c4' : 'rgba(255,250,240,0.55)', 3);
    if (p.carry) {
      const ic = { coffee: 'coffee', bucket: 'bucket', pizza: 'pizza', toddler: 'toddler' }[p.carry];
      A.icon(ctx, ic, hx, y, 15, null);
      if (p.carry === 'pizza' && p.carryData) A.text(ctx, 'x' + p.carryData.slices, hx + 20, y + 18, { size: 13, color: '#fff', outline: 4 });
    } else A.text(ctx, 'hands', hx, y, { size: 13, font: A.F.hand, color: A.C.inkSoft, outline: 0 });
    A.text(ctx, p.carry ? p.carry.toUpperCase() : 'EMPTY', hx, y + 36, { size: 11, color: '#fff', outline: 4 });
    if (g.coffeeCd > 0) A.text(ctx, 'coffee restock ' + Math.ceil(g.coffeeCd) + 's', 116, y - 46, { size: 13, font: A.F.hand, color: '#fff', outline: 4 });
  }

  // --- essay ------------------------------------------------------------------------------
  let essayAnim = 0;
  const READER = { skin: '#c98e64', hair: '#5a3a22', hairStyle: 'short', top: '#2f5d8a', top2: '#e0524a', acc: 'glasses2', seed: 95 };
  function drawEssay(ctx, g) {
    const p = g.player;
    const E = g.essay;
    const target = p.seated ? 1 : 0;
    essayAnim = U.approach(essayAnim, target, (1 / 60) * 6);
    const k = U.ease.outCubic(essayAnim);
    g.cardRects = null;
    // compact bar
    const cw = 400, cx0 = W / 2 - cw / 2 + 30, by = H - 46 + k * 80;
    if (k < 1) {
      const done = card(ctx, cx0, by - 22, cw, 46, -0.01, PAPER, 70);
      A.text(ctx, g.mySubmitted ? 'ESSAY SENT!' : 'YOUR ESSAY', -cw / 2 + 14, 1, { size: 15, color: g.mySubmitted ? '#3f8f5e' : A.INK, outline: 0, align: 'left' });
      const ix = -cw / 2 + 118, iw = cw - 132;
      A.rr(ctx, ix, -8, iw, 16, 6, 71, 0.4);
      A.fs(ctx, '#3a2a44', 2.4);
      ctx.fillStyle = g.mySubmitted ? '#6cbf6a' : '#8fd3f4';
      ctx.beginPath();
      ctx.roundRect(ix + 2, -6, Math.max(0.1, (iw - 4) * g.myProgress / 100), 12, 4);
      ctx.fill();
      A.text(ctx, Math.floor(g.myProgress) + '%', ix + iw / 2, 1, { size: 12, color: '#fff', outline: 3 });
      done();
      const proofing = g.mySubmitted && g.proofTarget();
      if ((!g.mySubmitted || proofing) && !p.seated && g.phase === 'play' && !g.hideSeatHint) {
        const near = U.dist(p.x, p.y, Wd.playerSeat.x, Wd.playerSeat.y) < 66;
        if (!near) {
          const s = Wd.playerSeat;
          const b = Math.sin(g.realT * 4) * 3;
          ctx.save();
          ctx.globalAlpha = 0.85;
          A.text(ctx, g.activeTrouble() === 0 ? (proofing ? 'ALL CALM: GO PROOFREAD!' : 'ALL CALM: GO WRITE!') : 'YOUR SEAT', s.x, s.y - 98 + b, { size: 13, color: '#ffe08a', outline: 4 });
          ctx.fillStyle = '#ffe08a';
          ctx.beginPath();
          ctx.moveTo(s.x - 7, s.y - 88 + b);
          ctx.lineTo(s.x + 7, s.y - 88 + b);
          ctx.lineTo(s.x, s.y - 79 + b);
          ctx.fill();
          ctx.restore();
        }
      }
    }
    if (k <= 0.01) return;
    const pw = 800, ph = 246;
    const px = W / 2 - pw / 2, py = H - ph * k + 8;
    ctx.save();
    A.rr(ctx, px + 4, py + 8, pw, ph, 16, 80, 0.6);
    A.fs(ctx, 'rgba(20,8,30,0.5)', 0);
    A.rr(ctx, px, py, pw, ph, 16, 81, 0.6);
    A.fs(ctx, '#3a2f48', 3);
    // document
    const dx = px + 14, dy = py + 12, dw = pw - 220, dh = 92;
    A.rr(ctx, dx, dy, dw, dh, 6, 82, 0.4);
    A.fs(ctx, '#fffdf7', 2.4);
    ctx.fillStyle = '#ece4f6';
    ctx.fillRect(dx + 2, dy + 2, dw - 4, 20);
    const pt = g.mySubmitted && g.proofTarget();
    A.text(ctx, pt ? 'PROOFREADING ' + pt.name.toUpperCase() + '’S ESSAY · ' + Math.floor(pt.progress) + '%' : E.prompt, dx + 10, dy + 12, { size: pt ? 13 : 14, font: pt ? A.F.display : A.F.hand, color: pt ? '#2f5d8a' : A.C.inkSoft, outline: 0, align: 'left' });
    A.text(ctx, Math.round(g.myProgress * 6.5) + ' / 650 words', dx + dw - 10, dy + 12, { size: 14, font: A.F.hand, color: A.C.inkSoft, outline: 0, align: 'right' });
    ctx.font = `16px ${A.F.hand}`;
    const shown = [];
    for (const l of E.lines) shown.push({ text: l.text, kind: l.kind });
    if (E.typing) shown.push({ text: E.typing.text.slice(0, Math.floor(E.typing.n)), kind: E.typing.fog ? 'fog' : 'typing', cursor: true });
    const wrapped = [];
    for (const l of shown) A.wrap(ctx, l.text || ' ', dw - 24).forEach((t, i, arr) => wrapped.push({ t, kind: l.kind, cursor: l.cursor && i === arr.length - 1 }));
    const vis = wrapped.slice(-3);
    if (!vis.length) vis.push({ t: 'Pick your opening line below.', kind: 'hint' });
    vis.forEach((l, i) => {
      const ly = dy + 36 + i * 20;
      const col = l.kind === 'cliche' || l.kind === 'fog' ? '#a0909a' : l.kind === 'hint' ? '#b0a6b8' : A.INK;
      A.text(ctx, l.t, dx + 12, ly, { size: 16, font: A.F.hand, color: col, outline: 0, align: 'left' });
      if (l.cursor && Math.sin(g.realT * 9) > 0) {
        ctx.font = `16px ${A.F.hand}`;
        ctx.fillStyle = A.INK;
        ctx.fillRect(dx + 13 + ctx.measureText(l.t).width, ly - 8, 2, 16);
      }
    });
    // reader
    const rx = px + pw - 196, ry = py + 12, rw = 182, rh = 92;
    A.rr(ctx, rx, ry, rw, rh, 8, 83, 0.4);
    A.fs(ctx, '#f3ead8', 2.4);
    ctx.save();
    A.rr(ctx, rx + 6, ry + 6, 56, rh - 12, 6, 84, 0.3);
    A.fs(ctx, '#cfe0f0', 2);
    A.rr(ctx, rx + 6, ry + 6, 56, rh - 12, 6, 84, 0.3);
    ctx.clip();
    const mood = E.reactT > 0 ? (E.reaction.kind === 'match' ? 'happy' : E.reaction.kind === 'meh' ? 'neutral' : 'angry') : 'neutral';
    A.person(ctx, rx + 34, ry + 118, READER, { pose: 'stand', emo: mood, t: g.realT, scale: 1.25, noShadow: true });
    ctx.restore();
    const tone = MB.TONES[E.want];
    A.text(ctx, 'THE READER WANTS', rx + 70, ry + 18, { size: 11, color: A.C.inkSoft, outline: 0, align: 'left' });
    const pulse = 1 + E.wantFlash * 0.25 * Math.sin(g.realT * 20);
    ctx.save();
    ctx.translate(rx + 84, ry + 46);
    ctx.scale(pulse, pulse);
    A.icon(ctx, 'tone-' + E.want, 0, 0, 13, '#fffaf0');
    ctx.restore();
    A.text(ctx, tone.name, rx + 102, ry + 47, { size: 24, color: tone.col, outline: 3, align: 'left' });
    if (E.reactT > 0) {
      A.text(ctx, '“' + E.reaction.text + '”', rx + 70, ry + 76, { size: 15, font: A.F.hand, color: E.reaction.kind === 'match' ? '#3f8f5e' : E.reaction.kind === 'meh' ? A.C.inkSoft : '#c94f3d', outline: 0, align: 'left' });
    } else A.text(ctx, 'for ' + E.wantLeft + ' more line' + (E.wantLeft > 1 ? 's' : ''), rx + 70, ry + 76, { size: 14, font: A.F.hand, color: A.C.inkSoft, outline: 0, align: 'left' });
    // cards
    const cy = py + 114, ch = 92, gap = 12;
    const cwid = (pw - 28 - gap * 2) / 3;
    const fog = E.foggy();
    const keys = MB.Input.lastDevice === 'touch' ? ['TAP', 'TAP', 'TAP'] : MB.Input.lastDevice === 'pad' ? ['◀', '▲', '▶'] : ['←', '↑', '→'];
    const rects = [];
    E.cards.forEach((c, i) => {
      const cx = px + 14 + i * (cwid + gap);
      const chosen = E.typing && E.choiceIdx === i;
      const dim = E.typing && !chosen;
      const intro = U.ease.outBack(U.clamp((E.dealT - i * 0.06) / 0.25, 0, 1));
      const isFog = fog && i === E.fogIdx && !E.typing;
      const hover = !E.typing && U.inRect(MB.Input.mouse.x, MB.Input.mouse.y, { x: cx, y: cy, w: cwid, h: ch });
      ctx.save();
      ctx.globalAlpha = dim ? 0.35 : 1;
      ctx.translate(cx + cwid / 2, cy + ch / 2 + (1 - intro) * 40 - (chosen ? 6 : hover ? 4 : 0));
      if (isFog) ctx.rotate(Math.sin(g.realT * 13 + i) * 0.03);
      A.rr(ctx, -cwid / 2, -ch / 2, cwid, ch, 8, 85 + i, 0.5);
      A.fs(ctx, isFog ? '#d8d0dc' : chosen ? '#fff3c4' : '#fffaf0', chosen || hover ? 3.5 : 2.6, chosen || hover ? '#f6c945' : A.INK);
      HUD.keycap(ctx, keys[i], -cwid / 2 + 18, -ch / 2 + 15, { size: 12 });
      if (!isFog) A.icon(ctx, 'tone-' + c.tone, cwid / 2 - 18, -ch / 2 + 15, 11, null);
      const label = isFog ? 'BRAIN FOG' : c.tone === 'cliche' ? 'CLASSIC' : MB.TONES[c.tone].name;
      A.text(ctx, label, cwid / 2 - 34, -ch / 2 + 15, { size: 12, color: isFog ? '#8a7a90' : c.tone === 'cliche' ? '#8a7a90' : MB.TONES[c.tone].col, outline: 0, align: 'right' });
      ctx.font = `15px ${A.F.hand}`;
      const txt = isFog ? 'too noisy to think... (deal with the noise!)' : c.text;
      A.wrap(ctx, txt, cwid - 20).slice(0, 3).forEach((l, li) => A.text(ctx, l, -cwid / 2 + 10, -ch / 2 + 38 + li * 18, { size: 15, font: A.F.hand, color: isFog ? '#7a6a80' : A.INK, outline: 0, align: 'left' }));
      ctx.restore();
      rects.push({ x: cx, y: cy, w: cwid, h: ch });
    });
    g.cardRects = E.typing || (g.mySubmitted && !pt) ? null : rects;
    // footer
    const fy = py + ph - 22;
    let foot = 'Pick the line that matches what the reader wants.';
    if (g.mySubmitted) foot = pt ? 'Every good line boosts ' + pt.name + '’s essay!' : 'Everyone is done. Nice work!';
    else if (E.typing) foot = 'writing...  (mash keys to type faster)';
    else if (fog) foot = 'TOO NOISY: one card is fogged. Deal with the noise!';
    else if (E.streak > 1) foot = 'VOICE STREAK x' + E.streak + '! Keep matching the reader.';
    A.text(ctx, foot, px + 18, fy, { size: 14, color: fog && !E.typing ? '#ff9a8a' : E.streak > 1 ? '#ffe08a' : '#fff6e6', outline: 0, align: 'left' });
    A.text(ctx, MB.Input.lastDevice === 'touch' ? 'DASH: stand up' : MB.Input.lastDevice === 'pad' ? 'B: stand up' : '↓ / SHIFT: stand up', px + pw - 18, fy, { size: 13, color: '#c9bfd8', outline: 0, align: 'right' });
    ctx.fillStyle = '#5a4a6a';
    ctx.fillRect(px + 14, py + ph - 9, pw - 28, 5);
    ctx.fillStyle = g.mySubmitted ? '#6cbf6a' : '#8fd3f4';
    ctx.fillRect(px + 14, py + ph - 9, (pw - 28) * g.myProgress / 100, 5);
    ctx.restore();
  }

  // --- banners ---------------------------------------------------------------------------
  function drawBanners(ctx, g) {
    const b = g.banners[0];
    if (!b) return;
    const inK = U.clamp(b.t / 0.35, 0, 1);
    const outK = U.clamp((b.life - b.t) / 0.35, 0, 1);
    const k = Math.min(U.ease.outBack(inK), outK);
    if (k <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, outK * 1.5);
    const w = 420, h = 62;
    const x = W / 2 - w / 2;
    const yy = 98 - (1 - k) * 30;
    ctx.translate(W / 2, yy + h / 2);
    ctx.rotate(-0.012);
    ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k);
    ctx.translate(-W / 2, -(yy + h / 2));
    A.rr(ctx, x + 3, yy + 5, w, h, 12, 90, 0.5);
    A.fs(ctx, 'rgba(20,8,30,0.45)', 0);
    A.rr(ctx, x, yy, w, h, 12, 91, 0.5);
    A.fs(ctx, b.meta.good ? '#e8ffd8' : '#fffaf0', 3);
    A.icon(ctx, b.meta.icon, x + 34, yy + h / 2, 20, b.meta.good ? '#bff0a8' : '#ffd6cc');
    A.text(ctx, b.meta.name, x + 66, yy + 21, { size: 21, color: A.INK, outline: 0, align: 'left' });
    A.text(ctx, b.meta.hint, x + 66, yy + 44, { size: 16, font: A.F.hand, color: A.C.inkSoft, outline: 0, align: 'left' });
    if (b.isNew) {
      ctx.save();
      ctx.translate(x + w - 16, yy + 4);
      ctx.rotate(0.25);
      A.rr(ctx, -24, -11, 48, 22, 6, 92, 0.4);
      A.fs(ctx, '#e0524a', 2.4);
      A.text(ctx, 'NEW!', 0, 1, { size: 14, color: '#fff', outline: 0 });
      ctx.restore();
    }
    if (g.banners.length > 1) A.text(ctx, '+' + (g.banners.length - 1), x + w - 14, yy + h - 12, { size: 14, color: '#c94f3d', outline: 0, align: 'right' });
    ctx.restore();
  }

  // --- minigames ------------------------------------------------------------------------------
  function drawMinigame(ctx, g) {
    const m = g.minigame;
    const p = g.player;
    if (m.type === 'timing') {
      const w = 300, h = 92;
      const x = U.clamp(p.x - w / 2, 10, W - w - 10), y = U.clamp(p.y - 200, 120, H - h - 10);
      A.rr(ctx, x + 3, y + 5, w, h, 12, 100, 0.5);
      A.fs(ctx, 'rgba(20,8,30,0.45)', 0);
      A.rr(ctx, x, y, w, h, 12, 101, 0.5);
      A.fs(ctx, m.flash > 0 ? (m.good ? '#d8ffd0' : '#ffd6cc') : '#fffaf0', 3);
      A.text(ctx, MB.Input.lastDevice === 'touch' ? 'TAP ACT IN THE GREEN!' : 'HIT ' + HUD.keyName('act') + ' IN THE GREEN!', x + w / 2, y + 18, { size: 16, color: A.INK, outline: 0 });
      const gx = x + 20, gy = y + 36, gw = w - 40, gh = 22;
      A.rr(ctx, gx, gy, gw, gh, 6, 102, 0.4);
      A.fs(ctx, '#3a2a44', 2.4);
      ctx.fillStyle = '#6cbf6a';
      ctx.fillRect(gx + gw * (m.zone - m.w / 2), gy + 2, gw * m.w, gh - 4);
      ctx.fillStyle = '#9fe08a';
      ctx.fillRect(gx + gw * (m.zone - m.w / 6), gy + 2, gw * m.w / 3, gh - 4);
      const nx = gx + gw * m.needle;
      ctx.fillStyle = '#e0524a';
      ctx.strokeStyle = A.INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(nx - 7, gy - 8);
      ctx.lineTo(nx + 7, gy - 8);
      ctx.lineTo(nx + 2, gy + gh + 4);
      ctx.lineTo(nx - 2, gy + gh + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      for (let i = 0; i < m.ev.need; i++) {
        ctx.fillStyle = i < m.ev.hits ? '#6cbf6a' : '#e8dcc8';
        ctx.beginPath();
        ctx.arc(x + w / 2 - (m.ev.need - 1) * 12 + i * 24, y + 76, 7, 0, U.TAU);
        ctx.fill();
        ctx.stroke();
      }
    } else {
      const code = m.ev.code;
      const w = 70 + code.length * 52, h = 108;
      const sh = m.shake * 8 * Math.sin(m.t * 60);
      const x = U.clamp(p.x - w / 2, 10, W - w - 10) + sh, y = U.clamp(p.y - 220, 120, H - h - 10);
      A.rr(ctx, x + 3, y + 5, w, h, 12, 110, 0.5);
      A.fs(ctx, 'rgba(20,8,30,0.45)', 0);
      A.rr(ctx, x, y, w, h, 12, 111, 0.5);
      A.fs(ctx, '#ffe6e0', 3);
      A.text(ctx, 'ALARM RESET CODE', x + w / 2, y + 18, { size: 16, color: '#c23a32', outline: 0 });
      const rot = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 };
      code.forEach((d, i) => {
        const cx = x + 35 + 26 + i * 52, cy = y + 58;
        const done = i < m.idx, cur = i === m.idx;
        const bob = cur ? Math.sin(m.t * 10) * 3 : 0;
        A.rr(ctx, cx - 22, cy - 22 + bob, 44, 44, 8, 112 + i, 0.4);
        A.fs(ctx, done ? '#6cbf6a' : cur ? '#fff6e6' : '#d8cfd8', 2.6);
        ctx.save();
        ctx.translate(cx, cy + bob);
        ctx.rotate(rot[d]);
        ctx.fillStyle = done ? '#fff' : A.INK;
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-2, -11);
        ctx.lineTo(-2, -5);
        ctx.lineTo(-11, -5);
        ctx.lineTo(-11, 5);
        ctx.lineTo(-2, 5);
        ctx.lineTo(-2, 11);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
      A.text(ctx, MB.Input.lastDevice === 'touch' ? 'swipe the arrows in order' : 'press the arrows (or WASD) in order', x + w / 2, y + 94, { size: 14, font: A.F.hand, color: A.C.inkSoft, outline: 0 });
    }
  }

  function drawCountdown(ctx, g) {
    const n = Math.ceil(g.cdT);
    const frac = g.cdT - Math.floor(g.cdT);
    const label = n > 3 ? '' : n >= 1 ? String(n) : '';
    const k = 1 - frac;
    const sc = k < 0.25 ? U.ease.outBack(k / 0.25) : 1;
    ctx.save();
    ctx.fillStyle = 'rgba(20,8,30,0.3)';
    ctx.fillRect(0, 0, W, H);
    ctx.translate(W / 2, H / 2 - 20);
    ctx.scale(sc, sc);
    if (label) A.text(ctx, label, 0, 0, { size: 140, color: '#ffe08a', outline: 12, shadow: 8 });
    ctx.restore();
    A.text(ctx, g.def.task, W / 2, H / 2 + 90, { size: 26, font: A.F.hand, color: '#fff', outline: 6 });
    A.text(ctx, 'Get ' + g.def.quota + ' of ' + g.people() + ' applications in by midnight', W / 2, H / 2 + 124, { size: 20, font: A.F.hand, color: '#ffe08a', outline: 5 });
  }

  // --- touch controls --------------------------------------------------------------------------
  function drawTouch(ctx, g) {
    const T = MB.touch;
    ctx.save();
    ctx.globalAlpha = 0.75;
    if (T.stick.id != null) {
      A.el(ctx, T.stick.ox, T.stick.oy, 60, 60, 1, 0.5, 14);
      A.fs(ctx, 'rgba(255,250,240,0.15)', 3);
      A.el(ctx, T.stick.ox + MB.Input.stick.x * 40, T.stick.oy + MB.Input.stick.y * 40, 26, 26, 2, 0.5, 10);
      A.fs(ctx, 'rgba(255,250,240,0.6)', 3);
    }
    for (const b of T.buttons) {
      A.el(ctx, b.x, b.y, b.r, b.r, b.x, 0.5, 12);
      A.fs(ctx, b.down ? '#ffe08a' : 'rgba(255,250,240,0.7)', 3);
      A.text(ctx, b.label, b.x, b.y + 1, { size: b.r > 40 ? 20 : 15, color: A.INK, outline: 0 });
    }
    ctx.restore();
  }
})(window.MB);
