// Verbatim copy of App.tsx's current generators (round 1 baseline).
import { SAMPLE_RATE } from './dsp-lab.mjs';

export function pinkGenerator() {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  return () => {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
    return pink;
  };
}

export function brownGenerator() {
  let last = 0;
  return () => {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    return last * 3.5;
  };
}

export function whiteGenerator() {
  return () => Math.random() * 2 - 1;
}

export function rainGenerator() {
  const white = whiteGenerator();
  let hp = 0, lastW = 0, dropEnv = 0;
  return () => {
    const w = white();
    hp = hp * 0.7 + (w - lastW) * 0.7;
    lastW = w;
    if (dropEnv <= 0.002 && Math.random() < 0.006) dropEnv = 0.5 + Math.random() * 0.5;
    const drop = dropEnv * (Math.random() * 2 - 1);
    dropEnv *= 0.7;
    // Broadband click impulses (drop, and campfire's pop) have near-
    // identical spectral shape to each other regardless of amplitude -
    // rain's overall spectrum was ~99% shaped by its drops rather than
    // its own hiss, making rain measurably indistinguishable from any
    // other click-driven texture (campfire included). Toned drops down
    // and brightened the sustained hiss so rain reads as hiss-with-
    // patter, not patter-with-a-background.
    return hp * 1.25 + drop * 0.35;
  };
}

export function oceanGenerator() {
  const pink = pinkGenerator();
  let lp = 0, t = 0, foamEnv = 0;
  return () => {
    const base = pink();
    lp = lp * 0.9 + base * 0.1;
    t += 1;
    const phase = (t / SAMPLE_RATE) * 2 * Math.PI * 0.2;
    const swell = 0.35 + 0.65 * Math.pow((1 + Math.sin(phase)) / 2, 1.5);
    if (foamEnv <= 0.001 && swell > 0.85 && Math.random() < 0.002) foamEnv = 0.6;
    const foam = foamEnv * (Math.random() * 2 - 1);
    foamEnv *= 0.9996;
    // Was lp*4.5 - overran +-1 on ~5% of samples and was almost entirely
    // sub-100Hz. Lower gain plus a touch of the unfiltered wash brings in
    // some mid content so it reads as "water," not just a bass swell.
    const wash = base * 0.35 * swell;
    return lp * 2.6 * swell + wash + foam * 0.7;
  };
}

export function windGenerator() {
  const brown = brownGenerator();
  const white = whiteGenerator();
  let t = 0;
  return () => {
    const base = brown();
    t += 1;
    const sec = t / SAMPLE_RATE;
    const gust = 0.4 + 0.6 * Math.pow((1 + Math.sin(sec * 2 * Math.PI * 0.22)) / 2, 2);
    const hiss = white() * 0.3 * gust;
    // Was base*(0.5+gust), peaking at 1.5x base during strong gusts -
    // trimmed the gust ceiling slightly so peak gusts don't overshoot.
    return base * (0.45 + gust * 0.9) + hiss;
  };
}

export function campfireGenerator() {
  const pink = pinkGenerator();
  const brown = brownGenerator();
  let popEnv = 0;
  return () => {
    // Was pink*0.45+brown*0.35 - once pops were toned down, this base's
    // heavy brown() component measured 0.95 similar to wind (also
    // brown-based). Shifted toward pink for a warmer, more midrange
    // "crackling" character instead of a deep rumble that overlaps wind.
    const base = pink() * 0.7 + brown() * 0.12;
    if (popEnv <= 0.002 && Math.random() < 0.06) popEnv = 0.6 + Math.random() * 0.6;
    const pop = popEnv * (Math.random() * 2 - 1);
    popEnv *= 0.8;
    // Pops are broadband/white-ish clicks, same as rain's drops - at 0.85
    // they were loud enough to pull campfire's whole spectral identity
    // toward "generic white click track," diluting its actual warm
    // pink+brown base (measured 0.90 spectral similarity to rain).
    // Sharp transients read as audible pops even at lower level because
    // of their attack, not their average loudness - toned down so the
    // warm base carries campfire's identity and pops stay an accent.
    return base + pop * 0.4;
  };
}

export function thunderGenerator() {
  let lp = 0, texture = 0, t = 0, boom = 0;
  return () => {
    t += 1;
    const sec = t / SAMPLE_RATE;
    const w = Math.random() * 2 - 1;
    lp = lp * 0.997 + w * 0.003;
    // Was a 0.9-coefficient one-pole floor mixed in at only *0.06 - almost
    // inaudible, leaving thunder as pure sub-bass with no texture at all.
    // Bumped the mix so there's a quiet, still-dark rumble-texture bed
    // (this one-pole is still well below 1kHz, so it stays a bass sound).
    texture = texture * 0.9 + w * 0.1;
    const roll = 0.5 + 0.3 * Math.sin(sec * 2 * Math.PI * 0.07) + 0.2 * Math.sin(sec * 2 * Math.PI * 0.13 + 1.4);
    if (boom <= 0.002 && Math.random() < 0.0006) boom = 0.7 + Math.random() * 0.3;
    boom *= 0.9992;
    const rumble = lp * 8 * Math.max(0.15, roll) + lp * boom * 4;
    return rumble + texture * 0.16;
  };
}

export function boxFanGenerator() {
  let phase = 0, lp = 0;
  return () => {
    phase += 1;
    const hum = Math.sin((2 * Math.PI * 120 * phase) / SAMPLE_RATE) * 0.32 +
      Math.sin((2 * Math.PI * 240 * phase) / SAMPLE_RATE) * 0.14 +
      Math.sin((2 * Math.PI * 60 * phase) / SAMPLE_RATE) * 0.1;
    const w = Math.random() * 2 - 1;
    lp = lp * 0.6 + w * 0.4;
    return hum + lp * 0.55;
  };
}

export function towerFanGenerator() {
  let phase = 0, lp = 0;
  return () => {
    phase += 1;
    const hum = Math.sin((2 * Math.PI * 180 * phase) / SAMPLE_RATE) * 0.12;
    const w = Math.random() * 2 - 1;
    lp = lp * 0.75 + w * 0.25;
    return hum + lp * 0.8;
  };
}

export function ceilingFanGenerator() {
  let phase = 0, lp = 0, t = 0;
  return () => {
    phase += 1; t += 1;
    const flutter = 0.85 + 0.15 * Math.sin((t / SAMPLE_RATE) * 2 * Math.PI * 3.2);
    const hum = (Math.sin((2 * Math.PI * 55 * phase) / SAMPLE_RATE) * 0.34 +
      Math.sin((2 * Math.PI * 110 * phase) / SAMPLE_RATE) * 0.1) * flutter;
    const w = Math.random() * 2 - 1;
    lp = lp * 0.65 + w * 0.35;
    return hum + lp * 0.35 * flutter;
  };
}

export function acUnitGenerator() {
  let phase = 0, lp = 0;
  return () => {
    phase += 1;
    const hum = Math.sin((2 * Math.PI * 45 * phase) / SAMPLE_RATE) * 0.28 +
      Math.sin((2 * Math.PI * 91 * phase) / SAMPLE_RATE) * 0.16 +
      Math.sin((2 * Math.PI * 136 * phase) / SAMPLE_RATE) * 0.08;
    const w = Math.random() * 2 - 1;
    lp = lp * 0.55 + w * 0.45;
    return hum + lp * 0.65;
  };
}

export function largeFloorFanGenerator() {
  let phase = 0, lp = 0;
  return () => {
    phase += 1;
    const hum = Math.sin((2 * Math.PI * 80 * phase) / SAMPLE_RATE) * 0.3 +
      Math.sin((2 * Math.PI * 160 * phase) / SAMPLE_RATE) * 0.1;
    const w = Math.random() * 2 - 1;
    lp = lp * 0.82 + w * 0.18;
    return hum + lp * 0.75;
  };
}

export function smallDeskFanGenerator() {
  let phase = 0, lp = 0;
  return () => {
    phase += 1;
    const hum = Math.sin((2 * Math.PI * 260 * phase) / SAMPLE_RATE) * 0.16 +
      Math.sin((2 * Math.PI * 520 * phase) / SAMPLE_RATE) * 0.07 +
      Math.sin((2 * Math.PI * 40 * phase) / SAMPLE_RATE) * 0.08;
    const w = Math.random() * 2 - 1;
    lp = lp * 0.5 + w * 0.5;
    return hum + lp * 0.4;
  };
}

export function cricketsGenerator() {
  const pink = pinkGenerator();
  let lp = 0, t = 0;
  return () => {
    t += 1;
    const floor = pink();
    lp = lp * 0.9 + floor * 0.1;
    const cycleLen = Math.round(SAMPLE_RATE * 0.6);
    const cyclePos = (t % cycleLen) / SAMPLE_RATE;
    let chirp = 0;
    for (const start of [0, 0.09]) {
      const dt = cyclePos - start;
      if (dt >= 0 && dt < 0.06) {
        const env = Math.sin(Math.PI * (dt / 0.06));
        chirp += Math.sin((2 * Math.PI * 4200 * t) / SAMPLE_RATE) * env * 0.9;
      }
    }
    return lp * 0.25 + chirp;
  };
}

export function binauralPair(carrierHz, beatHz) {
  const pinkL = pinkGenerator();
  const pinkR = pinkGenerator();
  let phaseL = 0, phaseR = 0;
  const left = () => {
    phaseL += 1;
    return Math.sin((2 * Math.PI * carrierHz * phaseL) / SAMPLE_RATE) * 0.35 + pinkL() * 0.04;
  };
  const right = () => {
    phaseR += 1;
    return Math.sin((2 * Math.PI * (carrierHz + beatHz) * phaseR) / SAMPLE_RATE) * 0.35 + pinkR() * 0.04;
  };
  return { left, right };
}

export function padGenerator(freqs, speed, warmth) {
  const phases = freqs.map(() => 0);
  const vibPhases = freqs.map((_, i) => i * 1.3);
  const pink = pinkGenerator();
  let lp = 0, t = 0;
  return () => {
    t += 1;
    const sec = t / SAMPLE_RATE;
    let sum = 0;
    for (let i = 0; i < freqs.length; i++) {
      const vib = 1 + 0.003 * Math.sin(sec * 2 * Math.PI * 0.07 * speed + vibPhases[i]);
      phases[i] += (2 * Math.PI * freqs[i] * vib) / SAMPLE_RATE;
      sum += Math.sin(phases[i]);
    }
    sum /= freqs.length;
    const tremolo = 0.75 + 0.25 * Math.sin(sec * 2 * Math.PI * 0.05 * speed);
    const n = pink();
    lp = lp * 0.95 + n * 0.05;
    return sum * 0.5 * tremolo + lp * warmth;
  };
}
