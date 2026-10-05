import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Screen imports
import { SplashScreen } from './src/screens/SplashScreen';
import { WelcomeSelectionScreen } from './src/screens/WelcomeSelectionScreen';
import { OnboardingCarouselScreen } from './src/screens/OnboardingCarouselScreen';
import { CreateAccountStep1Screen } from './src/screens/CreateAccountStep1Screen';
import { CreateAccountStep2Screen } from './src/screens/CreateAccountStep2Screen';
import { CreateAccountStep3Screen } from './src/screens/CreateAccountStep3Screen';
import { CreateAccountStep4Screen } from './src/screens/CreateAccountStep4Screen';
import { RegisteredSuccessScreen } from './src/screens/RegisteredSuccessScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ResetPasswordStep1Screen } from './src/screens/ResetPasswordStep1Screen';
import { ResetPasswordStep2Screen } from './src/screens/ResetPasswordStep2Screen';
import { ResetPasswordStep3Screen } from './src/screens/ResetPasswordStep3Screen';
import { DevScreenPicker } from './src/components/DevScreenPicker';

import { ScreenName, RegistrationData } from './src/types/navigation';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('Splash');
  const [resetEmail, setResetEmail] = useState('you@email.com');

  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    fullName: 'Dileepa Sandaruwan',
    phone: '77 123 4567',
    countryCode: '+94',
    dob: '1998/05/12',
    nic: '981340821V',
    bloodGroup: 'A-',
    otp: '482159',
    documentName: 'blood_report_verification.pdf',
  });

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Splash':
        return (
          <SplashScreen
            onFinish={() => setCurrentScreen('Welcome')}
          />
        );

      case 'Welcome':
        return (
          <WelcomeSelectionScreen
            onGetStarted={() => setCurrentScreen('Onboarding')}
            onLogIn={() => setCurrentScreen('Login')}
          />
        );

      case 'Onboarding':
        return (
          <OnboardingCarouselScreen
            onComplete={() => setCurrentScreen('CreateAccountStep1')}
            onSignIn={() => setCurrentScreen('Login')}
          />
        );

      case 'CreateAccountStep1':
        return (
          <CreateAccountStep1Screen
            onBack={() => setCurrentScreen('Onboarding')}
            onContinue={(step1Data) => {
              setRegistrationData((prev) => ({ ...prev, ...step1Data }));
              setCurrentScreen('CreateAccountStep2');
            }}
            onSignIn={() => setCurrentScreen('Login')}
            initialData={registrationData}
          />
        );

      case 'CreateAccountStep2':
        return (
          <CreateAccountStep2Screen
            onBack={() => setCurrentScreen('CreateAccountStep1')}
            onContinue={(bloodGroup) => {
              setRegistrationData((prev) => ({ ...prev, bloodGroup }));
              setCurrentScreen('CreateAccountStep3');
            }}
            onSignIn={() => setCurrentScreen('Login')}
            initialBloodGroup={registrationData.bloodGroup}
          />
        );

      case 'CreateAccountStep3':
        return (
          <CreateAccountStep3Screen
            onBack={() => setCurrentScreen('CreateAccountStep2')}
            onContinue={(otp) => {
              setRegistrationData((prev) => ({ ...prev, otp }));
              setCurrentScreen('CreateAccountStep4');
            }}
            onSignIn={() => setCurrentScreen('Login')}
            phoneNumber={`${registrationData.countryCode} ${registrationData.phone}`}
          />
        );

      case 'CreateAccountStep4':
        return (
          <CreateAccountStep4Screen
            onBack={() => setCurrentScreen('CreateAccountStep3')}
            onSubmit={(docName) => {
              setRegistrationData((prev) => ({ ...prev, documentName: docName }));
              setCurrentScreen('RegisteredSuccess');
            }}
            onSignIn={() => setCurrentScreen('Login')}
            bloodGroup={registrationData.bloodGroup}
          />
        );

      case 'RegisteredSuccess':
        return (
          <RegisteredSuccessScreen
            onGoToDashboard={() => setCurrentScreen('Welcome')}
            bloodGroup={registrationData.bloodGroup}
          />
        );

      case 'Login':
        return (
          <LoginScreen
            onBack={() => setCurrentScreen('Welcome')}
            onSignIn={(_method, _creds) => {
              // Navigate to dashboard/welcome
              setCurrentScreen('RegisteredSuccess');
            }}
            onForgotPassword={() => setCurrentScreen('ResetPasswordStep1')}
            onRegister={() => setCurrentScreen('Onboarding')}
          />
        );

      case 'ResetPasswordStep1':
        return (
          <ResetPasswordStep1Screen
            onBack={() => setCurrentScreen('Login')}
            onSendResetLink={(email) => {
              setResetEmail(email);
              setCurrentScreen('ResetPasswordStep2');
            }}
            onSignIn={() => setCurrentScreen('Login')}
          />
        );

      case 'ResetPasswordStep2':
        return (
          <ResetPasswordStep2Screen
            onBack={() => setCurrentScreen('ResetPasswordStep1')}
            onVerify={(_otp) => setCurrentScreen('ResetPasswordStep3')}
            onChangeEmail={() => setCurrentScreen('ResetPasswordStep1')}
            email={resetEmail}
          />
        );

      case 'ResetPasswordStep3':
        return (
          <ResetPasswordStep3Screen
            onBack={() => setCurrentScreen('ResetPasswordStep2')}
            onResetComplete={() => setCurrentScreen('Login')}
            onSignIn={() => setCurrentScreen('Login')}
          />
        );

      default:
        return (
          <WelcomeSelectionScreen
            onGetStarted={() => setCurrentScreen('Onboarding')}
            onLogIn={() => setCurrentScreen('Login')}
          />
        );
    }
  };

  const isLightBackground =
    currentScreen !== 'Splash' &&
    currentScreen !== 'Welcome' &&
    currentScreen !== 'Login';

  return (
    <View style={styles.container}>
      <StatusBar style={isLightBackground ? 'dark' : 'light'} />
      {renderScreen()}

      {/* Floating Screen Switcher for Testing and Review */}
      <DevScreenPicker
        currentScreen={currentScreen}
        onSelectScreen={(screen) => setCurrentScreen(screen)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
