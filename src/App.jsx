// src/App.jsx
import { useState, useEffect } from "react";
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
   Helper: pick icon by type
   -------------------------- */
const getIcon = (type) => {
  if (!type) return destinationIcon;
  const t = String(type).toLowerCase();
  if (t.includes("restaurant")) return restaurantIcon;
  if (t.includes("cafe")) return cafeIcon;
  if (t.includes("shop")) return shopIcon;
  // fallback
  return destinationIcon;
};

/* --------------------------
   Main App
   -------------------------- */
export default function App() {
  const [startPoint, setStartPoint] = useState(null);
  const [destination, setDestination] = useState(null);
  const [destinationType, setDestinationType] = useState(null); // restaurant, cafe, shop, other
  const [route, setRoute] = useState([]);
  const [search, setSearch] = useState("");
  const [travelMode, setTravelMode] = useState("driving-car");
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [places, setPlaces] = useState([]); // nearby around destination

  /* 1) Get user location once */
  useEffect(() => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported — using default point.");
      setStartPoint([9.03, 38.74]);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStartPoint([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        console.warn("Geolocation failed:", err);
        alert("Could not get your location — using default point.");
        setStartPoint([9.03, 38.74]);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  /* 2) ORS route fetch (safe) */
  const fetchRoute = async (start, end, mode) => {
    if (!start || !end) return;
    try {
      const ORS_KEY = import.meta.env.VITE_ORS_KEY;
      if (!ORS_KEY) {
        alert(
          "OpenRouteService key not found. Add VITE_ORS_KEY to .env and restart dev server."
        );
        return;
      }

      // ORS requires start=lon,lat & end=lon,lat
      const url = `https://api.openrouteservice.org/v2/directions/${mode}?api_key=${ORS_KEY}&start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`;

      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        console.error("ORS error:", res.status, text);
        throw new Error(`ORS status ${res.status}`);
      }
      const data = await res.json();

      // polyline coordinates: convert [lng,lat] -> [lat,lng]
      const coords = data.features[0].geometry.coordinates.map(([lng, lat]) => [
        lat,
        lng,
      ]);
      setRoute(coords);

      // distance(m) -> km, duration(s) -> min
      const distKm = data.features[0].properties.summary.distance / 1000;
      const durMin = data.features[0].properties.summary.duration / 60;
      setDistance(distKm.toFixed(1));
      setDuration(Math.round(durMin));
    } catch (err) {
      console.error("fetchRoute err:", err);
      alert(
        "Could not calculate route. Check ORS key, your coordinates, or try again later."
      );
      setRoute([]);
      setDistance(null);
      setDuration(null);
    }
  };

  /* 3) Fetch nearby places using Overpass around a coordinate */
  const fetchNearbyPlaces = async (coords, radius = 800) => {
    if (!coords) return;
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
      if (!res.ok) throw new Error("Overpass error: " + res.status);
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

  /* 4) When destination changes: fetch nearby around it */
  useEffect(() => {
    if (destination) {
      // fetch nearby places around destination (not start)
      fetchNearbyPlaces(destination, 1000);
    } else {
      // clear places if no destination
      setPlaces([]);
      setRoute([]);
      setDistance(null);
      setDuration(null);
    }
  }, [destination]);

  /* 5) Search handler (Nominatim). Detect type if possible */
  const handleSearch = async () => {
    if (!search || !startPoint) return;
    try {
      const q = encodeURIComponent(search);
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}&addressdetails=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": "NavigationApp/1.0" },
      });
      const arr = await res.json();
      if (!arr || arr.length === 0) {
        alert("Location not found.");
        return;
      }
      const item = arr[0];
      const destCoords = [parseFloat(item.lat), parseFloat(item.lon)];

      // Try to detect the type from Nominatim fields
      let ptype = "other";
      if (
        item.class === "amenity" ||
        (item.type && ["restaurant", "cafe"].includes(item.type))
      ) {
        ptype = item.type || "other";
      } else if (item.class === "shop" || item.type === "shop") {
        ptype = "shop";
      } else if (
        item.extratags &&
        (item.extratags.amenity || item.extratags.shop)
      ) {
        ptype = item.extratags.amenity || item.extratags.shop || "other";
      }

      setDestination(destCoords);
      setDestinationType(ptype);
      // Draw route automatically
      fetchRoute(startPoint, destCoords, travelMode);
    } catch (err) {
      console.error("handleSearch err:", err);
      alert("Search failed — try again.");
    }
  };

  /* 6) When clicking a nearby place -> navigate there */
  const handlePlaceClick = (place) => {
    setDestination(place.position);
    setDestinationType(place.type || "other");
    fetchRoute(startPoint, place.position, travelMode);
  };

  /* 7) Travel mode switch */
  const handleModeChange = (mode) => {
    setTravelMode(mode);
    if (destination && startPoint) fetchRoute(startPoint, destination, mode);
  };

  /* 8) Loading state while we get startPoint */
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

        {/* Search */}
        <div className="flex mb-3">
          <input
            className="flex-1 p-2 border rounded-l-lg focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search destination..."
          />
          <button
            className="px-3 py-2 bg-blue-600 text-white rounded-r-lg"
            onClick={handleSearch}
          >
            Go
          </button>
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

          {/* Start point - simple default marker */}
          <Marker position={startPoint}>
            <Popup>You are here</Popup>
          </Marker>

          {/* Destination - uses icon by type */}
          {destination && (
            <Marker position={destination} icon={getIcon(destinationType)}>
              <Popup>{destinationType || "Destination"}</Popup>
            </Marker>
          )}

          {/* Nearby places (from Overpass) */}
          {places.map((p) => (
            <Marker
              key={p.id}
              position={p.position}
              icon={getIcon(p.type)}
              eventHandlers={{
                click: () => handlePlaceClick(p),
              }}
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

          {/* center map to destination when set */}
          {destination && <MapMover coords={destination} />}
        </MapContainer>
      </main>
    </div>
  );
}
