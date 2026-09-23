import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import {
  Watch,
  CheckCircle2,
  Settings,
  RefreshCw,
  Unlink,
  X,
  ShieldCheck
} from 'lucide-react-native';

export interface ParentDeviceItem {
  id: string;
  name: string;
  isConnected: boolean;
  lastUpdatedText: string;
}

interface ParentDevicesViewProps {
  device?: ParentDeviceItem;
  onManageDevice?: () => void;
  onRefreshSync?: () => Promise<void>;
  onDisconnect?: () => Promise<void>;
}

export const DEFAULT_PARENT_DEVICE: ParentDeviceItem = {
  id: 'dev_apple_watch',
  name: 'Apple Watch',
  isConnected: true,
  lastUpdatedText: '8 minutes ago'
};

export const ParentDevicesView: React.FC<ParentDevicesViewProps> = ({
  device = DEFAULT_PARENT_DEVICE,
  onManageDevice,
  onRefreshSync,
  onDisconnect
}) => {
  const [showManageModal, setShowManageModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handlePrimaryManagePress = () => {
    if (onManageDevice) {
      onManageDevice();
    } else {
      setShowManageModal(true);
    }
  };

  const handleSyncNow = async () => {
    try {
      setIsRefreshing(true);
      if (onRefreshSync) {
        await onRefreshSync();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDisconnectAction = async () => {
    try {
      setIsDisconnecting(true);
      if (onDisconnect) {
        await onDisconnect();
      }
      setShowManageModal(false);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
      {/* Header Title */}
      <View className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Parent Mode
        </Text>
        <Text className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
          My health devices
        </Text>
      </View>

      {/* Connected Device Card */}
      {device.isConnected ? (
        <View className="space-y-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3.5">
              <View className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 items-center justify-center border border-indigo-100 dark:border-indigo-900/60">
                <Watch size={30} color="#2a14b4" />
              </View>

              <View>
                <Text className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {device.name}
                </Text>
                <View className="flex-row items-center space-x-1.5 mt-0.5">
                  <CheckCircle2 size={14} color="#059669" />
                  <Text className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    Connected
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Last Updated Box */}
          <View className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/60">
            <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Last updated
            </Text>
            <Text className="text-base font-black text-slate-800 dark:text-slate-200 mt-0.5">
              {device.lastUpdatedText}
            </Text>
          </View>

          {/* Primary CTA: Manage device */}
          <TouchableOpacity
            onPress={handlePrimaryManagePress}
            activeOpacity={0.8}
            className="w-full bg-[#007aff] active:bg-[#0062cc] py-4 rounded-2xl flex-row items-center justify-center space-x-2 shadow-sm"
          >
            <Settings size={18} color="#ffffff" />
            <Text className="text-white text-base font-black tracking-wide ml-1.5">
              Manage device
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="py-6 items-center space-y-2">
          <Text className="text-base font-bold text-slate-700 dark:text-slate-300">
            No devices connected
          </Text>
          <Text className="text-xs text-slate-500 text-center">
            Tap below to pair your watch.
          </Text>
        </View>
      )}

      {/* Simple, Non-Technical Manage Modal (Zero Raw Provider Configs) */}
      <Modal
        visible={showManageModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowManageModal(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800 space-y-5">
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <Text className="text-lg font-black text-slate-900 dark:text-slate-100">
                Manage {device.name}
              </Text>
              <TouchableOpacity
                onPress={() => setShowManageModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View className="space-y-3">
              <TouchableOpacity
                onPress={handleSyncNow}
                disabled={isRefreshing}
                className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex-row items-center justify-between border border-slate-200 dark:border-slate-700"
              >
                <View className="flex-row items-center space-x-3">
                  <RefreshCw size={20} color="#007aff" />
                  <View>
                    <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Sync health data now
                    </Text>
                    <Text className="text-xs text-slate-500">
                      Updates latest steps, sleep, and heart rate
                    </Text>
                  </View>
                </View>
                {isRefreshing && <ActivityIndicator size="small" color="#007aff" />}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDisconnectAction}
                disabled={isDisconnecting}
                className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl flex-row items-center space-x-3 border border-rose-200 dark:border-rose-900/60"
              >
                <Unlink size={20} color="#e11d48" />
                <View>
                  <Text className="text-sm font-bold text-rose-700 dark:text-rose-400">
                    Disconnect this device
                  </Text>
                  <Text className="text-xs text-rose-600/80 dark:text-rose-400/80">
                    Pauses sharing health metrics with family
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/60 flex-row items-center space-x-2">
              <ShieldCheck size={16} color="#2563eb" />
              <Text className="text-[11px] text-blue-700 dark:text-blue-300 flex-1 font-medium">
                Your device data is encrypted and private to your care circle.
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowManageModal(false)}
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
