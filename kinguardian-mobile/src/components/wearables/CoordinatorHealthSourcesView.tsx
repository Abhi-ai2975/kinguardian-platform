import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';

import {
  Watch,
  Heart,
  Activity,
  Moon,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Shield,
  X
} from 'lucide-react-native';
import { HealthProviderType } from '../../services/health';

export interface CoordinatorHealthSourceItem {
  id: string;
  provider: HealthProviderType;
  name: string;
  isConnected: boolean;
  statusText: 'Connected' | 'Not connected' | 'Delayed' | 'Syncing';
  lastSyncedText?: string;
  scopes: {
    activity: boolean;
    sleep: boolean;
    heartRate: boolean;
    rawMetrics?: boolean;
  };
}

interface CoordinatorHealthSourcesViewProps {
  parentName?: string;
  sources?: CoordinatorHealthSourceItem[];
  onConnectProvider?: (provider: HealthProviderType) => void;
  onRefreshSource?: (sourceId: string) => void;
}

export const DEFAULT_COORDINATOR_SOURCES: CoordinatorHealthSourceItem[] = [
  {
    id: 'src_garmin',
    provider: 'garmin',
    name: 'Garmin',
    isConnected: true,
    statusText: 'Connected',
    lastSyncedText: '8 minutes ago',
    scopes: {
      activity: true,
      sleep: true,
      heartRate: true,
      rawMetrics: false
    }
  },
  {
    id: 'src_apple_health',
    provider: 'apple_health',
    name: 'Apple Health',
    isConnected: true,
    statusText: 'Connected',
    lastSyncedText: '12 minutes ago',
    scopes: {
      activity: true,
      sleep: true,
      heartRate: true,
      rawMetrics: false
    }
  },
  {
    id: 'src_fitbit',
    provider: 'fitbit',
    name: 'Fitbit',
    isConnected: false,
    statusText: 'Not connected',
    scopes: {
      activity: false,
      sleep: false,
      heartRate: false,
      rawMetrics: false
    }
  }
];

export const CoordinatorHealthSourcesView: React.FC<CoordinatorHealthSourcesViewProps> = ({
  parentName = 'Parent profile',
  sources = DEFAULT_COORDINATOR_SOURCES,
  onConnectProvider,
  onRefreshSource: _onRefreshSource
}) => {

  const [selectedSource, setSelectedSource] = useState<CoordinatorHealthSourceItem | null>(null);

  const handleSourceTap = (source: CoordinatorHealthSourceItem) => {
    if (source.isConnected) {
      setSelectedSource(source);
    } else if (onConnectProvider) {
      onConnectProvider(source.provider);
    }
  };

  const getSourceIcon = (provider: HealthProviderType) => {
    switch (provider) {
      case 'garmin':
        return <Activity size={20} color="#2563eb" />;
      case 'apple_health':
        return <Watch size={20} color="#0284c7" />;
      case 'fitbit':
      default:
        return <Heart size={20} color="#0d9488" />;
    }
  };

  return (
    <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      {/* Header */}
      <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <View>
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {parentName}
          </Text>
          <Text className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
            Health Sources
          </Text>
        </View>
        <Shield size={18} color="#64748b" />
      </View>

      {/* Sources List */}
      <View className="space-y-3">
        {sources.map((source) => (
          <TouchableOpacity
            key={source.id}
            activeOpacity={0.7}
            onPress={() => handleSourceTap(source)}
            className={`p-4 rounded-2xl border flex-row items-center justify-between ${
              source.isConnected
                ? 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                : 'bg-slate-50/40 dark:bg-slate-900/40 border-dashed border-slate-200 dark:border-slate-800'
            }`}
          >
            <View className="flex-row items-center space-x-3">
              <View
                className={`w-10 h-10 rounded-xl items-center justify-center ${
                  source.isConnected
                    ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                    : 'bg-slate-100 dark:bg-slate-800'
                }`}
              >
                {getSourceIcon(source.provider)}
              </View>

              <View>
                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {source.name}
                </Text>
                <View className="flex-row items-center space-x-1 mt-0.5">
                  {source.isConnected ? (
                    <>
                      <CheckCircle2 size={12} color="#059669" />
                      <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        Connected
                      </Text>
                    </>
                  ) : (
                    <Text className="text-xs text-slate-500 dark:text-slate-400">
                      Not connected
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Detail Inspect Modal for Tapped Connected Device */}
      <Modal
        visible={!!selectedSource}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedSource(null)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800 space-y-5">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <View className="flex-row items-center space-x-3">
                <View className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 items-center justify-center">
                  {selectedSource && getSourceIcon(selectedSource.provider)}
                </View>
                <View>
                  <Text className="text-lg font-black text-slate-900 dark:text-slate-100">
                    {selectedSource?.name}
                  </Text>
                  <View className="flex-row items-center space-x-1">
                    <CheckCircle2 size={12} color="#059669" />
                    <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      Connected
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedSource(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Scope Breakdown */}
            <View className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3.5">
              {/* Activity */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center space-x-2.5">
                  <Activity size={16} color="#2563eb" />
                  <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Activity
                  </Text>
                </View>
                <View className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 items-center justify-center">
                  <Check size={14} color="#059669" />
                </View>
              </View>

              {/* Sleep */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center space-x-2.5">
                  <Moon size={16} color="#4f46e5" />
                  <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Sleep
                  </Text>
                </View>
                <View className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 items-center justify-center">
                  <Check size={14} color="#059669" />
                </View>
              </View>

              {/* Heart rate */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center space-x-2.5">
                  <Heart size={16} color="#e11d48" />
                  <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Heart rate
                  </Text>
                </View>
                <View className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 items-center justify-center">
                  <Check size={14} color="#059669" />
                </View>
              </View>
            </View>

            {/* Last Synced Row */}
            <View className="bg-blue-50/60 dark:bg-blue-950/40 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/60 flex-row items-center justify-between">
              <View className="flex-row items-center space-x-2">
                <Clock size={16} color="#2563eb" />
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Last synced
                </Text>
              </View>
              <Text className="text-xs font-extrabold text-blue-700 dark:text-blue-300">
                {selectedSource?.lastSyncedText || '8 minutes ago'}
              </Text>
            </View>

            {/* Close / Action Button */}
            <TouchableOpacity
              onPress={() => setSelectedSource(null)}
              className="w-full bg-slate-900 dark:bg-slate-100 py-3.5 rounded-xl items-center"
            >
              <Text className="text-sm font-bold text-white dark:text-slate-900">
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};
