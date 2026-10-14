import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * BloodLink API Client
 *
 * Lightweight fetch-based API client with:
 * - Automatic token attachment
 * - Token refresh on 401
 * - Request/response error handling
 */

const getBaseUrl = (): string => {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (__DEV__) {
    // Extract host IP from Expo debugger connection (works automatically for physical phones and emulators!)
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
      (Constants as any).manifest?.debuggerHost;

    if (hostUri) {
      const hostIp = hostUri.split(":")[0];
      return `http://${hostIp}:4000/api`;
    }

    if (Platform.OS === "android") {
      return "http://10.0.2.2:4000/api";
    }
    return "http://localhost:4000/api";
  }
  // Production URL — update when deployed
  return "https://api.bloodlink.lk/api";
};

const BASE_URL = getBaseUrl();

// Token storage callbacks (set by AuthContext)
let getAccessToken: (() => Promise<string | null>) | null = null;
let getRefreshToken: (() => Promise<string | null>) | null = null;
let onTokenRefreshed:
  | ((accessToken: string, refreshToken: string) => Promise<void>)
  | null = null;
let onAuthFailed: (() => void) | null = null;

/**
 * Configure the API client with token management callbacks.
 * Called once by AuthContext during initialization.
 */
export function configureApiClient(config: {
  getAccessToken: () => Promise<string | null>;
  getRefreshToken: () => Promise<string | null>;
  onTokenRefreshed: (
    accessToken: string,
    refreshToken: string
  ) => Promise<void>;
  onAuthFailed: () => void;
}) {
  getAccessToken = config.getAccessToken;
  getRefreshToken = config.getRefreshToken;
  onTokenRefreshed = config.onTokenRefreshed;
  onAuthFailed = config.onAuthFailed;
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
  ok: boolean;
}

interface ApiError {
  error: string;
  details?: string[];
  status: number;
}

class ApiClientError extends Error {
  status: number;
  details?: string[];

  constructor(message: string, status: number, details?: string[]) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.details = details;
  }
}

/**
 * Attempt to refresh the access token using the refresh token.
 */
let refreshInFlight: Promise<boolean> | null = null;
function attemptTokenRefresh(): Promise<boolean> {
  if (!refreshInFlight) refreshInFlight = performTokenRefresh().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}
async function performTokenRefresh(): Promise<boolean> {
  if (!getRefreshToken || !onTokenRefreshed) return false;

  try {
    const refreshTokenValue = await getRefreshToken();
    if (!refreshTokenValue) return false;

    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) return false;
      throw new ApiClientError("Session refresh is temporarily unavailable. Please retry.", response.status);
    }

    const data = await response.json();
    if (typeof data.accessToken !== "string" || typeof data.refreshToken !== "string") {
      throw new ApiClientError("Invalid session response. Please retry.", 502);
    }
    await onTokenRefreshed(data.accessToken, data.refreshToken);
    return true;
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    throw new ApiClientError("Network error. Please check your connection.", 0);
  }
}

/**
 * Core request function with automatic auth and retry logic.
 */
async function request<T = any>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth: boolean = false,
  isRetry: boolean = false
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Attach access token if available and auth is required
  if (requiresAuth && getAccessToken) {
    const token = await getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 — attempt token refresh and retry once
    if (response.status === 401 && requiresAuth && !isRetry) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        return request<T>(endpoint, options, requiresAuth, true);
      } else {
        // Token refresh failed — force logout
        onAuthFailed?.();
        throw new ApiClientError("Session expired. Please sign in again.", 401);
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiClientError(
        data.error || "Request failed",
        response.status,
        data.details
      );
    }

    return {
      data: data as T,
      status: response.status,
      ok: true,
    };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;

    // Network error
    throw new ApiClientError(
      "Network error. Please check your connection.",
      0
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API Methods
// ═══════════════════════════════════════════════════════════════════════════

export const api = {
  /**
   * Public (unauthenticated) requests
   */
  get: <T = any>(endpoint: string) => request<T>(endpoint, { method: "GET" }),

  post: <T = any>(endpoint: string, body: any) =>
    request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /**
   * Authenticated requests (auto-attaches Bearer token)
   */
  authGet: <T = any>(endpoint: string) =>
    request<T>(endpoint, { method: "GET" }, true),

  authPost: <T = any>(endpoint: string, body: any) =>
    request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    }, true),

  authPut: <T = any>(endpoint: string, body: any) =>
    request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    }, true),

  authDelete: <T = any>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }, true),
};

export { ApiClientError };
export default api;
