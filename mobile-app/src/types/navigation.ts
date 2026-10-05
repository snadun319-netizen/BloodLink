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
  | 'ResetPasswordStep3';

export interface RegistrationData {
  fullName: string;
  phone: string;
  countryCode: string;
  dob: string;
  nic: string;
  bloodGroup: string;
  otp: string;
  documentName?: string;
}
