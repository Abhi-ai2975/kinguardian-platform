import { useContext } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppContext } from '../../../../src/store/AppContext';
import { VitalsDetailScreen } from '../../../../src/components/VitalsDetailScreen';
import { DeviceFrame } from '../../../../src/components/DeviceFrame';
import { SimulatorControls } from '../../../../src/components/SimulatorControls';

export default function ParentVitalsRoute() {
  const context = useContext(AppContext);
  const router = useRouter();
  const { id } = useLocalSearchParams();

  if (!context) return null;

  const personId = typeof id === 'string' ? id : 'dad';

  return (
    <DeviceFrame>
      <View testID="vitals-screen" className="flex-1 relative bg-[#fbfaf7]">
        <VitalsDetailScreen
          personId={personId}
          onBack={() => router.back()}
          onLogBP={(v) => {
            context.handleManualBPLog(v);
            context.showToast(`Blood pressure ${v.systolic}/${v.diastolic} logged successfully.`);
          }}
          onLogGlucose={(val, note) => {
            context.handleManualGlucoseLog(val, note);
            context.showToast(`Glucose ${val} mg/dL logged successfully.`);
          }}
          readingsHistory={context.bpHistory || []}
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
