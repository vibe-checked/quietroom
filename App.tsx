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
  | 'fan'
  | 'crickets';

const SOUNDS: { kind: SoundKind; label: string; tagline: string }[] = [
  { kind: 'white', label: 'White', tagline: 'Crisp, even hiss — like an old radio tuned between stations.' },
  { kind: 'pink', label: 'Pink', tagline: 'Softer, lower energy — closer to leaves in wind.' },
  { kind: 'brown', label: 'Brown', tagline: 'Deep, rumbling roll — surf, or a distant waterfall.' },
  { kind: 'rain', label: 'Rain', tagline: 'Filtered noise with scattered patter — steady, soothing.' },
  { kind: 'ocean', label: 'Ocean', tagline: 'Slow rolling waves rising and falling on a shore.' },
  { kind: 'wind', label: 'Wind', tagline: 'Gusting air moving through open space.' },
  { kind: 'campfire', label: 'Campfire', tagline: 'Warm crackle and pop of a low fire.' },
  { kind: 'thunder', label: 'Thunder', tagline: 'Distant rolling rumble beneath a steady rain.' },
  { kind: 'fan', label: 'Fan', tagline: 'A steady motor hum — the classic white-noise machine.' },
  { kind: 'crickets', label: 'Night', tagline: 'Quiet dark with a chorus of distant crickets.' },
];

const SAMPLE_RATE = 44100;
const DURATION_SEC = 10;
const SAMPLES_DIR = `${FileSystem.cacheDirectory}quietroom-samples/`;

const TIMER_OPTIONS = [0, 15, 30, 45, 60, 90];
const DEFAULT_VOLUME = 0.7;
const FADE_SECONDS = 5;
const STORAGE_KEY = 'quietroom:config:v2';

function writeStr(view: DataView, off: number, s: string) {
  for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
}

function genWav(sampleFn: () => number): Uint8Array {
  const n = SAMPLE_RATE * DURATION_SEC;
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
    const s = Math.max(-1, Math.min(1, sampleFn()));
    v.setInt16(44 + i * 2, Math.round(s * 32767), true);
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

// Rain approximation: low-passed pink noise + scattered impulses.
function rainGenerator() {
  const pink = pinkGenerator();
  let lp = 0;
  return () => {
    const base = pink();
    lp = lp * 0.96 + base * 0.04;
    let drop = 0;
    if (Math.random() < 0.0025) drop = (Math.random() * 2 - 1) * 0.6;
    return lp * 4.2 + drop;
  };
}

// Ocean: slow-breathing swell over low-passed pink noise.
function oceanGenerator() {
  const pink = pinkGenerator();
  let lp = 0;
  let t = 0;
  return () => {
    const base = pink();
    lp = lp * 0.97 + base * 0.03;
    t += 1;
    const swell = 0.6 + 0.4 * Math.sin((t / SAMPLE_RATE) * 2 * Math.PI * 0.09);
    return lp * 3.8 * swell;
  };
}

// Wind: gusting brown noise with a slow amplitude LFO plus a thin hiss layer.
function windGenerator() {
  const brown = brownGenerator();
  let t = 0;
  return () => {
    const base = brown();
    t += 1;
    const gust = 0.55 + 0.45 * Math.sin((t / SAMPLE_RATE) * 2 * Math.PI * 0.05 + Math.sin((t / SAMPLE_RATE) * 0.3));
    const hiss = (Math.random() * 2 - 1) * 0.15;
    return base * gust + hiss * gust;
  };
}

// Campfire: pink noise bed with frequent sharp decaying pops.
function campfireGenerator() {
  const pink = pinkGenerator();
  let popEnv = 0;
  return () => {
    const base = pink() * 0.7;
    if (popEnv <= 0.001 && Math.random() < 0.02) {
      popEnv = 0.5 + Math.random() * 0.5;
    }
    const pop = popEnv * (Math.random() * 2 - 1);
    popEnv *= 0.85;
    return base + pop;
  };
}

// Thunder: rain bed with rare, slow sub-bass rumbles.
function thunderGenerator() {
  const rain = rainGenerator();
  let rumble = 0;
  let lp = 0;
  return () => {
    const base = rain() * 0.5;
    if (rumble <= 0.002 && Math.random() < 0.0003) {
      rumble = 0.8 + Math.random() * 0.2;
    }
    const w = Math.random() * 2 - 1;
    lp = lp * 0.995 + w * 0.005;
    const boom = lp * rumble * 6;
    rumble *= 0.9995;
    return base + boom;
  };
}

// Fan: steady low-frequency motor hum plus filtered white noise.
function fanGenerator() {
  let phase = 0;
  const white = whiteGenerator();
  return () => {
    phase += 1;
    const hum =
      Math.sin((2 * Math.PI * 100 * phase) / SAMPLE_RATE) * 0.25 +
      Math.sin((2 * Math.PI * 200 * phase) / SAMPLE_RATE) * 0.08;
    const noise = white() * 0.5;
    return hum + noise;
  };
}

// Crickets: quiet pink-noise night floor with periodic chirps.
function cricketsGenerator() {
  const pink = pinkGenerator();
  let lp = 0;
  let t = 0;
  return () => {
    t += 1;
    const floor = pink();
    lp = lp * 0.9 + floor * 0.1;
    const cycleLen = Math.round(SAMPLE_RATE * 0.5);
    const cyclePos = (t % cycleLen) / SAMPLE_RATE;
    let chirp = 0;
    if (cyclePos < 0.08) {
      const env = Math.sin(Math.PI * (cyclePos / 0.08));
      chirp = Math.sin((2 * Math.PI * 3200 * t) / SAMPLE_RATE) * env * 0.5;
    }
    return lp * 0.6 + chirp;
  };
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
    case 'fan': return fanGenerator();
    case 'crickets': return cricketsGenerator();
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
  const wav = genWav(makeGenerator(kind));
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

  const stop = useCallback(async () => {
    genTokenRef.current += 1;
    const entries = Array.from(soundsRef.current.entries());
    soundsRef.current.clear();
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
    setBusyCount(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
        { shouldPlay: true, isLooping: true, volume: vol },
      );
      if (genTokenRef.current !== myToken) {
        await sound.unloadAsync().catch(() => {});
        return;
      }
      soundsRef.current.set(k, sound);
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
                <Text style={styles.playBtnText}>{playing ? '■' : '▶'}</Text>
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
            <Pressable onPress={savePreset} hitSlop={8}>
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
