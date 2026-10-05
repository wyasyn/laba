package expo.modules.labaauto

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LabaAutoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LabaAuto")

    Events("onCarPlaybackStart")

    OnCreate {
      CarBridge.onCarStartedPlaying = { sendEvent("onCarPlaybackStart", emptyMap<String, Any>()) }
    }

    OnDestroy {
      CarBridge.onCarStartedPlaying = null
    }

    /** Store what Android Auto should list: `{ stations, favourites, recents, labels }` as JSON. */
    AsyncFunction("syncLibrary") { json: String ->
      val context = appContext.reactContext?.applicationContext ?: return@AsyncFunction
      Library.write(context, json)
      CarBridge.libraryChanged()
    }

    /** The app is starting a station: stop the car's player so the two never overlap. */
    Function("pauseCarPlayback") {
      CarBridge.pauseCar()
    }
  }
}
