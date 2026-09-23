import { useContext } from 'react';
import { View } from 'react-native';
import { AppContext } from '../../src/store/AppContext';
import { CareView } from '../../src/components/CareView';
import { BottomNavBar } from '../../src/components/Navigation';
import { DeviceFrame } from '../../src/components/DeviceFrame';
import { SimulatorControls } from '../../src/components/SimulatorControls';
import { useRouter } from 'expo-router';

export default function CoordinatorCareRoute() {
  const context = useContext(AppContext);
  const router = useRouter();

  if (!context) return null;

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-[#f8f9ff]">
        <CareView
          records={context.records}
          onOpenQuickActions={() => context.setQuickActionsOpen(true)}
          onAskAI={(q) => {
            context.setAskAIQuery(q);
            context.setAskAIOpen(true);
          }}
          syncLogs={context.syncLogs}
          onTriggerSync={context.handleWearableSyncRefresh}
          isSyncing={context.isSyncing}
          people={context.people}
        />
        <BottomNavBar
          activeTab="care"
          currentScreen="care_view"
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
