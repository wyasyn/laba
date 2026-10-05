import { requireOptionalNativeModule, type NativeModule } from "expo";

type LabaAutoEvents = {
  onCarPlaybackStart: () => void;
};

declare class LabaAutoModule extends NativeModule<LabaAutoEvents> {
  syncLibrary(json: string): Promise<void>;
  pauseCarPlayback(): void;
}

/**
 * Android Auto support (Android only; null elsewhere, and in builds made
 * before the module existed). See android/…/LabaAutoService.kt.
 */
export const LabaAuto = requireOptionalNativeModule<LabaAutoModule>("LabaAuto");

export interface CarLibrary {
  stations: {
    id: string;
    name: string;
    type: "radio";
    logo?: string;
    streamUrl: string;
    categories: string[];
  }[];
  favourites: string[];
  recents: string[];
  labels: {
    favourites: string;
    recent: string;
    stations: string;
    categories: string;
    live: string;
  };
}
