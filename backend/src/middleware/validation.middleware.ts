import { Request, RequestHandler } from "express";
import { HttpError } from "../transaction";

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
export const sanitizeEmail = (email: string) => email.trim().toLowerCase();
export function sanitizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, "").trim();
  if (/^0\d{9}$/.test(cleaned)) return `+94${cleaned.slice(1)}`;
  if (/^94\d{9}$/.test(cleaned)) return `+${cleaned}`;
  return cleaned;
}
export function text(value: unknown, field: string, max = 255, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && !value.trim()) || value.length > max || /[\x00-\x1f\x7f<>]/.test(value)) {
    throw new HttpError(400, "Invalid " + field);
  }
  return value.trim();
}
export function optionalText(value: unknown, field: string, max = 255): string {
  return text(value ?? '', field, max, true);
}
export function emailValue(value: unknown): string {
  const email = sanitizeEmail(text(value, "email"));
  if (!/^[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(email)) throw new HttpError(400, "Invalid email format");
  return email;
}
export function phoneValue(value: unknown): string {
  const phone = sanitizePhone(text(value, "phone number", 40));
  if (!/^\+?[0-9]{9,15}$/.test(phone)) throw new HttpError(400, "Invalid phone number format");
  return phone;
}
export function positiveId(value: unknown): number {
  if ((typeof value !== "string" && typeof value !== "number") || !/^[1-9]\d*$/.test(String(value))) throw new HttpError(400, "Invalid ID");
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id > 2147483647) throw new HttpError(400, "Invalid ID");
  return id;
}
export function documentValue(value: unknown): string {
  const document = text(value, "document URL", 2048);
  if (/^\/api\/documents\/[a-f0-9-]{36}$/i.test(document)) return document;
  if (/^uploads\/[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9]+)?$/.test(document)) return document;
  try {
    const url = new URL(document);
    if (url.protocol === "https:" && !url.username && !url.password) return document;
  } catch { /* Invalid URL. */ }
  throw new HttpError(400, "Document must be an HTTPS URL or upload reference");
}
export function validatePasswordStrength(password: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (typeof password !== "string") return { valid: false, errors: ["Password is required"] };
  if (password.length < 8 || password.length > 128) errors.push("Password must be 8 to 128 characters");
  if (!/[A-Z]/.test(password)) errors.push("Include an uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("Include a lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("Include a number");
  if (!/[^a-zA-Z0-9\s]/.test(password)) errors.push("Include a special character");
  return { valid: errors.length === 0, errors };
}
function passwordValue(value: unknown): string {
  const result = validatePasswordStrength(value);
  if (!result.valid) throw new HttpError(400, result.errors.join(". "));
  return value as string;
}
export function opaqueToken(value: unknown, field = "token"): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new HttpError(400, "Invalid " + field);
  return value;
}
function validate(work: (req: Request) => void): RequestHandler {
  return (req, res, next) => {
    try { work(req); next(); } catch (error) { next(error); }
  };
}
export const validateJsonBody: RequestHandler = (req, res, next) => {
  // Match Express's default case-insensitive, optional-trailing-slash routing.
  if (req.method === 'POST' && /^\/api\/donors\/me\/verification-documents\/?$/i.test(req.path) && req.is('multipart/form-data')) return next();
  if (["POST", "PUT", "PATCH"].includes(req.method) && (!req.body || typeof req.body !== "object" || Array.isArray(req.body))) {
    return res.status(400).json({ error: "A JSON object is required" });
  }
  next();
};
export const validateLoginInput = validate(req => {
  let { email, phone, identifier, password } = req.body;
  if (typeof password !== "string" || password.length < 1 || password.length > 128) throw new HttpError(400, "Invalid password");
  if (identifier !== undefined) {
    const input = text(identifier, "identifier");
    if (!email && !phone) { if (input.includes("@")) email = input; else phone = input; }
  }
  if (email && phone) throw new HttpError(400, "Provide either email or phone");
  if (email) req.body.email = emailValue(email);
  else req.body.phone = phoneValue(phone);
});
export const validateRegistrationInput = validate(req => {
  req.body.email = emailValue(req.body.email);
  req.body.password = passwordValue(req.body.password);
  req.body.fullName = text(req.body.fullName, "full name");
  req.body.phone = phoneValue(req.body.phone);
  req.body.nic = text(req.body.nic, "NIC", 20).toUpperCase();
  if (!/^(?:\d{9}[VX]|\d{12})$/.test(req.body.nic)) throw new HttpError(400, "Invalid NIC number format");
  if (!BLOOD_GROUPS.includes(req.body.bloodGroup)) throw new HttpError(400, "Invalid blood group");
  req.body.registrationToken = opaqueToken(req.body.registrationToken, "registration token");
  if (req.body.dob !== undefined && req.body.dob !== "" && req.body.dob !== null) {
    const dob = text(req.body.dob, "date of birth", 10);
    const date = new Date(dob + "T00:00:00Z");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dob) throw new HttpError(400, "Date of birth must be a valid YYYY-MM-DD date");
    const cutoff = new Date();
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 16);
    if (date > cutoff) throw new HttpError(400, "Donors must be at least 16 years old");
  }
  if (req.body.documentUrl != null) req.body.documentUrl = documentValue(req.body.documentUrl);
});
export const validateForgotPasswordInput = validate(req => { req.body.email = emailValue(req.body.email); });
export const validateSendOtpInput = validate(req => {
  if (!["email", "phone"].includes(req.body.type)) throw new HttpError(400, "Type must be email or phone");
  req.body.identifier = req.body.type === "email" ? emailValue(req.body.identifier) : phoneValue(req.body.identifier);
});
export const validateOtpInput = validate(req => {
  if (typeof req.body.otp !== "string" || !/^\d{6}$/.test(req.body.otp)) throw new HttpError(400, "OTP must be a 6-digit number");
  if (req.path === "/verify-reset-otp") req.body.email = emailValue(req.body.email);
  else {
    if (!["email", "phone"].includes(req.body.type)) throw new HttpError(400, "Invalid verification type");
    req.body.identifier = req.body.type === "email" ? emailValue(req.body.identifier) : phoneValue(req.body.identifier);
  }
});
export const validateResetPasswordInput = validate(req => {
  req.body.password = passwordValue(req.body.password ?? req.body.newPassword);
  if (req.body.confirmPassword !== undefined && req.body.password !== req.body.confirmPassword) throw new HttpError(400, "Passwords do not match");
  // Database IDs deliberately provide no authorization.
  req.body.resetToken = opaqueToken(req.body.resetToken, "reset token");
  if (req.body.email !== undefined) req.body.email = emailValue(req.body.email);
});
export const validateTokenInput = validate(req => {
  const token = req.body.refreshToken;
  if (typeof token !== "string" || token.length < 1 || token.length > 4096) throw new HttpError(400, "Refresh token is required");
});
export const validateStaffInput = validate(req => {
  req.body.email = emailValue(req.body.email);
  req.body.password = passwordValue(req.body.password);
  req.body.organizationId = positiveId(req.body.organizationId);
  if (!["hospital_staff", "bloodbank_staff"].includes(req.body.role)) throw new HttpError(400, "Invalid staff role");
});
export const validateOrganizationInput = validate(req => {
  req.body.name = text(req.body.name, "organization name");
  if (!["hospital", "bloodbank"].includes(req.body.type)) throw new HttpError(400, "Invalid organization type");
  if (req.body.registrationEvidenceUrl != null) req.body.registrationEvidenceUrl = documentValue(req.body.registrationEvidenceUrl);
});
export const validateVerificationInput = validate(req => {
  req.body.documentUrl = documentValue(req.body.documentUrl);
  if (!BLOOD_GROUPS.includes(req.body.claimedBloodGroup)) throw new HttpError(400, "Invalid blood group");
});
export const validateReviewInput = validate(req => {
  if (req.body.reason != null) req.body.reason = text(req.body.reason, "reason", 2000);
});
export const validateRouteIds = validate(req => { for (const value of Object.values(req.params)) positiveId(value); });
export const validateAdminQuery = validate(req => {
  const { role, status, action, limit } = req.query;
  if (role !== undefined && !["admin", "donor", "hospital_staff", "bloodbank_staff"].includes(role as string)) throw new HttpError(400, "Invalid role filter");
  if (status !== undefined && !["active", "suspended"].includes(status as string)) throw new HttpError(400, "Invalid status filter");
  if (action !== undefined) text(action, "action", 100);
  if (limit !== undefined && positiveId(limit) > 100) throw new HttpError(400, "Limit must be between 1 and 100");
});

export const DISTRICTS = ["Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha", "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya", "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"];
export const validateNetworkOrganization = validate(req => {
  req.body.name = text(req.body.name, "institution name");
  if (req.method === "POST" && !["hospital", "bloodbank"].includes(req.body.type)) throw new HttpError(400, "Invalid institution type");
  for (const [key, max] of [["district", 50], ["address", 2000]] as const) {
    req.body[key] = req.body[key] == null || req.body[key] === "" ? null : text(req.body[key], key, max);
  }
  if (req.body.district && !DISTRICTS.includes(req.body.district)) throw new HttpError(400, "Invalid district");
  req.body.contactPhone = req.body.contactPhone ? phoneValue(req.body.contactPhone) : null;
  req.body.contactEmail = req.body.contactEmail ? emailValue(req.body.contactEmail) : null;
  req.body.registrationEvidenceUrl = req.body.registrationEvidenceUrl ? documentValue(req.body.registrationEvidenceUrl) : null;
  for (const [key, limit] of [["latitude", 90], ["longitude", 180]] as const) {
    const value = req.body[key];
    if (value == null || value === "") req.body[key] = null;
    else {
      if (!["string", "number"].includes(typeof value) || (typeof value === "string" && !value.trim())) throw new HttpError(400, "Invalid " + key);
      const coordinate = Number(value);
      if (!Number.isFinite(coordinate) || Math.abs(coordinate) > limit) throw new HttpError(400, "Invalid " + key);
      req.body[key] = coordinate;
    }
  }
  if ((req.body.latitude === null) !== (req.body.longitude === null)) throw new HttpError(400, "Provide both latitude and longitude");
  req.body.branchName = req.body.branchName ? text(req.body.branchName, "branch name", 100) : null;
  req.body.parentOrganizationId = req.body.parentOrganizationId ? positiveId(req.body.parentOrganizationId) : null;
  if (req.body.parentOrganizationId && !req.body.branchName) throw new HttpError(400, "Provide a branch name");
});
export const validateBankAccount = validate(req => {
  req.body.accountEmail = emailValue(req.body.accountEmail);
  req.body.password = passwordValue(req.body.password);
});
export const validateBankAccountSelection = validate(req => {
  req.body.accountId = positiveId(req.body.accountId);
});
export const validateBankOnboarding = validate(req => {
  if (req.body.type !== "bloodbank") throw new HttpError(400, "A blood bank is required");
  if (!req.body.district || !req.body.address || req.body.latitude == null || req.body.longitude == null) throw new HttpError(400, "District, address and map location are required");
});
export const validateChangePassword = validate(req => {
  if (typeof req.body.currentPassword !== "string" || !req.body.currentPassword || req.body.currentPassword.length > 128) throw new HttpError(400, "Current password is required");
  req.body.password = passwordValue(req.body.password);
  if (req.body.password !== req.body.confirmPassword) throw new HttpError(400, "Passwords do not match");
  if (req.body.password === req.body.currentPassword) throw new HttpError(400, "Choose a different password");
});
export const validateOrganizationAccess = validate(req => {
  if (typeof req.body.isActive !== "boolean") throw new HttpError(400, "isActive must be a boolean");
});
