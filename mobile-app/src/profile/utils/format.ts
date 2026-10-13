
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(input: string | Date): string {
    const d = typeof input === 'string' ? new Date(input) : input;
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatMonthYear(input: string | Date): string {
    const d = typeof input === 'string' ? new Date(input) : input;
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function getInitials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Data minimisation: show only the start and end of the NIC (e.g. 199812*****V)
export function maskNic(nic: string): string {
    if (nic.length <= 6) return nic;
    return `${nic.slice(0, 6)}${'*'.repeat(nic.length - 7)}${nic.slice(-1)}`;
}

// Accepts +94771234567, 0771234567, "077 123 4567"
export function isValidSriLankanMobile(phone: string): boolean {
    return /^(?:\+94|0)7\d{8}$/.test(phone.replace(/\s|-/g, ''));
}