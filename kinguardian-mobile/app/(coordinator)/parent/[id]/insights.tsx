import { useContext, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AppContext } from '../../../../src/store/AppContext';
import { DeviceFrame } from '../../../../src/components/DeviceFrame';
import { SimulatorControls } from '../../../../src/components/SimulatorControls';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Sparkles,
  TrendingDown,
  CheckCircle2,
  Database,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Activity
} from 'lucide-react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { insightService, TrendCalculation } from '../../../../src/services/InsightService';

export default function ClinicalInsightsRoute() {
  const context = useContext(AppContext);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: 'dad' | 'mom' }>();

  if (!context) return null;

  const personId = id || 'dad';
  const person = context.people.find((p) => p.id === personId) || context.people[0];
  const parentName = person ? person.name : 'Dad';

  // State for live trend calculations
  const [trends, setTrends] = useState<TrendCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMatrix, setShowMatrix] = useState(true);
  const [expandedItem, setExpandedItem] = useState<string | null>('baseline');

  // Load trends from API
  const fetchTrends = async () => {
    setLoading(true);
    try {
      const trendData = await insightService.getTrends();
      setTrends(trendData);
    } catch (e) {
      console.warn('Failed to load insights data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [personId]);

  // Chart layout calculations for 30-day baseline vs 5-day drop
  const baselineVal = trends?.baseline_30d || 5200;
  const currentVal = trends?.current_value || 3420;
  const stepHistory = [5300, 5150, 5200, 4800, 4100, 3700, currentVal];
  const chartWidth = 340;
  const chartHeight = 110;
  const padding = 15;

  const points = stepHistory.map((val, idx) => {
    const x = padding + (idx * (chartWidth - padding * 2)) / (stepHistory.length - 1);
    const minVal = 2500;
    const maxVal = 6000;
    const y = chartHeight - padding - ((val - minVal) / (maxVal - minVal)) * (chartHeight - padding * 2);
    return `${x},${y}`;
  });

  const pathD = points.length > 0 ? `M ${points.join(' L ')}` : '';
  const areaD = points.length > 0 ? `M ${padding},${chartHeight - padding} L ${points.join(' L ')} L ${chartWidth - padding},${chartHeight - padding} Z` : '';

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-[#f8f9ff]">
        {/* Navigation Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#e2dfd9] bg-white">
          <TouchableOpacity
            onPress={() => router.replace('/(coordinator)')}
            className="p-2 bg-slate-100 rounded-full"
          >
            <ArrowLeft size={16} color="#464554" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Health Insights & Baselines
            </Text>
            <Text className="text-[10px] text-slate-400 font-semibold">
              {parentName} • Health Baselines & Trends
            </Text>
          </View>
          <TouchableOpacity
            onPress={fetchTrends}
            className="p-2 bg-blue-50 rounded-full border border-blue-200"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#007aff" />
            ) : (
              <RefreshCw size={14} color="#007aff" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-5 space-y-6">
          {/* Header Banner */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Sparkles size={14} color="#007aff" />
                <Text className="text-[10px] font-black uppercase tracking-wider text-[#007aff]">
                  KinGuardian Trend Engine
                </Text>
              </View>
              <View className="bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <Text className="text-[9px] font-black text-emerald-700 uppercase">
                  Live Telemetry Active
                </Text>
              </View>
            </View>

            <Text className="text-xl font-black text-slate-900 leading-snug">
              {parentName}'s 30-Day Activity Baseline
            </Text>
            <Text className="text-xs text-slate-500 font-semibold leading-relaxed">
              Calculated from rolling continuous wearable telemetry and cross-referenced with regional weather indexes.
            </Text>
          </View>

          {/* Activity Trend Card */}
          <View className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <View className="flex-row justify-between items-start">
              <View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Activity Trend Analysis
                  </Text>
                </View>
                <Text className="text-base font-black text-slate-900 mt-1">
                  Daily Step Volume Variance
                </Text>
              </View>
              <View className="bg-[#ffdad6] px-2.5 py-1 rounded-full border border-red-200 flex-row items-center gap-1">
                <TrendingDown size={12} color="#ba1a1a" />
                <Text className="text-[10px] font-black text-[#ba1a1a]">
                  {trends ? `${trends.variance_pct}%` : '-34.2%'}
                </Text>
              </View>
            </View>

            {/* Baseline Comparison Grid */}
            <View className="flex-row gap-3">
              <View className="flex-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <Text className="text-[10px] font-bold text-slate-400 uppercase">30-Day Baseline</Text>
                <Text className="text-xl font-black text-slate-800 mt-1">
                  {baselineVal.toLocaleString()} <Text className="text-xs font-semibold text-slate-400">steps/day</Text>
                </Text>
                <Text className="text-[9px] text-emerald-600 font-semibold mt-0.5">
                  Mean over 30 days (14+ days logged)
                </Text>
              </View>

              <View className="flex-1 bg-orange-50/60 p-3.5 rounded-2xl border border-orange-100">
                <Text className="text-[10px] font-bold text-orange-600 uppercase">Current 5-Day Trend</Text>
                <Text className="text-xl font-black text-orange-950 mt-1">
                  {currentVal.toLocaleString()} <Text className="text-xs font-semibold text-orange-600">steps/day</Text>
                </Text>
                <Text className="text-[9px] text-orange-700 font-semibold mt-0.5">
                  Below baseline -1.5 SD
                </Text>
              </View>
            </View>

            {/* Step Trend SVG Chart */}
            <View className="h-28 pt-2">
              <Svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                <Defs>
                  <LinearGradient id="grad-baseline-steps" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#ba1a1a" stopOpacity={0.2} />
                    <Stop offset="100%" stopColor="#ffffff" stopOpacity={0.0} />
                  </LinearGradient>
                </Defs>
                <Line x1="15" y1="20" x2="325" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                <Line x1="15" y1="55" x2="325" y2="55" stroke="#f1f5f9" strokeWidth="1" />
                <Line x1="15" y1="90" x2="325" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                {areaD ? <Path d={areaD} fill="url(#grad-baseline-steps)" /> : null}
                {pathD ? <Path d={pathD} fill="none" stroke="#ba1a1a" strokeWidth="2.5" /> : null}
                {points.map((pt, idx) => {
                  const [x, y] = pt.split(',').map(parseFloat);
                  return (
                    <Circle
                      key={idx}
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#ba1a1a"
                      stroke="white"
                      strokeWidth="1.5"
                    />
                  );
                })}
              </Svg>
            </View>
            <View className="flex-row justify-between text-[8px] text-slate-400 font-bold uppercase px-1">
              <Text className="text-[9px] text-slate-400">7 days ago (5,300)</Text>
              <Text className="text-[9px] text-slate-400 font-black text-[#ba1a1a]">Today ({currentVal.toLocaleString()})</Text>
            </View>

            {/* Quick Link to Guardian Moment */}
            <TouchableOpacity
              onPress={() => router.push(`/parent/${personId}/guardian` as any)}
              className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-full bg-blue-500 items-center justify-center">
                  <Activity size={16} color="white" />
                </View>
                <View>
                  <Text className="text-xs font-black text-blue-950">View Active Guardian Moment</Text>
                  <Text className="text-[10px] text-blue-700 font-semibold">
                    Inspect observation, weather correlation & next steps →
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#007aff" />
            </TouchableOpacity>
          </View>

          {/* CLINICAL MONITORING PROTOCOL & BASELINES */}
          <View className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <TouchableOpacity
              onPress={() => setShowMatrix(!showMatrix)}
              className="flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-2">
                <Database size={18} color="#007aff" />
                <View>
                  <Text className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Clinical Monitoring Protocol & Baselines
                  </Text>
                  <Text className="text-[10px] text-slate-500 font-semibold">
                    Continuous Telemetry & Safeguard Policies
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  <Text className="text-[10px] font-black text-emerald-800">
                    ACTIVE & MONITORED
                  </Text>
                </View>
                {showMatrix ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
              </View>
            </TouchableOpacity>

            {showMatrix && (
              <View className="space-y-3 pt-2 border-t border-slate-100">
                <Text className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                  Continuous physiological safeguards actively monitor subtle health variations while preventing false alarms.
                </Text>

                {/* Rule Items */}
                {([
                  {
                    id: 'baseline',
                    title: '30-Day Activity History & Baseline Calculation',
                    category: 'Mobility Baseline',
                    desc: 'Rolling 30-day baseline calculated at 5,200 steps/day. Current activity is 3,420 steps/day (-34% variance).',
                    status: 'Calibrated & Healthy'
                  },
                  {
                    id: 'variance',
                    title: 'Continuous Variance & Guardian Moment Engine',
                    category: 'Trend Evaluation',
                    desc: 'Evaluates multi-day deviations below baseline -1.5 SD. Generates timely moments with intelligent deduplication.',
                    status: 'Active Evaluation'
                  },
                  {
                    id: 'observation',
                    title: 'Observation Context, Timeframe & Data Sources',
                    category: 'Multi-Source Fusion',
                    desc: 'Combines observation timeframe (Past 5 days) with wearable metrics and ambient weather indicators.',
                    status: 'Correlated'
                  },
                  {
                    id: 'stale_sync',
                    title: 'Wearable Sync & Telemetry Availability Guard',
                    category: 'Device Safeguard',
                    desc: 'Wearable connectivity is continually verified. Distinguishes device sync delays from health changes without false panic.',
                    status: 'Safeguard Online'
                  },
                  {
                    id: 'cooldown',
                    title: 'Alert Suppression & 7-Day Cooldown Policy',
                    category: 'Notification Policy',
                    desc: 'Intelligent cooldown suppresses redundant alerts for 7 days post-acknowledgement to eliminate alert fatigue.',
                    status: 'Policy Enforced'
                  }
                ]).map((rule) => {
                  const isExpanded = expandedItem === rule.id;
                  return (
                    <View
                      key={rule.id}
                      className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50"
                    >
                      <TouchableOpacity
                        onPress={() => setExpandedItem(isExpanded ? null : rule.id)}
                        className="p-3.5 flex-row items-center justify-between bg-white"
                      >
                        <View className="flex-row items-center gap-2 flex-1 pr-2">
                          <CheckCircle2 size={16} color="#059669" />
                          <View className="flex-1">
                            <View className="flex-row items-center gap-1.5 flex-wrap">
                              <View className="px-1.5 py-0.2 rounded bg-emerald-100">
                                <Text className="text-[8px] font-black text-emerald-800 uppercase">
                                  {rule.status}
                                </Text>
                              </View>
                              <Text className="text-[10px] text-slate-400 font-semibold">• {rule.category}</Text>
                            </View>
                            <Text className="text-[11px] font-bold text-slate-700 mt-0.5" numberOfLines={1}>
                              {rule.title}
                            </Text>
                          </View>
                        </View>
                        {isExpanded ? <ChevronUp size={14} color="#64748b" /> : <ChevronDown size={14} color="#64748b" />}
                      </TouchableOpacity>

                      {isExpanded && (
                        <View className="p-3.5 space-y-2 bg-slate-50 border-t border-slate-100">
                          <Text className="text-[11px] text-slate-600 font-medium leading-relaxed">
                            {rule.desc}
                          </Text>
                          <View className="flex-row items-center justify-between pt-1">
                            <Text className="text-[10px] text-emerald-700 font-bold">
                              ✓ Clinical baseline telemetry calibrated
                            </Text>
                            <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
                              <Text className="text-[8px] font-black text-emerald-800 uppercase">STATUS: HEALTHY</Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Quick Query Follow-up Chip */}
          <TouchableOpacity
            onPress={() => {
              context.setAskAIQuery(`Explain how ${parentName}'s 30-day activity baseline of 5,200 steps was calculated.`);
              context.setAskAIOpen(true);
            }}
            className="w-full bg-[#007aff] py-4 rounded-2xl items-center justify-center shadow-md active:scale-98 mb-10"
          >
            <Text className="text-white font-black text-xs uppercase tracking-wider">
              Ask AI Co-Pilot About Baselines & Trends
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <SimulatorControls
        onTriggerNotification={context.handleTriggerSimulation}
        onRefreshData={context.handleWearableSyncRefresh}
        isSyncing={context.isSyncing}
        currentLoopStep={context.currentLoopStep}
        onAdvanceLoop={context.handleAdvanceLoop}
        onResetLoop={context.handleResetLoop}
      />
    </DeviceFrame>
  );
}
