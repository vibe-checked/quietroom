import { SAMPLE_RATE } from './dsp-lab.mjs';
import * as G from './gens-v3.mjs';

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cwr = 1, cwi = 0;
      for (let j = 0; j < len / 2; j++) {
        const ur = re[i + j], ui = im[i + j];
        const vr = re[i + j + len / 2] * cwr - im[i + j + len / 2] * cwi;
        const vi = re[i + j + len / 2] * cwi + im[i + j + len / 2] * cwr;
        re[i + j] = ur + vr; im[i + j] = ui + vi;
        re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi;
        const ncwr = cwr * wr - cwi * wi, ncwi = cwr * wi + cwi * wr;
        cwr = ncwr; cwi = ncwi;
      }
    }
  }
}

// Fine-grained spectrum (32 log-spaced bins 20Hz-20kHz) for a real
// similarity comparison, finer than the 5 coarse bands used elsewhere.
function spectrum32(sampleFn, seconds = 4) {
  const N = 1 << 17;
  const n = Math.round(SAMPLE_RATE * seconds);
  const raw = new Float64Array(n);
  for (let i = 0; i < n; i++) raw[i] = sampleFn();
  const start = Math.max(0, Math.floor(n / 2) - N / 2);
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
    re[i] = (raw[start + i] || 0) * w;
  }
  fft(re, im);
  const bins = new Float64Array(32);
  const fMin = 20, fMax = 20000;
  for (let k = 1; k < N / 2; k++) {
    const freq = (k * SAMPLE_RATE) / N;
    if (freq < fMin || freq > fMax) continue;
    const bin = Math.min(31, Math.floor((Math.log(freq / fMin) / Math.log(fMax / fMin)) * 32));
    bins[bin] += re[k] * re[k] + im[k] * im[k];
  }
  const total = bins.reduce((a, b) => a + b, 0) || 1;
  for (let i = 0; i < 32; i++) bins[i] /= total;
  return bins;
}

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

const fans = {
  boxfan: () => G.boxFanGenerator(),
  towerfan: () => G.towerFanGenerator(),
  ceilingfan: () => G.ceilingFanGenerator(),
  acunit: () => G.acUnitGenerator(),
  largefloorfan: () => G.largeFloorFanGenerator(),
  smalldeskfan: () => G.smallDeskFanGenerator(),
};
const noise = { white: () => G.whiteGenerator(), pink: () => G.pinkGenerator(), brown: () => G.brownGenerator() };
const nature = {
  rain: () => G.rainGenerator(), ocean: () => G.oceanGenerator(), wind: () => G.windGenerator(),
  campfire: () => G.campfireGenerator(), thunder: () => G.thunderGenerator(), crickets: () => G.cricketsGenerator(),
};

function checkGroup(name, group) {
  const keys = Object.keys(group);
  const specs = {};
  for (const k of keys) specs[k] = spectrum32(group[k]());
  console.log(`\n--- ${name} pairwise spectral similarity (1.0 = identical) ---`);
  let maxSim = 0, maxPair = '';
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const sim = cosineSim(specs[keys[i]], specs[keys[j]]);
      console.log(`  ${keys[i]} vs ${keys[j]}: ${sim.toFixed(3)}${sim > 0.85 ? '  <-- too similar' : ''}`);
      if (sim > maxSim) { maxSim = sim; maxPair = `${keys[i]}/${keys[j]}`; }
    }
  }
  console.log(`  most similar pair: ${maxPair} (${maxSim.toFixed(3)})`);
}

checkGroup('Fans', fans);
checkGroup('Noise', noise);
checkGroup('Nature', nature);
