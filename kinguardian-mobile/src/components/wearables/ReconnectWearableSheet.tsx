import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { X, AlertTriangle, RefreshCw, Unplug } from 'lucide-react-native';
import { HealthProviderType } from '../../services/health';

interface ReconnectWearableSheetProps {
  visible: boolean;
  onClose: () => void;
  onReconnect: () => Promise<void>;
  provider: HealthProviderType;
  deviceName?: string;
  isCoordinatorView?: boolean;
  careSubjectName?: string;
  hoursSinceLastSync?: number;
}

export const ReconnectWearableSheet: React.FC<ReconnectWearableSheetProps> = ({
  visible,
  onClose,
  onReconnect,
  provider,
  deviceName = 'Garmin Watch',
  isCoordinatorView = false,
  careSubjectName = 'Dad',
  hoursSinceLastSync = 12
}) => {
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Role-aware perspective headline directly matching KinGuardian spec:
  // Parent: "Your health device needs to reconnect."
  // Coordinator: "Dad's Garmin hasn't synced for 12 hours."
  const headline = isCoordinatorView
    ? `${careSubjectName}'s ${deviceName.replace('Watch', '')} hasn't synced for ${hoursSinceLastSync} hours.`
    : 'Your health device needs to reconnect.';

  const subtext = isCoordinatorView
    ? `KinGuardian is waiting for new telemetry from ${careSubjectName}'s ${provider.replace('_', ' ')} device. This is an operational sync delay, not a health change.`
    : `Bluetooth or permissions for your ${provider.replace('_', ' ')} device may have paused. Tap Reconnect to resume live health tracking.`;



  const handleReconnectAction = async () => {
    try {
      setIsReconnecting(true);
      await onReconnect();
      onClose();
    } catch (error) {
      console.error('Reconnect failed:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View className="flex-1 justify-center items-center bg-black/60 px-5">
        <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-800 shadow-xl">
          <View className="flex-row justify-between items-start mb-4">
            <View className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 items-center justify-center">
              <Unplug size={24} color="#e11d48" />
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
            >
              <X size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug mb-2">
            {headline}
          </Text>

          <Text className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            {subtext}
          </Text>

          <View className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/80 mb-5">
            <View className="flex-row items-center space-x-1.5 mb-0.5">
              <AlertTriangle size={14} color="#d97706" />
              <Text className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                Safety Invariant
              </Text>
            </View>
            <Text className="text-[11px] text-amber-700 dark:text-amber-400 leading-normal">
              Missing wearable telemetry is never interpreted as a health or medical event.
            </Text>
          </View>

          <View className="flex-col space-y-2">
            <TouchableOpacity
              onPress={handleReconnectAction}
              disabled={isReconnecting}
              activeOpacity={0.8}
              className="w-full bg-rose-600 hover:bg-rose-700 py-3.5 rounded-xl items-center justify-center flex-row"
            >
              {isReconnecting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <RefreshCw size={16} color="#ffffff" className="mr-2" />
                  <Text className="text-sm font-bold text-white ml-2">Reconnect</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              disabled={isReconnecting}
              className="w-full py-2.5 items-center"
            >
              <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Dismiss for now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
