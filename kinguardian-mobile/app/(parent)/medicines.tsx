import { useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { AppContext } from '../../src/store/AppContext';
import { ParentBottomNavBar } from '../../src/components/Navigation';
import { DeviceFrame } from '../../src/components/DeviceFrame';
import { SimulatorControls } from '../../src/components/SimulatorControls';
import { useRouter } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';

export default function ParentMedicinesRoute() {
  const context = useContext(AppContext);
  const router = useRouter();

  if (!context) return null;

  const coordName = context.coordinatorName || 'Coordinator';
  const userName = context.currentUser?.name || 'Your';

  // Filter for user's medicines dynamically
  const userMeds = context.medications.filter(
    (m) => !m.personId || m.personId === context.currentPersonId || m.personId === context.currentUser?.id || m.personId === 'dad'
  );

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-[#f2f2f7]">
        {/* Header */}
        <View className="bg-white pt-6 pb-5 px-6 border-b border-neutral-100 space-y-0.5">
          <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            {context.currentUser?.name ? `${userName}'s Daily Checklist` : "Daily Medication Checklist"}
          </Text>
          <Text
            testID="parent-medicines-title"
            accessibilityLabel="Today's Medicines"
            className="text-2xl font-bold text-neutral-900 tracking-tight"
          >
            Today's Medicines
          </Text>
        </View>

        <ScrollView testID="parent-medicines-list" className="flex-1 p-5 space-y-5">
          {userMeds.some((m) => m.id === 'rec-5' && m.status !== 'taken') && (
            <View className="bg-orange-50 border border-orange-100/50 rounded-2xl p-4 mb-1.5 shadow-sm">
              <Text className="text-sm font-bold text-neutral-800">
                {context.notifications.some(
                  (n) => n.recipient === 'parent' && n.category === 'medication_reminder' && !n.read
                )
                  ? `${coordName} sent you a reminder.`
                  : 'Did you take your evening medicine?'}
              </Text>
              <Text className="text-xs text-neutral-500 font-semibold leading-relaxed mt-1">
                {context.notifications.some(
                  (n) => n.recipient === 'parent' && n.category === 'medication_reminder' && !n.read
                )
                  ? `${coordName} wants to make sure you confirm your evening dose of Atorvastatin 20mg.`
                  : 'Please check your medication card below and confirm if you have taken your dinner doses.'}
              </Text>
            </View>
          )}

          <View className="space-y-4">
            {userMeds.length === 0 ? (
              <View
                testID="parent-medicines-empty"
                accessibilityLabel="No scheduled medications"
                className="bg-white rounded-2xl p-8 items-center justify-center border border-neutral-100 shadow-sm"
              >
                <Text className="text-base font-bold text-neutral-700">No scheduled medications</Text>
                <Text className="text-xs text-neutral-400 text-center mt-1">
                  All your medications are up to date and recorded in your care circle.
                </Text>
              </View>
            ) : (
              userMeds.map((med) => {
              const isTaken = med.status === 'taken';
              return (
                <View
                  key={med.id}
                  testID={`parent-medicines-item-${med.id}`}
                  accessibilityLabel={`${med.name} ${med.dose} scheduled at ${med.scheduledTime}, ${isTaken ? 'taken' : 'upcoming'}`}
                  className={`bg-white rounded-2xl p-5 shadow-sm shadow-neutral-100 space-y-4 border-l-4 ${
                    isTaken ? 'border-[#34c759]' : 'border-[#ff9500]'
                  }`}
                >
                  <View className="flex-row justify-between items-center">
                    <Text
                      testID={`parent-medicines-time-${med.id}`}
                      className="text-xs font-semibold text-neutral-400"
                    >
                      {med.scheduledTime}
                    </Text>
                    <View
                      testID={`parent-medicines-status-${med.id}`}
                      className={`px-3 py-1 rounded-full ${isTaken ? 'bg-[#34c759]' : 'bg-orange-50'}`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${isTaken ? 'text-white' : 'text-[#ff9500]'}`}
                      >
                        {isTaken ? '✓ Taken' : 'Upcoming'}
                      </Text>
                    </View>
                  </View>

                  <View className="space-y-1">
                    <Text
                      testID={`parent-medicines-name-${med.id}`}
                      className="text-3xl font-bold text-neutral-800 leading-none"
                    >
                      {med.name}
                    </Text>
                    <Text
                      testID={`parent-medicines-dose-${med.id}`}
                      className="text-lg font-bold text-neutral-400 mt-1"
                    >
                      {med.dose}
                    </Text>
                  </View>

                  {!isTaken ? (
                    <TouchableOpacity
                      testID={`parent-medicines-mark-taken-${med.id}`}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={`Mark ${med.name} ${med.dose} as taken`}
                      accessibilityHint={`Confirms scheduled ${med.scheduledTime} dose of ${med.name}`}
                      onPress={() => {
                        context.markMedicationTaken(med.id);
                        context.showToast(`${med.name} dose checked off successfully.`);
                      }}
                      className="w-full bg-[#007aff] py-3.5 rounded-xl items-center justify-center active:opacity-90 mt-2 min-h-[48px]"
                    >
                      <Text className="text-white font-bold text-sm">Mark as taken</Text>
                    </TouchableOpacity>
                  ) : (
                    <View
                      testID={`parent-medicines-confirmed-${med.id}`}
                      accessibilityLabel={`${med.name} dose logged in care circle`}
                      className="w-full py-3 bg-emerald-50 rounded-xl items-center justify-center flex-row gap-2 mt-2 min-h-[44px]"
                    >
                      <CheckCircle2 size={15} color="#34c759" />
                      <Text className="text-[#34c759] text-xs font-bold">
                        Dose logged in Care circle
                      </Text>
                    </View>
                  )}
                </View>
              );
            }))}
          </View>
          <View className="h-28" />
        </ScrollView>

        <ParentBottomNavBar
          activeTab="medicines"
          onTabChange={(tab) => {
            if (tab === 'home') router.push('/(parent)');
            else if (tab === 'profile') router.push('/(parent)/profile');
            else if (tab === 'ask') router.push('/(parent)/ask');
          }}
        />
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
