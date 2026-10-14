import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { configureApiClient } from "../services/api";
import {
  User,
  loginWithEmail,
  loginWithPhone,
  registerDonor,
  RegisterData,
  getMe,
  logout as logoutApi,
  sendRegistrationOtp,
  verifyRegistrationOtp,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
  ApiClientError,
} from "../services/authService";

// ─── Secure Storage Keys ────────────────────────────────────────────────────
const ACCESS_TOKEN_KEY = "bloodlink_access_token";
const REFRESH_TOKEN_KEY = "bloodlink_refresh_token";

// ─── Platform-aware secure storage ──────────────────────────────────────────
// SecureStore doesn't work on web, so we fall back to memory storage in dev
const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      // Web fallback: use localStorage in dev
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return await SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Silently fail
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        localStorage.removeItem(key);
      } catch {
        // Silently fail
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

// ─── Context Types ──────────────────────────────────────────────────────────

interface AuthContextType {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Auth Actions
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<void>;
  signInWithPhone: (
    phone: string,
    password: string
  ) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  signOut: () => Promise<void>;

  // OTP Actions (Registration)
  sendOtp: (
    identifier: string,
    type: "email" | "phone"
  ) => Promise<void>;
  verifyOtp: (
    identifier: string,
    type: "email" | "phone",
    otp: string
  ) => Promise<boolean>;

  // Password Reset Actions
  requestReset: (email: string) => Promise<void>;
  verifyResetOtp: (
    email: string,
    otp: string
  ) => Promise<string>; // returns resetToken
  completeReset: (
    email: string,
    password: string,
    confirmPassword: string,
    resetToken: string
  ) => Promise<void>;

  // Utilities
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = user !== null;

  // ─── Configure API client on mount ──────────────────────────────────────
  useEffect(() => {
    configureApiClient({
      getAccessToken: () => storage.get(ACCESS_TOKEN_KEY),
      getRefreshToken: () => storage.get(REFRESH_TOKEN_KEY),
      onTokenRefreshed: async (accessToken, refreshToken) => {
        await storage.set(ACCESS_TOKEN_KEY, accessToken);
        await storage.set(REFRESH_TOKEN_KEY, refreshToken);
      },
      onAuthFailed: () => {
        // Force logout when tokens are completely invalid
        handleSignOut();
      },
    });

    // Try to restore session
    restoreSession();
  }, []);

  // ─── Session Restoration ────────────────────────────────────────────────
  const restoreSession = async () => {
    try {
      const accessToken = await storage.get(ACCESS_TOKEN_KEY);
      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      // Try to fetch user profile
      const userData = await getMe();
      setUser(userData);
    } catch (err) {
      if (err instanceof ApiClientError && [401, 403].includes(err.status)) {
        await storage.remove(ACCESS_TOKEN_KEY);
        await storage.remove(REFRESH_TOKEN_KEY);
      } else {
        setError("Unable to restore your session. Please check your connection.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Sign In with Email ─────────────────────────────────────────────────
  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setError(null);
      setIsLoading(true);
      try {
        const response = await loginWithEmail(email, password);
        await storage.set(ACCESS_TOKEN_KEY, response.accessToken);
        await storage.set(REFRESH_TOKEN_KEY, response.refreshToken);
        setUser(response.user);
      } catch (err) {
        const message =
          err instanceof ApiClientError
            ? err.message
            : "Login failed. Please try again.";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ─── Sign In with Phone ─────────────────────────────────────────────────
  const signInWithPhone = useCallback(
    async (phone: string, password: string) => {
      setError(null);
      setIsLoading(true);
      try {
        const response = await loginWithPhone(phone, password);
        await storage.set(ACCESS_TOKEN_KEY, response.accessToken);
        await storage.set(REFRESH_TOKEN_KEY, response.refreshToken);
        setUser(response.user);
      } catch (err) {
        const message =
          err instanceof ApiClientError
            ? err.message
            : "Login failed. Please try again.";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ─── Register ───────────────────────────────────────────────────────────
  const register = useCallback(async (data: RegisterData) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await registerDonor(data);
      await storage.set(ACCESS_TOKEN_KEY, response.accessToken);
      await storage.set(REFRESH_TOKEN_KEY, response.refreshToken);
      setUser(response.user);
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Registration failed. Please try again.";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Sign Out ───────────────────────────────────────────────────────────
  const handleSignOut = useCallback(async () => {
    try {
      const refreshToken = await storage.get(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        await logoutApi(refreshToken).catch(() => {});
      }
    } finally {
      await storage.remove(ACCESS_TOKEN_KEY);
      await storage.remove(REFRESH_TOKEN_KEY);
      setUser(null);
      setError(null);
    }
  }, []);

  // ─── OTP Actions ────────────────────────────────────────────────────────
  const sendOtp = useCallback(
    async (
      identifier: string,
      type: "email" | "phone"
    ): Promise<void> => {
      setError(null);
      try {
        await sendRegistrationOtp(identifier, type);
      } catch (err) {
        const message =
          err instanceof ApiClientError
            ? err.message
            : "Failed to send OTP.";
        setError(message);
        throw err;
      }
    },
    []
  );

  const verifyOtp = useCallback(
    async (
      identifier: string,
      type: "email" | "phone",
      otp: string
    ): Promise<boolean> => {
      setError(null);
      try {
        const result = await verifyRegistrationOtp(identifier, type, otp);
        return result.verified;
      } catch (err) {
        const message =
          err instanceof ApiClientError
            ? err.message
            : "OTP verification failed.";
        setError(message);
        throw err;
      }
    },
    []
  );

  // ─── Password Reset Actions ─────────────────────────────────────────────
  const requestReset = useCallback(
    async (email: string): Promise<void> => {
      setError(null);
      try {
        await requestPasswordReset(email);
      } catch (err) {
        const message =
          err instanceof ApiClientError
            ? err.message
            : "Failed to request password reset.";
        setError(message);
        throw err;
      }
    },
    []
  );

  const verifyResetOtpAction = useCallback(
    async (email: string, otp: string): Promise<string> => {
      setError(null);
      try {
        const result = await verifyPasswordResetOtp(email, otp);
        return result.resetToken;
      } catch (err) {
        const message =
          err instanceof ApiClientError
            ? err.message
            : "OTP verification failed.";
        setError(message);
        throw err;
      }
    },
    []
  );

  const completeReset = useCallback(
    async (
      email: string,
      password: string,
      confirmPassword: string,
      resetToken: string
    ) => {
      setError(null);
      try {
        await resetPassword(email, password, confirmPassword, resetToken);
      } catch (err) {
        const message =
          err instanceof ApiClientError
            ? err.message
            : "Password reset failed.";
        setError(message);
        throw err;
      }
    },
    []
  );

  // ─── Refresh User ───────────────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const userData = await getMe();
      setUser(userData);
    } catch {
      // Silently fail — user will see stale data
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // ─── Context Value ──────────────────────────────────────────────────────
  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    signInWithEmail,
    signInWithPhone,
    register,
    signOut: handleSignOut,
    sendOtp,
    verifyOtp,
    requestReset,
    verifyResetOtp: verifyResetOtpAction,
    completeReset,
    clearError,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
