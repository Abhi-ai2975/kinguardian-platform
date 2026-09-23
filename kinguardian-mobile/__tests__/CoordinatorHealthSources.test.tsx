import { render, fireEvent, screen } from '@testing-library/react-native';
import {
  CoordinatorHealthSourcesView,
  DEFAULT_COORDINATOR_SOURCES
} from '../src/components/wearables';

describe('Coordinator Mobile UI - Parent Profile Health Sources', () => {
  it('renders Parent profile Health Sources list with Garmin, Apple Health, and Fitbit', async () => {
    await render(
      <CoordinatorHealthSourcesView
        parentName="Parent profile"
        sources={DEFAULT_COORDINATOR_SOURCES}
      />
    );

    expect(screen.getByText('Parent profile')).toBeTruthy();
    expect(screen.getByText('Health Sources')).toBeTruthy();

    // Garmin -> Connected
    expect(screen.getByText('Garmin')).toBeTruthy();

    // Apple Health -> Connected
    expect(screen.getByText('Apple Health')).toBeTruthy();

    // Fitbit -> Not connected
    expect(screen.getByText('Fitbit')).toBeTruthy();
    expect(screen.getByText('Not connected')).toBeTruthy();
  });

  it('tapping Garmin reveals Activity, Sleep, Heart rate, and Last synced 8 minutes ago', async () => {
    await render(
      <CoordinatorHealthSourcesView
        parentName="Parent profile"
        sources={DEFAULT_COORDINATOR_SOURCES}
      />
    );

    // Tap Garmin
    fireEvent.press(screen.getByText('Garmin'));

    // Verify detailed inspect modal content
    expect(await screen.findByText('Activity')).toBeTruthy();
    expect(await screen.findByText('Sleep')).toBeTruthy();
    expect(await screen.findByText('Heart rate')).toBeTruthy();
    expect(await screen.findByText('Last synced')).toBeTruthy();
    expect(await screen.findByText('8 minutes ago')).toBeTruthy();
  });
});
