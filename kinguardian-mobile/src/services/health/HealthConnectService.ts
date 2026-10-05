/**
 * Real Android Health Connect Service.
 *
 * Directly connects to the on-device Health Connect application to fetch
 * actual step counts, heart rate readings, and sleep sessions recorded by Google Fit,
 * Samsung Health, or Wear OS devices on Android.
 */

import { Platform } from 'react-native';

export interface RealHealthConnectData {
  steps: number;
  heartRate: number;
  sleepMinutes: number;
  source: string;
  isRealDeviceData: boolean;
  rawDataDetails?: string;
}

export class HealthConnectService {
  private isInitialized = false;

  private isAvailableChecked = false;
  private isModuleAvailable = false;

  /**
   * Safely checks if Health Connect SDK is supported and linked on this device.
   * Prevents crashes or yellow box warnings when running in Expo Go or Web.
   */
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    if (this.isAvailableChecked) return this.isModuleAvailable;

    try {
      // Dynamic require so non-native or web environments don't crash
      const HealthConnect = require('react-native-health-connect');
      if (!HealthConnect || typeof HealthConnect.getSdkStatus !== 'function') {
        this.isAvailableChecked = true;
        this.isModuleAvailable = false;
        return false;
      }
      const status = await HealthConnect.getSdkStatus();
      // SDK_AVAILABLE is 3
      const available = status === 3 || status === HealthConnect.SdkAvailabilityStatus?.SDK_AVAILABLE;
      this.isAvailableChecked = true;
      this.isModuleAvailable = available;
      return available;
    } catch (e: any) {
      this.isAvailableChecked = true;
      this.isModuleAvailable = false;
      // Do not log warning if it is simply running in Expo Go or an unlinked dev client
      if (!e?.message?.includes("doesn't seem to be linked") && !e?.message?.includes('Expo Go')) {
        console.warn('Health Connect not available on this runtime:', e);
      }
      return false;
    }
  }

  /**
   * Initializes the native Health Connect client and requests runtime permissions.
   */
  async initializeAndAuthorize(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    const available = await this.isAvailable();
    if (!available) return false;

    try {
      const HealthConnect = require('react-native-health-connect');
      const initialized = await HealthConnect.initialize();
      if (!initialized) return false;
      this.isInitialized = true;

      // Check existing permissions or request new ones
      let existingPermissions: any[] = [];
      if (typeof HealthConnect.getGrantedPermissions === 'function') {
        try {
          existingPermissions = await HealthConnect.getGrantedPermissions();
        } catch {}
      }

      const hasRequired = Array.isArray(existingPermissions) && existingPermissions.some((p: any) =>
        p.recordType === 'Steps' || p.recordType === 'HeartRate' || p.recordType === 'SleepSession'
      );

      if (hasRequired) {
        return true;
      }

      // Request Health Connect permissions
      const granted = await HealthConnect.requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'SleepSession' }
      ]);
      console.log('Health Connect granted permissions:', granted);
      return Array.isArray(granted) && granted.length > 0;
    } catch (e: any) {
      if (!e?.message?.includes("doesn't seem to be linked") && !e?.message?.includes('Expo Go')) {
        console.warn('Health Connect authorization error:', e);
      }
      return false;
    }
  }

  /**
   * Reads real-time telemetry directly from the Android Health Connect store.
   * If Google Fit is syncing into Health Connect, this retrieves the true Google Fit data.
   */
  async fetchRealTelemetry(): Promise<RealHealthConnectData | null> {
    if (Platform.OS !== 'android') return null;

    // Safely check if native module is available (avoids Expo Go unlinked warnings)
    const available = await this.isAvailable();
    if (!available) return null;

    try {
      const HealthConnect = require('react-native-health-connect');
      if (!this.isInitialized) {
        await HealthConnect.initialize();
        this.isInitialized = true;
      }

      const now = new Date();
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      // 1. Fetch real step count records for today
      let totalSteps = 0;
      let stepCountFromAgg = false;

      try {
        if (typeof HealthConnect.aggregateRecord === 'function') {
          const agg = await HealthConnect.aggregateRecord({
            recordType: 'Steps',
            timeRangeFilter: {
              operator: 'between',
              startTime: startOfDay.toISOString(),
              endTime: now.toISOString()
            }
          });
          if (agg && typeof agg.COUNT_TOTAL === 'number') {
            totalSteps = agg.COUNT_TOTAL;
            stepCountFromAgg = true;
          }
        }
      } catch (aggErr) {
        // Fallback to reading raw records
      }

      let stepRecords: any[] = [];
      if (!stepCountFromAgg) {
        const stepsResponse = await HealthConnect.readRecords('Steps', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startOfDay.toISOString(),
            endTime: now.toISOString()
          }
        });
        stepRecords = stepsResponse?.records || [];
        totalSteps = stepRecords.reduce((sum: number, rec: any) => sum + (rec.count || 0), 0);
      }

      // 2. Fetch real heart rate records for today
      const hrResponse = await HealthConnect.readRecords('HeartRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startOfDay.toISOString(),
          endTime: now.toISOString()
        }
      });
      let latestHr = 0;
      const hrRecords = hrResponse?.records || [];
      if (hrRecords.length > 0) {
        const lastRec = hrRecords[hrRecords.length - 1];
        if (lastRec.samples && lastRec.samples.length > 0) {
          latestHr = lastRec.samples[lastRec.samples.length - 1].beatsPerMinute || 0;
        }
      }

      // 3. Fetch real sleep sessions (last 24h)
      const sleepStart = new Date(Date.now() - 24 * 3600 * 1000);
      const sleepResponse = await HealthConnect.readRecords('SleepSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: sleepStart.toISOString(),
          endTime: now.toISOString()
        }
      });
      let totalSleepMinutes = 0;
      const sleepRecords = sleepResponse?.records || [];
      for (const rec of sleepRecords) {
        if (rec.startTime && rec.endTime) {
          const diffMs = new Date(rec.endTime).getTime() - new Date(rec.startTime).getTime();
          totalSleepMinutes += Math.max(0, Math.round(diffMs / 60000));
        }
      }

      return {
        steps: totalSteps,
        heartRate: latestHr,
        sleepMinutes: totalSleepMinutes,
        source: 'health_connect',
        isRealDeviceData: true,
        rawDataDetails: stepCountFromAgg
          ? `Real sync: Read aggregate step count (${totalSteps}) and ${hrRecords.length} HR records from Health Connect.`
          : `Real sync: Read ${stepRecords.length} step intervals and ${hrRecords.length} HR records from Health Connect.`
      };
    } catch (e: any) {
      if (!e?.message?.includes("doesn't seem to be linked") && !e?.message?.includes('Expo Go')) {
        console.warn('Error reading from Health Connect:', e);
      }
      return null;
    }
  }
}

export const healthConnectService = new HealthConnectService();
