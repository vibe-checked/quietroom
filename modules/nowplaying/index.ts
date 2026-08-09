import { EventEmitter, EventSubscription, requireNativeModule } from 'expo-modules-core';

export type RemoteCommand = 'play' | 'pause' | 'toggle';

type NowPlayingEvents = {
  onRemoteCommand(payload: { command: RemoteCommand }): void;
};

type NativeNowPlayingModule = {
  /** Sets (or updates) the Now Playing entry. `isPlaying` controls whether
   * the lock screen/Control Center shows a pause or a play icon - the
   * entry itself stays visible either way, so play/pause can be tapped
   * repeatedly without the widget disappearing. `artworkPath` is a local
   * filesystem path (not a require()/bundle URI - the native side needs a
   * real file it can hand to UIImage(contentsOfFile:)). */
  setInfo(title: string, subtitle: string, isPlaying: boolean, artworkPath: string | null): void;
  /** Ends the Now Playing session entirely (nothing left to resume). */
  clear(): void;
};

const NativeModule = requireNativeModule<NativeNowPlayingModule>('Nowplaying');
const emitter = new EventEmitter<NowPlayingEvents>(NativeModule as any);

export function setNowPlayingInfo(
  title: string,
  subtitle: string,
  isPlaying: boolean,
  artworkPath?: string | null,
) {
  NativeModule.setInfo(title, subtitle, isPlaying, artworkPath ?? null);
}

export function clearNowPlayingInfo() {
  NativeModule.clear();
}

/** Fires when the user taps play/pause from the lock screen or Control
 * Center. Your handler is responsible for actually starting/stopping
 * playback and re-calling setNowPlayingInfo with the new state. */
export function addRemoteCommandListener(listener: (command: RemoteCommand) => void): EventSubscription {
  return emitter.addListener('onRemoteCommand', (payload) => listener(payload.command));
}
