/**
 * KinGuardian Mobile Health Data Connection & Native Adapter Test Suite.
 *
 * Verifies:
 * 1. HealthDataConnection interface abstraction:
 *    - connect(): Promise<void>
 *    - disconnect(): Promise<void>
 *    - getStatus(): Promise<ConnectionStatus>
 * 2. React Native screens interact strictly via HealthDataConnection,
 *    never coupled directly to vendor / Open Wearables SDK APIs.
 * 3. OpenWearablesNativeAdapter bridges Apple HealthKit / Health Connect.
 * 4. Error isolation and lifecycle state transitions.
 */

import {
  HealthDataConnection,
  OpenWearablesNativeAdapter,
  OpenWearablesNativeBridge,
  HealthDataConnectionManager
} from '../src/services/health';


describe('HealthDataConnection Abstraction & OpenWearablesNativeAdapter', () => {
  beforeEach(() => {
    HealthDataConnectionManager.reset();
  });

  it('should conform to HealthDataConnection interface and lifecycle methods', async () => {
    const mockBridge: OpenWearablesNativeBridge = {
      initialize: jest.fn().mockResolvedValue(true),
      requestPermissions: jest.fn().mockResolvedValue(true),
      disconnectProvider: jest.fn().mockResolvedValue(true),
      fetchLatestTelemetry: jest.fn().mockResolvedValue([
        { metric: 'steps', value: 6200, timestamp: new Date().toISOString() }
      ]),
      checkHealthStoreAvailability: jest.fn().mockResolvedValue(true)
    };

    const connection: HealthDataConnection = new OpenWearablesNativeAdapter(
      mockBridge,
      'apple_health'
    );

    // 1. Initial status: disconnected
    expect(await connection.getStatus()).toBe('disconnected');

    // 2. Connect: requests permissions and initializes
    await connection.connect();
    expect(mockBridge.initialize).toHaveBeenCalled();
    expect(mockBridge.requestPermissions).toHaveBeenCalledWith([
      'view_wearable_summary',
      'view_wearable_activity',
      'view_wearable_sleep',
      'view_wearable_heart_rate'
    ]);
    expect(await connection.getStatus()).toBe('connected');

    // 3. Sync Telemetry
    if (connection.syncRecentData) {
      const syncResult = await connection.syncRecentData();
      expect(syncResult.recordsProcessed).toBe(1);
      expect(syncResult.status).toBe('up_to_date');
      expect(await connection.getStatus()).toBe('up_to_date');
    }

    // 4. Disconnect
    await connection.disconnect();
    expect(mockBridge.disconnectProvider).toHaveBeenCalled();
    expect(await connection.getStatus()).toBe('disconnected');
  });

  it('should decouple React Native screens from raw SDK through HealthDataConnectionManager', async () => {
    const mockBridge: OpenWearablesNativeBridge = {
      initialize: jest.fn().mockResolvedValue(true),
      requestPermissions: jest.fn().mockResolvedValue(true),
      disconnectProvider: jest.fn().mockResolvedValue(true),
      fetchLatestTelemetry: jest.fn().mockResolvedValue([]),
      checkHealthStoreAvailability: jest.fn().mockResolvedValue(true)
    };

    // Screens obtain connection purely through the abstraction
    const connection: HealthDataConnection = HealthDataConnectionManager.getConnection(
      'health_connect',
      mockBridge
    );

    expect(connection.provider).toBe('health_connect');
    expect(await connection.getStatus()).toBe('disconnected');

    await connection.connect();
    expect(await connection.getStatus()).toBe('connected');
  });

  it('should handle permission denial gracefully with error status without crashing UI', async () => {
    const mockBridge: OpenWearablesNativeBridge = {
      initialize: jest.fn().mockResolvedValue(true),
      requestPermissions: jest.fn().mockResolvedValue(false), // User denied permissions
      disconnectProvider: jest.fn().mockResolvedValue(true),
      fetchLatestTelemetry: jest.fn().mockResolvedValue([]),
      checkHealthStoreAvailability: jest.fn().mockResolvedValue(true)
    };

    const connection: HealthDataConnection = new OpenWearablesNativeAdapter(
      mockBridge,
      'apple_health'
    );

    await expect(connection.connect()).rejects.toThrow('User denied health store permissions');
    expect(await connection.getStatus()).toBe('error');
  });
});
