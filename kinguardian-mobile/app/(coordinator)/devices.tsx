import { useContext } from 'react';
import { View } from 'react-native';
import { AppContext } from '../../src/store/AppContext';
import { WearablesManagementScreen } from '../../src/components/WearablesManagementScreen';
import { BottomNavBar } from '../../src/components/Navigation';
import { DeviceFrame } from '../../src/components/DeviceFrame';
import { SimulatorControls } from '../../src/components/SimulatorControls';
import { useRouter } from 'expo-router';

export default function CoordinatorDevicesRoute() {
  const context = useContext(AppContext);
  const router = useRouter();

  if (!context) return null;

  const people = context.people.length > 0 ? context.people : context.familyMembers;
  const currentPerson =
    people.find((p) => p.id === context.currentPersonId || p.backendSubjectId === context.currentPersonId) ||
    people[0];

  const dynamicParentName = currentPerson?.name
    ? `${currentPerson.name} (${currentPerson.relation || currentPerson.relationship || 'Parent'})`
    : 'Parent';

  return (
    <DeviceFrame>
      <View testID="coordinator-devices-screen" className="flex-1 relative bg-[#f8f9fa]">
        <WearablesManagementScreen
          personId={currentPerson?.backendSubjectId || currentPerson?.id || context.currentPersonId}
          parentName={dynamicParentName}
          onBack={() => router.push('/(coordinator)')}
        />
        <BottomNavBar
          activeTab="parents"
          currentScreen="health_dashboard"
          onTabChange={(tab) => {
            if (tab === 'home') router.push('/(coordinator)');
            else if (tab === 'parents') router.push('/(coordinator)/parents');
            else if (tab === 'ask') context.setAskAIOpen(true);
            else if (tab === 'care') router.push('/(coordinator)/care');
            else if (tab === 'profile') router.push('/(coordinator)/profile');
          }}
          onOpenQuickActions={() => context.setQuickActionsOpen(true)}
          onOpenAskAI={() => context.setAskAIOpen(true)}
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
