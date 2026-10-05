import { useContext } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppContext } from '../../../../src/store/AppContext';
import { TransparencyInsightScreen } from '../../../../src/components/TransparencyInsightScreen';
import { DeviceFrame } from '../../../../src/components/DeviceFrame';
import { SimulatorControls } from '../../../../src/components/SimulatorControls';

export default function ParentInsightsRoute() {
  const context = useContext(AppContext);
  const router = useRouter();
  const { id } = useLocalSearchParams();

  if (!context) return null;

  const personId = typeof id === 'string' ? id : 'dad';
  const personName =
    context.people.find((person) => person.id === personId || person.backendSubjectId === personId)?.name ||
    context.familyMembers.find((person) => person.id === personId || person.backendSubjectId === personId)?.name ||
    'Parent';
  const observation =
    context.observations[personId] ||
    context.observations['dad'] || {
      id: personId,
      title: `${personName}'s Health Review`,
      highlightText: 'Wearable activity index dropped 35% during Chennai heatwave index (39°C). Evening systolic BP showed a mild variance of 138/88 mmHg.',
      explanation: 'Continuous telemetry shows an inverse relationship between outdoor peak temperatures and walking steps. Indoor hydration and rest recommended.',
      dataSources: ['Dexcom G7 CGM', 'Google Fit App (Android Live)', 'Metropolis Healthcare Fasting Panel']
    };

  return (
    <DeviceFrame>
      <View testID="insights-screen" className="flex-1 relative bg-[#fbfaf7]">
        <TransparencyInsightScreen
          observation={observation}
          personName={personName}
          onBack={() => router.back()}
          onAskFollowUp={(query) => {
            context.setAskAIQuery(query);
            context.setAskAIOpen(true);
            router.push('/(coordinator)/ask');
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
