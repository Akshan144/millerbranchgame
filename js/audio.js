'use strict';
// All sound is synthesized with WebAudio: sfx recipes + a procedural lo-fi score.
(function (MB) {
  const U = MB.U;
  const Au = (MB.Audio = {
    ctx: null,
    ready: false,
    settings: U.store.get('audio', { music: 0.55, sfx: 0.8, muted: false }),
  });

  let master, musicGain, musicFilter, musicDuck, sfxGain, comp, noiseBuf, crackleBuf, crackleSrc;
  const last = {}; // throttle per-sound

  Au.init = function () {
    if (Au.ctx) {
      if (Au.ctx.state === 'suspended') Au.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (Au.ctx = new AC());
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master = ctx.createGain();
    master.connect(comp);
    comp.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.connect(master);
    musicGain = ctx.createGain();
    musicDuck = ctx.createGain();
    musicFilter = ctx.createBiquadFilter();
    musicFilter.type = 'lowpass';
    musicFilter.frequency.value = 9000;
    musicGain.connect(musicFilter);
    musicFilter.connect(musicDuck);
    musicDuck.connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    crackleBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const c = crackleBuf.getChannelData(0);
    for (let i = 0; i < c.length; i++) {
      c[i] = (Math.random() * 2 - 1) * 0.015;
      if (Math.random() < 0.0004) c[i] = (Math.random() * 2 - 1) * 0.5;
    }
    Au.ready = true;
    Au.applySettings();
    Music.start();
  };

  Au.applySettings = function () {
    if (!Au.ctx) return;
    const s = Au.settings;
    const t = Au.ctx.currentTime;
    master.gain.setTargetAtTime(s.muted ? 0 : 0.9, t, 0.05);
    musicGain.gain.setTargetAtTime(s.music * 0.5, t, 0.05);
    sfxGain.gain.setTargetAtTime(s.sfx, t, 0.05);
    U.store.set('audio', s);
  };
  Au.toggleMute = function () {
    Au.settings.muted = !Au.settings.muted;
    Au.applySettings();
  };

  // --- primitives -------------------------------------------------------
  function env(g, t, a, peak, dur, sustain = 0) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain || 0.0001), t + a + dur);
  }
  function tone(o) {
    const ctx = Au.ctx;
    const t = o.t != null ? o.t : ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.slide || o.dur));
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain();
    env(g, t, o.a || 0.005, o.v || 0.2, o.dur);
    let node = osc;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      node.connect(f);
      node = f;
    }
    if (o.vib) {
      const l = ctx.createOscillator();
      const lg = ctx.createGain();
      l.frequency.value = o.vib;
      lg.gain.value = o.vibAmt || 10;
      l.connect(lg);
      lg.connect(osc.frequency);
      l.start(t);
      l.stop(t + o.dur + 0.1);
    }
    node.connect(g);
    g.connect(o.dest || sfxGain);
    osc.start(t);
    osc.stop(t + (o.a || 0.005) + o.dur + 0.05);
    return osc;
  }
  function noise(o) {
    const ctx = Au.ctx;
    const t = o.t != null ? o.t : ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.value = o.rate || 1;
    const f = ctx.createBiquadFilter();
    f.type = o.ft || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    env(g, t, o.a || 0.005, o.v || 0.2, o.dur);
    src.connect(f);
    f.connect(g);
    g.connect(o.dest || sfxGain);
    src.start(t, Math.random() * 1.5);
    src.stop(t + (o.a || 0.005) + o.dur + 0.05);
  }

  const R = (a, b) => U.rand(a, b);
  const SFX = {
    blip: (t) => tone({ t, type: 'square', f: 660, f2: 990, dur: 0.06, v: 0.06, lp: 3000 }),
    select: (t) => tone({ t, type: 'triangle', f: 520, f2: 700, dur: 0.07, v: 0.12 }),
    confirm: (t) => {
      tone({ t, type: 'triangle', f: 523, dur: 0.1, v: 0.14 });
      tone({ t: t + 0.07, type: 'triangle', f: 784, dur: 0.16, v: 0.14 });
    },
    back: (t) => tone({ t, type: 'triangle', f: 500, f2: 320, dur: 0.1, v: 0.12 }),
    dash: (t) => {
      noise({ t, ft: 'bandpass', f: 700, f2: 3200, q: 1.5, dur: 0.2, v: 0.35 });
      tone({ t, type: 'sine', f: 220, f2: 120, dur: 0.12, v: 0.08 });
    },
    whoosh: (t) => noise({ t, ft: 'bandpass', f: 400, f2: 2400, q: 1, dur: 0.3, v: 0.2, a: 0.05 }),
    yoink: (t) => {
      tone({ t, type: 'sine', f: 300, f2: 1400, dur: 0.16, v: 0.22 });
      tone({ t: t + 0.12, type: 'triangle', f: 1600, f2: 900, dur: 0.08, v: 0.1 });
    },
    pop: (t) => tone({ t, type: 'sine', f: R(500, 700), f2: 160, dur: 0.12, v: 0.25 }),
    thud: (t) => {
      tone({ t, type: 'sine', f: 140, f2: 45, dur: 0.25, v: 0.5 });
      noise({ t, ft: 'lowpass', f: 600, dur: 0.12, v: 0.3 });
    },
    tackle: (t) => {
      tone({ t, type: 'sine', f: 180, f2: 40, dur: 0.3, v: 0.6 });
      noise({ t, ft: 'bandpass', f: 1800, q: 0.8, dur: 0.18, v: 0.45 });
      tone({ t, type: 'square', f: 1250, f2: 900, dur: 0.12, v: 0.06 });
    },
    shh: (t) => {
      noise({ t, ft: 'highpass', f: 2600, q: 0.7, dur: 0.7, v: 0.32, a: 0.06 });
      noise({ t, ft: 'bandpass', f: 4800, q: 2, dur: 0.6, v: 0.2, a: 0.05 });
    },
    buzz: (t) => {
      for (let i = 0; i < 2; i++) tone({ t: t + i * 0.16, type: 'square', f: 145, dur: 0.11, v: 0.07, lp: 900 });
    },
    crash: (t) => {
      noise({ t, ft: 'lowpass', f: 1800, f2: 300, dur: 0.6, v: 0.55 });
      for (let i = 0; i < 6; i++) {
        tone({ t: t + i * 0.06 + R(0, 0.03), type: 'triangle', f: R(140, 260), f2: 60, dur: 0.14, v: 0.35 });
        noise({ t: t + i * 0.06, ft: 'bandpass', f: R(900, 2400), q: 3, dur: 0.06, v: 0.2 });
      }
    },
    type: (t) => {
      noise({ t, ft: 'highpass', f: R(2500, 4200), q: 0.7, dur: 0.025, v: 0.22 });
      tone({ t, type: 'square', f: R(1400, 2200), f2: 500, dur: 0.018, v: 0.03 });
      tone({ t: t + 0.012, type: 'sine', f: R(180, 240), f2: 90, dur: 0.04, v: 0.12 });
    },
    ding: (t) => {
      tone({ t, type: 'sine', f: 1320, dur: 1.0, v: 0.16 });
      tone({ t, type: 'sine', f: 1980, dur: 0.6, v: 0.06 });
    },
    coin: (t) => {
      tone({ t, type: 'square', f: 988, dur: 0.05, v: 0.06, lp: 4000 });
      tone({ t: t + 0.05, type: 'square', f: 1319, dur: 0.12, v: 0.06, lp: 4000 });
    },
    combo: (t, n = 1) => {
      const base = 520 * Math.pow(1.122, Math.min(n, 10));
      tone({ t, type: 'triangle', f: base, dur: 0.08, v: 0.12 });
      tone({ t: t + 0.06, type: 'triangle', f: base * 1.5, dur: 0.12, v: 0.12 });
    },
    submit: (t) => {
      [523, 659, 784, 1047, 1319].forEach((f, i) => {
        tone({ t: t + i * 0.07, type: 'triangle', f, dur: 0.35, v: 0.16 });
        tone({ t: t + i * 0.07, type: 'sine', f: f * 2, dur: 0.25, v: 0.05 });
      });
      noise({ t: t + 0.35, ft: 'highpass', f: 6000, dur: 0.5, v: 0.1 });
    },
    fanfare: (t) => {
      const seq = [[392, 0], [523, 0.12], [659, 0.24], [784, 0.36], [659, 0.52], [784, 0.62]];
      seq.forEach(([f, d]) => {
        tone({ t: t + d, type: 'sawtooth', f, dur: 0.3, v: 0.07, lp: 2400 });
        tone({ t: t + d, type: 'triangle', f: f / 2, dur: 0.3, v: 0.1 });
      });
      [523, 659, 784, 1047].forEach((f) => tone({ t: t + 0.75, type: 'sawtooth', f, dur: 1.2, v: 0.05, lp: 2000 }));
    },
    fail: (t) => {
      [392, 370, 349, 262].forEach((f, i) => tone({ t: t + i * 0.22, type: 'triangle', f, dur: i === 3 ? 0.8 : 0.2, v: 0.16, vib: i === 3 ? 6 : 0, vibAmt: 8 }));
    },
    alarm: (t) => {
      tone({ t, type: 'square', f: 960, dur: 0.22, v: 0.09, lp: 2600 });
      tone({ t: t + 0.25, type: 'square', f: 720, dur: 0.22, v: 0.09, lp: 2600 });
    },
    printer: (t) => {
      noise({ t, ft: 'bandpass', f: R(300, 500), q: 4, dur: 0.3, v: 0.22, rate: 0.5 });
      tone({ t, type: 'sawtooth', f: R(60, 75), dur: 0.3, v: 0.07, lp: 500 });
    },
    honk: (t) => {
      tone({ t, type: 'square', f: 440, dur: 0.09, v: 0.07, lp: 1800 });
      tone({ t: t + 0.12, type: 'square', f: 554, dur: 0.12, v: 0.07, lp: 1800 });
    },
    coo: (t) => tone({ t, type: 'sine', f: R(380, 460), f2: 300, dur: 0.35, v: 0.12, vib: 18, vibAmt: 25 }),
    flap: (t) => noise({ t, ft: 'bandpass', f: 900, q: 2, dur: 0.08, v: 0.15 }),
    squeak: (t) => {
      tone({ t, type: 'sine', f: R(900, 1100), f2: 1600, dur: 0.08, v: 0.1 });
      tone({ t: t + 0.1, type: 'sine', f: R(1000, 1200), f2: 1800, dur: 0.1, v: 0.1 });
    },
    drip: (t) => tone({ t, type: 'sine', f: R(1100, 1400), f2: 500, dur: 0.07, v: 0.16 }),
    zap: (t) => {
      noise({ t, ft: 'highpass', f: 1500, dur: 0.25, v: 0.3 });
      tone({ t, type: 'sawtooth', f: 90, f2: 60, dur: 0.25, v: 0.12 });
    },
    thunk: (t) => {
      tone({ t, type: 'square', f: 90, f2: 50, dur: 0.12, v: 0.2, lp: 400 });
      noise({ t, ft: 'bandpass', f: 2500, q: 5, dur: 0.03, v: 0.4 });
    },
    powerdown: (t) => tone({ t, type: 'sawtooth', f: 420, f2: 35, dur: 0.9, v: 0.16, lp: 1200 }),
    powerup: (t) => {
      tone({ t, type: 'sawtooth', f: 40, f2: 380, dur: 0.6, v: 0.12, lp: 1400 });
      tone({ t: t + 0.55, type: 'sine', f: 120, dur: 0.6, v: 0.1 });
    },
    chitter: (t) => {
      for (let i = 0; i < 5; i++) tone({ t: t + i * 0.045, type: 'square', f: R(1300, 1900), dur: 0.025, v: 0.05, lp: 4000 });
    },
    ghost: (t) => {
      tone({ t, type: 'sine', f: 330, f2: 520, slide: 0.6, dur: 1.2, v: 0.12, a: 0.2, vib: 5, vibAmt: 18 });
      tone({ t: t + 0.08, type: 'sine', f: 335, f2: 260, dur: 1.1, v: 0.06, a: 0.2, vib: 6, vibAmt: 14 });
    },
    doorbell: (t) => {
      tone({ t, type: 'sine', f: 659, dur: 0.5, v: 0.18 });
      tone({ t: t + 0.3, type: 'sine', f: 523, dur: 0.8, v: 0.18 });
    },
    coffee: (t) => {
      tone({ t, type: 'square', f: 120, f2: 60, dur: 0.1, v: 0.12, lp: 600 });
      noise({ t: t + 0.12, ft: 'bandpass', f: 1200, q: 1, dur: 0.5, v: 0.12, a: 0.05 });
    },
    slurp: (t) => noise({ t, ft: 'bandpass', f: 600, f2: 2400, q: 3, dur: 0.35, v: 0.2, a: 0.04 }),
    snore: (t) => noise({ t, ft: 'lowpass', f: 300, f2: 500, dur: 0.7, v: 0.2, a: 0.3 }),
    bad: (t) => tone({ t, type: 'square', f: 140, f2: 110, dur: 0.2, v: 0.12, lp: 900 }),
    tick: (t) => noise({ t, ft: 'highpass', f: 5000, dur: 0.02, v: 0.18 }),
    stamp: (t) => {
      tone({ t, type: 'sine', f: 120, f2: 40, dur: 0.3, v: 0.6 });
      noise({ t, ft: 'lowpass', f: 1200, dur: 0.18, v: 0.35 });
    },
    paper: (t) => noise({ t, ft: 'bandpass', f: R(2000, 3500), q: 1.5, dur: 0.12, v: 0.14 }),
    book: (t) => {
      tone({ t, type: 'triangle', f: R(180, 260), f2: 90, dur: 0.08, v: 0.25 });
      noise({ t, ft: 'bandpass', f: 1400, q: 2, dur: 0.05, v: 0.15 });
    },
    heartbeat: (t) => {
      tone({ t, type: 'sine', f: 70, f2: 40, dur: 0.15, v: 0.4 });
      tone({ t: t + 0.18, type: 'sine', f: 60, f2: 35, dur: 0.15, v: 0.3 });
    },
    chat: (t) => {
      for (let i = 0; i < 4; i++) tone({ t: t + i * 0.07, type: 'triangle', f: R(500, 900), dur: 0.05, v: 0.05 });
    },
    talk: (t) => {
      for (let i = 0; i < 3; i++) tone({ t: t + i * 0.09, type: 'sawtooth', f: R(140, 220), dur: 0.07, v: 0.04, lp: 1200 });
    },
    sparkle: (t) => {
      for (let i = 0; i < 4; i++) tone({ t: t + i * 0.05, type: 'sine', f: R(1800, 3200), dur: 0.12, v: 0.05 });
    },
    hold: (t) => tone({ t, type: 'sine', f: 400, f2: 900, dur: 0.06, v: 0.05 }),
  };

  Au.play = function (name, arg, minGap = 0.03) {
    if (!Au.ready || !SFX[name]) return;
    const now = Au.ctx.currentTime;
    if (last[name] && now - last[name] < minGap) return;
    last[name] = now;
    try {
      SFX[name](now, arg);
    } catch (e) { /* ignore audio errors */ }
  };

  // --- music -----------------------------------------------------------
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const PROGS = {
    chill: [
      { root: 41, notes: [53, 57, 60, 64, 67] }, // Fmaj9
      { root: 40, notes: [52, 55, 59, 62] }, // Em7
      { root: 38, notes: [50, 53, 57, 60, 64] }, // Dm9
      { root: 43, notes: [52, 55, 59, 62] }, // Cmaj7/G
    ],
    spooky: [
      { root: 45, notes: [57, 60, 64, 67] }, // Am7
      { root: 41, notes: [53, 57, 60, 64] }, // Fmaj7
      { root: 38, notes: [50, 53, 57, 60] }, // Dm7
      { root: 40, notes: [52, 56, 59, 62] }, // E7
    ],
  };
  const PENTA = [0, 3, 5, 7, 10];

  const Music = (Au.Music = {
    on: false,
    bpm: 82,
    targetBpm: 82,
    intensity: 0, // 0 menu, 1 study, 2 chaos, 3 final rush
    mode: 'chill',
    step: 0,
    bar: 0,
    nextTime: 0,
    leadNote: 0,
    timer: null,
  });

  Music.start = function () {
    if (Music.on || !Au.ctx) return;
    Music.on = true;
    Music.nextTime = Au.ctx.currentTime + 0.1;
    crackleSrc = Au.ctx.createBufferSource();
    crackleSrc.buffer = crackleBuf;
    crackleSrc.loop = true;
    const cg = Au.ctx.createGain();
    cg.gain.value = 0.5;
    crackleSrc.connect(cg);
    cg.connect(musicGain);
    crackleSrc.start();
    Music.timer = setInterval(Music.tick, 25);
  };
  Music.set = function (o) {
    if (o.intensity != null) Music.intensity = o.intensity;
    if (o.mode) Music.mode = o.mode;
    if (o.bpm) Music.targetBpm = o.bpm;
  };
  Music.filter = function (freq, time = 0.4) {
    if (!Au.ctx) return;
    musicFilter.frequency.setTargetAtTime(freq, Au.ctx.currentTime, time);
  };
  Music.duck = function (v, time = 0.2) {
    if (!Au.ctx) return;
    musicDuck.gain.setTargetAtTime(v, Au.ctx.currentTime, time);
  };
  Music.tick = function () {
    if (!Au.ctx || Au.ctx.state !== 'running') return;
    while (Music.nextTime < Au.ctx.currentTime + 0.12) {
      Music.schedule(Music.step, Music.nextTime);
      Music.bpm = U.approach(Music.bpm, Music.targetBpm, 0.6);
      const sixteenth = 60 / Music.bpm / 4;
      const swing = Music.step % 2 === 0 ? 1.16 : 0.84;
      Music.nextTime += sixteenth * swing;
      Music.step = (Music.step + 1) % 16;
      if (Music.step === 0) Music.bar++;
    }
  };

  function ep(t, midi, dur, v, dest) {
    const ctx = Au.ctx;
    const f = mtof(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(v * 0.35, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Music.mode === 'spooky' ? 1400 : 2200;
    const o1 = ctx.createOscillator();
    o1.type = Music.mode === 'spooky' ? 'square' : 'sine';
    o1.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = f * 1.004;
    const g2 = ctx.createGain();
    g2.gain.value = Music.mode === 'spooky' ? 0.25 : 0.6;
    o1.connect(g2);
    g2.connect(lp);
    o2.connect(lp);
    lp.connect(g);
    g.connect(dest || musicGain);
    o1.start(t);
    o2.start(t);
    o1.stop(t + dur + 0.05);
    o2.stop(t + dur + 0.05);
  }

  Music.schedule = function (step, t) {
    const prog = PROGS[Music.mode] || PROGS.chill;
    const chord = prog[Music.bar % prog.length];
    const I = Music.intensity;
    const beat = 60 / Music.bpm;
    // Keys
    if (step === 0) chord.notes.forEach((n, i) => ep(t + i * 0.012, n, beat * 3.2, 0.055));
    if (step === 10 && I >= 1) chord.notes.slice(1).forEach((n) => ep(t, n + 12, beat * 1.2, 0.03));
    if (step === 6 && I === 0 && Music.bar % 2 === 1) ep(t, chord.notes[chord.notes.length - 1] + 12, beat * 2, 0.03);
    // Kick
    if (step === 0 || step === 7 || (I >= 2 && step === 10)) {
      tone({ t, type: 'sine', f: 120, f2: 42, slide: 0.12, dur: 0.28, v: I === 0 ? 0.35 : 0.55, dest: musicGain });
    }
    // Snare
    if (I >= 1 && (step === 4 || step === 12)) {
      noise({ t, ft: 'bandpass', f: 1900, q: 0.8, dur: 0.16, v: 0.22, dest: musicGain });
      tone({ t, type: 'triangle', f: 190, f2: 140, dur: 0.08, v: 0.12, dest: musicGain });
    }
    // Hats
    const hatEvery = I >= 2 ? 1 : 2;
    if (I >= 1 && step % hatEvery === 0) {
      noise({ t, ft: 'highpass', f: 7000, dur: step % 4 === 2 && I >= 3 ? 0.12 : 0.03, v: step % 4 === 0 ? 0.07 : 0.045, dest: musicGain });
    }
    // Bass
    if (I >= 1 && (step === 0 || step === 6 || step === 11)) {
      const n = chord.root + (step === 11 ? 7 : 0);
      tone({ t, type: 'triangle', f: mtof(n), dur: beat * (step === 0 ? 1.2 : 0.6), v: 0.16, lp: 500, dest: musicGain });
    }
    // Lead arpeggio during chaos
    if (I >= 2 && step % (I >= 3 ? 2 : 4) === 2 && Math.random() < 0.8) {
      Music.leadNote = U.clamp(Music.leadNote + U.pick([-1, 1, 1, 2, -2]), 0, 9);
      const base = (Music.mode === 'spooky' ? 69 : 65);
      const deg = PENTA[Music.leadNote % 5] + 12 * Math.floor(Music.leadNote / 5);
      tone({ t, type: Music.mode === 'spooky' ? 'sine' : 'triangle', f: mtof(base + deg), dur: beat * 0.4, v: 0.05, dest: musicGain, vib: Music.mode === 'spooky' ? 6 : 0, vibAmt: 6 });
    }
  };
})(window.MB);
