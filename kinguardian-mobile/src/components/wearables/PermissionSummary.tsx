import React from 'react';
import { View, Text } from 'react-native';
import { Check, Shield, Activity, Moon, Heart, Waves, Settings } from 'lucide-react-native';
import { HealthDataScope } from '../../services/health';

interface PermissionItem {
  scope: HealthDataScope;
  label: string;
  description: string;
  granted: boolean;
}

interface PermissionSummaryProps {
  permissions: PermissionItem[];
  title?: string;
  showUnbundledNotice?: boolean;
}

export const PermissionSummary: React.FC<PermissionSummaryProps> = ({
  permissions,
  title = 'Wearable Data Permissions',
  showUnbundledNotice = true
}) => {
  const getIcon = (scope: HealthDataScope) => {
    switch (scope) {
      case 'view_wearable_activity':
        return <Activity size={16} color="#059669" />;
      case 'view_wearable_sleep':
        return <Moon size={16} color="#4f46e5" />;
      case 'view_wearable_heart_rate':
        return <Heart size={16} color="#e11d48" />;
      case 'view_wearable_raw_metrics':
        return <Waves size={16} color="#d97706" />;
      case 'manage_wearable_connections':
        return <Settings size={16} color="#64748b" />;
      case 'view_wearable_summary':
      default:
        return <Shield size={16} color="#2563eb" />;
    }
  };

  return (
    <View className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {title}
        </Text>
        <Shield size={16} color="#64748b" />
      </View>

      <View className="space-y-3">
        {permissions.map((perm) => (
          <View
            key={perm.scope}
            className="flex-row items-start justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60 last:border-b-0"
          >
            <View className="flex-row items-start flex-1 mr-3">
              <View className="mr-2.5 mt-0.5">{getIcon(perm.scope)}</View>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {perm.label}
                </Text>
                <Text className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {perm.description}
                </Text>
              </View>
            </View>

            <View
              className={`w-5 h-5 rounded-full items-center justify-center ${
                perm.granted
                  ? 'bg-emerald-100 dark:bg-emerald-950/60'
                  : 'bg-slate-100 dark:bg-slate-800'
              }`}
            >
              {perm.granted ? (
                <Check size={12} color="#059669" />
              ) : (
                <Text className="text-[10px] text-slate-400 font-bold">—</Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {showUnbundledNotice && (
        <View className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
          <Text className="text-[11px] text-slate-500 dark:text-slate-400 italic">
            Permissions are unbundled and independently revocable at any time.
          </Text>
        </View>
      )}
    </View>
  );
};
