import { render, fireEvent, screen } from '@testing-library/react-native';
import {
  ConnectionStatus,
  SyncStatus,
  PermissionSummary,
  WearableProviderPicker,
  WearableConnectionCard,
  ConnectWearableSheet,
  ReconnectWearableSheet
} from '../src/components/wearables';

describe('Wearable Reusable Mobile Components', () => {
  it('renders ConnectionStatus badge for different states', async () => {
    const { rerender } = await render(<ConnectionStatus status="connected" />);
    expect(screen.getByText('Connected')).toBeTruthy();

    await rerender(<ConnectionStatus status="up_to_date" />);
    expect(screen.getByText('Up to date')).toBeTruthy();

    await rerender(<ConnectionStatus status="syncing" />);
    expect(screen.getByText('Syncing...')).toBeTruthy();

    await rerender(<ConnectionStatus status="error" />);
    expect(screen.getByText('Sync Error')).toBeTruthy();
  });

  it('renders SyncStatus with non-diagnostic safety disclaimer when delayed/error', async () => {
    await render(
      <SyncStatus
        status="delayed"
        relativeTimeText="Last sync: 12 hours ago"
        isHealthEvent={false}
      />
    );

    expect(screen.getByText('Sync Delayed')).toBeTruthy();
    expect(screen.getByText('Last sync: 12 hours ago')).toBeTruthy();
    expect(screen.getByText('Operational device state — not a health event.')).toBeTruthy();
  });

  it('renders PermissionSummary with unbundled scopes and descriptions', async () => {
    const permissions = [
      {
        scope: 'view_wearable_summary' as const,
        label: 'Health Summary & Highlights',
        description: 'Wellness scores and Guardian Moments.',
        granted: true
      },
      {
        scope: 'view_wearable_sleep' as const,
        label: 'Sleep Architecture',
        description: 'Sleep duration and stages.',
        granted: false
      }
    ];

    await render(<PermissionSummary permissions={permissions} />);
    expect(screen.getByText('Health Summary & Highlights')).toBeTruthy();
    expect(screen.getByText('Sleep Architecture')).toBeTruthy();
    expect(screen.getByText('Permissions are unbundled and independently revocable at any time.')).toBeTruthy();
  });

  it('renders WearableProviderPicker and selects provider', async () => {
    const onSelectMock = jest.fn();
    await render(
      <WearableProviderPicker
        selectedProvider="apple_health"
        onSelectProvider={onSelectMock}
      />
    );

    expect(screen.getByText('Apple Health & Watch')).toBeTruthy();
    expect(screen.getByText('Garmin Connect')).toBeTruthy();
    expect(screen.getByText('Oura Ring')).toBeTruthy();

    fireEvent.press(screen.getByText('Garmin Connect'));
    expect(onSelectMock).toHaveBeenCalledWith('garmin');
  });

  it('renders WearableConnectionCard with coordinator perspective', async () => {
    const onReconnectMock = jest.fn();
    await render(
      <WearableConnectionCard
        device={{
          id: 'garmin-1',
          provider: 'garmin',
          deviceName: 'Garmin Venu 3',
          rolePerspectiveTitle: "Dad's Garmin",
          status: 'error',
          relativeTimeText: 'Last sync: 12 hours ago',
          isHealthEvent: false
        }}
        onReconnectPress={onReconnectMock}
        isCoordinatorView={true}
      />
    );

    expect(screen.getByText("Dad's Garmin")).toBeTruthy();
    expect(screen.getByText('Reconnect')).toBeTruthy();
    fireEvent.press(screen.getByText('Reconnect'));
    expect(onReconnectMock).toHaveBeenCalled();
  });

  it('renders ConnectWearableSheet with multi-step flow', async () => {
    const onConnectMock = jest.fn().mockResolvedValue(undefined);
    const onCloseMock = jest.fn();

    await render(
      <ConnectWearableSheet
        visible={true}
        onClose={onCloseMock}
        onConnect={onConnectMock}
        careSubjectName="Dad"
      />
    );

    expect(screen.getByText('Connect Health Device')).toBeTruthy();
    expect(screen.getByText('Continue')).toBeTruthy();

    fireEvent.press(screen.getByText('Continue'));
    expect(await screen.findByText('Review Sharing Permissions')).toBeTruthy();
    expect(await screen.findByText('Zero-Credential Security')).toBeTruthy();
  });


  it('renders ReconnectWearableSheet with role perspective headlines', async () => {
    // Coordinator Perspective
    const { rerender } = await render(
      <ReconnectWearableSheet
        visible={true}
        onClose={jest.fn()}
        onReconnect={jest.fn()}
        provider="garmin"
        deviceName="Garmin Watch"
        isCoordinatorView={true}
        careSubjectName="Dad"
        hoursSinceLastSync={12}
      />
    );
    expect(screen.getByText("Dad's Garmin hasn't synced for 12 hours.")).toBeTruthy();
    expect(screen.getByText('Missing wearable telemetry is never interpreted as a health or medical event.')).toBeTruthy();

    // Parent Perspective
    await rerender(
      <ReconnectWearableSheet
        visible={true}
        onClose={jest.fn()}
        onReconnect={jest.fn()}
        provider="garmin"
        deviceName="Garmin Watch"
        isCoordinatorView={false}
      />
    );
    expect(screen.getByText('Your health device needs to reconnect.')).toBeTruthy();
  });
});
