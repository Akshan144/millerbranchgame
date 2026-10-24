'use strict';
// Story mode: character voices, scripted scenes, and the cutscene player.
(function (MB) {
  const U = MB.U, A = MB.A, Wd = MB.World, FX = MB.FX, Au = MB.Audio, In = MB.Input;
  const W = MB.W, H = MB.H;

  // --- voices ---------------------------------------------------------------------------------
  MB.VOICE = {
    max: {
      color: '#4a7fd1',
      study: ['the femur is the longest bone. focus.', 'why duke? basketball. and medicine.', 'my pulse is 110. normal for essays.', 'diagnosis: essay-induced fatigue', 'is "i like hospitals" a hook', 'stethoscope says this intro has no heartbeat'],
      distracted: ['just checking duke basketball scores', 'one more anatomy tiktok', 'brb, taking my own blood pressure'],
      back: ["doctor's orders. back to work.", 'ok. scrubbing back in.'],
      submit: ["DUKE, I'M COMING", 'submitted! someone check my vitals', 'code blue... i mean code DONE'],
      away: 'at his hospital volunteer shift',
      awayJoke: 'He is holding clipboards. For science.',
      arrive: 'Sorry! The hospital ran late. I held a clipboard for six hours. I am basically a surgeon now.',
      n1: 'Five nights until early decision. I have done the math, and the math says panic.',
      n2: 'Duke asked "Why Duke?" I wrote "basketball" and then stared into the void.',
      n3: 'Medically speaking, we are all running on fumes and vending machine pretzels.',
      n4: '"Volunteered at a hospital, saved lives (emotionally)." Fifty characters. Nailed it.',
      n5: 'I am a doctor for Halloween. It is called method acting. For Duke.',
      dd: { ACCEPTED: 'DUKE! I am going to be a doctor! ...I should go to sleep.', WAITLISTED: 'Waitlisted. Prognosis: still optimistic.', DEFERRED: 'Deferred. Regular Decision, I am scrubbing in.' },
    },
    akshan: {
      color: '#c94f3d',
      study: ['per my analysis, this essay is undervalued', "yale's acceptance rate is a supply problem", 'in this economy?', 'i yield my time to my thesaurus', 'drafting a bipartisan intro paragraph', 'motion to delete this sentence. passed.'],
      distracted: ['just checking the bond market', 'watching a senate hearing. for fun.', 'one quick c-span clip'],
      back: ['motion to refocus. seconded.', 'the gentleman returns to his seat.'],
      submit: ['YALE. THE MOTION CARRIES.', 'submitted! i thank the committee', 'the market has spoken'],
      away: 'at a Model UN conference',
      awayJoke: 'He is representing Luxembourg. Passionately.',
      arrive: 'I return. Luxembourg won Best Delegation. I am not allowed to talk about it. (Luxembourg won.)',
      n1: 'I have drafted a bipartisan study framework. Snacks are allocated by need.',
      n2: 'Yale asked what class I would teach. "Microeconomics of Group Projects: Who Actually Did the Work."',
      n3: 'The Roomba. The pigeons. The Wi-Fi. I am calling for an independent investigation.',
      n4: 'I founded three clubs and I get 150 characters for each. That is a policy failure.',
      n5: 'I am dressed as a senator. Yes, it is the same suit. I added a lanyard.',
      dd: { ACCEPTED: 'Yale! I would like to thank the committee, my family, and Luxembourg.', WAITLISTED: 'Waitlisted. I will be filing a strongly worded appeal.', DEFERRED: 'Deferred. A temporary setback in a long-term strategy.' },
    },
    rishit: {
      color: '#3f8f5e',
      study: ['this printer is killing a forest', 'gerald (the plant) believes in me', 'columbia or bust', 'if i mention composting twice is that a theme', 'my intro is about the chesapeake bay', 'drafting... sustainably'],
      distracted: ['just signing one petition', 'reading about bike lanes. for research.', 'checking the air quality index'],
      back: ['okay. saving the planet one paragraph at a time.', 'back. gerald is watching.'],
      submit: ["COLUMBIA, LET'S GO", 'submitted! zero paper used', 'gerald, we did it'],
      away: 'testifying at a county council meeting about composting',
      awayJoke: 'He said the vote is "too important for essays."',
      arrive: 'The county voted YES on composting. I am drunk on democracy. Also I biked here in the rain.',
      n1: 'I reserved our table, I watered Gerald, and I am begging you: nobody print anything.',
      n2: 'Someone printed forty pages for a 650-word essay. I am not saying who. (The printer. It printed itself.)',
      n3: 'I biked through a rainstorm to get here. Columbia had better appreciate my emissions.',
      n4: 'Is "named the library plant Gerald and kept it alive" an activity? Because it should be.',
      n5: 'I am a tree. An oak, specifically. It is a statement.',
      dd: { ACCEPTED: 'Columbia! Gerald, we did it!', WAITLISTED: 'Waitlisted. I will plant a tree about it.', DEFERRED: 'Deferred. Regrowing, like a forest after a fire.' },
    },
    bryan: {
      color: '#e0702e',
      study: ['if i automate this essay is that cheating', "princeton has a great makerspace. that's my whole essay.", '*cracks open energy drink*', 'debugging my intro paragraph', 'this sentence has a memory leak', 'my essay compiles but nobody can read it'],
      distracted: ['one more youtube teardown video', 're-soldering my headphones real quick', "checking my robot's battery level"],
      back: ['recompiling. focus mode engaged.', 'okay okay. back to the code. the essay.'],
      submit: ['PRINCETON: DEPLOYED', 'submitted! shipping to production', 'it compiled. it SUBMITTED.'],
      away: 'at robotics build night',
      awayJoke: 'He promised the robot is "mostly not on fire."',
      arrive: 'Robot is fine. The gym is... less fine. Also I may have "upgraded" the library Roomba for a demo. Unrelated.',
      n1: '*crack* First energy drink of the night. Let us engineer some essays.',
      n2: 'Princeton wants a "meaningful object." I wrote about my calculator. It has been through a lot.',
      n3: 'Quick confession: I may have flashed new firmware onto the library Roomba. For science.',
      n4: '"Robotics: built a robot, robot built character." Forty-nine characters. Efficient.',
      n5: 'I am a robot. It is a box. I am an engineer, so the LEDs actually work.',
      dd: { ACCEPTED: 'Princeton! Time to build something unreasonable.', WAITLISTED: 'Waitlisted. Iterating on the prototype.', DEFERRED: 'Deferred. Patch notes coming in Regular Decision.' },
    },
  };
  // pick a voiced line for a character when one exists, else a generic one
  MB.line = function (id, key) {
    const v = MB.VOICE[id];
    if (v && v[key] && Math.random() < 0.65) return U.pick(v[key]);
    return U.pick(MB.LINES[key]);
  };

  // --- scripts ----------------------------------------------------------------------------------
  const nameOf = (id) => (MB.CHARACTERS.find((c) => c.id === id) || {}).name || id;
  const SLOTS = [[470, 600], [580, 612], [700, 612], [810, 600]];
  const LAWN = [[250, 640], [380, 648], [510, 648], [640, 640]];
  function roles(run) {
    const P = run.ch.id;
    const F = run.friends.map((f) => f.id);
    return { P, F1: F[0], F2: F[1], A: F[2], all: [P, F[0], F[1], F[2]] };
  }
  const V = (id, k) => MB.VOICE[id][k];

  MB.STORY = {
    prologue(run) {
      const r = roles(run);
      const cast = {};
      r.all.forEach((id, i) => (cast[id] = [LAWN[i][0], LAWN[i][1], 'down']));
      return { place: 'outside', steps: [
        ['title', 'SUNDAY, OCTOBER 26', 'Five nights before the November 1 deadline'],
        ['cast', cast],
        ['say', 'max', 'Okay. Early applications are due Saturday. Five nights. We lock in. Every night. Here.'],
        ['say', 'akshan', 'Why the library? My house has Wi-Fi.'],
        ['say', 'rishit', 'Your house has your mom asking about your essay every eleven minutes.'],
        ['say', 'akshan', '...The library it is.'],
        ['sfx', 'pop'],
        ['say', 'bryan', '*crack* I brought energy drinks. Four. Per person.'],
        ['say', 'max', 'As a future doctor, that is a cardiac event. ...I will take two.'],
        ['say', r.A, 'Heads up: I am out the first two nights. I am ' + V(r.A, 'away') + '.'],
        ['emo', r.P, 'shock'],
        ['say', r.P, 'TRAITOR.'],
        ['say', r.A, 'I will be back Wednesday. Save my seat.', 'happy'],
        ['fx', 'ghostwin'],
        ['music', 'mystery'],
        ['wait', 1.4],
        ['emo', 'all', 'shock'],
        ['say', 'bryan', 'Did that window just... wave at us?', 'shock'],
        ['say', 'rishit', 'Probably a very motivated cloud.'],
        ['say', 'max', 'Classic sleep-deprivation hallucination. Totally normal.'],
        ['emo', 'all', 'neutral'],
        ['say', 'akshan', 'Gentlemen. To the library.', 'focus'],
        ['music', 'story'],
        ['walkall', 900, 640],
        ['wait', 1.2],
      ] };
    },
    night(run, n) {
      const r = roles(run);
      const here = n <= 2 ? [r.P, r.F1, r.F2] : r.all;
      const cast = {};
      here.forEach((id, i) => (cast[id] = [SLOTS[i][0], SLOTS[i][1], 'down']));
      const intro = (key) => here.map((id) => ['say', id, V(id, key)]);
      const def = MB.nightDef(run);
      const head = ['title', 'NIGHT ' + n + ' · ' + def.day + ', ' + def.date.replace('OCT', 'OCTOBER'), '“' + def.title + '”'];
      if (n === 1) {
        const enter = {};
        here.forEach((id, i) => (enter[id] = [620 + i * 30, 770, 'up']));
        return { place: 'library', steps: [
          head,
          ['cast', enter],
          ...here.map((id, i) => ['walk', id, SLOTS[i][0], SLOTS[i][1], i === here.length - 1]),
          ['face', 'all', 'down'],
          ['say', 'okafor', 'Evening, dears. The library closes at midnight. Your applications, I hear, close Saturday.'],
          ...intro('n1'),
          ['say', r.F1, 'No ' + nameOf(r.A) + ' tonight?'],
          ['say', r.F2, nameOf(r.A) + ' is ' + V(r.A, 'away') + '. ' + V(r.A, 'awayJoke')],
          ['sfx', 'honk'],
          ['fx', 'shake'],
          ['emo', 'all', 'shock'],
          ['say', r.P, '...Was that a Roomba? Honking?', 'shock'],
          ['say', 'okafor', 'Ignore the Roomba. It has been... spirited lately.'],
          ['emo', 'all', 'neutral'],
          ['say', 'okafor', 'Laptops open. Phones in jail if they misbehave.'],
        ] };
      }
      if (n === 2) {
        return { place: 'library', steps: [
          head,
          ['cast', cast],
          ...intro('n2'),
          ['say', 'okafor', 'Also, the Wi-Fi has been temperamental tonight. Like my cat.'],
          ['fx', 'flicker'],
          ['music', 'mystery'],
          ['sfx', 'ghost'],
          ['wait', 0.9],
          ['emo', 'all', 'shock'],
          ['say', r.F2, 'Did anyone else just feel a cold spot?', 'shock'],
          ['say', r.F1, 'It is the air conditioning. Libraries are always cold. It is in the bylaws.'],
          ['emo', 'all', 'neutral'],
          ['say', r.P, 'Okay. Supplements. Nobody look at the windows.'],
          ['music', 'story'],
        ] };
      }
      if (n === 3) {
        const three = {};
        [r.P, r.F1, r.F2].forEach((id, i) => (three[id] = [SLOTS[i][0], SLOTS[i][1], 'down']));
        three[r.A] = [660, 770, 'up'];
        return { place: 'library', steps: [
          head,
          ['cast', three],
          ['sfx', 'whoosh'],
          ['walk', r.A, SLOTS[3][0], SLOTS[3][1], true],
          ['face', r.A, 'down'],
          ['say', r.A, V(r.A, 'arrive'), 'happy'],
          ['say', r.P, 'You made it! Your seat is exactly where you left it.', 'happy'],
          ['say', 'okafor', 'And it is raining, so the ceiling is dripping. We have buckets. The building has character.'],
          ['say', 'rishit', V('rishit', 'n3')],
          ['say', 'akshan', V('akshan', 'n3')],
          ['say', 'bryan', V('bryan', 'n3')],
          ['emo', 'all', 'angry'],
          ['say', 'max', 'BRYAN.', 'angry'],
          ['emo', 'all', 'neutral'],
          ['say', 'max', V('max', 'n3')],
          ['music', 'mystery'],
          ['say', 'okafor', 'It is not just the Roomba, dears. This library is not cursed. It is haunted. Different paperwork.'],
          ['emo', 'all', 'shock'],
          ['fx', 'shake'],
          ['say', r.P, 'I am sorry, it is WHAT?', 'shock'],
          ['music', 'story'],
          ['say', 'okafor', 'Kidding. Mostly. "Why Us?" essays, please.'],
        ] };
      }
      if (n === 4) {
        return { place: 'library', steps: [
          head,
          ['cast', cast],
          ['say', 'okafor', 'The Activities List, dears. 150 characters per activity. Make every one count.'],
          ...intro('n4'),
          ['music', 'mystery'],
          ['ghost', 1180, 380, 0],
          ['ghostto', 1050, 380, 0.75],
          ['sfx', 'ghost'],
          ['wait', 1.4],
          ['emo', 'all', 'shock'],
          ['say', r.F1, '...Did that book just put itself back on the shelf?', 'shock'],
          ['ghostto', 1180, 380, 0],
          ['wait', 0.8],
          ['say', 'okafor', 'That is just Dewey. He is harmless. Very organized.'],
          ['say', r.F2, 'WHO IS DEWEY?', 'shock'],
          ['emo', 'all', 'neutral'],
          ['music', 'story'],
          ['say', 'okafor', 'Fog is rolling in. The power gets moody when it is foggy. Write fast.'],
        ] };
      }
      // night 5 · Halloween
      return { place: 'library', costume: true, steps: [
        head,
        ['cast', cast],
        ...intro('n5'),
        ['say', 'okafor', 'Happy Halloween. Deadline is midnight. Dewey is... restless.'],
        ['fx', 'dark'],
        ['music', 'mystery'],
        ['sfx', 'ghost'],
        ['ghost', 640, 470, 0],
        ['ghostto', 640, 470, 0.9],
        ['wait', 1],
        ['emo', 'all', 'shock'],
        ['say', 'ghost', 'Ooooooo... SUBMIT... your... APPLICATIONS...'],
        ['say', 'bryan', 'Is the ghost... giving us advice?', 'shock'],
        ['say', 'ghost', 'I am Dewey. I was a senior here in 1987. I never submitted my application.'],
        ['say', 'max', 'What happened?', 'sad'],
        ['say', 'ghost', 'The fax machine jammed. I have haunted every deadline season since.'],
        ['say', 'rishit', 'That is the saddest thing I have ever heard.', 'sad'],
        ['say', 'ghost', 'Also, I will be haunting you a little tonight. It is tradition. And Halloween.'],
        ['ghostto', 640, 470, 0],
        ['fx', 'light'],
        ['emo', 'all', 'neutral'],
        ['music', 'triumph'],
        ['say', 'akshan', 'Colleagues. Whatever happens tonight: we all hit submit.', 'focus'],
        ['say', r.P, 'Everybody hits submit. Let us go.', 'focus'],
      ] };
    },
    finale(run) {
      const r = roles(run);
      const cast = {};
      r.all.forEach((id, i) => (cast[id] = [SLOTS[i][0], SLOTS[i][1], 'down']));
      return { place: 'library', costume: true, late: true, steps: [
        ['title', '12:01 AM · NOVEMBER 1', 'The deadline has passed'],
        ['cast', cast],
        ['say', r.P, 'Did we... actually do it?'],
        ['fx', 'confetti'],
        ['music', 'triumph'],
        ['emo', 'all', 'happy'],
        ['pose', 'all', 'cheer'],
        ['sfx', 'fanfare'],
        ['say', 'max', 'Pulse check: everybody is alive. Mostly.', 'happy'],
        ['pose', 'all', 'stand'],
        ['music', 'mystery'],
        ['ghost', 640, 470, 0],
        ['ghostto', 640, 470, 0.85],
        ['sfx', 'ghost'],
        ['say', 'ghost', 'You did it. All of you. I have never seen a study group like it.'],
        ['say', 'akshan', 'Dewey... which school did you apply to?'],
        ['say', 'ghost', 'Yale. Class of 1992. It would have been.'],
        ['say', 'bryan', 'A jammed fax machine, you said? ...Hold my energy drink. I can fix a fax machine.', 'focus'],
        ['walk', 'bryan', 973, 268, true],
        ['face', 'bryan', 'up'],
        ['fx', 'sparks'],
        ['sfx', 'thunk'],
        ['wait', 0.6],
        ['fx', 'sparks'],
        ['sfx', 'printer'],
        ['wait', 0.8],
        ['face', 'bryan', 'down'],
        ['say', 'bryan', 'Fixed. It is sending.', 'happy'],
        ['fx', 'golden'],
        ['music', 'triumph'],
        ['sfx', 'submit'],
        ['say', 'ghost', 'It is... sending? IT IS SENDING!'],
        ['say', 'rishit', 'Quick question: do ghosts get financial aid?'],
        ['say', 'ghost', 'Thank you, Miller Branch study group. The library is yours now.'],
        ['fx', 'sparkle'],
        ['ghostto', 640, 380, 0],
        ['wait', 1],
        ['say', 'okafor', 'Well. That is one way to clear a haunting.'],
        ['say', 'okafor', 'Now go home, dears. Decisions come out December 15th. The library is closed.'],
      ] };
    },
  };

  // --- cutscene player ---------------------------------------------------------------------------
  const PLACE_LIGHTS = {};
  function bakedLights(dark) {
    const key = dark ? 'dark' : 'lit';
    if (PLACE_LIGHTS[key]) return PLACE_LIGHTS[key];
    const L = [];
    if (!dark) {
      for (const t of Wd.tables) L.push({ x: t.x + t.w / 2, y: t.y - t.h + 14, r: 230, c: 'rgba(255,184,100,0.55)', glow: 'rgba(255,190,120,0.2)' });
      for (const x of [180, 640, 1100]) L.push({ x, y: 430, r: 420, c: 'rgba(255,225,190,0.36)' });
      L.push({ x: 1206, y: 170, r: 160, c: 'rgba(255,120,130,0.5)', glow: 'rgba(255,120,130,0.16)' });
      L.push({ x: 985, y: 600, r: 220, c: 'rgba(255,214,150,0.45)' });
      L.push({ x: 640, y: 600, r: 300, c: 'rgba(255,214,170,0.35)' });
    }
    for (let i = 0; i < 4; i++) L.push({ x: 380 + i * 170, y: 190, r: 170, c: 'rgba(130,150,240,0.24)' });
    L.push({ x: 660, y: 718, r: 110, c: 'rgba(90,255,140,0.35)', glow: 'rgba(90,255,140,0.12)' });
    PLACE_LIGHTS[key] = Wd.bakeLights(L);
    return PLACE_LIGHTS[key];
  }

  class Cutscene {
    constructor(script, opts) {
      this.name = 'cutscene';
      this.steps = script.steps;
      this.place = script.place;
      this.costume = !!script.costume;
      this.after = opts.after;
      this.run = opts.run;
      this.def = opts.def || MB.NIGHTS[0];
      this.p01 = script.late ? 1 : 0.02;
      this.i = -1;
      this.t = 0;
      this.actors = {};
      this.dlg = null;
      this.box = 0;
      this.shakeAmt = 0;
      this.flick = 0;
      this.dark = false;
      this.titleCard = null;
      this.waitT = 0;
      this.ghost = null;
      FX.clear();
      Au.Music.set({ song: script.music || 'story', intensity: 1, crunch: 0 });
      this.next();
    }
    look(id) {
      if (id === 'okafor') return MB.LIBRARIAN;
      const ch = MB.CHARACTERS.find((c) => c.id === id);
      if (!ch) return null;
      return this.costume ? Object.assign({}, ch.look, MB.COSTUMES[id]) : ch.look;
    }
    who(id) {
      if (id === 'all') return Object.values(this.actors).filter((a) => a.id !== 'okafor');
      return this.actors[id] ? [this.actors[id]] : [];
    }
    next() {
      for (;;) {
        this.i++;
        const s = this.steps[this.i];
        if (!s) return this.finish();
        if (this.apply(s)) return; // blocking step
      }
    }
    // returns true if the step blocks until done
    apply(s) {
      const [op, a, b, c, d] = s;
      switch (op) {
        case 'title':
          this.titleCard = { text: a, sub: b, t: 0 };
          Au.play('whoosh');
          return true;
        case 'cast':
          for (const id in a) {
            const [x, y, face] = a[id];
            this.actors[id] = { id, x, y, face: face || 'down', dir: 1, emo: 'neutral', pose: 'stand', path: [], t: Math.random() * 3, look: this.look(id) };
          }
          return false;
        case 'say':
          this.dlg = { id: a, text: b, n: 0, emo: c || 'happy' };
          for (const act of this.who(a)) act.emo = c || act.emo;
          return true;
        case 'emo':
          for (const act of this.who(a)) act.emo = b;
          return false;
        case 'pose':
          for (const act of this.who(a)) act.pose = b;
          return false;
        case 'face':
          for (const act of this.who(a)) act.face = b;
          return false;
        case 'walk': {
          const act = this.actors[a];
          if (act) act.path = Wd.findPath(act.x, act.y, b, c);
          if (d) {
            this.waitFor = act;
            return true;
          }
          return false;
        }
        case 'walkall':
          for (const act of this.who('all')) act.path = [{ x: a + U.rand(-40, 40), y: b + U.rand(-20, 20) }];
          return false;
        case 'wait':
          this.waitT = a;
          return true;
        case 'sfx':
          Au.play(a);
          return false;
        case 'music':
          Au.Music.set({ song: a });
          return false;
        case 'ghost':
          this.ghost = { x: a, y: b, alpha: c, tx: a, ty: b, ta: c, golden: false };
          return false;
        case 'ghostto':
          if (this.ghost) Object.assign(this.ghost, { tx: a, ty: b, ta: c });
          return false;
        case 'fx':
          this.fx(a);
          return false;
      }
      return false;
    }
    fx(name) {
      if (name === 'shake') this.shakeAmt = 9;
      else if (name === 'flicker') this.flick = 0.9;
      else if (name === 'dark') {
        this.dark = true;
        Au.play('powerdown');
      } else if (name === 'light') {
        this.dark = false;
        this.flick = 0.5;
        Au.play('powerup');
      } else if (name === 'confetti') for (let i = 0; i < 5; i++) FX.confetti(260 + i * 190, 720, 45, 1.3);
      else if (name === 'sparks') FX.sparks(973, 220, 16);
      else if (name === 'golden' && this.ghost) {
        this.ghost.golden = true;
        FX.sparks(this.ghost.x, this.ghost.y - 30, 24, '#ffe08a');
      } else if (name === 'sparkle' && this.ghost) {
        for (let i = 0; i < 3; i++) FX.sparks(this.ghost.x + U.rand(-30, 30), this.ghost.y - 30 + U.rand(-30, 30), 14, '#fff3c4');
        Au.play('sparkle');
      } else if (name === 'ghostwin') {
        this.winGhost = 0;
        Au.play('ghost');
      }
    }
    finish() {
      if (this.done) return;
      this.done = true;
      this.after();
    }
    update(dt) {
      this.t += dt;
      FX.update(dt);
      if (In.hit('mute')) Au.toggleMute();
      if (In.pressed.has('Escape') || In.pressed.has('Tab')) {
        Au.play('back');
        return this.finish();
      }
      this.box = U.approach(this.box, 1, dt * 3);
      this.shakeAmt = Math.max(0, this.shakeAmt - dt * 25);
      if (this.flick > 0) this.flick -= dt;
      if (this.winGhost != null) this.winGhost += dt;
      const gh = this.ghost;
      if (gh) {
        gh.x = U.approach(gh.x, gh.tx, dt * 160);
        gh.y = U.approach(gh.y, gh.ty, dt * 160);
        gh.alpha = U.approach(gh.alpha, gh.ta, dt * 1.2);
      }
      for (const act of Object.values(this.actors)) {
        act.t += dt;
        act.moving = false;
        if (act.path && act.path.length) {
          const p = act.path[0];
          const dx = p.x - act.x, dy = p.y - act.y, dd = Math.hypot(dx, dy);
          const st = 150 * dt;
          if (dd <= st) {
            act.x = p.x;
            act.y = p.y;
            act.path.shift();
          } else {
            act.x += (dx / dd) * st;
            act.y += (dy / dd) * st;
          }
          act.moving = true;
          if (Math.abs(dy) > Math.abs(dx)) act.face = dy < 0 ? 'up' : 'down';
          else {
            act.face = 'side';
            act.dir = dx < 0 ? -1 : 1;
          }
        }
      }
      const s = this.steps[this.i];
      if (!s) return;
      const adv = In.hit('act') || In.mouse.clicked;
      switch (s[0]) {
        case 'title':
          this.titleCard.t += dt;
          if (this.titleCard.t > 2.6 || (adv && this.titleCard.t > 0.4)) {
            this.titleCard = null;
            this.next();
          }
          break;
        case 'say': {
          const d = this.dlg;
          const before = Math.floor(d.n);
          d.n = Math.min(d.text.length, d.n + dt * 62);
          if (Math.floor(d.n / 4) !== Math.floor(before / 4) && d.n < d.text.length) Au.play(d.id === 'ghost' ? 'flap' : 'talk', null, 0.07);
          if (adv) {
            if (d.n < d.text.length) d.n = d.text.length;
            else {
              this.dlg = null;
              Au.play('blip');
              this.next();
            }
          }
          break;
        }
        case 'walk':
          if (!this.waitFor || !this.waitFor.path.length || adv) {
            if (adv && this.waitFor) {
              const last = this.waitFor.path[this.waitFor.path.length - 1];
              if (last) {
                this.waitFor.x = last.x;
                this.waitFor.y = last.y;
              }
              this.waitFor.path = [];
            }
            this.waitFor = null;
            this.next();
          }
          break;
        case 'wait':
          this.waitT -= dt;
          if (this.waitT <= 0 || adv) this.next();
          break;
      }
    }

    // --- drawing --------------------------------------------------------------------------------
    drawActor(ctx, act, scale) {
      const speaking = this.dlg && this.dlg.id === act.id && this.dlg.n < this.dlg.text.length;
      const emo = speaking ? (Math.sin(this.t * 18) > 0 ? act.emo : 'neutral') : act.emo;
      const bob = speaking ? -Math.abs(Math.sin(this.t * 9)) * 3 : 0;
      A.person(ctx, act.x, act.y + bob, act.look, { pose: act.moving ? 'walk' : act.pose, face: act.face, dir: act.dir, t: act.t, emo, moving: act.moving, scale });
    }
    drawLibrary(ctx) {
      Wd.drawSky(ctx, this.p01, this.def, this.t);
      ctx.drawImage(Wd.bg[A.boil % Wd.bg.length], 0, 0, W, H);
      Wd.drawClockHands(ctx, this.p01 * 180 + (this.p01 >= 1 ? 1 : 0));
      const list = [];
      for (const pr of Wd.props) list.push({ y: pr.sortY, fn: (c) => Wd.drawSprite(c, pr.o.spr, pr.o.x, pr.o.y) });
      for (const t of Wd.tables) list.push({ y: t.y + t.d, fn: (c) => { Wd.drawSprite(c, t.spr, t.x, t.y); A.lamp(c, t.x + t.w / 2, t.y - t.h + 30, !this.dark, t.x); } });
      for (const seat of Wd.seats) {
        list.push({ y: seat.table.y - 1.5, fn: (c) => { A.shape(c, () => A.rr(c, seat.x - 17, seat.y - 54, 34, 44, 9, seat.x), seat === Wd.playerSeat ? '#7b4a8c' : A.C.chair, null); } });
      }
      if (!this.actors.okafor) list.push({ y: 612, fn: (c) => A.person(c, 985, 612, MB.LIBRARIAN, { pose: 'stand', t: this.t, emo: this.dlg && this.dlg.id === 'okafor' && Math.sin(this.t * 18) > 0 ? 'happy' : 'neutral', scale: 1.05, noShadow: true }) });
      for (const act of Object.values(this.actors)) list.push({ y: act.y, fn: (c) => this.drawActor(c, act, 1.12) });
      list.sort((p, q) => p.y - q.y);
      for (const it of list) it.fn(ctx);
      this.drawGhost(ctx, 1);
      FX.draw(ctx, 'top');
      const flick = this.flick > 0 && Math.random() < 0.5;
      const dark = this.dark || flick;
      const dyn = [];
      if (this.ghost && this.ghost.alpha > 0.05) dyn.push({ x: this.ghost.x, y: this.ghost.y - 40, r: 200, c: this.ghost.golden ? `rgba(255,214,120,${0.7 * this.ghost.alpha})` : `rgba(190,170,255,${0.6 * this.ghost.alpha})`, glow: this.ghost.golden ? 'rgba(255,214,120,0.3)' : 'rgba(200,180,255,0.25)' });
      const k = this.p01;
      const amb = dark ? 'rgb(40,34,66)' : `rgb(${U.lerp(212, 170, k) | 0},${U.lerp(198, 158, k) | 0},${U.lerp(208, 192, k) | 0})`;
      Wd.renderLights(ctx, bakedLights(dark), dyn, amb);
    }
    drawGhost(ctx, scale) {
      const g = this.ghost;
      if (!g || g.alpha <= 0.02) return;
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.scale(scale, scale);
      if (g.golden) {
        const gr = ctx.createRadialGradient(0, -40, 5, 0, -40, 90);
        gr.addColorStop(0, `rgba(255,224,138,${0.6 * g.alpha})`);
        gr.addColorStop(1, 'rgba(255,224,138,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(-90, -130, 180, 180);
      }
      A.ghost(ctx, 0, -10, this.t, g.alpha, false);
      ctx.restore();
    }
    drawOutside(ctx) {
      MB.Screens.drawBackdrop(ctx, this.t, 0.05);
      if (this.winGhost != null && this.winGhost < 3) {
        const k = this.winGhost / 3;
        const a = Math.sin(k * Math.PI) * 0.8;
        A.ghost(ctx, 640 + k * 120, 520, this.t, a * 0.7, false);
      }
      const list = Object.values(this.actors).sort((p, q) => p.y - q.y);
      for (const act of list) this.drawActor(ctx, act, 1.55);
      FX.draw(ctx, 'top');
    }
    draw(ctx) {
      ctx.save();
      if (this.shakeAmt > 0.2 && MB.settings.shake) ctx.translate(U.rand(-this.shakeAmt, this.shakeAmt), U.rand(-this.shakeAmt, this.shakeAmt));
      if (this.place === 'outside') this.drawOutside(ctx);
      else this.drawLibrary(ctx);
      Wd.drawPost(ctx, 0.5);
      ctx.restore();
      // letterbox
      const bh = 48 * U.ease.outCubic(this.box);
      ctx.fillStyle = '#0d0814';
      ctx.fillRect(0, 0, W, bh);
      ctx.fillRect(0, H - bh, W, bh);
      A.text(ctx, 'ESC: skip scene', W - 20, 24, { size: 14, font: A.F.hand, color: '#a094a8', outline: 0, align: 'right' });
      if (this.titleCard) this.drawTitle(ctx);
      if (this.dlg) this.drawDialogue(ctx);
    }
    drawTitle(ctx) {
      const tc = this.titleCard;
      const k = U.clamp(tc.t / 0.4, 0, 1) * U.clamp((2.6 - tc.t) / 0.4, 0, 1);
      ctx.save();
      ctx.globalAlpha = k;
      ctx.fillStyle = 'rgba(13,8,20,0.55)';
      ctx.fillRect(0, H / 2 - 80, W, 160);
      A.text(ctx, tc.text, W / 2, H / 2 - 18, { size: 50, color: '#ffe08a', outline: 9, shadow: 5 });
      A.text(ctx, tc.sub, W / 2, H / 2 + 34, { size: 30, font: A.F.script, color: '#fff6e6', outline: 5 });
      ctx.restore();
    }
    drawDialogue(ctx) {
      const d = this.dlg;
      const id = d.id;
      const bx = 250, by = 62, bw = 880, bh = 150;
      A.rr(ctx, bx + 4, by + 6, bw, bh, 14, 520, 0.5);
      A.fs(ctx, 'rgba(10,5,20,0.5)', 0);
      A.rr(ctx, bx, by, bw, bh, 14, 521, 0.5);
      A.fs(ctx, '#fff8ec', 3.5);
      const col = id === 'okafor' ? '#7b4a8c' : id === 'ghost' ? '#8a6fd0' : (MB.VOICE[id] || {}).color || '#c94f3d';
      // portrait
      const px = bx - 76, py = by + bh / 2;
      A.el(ctx, px, py, 70, 70, 522, 0.6, 14);
      A.fs(ctx, col, 4);
      ctx.save();
      A.el(ctx, px, py, 66, 66, 522, 0.6, 14);
      ctx.clip();
      ctx.fillStyle = A.shade(col, 0.55);
      ctx.fillRect(px - 70, py - 70, 140, 140);
      const talking = d.n < d.text.length;
      if (id === 'ghost') {
        ctx.save();
        ctx.translate(px, py + 52);
        ctx.scale(1.9, 1.9);
        A.ghost(ctx, 0, 0, this.t, 1, false);
        ctx.restore();
      } else {
        const look = this.look(id);
        if (look) A.person(ctx, px, py + 136, look, { pose: 'stand', emo: talking ? (Math.sin(this.t * 18) > 0 ? d.emo : 'neutral') : d.emo, t: this.t, scale: 2.5, noShadow: true });
      }
      ctx.restore();
      const name = id === 'okafor' ? 'MS. OKAFOR' : id === 'ghost' ? 'DEWEY' : MB.CHARACTERS.find((c) => c.id === id).name.toUpperCase();
      ctx.font = `15px ${A.F.display}`;
      const nw = ctx.measureText(name).width + 28;
      A.rr(ctx, bx + 24, by - 16, nw, 28, 8, 523, 0.4);
      A.fs(ctx, col, 2.6);
      A.text(ctx, name, bx + 24 + nw / 2, by - 1, { size: 15, color: '#fff6e6', outline: 0 });
      const youTag = this.run && this.run.ch.id === id;
      if (youTag) A.text(ctx, '(you)', bx + 32 + nw, by - 1, { size: 14, font: A.F.hand, color: '#fff6e6', outline: 4, align: 'left' });
      const shown = d.text.slice(0, Math.floor(d.n));
      ctx.font = `22px ${A.F.hand}`;
      A.wrap(ctx, shown, bw - 70).slice(0, 4).forEach((l, i) => A.text(ctx, l, bx + 36, by + 34 + i * 28, { size: 22, font: A.F.hand, color: A.INK, outline: 0, align: 'left' }));
      if (!talking && Math.sin(this.t * 6) > -0.3) A.text(ctx, MB.HUD.keyName('act') + ' ▶', bx + bw - 24, by + bh - 20, { size: 16, color: '#c94f3d', outline: 0, align: 'right' });
    }
  }
  MB.Cutscene = Cutscene;

  // helpers screens use to chain story beats
  MB.playScene = function (script, run, def, after) {
    MB.go(new Cutscene(script, { run, def, after }));
  };
})(window.MB);
