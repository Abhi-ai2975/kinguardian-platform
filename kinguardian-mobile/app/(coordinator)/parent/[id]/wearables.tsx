import { useContext } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppContext } from '../../../../src/store/AppContext';
import { WearablesManagementScreen } from '../../../../src/components/WearablesManagementScreen';
import { DeviceFrame } from '../../../../src/components/DeviceFrame';
import { SimulatorControls } from '../../../../src/components/SimulatorControls';

export default function ParentWearablesRoute() {
  const context = useContext(AppContext);
  const router = useRouter();
  const { id } = useLocalSearchParams();

  if (!context) return null;

  const personId = typeof id === 'string' ? id : 'dad';
  const person =
    context.people.find((p) => p.id === personId || p.backendSubjectId === personId) ||
    context.people[0];

  return (
    <DeviceFrame>
      <View testID="wearables-screen" className="flex-1 relative bg-[#f8f9fa]">
        <WearablesManagementScreen
          personId={personId}
          parentName={person?.name || 'Parent'}
          onBack={() => router.back()}
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
