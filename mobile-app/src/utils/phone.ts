/** Convert Sri Lankan mobile input to the format stored by the API. */
export function normalizeSriLankanMobile(value: string): string | null {
  const compact = value.replace(/[\s()-]/g, '');
  const match = compact.match(/^(?:0|\+?94)?(7\d{8})$/);
  return match ? `+94${match[1]}` : null;
}

/** Show valid pasted international numbers in the familiar local format. */
export function toLocalSriLankanMobile(value: string): string {
  const normalized = normalizeSriLankanMobile(value);
  return normalized ? `0${normalized.slice(3)}` : value;
}
