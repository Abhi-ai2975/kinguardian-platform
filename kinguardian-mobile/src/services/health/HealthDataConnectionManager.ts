/**
 * KinGuardian Health Data Connection Manager.
 *
 * Provides decoupled access to HealthDataConnection instances across screens,
 * preventing any React Native UI component from directly referencing vendor SDKs.
 */

import {
  HealthDataConnection,
  HealthProviderType
} from './types';

import { OpenWearablesNativeAdapter, OpenWearablesNativeBridge } from './OpenWearablesNativeAdapter';

export class HealthDataConnectionManager {
  private static connections: Map<HealthProviderType, HealthDataConnection> = new Map();

  /**
   * Returns or registers a HealthDataConnection instance.
   */
  static getConnection(
    provider: HealthProviderType,
    customBridge?: OpenWearablesNativeBridge
  ): HealthDataConnection {
    if (!this.connections.has(provider)) {
      if (provider === 'apple_health' || provider === 'health_connect') {
        this.connections.set(
          provider,
          new OpenWearablesNativeAdapter(customBridge, provider)
        );
      } else {
        // Cloud wearable fallback adapter
        this.connections.set(
          provider,
          new OpenWearablesNativeAdapter(customBridge, provider)
        );
      }
    }
    return this.connections.get(provider)!;
  }

  /**
   * Registers a custom mock/adapter instance for testing.
   */
  static registerConnection(
    provider: HealthProviderType,
    connection: HealthDataConnection
  ): void {
    this.connections.set(provider, connection);
  }

  /**
   * Resets all connections (useful for test isolation).
   */
  static reset(): void {
    this.connections.clear();
  }
}
