import api, { ApiClientError } from "./api";

/**
 * BloodLink Auth Service
 *
 * All authentication-related API calls for the mobile app.
 * Maps 1:1 to backend POST /api/auth/* endpoints.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  role: string;
  organizationId?: number | null;
  status: string;
  fullName?: string;
  bloodGroup?: string;
  phone?: string;
  nic?: string;
  dateOfBirth?: string;
  isAvailable?: boolean;
  verificationStatus?: string;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface RegisterResponse extends AuthTokens {
  message: string;
  user: User;
}

export interface RegisterData {
  registrationToken: string;
  email: string;
  password: string;
  fullName: string;
  phone: string;
  nic: string;
  bloodGroup: string;
  dob?: string;
  documentUrl?: string;
}

// ─── Auth API Calls ─────────────────────────────────────────────────────────

/**
 * Register a new donor account
 */
export async function registerDonor(
  data: RegisterData
): Promise<RegisterResponse> {
  const response = await api.post<RegisterResponse>("/auth/register", data);
  return response.data;
}

/**
 * Login with email + password
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>("/auth/login", {
    email,
    password,
  });
  return response.data;
}

/**
 * Login with phone number + password
 */
export async function loginWithPhone(
  phone: string,
  password: string
): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>("/auth/login", {
    phone,
    password,
  });
  return response.data;
}

/**
 * Refresh access token
 */
export async function refreshTokens(
  refreshToken: string
): Promise<AuthTokens> {
  const response = await api.post<AuthTokens & { user: User }>(
    "/auth/refresh",
    { refreshToken }
  );
  return {
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  };
}

/**
 * Logout (invalidate refresh token)
 */
export async function logout(refreshToken: string): Promise<void> {
  await api.post("/auth/logout", { refreshToken });
}

/**
 * Get authenticated user's profile
 */
export async function getMe(): Promise<User> {
  const response = await api.authGet<{ user: User }>("/auth/me");
  return response.data.user;
}

// ─── Registration OTP ───────────────────────────────────────────────────────

/**
 * Send OTP for registration verification
 */
export async function sendRegistrationOtp(
  identifier: string,
  type: "email" | "phone"
): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(
    "/auth/send-otp",
    { identifier, type }
  );
  return response.data;
}

/**
 * Verify OTP during registration
 */
export async function verifyRegistrationOtp(
  identifier: string,
  type: "email" | "phone",
  otp: string
): Promise<{ verified: boolean; registrationToken: string }> {
  const response = await api.post<{ message: string; verified: boolean; registrationToken: string }>(
    "/auth/verify-otp",
    { identifier, type, otp }
  );
  return { verified: response.data.verified, registrationToken: response.data.registrationToken };
}

// ─── Forgot Password ────────────────────────────────────────────────────────

/**
 * Request password reset OTP
 */
export async function requestPasswordReset(
  email: string
): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(
    "/auth/forgot-password",
    { email }
  );
  return response.data;
}

/**
 * Verify password reset OTP
 */
export async function verifyPasswordResetOtp(
  email: string,
  otp: string
): Promise<{ resetToken: string }> {
  const response = await api.post<{
    message: string;
    resetToken: string;
  }>("/auth/verify-reset-otp", { email, otp });
  return { resetToken: response.data.resetToken };
}

/**
 * Reset password with verified reset token
 */
export async function resetPassword(
  email: string,
  password: string,
  confirmPassword: string,
  resetToken: string
): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(
    "/auth/reset-password",
    {
      email,
      password,
      confirmPassword,
      resetToken,
    }
  );
  return response.data;
}

export { ApiClientError };
