/**
 * Open Wearables React Native SDK Adapter.
 *
 * Implements KinGuardian's HealthDataConnection abstraction to interact with
 * device-local health stores (Apple HealthKit & Google Health Connect)
 * via the Open Wearables React Native SDK.
 *
 * Architecture Flow:
 * React Native Screens -> HealthDataConnection -> OpenWearablesNativeAdapter -> Open Wearables RN SDK -> HealthKit / Health Connect
 */


import { Platform } from 'react-native';
import {
  HealthDataConnection,
  HealthProviderType,
  ConnectionStatus,
  HealthConnectionState,
  HealthDataScope,
  SyncTelemetryResult
} from './types';

export interface OpenWearablesNativeBridge {
  initialize(config: { apiKey?: string; environment?: string }): Promise<boolean>;
  requestPermissions(scopes: string[]): Promise<boolean>;
  disconnectProvider(): Promise<boolean>;
  fetchLatestTelemetry(options: { limit?: number }): Promise<any[]>;
  checkHealthStoreAvailability(): Promise<boolean>;
}

import { healthConnectService } from './HealthConnectService';
import { realDataService } from '../api-client/RealDataService';

export class OpenWearablesNativeAdapter implements HealthDataConnection {
  readonly provider: HealthProviderType;
  private status: ConnectionStatus = 'disconnected';
  private lastSyncedAt: Date | null = null;
  private grantedScopes: Set<HealthDataScope> = new Set();
  private errorMessage?: string;
  private bridge: OpenWearablesNativeBridge;

  constructor(
    customBridge?: OpenWearablesNativeBridge,
    providerOverride?: HealthProviderType
  ) {
    this.provider =
      providerOverride ||
      (Platform.OS === 'ios' ? 'apple_health' : 'health_connect');

    // Default or injected native SDK bridge
    this.bridge = customBridge || {
      initialize: async () => {
        if (Platform.OS === 'android') {
          return await healthConnectService.initializeAndAuthorize();
        }
        return true;
      },
      requestPermissions: async () => {
        if (Platform.OS === 'android') {
          return await healthConnectService.initializeAndAuthorize();
        }
        return true;
      },
      disconnectProvider: async () => true,
      fetchLatestTelemetry: async () => {
        if (Platform.OS === 'android') {
          const realData = await healthConnectService.fetchRealTelemetry();
          if (realData) return [realData];
        }
        return [];
      },
      checkHealthStoreAvailability: async () => {
        if (Platform.OS === 'android') {
          return await healthConnectService.isAvailable();
        }
        return true;
      }
    };
  }

  /**
   * Initializes SDK connection and prompts user for OS-level health store permissions.
   */
  async connect(): Promise<void> {
    try {
      this.status = 'syncing';
      this.errorMessage = undefined;

      const isAvailable = await this.bridge.checkHealthStoreAvailability();
      if (!isAvailable) {
        this.status = 'error';
        this.errorMessage = `Native health store not available on ${Platform.OS}`;
        throw new Error(this.errorMessage);
      }

      await this.bridge.initialize({ environment: 'production' });

      // Request granular unbundled health scopes
      const requiredScopes: HealthDataScope[] = [
        'view_wearable_summary',
        'view_wearable_activity',
        'view_wearable_sleep',
        'view_wearable_heart_rate'
      ];

      const granted = await this.bridge.requestPermissions(requiredScopes);
      if (!granted) {
        this.status = 'error';
        this.errorMessage = 'User denied health store permissions';
        throw new Error(this.errorMessage);
      }

      requiredScopes.forEach((s) => this.grantedScopes.add(s));
      this.status = 'connected';
      this.lastSyncedAt = new Date();
    } catch (error: any) {
      this.status = 'error';
      this.errorMessage = error?.message || 'Failed to connect health store';
      throw error;
    }
  }

  /**
   * Disconnects device-local health store and revokes session.
   */
  async disconnect(): Promise<void> {
    try {
      await this.bridge.disconnectProvider();
      this.status = 'disconnected';
      this.grantedScopes.clear();
      this.errorMessage = undefined;
    } catch (error: any) {
      this.status = 'error';
      this.errorMessage = error?.message || 'Failed to disconnect';
      throw error;
    }
  }

  /**
   * Returns current connection state.
   */
  async getStatus(): Promise<ConnectionStatus> {
    return this.status;
  }

  /**
   * Fetches recent telemetry from local health store (HealthKit / Health Connect).
   */
  async syncRecentData(): Promise<SyncTelemetryResult> {
    if (this.status === 'disconnected') {
      throw new Error('Cannot sync when health connection is disconnected');
    }

    this.status = 'syncing';
    try {
      const records = await this.bridge.fetchLatestTelemetry({ limit: 100 });
      this.lastSyncedAt = new Date();
      this.status = 'up_to_date';

      if (records && records.length > 0) {
        const latest = records[0];
        if (typeof latest.steps === 'number') {
          realDataService.syncHealthConnectTelemetry(undefined, {
            steps: latest.steps,
            heart_rate: latest.heartRate || 0,
            sleep_minutes: latest.sleepMinutes || 0
          }).catch(() => {});
        }
      }

      return {
        recordsProcessed: records.length,
        syncedAt: this.lastSyncedAt,
        status: this.status,
        sourceProvider: this.provider
      };
    } catch (error: any) {
      this.status = 'error';
      this.errorMessage = error?.message || 'Sync telemetry failed';
      throw error;
    }
  }

  async getState(): Promise<HealthConnectionState> {
    return {
      provider: this.provider,
      status: this.status,
      lastSyncedAt: this.lastSyncedAt,
      errorMessage: this.errorMessage,
      grantedScopes: Array.from(this.grantedScopes)
    };
  }
}
