export async function fetchSuggestions(query, abortRef) {
  if (abortRef.current) abortRef.current.abort();
  abortRef.current = new AbortController();
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=et&bounded=1&viewbox=37.5,15,48,3&q=${encodeURIComponent(
      query
    )}`;
    const res = await fetch(url, { signal: abortRef.current.signal });
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchSearchResult(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=et&bounded=1&viewbox=37.5,15,48,3&q=${encodeURIComponent(
      query
    )}&addressdetails=1`;
    const res = await fetch(url);
    const arr = await res.json();
    return arr && arr[0];
  } catch {
    return null;
  }
}
