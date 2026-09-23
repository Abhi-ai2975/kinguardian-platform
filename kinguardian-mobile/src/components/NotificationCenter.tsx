import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Bell, X, Info, ShieldAlert, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react-native';
import { AppNotification, ScreenView } from '../types';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onNavigateScreen: (screen: ScreenView, data?: any) => void;
  onClearAll: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onNavigateScreen,
  onClearAll
}) => {
  const [expandedGroup, setExpandedGroup] = useState<boolean>(false);

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'alert':
        return <ShieldAlert size={18} color="#ba1a1a" />;
      case 'reminder':
        return <Bell size={18} color="#b45309" />;
      case 'sync':
        return <RefreshCw size={16} color="#4338ca" />;
      default:
        return <Info size={18} color="#464554" />;
    }
  };

  // Grouping logic for Dad/Ramesh notifications to avoid overload
  const dadNotifs = notifications.filter(
    (n) =>
      n.message.toLowerCase().includes('dad') ||
      n.message.toLowerCase().includes('ramesh') ||
      n.title.toLowerCase().includes('dad') ||
      n.title.toLowerCase().includes('ramesh')
  );

  const otherNotifs = notifications.filter(
    (n) =>
      !(
        n.message.toLowerCase().includes('dad') ||
        n.message.toLowerCase().includes('ramesh') ||
        n.title.toLowerCase().includes('dad') ||
        n.title.toLowerCase().includes('ramesh')
      )
  );

  const shouldGroup = dadNotifs.length >= 2;

  const handleMarkAllDadRead = () => {
    dadNotifs.forEach((n) => onMarkRead(n.id));
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-[32px] max-h-[80%] p-6 space-y-4 shadow-2xl">
          {/* Header */}
          <View className="flex-row justify-between items-center pb-2 border-b border-slate-100">
            <View className="flex-row items-center gap-2">
              <Bell size={20} color="#2a14b4" />
              <Text className="text-base font-black text-[#121c2a]">Notification Center</Text>
            </View>
            <View className="flex-row items-center gap-4">
              {notifications.length > 0 && (
                <TouchableOpacity onPress={onClearAll}>
                  <Text className="text-xs font-bold text-slate-400">Clear All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} className="p-1.5 bg-slate-100 rounded-full">
                <X size={16} color="#464554" />
              </TouchableOpacity>
            </View>
          </View>

          {/* List */}
          <ScrollView className="space-y-3">
            {notifications.length === 0 ? (
              <View className="py-12 items-center justify-center space-y-2">
                <Bell size={32} color="#dee9fc" />
                <Text className="text-xs font-bold text-slate-400">No notifications yet</Text>
              </View>
            ) : (
              <View className="space-y-3">
                {/* Render Grouped Dad Notifications */}
                {shouldGroup && (
                  <View className="border border-amber-250 bg-amber-50/20 rounded-[24px] p-1 space-y-2 overflow-hidden">
                    <TouchableOpacity
                      onPress={() => {
                        setExpandedGroup(!expandedGroup);
                        handleMarkAllDadRead();
                      }}
                      className="p-4 flex-row gap-3 items-start"
                    >
                      <View className="w-8 h-8 rounded-full bg-[#fde68a] items-center justify-center shrink-0">
                        <Bell size={18} color="#b45309" />
                      </View>
                      <View className="flex-1 space-y-1">
                        <View className="flex-row justify-between items-center">
                          <Text className="text-xs font-black text-slate-900">
                            {dadNotifs.length} updates about Dad
                          </Text>
                          <Text className="text-[9px] font-bold text-slate-400">
                            {dadNotifs[0]?.time || 'Just now'}
                          </Text>
                        </View>
                        <Text className="text-[11px] leading-snug text-slate-500">
                          Medication scheduling, vitals checks, check-ins, and health logs.
                        </Text>
                        <View className="flex-row items-center gap-1 mt-1.5">
                          <Text className="text-[10px] font-black text-[#2a14b4]">
                            {expandedGroup ? 'Hide updates' : 'View updates'}
                          </Text>
                          {expandedGroup ? (
                            <ChevronUp size={10} color="#2a14b4" />
                          ) : (
                            <ChevronDown size={10} color="#2a14b4" />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Expanded Individual Updates */}
                    {expandedGroup && (
                      <View className="px-3 pb-3 space-y-2">
                        {dadNotifs.map((n) => (
                          <TouchableOpacity
                            key={n.id}
                            onPress={() => {
                              onMarkRead(n.id);
                              if (n.actionScreen) {
                                onNavigateScreen(n.actionScreen, n.actionData);
                                onClose();
                              }
                            }}
                            className={`p-3.5 rounded-2xl border flex-row gap-3 items-start ${
                              n.read
                                ? 'bg-slate-50/60 border-slate-100'
                                : 'bg-white border-amber-200 shadow-xs'
                            }`}
                          >
                            <View
                              className={`w-7 h-7 rounded-full items-center justify-center shrink-0 ${
                                n.type === 'alert'
                                  ? 'bg-[#ffdad6]'
                                  : n.type === 'reminder'
                                    ? 'bg-[#fffbeb]'
                                    : 'bg-[#e6eeff]'
                              }`}
                            >
                              {getIcon(n.type)}
                            </View>
                            <View className="flex-1 space-y-0.5">
                              <View className="flex-row justify-between items-center">
                                <Text
                                  className={`text-[11px] font-black truncate max-w-[70%] ${n.read ? 'text-slate-500' : 'text-slate-900'}`}
                                >
                                  {n.title}
                                </Text>
                                <Text className="text-[8px] font-bold text-slate-400">
                                  {n.time}
                                </Text>
                              </View>
                              <Text className="text-[10px] leading-snug text-slate-600">
                                {n.message}
                              </Text>
                              {n.actionText && (
                                <Text className="text-[9px] font-black text-[#4338ca] mt-1">
                                  {n.actionText} &rarr;
                                </Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Render Individual Dad Notifications if they shouldn't group */}
                {!shouldGroup &&
                  dadNotifs.map((n) => (
                    <TouchableOpacity
                      key={n.id}
                      onPress={() => {
                        onMarkRead(n.id);
                        if (n.actionScreen) {
                          onNavigateScreen(n.actionScreen, n.actionData);
                          onClose();
                        }
                      }}
                      className={`p-4 rounded-2xl border flex-row gap-3 items-start ${
                        n.read
                          ? 'bg-slate-50/50 border-slate-100'
                          : 'bg-white border-[#c3c0ff]/50 shadow-sm'
                      }`}
                    >
                      <View
                        className={`w-8 h-8 rounded-full items-center justify-center shrink-0 ${
                          n.type === 'alert'
                            ? 'bg-[#ffdad6]'
                            : n.type === 'reminder'
                              ? 'bg-[#fffbeb]'
                              : 'bg-[#e6eeff]'
                        }`}
                      >
                        {getIcon(n.type)}
                      </View>
                      <View className="flex-1 space-y-1">
                        <View className="flex-row justify-between items-center">
                          <Text
                            className={`text-xs font-black truncate max-w-[70%] ${n.read ? 'text-slate-500' : 'text-slate-900'}`}
                          >
                            {n.title}
                          </Text>
                          <Text className="text-[9px] font-bold text-slate-400">{n.time}</Text>
                        </View>
                        <Text className="text-[11px] leading-snug text-slate-600">{n.message}</Text>
                        {n.actionText && (
                          <Text className="text-[10px] font-black text-[#4338ca] mt-1">
                            {n.actionText} &rarr;
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}

                {/* Render Other Notifications */}
                {otherNotifs.map((n) => (
                  <TouchableOpacity
                    key={n.id}
                    onPress={() => {
                      onMarkRead(n.id);
                      if (n.actionScreen) {
                        onNavigateScreen(n.actionScreen, n.actionData);
                        onClose();
                      }
                    }}
                    className={`p-4 rounded-2xl border flex-row gap-3 items-start ${
                      n.read
                        ? 'bg-slate-50/50 border-slate-100'
                        : 'bg-white border-[#c3c0ff]/50 shadow-sm'
                    }`}
                  >
                    <View
                      className={`w-8 h-8 rounded-full items-center justify-center shrink-0 ${
                        n.type === 'alert'
                          ? 'bg-[#ffdad6]'
                          : n.type === 'reminder'
                            ? 'bg-[#fffbeb]'
                            : 'bg-[#e6eeff]'
                      }`}
                    >
                      {getIcon(n.type)}
                    </View>
                    <View className="flex-1 space-y-1">
                      <View className="flex-row justify-between items-center">
                        <Text
                          className={`text-xs font-black truncate max-w-[70%] ${n.read ? 'text-slate-500' : 'text-slate-900'}`}
                        >
                          {n.title}
                        </Text>
                        <Text className="text-[9px] font-bold text-slate-400">{n.time}</Text>
                      </View>
                      <Text className="text-[11px] leading-snug text-slate-600">{n.message}</Text>
                      {n.actionText && (
                        <Text className="text-[10px] font-black text-[#4338ca] mt-1">
                          {n.actionText} &rarr;
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
