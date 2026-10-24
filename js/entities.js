'use strict';
// Player, study-group students, generic walking NPCs, and the particle/juice system.
(function (MB) {
  const U = MB.U, A = MB.A, Wd = MB.World;

  // --- rosters ----------------------------------------------------------------------
  // The Miller Branch study group. Each one is playable; the other three are your tablemates.
  MB.CHARACTERS = [
    {
      id: 'max', name: 'Max', title: 'Pre-Med · Duke ED', college: 'Duke', major: 'pre-med',
      blurb: 'Diagnoses senioritis on sight. Bedside manner so good it counts as a superpower.',
      perks: ['Pep talks restore full focus', 'Coffee boosts last 50% longer'],
      look: { skin: '#f1cfb0', hair: '#141218', hairStyle: 'bangs', top: '#1f2b4a', pattern: 'polo', pants: '#c9b48e', shoes: '#f2efe6', seed: 11 },
      stats: { speed: 1, dash: 1, shushR: 1, shushCd: 1, type: 1, pep: 1.5, coffee: 1.5 },
    },
    {
      id: 'akshan', name: 'Akshan', title: 'Policy/Econ · Yale EA', college: 'Yale', major: 'policy + econ',
      blurb: 'Wears a suit to the library. Delivers a SHHH with the force of a floor speech.',
      perks: ['SHHH reaches 35% farther', 'SHHH recharges 30% faster'],
      look: { skin: '#a8714c', hair: '#141218', hairStyle: 'bigcurly', top: '#1d1c22', pattern: 'suit', pants: '#1d1c22', shoes: '#2b2733', seed: 37 },
      stats: { speed: 1, dash: 1, shushR: 1.35, shushCd: 0.7, type: 1, pep: 1, coffee: 1 },
    },
    {
      id: 'rishit', name: 'Rishit', title: 'Policy/Env Sci · Columbia ED', college: 'Columbia', major: 'policy + environmental science',
      blurb: 'Bikes everywhere, protests the printer, and moves faster than the county council.',
      perks: ['+15% move speed', 'Dash recharges 35% faster', 'Writes a touch slower'],
      look: { skin: '#9c6745', hair: '#141218', hairStyle: 'wavy', top: '#3d2a22', top2: '#b9bcc4', pattern: 'crew', pants: '#3b4a6b', shoes: '#f2efe6', mustache: true, seed: 23 },
      stats: { speed: 1.15, dash: 0.65, shushR: 1, shushCd: 1, type: 0.88, pep: 1, coffee: 1 },
    },
    {
      id: 'bryan', name: 'Bryan', title: 'Engineering · Princeton SCEA', college: 'Princeton', major: 'engineering',
      blurb: 'Runs on energy drinks and soldering fumes. Engineered his own noise immunity.',
      perks: ['Essay lines count 40% more', 'Noise never fogs his cards', 'A bit slower on foot'],
      look: { skin: '#efc9a6', hair: '#141218', hairStyle: 'messy', top: '#efece4', pattern: 'rib', pants: '#3b4a6b', shoes: '#f2efe6', backpack: true, watch: true, seed: 41 },
      stats: { speed: 0.94, dash: 1, shushR: 1, shushCd: 1, type: 1.4, pep: 1, coffee: 1, calm: true },
    },
  ];
  // Halloween costumes for Submit Night
  MB.COSTUMES = {
    max: { top: '#f4f4f0', top2: '#1f2b4a', pattern: 'labcoat' },
    akshan: { lanyard: '#c94f3d' },
    rishit: { top: '#4f8a43', top2: '#3d2a22', hat: 'leaves' },
    bryan: { top: '#9aa3ad', pattern: null, hat: 'antenna', backpack: false },
  };
  // The three tablemates for a given lead: the "next" one in the rotation is the one who
  // misses the first two nights (and makes a dramatic entrance on Night 3).
  MB.friendsFor = function (ch) {
    const ids = MB.CHARACTERS.map((c) => c.id);
    const i = ids.indexOf(ch.id);
    const absent = MB.CHARACTERS[(i + 1) % 4];
    const present = MB.CHARACTERS.filter((c) => c !== ch && c !== absent);
    return present.concat([absent]).map((c) => ({ id: c.id, name: c.name, college: c.college, look: c.look }));
  };

  MB.LINES = {
    study: ['is 650 words a suggestion?', "what rhymes with 'leadership'", 'thesaurus.com go brrr', 'my essay is about my dog', 'ctrl+s ctrl+s ctrl+s', "deleting my whole intro...", 'who wrote these prompts', 'ok. ok. ok. ok.', "'why us?' because u exist", 'activities list = 150 chars??', 'should i mention the robot club', 'one more paragraph'],
    distracted: ['brb', 'just one video', '5 more minutes...', 'omg look at this', 'taking a "break"', 'my fyp is SO good rn'],
    back: ['ok ok, back to it', "you're right.", 'locking in.', 'fine. FINE.', 'focus mode: ON'],
    submit: ['SUBMITTED!!', "IT'S DONE!", 'freedom!!!', 'i love you all', 'never again'],
    pep: ['You got this!', 'Lock in!', 'Think of the dorms!', 'Deadline, buddy!', 'Essay. Now.', 'Future you says thanks!'],
    hurt: ['HEY!', 'my notes!!', 'ugh!!', 'seriously?!'],
    coffee: ['bless you', 'CAFFEINE', 'i can see sounds', 'turbo mode'],
    pizza: ['PIZZA!!', 'brain food', 'best. friend. ever.'],
    thanks: ['my hero', 'thank u!!', 'bless', 'ok we are SO back', 'legend', 'you rock']
  };

  const PATRONS = [
    { skin: '#e8b48e', hair: '#8a8a8a', hairStyle: 'short', top: '#6b7a8f', pants: '#2b2733', seed: 61 },
    { skin: '#a86b45', hair: '#2b1d1a', hairStyle: 'cap', hair2: '#2f5d8a', top: '#d98a3a', pants: '#3b4a6b', seed: 62 },
    { skin: '#f6d2b4', hair: '#d9a441', hairStyle: 'long', top: '#c94f3d', pants: '#2b2733', seed: 63 },
    { skin: '#7a4a2e', hair: '#1a1a2e', hairStyle: 'bald', top: '#5f8f3e', top2: '#fbf3e4', pants: '#2b2733', seed: 64 },
    { skin: '#c98e64', hair: '#3a2a2a', hairStyle: 'ponytail', top: '#7b4a8c', pants: '#2f5d8a', seed: 65 },
  ];
  MB.randomPatron = () => Object.assign({}, U.pick(PATRONS), { seed: U.randi(60, 99) });
  MB.TODDLERS = [
    { skin: '#f6d2b4', hair: '#d9a441', hairStyle: 'dino', hair2: '#6cbf6a', top: '#6cbf6a', pants: '#3f8f5e', headScale: 1.3, seed: 71 },
    { skin: '#a86b45', hair: '#1a1a2e', hairStyle: 'bunny', hair2: '#f4e9dc', top: '#ef7fa6', pants: '#c25b8f', headScale: 1.3, seed: 72 },
    { skin: '#e8b48e', hair: '#5a3a22', hairStyle: 'beanie', hair2: '#f6c945', top: '#4a7fd1', pants: '#2f5d8a', headScale: 1.3, seed: 73 },
    { skin: '#7a4a2e', hair: '#1a1a2e', hairStyle: 'dino', hair2: '#f08a3c', top: '#f08a3c', pants: '#8f5a30', headScale: 1.3, seed: 74 },
  ];
  MB.LIBRARIAN = { skin: '#7a4a2e', hair: '#cfc6d8', hairStyle: 'bun', top: '#7b4a8c', top2: '#f6c945', acc: 'glasses', lanyard: '#e0524a', pants: '#2b2733', seed: 81 };

  // --- player ------------------------------------------------------------------------
  class Player {
    constructor(ch) {
      this.ch = ch;
      this.look = ch.look;
      this.x = Wd.playerSeat.x + 34;
      this.y = Wd.playerSeat.y + 2;
      this.vx = 0;
      this.vy = 0;
      this.face = 'down';
      this.dir = 1;
      this.t = 0;
      this.moving = false;
      this.dashT = 0;
      this.dashDx = 0;
      this.dashDy = 1;
      this.charges = 1;
      this.maxCharges = 1;
      this.rechargeT = 0;
      this.shushCd = 0;
      this.carry = null;
      this.carryData = null;
      this.seated = false;
      this.stunT = 0;
      this.sq = 0;
      this.trail = [];
      this.typeAnim = 0;
      this.lockT = 0;
      this.speak = null;
      this.speakT = 0;
    }
    say(text, dur = 1.6) {
      this.speak = text;
      this.speakT = dur;
    }
    get dashing() {
      return this.dashT > 0;
    }
    update(dt, g, ix, iy) {
      const st = g.stats;
      this.t += dt;
      this.speakT -= dt;
      if (this.stunT > 0) this.stunT -= dt;
      // recharge dash
      if (this.charges < this.maxCharges) {
        this.rechargeT += dt;
        const need = 0.95 * st.dashCd;
        if (this.rechargeT >= need) {
          this.rechargeT = 0;
          this.charges++;
        }
      }
      if (this.shushCd > 0) this.shushCd -= dt;
      this.sq = U.approach(this.sq, 0, dt * 3);
      this.typeAnim = Math.max(0, this.typeAnim - dt);

      if (this.seated) {
        this.vx = this.vy = 0;
        this.moving = false;
        return;
      }
      let speed = 250 * st.speed;
      if (this.carry === 'toddler') speed *= 0.82;
      if (this.carry === 'pizza') speed *= 0.92;
      speed *= g.slowAt(this.x, this.y);
      if (this.zoomT > 0) speed *= 1.3;
      let mx = ix, my = iy;
      if (this.stunT > 0 || this.lockT > 0) mx = my = 0;
      const len = Math.hypot(mx, my);
      if (len > 0) {
        mx /= len;
        my /= len;
      }
      if (this.dashT > 0) {
        this.dashT -= dt;
        const ds = 780 * Math.min(1.12, st.speed);
        this.vx = this.dashDx * ds;
        this.vy = this.dashDy * ds;
        if (Math.random() < 0.7) this.trail.push({ x: this.x, y: this.y, face: this.face, dir: this.dir, t: this.t, life: 0.25 });
        if (Math.random() < 0.5) MB.FX.dust(this.x, this.y, 1);
      } else {
        const k = Math.min(1, dt * 16);
        this.vx += (mx * speed - this.vx) * k;
        this.vy += (my * speed - this.vy) * k;
      }
      this.moving = Math.hypot(this.vx, this.vy) > 20;
      if (this.moving && this.dashT <= 0 && Math.random() < dt * 5) MB.FX.dust(this.x, this.y, 1);
      if (len > 0.1 && this.dashT <= 0) {
        if (Math.abs(my) > Math.abs(mx) * 1.1) this.face = my < 0 ? 'up' : 'down';
        else {
          this.face = 'side';
          this.dir = mx < 0 ? -1 : 1;
        }
      }
      const ox = this.x, oy = this.y;
      const hit = Wd.moveCircle(this, this.vx * dt, this.vy * dt, 11, false, true);
      const moved = Math.hypot(this.x - ox, this.y - oy), wanted = Math.hypot(this.vx, this.vy) * dt;
      if (hit && this.dashT > 0 && moved < wanted * 0.35) {
        this.dashT = 0;
        this.sq = 0.5;
        MB.FX.dust(this.x, this.y, 5);
        MB.Audio.play('thud', null, 0.1);
        g.shake(3);
      }
      for (const tr of this.trail) tr.life -= dt;
      this.trail = this.trail.filter((t) => t.life > 0);
    }
    tryDash(ix, iy) {
      if (this.seated || this.charges <= 0 || this.dashT > 0 || this.stunT > 0 || this.lockT > 0) return false;
      let dx = ix, dy = iy;
      if (!dx && !dy) {
        dx = this.face === 'side' ? this.dir : 0;
        dy = this.face === 'up' ? -1 : this.face === 'down' ? 1 : 0;
      }
      const l = Math.hypot(dx, dy) || 1;
      this.dashDx = dx / l;
      this.dashDy = dy / l;
      this.dashT = 0.17;
      this.charges--;
      this.sq = -0.6;
      MB.Audio.play('dash');
      MB.FX.dust(this.x, this.y, 6);
      return true;
    }
    draw(ctx) {
      for (const tr of this.trail) {
        A.person(ctx, tr.x, tr.y, this.look, { pose: 'walk', face: tr.face, dir: tr.dir, t: tr.t, alpha: tr.life * 1.6, noShadow: true });
      }
      if (this.seated) return; // drawn by seat
      let pose = this.moving ? 'walk' : 'stand';
      if (this.carry === 'toddler' || this.carry === 'pizza' || this.carry === 'bucket') pose = 'carry';
      let emo = 'neutral';
      if (this.stunT > 0) emo = 'shock';
      else if (this.dashT > 0) emo = 'focus';
      else if (this.shushT > 0) emo = 'angry';
      if (this.shushT > 0) pose = 'shh';
      const holdState = this.carry === 'toddler' ? { toddler: this.carryData && this.carryData.look } : this.carry === 'pizza' ? { slices: this.carryData && this.carryData.slices } : {};
      A.person(ctx, this.x, this.y, this.look, Object.assign({
        pose, face: pose === 'shh' ? 'down' : this.face, dir: this.dir, t: this.t, emo, sq: this.sq, moving: this.moving,
        hold: this.carry && this.carry !== 'usb' ? this.carry : null,
      }, holdState));
    }
  }
  MB.Player = Player;

  // --- students -----------------------------------------------------------------------
  class Student {
    constructor(info, seat, idx) {
      this.idx = idx;
      this.id = info.id;
      this.name = info.name;
      this.look = Object.assign({ chair: A.C.chair }, info.look);
      this.college = info.college;
      this.seat = seat;
      this.x = seat.x;
      this.y = seat.y;
      this.progress = 0;
      this.focus = 100;
      this.state = 'study';
      this.t = Math.random() * 10;
      this.path = null;
      this.bubble = null;
      this.bubbleT = 0;
      this.chatterT = U.rand(4, 12);
      this.boostT = 0;
      this.immuneT = 0;
      this.flags = {};
      this.shockT = 0;
      this.drainNow = 0;
      this.face = 'down';
      this.dir = 1;
      this.moving = false;
      this.cheerT = 0;
      this.helpPulse = 0;
      this.sticker = idx;
      this.laptopCol = ['#c9c4d6', '#9fe0c4', '#f3b6c8', '#b7c9e8', '#e8d7a8', '#d0d0d0'][idx % 6];
    }
    say(text, dur = 2) {
      this.bubble = text;
      this.bubbleT = dur;
    }
    get seated() {
      return this.state === 'study' || this.state === 'submitted';
    }
    get studying() {
      return this.state === 'study';
    }
    goTo(x, y) {
      this.path = Wd.findPath(this.x, this.y, x, y);
    }
    stepPath(dt, speed) {
      if (!this.path || !this.path.length) {
        this.moving = false;
        return true;
      }
      const p = this.path[0];
      const dx = p.x - this.x, dy = p.y - this.y;
      const d = Math.hypot(dx, dy);
      const step = speed * dt;
      if (d <= step) {
        this.x = p.x;
        this.y = p.y;
        this.path.shift();
      } else {
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
      }
      this.moving = true;
      if (Math.abs(dy) > Math.abs(dx)) this.face = dy < 0 ? 'up' : 'down';
      else {
        this.face = 'side';
        this.dir = dx < 0 ? -1 : 1;
      }
      return !this.path.length;
    }
    distract() {
      if (this.state !== 'study') return;
      this.state = 'wander';
      this.focus = 0;
      const poi = U.pick(Wd.pois);
      this.goTo(poi.x + U.rand(-20, 20), poi.y + U.rand(-10, 10));
      this.say(MB.line(this.id, 'distracted'), 2.2);
      MB.Audio.play('bad');
    }
    pep(g) {
      if (this.state !== 'wander' && this.state !== 'scroll') return false;
      this.state = 'return';
      this.goTo(this.seat.x, this.seat.y);
      this.say(MB.line(this.id, 'back'), 2);
      const full = g.stats.pep > 1;
      this.focus = full ? 100 : 75;
      if (g.has('peptalk')) {
        this.focus = 100;
        this.immuneT = 6;
      }
      return true;
    }
    update(dt, g) {
      this.t += dt;
      this.bubbleT -= dt;
      if (this.bubbleT <= 0) this.bubble = null;
      if (this.boostT > 0) this.boostT -= dt;
      if (this.immuneT > 0) this.immuneT -= dt;
      if (this.shockT > 0) this.shockT -= dt;
      if (this.cheerT > 0) this.cheerT -= dt;
      this.helpPulse += dt;
      if (this.state === 'wander') {
        if (this.stepPath(dt, 110)) {
          this.state = 'scroll';
          this.scrollT = U.rand(5, 9);
        }
      } else if (this.state === 'scroll') {
        this.scrollT -= dt;
        if (this.scrollT <= 0) {
          this.state = 'wander';
          const poi = U.pick(Wd.pois);
          this.goTo(poi.x + U.rand(-20, 20), poi.y);
        }
        if (Math.random() < dt * 0.25) this.say(MB.line(this.id, 'distracted'), 1.8);
      } else if (this.state === 'return') {
        if (this.stepPath(dt, 150)) {
          this.state = 'study';
          this.x = this.seat.x;
          this.y = this.seat.y;
          this.face = 'down';
        }
      } else if (this.state === 'study') {
        this.chatterT -= dt;
        if (this.chatterT <= 0) {
          this.chatterT = U.rand(10, 22);
          if (!this.bubble) this.say(MB.line(this.id, 'study'), 2.6);
        }
      }
    }
    progressBlocked() {
      return this.flags.wifi || this.flags.usb || this.flags.asleep;
    }
    // offline drafting still counts for something; only napping stops writing entirely
    progressMul() {
      if (this.flags.asleep) return 0;
      let m = 1;
      if (this.flags.wifi) m = Math.min(m, 0.35);
      if (this.flags.usb) m = Math.min(m, 0.3);
      return m;
    }
    emotion() {
      if (this.state === 'submitted') return 'happy';
      if (this.flags.asleep) return 'sleep';
      if (this.shockT > 0) return 'shock';
      if (this.flags.chat) return 'blush';
      if (this.flags.phone) return 'scroll';
      if (this.flags.wifi || this.flags.usb) return 'sad';
      if (this.boostT > 0) return 'happy';
      if (this.focus < 33) return 'stress';
      if (this.focus > 66) return 'focus';
      return 'neutral';
    }
    // Drawn as part of y-sorted world; seated students draw at seat
    draw(ctx) {
      const s = this;
      if (s.state === 'study' || s.state === 'submitted') {
        let pose = 'type';
        if (s.flags.asleep) pose = 'sleep';
        else if (s.state === 'submitted') pose = s.cheerT > 0 ? 'cheer' : 'seat';
        else if (s.progressBlocked() || s.flags.chat || s.flags.phone) pose = 'seat';
        A.person(ctx, s.seat.x, s.seat.y, s.look, { pose, face: 'down', t: s.t, emo: s.emotion(), lean: s.focus > 66 && pose === 'type' ? 2 : 0 });
      } else {
        const pose = s.state === 'scroll' ? 'scroll' : 'walk';
        A.person(ctx, s.x, s.y, s.look, { pose, face: s.state === 'scroll' ? 'down' : s.face, dir: s.dir, t: s.t, emo: s.state === 'return' ? 'focus' : 'scroll', moving: s.moving });
      }
    }
    headPos() {
      if (this.state === 'study' || this.state === 'submitted') return { x: this.seat.x, y: this.seat.y - 72 };
      return { x: this.x, y: this.y - 78 };
    }
  }
  MB.Student = Student;

  // --- generic walking NPC ---------------------------------------------------------------
  class Walker {
    constructor(look, x, y, speed = 110) {
      this.look = look;
      this.x = x;
      this.y = y;
      this.speed = speed;
      this.path = [];
      this.face = 'up';
      this.dir = 1;
      this.t = Math.random() * 5;
      this.moving = false;
      this.scale = 1.06;
    }
    goTo(x, y) {
      this.path = Wd.findPath(this.x, this.y, x, y);
    }
    step(dt, speedMul = 1) {
      this.t += dt;
      if (!this.path.length) {
        this.moving = false;
        return true;
      }
      const p = this.path[0];
      const dx = p.x - this.x, dy = p.y - this.y;
      const d = Math.hypot(dx, dy);
      const st = this.speed * speedMul * dt;
      if (d <= st) {
        this.x = p.x;
        this.y = p.y;
        this.path.shift();
      } else {
        this.x += (dx / d) * st;
        this.y += (dy / d) * st;
      }
      this.moving = true;
      if (Math.abs(dy) > Math.abs(dx)) this.face = dy < 0 ? 'up' : 'down';
      else {
        this.face = 'side';
        this.dir = dx < 0 ? -1 : 1;
      }
      return !this.path.length;
    }
    draw(ctx, o = {}) {
      A.person(ctx, this.x, this.y, this.look, Object.assign({
        pose: this.moving ? 'walk' : 'stand', face: this.face, dir: this.dir, t: this.t, scale: this.scale, moving: this.moving,
      }, o));
    }
  }
  MB.Walker = Walker;

  // --- particles / juice -----------------------------------------------------------------------
  const FX = (MB.FX = { list: [] });
  FX.clear = () => (FX.list = []);
  FX.add = (p) => {
    p.t = 0;
    p.max = p.life;
    if (FX.list.length < 700) FX.list.push(p);
    return p;
  };
  FX.dust = (x, y, n = 3) => {
    for (let i = 0; i < n; i++) FX.add({ type: 'dust', x: x + U.rand(-8, 8), y: y + U.rand(-3, 3), vx: U.rand(-40, 40), vy: U.rand(-30, 5), life: U.rand(0.3, 0.6), size: U.rand(4, 9), layer: 'world' });
  };
  FX.paper = (x, y, n = 4, spread = 120) => {
    for (let i = 0; i < n; i++) FX.add({ type: 'paper', x, y, vx: U.rand(-spread, spread), vy: U.rand(-220, -80), g: 260, drag: 1.6, life: U.rand(1.2, 2.2), rot: U.rand(0, 6), vr: U.rand(-8, 8), size: U.rand(7, 11), layer: 'top' });
  };
  FX.books = (x, y, n = 6) => {
    for (let i = 0; i < n; i++) FX.add({ type: 'book', x, y, vx: U.rand(-200, 200), vy: U.rand(-300, -120), g: 700, life: U.rand(0.6, 1), rot: U.rand(0, 6), vr: U.rand(-12, 12), col: U.pick(A.C.books), layer: 'top', floor: y + U.rand(10, 50) });
  };
  FX.feathers = (x, y, n = 8, col = '#c4cde0') => {
    for (let i = 0; i < n; i++) FX.add({ type: 'feather', x, y, vx: U.rand(-140, 140), vy: U.rand(-160, 40), g: 60, drag: 2.2, life: U.rand(0.9, 1.6), rot: U.rand(0, 6), vr: U.rand(-5, 5), col, layer: 'top' });
  };
  FX.sparks = (x, y, n = 10, col = '#ffe08a') => {
    for (let i = 0; i < n; i++) {
      const a = U.rand(0, U.TAU), s = U.rand(150, 420);
      FX.add({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 4, life: U.rand(0.25, 0.5), col, layer: 'top' });
    }
  };
  FX.confetti = (x, y, n = 40, power = 1) => {
    const cols = ['#e0524a', '#f6c945', '#6cbf6a', '#4a7fd1', '#ef7fa6', '#8a5ac2', '#fbf3e4'];
    for (let i = 0; i < n; i++) {
      const a = U.rand(-Math.PI * 0.95, -Math.PI * 0.05), s = U.rand(200, 520) * power;
      FX.add({ type: 'confetti', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 520, drag: 1.8, life: U.rand(1.2, 2.2), rot: U.rand(0, 6), vr: U.rand(-14, 14), col: U.pick(cols), layer: 'top', w: U.rand(5, 9), h: U.rand(3, 5) });
    }
  };
  FX.ring = (x, y, r0, r1, col = '#fff', life = 0.5, lw = 4) => FX.add({ type: 'ring', x, y, r0, r1, col, life, lw, layer: 'top' });
  FX.text = (x, y, text, o = {}) => FX.add(Object.assign({ type: 'text', x, y, text, vy: -70, life: 1.1, size: 22, col: '#fff', layer: 'ui' }, o));
  FX.pop = (x, y, text, o = {}) => FX.add(Object.assign({ type: 'pop', x, y, text, life: 1.3, size: 40, col: '#f6c945', layer: 'ui', rot: U.rand(-0.12, 0.12) }, o));
  FX.icon = (x, y, icon, o = {}) => FX.add(Object.assign({ type: 'icon', x, y, icon, vx: U.rand(-30, 30), vy: -60, life: 1, layer: 'top', size: 10 }, o));
  FX.zzz = (x, y) => FX.add({ type: 'zzz', x, y, vx: 20, vy: -30, life: 1.6, layer: 'top' });
  FX.drop = (x, y, floor) => FX.add({ type: 'drop', x, y, vy: 200, g: 900, life: 2, floor, layer: 'top' });
  // An item flying along an arc from (x,y) to (tx,ty)
  FX.arc = (x, y, tx, ty, kind, o = {}) => FX.add(Object.assign({ type: 'arc', x, y, sx: x, sy: y, tx, ty, kind, life: o.life || 0.6, height: o.height || 120, layer: 'top', rot: 0 }, o));

  FX.update = function (dt) {
    for (const p of FX.list) {
      p.t += dt;
      if (p.type === 'arc') {
        const k = U.clamp(p.t / p.max, 0, 1);
        const e = U.ease.inOutSine(k);
        p.x = U.lerp(p.sx, p.tx, e);
        p.y = U.lerp(p.sy, p.ty, e) - Math.sin(k * Math.PI) * p.height;
        p.rot += dt * 10;
        if (k >= 1 && !p.done) {
          p.done = true;
          if (p.onDone) p.onDone();
        }
        continue;
      }
      if (p.drag) {
        p.vx *= Math.max(0, 1 - p.drag * dt);
        p.vy *= Math.max(0, 1 - p.drag * dt);
      }
      if (p.g) p.vy += p.g * dt;
      if (p.vx) p.x += p.vx * dt;
      if (p.vy) p.y += p.vy * dt;
      if (p.vr) p.rot += p.vr * dt;
      if (p.type === 'paper' || p.type === 'feather') p.x += Math.sin(p.t * 6 + p.rot) * 30 * dt;
      if (p.floor && p.y > p.floor) {
        p.y = p.floor;
        p.vy *= -0.3;
        p.vx *= 0.5;
        p.vr *= 0.5;
        if (p.type === 'drop') {
          p.t = p.max;
          FX.ring(p.x, p.y, 2, 12, 'rgba(180,220,255,0.9)', 0.35, 2);
        }
      }
    }
    FX.list = FX.list.filter((p) => p.t < p.max);
  };

  FX.draw = function (ctx, layer) {
    for (const p of FX.list) {
      if (p.layer !== layer) continue;
      const k = p.t / p.max;
      const a = 1 - k;
      ctx.save();
      switch (p.type) {
        case 'dust':
          ctx.globalAlpha = a * 0.5;
          ctx.fillStyle = '#efe0c8';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.6 + k), 0, U.TAU);
          ctx.fill();
          break;
        case 'paper':
          ctx.globalAlpha = Math.min(1, a * 3);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(1, Math.abs(Math.cos(p.t * 5 + p.rot)) * 0.8 + 0.2);
          ctx.fillStyle = '#fffaf0';
          ctx.strokeStyle = A.INK;
          ctx.lineWidth = 1.5;
          ctx.fillRect(-p.size / 2, -p.size * 0.65, p.size, p.size * 1.3);
          ctx.strokeRect(-p.size / 2, -p.size * 0.65, p.size, p.size * 1.3);
          ctx.strokeStyle = '#a9b8d9';
          ctx.beginPath();
          ctx.moveTo(-p.size / 2 + 2, -2);
          ctx.lineTo(p.size / 2 - 2, -2);
          ctx.moveTo(-p.size / 2 + 2, 2);
          ctx.lineTo(p.size / 2 - 2, 2);
          ctx.stroke();
          break;
        case 'book':
          ctx.globalAlpha = Math.min(1, a * 4);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.col;
          ctx.strokeStyle = A.INK;
          ctx.lineWidth = 2;
          ctx.fillRect(-8, -5, 16, 10);
          ctx.strokeRect(-8, -5, 16, 10);
          ctx.fillStyle = '#fbf3e4';
          ctx.fillRect(-8, 2, 16, 2);
          break;
        case 'feather':
          ctx.globalAlpha = a;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.col;
          ctx.strokeStyle = A.INK;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(0, 0, 7, 2.6, 0, 0, U.TAU);
          ctx.fill();
          ctx.stroke();
          break;
        case 'spark':
          ctx.globalAlpha = a;
          ctx.strokeStyle = p.col;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
          ctx.stroke();
          break;
        case 'confetti':
          ctx.globalAlpha = Math.min(1, a * 3);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(1, Math.cos(p.t * 9 + p.rot));
          ctx.fillStyle = p.col;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          break;
        case 'ring':
          ctx.globalAlpha = a;
          ctx.strokeStyle = p.col;
          ctx.lineWidth = p.lw * a + 0.5;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, U.lerp(p.r0, p.r1, U.ease.outCubic(k)), U.lerp(p.r0, p.r1, U.ease.outCubic(k)) * (p.flat || 1), 0, 0, U.TAU);
          ctx.stroke();
          break;
        case 'text':
          ctx.globalAlpha = Math.min(1, a * 2.5);
          A.text(ctx, p.text, p.x, p.y, { size: p.size * (k < 0.15 ? 0.6 + k * 2.6 : 1), color: p.col, outline: 5 });
          break;
        case 'pop': {
          const sc = k < 0.18 ? U.ease.outBack(k / 0.18) : 1;
          ctx.globalAlpha = k > 0.75 ? (1 - k) * 4 : 1;
          ctx.translate(p.x, p.y - k * 30);
          ctx.rotate(p.rot);
          ctx.scale(sc, sc);
          A.text(ctx, p.text, 0, 0, { size: p.size, color: p.col, outline: 8, shadow: 5 });
          if (p.sub) A.text(ctx, p.sub, 0, p.size * 0.75, { size: p.size * 0.42, color: '#fff', outline: 5, font: A.F.display });
          break;
        }
        case 'icon':
          ctx.globalAlpha = a;
          A.icon(ctx, p.icon, p.x, p.y, p.size, p.bg === undefined ? null : p.bg);
          break;
        case 'zzz':
          ctx.globalAlpha = a;
          A.text(ctx, 'z', p.x + Math.sin(p.t * 3) * 5, p.y, { size: 14 + k * 10, color: '#c9bdf0', outline: 4 });
          break;
        case 'drop':
          ctx.fillStyle = '#bfe3ff';
          ctx.strokeStyle = A.INK;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, 3, 5, 0, 0, U.TAU);
          ctx.fill();
          ctx.stroke();
          break;
        case 'arc':
          ctx.translate(p.x, p.y);
          ctx.rotate(p.spin === false ? 0 : p.rot);
          if (p.kind === 'phone') A.phone(ctx, 0, 0, true, 0);
          else if (p.kind === 'book') {
            ctx.fillStyle = p.col || '#c94f3d';
            ctx.strokeStyle = A.INK;
            ctx.lineWidth = 2;
            ctx.fillRect(-8, -5, 16, 10);
            ctx.strokeRect(-8, -5, 16, 10);
          } else if (p.kind === 'usb') A.usb(ctx, 0, 0);
          else if (p.kind === 'coffee') A.coffee(ctx, 0, 8, null);
          else if (p.kind === 'crest') A.icon(ctx, 'envelope', 0, 0, 14);
          else if (p.kind === 'slice') A.icon(ctx, 'pizza', 0, 0, 10);
          break;
      }
      ctx.restore();
    }
  };
})(window.MB);
