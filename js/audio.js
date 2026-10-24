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
  // A small song engine: every song has its own progression, instruments, groove and a
  // composed melody. `intensity` thickens the arrangement; `crunch` (0..1, the last real
  // minute of a night) modulates up a step, speeds up and gets frantic.
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const MAJ = [0, 2, 4, 7, 9], MIN = [0, 3, 5, 7, 10];
  const SONGS = {
    menu: { title: 'Dusk at Miller Branch', bpm: 76, swing: 0.16, keys: 'rhodes', keyPat: 'held', bass: 'lofi', kit: 'lofi', lead: 'flute', base: 77, scale: MAJ, crackle: 0.5, motifAt: 0,
      prog: [[41, [53, 57, 60, 64, 67]], [40, [52, 55, 59, 62]], [38, [50, 53, 57, 60, 64]], [43, [52, 55, 59, 62]]],
      motif: [[[0, 7, 4], [6, 4, 2], [8, 2, 6]], [[0, 4, 4], [4, 2, 4], [8, 0, 8]], [[0, 2, 6], [8, 5, 4], [12, 4, 4]], [[0, 0, 12]]] },
    n1: { title: 'Lamplight Lo-fi', bpm: 84, swing: 0.16, keys: 'rhodes', keyPat: 'held', bass: 'lofi', kit: 'lofi', lead: 'whistle', base: 70, scale: MAJ, crackle: 0.55,
      prog: [[46, [58, 62, 65, 69]], [43, [55, 58, 62, 65, 69]], [39, [55, 58, 62, 63]], [41, [58, 60, 63, 65]]],
      motif: [[[0, 9, 3], [4, 7, 3], [8, 4, 4], [12, 2, 4]], [[0, 2, 6], [8, 5, 4], [12, 7, 4]], [[0, 7, 4], [4, 9, 4], [8, 11, 8]], [[0, 12, 3], [3, 9, 3], [6, 7, 10]]] },
    n2: { title: 'Bossa for Supplementals', bpm: 92, swing: 0.06, keys: 'pluck', keyPat: 'bossa', bass: 'bossa', kit: 'bossa', lead: 'flute', base: 74, scale: MIN, crackle: 0.3,
      prog: [[38, [53, 57, 60, 64]], [43, [53, 59, 64]], [36, [52, 55, 59, 62]], [45, [55, 58, 61, 64]]],
      motif: [[[0, 7, 2], [2, 5, 2], [4, 3, 4], [10, 0, 4]], [[0, 5, 2], [2, 3, 2], [4, 2, 6], [12, -2, 4]], [[0, -2, 2], [2, 0, 2], [4, 2, 4], [8, 5, 8]], [[0, 3, 6], [8, -1, 8]]] },
    n3: { title: 'Rain on the Copper Roof', bpm: 72, swing: 0.1, keys: 'piano', keyPat: 'arp8', bass: 'halftime', kit: 'halftime', lead: 'bell', base: 69, scale: MIN, crackle: 0.4, rain: 0.05,
      prog: [[45, [55, 59, 60, 64]], [41, [53, 57, 60, 64]], [48, [52, 55, 59, 64]], [43, [50, 55, 59, 64]]],
      motif: [[[0, 7, 8], [8, 3, 8]], [[0, 4, 4], [4, 3, 4], [8, 0, 8]], [[0, 7, 4], [4, 10, 4], [8, 12, 8]], [[0, 11, 6], [6, 7, 10]]] },
    n4: { title: '150 Characters (8-bit Mix)', bpm: 104, swing: 0, keys: 'chip', keyPat: 'arp16', bass: 'octave', kit: 'synth', lead: 'chip', base: 76, scale: MIN, crackle: 0.12,
      prog: [[40, [52, 55, 59]], [36, [52, 55, 60]], [43, [50, 55, 59]], [38, [50, 54, 57]]],
      motif: [[[0, 0, 2], [2, 3, 2], [4, 7, 2], [6, 10, 2], [8, 12, 4], [12, 10, 2], [14, 7, 2]], [[0, 8, 4], [4, 7, 4], [8, 3, 4], [12, 7, 4]], [[0, 7, 2], [2, 10, 2], [4, 12, 4], [8, 14, 4], [12, 12, 4]], [[0, 14, 6], [6, 12, 2], [8, 10, 8]]] },
    n5: { title: 'Dewey\'s Monster Shuffle', bpm: 96, swing: 0.22, keys: 'organ', keyPat: 'held', bass: 'walk', kit: 'shuffle', lead: 'theremin', base: 69, scale: MIN, crackle: 0.35,
      prog: [[45, [57, 60, 64, 67]], [41, [53, 57, 60, 64]], [38, [50, 53, 57, 60]], [40, [52, 56, 59, 62]]],
      motif: [[[0, 0, 6], [6, 3, 2], [8, 7, 8]], [[0, 8, 8], [8, 7, 8]], [[0, 5, 6], [6, 3, 2], [8, 2, 8]], [[0, -1, 8], [8, 2, 4], [12, -1, 4]]] },
    tutorial: { title: 'Orientation', bpm: 90, swing: 0.12, keys: 'piano', keyPat: 'comp', bass: 'lofi', kit: 'lofi', lead: 'whistle', base: 72, scale: MAJ, crackle: 0.4,
      prog: [[48, [52, 55, 59, 62]], [45, [55, 57, 60, 64]], [38, [53, 57, 60, 62]], [43, [53, 55, 59, 62]]],
      motif: [[[0, 4, 2], [2, 7, 2], [4, 12, 4], [10, 11, 2], [12, 9, 4]], [[0, 7, 8], [8, 4, 8]], [[0, 5, 2], [2, 9, 2], [4, 12, 4], [10, 11, 2], [12, 7, 4]], [[0, 2, 4], [4, 5, 4], [8, 4, 8]]] },
    story: { title: 'Library Lore', bpm: 70, swing: 0.08, keys: 'musicbox', keyPat: 'arp8', pad: true, bass: 'soft', kit: 'none', lead: 'musicbox', base: 74, scale: MAJ, crackle: 0.35, motifAt: 0,
      prog: [[38, [54, 57, 61, 62]], [47, [54, 57, 59, 62]], [43, [55, 59, 62, 66]], [45, [57, 61, 64, 66]]],
      motif: [[[0, 4, 4], [4, 2, 4], [8, 0, 4], [12, -3, 4]], [[0, -3, 8], [8, 0, 8]], [[0, -5, 4], [4, -3, 4], [8, 0, 4], [12, 2, 4]], [[0, 4, 12]]] },
    mystery: { title: 'Dewey', bpm: 64, swing: 0, keys: 'pad', keyPat: 'held', pad: true, bass: 'pulse', kit: 'heartbeat', lead: 'theremin', base: 72, scale: MIN, crackle: 0.25, rain: 0.02, motifAt: 0,
      prog: [[36, [51, 55, 60, 62]], [44, [56, 60, 63, 67]], [41, [55, 56, 60, 63]], [43, [53, 56, 59, 62]]],
      motif: [[[0, 0, 8], [8, 3, 8]], [[0, 8, 12], [12, 7, 4]], [[0, 5, 8], [8, 3, 8]], [[0, 2, 8], [8, -1, 8]]] },
    triumph: { title: 'Decision Day', bpm: 100, swing: 0.04, keys: 'brass', keyPat: 'comp', bass: 'octave', kit: 'synth', lead: 'brass', base: 72, scale: MAJ, crackle: 0.15, motifAt: 0,
      prog: [[36, [52, 55, 60, 64]], [47, [55, 59, 62, 67]], [45, [57, 60, 64, 69]], [41, [57, 60, 65, 69]]],
      motif: [[[0, 7, 4], [4, 7, 2], [6, 9, 2], [8, 12, 8]], [[0, 11, 4], [4, 7, 4], [8, 7, 8]], [[0, 9, 4], [4, 12, 4], [8, 16, 8]], [[0, 17, 6], [6, 16, 2], [8, 14, 8]]] },
  };
  Au.SONGS = SONGS;

  const Music = (Au.Music = {
    on: false, bpm: 76, songId: 'menu', song: SONGS.menu, pending: null,
    intensity: 0, crunch: 0, step: 0, bar: 0, nextTime: 0, leadNote: 4, lastLead: 0, timer: null,
  });
  let crackleGain, rainGain;

  Music.start = function () {
    if (Music.on || !Au.ctx) return;
    Music.on = true;
    const ctx = Au.ctx;
    Music.nextTime = ctx.currentTime + 0.1;
    const cr = ctx.createBufferSource();
    cr.buffer = crackleBuf;
    cr.loop = true;
    crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.5;
    cr.connect(crackleGain);
    crackleGain.connect(musicGain);
    cr.start();
    const rn = ctx.createBufferSource();
    rn.buffer = noiseBuf;
    rn.loop = true;
    const rf = ctx.createBiquadFilter();
    rf.type = 'bandpass';
    rf.frequency.value = 1400;
    rf.Q.value = 0.4;
    rainGain = ctx.createGain();
    rainGain.gain.value = 0;
    rn.connect(rf);
    rf.connect(rainGain);
    rainGain.connect(musicGain);
    rn.start();
    Music.applyTexture();
    Music.timer = setInterval(Music.tick, 25);
  };
  Music.applyTexture = function () {
    if (!crackleGain) return;
    const t = Au.ctx.currentTime;
    crackleGain.gain.setTargetAtTime(Music.song.crackle ?? 0.4, t, 0.5);
    rainGain.gain.setTargetAtTime(Music.song.rain || 0, t, 0.8);
  };
  // o: { song, intensity, crunch }
  Music.set = function (o) {
    if (o.song && SONGS[o.song]) Music.pending = o.song === Music.songId ? null : o.song;
    if (o.intensity != null) Music.intensity = o.intensity;
    if (o.crunch != null) Music.crunch = U.clamp(o.crunch, 0, 1);
  };
  Music.filter = function (freq, time = 0.4) {
    if (!Au.ctx) return;
    musicFilter.frequency.setTargetAtTime(freq, Au.ctx.currentTime, time);
  };
  Music.duck = function (v, time = 0.2) {
    if (!Au.ctx) return;
    musicDuck.gain.setTargetAtTime(v, Au.ctx.currentTime, time);
  };
  Music.targetBpm = function () {
    const c = Music.crunch;
    return Music.song.bpm * (c > 0 ? 1.12 + 0.2 * c : 1) * (Music.intensity >= 2 ? 1.03 : 1);
  };
  Music.tick = function () {
    if (!Au.ctx || Au.ctx.state !== 'running') return;
    while (Music.nextTime < Au.ctx.currentTime + 0.12) {
      // song changes land on the next beat so cutscene cues feel immediate
      if (Music.step % 4 === 0 && Music.pending) {
        Music.songId = Music.pending;
        Music.song = SONGS[Music.pending];
        Music.pending = null;
        Music.step = 0;
        Music.bar = 0;
        Music.bpm = Music.targetBpm();
        Music.applyTexture();
        if (Music.song.kit !== 'none') crash(Music.nextTime, 0.05);
      }
      Music.schedule(Music.step, Music.nextTime);
      Music.bpm = U.approach(Music.bpm, Music.targetBpm(), 1.2);
      const sixteenth = 60 / Music.bpm / 4;
      const sw = Music.crunch > 0 ? 0 : Music.song.swing;
      Music.nextTime += sixteenth * (Music.step % 2 === 0 ? 1 + sw : 1 - sw);
      Music.step = (Music.step + 1) % 16;
      if (Music.step === 0) Music.bar++;
    }
  };

  // --- instruments ---
  function synth(o) {
    const ctx = Au.ctx, t = o.t;
    const out = ctx.createGain();
    const peak = o.v;
    const a = o.a || 0.008, d = o.dur;
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(peak, t + a);
    if (o.sus) {
      out.gain.setTargetAtTime(peak * o.sus, t + a, 0.15);
      out.gain.setTargetAtTime(0.0001, t + d, 0.12);
    } else out.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    let node = out;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(o.lp || 4000, t);
    if (o.lpTo) lp.frequency.exponentialRampToValueAtTime(o.lpTo, t + (o.lpTime || 0.3));
    lp.connect(out);
    out.connect(musicGain);
    const stop = t + a + d + (o.sus ? 0.6 : 0.05);
    for (const w of o.waves) {
      const osc = ctx.createOscillator();
      osc.type = w.type;
      osc.frequency.setValueAtTime(o.from ? o.from * (w.mult || 1) : o.f * (w.mult || 1), t);
      if (o.from) osc.frequency.exponentialRampToValueAtTime(o.f * (w.mult || 1), t + 0.08);
      if (w.detune) osc.detune.value = w.detune;
      const g = ctx.createGain();
      g.gain.value = w.gain ?? 1;
      osc.connect(g);
      g.connect(lp);
      if (o.vib) {
        const l = ctx.createOscillator(), lg = ctx.createGain();
        l.frequency.value = o.vib;
        lg.gain.value = o.vibAmt || 4;
        l.connect(lg);
        lg.connect(osc.frequency);
        l.start(t);
        l.stop(stop);
      }
      osc.start(t);
      osc.stop(stop);
    }
  }
  const VOICES = {
    rhodes: (t, f, dur, v) => synth({ t, f, dur: Math.min(dur, 2.4), v, waves: [{ type: 'sine', gain: 0.65 }, { type: 'triangle', detune: 6 }], lp: 2200 }),
    piano: (t, f, dur, v) => synth({ t, f, dur: Math.min(dur, 1.6), v, waves: [{ type: 'triangle' }, { type: 'sine', mult: 2, gain: 0.25 }], lp: 3200, lpTo: 1200, lpTime: 0.8 }),
    organ: (t, f, dur, v) => synth({ t, f, dur, v: v * 0.8, a: 0.03, sus: 0.75, waves: [{ type: 'square', gain: 0.35 }, { type: 'sine', mult: 2, gain: 0.4 }, { type: 'triangle', mult: 0.5 }], lp: 1300, vib: 5.5, vibAmt: 2 }),
    pluck: (t, f, dur, v) => synth({ t, f, dur: 0.45, v: v * 1.3, waves: [{ type: 'triangle' }, { type: 'sawtooth', gain: 0.15 }], lp: 3000, lpTo: 500, lpTime: 0.25 }),
    musicbox: (t, f, dur, v) => synth({ t, f: f * 2, dur: 1.2, v: v * 0.9, waves: [{ type: 'sine' }, { type: 'sine', mult: 3, gain: 0.18 }], lp: 6000 }),
    pad: (t, f, dur, v) => synth({ t, f, dur, v: v * 0.7, a: 0.5, sus: 0.85, waves: [{ type: 'sawtooth', detune: -9 }, { type: 'sawtooth', detune: 9 }], lp: 900 }),
    brass: (t, f, dur, v) => synth({ t, f, dur: Math.min(dur, 1.2), v: v * 0.8, a: 0.04, waves: [{ type: 'sawtooth' }, { type: 'sawtooth', detune: 7, gain: 0.6 }], lp: 700, lpTo: 2400, lpTime: 0.12 }),
    chip: (t, f, dur, v) => synth({ t, f, dur: Math.min(dur, 0.22), v: v * 0.7, waves: [{ type: 'square' }], lp: 3600 }),
    flute: (t, f, dur, v) => synth({ t, f, dur, v, a: 0.05, sus: 0.7, waves: [{ type: 'sine' }, { type: 'triangle', mult: 2, gain: 0.08 }], lp: 3000, vib: 5, vibAmt: 5 }),
    whistle: (t, f, dur, v) => synth({ t, f: f * 2, dur, v: v * 0.8, a: 0.03, sus: 0.65, waves: [{ type: 'sine' }], lp: 5000, vib: 6, vibAmt: 7 }),
    bell: (t, f, dur, v) => synth({ t, f: f * 2, dur: 1.6, v: v * 0.9, waves: [{ type: 'sine' }, { type: 'sine', mult: 2.76, gain: 0.25 }, { type: 'sine', mult: 5.4, gain: 0.08 }], lp: 7000 }),
    theremin: (t, f, dur, v, from) => synth({ t, f, from, dur, v: v * 0.9, a: 0.08, sus: 0.8, waves: [{ type: 'sine' }, { type: 'triangle', gain: 0.15 }], lp: 2600, vib: 6.5, vibAmt: 9 }),
  };
  const play = (voice, t, midi, dur, v, from) => VOICES[voice](t, mtof(midi), dur, v, from ? mtof(from) : 0);

  // --- drums ---
  const kick = (t, v = 0.5, hard) => tone({ t, type: 'sine', f: hard ? 150 : 120, f2: 40, slide: 0.12, dur: 0.28, v, dest: musicGain });
  const snare = (t, v = 0.22) => {
    noise({ t, ft: 'bandpass', f: 1900, q: 0.8, dur: 0.16, v, dest: musicGain });
    tone({ t, type: 'triangle', f: 190, f2: 140, dur: 0.08, v: v * 0.55, dest: musicGain });
  };
  const clap = (t, v = 0.2) => {
    for (let i = 0; i < 3; i++) noise({ t: t + i * 0.012, ft: 'bandpass', f: 1300, q: 1.2, dur: 0.09, v: v * 0.8, dest: musicGain });
  };
  const hat = (t, v = 0.05, open) => noise({ t, ft: 'highpass', f: 7000, dur: open ? 0.14 : 0.03, v, dest: musicGain });
  const rim = (t, v = 0.08) => tone({ t, type: 'square', f: 1650, f2: 900, dur: 0.025, v, dest: musicGain });
  const shaker = (t, v = 0.03) => noise({ t, ft: 'bandpass', f: 6500, q: 2, dur: 0.05, v, dest: musicGain });
  const block = (t, v = 0.07) => tone({ t, type: 'sine', f: 1900, f2: 1500, dur: 0.04, v, dest: musicGain });
  const crash = (t, v = 0.12) => noise({ t, ft: 'highpass', f: 4500, dur: 1.4, v, dest: musicGain });

  Music.schedule = function (step, t) {
    const S = Music.song;
    const I = Music.intensity, C = Music.crunch;
    const crunch = C > 0;
    const prog = S.prog;
    const ci = Music.bar % prog.length;
    const [root, notes] = prog[ci];
    const tr = crunch ? 1 : 0; // the classic key change for the final stretch
    const beat = 60 / Music.bpm;
    const kv = S.keys;
    // --- keys / comping
    const vol = S.keys === 'chip' ? 0.03 : 0.05;
    switch (S.keyPat) {
      case 'held':
        if (step === 0) notes.forEach((n, i) => play(kv, t + i * 0.012, n + tr, beat * 3.6, vol));
        if (step === 10 && I >= 1) notes.slice(1).forEach((n) => play(kv === 'organ' ? 'organ' : 'rhodes', t, n + 12 + tr, beat * 1.1, vol * 0.5));
        break;
      case 'comp':
        if (step === 0 || step === 6 || (step === 10 && I >= 1)) notes.forEach((n) => play(kv, t, n + tr, beat * (step === 0 ? 1.6 : 0.8), vol * (step === 0 ? 1 : 0.7)));
        break;
      case 'bossa':
        if ([0, 3, 6, 10, 12].includes(step)) notes.forEach((n, i) => play(kv, t + i * 0.008, n + tr, beat, vol * (step === 0 ? 1 : 0.75)));
        break;
      case 'arp8':
        if (step % 2 === 0) {
          const seq = notes.concat(notes.slice(1, -1).reverse().map((n) => n + 12));
          play(kv, t, seq[(step / 2) % seq.length] + (step >= 8 ? 12 : 0) + tr, beat * 1.4, vol * 0.85);
        }
        break;
      case 'arp16': {
        const seq = notes.concat(notes.map((n) => n + 12));
        play(kv, t, seq[step % seq.length] + tr, beat * 0.3, vol);
        break;
      }
    }
    if (S.pad && step === 0) notes.forEach((n) => play('pad', t, n - 12 + tr, beat * 4, 0.03));
    // --- bass
    const br = root + tr;
    const bv = 0.16;
    const bass = (n, len) => tone({ t, type: 'triangle', f: mtof(n), dur: beat * len, v: bv, lp: 500, dest: musicGain });
    if (crunch) {
      if (step % 2 === 0) bass(br + (step % 4 === 2 ? 12 : 0), 0.45);
    } else {
      switch (S.bass) {
        case 'lofi': if (I >= 1 && (step === 0 || step === 6 || step === 11)) bass(br + (step === 11 ? 7 : 0), step === 0 ? 1.2 : 0.6); else if (I === 0 && step === 0) bass(br, 2); break;
        case 'bossa': if ([0, 6, 8, 14].includes(step)) bass(br + (step === 6 || step === 14 ? 7 : 0), 0.9); break;
        case 'halftime': if (step === 0) bass(br, 2.5); else if (step === 10 && I >= 1) bass(br + 7, 0.8); break;
        case 'octave': if (step % 2 === 0 && (I >= 1 || step % 4 === 0)) bass(br + (step % 4 === 2 ? 12 : 0), 0.4); break;
        case 'walk': if (step % 4 === 0) bass(br + [0, 3, 7, 10][step / 4] - (step === 12 ? 1 : 0), 0.9); break;
        case 'soft': if (step === 0) bass(br, 3.5); break;
        case 'pulse': if (step === 0 || step === 8) bass(br, 1.6); break;
      }
    }
    // --- drums
    const kit = S.kit;
    if (crunch) {
      // frantic: four on the floor, 16th hats, clap backbeat, ticking clock, snare rolls into every other bar
      if (step % 4 === 0) kick(t, 0.6, true);
      if (step === 4 || step === 12) clap(t, 0.22);
      hat(t, step % 4 === 2 ? 0.07 : 0.045, step % 4 === 2);
      if (step % 4 === 0) block(t, 0.06 + C * 0.05);
      if (Music.bar % 2 === 1 && step >= 12) snare(t, 0.1 + (step - 12) * 0.05);
      if (step === 0 && Music.bar % 4 === 0) crash(t, 0.09 + C * 0.06);
      if (C > 0.5 && step % 2 === 1 && Math.random() < C * 0.5) rim(t, 0.06);
    } else if (kit === 'lofi') {
      if (step === 0 || step === 7 || (I >= 2 && step === 10)) kick(t, I === 0 ? 0.35 : 0.55);
      if (I >= 1 && (step === 4 || step === 12)) snare(t);
      if (I >= 1 && step % (I >= 2 ? 1 : 2) === 0) hat(t, step % 4 === 0 ? 0.07 : 0.045);
    } else if (kit === 'bossa') {
      if (step === 0 || step === 8) kick(t, 0.38);
      if (step === 6 || step === 14) kick(t, 0.22);
      if (I >= 1 && [0, 3, 6, 10, 12].includes(step)) rim(t, 0.07);
      if (I >= 1) shaker(t, step % 2 ? 0.02 : 0.035);
      if (I >= 2 && step % 4 === 2) hat(t, 0.04, true);
    } else if (kit === 'halftime') {
      if (step === 0 || (I >= 1 && step === 10)) kick(t, 0.45);
      if (I >= 1 && step === 8) snare(t, 0.2);
      if (I >= 1 && step % 2 === 0) hat(t, step % 4 === 0 ? 0.05 : 0.03);
      if (I >= 2 && step % 4 === 3) rim(t, 0.04);
    } else if (kit === 'synth') {
      if (step % 4 === 0 && (I >= 1 || step === 0)) kick(t, 0.5, true);
      if (I >= 1 && (step === 4 || step === 12)) clap(t);
      if (I >= 1 && step % 4 === 2) hat(t, 0.06, true);
      if (I >= 2 && step % 2 === 1) hat(t, 0.035);
    } else if (kit === 'shuffle') {
      if (step === 0 || step === 10) kick(t, 0.5);
      if (I >= 1 && (step === 4 || step === 12)) snare(t, 0.2);
      if (I >= 1 && step === 15) snare(t, 0.06);
      if (step % 4 === 0 || step % 4 === 3) hat(t, step % 4 === 0 ? 0.05 : 0.03);
    } else if (kit === 'heartbeat') {
      if (step === 0) kick(t, 0.32);
      if (step === 3) kick(t, 0.2);
    }
    // --- melody: the song's motif, then improvisation as things heat up
    const motifOn = I >= (S.motifAt ?? 1) && !(crunch && C > 0.4);
    if (motifOn && S.motif) {
      const bar = S.motif[Music.bar % S.motif.length];
      for (const [st, off, len] of bar) {
        if (st === step) {
          const n = S.base + off + tr;
          play(S.lead, t, n, beat * len * 0.25, 0.07, S.lead === 'theremin' ? Music.lastLead : 0);
          Music.lastLead = n;
        }
      }
    }
    const improv = crunch ? (C > 0.66 ? 1 : 2) : I >= 2 ? 4 : 0;
    if (improv && step % improv === (improv === 1 ? 0 : improv / 2) && Math.random() < (crunch ? 0.85 : 0.55)) {
      Music.leadNote = U.clamp(Music.leadNote + U.pick([-2, -1, 1, 1, 2, 3]), 0, 11);
      const deg = S.scale[Music.leadNote % 5] + 12 * Math.floor(Music.leadNote / 5);
      const lv = crunch ? 'chip' : S.lead === 'brass' ? 'brass' : 'pluck';
      play(lv, t, S.base - 12 + deg + tr, beat * 0.3, crunch ? 0.045 : 0.04);
    }
  };
})(window.MB);
