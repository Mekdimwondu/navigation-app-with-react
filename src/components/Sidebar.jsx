import Voice from "./Voice";

export default function Sidebar({
  search,
  setSearch,
  suggestions,
  doSearchAndRoute,
  handleModeChange,
  clearRoute,
  distance,
  duration,
  travelMode,
  places,
  handlePlaceClick,
}) {
  return (
    <aside className="bg-white shadow-md p-4 flex flex-col md:w-64 w-full">
      <h1 className="font-bold text-lg mb-3">Navigation App</h1>
      <Voice
        onVoiceCommand={(cmd) => doSearchAndRoute(cmd)}
        distance={distance}
        duration={duration}
        travelMode={travelMode}
      />

      {/* Search box */}
      <div className="relative mb-3">
        <div className="flex">
          <input
            className="flex-1 p-2 border rounded-l-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search in Ethiopia..."
          />
          <button
            className="px-3 py-2 bg-blue-600 text-white rounded-r-lg"
            onClick={() => doSearchAndRoute(search)}
          >
            Go
          </button>
        </div>
        {suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 bg-white border rounded-b-md shadow-md mt-1 max-h-44 overflow-auto z-20">
            {suggestions.map((s) => (
              <li
                key={s.place_id}
                className="p-2 hover:bg-blue-50 cursor-pointer text-sm"
                onClick={() => doSearchAndRoute(s.display_name)}
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
              travelMode === m.mode ? "bg-green-600 text-white" : "bg-gray-200"
            }`}
          >
            {m.label}
          </button>
        ))}
        <button
          onClick={clearRoute}
          className="px-3 py-2 ml-auto rounded-lg bg-gray-300 text-xs"
        >
          Clear
        </button>
      </div>

      {/* Distance & duration */}
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

      {/* Nearby */}
      {places.length > 0 && (
        <>
          <h2 className="font-semibold mb-2">Nearby places</h2>
          <ul className="text-sm space-y-1 max-h-52 overflow-y-auto">
            {places.map((p) => (
              <li key={p.id} className="flex justify-between">
                <div>
                  {p.name}{" "}
                  <span className="text-xs text-gray-400">({p.type})</span>
                </div>
                <button
                  onClick={() => handlePlaceClick(p)}
                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded"
                >
                  Navigate
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
