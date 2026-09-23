import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Watch, Heart, Smartphone, Flame, Activity } from 'lucide-react-native';

import { HealthProviderType } from '../../services/health';

export interface ProviderOption {
  id: HealthProviderType;
  name: string;
  category: 'smartwatch' | 'smart_ring' | 'mobile_sdk' | 'fitness_tracker';
  description: string;
  badge?: string;
}

interface WearableProviderPickerProps {
  selectedProvider?: HealthProviderType;
  onSelectProvider: (provider: HealthProviderType) => void;
  availableProviders?: ProviderOption[];
}

export const DEFAULT_PROVIDERS: ProviderOption[] = [
  {
    id: 'apple_health',
    name: 'Apple Health & Watch',
    category: 'mobile_sdk',
    description: 'Direct on-device HealthKit sync for Apple Watch and iPhone.',
    badge: 'Native iOS'
  },
  {
    id: 'health_connect',
    name: 'Health Connect',
    category: 'mobile_sdk',
    description: 'Android on-device health store integration.',
    badge: 'Native Android'
  },
  {
    id: 'garmin',
    name: 'Garmin Connect',
    category: 'smartwatch',
    description: 'Forerunner, Venu, and Fenix activity and biometric streams.',
    badge: 'Activity #1'
  },
  {
    id: 'oura',
    name: 'Oura Ring',
    category: 'smart_ring',
    description: 'Gold-standard sleep architecture and nocturnal recovery.',
    badge: 'Sleep #1'
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    category: 'fitness_tracker',
    description: 'Step tracking, daily activity, and resting vitals.',
    badge: 'Cloud Sync'
  },
  {
    id: 'whoop',
    name: 'Whoop',
    category: 'fitness_tracker',
    description: 'Continuous cardiovascular strain and recovery tracking.',
    badge: 'Recovery'
  }
];

export const WearableProviderPicker: React.FC<WearableProviderPickerProps> = ({
  selectedProvider,
  onSelectProvider,
  availableProviders = DEFAULT_PROVIDERS
}) => {
  const getProviderIcon = (id: HealthProviderType) => {
    switch (id) {
      case 'apple_health':
        return <Watch size={20} color="#0284c7" />;
      case 'health_connect':
        return <Smartphone size={20} color="#059669" />;
      case 'garmin':
        return <Activity size={20} color="#2563eb" />;
      case 'oura':
        return <Heart size={20} color="#7c3aed" />;
      case 'whoop':
        return <Flame size={20} color="#dc2626" />;
      case 'fitbit':
      default:
        return <Watch size={20} color="#0d9488" />;
    }
  };

  return (
    <View className="space-y-2.5">
      {availableProviders.map((prov) => {
        const isSelected = selectedProvider === prov.id;
        return (
          <TouchableOpacity
            key={prov.id}
            onPress={() => onSelectProvider(prov.id)}
            activeOpacity={0.7}
            className={`p-3.5 rounded-xl border flex-row items-center justify-between ${
              isSelected
                ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-400'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <View className="flex-row items-center flex-1 mr-2">
              <View
                className={`w-10 h-10 rounded-lg items-center justify-center mr-3 ${
                  isSelected
                    ? 'bg-blue-100 dark:bg-blue-900/60'
                    : 'bg-slate-100 dark:bg-slate-800'
                }`}
              >
                {getProviderIcon(prov.id)}
              </View>

              <View className="flex-1">
                <View className="flex-row items-center space-x-1.5">
                  <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {prov.name}
                  </Text>
                  {prov.badge && (
                    <View className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                      <Text className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                        {prov.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  className="text-xs text-slate-500 dark:text-slate-400 mt-0.5"
                  numberOfLines={2}
                >
                  {prov.description}
                </Text>
              </View>
            </View>

            <View
              className={`w-5 h-5 rounded-full border items-center justify-center ${
                isSelected
                  ? 'border-blue-600 bg-blue-600 dark:border-blue-400 dark:bg-blue-400'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              {isSelected && <View className="w-2 h-2 rounded-full bg-white" />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
