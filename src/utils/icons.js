import L from "leaflet";

export const restaurantIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3075/3075977.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28],
});

export const cafeIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/4151/4151022.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28],
});

export const shopIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2331/2331970.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28],
});

export const destinationIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -30],
});

export const getIcon = (type) => {
  if (!type) return destinationIcon;
  const t = String(type).toLowerCase();
  if (t.includes("restaurant")) return restaurantIcon;
  if (t.includes("cafe")) return cafeIcon;
  if (t.includes("shop")) return shopIcon;
  return destinationIcon;
};
