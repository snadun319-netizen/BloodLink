import { useEffect, useRef, useState } from 'react';
import { ExternalLink, LoaderCircle, MapPin, Navigation } from 'lucide-react';

type Point = { lat: number; lng: number };
type MapEvent = { latLng?: { lat(): number; lng(): number } };
type MapInstance = { panTo(point: Point): void; addListener(event: string, callback: (event: MapEvent) => void): { remove(): void } };
type MarkerInstance = { position: Point | null; map: MapInstance | null; addListener(event: string, callback: (event: MapEvent) => void): { remove(): void } };
type MapsApi = {
  Map: new (element: HTMLElement, options: object) => MapInstance;
  marker: { AdvancedMarkerElement: new (options: object) => MarkerInstance };
};
declare global {
  interface Window { google?: { maps: MapsApi }; bloodlinkMapReady?: () => void; gm_authFailure?: () => void }
}
let mapLoad: Promise<MapsApi> | null = null;
function loadMaps(): Promise<MapsApi> {
  if (window.google?.maps.marker) return Promise.resolve(window.google.maps);
  if (mapLoad) return mapLoad;
  mapLoad = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = window.setTimeout(() => reject(new Error('Google Maps could not load. Enter coordinates below or try again later.')), 20000);
    window.bloodlinkMapReady = () => { window.clearTimeout(timer); resolve(window.google!.maps); };
    window.gm_authFailure = () => { window.clearTimeout(timer); window.dispatchEvent(new Event('bloodlink-map-error')); reject(new Error('Google Maps is unavailable. Enter coordinates below.')); };
    script.onerror = () => { window.clearTimeout(timer); reject(new Error('Google Maps could not load. Enter coordinates below.')); };
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({ key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY, v: 'weekly', loading: 'async', libraries: 'marker', callback: 'bloodlinkMapReady' })}`;
    script.async = true;
    document.head.append(script);
  });
  return mapLoad;
}

export function LocationPicker({ latitude, longitude, onChange, required = false }: {
  latitude: string; longitude: string; onChange: (latitude: string, longitude: string) => void; required?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null); const marker = useRef<MarkerInstance | null>(null);
  const onSelect = useRef(onChange);
  const [state, setState] = useState(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || window.google?.maps.marker ? 'loading' : 'unconfigured');
  const [error, setError] = useState('');
  const point = latitude !== '' && longitude !== '' && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) && Math.abs(Number(latitude)) <= 90 && Math.abs(Number(longitude)) <= 180 ? { lat: Number(latitude), lng: Number(longitude) } : null;
  const currentPoint = useRef(point);
  useEffect(() => { onSelect.current = onChange; currentPoint.current = point; });
  useEffect(() => {
    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && !window.google?.maps.marker) return;
    let active = true; const listeners: { remove(): void }[] = [];
    const authFailure = () => { setState('error'); setError('Google Maps is unavailable. Enter coordinates below.'); };
    window.addEventListener('bloodlink-map-error', authFailure);
    void loadMaps().then(api => {
      if (!active || !host.current) return;
      const start = currentPoint.current;
      map.current = new api.Map(host.current, { center: start || { lat: 7.8731, lng: 80.7718 }, zoom: start ? 15 : 7, mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID', streetViewControl: false, mapTypeControl: false, fullscreenControl: false, gestureHandling: 'cooperative' });
      marker.current = new api.marker.AdvancedMarkerElement({ map: map.current, position: start, title: 'Blood bank location. Drag to adjust.', gmpDraggable: true });
      const select = (event: MapEvent) => { if (event.latLng) onSelect.current(event.latLng.lat().toFixed(7), event.latLng.lng().toFixed(7)); };
      listeners.push(map.current.addListener('click', select), marker.current.addListener('dragend', select));
      setState('ready');
    }).catch(err => { if (active) { setState('error'); setError(err.message); } });
    return () => { active = false; window.removeEventListener('bloodlink-map-error', authFailure); listeners.forEach(listener => listener.remove()); if (marker.current) marker.current.map = null; marker.current = null; map.current = null; };
  }, []);
  useEffect(() => {
    if (marker.current) marker.current.position = point;
    if (point) map.current?.panTo(point);
  }, [latitude, longitude, state]); // eslint-disable-line react-hooks/exhaustive-deps
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point ? `${point.lat},${point.lng}` : 'blood banks Sri Lanka')}`;
  return <div className="location-picker">
    <div className="location-map" ref={host} aria-label="Select the blood bank location on Google Maps" />
    {state === 'loading' && <p className="location-message" role="status"><LoaderCircle size={17} className="spin" />Loading Google Maps…</p>}
    {state === 'unconfigured' && <div className="location-message"><MapPin size={21} /><p>Open Google Maps to find the bank, then enter its coordinates below. The map picker will appear here when Google Maps is connected.</p></div>}
    {state === 'error' && <p className="error-message" role="alert">{error}</p>}
    {state === 'ready' && <p className="section-note">Click the map to place a pin, or drag the pin to the bank entrance.</p>}
    <div className="location-actions"><a className="text-link" href={mapsUrl} target="_blank" rel="noopener noreferrer">Open Google Maps<ExternalLink size={14} /></a><button type="button" className="text-button" onClick={() => {
      if (!navigator.geolocation) { setError('Your browser cannot provide a location. Select it on the map or enter coordinates.'); return; }
      navigator.geolocation.getCurrentPosition(position => { setError(''); onChange(position.coords.latitude.toFixed(7), position.coords.longitude.toFixed(7)); }, () => setError('Location permission was unavailable. Select the bank on the map or enter coordinates.'));
    }}><Navigation size={14} />Use my location</button></div>
    {error && state !== 'error' && <p className="error-message" role="alert">{error}</p>}
    <div className="form-grid"><label>Latitude{required && ' (required)'}<input name="latitude" type="number" min="-90" max="90" step="any" required={required} value={latitude} onChange={event => onChange(event.target.value, longitude)} placeholder="6.9271" /></label><label>Longitude{required && ' (required)'}<input name="longitude" type="number" min="-180" max="180" step="any" required={required} value={longitude} onChange={event => onChange(latitude, event.target.value)} placeholder="79.8612" /></label></div>
  </div>;
}
