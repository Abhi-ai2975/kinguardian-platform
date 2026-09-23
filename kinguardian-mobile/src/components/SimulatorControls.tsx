import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Wrench, RefreshCw, Layers } from 'lucide-react-native';
import { AppContext } from '../store/AppContext';
import { realDataService } from '../services/api-client/RealDataService';

export type DemoScenario =
  | 'normal'
  | 'medication-missed'
  | 'guardian-moment'
  | 'new-lab-report'
  | 'upcoming-appointment'
  | 'parent-feeling-unwell'
  | 'stale-sync';

interface SimulatorControlsProps {
  onTriggerNotification: (type: 'bp_spike' | 'missed_med' | 'cgm_sync' | 'suresh_log') => void;
  onRefreshData: () => void;
  isSyncing: boolean;

  // Core Loop Walkthrough Props
  currentLoopStep: number;
  onAdvanceLoop: () => void;
  onResetLoop: () => void;
}

export const SimulatorControls: React.FC<SimulatorControlsProps> = ({
  onTriggerNotification,
  onRefreshData: _onRefreshData,
  isSyncing: _isSyncing,
  currentLoopStep,
  onAdvanceLoop,
  onResetLoop
}) => {
  const context = useContext(AppContext);
  const currentScenario = context?.currentScenario || 'normal';
  const onSwitchScenario = context?.switchScenario;

  const handleSimulateOutage = async () => {
    try {
      await realDataService.simulateWearableOutage();
      context?.showToast('Simulated 504 Outage logged into DB audit_log.');
      if (onSwitchScenario) onSwitchScenario('stale-sync');
    } catch (e) {
      console.warn('Simulate outage error:', e);
    }
  };

  const handleRestoreOutage = async () => {
    try {
      await realDataService.restoreWearableOutage();
      context?.showToast('Restored wearable API connection.');
      if (onSwitchScenario) onSwitchScenario('normal');
    } catch (e) {
      console.warn('Restore outage error:', e);
    }
  };

  const steps = [
    {
      label: '1. Parent Event',
      desc: 'Ramesh sir experiences a Blood Pressure spike (142/90 mmHg).'
    },
    {
      label: '2. State Logged',
      desc: 'Shared database registers the new Omron monitor BP stream.'
    },
    {
      label: '3. AI Diagnostic',
      desc: 'KinGuardian AI detects Chennai temperature correlation & step drop.'
    },
    {
      label: '4. Proxy Insight',
      desc: 'Anjali gets push notification and red warning dashboard card.'
    },
    { label: '5. Proxy Action', desc: 'Anjali goes to care channel to alert caregiver Suresh.' },
    {
      label: '6. Nurse Response',
      desc: 'Suresh checks Ramesh sir, gives fluids, and logs verification.'
    },
    {
      label: '7. Resolved Loop',
      desc: 'Vitals return to normal and warnings clear. Loop complete!'
    }
  ];

  return (
    <View className="w-full bg-[#0f172a] border-t border-slate-800 p-4 shrink-0">
      <View className="max-w-2xl mx-auto space-y-4">
        {/* Scenario Switcher Selector Panel */}
        <View className="bg-slate-900 rounded-2xl p-4 border border-slate-850 space-y-3">
          <View className="flex-row items-center gap-1.5">
            <Layers size={12} color="#f59e0b" />
            <Text className="text-[10px] font-black text-white uppercase tracking-wider">
              Quick Switch Demo Scenarios
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
            {[
              { key: 'normal', label: 'Calming Normal' },
              { key: 'medication-missed', label: 'Med Missed' },
              { key: 'guardian-moment', label: 'Guardian BP' },
              { key: 'stale-sync', label: '14h Stale Sync' },
              { key: 'new-lab-report', label: 'New Lab Report' },
              { key: 'upcoming-appointment', label: 'Appointment' },
              { key: 'parent-feeling-unwell', label: 'Parent Unwell' }
            ].map((scen) => {
              const isActive = currentScenario === scen.key;
              return (
                <TouchableOpacity
                  key={scen.key}
                  onPress={() => onSwitchScenario && onSwitchScenario(scen.key as DemoScenario)}
                  className={`px-3.5 py-2.5 rounded-xl border active:scale-95 mr-2 ${
                    isActive ? 'bg-[#2a14b4] border-[#c3c0ff]' : 'bg-slate-955 border-slate-800'
                  }`}
                >
                  <Text
                    className={`text-[9px] font-black uppercase ${isActive ? 'text-white' : 'text-slate-400'}`}
                  >
                    {scen.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Core Loop Walkthrough visual panel */}
        <View className="bg-slate-900 rounded-2xl p-4 border border-slate-850 space-y-3">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center gap-1.5">
              <RefreshCw size={12} color="#3b82f6" />
              <Text className="text-[10px] font-black text-white uppercase tracking-wider">
                Core Product Loop Walkthrough
              </Text>
            </View>
            {currentLoopStep > 0 && (
              <TouchableOpacity onPress={onResetLoop}>
                <Text className="text-[9px] text-slate-400 font-bold underline">Reset Loop</Text>
              </TouchableOpacity>
            )}
          </View>

          {currentLoopStep === 0 ? (
            <View className="flex-row items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              <View className="flex-1 pr-2">
                <Text className="text-xs font-black text-slate-200">
                  Demonstrate KinGuardian's End-to-End Loop
                </Text>
                <Text className="text-[9px] text-slate-400 font-medium">
                  Trace a Chennai vitals spike as it propagates and resolves.
                </Text>
              </View>
              <TouchableOpacity
                onPress={onAdvanceLoop}
                className="bg-[#2a14b4] px-4 py-2 rounded-xl active:scale-95"
              >
                <Text className="text-white text-xs font-black">Launch</Text>
              </TouchableOpacity>
            </View>

          ) : (
            <View className="space-y-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
              <View className="flex-row justify-between items-center text-[10px] font-black text-[#f59e0b] uppercase tracking-wide">
                <Text className="text-[#f59e0b] font-black text-[10px] uppercase">
                  {steps[currentLoopStep - 1].label}
                </Text>
                <Text className="text-slate-400 font-bold">Step {currentLoopStep} of 7</Text>
              </View>

              <Text className="text-xs text-slate-200 font-medium leading-relaxed">
                {steps[currentLoopStep - 1].desc}
              </Text>

              <TouchableOpacity
                onPress={onAdvanceLoop}
                className="w-full py-2.5 bg-[#4338ca] rounded-xl items-center justify-center active:scale-95"
              >
                <Text className="text-white text-xs font-black">
                  {currentLoopStep === 7
                    ? 'Restart Simulation'
                    : `Advance to Step ${currentLoopStep + 1}`}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Dots */}
          <View className="flex-row justify-center gap-1.5 pt-1">
            {steps.map((_, idx) => (
              <View
                key={idx}
                className={`w-1.5 h-1.5 rounded-full ${
                  idx + 1 === currentLoopStep
                    ? 'bg-[#f59e0b]'
                    : idx + 1 < currentLoopStep
                      ? 'bg-[#059669]'
                      : 'bg-slate-700'
                }`}
              />
            ))}
          </View>
        </View>

        {/* Traditional Raw Ingestions */}
        <View className="space-y-2.5 pt-1 border-t border-slate-800/55">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Wrench size={12} color="#777586" />
              <Text className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Manual Telemetry Override Bypasses
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-2">
            <TouchableOpacity
              onPress={() => onTriggerNotification('bp_spike')}
              className="flex-1 bg-slate-900 border border-slate-800 py-2.5 rounded-xl items-center justify-center active:scale-95"
            >
              <Text className="text-white text-[10px] font-black uppercase">BP Spike</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onTriggerNotification('missed_med')}
              className="flex-1 bg-slate-900 border border-slate-800 py-2.5 rounded-xl items-center justify-center active:scale-95"
            >
              <Text className="text-white text-[10px] font-black uppercase">Missed Dose</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onTriggerNotification('cgm_sync')}
              className="flex-1 bg-slate-900 border border-slate-800 py-2.5 rounded-xl items-center justify-center active:scale-95"
            >
              <Text className="text-white text-[10px] font-black uppercase">CGM Sync</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onTriggerNotification('suresh_log')}
              className="flex-1 bg-slate-900 border border-slate-800 py-2.5 rounded-xl items-center justify-center active:scale-95"
            >
              <Text className="text-white text-[10px] font-black uppercase">Suresh Log</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSimulateOutage}
              className="flex-1 bg-amber-950/70 border border-amber-600/80 py-2.5 rounded-xl items-center justify-center active:scale-95"
            >
              <Text className="text-amber-300 text-[10px] font-black uppercase">⚡ Outage (504)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleRestoreOutage}
              className="flex-1 bg-emerald-950/70 border border-emerald-600/80 py-2.5 rounded-xl items-center justify-center active:scale-95"
            >
              <Text className="text-emerald-300 text-[10px] font-black uppercase">🔄 Restore API</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};
