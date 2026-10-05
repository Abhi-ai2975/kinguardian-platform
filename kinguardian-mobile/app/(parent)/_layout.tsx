import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { authService, AuthSession } from '../../src/services/auth/authService';

export default function ParentLayout() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const evaluate = (session: AuthSession | null) => {
      if (!isMounted) return;
      if (!session) {
        setAuthorized(false);
        router.replace('/(auth)/sign-in');
        return;
      }
      if (session.user.role === 'coordinator' || session.user.role === 'caregiver') {
        setAuthorized(false);
        router.replace('/(coordinator)');
        return;
      }
      setAuthorized(true);
    };

    const checkAccess = async () => {
      try {
        const session = await authService.getStoredSession();
        evaluate(session);
      } catch {
        if (isMounted) {
          setAuthorized(false);
          router.replace('/(auth)/sign-in');
        }
      }
    };

    checkAccess();
    const unsubscribe = authService.onAuthChange(evaluate);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [router]);

  if (authorized === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!authorized) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
