export async function fetchNearbyPlaces(coords, radius = 800) {
  try {
    const [lat, lon] = coords;
    const query = `
      [out:json][timeout:15];
      (
        node["amenity"="restaurant"](around:${radius},${lat},${lon});
        node["amenity"="cafe"](around:${radius},${lat},${lon});
        node["shop"](around:${radius},${lat},${lon});
        node["tourism"="attraction"](around:${radius},${lat},${lon});
      );
      out body;
    `;

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
    });
    const data = await res.json();

    return (data.elements || []).map((el) => ({
      id: el.id,
      name: el.tags?.name || el.tags?.["name:en"] || "Unnamed",
      type: el.tags?.amenity || el.tags?.shop || el.tags?.tourism || "other",
      position: [el.lat, el.lon],
    }));
  } catch {
    return [];
  }
}
