import { StatusBar } from 'expo-status-bar';
import { Asset } from 'expo-asset';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { LANGUAGES, LangKey, soundI18n, t } from './i18n';
import { addRemoteCommandListener, clearNowPlayingInfo, setNowPlayingInfo } from './modules/nowplaying';

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
  | 'largefloorfan'
  | 'smalldeskfan'
  | 'crickets'
  | 'binaural_delta'
  | 'binaural_theta'
  | 'binaural_alpha'
  | 'music_soothe'
  | 'music_deepsleep'
  | 'music_ultrarelax'
  | 'music_healingcalm';

const BINAURAL_KINDS: SoundKind[] = ['binaural_delta', 'binaural_theta', 'binaural_alpha'];
const MUSIC_KINDS: SoundKind[] = ['music_soothe', 'music_deepsleep', 'music_ultrarelax', 'music_healingcalm'];

type SoundCategory = 'Noise' | 'Nature' | 'Fans' | 'Music' | 'Binaural';

const SOUNDS: { kind: SoundKind; label: string; tagline: string; category: SoundCategory }[] = [
  { kind: 'white', label: 'White', tagline: 'Crisp, even hiss — like an old radio tuned between stations.', category: 'Noise' },
  { kind: 'pink', label: 'Pink', tagline: 'Softer, lower energy — closer to leaves in wind.', category: 'Noise' },
  { kind: 'brown', label: 'Brown', tagline: 'Deep, rumbling roll — surf, or a distant waterfall.', category: 'Noise' },
  { kind: 'rain', label: 'Rain', tagline: 'Filtered noise with scattered patter — steady, soothing.', category: 'Nature' },
  { kind: 'ocean', label: 'Ocean', tagline: 'Slow rolling waves rising and falling on a shore.', category: 'Nature' },
  { kind: 'wind', label: 'Wind', tagline: 'Gusting air moving through open space.', category: 'Nature' },
  { kind: 'campfire', label: 'Campfire', tagline: 'Warm crackle and pop of a low fire.', category: 'Nature' },
  { kind: 'thunder', label: 'Thunder', tagline: 'Distant rolling rumble beneath a steady rain.', category: 'Nature' },
  { kind: 'crickets', label: 'Crickets', tagline: 'Quiet dark with a chorus of distant crickets.', category: 'Nature' },
  { kind: 'boxfan', label: 'Box Fan', tagline: 'The classic bedroom box fan — steady hum and moving air.', category: 'Fans' },
  { kind: 'towerfan', label: 'Tower Fan', tagline: 'Smoother, airier whoosh — less motor, more breeze.', category: 'Fans' },
  { kind: 'ceilingfan', label: 'Ceiling Fan', tagline: 'Deep, slow-turning hum with a gentle blade flutter.', category: 'Fans' },
  { kind: 'acunit', label: 'Air Conditioner', tagline: 'A rattly compressor drone — cool, steady, a little buzzy.', category: 'Fans' },
  { kind: 'largefloorfan', label: 'Large Floor Fan', tagline: 'A big standing fan — deep, powerful, moving a lot of air.', category: 'Fans' },
  { kind: 'smalldeskfan', label: 'Small Desk Fan', tagline: 'A small, higher-pitched motor whir close by.', category: 'Fans' },
  { kind: 'music_soothe', label: 'Soothe', tagline: 'A soft, warm pad — gentle and unhurried.', category: 'Music' },
  { kind: 'music_deepsleep', label: 'Deep Sleep', tagline: 'Low, slow-moving tones for drifting off.', category: 'Music' },
  { kind: 'music_ultrarelax', label: 'Ultra Relax', tagline: 'A brighter, shimmering pad with a light touch.', category: 'Music' },
  { kind: 'music_healingcalm', label: 'Healing Calm', tagline: 'A warm, slowly breathing drone.', category: 'Music' },
  { kind: 'binaural_delta', label: 'Binaural Delta', tagline: 'Binaural delta tone (2Hz) — wear headphones for the effect.', category: 'Binaural' },
  { kind: 'binaural_theta', label: 'Binaural Theta', tagline: 'Binaural theta tone (6Hz) — wear headphones for the effect.', category: 'Binaural' },
  { kind: 'binaural_alpha', label: 'Binaural Alpha', tagline: 'Binaural alpha tone (10Hz) — wear headphones for the effect.', category: 'Binaural' },
];

const SOUND_ICON: Record<SoundKind, string> = {
  // White/Pink/Brown are named after colors, not real-world objects, so a
  // color-coded icon reads clearer than a literal (and often confusing)
  // metaphor - it just says "this is the pink one."
  white: '⚪',
  pink: '🌸',
  brown: '🟤',
  rain: '🌧️',
  ocean: '🌊',
  wind: '🌬️',
  campfire: '🔥',
  thunder: '⛈️',
  crickets: '🦗',
  boxfan: '🌀',
  towerfan: '💨',
  ceilingfan: '🪭',
  acunit: '❄️',
  largefloorfan: '🌪️',
  smalldeskfan: '🌬️',
  music_soothe: '🎵',
  music_deepsleep: '😴',
  music_ultrarelax: '✨',
  music_healingcalm: '🕊️',
  binaural_delta: '🎧',
  binaural_theta: '🎧',
  binaural_alpha: '🎧',
};

const SOUND_CATEGORIES: SoundCategory[] = ['Nature', 'Noise', 'Fans', 'Music', 'Binaural'];

// Lock-screen artwork, one illustration per category plus a generic "Mix"
// used whenever the active sounds span more than one category - matching
// per-sound art for all 21 sounds isn't worth the asset overhead, but a
// relevant scene per category is.
const NOWPLAYING_ARTWORK_SOURCE: Record<SoundCategory | 'Mix', number> = {
  Nature: require('./assets/nowplaying/nature.png'),
  Noise: require('./assets/nowplaying/static.png'),
  Fans: require('./assets/nowplaying/fans.png'),
  Music: require('./assets/nowplaying/music.png'),
  Binaural: require('./assets/nowplaying/headphones.png'),
  Mix: require('./assets/nowplaying/mix.png'),
};

// Curated picks shown up top so the most commonly used sounds don't require
// hunting through categories - these are duplicates of entries below, not a
// separate SoundCategory, so tapping either instance toggles the same sound.
const POPULAR_KINDS: SoundKind[] = ['rain', 'ocean', 'white', 'brown', 'thunder', 'boxfan', 'music_soothe', 'crickets'];

const SAMPLE_RATE = 44100;
// Longer loops repeat less obviously — thunder booms, campfire pops, and
// ocean swells no longer land on the exact same beat every few seconds.
const DURATION_SEC = 24;
// Samples of overlap crossfaded between the tail and head so the loop point
// is inaudible instead of clicking on every repeat.
const LOOP_CROSSFADE_SEC = 0.75;
const SAMPLES_DIR = `${FileSystem.cacheDirectory}quietroom-samples-v5/`;

const TIMER_OPTIONS = [0, 30, 60, 120];

function formatTimerMinutes(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

function formatClock(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
const DEFAULT_VOLUME = 0.7;
const FADE_SECONDS = 5;
const STORAGE_KEY = 'quietroom:config:v2';

// expo-av's `isLooping` restarts a clip via AVPlayer seeking back to 0,
// which is not sample-accurate — it produces exactly the audible
// gap-then-click at the loop point that this whole scheme exists to
// avoid. Instead we run two alternating instances of the same (already
// internally loop-safe) file per track and crossfade between them well
// before either one reaches its natural end, so any restart artifact is
// masked under the overlap. Since the WAV content is stationary ambient
// noise/tone (not a distinct melody), a fresh instance starting from its
// own t=0 mid-crossfade is inaudible as a "jump" — only precise-enough
// timing to always swap before the 24s hard end matters, not exact
// alignment to a particular sample.
const LOOP_MS = DURATION_SEC * 1000;
const LOOP_CROSSFADE_MS = 1000;
// Swap starts this long before the clip's natural end, leaving a safety
// margin after the crossfade completes in case of JS timer/setup jitter.
const SWAP_LEAD_MS = LOOP_CROSSFADE_MS + 1500;

function writeStr(view: DataView, off: number, s: string) {
  for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
}

// Passthrough below a knee, only compressing the excess above it — plain
// tanh(x) distorts every sample (even ones nowhere near the ceiling: e.g.
// tanh(0.4)=0.380, a ~5% deviation), which is pure unwanted harmonic
// coloration on signals that never needed limiting (binaural tones peak
// ~0.38, music pads ~0.5 — both now pass through byte-for-byte exact).
// Generators still occasionally peak past +-1 by design (pops, booms);
// only those get the smooth tanh compression.
// Raised from 0.7: transient realism (campfire pops, thunder booms) matters
// more than avoiding an occasional soft-clipped peak - only compress once a
// sample is genuinely running hot, not the normal top of its dynamic range.
const SOFT_KNEE = 0.92;
function softClip(x: number): number {
  const ax = Math.abs(x);
  if (ax <= SOFT_KNEE) return x;
  const sign = x > 0 ? 1 : -1;
  const excess = ax - SOFT_KNEE;
  return sign * (SOFT_KNEE + Math.tanh(excess / (1 - SOFT_KNEE)) * (1 - SOFT_KNEE));
}

// Renders `n` + one crossfade window of continuous samples, then blends the
// crossfade window (tail-continuation into head) so sample[0] picks up
// smoothly from sample[n-1] when the buffer loops — eliminates the seam
// click that a naive loop of raw generator output would have.
//
// Equal-power (sin/cos) curve, not linear: raw[i] and raw[n+i] are two
// independent draws from the same noise process, so a linear blend
// (t, 1-t) has combined energy t^2+(1-t)^2 which dips to half power right
// at the middle of the window - an audible soft "breath"/dip at the loop
// point. sin/cos keeps fadeIn^2+fadeOut^2 == 1 across the whole window, so
// the perceived loudness stays constant through the seam.
function renderLoopable(n: number, cf: number, sampleFn: () => number): Float64Array {
  const raw = new Float64Array(n + cf);
  for (let i = 0; i < n + cf; i++) raw[i] = sampleFn();
  const out = new Float64Array(n);
  for (let i = cf; i < n; i++) out[i] = raw[i];
  for (let i = 0; i < cf; i++) {
    const t = (i / cf) * (Math.PI / 2);
    out[i] = raw[i] * Math.sin(t) + raw[n + i] * Math.cos(t);
  }
  return out;
}

// Snaps a modulation/oscillator frequency to the nearest value that
// completes a whole number of cycles over exactly one loop (DURATION_SEC).
// Without this, a generator's slow LFO (ocean swell, wind gusts, a fan's
// flutter, a pad's vibrato/tremolo/tone) is at a different phase at
// sample[n] than it was at sample[0] - renderLoopable's crossfade hides the
// resulting *click*, but the swell/hum/tone itself still audibly shifts
// character right at the seam. Snapping the frequency makes the signal
// truly periodic across the loop boundary, so there's nothing left to hide.
function loopHz(hz: number): number {
  return Math.round(hz * DURATION_SEC) / DURATION_SEC;
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
    // Was hp*1.6 + drop*0.9 - regularly peaked past +-2 (heavy limiting on
    // ~16% of samples) and, worse, drop's broadband click energy so
    // dominated the overall spectrum that rain measured spectrally
    // indistinguishable from campfire's pops. Rebalanced toward the
    // sustained hiss so rain reads as hiss-with-patter.
    return hp * 1.25 + drop * 0.35;
  };
}

// Ocean: pink-noise wash with a pronounced, fast-enough swell that two
// full rise-and-fall waves are audible inside a single 10s loop, plus an
// occasional foamy hiss burst as a wave crests.
function oceanGenerator() {
  const pink = pinkGenerator();
  let lp = 0;
  let foamEnv = 0;
  // A fixed-frequency swell - even a gentle, low-exponent sine - still has
  // a period the ear locks onto as a rhythmic "don don don." Any FIXED
  // period does this, no matter how subtle the depth. The fix is to never
  // have one: chase a randomly-picked target level every few seconds
  // instead of oscillating, so the amplitude wanders but never repeats.
  let swellCurrent = 0.7;
  let swellTarget = 0.7;
  let swellStepsLeft = 0;
  return () => {
    const base = pink();
    lp = lp * 0.9 + base * 0.1;
    if (swellStepsLeft <= 0) {
      // Was 0.8-1.0 - too narrow to actually hear a rise and fall, which
      // is why it stopped sounding like waves at all. Wide range plus a
      // faster chase gives a clearly audible swell; it stays aperiodic
      // (never a "don don don") because the target and interval are both
      // re-randomized independently every cycle, so no period repeats.
      swellTarget = 0.35 + Math.random() * 0.65;
      swellStepsLeft = Math.floor((2.5 + Math.random() * 4.5) * SAMPLE_RATE);
    }
    swellStepsLeft -= 1;
    swellCurrent += (swellTarget - swellCurrent) * 0.00005;
    // A little crest emphasis - a wave's peak surges more than its trough
    // recedes - applied to the aperiodic chase, not a fixed oscillation.
    const swell = Math.pow(Math.max(0, swellCurrent), 1.3);
    // Was 0.0015/sample - the old sine swell only briefly crossed 0.92 near
    // each peak, so this rate was masked. The new slow-chase swell can
    // linger above 0.92 for many seconds at a stretch, and at 44.1kHz
    // 0.0015/sample averages ~66 triggers/SECOND while lingering - a rapid
    // machine-gun of foam clicks instead of an occasional swish. Dropped
    // ~500x to average roughly one foam burst per several seconds of
    // being in the high part of the swell.
    if (foamEnv <= 0.001 && swell > 0.85 && Math.random() < 0.000004) {
      foamEnv = 0.4;
    }
    const foam = foamEnv * (Math.random() * 2 - 1);
    foamEnv *= 0.9996;
    // Bass and wash both track the swell more strongly now so the rise
    // and fall is actually audible as a wave, not just a faint texture
    // shift.
    const wash = base * 0.85 * swell;
    return lp * 1.8 * swell + wash + foam * 0.5;
  };
}

// Wind: brown-noise gusts with a clearly audible rise-and-fall (multiple
// gusts per loop) plus a whistling higher-frequency hiss that swells with it.
function windGenerator() {
  const brown = brownGenerator();
  const white = whiteGenerator();
  const gustHz = loopHz(0.22);
  let t = 0;
  return () => {
    const base = brown();
    t += 1;
    const sec = t / SAMPLE_RATE;
    const gust = 0.4 + 0.6 * Math.pow((1 + Math.sin(sec * 2 * Math.PI * gustHz)) / 2, 2);
    const hiss = white() * 0.3 * gust;
    // A strong gust should actually sound stronger - let it peak above the
    // resting level rather than capping it for the sake of a flatter meter.
    return base * (0.5 + gust) + hiss;
  };
}

// Campfire: near-constant crackle-and-pop over a warm low rumble bed.
function campfireGenerator() {
  const pink = pinkGenerator();
  const brown = brownGenerator();
  let popEnv = 0;
  let hpPrev1 = 0;
  let hpPrev2 = 0;
  return () => {
    // Was pink*0.45+brown*0.35 - too brown/bass-heavy, measuring 0.95
    // spectrally similar to wind (also brown-based). Shifted toward pink
    // for a warmer, more midrange "crackling" character.
    const base = pink() * 0.7 + brown() * 0.12;
    if (popEnv <= 0.002 && Math.random() < 0.06) {
      popEnv = 0.6 + Math.random() * 0.6;
    }
    const raw = Math.random() * 2 - 1;
    // A single first-difference (+6dB/octave) still wasn't crisp enough -
    // differencing it AGAIN (+12dB/octave total) pushes far more energy
    // into the treble, which is what a real twig-snap crack sounds like,
    // and a faster decay keeps it a snap instead of a longer sizzle.
    const d1 = raw - hpPrev1;
    hpPrev1 = raw;
    const d2 = d1 - hpPrev2;
    hpPrev2 = d1;
    const pop = popEnv * d2;
    popEnv *= 0.76;
    // Pops need to be loud and sharp to read as a real fire - a quiet pop
    // isn't a pop. The warm pink/brown base still carries campfire's
    // identity at rest; the pops are allowed to punch well above it.
    return base + pop * 1.6;
  };
}

// Thunder: a heavy-rain background (real thunderstorms don't happen in
// silence) under a slow, irregular rolling sub-bass rumble, with rare
// multi-hit strikes - a few quick cracks building into one long, deep
// boom ("don don don dooooon"), not a single isolated pop.
function thunderGenerator() {
  const roll1Hz = loopHz(0.07);
  const roll2Hz = loopHz(0.13);
  const rainWhite = whiteGenerator();
  let rainHp = 0;
  let rainLastW = 0;
  let rainDropEnv = 0;
  let lp = 0;
  let mid = 0;
  let texture = 0;
  let t = 0;
  let boom = 0;
  let zapEnv = 0;
  let zapPrev1 = 0;
  let zapPrev2 = 0;
  // Was 14-28s between strikes - too rare. ~8-18s is more frequent while
  // still irregular (each cooldown draw is random, so the interval never
  // repeats on a fixed beat).
  let cooldown = Math.floor((2 + Math.random() * 3) * SAMPLE_RATE);
  const echoes: { delay: number; amp: number }[] = [];
  return () => {
    t += 1;
    const sec = t / SAMPLE_RATE;
    const w = Math.random() * 2 - 1;
    // ~110Hz cutoff - audible bass, not the ~21Hz sub-bass that used to
    // read as "weird and soft" on phone speakers.
    lp = lp * 0.985 + w * 0.015;
    // A second, higher band gives the gravelly "rolling" texture real
    // thunder has on top of the pure sub-bass.
    mid = mid * 0.93 + w * 0.07;
    texture = texture * 0.9 + w * 0.1;

    // Heavy rain, always present - real thunderstorms have a constant
    // downpour under the rumble, not silence between strikes.
    const rw = rainWhite();
    rainHp = rainHp * 0.7 + (rw - rainLastW) * 0.7;
    rainLastW = rw;
    if (rainDropEnv <= 0.002 && Math.random() < 0.012) {
      rainDropEnv = 0.6 + Math.random() * 0.5;
    }
    const rainDrop = rainDropEnv * (Math.random() * 2 - 1);
    rainDropEnv *= 0.65;
    const heavyRain = rainHp * 1.5 + rainDrop * 0.4;

    const roll =
      0.5 +
      0.3 * Math.sin(sec * 2 * Math.PI * roll1Hz) +
      0.2 * Math.sin(sec * 2 * Math.PI * roll2Hz + 1.4);

    if (cooldown <= 0) {
      // A real strike is ONE quick, bright zap - not several separate
      // claps - immediately followed by a big rumble that rolls and
      // echoes across the sky for several seconds. Model the echo as a
      // few delayed, decaying repeats close enough together that they
      // overlap into one continuous rolling boom instead of sounding
      // like distinct hits.
      zapEnv = 1;
      echoes.length = 0;
      let cursor = 0;
      const echoCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < echoCount; i++) {
        cursor += Math.floor((0.25 + Math.random() * 0.35) * SAMPLE_RATE);
        echoes.push({ delay: cursor, amp: Math.pow(0.75, i) });
      }
      cooldown = Math.floor((8 + Math.random() * 10) * SAMPLE_RATE);
    }
    cooldown -= 1;
    for (let i = echoes.length - 1; i >= 0; i--) {
      echoes[i].delay -= 1;
      if (echoes[i].delay <= 0) {
        boom = Math.max(boom, echoes[i].amp);
        echoes.splice(i, 1);
      }
    }
    // ~4s to decay to 1% - long enough that successive echoes land while
    // the previous one is still ringing, blending into one continuous
    // rolling/echoing rumble rather than separate claps.
    boom *= 0.999975;

    // The zap: a fast, bright double-differenced noise burst (like
    // campfire's crack, but sharper and shorter) - the "lightning" sound,
    // distinct from the long rumble that follows it.
    const d1 = w - zapPrev1;
    zapPrev1 = w;
    const d2 = d1 - zapPrev2;
    zapPrev2 = d1;
    const zap = zapEnv * d2;
    zapEnv *= 0.55;

    const rumble = lp * 2.5 * Math.max(0.15, roll) + lp * 10 * boom + mid * boom * 4;
    return rumble + texture * 0.15 + zap * 2.2 + heavyRain * 0.65;
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
  const flutterHz = loopHz(3.2);
  let phase = 0;
  let lp = 0;
  let t = 0;
  return () => {
    phase += 1;
    t += 1;
    const flutter = 0.85 + 0.15 * Math.sin((t / SAMPLE_RATE) * 2 * Math.PI * flutterHz);
    const hum =
      (Math.sin((2 * Math.PI * 55 * phase) / SAMPLE_RATE) * 0.34 +
        Math.sin((2 * Math.PI * 110 * phase) / SAMPLE_RATE) * 0.1) *
      flutter;
    const w = Math.random() * 2 - 1;
    lp = lp * 0.65 + w * 0.35;
    return hum + lp * 0.35 * flutter;
  };
}

// Window AC unit: the compressor motor kicks on with a rattly spin-up
// (not just a static drone), settles into a steady blowing hum, then
// cycles on again infrequently — real units don't run at one constant
// tone forever, they cycle their compressor on and off.
function acUnitGenerator() {
  let lp = 0;
  // Three separate phase accumulators (in cycles, 0-1) rather than one
  // shared "phase * frequency" term - ramping frequency during a kick
  // needs the instantaneous frequency integrated over time, not scaled
  // against an ever-growing sample counter, or the pitch ramp distorts
  // more and more the longer the loop has been running.
  let acc1 = 0;
  let acc2 = 0;
  let acc3 = 0;
  let clunkEnv = 1;
  let clunkPrev = 0;
  let kickT = 0;
  let inKick = true; // starts mid-kick so playback always opens with the motor spinning up
  let cooldown = 0;
  const KICK_RAMP = Math.floor(SAMPLE_RATE * 1.1);
  return () => {
    if (cooldown <= 0 && !inKick) {
      inKick = true;
      kickT = 0;
      clunkEnv = 1;
    }
    if (!inKick) cooldown -= 1;

    let freqMul = 1;
    if (inKick) {
      kickT += 1;
      freqMul = Math.min(1, 0.15 + 0.85 * (kickT / KICK_RAMP));
      if (kickT >= KICK_RAMP) {
        inKick = false;
        // Real compressors cycle every few minutes, but this is a 24s
        // loop - 15-35s keeps a re-kick audible without feeling frequent.
        cooldown = Math.floor((15 + Math.random() * 20) * SAMPLE_RATE);
      }
    }

    acc1 += (45 * freqMul) / SAMPLE_RATE;
    acc1 -= Math.floor(acc1);
    acc2 += (91 * freqMul) / SAMPLE_RATE;
    acc2 -= Math.floor(acc2);
    acc3 += (136 * freqMul) / SAMPLE_RATE;
    acc3 -= Math.floor(acc3);
    const hum = Math.sin(2 * Math.PI * acc1) * 0.28 + Math.sin(2 * Math.PI * acc2) * 0.16 + Math.sin(2 * Math.PI * acc3) * 0.08;
    const w = Math.random() * 2 - 1;
    lp = lp * 0.55 + w * 0.45;

    // A bright, rattly clunk right at the moment the compressor kicks on
    // - a relay/motor-start transient, distinct from the steady hum.
    const clunkHp = w - clunkPrev;
    clunkPrev = w;
    const clunk = clunkEnv * clunkHp;
    clunkEnv *= 0.985;

    const kickBoost = inKick ? 1 + (1 - kickT / KICK_RAMP) * 0.5 : 1;
    return (hum + lp * 0.65) * Math.max(0.3, freqMul) * kickBoost + clunk * 1.2;
  };
}

// Large floor fan: a big standing fan — deeper and fuller than a box fan,
// with more moving-air whoosh behind a lower motor tone.
function largeFloorFanGenerator() {
  let phase = 0;
  let lp = 0;
  return () => {
    phase += 1;
    const hum =
      Math.sin((2 * Math.PI * 80 * phase) / SAMPLE_RATE) * 0.3 +
      Math.sin((2 * Math.PI * 160 * phase) / SAMPLE_RATE) * 0.1;
    const w = Math.random() * 2 - 1;
    lp = lp * 0.82 + w * 0.18;
    return hum + lp * 0.75;
  };
}

// Small desk fan: a small motor close by — higher-pitched and thinner,
// with a faint buzzy edge instead of a full hum.
function smallDeskFanGenerator() {
  let phase = 0;
  let lp = 0;
  return () => {
    phase += 1;
    const hum =
      Math.sin((2 * Math.PI * 260 * phase) / SAMPLE_RATE) * 0.16 +
      Math.sin((2 * Math.PI * 520 * phase) / SAMPLE_RATE) * 0.07 +
      Math.sin((2 * Math.PI * 40 * phase) / SAMPLE_RATE) * 0.08;
    const w = Math.random() * 2 - 1;
    lp = lp * 0.5 + w * 0.5;
    return hum + lp * 0.4;
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
    // Was two clean 60ms tones per cycle - a couple of pure sine notes
    // reads as a bird's two-syllable call, not an insect. A real cricket
    // chirp is a rapid TRILL of many short pulses (stridulation), so
    // build a burst of ~10 short pulses instead of two long tones.
    const cycleLen = Math.round(SAMPLE_RATE * 1.1);
    const cyclePos = (t % cycleLen) / SAMPLE_RATE;
    const burstDur = 0.35;
    let chirp = 0;
    if (cyclePos < burstDur) {
      const pulseHz = 28;
      const pulsePos = (cyclePos * pulseHz) % 1;
      const pulseOnFrac = 0.35;
      if (pulsePos < pulseOnFrac) {
        const env = Math.sin(Math.PI * (pulsePos / pulseOnFrac));
        // A second, non-octave partial (4200Hz + 6300Hz) adds a buzzy
        // roughness a single pure tone doesn't have - closer to a wing
        // stridulation than a clean whistle.
        const tone =
          Math.sin((2 * Math.PI * 4200 * t) / SAMPLE_RATE) * 0.7 +
          Math.sin((2 * Math.PI * 6300 * t) / SAMPLE_RATE) * 0.3;
        chirp = tone * env * 0.8;
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

// Ambient pad: a handful of detuned sine tones held as a slow chord, each
// with a faint independent vibrato, under a shared slow tremolo and a
// whisper of pink noise for warmth — a generated stand-in for the soft
// instrumental "sleep music" tracks other apps license.
function padGenerator(freqs: number[], speed: number, warmth: number) {
  // Snap every tone AND both LFOs to whole cycles-per-loop: unsnapped, each
  // sine's phase at sample[n] doesn't match its phase at sample[0], so the
  // chord/vibrato/tremolo audibly shifts right at the loop seam even with
  // the crossfade in place. Post-snap the pitch drift is under 0.02%.
  const loopFreqs = freqs.map(loopHz);
  const vibHz = loopHz(0.07 * speed);
  const tremHz = loopHz(0.05 * speed);
  const phases = freqs.map(() => 0);
  const vibPhases = freqs.map((_, i) => i * 1.3);
  const pink = pinkGenerator();
  let lp = 0;
  let t = 0;
  return () => {
    t += 1;
    const sec = t / SAMPLE_RATE;
    let sum = 0;
    for (let i = 0; i < loopFreqs.length; i++) {
      const vib = 1 + 0.003 * Math.sin(sec * 2 * Math.PI * vibHz + vibPhases[i]);
      phases[i] += (2 * Math.PI * loopFreqs[i] * vib) / SAMPLE_RATE;
      sum += Math.sin(phases[i]);
    }
    sum /= loopFreqs.length;
    const tremolo = 0.75 + 0.25 * Math.sin(sec * 2 * Math.PI * tremHz);
    const n = pink();
    lp = lp * 0.95 + n * 0.05;
    return sum * 0.5 * tremolo + lp * warmth;
  };
}

// Applied at this per-SoundKind level (NOT inside the shared primitives,
// which rain/wind/ocean/campfire/crickets/pads all reuse internally) so
// the same slider position means roughly the same perceived loudness
// everywhere — measured RMS varied nearly 4x across sounds before this.
const OUTPUT_GAIN: Partial<Record<SoundKind, number>> = {
  white: 0.55, pink: 1.15, brown: 1.2, rain: 0.56, ocean: 0.95, wind: 1.0,
  campfire: 1.1, thunder: 1.4, boxfan: 0.95, towerfan: 1.15, ceilingfan: 1.05,
  acunit: 0.92, largefloorfan: 1.05, smalldeskfan: 1.1, crickets: 1.1,
};

function gained(gen: () => number, gain: number): () => number {
  return () => gen() * gain;
}

function makeGenerator(kind: SoundKind) {
  const g = (fn: () => number) => gained(fn, OUTPUT_GAIN[kind] ?? 1);
  switch (kind) {
    case 'white': return g(whiteGenerator());
    case 'pink': return g(pinkGenerator());
    case 'brown': return g(brownGenerator());
    case 'rain': return g(rainGenerator());
    case 'ocean': return g(oceanGenerator());
    case 'wind': return g(windGenerator());
    case 'campfire': return g(campfireGenerator());
    case 'thunder': return g(thunderGenerator());
    case 'boxfan': return g(boxFanGenerator());
    case 'towerfan': return g(towerFanGenerator());
    case 'ceilingfan': return g(ceilingFanGenerator());
    case 'acunit': return g(acUnitGenerator());
    case 'largefloorfan': return g(largeFloorFanGenerator());
    case 'smalldeskfan': return g(smallDeskFanGenerator());
    case 'crickets': return g(cricketsGenerator());
    case 'music_soothe': return padGenerator([130.81, 164.81, 196.0], 1, 0.05);
    case 'music_deepsleep': return padGenerator([98.0, 123.47, 146.83], 0.5, 0.08);
    case 'music_ultrarelax': return padGenerator([196.0, 246.94, 293.66, 392.0], 1.3, 0.03);
    case 'music_healingcalm': return padGenerator([110.0, 138.59, 164.81], 0.35, 0.09);
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

// The little bar at the top of a bottom sheet is a standard iOS affordance
// that promises "drag this to dismiss" - it wasn't actually wired to
// anything, so it looked grabbable but did nothing. This makes it real:
// drag down far or fast enough on the handle and the sheet dismisses;
// otherwise it springs back.
function useDragToDismissSheet(visible: boolean, onDismiss: () => void) {
  const translateY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible]);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 100 || gesture.vy > 0.8) {
          Animated.timing(translateY, { toValue: 900, duration: 180, useNativeDriver: true }).start(() => {
            onDismiss();
          });
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        }
      },
    }),
  ).current;
  return { translateY, panHandlers: panResponder.panHandlers };
}

type Mix = Partial<Record<SoundKind, number>>;
type Preset = { id: string; name: string; mix: Mix };
type TrackHandle = {
  current: Audio.Sound;
  targetVolume: number;
  swapTimer: ReturnType<typeof setTimeout> | null;
};

export default function App() {
  useKeepAwake();
  const [mix, setMix] = useState<Mix>({ pink: DEFAULT_VOLUME });
  const [playing, setPlaying] = useState(false);
  const [busyCount, setBusyCount] = useState(0);
  const [timerMin, setTimerMin] = useState(0); // 0 = no timer
  const [customTimerMin, setCustomTimerMin] = useState<number | null>(null);
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'duration' | 'endtime'>('duration');
  const [pickerDurationSec, setPickerDurationSec] = useState(30 * 60);
  const [pickerEndTime, setPickerEndTime] = useState(() => new Date(Date.now() + 30 * 60 * 1000));
  const [timerEnds, setTimerEnds] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [presets, setPresets] = useState<Preset[]>([]);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [keepPlayingInBackground, setKeepPlayingInBackground] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [themeKey, setThemeKey] = useState(DEFAULT_THEME_KEY);
  const [langKey, setLangKey] = useState<LangKey>('en');
  const [showSettings, setShowSettings] = useState(false);
  const [popularKinds, setPopularKinds] = useState<SoundKind[]>(POPULAR_KINDS);
  const [showPopularEditor, setShowPopularEditor] = useState(false);
  const timerDrag = useDragToDismissSheet(showTimerPicker, () => setShowTimerPicker(false));
  const popularEditorDrag = useDragToDismissSheet(showPopularEditor, () => setShowPopularEditor(false));
  const hapticsEnabledRef = useRef(true);
  // Each active track alternates between two Audio.Sound instances of the
  // same file to loop gaplessly (see LOOP_MS/LOOP_CROSSFADE_MS above) -
  // `current` is whichever instance is presently audible.
  const tracksRef = useRef<Map<SoundKind, TrackHandle>>(new Map());
  // Per-track generation counter. Bumped on remove/stop; any in-flight
  // swap or fade-in compares its captured generation before touching
  // shared state, so a stale async callback can't resurrect a track
  // that's since been removed or resurface after a fresh restart.
  const trackGenRef = useRef<Map<SoundKind, number>>(new Map());

  useEffect(() => {
    (async () => {
      try {
        const cfg = await AsyncStorage.getItem(STORAGE_KEY);
        if (cfg) {
          const c = JSON.parse(cfg);
          if (c.mix && typeof c.mix === 'object') setMix(c.mix);
          if (typeof c.timerMin === 'number') setTimerMin(c.timerMin);
          if (typeof c.customTimerMin === 'number') setCustomTimerMin(c.customTimerMin);
          if (Array.isArray(c.presets)) setPresets(c.presets);
          if (typeof c.autoPlayEnabled === 'boolean') setAutoPlayEnabled(c.autoPlayEnabled);
          if (typeof c.keepPlayingInBackground === 'boolean') setKeepPlayingInBackground(c.keepPlayingInBackground);
          if (typeof c.hapticsEnabled === 'boolean') {
            setHapticsEnabled(c.hapticsEnabled);
            hapticsEnabledRef.current = c.hapticsEnabled;
          }
          if (typeof c.themeKey === 'string' && THEMES.some((th) => th.key === c.themeKey)) setThemeKey(c.themeKey);
          if (typeof c.langKey === 'string' && LANGUAGES.some((l) => l.key === c.langKey)) setLangKey(c.langKey);
          if (Array.isArray(c.popularKinds)) setPopularKinds(c.popularKinds);
        }
      } catch {}
    })();
    return () => {
      tracksRef.current.forEach((handle) => {
        if (handle.swapTimer) clearTimeout(handle.swapTimer);
        handle.current.unloadAsync().catch(() => {});
      });
    };
  }, []);

  // Re-applies whenever the toggle changes, and once on mount with the
  // default (true) before any saved preference has loaded.
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: keepPlayingInBackground,
      shouldDuckAndroid: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    }).catch(() => {});
  }, [keepPlayingInBackground]);

  useEffect(() => {
    hapticsEnabledRef.current = hapticsEnabled;
  }, [hapticsEnabled]);

  const hapticImpact = useCallback((style: Haptics.ImpactFeedbackStyle) => {
    if (hapticsEnabledRef.current) Haptics.impactAsync(style).catch(() => {});
  }, []);
  const hapticSelection = useCallback(() => {
    if (hapticsEnabledRef.current) Haptics.selectionAsync().catch(() => {});
  }, []);
  const hapticNotification = useCallback((type: Haptics.NotificationFeedbackType) => {
    if (hapticsEnabledRef.current) Haptics.notificationAsync(type).catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mix, timerMin, customTimerMin, presets, autoPlayEnabled, keepPlayingInBackground, hapticsEnabled, themeKey, langKey, popularKinds }),
    ).catch(() => {});
  }, [mix, timerMin, customTimerMin, presets, autoPlayEnabled, keepPlayingInBackground, hapticsEnabled, themeKey, langKey, popularKinds]);

  const theme = useMemo(() => THEMES.find((th) => th.key === themeKey) ?? THEMES[0], [themeKey]);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // Ticking clock for sleep timer countdown + fade-out display
  useEffect(() => {
    if (timerEnds == null) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [timerEnds]);

  const STOP_FADE_MS = 700;
  const STOP_FADE_STEPS = 10;

  const stop = useCallback(async () => {
    const entries = Array.from(tracksRef.current.entries());
    // Bump every active track's generation so any in-flight swap/fade-in
    // detects it's stale and cleans up its own instances instead of
    // resurfacing after we've already torn everything down.
    entries.forEach(([k]) => trackGenRef.current.set(k, (trackGenRef.current.get(k) ?? 0) + 1));
    tracksRef.current.clear();
    entries.forEach(([, handle]) => {
      if (handle.swapTimer) clearTimeout(handle.swapTimer);
    });
    setBusyCount((c) => c + 1);

    // Fade every active track down to silence before actually stopping —
    // makes even a manual stop feel gentle instead of an abrupt cutoff.
    const startVols = new Map<string, number>();
    await Promise.all(
      entries.map(async ([k, handle]) => {
        try {
          const status = await handle.current.getStatusAsync();
          startVols.set(k, status.isLoaded ? status.volume ?? 0 : handle.targetVolume);
        } catch {
          startVols.set(k, handle.targetVolume);
        }
      }),
    );
    for (let step = 1; step <= STOP_FADE_STEPS; step++) {
      const factor = 1 - step / STOP_FADE_STEPS;
      await Promise.all(
        entries.map(([k, handle]) => handle.current.setVolumeAsync((startVols.get(k) ?? 0) * factor).catch(() => {})),
      );
      await new Promise((r) => setTimeout(r, STOP_FADE_MS / STOP_FADE_STEPS));
    }

    await Promise.all(
      entries.map(([, handle]) =>
        handle.current
          .stopAsync()
          .catch(() => {})
          .then(() => handle.current.unloadAsync().catch(() => {})),
      ),
    );
    setPlaying(false);
    setTimerEnds(null);
    setBusyCount((c) => Math.max(0, c - 1));
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
  }, []);

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
      tracksRef.current.forEach((handle, k) => {
        const vol = mix[k] ?? DEFAULT_VOLUME;
        handle.current.setVolumeAsync(vol * factor).catch(() => {});
      });
    }
  }, [now, timerEnds, playing, stop, mix]);

  // Crossfades a track's currently-audible instance over to a freshly
  // created one of the same (loop-safe) file, then tears down the old
  // instance — see the LOOP_MS/LOOP_CROSSFADE_MS comment above for why
  // this exists instead of `isLooping: true`. Each new instance arms its
  // own next swap relative to its own real start time, so timing never
  // compounds across cycles even if a given cycle's setup was a bit slow.
  const performSwap = useCallback(async (k: SoundKind, generation: number) => {
    if (trackGenRef.current.get(k) !== generation) return;
    const handle = tracksRef.current.get(k);
    if (!handle) return;
    let path: string;
    try {
      path = await ensureSampleFile(k);
    } catch (e) {
      console.warn('Swap failed to resolve sample', k, e);
      return;
    }
    if (trackGenRef.current.get(k) !== generation) return;
    let nextSound: Audio.Sound;
    try {
      const created = await Audio.Sound.createAsync({ uri: path }, { shouldPlay: true, isLooping: false, volume: 0 });
      nextSound = created.sound;
    } catch (e) {
      console.warn('Swap failed to create next instance', k, e);
      return;
    }
    if (trackGenRef.current.get(k) !== generation) {
      await nextSound.unloadAsync().catch(() => {});
      return;
    }
    const oldSound = handle.current;
    handle.current = nextSound;
    // Armed immediately, relative to nextSound's own true start - not to
    // when this crossfade ramp happens to finish.
    handle.swapTimer = setTimeout(() => performSwap(k, generation), LOOP_MS - SWAP_LEAD_MS);

    const steps = 12;
    for (let step = 1; step <= steps; step++) {
      if (trackGenRef.current.get(k) !== generation) {
        if (handle.swapTimer) clearTimeout(handle.swapTimer);
        await Promise.all([oldSound.unloadAsync().catch(() => {}), nextSound.unloadAsync().catch(() => {})]);
        return;
      }
      const frac = step / steps;
      const vol = tracksRef.current.get(k)?.targetVolume ?? handle.targetVolume;
      await Promise.all([
        oldSound.setVolumeAsync(vol * (1 - frac)).catch(() => {}),
        nextSound.setVolumeAsync(vol * frac).catch(() => {}),
      ]);
      await new Promise((r) => setTimeout(r, LOOP_CROSSFADE_MS / steps));
    }
    await oldSound.stopAsync().catch(() => {});
    await oldSound.unloadAsync().catch(() => {});
  }, []);

  const ensureTrackPlaying = useCallback(async (k: SoundKind, vol: number) => {
    const existing = tracksRef.current.get(k);
    if (existing) {
      existing.targetVolume = vol;
      existing.current.setVolumeAsync(vol).catch(() => {});
      return;
    }
    const generation = (trackGenRef.current.get(k) ?? 0) + 1;
    trackGenRef.current.set(k, generation);
    setBusyCount((c) => c + 1);
    try {
      const path = await ensureSampleFile(k);
      if (trackGenRef.current.get(k) !== generation) return;
      const { sound } = await Audio.Sound.createAsync(
        { uri: path },
        { shouldPlay: true, isLooping: false, volume: 0 },
      );
      if (trackGenRef.current.get(k) !== generation) {
        await sound.unloadAsync().catch(() => {});
        return;
      }
      const swapTimer = setTimeout(() => performSwap(k, generation), LOOP_MS - SWAP_LEAD_MS);
      tracksRef.current.set(k, { current: sound, targetVolume: vol, swapTimer });
      const steps = 8;
      for (let step = 1; step <= steps; step++) {
        if (trackGenRef.current.get(k) !== generation) return;
        await sound.setVolumeAsync((vol * step) / steps).catch(() => {});
        await new Promise((r) => setTimeout(r, 400 / steps));
      }
    } catch (e) {
      console.warn('Track failed', k, e);
    } finally {
      setBusyCount((c) => Math.max(0, c - 1));
    }
  }, [performSwap]);

  const removeTrack = useCallback(async (k: SoundKind) => {
    const handle = tracksRef.current.get(k);
    if (!handle) return;
    trackGenRef.current.set(k, (trackGenRef.current.get(k) ?? 0) + 1);
    tracksRef.current.delete(k);
    if (handle.swapTimer) clearTimeout(handle.swapTimer);
    await handle.current.stopAsync().catch(() => {});
    await handle.current.unloadAsync().catch(() => {});
  }, []);

  const play = useCallback(
    async (overrideMix?: Mix) => {
      const activeMix = overrideMix ?? mix;
      const active = Object.entries(activeMix).filter(([, v]) => (v ?? 0) > 0) as [SoundKind, number][];
      if (!active.length) return;
      setPlaying(true);
      await Promise.all(active.map(([k, v]) => ensureTrackPlaying(k, v)));
      if (timerMin > 0) setTimerEnds(Date.now() + timerMin * 60 * 1000);
      hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    },
    [mix, timerMin, ensureTrackPlaying],
  );

  // Stable refs so the remote-command listener (registered once) always
  // calls the current play/stop/playing without needing to re-subscribe.
  const playRef = useRef(play);
  playRef.current = play;
  const stopRef = useRef(stop);
  stopRef.current = stop;
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    const sub = addRemoteCommandListener((command) => {
      if (command === 'play') {
        if (!playingRef.current) playRef.current();
      } else if (command === 'pause') {
        if (playingRef.current) stopRef.current();
      } else {
        if (playingRef.current) stopRef.current();
        else playRef.current();
      }
    });
    return () => sub.remove();
  }, []);

  const toggleSound = useCallback(
    (k: SoundKind) => {
      hapticSelection();
      const turningOn = !((mix[k] ?? 0) > 0);
      const nextMix = { ...mix, [k]: turningOn ? DEFAULT_VOLUME : 0 };
      setMix(nextMix);
      if (playing) {
        if (turningOn) ensureTrackPlaying(k, DEFAULT_VOLUME);
        else removeTrack(k);
      } else if (turningOn && autoPlayEnabled) {
        // With Auto Play on, picking a sound starts it right away - no
        // separate tap on the play button needed.
        play(nextMix);
      }
    },
    [mix, playing, autoPlayEnabled, ensureTrackPlaying, removeTrack, play],
  );

  const togglePopular = useCallback((k: SoundKind) => {
    hapticSelection();
    setPopularKinds((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }, []);

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
        hapticNotification(Haptics.NotificationFeedbackType.Success);
      },
      'plain-text',
    );
  }, [mix]);

  const loadPreset = useCallback(
    async (p: Preset) => {
      hapticSelection();
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
  const heroLabel = activeSounds.length
    ? activeSounds.map((s) => soundI18n(langKey, s.kind).label).join(' + ')
    : t(langKey, 'heroDefaultLabel');
  const heroTagline =
    activeSounds.length === 1
      ? soundI18n(langKey, activeSounds[0].kind).tagline
      : activeSounds.length > 1
        ? t(langKey, 'heroCustomMix')
        : t(langKey, 'heroDefaultTagline');

  // require()'d images resolve to a packager/asset URI, not a plain
  // filesystem path - the native module needs a real file it can hand to
  // UIImage(contentsOfFile:), so each artwork is downloaded/localized once
  // up front and cached here by category key.
  const artworkPathsRef = useRef<Partial<Record<SoundCategory | 'Mix', string>>>({});
  const [artworkReady, setArtworkReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        (Object.keys(NOWPLAYING_ARTWORK_SOURCE) as (SoundCategory | 'Mix')[]).map(async (key) => {
          const asset = Asset.fromModule(NOWPLAYING_ARTWORK_SOURCE[key]);
          await asset.downloadAsync();
          return [key, asset.localUri ?? asset.uri] as const;
        }),
      );
      if (cancelled) return;
      artworkPathsRef.current = Object.fromEntries(entries);
      setArtworkReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCategories = new Set(activeSounds.map((s) => s.category));
  const artworkKey: SoundCategory | 'Mix' = activeCategories.size === 1 ? [...activeCategories][0] : 'Mix';

  // Keep the lock-screen / Control Center entry in sync: no mix selected at
  // all means there's nothing to resume, so the entry is cleared entirely;
  // otherwise it stays visible and just flips its play/pause icon, so the
  // widget never disappears out from under a remote play/pause tap.
  useEffect(() => {
    if (!activeSounds.length) {
      clearNowPlayingInfo();
      return;
    }
    const artworkUri = artworkPathsRef.current[artworkKey];
    // UIImage(contentsOfFile:) wants a plain path, not a file:// URI.
    const artworkPath = artworkUri?.startsWith('file://') ? artworkUri.slice('file://'.length) : artworkUri;
    setNowPlayingInfo(heroLabel, 'Quiet Room', playing, artworkPath ?? null);
  }, [playing, heroLabel, activeSounds.length, artworkKey, artworkReady]);

  const CATEGORY_KEY: Record<SoundCategory, Parameters<typeof t>[1]> = {
    Noise: 'catNoise',
    Nature: 'catNature',
    Fans: 'catFans',
    Music: 'catMusic',
    Binaural: 'catBinaural',
  };

  const renderSoundTile = (s: (typeof SOUNDS)[number]) => {
    const vol = mix[s.kind] ?? 0;
    const active = vol > 0;
    const i18nSound = soundI18n(langKey, s.kind);
    return (
      <Pressable
        key={s.kind}
        onPress={() => toggleSound(s.kind)}
        accessibilityRole="switch"
        accessibilityLabel={i18nSound.label}
        accessibilityHint={i18nSound.tagline}
        accessibilityState={{ checked: active }}
        style={({ pressed }) => [
          styles.tile,
          active && styles.tileActive,
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={styles.tileLabelRow}>
          <Text style={styles.tileIcon}>{SOUND_ICON[s.kind]}</Text>
          <Text style={[styles.tileText, active && styles.tileTextActive]}>{i18nSound.label}</Text>
        </View>
        {active && (
          <Slider
            style={styles.tileSlider}
            minimumValue={0.05}
            maximumValue={1}
            value={vol}
            minimumTrackTintColor={theme.bg}
            maximumTrackTintColor="rgba(0,0,0,0.35)"
            thumbTintColor={theme.bg}
            onValueChange={(v) => adjustVolume(s.kind, v)}
            accessibilityLabel={`${i18nSound.label} volume`}
          />
        )}
      </Pressable>
    );
  };

  if (showSettings) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              hapticSelection();
              setShowSettings(false);
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.backBtnText}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{t(langKey, 'settingsSectionLabel')}</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <View style={styles.bottom}>
            <View style={styles.settingsRow}>
              <View style={styles.settingsTextBlock}>
                <Text style={styles.settingsLabel}>{t(langKey, 'settingsAutoPlayLabel')}</Text>
                <Text style={styles.settingsHint}>{t(langKey, 'settingsAutoPlayHint')}</Text>
              </View>
              <Switch
                value={autoPlayEnabled}
                onValueChange={(v) => {
                  hapticSelection();
                  setAutoPlayEnabled(v);
                }}
                trackColor={{ false: theme.surfaceBorder, true: theme.accent }}
                thumbColor={theme.textPrimary}
              />
            </View>

            <View style={styles.settingsRow}>
              <View style={styles.settingsTextBlock}>
                <Text style={styles.settingsLabel}>{t(langKey, 'settingsBackgroundLabel')}</Text>
                <Text style={styles.settingsHint}>{t(langKey, 'settingsBackgroundHint')}</Text>
              </View>
              <Switch
                value={keepPlayingInBackground}
                onValueChange={(v) => {
                  hapticSelection();
                  setKeepPlayingInBackground(v);
                }}
                trackColor={{ false: theme.surfaceBorder, true: theme.accent }}
                thumbColor={theme.textPrimary}
              />
            </View>

            <View style={styles.settingsRow}>
              <View style={styles.settingsTextBlock}>
                <Text style={styles.settingsLabel}>{t(langKey, 'settingsHapticsLabel')}</Text>
                <Text style={styles.settingsHint}>{t(langKey, 'settingsHapticsHint')}</Text>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={(v) => {
                  setHapticsEnabled(v);
                  if (v) Haptics.selectionAsync().catch(() => {});
                }}
                trackColor={{ false: theme.surfaceBorder, true: theme.accent }}
                thumbColor={theme.textPrimary}
              />
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 30 }]}>{t(langKey, 'settingsThemeLabel')}</Text>
            <View style={styles.themeRow}>
              {THEMES.map((th) => (
                <Pressable
                  key={th.key}
                  onPress={() => {
                    hapticSelection();
                    setThemeKey(th.key);
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={th.name}
                  accessibilityState={{ checked: themeKey === th.key }}
                  style={styles.themeSwatchWrap}
                >
                  <View style={[styles.themeSwatch, themeKey === th.key && styles.themeSwatchActive]}>
                    <View style={[styles.themeSwatchInner, { backgroundColor: th.accent }]} />
                  </View>
                  <Text style={styles.themeSwatchLabel} numberOfLines={1}>{th.name}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 30 }]}>{t(langKey, 'settingsLanguageLabel')}</Text>
            <View style={styles.langList}>
              {LANGUAGES.map((l, i) => (
                <Pressable
                  key={l.key}
                  onPress={() => {
                    hapticSelection();
                    setLangKey(l.key);
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={l.label}
                  accessibilityState={{ checked: langKey === l.key }}
                  style={({ pressed }) => [
                    styles.langRow,
                    i === LANGUAGES.length - 1 && styles.langRowLast,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.langRowText}>{l.label}</Text>
                  {langKey === l.key && <Text style={styles.langRowCheck}>✓</Text>}
                </Pressable>
              ))}
            </View>

            <Text style={styles.foot}>{t(langKey, 'footer')}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.brand}>Quiet <Text style={styles.brandItalic}>Room</Text></Text>
        <Pressable
          onPress={() => {
            hapticSelection();
            setShowSettings(true);
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t(langKey, 'settingsSectionLabel')}
          style={({ pressed }) => [styles.gearBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.gearBtnText}>⚙️</Text>
        </Pressable>
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
              accessibilityLabel={playing ? t(langKey, 'playStop') : t(langKey, 'playStart')}
              accessibilityState={{ disabled: busyCount > 0 || !activeSounds.length, busy: busyCount > 0 }}
              style={({ pressed }) => [
                styles.playBtn,
                playing && styles.playBtnPlaying,
                pressed && { opacity: 0.85 },
                (busyCount > 0 || !activeSounds.length) && { opacity: 0.5 },
              ]}
            >
              <View style={styles.playBtnInner} pointerEvents="none">
                {busyCount > 0 ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : (
                  <Text style={[styles.playBtnText, playing && styles.playBtnTextPlaying]}>
                    {playing ? '■' : '▶'}
                  </Text>
                )}
              </View>
            </Pressable>
            {timerEnds != null && playing && (
              <Text style={styles.remaining}>Stopping in {remLabel}</Text>
            )}
          </View>
        </View>

        <View style={styles.bottom}>
          <Text style={styles.sectionLabel}>{t(langKey, 'soundsSectionLabel')}</Text>

          <View style={styles.categoryBlock}>
            <View style={styles.presetHeaderRow}>
              <Text style={styles.categoryLabel}>{t(langKey, 'catPopular')}</Text>
              <Pressable
                onPress={() => {
                  hapticSelection();
                  setShowPopularEditor(true);
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t(langKey, 'editPopular')}
              >
                <Text style={styles.saveLink}>{t(langKey, 'editPopular')}</Text>
              </Pressable>
            </View>
            <View style={styles.grid}>
              {popularKinds.map((k) => SOUNDS.find((s) => s.kind === k)).filter(Boolean).map((s) => renderSoundTile(s!))}
            </View>
          </View>

          {SOUND_CATEGORIES.map((cat) => (
            <View key={cat} style={styles.categoryBlock}>
              <Text style={styles.categoryLabel}>{t(langKey, CATEGORY_KEY[cat])}</Text>
              <View style={styles.grid}>
                {SOUNDS.filter((s) => s.category === cat).map((s) => renderSoundTile(s))}
              </View>
            </View>
          ))}

          <Text style={[styles.sectionLabel, { marginTop: 22 }]}>{t(langKey, 'stopPlayingAfter')}</Text>
          <View style={styles.chipRow}>
            {TIMER_OPTIONS.map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  hapticSelection();
                  setTimerMin(m);
                  if (playing && m > 0) setTimerEnds(Date.now() + m * 60 * 1000);
                  else if (m === 0) setTimerEnds(null);
                }}
                accessibilityRole="radio"
                accessibilityLabel={m === 0 ? 'Do not stop automatically' : `Stop playing after ${formatTimerMinutes(m)}`}
                accessibilityState={{ checked: timerMin === m }}
                style={({ pressed }) => [
                  styles.chip,
                  styles.timerChip,
                  timerMin === m && styles.chipActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.chipText, timerMin === m && styles.chipTextActive]}>
                  {m === 0 ? t(langKey, 'timerOff') : formatTimerMinutes(m)}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => {
                hapticSelection();
                setPickerDurationSec((customTimerMin ?? 30) * 60);
                setShowTimerPicker(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={customTimerMin != null ? `Stop playing after ${formatTimerMinutes(customTimerMin)}` : 'Set a custom stop time'}
              accessibilityHint="Opens a wheel to pick hours and minutes"
              accessibilityState={{ checked: customTimerMin != null && timerMin === customTimerMin }}
              style={({ pressed }) => [
                styles.chip,
                styles.timerChip,
                customTimerMin != null && timerMin === customTimerMin && styles.chipActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  customTimerMin != null && timerMin === customTimerMin && styles.chipTextActive,
                ]}
              >
                {customTimerMin != null ? formatTimerMinutes(customTimerMin) : t(langKey, 'timerCustom')}
              </Text>
            </Pressable>
          </View>

          <Modal visible={showTimerPicker} transparent animationType="slide" onRequestClose={() => setShowTimerPicker(false)}>
            <Pressable style={styles.pickerOverlay} onPress={() => setShowTimerPicker(false)}>
              <Animated.View style={[styles.pickerSheet, { transform: [{ translateY: timerDrag.translateY }] }]}>
                <View {...timerDrag.panHandlers} style={styles.pickerHandleTouchArea}>
                  <View style={styles.pickerHandle} />
                </View>
                <Pressable onPress={() => {}}>
                <View style={styles.pickerHeaderRow}>
                  <Text style={styles.pickerHeaderTitle}>{t(langKey, 'timerSheetTitle')}</Text>
                  <Pressable
                    onPress={() => setShowTimerPicker(false)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    style={({ pressed }) => [styles.pickerCloseBtn, pressed && { opacity: 0.8 }]}
                  >
                    <Text style={styles.pickerCloseText}>✕</Text>
                  </Pressable>
                </View>

                <View style={styles.pickerTabs}>
                  <Pressable
                    onPress={() => {
                      hapticSelection();
                      setPickerMode('duration');
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: pickerMode === 'duration' }}
                    style={[styles.pickerTab, pickerMode === 'duration' && styles.pickerTabActive]}
                  >
                    <Text style={[styles.pickerTabText, pickerMode === 'duration' && styles.pickerTabTextActive]}>
                      {t(langKey, 'timerDuration')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      hapticSelection();
                      setPickerMode('endtime');
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: pickerMode === 'endtime' }}
                    style={[styles.pickerTab, pickerMode === 'endtime' && styles.pickerTabActive]}
                  >
                    <Text style={[styles.pickerTabText, pickerMode === 'endtime' && styles.pickerTabTextActive]}>
                      {t(langKey, 'timerEndTime')}
                    </Text>
                  </Pressable>
                </View>

                {pickerMode === 'duration' ? (
                  <DateTimePicker
                    key="duration"
                    mode="countdown"
                    display="spinner"
                    value={new Date(0, 0, 0, Math.floor(pickerDurationSec / 3600), Math.floor((pickerDurationSec % 3600) / 60))}
                    onChange={(_, date) => {
                      if (date) setPickerDurationSec(date.getHours() * 3600 + date.getMinutes() * 60);
                    }}
                    themeVariant="dark"
                    style={styles.pickerWheel}
                  />
                ) : (
                  <DateTimePicker
                    key="endtime"
                    mode="time"
                    display="spinner"
                    value={pickerEndTime}
                    onChange={(_, date) => {
                      if (date) setPickerEndTime(date);
                    }}
                    themeVariant="dark"
                    style={styles.pickerWheel}
                  />
                )}

                <Text style={styles.pickerShutoff}>
                  {t(langKey, 'timerShutoff')}: {formatClock(
                    pickerMode === 'duration'
                      ? new Date(Date.now() + pickerDurationSec * 1000)
                      : (() => {
                          const target = new Date(pickerEndTime);
                          const now = new Date();
                          target.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
                          if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
                          return target;
                        })(),
                  )}
                </Text>

                <Pressable
                  onPress={() => {
                    let minutes: number;
                    if (pickerMode === 'duration') {
                      minutes = Math.max(1, Math.round(pickerDurationSec / 60));
                    } else {
                      const target = new Date(pickerEndTime);
                      const now = new Date();
                      target.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
                      if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
                      minutes = Math.max(1, Math.round((target.getTime() - now.getTime()) / 60000));
                    }
                    setCustomTimerMin(minutes);
                    setTimerMin(minutes);
                    setTimerEnds(Date.now() + minutes * 60 * 1000);
                    if (!playing) play();
                    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
                    setShowTimerPicker(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t(langKey, 'timerStart')}
                  style={({ pressed }) => [styles.pickerStartBtn, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.pickerStartText}>{t(langKey, 'timerStart')}</Text>
                </Pressable>
                </Pressable>
              </Animated.View>
            </Pressable>
          </Modal>

          <Modal visible={showPopularEditor} transparent animationType="slide" onRequestClose={() => setShowPopularEditor(false)}>
            <Pressable style={styles.pickerOverlay} onPress={() => setShowPopularEditor(false)}>
              <Animated.View style={[styles.pickerSheet, { transform: [{ translateY: popularEditorDrag.translateY }] }]}>
                <View {...popularEditorDrag.panHandlers} style={styles.pickerHandleTouchArea}>
                  <View style={styles.pickerHandle} />
                </View>
                <Pressable onPress={() => {}}>
                <View style={styles.pickerHeaderRow}>
                  <Text style={styles.pickerHeaderTitle}>{t(langKey, 'editPopularTitle')}</Text>
                  <Pressable
                    onPress={() => setShowPopularEditor(false)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={t(langKey, 'done')}
                    style={({ pressed }) => [styles.pickerCloseBtn, pressed && { opacity: 0.8 }]}
                  >
                    <Text style={styles.pickerCloseText}>✕</Text>
                  </Pressable>
                </View>
                <Text style={styles.settingsHint}>{t(langKey, 'editPopularHint')}</Text>
                <ScrollView style={styles.popularEditorScroll} showsVerticalScrollIndicator={false}>
                  {SOUND_CATEGORIES.map((cat) => (
                    <View key={cat} style={styles.categoryBlock}>
                      <Text style={styles.categoryLabel}>{t(langKey, CATEGORY_KEY[cat])}</Text>
                      <View style={styles.langList}>
                        {SOUNDS.filter((s) => s.category === cat).map((s, i, arr) => {
                          const included = popularKinds.includes(s.kind);
                          return (
                            <Pressable
                              key={s.kind}
                              onPress={() => togglePopular(s.kind)}
                              accessibilityRole="checkbox"
                              accessibilityLabel={soundI18n(langKey, s.kind).label}
                              accessibilityState={{ checked: included }}
                              style={({ pressed }) => [
                                styles.langRow,
                                i === arr.length - 1 && styles.langRowLast,
                                pressed && { opacity: 0.7 },
                              ]}
                            >
                              <Text style={styles.langRowText}>{soundI18n(langKey, s.kind).label}</Text>
                              {included && <Text style={styles.langRowCheck}>✓</Text>}
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </ScrollView>
                </Pressable>
              </Animated.View>
            </Pressable>
          </Modal>

          <View style={styles.presetHeaderRow}>
            <Text style={styles.sectionLabel}>{t(langKey, 'savedMixes')}</Text>
            <Pressable onPress={savePreset} hitSlop={8} accessibilityRole="button" accessibilityLabel={t(langKey, 'saveCurrent')}>
              <Text style={styles.saveLink}>{t(langKey, 'saveCurrent')}</Text>
            </Pressable>
          </View>
          {presets.length ? (
            <View style={styles.chipRow}>
              {presets.map((p) => (
                <View key={p.id} style={[styles.chip, styles.presetChip]}>
                  <Pressable
                    onPress={() => loadPreset(p)}
                    accessibilityRole="button"
                    accessibilityLabel={`Load mix: ${p.name}`}
                    style={({ pressed }) => pressed && { opacity: 0.85 }}
                  >
                    <Text style={styles.chipText}>{p.name}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => deletePreset(p)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete mix: ${p.name}`}
                    style={({ pressed }) => [styles.presetDeleteBtn, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={styles.presetDeleteText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyPresets}>{t(langKey, 'emptyPresetsHint')}</Text>
          )}

          <Text style={styles.foot}>{t(langKey, 'footer')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type Theme = {
  key: string;
  name: string;
  bg: string;
  bgAlt: string;
  surface: string;
  surfaceBorder: string;
  surfaceAlt: string;
  accent: string;
  accentText: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textFaint: string;
};

const THEMES: Theme[] = [
  {
    key: 'ember',
    name: 'Warm Ember',
    bg: '#180f0a',
    bgAlt: '#241811',
    surface: '#2b1c13',
    surfaceBorder: '#47301f',
    surfaceAlt: '#382417',
    accent: '#d99a52',
    accentText: '#180f0a',
    textPrimary: '#f3e6d8',
    textSecondary: '#cba382',
    textTertiary: '#8a6a51',
    textFaint: '#5c4736',
  },
  {
    key: 'teal',
    name: 'Midnight Teal',
    bg: '#0d1518',
    bgAlt: '#16232a',
    surface: '#1c2829',
    surfaceBorder: '#2a3a3b',
    surfaceAlt: '#243538',
    accent: '#4d8a8a',
    accentText: '#0d1518',
    textPrimary: '#e2eced',
    textSecondary: '#9aafaf',
    textTertiary: '#5d7373',
    textFaint: '#3f5252',
  },
  {
    key: 'space',
    name: 'Deep Space',
    bg: '#100e1c',
    bgAlt: '#1a1730',
    surface: '#201c38',
    surfaceBorder: '#322c52',
    surfaceAlt: '#2a2447',
    accent: '#8a7cf0',
    accentText: '#100e1c',
    textPrimary: '#e8e4fb',
    textSecondary: '#a99fd6',
    textTertiary: '#6a5f99',
    textFaint: '#453d6b',
  },
  {
    key: 'forest',
    name: 'Forest Night',
    bg: '#0c1510',
    bgAlt: '#16241c',
    surface: '#1b2b22',
    surfaceBorder: '#2b4234',
    surfaceAlt: '#223a2c',
    accent: '#5fae7c',
    accentText: '#0c1510',
    textPrimary: '#e3f0e6',
    textSecondary: '#9dc2a9',
    textTertiary: '#5c8068',
    textFaint: '#3c5747',
  },
  {
    key: 'ocean',
    name: 'Ocean Depth',
    bg: '#091420',
    bgAlt: '#10202f',
    surface: '#142838',
    surfaceBorder: '#22415a',
    surfaceAlt: '#1b3547',
    accent: '#4fa3d9',
    accentText: '#091420',
    textPrimary: '#e2f0f8',
    textSecondary: '#9dc4dd',
    textTertiary: '#5c8298',
    textFaint: '#3c5764',
  },
];
const DEFAULT_THEME_KEY = 'ember';

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { color: t.textPrimary, fontSize: 20, fontWeight: '700' },
    gearBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    gearBtnText: { fontSize: 22 },
    backBtn: { width: 36, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
    backBtnText: { color: t.textPrimary, fontSize: 32, fontWeight: '400', lineHeight: 34 },
    brand: { fontSize: 22, fontWeight: '700', color: t.textPrimary, letterSpacing: -0.2 },
    brandItalic: { fontStyle: 'italic', color: t.accent, fontWeight: '600' },

    scrollBody: { flexGrow: 1 },
    body: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingTop: 24, paddingBottom: 12 },
    bigLabel: { color: t.textPrimary, fontSize: 32, fontWeight: '300', letterSpacing: -0.5, marginBottom: 8, textAlign: 'center' },
    tagline: { color: t.textSecondary, fontSize: 14, textAlign: 'center', maxWidth: 300, fontStyle: 'italic', marginBottom: 32 },

    dial: { alignItems: 'center', justifyContent: 'center' },
    playBtn: {
      width: 120, height: 120, borderRadius: 60,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: t.surface,
      borderWidth: 1.5, borderColor: t.surfaceBorder,
    },
    playBtnPlaying: { backgroundColor: t.accent, borderColor: t.accent },
    playBtnInner: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    playBtnText: { color: t.textPrimary, fontSize: 42, lineHeight: 44, marginLeft: 6 },
    playBtnTextPlaying: { marginLeft: 0 },
    remaining: { marginTop: 18, color: t.textSecondary, fontSize: 20, fontVariant: ['tabular-nums'], letterSpacing: 1 },

    bottom: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 28 },
    sectionLabel: { fontSize: 11, color: t.textTertiary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },

    categoryBlock: { marginBottom: 18 },
    categoryLabel: { fontSize: 13, color: t.textSecondary, fontWeight: '700', marginBottom: 8 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tile: {
      width: '47%',
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.surfaceBorder,
      minHeight: 56,
      justifyContent: 'center',
    },
    tileActive: { backgroundColor: t.accent, borderColor: t.accent },
    tileLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
    tileIcon: { fontSize: 18, flexShrink: 0 },
    tileText: { color: t.textSecondary, fontSize: 15, fontWeight: '600', flexShrink: 1 },
    tileTextActive: { color: t.accentText },
    tileSlider: { width: '100%', height: 28, marginTop: 4 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chipRowScroll: { flexDirection: 'row', gap: 8, paddingRight: 4 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: t.surface, borderWidth: 1, borderColor: t.surfaceBorder },
    presetChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 10 },
    presetDeleteBtn: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
    presetDeleteText: { color: t.textSecondary, fontSize: 10, fontWeight: '700', lineHeight: 12 },
    timerChip: { paddingHorizontal: 14, paddingVertical: 8 },
    chipActive: { backgroundColor: t.accent, borderColor: t.accent },
    chipText: { color: t.textSecondary, fontSize: 14, fontWeight: '600' },
    chipTextActive: { color: t.accentText },

    presetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    pickerSheet: { backgroundColor: t.bgAlt, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, paddingBottom: 40, paddingHorizontal: 22 },
    pickerHandleTouchArea: { paddingVertical: 12, marginTop: -10, marginBottom: 8 },
    pickerHandle: { width: 36, height: 5, borderRadius: 3, backgroundColor: t.surfaceBorder, alignSelf: 'center' },
    pickerHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    pickerHeaderTitle: { color: t.textPrimary, fontSize: 24, fontWeight: '700' },
    pickerCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: t.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    pickerCloseText: { color: t.textSecondary, fontSize: 15, fontWeight: '700' },
    pickerTabs: { flexDirection: 'row', backgroundColor: t.bg, borderRadius: 14, padding: 4, gap: 4, marginBottom: 8 },
    pickerTab: { flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: 'center' },
    pickerTabActive: { backgroundColor: t.surfaceAlt },
    pickerTabText: { color: t.textSecondary, fontSize: 15, fontWeight: '700' },
    pickerTabTextActive: { color: t.textPrimary },
    pickerWheel: { alignSelf: 'stretch', height: 190 },
    pickerShutoff: { color: t.textSecondary, fontSize: 15, textAlign: 'center', marginTop: 4, marginBottom: 22 },
    pickerStartBtn: { backgroundColor: t.accent, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
    pickerStartText: { color: t.accentText, fontSize: 17, fontWeight: '700' },
    saveLink: { color: t.accent, fontSize: 13, fontWeight: '700' },
    emptyPresets: { color: t.textPrimary, fontSize: 14, fontWeight: '500', lineHeight: 19 },

    foot: { color: t.textFaint, fontSize: 10, textAlign: 'center', marginTop: 28, fontStyle: 'italic', lineHeight: 14, letterSpacing: 0.3, textTransform: 'uppercase' },

    settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    settingsTextBlock: { flex: 1, paddingRight: 16 },
    settingsLabel: { color: t.textPrimary, fontSize: 15, fontWeight: '600' },
    settingsHint: { color: t.textSecondary, fontSize: 12, marginTop: 2, lineHeight: 16 },
    themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
    themeSwatchWrap: { alignItems: 'center', gap: 6 },
    themeSwatch: {
      width: 44, height: 44, borderRadius: 22,
      borderWidth: 2, borderColor: 'transparent',
      alignItems: 'center', justifyContent: 'center',
    },
    themeSwatchActive: { borderColor: t.textPrimary },
    themeSwatchInner: { width: 34, height: 34, borderRadius: 17 },
    themeSwatchLabel: { color: t.textSecondary, fontSize: 10, maxWidth: 60, textAlign: 'center' },
    langList: { backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.surfaceBorder, overflow: 'hidden' },
    popularEditorScroll: { maxHeight: 420, marginTop: 14 },
    langRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 15, paddingHorizontal: 16,
      borderBottomWidth: 1, borderBottomColor: t.surfaceBorder,
    },
    langRowLast: { borderBottomWidth: 0 },
    langRowText: { color: t.textPrimary, fontSize: 16 },
    langRowCheck: { color: t.accent, fontSize: 17, fontWeight: '700' },
  });
}
