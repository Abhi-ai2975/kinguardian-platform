import { render, screen } from '@testing-library/react-native';
import {
  WearableHomeSummaryCard,
  DEFAULT_MEANINGFUL_METRICS
} from '../src/components/wearables';

describe('Wearable Home Summary Card - Coordinator Home', () => {
  it('renders meaningful wearable insights for Dad with steps, sleep, and baseline deviations', async () => {
    await render(
      <WearableHomeSummaryCard
        personName="Dad"
        statusHeadline="Doing well"
        meaningfulMetrics={DEFAULT_MEANINGFUL_METRICS}
        sourceProviderName="Garmin"
      />
    );

    // Subject and Wellness Status
    expect(screen.getByText('Dad')).toBeTruthy();
    expect(screen.getByText('Doing well')).toBeTruthy();

    // Activity Metric
    expect(screen.getByText('Activity')).toBeTruthy();
    expect(screen.getByText('5,430 steps')).toBeTruthy();
    expect(screen.getByText('↓ 12% from usual')).toBeTruthy();

    // Sleep Metric
    expect(screen.getByText('Sleep')).toBeTruthy();
    expect(screen.getByText('6h 42m')).toBeTruthy();
    expect(screen.getByText('↓ 36m from usual')).toBeTruthy();
  });

  it('suppresses display when no meaningful metrics are present (does not dump raw data automatically)', async () => {
    const { toJSON } = await render(
      <WearableHomeSummaryCard
        personName="Dad"
        statusHeadline="Doing well"
        meaningfulMetrics={[]}
      />
    );

    expect(toJSON()).toBeNull();
  });
});
