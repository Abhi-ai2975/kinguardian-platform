import React from 'react';
import { View, Text } from 'react-native';
import { CheckCircle2, RefreshCw, AlertCircle, Unplug, Clock } from 'lucide-react-native';
import { ConnectionStatus as StatusType } from '../../services/health';


interface ConnectionStatusProps {
  status: StatusType;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  showIcon = true,
  size = 'md'
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'up_to_date':
      case 'connected':
        return {
          label: status === 'up_to_date' ? 'Up to date' : 'Connected',
          bg: 'bg-emerald-50 dark:bg-emerald-950/40',
          text: 'text-emerald-700 dark:text-emerald-300',
          border: 'border-emerald-200 dark:border-emerald-800',
          Icon: CheckCircle2
        };
      case 'syncing':
        return {
          label: 'Syncing...',
          bg: 'bg-blue-50 dark:bg-blue-950/40',
          text: 'text-blue-700 dark:text-blue-300',
          border: 'border-blue-200 dark:border-blue-800',
          Icon: RefreshCw
        };
      case 'delayed':
        return {
          label: 'Delayed',
          bg: 'bg-amber-50 dark:bg-amber-950/40',
          text: 'text-amber-700 dark:text-amber-300',
          border: 'border-amber-200 dark:border-amber-800',
          Icon: Clock
        };
      case 'error':
        return {
          label: 'Sync Error',
          bg: 'bg-rose-50 dark:bg-rose-950/40',
          text: 'text-rose-700 dark:text-rose-300',
          border: 'border-rose-200 dark:border-rose-800',
          Icon: AlertCircle
        };
      case 'disconnected':
      default:
        return {
          label: 'Disconnected',
          bg: 'bg-slate-100 dark:bg-slate-800',
          text: 'text-slate-600 dark:text-slate-400',
          border: 'border-slate-200 dark:border-slate-700',
          Icon: Unplug
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.Icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
    lg: 'px-3 py-1.5 text-sm font-medium'
  };

  return (
    <View
      className={`flex-row items-center rounded-full border ${config.bg} ${config.border} ${sizeClasses[size]}`}
    >
      {showIcon && (
        <View className="mr-1.5">
          <IconComponent
            size={size === 'sm' ? 12 : size === 'md' ? 14 : 16}
            color={status === 'error' ? '#e11d48' : status === 'syncing' ? '#2563eb' : status === 'delayed' ? '#d97706' : status === 'connected' || status === 'up_to_date' ? '#059669' : '#64748b'}
          />
        </View>
      )}
      <Text className={`${config.text} font-medium`}>{config.label}</Text>
    </View>
  );
};
