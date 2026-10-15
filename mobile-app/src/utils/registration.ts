const CODE_LIFETIME_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 45 * 1000;

export function registrationCodeIsCurrent(sentAt: number | undefined, now = Date.now()): boolean {
  return sentAt !== undefined && sentAt <= now && now - sentAt < CODE_LIFETIME_MS;
}

export function registrationProofIsCurrent(token: string | undefined, verifiedAt: number | undefined, now = Date.now()): boolean {
  return !!token && registrationCodeIsCurrent(verifiedAt, now);
}

export function registrationResendSeconds(sentAt: number | undefined, now = Date.now()): number {
  return sentAt === undefined ? 0 : Math.max(0, Math.ceil((sentAt + RESEND_COOLDOWN_MS - now) / 1000));
}

export function maskRegistrationEmail(email: string): string {
  const [name, domain] = email.trim().split('@');
  return name && domain ? name.charAt(0) + '***@' + domain : 'your email address';
}
