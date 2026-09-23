import { useContext, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  ChevronRight,
  Activity,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Clock,
  WifiOff
} from 'lucide-react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { AppContext } from '../../../../src/store/AppContext';
import { DeviceFrame } from '../../../../src/components/DeviceFrame';
import { SimulatorControls } from '../../../../src/components/SimulatorControls';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { insightService, GuardianMomentDetail, WearableStatus } from '../../../../src/services/InsightService';

export default function GuardianMomentRoute() {
  const context = useContext(AppContext);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: 'dad' | 'mom' }>();

  if (!context) return null;

  const personId = id || context.currentPersonId || 'dad';
  const person = context.people.find((p) => p.id === personId) || context.people[0];
  const parentName = person ? person.name : 'Dad';

  // Live state from backend
  const [moment, setMoment] = useState<GuardianMomentDetail | null>(null);
  const [wearableStatus, setWearableStatus] = useState<WearableStatus | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [dismissMessage, setDismissMessage] = useState<string | null>(null);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  // Load Guardian Moment and Wearable status
  const loadData = async () => {
    try {
      const [detail, wearStatus] = await Promise.all([
        insightService.getDetail(),
        insightService.getWearableStatus()
      ]);
      setMoment(detail);
      setWearableStatus(wearStatus);
      if (detail.status === 'dismissed') {
        setIsDismissed(true);
      }
    } catch (e) {
      console.warn('Failed to load moment data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [personId]);

  // Handle Dismiss Alert
  const handleDismiss = async () => {
    if (!moment) return;
    try {
      await insightService.dismiss(moment.id);
      setIsDismissed(true);
      // Re-run evaluation to demonstrate duplicate suppression
      await insightService.evaluate();
      setDismissMessage(
        'Alert dismissed. Cooldown active for 7 days; duplicate alerts suppressed.'
      );
      if (context.showToast) {
        context.showToast('Guardian Moment dismissed. Deduplication policy active.');
      }
    } catch (e) {
      console.warn('Dismiss error:', e);
    }
  };

  // Visual activity steps data points (dropping trend: 5,200 baseline to 3,420 / 2,100)
  const activityData = [5200, 5100, 4800, 4200, 3600, 3420];
  const chartWidth = 340;
  const chartHeight = 110;
  const padding = 15;

  const points = activityData.map((val, idx) => {
    const x = padding + (idx * (chartWidth - padding * 2)) / (activityData.length - 1);
    const minVal = 2000;
    const maxVal = 6000;
    const valRange = maxVal - minVal;
    const y = chartHeight - padding - ((val - minVal) / valRange) * (chartHeight - padding * 2);
    return `${x},${y}`;
  });

  const pathD = points.length > 0 ? `M ${points.map((p) => p).join(' L ')}` : '';
  const areaD = points.length > 0 ? `M 15,95 L ${points.map((p) => p).join(' L ')} L 325,95 Z` : '';

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-[#fbfaf7]">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#e2dfd9] bg-[#fbfaf7]">
          <TouchableOpacity
            onPress={() => router.replace('/(coordinator)')}
            className="p-2 bg-slate-100 rounded-full"
          >
            <ArrowLeft size={16} color="#464554" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Guardian moment
            </Text>
            <Text className="text-[10px] text-slate-400 font-semibold">{parentName}'s Health Insight</Text>
          </View>
          <TouchableOpacity
            onPress={loadData}
            className="p-2 bg-slate-100 rounded-full"
          >
            <RefreshCw size={14} color="#464554" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-5 space-y-6">
          {/* Header Title & Slogan */}
          <View className="space-y-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <ShieldAlert size={16} color="#ba1a1a" />
                <Text className="text-xs font-black text-[#ba1a1a] uppercase tracking-wider">
                  Telemetry Shift Detected
                </Text>
              </View>
              <View className="bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                <Text className="text-[9px] font-black text-purple-700 uppercase">
                  Timeframe: {moment?.timeframe || 'Past 5 days'}
                </Text>
              </View>
            </View>
            <Text className="text-xl font-black text-[#121c2a]">Something changed with {parentName}</Text>
            <Text className="text-xs text-[#708090] font-semibold leading-relaxed">
              {moment?.summary || "Activity has been below typical baseline for 5 consecutive days."}
            </Text>
          </View>

          {/* Dismissed Status Banner */}
          {isDismissed && (
            <View className="bg-emerald-50 border border-emerald-300 rounded-3xl p-4.5 space-y-2">
              <View className="flex-row items-center gap-2">
                <CheckCircle2 size={16} color="#059669" />
                <Text className="text-xs font-black text-emerald-800 uppercase tracking-wide">
                  Insight Dismissed
                </Text>
              </View>
              <Text className="text-[11px] text-emerald-700 font-semibold leading-relaxed">
                {dismissMessage || "Insight has been dismissed. Deduplication key ensures no duplicate alert is generated for the 7-day cooldown period."}
              </Text>
            </View>
          )}

          {/* Activity Trend Line Chart */}
          <View className="bg-white border border-[#e2dfd9] rounded-3xl p-5 shadow-sm space-y-3.5">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-[10px] font-bold text-slate-400 uppercase">
                  Recent Activity Trend (5-Day Window)
                </Text>
                <Text className="text-lg font-black text-slate-800 mt-0.5">3,420 steps today</Text>
              </View>
              <View className="bg-[#ffdad6] px-2.5 py-0.5 rounded-full">
                <Text className="text-[9px] font-black text-[#ba1a1a] uppercase">-34.2% variance</Text>
              </View>
            </View>

            <View className="h-28">
              <Svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                <Defs>
                  <LinearGradient id="grad-activity" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#ba1a1a" stopOpacity={0.25} />
                    <Stop offset="100%" stopColor="#ffffff" stopOpacity={0.0} />
                  </LinearGradient>
                </Defs>
                <Line x1="15" y1="15" x2="325" y2="15" stroke="#eff4ff" strokeWidth="1" />
                <Line x1="15" y1="55" x2="325" y2="55" stroke="#eff4ff" strokeWidth="1" />
                <Line x1="15" y1="95" x2="325" y2="95" stroke="#eff4ff" strokeWidth="1" />
                {areaD ? <Path d={areaD} fill="url(#grad-activity)" /> : null}
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
              <Text className="text-[8px] text-slate-400">5 days ago (5,200)</Text>
              <Text className="text-[8px] text-slate-400 font-black text-[#ba1a1a]">Today (3,420)</Text>
            </View>
          </View>

          {/* Section: Observation */}
          <View className="space-y-2">
            <Text className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Observation
            </Text>
            <View className="bg-white border border-[#e2dfd9] rounded-3xl p-5 shadow-sm space-y-2">
              <Text className="text-xs text-slate-700 leading-relaxed font-semibold">
                {moment?.observation ||
                  `${parentName}'s midday step activity decreased by 35% over the last 5 days during a regional heatwave in Chennai (39°C). Adherence checklist remains stable.`}
              </Text>
              <View className="bg-slate-50 rounded-xl p-2.5 flex-row items-center gap-2 border border-slate-100">
                <Clock size={12} color="#64748b" />
                <Text className="text-[10px] text-slate-500 font-bold">
                  Timeframe: {moment?.timeframe || 'Past 5 days'}
                </Text>
              </View>
            </View>
          </View>

          {/* Section: Data Sources */}
          <View className="space-y-2">
            <Text className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Data Sources Considered
            </Text>
            <View className="bg-white border border-[#e2dfd9] rounded-3xl p-5 shadow-sm space-y-3">
              {(moment?.sources || [
                'Smart Watch (17 readings)',
                'Chennai Weather Telemetry (38-42°C)',
                '30-Day Activity Baseline (5,200 steps/day)'
              ]).map((src, idx) => (
                <View
                  key={idx}
                  className="flex-row items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0"
                >
                  <View className="flex-row items-center gap-2">
                    <View className="w-2 h-2 rounded-full bg-blue-500" />
                    <Text className="text-xs font-bold text-slate-800">{src}</Text>
                  </View>
                  <Text className="text-[10px] font-black text-emerald-600 uppercase">Verified</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Wearable Connection Notice */}
          <View className="bg-white border border-yellow-200 rounded-3xl p-5 shadow-sm space-y-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <WifiOff size={15} color="#ca8a04" />
                <Text className="text-xs font-black text-yellow-900 uppercase tracking-wider">
                  Hardware Sync Notice
                </Text>
              </View>
              <View className="bg-yellow-100 px-2 py-0.5 rounded-full">
                <Text className="text-[8px] font-black text-yellow-800 uppercase">
                  {wearableStatus?.sync_status || 'stale_sync'}
                </Text>
              </View>
            </View>

            <Text className="text-xs text-slate-700 font-semibold leading-relaxed">
              {wearableStatus?.warning_banner || `${parentName}'s watch has not synced in over 24 hours. Baselines may be outdated.`}
            </Text>

            <View className="bg-yellow-50/70 p-3 rounded-2xl flex-row items-center justify-between border border-yellow-100">
              <Text className="text-[10px] text-slate-500 font-semibold">
                Last Synced: <Text className="font-bold text-slate-800">{wearableStatus?.last_sync_at || 'Yesterday, 2:30 PM'}</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setShowTroubleshoot(!showTroubleshoot)}
                className="bg-yellow-600 px-3 py-1 rounded-full"
              >
                <Text className="text-white text-[10px] font-bold">
                  {showTroubleshoot ? 'Hide Steps' : 'Troubleshoot'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Reconnection Steps Accordion */}
            {showTroubleshoot && (
              <View className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 mt-2">
                <Text className="text-xs font-black text-slate-800">
                  Wearable Reconnection Guide:
                </Text>
                {(wearableStatus?.troubleshoot_steps || [
                  `1. Ensure Bluetooth is enabled on ${parentName}'s phone and watch`,
                  '2. Place the watch on its magnetic charging cradle for 10 minutes',
                  `3. Open the KinGuardian companion app on ${parentName}'s device to trigger sync`,
                  `4. Restart ${parentName}'s mobile phone if connection fails to re-establish`
                ]).map((step, sIdx) => (
                  <Text key={sIdx} className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    {step}
                  </Text>
                ))}
              </View>
            )}
          </View>

          {/* Section: Suggested Next Steps */}
          <View className="space-y-3 mb-6">
            <Text className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Suggested Next Steps
            </Text>

            {/* Check in */}
            <TouchableOpacity
              onPress={() => {
                context.setCheckInOpen(true);
                router.replace('/(coordinator)');
              }}
              className="bg-white border border-[#e2dfd9] rounded-3xl p-4.5 flex-row items-center justify-between shadow-xs active:scale-99"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-full bg-[#f4effc] items-center justify-center">
                  <Phone size={14} color="#2a14b4" fill="#2a14b4" />
                </View>
                <View className="space-y-0.5 flex-1 pr-2">
                  <Text className="text-xs font-black text-slate-800">Check in with {parentName}</Text>
                  <Text className="text-[10px] text-slate-500 font-semibold">
                    Initiate a voice call or wellbeing check regarding hydration
                  </Text>
                </View>
              </View>
              <ChevronRight size={14} color="#708090" />
            </TouchableOpacity>

            {/* Contact caregiver */}
            <TouchableOpacity
              onPress={() => router.push('/(coordinator)/family' as any)}
              className="bg-white border border-[#e2dfd9] rounded-3xl p-4.5 flex-row items-center justify-between shadow-xs active:scale-99"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-full bg-[#ecfdf5] items-center justify-center">
                  <MessageSquare size={14} color="#059669" />
                </View>
                <View className="space-y-0.5 flex-1 pr-2">
                  <Text className="text-xs font-black text-slate-800">Contact caregiver Priya</Text>
                  <Text className="text-[10px] text-slate-500 font-semibold">
                    Confirm AC is running and shift walks to after sunset
                  </Text>
                </View>
              </View>
              <ChevronRight size={14} color="#708090" />
            </TouchableOpacity>

            {/* Review baseline insights */}
            <TouchableOpacity
              onPress={() => router.push(`/parent/${personId}/insights` as any)}
              className="bg-white border border-[#e2dfd9] rounded-3xl p-4.5 flex-row items-center justify-between shadow-xs active:scale-99"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-full bg-[#eff4ff] items-center justify-center">
                  <Activity size={14} color="#2a14b4" />
                </View>
                <View className="space-y-0.5 flex-1 pr-2">
                  <Text className="text-xs font-black text-slate-800">Review 30-Day Baselines</Text>
                  <Text className="text-[10px] text-slate-500 font-semibold">
                    Examine rolling step mean and baseline insights
                  </Text>
                </View>
              </View>
              <ChevronRight size={14} color="#708090" />
            </TouchableOpacity>
          </View>

          {/* Dismiss Alert Button */}
          <View className="space-y-2 mb-12">
            {!isDismissed ? (
              <TouchableOpacity
                onPress={handleDismiss}
                className="w-full bg-slate-200 py-3.5 rounded-2xl items-center justify-center active:scale-98"
              >
                <Text className="text-slate-700 font-black text-xs uppercase tracking-wider">
                  Dismiss Alert
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={async () => {
                  // Re-evaluate to verify suppression
                  await insightService.evaluate();
                  Alert.alert(
                    'Insight Cooldown Active',
                    `Engine confirmed: duplicate alert suppressed (cooldown policy active).`
                  );
                }}
                className="w-full bg-emerald-600 py-3.5 rounded-2xl items-center justify-center active:scale-98"
              >
                <Text className="text-white font-black text-xs uppercase tracking-wider">
                  ✓ Re-check Telemetry Engine
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
