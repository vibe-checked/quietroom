# Quiet Room

Ambient noise (white / pink / brown / rain) for iPhone, **generated on your device** — no streaming, no licensed audio files shipped, no ads.

- **Support:** https://kiddkevin00.github.io/quietroom/
- **Privacy:** https://kiddkevin00.github.io/quietroom/privacy.html

## How it works

The four noise types are synthesized in JavaScript on first launch using classic generators (Kellett's pink filter, integrated brown noise, low-passed pink + scattered impulses for rain), written to the cache directory as WAV files, then looped via `expo-av`. Plays in silent mode; sleep timer is optional.

## Stack

Expo SDK 54, React 19.1, RN 0.81, TypeScript, `expo-av`, `expo-file-system`, `expo-keep-awake`, `expo-haptics`, AsyncStorage.

## Local dev

```sh
npm install
npx expo start --tunnel
```

## App Store checklist

- [done] Bundle id `com.markutilitylabs.quietroom`, display name, version — `app.json`
- [done] Privacy + Support URLs (see top)
- [you] Apple Developer, Xcode 17+ or EAS, App Store Connect listing, "Data Not Collected" nutrition labels

## License

MIT — see `LICENSE`.
