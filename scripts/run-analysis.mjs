import { analyze } from './dsp-lab.mjs';
import * as G from './gens-v1.mjs';

const kinds = process.argv.slice(2);
const all = {
  white: () => G.whiteGenerator(),
  pink: () => G.pinkGenerator(),
  brown: () => G.brownGenerator(),
  rain: () => G.rainGenerator(),
  ocean: () => G.oceanGenerator(),
  wind: () => G.windGenerator(),
  campfire: () => G.campfireGenerator(),
  thunder: () => G.thunderGenerator(),
  boxfan: () => G.boxFanGenerator(),
  towerfan: () => G.towerFanGenerator(),
  ceilingfan: () => G.ceilingFanGenerator(),
  acunit: () => G.acUnitGenerator(),
  largefloorfan: () => G.largeFloorFanGenerator(),
  smalldeskfan: () => G.smallDeskFanGenerator(),
  crickets: () => G.cricketsGenerator(),
  music_soothe: () => G.padGenerator([130.81, 164.81, 196.0], 1, 0.05),
  music_deepsleep: () => G.padGenerator([98.0, 123.47, 146.83], 0.5, 0.08),
  music_ultrarelax: () => G.padGenerator([196.0, 246.94, 293.66, 392.0], 1.3, 0.03),
  music_healingcalm: () => G.padGenerator([110.0, 138.59, 164.81], 0.35, 0.09),
  binaural_delta: () => G.binauralPair(200, 2).left,
  binaural_theta: () => G.binauralPair(210, 6).left,
  binaural_alpha: () => G.binauralPair(220, 10).left,
};

const targets = kinds.length ? kinds : Object.keys(all);
for (const k of targets) {
  if (!all[k]) { console.log(`unknown kind: ${k}`); continue; }
  analyze(k, all[k]());
}
