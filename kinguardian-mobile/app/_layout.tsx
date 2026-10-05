import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';
import { AppProvider } from '../src/store/AppProvider';
import { authService } from '../src/services/auth/authService';

LogBox.ignoreLogs([
  'Cannot connect to Expo CLI',
  "The package 'react-native-health-connect' doesn't seem to be linked",
  'VirtualizedLists should never be nested'
]);

export const unstable_settings = {
  initialRouteName: '(auth)'
};

function AuthSessionWatcher() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = authService.onAuthChange((session) => {
      if (!session) {
        router.replace('/(auth)/sign-in');
      }
    });
    return () => unsubscribe();
  }, [router]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <AuthSessionWatcher />
        <Stack screenOptions={{ headerShown: false }} />
      </AppProvider>
    </SafeAreaProvider>
  );
}
