/** Add separators without leaving trailing hyphens that trap backspace. */
export function formatBirthDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)]
    .filter(Boolean)
    .join('-');
}

/** Use local calendar values so a timezone change cannot shift the birthday. */
export function birthDateToString(date: Date): string {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function parseBirthDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1) return null;
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  return birthDateToString(date) === value ? date : null;
}

export function dateInBirthMonth(year: number, month: number, day = 1): Date {
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month, day);
  return date;
}

export function birthMonthDays(year: number, month: number): Array<number | null> {
  const firstWeekday = dateInBirthMonth(year, month).getDay();
  const days = dateInBirthMonth(year, month + 1, 0).getDate();
  return Array.from({ length: Math.ceil((firstWeekday + days) / 7) * 7 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day >= 1 && day <= days ? day : null;
  });
}

/** Keep the selected day where possible when changing month or year. */
export function moveBirthDateToMonth(value: Date, year: number, month: number, maximumDate: Date): Date {
  const lastDay = dateInBirthMonth(year, month + 1, 0).getDate();
  const next = dateInBirthMonth(year, month, Math.min(value.getDate(), lastDay));
  return birthDateToString(next) > birthDateToString(maximumDate) ? new Date(maximumDate) : next;
}

/** Match the registration API's existing minimum account age of 16. */
export function latestBirthDate(today = new Date()): Date {
  const latest = new Date(today);
  latest.setFullYear(latest.getFullYear() - 16);
  latest.setHours(12, 0, 0, 0);
  return latest;
}

export function getBirthDateError(value: string, today = new Date()): string | null {
  // Date of birth is optional in the existing registration API.
  if (!value) return null;
  if (!parseBirthDate(value)) return 'Enter a valid date as YYYY-MM-DD.';
  if (value > birthDateToString(today)) return 'Date of birth cannot be in the future.';
  if (value > birthDateToString(latestBirthDate(today))) {
    return 'You must be at least 16 years old to create an account.';
  }
  return null;
}
