import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { X, ShieldCheck, ArrowRight } from 'lucide-react-native';
import { HealthProviderType, HealthDataScope } from '../../services/health';
import { WearableProviderPicker, DEFAULT_PROVIDERS } from './WearableProviderPicker';
import { PermissionSummary } from './PermissionSummary';

interface ConnectWearableSheetProps {
  visible: boolean;
  onClose: () => void;
  onConnect: (provider: HealthProviderType, scopes: HealthDataScope[]) => Promise<void>;
  careSubjectName?: string;
}

export const ConnectWearableSheet: React.FC<ConnectWearableSheetProps> = ({
  visible,
  onClose,
  onConnect,
  careSubjectName = 'Care Subject'
}) => {
  const [selectedProvider, setSelectedProvider] = useState<HealthProviderType>('apple_health');
  const [isConnecting, setIsConnecting] = useState(false);
  const [step, setStep] = useState<'picker' | 'permissions'>('picker');

  const defaultPermissionItems = [
    {
      scope: 'view_wearable_summary' as HealthDataScope,
      label: 'Health Summary & Highlights',
      description: 'Wellness scores and Guardian Moments.',
      granted: true
    },
    {
      scope: 'view_wearable_activity' as HealthDataScope,
      label: 'Activity & Movement',
      description: 'Daily steps, active minutes, and distance.',
      granted: true
    },
    {
      scope: 'view_wearable_sleep' as HealthDataScope,
      label: 'Sleep Architecture',
      description: 'Sleep duration, quality scores, and stages.',
      granted: true
    },
    {
      scope: 'view_wearable_heart_rate' as HealthDataScope,
      label: 'Heart Rate & Recovery',
      description: 'Resting pulse and autonomic HRV recovery.',
      granted: true
    }
  ];

  const handleProceedToPermissions = () => {
    setStep('permissions');
  };

  const handleFinalConnect = async () => {
    try {
      setIsConnecting(true);
      await onConnect(
        selectedProvider,
        defaultPermissionItems.map((p) => p.scope)
      );
      setStep('picker');
      onClose();
    } catch (error) {
      console.error('Failed to connect wearable:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/60">
        <View className="bg-slate-50 dark:bg-slate-900 rounded-t-3xl max-h-[85%] p-5">
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <View>
              <Text className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {step === 'picker' ? 'Connect Health Device' : 'Review Sharing Permissions'}
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                {step === 'picker'
                  ? `Select a provider for ${careSubjectName}`
                  : `Granular data scopes for ${selectedProvider.replace('_', ' ')}`}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 items-center justify-center"
            >
              <X size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView className="my-4" showsVerticalScrollIndicator={false}>
            {step === 'picker' ? (
              <WearableProviderPicker
                selectedProvider={selectedProvider}
                onSelectProvider={setSelectedProvider}
                availableProviders={DEFAULT_PROVIDERS}
              />
            ) : (
              <View className="space-y-4">
                <PermissionSummary permissions={defaultPermissionItems} />

                <View className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800">
                  <View className="flex-row items-center space-x-2 mb-1">
                    <ShieldCheck size={16} color="#2563eb" />
                    <Text className="text-xs font-bold text-blue-900 dark:text-blue-200">
                      Zero-Credential Security
                    </Text>
                  </View>
                  <Text className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                    KinGuardian never stores your device passwords or raw biometrics on unencrypted storage. You can disconnect or revoke permissions at any time.
                  </Text>

                </View>
              </View>
            )}
          </ScrollView>

          <View className="pt-2 border-t border-slate-200 dark:border-slate-800">
            {step === 'picker' ? (
              <TouchableOpacity
                onPress={handleProceedToPermissions}
                className="w-full bg-blue-600 dark:bg-blue-500 py-3.5 rounded-xl flex-row items-center justify-center"
              >
                <Text className="text-sm font-bold text-white mr-2">Continue</Text>
                <ArrowRight size={16} color="#ffffff" />
              </TouchableOpacity>
            ) : (
              <View className="flex-row space-x-3">
                <TouchableOpacity
                  onPress={() => setStep('picker')}
                  disabled={isConnecting}
                  className="flex-1 bg-slate-200 dark:bg-slate-800 py-3.5 rounded-xl items-center"
                >
                  <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleFinalConnect}
                  disabled={isConnecting}
                  className="flex-2 bg-blue-600 dark:bg-blue-500 py-3.5 rounded-xl items-center justify-center flex-row"
                >
                  {isConnecting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text className="text-sm font-bold text-white">Authorize & Connect</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
