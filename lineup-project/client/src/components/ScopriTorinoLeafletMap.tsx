import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** Bbox allineato a `TORINO_GEO_BOUNDS` sul server (sud-ovest → nord-est). */
const TORINO_SW = L.latLng(45.02, 7.57);
const TORINO_NE = L.latLng(45.133, 7.78);

type Props = {
  /** Se true: niente pan/zoom sulla mappa (il genitore intercetta i tratti per l’area). */
  freezeInteraction: boolean;
};

export default function ScopriTorinoLeafletMap({ freezeInteraction }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      zoomControl: true,
      attributionControl: true,
    });

    map.fitBounds(L.latLngBounds(TORINO_SW, TORINO_NE), { padding: [10, 10] });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '<span style="font-size:10px">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a></span>',
    }).addTo(map);

    mapRef.current = map;
    queueMicrotask(() => {
      map.invalidateSize();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    if (freezeInteraction) {
      m.dragging.disable();
      m.touchZoom.disable();
      m.doubleClickZoom.disable();
      m.scrollWheelZoom.disable();
      m.boxZoom.disable();
      m.keyboard.disable();
    } else {
      m.dragging.enable();
      m.touchZoom.enable();
      m.doubleClickZoom.enable();
      m.scrollWheelZoom.enable();
      m.boxZoom.enable();
      m.keyboard.enable();
    }
    queueMicrotask(() => {
      m.invalidateSize({ animate: false });
    });
  }, [freezeInteraction]);

  return (
    <div
      ref={hostRef}
      className="scopri-leaflet-host absolute inset-0 z-0 h-full w-full min-h-[180px] gpu-smooth"
    />
  );
}
