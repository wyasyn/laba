import { station } from "@/lib/__tests__/fixtures";
import { CACHE_KEYS } from "@/lib/constants";
import { useStationStore } from "@/stores/useStationStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const initial = useStationStore.getState();
const remote = [
  station({ id: "tv-1", type: "tv", isFeatured: true }),
  station({ id: "radio-1", type: "radio", country: "KE" }),
];

function mockFetch(response: Partial<Response> | Error) {
  globalThis.fetch = jest.fn(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response as Response),
  ) as jest.Mock;
}

beforeEach(async () => {
  useStationStore.setState(initial, true);
  await AsyncStorage.clear();
});

describe("useStationStore", () => {
  it("shows the bundled fallback, with radio, when there is no cache and no network", async () => {
    mockFetch(new Error("offline"));
    await useStationStore.getState().fetchStations();
    // Let the background refresh settle.
    await new Promise((r) => setTimeout(r, 0));

    const s = useStationStore.getState();
    expect(s.isLoading).toBe(false);
    expect(s.tvStations.length).toBeGreaterThan(0);
    expect(s.radioStations.length).toBeGreaterThan(0);
    expect(s.error).toBe("Failed to refresh stations");
  });

  it("refresh replaces the list, derives slices and caches it", async () => {
    mockFetch({ ok: true, json: () => Promise.resolve(remote) });
    await useStationStore.getState().refreshStations();

    const s = useStationStore.getState();
    expect(s.stations.map((x) => x.id)).toEqual(["tv-1", "radio-1"]);
    expect(s.tvStations.map((x) => x.id)).toEqual(["tv-1"]);
    expect(s.featuredStations.map((x) => x.id)).toEqual(["tv-1"]);
    expect(s.internationalStations.map((x) => x.id)).toEqual(["radio-1"]);
    expect(JSON.parse((await AsyncStorage.getItem(CACHE_KEYS.STATIONS))!)).toHaveLength(2);
  });

  it("keeps the current list when the server answers with an error", async () => {
    useStationStore.setState({ stations: remote });
    mockFetch({ ok: false, status: 503 });
    await useStationStore.getState().refreshStations();

    const s = useStationStore.getState();
    expect(s.stations).toBe(remote);
    expect(s.error).toBe("Failed to refresh stations");
    expect(s.isRefreshing).toBe(false);
  });

  it("serves a fresh cache without waiting for the network", async () => {
    await AsyncStorage.setItem(CACHE_KEYS.STATIONS, JSON.stringify(remote));
    await AsyncStorage.setItem(CACHE_KEYS.STATIONS_TIMESTAMP, String(Date.now()));
    mockFetch(new Error("should not be called"));
    await useStationStore.getState().fetchStations();

    expect(useStationStore.getState().stations.map((x) => x.id)).toEqual(["tv-1", "radio-1"]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
