package expo.modules.labaauto

import androidx.media3.common.AudioAttributes
import androidx.media3.common.DeviceInfo
import androidx.media3.common.FlagSet
import androidx.media3.common.ForwardingPlayer
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Metadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.Timeline
import androidx.media3.common.TrackSelectionParameters
import androidx.media3.common.Tracks
import androidx.media3.common.VideoSize
import androidx.media3.common.text.Cue
import androidx.media3.common.text.CueGroup
import androidx.media3.common.util.UnstableApi
import androidx.media3.extractor.metadata.icy.IcyInfo
import java.util.IdentityHashMap

/**
 * Wraps the car's ExoPlayer for the media session:
 * - shows "song, by station" when the stream sends an ICY StreamTitle, and
 *   "station, Laba · Live radio" otherwise. ExoPlayer would merge the raw
 *   title over the station name, multi-field junk included.
 * - hides seeking, which means nothing on a live stream.
 */
@UnstableApi
class StationPlayer(player: Player) : ForwardingPlayer(player) {
  private val listeners = IdentityHashMap<Player.Listener, Player.Listener>()
  private var streamTitle: String? = null

  init {
    player.addListener(object : Player.Listener {
      override fun onMetadata(metadata: Metadata) {
        for (i in 0 until metadata.length()) {
          val entry = metadata.get(i)
          if (entry is IcyInfo) setStreamTitle(cleanStreamTitle(entry.title))
        }
      }

      override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
        setStreamTitle(null)
      }
    })
  }

  override fun getMediaMetadata(): MediaMetadata {
    // The item's own metadata, not ExoPlayer's merge with the raw stream title.
    val item = currentMediaItem?.mediaMetadata ?: return super.getMediaMetadata()
    val title = streamTitle ?: return item
    return item.buildUpon().setTitle(title).setArtist(item.station).build()
  }

  override fun getAvailableCommands(): Player.Commands = filter(super.getAvailableCommands())

  override fun isCommandAvailable(command: Int) = command !in HIDDEN && super.isCommandAvailable(command)

  override fun addListener(listener: Player.Listener) {
    val forwarding = synchronized(listeners) { listeners.getOrPut(listener) { Forwarding(listener) } }
    super.addListener(forwarding)
  }

  override fun removeListener(listener: Player.Listener) {
    val forwarding = synchronized(listeners) { listeners.remove(listener) }
    super.removeListener(forwarding ?: listener)
  }

  private fun setStreamTitle(title: String?) {
    if (title == streamTitle) return
    streamTitle = title
    val metadata = mediaMetadata
    val events = Player.Events(FlagSet.Builder().add(Player.EVENT_MEDIA_METADATA_CHANGED).build())
    val current = synchronized(listeners) { listeners.keys.toList() }
    current.forEach { it.onMediaMetadataChanged(metadata) }
    current.forEach { it.onEvents(this, events) }
  }

  /**
   * Every callback is spelled out: Player.Listener's methods are all Java
   * defaults, which Kotlin's `by` delegation does not forward, and a session
   * that misses onPlaybackStateChanged reports "none" to Android Auto forever.
   */
  @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
  private inner class Forwarding(private val listener: Player.Listener) : Player.Listener {
    override fun onMediaMetadataChanged(mediaMetadata: MediaMetadata) =
      listener.onMediaMetadataChanged(this@StationPlayer.mediaMetadata)
    override fun onAvailableCommandsChanged(availableCommands: Player.Commands) =
      listener.onAvailableCommandsChanged(filter(availableCommands))
    override fun onEvents(player: Player, events: Player.Events) = listener.onEvents(this@StationPlayer, events)

    override fun onTimelineChanged(timeline: Timeline, reason: Int) = listener.onTimelineChanged(timeline, reason)
    override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) = listener.onMediaItemTransition(mediaItem, reason)
    override fun onTracksChanged(tracks: Tracks) = listener.onTracksChanged(tracks)
    override fun onPlaylistMetadataChanged(mediaMetadata: MediaMetadata) = listener.onPlaylistMetadataChanged(mediaMetadata)
    override fun onIsLoadingChanged(isLoading: Boolean) = listener.onIsLoadingChanged(isLoading)
    override fun onLoadingChanged(isLoading: Boolean) = listener.onLoadingChanged(isLoading)
    override fun onTrackSelectionParametersChanged(parameters: TrackSelectionParameters) =
      listener.onTrackSelectionParametersChanged(parameters)
    override fun onPlayerStateChanged(playWhenReady: Boolean, playbackState: Int) =
      listener.onPlayerStateChanged(playWhenReady, playbackState)
    override fun onPlaybackStateChanged(playbackState: Int) = listener.onPlaybackStateChanged(playbackState)
    override fun onPlayWhenReadyChanged(playWhenReady: Boolean, reason: Int) =
      listener.onPlayWhenReadyChanged(playWhenReady, reason)
    override fun onPlaybackSuppressionReasonChanged(reason: Int) = listener.onPlaybackSuppressionReasonChanged(reason)
    override fun onIsPlayingChanged(isPlaying: Boolean) = listener.onIsPlayingChanged(isPlaying)
    override fun onRepeatModeChanged(repeatMode: Int) = listener.onRepeatModeChanged(repeatMode)
    override fun onShuffleModeEnabledChanged(enabled: Boolean) = listener.onShuffleModeEnabledChanged(enabled)
    override fun onPlayerError(error: PlaybackException) = listener.onPlayerError(error)
    override fun onPlayerErrorChanged(error: PlaybackException?) = listener.onPlayerErrorChanged(error)
    override fun onPositionDiscontinuity(reason: Int) = listener.onPositionDiscontinuity(reason)
    override fun onPositionDiscontinuity(oldPosition: Player.PositionInfo, newPosition: Player.PositionInfo, reason: Int) =
      listener.onPositionDiscontinuity(oldPosition, newPosition, reason)
    override fun onPlaybackParametersChanged(parameters: PlaybackParameters) = listener.onPlaybackParametersChanged(parameters)
    override fun onSeekBackIncrementChanged(ms: Long) = listener.onSeekBackIncrementChanged(ms)
    override fun onSeekForwardIncrementChanged(ms: Long) = listener.onSeekForwardIncrementChanged(ms)
    override fun onMaxSeekToPreviousPositionChanged(ms: Long) = listener.onMaxSeekToPreviousPositionChanged(ms)
    override fun onAudioSessionIdChanged(id: Int) = listener.onAudioSessionIdChanged(id)
    override fun onAudioAttributesChanged(attributes: AudioAttributes) = listener.onAudioAttributesChanged(attributes)
    override fun onVolumeChanged(volume: Float) = listener.onVolumeChanged(volume)
    override fun onSkipSilenceEnabledChanged(enabled: Boolean) = listener.onSkipSilenceEnabledChanged(enabled)
    override fun onDeviceInfoChanged(info: DeviceInfo) = listener.onDeviceInfoChanged(info)
    override fun onDeviceVolumeChanged(volume: Int, muted: Boolean) = listener.onDeviceVolumeChanged(volume, muted)
    override fun onVideoSizeChanged(size: VideoSize) = listener.onVideoSizeChanged(size)
    override fun onSurfaceSizeChanged(width: Int, height: Int) = listener.onSurfaceSizeChanged(width, height)
    override fun onRenderedFirstFrame() = listener.onRenderedFirstFrame()
    override fun onCues(cues: List<Cue>) = listener.onCues(cues)
    override fun onCues(cueGroup: CueGroup) = listener.onCues(cueGroup)
    override fun onMetadata(metadata: Metadata) = listener.onMetadata(metadata)
  }

  companion object {
    private val HIDDEN = setOf(
      Player.COMMAND_SEEK_IN_CURRENT_MEDIA_ITEM,
      Player.COMMAND_SEEK_BACK,
      Player.COMMAND_SEEK_FORWARD
    )

    private fun filter(commands: Player.Commands) =
      commands.buildUpon().removeAll(*HIDDEN.toIntArray()).build()
  }
}

/**
 * Same rules as the app's `streamTitleOf` (lib/streamTitle.ts): keep the first
 * two readable "|"-separated fields, drop URLs and placeholder values.
 */
fun cleanStreamTitle(raw: String?): String? {
  if (raw.isNullOrBlank()) return null
  val parts = raw.split('|')
    .map { it.trim() }
    .filter { it.isNotEmpty() && !Regex("^https?://", RegexOption.IGNORE_CASE).containsMatchIn(it) }
  val title = parts.take(2).joinToString(" · ")
  if (title.length < 3 || Regex("^(-|unknown|n/a)$", RegexOption.IGNORE_CASE).matches(title)) return null
  return title
}
