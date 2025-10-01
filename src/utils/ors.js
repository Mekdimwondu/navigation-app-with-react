export async function fetchRoute(
  start,
  end,
  mode,
  setRoute,
  setDistance,
  setDuration
) {
  try {
    const ORS_KEY = import.meta.env.VITE_ORS_KEY;
    if (!ORS_KEY) return;

    const url = `https://api.openrouteservice.org/v2/directions/${mode}?api_key=${ORS_KEY}&start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`;
    const res = await fetch(url);
    const data = await res.json();

    const coords = data.features[0].geometry.coordinates.map(([lng, lat]) => [
      lat,
      lng,
    ]);
    setRoute(coords);

    const distKm = data.features[0].properties.summary.distance / 1000;
    const durMin = data.features[0].properties.summary.duration / 60;
    setDistance(distKm.toFixed(1));
    setDuration(Math.round(durMin));
  } catch {
    setRoute([]);
    setDistance(null);
    setDuration(null);
  }
}
