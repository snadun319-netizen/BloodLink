export type Point = { lat: number; lng: number };
export type MapEvent = { latLng?: { lat(): number; lng(): number }; placeId?: string; stop?(): void };
export type MapInstance = { panTo(point: Point): void; setZoom?(zoom: number): void; addListener(event: string, callback: (event: MapEvent) => void): { remove(): void } };
type MarkerInstance = { position: Point | null; map: MapInstance | null; addListener(event: string, callback: (event: MapEvent) => void): { remove(): void } };
export type Place = { id: string; displayName?: string; formattedAddress?: string; location?: { lat(): number; lng(): number }; fetchFields(options: { fields: string[] }): Promise<unknown> };
export type MapsApi = {
  Map: new (element: HTMLElement, options: object) => MapInstance;
  marker: { AdvancedMarkerElement: new (options: object) => MarkerInstance };
  places: { Place: { new (options: { id: string }): Place; searchByText(options: object): Promise<{ places: Place[] }> } };
};
declare global {
  interface Window { google?: { maps: MapsApi }; bloodlinkMapReady?: () => void; gm_authFailure?: () => void }
}
let mapLoad: Promise<MapsApi> | null = null;
export function loadMaps(): Promise<MapsApi> {
  if (window.google?.maps.marker && window.google.maps.places) return Promise.resolve(window.google.maps);
  if (mapLoad) return mapLoad;
  mapLoad = new Promise<MapsApi>((resolve, reject) => {
    const script = document.createElement('script');
    const fail = () => { window.clearTimeout(timer); script.remove(); reject(new Error('Google Maps could not load. Check your connection or try again.')); };
    const timer = window.setTimeout(fail, 20000);
    window.bloodlinkMapReady = () => { window.clearTimeout(timer); resolve(window.google!.maps); };
    window.gm_authFailure = () => { window.dispatchEvent(new Event('bloodlink-map-error')); fail(); };
    script.onerror = fail;
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({ key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY, v: 'weekly', loading: 'async', libraries: 'marker,places', language: 'en', region: 'LK', callback: 'bloodlinkMapReady' })}`;
    script.async = true;
    document.head.append(script);
  }).catch(error => { mapLoad = null; throw error; });
  return mapLoad;
}

export const sriLankaBounds = { south: 5.5, north: 10.2, west: 79.3, east: 82.2 };
export function isSriLankaPoint(point: Point) {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng) && point.lat >= sriLankaBounds.south
    && point.lat <= sriLankaBounds.north && point.lng >= sriLankaBounds.west && point.lng <= sriLankaBounds.east;
}
export function readPoint(latitude: string, longitude: string): Point | null {
  if (!latitude.trim() || !longitude.trim()) return null;
  const point = { lat: Number(latitude), lng: Number(longitude) };
  return Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180 ? point : null;
}
export async function addressAt(point: Point, signal: AbortSignal): Promise<string> {
  const response = await fetch(`https://geocode.googleapis.com/v4/geocode/location/${point.lat},${point.lng}?languageCode=en`, {
    headers: { 'X-Goog-Api-Key': import.meta.env.VITE_GOOGLE_MAPS_API_KEY, 'X-Goog-FieldMask': 'results.formattedAddress' },
    signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
  });
  if (!response.ok) throw new Error('Address lookup is unavailable. Enter the bank address to confirm this pin.');
  const body = await response.json() as { results?: { formattedAddress?: string }[] };
  return body.results?.[0]?.formattedAddress || '';
}
