import { createDemo } from './demo';

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
interface LoginResult { accessToken: string; refreshToken: string; user: { id: number; email: string; role: string } }
export class Api {
  readonly demo: boolean;
  readonly email: string;
  private expired: () => void;
  private accessToken = '';
  private refreshToken = '';
  private refreshWork: Promise<void> | null = null;
  private demoRequest = createDemo();
  private closed = false;
  constructor(demo: boolean, email: string, expired: () => void, tokens?: LoginResult) {
    this.demo = demo; this.email = email; this.expired = expired;
    if (tokens) { this.accessToken = tokens.accessToken; this.refreshToken = tokens.refreshToken; }
  }
  static async login(email: string, password: string, expired: () => void) {
    const result = await fetchJson<LoginResult>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (result.user.role !== 'admin') {
      await fetchJson('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: result.refreshToken }) }).catch(() => {});
      throw new Error('This portal is for platform administrators. Use your institution dashboard to sign in as staff.');
    }
    return new Api(false, result.user.email, expired, result);
  }
  async request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    if (this.closed) throw new Error('Session has ended. Sign in again.');
    if (this.demo) return this.demoRequest(path, method, body) as Promise<T>;
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
    if (!this.demo) await fetchJson('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: this.refreshToken }) });
    this.closed = true; this.accessToken = ''; this.refreshToken = '';
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
