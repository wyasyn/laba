package expo.modules.labaauto

import android.os.Handler
import android.os.Looper

/** Lets the app's JS player and the car's player take turns. Both live in the app process. */
object CarBridge {
  private val main = Handler(Looper.getMainLooper())

  @Volatile
  var service: LabaAutoService? = null

  /** Set while the JS module is alive; stops the app's own player. */
  @Volatile
  var onCarStartedPlaying: (() -> Unit)? = null

  fun carStartedPlaying() {
    onCarStartedPlaying?.invoke()
  }

  fun pauseCar() {
    main.post { service?.pauseForApp() }
  }

  fun libraryChanged() {
    main.post { service?.onLibraryChanged() }
  }
}
