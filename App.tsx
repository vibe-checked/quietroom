import { StatusBar } from 'expo-status-bar';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type SoundKind =
  | 'white'
  | 'pink'
  | 'brown'
  | 'rain'
  | 'ocean'
  | 'wind'
  | 'campfire'
  | 'thunder'
  | 'boxfan'
  | 'towerfan'
  | 'ceilingfan'
  | 'acunit'
  | 'crickets'
  | 'binaural_delta'
  | 'binaural_theta'
  | 'binaural_alpha';

const BINAURAL_KINDS: SoundKind[] = ['binaural_delta', 'binaural_theta', 'binaural_alpha'];

const SOUNDS: { kind: SoundKind; label: string; tagline: string }[] = [
  { kind: 'white', label: 'White', tagline: 'Crisp, even hiss — like an old radio tuned between stations.' },
  { kind: 'pink', label: 'Pink', tagline: 'Softer, lower energy — closer to leaves in wind.' },
  { kind: 'brown', label: 'Brown', tagline: 'Deep, rumbling roll — surf, or a distant waterfall.' },
  { kind: 'rain', label: 'Rain', tagline: 'Filtered noise with scattered patter — steady, soothing.' },
  { kind: 'ocean', label: 'Ocean', tagline: 'Slow rolling waves rising and falling on a shore.' },
  { kind: 'wind', label: 'Wind', tagline: 'Gusting air moving through open space.' },
  { kind: 'campfire', label: 'Campfire', tagline: 'Warm crackle and pop of a low fire.' },
  { kind: 'thunder', label: 'Thunder', tagline: 'Distant rolling rumble beneath a steady rain.' },
  { kind: 'boxfan', label: 'Box Fan', tagline: 'The classic bedroom box fan — steady hum and moving air.' },
  { kind: 'towerfan', label: 'Tower Fan', tagline: 'Smoother, airier whoosh — less motor, more breeze.' },
  { kind: 'ceilingfan', label: 'Ceiling Fan', tagline: 'Deep, slow-turning hum with a gentle blade flutter.' },
  { kind: 'acunit', label: 'Window AC', tagline: 'A rattly compressor drone — cool, steady, a little buzzy.' },
  { kind: 'crickets', label: 'Night', tagline: 'Quiet dark with a chorus of distant crickets.' },
  { kind: 'binaural_delta', label: 'Deep Sleep', tagline: 'Binaural delta tone (2Hz) — wear headphones for the effect.' },
  { kind: 'binaural_theta', label: 'Relaxation', tagline: 'Binaural theta tone (6Hz) — wear headphones for the effect.' },
  { kind: 'binaural_alpha', label: 'Calm Focus', tagline: 'Binaural alpha tone (10Hz) — wear headphones for the effect.' },
];

const SAMPLE_RATE = 44100;
// Longer loops repeat less obviously — thunder booms, campfire pops, and
// ocean swells no longer land on the exact same beat every few seconds.
const DURATION_SEC = 24;
// Samples of overlap crossfaded between the tail and head so the loop point
// is inaudible instead of clicking on every repeat.
const LOOP_CROSSFADE_SEC = 0.75;
const SAMPLES_DIR = `${FileSystem.cacheDirectory}quietroom-samples-v3/`;

const TIMER_OPTIONS = [0, 15, 30, 45, 60, 90];
const DEFAULT_VOLUME = 0.7;
const FADE_SECONDS = 5;
const STORAGE_KEY = 'quietroom:config:v2';

function writeStr(view: DataView, off: number, s: string) {
  for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
}

// Smooth saturation instead of a hard clamp — generators occasionally peak
// past +-1 by design (pops, booms), and hard-clamping those turns them into
// harsh digital clipping. tanh rounds the peaks off instead.
function softClip(x: number): number {
  return Math.tanh(x);
}

// Renders `n` + one crossfade window of continuous samples, then blends the
// crossfade window (tail-continuation into head) so sample[0] picks up
// smoothly from sample[n-1] when the buffer loops — eliminates the seam
// click that a naive loop of raw generator output would have.
function renderLoopable(n: number, cf: number, sampleFn: () => number): Float64Array {
  const raw = new Float64Array(n + cf);
  for (let i = 0; i < n + cf; i++) raw[i] = sampleFn();
  const out = new Float64Array(n);
  for (let i = cf; i < n; i++) out[i] = raw[i];
  for (let i = 0; i < cf; i++) {
    const t = i / cf;
    out[i] = raw[i] * t + raw[n + i] * (1 - t);
  }
  return out;
}

function genWav(sampleFn: () => number): Uint8Array {
  const n = SAMPLE_RATE * DURATION_SEC;
  const cf = Math.round(SAMPLE_RATE * LOOP_CROSSFADE_SEC);
  const samples = renderLoopable(n, cf, sampleFn);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  writeStr(v, 0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  writeStr(v, 8, 'WAVE');
  writeStr(v, 12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, SAMPLE_RATE, true);
  v.setUint32(28, SAMPLE_RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  writeStr(v, 36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const s = softClip(samples[i]);
    v.setInt16(44 + i * 2, Math.round(s * 32767), true);
  }
  return new Uint8Array(buf);
}

function genWavStereo(leftFn: () => number, rightFn: () => number): Uint8Array {
  const n = SAMPLE_RATE * DURATION_SEC;
  const cf = Math.round(SAMPLE_RATE * LOOP_CROSSFADE_SEC);
  const left = renderLoopable(n, cf, leftFn);
  const right = renderLoopable(n, cf, rightFn);
  const buf = new ArrayBuffer(44 + n * 4);
  const v = new DataView(buf);
  writeStr(v, 0, 'RIFF');
  v.setUint32(4, 36 + n * 4, true);
  writeStr(v, 8, 'WAVE');
  writeStr(v, 12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 2, true);
  v.setUint32(24, SAMPLE_RATE, true);
  v.setUint32(28, SAMPLE_RATE * 4, true);
  v.setUint16(32, 4, true);
  v.setUint16(34, 16, true);
  writeStr(v, 36, 'data');
  v.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) {
    const l = softClip(left[i]);
    const r = softClip(right[i]);
    v.setInt16(44 + i * 4, Math.round(l * 32767), true);
    v.setInt16(44 + i * 4 + 2, Math.round(r * 32767), true);
  }
  return new Uint8Array(buf);
}

// Pink noise using Paul Kellett's filter.
function pinkGenerator() {
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

function brownGenerator() {
  let last = 0;
  return () => {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    return last * 3.5;
  };
}

function whiteGenerator() {
  return () => Math.random() * 2 - 1;
}

// Rain: bright hiss (mild low-pass only, keeps high-frequency "patter"
// character instead of collapsing into a bassy rumble) plus frequent
// short droplet ticks.
function rainGenerator() {
  const white = whiteGenerator();
  let hp = 0;
  let lastW = 0;
  let dropEnv = 0;
  return () => {
    const w = white();
    hp = hp * 0.7 + (w - lastW) * 0.7;
    lastW = w;
    if (dropEnv <= 0.002 && Math.random() < 0.006) {
      dropEnv = 0.5 + Math.random() * 0.5;
    }
    const drop = dropEnv * (Math.random() * 2 - 1);
    dropEnv *= 0.7;
    return hp * 1.6 + drop * 0.9;
  };
}

// Ocean: pink-noise wash with a pronounced, fast-enough swell that two
// full rise-and-fall waves are audible inside a single 10s loop, plus an
// occasional foamy hiss burst as a wave crests.
function oceanGenerator() {
  const pink = pinkGenerator();
  let lp = 0;
  let t = 0;
  let foamEnv = 0;
  return () => {
    const base = pink();
    lp = lp * 0.9 + base * 0.1;
    t += 1;
    const phase = (t / SAMPLE_RATE) * 2 * Math.PI * 0.2;
    const swell = 0.35 + 0.65 * Math.pow((1 + Math.sin(phase)) / 2, 1.5);
    if (foamEnv <= 0.001 && swell > 0.85 && Math.random() < 0.002) {
      foamEnv = 0.6;
    }
    const foam = foamEnv * (Math.random() * 2 - 1);
    foamEnv *= 0.9996;
    return lp * 4.5 * swell + foam;
  };
}

// Wind: brown-noise gusts with a clearly audible rise-and-fall (multiple
// gusts per loop) plus a whistling higher-frequency hiss that swells with it.
function windGenerator() {
  const brown = brownGenerator();
  const white = whiteGenerator();
  let t = 0;
  return () => {
    const base = brown();
    t += 1;
    const sec = t / SAMPLE_RATE;
    const gust = 0.4 + 0.6 * Math.pow((1 + Math.sin(sec * 2 * Math.PI * 0.22)) / 2, 2);
    const hiss = white() * 0.35 * gust;
    return base * (0.5 + gust) + hiss;
  };
}

// Campfire: near-constant crackle-and-pop over a warm low rumble bed.
function campfireGenerator() {
  const pink = pinkGenerator();
  const brown = brownGenerator();
  let popEnv = 0;
  return () => {
    const base = pink() * 0.45 + brown() * 0.35;
    if (popEnv <= 0.002 && Math.random() < 0.06) {
      popEnv = 0.6 + Math.random() * 0.6;
    }
    const pop = popEnv * (Math.random() * 2 - 1);
    popEnv *= 0.8;
    return base + pop;
  };
}

// Thunder: a slow, irregular rolling sub-bass rumble (built from several
// overlapping low-frequency oscillators so it swells unevenly rather than
// pulsing on a fixed beat) with occasional deeper booms — distinct from
// wind's gusting and rain's patter.
function thunderGenerator() {
  let lp = 0;
  let texture = 0;
  let t = 0;
  let boom = 0;
  return () => {
    t += 1;
    const sec = t / SAMPLE_RATE;
    const w = Math.random() * 2 - 1;
    lp = lp * 0.997 + w * 0.003;
    // A softer, mid-passed noise floor well below the rumble in level —
    // present enough to avoid dead silence, quiet enough to stay a bass sound.
    texture = texture * 0.9 + w * 0.1;
    const roll =
      0.5 +
      0.3 * Math.sin(sec * 2 * Math.PI * 0.07) +
      0.2 * Math.sin(sec * 2 * Math.PI * 0.13 + 1.4);
    if (boom <= 0.002 && Math.random() < 0.0006) {
      boom = 0.7 + Math.random() * 0.3;
    }
    boom *= 0.9992;
    const rumble = lp * 9 * Math.max(0.15, roll) + lp * boom * 5;
    return rumble + texture * 0.06;
  };
}

// Box fan: a steady, clearly tonal motor hum (fundamental + harmonic)
// sitting under a constant filtered-noise wash — the classic bedroom fan.
function boxFanGenerator() {
  let phase = 0;
  let lp = 0;
  return () => {
    phase += 1;
    const hum =
      Math.sin((2 * Math.PI * 120 * phase) / SAMPLE_RATE) * 0.32 +
      Math.sin((2 * Math.PI * 240 * phase) / SAMPLE_RATE) * 0.14 +
      Math.sin((2 * Math.PI * 60 * phase) / SAMPLE_RATE) * 0.1;
    const w = Math.random() * 2 - 1;
    lp = lp * 0.6 + w * 0.4;
    return hum + lp * 0.55;
  };
}

// Tower fan: airier and smoother — mostly moving-air hiss with only a
// faint high, quiet hum instead of a heavy motor tone.
function towerFanGenerator() {
  let phase = 0;
  let lp = 0;
  return () => {
    phase += 1;
    const hum = Math.sin((2 * Math.PI * 180 * phase) / SAMPLE_RATE) * 0.12;
    const w = Math.random() * 2 - 1;
    lp = lp * 0.75 + w * 0.25;
    return hum + lp * 0.8;
  };
}

// Ceiling fan: a deep, slow motor with a gentle rhythmic flutter from the
// blades passing overhead.
function ceilingFanGenerator() {
  let phase = 0;
  let lp = 0;
  let t = 0;
  return () => {
    phase += 1;
    t += 1;
    const flutter = 0.85 + 0.15 * Math.sin((t / SAMPLE_RATE) * 2 * Math.PI * 3.2);
    const hum =
      (Math.sin((2 * Math.PI * 55 * phase) / SAMPLE_RATE) * 0.34 +
        Math.sin((2 * Math.PI * 110 * phase) / SAMPLE_RATE) * 0.1) *
      flutter;
    const w = Math.random() * 2 - 1;
    lp = lp * 0.65 + w * 0.35;
    return hum + lp * 0.35 * flutter;
  };
}

// Window AC unit: a lower, slightly beating compressor drone with more
// broadband hiss — reads as rattly/mechanical rather than a clean fan hum.
function acUnitGenerator() {
  let phase = 0;
  let lp = 0;
  return () => {
    phase += 1;
    const hum =
      Math.sin((2 * Math.PI * 45 * phase) / SAMPLE_RATE) * 0.28 +
      Math.sin((2 * Math.PI * 91 * phase) / SAMPLE_RATE) * 0.16 +
      Math.sin((2 * Math.PI * 136 * phase) / SAMPLE_RATE) * 0.08;
    const w = Math.random() * 2 - 1;
    lp = lp * 0.55 + w * 0.45;
    return hum + lp * 0.65;
  };
}

// Crickets: a hushed, near-silent night floor punctuated by sharp, clearly
// audible double-pulse chirps (the two-beat rhythm real crickets make).
function cricketsGenerator() {
  const pink = pinkGenerator();
  let lp = 0;
  let t = 0;
  return () => {
    t += 1;
    const floor = pink();
    lp = lp * 0.9 + floor * 0.1;
    const cycleLen = Math.round(SAMPLE_RATE * 0.6);
    const cyclePos = (t % cycleLen) / SAMPLE_RATE;
    let chirp = 0;
    const pulses = [0, 0.09];
    for (const start of pulses) {
      const dt = cyclePos - start;
      if (dt >= 0 && dt < 0.06) {
        const env = Math.sin(Math.PI * (dt / 0.06));
        chirp += Math.sin((2 * Math.PI * 4200 * t) / SAMPLE_RATE) * env * 0.9;
      }
    }
    return lp * 0.25 + chirp;
  };
}

// Binaural beat: a pure carrier tone in each ear, offset by `beatHz` — the
// brain perceives the difference as a slow pulsing beat. Needs headphones
// to work; a faint pink-noise floor takes the edge off the pure tones.
function binauralPair(carrierHz: number, beatHz: number) {
  const pinkL = pinkGenerator();
  const pinkR = pinkGenerator();
  let phaseL = 0;
  let phaseR = 0;
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

function makeGenerator(kind: SoundKind) {
  switch (kind) {
    case 'white': return whiteGenerator();
    case 'pink': return pinkGenerator();
    case 'brown': return brownGenerator();
    case 'rain': return rainGenerator();
    case 'ocean': return oceanGenerator();
    case 'wind': return windGenerator();
    case 'campfire': return campfireGenerator();
    case 'thunder': return thunderGenerator();
    case 'boxfan': return boxFanGenerator();
    case 'towerfan': return towerFanGenerator();
    case 'ceilingfan': return ceilingFanGenerator();
    case 'acunit': return acUnitGenerator();
    case 'crickets': return cricketsGenerator();
    default:
      throw new Error(`${kind} is a stereo binaural kind — use binauralPair instead`);
  }
}

function makeBinauralPair(kind: SoundKind) {
  switch (kind) {
    case 'binaural_delta': return binauralPair(200, 2);
    case 'binaural_theta': return binauralPair(210, 6);
    case 'binaural_alpha': return binauralPair(220, 10);
    default:
      throw new Error(`${kind} is not a binaural kind`);
  }
}

function uint8ToBase64(buf: Uint8Array): string {
  let binary = '';
  // Process in chunks so we don't blow the call stack on String.fromCharCode.
  const CHUNK = 0x4000;
  for (let i = 0; i < buf.length; i += CHUNK) {
    const slice = buf.subarray(i, Math.min(i + CHUNK, buf.length));
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  // global.btoa is available in React Native.
  // eslint-disable-next-line no-undef
  return (global as any).btoa(binary);
}

async function ensureSampleFile(kind: SoundKind): Promise<string> {
  const path = `${SAMPLES_DIR}${kind}.wav`;
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) return path;
  await FileSystem.makeDirectoryAsync(SAMPLES_DIR, { intermediates: true });
  const wav = BINAURAL_KINDS.includes(kind)
    ? (() => {
        const { left, right } = makeBinauralPair(kind);
        return genWavStereo(left, right);
      })()
    : genWav(makeGenerator(kind));
  const b64 = uint8ToBase64(wav);
  await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
  return path;
}

type Mix = Partial<Record<SoundKind, number>>;
type Preset = { id: string; name: string; mix: Mix };

export default function App() {
  useKeepAwake();
  const [mix, setMix] = useState<Mix>({ pink: DEFAULT_VOLUME });
  const [playing, setPlaying] = useState(false);
  const [busyCount, setBusyCount] = useState(0);
  const [timerMin, setTimerMin] = useState(0); // 0 = no timer
  const [timerEnds, setTimerEnds] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [presets, setPresets] = useState<Preset[]>([]);
  const soundsRef = useRef<Map<SoundKind, Audio.Sound>>(new Map());
  // Bumped on every stop/timer-invalidation; in-flight loads compare
  // against it on resolve and discard themselves if it has moved on,
  // so a stale createAsync can't resurrect an orphaned looping sound.
  const genTokenRef = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await AsyncStorage.getItem(STORAGE_KEY);
        if (cfg) {
          const c = JSON.parse(cfg);
          if (c.mix && typeof c.mix === 'object') setMix(c.mix);
          if (typeof c.timerMin === 'number') setTimerMin(c.timerMin);
          if (Array.isArray(c.presets)) setPresets(c.presets);
        }
      } catch {}
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        });
      } catch {}
    })();
    return () => {
      soundsRef.current.forEach((s) => s.unloadAsync().catch(() => {}));
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ mix, timerMin, presets })).catch(() => {});
  }, [mix, timerMin, presets]);

  // Ticking clock for sleep timer countdown + fade-out display
  useEffect(() => {
    if (timerEnds == null) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [timerEnds]);

  const STOP_FADE_MS = 700;
  const STOP_FADE_STEPS = 10;

  const stop = useCallback(async () => {
    genTokenRef.current += 1;
    const entries = Array.from(soundsRef.current.entries());
    soundsRef.current.clear();
    setBusyCount((c) => c + 1);

    // Fade every active track down to silence before actually stopping —
    // makes even a manual stop feel gentle instead of an abrupt cutoff.
    const startVols = new Map<string, number>();
    await Promise.all(
      entries.map(async ([k, s]) => {
        try {
          const status = await s.getStatusAsync();
          startVols.set(k, status.isLoaded ? status.volume ?? 0 : mix[k] ?? DEFAULT_VOLUME);
        } catch {
          startVols.set(k, mix[k] ?? DEFAULT_VOLUME);
        }
      }),
    );
    for (let step = 1; step <= STOP_FADE_STEPS; step++) {
      const factor = 1 - step / STOP_FADE_STEPS;
      await Promise.all(
        entries.map(([k, s]) => s.setVolumeAsync((startVols.get(k) ?? 0) * factor).catch(() => {})),
      );
      await new Promise((r) => setTimeout(r, STOP_FADE_MS / STOP_FADE_STEPS));
    }

    await Promise.all(
      entries.map(([, s]) =>
        s
          .stopAsync()
          .catch(() => {})
          .then(() => s.unloadAsync().catch(() => {})),
      ),
    );
    setPlaying(false);
    setTimerEnds(null);
    setBusyCount((c) => Math.max(0, c - 1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [mix]);

  // Auto fade-out + stop on timer expiry
  useEffect(() => {
    if (!playing || timerEnds == null) return;
    const remainingSec = (timerEnds - now) / 1000;
    if (remainingSec <= 0) {
      stop();
      return;
    }
    if (remainingSec <= FADE_SECONDS) {
      const factor = Math.max(0, remainingSec / FADE_SECONDS);
      soundsRef.current.forEach((s, k) => {
        const vol = mix[k] ?? DEFAULT_VOLUME;
        s.setVolumeAsync(vol * factor).catch(() => {});
      });
    }
  }, [now, timerEnds, playing, stop, mix]);

  const ensureTrackPlaying = useCallback(async (k: SoundKind, vol: number) => {
    const existing = soundsRef.current.get(k);
    if (existing) {
      await existing.setVolumeAsync(vol).catch(() => {});
      return;
    }
    const myToken = genTokenRef.current;
    setBusyCount((c) => c + 1);
    try {
      const path = await ensureSampleFile(k);
      if (genTokenRef.current !== myToken) return;
      const { sound } = await Audio.Sound.createAsync(
        { uri: path },
        { shouldPlay: true, isLooping: true, volume: 0 },
      );
      if (genTokenRef.current !== myToken) {
        await sound.unloadAsync().catch(() => {});
        return;
      }
      soundsRef.current.set(k, sound);
      const steps = 8;
      for (let step = 1; step <= steps; step++) {
        if (genTokenRef.current !== myToken) return;
        await sound.setVolumeAsync((vol * step) / steps).catch(() => {});
        await new Promise((r) => setTimeout(r, 400 / steps));
      }
    } catch (e) {
      console.warn('Track failed', k, e);
    } finally {
      setBusyCount((c) => Math.max(0, c - 1));
    }
  }, []);

  const removeTrack = useCallback(async (k: SoundKind) => {
    const s = soundsRef.current.get(k);
    if (!s) return;
    soundsRef.current.delete(k);
    await s.stopAsync().catch(() => {});
    await s.unloadAsync().catch(() => {});
  }, []);

  const play = useCallback(
    async (overrideMix?: Mix) => {
      const activeMix = overrideMix ?? mix;
      const active = Object.entries(activeMix).filter(([, v]) => (v ?? 0) > 0) as [SoundKind, number][];
      if (!active.length) return;
      setPlaying(true);
      await Promise.all(active.map(([k, v]) => ensureTrackPlaying(k, v)));
      if (timerMin > 0) setTimerEnds(Date.now() + timerMin * 60 * 1000);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    },
    [mix, timerMin, ensureTrackPlaying],
  );

  const toggleSound = useCallback(
    (k: SoundKind) => {
      Haptics.selectionAsync().catch(() => {});
      const turningOn = !((mix[k] ?? 0) > 0);
      setMix((prev) => ({ ...prev, [k]: turningOn ? DEFAULT_VOLUME : 0 }));
      if (playing) {
        if (turningOn) ensureTrackPlaying(k, DEFAULT_VOLUME);
        else removeTrack(k);
      }
    },
    [mix, playing, ensureTrackPlaying, removeTrack],
  );

  const adjustVolume = useCallback(
    (k: SoundKind, v: number) => {
      setMix((prev) => ({ ...prev, [k]: v }));
      if (!playing) return;
      if (v <= 0) removeTrack(k);
      else ensureTrackPlaying(k, v);
    },
    [playing, ensureTrackPlaying, removeTrack],
  );

  const savePreset = useCallback(() => {
    const active = Object.entries(mix).filter(([, v]) => (v ?? 0) > 0);
    if (!active.length) {
      Alert.alert('Nothing to save', 'Turn on at least one sound first.');
      return;
    }
    Alert.prompt(
      'Save this mix',
      'Give it a name',
      (name?: string) => {
        const trimmed = (name || '').trim();
        if (!trimmed) return;
        const preset: Preset = { id: `${Date.now()}`, name: trimmed, mix: { ...mix } };
        setPresets((prev) => [...prev, preset]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      },
      'plain-text',
    );
  }, [mix]);

  const loadPreset = useCallback(
    async (p: Preset) => {
      Haptics.selectionAsync().catch(() => {});
      const wasPlaying = playing;
      if (wasPlaying) await stop();
      setMix(p.mix);
      if (wasPlaying) await play(p.mix);
    },
    [playing, stop, play],
  );

  const deletePreset = useCallback((p: Preset) => {
    Alert.alert('Delete mix', `Remove "${p.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setPresets((prev) => prev.filter((x) => x.id !== p.id)),
      },
    ]);
  }, []);

  const remaining = timerEnds ? Math.max(0, Math.round((timerEnds - now) / 1000)) : 0;
  const remH = Math.floor(remaining / 3600);
  const remM = Math.floor((remaining % 3600) / 60);
  const remS = remaining % 60;
  const remLabel =
    remH > 0
      ? `${remH}:${remM.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}`
      : `${remM}:${remS.toString().padStart(2, '0')}`;

  const activeSounds = SOUNDS.filter((s) => (mix[s.kind] ?? 0) > 0);
  const heroLabel = activeSounds.length ? activeSounds.map((s) => s.label).join(' + ') : 'Choose a mix';
  const heroTagline = activeSounds.length === 1 ? activeSounds[0].tagline : activeSounds.length > 1 ? 'Custom mix' : 'Tap sounds below to build one.';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.brand}>Quiet <Text style={styles.brandItalic}>Room</Text></Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          <Text style={styles.bigLabel} numberOfLines={2}>{heroLabel}</Text>
          <Text style={styles.tagline}>{heroTagline}</Text>

          <View style={styles.dial}>
            <Pressable
              onPress={playing ? stop : () => play()}
              disabled={busyCount > 0 || !activeSounds.length}
              accessibilityRole="button"
              accessibilityLabel={playing ? 'Stop playback' : 'Start playback'}
              accessibilityState={{ disabled: busyCount > 0 || !activeSounds.length, busy: busyCount > 0 }}
              style={({ pressed }) => [
                styles.playBtn,
                playing && styles.playBtnPlaying,
                pressed && { opacity: 0.85 },
                (busyCount > 0 || !activeSounds.length) && { opacity: 0.5 },
              ]}
            >
              {busyCount > 0 ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <Text style={[styles.playBtnText, playing && styles.playBtnTextPlaying]}>
                  {playing ? '■' : '▶'}
                </Text>
              )}
            </Pressable>
            {timerEnds != null && playing && (
              <Text style={styles.remaining}>{remLabel}</Text>
            )}
          </View>
        </View>

        <View style={styles.bottom}>
          <Text style={styles.sectionLabel}>Sounds — tap to mix</Text>
          <View style={styles.grid}>
            {SOUNDS.map((s) => {
              const vol = mix[s.kind] ?? 0;
              const active = vol > 0;
              return (
                <Pressable
                  key={s.kind}
                  onPress={() => toggleSound(s.kind)}
                  accessibilityRole="switch"
                  accessibilityLabel={s.label}
                  accessibilityHint={s.tagline}
                  accessibilityState={{ checked: active }}
                  style={({ pressed }) => [
                    styles.tile,
                    active && styles.tileActive,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={[styles.tileText, active && styles.tileTextActive]}>{s.label}</Text>
                  {active && (
                    <Slider
                      style={styles.tileSlider}
                      minimumValue={0.05}
                      maximumValue={1}
                      value={vol}
                      minimumTrackTintColor="#0d1518"
                      maximumTrackTintColor="rgba(13,21,24,0.35)"
                      thumbTintColor="#0d1518"
                      onValueChange={(v) => adjustVolume(s.kind, v)}
                      accessibilityLabel={`${s.label} volume`}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 22 }]}>Sleep timer</Text>
          <View style={styles.chipRow}>
            {TIMER_OPTIONS.map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setTimerMin(m);
                  if (playing && m > 0) setTimerEnds(Date.now() + m * 60 * 1000);
                  else if (m === 0) setTimerEnds(null);
                }}
                accessibilityRole="radio"
                accessibilityLabel={m === 0 ? 'No sleep timer' : `Sleep timer, ${m} minutes`}
                accessibilityState={{ checked: timerMin === m }}
                style={({ pressed }) => [
                  styles.chip,
                  styles.timerChip,
                  timerMin === m && styles.chipActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.chipText, timerMin === m && styles.chipTextActive]}>
                  {m === 0 ? 'Off' : `${m}m`}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.presetHeaderRow}>
            <Text style={styles.sectionLabel}>Saved mixes</Text>
            <Pressable onPress={savePreset} hitSlop={8} accessibilityRole="button" accessibilityLabel="Save current mix">
              <Text style={styles.saveLink}>+ Save current</Text>
            </Pressable>
          </View>
          {presets.length ? (
            <View style={styles.chipRow}>
              {presets.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => loadPreset(p)}
                  onLongPress={() => deletePreset(p)}
                  accessibilityRole="button"
                  accessibilityLabel={`Load mix: ${p.name}`}
                  accessibilityHint="Double tap and hold to delete"
                  style={({ pressed }) => [styles.chip, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.chipText}>{p.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyPresets}>Build a mix above, then save it here for later. Long-press a mix to delete it.</Text>
          )}

          <Text style={styles.foot}>
            Sounds are generated on this device and keep playing with the screen locked. Nothing is downloaded, streamed, or sent anywhere.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1518' },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8 },
  brand: { fontSize: 22, fontWeight: '700', color: '#e2eced', letterSpacing: -0.2 },
  brandItalic: { fontStyle: 'italic', color: '#4d8a8a', fontWeight: '600' },

  scrollBody: { flexGrow: 1 },
  body: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingTop: 24, paddingBottom: 12 },
  bigLabel: { color: '#e2eced', fontSize: 32, fontWeight: '300', letterSpacing: -0.5, marginBottom: 8, textAlign: 'center' },
  tagline: { color: '#7a9090', fontSize: 14, textAlign: 'center', maxWidth: 300, fontStyle: 'italic', marginBottom: 32 },

  dial: { alignItems: 'center', justifyContent: 'center' },
  playBtn: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1f3334',
    borderWidth: 1.5, borderColor: '#3a5e60',
  },
  playBtnPlaying: { backgroundColor: '#4d8a8a', borderColor: '#4d8a8a' },
  playBtnText: { color: '#e2eced', fontSize: 42, lineHeight: 44, marginLeft: 6 },
  playBtnTextPlaying: { marginLeft: 0 },
  remaining: { marginTop: 18, color: '#7a9090', fontSize: 20, fontVariant: ['tabular-nums'], letterSpacing: 1 },

  bottom: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 28 },
  sectionLabel: { fontSize: 11, color: '#5d7373', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '47%',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#1c2829',
    borderWidth: 1,
    borderColor: '#2a3a3b',
    minHeight: 56,
    justifyContent: 'center',
  },
  tileActive: { backgroundColor: '#4d8a8a', borderColor: '#4d8a8a' },
  tileText: { color: '#9aafaf', fontSize: 15, fontWeight: '600' },
  tileTextActive: { color: '#0d1518' },
  tileSlider: { width: '100%', height: 28, marginTop: 4 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: '#1c2829', borderWidth: 1, borderColor: '#2a3a3b' },
  timerChip: { paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: '#4d8a8a', borderColor: '#4d8a8a' },
  chipText: { color: '#9aafaf', fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#0d1518' },

  presetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  saveLink: { color: '#4d8a8a', fontSize: 13, fontWeight: '700' },
  emptyPresets: { color: '#4a5e5e', fontSize: 12, fontStyle: 'italic', lineHeight: 17 },

  foot: { color: '#4a5e5e', fontSize: 11, textAlign: 'center', marginTop: 22, fontStyle: 'italic', lineHeight: 16 },
});
