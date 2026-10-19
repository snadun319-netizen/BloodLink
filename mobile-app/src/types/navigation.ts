export type ScreenName =
  | 'Splash'
  | 'Welcome'
  | 'Onboarding'
  | 'CreateAccountStep1'
  | 'CreateAccountStep2'
  | 'CreateAccountStep3'
  | 'CreateAccountStep4'
  | 'RegisteredSuccess'
  | 'Login'
  | 'ResetPasswordStep1'
  | 'ResetPasswordStep2'
  | 'ResetPasswordStep3'
  | 'Profile'
  | 'Home'
  | 'History'
  | 'Requests';

export interface RegistrationData {
  fullName: string;
  phone: string;
  dob: string;
  nic: string;
  bloodGroup: string;
  otp: string;
  email?: string;
  registrationToken?: string;
  registrationOtpSentAt?: number;
  registrationVerifiedAt?: number;
  documentName?: string;
}
