import { useContext } from 'react';
import { View } from 'react-native';
import { AppContext } from '../../src/store/AppContext';
import { SearchRecordsScreen } from '../../src/components/SearchRecordsScreen';
import { BottomNavBar } from '../../src/components/Navigation';
import { DeviceFrame } from '../../src/components/DeviceFrame';
import { SimulatorControls } from '../../src/components/SimulatorControls';
import { useRouter } from 'expo-router';

export default function CoordinatorRecordsRoute() {
  const context = useContext(AppContext);
  const router = useRouter();

  if (!context) return null;

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-[#f8f9ff]">
        <SearchRecordsScreen
          records={context.records}
          recentSearches={context.recentSearches}
          onBack={() => router.push('/(coordinator)')}
          onSelectRecord={(rec) => {
            context.setAskAIQuery(`Tell me more about the clinical record "${rec.title}"`);
            context.setAskAIOpen(true);
          }}
          onAskAIQuery={(q) => {
            context.setAskAIQuery(q);
            context.setAskAIOpen(true);
          }}
          onClearRecentSearches={() => context.setRecentSearches([])}
          onRemoveRecentSearch={(s) =>
            context.setRecentSearches((prev) => prev.filter((item) => item !== s))
          }
          documents={context.documents}
          onAddDocument={context.handleUploadDocument}
          showToast={context.showToast}
        />
        <BottomNavBar
          activeTab="parents"
          currentScreen="search_records"
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
