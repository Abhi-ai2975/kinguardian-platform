import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Activity, Moon, ArrowDown, ArrowUp, Sparkles, ChevronRight } from 'lucide-react-native';

export interface MeaningfulWearableMetric {
  id: string;
  category: 'activity' | 'sleep' | 'heart_rate';
  title: string;
  value: string;
  baselineComparisonText: string;
  direction?: 'down' | 'up' | 'stable';
}

export interface WearableHomeSummaryProps {
  personName?: string;
  statusHeadline?: string;
  meaningfulMetrics?: MeaningfulWearableMetric[];
  onPressCard?: () => void;
  sourceProviderName?: string;
}

export const DEFAULT_MEANINGFUL_METRICS: MeaningfulWearableMetric[] = [
  {
    id: 'activity_metric',
    category: 'activity',
    title: 'Activity',
    value: '5,430 steps',
    baselineComparisonText: '↓ 12% from usual',
    direction: 'down'
  },
  {
    id: 'sleep_metric',
    category: 'sleep',
    title: 'Sleep',
    value: '6h 42m',
    baselineComparisonText: '↓ 36m from usual',
    direction: 'down'
  }
];

export const WearableHomeSummaryCard: React.FC<WearableHomeSummaryProps> = ({
  personName = 'Dad',
  statusHeadline = 'Doing well',
  meaningfulMetrics = DEFAULT_MEANINGFUL_METRICS,
  onPressCard,
  sourceProviderName = 'Garmin'
}) => {
  // RULE: Only show when there are meaningful insights. Never dump every metric automatically.
  if (!meaningfulMetrics || meaningfulMetrics.length === 0) {
    return null;
  }

  const getMetricIcon = (category: string) => {
    switch (category) {
      case 'activity':
        return <Activity size={18} color="#2563eb" />;
      case 'sleep':
        return <Moon size={18} color="#4f46e5" />;
      default:
        return <Sparkles size={18} color="#059669" />;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPressCard}
      className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
    >
      {/* Header: Person + Status Headline */}
      <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <View>
          <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {personName}
          </Text>
          <Text className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
            {statusHeadline}
          </Text>
        </View>

        <View className="flex-row items-center space-x-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-1 rounded-full">
          <View className="w-2 h-2 rounded-full bg-emerald-500" />
          <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
            {sourceProviderName}
          </Text>
        </View>
      </View>

      {/* Meaningful Metrics Grid / Row */}
      <View className="grid grid-cols-2 gap-3 flex-row">
        {meaningfulMetrics.map((metric) => (
          <View
            key={metric.id}
            className="flex-1 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-700/60"
          >
            <View className="flex-row items-center space-x-1.5 mb-1.5">
              {getMetricIcon(metric.category)}
              <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {metric.title}
              </Text>
            </View>

            <Text className="text-base font-black text-slate-900 dark:text-slate-100">
              {metric.value}
            </Text>

            <View className="flex-row items-center space-x-1 mt-1">
              {metric.direction === 'down' ? (
                <ArrowDown size={12} color="#d97706" />
              ) : metric.direction === 'up' ? (
                <ArrowUp size={12} color="#059669" />
              ) : null}
              <Text className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                {metric.baselineComparisonText}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Subtle Footer Prompt */}
      {onPressCard && (
        <View className="flex-row items-center justify-between pt-1">
          <Text className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            Filtered for meaningful changes
          </Text>
          <ChevronRight size={14} color="#94a3b8" />
        </View>
      )}
    </TouchableOpacity>
  );
};
