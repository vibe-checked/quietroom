import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Ignition } from './Ignition';

// Hold the native splash so the animated open continues from the same frame
// instead of flashing between the two.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Wraps the root component rather than editing its JSX — the app's own tree is
 * left completely untouched, which matters when the root render is a few
 * hundred lines deep.
 */
export function withIgnition<P extends object>(Root: React.ComponentType<P>) {
  return function Ignited(props: P) {
    const [done, setDone] = useState(false);
    useEffect(() => {
      const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 40);
      return () => clearTimeout(t);
    }, []);
    return (
      <View style={{ flex: 1 }}>
        <Root {...props} />
        {!done && <Ignition onDone={() => setDone(true)} />}
      </View>
    );
  };
}
