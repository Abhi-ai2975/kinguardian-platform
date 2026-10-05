import { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheck, ArrowRight, Users, MapPin, Watch } from 'lucide-react-native';
import { AppContext } from '../../src/store/AppContext';
import { realDataService } from '../../src/services/api-client/RealDataService';

export default function CompleteRoute() {
  const router = useRouter();
  const context = useContext(AppContext);
  const [loading, setLoading] = useState(false);

  const handleEnterHome = async () => {
    setLoading(true);
    try {
      // Establish family context on the backend
      await realDataService.completeCoordinatorOnboarding({
        location: 'UK',
        timezone: 'Europe/London',
        family_name: 'Sharma Family Care Circle',
        parent: {
          name: 'Dad',
          relationship: 'Father',
          city: 'Chennai',
          age: 68
        }
      });

      if (context) {
        context.setFamilyName('Sharma Family Care Circle');
        context.setCurrentScreen('health_dashboard');
        context.showToast('Family context active! Welcome to Coordinator Home.');
      }
      router.replace('/(coordinator)');
    } catch (e) {
      console.warn('Completion error:', e);
      router.replace('/(coordinator)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      contentContainerStyle={{ flexGrow: 1 }}
      className="bg-gradient-to-b from-emerald-50 via-white to-blue-50 px-6 py-12 justify-center"
    >
      <View testID="coordinator-onboarding-complete" className="items-center space-y-6">
        {/* Animated / Glow Icon */}
        <View className="w-24 h-24 rounded-full bg-emerald-100 items-center justify-center shadow-md border-2 border-emerald-300">
          <ShieldCheck size={52} color="#10b981" />
        </View>

        <View className="space-y-2 items-center">
          <Text className="text-3xl font-black text-slate-900 tracking-tight text-center">
            You're Connected!
          </Text>
          <Text className="text-sm font-semibold text-slate-600 text-center px-4">
            Family care circle context has been established.
          </Text>
        </View>

        {/* Status checklist */}
        <View className="w-full bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4 my-2">
          <View className="flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center">
              <MapPin size={18} color="#007aff" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-800">Cross-Border Timezone Active</Text>
              <Text className="text-[11px] text-slate-500">London (BST) ⇄ Chennai (IST)</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-xl bg-emerald-50 items-center justify-center">
              <Users size={18} color="#10b981" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-800">Parent Setup & Care Circle</Text>
              <Text className="text-[11px] text-slate-500">Dad (Chennai, 68) linked to care subjects</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-xl bg-indigo-50 items-center justify-center">
              <Watch size={18} color="#6366f1" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-800">Wearable Health Sensors</Text>
              <Text className="text-[11px] text-slate-500">Health Connect / Google Fit ready</Text>
            </View>
          </View>
        </View>

        {/* Enter Coordinator Home CTA */}
        <TouchableOpacity
          testID="complete-enter-coordinator-home-button"
          onPress={handleEnterHome}
          disabled={loading}
          className="w-full bg-[#007aff] py-4 rounded-2xl items-center shadow-lg shadow-blue-200 active:scale-95 flex-row justify-center gap-2"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Text className="text-white font-bold text-base">Enter Coordinator Home</Text>
              <ArrowRight size={20} color="#ffffff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
