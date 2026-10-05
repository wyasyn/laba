package expo.modules.labaauto

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

data class CarStation(
  val id: String,
  val name: String,
  val logo: String?,
  val streamUrl: String,
  val categories: List<String>
)

/** Browse-tree labels, in the language picked in the app. English until the app first syncs. */
data class Labels(
  val favourites: String = "Favourites",
  val recent: String = "Recent",
  val stations: String = "Stations",
  val categories: String = "Categories",
  val live: String = "Laba · Live radio"
)

data class Snapshot(
  val stations: List<CarStation>,
  val favourites: List<String>,
  val recents: List<String>,
  val labels: Labels
) {
  private val byId = stations.associateBy { it.id }

  fun station(id: String): CarStation? = byId[id]

  fun stationsFor(ids: List<String>) = ids.mapNotNull { byId[it] }

  /** Categories with at least two stations, most common first, like the app's category rail. */
  val categories: List<String> by lazy {
    stations
      .flatMap { s -> s.categories.map { it.trim().lowercase() }.filter { it.isNotEmpty() }.distinct() }
      .groupingBy { it }
      .eachCount()
      .filter { it.value > 1 }
      .entries
      .sortedByDescending { it.value }
      .map { it.key }
  }

  fun inCategory(category: String) =
    stations.filter { s -> s.categories.any { it.trim().lowercase() == category } }

  fun search(query: String): List<CarStation> {
    val q = query.trim().lowercase()
    if (q.isEmpty()) return emptyList()
    // Name matches first: "play Capital FM" should not start a station that merely mentions it.
    val (byName, rest) = stations.partition { it.name.lowercase().contains(q) }
    return byName.sortedBy { it.name.length } +
      rest.filter { s -> s.categories.any { it.lowercase().contains(q) } }
  }
}

/**
 * The radio catalogue as Android Auto sees it. The app writes it with
 * `syncLibrary` whenever stations, favourites, recents or the language change.
 * Before the app has ever run, the public catalogue is downloaded instead.
 */
object Library {
  private const val STATIONS_URL = "https://laba.yasinwalum.com/stations.json"
  private const val PREFS = "laba-auto"
  private const val KEY_RECENTS = "recents"
  private const val KEY_LAST = "last"
  private const val MAX_RECENTS = 20

  private var cached: Snapshot? = null
  private var cachedStamp = 0L

  private fun dir(context: Context) = File(context.filesDir, "laba-auto").apply { mkdirs() }
  private fun syncedFile(context: Context) = File(dir(context), "library.json")
  private fun downloadedFile(context: Context) = File(dir(context), "catalog.json")

  @Synchronized
  fun write(context: Context, json: String) {
    val file = syncedFile(context)
    val tmp = File(file.path + ".tmp")
    tmp.writeText(json)
    tmp.renameTo(file)
    cached = null
  }

  /** Blocking: may hit the network on first use. Call off the main thread. */
  @Synchronized
  fun load(context: Context): Snapshot {
    val synced = syncedFile(context)
    val source = if (synced.exists()) synced else downloadedFile(context)
    if (!source.exists()) download(context)
    val stamp = if (source.exists()) source.lastModified() else 0L
    cached?.let { if (stamp == cachedStamp) return it.withNativeRecents(context) }

    val snapshot = try {
      when {
        synced.exists() -> parseSynced(JSONObject(synced.readText()))
        source.exists() -> Snapshot(parseStations(JSONArray(source.readText())), emptyList(), emptyList(), Labels())
        else -> null
      }
    } catch (e: Exception) {
      null
    } ?: Snapshot(emptyList(), emptyList(), emptyList(), Labels())

    cached = snapshot
    cachedStamp = stamp
    return snapshot.withNativeRecents(context)
  }

  /** Stations played from the car go first in Recent, ahead of the ones opened in the app. */
  private fun Snapshot.withNativeRecents(context: Context): Snapshot {
    val played = nativeRecents(context)
    if (played.isEmpty()) return this
    return copy(recents = (played + recents).distinct().take(MAX_RECENTS))
  }

  private fun nativeRecents(context: Context) =
    prefs(context).getString(KEY_RECENTS, "")!!.split(',').filter { it.isNotEmpty() }

  fun recordPlayed(context: Context, stationId: String) {
    val next = (listOf(stationId) + nativeRecents(context)).distinct().take(MAX_RECENTS)
    prefs(context).edit()
      .putString(KEY_RECENTS, next.joinToString(","))
      .putString(KEY_LAST, stationId)
      .apply()
  }

  fun lastPlayed(context: Context): String? = prefs(context).getString(KEY_LAST, null)

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private var lastDownloadAttempt = 0L

  private fun download(context: Context) {
    // Every browse request lands here while offline; don't stall each one on a timeout.
    val now = System.currentTimeMillis()
    if (now - lastDownloadAttempt < 60_000) return
    lastDownloadAttempt = now
    try {
      val connection = URL(STATIONS_URL).openConnection() as HttpURLConnection
      connection.connectTimeout = 10_000
      connection.readTimeout = 15_000
      try {
        if (connection.responseCode != 200) return
        val body = connection.inputStream.bufferedReader().use { it.readText() }
        // Validate before caching so a bad response does not stick.
        if (parseStations(JSONArray(body)).isEmpty()) return
        downloadedFile(context).writeText(body)
      } finally {
        connection.disconnect()
      }
    } catch (e: Exception) {
      // Offline: Auto shows empty lists until the app or the network is back.
    }
  }

  private fun parseSynced(json: JSONObject): Snapshot {
    val labels = json.optJSONObject("labels")
    val defaults = Labels()
    return Snapshot(
      stations = parseStations(json.optJSONArray("stations") ?: JSONArray()),
      favourites = json.optJSONArray("favourites").strings(),
      recents = json.optJSONArray("recents").strings(),
      labels = Labels(
        favourites = labels?.optString("favourites")?.ifEmpty { null } ?: defaults.favourites,
        recent = labels?.optString("recent")?.ifEmpty { null } ?: defaults.recent,
        stations = labels?.optString("stations")?.ifEmpty { null } ?: defaults.stations,
        categories = labels?.optString("categories")?.ifEmpty { null } ?: defaults.categories,
        live = labels?.optString("live")?.ifEmpty { null } ?: defaults.live
      )
    )
  }

  /** Radio stations with a stream, in catalogue order. Accepts the app's Station shape. */
  private fun parseStations(array: JSONArray): List<CarStation> {
    val result = mutableListOf<CarStation>()
    for (i in 0 until array.length()) {
      val s = array.optJSONObject(i) ?: continue
      if (s.optString("type", "radio") != "radio") continue
      val id = s.optString("id")
      val streamUrl = s.optString("streamUrl")
      if (id.isEmpty() || streamUrl.isEmpty()) continue
      result += CarStation(
        id = id,
        name = s.optString("name", id),
        logo = s.optString("logo").ifEmpty { null },
        streamUrl = streamUrl,
        categories = s.optJSONArray("categories").strings()
      )
    }
    return result
  }

  private fun JSONArray?.strings(): List<String> {
    if (this == null) return emptyList()
    return (0 until length()).mapNotNull { optString(it).ifEmpty { null } }
  }
}
