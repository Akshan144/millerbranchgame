'use strict';
// Input, run/night state, scoring, and the night simulation + world rendering.
(function (MB) {
  const U = MB.U, A = MB.A, Wd = MB.World, FX = MB.FX, Au = MB.Audio;
  const W = MB.W, H = MB.H;

  // --- input ---------------------------------------------------------------------------
  const KEYMAP = {
    up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
    act: ['Space', 'KeyE', 'KeyJ', 'Enter', 'NumpadEnter'], dash: ['ShiftLeft', 'ShiftRight', 'KeyK'],
    shush: ['KeyQ', 'KeyL'], pause: ['Escape', 'KeyP'], mute: ['KeyM'],
  };
  const MOVE_KEYS = new Set([...KEYMAP.up, ...KEYMAP.down, ...KEYMAP.left, ...KEYMAP.right]);
  const NON_TYPING = new Set([...MOVE_KEYS, ...KEYMAP.dash, ...KEYMAP.shush, ...KEYMAP.pause, ...KEYMAP.mute, 'Tab', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'ControlLeft', 'ControlRight', 'CapsLock']);
  const In = (MB.Input = {
    down: new Set(), pressed: new Set(), typed: 0, vDown: new Set(), vPressed: new Set(),
    mouse: { x: 0, y: 0, clicked: false, down: false, moved: false },
    lastDevice: 'keys',
  });
  In.keyDown = function (code) {
    if (!In.down.has(code)) {
      In.pressed.add(code);
      if (!NON_TYPING.has(code)) In.typed++;
    }
    In.down.add(code);
    In.lastDevice = 'keys';
  };
  In.keyUp = (code) => In.down.delete(code);
  In.isDown = (a) => KEYMAP[a].some((k) => In.down.has(k)) || In.vDown.has(a);
  In.hit = (a) => KEYMAP[a].some((k) => In.pressed.has(k)) || In.vPressed.has(a);
  In.moveHit = () => [...MOVE_KEYS].some((k) => In.pressed.has(k)) || ['up', 'down', 'left', 'right'].some((a) => In.vPressed.has(a));
  In.stick = { x: 0, y: 0 };
  In.axis = function () {
    let x = (In.isDown('right') ? 1 : 0) - (In.isDown('left') ? 1 : 0);
    let y = (In.isDown('down') ? 1 : 0) - (In.isDown('up') ? 1 : 0);
    if (!x && !y) {
      x = In.stick.x;
      y = In.stick.y;
    }
    return [x, y];
  };
  In.virtualPress = (a) => {
    In.vPressed.add(a);
    if (a === 'act') In.typed++;
  };
  In.endFrame = function () {
    In.pressed.clear();
    In.vPressed.clear();
    In.typed = 0;
    In.mouse.clicked = false;
  };
  In.anyHit = () => In.pressed.size > 0 || In.vPressed.size > 0 || In.mouse.clicked;

  // --- content ---------------------------------------------------------------------------
  // Distractions come in waves with calm stretches between them. `intro` lists new types in
  // the order they first appear; afterwards waves draw from the whole deck.
  const D1 = ['phone', 'talker', 'roomba', 'avalanche'];
  const D2 = D1.concat(['printer', 'wifi', 'birds', 'sleeper', 'pizza']);
  const D3 = D2.concat(['toddlers', 'leak', 'gossip']);
  const D4 = D3.concat(['outage', 'alarm', 'raccoon']);
  const D5 = D4.concat(['ghost']);
  MB.NIGHTS = [
    { n: 1, day: 'MONDAY', date: 'OCT 27', title: 'The Brainstorm', task: 'Personal essay: rough draft', weather: 'clear', friends: 2, quota: 2, duration: 150, work: 118, essayLines: 9,
      waves: { first: 6, calm: [12, 16], size: [1, 2], gap: [3, 5] }, maxEv: 2, deck: D1, intro: ['phone', 'talker', 'roomba', 'avalanche'] },
    { n: 2, day: 'TUESDAY', date: 'OCT 28', title: 'First Drafts', task: 'Supplemental essays', weather: 'wind', friends: 2, quota: 2, duration: 155, work: 122, essayLines: 10,
      waves: { first: 6, calm: [10, 14], size: [1, 2], gap: [3, 4.5] }, maxEv: 3, deck: D2, intro: ['printer', 'sleeper', 'wifi', 'birds', 'pizza'] },
    { n: 3, day: 'WEDNESDAY', date: 'OCT 29', title: 'Why Us?', task: '"Why our school?" essays', weather: 'rain', friends: 3, quota: 3, duration: 160, work: 126, essayLines: 10,
      waves: { first: 6, calm: [10, 13], size: [1, 3], gap: [2.5, 4] }, maxEv: 3, deck: D3, intro: ['leak', 'gossip', 'toddlers'] },
    { n: 4, day: 'THURSDAY', date: 'OCT 30', title: 'The Activities List', task: '150 characters per activity', weather: 'fog', friends: 3, quota: 3, duration: 165, work: 130, essayLines: 11,
      waves: { first: 6, calm: [9, 12], size: [2, 3], gap: [2.5, 4] }, maxEv: 4, deck: D4, intro: ['raccoon', 'outage', 'alarm'] },
    { n: 5, day: 'FRIDAY', date: 'OCT 31', title: 'Submit Night', task: 'Final proofread + SUBMIT', weather: 'clear', halloween: true, friends: 4, quota: 4, duration: 170, work: 134, essayLines: 12,
      waves: { first: 6, calm: [8, 12], size: [2, 3], gap: [2.5, 3.5] }, maxEv: 4, deck: D5, intro: ['ghost'] },
  ];
  MB.nightDef = function (run) {
    if (run.mode !== 'endless') return MB.NIGHTS[run.nightIdx];
    const k = run.nightIdx;
    const weathers = ['clear', 'wind', 'rain', 'fog'];
    return {
      n: 5 + k, endlessIdx: k + 1, day: ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'][k % 7], date: 'NOV ' + (1 + k), title: 'Rolling Admissions ' + (k + 1),
      task: U.pick(['Scholarship essays', 'Honors college app', 'Waitlist letter', 'Financial aid forms', 'Portfolio upload']),
      weather: U.pick(weathers), halloween: k % 7 === 6, friends: 4, quota: k < 2 ? 3 : k < 5 ? 4 : 5,
      duration: 165, work: Math.min(172, 126 + k * 7), essayLines: Math.min(16, 12 + Math.floor(k / 2)),
      waves: { first: 5, calm: [Math.max(4, 9.5 - k * 0.7), Math.max(6, 12.5 - k * 0.7)], size: [2, Math.min(6, 2 + Math.ceil(k / 2))], gap: [2, 3.2] },
      maxEv: Math.min(7, 3 + Math.ceil(k / 2)), deck: D5, intro: [],
    };
  };

  MB.UPGRADES = [
    { id: 'coldbrew', name: 'Cold Brew', desc: '+12% move speed.', icon: 'coffee', max: 3 },
    { id: 'spikes', name: 'Track Spikes', desc: 'Dash recharges 25% faster.', icon: 'dash', max: 2 },
    { id: 'doubledash', name: 'Double Dash', desc: '+1 dash charge. Chain two in a row.', icon: 'dash', max: 2 },
    { id: 'whistle', name: "Librarian's Glare", desc: 'SHHH reaches 25% farther and cools down 20% faster.', icon: 'shh', max: 2 },
    { id: 'lofi', name: 'Lo-Fi Playlist', desc: 'Friends recover focus 60% faster and the Groove meter fills faster.', icon: 'star', max: 2 },
    { id: 'headphones', name: 'Noise-Canceling Headphones', desc: 'Friends lose 18% less focus to chaos.', icon: 'shh', max: 3 },
    { id: 'keyboard', name: 'Thesaurus Pro', desc: 'Every essay line you write counts 30% more.', icon: 'envelope', max: 2 },
    { id: 'encore', name: 'Encore', desc: 'Groove mode lasts 5 seconds longer.', icon: 'star', max: 2 },
    { id: 'airplane', name: 'Airplane Mode', desc: 'Phone Buzz shows up half as often.', icon: 'phone', max: 1 },
    { id: 'peptalk', name: 'TED Talk Energy', desc: 'Pep talks restore full focus and 6s of calm.', icon: 'chat', max: 1 },
    { id: 'espresso', name: 'Espresso Machine', desc: 'The vending machine restocks coffee twice as fast.', icon: 'coffee', max: 1 },
    { id: 'grabby', name: 'Grabby Hands', desc: 'Bigger reach. Mash jobs need fewer taps.', icon: 'books', max: 1 },
    { id: 'ethernet', name: 'Ethernet Cable', desc: 'Wi-Fi outages fix themselves after 6 seconds.', icon: 'wifi', max: 1 },
    { id: 'groupchat', name: 'Group Chat Hype', desc: 'Whenever anyone submits, everyone gets +35 focus.', icon: 'chat', max: 1 },
    { id: 'flowstate', name: 'Flow State', desc: 'Your Flow multiplier lasts 50% longer.', icon: 'star', max: 1 },
    { id: 'snacks', name: 'Snack Stash', desc: 'Friends start every night 6% ahead.', icon: 'pizza', max: 2 },
  ];

  const LIBRARIAN_LINES = ['Library closes at midnight, dears.', 'Shhh.', "Please don't feed the raccoon.", 'Who keeps ordering pizza?', 'The printer has feelings.', 'Running? ...I saw nothing.', 'Phones go in jail. Library law.', 'Good luck on those essays!'];

  // Difficulty scales how much work there is, how often trouble arrives and how hard it bites.
  MB.DIFFS = {
    easy: { id: 'easy', name: 'EASY', title: 'Chill Study Session', blurb: 'Long calm stretches, short nights of work, plenty of extensions. Good for learning the ropes.',
      work: 1, lines: 0, calm: 1, size: 0, maxEv: 0, drain: 1, life: 1, trickle: 0, grooveFill: 1, grooveTime: 0, ext: [2, 3], score: 1, col: '#6cbf6a' },
    normal: { id: 'normal', name: 'NORMAL', title: 'Crunch Time', blurb: 'Bigger waves, shorter breathers, longer essays. Problems linger and bite harder.',
      work: 1, lines: 4, calm: 0.72, size: 1, maxEv: 1, drain: 1.2, life: 1.15, trickle: 0.045, grooveFill: 0.9, grooveTime: -2, ext: [1, 2], score: 1.3, col: '#f6c945' },
    hard: { id: 'hard', name: 'HARD', title: 'Ivy League', blurb: 'Relentless waves, demanding readers, no safety net. For the valedictorians.',
      work: 1.08, lines: 7, calm: 0.5, size: 2, maxEv: 2, drain: 1.45, life: 1.3, trickle: 0.08, grooveFill: 0.75, grooveTime: -3, ext: [1, 1], score: 1.7, col: '#e0524a' },
  };
  const BLOCKERS = new Set(['wifi', 'sleeper', 'outage', 'alarm']);
  MB.diffOf = (run) => MB.DIFFS[(run && run.diff) || 'normal'];
  MB.applyDiff = function (def, d) {
    const w = def.waves;
    const faster = d.calm < 1 ? 0.8 : 1;
    return Object.assign({}, def, {
      work: Math.round(def.work * d.work),
      essayLines: def.essayLines + d.lines,
      maxEv: def.maxEv + d.maxEv,
      waves: {
        first: Math.max(3, w.first * d.calm),
        calm: [w.calm[0] * d.calm, w.calm[1] * d.calm],
        size: [w.size[0] + Math.ceil(d.size / 2), w.size[1] + d.size],
        gap: [w.gap[0] * faster, w.gap[1] * faster],
      },
    });
  };

  MB.computeStats = function (run) {
    const d = MB.diffOf(run);
    const c = run.ch.stats;
    const u = (id) => run.upgrades[id] || 0;
    return {
      speed: c.speed * (1 + 0.12 * u('coldbrew')),
      dashCd: Math.max(0.3, c.dash * (1 - 0.25 * u('spikes'))),
      charges: 1 + u('doubledash'),
      shushR: 165 * c.shushR * (1 + 0.25 * u('whistle')),
      shushCd: 7 * c.shushCd * Math.pow(0.8, u('whistle')),
      type: c.type * (1 + 0.3 * u('keyboard')),
      regen: 1 + 0.6 * u('lofi'),
      drainMul: 0.7 * d.drain * Math.pow(0.82, u('headphones')),
      grooveFill: (1 + 0.5 * u('lofi')) * d.grooveFill,
      grooveTime: 10 + d.grooveTime + 5 * u('encore'),
      interactR: 1 + 0.3 * u('grabby'),
      coffeeCd: u('espresso') ? 6 : 12,
      pep: c.pep,
      coffee: c.coffee,
      calm: !!c.calm,
      flowMul: 1 + 0.5 * u('flowstate'),
    };
  };

  MB.newRun = function (charIdx, mode, diff) {
    diff = diff || U.store.get('diff', 'normal');
    MB.run = {
      ch: MB.CHARACTERS[charIdx], charIdx, mode, nightIdx: 0, score: 0, upgrades: {},
      friends: U.shuffle(MB.FRIENDS).slice(0, 4), records: {}, history: [], snapshot: null, diff,
      extensions: MB.DIFFS[diff].ext[mode === 'endless' ? 1 : 0],
    };
    return MB.run;
  };
  MB.snapshotRun = function (run) {
    run.snapshot = { score: run.score, records: Object.assign({}, run.records), upgrades: Object.assign({}, run.upgrades), history: run.history.slice(), extensions: run.extensions };
  };
  MB.restoreRun = function (run) {
    if (!run.snapshot) return;
    run.score = run.snapshot.score;
    run.records = Object.assign({}, run.snapshot.records);
    run.upgrades = Object.assign({}, run.snapshot.upgrades);
    run.history = run.snapshot.history.slice();
    run.extensions = run.snapshot.extensions;
  };

  // --- the night ----------------------------------------------------------------------------
  class Night {
    constructor(run) {
      this.name = 'night';
      this.run = run;
      this.diff = MB.diffOf(run);
      const base = run.currentDef && run.currentDefIdx === run.nightIdx ? run.currentDef : MB.nightDef(run);
      const def = (this.def = MB.applyDiff(base, this.diff));
      this.endless = run.mode === 'endless';
      this.stats = MB.computeStats(run);
      this.time = 0;
      this.realT = 0;
      this.duration = def.duration;
      this.player = new MB.Player(run.ch);
      this.player.maxCharges = this.player.charges = this.stats.charges;
      const seatOrder = ['T1L', 'T2R', 'T1R', 'T2L', 'T3R'];
      this.students = run.friends.slice(0, def.friends).map((f, i) => new MB.Student(f, Wd.seats.find((s) => s.id === seatOrder[i]), i));
      if (this.has('snacks')) for (const s of this.students) s.progress = 6 * this.has('snacks');
      this.events = [];
      this.intro = (def.intro || []).slice();
      this.wave = { state: 'calm', t: def.waves.first, queue: 0, gapT: 0, settleT: 0 };
      this.groove = 0;
      this.grooveT = 0;
      this.grooves = 0;
      this.flow = 1;
      this.flowT = 0;
      this.bestFlow = 1;
      this.nightScore = 0;
      this.handled = 0;
      this.myProgress = 0;
      this.mySubmitted = false;
      this.shakeAmt = 0;
      this.freeze = 0;
      this.dark = false;
      this.flicker = 0;
      this.coffeeCd = 0;
      this.floorItems = [];
      this.minigame = null;
      this.hold = { id: null, p: 0 };
      this.banners = [];
      this.phase = 'countdown';
      this.cdT = 3.2;
      this.focusIA = null;
      this.typeBoostT = 0;
      this.autoStandT = 0;
      this.lastMinute = -1;
      this.essay = new MB.Essay(this);
      this.libT = U.rand(6, 12);
      this.libLine = null;
      this.libLineT = 0;
      this.heartT = 0;
      this.seen = new Set();
      FX.clear();
      Au.Music.set({ mode: def.halloween ? 'spooky' : 'chill', intensity: 1, bpm: 84 });
      Au.Music.filter(9000, 0.1);
      Au.Music.duck(1);
    }
    has(id) { return this.run.upgrades[id] || 0; }
    get p01() { return U.clamp(this.time / this.duration, 0, 1); }
    get minutes() { return this.p01 * 180; }
    shake(n) { this.shakeAmt = Math.max(this.shakeAmt, n); }
    hitstop(t) { this.freeze = Math.max(this.freeze, t); }
    slowAt(x, y) {
      let m = 1;
      for (const e of this.events) m = Math.min(m, e.slowAt(x, y));
      return m;
    }
    pickStudent(filter) {
      const c = this.students.filter((s) => s.state === 'study' && s.progress < 96 && (!filter || filter(s)));
      return c.length ? U.pick(c) : null;
    }
    people() { return this.students.length + 1; }
    submittedCount() { return this.students.filter((s) => s.state === 'submitted').length + (this.mySubmitted ? 1 : 0); }

    // --- scoring -------------------------------------------------------------------------
    bumpFlow() {
      this.flow = Math.min(8, this.flow + 1);
      this.flowT = 6 * this.stats.flowMul;
      this.bestFlow = Math.max(this.bestFlow, this.flow);
    }
    resolve(ev, pts, label, x, y) {
      if (ev.resolved) return;
      ev.resolved = true;
      ev.end(this);
      this.handled++;
      const fast = ev.t < 4.5 && ev.type !== 'pizza';
      this.bumpFlow();
      const total = Math.round(pts * (fast ? 1.5 : 1) * this.flow * this.pointMul());
      this.nightScore += total;
      FX.pop(x, y, label, { sub: '+' + total + (this.flow > 1 ? '   x' + this.flow : ''), size: 34 });
      if (fast) FX.text(x, y + 46, 'LIGHTNING FAST!', { size: 16, col: '#9fe0ff', life: 1.2 });
      Au.play('combo', this.flow);
      this.shake(3);
      // friends nearby appreciate it
      let thanked = false;
      for (const s of this.students) {
        if (s.state !== 'study' || U.dist(s.seat.x, s.seat.y, x, y) > 260) continue;
        s.focus = Math.min(100, s.focus + 10);
        if (!thanked && !s.bubble && Math.random() < 0.45) {
          s.say(U.pick(MB.LINES.thanks), 1.4);
          FX.icon(s.seat.x, s.seat.y - 80, 'heart', { bg: null, size: 9, vy: -50 });
          thanked = true;
        }
      }
    }
    pointMul() { return this.grooveT > 0 ? 2 : 1; }
    // the friend who most needs help with their essay
    proofTarget() {
      let best = null;
      for (const s of this.students) if (s.state === 'study' && (!best || s.progress < best.progress)) best = s;
      return best;
    }
    // harder settings let problems linger, except the ones that freeze everyone's writing
    lifeOf(ev) {
      if (!ev.meta || !ev.meta.life) return 0;
      return ev.meta.life * (BLOCKERS.has(ev.type) ? 1 : this.diff.life);
    }
    fail(ev) {
      if (ev.resolved) return;
      ev.resolved = true;
      ev.failed = true;
      ev.end(this);
    }
    addPoints(pts, x, y, label, flat) {
      const total = Math.round(pts * (flat ? 1 : this.flow * this.pointMul()));
      this.nightScore += total;
      FX.text(x, y, (label ? label + ' ' : '') + '+' + total, { size: 18, col: '#ffe08a' });
      Au.play('coin', null, 0.05);
    }
    banner(meta, isNew) {
      this.banners.push({ meta, t: 0, life: isNew ? 3.6 : 2.4, isNew });
      if (this.banners.length > 4) this.banners.splice(1, 1);
    }

    // --- spawning -----------------------------------------------------------------------------
    canSpawn(type) {
      const meta = MB.EVENTS[type];
      if (!meta) return false;
      const active = this.events.filter((e) => !e.resolved);
      if (active.filter((e) => e.type === type).length >= meta.max) return false;
      if (meta.excl && active.some((e) => meta.excl.includes(e.type))) return false;
      if (this.events.some((e) => e.type === type && !e.dead) && meta.max === 1) return false;
      if (meta.need && !meta.need(this)) return false;
      if (this.duration - this.time < 8) return false;
      if (meta.good && this.p01 > 0.85) return false;
      return true;
    }
    spawn(type) {
      if (!this.canSpawn(type)) return false;
      const ev = new MB.EVENTS[type].cls(this);
      if (ev.invalid) return false;
      this.events.push(ev);
      const isNew = !this.seen.has(type) && !MB.seenEvents.has(type);
      this.seen.add(type);
      MB.seenEvents.add(type);
      U.store.set('seen', [...MB.seenEvents]);
      this.banner(Object.assign({ type }, MB.EVENTS[type], type === 'birds' && this.def.halloween ? { name: 'Bat Invasion', icon: 'bat' } : {}), isNew);
      Au.play('whoosh');
      return true;
    }
    activeTrouble() {
      return this.events.filter((e) => !e.resolved && !MB.EVENTS[e.type].good).length;
    }
    pickType() {
      // introduce tonight's new distractions one at a time, in order
      while (this.intro.length && !this.seen.has(this.intro[0]) && this.canSpawn(this.intro[0])) return this.intro.shift();
      if (this.intro.length && this.seen.has(this.intro[0])) this.intro.shift();
      const opts = this.def.deck.filter((t) => this.canSpawn(t)).map((t) => {
        let w = MB.EVENTS[t].weight;
        if (t === 'phone' && this.has('airplane')) w *= 0.5;
        if (this.intro.includes(t)) w = 0;
        return [t, w];
      }).filter((o) => o[1] > 0);
      return opts.length ? U.weighted(opts) : null;
    }
    updateSpawns(dt) {
      const W = this.wave;
      if (this.grooveT > 0) return; // groove = guaranteed breather
      const wv = this.def.waves;
      if (W.state === 'calm') {
        W.t -= dt;
        // harder difficulties keep a trickle of single problems coming between waves
        if (this.diff.trickle && this.activeTrouble() < this.def.maxEv && Math.random() < this.diff.trickle * dt) {
          const minor = ['phone', 'talker', 'birds', 'roomba', 'gossip', 'printer'].filter((t) => this.def.deck.includes(t) && this.seen.has(t) && this.canSpawn(t));
          if (minor.length) this.spawn(U.pick(minor));
        }
        if (W.t <= 0) {
          W.state = 'rush';
          W.queue = U.randi(wv.size[0], wv.size[1]);
          if (this.p01 > 0.85) W.queue++;
          W.gapT = 0;
        }
      } else if (W.state === 'rush') {
        W.gapT -= dt;
        if (W.gapT <= 0) {
          W.gapT = U.rand(wv.gap[0], wv.gap[1]);
          if (this.activeTrouble() < this.def.maxEv) {
            const type = this.pickType();
            if (type && this.spawn(type)) W.queue--;
          }
          if (W.queue <= 0 || W.gapT > 30) {
            W.state = 'settle';
            W.settleT = 0;
          }
        }
      } else if (W.state === 'settle') {
        W.settleT += dt;
        if (this.activeTrouble() === 0 || W.settleT > 22) {
          W.state = 'calm';
          const late = this.p01 > 0.75 ? 0.8 : 1;
          W.t = U.rand(wv.calm[0], wv.calm[1]) * late;
        }
      }
    }

    // --- interactions ---------------------------------------------------------------------------
    gather() {
      const p = this.player;
      const list = [];
      for (const ev of this.events) if (!ev.resolved) for (const ia of ev.interactables(this)) list.push(ia);
      for (const s of this.students) {
        if (s.state === 'wander' || s.state === 'scroll') {
          list.push({ x: s.x, y: s.y, r: 64, prio: 7, label: 'Pep talk ' + s.name, press: () => this.pepTalk(s) });
        } else if (s.state === 'study' && !s.flags.asleep) {
          if (p.carry === 'coffee') list.push({ x: s.seat.x, y: s.seat.y, r: 82, prio: 4, label: 'Give ' + s.name + ' coffee', press: () => this.giveCoffee(s) });
          if (p.carry === 'pizza') list.push({ x: s.seat.x, y: s.seat.y, r: 82, prio: 4, label: 'Share a slice', press: () => this.shareSlice(s) });
        }
      }
      const seat = Wd.playerSeat;
      if (this.mySubmitted && this.proofTarget() && !p.carry) {
        list.push({ x: seat.x, y: seat.y, r: 66, prio: 3, label: 'Proofread for friends', press: () => this.sit() });
      }
      if (!this.mySubmitted) {
        const full = p.carry === 'toddler';
        const label = full ? 'Hands full!' : p.carry === 'coffee' ? 'Sit + chug coffee' : p.carry ? 'Set it down + write' : 'Sit & write essay';
        list.push({ x: seat.x, y: seat.y, r: 66, prio: 3, label, disabled: full, press: () => this.sit() });
      }
      const st = Wd.stations;
      if (!p.carry) {
        list.push({ x: st.vending.use.x, y: st.vending.use.y, r: 62, prio: 2, label: this.coffeeCd > 0 ? 'Restocking... ' + Math.ceil(this.coffeeCd) : 'Grab coffee', disabled: this.coffeeCd > 0, press: () => this.grabCoffee() });
        list.push({ x: st.cart.use.x, y: st.cart.use.y, r: 66, prio: 2, label: 'Grab bucket', press: () => this.grabBucket() });
        for (const fi of this.floorItems) list.push({ x: fi.x, y: fi.y, r: 44, prio: 3, label: 'Pick up ' + fi.kind, press: () => { this.floorItems.splice(this.floorItems.indexOf(fi), 1); p.carry = fi.kind; p.carryData = fi.data; Au.play('pop'); } });
      }
      return list;
    }
    findInteractable() {
      const p = this.player;
      let best = null, bs = -1e9;
      for (const ia of this.gather()) {
        const d = U.dist(p.x, p.y, ia.x, ia.y);
        if (d > ia.r * this.stats.interactR) continue;
        const sc = ia.prio * 1000 - d - (ia.disabled ? 400 : 0) - (ia.hintOnly ? 5000 : 0);
        if (sc > bs) { bs = sc; best = ia; }
      }
      if (best) best.id = (best.x | 0) + ',' + (best.y | 0) + ',' + best.label;
      return best;
    }
    activate(ia) {
      const p = this.player;
      if (!ia) {
        if (p.carry === 'coffee') {
          p.carry = null;
          p.zoomT = 7;
          Au.play('slurp');
          p.say('ZOOM.', 1);
          FX.text(p.x, p.y - 90, 'SPEED UP!', { size: 18, col: '#ffe08a' });
        } else if (p.carry === 'bucket') {
          this.floorItems.push({ kind: 'bucket', x: p.x, y: p.y + 4 });
          p.carry = null;
          Au.play('thud');
        } else if (p.carry === 'toddler' && p.carryData) {
          const k = p.carryData.kid;
          k.x = p.x;
          k.y = p.y + 6;
          k.state = 'run';
          k.path = [];
          p.carry = null;
          p.carryData = null;
          Au.play('squeak');
        } else if (p.carry === 'pizza') {
          p.carryData.slices--;
          Au.play('slurp');
          p.say('nom', 0.8);
          if (p.carryData.slices <= 0) p.carry = null;
        }
        return;
      }
      if (ia.hintOnly || ia.disabled) {
        Au.play('bad', null, 0.2);
        return;
      }
      if (ia.hold) return;
      ia.press();
    }
    pepTalk(s) {
      if (!s.pep(this)) return;
      this.player.say(U.pick(MB.LINES.pep), 1.4);
      this.bumpFlow();
      this.addPoints(80, s.x, s.y - 90, 'PEP TALK!');
      FX.ring(s.x, s.y - 40, 10, 60, '#ffe08a', 0.4, 4);
      Au.play('confirm');
    }
    grabCoffee() {
      const p = this.player;
      p.carry = 'coffee';
      this.coffeeCd = this.stats.coffeeCd;
      Au.play('coffee');
      FX.text(p.x, p.y - 90, '+ COFFEE', { size: 18, col: '#f6c945' });
    }
    grabBucket() {
      this.player.carry = 'bucket';
      Au.play('pop');
    }
    giveCoffee(s) {
      const p = this.player;
      p.carry = null;
      FX.arc(p.x, p.y - 60, s.seat.x, s.seat.y - 40, 'coffee', { life: 0.35, height: 50 });
      s.focus = 100;
      s.boostT = 10 * this.stats.coffee;
      s.say(U.pick(MB.LINES.coffee), 1.6);
      Au.play('slurp');
      this.addPoints(60, s.seat.x, s.seat.y - 100, 'CAFFEINE!');
    }
    shareSlice(s) {
      const p = this.player;
      p.carryData.slices--;
      FX.arc(p.x, p.y - 60, s.seat.x, s.seat.y - 40, 'slice', { life: 0.35, height: 50 });
      s.focus = Math.min(100, s.focus + 45);
      s.immuneT = Math.max(s.immuneT, 3);
      s.say(U.pick(MB.LINES.pizza), 1.4);
      Au.play('pop');
      this.addPoints(50, s.seat.x, s.seat.y - 100, 'NOM');
      if (p.carryData.slices <= 0) {
        p.carry = null;
        p.carryData = null;
      }
    }
    sit() {
      const p = this.player;
      if (p.carry === 'bucket' || p.carry === 'pizza') {
        this.floorItems.push({ kind: p.carry, x: Wd.playerSeat.x + 40, y: Wd.playerSeat.y + 10, data: p.carryData });
        p.carry = null;
        p.carryData = null;
      }
      if (p.carry === 'coffee') {
        p.carry = null;
        this.typeBoostT = 10 * this.stats.coffee;
        Au.play('slurp');
        FX.text(p.x, p.y - 100, 'TURBO TYPING!', { size: 20, col: '#f6c945' });
      }
      p.seated = true;
      p.dashT = 0;
      p.vx = p.vy = 0;
      Au.play('select');
    }
    standUp() {
      const p = this.player;
      p.seated = false;
      p.x = Wd.playerSeat.x + 34;
      p.y = Wd.playerSeat.y + 2;
      p.sq = 0.4;
      Au.play('back');
    }
    noiseAt(seat) {
      const pseudo = { seat, state: 'study', x: seat.x, y: seat.y, flags: {}, isPlayer: true };
      let n = 0;
      for (const e of this.events) if (!e.resolved) n += e.drain(pseudo, this);
      return n;
    }
    essayPick(i) {
      if (this.player.seated && this.phase === 'play') this.essay.choose(i);
    }
    doShush() {
      const p = this.player;
      if (p.shushCd > 0) {
        Au.play('bad', null, 0.2);
        return;
      }
      p.shushCd = this.stats.shushCd;
      p.shushT = 0.5;
      const r = this.stats.shushR;
      Au.play('shh');
      FX.ring(p.x, p.y - 30, 10, r, 'rgba(170,220,255,0.95)', 0.55, 7);
      FX.ring(p.x, p.y - 30, 6, r * 0.7, 'rgba(255,255,255,0.8)', 0.45, 4);
      FX.pop(p.x, p.y - 100, 'SHHHH!', { size: 30, col: '#bfe3ff', life: 0.9 });
      this.shake(4);
      for (const s of this.students) {
        if (s.state === 'study' && U.dist(p.x, p.y, s.seat.x, s.seat.y) < r) {
          s.focus = Math.min(100, s.focus + 8);
          s.immuneT = Math.max(s.immuneT, 1.5);
        }
      }
      const before = this.handled;
      for (const ev of this.events) if (!ev.resolved) ev.onShush(p.x, p.y, r, this);
      const hits = this.handled - before;
      if (hits >= 2) {
        FX.pop(p.x, p.y - 150, 'MULTI-SHUSH x' + hits + '!', { size: 30, col: '#9fe0ff', life: 1.2 });
        this.addPoints(100 * hits, p.x, p.y - 120);
      }
      if (U.dist(p.x, p.y, 985, 612) < r + 80) {
        this.libLine = 'Nicely done.';
        this.libLineT = 1.6;
      }
    }

    // --- minigames ------------------------------------------------------------------------------
    startMinigame(type, ev) {
      if (type === 'timing') this.minigame = { type, ev, needle: 0, dir: 1, speed: 1.5, zone: U.rand(0.25, 0.75), w: 0.2, t: 0, flash: 0 };
      else this.minigame = { type, ev, idx: 0, t: 0, shake: 0 };
      this.player.vx = this.player.vy = 0;
      Au.play('select');
    }
    endMinigame() { this.minigame = null; }
    updateMinigame(dt) {
      const m = this.minigame;
      m.t += dt;
      if (m.ev.resolved) return this.endMinigame();
      if (In.hit('dash') || In.hit('pause')) {
        Au.play('back');
        return this.endMinigame();
      }
      if (m.type === 'timing') {
        if (In.moveHit()) return this.endMinigame();
        m.flash = Math.max(0, m.flash - dt);
        m.needle += m.dir * m.speed * dt;
        if (m.needle > 1) { m.needle = 1; m.dir = -1; }
        if (m.needle < 0) { m.needle = 0; m.dir = 1; }
        if (In.hit('act')) {
          if (Math.abs(m.needle - m.zone) < m.w / 2) {
            m.flash = 0.25;
            m.good = true;
            if (!m.ev.onHit()) {
              m.zone = U.rand(0.15, 0.85);
              m.w = Math.max(0.1, m.w - 0.03);
              m.speed += 0.35;
            }
          } else {
            m.flash = 0.25;
            m.good = false;
            m.ev.onMiss();
          }
        }
      } else if (m.type === 'qte') {
        m.shake = Math.max(0, m.shake - dt * 3);
        const dirs = ['up', 'down', 'left', 'right'];
        for (const d of dirs) {
          if (!In.hit(d)) continue;
          if (m.ev.code[m.idx] === d) {
            m.idx++;
            Au.play('blip');
            if (m.idx >= m.ev.code.length) {
              this.endMinigame();
              m.ev.onComplete();
              return;
            }
          } else {
            m.idx = 0;
            m.shake = 1;
            Au.play('bad');
            this.shake(3);
          }
        }
      }
    }

    // --- submissions + end ---------------------------------------------------------------------------
    submitStudent(s) {
      s.state = 'submitted';
      s.progress = 100;
      s.cheerT = 3.5;
      for (const k in s.flags) s.flags[k] = false;
      s.say(U.pick(MB.LINES.submit), 2.5);
      FX.confetti(s.seat.x, s.seat.y - 50, 70);
      FX.pop(s.seat.x, s.seat.y - 120, 'SUBMITTED!', { col: '#9fe08a', size: 36, sub: '+1000' });
      FX.arc(s.seat.x, s.seat.y - 60, 640, 40, 'crest', { life: 1, height: 120, spin: false });
      this.nightScore += 1000;
      Au.play('submit');
      this.shake(5);
      this.hitstop(0.06);
      if (this.has('groupchat')) for (const o of this.students) if (o.state === 'study') o.focus = Math.min(100, o.focus + 35);
      this.checkAllDone();
    }
    submitMine() {
      this.mySubmitted = true;
      const seat = Wd.playerSeat;
      FX.confetti(seat.x, seat.y - 50, 90, 1.2);
      FX.pop(seat.x, seat.y - 130, 'YOU SUBMITTED!', { col: '#ffe08a', size: 40, sub: '+1000' });
      FX.arc(seat.x, seat.y - 60, 640, 40, 'crest', { life: 1, height: 120, spin: false });
      this.nightScore += 1000;
      Au.play('submit');
      this.shake(6);
      this.hitstop(0.08);
      if (this.students.some((s) => s.state === 'study')) FX.text(seat.x, seat.y - 170, 'Keep writing: now you PROOFREAD for friends!', { size: 18, col: '#9fe0ff', life: 2.4 });
      if (this.has('groupchat')) for (const o of this.students) if (o.state === 'study') o.focus = Math.min(100, o.focus + 35);
      this.checkAllDone();
    }
    checkAllDone() {
      if (this.mySubmitted && this.students.every((s) => s.state === 'submitted')) this.endNight('allclear');
    }
    endNight(reason) {
      if (this.phase === 'end') return;
      this.phase = 'end';
      this.endReason = reason;
      this.endT = 3.4;
      this.minigame = null;
      for (const ev of this.events) {
        ev.end(this);
        ev.resolved = true;
      }
      this.dark = false;
      Au.Music.filter(9000);
      Au.Music.duck(1);
      Au.Music.set({ intensity: 0, bpm: 76 });
      const pass = this.submittedCount() >= this.def.quota;
      if (reason === 'allclear') {
        FX.pop(640, 300, 'EVERYONE SUBMITTED!', { size: 54, col: '#9fe08a', life: 3, sub: 'with ' + Math.ceil(this.duration - this.time) + 's to spare' });
        for (let i = 0; i < 5; i++) FX.confetti(200 + i * 220, 720, 50, 1.4);
        Au.play('fanfare');
      } else {
        FX.pop(640, 300, '12:00 AM', { size: 64, col: pass ? '#ffe08a' : '#ff9a8a', life: 3, sub: 'PENCILS DOWN!' });
        Au.play(pass ? 'fanfare' : 'fail');
        Au.play('stamp');
      }
      this.shake(8);
    }
    finishNight() {
      const run = this.run;
      const count = this.submittedCount();
      const total = this.people();
      const pass = count >= this.def.quota;
      const full = count === total;
      const fullBonus = full ? 1500 : 0;
      const timeBonus = this.endReason === 'allclear' ? Math.round((this.duration - this.time) * 15) : 0;
      const diffBonus = Math.round((this.nightScore + fullBonus + timeBonus) * (this.diff.score - 1));
      const nightScore = this.nightScore + fullBonus + timeBonus + diffBonus;
      let grade = 'F';
      if (full && this.endReason === 'allclear') grade = 'A+';
      else if (full) grade = 'A';
      else if (count >= this.def.quota + 1) grade = 'B';
      else if (pass) grade = 'C';
      const res = {
        def: this.def, endless: this.endless, count, total, quota: this.def.quota, pass, full, grade,
        base: this.nightScore, fullBonus, timeBonus, diffBonus, diff: this.diff, nightScore, handled: this.handled, bestFlow: this.bestFlow,
        names: [{ name: run.ch.name + ' (you)', ok: this.mySubmitted, look: run.ch.look, progress: this.myProgress }].concat(this.students.map((s) => ({ name: s.name, ok: s.state === 'submitted', look: s.look, progress: s.progress, college: s.college }))),
        essay: { perfect: this.essay.perfect, written: this.essay.written, best: this.essay.best },
        grooves: this.grooves,
      };
      // a missed quota burns an extension instead of ending the run
      res.usedExt = false;
      if (!pass && run.extensions > 0) {
        run.extensions--;
        res.usedExt = true;
      }
      res.cont = pass || res.usedExt;
      res.extLeft = run.extensions;
      res.counted = pass ? nightScore : res.usedExt ? Math.round(nightScore * 0.5) : 0;
      if (res.cont) {
        run.score += res.counted;
        run.history.push({ n: this.def.n, grade, score: res.counted });
        if (this.mySubmitted) run.records.__me = (run.records.__me || 0) + 1;
        for (const s of this.students) if (s.state === 'submitted') run.records[s.name] = (run.records[s.name] || 0) + 1;
      }
      MB.go(MB.Screens.results(res));
    }

    // --- update ------------------------------------------------------------------------------------
    update(dt) {
      this.realT += dt;
      if (In.hit('mute')) Au.toggleMute();
      if (this.phase !== 'end' && In.hit('pause') && !this.minigame) {
        MB.pause(this);
        return;
      }
      this.shakeAmt = Math.max(0, this.shakeAmt - dt * 30 - this.shakeAmt * dt * 4);
      if (this.freeze > 0) {
        this.freeze -= dt;
        return;
      }
      FX.update(dt);
      if (this.banners.length) {
        const b = this.banners[0];
        b.t += dt * (this.banners.length > 1 ? 1.5 : 1);
        if (b.t >= b.life) this.banners.shift();
      }
      if (this.flicker > 0) this.flicker -= dt;
      const p = this.player;
      p.shushT = Math.max(0, (p.shushT || 0) - dt);

      if (this.phase === 'countdown') {
        const prev = Math.ceil(this.cdT);
        this.cdT -= dt;
        if (Math.ceil(this.cdT) !== prev && this.cdT > 0) Au.play('tick');
        for (const s of this.students) s.update(dt, this);
        p.update(dt, this, 0, 0);
        if (this.cdT <= 0) {
          this.phase = 'play';
          Au.play('confirm');
          FX.pop(640, 330, 'HIT THE BOOKS!', { size: 64, col: '#ffe08a', life: 1.2 });
          this.shake(4);
        }
        return;
      }
      if (this.phase === 'end') {
        this.endT -= dt;
        for (const s of this.students) {
          s.update(dt, this);
          if (s.state === 'submitted' && Math.random() < dt) s.cheerT = 1;
        }
        p.update(dt, this, 0, 0);
        if (this.endT <= 0) {
          this.phase = 'done';
          this.finishNight();
        }
        return;
      }
      if (this.phase !== 'play') return;

      this.time += dt;
      if (this.coffeeCd > 0) this.coffeeCd -= dt;
      if (this.typeBoostT > 0) this.typeBoostT -= dt;
      if (p.zoomT > 0) p.zoomT -= dt;
      if (this.flowT > 0) {
        this.flowT -= dt;
        if (this.flowT <= 0 && this.flow > 1) {
          this.flow--;
          this.flowT = 2.2;
        }
      }
      this.updateSpawns(dt);

      // player control
      let [ix, iy] = In.axis();
      if (this.minigame) {
        this.updateMinigame(dt);
        ix = iy = 0;
        this.focusIA = null;
      } else if (p.seated) {
        ix = iy = 0;
        this.focusIA = null;
        if (this.autoStandT > 0) {
          this.autoStandT -= dt;
          if (this.autoStandT <= 0) this.standUp();
        } else if (In.hit('down') || In.hit('dash')) this.standUp();
        else if (In.hit('shush')) {
          this.standUp();
          this.doShush();
        } else {
          if (In.hit('left')) this.essay.choose(0);
          else if (In.hit('up')) this.essay.choose(1);
          else if (In.hit('right')) this.essay.choose(2);
          if (In.mouse.clicked && this.cardRects) {
            this.cardRects.forEach((r, i) => { if (r && U.inRect(In.mouse.x, In.mouse.y, r)) this.essay.choose(i); });
          }
          if (In.typed) this.essay.speedUp(In.typed);
        }
      } else {
        if (In.hit('dash')) p.tryDash(ix, iy);
        if (In.hit('shush')) this.doShush();
        this.focusIA = this.findInteractable();
        if (In.hit('act')) this.activate(this.focusIA);
        const ia = this.focusIA;
        if (ia && ia.hold && In.isDown('act')) {
          if (this.hold.id !== ia.id) this.hold = { id: ia.id, p: 0 };
          this.hold.p += dt;
          if (Math.floor(this.hold.p * 8) !== Math.floor((this.hold.p - dt) * 8)) Au.play('hold');
          if (this.hold.p >= ia.hold.need) {
            this.hold = { id: null, p: 0 };
            ia.hold.fn();
          }
        } else this.hold.p = Math.max(0, this.hold.p - dt * 2);
      }
      this.essay.update(dt);
      p.update(dt, this, ix, iy);
      if (p.dashing) for (const ev of this.events) if (!ev.resolved) ev.onDash(p, this);

      // events
      for (const ev of this.events) {
        ev.update(dt, this);
        const life = this.lifeOf(ev);
        if (life && !ev.resolved && !ev.noExpire && ev.t > life) ev.expire();
      }
      for (const ev of this.events) if (ev.dead && !ev.resolved) ev.end(this);
      this.events = this.events.filter((e) => !e.dead);

      // students
      let chaos = 0;
      for (const ev of this.events) if (!ev.resolved) chaos += ev.chaos;
      this.chaos = chaos;
      const rate = 100 / this.def.work;
      for (const s of this.students) {
        s.update(dt, this);
        if (s.state !== 'study') continue;
        // local noise drains focus outright; general chaos just eats into recovery
        let local = 0;
        for (const ev of this.events) if (!ev.resolved) local += ev.drain(s, this);
        const ambient = chaos * 0.25 * this.stats.drainMul;
        let drain = local > 0.05 ? (local * this.stats.drainMul + ambient) : 0;
        if (s.immuneT > 0) drain = 0;
        s.drainNow = drain;
        if (drain > 0) s.focus -= drain * dt;
        else s.focus += (9 * this.stats.regen * (this.grooveT > 0 ? 2 : 1) - (s.immuneT > 0 ? 0 : ambient)) * dt;
        s.focus = U.clamp(s.focus, 0, 100);
        if (s.focus <= 0 && !s.flags.asleep) {
          s.distract();
          continue;
        }
        const pm = s.progressMul();
        if (pm > 0) {
          const f = 0.4 + 0.6 * (s.focus / 100);
          s.progress += rate * f * pm * (s.boostT > 0 ? 1.5 : 1) * (this.grooveT > 0 ? 1.5 : 1) * (this.dark ? 0.75 : 1) * dt;
          if (this.grooveT > 0 && Math.random() < dt * 1.2) FX.icon(s.seat.x + U.rand(-20, 20), s.seat.y - 60, 'note', { bg: null, size: 9, vy: -60 });
          if (s.progress >= 100) this.submitStudent(s);
        }
      }

      // groove: a calm room builds toward GROOVE MODE
      const wandering = this.students.some((s) => s.state === 'wander' || s.state === 'scroll');
      if (this.grooveT > 0) {
        this.grooveT -= dt;
        if (this.grooveT <= 0) {
          FX.text(640, 260, 'groove fades... stay chill to bring it back', { size: 18, col: '#ffe9a8', life: 2 });
          this.wave.state = 'calm';
          this.wave.t = Math.max(this.wave.t, 4);
        }
      } else if (this.activeTrouble() === 0 && !wandering) {
        this.groove += (dt / 8) * this.stats.grooveFill;
        if (this.groove >= 1) this.startGroove();
      } else this.groove = Math.max(0, this.groove - dt / 14);

      // librarian chatter
      this.libT -= dt;
      this.libLineT -= dt;
      if (this.libT <= 0) {
        this.libT = U.rand(14, 26);
        this.libLine = U.pick(LIBRARIAN_LINES);
        this.libLineT = 2.6;
      }

      // music + clock
      const p01 = this.p01;
      const trouble = this.activeTrouble();
      const intensity = p01 > 0.92 ? 3 : this.grooveT > 0 || trouble >= 2 ? 2 : 1;
      Au.Music.set({ intensity, bpm: p01 > 0.92 ? 96 : this.grooveT > 0 ? 90 : 84 });
      const minute = Math.floor(this.minutes);
      if (minute !== this.lastMinute) {
        if (minute === 120) {
          FX.pop(640, 300, 'FINAL HOUR!', { size: 58, col: '#ff9a8a', life: 1.8, sub: 'the music knows' });
          Au.play('alarm');
          this.shake(5);
        } else if (minute === 170) {
          FX.pop(640, 300, '10 MINUTES LEFT!', { size: 54, col: '#ff6a5a', life: 1.6 });
          Au.play('heartbeat');
          this.shake(6);
        }
        this.lastMinute = minute;
        if (p01 > 0.92) Au.play('tick');
      }
      if (p01 > 0.95) {
        this.heartT -= dt;
        if (this.heartT <= 0) {
          this.heartT = 0.9;
          Au.play('heartbeat');
        }
      }
      if (this.time >= this.duration) this.endNight('midnight');
    }

    startGroove() {
      this.groove = 0;
      this.grooveT = this.stats.grooveTime;
      this.grooves++;
      FX.pop(640, 300, 'GROOVE MODE!', { size: 62, col: '#ffd76a', life: 1.8, sub: 'everyone locks in · double points' });
      Au.play('submit');
      this.shake(4);
      for (const s of this.students) {
        if (s.state === 'study') {
          s.focus = 100;
          s.cheerT = 0;
          if (Math.random() < 0.6) s.say(U.pick(['vibes.', 'LOCKED IN', 'this beat slaps', 'flow state!!', 'we are SO back']), 1.6);
        }
      }
    }

    // --- render ---------------------------------------------------------------------------------------
    draw(ctx) {
      const s = MB.settings.shake ? this.shakeAmt : 0;
      ctx.save();
      if (s > 0.2) ctx.translate(U.rand(-s, s), U.rand(-s, s));
      Wd.drawSky(ctx, this.p01, this.def, this.realT);
      ctx.drawImage(Wd.bg[A.boil % Wd.bg.length], 0, 0, W, H);
      this.drawWallDynamic(ctx);
      FX.draw(ctx, 'world');
      const list = [];
      for (const pr of Wd.props) list.push({ y: pr.sortY, fn: (c) => Wd.drawSprite(c, pr.o.spr, pr.o.x, pr.o.y, pr.shake, 0) });
      const rt = Wd.stations.router;
      list.push({ y: rt.y + rt.d + 0.1, fn: (c) => this.drawRouterLeds(c) });
      for (const t of Wd.tables) list.push({ y: t.y + t.d, fn: (c) => this.drawTable(c, t) });
      for (const st of this.students) {
        if (st.state === 'study' || st.state === 'submitted') list.push({ y: st.seat.table.y - 1, fn: (c) => st.draw(c) });
        else list.push({ y: st.y, fn: (c) => st.draw(c) });
      }
      const p = this.player;
      if (p.seated) {
        const seat = Wd.playerSeat;
        list.push({ y: seat.table.y - 1, fn: (c) => A.person(c, seat.x, seat.y, Object.assign({ chair: '#7b4a8c' }, p.look), { pose: this.mySubmitted && !this.proofTarget() ? 'cheer' : 'type', t: p.typeAnim > 0 ? this.realT : 0, emo: this.mySubmitted ? 'happy' : this.noiseAt(seat) > 4 && !this.stats.calm ? 'stress' : 'focus', lean: 2 }) });
      } else {
        // empty chair for the player
        const seat = Wd.playerSeat;
        list.push({ y: seat.table.y - 1.5, fn: (c) => { A.rr(c, seat.x - 17, seat.y - 54, 34, 44, 9, 777); A.fs(c, '#7b4a8c'); } });
      }
      for (const seat of Wd.seats) {
        if (seat === Wd.playerSeat || this.students.some((st) => st.seat === seat)) continue;
        list.push({ y: seat.table.y - 1.5, fn: (c) => { A.shape(c, () => A.rr(c, seat.x - 17, seat.y - 54, 34, 44, 9, seat.x), A.C.chair, (cc) => { cc.fillStyle = A.C.chairDark; cc.fillRect(seat.x + 6, seat.y - 60, 20, 60); }); } });
      }
      list.push({ y: p.y, fn: (c) => p.draw(c) });
      list.push({ y: 612, fn: (c) => this.drawLibrarian(c) });
      for (const fi of this.floorItems) list.push({ y: fi.y, fn: (c) => { A.shadow(c, fi.x, fi.y, 14, 4); if (fi.kind === 'pizza') A.pizzaBox(c, fi.x, fi.y, fi.data ? fi.data.slices : 4); else A.bucket(c, fi.x, fi.y, 0.8); } });
      for (const ev of this.events) ev.draw(list, this);
      list.sort((a, b) => a.y - b.y);
      for (const it of list) it.fn(ctx);
      for (const ev of this.events) ev.drawTop(ctx, this);
      FX.draw(ctx, 'top');
      this.drawLighting(ctx);
      if (this.grooveT > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const k = Math.min(1, this.grooveT / 1.5, (this.stats.grooveTime - this.grooveT) / 0.6 + 0.2);
        ctx.fillStyle = `rgba(255,190,90,${(0.1 + 0.05 * Math.sin(this.realT * 4.7)) * k})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
      if (this.events.some((e) => e.type === 'alarm' && !e.resolved)) {
        ctx.fillStyle = `rgba(255,30,30,${0.08 + 0.08 * Math.sin(this.realT * 12)})`;
        ctx.fillRect(0, 0, W, H);
      }
      const final = this.p01 > 0.9 && this.phase === 'play';
      Wd.drawPost(ctx, 0.5, final ? 0.55 + 0.3 * Math.sin(this.realT * 7) : 0);
      ctx.restore();
      MB.HUD.draw(ctx, this);
    }
    drawWallDynamic(ctx) {
      Wd.drawClockHands(ctx, this.minutes);
      const b = Wd.stations.breaker;
      // breaker lever
      ctx.fillStyle = this.dark ? '#e0524a' : '#6cbf6a';
      A.rr(ctx, b.x - 5, this.dark ? b.y + 2 : b.y - 14, 10, 14, 2, 12, 0.3);
      A.fs(ctx, this.dark ? '#e0524a' : '#6cbf6a', 2);
      // alarm strobe on the panel
      const alarm = this.events.some((e) => e.type === 'alarm' && !e.resolved);
      if (alarm && Math.sin(this.realT * 20) > 0) {
        const a = Wd.stations.alarm;
        ctx.fillStyle = '#fff6a0';
        ctx.beginPath();
        ctx.arc(a.x, a.y - 30, 7, 0, U.TAU);
        ctx.fill();
      }
      if (this.def.halloween) this.drawHalloweenWall(ctx);
    }
    drawHalloweenWall(ctx) {
      // string lights along the sill + cobwebs
      ctx.strokeStyle = A.INK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 300; x <= 980; x += 10) {
        const y = 150 + Math.sin((x - 300) / 680 * Math.PI * 6) * 6;
        if (x === 300) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      for (let i = 0; i < 18; i++) {
        const x = 310 + i * 38;
        const y = 150 + Math.sin((x - 300) / 680 * Math.PI * 6) * 6 + 5;
        ctx.fillStyle = (i + Math.floor(this.realT * 2)) % 3 === 0 ? '#ffe08a' : i % 2 ? '#f08a3c' : '#a77bdc';
        ctx.beginPath();
        ctx.ellipse(x, y, 3.5, 5, 0, 0, U.TAU);
        ctx.fill();
        ctx.stroke();
      }
      for (const [cx, sx] of [[0, 1], [1280, -1]]) {
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 5; i++) {
          const a = (i / 4) * Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(cx, 0);
          ctx.lineTo(cx + sx * Math.cos(a) * 70, Math.sin(a) * 70);
          ctx.stroke();
        }
        for (let r = 20; r <= 60; r += 20) {
          ctx.beginPath();
          for (let i = 0; i <= 4; i++) {
            const a = (i / 4) * Math.PI / 2;
            const x = cx + sx * Math.cos(a) * r, y = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.quadraticCurveTo(cx + sx * Math.cos(a - 0.2) * r * 0.85, Math.sin(a - 0.2) * r * 0.85, x, y);
          }
          ctx.stroke();
        }
      }
    }
    drawRouterLeds(ctx) {
      const rt = Wd.stations.router;
      const wifiDown = this.events.some((e) => e.type === 'wifi' && !e.resolved);
      for (let i = 0; i < 3; i++) {
        for (let k = 0; k < 4; k++) {
          const on = Math.sin(this.realT * (6 + k * 3) + i * 2) > 0;
          ctx.fillStyle = wifiDown ? (on ? '#ff4d4d' : '#5a1a1a') : on ? '#6cf0a0' : '#1f4a32';
          ctx.fillRect(rt.x + 10 + k * 8, rt.y - rt.h + rt.d + 11 + i * 19, 4, 4);
        }
      }
    }
    drawTable(ctx, t) {
      Wd.drawSprite(ctx, t.spr, t.x, t.y);
      const top = t.y - t.h;
      const lampOn = !this.dark && !(this.flicker > 0 && Math.random() < 0.5);
      A.lamp(ctx, t.x + t.w / 2, top + 30, lampOn, t.x);
      for (const seat of Wd.seats) {
        if (seat.table !== t) continue;
        const st = this.students.find((s) => s.seat === seat);
        const mine = seat === Wd.playerSeat;
        if (!st && !mine) continue;
        const col = mine ? '#e8e0f0' : st.laptopCol;
        const glow = mine ? (this.mySubmitted ? '#9fe08a' : '#9fd8ff') : st.state === 'submitted' ? '#9fe08a' : '#9fd8ff';
        A.laptop(ctx, seat.x, top + 26, col, mine ? 7 : st.sticker, glow);
        if (st && st.state === 'submitted') A.icon(ctx, 'check', seat.x, top + 12, 7, '#fffaf0');
      }
      if (this.def.halloween) this.drawPumpkin(ctx, t.x + 18, top + 36, t.x);
    }
    drawPumpkin(ctx, x, y, seed) {
      A.shape(ctx, () => A.blob(ctx, x, y - 8, 13, 10, seed, 0.08, 10), '#f08a3c', (c) => {
        c.strokeStyle = '#c4622a';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x, y - 18);
        c.quadraticCurveTo(x - 6, y - 8, x, y + 2);
        c.moveTo(x, y - 18);
        c.quadraticCurveTo(x + 6, y - 8, x, y + 2);
        c.stroke();
      }, 2.4);
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 11);
      ctx.lineTo(x - 4, y - 7);
      ctx.lineTo(x - 9, y - 7);
      ctx.moveTo(x + 7, y - 11);
      ctx.lineTo(x + 4, y - 7);
      ctx.lineTo(x + 9, y - 7);
      ctx.fill();
      ctx.fillRect(x - 6, y - 4, 12, 2.5);
      ctx.strokeStyle = A.INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y - 17);
      ctx.lineTo(x + 2, y - 23);
      ctx.stroke();
    }
    drawLibrarian(ctx) {
      const t = this.realT;
      const alarm = this.events.some((e) => e.type === 'alarm' && !e.resolved);
      A.person(ctx, 985, 612, MB.LIBRARIAN, { pose: this.libLineT > 0 && this.libLine === 'Shhh.' ? 'shh' : 'stand', face: 'down', t, emo: alarm ? 'shock' : this.libLineT > 0 ? 'happy' : 'neutral', scale: 1.05, noShadow: true });
    }
    drawLighting(ctx) {
      const p = this.player;
      const flick = this.flicker > 0 && Math.random() < 0.5;
      const lit = !this.dark && !flick;
      const occ = Wd.seats.map((seat) => (seat === Wd.playerSeat || this.students.some((s) => s.seat === seat) ? 1 : 0)).join('');
      const key = lit + '|' + occ;
      this.lightCache = this.lightCache || {};
      if (!this.lightCache[key]) {
        const L = [];
        if (lit) {
          for (const t of Wd.tables) L.push({ x: t.x + t.w / 2, y: t.y - t.h + 14, r: 230, c: 'rgba(255,184,100,0.55)', glow: 'rgba(255,190,120,0.2)' });
          for (const x of [180, 640, 1100]) L.push({ x, y: 430, r: 420, c: 'rgba(255,225,190,0.32)' });
          L.push({ x: 1206, y: 170, r: 160, c: 'rgba(255,120,130,0.5)', glow: 'rgba(255,120,130,0.16)' });
          L.push({ x: 985, y: 600, r: 200, c: 'rgba(255,214,150,0.4)' });
          L.push({ x: 165, y: 560, r: 200, c: 'rgba(255,200,160,0.3)' });
        }
        Wd.seats.forEach((seat, i) => {
          if (occ[i] === '1') L.push({ x: seat.x, y: seat.y - 26, r: 85, c: 'rgba(140,195,255,0.6)', glow: 'rgba(150,200,255,0.12)' });
        });
        const moon = this.def.halloween ? 'rgba(255,150,80,0.22)' : 'rgba(130,150,240,0.24)';
        for (let i = 0; i < 4; i++) L.push({ x: 380 + i * 170, y: 190, r: 170, c: moon });
        L.push({ x: 660, y: 718, r: 110, c: 'rgba(90,255,140,0.35)', glow: 'rgba(90,255,140,0.12)' });
        if (this.def.halloween) for (const t of Wd.tables) L.push({ x: t.x + 18, y: t.y - t.h + 30, r: 60, c: 'rgba(255,150,60,0.55)', glow: 'rgba(255,150,60,0.15)' });
        this.lightCache[key] = Wd.bakeLights(L);
      }
      const dyn = [];
      if (this.dark) {
        const a = p.seated ? Math.PI / 2 : p.face === 'up' ? -Math.PI / 2 : p.face === 'down' ? Math.PI / 2 : p.dir > 0 ? 0 : Math.PI;
        dyn.push({ x: p.x, y: p.y - 30, r: 340, c: 'rgba(255,240,200,0.95)', cone: { a, w: 0.55 } });
        dyn.push({ x: p.x, y: p.y - 30, r: 90, c: 'rgba(255,240,200,0.6)' });
      }
      for (const ev of this.events) ev.lights(dyn, this);
      let amb;
      if (this.dark) amb = 'rgb(34,30,58)';
      else {
        const k = this.p01;
        const a = this.def.halloween ? [200, 178, 196] : [208, 194, 206];
        const b = this.def.halloween ? [150, 130, 170] : [164, 152, 188];
        amb = `rgb(${U.lerp(a[0], b[0], k) | 0},${U.lerp(a[1], b[1], k) | 0},${U.lerp(a[2], b[2], k) | 0})`;
      }
      Wd.renderLights(ctx, this.lightCache[key], dyn, amb);
    }
  }
  MB.Night = Night;
  MB.seenEvents = new Set(U.store.get('seen', []));
})(window.MB);
