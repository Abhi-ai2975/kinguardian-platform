import React, { useState, useEffect, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { RefreshCw, Clock, Radio, Heart } from 'lucide-react-native';
import { SyncLog } from '../types';
import { CARE_NETWORK_TEAM } from '../data/mockData';
import { AppContext } from '../store/AppContext';

interface SyncDashboardProps {
  syncLogs: SyncLog[];
  onTriggerSync: () => void;
  isSyncing: boolean;
}

export const SyncDashboard: React.FC<SyncDashboardProps> = ({
  syncLogs,
  onTriggerSync,
  isSyncing
}) => {
  const context = useContext(AppContext);
  const coordName = context?.coordinatorName || context?.currentUser?.name || 'Coordinator';
  const fatherPerson = context?.people?.find(p => p.id === 'dad' || p.relationship?.toLowerCase().includes('father') || p.relation?.toLowerCase().includes('father')) || context?.familyMembers?.find(m => m.id === 'dad' || m.relationship?.toLowerCase().includes('father') || m.relation?.toLowerCase().includes('father')) || context?.people?.[0];
  const fatherName = fatherPerson?.name ? (fatherPerson.name.charAt(0).toUpperCase() + fatherPerson.name.slice(1)) : 'Parent';
  const [londonTime, setLondonTime] = useState('');
  const [chennaiTime, setChennaiTime] = useState('');

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();

      const lTimeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Europe/London',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      setLondonTime(lTimeStr);

      const cTimeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      setChennaiTime(cTimeStr);
    };

    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ScrollView className="flex-1 bg-[#f2f2f7]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-100 bg-white">
        <Text className="text-base font-bold text-neutral-900 tracking-tight">Cross-User Sync</Text>
        <TouchableOpacity
          onPress={onTriggerSync}
          disabled={isSyncing}
          className="w-9 h-9 rounded-full bg-neutral-100 items-center justify-center active:scale-95"
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#007aff" />
          ) : (
            <RefreshCw size={14} color="#007aff" />
          )}
        </TouchableOpacity>
      </View>

      <View className="p-5 space-y-5">
        {/* Timezone translate */}
        <View className="bg-white rounded-2xl p-5 shadow-sm shadow-neutral-100 space-y-4">
          <View className="flex-row items-center justify-between border-b border-neutral-100 pb-3">
            <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Timezone Translation
            </Text>
            <View className="bg-[#eff6ff] px-2.5 py-0.5 rounded-full">
              <Text className="text-[8px] font-bold text-[#007aff] uppercase">5.5 Hour Offset</Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 bg-neutral-50 p-4 rounded-xl items-center border border-neutral-100">
              <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center mb-2">
                <Clock size={16} color="#007aff" />
              </View>
              <Text className="text-[9px] font-bold text-neutral-400 uppercase">London (BST)</Text>
              <Text className="text-base font-bold text-neutral-800 mt-0.5">
                {londonTime || '--:-- --'}
              </Text>
              <Text className="text-[9px] text-neutral-400 mt-0.5 font-semibold">{coordName} (You)</Text>
            </View>

            <View className="flex-1 bg-neutral-50 p-4 rounded-xl items-center border border-neutral-100">
              <View className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center mb-2">
                <Clock size={16} color="#34c759" />
              </View>
              <Text className="text-[9px] font-bold text-neutral-400 uppercase">Chennai (IST)</Text>
              <Text className="text-base font-bold text-neutral-800 mt-0.5">
                {chennaiTime || '--:-- --'}
              </Text>
              <Text className="text-[9px] text-neutral-400 mt-0.5 font-semibold">{fatherName} ({fatherPerson?.relation || 'Parent'})</Text>
            </View>
          </View>
        </View>

        {/* Telemetry Streams */}
        <View className="bg-white rounded-2xl p-5 shadow-sm shadow-neutral-100 space-y-4">
          <View className="flex-row items-center justify-between border-b border-neutral-100 pb-3">
            <Text className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
              Connected Telemetry Streams
            </Text>
            <View className="flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full bg-[#34c759]" />
              <Text className="text-[8px] font-bold text-[#34c759] uppercase">Ingest: Active</Text>
            </View>
          </View>

          <View className="space-y-3">
            <View className="flex-row items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-100/50">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center">
                  <Radio size={16} color="#007aff" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-neutral-800">Dexcom G7 CGM</Text>
                  <Text className="text-[9px] text-neutral-400 font-semibold mt-0.5">
                    {context?.people?.[1]?.name || 'Senior'} • Bluetooth stream
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-xs font-bold text-[#34c759]">98 mg/dL</Text>
                <Text className="text-[8px] text-neutral-400 font-semibold mt-0.5">
                  Synced 5m ago
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-100/50">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-full bg-red-50 items-center justify-center">
                  <Heart size={16} color="#ff3b30" fill="#ff3b30" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-neutral-800">Omron Blood Pressure</Text>
                  <Text className="text-[9px] text-neutral-400 font-semibold mt-0.5">
                    {context?.people?.[0]?.name || 'Parent'} • Smart Hub sync
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-xs font-bold text-[#ff3b30]">138/88 mmHg</Text>
                <Text className="text-[8px] text-neutral-400 font-semibold mt-0.5">
                  Synced 45m ago
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Local Care Circle Network */}
        <View className="bg-white rounded-2xl p-5 shadow-sm shadow-neutral-100 space-y-4">
          <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-3">
            Local Care Circle Network
          </Text>

          <View className="space-y-3">
            {CARE_NETWORK_TEAM.map((member) => (
              <View
                key={member.id}
                className="flex-row items-center justify-between bg-neutral-50 border border-neutral-100/50 p-3 rounded-xl"
              >
                <View className="flex-row items-center gap-3">
                  <Image source={{ uri: member.avatar }} className="w-9 h-9 rounded-full" />
                  <View>
                    <Text className="text-xs font-bold text-neutral-800">{member.name}</Text>
                    <Text className="text-[9px] text-neutral-400 font-semibold mt-0.5">
                      {member.role} • {member.location}
                    </Text>
                  </View>
                </View>
                <View
                  className={`px-2.5 py-0.5 rounded-full ${member.online ? 'bg-emerald-50' : 'bg-neutral-100'}`}
                >
                  <Text
                    className={`text-[8px] font-bold uppercase ${member.online ? 'text-[#34c759]' : 'text-neutral-500'}`}
                  >
                    {member.online ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Activity Sync Logs */}
        <View className="space-y-2">
          <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider pl-1">
            Activity Sync Logs
          </Text>

          <View className="bg-white rounded-2xl p-5 shadow-sm shadow-neutral-100 space-y-3.5">
            {syncLogs.slice(0, 5).map((log) => {
              const isOk = log.status === 'success' || log.status === 'synced';
              const statusCol = isOk ? 'text-[#34c759]' : 'text-[#ff3b30]';
              return (
                <View
                  key={log.id}
                  className="flex-row items-center justify-between border-b border-neutral-100 pb-2.5 last:border-0 last:pb-0"
                >
                  <View className="space-y-0.5">
                    <Text className="text-xs font-bold text-neutral-800">
                      {log.device} ({log.value})
                    </Text>
                    <Text className="text-[9px] text-neutral-400 font-semibold mt-0.5">
                      {log.time} · Ingested by {log.user}
                    </Text>
                  </View>
                  <Text className={`text-[10px] font-bold uppercase ${statusCol}`}>
                    {log.status}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View className="h-24" />
      </View>
    </ScrollView>
  );
};
