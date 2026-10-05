import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../src/store/AppContext';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { authService } from '../../src/services/auth/authService';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Shield, Users, ChevronRight, Sparkles } from 'lucide-react-native';

export default function WelcomeRoute() {
  const context = useContext(AppContext);
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    
    const checkAuth = async () => {
      try {
        const session = await authService.getStoredSession();
        if (session) {
          setIsAuthenticated(true);
          if (session.user.role === 'parent') {
            router.replace('/(parent)');
          } else {
            router.replace('/(coordinator)');
          }
        } else {
          setAuthChecked(true);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [router]);

  if (!context) return null;

  if (isAuthenticated) return null;

  if (authChecked && !showOnboarding) {
    return (
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        className="bg-gradient-to-b from-blue-50 via-white to-blue-50 px-6 py-8"
      >
        {/* Hero Section */}
        <View className="items-center mt-12 mb-8">
          <View className="w-20 h-20 rounded-full bg-[#eff6ff] items-center justify-center shadow-xs border border-blue-100 mb-3">
            <Text className="text-4xl">🛡️</Text>
          </View>
          <Text className="text-4xl font-bold text-neutral-900 mt-2 tracking-tight">
            KinGuardian
          </Text>
          <Text className="text-base text-neutral-500 text-center mt-3 leading-relaxed max-w-xs">
            Family healthcare coordination made simple
          </Text>
        </View>

        {/* Features */}
        <View className="space-y-4 mb-8">
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-blue-50 flex-row items-center">
            <View className="w-12 h-12 rounded-xl bg-blue-50 items-center justify-center mr-4">
              <Shield size={24} color="#007aff" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-neutral-900">Secure Family Care</Text>
              <Text className="text-xs text-neutral-500">Protected healthcare coordination</Text>
            </View>
          </View>

          <View className="bg-white rounded-2xl p-4 shadow-sm border border-blue-50 flex-row items-center">
            <View className="w-12 h-12 rounded-xl bg-emerald-50 items-center justify-center mr-4">
              <Users size={24} color="#10b981" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-neutral-900">Family Circle</Text>
              <Text className="text-xs text-neutral-500">Connect with your loved ones</Text>
            </View>
          </View>

          <View className="bg-white rounded-2xl p-4 shadow-sm border border-blue-50 flex-row items-center">
            <View className="w-12 h-12 rounded-xl bg-amber-50 items-center justify-center mr-4">
              <Sparkles size={24} color="#f59e0b" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-neutral-900">AI-Powered Insights</Text>
              <Text className="text-xs text-neutral-500">Smart health monitoring</Text>
            </View>
          </View>
        </View>

        {/* CTA Buttons */}
        <View className="space-y-3">
          <TouchableOpacity
            testID="welcome-get-started-button"
            onPress={() => setShowOnboarding(true)}
            className="bg-gradient-to-r from-blue-500 to-blue-600 py-4 rounded-2xl items-center shadow-lg shadow-blue-200"
          >
            <View className="flex-row items-center">
              <Text className="text-white font-bold text-base mr-2">Get Started</Text>
              <ChevronRight size={20} color="white" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            testID="welcome-sign-in-button"
            onPress={() => router.replace('/(auth)/sign-in')}
            className="bg-white border-2 border-blue-100 py-4 rounded-2xl items-center"
          >
            <Text className="text-blue-600 font-bold text-base">Sign In to Existing Account</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="mt-8 items-center">
          <Text className="text-xs text-neutral-400">Your family's health, simplified</Text>
        </View>
      </ScrollView>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingScreen
        onComplete={(_config) => {
          context.setCurrentScreen('health_dashboard');
          context.showToast('Onboarding complete! Welcome to Coordinator Home.');
          router.replace('/(coordinator)');
        }}
      />
    );
  }

  return null;
}
