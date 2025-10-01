import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function MapMover({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView(coords, 14);
  }, [coords, map]);
  return null;
}
