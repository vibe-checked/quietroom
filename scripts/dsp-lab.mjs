// Fast, listen-free DSP quality harness. Extracts each generator's
// behavior into plain analysis: DC offset, RMS/peak, crest factor,
// spectral band energy (via a real FFT), and periodicity strength
// (autocorrelation) to catch audible looping artifacts.
//
// Run: node scripts/dsp-lab.mjs [kind ...]

const SAMPLE_RATE = 44100;

// tanh(x) applied uniformly distorts every sample, even ones nowhere near
// the ceiling - tanh(0.4)=0.380 vs the linear 0.4, a ~5% deviation that's
// pure unwanted harmonic coloration on signals that never needed limiting
// (binaural tones peak ~0.38, pads ~0.5). Passthrough below a knee, and
// only compress the excess above it, so quiet/clean signals stay exact.
const SOFT_KNEE = 0.7;
function softClip(x) {
  const ax = Math.abs(x);
  if (ax <= SOFT_KNEE) return x;
  const sign = x > 0 ? 1 : -1;
  const excess = ax - SOFT_KNEE;
  return sign * (SOFT_KNEE + Math.tanh(excess / (1 - SOFT_KNEE)) * (1 - SOFT_KNEE));
}

// ---- FFT (iterative radix-2, real input via zero-padded complex) ----
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
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
        const ncwr = cwr * wr - cwi * wi;
        const ncwi = cwr * wi + cwi * wr;
        cwr = ncwr; cwi = ncwi;
      }
    }
  }
}

function bandEnergy(samples, sr) {
  // Use a 2^17 window (~2.97s at 44.1kHz) from the middle of the buffer.
  const N = 1 << 17;
  const start = Math.max(0, Math.floor(samples.length / 2) - N / 2);
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)); // Hann window
    re[i] = (samples[start + i] || 0) * w;
  }
  fft(re, im);
  const bands = { sub: 0, low: 0, mid: 0, high: 0, air: 0 };
  let total = 0;
  for (let k = 1; k < N / 2; k++) {
    const freq = (k * sr) / N;
    const mag = re[k] * re[k] + im[k] * im[k];
    total += mag;
    if (freq < 100) bands.sub += mag;
    else if (freq < 500) bands.low += mag;
    else if (freq < 2000) bands.mid += mag;
    else if (freq < 6000) bands.high += mag;
    else bands.air += mag;
  }
  for (const k of Object.keys(bands)) bands[k] = total > 0 ? bands[k] / total : 0;
  return bands;
}

function autocorrPeriodicity(samples, sr) {
  // Detect strong short-period periodicity (a buzz/whine artifact) by
  // checking autocorrelation at lags corresponding to 20Hz-2000Hz.
  const N = Math.min(samples.length, sr * 1); // 1s window
  const seg = samples.slice(0, N);
  let mean = 0;
  for (let i = 0; i < N; i++) mean += seg[i];
  mean /= N;
  let energy = 0;
  for (let i = 0; i < N; i++) energy += (seg[i] - mean) * (seg[i] - mean);
  let maxCorr = 0, maxLagHz = 0;
  const minLag = Math.floor(sr / 2000);
  const maxLag = Math.floor(sr / 20);
  for (let lag = minLag; lag <= maxLag; lag += Math.max(1, Math.floor(lag / 200))) {
    let corr = 0;
    for (let i = 0; i < N - lag; i++) corr += (seg[i] - mean) * (seg[i + lag] - mean);
    corr /= energy || 1;
    if (corr > maxCorr) { maxCorr = corr; maxLagHz = sr / lag; }
  }
  return { strength: maxCorr, freqHz: maxLagHz };
}

function analyze(name, sampleFn, seconds = 6) {
  const n = Math.round(SAMPLE_RATE * seconds);
  const raw = new Float64Array(n);
  for (let i = 0; i < n; i++) raw[i] = sampleFn();
  const clipped = new Float64Array(n);
  let sum = 0, sumsq = 0, peak = 0, preClipPeak = 0, hardClipCount = 0;
  for (let i = 0; i < n; i++) {
    const r = raw[i];
    preClipPeak = Math.max(preClipPeak, Math.abs(r));
    if (Math.abs(r) > 1) hardClipCount++;
    const s = softClip(r);
    clipped[i] = s;
    sum += s;
    sumsq += s * s;
    peak = Math.max(peak, Math.abs(s));
  }
  const mean = sum / n;
  const rms = Math.sqrt(sumsq / n);
  const crest = peak / (rms || 1e-9);
  const bands = bandEnergy(clipped, SAMPLE_RATE);
  const period = autocorrPeriodicity(clipped, SAMPLE_RATE);
  console.log(`\n=== ${name} ===`);
  console.log(`  rms=${rms.toFixed(3)}  peak=${peak.toFixed(3)}  preClipPeak=${preClipPeak.toFixed(3)}  dcOffset=${mean.toFixed(4)}  crest=${crest.toFixed(2)}`);
  console.log(`  bands: sub<100=${(bands.sub*100).toFixed(1)}% low<500=${(bands.low*100).toFixed(1)}% mid<2k=${(bands.mid*100).toFixed(1)}% high<6k=${(bands.high*100).toFixed(1)}% air>6k=${(bands.air*100).toFixed(1)}%`);
  console.log(`  periodicity: strength=${period.strength.toFixed(3)} at ${period.freqHz.toFixed(0)}Hz${period.strength > 0.35 ? '  <-- CHECK (possible audible tone/buzz artifact)' : ''}`);
  if (Math.abs(mean) > 0.01) console.log(`  ! DC offset above 0.01 - may sound like a faint thump on loop or waste headroom`);
  if (hardClipCount > 0) console.log(`  ! ${hardClipCount} samples (${(hardClipCount/n*100).toFixed(2)}%) exceeded +-1 before soft-clip`);
  return { rms, peak, mean, crest, bands, period };
}

export { analyze, SAMPLE_RATE };
