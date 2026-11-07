const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
interface LoginResult { accessToken: string; refreshToken: string; user: { id: number; email: string; role: string; mustChangePassword?: boolean } }
export class Api {
  readonly email: string;
  readonly role: string;
  readonly mustChangePassword: boolean;
  private expired: () => void;
  private accessToken = '';
  private refreshToken = '';
  private refreshWork: Promise<void> | null = null;
  private closed = false;
  private constructor(email: string, expired: () => void, tokens: LoginResult) {
    this.email = email; this.expired = expired;
    this.role = tokens.user.role; this.mustChangePassword = !!tokens.user.mustChangePassword;
    this.accessToken = tokens.accessToken; this.refreshToken = tokens.refreshToken;
  }
  static async login(email: string, password: string, expired: () => void) {
    const result = await fetchJson<LoginResult>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (!['admin', 'bloodbank_staff', 'hospital_staff'].includes(result.user.role)) {
      await fetchJson('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: result.refreshToken }) }).catch(() => {});
      throw new Error('This portal is for blood bank, hospital and platform administrators. Donors should sign in using the mobile app.');
    }
    return new Api(result.user.email, expired, result);
  }
  async request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    if (this.closed) throw new Error('Session has ended. Sign in again.');
    const originalToken = this.accessToken;
    const options = () => ({ method, headers: { Authorization: `Bearer ${this.accessToken}` }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    try { return await fetchJson<T>(path, options()); }
    catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      if (this.accessToken !== originalToken) return fetchJson<T>(path, options());
      try {
        if (!this.refreshWork) {
          this.refreshWork = fetchJson<LoginResult>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: this.refreshToken }) })
            .then(pair => {
              if (typeof pair.accessToken !== 'string' || !pair.accessToken || typeof pair.refreshToken !== 'string' || !pair.refreshToken) throw new Error('Invalid session response. Please try again.');
              if (!this.closed) { this.accessToken = pair.accessToken; this.refreshToken = pair.refreshToken; }
            })
            .finally(() => { this.refreshWork = null; });
        }
        await this.refreshWork;
      } catch (refreshError) {
        if (refreshError instanceof ApiError && [401, 403].includes(refreshError.status)) {
          this.closed = true; this.accessToken = ''; this.refreshToken = ''; this.expired();
          throw new Error('Your session has expired. Please sign in again.');
        }
        throw refreshError;
      }
      if (this.closed) throw new Error('Session has ended. Sign in again.');
      return fetchJson<T>(path, options());
    }
  }
  async logout() {
    if (this.refreshWork) await this.refreshWork.catch(() => {});
    await fetchJson('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: this.refreshToken }) });
    this.closed = true; this.accessToken = ''; this.refreshToken = '';
  }
  async downloadDocument(path: string): Promise<Blob> {
    if (!/^\/api\/documents\/[a-f0-9-]{36}$/i.test(path)) throw new Error('Invalid document reference');
    // Refresh through the same coalesced session flow before fetching binary data.
    await this.request('/auth/me');
    const response = await fetch(BASE + path.slice('/api'.length), { headers: { Authorization: `Bearer ${this.accessToken}` } });
    if (!response.ok) throw new Error('Could not download this document. Please try again.');
    return response.blob();
  }
}
class ApiError extends Error { readonly status: number; constructor(message: string, status: number) { super(message); this.status = status; } }
async function fetchJson<T>(path: string, options: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(BASE + path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } }); }
  catch { throw new Error('Cannot reach BloodLink. Check that the backend is running and try again.'); }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(data?.error || `Request failed (${response.status}). Please try again.`, response.status);
  return data as T;
}
