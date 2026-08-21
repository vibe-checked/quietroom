import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Pressable, Text, View } from 'react-native';

/** Concentric calm: rings spread outward and settle, a crescent fades up. */
const BG = '#180f0a';
const MOON = '#F6D48A';
const RING = '#8A6438';
const INK = '#F7EBDA';

export function Ignition({ onDone }: { onDone: () => void }) {
  const { width, height } = Dimensions.get('window');
  const S = Math.min(width * 0.66, 260);

  const ripple = useRef(new Animated.Value(0)).current;
  const moon = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [gone, setGone] = useState(false);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    Animated.timing(fade, { toValue: 0, duration: 360, easing: Easing.in(Easing.quad), useNativeDriver: true })
      .start(() => { setGone(true); onDone(); });
  };

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(ripple, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(moon, { toValue: 1, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]),
      Animated.timing(word, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(430),
    ]).start(finish);
  }, []);

  if (gone) return null;

  const RINGS = 4;

  return (
    <Animated.View pointerEvents="box-none" style={{
      position: 'absolute', left: 0, top: 0, width, height, backgroundColor: BG,
      alignItems: 'center', justifyContent: 'center', opacity: fade, zIndex: 9999,
    }}>
      <Pressable style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} onPress={finish} />

      <View style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center' }}>
        {Array.from({ length: RINGS }, (_, i) => {
          const at = i * 0.16;
          const p = ripple.interpolate({ inputRange: [at, Math.min(1, at + 0.72)], outputRange: [0, 1], extrapolate: 'clamp' });
          const size = S * (0.40 + i * 0.20);
          return (
            <Animated.View key={i} style={{
              position: 'absolute', width: size, height: size, borderRadius: size,
              borderWidth: 1.6, borderColor: RING,
              opacity: p.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 0.55, 0.26] }),
              transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) }],
            }} />
          );
        })}

        {/* crescent: a lit disc with the background disc nudged over it */}
        <Animated.View style={{
          width: S * 0.30, height: S * 0.30, alignItems: 'center', justifyContent: 'center',
          opacity: moon,
          transform: [
            { scale: moon.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
            { translateY: moon.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
          ],
        }}>
          <View style={{ position: 'absolute', width: S * 0.30, height: S * 0.30, borderRadius: S, backgroundColor: MOON }} />
          <View style={{
            position: 'absolute', width: S * 0.26, height: S * 0.26, borderRadius: S,
            backgroundColor: BG, left: S * 0.11, top: -S * 0.035,
          }} />
        </Animated.View>
      </View>

      <Animated.View style={{
        alignItems: 'center', marginTop: 26, opacity: word,
        transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      }}>
        <Text style={{ fontSize: 27, fontWeight: '800', letterSpacing: 5, color: INK }}>QUIET ROOM</Text>
        <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 2.6, color: '#A88A67', marginTop: 8 }}>
          SLEEP &amp; FOCUS
        </Text>
      </Animated.View>
    </Animated.View>
  );
}
