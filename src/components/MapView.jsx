import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
} from "react-leaflet";
import MapMover from "./MapMover";
import PlaceMarker from "./PlaceMarker";
import { getIcon } from "../utils/icons";

export default function MapView({
  startPoint,
  destination,
  destinationType,
  route,
  places,
  handlePlaceClick,
}) {
  return (
    <main className="flex-1 h-full">
      <MapContainer center={startPoint} zoom={14} className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={startPoint}>
          <Popup>You are here</Popup>
        </Marker>
        {destination && (
          <Marker position={destination} icon={getIcon(destinationType)}>
            <Popup>Destination</Popup>
          </Marker>
        )}
        {places.map((p) => (
          <PlaceMarker
            key={p.id}
            place={p}
            onClick={() => handlePlaceClick(p)}
          />
        ))}
        {route.length > 0 && <Polyline positions={route} color="blue" />}
        {destination && <MapMover coords={destination} />}
      </MapContainer>
    </main>
  );
}
