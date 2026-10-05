import { useContext } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppContext } from '../../src/store/AppContext';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';

export default function LocationRoute() {
  const router = useRouter();
  const context = useContext(AppContext);

  return (
    <View className="flex-1 bg-white">
      <OnboardingScreen
        initialStep={2}
        onComplete={(_config) => {
          if (context) {
            context.setCurrentScreen('health_dashboard');
            context.showToast('Location and family setup complete! Welcome to Coordinator Home.');
          }
          router.replace('/(coordinator)');
        }}
      />
    </View>
  );
}
