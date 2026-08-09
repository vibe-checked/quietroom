import ExpoModulesCore
import MediaPlayer

// Lock-screen / Control Center "Now Playing" support for QuietRoom's custom
// multi-track mixer. expo-av plays our looping WAV files but never touches
// MPNowPlayingInfoCenter or MPRemoteCommandCenter, so with no metadata set
// the OS shows nothing at all on the lock screen — this module fills that
// gap without taking over actual playback (JS still drives expo-av; this
// module only reports state and forwards remote button taps back to JS).
public class NowplayingModule: Module {
  // Avoid re-decoding the same artwork file on every setInfo call - it's
  // called on every play/pause/mix change, but the artwork rarely changes.
  private var lastArtworkPath: String?
  private var lastArtwork: MPMediaItemArtwork?

  public func definition() -> ModuleDefinition {
    Name("Nowplaying")

    Events("onRemoteCommand")

    OnCreate {
      let center = MPRemoteCommandCenter.shared()

      // Only play/pause/toggle make sense for a single continuous ambient
      // mix — explicitly disable the rest so the lock screen doesn't show
      // next/previous/seek buttons that would do nothing.
      center.nextTrackCommand.isEnabled = false
      center.previousTrackCommand.isEnabled = false
      center.skipForwardCommand.isEnabled = false
      center.skipBackwardCommand.isEnabled = false
      center.changePlaybackPositionCommand.isEnabled = false
      center.seekForwardCommand.isEnabled = false
      center.seekBackwardCommand.isEnabled = false

      center.playCommand.isEnabled = true
      center.pauseCommand.isEnabled = true
      center.togglePlayPauseCommand.isEnabled = true

      center.playCommand.addTarget { [weak self] _ in
        self?.sendEvent("onRemoteCommand", ["command": "play"])
        return .success
      }
      center.pauseCommand.addTarget { [weak self] _ in
        self?.sendEvent("onRemoteCommand", ["command": "pause"])
        return .success
      }
      center.togglePlayPauseCommand.addTarget { [weak self] _ in
        self?.sendEvent("onRemoteCommand", ["command": "toggle"])
        return .success
      }
    }

    Function("setInfo") { (title: String, subtitle: String, isPlaying: Bool, artworkPath: String?) in
      var info: [String: Any] = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
      info[MPMediaItemPropertyTitle] = title
      info[MPMediaItemPropertyArtist] = subtitle
      // An endless generated loop has no real duration or position - marking
      // it a "live stream" hides the scrubber/elapsed-time UI instead of
      // showing a fake, meaningless timeline.
      info[MPNowPlayingInfoPropertyIsLiveStream] = true
      info[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0

      if let artworkPath = artworkPath {
        if artworkPath == self.lastArtworkPath, let cached = self.lastArtwork {
          info[MPMediaItemPropertyArtwork] = cached
        } else if let image = UIImage(contentsOfFile: artworkPath) {
          let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
          self.lastArtworkPath = artworkPath
          self.lastArtwork = artwork
          info[MPMediaItemPropertyArtwork] = artwork
        }
      }

      MPNowPlayingInfoCenter.default().nowPlayingInfo = info
      MPNowPlayingInfoCenter.default().playbackState = isPlaying ? .playing : .paused
    }

    Function("clear") {
      MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
      MPNowPlayingInfoCenter.default().playbackState = .stopped
    }
  }
}
