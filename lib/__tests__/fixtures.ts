import type { Station } from "@/lib/schemas";

/** A valid station with sensible defaults; override what the test cares about. */
export function station(overrides: Partial<Station> & Pick<Station, "id">): Station {
  return {
    name: overrides.id,
    type: "radio",
    description: "",
    language: "English",
    country: "UG",
    categories: [],
    isFeatured: false,
    streamUrl: `https://example.com/${overrides.id}`,
    ...overrides,
  };
}
