import { useContext } from 'react';
import { View } from 'react-native';
import { AppContext } from '../../../../src/store/AppContext';
import { VitalsDetailScreen } from '../../../../src/components/VitalsDetailScreen';
import { DeviceFrame } from '../../../../src/components/DeviceFrame';
import { SimulatorControls } from '../../../../src/components/SimulatorControls';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function ParentDetailRoute() {
  const context = useContext(AppContext);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: 'dad' | 'mom' }>();

  if (!context) return null;

  const personId = id || 'dad';

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-[#f8f9ff]">
        <VitalsDetailScreen
          personId={personId}
          onBack={() => router.replace('/(coordinator)')}
          onLogBP={context.handleManualBPLog}
          onLogGlucose={context.handleManualGlucoseLog}
          readingsHistory={personId === 'dad' ? context.bpHistory : context.glucoseHistory}
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
