# The Miller Branch Library

A hand-drawn arcade game about keeping your high school study group focused through one very chaotic week at the library before the **Nov 1 college application deadline**.

Rogue Roombas, speakerphone talkers, pigeons in the stacks, a raccoon with your flash drive, a fire alarm, a power outage and, on Halloween night, a library ghost who only respects a proper *SHHH*. Keep your friends focused, write your own essay between emergencies, and get enough applications submitted before midnight, five nights in a row.

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
| Write your essay (while seated) | mash any key | mash A | tap ACT |
| Pause / mute | Esc / M | Start | II button |

## How it works

- **Focus rings.** Every friend has one. Nearby noise drains it; quiet lets it recover. At zero they wander off to doomscroll until you pep-talk them back.
- **Progress bars.** Focused friends write faster. A full bar means SUBMITTED. Each night has a quota; miss it and you're deferred (you can retry the night).
- **Your essay.** It only moves while you sit at your seat and type. Noise nearby causes typos. Leaving your seat to fight fires is the core tension.
- **Flow.** Fix things quickly and back to back to build a points multiplier up to x8.
- **Coffee and pizza.** Vending-machine coffee wakes nappers, boosts a friend, or turbo-charges your own typing. A surprise pizza delivery can be shared slice by slice.
- **Study Hacks.** After each night you pick 1 of 3 upgrades (Cold Brew, Double Dash, Lo-Fi Playlist, Ethernet Cable, and more). They stack across the run.
- **Four playable leads** with different strengths: Riley the Captain, Dev the Track Star, Priya the Debate Captain, June the Valedictorian.
- **Decision Day.** Finish the campaign to see who gets in where.
- **Rolling Admissions** is an endless mode with escalating nights and a saved high score.

### The 16 distractions

Phone Buzz, Loud Talker, Rogue Roomba, Book Avalanche, Printer Jam (timing minigame), Wi-Fi Down (hold), Pigeon Invasion (bats on Halloween), Senioritis Nap, Pizza Delivery, Storytime Escape (carry toddlers back to the rug), Ceiling Leak (fetch a bucket), The Gossip (intercept them), Power Outage (flashlight mode), Fire Alarm (arrow-code minigame), Raccoon Heist, and the Library Ghost.

## Art and sound

Everything is generated in code. There are no image or audio files.

- **Visuals:** Canvas 2D with ink outlines that re-jitter several times a second ("line boil") for a hand-animated look, cel-shaded characters, a baked light map with warm lamp pools, laptop glow and moonlight, and a flashlight cone during outages. The windows show the sky moving from dusk to midnight with per-night weather: wind and leaves, rain, fog, and a Halloween moon.
- **Setting:** the library is modeled on the real Miller Branch (Howard County Library System, Ellicott City, MD): the stacked-stone wall with its row of small square windows, the long glass curtain wall, the copper-panel tower, the lawn and the iron fence.
- **Audio:** WebAudio synthesis for every sound effect and a procedural lo-fi soundtrack that speeds up and layers in percussion as chaos rises. It goes spooky on Halloween.

## Code map

```
index.html, style.css   page shell
js/util.js      math, RNG, storage helpers
js/audio.js     synthesized SFX + procedural music
js/art.js       hand-drawn rendering kit: characters, critters, props, icons
js/world.js     library layout, collision, A* pathfinding, pre-rendered art, sky, lighting
js/entities.js  player, students, walking NPCs, particles
js/events.js    the 16 distraction events
js/game.js      input, nights, upgrades, scoring, the night simulation and world render
js/hud.js       in-game HUD, prompts, essay laptop, minigames
js/screens.js   title (library exterior), character select, intros, report cards, upgrades, ending
js/main.js      boot, scaling, keyboard/mouse/touch/gamepad, transitions, main loop
```
