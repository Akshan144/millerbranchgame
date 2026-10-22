'use strict';
// Your own college essay: pick the next line from three cards to match what the admissions
// reader is craving (HEART / WIT / GRIT). Clichés are traps. Noise fogs your brain.
(function (MB) {
  const U = MB.U, FX = MB.FX, Au = MB.Audio;

  const TONES = {
    heart: { name: 'HEART', col: '#e8577a', want: 'something heartfelt' },
    wit: { name: 'WIT', col: '#e0a321', want: 'something funny' },
    grit: { name: 'GRIT', col: '#e0702e', want: 'something gutsy' },
  };
  MB.TONES = TONES;

  const POOL = {
    heart: [
      'My grandma taught me to fold dumplings and never fold under pressure.',
      'Every Tuesday I read to the Storytime kids. They are harsh critics.',
      'I learned that listening is a superpower nobody lists on a résumé.',
      'My little brother thinks I am a genius. I am trying to prove him right.',
      'The night shift at the diner taught me more than any textbook.',
      'I water the library plant every day. Its name is Gerald.',
      'When our dog got sick, I learned how to be brave for someone else.',
      'I want to build things that make people feel less alone.',
      'My parents crossed an ocean. I can cross a campus.',
      'I keep a notebook of compliments strangers gave me. It is full.',
      'Teaching my neighbor to use email took six weeks and all my patience.',
      'I cried at the end of Charlotte’s Web in tenth grade. Proudly.',
      'Packing boxes at the food bank showed me what community means.',
      'Kindness is a skill, and I practice it every day.',
      'I started a tutoring club so nobody has to feel lost in math.',
      'Mom works doubles so I can study. This essay is for her.',
      'Showing up is half of every success story I know.',
      'I learned sign language so my cousin never eats lunch alone.',
    ],
    wit: [
      'I have read 400 library books and owe $3.25 in late fees.',
      'Our robot caught fire at regionals. We still placed third.',
      'I once debated a goose. The goose won on points.',
      'I am fluent in English, Spanish, and passive-aggressive group chat.',
      'My greatest weakness is that I am too good at writing essays.',
      'I founded a club. Members: me, my best friend, and a ficus.',
      'I can name every vending machine snack by its button number.',
      'My calc teacher calls me “a lot.” I choose to hear “a legend.”',
      'I am 70% caffeine and 30% unfinished Google Docs.',
      'I have strong opinions about fonts. Comic Sans knows what it did.',
      'I was voted Most Likely to Reply-All. I accept the title.',
      'I tried to build a time machine. Still waiting to hear back.',
      'My Spotify Wrapped was only lo-fi beats. I am the beat now.',
      'I am banned from Monopoly at three separate family reunions.',
      'I named my laptop Deadline. It keeps crashing on me.',
      'I wrote this sentence while a Roomba attacked my ankles.',
      'I am the reason our library has a “no pigeons” sign.',
      'My résumé is mostly vibes, but they are excellent vibes.',
    ],
    grit: [
      'I ran the mile in 11 minutes. Then 9. Then 7. I am not done.',
      'I failed my driving test twice. Third time, I parallel parked.',
      'I taught myself to code from library books and stubbornness.',
      'When the team quit, I rebuilt the robot alone over winter break.',
      'I wake up at 5 a.m. to practice cello. The neighbors adapted.',
      'I turned a C in chemistry into an A by living in office hours.',
      'I do not wait for opportunities. I fill out their forms.',
      'My bracelet business made $412 and taught me everything.',
      'I have heard “no” forty times. I have learned to hear “not yet.”',
      'I organized a 200-person park cleanup with one group chat.',
      'I will walk onto your campus ready to work on day one.',
      'I trained for the debate final by arguing with my reflection.',
      'I rewrote this essay eleven times. This is the good one.',
      'Every setback has been a stair, not a wall.',
      'I asked to join varsity. Then I asked again. And again.',
      'I do not just meet deadlines. I stare them down.',
      'I carried our team’s whole science fair. Literally. It was heavy.',
    ],
    cliche: [
      'Ever since I was a child, I have been passionate about passion.',
      'Webster’s Dictionary defines “success” as...',
      'In today’s society, technology is very important.',
      'Failure is just success in disguise.',
      'I am a leader, a follower, and a team player all at once.',
      'Like a butterfly, I emerged from the cocoon of high school.',
      'It was the best of times, it was the worst of times.',
      'Some people climb mountains. I climbed the mountain of myself.',
      'Since the dawn of time, humans have wanted to go to college.',
      'In conclusion, I am very unique and special.',
      'Little did I know, this would change my life forever.',
      'Throughout history, essays have been written.',
    ],
  };
  const FOG = ['uhh... the... what was i... saying', 'asdfgh. no. ok. hm.', 'cannot think. TOO LOUD.', 'i forgot every word i know', 'thoughts.exe has stopped working'];
  const PROMPTS = [
    'Prompt 2: A challenge, setback, or failure.',
    'Prompt 5: An accomplishment that sparked growth.',
    'Prompt 7: Topic of your choice.',
    'Why do you want to attend our university?',
    'Prompt 1: Your background, identity, or talent.',
  ];
  const REACT = {
    match: ['Love it!', 'Yes!! More!', 'Chef’s kiss.', 'Now THAT’S an essay.', 'Ooh!'],
    meh: ['Hm. Okay.', 'Sure...', 'Noted.', 'Fine, I guess.'],
    cliche: ['*groan*', 'Not THIS again.', 'I’ve read this 900 times.', 'Yawn.'],
    fog: ['...what?', 'Is this a typo?', 'Huh??'],
  };

  class Essay {
    constructor(g) {
      this.g = g;
      this.prompt = U.pick(PROMPTS);
      this.lines = [];
      this.used = new Set();
      this.want = U.pick(Object.keys(TONES));
      this.wantLeft = U.randi(2, 3);
      this.cards = [];
      this.typing = null;
      this.reaction = null;
      this.reactT = 0;
      this.perfect = 0;
      this.written = 0;
      this.streak = 0;
      this.best = null;
      this.fogIdx = -1;
      this.dealT = 0;
      this.wantFlash = 0;
      this.deal();
    }
    draw(tone) {
      const pool = POOL[tone].filter((l) => !this.used.has(l));
      const line = U.pick(pool.length ? pool : POOL[tone]);
      this.used.add(line);
      return { text: line, tone };
    }
    deal() {
      const others = Object.keys(TONES).filter((t) => t !== this.want);
      const cards = [this.draw(this.want), this.draw(U.pick(others))];
      cards.push(Math.random() < 0.4 ? this.draw('cliche') : this.draw(others.find((t) => t !== cards[1].tone)));
      this.cards = U.shuffle(cards);
      this.fogIdx = U.randi(0, 2);
      this.dealT = 0;
    }
    foggy() {
      const g = this.g;
      return !g.stats.calm && g.grooveT <= 0 && g.noiseAt(MB.World.playerSeat) > 3.5;
    }
    choose(i) {
      if (this.typing || !this.cards[i] || this.g.mySubmitted) return;
      const c = this.cards[i];
      const fog = this.foggy() && i === this.fogIdx;
      this.typing = { card: c, fog, text: fog ? U.pick(FOG) : c.text, n: 0, acc: 0 };
      this.choiceIdx = i;
      Au.play('select');
    }
    speedUp(n) {
      if (this.typing) this.typing.n += 7 * n;
    }
    update(dt) {
      this.reactT -= dt;
      this.dealT += dt;
      this.wantFlash = Math.max(0, this.wantFlash - dt);
      const ty = this.typing;
      if (!ty) return;
      const before = Math.floor(ty.n);
      ty.n += dt * 58 * (this.g.typeBoostT > 0 ? 1.6 : 1);
      if (Math.floor(ty.n / 3) !== Math.floor(before / 3)) Au.play('type', null, 0.02);
      if (ty.n >= ty.text.length) this.finish();
    }
    finish() {
      const g = this.g;
      const ty = this.typing;
      this.typing = null;
      const c = ty.card;
      let kind = ty.fog ? 'fog' : c.tone === 'cliche' ? 'cliche' : c.tone === this.want ? 'match' : 'meh';
      let mult = { match: 1.3, meh: 0.8, cliche: 0.35, fog: 0.3 }[kind];
      if (kind === 'match') {
        this.streak++;
        this.perfect++;
        mult += Math.min(0.4, (this.streak - 1) * 0.1);
        this.best = c.text;
      } else this.streak = 0;
      const base = 100 / g.def.essayLines;
      const amt = base * mult * g.stats.type * (g.typeBoostT > 0 ? 1.25 : 1) * (g.grooveT > 0 ? 1.3 : 1);
      g.myProgress = Math.min(100, g.myProgress + amt);
      this.written++;
      this.lines.push({ text: ty.text, kind, tone: c.tone });
      if (this.lines.length > 40) this.lines.shift();
      this.reaction = { text: U.pick(REACT[kind]), kind };
      this.reactT = 1.6;
      const seat = MB.World.playerSeat;
      const label = kind === 'match' ? (this.streak > 1 ? 'VOICE STREAK x' + this.streak : 'PERFECT VIBE!') : kind === 'cliche' ? 'CLICHÉ...' : kind === 'fog' ? 'BRAIN FOG' : 'OK LINE';
      const col = kind === 'match' ? '#9fe08a' : kind === 'meh' ? '#fff6e6' : '#ff9a8a';
      FX.text(seat.x, seat.y - 110, label + '  +' + Math.round(amt) + '%', { size: kind === 'match' ? 22 : 17, col, life: 1.3 });
      if (kind === 'match') {
        Au.play('combo', this.streak + 1);
        FX.confetti(seat.x, seat.y - 70, 12, 0.5);
        g.addPoints(120, seat.x, seat.y - 140);
      } else if (kind === 'meh') {
        Au.play('coin');
        g.addPoints(50, seat.x, seat.y - 140);
      } else Au.play('bad');
      g.player.typeAnim = 0.4;
      this.wantLeft--;
      if (this.wantLeft <= 0) {
        const opts = Object.keys(TONES).filter((t) => t !== this.want);
        this.want = U.pick(opts);
        this.wantLeft = U.randi(2, 3);
        this.wantFlash = 1;
      }
      this.deal();
      if (g.myProgress >= 100) g.submitMine();
    }
  }
  MB.Essay = Essay;
})(window.MB);
