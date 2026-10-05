package expo.modules.labaauto

import android.content.ContentProvider
import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.graphics.Bitmap
import android.graphics.Canvas
import android.net.Uri
import android.os.ParcelFileDescriptor
import java.io.File
import java.io.FileNotFoundException
import java.net.HttpURLConnection
import java.net.URL

/**
 * Serves station logos to Android Auto, which only loads artwork from
 * content:// URIs. A URI names a station (`content://<authority>/logo/<id>`),
 * never a remote address, so other apps cannot use this to fetch arbitrary
 * URLs. Logos are downloaded once and kept in the cache directory.
 */
class ArtworkProvider : ContentProvider() {
  override fun onCreate() = true

  override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor {
    val context = context ?: throw FileNotFoundException()
    val segments = uri.pathSegments
    if (segments.size != 2 || segments[0] != "logo") throw FileNotFoundException(uri.toString())
    val station = Library.load(context).station(segments[1]) ?: throw FileNotFoundException(uri.toString())

    val dir = File(context.cacheDir, "laba-auto-artwork").apply { mkdirs() }
    val file = station.logo?.let { logo ->
      val file = File(dir, "${station.id}-${logo.hashCode().toUInt()}")
      if (!file.exists()) {
        try {
          download(logo, file)
        } catch (e: Exception) {
          // Dead logo links are common in the catalogue.
        }
      }
      file.takeIf { it.exists() && it.length() > 0 }
    } ?: appIcon(context, dir)
    return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
  }

  /** The launcher icon as a PNG, for stations without a usable logo. It is an adaptive icon, so draw it. */
  private fun appIcon(context: Context, dir: File): File {
    val file = File(dir, "app-icon.png")
    if (file.exists()) return file
    val drawable = context.packageManager.getApplicationIcon(context.packageName)
    val bitmap = Bitmap.createBitmap(ICON_SIZE, ICON_SIZE, Bitmap.Config.ARGB_8888)
    drawable.setBounds(0, 0, ICON_SIZE, ICON_SIZE)
    drawable.draw(Canvas(bitmap))
    val tmp = File(file.path + ".tmp")
    tmp.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    tmp.renameTo(file)
    return file
  }

  private fun download(url: String, file: File) {
    var current = URL(url)
    // HttpURLConnection will not follow a redirect that switches between http and https.
    repeat(5) {
      val connection = current.openConnection() as HttpURLConnection
      connection.connectTimeout = 10_000
      connection.readTimeout = 15_000
      connection.instanceFollowRedirects = false
      try {
        when (connection.responseCode) {
          in 300..399 -> {
            val location = connection.getHeaderField("Location") ?: throw FileNotFoundException(url)
            current = URL(current, location)
          }
          200 -> {
            val tmp = File(file.path + ".tmp")
            connection.inputStream.use { input -> tmp.outputStream().use { input.copyTo(it) } }
            tmp.renameTo(file)
            return
          }
          else -> throw FileNotFoundException(url)
        }
      } finally {
        connection.disconnect()
      }
    }
    throw FileNotFoundException(url)
  }

  override fun getType(uri: Uri): String? = null
  override fun query(uri: Uri, projection: Array<out String>?, selection: String?, selectionArgs: Array<out String>?, sortOrder: String?): Cursor? = null
  override fun insert(uri: Uri, values: ContentValues?): Uri? = null
  override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?) = 0
  override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?) = 0

  companion object {
    private const val ICON_SIZE = 256

    /** Artwork for a station: its logo, or the app icon when it has none or the logo fails to load. */
    fun uriFor(context: Context, station: CarStation): Uri =
      Uri.Builder()
        .scheme("content")
        .authority("${context.packageName}.labaauto.artwork")
        .appendPath("logo")
        .appendPath(station.id)
        .build()
  }
}
