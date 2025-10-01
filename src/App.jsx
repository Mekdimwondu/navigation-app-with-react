import { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import MapView from "./components/MapView";
import { fetchRoute } from "./utils/ors";
import { fetchNearbyPlaces } from "./utils/overpass";
import { fetchSuggestions, fetchSearchResult } from "./utils/nominatim";

export default function App() {
  const [startPoint, setStartPoint] = useState(null);
  const [destination, setDestination] = useState(null);
  const [destinationType, setDestinationType] = useState(null);
  const [route, setRoute] = useState([]);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [travelMode, setTravelMode] = useState("driving-car");
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [places, setPlaces] = useState([]);

  const suggestionsAbortRef = useRef(null);
  const suggestionsTimerRef = useRef(null);

  /* 1) Get user location once */
  useEffect(() => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported — using Addis.");
      setStartPoint([9.03, 38.74]);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setStartPoint([pos.coords.latitude, pos.coords.longitude]),
      () => {
        alert("Could not get location — using Addis.");
        setStartPoint([9.03, 38.74]);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  /* 2) Fetch nearby places when destination changes */
  useEffect(() => {
    if (destination) {
      fetchNearbyPlaces(destination, 1000).then(setPlaces);
    } else {
      setPlaces([]);
      setRoute([]);
      setDistance(null);
      setDuration(null);
    }
  }, [destination]);

  /* 3) Debounce search suggestions */
  useEffect(() => {
    if (!search.trim()) {
      setSuggestions([]);
      return;
    }
    clearTimeout(suggestionsTimerRef.current);
    suggestionsTimerRef.current = setTimeout(
      () => fetchSuggestions(search, suggestionsAbortRef).then(setSuggestions),
      350
    );
    return () => clearTimeout(suggestionsTimerRef.current);
  }, [search]);

  /* Handlers */
  const doSearchAndRoute = async (query) => {
    if (!startPoint) return;
    const item = await fetchSearchResult(query);
    if (!item) return;
    const destCoords = [parseFloat(item.lat), parseFloat(item.lon)];
    setDestination(destCoords);
    setDestinationType(item.type || "other");
    setSearch(item.display_name || query);
    setSuggestions([]);
    fetchRoute(
      startPoint,
      destCoords,
      travelMode,
      setRoute,
      setDistance,
      setDuration
    );
  };

  const handlePlaceClick = (place) => {
    setDestination(place.position);
    setDestinationType(place.type || "other");
    fetchRoute(
      startPoint,
      place.position,
      travelMode,
      setRoute,
      setDistance,
      setDuration
    );
  };

  const handleModeChange = (mode) => {
    setTravelMode(mode);
    if (destination && startPoint)
      fetchRoute(
        startPoint,
        destination,
        mode,
        setRoute,
        setDistance,
        setDuration
      );
  };

  const clearRoute = () => {
    setDestination(null);
    setDestinationType(null);
    setRoute([]);
    setDistance(null);
    setDuration(null);
    setPlaces([]);
  };

  if (!startPoint) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gray-100">
        <p className="text-gray-700 text-lg">Getting your location...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-gray-100">
      <Sidebar
        search={search}
        setSearch={setSearch}
        suggestions={suggestions}
        doSearchAndRoute={doSearchAndRoute}
        handleModeChange={handleModeChange}
        clearRoute={clearRoute}
        distance={distance}
        duration={duration}
        travelMode={travelMode}
        places={places}
        handlePlaceClick={handlePlaceClick}
      />
      {/* ✅ Force MapView to take full space */}
      <div className="flex-1 h-full w-full">
        <MapView
          startPoint={startPoint}
          destination={destination}
          destinationType={destinationType}
          route={route}
          places={places}
          handlePlaceClick={handlePlaceClick}
        />
      </div>
    </div>
  );
}
