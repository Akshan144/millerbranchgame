'use strict';
// "Orientation Night": an interactive, skippable walkthrough hosted by Ms. Okafor.
(function (MB) {
  const U = MB.U, A = MB.A, Wd = MB.World, FX = MB.FX, Au = MB.Audio, In = MB.Input, HUD = MB.HUD;
  const W = MB.W, H = MB.H;

  function steps(g) {
    const f0 = g.students[0].name, f1 = g.students[1].name;
    const p = g.player;
    return [
      {
        lines: ["Welcome to the Miller Branch Library! I'm Ms. Okafor, head librarian.",
          'Your study group has college applications due November 1st. Every night this week, you study here until midnight.',
          'My job: keep this library quiet. Your job: keep your friends focused. Let’s practice.'],
      },
      {
        lines: ['First, stretch your legs. Walk to the glowing star with WASD or the arrow keys.'],
        obj: 'Walk to the star',
        start: () => (g.marker = { x: 820, y: 410 }),
        target: () => g.marker,
        done: () => U.dist(p.x, p.y, g.marker.x, g.marker.y) < 36,
      },
      {
        lines: ['Now try a DASH: tap SHIFT while moving. Fast, and it knocks things over.'],
        obj: 'Dash (SHIFT)',
        start: () => (g.didDash = false),
        done: () => g.didDash,
      },
      {
        lines: ['See the purple chair with the arrow? That’s your seat. Walk over and press SPACE to sit down.'],
        obj: 'Sit at your seat (SPACE)',
        target: () => ({ x: Wd.playerSeat.x, y: Wd.playerSeat.y - 10 }),
        done: () => p.seated,
      },
      {
        lines: ['This is your own college essay. You write it one line at a time.',
          'The admissions reader (top right) is craving a vibe: HEART, WIT or GRIT. Pick the card that matches with ← ↑ →, or click it.',
          'Grey CLASSIC cards are tired clichés. The reader hates those. Write three lines!'],
        obj: 'Write 3 essay lines',
        start: () => {
          g.essay.wantLeft = 3;
        },
        done: () => g.essay.written >= 3 && !g.essay.typing,
        seatedOk: true,
      },
      {
        lines: ['Beautiful prose. Press ↓ (or SHIFT) to stand up. I hear trouble brewing.'],
        obj: 'Stand up (↓)',
        done: () => !p.seated,
        seatedOk: true,
      },
      {
        lines: [`Oh dear. ${f0}’s phone is buzzing. See the ring by ${f0}’s name? That’s FOCUS, and it’s draining.`,
          `Walk up to ${f0} and press SPACE to confiscate that phone. Phone jail. Library law.`],
        obj: 'Confiscate the phone',
        start: () => (g.tutEv = g.forceSpawn('phone', g.students[0])),
        target: () => g.tutEv && !g.tutEv.resolved && g.tutEv.alert(),
        done: () => g.tutEv.resolved,
      },
      {
        lines: ['And here’s our speakerphone regular. Press Q to SHHH: it silences everything nearby, then needs a few seconds to recharge.'],
        obj: 'SHHH the talker (Q)',
        start: () => {
          g.tutEv = g.forceSpawn('talker');
          g.tutEv.npc.x = 640;
          g.tutEv.npc.y = 600;
          g.tutEv.pickSpot();
        },
        target: () => g.tutEv && !g.tutEv.resolved && g.tutEv.alert(),
        done: () => g.tutEv.resolved,
      },
      {
        lines: ['The Roomba is possessed again. DASH straight into it to flip it over.'],
        obj: 'Dash into the Roomba (SHIFT)',
        start: () => {
          g.tutEv = g.forceSpawn('roomba');
          g.tutEv.speed = 110;
        },
        target: () => g.tutEv && !g.tutEv.resolved && g.tutEv.alert(),
        done: () => g.tutEv.resolved,
      },
      {
        lines: [`Uh-oh, ${f1}’s focus hit zero, so off they wandered to doomscroll. That happens when noise piles up.`,
          `Walk up to ${f1} and press SPACE for a pep talk.`],
        obj: `Pep talk ${f1}`,
        start: () => {
          g.allowWander = true;
          g.students[1].focus = 0;
          g.students[1].distract();
        },
        target: () => ({ x: g.students[1].x, y: g.students[1].y - 70 }),
        done: () => g.students[1].state === 'return' || g.students[1].state === 'study',
      },
      {
        lines: ['Notice the GROOVE meter under the clock? It fills while the library is calm.',
          'When it’s full: GROOVE MODE. Everyone writes faster, nothing new goes wrong, and points double. Keep it calm and watch.'],
        obj: 'Let the Groove fill',
        start: () => {
          g.allowWander = false;
          g.tutorialNoStatus = false;
          g.groove = Math.max(g.groove, 0.6);
        },
        target: () => ({ x: 126, y: 100 }),
        done: () => g.grooveT > 0,
      },
      {
        lines: [`Look at ${f0} go! When a progress bar fills, that application is SUBMITTED.`],
        obj: `Watch ${f0} submit`,
        start: () => (g.students[0].progress = Math.max(g.students[0].progress, 90)),
        target: () => ({ x: g.students[0].seat.x, y: g.students[0].seat.y - 90 }),
        done: () => g.students[0].state === 'submitted',
      },
      {
        lines: ['Each night has a quota: the envelopes at the top. Get enough applications in before midnight.',
          'Ignore a problem and it fades eventually (see the ring around each alert), but fixing things fast builds FLOW and big points.',
          'Miss a quota and you use one of your two extensions. That’s everything, dear. Go get ’em!'],
        final: true,
      },
    ];
  }

  class Tutorial extends MB.Night {
    constructor(run, after) {
      super(run);
      this.isTutorial = true;
      this.after = after;
      this.def = Object.assign({}, MB.NIGHTS[0], { n: 0, day: 'SUNDAY', date: 'OCT 26', title: 'Orientation', task: 'Learn the ropes', intro: [] });
      this.duration = 1e9;
      Au.Music.set({ song: 'tutorial', intensity: 1, crunch: 0 });
      this.phase = 'play';
      this.libT = 1e9;
      this.wave.state = 'off';
      this.tutorialNoStatus = true;
      this.hideSeatHint = true;
      this.allowWander = false;
      this.steps = steps(this);
      this.stepIdx = -1;
      this.doneT = 0;
      this.nextStep();
    }
    updateSpawns() {}
    forceSpawn(type, target) {
      const ev = new MB.EVENTS[type].cls(this);
      if (target && ev.target && ev.target !== target) {
        if (type === 'phone') {
          ev.target.flags.phone = false;
          ev.target.bubble = null;
          target.flags.phone = true;
          target.say('wait who is texting', 1.6);
        }
        ev.target = target;
      }
      ev.noExpire = true;
      this.events.push(ev);
      this.seen.add(type);
      this.banner(Object.assign({ type }, MB.EVENTS[type]), false);
      Au.play('whoosh');
      return ev;
    }
    nextStep() {
      this.stepIdx++;
      const st = this.steps[this.stepIdx];
      if (!st) return this.finish();
      this.dlg = { lines: st.lines, idx: 0, n: 0 };
      this.doneT = 0;
      this.latched = false;
      if (st.start) st.start();
      Au.play('chat');
    }
    finish() {
      if (this.finished) return;
      this.finished = true;
      U.store.set('tutorialDone', true);
      for (const ev of this.events) ev.end(this);
      Au.play('confirm');
      this.after();
    }
    update(dt) {
      if (this.finished) return;
      if (In.hit('pause') && In.pressed.has('Escape') || In.pressed.has('Tab')) {
        Au.play('back');
        return this.finish();
      }
      const st = this.steps[this.stepIdx];
      if (this.dlg) {
        // dialogue freezes the world (animations keep going)
        this.realT += dt;
        FX.update(dt);
        for (const s of this.students) {
          s.t += dt;
          s.bubbleT -= dt;
        }
        this.player.t += dt;
        const line = this.dlg.lines[this.dlg.idx];
        const before = Math.floor(this.dlg.n);
        this.dlg.n = Math.min(line.length, this.dlg.n + dt * 70);
        if (Math.floor(this.dlg.n / 4) !== Math.floor(before / 4) && this.dlg.n < line.length) Au.play('talk', null, 0.06);
        if (In.hit('act') || In.mouse.clicked) {
          if (this.dlg.n < line.length) this.dlg.n = line.length;
          else if (this.dlg.idx < this.dlg.lines.length - 1) {
            this.dlg.idx++;
            this.dlg.n = 0;
            Au.play('blip');
          } else {
            this.dlg = null;
            Au.play('select');
            if (st.final) return this.finish();
            if (!st.done) this.nextStep();
          }
        }
        return;
      }
      this.time = 0;
      // keep the "no seat-hopping" rule simple: steps that do not involve the seat stand you up
      super.update(dt);
      this.time = 0;
      if (this.player.dashT > 0) this.didDash = true;
      if (!this.allowWander) for (const s of this.students) if (s.state === 'study') s.focus = Math.max(s.focus, 18);
      if (st && st.done && (this.latched || st.done())) {
        this.latched = true;
        this.doneT += dt;
        if (this.doneT > 0.7) {
          Au.play('ding');
          FX.pop(640, 280, 'NICE!', { size: 46, col: '#9fe08a', life: 0.9 });
          this.nextStep();
        }
      }
    }
    draw(ctx) {
      super.draw(ctx);
      const st = this.steps[this.stepIdx];
      if (!st) return;
      // target marker
      if (!this.dlg && st.target) {
        const t = st.target();
        if (t) {
          const b = Math.abs(Math.sin(this.realT * 5)) * 10;
          ctx.save();
          ctx.strokeStyle = 'rgba(255,224,138,0.9)';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 6]);
          ctx.lineDashOffset = -this.realT * 30;
          ctx.beginPath();
          ctx.arc(t.x, t.y + 10, 30 + Math.sin(this.realT * 4) * 3, 0, U.TAU);
          ctx.stroke();
          ctx.restore();
          if (this.marker && t === this.marker) A.icon(ctx, 'star', t.x, t.y - 4, 16, null);
          ctx.fillStyle = '#ffe08a';
          ctx.strokeStyle = A.INK;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(t.x - 12, t.y - 56 - b);
          ctx.lineTo(t.x + 12, t.y - 56 - b);
          ctx.lineTo(t.x, t.y - 38 - b);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
      // skip hint
      A.rr(ctx, W - 214, 118, 190, 26, 10, 300, 0.4);
      A.fs(ctx, 'rgba(43,27,51,0.75)', 2);
      A.text(ctx, 'ESC / TAB: skip tutorial', W - 119, 132, { size: 14, color: '#fff6e6', outline: 0 });
      // objective
      if (!this.dlg && st.obj) {
        const done = HUD.card(ctx, 16, 246, 250, 58, -0.02, '#fff3c4', 310);
        A.text(ctx, 'OBJECTIVE', -112, -12, { size: 13, color: '#c94f3d', outline: 0, align: 'left' });
        A.text(ctx, st.obj, -112, 10, { size: 17, font: A.F.hand, color: A.INK, outline: 0, align: 'left' });
        done();
      }
      if (this.dlg) this.drawDialogue(ctx);
    }
    drawDialogue(ctx) {
      const d = this.dlg;
      ctx.fillStyle = 'rgba(18,10,30,0.28)';
      ctx.fillRect(0, 0, W, H);
      const seated = this.player.seated;
      const bw = 640, bh = 150;
      const bx = W / 2 - bw / 2 + 60, by = seated ? 150 : H - bh - 70;
      A.rr(ctx, bx + 4, by + 6, bw, bh, 14, 320, 0.5);
      A.fs(ctx, 'rgba(10,5,20,0.5)', 0);
      A.rr(ctx, bx, by, bw, bh, 14, 321, 0.5);
      A.fs(ctx, '#fff8ec', 3.5);
      // portrait
      const px = bx - 70, py = by + bh / 2;
      A.el(ctx, px, py, 66, 66, 322, 0.6, 14);
      A.fs(ctx, '#7b4a8c', 4);
      ctx.save();
      A.el(ctx, px, py, 62, 62, 322, 0.6, 14);
      ctx.clip();
      A.person(ctx, px, py + 128, MB.LIBRARIAN, { pose: 'stand', emo: Math.floor(d.n) < d.lines[d.idx].length ? (Math.sin(this.realT * 18) > 0 ? 'happy' : 'neutral') : 'happy', t: this.realT, scale: 2.4, noShadow: true });
      ctx.restore();
      A.rr(ctx, px - 52, py + 52, 104, 24, 8, 323, 0.4);
      A.fs(ctx, '#c94f3d', 2.5);
      A.text(ctx, 'MS. OKAFOR', px, py + 65, { size: 14, color: '#fff6e6', outline: 0 });
      // text
      const line = d.lines[d.idx].slice(0, Math.floor(d.n));
      ctx.font = `21px ${A.F.hand}`;
      A.wrap(ctx, line, bw - 70).forEach((l, i) => A.text(ctx, l, bx + 40, by + 32 + i * 27, { size: 21, font: A.F.hand, color: A.INK, outline: 0, align: 'left' }));
      // pager
      A.text(ctx, d.idx + 1 + ' / ' + d.lines.length, bx + 40, by + bh - 18, { size: 13, color: '#a094a8', outline: 0, align: 'left' });
      if (d.n >= d.lines[d.idx].length && Math.sin(this.realT * 6) > -0.3) {
        A.text(ctx, HUD.keyName('act') + ' ▶', bx + bw - 24, by + bh - 20, { size: 16, color: '#c94f3d', outline: 0, align: 'right' });
      }
      A.text(ctx, 'TUTORIAL · ORIENTATION NIGHT', bx + bw - 24, by + 18, { size: 12, color: '#a094a8', outline: 0, align: 'right' });
    }
  }
  MB.Tutorial = Tutorial;
})(window.MB);
