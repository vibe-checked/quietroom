import { analyze } from './dsp-lab.mjs';
import * as G from './gens-v3.mjs';

// Output gain applied at the per-SoundKind level (NOT inside the shared
// primitives, which rain/wind/ocean/campfire/crickets/pads/binaural all
// reuse internally) - normalizes perceived loudness across sounds so the
// same slider position means roughly the same volume everywhere.
const GAIN = {
  white: 0.55, pink: 1.15, brown: 1.2, rain: 0.56, ocean: 0.95, wind: 1.0,
  campfire: 1.1, thunder: 1.4, boxfan: 0.95, towerfan: 1.15, ceilingfan: 1.05,
  acunit: 0.92, largefloorfan: 1.05, smalldeskfan: 1.1, crickets: 1.1,
};

function gained(fn, g) {
  return () => fn() * g;
}

const all = {
  white: () => gained(G.whiteGenerator(), GAIN.white),
  pink: () => gained(G.pinkGenerator(), GAIN.pink),
  brown: () => gained(G.brownGenerator(), GAIN.brown),
  rain: () => gained(G.rainGenerator(), GAIN.rain),
  ocean: () => gained(G.oceanGenerator(), GAIN.ocean),
  wind: () => gained(G.windGenerator(), GAIN.wind),
  campfire: () => gained(G.campfireGenerator(), GAIN.campfire),
  thunder: () => gained(G.thunderGenerator(), GAIN.thunder),
  boxfan: () => gained(G.boxFanGenerator(), GAIN.boxfan),
  towerfan: () => gained(G.towerFanGenerator(), GAIN.towerfan),
  ceilingfan: () => gained(G.ceilingFanGenerator(), GAIN.ceilingfan),
  acunit: () => gained(G.acUnitGenerator(), GAIN.acunit),
  largefloorfan: () => gained(G.largeFloorFanGenerator(), GAIN.largefloorfan),
  smalldeskfan: () => gained(G.smallDeskFanGenerator(), GAIN.smalldeskfan),
  crickets: () => gained(G.cricketsGenerator(), GAIN.crickets),
  music_soothe: () => G.padGenerator([130.81, 164.81, 196.0], 1, 0.05),
  music_deepsleep: () => G.padGenerator([98.0, 123.47, 146.83], 0.5, 0.08),
  music_ultrarelax: () => G.padGenerator([196.0, 246.94, 293.66, 392.0], 1.3, 0.03),
  music_healingcalm: () => G.padGenerator([110.0, 138.59, 164.81], 0.35, 0.09),
  binaural_delta: () => G.binauralPair(200, 2).left,
  binaural_theta: () => G.binauralPair(210, 6).left,
  binaural_alpha: () => G.binauralPair(220, 10).left,
};

const targets = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(all);
for (const k of targets) {
  if (!all[k]) { console.log(`unknown kind: ${k}`); continue; }
  analyze(k, all[k]());
}
