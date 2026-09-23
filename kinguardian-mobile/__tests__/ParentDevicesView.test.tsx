import { render, fireEvent, screen } from '@testing-library/react-native';
import { ParentDevicesView } from '../src/components/wearables';

describe('Parent Mobile UI - My Health Devices', () => {
  it('renders Parent Mode with Apple Watch, Connected status, Last updated 8 minutes ago, and Manage device CTA', async () => {
    await render(<ParentDevicesView />);

    // Header
    expect(screen.getByText('Parent Mode')).toBeTruthy();
    expect(screen.getByText('My health devices')).toBeTruthy();

    // Device & Status
    expect(screen.getByText('Apple Watch')).toBeTruthy();
    expect(screen.getByText('Connected')).toBeTruthy();

    // Last updated
    expect(screen.getByText('Last updated')).toBeTruthy();
    expect(screen.getByText('8 minutes ago')).toBeTruthy();

    // Primary CTA
    expect(screen.getByText('Manage device')).toBeTruthy();
  });

  it('tapping Manage device opens simple action modal without raw technical provider configs', async () => {
    await render(<ParentDevicesView />);

    fireEvent.press(screen.getByText('Manage device'));

    expect(await screen.findByText('Manage Apple Watch')).toBeTruthy();
    expect(await screen.findByText('Sync health data now')).toBeTruthy();
    expect(await screen.findByText('Disconnect this device')).toBeTruthy();
    expect(
      await screen.findByText('Your device data is encrypted and private to your care circle.')
    ).toBeTruthy();
  });
});
