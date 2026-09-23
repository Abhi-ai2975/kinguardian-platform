import React, { useContext, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  StatusBar,
  TouchableOpacity,
  Text,
  Modal,
  Image,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppContext } from '../store/AppContext';
import { Wrench, X, MapPin } from 'lucide-react-native';

interface DeviceFrameProps {
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children }) => {
  const context = useContext(AppContext);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [simControlsExpanded, setSimControlsExpanded] = useState(false);

  if (!context) return <View className="flex-1 bg-white">{children}</View>;

  const { currentUser, demoUsers, switchDemoUser, appMode } = context;

  // Set safe area background dynamically to match the color themes
  const bgStyle = appMode === 'parent' ? 'bg-[#fffbeb]' : 'bg-[#fdfbf7]';

  const childrenArray = children as any;
  const mainApp = Array.isArray(childrenArray) ? childrenArray[0] : children;
  const simControls = Array.isArray(childrenArray) ? childrenArray[1] : null;

  const isWeb = Platform.OS === 'web';

  if (isWeb) {
    return (
      <View className="flex-1 flex-row bg-slate-950 p-6 justify-center items-center gap-8 min-h-screen w-full">
        {/* Mock Mobile Device Frame */}
        <View className="w-[393px] h-[852px] rounded-[48px] border-[12px] border-slate-800 bg-black shadow-2xl overflow-hidden relative shrink-0">
          <SafeAreaView className={`w-full h-full ${bgStyle}`}>
            <StatusBar
              barStyle="dark-content"
              backgroundColor={appMode === 'parent' ? '#fffbeb' : '#fdfbf7'}
            />
            <KeyboardAvoidingView behavior="padding" className="flex-1 relative">
              <View className={`flex-1 ${bgStyle}`}>{mainApp}</View>

              {/* Developer Switcher Trigger - Absolute positioned top right inside screen */}
              <TouchableOpacity
                onPress={() => setSwitcherOpen(true)}
                activeOpacity={0.7}
                className="absolute top-2.5 right-4 z-50 w-7 h-7 rounded-full bg-slate-800/80 items-center justify-center shadow"
              >
                <Wrench size={12} color="#ffffff" />
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>

        {/* Desktop Simulator Controls Side Panel */}
        {simControls && (
          <View className="w-[450px] h-[852px] bg-slate-900 rounded-[32px] border border-slate-800 overflow-hidden shadow-xl shrink-0">
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
              {simControls}
            </ScrollView>
          </View>
        )}

        {/* Switcher Modal */}
        <Modal
          visible={switcherOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSwitcherOpen(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/60 px-6">
            <View className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-sm font-black text-slate-800 uppercase tracking-wide">
                    KinGuardian Demo Switcher
                  </Text>

                  <Text className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                    Click to hot-swap persona state
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSwitcherOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center"
                >
                  <X size={14} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View className="space-y-3">
                {demoUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <TouchableOpacity
                      key={u.id}
                      onPress={() => {
                        switchDemoUser(u.id);
                        setSwitcherOpen(false);
                      }}
                      activeOpacity={0.8}
                      className={`p-3 rounded-2xl border ${
                        isCurrent ? 'border-[#2a14b4] bg-[#eff4ff]' : 'border-slate-100 bg-slate-50'
                      } flex-row items-center gap-3`}
                    >
                      <Image
                        source={{ uri: u.avatarUrl }}
                        className="w-10 h-10 rounded-full border border-slate-200"
                      />
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-xs font-black text-slate-800">{u.name}</Text>
                          <Text className="text-[8px] font-black uppercase text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                            {u.role}
                          </Text>
                        </View>
                        <Text className="text-[9px] text-slate-400 font-bold mt-0.5">
                          {u.relation} • {u.age} years old
                        </Text>
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <MapPin size={8} color="#94a3b8" />
                          <Text className="text-[8px] text-slate-400 font-bold">{u.location}</Text>
                        </View>
                      </View>
                      {isCurrent && (
                        <View className="w-5 h-5 rounded-full bg-[#2a14b4] items-center justify-center">
                          <Text className="text-[10px] text-white font-bold">✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Native Mobile Layout
  return (
    <SafeAreaView className={`flex-1 ${bgStyle}`}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={appMode === 'parent' ? '#fffbeb' : '#fdfbf7'}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 relative"
      >
        <View className={`flex-1 ${bgStyle}`}>{mainApp}</View>

        {/* Collapsible Mobile Simulator Controls Panel */}
        {simControls && (
          <View className="bg-slate-900 border-t border-slate-800 shrink-0">
            <TouchableOpacity
              onPress={() => setSimControlsExpanded(!simControlsExpanded)}
              activeOpacity={0.8}
              className="py-3 px-4 flex-row justify-between items-center bg-slate-950 border-b border-slate-850"
            >
              <Text className="text-[10px] font-black text-slate-300 uppercase tracking-wide">
                🛠️ Simulator Controls {simControlsExpanded ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            {simControlsExpanded && (
              <View className="max-h-[280px]">
                <ScrollView className="flex-1">{simControls}</ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Hidden Developer Switcher Trigger - Small Wrench button absolute positioned top right */}
        <TouchableOpacity
          onPress={() => setSwitcherOpen(true)}
          activeOpacity={0.7}
          className="absolute top-2.5 right-4 z-50 w-7 h-7 rounded-full bg-slate-800/80 items-center justify-center shadow"
        >
          <Wrench size={12} color="#ffffff" />
        </TouchableOpacity>

        {/* Switcher Modal */}
        <Modal
          visible={switcherOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSwitcherOpen(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/60 px-6">
            <View className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-sm font-black text-slate-800 uppercase tracking-wide">
                    KinGuardian Demo Switcher
                  </Text>

                  <Text className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                    Click to hot-swap persona state
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSwitcherOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center"
                >
                  <X size={14} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View className="space-y-3">
                {demoUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <TouchableOpacity
                      key={u.id}
                      onPress={() => {
                        switchDemoUser(u.id);
                        setSwitcherOpen(false);
                      }}
                      activeOpacity={0.8}
                      className={`p-3 rounded-2xl border ${
                        isCurrent ? 'border-[#2a14b4] bg-[#eff4ff]' : 'border-slate-100 bg-slate-50'
                      } flex-row items-center gap-3`}
                    >
                      <Image
                        source={{ uri: u.avatarUrl }}
                        className="w-10 h-10 rounded-full border border-slate-200"
                      />
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-xs font-black text-slate-800">{u.name}</Text>
                          <Text className="text-[8px] font-black uppercase text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                            {u.role}
                          </Text>
                        </View>
                        <Text className="text-[9px] text-slate-400 font-bold mt-0.5">
                          {u.relation} • {u.age} years old
                        </Text>
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <MapPin size={8} color="#94a3b8" />
                          <Text className="text-[8px] text-slate-400 font-bold">{u.location}</Text>
                        </View>
                      </View>
                      {isCurrent && (
                        <View className="w-5 h-5 rounded-full bg-[#2a14b4] items-center justify-center">
                          <Text className="text-[10px] text-white font-bold">✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
