// src/App.jsx
import { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Voice from "./Voice";

/* --------------------------
   Icons (CDN PNGs)
   -------------------------- */
const restaurantIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3075/3075977.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28],
});
const cafeIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/4151/4151022.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28],
});
const shopIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2331/2331970.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28],
});
const destinationIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png", // flag
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -30],
});

/* --------------------------
   Map mover (centers map)
   -------------------------- */
function MapMover({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView(coords, 14);
  }, [coords, map]);
  return null;
}

/* --------------------------
   Helper pick icon by type
   -------------------------- */
const getIcon = (type) => {
  if (!type) return destinationIcon;
  const t = String(type).toLowerCase();
  if (t.includes("restaurant")) return restaurantIcon;
  if (t.includes("cafe")) return cafeIcon;
  if (t.includes("shop")) return shopIcon;
  return destinationIcon;
};

/* --------------------------
   Main App
   -------------------------- */
export default function App() {
  const [startPoint, setStartPoint] = useState(null); // dynamic user location
  const [destination, setDestination] = useState(null);
  const [destinationType, setDestinationType] = useState(null); // for icon
  const [route, setRoute] = useState([]);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]); // nominatim suggestions
  const [travelMode, setTravelMode] = useState("driving-car");
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [places, setPlaces] = useState([]); // nearby places around destination
  const suggestionsAbortRef = useRef(null);
  const suggestionsTimerRef = useRef(null);

  /* 1) Get user location once */
  useEffect(() => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported — using default point (Addis).");
      setStartPoint([9.03, 38.74]);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStartPoint([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        console.warn("Geolocation failed:", err);
        alert("Could not get location — using default point (Addis).");
        setStartPoint([9.03, 38.74]);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  /* 2) ORS route fetch (safe and robust) */
  const fetchRoute = async (start, end, mode) => {
    if (!start || !end) return;
    try {
      const ORS_KEY = import.meta.env.VITE_ORS_KEY;
      if (!ORS_KEY) {
        alert(
          "Missing OpenRouteService key. Add VITE_ORS_KEY in .env and restart dev server."
        );
        return;
      }

      // ORS expects lon,lat for start/end
      const url = `https://api.openrouteservice.org/v2/directions/${mode}?api_key=${ORS_KEY}&start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("ORS fetch failed:", res.status, text);
        throw new Error("ORS request failed");
      }
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
    } catch (err) {
      console.error("fetchRoute error", err);
      alert(
        "Could not calculate route. (Check ORS key, coordinates, or try again)"
      );
      setRoute([]);
      setDistance(null);
      setDuration(null);
    }
  };

  /* 3) Nearby places (Overpass) around destination (not start) */
  const fetchNearbyPlaces = async (coords, radius = 800) => {
    if (!coords) return setPlaces([]);
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
      if (!res.ok) throw new Error("Overpass failed");
      const data = await res.json();
      const items = (data.elements || []).map((el) => ({
        id: el.id,
        name: (el.tags && (el.tags.name || el.tags["name:en"])) || "Unnamed",
        type:
          (el.tags && (el.tags.amenity || el.tags.shop || el.tags.tourism)) ||
          "other",
        position: [el.lat, el.lon],
      }));
      setPlaces(items);
    } catch (err) {
      console.error("fetchNearbyPlaces err:", err);
      setPlaces([]);
    }
  };

  /* 4) When destination changes: fetch nearby around it & clear previous route when destination resets */
  useEffect(() => {
    if (destination) {
      fetchNearbyPlaces(destination, 1000);
    } else {
      setPlaces([]);
      setRoute([]);
      setDistance(null);
      setDuration(null);
    }
  }, [destination]);

  /* 5) Nominatim search (single result) but with suggestions debounce - restricted to Ethiopia */
  const fetchSuggestions = async (q) => {
    // cancel prior
    if (suggestionsAbortRef.current) suggestionsAbortRef.current.abort();
    suggestionsAbortRef.current = new AbortController();
    try {
      // countrycodes=et & limit small and bounded will encourage local results
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=et&bounded=1&viewbox=37.5,15,48,3&q=${encodeURIComponent(
        q
      )}`;
      const res = await fetch(url, {
        signal: suggestionsAbortRef.current.signal,
        headers: { "User-Agent": "NavigationApp/1.0" },
      });
      if (!res.ok) throw new Error("Nominatim suggestions failed");
      const arr = await res.json();
      setSuggestions(arr || []);
    } catch (err) {
      if (err.name !== "AbortError") console.error("suggestions err:", err);
      // don't show suggestion errors to user
    }
  };

  // debounce suggestions when typing
  useEffect(() => {
    if (!search || !search.trim()) {
      setSuggestions([]);
      return;
    }
    clearTimeout(suggestionsTimerRef.current);
    suggestionsTimerRef.current = setTimeout(
      () => fetchSuggestions(search),
      350
    );
    return () => clearTimeout(suggestionsTimerRef.current);
  }, [search]);

  // handle selecting a suggestion (or direct search)
  const doSearchAndRoute = async (queryString) => {
    // queryString passed in (voice or suggestion) or default to `search` state
    const q =
      typeof queryString === "string" && queryString.trim()
        ? queryString
        : search;
    if (!q || !startPoint) return;
    try {
      // use Nominatim but restricted to Ethiopia to avoid country-level hits
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=et&bounded=1&viewbox=37.5,15,48,3&q=${encodeURIComponent(
        q
      )}&addressdetails=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": "NavigationApp/1.0" },
      });
      const arr = await res.json();
      if (!arr || arr.length === 0) {
        alert("Location not found inside Ethiopia. Try a more specific name.");
        return;
      }
      const item = arr[0];
      const destCoords = [parseFloat(item.lat), parseFloat(item.lon)];

      // detect type from nominatim fields, extratags etc.
      let ptype = "other";
      if (item.class === "amenity" && item.type) ptype = item.type;
      if (item.class === "shop") ptype = "shop";
      if (item.extratags) {
        if (item.extratags.amenity) ptype = item.extratags.amenity;
        else if (item.extratags.shop) ptype = item.extratags.shop;
      }

      setDestination(destCoords);
      setDestinationType(ptype);
      setSearch(item.display_name || q);
      setSuggestions([]);
      // get route immediately
      fetchRoute(startPoint, destCoords, travelMode);
    } catch (err) {
      console.error("doSearchAndRoute err:", err);
      alert("Search failed — try again.");
    }
  };

  /* 6) Clicking a nearby place navigates to it */
  const handlePlaceClick = (place) => {
    setDestination(place.position);
    setDestinationType(place.type || "other");
    fetchRoute(startPoint, place.position, travelMode);
  };

  /* 7) travel mode switch */
  const handleModeChange = (mode) => {
    setTravelMode(mode);
    if (destination && startPoint) fetchRoute(startPoint, destination, mode);
  };

  /* 8) keyboard Enter on input: if suggestions exist select first, otherwise search */
  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      if (suggestions && suggestions[0]) {
        const s = suggestions[0];
        // select first suggestion immediately
        const destCoords = [parseFloat(s.lat), parseFloat(s.lon)];
        setDestination(destCoords);
        // detect type (best effort)
        let ptype = "other";
        if (s.class === "amenity" && s.type) ptype = s.type;
        if (s.class === "shop") ptype = "shop";
        setDestinationType(ptype);
        setSearch(s.display_name);
        setSuggestions([]);
        fetchRoute(startPoint, destCoords, travelMode);
      } else {
        doSearchAndRoute();
      }
    }
  };

  /* 9) clear route/destination helper */
  const clearRoute = () => {
    setDestination(null);
    setDestinationType(null);
    setRoute([]);
    setDistance(null);
    setDuration(null);
    setPlaces([]);
  };

  /* Loading state while we get startPoint */
  if (!startPoint) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gray-100">
        <p className="text-gray-700 text-lg">Getting your location...</p>
      </div>
    );
  }

  /* --------------------------
     Render
     -------------------------- */
  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="bg-white shadow-md p-4 flex flex-col md:w-64 w-full">
        <h1 className="font-bold text-lg mb-3">Navigation App</h1>

        {/* Voice Assistant (passes the transcript string to doSearchAndRoute) */}
        <Voice
          onVoiceCommand={(command) => {
            if (command && command.trim()) {
              setSearch(command);
              doSearchAndRoute(command);
            }
          }}
          distance={distance}
          duration={duration}
          travelMode={travelMode}
        />

        {/* Search input */}
        <div className="relative mb-3">
          <div className="flex">
            <input
              className="flex-1 p-2 border rounded-l-lg focus:outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search destination (restricted to Ethiopia)..."
            />
            <button
              className="px-3 py-2 bg-blue-600 text-white rounded-r-lg"
              onClick={() => doSearchAndRoute()}
            >
              Go
            </button>
          </div>

          {/* suggestions dropdown */}
          {suggestions && suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 bg-white border rounded-b-md shadow-md mt-1 max-h-44 overflow-auto z-20">
              {suggestions.map((s) => (
                <li
                  key={s.place_id || `${s.lat}-${s.lon}`}
                  className="p-2 hover:bg-blue-50 cursor-pointer text-sm"
                  onClick={() => {
                    // select suggestion
                    const destCoords = [parseFloat(s.lat), parseFloat(s.lon)];
                    setDestination(destCoords);
                    // detect type
                    let ptype = "other";
                    if (s.class === "amenity" && s.type) ptype = s.type;
                    if (s.class === "shop") ptype = "shop";
                    setDestinationType(ptype);
                    setSearch(s.display_name);
                    setSuggestions([]);
                    fetchRoute(startPoint, destCoords, travelMode);
                  }}
                >
                  {s.display_name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Travel modes */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {[
            { mode: "driving-car", label: "Driving" },
            { mode: "foot-walking", label: "Walking" },
            { mode: "cycling-regular", label: "Cycling" },
          ].map((m) => (
            <button
              key={m.mode}
              onClick={() => handleModeChange(m.mode)}
              className={`px-3 py-2 rounded-lg ${
                travelMode === m.mode
                  ? "bg-green-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              {m.label}
            </button>
          ))}

          <button
            onClick={clearRoute}
            className="px-3 py-2 ml-auto rounded-lg bg-gray-300 text-xs"
            title="Clear route"
          >
            Clear
          </button>
        </div>

        {/* Info */}
        {distance && duration ? (
          <div className="text-gray-700 mb-3">
            <div>
              Distance: <strong>{distance} km</strong>
            </div>
            <div>
              Duration: <strong>{duration} min</strong>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500 mb-3">No route yet</div>
        )}

        {/* Nearby list */}
        {places.length > 0 && (
          <>
            <h2 className="font-semibold mb-2">
              Nearby places (around destination)
            </h2>
            <ul className="text-sm space-y-1 max-h-52 overflow-y-auto">
              {places.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <div>
                    {p.name}{" "}
                    <span className="text-xs text-gray-400">({p.type})</span>
                  </div>
                  <button
                    onClick={() => handlePlaceClick(p)}
                    className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded"
                  >
                    Navigate
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>

      {/* Map */}
      <main className="flex-1 h-full">
        <MapContainer center={startPoint} zoom={14} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* Start point - simple marker */}
          <Marker position={startPoint}>
            <Popup>You are here</Popup>
          </Marker>

          {/* Destination */}
          {destination && (
            <Marker position={destination} icon={getIcon(destinationType)}>
              <Popup>{destinationType || "Destination"}</Popup>
            </Marker>
          )}

          {/* Nearby place markers */}
          {places.map((p) => (
            <Marker
              key={p.id}
              position={p.position}
              icon={getIcon(p.type)}
              eventHandlers={{ click: () => handlePlaceClick(p) }}
            >
              <Popup>
                <strong>{p.name}</strong>
                <br />
                <small>({p.type})</small>
                <br />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handlePlaceClick(p);
                  }}
                  className="mt-2 px-2 py-1 bg-blue-500 text-white text-xs rounded"
                >
                  Navigate Here
                </button>
              </Popup>
            </Marker>
          ))}

          {/* Route polyline */}
          {route.length > 0 && <Polyline positions={route} color="blue" />}

          {/* auto-center */}
          {destination && <MapMover coords={destination} />}
        </MapContainer>
      </main>
    </div>
  );
}
