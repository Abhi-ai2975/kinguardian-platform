import { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Switch } from 'react-native';
import { AppContext } from '../../src/store/AppContext';
import { ParentBottomNavBar } from '../../src/components/Navigation';
import { DeviceFrame } from '../../src/components/DeviceFrame';
import { SimulatorControls } from '../../src/components/SimulatorControls';
import { useRouter } from 'expo-router';
import {
  User,
  PhoneCall,
  Globe,
  KeyRound,
  Users,
  Stethoscope,
  HeartHandshake,
  Shield,
  X,
  ChevronRight,
  LogOut
} from 'lucide-react-native';
import { authService } from '../../src/services/auth/authService';
import { confirmAction } from '../../src/utils/alert';

export default function ParentProfileRoute() {
  const context = useContext(AppContext);
  const router = useRouter();
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const coordName = context?.coordinatorName || 'Coordinator';

  const handleLogout = async () => {
    try {
      console.log('Starting logout process...');
      await authService.logout();
      console.log('Session cleared, navigating to sign-in...');
      if (context) {
        context.setCurrentScreen('onboarding');
      }
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.error('Logout error:', error);
      if (context) {
        context.setCurrentScreen('onboarding');
      }
      router.replace('/(auth)/sign-in');
    }
  };

  if (!context) return null;

  const profileOptions = [
    {
      title: 'My information',
      description: `${context.currentUser?.name || 'User'} · Age ${context.currentUser?.age || 68} · ${context.currentUser?.location || 'India'}`,
      icon: User,
      color: '#ff9500',
      bgColor: '#fff9e6'
    },
    {
      title: 'My doctors',
      description: 'Dr. Sharma · Cardiology · Apollo Hospital',
      icon: Stethoscope,
      color: '#34c759',
      bgColor: '#eefdf4'
    },
    {
      title: 'My family',
      description: `${coordName} · Care Circle`,
      icon: Users,
      color: '#007aff',
      bgColor: '#eff6ff'
    },
    {
      title: 'Privacy settings',
      description: context.consentApproved
        ? 'Active consent sharing enabled'
        : 'Access paused (Telemetry blocked)',
      icon: KeyRound,
      color: '#af52de',
      bgColor: '#fbf5ff'
    },
    {
      title: 'Language',
      description: 'English (US) · Tamil (தமிழ்)',
      icon: Globe,
      color: '#007aff',
      bgColor: '#eff6ff'
    },
    {
      title: 'Help & support',
      description: `Contact ${coordName} or your care team`,
      icon: PhoneCall,
      color: '#ff3b30',
      bgColor: '#fff5f5'
    }
  ];

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-[#f2f2f7]">
        {/* Header */}
        <View className="bg-white pt-6 pb-5 px-6 border-b border-neutral-100 space-y-1">
          <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Settings Console
          </Text>
          <Text className="text-2xl font-bold text-neutral-900 tracking-tight">My Profile</Text>
        </View>

        <ScrollView className="flex-1 p-5 space-y-5">
          {/* Options List Inset Grouped */}
          <View className="bg-white border border-neutral-100 rounded-2xl shadow-sm divide-y divide-neutral-200/80 overflow-hidden">
            {profileOptions.map((opt, idx) => {
              const IconComponent = opt.icon;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    if (opt.title.includes('Privacy')) {
                      setShowPrivacyModal(true);
                    } else if (opt.title.toLowerCase().includes('family')) {
                      router.push('/(parent)/family');
                    } else {
                      context.showToast(`Opening ${opt.title}...`);
                    }
                  }}
                  className="p-4 flex-row items-center justify-between active:bg-neutral-55"
                >
                  <View className="flex-row items-center gap-4">
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center shrink-0"
                      style={{ backgroundColor: opt.bgColor }}
                    >
                      <IconComponent size={18} color={opt.color} />
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-neutral-800 leading-tight">
                        {opt.title}
                      </Text>
                      <Text className="text-xs text-neutral-400 font-semibold mt-1 leading-snug">
                        {opt.description}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={14} color="#8e8e93" />
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={() => {
              confirmAction(
                'Log Out',
                'Are you sure you want to log out of your account?',
                handleLogout,
                'Log Out'
              );
            }}
            className="p-4 rounded-2xl border border-red-100 bg-white flex-row items-center justify-center gap-2 active:bg-red-50"
          >
            <LogOut size={16} color="#ff3b30" />
            <Text className="text-xs font-bold text-[#ff3b30]">Log out</Text>
          </TouchableOpacity>

          {/* Simple Swapper CTA */}
          <View className="bg-white border border-neutral-100 rounded-2xl p-5 space-y-3 shadow-sm">
            <View className="flex-row items-center gap-2">
              <HeartHandshake size={18} color="#007aff" />
              <Text className="text-sm font-bold text-neutral-900">Switch Views</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                context.setAppMode('coordinator');
                context.showToast(`Switched view to ${coordName} (Coordinator Mode)`);
                router.replace('/(coordinator)');
              }}
              className="w-full bg-[#007aff] py-3.5 rounded-xl items-center justify-center active:opacity-95 shadow-xs"
            >
              <Text className="text-white text-xs font-bold">Switch to {coordName}'s View</Text>
            </TouchableOpacity>
          </View>

          <View className="h-28" />
        </ScrollView>

        <ParentBottomNavBar
          activeTab="profile"
          onTabChange={(tab) => {
            if (tab === 'home') router.push('/(parent)');
            else if (tab === 'medicines') router.push('/(parent)/medicines');
            else if (tab === 'ask') router.push('/(parent)/ask');
          }}
        />
      </View>

      {/* Explicit Privacy & Consent Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[28px] max-h-[85%] p-6 pt-3 space-y-4 shadow-xl">
            {/* iOS Grabber Handle */}
            <View className="w-10 h-1.5 bg-neutral-200 rounded-full self-center mb-1.5" />

            {/* Header */}
            <View className="flex-row justify-between items-center pb-2 border-b border-neutral-100">
              <View className="flex-row items-center gap-2">
                <Shield size={18} color="#af52de" />
                <Text className="text-lg font-bold text-neutral-900 tracking-tight">
                  Privacy &amp; Access
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPrivacyModal(false)}
                className="p-1.5 bg-neutral-100 rounded-full"
              >
                <X size={16} color="#8e8e93" />
              </TouchableOpacity>
            </View>

            <ScrollView className="space-y-4">
              {/* Permissions Explanation */}
              <View className="bg-neutral-50 border border-neutral-200/50 p-4 rounded-2xl space-y-2">
                <Text className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                  Simple permissions explanation
                </Text>
                <Text className="text-xs text-neutral-500 font-semibold leading-relaxed">
                  Sharing lets {coordName} look out for your health, and allows your family circle to stay
                  coordinated with your daily medication logs and vitals. We encrypt all documents and
                  telemetry. You are always in control of who sees what.
                </Text>
              </View>

              {/* Explicit Toggle */}
              <View className="border border-neutral-100 bg-neutral-50 rounded-2xl p-4.5 flex-row justify-between items-center">
                <View className="flex-1 pr-4 space-y-1">
                  <Text className="text-sm font-bold text-neutral-800">Consent Status</Text>
                  <Text className="text-xs text-neutral-400 font-semibold leading-snug">
                    I consent to sharing my daily vitals and check-in logs with my Care circle
                  </Text>
                </View>
                <Switch
                  value={context.consentApproved}
                  onValueChange={(val) => {
                    context.handleSetConsentApproved?.(val) ?? context.setConsentApproved(val);
                  }}
                  trackColor={{ false: '#d1d1d6', true: '#34c759' }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Access Levels Matrix */}
              <View className="space-y-3 pt-2">
                <Text className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                  Active Access List
                </Text>

                {/* Coordinator */}
                <View className="bg-white border border-neutral-100 rounded-xl p-4 flex-row justify-between items-center">
                  <View className="space-y-0.5">
                    <Text className="text-xs font-bold text-neutral-800">{coordName} (Coordinator)</Text>
                    <Text className="text-[10px] text-neutral-400 font-semibold">
                      Primary Coordinator
                    </Text>
                  </View>
                  <View className="bg-blue-50 px-3 py-1 rounded-full">
                    <Text className="text-[10px] font-bold text-[#007aff] uppercase">
                      Full Access
                    </Text>
                  </View>
                </View>

                {/* Other members dynamically */}
                {context.people && context.people.filter(p => p.name !== coordName && p.name !== context.currentUser?.name).map((person) => (
                  <View key={person.id} className="bg-white border border-neutral-100 rounded-xl p-4 flex-row justify-between items-center">
                    <View className="space-y-0.5">
                      <Text className="text-xs font-bold text-neutral-800">{person.name} ({person.relationship || person.role || 'Member'})</Text>
                      <Text className="text-[10px] text-neutral-400 font-semibold">
                        Care Circle · {person.location || 'Connected'}
                      </Text>
                    </View>
                    <View className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                      <Text className="text-[10px] font-bold text-[#34c759] uppercase">
                        Care + Summary
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => setShowPrivacyModal(false)}
                className="w-full bg-[#007aff] py-3.5 rounded-xl items-center justify-center mt-3 active:opacity-90"
              >
                <Text className="text-white text-xs font-bold">Close Permissions</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <SimulatorControls
        onTriggerNotification={context.handleTriggerSimulation}
        onRefreshData={context.handleWearableSyncRefresh}
        isSyncing={context.isSyncing}
        currentLoopStep={context.currentLoopStep}
        onAdvanceLoop={context.handleAdvanceLoop}
        onResetLoop={context.handleResetLoop}
      />
    </DeviceFrame>
  );
}
