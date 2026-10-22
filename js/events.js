'use strict';
// Every distraction the library can throw at the study group.
(function (MB) {
  const U = MB.U, A = MB.A, Wd = MB.World, FX = MB.FX, Au = MB.Audio;

  const tableTop = (seat) => seat.table.y - seat.table.h;
  const studentPos = (s) => (s.state === 'study' || s.state === 'submitted' ? { x: s.seat.x, y: s.seat.y - 20 } : { x: s.x, y: s.y - 20 });

  class Ev {
    constructor(g, type) {
      this.g = g;
      this.type = type;
      this.meta = MB.EVENTS[type];
      this.t = 0;
      this.resolved = false;
      this.dead = false;
      this.chaos = 1;
      this.invalid = false;
    }
    update(dt) { this.t += dt; }
    drain() { return 0; }
    interactables() { return []; }
    draw() {}
    drawTop() {}
    lights() {}
    alert() { return null; }
    onShush() {}
    onDash() {}
    slowAt() { return 1; }
    end() {}
  }

  // 1. Phone buzz ---------------------------------------------------------------
  class PhoneEv extends Ev {
    constructor(g) {
      super(g, 'phone');
      this.target = g.pickStudent((s) => !s.flags.phone && !s.flags.asleep && !s.flags.chat);
      if (!this.target) return void (this.invalid = true);
      this.target.flags.phone = true;
      this.buzzT = 0;
      this.target.say(U.pick(['omg', 'wait who is texting', 'one sec...', 'lol']), 1.6);
    }
    get pos() {
      return { x: this.target.seat.x + 27, y: tableTop(this.target.seat) + 30 };
    }
    update(dt) {
      super.update(dt);
      if (this.resolved) return;
      if (this.target.state !== 'study') return this.g.fail(this);
      this.buzzT -= dt;
      if (this.buzzT <= 0) {
        this.buzzT = 1.2;
        Au.play('buzz', null, 0.2);
        const p = this.pos;
        FX.icon(p.x, p.y - 16, U.pick(['chat', 'phone', 'star']), { size: 8, bg: '#fffaf0', vy: -50 });
      }
    }
    drain(st) {
      if (this.resolved) return 0;
      if (st === this.target) return 13;
      return U.dist(st.seat.x, st.seat.y, this.target.seat.x, this.target.seat.y) < 140 ? 2 : 0;
    }
    interactables() {
      if (this.resolved) return [];
      return [{
        x: this.target.seat.x, y: this.target.seat.y, r: 82, prio: 6, label: 'Confiscate phone',
        press: () => {
          const p = this.pos;
          const jail = Wd.stations.jail;
          FX.arc(p.x, p.y, jail.x, jail.y, 'phone', { life: 0.7, height: 140, onDone: () => { Au.play('thud'); FX.dust(jail.x, jail.y, 4); } });
          Au.play('yoink');
          this.target.say(U.pick(['hey!!', '...fair', 'my streak!!', 'ok ok']), 1.6);
          this.g.resolve(this, 100, 'YOINK!', p.x, p.y - 30);
        },
      }];
    }
    draw(list) {
      if (this.resolved) return;
      const t = this.target.seat.table;
      list.push({ y: t.y + t.d + 0.2, fn: (ctx) => A.phone(ctx, this.pos.x, this.pos.y, true, this.t) });
    }
    lights(L) {
      if (!this.resolved) L.push({ x: this.pos.x, y: this.pos.y, r: 50, c: 'rgba(160,230,255,0.6)', glow: 'rgba(160,230,255,0.25)' });
    }
    alert() { return { x: this.target.seat.x + 26, y: this.target.seat.y - 104 }; }
    end() { if (this.target) this.target.flags.phone = false; }
  }

  // 2. Loud talker -----------------------------------------------------------------
  const TALK = ['...AND THEN SHE SAID...', 'CAN YOU HEAR ME NOW?', 'NO, THE OTHER CASSEROLE', "I'M AT THE LIBRARY!", "HOLD ON, I'M IN A TUNNEL", 'YOUR UNCLE SAYS HI', 'SPEAKERPHONE IS FINE', 'WHAT? WHAT?? WHAT???'];
  class TalkerEv extends Ev {
    constructor(g) {
      super(g, 'talker');
      this.npc = new MB.Walker(MB.randomPatron(), U.rand(630, 690), 760, 80);
      this.state = 'enter';
      this.pause = 0;
      this.ringT = 0;
      this.line = U.pick(TALK);
      this.lineT = 2.5;
      this.pickSpot();
      Au.play('talk');
    }
    pickSpot() {
      const p = Wd.randomFloorPoint({ x1: 300, x2: 940, y1: 220, y2: 600 });
      this.npc.goTo(p.x, p.y);
    }
    update(dt) {
      super.update(dt);
      const n = this.npc;
      if (this.state === 'leave') {
        if (n.step(dt, 1.8)) this.dead = true;
        return;
      }
      if (n.step(dt)) {
        this.pause -= dt;
        if (this.pause <= 0) {
          this.pause = U.rand(1, 2.5);
          this.pickSpot();
        }
      }
      this.ringT -= dt;
      if (this.ringT <= 0) {
        this.ringT = 0.55;
        FX.ring(n.x, n.y - 50, 10, 70, 'rgba(255,190,110,0.9)', 0.6, 4);
        Au.play('talk', null, 0.3);
      }
      this.lineT -= dt;
      if (this.lineT <= 0) {
        this.lineT = 2.5;
        this.line = U.pick(TALK);
      }
    }
    drain(st) {
      if (this.resolved) return 0;
      const p = studentPos(st);
      const d = U.dist(p.x, p.y, this.npc.x, this.npc.y);
      return d < 180 ? 9 * (1 - (d / 180) * 0.5) : 0;
    }
    shushed(label) {
      if (this.resolved) return;
      this.state = 'leave';
      this.npc.goTo(Wd.entrance.x, Wd.entrance.y);
      this.npc.path.unshift({ x: this.npc.x, y: this.npc.y });
      this.g.resolve(this, 120, label, this.npc.x, this.npc.y - 90);
    }
    interactables() {
      if (this.resolved) return [];
      return [{ x: this.npc.x, y: this.npc.y, r: 64, prio: 6, label: 'Shush them', press: () => { this.g.player.shushT = 0.4; Au.play('shh'); this.shushed('SHUSHED!'); } }];
    }
    onShush(x, y, r) {
      if (U.dist(x, y, this.npc.x, this.npc.y) < r) this.shushed('SHHH!');
    }
    draw(list) {
      const n = this.npc;
      list.push({
        y: n.y, fn: (ctx) => {
          n.draw(ctx, { pose: this.resolved ? 'walk' : n.moving ? 'walk' : 'talk', emo: this.resolved ? 'blush' : 'happy' });
          if (!this.resolved) A.phone(ctx, n.x + (n.face === 'side' ? n.dir * 13 : 13), n.y - 58, true, this.t);
        },
      });
    }
    drawTop(ctx) {
      if (!this.resolved) A.bubble(ctx, this.npc.x, this.npc.y - 86, this.line, { size: 15, font: A.F.display, bg: '#ffe9c8' });
    }
    alert() { return this.resolved ? null : { x: this.npc.x, y: this.npc.y - 130 }; }
  }

  // 3. Rogue roomba ---------------------------------------------------------------
  class RoombaEv extends Ev {
    constructor(g) {
      super(g, 'roomba');
      const d = Wd.stations.dock;
      this.x = d.x + 30;
      this.y = d.y - 20;
      this.ang = -0.6 + U.rand(-0.3, 0.3);
      this.speed = 175;
      this.flipped = false;
      this.stunT = 0;
      this.honkT = 1;
      this.cd = new Map();
      this.flipT = 0;
      this.chaos = 1;
    }
    update(dt) {
      super.update(dt);
      if (this.flipped) {
        this.flipT += dt;
        if (this.flipT > 2.4) {
          FX.dust(this.x, this.y, 6);
          this.dead = true;
        }
        return;
      }
      if (this.stunT > 0) {
        this.stunT -= dt;
        return;
      }
      this.speed = Math.min(250, this.speed + dt * 4);
      const sp = this.speed * dt;
      const nx = this.x + Math.cos(this.ang) * sp;
      if (Wd.blocked(nx, this.y, 18)) {
        this.ang = Math.PI - this.ang + U.rand(-0.3, 0.3);
        this.bonk();
      } else this.x = nx;
      const ny = this.y + Math.sin(this.ang) * sp;
      if (Wd.blocked(this.x, ny, 18)) {
        this.ang = -this.ang + U.rand(-0.3, 0.3);
        this.bonk();
      } else this.y = ny;
      if (Math.random() < dt * 0.3) this.ang += U.rand(-1, 1);
      // bump students' chairs
      for (const s of this.g.students) {
        if (s.state !== 'study') continue;
        if (U.dist(this.x, this.y, s.seat.x, s.seat.y - 12) < 50 && (this.cd.get(s) || 0) <= this.t) {
          this.cd.set(s, this.t + 2.5);
          s.focus = Math.max(0, s.focus - 12);
          s.shockT = 0.8;
          s.say(U.pick(MB.LINES.hurt), 1.2);
          FX.paper(s.seat.x, s.seat.y - 30, 3);
          Au.play('thud', null, 0.1);
        }
      }
      // shove the player
      const p = this.g.player;
      if (!p.seated && !p.dashing && U.dist(p.x, p.y, this.x, this.y) < 28) {
        const a = Math.atan2(p.y - this.y, p.x - this.x);
        Wd.moveCircle(p, Math.cos(a) * 14, Math.sin(a) * 14, 12);
        this.ang = a + Math.PI + U.rand(-0.4, 0.4);
        this.bonk();
      }
    }
    bonk() {
      if (this.honkT < this.t) {
        this.honkT = this.t + 0.8;
        Au.play('honk', null, 0.2);
        FX.text(this.x, this.y - 34, 'MEEP', { size: 16, col: '#ffd0d0', life: 0.7 });
      }
    }
    drain(st) {
      if (this.resolved) return 0;
      const p = studentPos(st);
      return U.dist(p.x, p.y, this.x, this.y) < 130 ? 5 : 0;
    }
    onDash(p) {
      if (this.flipped || U.dist(p.x, p.y, this.x, this.y - 4) > 38) return;
      this.flipped = true;
      this.g.hitstop(0.08);
      this.g.shake(9);
      FX.sparks(this.x, this.y - 10, 14);
      FX.ring(this.x, this.y - 6, 10, 60, '#fff', 0.35, 5);
      Au.play('tackle');
      this.g.resolve(this, 150, 'FLIPPED!', this.x, this.y - 50);
    }
    onShush(x, y, r) {
      if (!this.flipped && U.dist(x, y, this.x, this.y) < r) {
        this.stunT = 2.2;
        FX.text(this.x, this.y - 40, 'stunned!', { size: 15, col: '#bfe3ff' });
      }
    }
    interactables() {
      if (this.resolved) return [];
      return [{ x: this.x, y: this.y, r: 90, prio: 1, hintOnly: true, label: 'DASH into it!', key: 'dash' }];
    }
    draw(list) {
      list.push({ y: this.y, fn: (ctx) => A.roomba(ctx, this.x, this.y, this.t, this.flipped, this.ang, true) });
    }
    lights(L) {
      if (!this.flipped) L.push({ x: this.x, y: this.y - 16, r: 60, c: Math.sin(this.t * 16) > 0 ? 'rgba(255,80,80,0.6)' : 'rgba(0,0,0,0)', glow: null });
    }
    alert() { return this.resolved ? null : { x: this.x, y: this.y - 60 }; }
  }

  // 4. Book avalanche ---------------------------------------------------------------
  class AvalancheEv extends Ev {
    constructor(g) {
      super(g, 'avalanche');
      this.shelf = U.pick(Wd.shelves);
      this.prop = Wd.props.find((p) => p.o === this.shelf);
      this.phase = 'wobble';
      this.wob = 1.5;
      this.piles = [];
      this.chaos = 0;
      Au.play('thud');
    }
    update(dt) {
      super.update(dt);
      if (this.phase === 'wobble') {
        this.wob -= dt;
        this.prop.shake = Math.sin(this.t * 45) * 3.5;
        if (Math.random() < dt * 6) Au.play('book', null, 0.1);
        if (this.wob <= 0) this.crash();
      }
      if (this.resolved && this.t - this.resolvedAt > 0.5) this.dead = true;
    }
    crash() {
      this.phase = 'fallen';
      this.prop.shake = 0;
      this.chaos = 2;
      const s = this.shelf;
      Au.play('crash');
      this.g.shake(12);
      for (let i = 0; i < 4; i++) FX.books(s.x + 30 + i * 60, s.y - 40, 4);
      const xs = U.shuffle([0.15, 0.38, 0.62, 0.85]);
      const need = this.g.has('grabby') ? 2 : 4;
      for (let i = 0; i < 4; i++) {
        const x = s.x + s.w * xs[i] + U.rand(-15, 15);
        const y = s.y + s.d + U.rand(22, 46);
        if (!Wd.blocked(x, y, 6)) this.piles.push({ x, y, n: need, seed: U.randi(1, 999) });
      }
      if (!this.piles.length) this.piles.push({ x: s.x + s.w / 2, y: s.y + s.d + 30, n: need, seed: 5 });
      for (const st of this.g.students) {
        if (st.state !== 'study') continue;
        if (U.dist(st.seat.x, st.seat.y, s.x + s.w / 2, s.y) < 420) {
          st.focus = Math.max(0, st.focus - 20);
          st.shockT = 1;
        }
      }
      FX.pop(s.x + s.w / 2, s.y - 60, 'CRASH!', { size: 44, col: '#f08a3c' });
    }
    slowAt(x, y) {
      for (const p of this.piles) if (U.dist(x, y, p.x, p.y) < 26) return 0.5;
      return 1;
    }
    interactables() {
      if (this.phase !== 'fallen' || this.resolved) return [];
      return this.piles.map((p) => ({
        x: p.x, y: p.y, r: 48, prio: 4, label: 'Reshelve', mash: true,
        press: () => {
          p.n--;
          const s = this.shelf;
          FX.arc(p.x, p.y - 10, s.x + U.rand(20, s.w - 20), s.y - s.h + 40, 'book', { life: 0.4, height: 70, col: U.pick(A.C.books) });
          Au.play('book');
          FX.dust(p.x, p.y, 2);
          if (p.n <= 0) {
            this.piles.splice(this.piles.indexOf(p), 1);
            Au.play('pop');
            if (!this.piles.length) {
              this.resolvedAt = this.t;
              this.g.resolve(this, 160, 'TIDY!', s.x + s.w / 2, s.y - 40);
            }
          }
        },
      }));
    }
    draw(list) {
      for (const p of this.piles) list.push({ y: p.y, fn: (ctx) => { A.shadow(ctx, p.x, p.y + 2, 18, 5); A.bookPile(ctx, p.x, p.y, p.n + 1, p.seed); } });
    }
    alert() {
      const s = this.shelf;
      if (this.phase === 'wobble') return { x: s.x + s.w / 2, y: s.y - s.h - 20 };
      if (!this.piles.length) return null;
      return { x: this.piles[0].x, y: this.piles[0].y - 50 };
    }
    end() { this.prop.shake = 0; }
  }

  // 5. Printer jam -----------------------------------------------------------------------
  class PrinterEv extends Ev {
    constructor(g) {
      super(g, 'printer');
      this.st = Wd.stations.printer;
      this.prop = Wd.props.find((p) => p.o === this.st);
      this.hits = 0;
      this.need = 3;
      this.spew = 0;
      this.grind = 0;
    }
    update(dt) {
      super.update(dt);
      if (this.resolved) return void (this.dead = true);
      this.prop.shake = Math.sin(this.t * 50) * 1.6;
      this.spew -= dt;
      if (this.spew <= 0) {
        this.spew = 0.16;
        FX.paper(this.st.x + 24, this.st.y - 40, 1, 220);
      }
      this.grind -= dt;
      if (this.grind <= 0) {
        this.grind = 0.45;
        Au.play('printer', null, 0.2);
      }
    }
    drain(st) {
      if (this.resolved) return 0;
      const p = studentPos(st);
      return U.dist(p.x, p.y, this.st.x + 38, this.st.y) < 260 ? 7 : 0;
    }
    interactables() {
      if (this.resolved) return [];
      return [{ x: this.st.use.x, y: this.st.use.y, r: 62, prio: 6, label: 'Fix printer', press: () => this.g.startMinigame('timing', this) }];
    }
    onHit() {
      this.hits++;
      FX.sparks(this.st.x + 38, this.st.y - 30, 8);
      Au.play('thunk');
      this.g.shake(3);
      if (this.hits >= this.need) {
        this.g.endMinigame();
        this.prop.shake = 0;
        this.g.resolve(this, 200, 'FIXED!', this.st.x + 38, this.st.y - 70);
        return true;
      }
      return false;
    }
    onMiss() {
      const p = this.g.player;
      p.stunT = 0.45;
      FX.paper(p.x, p.y - 50, 5, 160);
      Au.play('bad');
      FX.text(p.x, p.y - 80, 'BZZT', { size: 18, col: '#ff9a8a' });
    }
    lights(L) {
      if (!this.resolved && Math.sin(this.t * 14) > 0) L.push({ x: this.st.x + 56, y: this.st.y - 30, r: 70, c: 'rgba(255,60,60,0.7)', glow: 'rgba(255,80,80,0.25)' });
    }
    alert() { return this.resolved ? null : { x: this.st.x + 38, y: this.st.y - 80 }; }
    end() { this.prop.shake = 0; }
  }

  // 6. Wi-Fi down -------------------------------------------------------------------------
  class WifiEv extends Ev {
    constructor(g) {
      super(g, 'wifi');
      this.chaos = 2;
      this.st = Wd.stations.router;
      Au.play('powerdown');
      for (const s of g.students) if (s.state === 'study') s.say(U.pick(['wifi??', 'NOOO my draft', 'is the wifi down', 'it says offline']), 1.8);
    }
    update(dt) {
      super.update(dt);
      if (this.resolved) return void (this.dead = true);
      for (const s of this.g.students) s.flags.wifi = s.state === 'study';
      if (this.g.has('ethernet') && this.t > 6) this.fix('AUTO-FIXED', 60);
    }
    fix(label, pts) {
      for (const s of this.g.students) s.flags.wifi = false;
      Au.play('powerup');
      this.g.resolve(this, pts, label, this.st.x + 30, this.st.y - 80);
      for (const s of this.g.students) if (s.state === 'study') FX.icon(s.seat.x, s.seat.y - 90, 'check', { bg: '#fffaf0', size: 10 });
    }
    interactables() {
      if (this.resolved) return [];
      return [{ x: this.st.use.x, y: this.st.use.y, r: 62, prio: 7, label: 'Unplug + replug', hold: { need: 1.5, fn: () => this.fix('WI-FI BACK!', 180) } }];
    }
    drawTop(ctx) {
      if (this.resolved) return;
      for (const s of this.g.students) {
        if (!s.flags.wifi) continue;
        const bob = Math.sin(this.t * 4 + s.idx) * 2;
        A.icon(ctx, 'wifi', s.seat.x + 28, s.seat.y - 40 + bob, 10);
      }
    }
    lights(L) {
      if (!this.resolved) L.push({ x: this.st.x + 30, y: this.st.y - 40, r: 80, c: Math.sin(this.t * 10) > 0 ? 'rgba(255,60,60,0.8)' : 'rgba(80,0,0,0.3)', glow: 'rgba(255,60,60,0.2)' });
    }
    alert() { return this.resolved ? null : { x: this.st.x + 30, y: this.st.y - 100 }; }
    end() { for (const s of this.g.students) s.flags.wifi = false; }
  }

  // 7. Pigeons / bats -------------------------------------------------------------------------
  class BirdsEv extends Ev {
    constructor(g) {
      super(g, 'birds');
      this.bat = !!g.def.halloween;
      const n = g.def.n >= 4 || g.endless ? 4 : 3;
      this.birds = [];
      for (let i = 0; i < n; i++) {
        const b = { x: U.rand(340, 940), gy: 200, h: 150 + i * 10, state: 'fly', t: U.rand(0, 5), dir: 1, perch: 0, target: null, out: false, gone: false };
        this.birds.push(b);
        this.retarget(b);
      }
      this.chaos = 1;
      Au.play('coo');
    }
    retarget(b) {
      const studs = this.g.students.filter((s) => s.state === 'study');
      if (studs.length && Math.random() < 0.75) {
        const s = U.pick(studs);
        b.target = s;
        b.tx = s.seat.x + U.rand(-40, 40);
        b.tgy = tableTop(s.seat) + 26;
        b.th = 0;
      } else {
        const p = Wd.randomFloorPoint();
        b.target = null;
        b.tx = p.x;
        b.tgy = p.y;
        b.th = 0;
      }
      b.state = 'fly';
    }
    flee(b) {
      const p = Wd.randomFloorPoint();
      b.target = null;
      b.tx = p.x;
      b.tgy = p.y;
      b.th = 50;
      b.state = 'flee';
      Au.play('flap', null, 0.1);
    }
    update(dt) {
      super.update(dt);
      const pl = this.g.player;
      for (const b of this.birds) {
        b.t += dt;
        if (b.gone) continue;
        if (b.out) {
          b.h += 260 * dt;
          b.gy -= 60 * dt;
          if (b.gy - b.h < -60) b.gone = true;
          continue;
        }
        if (b.state === 'perch') {
          b.perch -= dt;
          if (Math.random() < dt * 0.8) FX.paper(b.x, b.gy - 6, 1, 60);
          if (b.perch <= 0 || (b.target && b.target.state !== 'study')) this.retarget(b);
          if (!pl.seated && !pl.dashing && U.dist(pl.x, pl.y, b.x, b.gy) < 58) this.flee(b);
          continue;
        }
        const tx = b.tx, ty = b.tgy - b.th;
        const cy = b.gy - b.h;
        const dx = tx - b.x, dy = ty - cy;
        const d = Math.hypot(dx, dy);
        const sp = (b.state === 'flee' ? 300 : 210) * dt;
        b.dir = dx < 0 ? -1 : 1;
        if (d < sp + 2) {
          b.x = tx;
          b.gy = b.tgy;
          b.h = b.th;
          if (b.state === 'flee' || !b.target) {
            b.state = 'hop';
            b.perch = U.rand(1.2, 2.5);
            this.retarget(b);
            b.state = 'fly';
          } else {
            b.state = 'perch';
            b.perch = U.rand(3, 5);
            Au.play('coo', null, 0.4);
          }
        } else {
          b.x += (dx / d) * sp;
          const ny = cy + (dy / d) * sp + Math.sin(b.t * 8) * 1.2;
          // blend altitude down as we approach
          const k = U.clamp(1 - d / 300, 0, 1);
          b.h = U.lerp(Math.max(b.th, 40 + Math.sin(b.t * 3) * 10), b.th, k);
          b.gy = ny + b.h;
        }
      }
      if (!this.resolved && this.birds.every((b) => b.out)) {
        this.g.resolve(this, 120, this.bat ? 'BATS OUT!' : 'BIRDS OUT!', 640, 260);
      }
      if (this.resolved && this.birds.every((b) => b.gone)) this.dead = true;
    }
    bonk(b) {
      b.out = true;
      FX.feathers(b.x, b.gy - b.h, 10, this.bat ? '#4a3358' : '#c4cde0');
      FX.ring(b.x, b.gy - b.h, 6, 40, '#fff', 0.3, 4);
      Au.play('tackle');
      Au.play('coo');
      this.g.hitstop(0.05);
      this.g.shake(5);
      this.g.addPoints(60, b.x, b.gy - b.h - 20, 'BONK!');
      if (b.target) b.target.say('thank u', 1.2);
    }
    onDash(p) {
      for (const b of this.birds) {
        if (b.out) continue;
        // aim at the shadow: generous ground-plane hit, or a direct hit on the body
        if ((b.h < 150 && U.dist(p.x, p.y, b.x, b.gy) < 50) || U.dist(p.x, p.y - 30, b.x, b.gy - b.h) < 46) this.bonk(b);
      }
    }
    onShush(x, y, r) {
      for (const b of this.birds) if (!b.out && U.dist(x, y, b.x, b.gy) < r) this.flee(b);
    }
    drain(st) {
      if (this.resolved) return 0;
      let d = 0;
      for (const b of this.birds) {
        if (b.out) continue;
        if (b.state === 'perch' && b.target === st) d += 10;
        else if (U.dist(b.x, b.gy, st.seat.x, st.seat.y) < 100) d += 2;
      }
      return d;
    }
    interactables() {
      if (this.resolved) return [];
      const p = this.g.player;
      let best = null, bd = 1e9;
      for (const b of this.birds) {
        if (b.out) continue;
        const d = U.dist(p.x, p.y, b.x, b.gy);
        if (d < bd) { bd = d; best = b; }
      }
      return best ? [{ x: best.x, y: best.gy, r: 140, prio: 1, hintOnly: true, label: 'DASH into it!', key: 'dash' }] : [];
    }
    draw(list) {
      for (const b of this.birds) if (!b.gone && !b.out) list.push({ y: b.gy - 0.5, fn: (ctx) => A.shadow(ctx, b.x, b.gy + 6, 14, 5, 0.3 * U.clamp(1 - b.h / 260, 0.35, 1)) });
    }
    drawTop(ctx) {
      for (const b of this.birds) if (!b.gone) A.pigeon(ctx, b.x, b.gy - b.h, b.t, b.dir, b.state !== 'perch', this.bat);
    }
    alert() {
      const live = this.birds.filter((b) => !b.out);
      if (!live.length) return null;
      const b = live[0];
      return { x: b.x, y: b.gy - b.h - 40 };
    }
  }

  // 8. Senioritis nap -------------------------------------------------------------------------
  class SleeperEv extends Ev {
    constructor(g) {
      super(g, 'sleeper');
      this.target = g.pickStudent((s) => !s.flags.phone && !s.flags.asleep && !s.flags.chat);
      if (!this.target) return void (this.invalid = true);
      this.target.flags.asleep = true;
      this.shakes = 0;
      this.need = g.has('grabby') ? 4 : 7;
      this.zT = 0;
      this.snoreT = 1;
    }
    update(dt) {
      super.update(dt);
      if (this.resolved) return void (this.dead = true);
      if (this.target.state !== 'study') return this.g.fail(this);
      this.zT -= dt;
      if (this.zT <= 0) {
        this.zT = 0.7;
        FX.zzz(this.target.seat.x + 10, this.target.seat.y - 40);
      }
      this.snoreT -= dt;
      if (this.snoreT <= 0) {
        this.snoreT = 2.2;
        Au.play('snore', null, 0.5);
      }
    }
    wake(label, pts, boost) {
      const s = this.target;
      s.flags.asleep = false;
      s.shockT = 0.6;
      if (boost) {
        s.focus = 100;
        s.boostT = 10 * this.g.stats.coffee;
        s.say(U.pick(MB.LINES.coffee), 1.6);
      } else {
        s.focus = Math.max(s.focus, 60);
        s.say('i was resting my eyes', 1.6);
      }
      this.g.resolve(this, pts, label, s.seat.x, s.seat.y - 100);
    }
    interactables() {
      if (this.resolved) return [];
      const p = this.g.player;
      const s = this.target;
      if (p.carry === 'coffee') {
        return [{ x: s.seat.x, y: s.seat.y, r: 82, prio: 9, label: 'Give coffee', press: () => {
          p.carry = null;
          FX.arc(p.x, p.y - 60, s.seat.x, s.seat.y - 40, 'coffee', { life: 0.35, height: 50 });
          Au.play('slurp');
          this.wake('CAFFEINATED!', 260, true);
        } }];
      }
      return [{ x: s.seat.x, y: s.seat.y, r: 82, prio: 5, label: 'Shake awake', mash: true, press: () => {
        this.shakes++;
        s.shockT = 0.15;
        Au.play('pop');
        FX.dust(s.seat.x, s.seat.y - 30, 2);
        if (this.shakes >= this.need) this.wake('WAKE UP!', 120, false);
      } }];
    }
    alert() { return this.resolved ? null : { x: this.target.seat.x + 26, y: this.target.seat.y - 104 }; }
    end() { if (this.target) this.target.flags.asleep = false; }
  }

  // 9. Pizza delivery (opportunity) -------------------------------------------------------------
  class PizzaEv extends Ev {
    constructor(g) {
      super(g, 'pizza');
      this.chaos = 0;
      this.npc = new MB.Walker({ skin: '#c98e64', hair: '#2b1d1a', hairStyle: 'cap', hair2: '#e0524a', top: '#e0524a', top2: '#fbf3e4', pants: '#2b2733', seed: 91 }, 660, 760, 120);
      this.npc.goTo(660, 640);
      this.wait = 14;
      this.state = 'enter';
      Au.play('doorbell');
    }
    update(dt) {
      super.update(dt);
      const n = this.npc;
      if (this.state === 'leave') {
        if (n.step(dt, 1.3)) this.dead = true;
        return;
      }
      if (n.step(dt)) {
        n.face = 'down';
        this.wait -= dt;
        if (this.wait <= 0) this.leave();
      }
    }
    leave() {
      this.state = 'leave';
      this.npc.goTo(Wd.entrance.x, Wd.entrance.y);
      if (!this.resolved) {
        this.resolved = true;
        this.failed = true;
      }
    }
    interactables() {
      if (this.resolved) return [];
      const p = this.g.player;
      return [{ x: this.npc.x, y: this.npc.y, r: 64, prio: 7, label: p.carry ? 'Hands full!' : 'Grab the pizza', disabled: !!p.carry, press: () => {
        p.carry = 'pizza';
        p.carryData = { slices: 4 };
        Au.play('yoink');
        this.g.resolve(this, 100, 'PIZZA TIME!', this.npc.x, this.npc.y - 90);
        this.leave();
      } }];
    }
    draw(list) {
      const n = this.npc;
      list.push({ y: n.y, fn: (ctx) => n.draw(ctx, { pose: this.resolved ? n.moving ? 'walk' : 'stand' : 'carry', hold: this.resolved ? null : 'pizza', emo: 'happy', slices: 4 }) });
    }
    drawTop(ctx) {
      if (!this.resolved && this.state === 'enter' && !this.npc.moving) A.bubble(ctx, this.npc.x, this.npc.y - 112, 'pizza for... the library?', { size: 15 });
    }
    alert() { return this.resolved ? null : { x: this.npc.x, y: this.npc.y - 150 }; }
  }

  // 10. Storytime escape --------------------------------------------------------------------------
  class ToddlersEv extends Ev {
    constructor(g) {
      super(g, 'toddlers');
      const rug = Wd.stations.rug;
      const looks = U.shuffle(MB.TODDLERS);
      this.kids = [];
      for (let i = 0; i < 3; i++) {
        const k = new MB.Walker(looks[i], rug.x + U.rand(-30, 30), rug.y + U.rand(-10, 10), 150);
        k.scale = 0.62;
        k.state = 'run';
        k.stun = 0;
        k.slot = i;
        this.kids.push(k);
        this.runOff(k);
      }
      this.squeakT = 0;
      Au.play('squeak');
    }
    runOff(k) {
      const p = Wd.randomFloorPoint({ x1: 60, x2: 1200, y1: 220, y2: 690 });
      k.goTo(p.x, p.y);
    }
    update(dt) {
      super.update(dt);
      const p = this.g.player;
      const rug = Wd.stations.rug;
      for (const k of this.kids) {
        if (k.state === 'run') {
          if (k.step(dt)) this.runOff(k);
        } else if (k.state === 'stun') {
          k.t += dt;
          k.stun -= dt;
          if (k.stun <= 0) {
            k.state = 'run';
            this.runOff(k);
          }
        } else k.t += dt;
      }
      // auto drop when carrying a kid onto the rug
      if (p.carry === 'toddler' && p.carryData && p.carryData.ev === this) {
        const dx = (p.x - rug.x) / rug.rx, dy = (p.y - rug.y) / rug.ry;
        if (dx * dx + dy * dy < 0.8) this.dropOnRug(p.carryData.kid);
      }
      this.squeakT -= dt;
      if (this.squeakT <= 0 && this.kids.some((k) => k.state === 'run')) {
        this.squeakT = U.rand(0.8, 1.6);
        Au.play('squeak', null, 0.3);
      }
      if (this.resolved && this.t - this.resolvedAt > 5) this.dead = true;
    }
    dropOnRug(k) {
      const p = this.g.player;
      const rug = Wd.stations.rug;
      p.carry = null;
      p.carryData = null;
      k.state = 'rug';
      const a = -Math.PI / 2 + (k.slot - 1) * 0.9;
      k.x = rug.x + Math.cos(a) * 34;
      k.y = rug.y + 12 + Math.sin(a) * 18 + 22;
      k.face = 'down';
      Au.play('pop');
      FX.dust(k.x, k.y, 5);
      FX.icon(k.x, k.y - 50, 'star', { bg: null, size: 10 });
      this.g.addPoints(60, k.x, k.y - 60, 'STORYTIME!');
      if (this.kids.every((q) => q.state === 'rug')) {
        this.resolvedAt = this.t;
        this.g.resolve(this, 140, 'ALL TUCKED IN!', rug.x, rug.y - 110);
      }
    }
    drain(st) {
      if (this.resolved) return 0;
      let d = 0;
      const sp = studentPos(st);
      for (const k of this.kids) {
        if (k.state === 'run' && U.dist(sp.x, sp.y, k.x, k.y) < 150) d += 6;
        if (k.state === 'held' && U.dist(sp.x, sp.y, this.g.player.x, this.g.player.y) < 110) d += 2;
      }
      return d;
    }
    onShush(x, y, r) {
      for (const k of this.kids) {
        if (k.state === 'run' && U.dist(x, y, k.x, k.y) < r) {
          k.state = 'stun';
          k.stun = 2.6;
          k.path = [];
        }
      }
    }
    interactables() {
      if (this.resolved) return [];
      const p = this.g.player;
      const out = [];
      const rug = Wd.stations.rug;
      if (p.carry === 'toddler' && p.carryData && p.carryData.ev === this) {
        out.push({ x: rug.x, y: rug.y, r: 130, prio: 9, label: 'Drop at Storytime', press: () => this.dropOnRug(p.carryData.kid) });
        return out;
      }
      for (const k of this.kids) {
        if (k.state !== 'run' && k.state !== 'stun') continue;
        out.push({ x: k.x, y: k.y, r: 54, prio: 6, label: p.carry ? 'Hands full!' : 'Grab toddler', disabled: !!p.carry, press: () => {
          p.carry = 'toddler';
          p.carryData = { look: k.look, ev: this, kid: k };
          k.state = 'held';
          Au.play('squeak');
          FX.text(k.x, k.y - 50, 'wheee!', { size: 16, col: '#ffe08a' });
        } });
      }
      return out;
    }
    draw(list) {
      for (const k of this.kids) {
        if (k.state === 'held') continue;
        const pose = k.state === 'run' ? 'walk' : 'floor';
        const emo = k.state === 'stun' ? 'shock' : 'happy';
        list.push({ y: k.y, fn: (ctx) => A.person(ctx, k.x, k.y, k.look, { pose, face: k.state === 'run' ? k.face : 'down', dir: k.dir, t: k.t * (k.state === 'run' ? 1.5 : 1), emo, scale: k.scale, moving: k.state === 'run' }) });
      }
    }
    alert() {
      const k = this.kids.find((q) => q.state === 'run' || q.state === 'stun');
      return k && !this.resolved ? { x: k.x, y: k.y - 70 } : null;
    }
    end() {
      const p = this.g.player;
      if (p.carry === 'toddler' && p.carryData && p.carryData.ev === this) {
        p.carry = null;
        p.carryData = null;
      }
    }
  }

  // 11. Ceiling leak ---------------------------------------------------------------------------------
  class LeakEv extends Ev {
    constructor(g) {
      super(g, 'leak');
      this.target = g.pickStudent((s) => !s.flags.leak);
      if (!this.target) return void (this.invalid = true);
      this.target.flags.leak = true;
      const seat = this.target.seat;
      this.spot = { x: seat.x + (seat.side ? -30 : 30), y: tableTop(seat) + 34 };
      this.dropT = 0;
      this.puddle = 0;
      this.bucket = false;
      this.after = 0;
    }
    update(dt) {
      super.update(dt);
      this.dropT -= dt;
      if (this.dropT <= 0) {
        this.dropT = this.resolved ? 1.2 : 0.7;
        FX.drop(this.spot.x, this.spot.y - 150, this.spot.y - (this.bucket ? 14 : 0));
        setTimeout(() => Au.play('drip', null, 0.1), 300);
      }
      if (this.resolved) {
        this.after += dt;
        if (this.after > 14) this.dead = true;
        return;
      }
      if (this.target.state === 'submitted') return this.g.fail(this);
      this.puddle += dt / 20;
      if (this.puddle >= 1) {
        this.puddle = 0.35;
        const s = this.target;
        s.progress = Math.max(0, s.progress - 6);
        s.shockT = 1;
        s.say('MY LAPTOP!!', 1.6);
        FX.sparks(s.seat.x, this.spot.y - 20, 16, '#9fd8ff');
        Au.play('zap');
        this.g.shake(6);
        FX.text(s.seat.x, s.seat.y - 110, '-6% PROGRESS', { size: 18, col: '#ff9a8a' });
      }
    }
    drain(st) {
      if (this.resolved) return 0;
      if (st === this.target) return 5;
      return U.dist(st.seat.x, st.seat.y, this.spot.x, this.spot.y) < 110 ? 2 : 0;
    }
    interactables() {
      if (this.resolved) return [];
      const p = this.g.player;
      if (p.carry === 'bucket') {
        return [{ x: this.target.seat.x, y: this.target.seat.y, r: 86, prio: 9, label: 'Place bucket', press: () => {
          p.carry = null;
          this.bucket = true;
          Au.play('thud');
          this.g.resolve(this, 200, 'NICE CATCH!', this.spot.x, this.spot.y - 80);
        } }];
      }
      return [{ x: this.target.seat.x, y: this.target.seat.y, r: 86, prio: 2, hintOnly: true, label: 'Need a bucket (janitor cart)' }];
    }
    draw(list) {
      const t = this.target.seat.table;
      list.push({ y: t.y + t.d + 0.3, fn: (ctx) => {
        const s = this.spot;
        const r = 8 + this.puddle * 22;
        ctx.fillStyle = 'rgba(120,180,240,0.55)';
        ctx.strokeStyle = 'rgba(40,80,140,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, r, r * 0.45, 0, 0, U.TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.ellipse(s.x - r * 0.3, s.y - 2, r * 0.3, 2, 0, 0, U.TAU);
        ctx.fill();
        if (this.bucket) A.bucket(ctx, s.x, s.y + 4, 0.9);
      } });
    }
    drawTop(ctx) {
      // ceiling stain hint: falling drip column
      if (this.resolved) return;
      const s = this.spot;
      ctx.strokeStyle = 'rgba(160,210,255,0.25)';
      ctx.setLineDash([3, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - 160);
      ctx.lineTo(s.x, s.y - 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    alert() { return this.resolved ? null : { x: this.spot.x, y: this.spot.y - 130 }; }
    end() { if (this.target) this.target.flags.leak = false; }
  }

  // 12. The gossip ------------------------------------------------------------------------------------
  const GOSSIP = ['OMG hiii', 'did you SEE what she posted', 'ok so ANYWAY', 'no because listen', 'wait are you studying?', 'this will take 2 secs', 'literally SCREAMING'];
  class GossipEv extends Ev {
    constructor(g) {
      super(g, 'gossip');
      this.target = g.pickStudent((s) => !s.flags.chat && !s.flags.asleep);
      if (!this.target) return void (this.invalid = true);
      this.npc = new MB.Walker({ skin: '#e8b48e', hair: '#e8d7a8', hairStyle: 'long', top: '#ef7fa6', top2: '#fbf3e4', acc: 'glasses2', pants: '#8a5ac2', seed: 92 }, 660, 760, 115);
      this.npc.scale = 1;
      const s = this.target.seat;
      this.spot = { x: s.x + (s.side ? -36 : 36), y: s.y + 2 };
      this.npc.goTo(this.spot.x, this.spot.y);
      this.state = 'approach';
      this.line = U.pick(GOSSIP);
      this.lineT = 2;
      this.chatT = 0;
      Au.play('chat');
    }
    update(dt) {
      super.update(dt);
      const n = this.npc;
      if (this.state === 'leave') {
        if (n.step(dt, 1.5)) this.dead = true;
        return;
      }
      if (this.target.state === 'submitted') return this.send(null);
      if (this.state === 'approach') {
        if (n.step(dt)) {
          this.state = 'chat';
          this.target.flags.chat = true;
          this.target.say('oh... hey', 1.4);
        }
      } else {
        n.t += dt;
        n.face = 'side';
        n.dir = this.target.seat.x > n.x ? 1 : -1;
        this.chatT -= dt;
        if (this.chatT <= 0) {
          this.chatT = 1.1;
          Au.play('chat', null, 0.3);
          FX.icon(n.x, n.y - 80, U.pick(['chat', 'star']), { size: 8, bg: '#fffaf0', vy: -40 });
        }
      }
      this.lineT -= dt;
      if (this.lineT <= 0) {
        this.lineT = 2.2;
        this.line = U.pick(GOSSIP);
      }
    }
    send(label) {
      if (this.state === 'leave') return;
      const early = this.state === 'approach';
      this.state = 'leave';
      this.target.flags.chat = false;
      this.npc.goTo(Wd.entrance.x, Wd.entrance.y);
      if (label) {
        this.g.resolve(this, early ? 250 : 150, early ? 'INTERCEPTED!' : label, this.npc.x, this.npc.y - 100);
      } else if (!this.resolved) this.g.fail(this);
    }
    drain(st) {
      if (this.resolved || this.state !== 'chat') return 0;
      if (st === this.target) return 16;
      return U.dist(st.seat.x, st.seat.y, this.npc.x, this.npc.y) < 130 ? 3 : 0;
    }
    interactables() {
      if (this.resolved) return [];
      return [{ x: this.npc.x, y: this.npc.y, r: 64, prio: 7, label: 'Not now!', press: () => { Au.play('back'); this.send('SEE YA!'); } }];
    }
    onShush(x, y, r) {
      if (U.dist(x, y, this.npc.x, this.npc.y) < r) this.send('SHOO!');
    }
    draw(list) {
      const n = this.npc;
      list.push({ y: n.y, fn: (ctx) => n.draw(ctx, { pose: n.moving ? 'walk' : 'talk', emo: this.state === 'leave' ? 'sad' : 'happy' }) });
    }
    drawTop(ctx) {
      if (this.state === 'leave') {
        if (this.t % 3 < 1.5) A.bubble(ctx, this.npc.x, this.npc.y - 84, 'fine, rude', { size: 15 });
        return;
      }
      A.bubble(ctx, this.npc.x, this.npc.y - 84, this.line, { size: 15, bg: '#ffe0ec' });
    }
    alert() { return this.resolved ? null : { x: this.npc.x, y: this.npc.y - 136 }; }
    end() { if (this.target) this.target.flags.chat = false; }
  }

  // 13. Power outage ------------------------------------------------------------------------------------
  class OutageEv extends Ev {
    constructor(g) {
      super(g, 'outage');
      this.chaos = 3;
      g.dark = true;
      g.flicker = 0.4;
      Au.play('powerdown');
      Au.Music.filter(500);
      g.shake(4);
    }
    update(dt) {
      super.update(dt);
      if (this.resolved) this.dead = true;
    }
    restore() {
      this.g.dark = false;
      this.g.flicker = 0.7;
      Au.Music.filter(9000);
      Au.play('thunk');
      Au.play('powerup');
      const b = Wd.stations.breaker;
      this.g.resolve(this, 220, 'LIGHTS ON!', b.x, b.y + 40);
    }
    drain() { return this.resolved ? 0 : 3; }
    interactables() {
      if (this.resolved) return [];
      const b = Wd.stations.breaker;
      return [{ x: b.use.x, y: b.use.y, r: 66, prio: 8, label: 'Flip the breaker', hold: { need: 1.0, fn: () => this.restore() } }];
    }
    alert() { return this.resolved ? null : { x: Wd.stations.breaker.x, y: Wd.stations.breaker.y + 50 }; }
    end() {
      this.g.dark = false;
      Au.Music.filter(9000);
    }
  }

  // 14. Fire alarm --------------------------------------------------------------------------------------
  class AlarmEv extends Ev {
    constructor(g) {
      super(g, 'alarm');
      this.chaos = 3;
      this.sirenT = 0;
      const arrows = ['up', 'down', 'left', 'right'];
      this.code = Array.from({ length: g.endless || g.def.n >= 5 ? 5 : 4 }, () => U.pick(arrows));
      Au.Music.duck(0.35);
      g.shake(5);
    }
    update(dt) {
      super.update(dt);
      if (this.resolved) return void (this.dead = true);
      this.sirenT -= dt;
      if (this.sirenT <= 0) {
        this.sirenT = 0.5;
        Au.play('alarm', null, 0.2);
      }
    }
    drain() { return this.resolved ? 0 : 9; }
    interactables() {
      if (this.resolved) return [];
      const a = Wd.stations.alarm;
      return [{ x: a.use.x, y: a.use.y, r: 66, prio: 8, label: 'Enter reset code', press: () => this.g.startMinigame('qte', this) }];
    }
    onComplete() {
      Au.Music.duck(1);
      Au.play('powerup');
      const a = Wd.stations.alarm;
      this.g.resolve(this, 300, 'FALSE ALARM!', a.x, a.y + 60);
      for (const s of this.g.students) if (s.state === 'study') s.say(U.pick(['thank god', 'my ears...', 'ok back to it']), 1.5);
    }
    lights(L) {
      if (this.resolved) return;
      const a = this.t * 5;
      L.push({ x: 640 + Math.cos(a) * 400, y: 420 + Math.sin(a) * 200, r: 520, c: 'rgba(255,40,40,0.55)', glow: 'rgba(255,40,40,0.18)' });
      L.push({ x: Wd.stations.alarm.x, y: 200, r: 160, c: Math.sin(this.t * 20) > 0.6 ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0)' });
    }
    alert() { return this.resolved ? null : { x: Wd.stations.alarm.x, y: Wd.stations.alarm.y + 56 }; }
    end() { Au.Music.duck(1); }
  }

  // 15. Raccoon heist -------------------------------------------------------------------------------------
  class RaccoonEv extends Ev {
    constructor(g) {
      super(g, 'raccoon');
      this.target = g.pickStudent((s) => !s.flags.usb);
      if (!this.target) return void (this.invalid = true);
      const br = Wd.stations.bookReturn;
      this.home = { x: br.x + br.w / 2, y: br.y + br.d + 14 };
      this.w = new MB.Walker(null, this.home.x, this.home.y, 150);
      const s = this.target.seat;
      this.w.goTo(s.x + (s.side ? -34 : 34), s.y + 4);
      this.state = 'sneak';
      this.stealT = 1.1;
      this.escapeT = 24;
      this.usb = false;
      this.chitT = 0;
      FX.dust(this.home.x, this.home.y, 6);
      Au.play('chitter');
    }
    update(dt) {
      super.update(dt);
      const w = this.w;
      w.t += dt;
      this.chitT -= dt;
      if (this.chitT <= 0) {
        this.chitT = U.rand(1, 2);
        Au.play('chitter', null, 0.3);
      }
      if (this.state === 'sneak') {
        if (w.step(dt)) this.state = 'steal';
        if (this.target.state === 'submitted') this.state = 'run';
      } else if (this.state === 'steal') {
        this.stealT -= dt;
        if (this.stealT <= 0) {
          this.usb = true;
          this.target.flags.usb = true;
          this.target.shockT = 1;
          this.target.say('MY FLASH DRIVE!!', 2);
          Au.play('yoink');
          this.state = 'run';
          w.speed = 195;
        }
      } else if (this.state === 'run') {
        if (this.usb) this.escapeT -= dt;
        const p = this.g.player;
        const close = U.dist(p.x, p.y, w.x, w.y) < 150;
        if (w.step(dt) || (close && Math.random() < dt * 4)) {
          let best = null, bd = -1;
          for (let i = 0; i < 6; i++) {
            const q = Wd.randomFloorPoint();
            const d = U.dist(q.x, q.y, p.x, p.y);
            if (d > bd) { bd = d; best = q; }
          }
          w.goTo(best.x, best.y);
        }
        if (this.escapeT <= 0) {
          this.state = 'escape';
          w.goTo(this.home.x, this.home.y);
        }
      } else if (this.state === 'escape' || this.state === 'flee') {
        if (w.step(dt, 1.2)) {
          FX.dust(w.x, w.y, 6);
          this.dead = true;
          if (this.state === 'escape' && !this.resolved) {
            this.target.flags.usb = false;
            this.target.progress = Math.max(0, this.target.progress - 10);
            this.target.say('it had my only copy...', 2.4);
            FX.text(this.target.seat.x, this.target.seat.y - 110, '-10% PROGRESS', { size: 18, col: '#ff9a8a' });
            this.g.fail(this);
          }
        }
      }
    }
    onDash(p) {
      if (this.resolved || this.state === 'flee') return;
      const w = this.w;
      if (U.dist(p.x, p.y, w.x, w.y) > 40) return;
      this.g.hitstop(0.08);
      this.g.shake(8);
      FX.ring(w.x, w.y - 10, 8, 60, '#fff', 0.35, 5);
      FX.dust(w.x, w.y, 8);
      Au.play('tackle');
      Au.play('chitter');
      const s = this.target;
      if (this.usb) {
        this.usb = false;
        FX.arc(w.x, w.y - 20, s.seat.x, s.seat.y - 30, 'usb', { life: 0.6, height: 110, onDone: () => { s.flags.usb = false; s.say('MY BABY', 1.4); Au.play('ding'); } });
        this.g.resolve(this, 250, 'GOT IT BACK!', w.x, w.y - 70);
      } else this.g.resolve(this, 200, 'NOT TODAY!', w.x, w.y - 70);
      this.state = 'flee';
      w.speed = 230;
      w.goTo(this.home.x, this.home.y);
    }
    drain(st) {
      if (this.resolved) return 0;
      if (this.state === 'steal' && st === this.target) return 10;
      return U.dist(st.seat.x, st.seat.y, this.w.x, this.w.y) < 120 ? 4 : 0;
    }
    interactables() {
      if (this.resolved) return [];
      return [{ x: this.w.x, y: this.w.y, r: 120, prio: 1, hintOnly: true, label: 'DASH into it!', key: 'dash' }];
    }
    draw(list) {
      const w = this.w;
      list.push({ y: w.y, fn: (ctx) => A.raccoon(ctx, w.x, w.y, w.t, w.dir || 1, this.usb, w.moving) });
    }
    alert() { return this.resolved ? null : { x: this.w.x, y: this.w.y - 60 }; }
    end() { if (this.target) this.target.flags.usb = false; }
  }

  // 16. Library ghost ----------------------------------------------------------------------------------------
  class GhostEv extends Ev {
    constructor(g) {
      super(g, 'ghost');
      const s = U.pick(Wd.shelves);
      this.x = s.x + U.rand(30, s.w - 30);
      this.y = s.y + 20;
      this.alpha = 0;
      this.pick();
      this.chaos = 2;
      this.fade = 0;
      Au.play('ghost');
    }
    pick() {
      const studs = this.g.students.filter((s) => s.state === 'study');
      const s = studs.length ? U.pick(studs) : null;
      this.tx = s ? s.seat.x + U.rand(-60, 60) : U.rand(200, 1100);
      this.ty = s ? s.seat.y + U.rand(10, 60) : U.rand(250, 650);
      this.retarget = U.rand(5, 8);
    }
    update(dt) {
      super.update(dt);
      if (this.resolved) {
        this.fade += dt;
        if (this.fade > 0.7) this.dead = true;
        return;
      }
      this.alpha = Math.min(0.85, this.alpha + dt);
      this.retarget -= dt;
      if (this.retarget <= 0) this.pick();
      const dx = this.tx - this.x, dy = this.ty - this.y;
      const d = Math.hypot(dx, dy);
      if (d > 4) {
        this.x += (dx / d) * 55 * dt;
        this.y += (dy / d) * 55 * dt;
      }
      if (Math.random() < dt * 0.25) Au.play('ghost', null, 2);
      for (const s of this.g.students) if (s.state === 'study' && U.dist(s.seat.x, s.seat.y, this.x, this.y) < 90 && Math.random() < dt * 0.5) s.shockT = 0.8;
    }
    drain(st) {
      if (this.resolved) return 0;
      const p = studentPos(st);
      return U.dist(p.x, p.y, this.x, this.y) < 160 ? 9 : 0;
    }
    onShush(x, y, r) {
      if (this.resolved || U.dist(x, y, this.x, this.y) > r + 30) return;
      FX.sparks(this.x, this.y - 30, 18, '#d8ccff');
      FX.ring(this.x, this.y - 30, 10, 90, '#d8ccff', 0.5, 5);
      Au.play('ghost');
      this.g.resolve(this, 300, 'GHOST SHUSHED!', this.x, this.y - 90);
    }
    interactables() {
      if (this.resolved) return [];
      return [{ x: this.x, y: this.y, r: 150, prio: 2, hintOnly: true, label: 'Only a SHHH works!', key: 'shush' }];
    }
    draw(list) {
      list.push({ y: this.y - 0.5, fn: (ctx) => A.shadow(ctx, this.x, this.y + 8, 18, 5, 0.15) });
    }
    drawTop(ctx) {
      const a = this.resolved ? Math.max(0, 0.85 - this.fade * 1.3) : this.alpha;
      const sc = this.resolved ? 1 + this.fade : 1;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(sc, sc);
      A.ghost(ctx, 0, -20, this.t, a, this.resolved);
      ctx.restore();
    }
    lights(L) {
      if (!this.resolved) L.push({ x: this.x, y: this.y - 40, r: 140, c: 'rgba(190,170,255,0.55)', glow: 'rgba(200,180,255,0.25)' });
    }
    alert() { return this.resolved ? null : { x: this.x, y: this.y - 100 }; }
  }

  const studyTarget = (g) => !!g.pickStudent((s) => !s.flags.phone && !s.flags.asleep && !s.flags.chat);
  MB.EVENTS = {
    phone: { cls: PhoneEv, name: 'Phone Buzz', icon: 'phone', hint: 'Walk up + SPACE to confiscate it', night: 1, weight: 10, max: 2, need: studyTarget },
    talker: { cls: TalkerEv, name: 'Loud Talker', icon: 'talk', hint: 'Shush them: SPACE up close, or Q', night: 1, weight: 8, max: 2 },
    roomba: { cls: RoombaEv, name: 'Rogue Roomba', icon: 'roomba', hint: 'DASH (SHIFT) into it to flip it', night: 1, weight: 6, max: 1 },
    avalanche: { cls: AvalancheEv, name: 'Book Avalanche', icon: 'books', hint: 'Mash SPACE on each pile to reshelve', night: 1, weight: 6, max: 1 },
    printer: { cls: PrinterEv, name: 'Printer Jam', icon: 'printer', hint: 'Hit SPACE when the needle is in the green', night: 2, weight: 6, max: 1 },
    wifi: { cls: WifiEv, name: 'Wi-Fi Down', icon: 'wifi', hint: 'HOLD SPACE at the router (back left)', night: 2, weight: 5, max: 1 },
    birds: { cls: BirdsEv, name: 'Pigeon Invasion', icon: 'bird', hint: 'DASH into every bird', night: 2, weight: 5, max: 1 },
    sleeper: { cls: SleeperEv, name: 'Senioritis Nap', icon: 'zzz', hint: 'Bring vending coffee, or mash SPACE', night: 2, weight: 6, max: 1, need: studyTarget },
    pizza: { cls: PizzaEv, name: 'Pizza Delivery', icon: 'pizza', hint: 'Grab it, share slices for +focus', night: 2, weight: 3, max: 1, good: true },
    toddlers: { cls: ToddlersEv, name: 'Storytime Escape', icon: 'toddler', hint: 'Grab toddlers, carry them to the rug', night: 3, weight: 5, max: 1 },
    leak: { cls: LeakEv, name: 'Ceiling Leak', icon: 'drop', hint: 'Bring a bucket from the janitor cart', night: 3, weight: 5, max: 1, need: (g) => !!g.pickStudent((s) => !s.flags.leak) },
    gossip: { cls: GossipEv, name: 'The Gossip', icon: 'chat', hint: 'SPACE to send them off before they sit', night: 3, weight: 6, max: 1, need: (g) => !!g.pickStudent((s) => !s.flags.chat) },
    outage: { cls: OutageEv, name: 'Power Outage', icon: 'bolt', hint: 'HOLD SPACE at the breaker (stone wall)', night: 4, weight: 4, max: 1, excl: ['alarm'] },
    alarm: { cls: AlarmEv, name: 'Fire Alarm', icon: 'alarm', hint: 'Punch the arrow code into the red panel', night: 4, weight: 4, max: 1, excl: ['outage'] },
    raccoon: { cls: RaccoonEv, name: 'Raccoon Heist', icon: 'raccoon', hint: 'DASH into it to get the USB back', night: 4, weight: 5, max: 1, need: (g) => !!g.pickStudent((s) => !s.flags.usb) },
    ghost: { cls: GhostEv, name: 'Library Ghost', icon: 'ghost', hint: 'Only a SHHH (Q) works on ghosts', night: 5, weight: 5, max: 1 },
  };
})(window.MB);
