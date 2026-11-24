/** Navigate to the institution's saved pin; names can identify several branches. */
export function bankDirectionsUrl(location: { latitude: number; longitude: number } | null | undefined): string | null {
  if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number'
    || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)
    || Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${location.latitude},${location.longitude}`)}&travelmode=driving&dir_action=navigate`;
}
