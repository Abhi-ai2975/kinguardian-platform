import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Watch, RefreshCw, ChevronRight } from 'lucide-react-native';
import { ConnectionStatus as StatusType, HealthProviderType } from '../../services/health';
import { ConnectionStatus } from './ConnectionStatus';
import { SyncStatus } from './SyncStatus';

export interface WearableDeviceItem {
  id: string;
  provider: HealthProviderType;
  deviceName: string;
  rolePerspectiveTitle?: string; // e.g. "Dad's Garmin" or "My watch"
  status: StatusType;
  lastSyncedAt?: Date | string | null;
  relativeTimeText?: string;
  isHealthEvent?: boolean;
  batteryLevel?: number;
}

interface WearableConnectionCardProps {
  device: WearableDeviceItem;
  onPress?: () => void;
  onSyncPress?: () => void;
  onReconnectPress?: () => void;
  isCoordinatorView?: boolean;
}

export const WearableConnectionCard: React.FC<WearableConnectionCardProps> = ({
  device,
  onPress,
  onSyncPress,
  onReconnectPress,
  isCoordinatorView = false
}) => {
  const isErrorOrDelayed = device.status === 'error' || device.status === 'delayed';
  const displayTitle = device.rolePerspectiveTitle || (isCoordinatorView ? `Dad's ${device.deviceName}` : device.deviceName);


  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm"
    >
      <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center flex-1 mr-2">
          <View className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 items-center justify-center mr-3">
            <Watch size={22} color="#2563eb" />
          </View>

          <View className="flex-1">
            <Text className="text-base font-bold text-slate-900 dark:text-slate-100">
              {displayTitle}
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 capitalize">

              {device.provider.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <ConnectionStatus status={device.status} size="sm" />
      </View>

      <View className="pt-3 flex-row items-center justify-between">
        <SyncStatus
          status={device.status}
          lastSyncedAt={device.lastSyncedAt}
          relativeTimeText={device.relativeTimeText}
          isHealthEvent={device.isHealthEvent}
        />

        {isErrorOrDelayed && onReconnectPress ? (
          <TouchableOpacity
            onPress={onReconnectPress}
            className="bg-rose-600 dark:bg-rose-700 px-3 py-1.5 rounded-lg flex-row items-center"
          >
            <Text className="text-xs font-bold text-white">Reconnect</Text>
          </TouchableOpacity>
        ) : onSyncPress ? (
          <TouchableOpacity
            onPress={onSyncPress}
            className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg"
          >
            <RefreshCw size={14} color="#64748b" />
          </TouchableOpacity>
        ) : (
          <ChevronRight size={16} color="#94a3b8" />
        )}
      </View>
    </TouchableOpacity>
  );
};
