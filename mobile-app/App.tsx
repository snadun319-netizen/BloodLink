import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DonorTab } from './src/components/DonorBottomNav';


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
import { HomeScreen } from './src/screens/HomeScreen';
import { DevScreenPicker } from './src/components/DevScreenPicker';
import { ScreenName, RegistrationData } from './src/types/navigation';
import ProfileFlow from './src/profile/ProfileFlow';
import { AuthProvider } from './src/context/AuthContext';
import HistoryFlow from './src/history/HistoryFlow';
import RequestsFlow from './src/requests/RequestsFlow';
import NotificationsFlow from './src/notifications/NotificationsFlow';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('Splash');
  const [homeTab, setHomeTab] = useState<DonorTab>('Home');
  const [isNewAccount, setIsNewAccount] = useState(true);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState<string | undefined>(undefined);

  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    nic: '',
    bloodGroup: '',
    otp: '',
    documentName: '',
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
              setRegistrationData((prev) => ({
                ...prev,
                ...step1Data,
                ...(prev.email !== step1Data.email || prev.phone !== step1Data.phone ? {
                  registrationToken: undefined,
                  registrationOtpSentAt: undefined,
                  registrationVerifiedAt: undefined,
                } : {}),
              }));
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
            onContinue={(registrationToken, email) => {
              setRegistrationData((prev) => ({
                ...prev,
                registrationToken,
                email,
                registrationVerifiedAt: prev.registrationToken === registrationToken ? prev.registrationVerifiedAt : Date.now(),
              }));
              setCurrentScreen('CreateAccountStep4');
            }}
            onSignIn={() => setCurrentScreen('Login')}
            email={registrationData.email || ''}
            phone={registrationData.phone}
            initialSentAt={registrationData.registrationOtpSentAt}
            initialToken={registrationData.registrationToken}
            initialVerifiedAt={registrationData.registrationVerifiedAt}
            onCodeSent={(sentAt) => setRegistrationData((prev) => ({
              ...prev,
              registrationOtpSentAt: sentAt,
              registrationToken: undefined,
              registrationVerifiedAt: undefined,
            }))}
          />
        );

      case 'CreateAccountStep4':
        return (
          <CreateAccountStep4Screen
            onBack={() => setCurrentScreen('CreateAccountStep3')}
            onSubmit={(docName) => {
              setIsNewAccount(true);
              setRegistrationData((prev) => ({ ...prev, documentName: docName }));
              setCurrentScreen('RegisteredSuccess');
            }}
            onSignIn={() => setCurrentScreen('Login')}
            bloodGroup={registrationData.bloodGroup}
            registrationData={registrationData}
          />
        );

      case 'RegisteredSuccess':
        return (
          <RegisteredSuccessScreen
            onGoToDashboard={() => setCurrentScreen('Home')}
            bloodGroup={registrationData.bloodGroup}
            isNewAccount={isNewAccount}
          />
        );

      case 'Login':
        return (
          <LoginScreen
            onBack={() => setCurrentScreen('Welcome')}
            onSignIn={(_method, _creds) => {
              setIsNewAccount(false);
              setCurrentScreen('Home');
            }}
            onForgotPassword={() => { setResetToken(undefined); setCurrentScreen('ResetPasswordStep1'); }}
            onRegister={() => setCurrentScreen('Onboarding')}
          />
        );

      case 'Home':
        return (
          <HomeScreen
            initialTab={homeTab}
            onNavigateToRequests={() => setCurrentScreen('Requests')}
            onNavigateToHistory={() => setCurrentScreen('History')}
            onNavigateToProfile={() => setCurrentScreen('Profile')}
            onLogout={() => { setHomeTab('Home'); setCurrentScreen('Login'); }}
          />
        );
      //ISURI-BLOOD REQUEST PAGE
      case 'Requests':
        return (
          <RequestsFlow
            onBack={() => { setHomeTab('Home'); setCurrentScreen('Home'); }}
            onNavigateTab={(tab) => {
              setHomeTab(tab);
              if (tab === 'Home') setCurrentScreen('Home');
              else if (tab === 'Profile') setCurrentScreen('Profile');
              else if (tab === 'History') setCurrentScreen('History');
              else if (tab === 'Requests') setCurrentScreen('Requests');
            }}
            onNavigateToProfile={() => setCurrentScreen('Profile')}
          />
        );
      //ISURI-END
      case 'ResetPasswordStep1':
        return (
          <ResetPasswordStep1Screen
            onBack={() => setCurrentScreen('Login')}
            onSendResetLink={(email) => {
              setResetToken(undefined);
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
            onVerify={(_otp, tokenId) => {
              if (!tokenId) return;
              setResetToken(tokenId);
              setCurrentScreen('ResetPasswordStep3');
            }}
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
            email={resetEmail}
            resetToken={resetToken}
          />
        );

      case 'Profile':
        return (
          <ProfileFlow
            onBack={() => { setHomeTab('Home'); setCurrentScreen('Home'); }}
            onNavigateTab={(tab) => {
              setHomeTab(tab);
              if (tab === 'Home') setCurrentScreen('Home');
              else if (tab === 'Requests') setCurrentScreen('Requests');
              else if (tab === 'History') setCurrentScreen('History');
              else if (tab === 'Profile') setCurrentScreen('Profile');
            }}
            onSignOut={() => { setHomeTab('Home'); setCurrentScreen('Welcome'); }}
          />
        );

      case 'History':
        return <HistoryFlow />;

      case 'Notifications':
        return <NotificationsFlow onBack={() => setCurrentScreen('Home')} />;

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
    <SafeAreaProvider>
      <AuthProvider>
        <View style={styles.container}>
          <StatusBar style={isLightBackground ? 'dark' : 'light'} />
          {renderScreen()}

          {/* Floating Screen Switcher for Testing and Review */}
          {__DEV__ && process.env.EXPO_PUBLIC_SHOW_SCREEN_PICKER !== 'false' && <DevScreenPicker
            currentScreen={currentScreen}
            onSelectScreen={(screen) => setCurrentScreen(screen)}
          />}
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
