import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type SoundKind = 'white' | 'pink' | 'brown' | 'rain';

const SOUNDS: { kind: SoundKind; label: string; tagline: string }[] = [
  { kind: 'white', label: 'White', tagline: 'Crisp, even hiss — like an old radio tuned between stations.' },
  { kind: 'pink', label: 'Pink', tagline: 'Softer, lower energy — closer to leaves in wind.' },
  { kind: 'brown', label: 'Brown', tagline: 'Deep, rumbling roll — surf, or a distant waterfall.' },
  { kind: 'rain', label: 'Rain', tagline: 'Filtered noise with scattered patter — steady, soothing.' },
];

const SAMPLE_RATE = 44100;
const DURATION_SEC = 10;
const SAMPLES_DIR = `${FileSystem.cacheDirectory}quietroom-samples/`;

const TIMER_OPTIONS = [0, 15, 30, 45, 60, 90];

function writeStr(view: DataView, off: number, s: string) {
  for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
}

function genWav(sampleFn: (i: number) => number): Uint8Array {
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
    const s = Math.max(-1, Math.min(1, sampleFn(i)));
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
  const gen =
    kind === 'white' ? whiteGenerator() :
    kind === 'pink'  ? pinkGenerator()  :
    kind === 'brown' ? brownGenerator() :
                       rainGenerator();
  const wav = genWav(gen);
  const b64 = uint8ToBase64(wav);
  await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
  return path;
}

export default function App() {
  useKeepAwake();
  const [selected, setSelected] = useState<SoundKind>('pink');
  const [playing, setPlaying] = useState(false);
  const [generating, setGenerating] = useState<SoundKind | null>(null);
  const [timerMin, setTimerMin] = useState(0); // 0 = no timer
  const [timerEnds, setTimerEnds] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await AsyncStorage.getItem('quietroom:config:v1');
        if (cfg) {
          const c = JSON.parse(cfg);
          if (c.selected) setSelected(c.selected);
          if (typeof c.timerMin === 'number') setTimerMin(c.timerMin);
        }
      } catch {}
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          interruptionModeIOS: 1, // do not mix
          interruptionModeAndroid: 1,
        } as any);
      } catch {}
    })();
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('quietroom:config:v1', JSON.stringify({ selected, timerMin })).catch(() => {});
  }, [selected, timerMin]);

  // Ticking clock for sleep timer countdown display
  useEffect(() => {
    if (!timerEnds) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [timerEnds]);

  // Auto-stop on timer expiry
  useEffect(() => {
    if (!playing || !timerEnds) return;
    if (now >= timerEnds) {
      stop();
    }
  }, [now, timerEnds, playing]);

  const play = useCallback(async () => {
    try {
      setGenerating(selected);
      const path = await ensureSampleFile(selected);
      setGenerating(null);
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: path },
        { shouldPlay: true, isLooping: true, volume: 1.0 },
      );
      soundRef.current = sound;
      setPlaying(true);
      if (timerMin > 0) setTimerEnds(Date.now() + timerMin * 60 * 1000);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch (e) {
      setGenerating(null);
      console.warn('Play failed', e);
    }
  }, [selected, timerMin]);

  const stop = useCallback(async () => {
    try {
      await soundRef.current?.stopAsync();
      await soundRef.current?.unloadAsync();
      soundRef.current = null;
    } catch {}
    setPlaying(false);
    setTimerEnds(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const swapTo = useCallback(
    async (k: SoundKind) => {
      setSelected(k);
      Haptics.selectionAsync().catch(() => {});
      if (!playing) return;
      try {
        setGenerating(k);
        const path = await ensureSampleFile(k);
        setGenerating(null);
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        const { sound } = await Audio.Sound.createAsync(
          { uri: path },
          { shouldPlay: true, isLooping: true, volume: 1.0 },
        );
        soundRef.current = sound;
      } catch (e) {
        setGenerating(null);
      }
    },
    [playing],
  );

  const remaining = timerEnds ? Math.max(0, Math.round((timerEnds - now) / 1000)) : 0;
  const remH = Math.floor(remaining / 3600);
  const remM = Math.floor((remaining % 3600) / 60);
  const remS = remaining % 60;
  const remLabel =
    remH > 0
      ? `${remH}:${remM.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}`
      : `${remM}:${remS.toString().padStart(2, '0')}`;

  const sel = SOUNDS.find((s) => s.kind === selected)!;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.brand}>Quiet <Text style={styles.brandItalic}>Room</Text></Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.bigLabel}>{sel.label}</Text>
        <Text style={styles.tagline}>{sel.tagline}</Text>

        <View style={styles.dial}>
          <Pressable
            onPress={playing ? stop : play}
            disabled={!!generating}
            style={({ pressed }) => [
              styles.playBtn,
              playing && styles.playBtnPlaying,
              pressed && { opacity: 0.85 },
              !!generating && { opacity: 0.6 },
            ]}
          >
            {generating ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Text style={styles.playBtnText}>{playing ? '■' : '▶'}</Text>
            )}
          </Pressable>
          {timerEnds && playing && (
            <Text style={styles.remaining}>{remLabel}</Text>
          )}
        </View>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.sectionLabel}>Sound</Text>
        <View style={styles.chipRow}>
          {SOUNDS.map((s) => (
            <Pressable
              key={s.kind}
              onPress={() => swapTo(s.kind)}
              style={({ pressed }) => [
                styles.chip,
                selected === s.kind && styles.chipActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.chipText, selected === s.kind && styles.chipTextActive]}>
                {s.label}
              </Text>
            </Pressable>
          ))}
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

        <Text style={styles.foot}>
          Sounds are generated on this device. Nothing is downloaded, streamed, or sent anywhere.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1518' },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8 },
  brand: { fontSize: 22, fontWeight: '700', color: '#e2eced', letterSpacing: -0.2 },
  brandItalic: { fontStyle: 'italic', color: '#4d8a8a', fontWeight: '600' },

  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  bigLabel: { color: '#e2eced', fontSize: 44, fontWeight: '300', letterSpacing: -1, marginBottom: 8 },
  tagline: { color: '#7a9090', fontSize: 14, textAlign: 'center', maxWidth: 280, fontStyle: 'italic', marginBottom: 48 },

  dial: { alignItems: 'center', justifyContent: 'center' },
  playBtn: {
    width: 140, height: 140, borderRadius: 70,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1f3334',
    borderWidth: 1.5, borderColor: '#3a5e60',
  },
  playBtnPlaying: { backgroundColor: '#4d8a8a', borderColor: '#4d8a8a' },
  playBtnText: { color: '#e2eced', fontSize: 48, lineHeight: 50, marginLeft: 6 },
  remaining: { marginTop: 20, color: '#7a9090', fontSize: 22, fontVariant: ['tabular-nums'], letterSpacing: 1 },

  bottom: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 28 },
  sectionLabel: { fontSize: 11, color: '#5d7373', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: '#1c2829', borderWidth: 1, borderColor: '#2a3a3b' },
  timerChip: { paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: '#4d8a8a', borderColor: '#4d8a8a' },
  chipText: { color: '#9aafaf', fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#0d1518' },

  foot: { color: '#4a5e5e', fontSize: 11, textAlign: 'center', marginTop: 22, fontStyle: 'italic', lineHeight: 16 },
});
