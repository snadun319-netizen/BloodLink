import { useEffect, useRef, useState } from 'react';
import { Check, ExternalLink, LoaderCircle, MapPin, Navigation, Search } from 'lucide-react';
import { addressAt, isSriLankaPoint, loadMaps, readPoint, sriLankaBounds } from './googleMaps';
import type { MapEvent, MapsApi, MapInstance, Place, Point } from './googleMaps';

type Selection = { point: Point; name: string; address: string };
export function LocationPicker({ latitude, longitude, address = '', searchHint = '', onChange, onEditingChange, required = false }: {
  latitude: string; longitude: string; address?: string; searchHint?: string;
  onChange: (latitude: string, longitude: string, address: string) => void; required?: boolean;
  onEditingChange?: (editing: boolean) => void;
}) {
  const point = readPoint(latitude, longitude);
  const [editing, setEditing] = useState(!point);
  const [selection, setSelection] = useState<Selection | null>(point ? { point, name: 'Selected bank location', address } : null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'unconfigured' | 'error'>('loading');
  const [working, setWorking] = useState(false), [searching, setSearching] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const host = useRef<HTMLDivElement>(null), map = useRef<MapInstance | null>(null);
  const marker = useRef<InstanceType<MapsApi['marker']['AdvancedMarkerElement']> | null>(null);
  const sdk = useRef<MapsApi | null>(null), lookup = useRef<AbortController | null>(null);
  const serial = useRef(0), searchSerial = useRef(0), selectOnMap = useRef<(event: MapEvent) => void>(() => {});
  const initialPoint = useRef(point);
  useEffect(() => { onEditingChange?.(editing); }, [editing, onEditingChange]);

  function showSelection(next: Selection) {
    setSelection(next);
    if (marker.current) marker.current.position = next.point;
    map.current?.panTo(next.point); map.current?.setZoom?.(16);
  }
  function cancelLookup() { serial.current++; lookup.current?.abort(); setWorking(false); }
  async function choosePin(event: MapEvent) {
    if (!event.latLng) return;
    event.stop?.();
    const selectedPoint = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    if (!isSriLankaPoint(selectedPoint)) { setError('Choose a blood bank location in Sri Lanka.'); return; }
    cancelLookup(); const current = serial.current;
    const controller = new AbortController(); lookup.current = controller;
    setError(''); setNotice(''); setWorking(true);
    showSelection({ point: selectedPoint, name: 'Bank entrance pin', address: '' });
    try {
      if (event.placeId && sdk.current) {
        const place = new sdk.current.places.Place({ id: event.placeId });
        await place.fetchFields({ fields: ['displayName', 'formattedAddress'] });
        if (current === serial.current) showSelection({ point: selectedPoint, name: place.displayName || 'Selected blood bank', address: place.formattedAddress || '' });
      } else {
        const foundAddress = await addressAt(selectedPoint, controller.signal);
        if (current === serial.current) setSelection({ point: selectedPoint, name: 'Bank entrance pin', address: foundAddress });
      }
    } catch {
      if (current === serial.current) setNotice('The address could not be retrieved. Enter the address below and confirm the pin.');
    } finally { if (current === serial.current) setWorking(false); }
  }
  useEffect(() => { selectOnMap.current = event => { void choosePin(event); }; });
  useEffect(() => {
    if (!editing) return;
    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && !window.google?.maps.places) { setState('unconfigured'); return; }
    let active = true; const listeners: { remove(): void }[] = [];
    setState('loading');
    const authFailure = () => { if (active) { setState('error'); setError('Google Maps could not authorize this key. Check its settings or try again.'); } };
    window.addEventListener('bloodlink-map-error', authFailure);
    void loadMaps().then(api => {
      if (!active || !host.current) return;
      sdk.current = api;
      const start = initialPoint.current;
      map.current = new api.Map(host.current, { center: start || { lat: 7.8731, lng: 80.7718 }, zoom: start ? 16 : 7,
        mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID', streetViewControl: false, mapTypeControl: true,
        fullscreenControl: false, gestureHandling: 'cooperative' });
      marker.current = new api.marker.AdvancedMarkerElement({ map: map.current, position: start, title: 'Drag to the blood bank entrance', gmpDraggable: true });
      listeners.push(map.current.addListener('click', event => selectOnMap.current(event)), marker.current.addListener('dragend', event => selectOnMap.current(event)));
      setState('ready');
    }).catch(() => { if (active) { setState('error'); setError('Google Maps could not load. Check your connection and try again.'); } });
    return () => {
      active = false; serial.current++; searchSerial.current++; lookup.current?.abort();
      window.removeEventListener('bloodlink-map-error', authFailure); listeners.forEach(listener => listener.remove());
      if (marker.current) marker.current.map = null;
      marker.current = null; map.current = null;
    };
  }, [editing, attempt]);

  async function search() {
    const text = query.trim() || searchHint.trim();
    if (!text || !sdk.current) return;
    const current = ++searchSerial.current;
    setSearching(true); setError(''); setNotice(''); setResults([]);
    try {
      const response = await sdk.current.places.Place.searchByText({ textQuery: `${text} Sri Lanka`, fields: ['id', 'displayName', 'formattedAddress', 'location'],
        locationRestriction: sriLankaBounds, language: 'en', region: 'LK', maxResultCount: 5 });
      if (current !== searchSerial.current) return;
      const found = response.places.filter(place => place.location && isSriLankaPoint({ lat: place.location.lat(), lng: place.location.lng() }));
      setResults(found);
      if (!found.length) setNotice('No places found. Try a town or hospital name, or place a pin at the bank entrance.');
    } catch { if (current === searchSerial.current) setError('Place search is unavailable. Try again, or choose the bank entrance on the map.'); }
    finally { if (current === searchSerial.current) setSearching(false); }
  }
  function closeEditor() {
    cancelLookup(); searchSerial.current++; setSearching(false); setEditing(false); setError(''); setNotice(''); setResults([]);
  }
  function openEditor() {
    const saved = readPoint(latitude, longitude); initialPoint.current = saved;
    setSelection(saved ? { point: saved, name: 'Selected bank location', address } : null);
    setQuery(searchHint); setWorking(false); setEditing(true);
  }

  return <div className="location-picker">
    <input type="hidden" name="latitude" value={latitude} /><input type="hidden" name="longitude" value={longitude} />
    {!editing && <div className="location-summary"><MapPin size={24} /><div><strong>{point ? 'Bank location selected' : 'Choose the blood bank location'}</strong><p>{point ? address || 'Choose Change location to confirm the bank address.' : 'Search for the bank or place a pin at its entrance.'}</p>
      {point && <a className="text-link" href={`https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`} target="_blank" rel="noopener noreferrer">View selected location<ExternalLink size={14} /></a>}</div>
      <button type="button" className="button secondary" onClick={openEditor}>{point ? 'Change location' : 'Choose location'}</button></div>}
    {editing && <section aria-label="Choose blood bank location" className="location-editor">
      <div className="location-search"><label>Search for a blood bank or hospital<input value={query} placeholder={searchHint || 'e.g. Ratnapura blood bank'} onChange={event => { searchSerial.current++; setSearching(false); setResults([]); setQuery(event.target.value); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void search(); } }} /></label>
        <button type="button" className="button secondary" disabled={state !== 'ready' || searching || !(query.trim() || searchHint.trim())} onClick={() => void search()}>{searching ? <LoaderCircle className="spin" size={16} /> : <Search size={16} />}Search</button></div>
      {results.length > 0 && <ul className="location-results" aria-label="Place search results">{results.map(place => <li key={place.id}><button type="button" onClick={() => {
        cancelLookup(); setNotice(''); setError(''); showSelection({ point: { lat: place.location!.lat(), lng: place.location!.lng() }, name: place.displayName || 'Selected blood bank', address: place.formattedAddress || '' });
      }}><MapPin size={18} /><span><strong>{place.displayName || 'Blood bank'}</strong><small>{place.formattedAddress}</small></span></button></li>)}</ul>}
      <div className="location-map" ref={host} aria-label="Select the blood bank entrance on the map" />
      {state === 'loading' && <p className="location-message" role="status"><LoaderCircle size={17} className="spin" />Loading map…</p>}
      {state === 'unconfigured' && <p className="location-message">The map is not connected. Configure the browser Maps key to choose a location.</p>}
      {state === 'error' && <button type="button" className="text-button" onClick={() => { setError(''); setAttempt(value => value + 1); }}>Retry map</button>}
      {state === 'ready' && <p className="section-note">Select a search result or click the map. Drag the pin to the entrance donors should use.</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {notice && <p className="section-note" role="status">{notice}</p>}
      {selection && <div className="location-confirmation"><strong>Is this the correct blood bank location?</strong><p>{selection.name}</p>
        {working && <p role="status"><LoaderCircle className="spin" size={16} />Finding the address…</p>}
        <label>Address for this location<textarea aria-label="Address for selected location" rows={2} maxLength={2000} value={selection.address} onChange={event => setSelection({ ...selection, address: event.target.value })} placeholder="Street address and city" /></label>
        <button type="button" className="button primary" disabled={working || !selection.address.trim()} onClick={() => {
          onChange(selection.point.lat.toFixed(7), selection.point.lng.toFixed(7), selection.address.trim()); closeEditor();
        }}><Check size={16} />Confirm this location</button></div>}
      <div className="location-actions"><button type="button" className="text-button" disabled={working || state !== 'ready'} onClick={() => {
        if (!navigator.geolocation) { setError('Location sharing is unavailable in this browser. Search for the bank instead.'); return; }
        navigator.geolocation.getCurrentPosition(position => { void choosePin({ latLng: { lat: () => position.coords.latitude, lng: () => position.coords.longitude } }); }, () => setError('Location sharing was unavailable. Search for the bank instead.'), { timeout: 10000 });
      }}><Navigation size={14} />Use my location</button><button type="button" className="text-button" onClick={closeEditor}>Cancel location selection</button></div>
    </section>}
    {required && !point && !editing && <p className="section-note">Choose and confirm a location before adding this bank.</p>}
  </div>;
}
