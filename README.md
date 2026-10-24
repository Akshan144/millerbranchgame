# The Miller Branch Library

A hand-drawn arcade game about keeping your high school study group focused through one very chaotic week at the library before the **Nov 1 college application deadline**.

Rogue Roombas, speakerphone talkers, pigeons in the stacks, a raccoon with your flash drive, a fire alarm, a power outage and, on Halloween night, a library ghost who only respects a proper *SHHH*. Keep your friends focused, write a gloriously ridiculous college essay between emergencies, and get enough applications submitted before midnight, five nights in a row.

## The story

Max, Akshan, Rishit and Bryan have five nights at the Miller Branch to finish their early applications. You play one of them; the other three are your tablemates. Each night opens with a cutscene, and the week builds to a Halloween showdown with the library's resident ghost and a Decision Day finale.

| | Applying to | Major | Perk |
| --- | --- | --- | --- |
| **Max** | Duke (ED) | pre-med | Pep talks restore full focus; coffee lasts longer |
| **Akshan** | Yale (EA) | policy + econ | A filibuster-grade SHHH: farther reach, faster recharge |
| **Rishit** | Columbia (ED) | policy + environmental science | Bikes everywhere: faster on foot, quicker dash |
| **Bryan** | Princeton (SCEA) | engineering | Essay lines count more; immune to noise fog |

Pick a difficulty for every run: **Easy** (chill, long breathers), **Normal** (bigger waves, a steady trickle of trouble, longer essays) or **Hard** (relentless, no safety net). Harder settings multiply your score.

New players start with **Orientation Night**, an interactive tutorial hosted by Ms. Okafor the librarian. It plays before story mode (skip with Esc or Tab) and is on the main menu.

## Play

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```sh
npx http-server .   # then open http://localhost:8080
```

`node tools/build.mjs` bundles everything into a single self-contained file at `dist/miller-branch-library.html`.

## Controls

| Action | Keyboard | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | WASD / arrows | left stick / d-pad | left-side joystick |
| Interact (confiscate, fix, grab, pep talk, sit) | Space / E / Enter | A | ACT |
| Dash (flip roombas, bonk birds, tackle raccoons) | Shift / K | B | DASH |
| SHHH (silence talkers, gossips, toddlers, ghosts) | Q / L | X / Y | SHHH |
| Pick an essay line (while seated) | ← ↑ → (or A W D, or click) | d-pad | tap a card |
| Stand up | ↓ / S / Shift | B | DASH |
| Pause / mute | Esc / M | Start | II button |

## How it works

- **Waves, then calm.** Distractions arrive in short rushes with real breathing room between them. Anything you ignore eventually sorts itself out (the ring around each alert shows how long), so problems never snowball. Fixing them fast just earns more.
- **Groove mode.** A calm library fills the Groove meter. At full, everyone writes 70% faster, nothing new goes wrong, and points double.
- **Focus rings.** Every friend has one. Nearby noise drains it; quiet lets it recover. At zero they wander off to doomscroll until you pep-talk them back.
- **Progress bars.** Focused friends write faster. A full bar means SUBMITTED. Each night has a quota; missing it uses up one of your extensions (how many depends on difficulty) before the run is over.
- **Proofreading.** Once your own essay is submitted, sit back down: every line you write now boosts whichever friend is furthest behind, so there's never dead time.
- **Your essay.** Sit down and build it line by line. Three cards appear; the admissions reader wants HEART, WIT or GRIT, so pick the line that matches. Avoid the grey CLASSIC clichés. Noise near your seat fogs a card. The report card quotes your best line.
- **Flow.** Fix things quickly and back to back to build a points multiplier up to x8. SHHH two things at once for a multi-shush bonus.
- **Coffee and pizza.** Vending-machine coffee wakes nappers, boosts a friend, or turbo-charges your own typing. A surprise pizza delivery can be shared slice by slice.
- **Study Hacks.** After each night you pick 1 of 3 upgrades (Cold Brew, Double Dash, Lo-Fi Playlist, Encore, Thesaurus Pro, Ethernet Cable, and more). They stack across the run.
- **Story mode** with a prologue, a cutscene before every night, a finale and voiced-in-text reactions on Decision Day. Each character also has their own chatter while they study (skip any scene with Esc).
- **Decision Day.** Finish the campaign to see who gets in where.
- **Rolling Admissions** is an endless mode with escalating nights and a saved high score.

### The 16 distractions

Phone Buzz, Loud Talker, Rogue Roomba, Book Avalanche, Printer Jam (timing minigame), Wi-Fi Down (hold), Pigeon Invasion (bats on Halloween), Senioritis Nap, Pizza Delivery, Storytime Escape (carry toddlers back to the rug), Ceiling Leak (fetch a bucket), The Gossip (intercept them), Power Outage (flashlight mode), Fire Alarm (arrow-code minigame), Raccoon Heist, and the Library Ghost.

## Art and sound

Everything is generated in code. There are no image or audio files.

- **Visuals:** Canvas 2D with ink outlines that re-jitter several times a second ("line boil") for a hand-animated look, cel-shaded characters, a baked light map with warm lamp pools, laptop glow and moonlight, and a flashlight cone during outages. The windows show the sky moving from dusk to midnight with per-night weather: wind and leaves, rain, fog, and a Halloween moon.
- **Setting:** the library is modeled on the real Miller Branch (Howard County Library System, Ellicott City, MD): the stacked-stone wall with its row of small square windows, the long glass curtain wall, the copper-panel tower, the lawn and the iron fence.
- **Audio:** WebAudio synthesis for every sound effect. The soundtrack is a small sequencer playing composed songs, each with its own chords, melody, instruments, groove and texture (vinyl crackle, rain):

  | Where | Track | Feel |
  | --- | --- | --- |
  | Title | Dusk at Miller Branch | lazy Rhodes lo-fi, flute |
  | Night 1 | Lamplight Lo-fi | swung lo-fi, whistled hook |
  | Night 2 | Bossa for Supplementals | bossa nova, plucked guitar, flute |
  | Night 3 | Rain on the Copper Roof | half-time piano arpeggios, bells, rain |
  | Night 4 | 150 Characters (8-bit Mix) | chiptune arps, synth drums |
  | Night 5 | Dewey's Monster Shuffle | spooky organ swing, walking bass, theremin |
  | Tutorial | Orientation | jazzy piano comping |
  | Cutscenes | Library Lore / Dewey / Decision Day | music box, eerie theremin for the ghost, brass fanfare for the wins |

  Rolling Admissions cycles through the night tracks. Busy moments and Groove thicken the arrangement and add improvised fills. In the last real minute of a night (**CRUNCH TIME**, with a seconds countdown on the clock), the song modulates up a step and speeds up toward midnight, and the drums go four-on-the-floor with ticking blocks, snare rolls and crashes that get more chaotic as time runs out. Cutscenes switch tracks on cue (`['music', id]` steps in `js/story.js`).

## Code map

```
index.html, style.css   page shell
js/util.js      math, RNG, storage helpers
js/audio.js     synthesized SFX + song sequencer (per-night tracks, crunch mode)
js/art.js       hand-drawn rendering kit: characters, critters, props, icons
js/world.js     library layout, collision, A* pathfinding, pre-rendered art, sky, lighting
js/entities.js  player, students, walking NPCs, particles
js/events.js    the 16 distraction events
js/essay.js     the essay line-picking minigame and its writing
js/game.js      input, nights, upgrades, scoring, the night simulation and world render
js/hud.js       in-game HUD, prompts, essay laptop, minigames
js/screens.js   title (library exterior), character select, intros, report cards, upgrades, ending
js/story.js     character voices, story scripts and the cutscene player
js/tutorial.js  Orientation Night, the interactive tutorial
js/main.js      boot, scaling, keyboard/mouse/touch/gamepad, transitions, main loop
```
