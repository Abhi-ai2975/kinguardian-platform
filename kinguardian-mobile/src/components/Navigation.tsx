import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Home, Users, Sparkles, Activity, User, Pill, Mic } from 'lucide-react-native';
import { ActiveTab, ScreenView } from '../types';

interface NavigationProps {
  activeTab: ActiveTab;
  currentScreen: ScreenView;
  onTabChange: (tab: ActiveTab) => void;
  onOpenQuickActions: () => void;
  onOpenAskAI: () => void;
}

export const BottomNavBar: React.FC<NavigationProps> = ({
  activeTab,
  currentScreen,
  onTabChange,
  onOpenAskAI
}) => {
  if (currentScreen === 'onboarding') return null;

  return (
    <View className="absolute bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-neutral-200/80 flex-row justify-around items-end py-1.5 px-3 shadow-sm">
      {/* Tab 1: Home */}
      <TouchableOpacity
        onPress={() => onTabChange('home')}
        className="items-center justify-center py-1.5 w-14"
      >
        <Home size={20} color={activeTab === 'home' ? '#007aff' : '#8e8e93'} />
        <Text
          className={`text-[9px] font-semibold mt-1 ${
            activeTab === 'home' ? 'text-[#007aff]' : 'text-[#8e8e93]'
          }`}
        >
          Home
        </Text>
      </TouchableOpacity>

      {/* Tab 2: Parents */}
      <TouchableOpacity
        onPress={() => onTabChange('parents')}
        className="items-center justify-center py-1.5 w-14"
      >
        <Users size={20} color={activeTab === 'parents' ? '#007aff' : '#8e8e93'} />
        <Text
          className={`text-[9px] font-semibold mt-1 ${
            activeTab === 'parents' ? 'text-[#007aff]' : 'text-[#8e8e93]'
          }`}
        >
          Parents
        </Text>
      </TouchableOpacity>

      {/* Tab 3: Ask AI (Center Action Button) */}
      <TouchableOpacity onPress={onOpenAskAI} className="items-center justify-center w-15 -top-3">
        <View className="w-12 h-12 rounded-full bg-[#007aff] items-center justify-center shadow-md border-4 border-white active:scale-95">
          <Sparkles size={20} color="#ffffff" />
        </View>
        <Text className="text-[9px] font-semibold text-[#007aff] mt-0.5">Ask AI</Text>
      </TouchableOpacity>

      {/* Tab 4: Care */}
      <TouchableOpacity
        onPress={() => onTabChange('care')}
        className="items-center justify-center py-1.5 w-14"
      >
        <Activity size={20} color={activeTab === 'care' ? '#007aff' : '#8e8e93'} />
        <Text
          className={`text-[9px] font-semibold mt-1 ${
            activeTab === 'care' ? 'text-[#007aff]' : 'text-[#8e8e93]'
          }`}
        >
          Care
        </Text>
      </TouchableOpacity>

      {/* Tab 5: Profile */}
      <TouchableOpacity
        onPress={() => onTabChange('profile')}
        className="items-center justify-center py-1.5 w-14"
      >
        <User size={20} color={activeTab === 'profile' ? '#007aff' : '#8e8e93'} />
        <Text
          className={`text-[9px] font-semibold mt-1 ${
            activeTab === 'profile' ? 'text-[#007aff]' : 'text-[#8e8e93]'
          }`}
        >
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
};

interface ParentNavigationProps {
  activeTab: 'home' | 'medicines' | 'ask' | 'profile';
  onTabChange: (tab: 'home' | 'medicines' | 'ask' | 'profile') => void;
}

export const ParentBottomNavBar: React.FC<ParentNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <View className="absolute bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-neutral-200/80 flex-row justify-around items-center py-2 px-3 shadow-sm">
      <TouchableOpacity
        onPress={() => onTabChange('home')}
        className="items-center justify-center py-1.5 w-16"
      >
        <Home size={24} color={activeTab === 'home' ? '#007aff' : '#8e8e93'} />
        <Text
          className={`text-[10px] font-semibold mt-1 ${activeTab === 'home' ? 'text-[#007aff]' : 'text-[#8e8e93]'}`}
        >
          Home
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onTabChange('medicines')}
        className="items-center justify-center py-1.5 w-16"
      >
        <Pill size={24} color={activeTab === 'medicines' ? '#007aff' : '#8e8e93'} />
        <Text
          className={`text-[10px] font-semibold mt-1 ${activeTab === 'medicines' ? 'text-[#007aff]' : 'text-[#8e8e93]'}`}
        >
          Medicines
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onTabChange('ask')}
        className="items-center justify-center py-1.5 w-16"
      >
        <Mic size={24} color={activeTab === 'ask' ? '#af52de' : '#8e8e93'} />
        <Text
          className={`text-[10px] font-semibold mt-1 ${activeTab === 'ask' ? 'text-[#af52de]' : 'text-[#8e8e93]'}`}
        >
          Ask AI
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onTabChange('profile')}
        className="items-center justify-center py-1.5 w-16"
      >
        <User size={24} color={activeTab === 'profile' ? '#007aff' : '#8e8e93'} />
        <Text
          className={`text-[10px] font-semibold mt-1 ${activeTab === 'profile' ? 'text-[#007aff]' : 'text-[#8e8e93]'}`}
        >
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
};
