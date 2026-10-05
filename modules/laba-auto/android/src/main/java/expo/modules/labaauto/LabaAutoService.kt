package expo.modules.labaauto

import android.app.PendingIntent
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.session.LibraryResult
import androidx.media3.session.MediaLibraryService
import androidx.media3.session.MediaSession
import com.google.common.collect.ImmutableList
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.MoreExecutors
import java.util.concurrent.Executors

/**
 * Android Auto's view of Laba: a browse tree of radio stations (Favourites,
 * Recent, Stations, Categories), search, and a player of its own.
 *
 * The car can start this service while the app is closed, before React Native
 * exists, so it cannot share the app's expo-audio player. The two take turns
 * instead: starting a station here stops the app's player (through
 * [CarBridge]), and the app pauses this one when it starts a station.
 */
@OptIn(UnstableApi::class)
class LabaAutoService : MediaLibraryService() {
  private lateinit var exoPlayer: ExoPlayer
  private var session: MediaLibrarySession? = null
  private val main = Handler(Looper.getMainLooper())
  private val io = MoreExecutors.listeningDecorator(Executors.newSingleThreadExecutor())
  private var retryAttempt = 0

  override fun onCreate() {
    super.onCreate()
    val http = DefaultHttpDataSource.Factory()
      .setUserAgent("Laba")
      .setAllowCrossProtocolRedirects(true)
      .setConnectTimeoutMs(15_000)
    exoPlayer = ExoPlayer.Builder(this)
      .setMediaSourceFactory(DefaultMediaSourceFactory(DefaultDataSource.Factory(this, http)))
      .setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(C.USAGE_MEDIA)
          .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
          .build(),
        true
      )
      .setHandleAudioBecomingNoisy(true)
      .setWakeMode(C.WAKE_MODE_NETWORK)
      .build()
    exoPlayer.addListener(PlayerEvents())

    // Session ids must be unique per process, and expo-audio's session uses the default "".
    val builder = MediaLibrarySession.Builder(this, StationPlayer(exoPlayer), Callback())
      .setId(SESSION_ID)
    packageManager.getLaunchIntentForPackage(packageName)?.let {
      builder.setSessionActivity(
        PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
      )
    }
    session = builder.build()
    CarBridge.service = this
  }

  override fun onGetSession(controllerInfo: MediaSession.ControllerInfo) = session

  override fun onTaskRemoved(rootIntent: Intent?) {
    // Swiping the app away should not cut off a station playing in the car.
    if (!exoPlayer.playWhenReady || exoPlayer.mediaItemCount == 0) stopSelf()
  }

  override fun onDestroy() {
    if (CarBridge.service === this) CarBridge.service = null
    main.removeCallbacksAndMessages(null)
    io.shutdown()
    session?.run {
      player.release()
      release()
    }
    session = null
    super.onDestroy()
  }

  /** The app started a station on the phone. */
  fun pauseForApp() {
    if (exoPlayer.playWhenReady) exoPlayer.pause()
  }

  /** The app synced new stations, favourites, recents or labels: refresh what the car shows. */
  fun onLibraryChanged() {
    io.execute {
      val snapshot = Library.load(this)
      main.post { notifyAll(snapshot) }
    }
  }

  private fun notifyAll(snapshot: Snapshot) {
    val session = session ?: return
    val ids = listOf(ROOT, FAVOURITES, RECENT, ALL, CATEGORIES) + snapshot.categories.map { CATEGORY_PREFIX + it }
    for (id in ids) session.notifyChildrenChanged(id, children(snapshot, id).size, null)
  }

  private inner class PlayerEvents : Player.Listener {
    override fun onIsPlayingChanged(isPlaying: Boolean) {
      if (!isPlaying) return
      retryAttempt = 0
      CarBridge.carStartedPlaying()
    }

    override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
      retryAttempt = 0
      val stationId = mediaItem?.mediaId?.let { stationIdOf(it) } ?: return
      io.execute {
        Library.recordPlayed(this@LabaAutoService, stationId)
        val snapshot = Library.load(this@LabaAutoService)
        main.post { session?.notifyChildrenChanged(RECENT, snapshot.recents.size, null) }
      }
    }

    // Streams drop. Reload with backoff, like the app does, before showing the error.
    override fun onPlayerError(error: PlaybackException) {
      if (error.errorCode == PlaybackException.ERROR_CODE_BEHIND_LIVE_WINDOW) {
        exoPlayer.seekToDefaultPosition()
        exoPlayer.prepare()
        return
      }
      val delay = RETRY_DELAYS_MS.getOrNull(retryAttempt++) ?: return
      main.postDelayed({
        if (exoPlayer.playbackState == Player.STATE_IDLE && exoPlayer.playWhenReady) exoPlayer.prepare()
      }, delay)
    }
  }

  private inner class Callback : MediaLibrarySession.Callback {
    override fun onGetLibraryRoot(
      session: MediaLibrarySession,
      browser: MediaSession.ControllerInfo,
      params: LibraryParams?
    ): ListenableFuture<LibraryResult<MediaItem>> {
      val extras = Bundle().apply {
        putBoolean("android.media.browse.SEARCH_SUPPORTED", true)
        putBoolean("android.media.browse.CONTENT_STYLE_SUPPORTED", true)
        putInt("android.media.browse.CONTENT_STYLE_BROWSABLE_HINT", CONTENT_STYLE_LIST)
        putInt("android.media.browse.CONTENT_STYLE_PLAYABLE_HINT", CONTENT_STYLE_GRID)
      }
      val root = folder(ROOT, "Laba", MediaMetadata.MEDIA_TYPE_FOLDER_MIXED)
      return Futures.immediateFuture(LibraryResult.ofItem(root, LibraryParams.Builder().setExtras(extras).build()))
    }

    override fun onGetChildren(
      session: MediaLibrarySession,
      browser: MediaSession.ControllerInfo,
      parentId: String,
      page: Int,
      pageSize: Int,
      params: LibraryParams?
    ): ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> = io.submit<LibraryResult<ImmutableList<MediaItem>>> {
      val items = children(Library.load(this@LabaAutoService), parentId)
      LibraryResult.ofItemList(paged(items, page, pageSize), params)
    }

    override fun onGetItem(
      session: MediaLibrarySession,
      browser: MediaSession.ControllerInfo,
      mediaId: String
    ): ListenableFuture<LibraryResult<MediaItem>> = io.submit<LibraryResult<MediaItem>> {
      val snapshot = Library.load(this@LabaAutoService)
      val item = stationIdOf(mediaId)?.let { id -> snapshot.station(id)?.let { playable(snapshot, parentOf(mediaId), it) } }
      if (item != null) LibraryResult.ofItem(item, null) else LibraryResult.ofError(LibraryResult.RESULT_ERROR_BAD_VALUE)
    }

    override fun onSearch(
      session: MediaLibrarySession,
      browser: MediaSession.ControllerInfo,
      query: String,
      params: LibraryParams?
    ): ListenableFuture<LibraryResult<Void>> = io.submit<LibraryResult<Void>> {
      val count = Library.load(this@LabaAutoService).search(query).size
      main.post { session.notifySearchResultChanged(browser, query, count, params) }
      LibraryResult.ofVoid()
    }

    override fun onGetSearchResult(
      session: MediaLibrarySession,
      browser: MediaSession.ControllerInfo,
      query: String,
      page: Int,
      pageSize: Int,
      params: LibraryParams?
    ): ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> = io.submit<LibraryResult<ImmutableList<MediaItem>>> {
      val snapshot = Library.load(this@LabaAutoService)
      val items = snapshot.search(query).map { playable(snapshot, SEARCH, it) }
      LibraryResult.ofItemList(paged(items, page, pageSize), params)
    }

    // Controllers send items with only a media id (a tap) or a search query (voice:
    // "play Capital FM on Laba"). Turn either into playable items with a stream URI.
    // A single tapped station brings its list along, so next and previous move
    // through that list.
    override fun onSetMediaItems(
      mediaSession: MediaSession,
      controller: MediaSession.ControllerInfo,
      mediaItems: MutableList<MediaItem>,
      startIndex: Int,
      startPositionMs: Long
    ): ListenableFuture<MediaSession.MediaItemsWithStartPosition> = io.submit<MediaSession.MediaItemsWithStartPosition> {
      val snapshot = Library.load(this@LabaAutoService)
      val single = mediaItems.singleOrNull()
      val stationId = single?.mediaId?.let { stationIdOf(it) }
      val query = single?.requestMetadata?.searchQuery
      when {
        single != null && stationId != null -> {
          val parent = parentOf(single.mediaId)
          val list = children(snapshot, parent).filter { it.mediaMetadata.isPlayable == true }
          val index = list.indexOfFirst { stationIdOf(it.mediaId) == stationId }
          if (index >= 0) {
            MediaSession.MediaItemsWithStartPosition(list.map { withUri(snapshot, it) }, index, C.TIME_UNSET)
          } else {
            MediaSession.MediaItemsWithStartPosition(resolve(snapshot, mediaItems), 0, C.TIME_UNSET)
          }
        }
        single != null && single.mediaId.isEmpty() && query != null -> {
          // An empty query ("play Laba") resumes the last station.
          val matches = snapshot.search(query).ifEmpty {
            if (query.isBlank()) listOfNotNull(lastPlayed(snapshot)) else emptyList()
          }
          if (matches.isEmpty()) throw IllegalArgumentException("No station matches \"$query\"")
          MediaSession.MediaItemsWithStartPosition(
            matches.map { withUri(snapshot, playable(snapshot, SEARCH, it)) },
            0,
            C.TIME_UNSET
          )
        }
        else -> MediaSession.MediaItemsWithStartPosition(
          resolve(snapshot, mediaItems),
          if (startIndex == C.INDEX_UNSET) 0 else startIndex,
          C.TIME_UNSET
        )
      }
    }

    override fun onAddMediaItems(
      mediaSession: MediaSession,
      controller: MediaSession.ControllerInfo,
      mediaItems: MutableList<MediaItem>
    ): ListenableFuture<MutableList<MediaItem>> = io.submit<MutableList<MediaItem>> {
      resolve(Library.load(this@LabaAutoService), mediaItems).toMutableList()
    }

    // "Resume" from the car's media card or the system's media controls.
    override fun onPlaybackResumption(
      mediaSession: MediaSession,
      controller: MediaSession.ControllerInfo,
      isForPlayback: Boolean
    ): ListenableFuture<MediaSession.MediaItemsWithStartPosition> = io.submit<MediaSession.MediaItemsWithStartPosition> {
      val snapshot = Library.load(this@LabaAutoService)
      val station = lastPlayed(snapshot) ?: throw UnsupportedOperationException("Nothing played yet")
      MediaSession.MediaItemsWithStartPosition(
        listOf(withUri(snapshot, playable(snapshot, RECENT, station))),
        0,
        C.TIME_UNSET
      )
    }
  }

  private fun lastPlayed(snapshot: Snapshot) = Library.lastPlayed(this)?.let { snapshot.station(it) }

  private fun resolve(snapshot: Snapshot, items: List<MediaItem>) = items.mapNotNull { item ->
    if (item.localConfiguration != null) return@mapNotNull item
    val id = stationIdOf(item.mediaId) ?: return@mapNotNull null
    snapshot.station(id)?.let { withUri(snapshot, playable(snapshot, parentOf(item.mediaId), it)) }
  }

  private fun withUri(snapshot: Snapshot, item: MediaItem): MediaItem {
    val station = stationIdOf(item.mediaId)?.let { snapshot.station(it) } ?: return item
    return item.buildUpon().setUri(station.streamUrl).build()
  }

  private fun children(snapshot: Snapshot, parentId: String): List<MediaItem> {
    val labels = snapshot.labels
    return when {
      parentId == ROOT -> listOf(
        folder(FAVOURITES, labels.favourites),
        folder(RECENT, labels.recent),
        folder(ALL, labels.stations),
        folder(CATEGORIES, labels.categories, MediaMetadata.MEDIA_TYPE_FOLDER_MIXED)
      )
      parentId == FAVOURITES -> snapshot.stationsFor(snapshot.favourites).map { playable(snapshot, FAVOURITES, it) }
      parentId == RECENT -> snapshot.stationsFor(snapshot.recents).map { playable(snapshot, RECENT, it) }
      parentId == ALL -> snapshot.stations.sortedBy { it.name.lowercase() }.map { playable(snapshot, ALL, it) }
      parentId == CATEGORIES -> snapshot.categories.map { folder(CATEGORY_PREFIX + it, titleCase(it)) }
      parentId.startsWith(CATEGORY_PREFIX) -> {
        val category = parentId.removePrefix(CATEGORY_PREFIX)
        snapshot.inCategory(category).map { playable(snapshot, parentId, it) }
      }
      parentId == SEARCH -> emptyList()
      else -> emptyList()
    }
  }

  private fun folder(id: String, title: String, type: Int = MediaMetadata.MEDIA_TYPE_FOLDER_RADIO_STATIONS) =
    MediaItem.Builder()
      .setMediaId(id)
      .setMediaMetadata(
        MediaMetadata.Builder()
          .setTitle(title)
          .setIsBrowsable(true)
          .setIsPlayable(false)
          .setMediaType(type)
          .build()
      )
      .build()

  private fun playable(snapshot: Snapshot, parentId: String, station: CarStation) =
    MediaItem.Builder()
      .setMediaId("$parentId$SEPARATOR${station.id}")
      .setMediaMetadata(
        MediaMetadata.Builder()
          .setTitle(station.name)
          .setStation(station.name)
          .setArtist(snapshot.labels.live)
          .setArtworkUri(ArtworkProvider.uriFor(this, station))
          .setIsBrowsable(false)
          .setIsPlayable(true)
          .setMediaType(MediaMetadata.MEDIA_TYPE_RADIO_STATION)
          .build()
      )
      .build()

  companion object {
    private const val SESSION_ID = "laba-auto"
    private const val ROOT = "root"
    private const val FAVOURITES = "favourites"
    private const val RECENT = "recent"
    private const val ALL = "all"
    private const val CATEGORIES = "categories"
    private const val CATEGORY_PREFIX = "category/"
    private const val SEARCH = "search"
    private const val SEPARATOR = '|'

    private const val CONTENT_STYLE_LIST = 1
    private const val CONTENT_STYLE_GRID = 2

    private val RETRY_DELAYS_MS = longArrayOf(2_000, 5_000, 10_000)

    /** Playable ids are "<parent>|<station id>", so a tap knows which list it came from. */
    private fun stationIdOf(mediaId: String) =
      mediaId.lastIndexOf(SEPARATOR).takeIf { it >= 0 }?.let { mediaId.substring(it + 1) }?.ifEmpty { null }

    private fun parentOf(mediaId: String) =
      mediaId.lastIndexOf(SEPARATOR).takeIf { it >= 0 }?.let { mediaId.substring(0, it) } ?: ALL

    private fun titleCase(category: String) =
      category.split(' ').joinToString(" ") { word -> word.replaceFirstChar { it.uppercase() } }

    private fun paged(items: List<MediaItem>, page: Int, pageSize: Int): ImmutableList<MediaItem> {
      if (pageSize <= 0 || pageSize == Int.MAX_VALUE) return ImmutableList.copyOf(items)
      return ImmutableList.copyOf(items.drop(page * pageSize).take(pageSize))
    }
  }
}
