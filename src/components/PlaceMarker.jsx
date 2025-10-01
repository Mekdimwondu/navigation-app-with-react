import { Marker, Popup } from "react-leaflet";
import { getIcon } from "../utils/icons";

export default function PlaceMarker({ place, onClick }) {
  return (
    <Marker position={place.position} icon={getIcon(place.type)}>
      <Popup>
        <strong>{place.name}</strong>
        <br />
        <small>({place.type})</small>
        <br />
        <button
          onClick={(e) => {
            e.preventDefault();
            onClick();
          }}
          className="mt-2 px-2 py-1 bg-blue-500 text-white text-xs rounded"
        >
          Navigate Here
        </button>
      </Popup>
    </Marker>
  );
}
