import React from 'react';
import { View, Text } from 'react-native';
import { RefreshCw, CheckCircle2, AlertTriangle, Clock } from 'lucide-react-native';
import { ConnectionStatus as StatusType } from '../../services/health';

interface SyncStatusProps {
  status: StatusType;
  lastSyncedAt?: Date | string | null;
  relativeTimeText?: string;
  isHealthEvent?: boolean;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({
  status,
  lastSyncedAt,
  relativeTimeText,
  isHealthEvent = false
}) => {
  const getDisplayTime = () => {
    if (relativeTimeText) return relativeTimeText;
    if (!lastSyncedAt) return 'Never synced';
    if (typeof lastSyncedAt === 'string') return lastSyncedAt;
    return `Last sync: ${lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <View className="flex-col space-y-1">
      <View className="flex-row items-center space-x-1.5">
        {status === 'syncing' ? (
          <RefreshCw size={14} color="#2563eb" />
        ) : status === 'up_to_date' || status === 'connected' ? (
          <CheckCircle2 size={14} color="#059669" />
        ) : status === 'delayed' ? (
          <Clock size={14} color="#d97706" />
        ) : (
          <AlertTriangle size={14} color="#e11d48" />
        )}
        <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {status === 'syncing'
            ? 'Syncing telemetry...'
            : status === 'up_to_date'
            ? 'Up to date'
            : status === 'connected'
            ? 'Connected'
            : status === 'delayed'
            ? 'Sync Delayed'
            : 'Sync Needs Attention'}
        </Text>
      </View>

      <Text className="text-xs text-slate-500 dark:text-slate-400">
        {getDisplayTime()}
      </Text>

      {/* Safety invariant indicator */}
      {!isHealthEvent && (status === 'error' || status === 'delayed') && (
        <Text className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
          Operational device state — not a health event.
        </Text>
      )}
    </View>
  );
};
