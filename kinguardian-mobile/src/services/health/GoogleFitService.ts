/**
 * Google Fit & Health Connect Real-Time Integration Service.
 *
 * Provides end-to-end real-time connectivity between KinGuardian and the user's
 * Google Fit app / Health Connect on Android and Web.
 *
 * Features:
 * 1. Automatic real-time telemetry streaming (steps, heart rate, sleep duration).
 * 2. Deep linking to open Google Fit app directly on the user's mobile device.
 * 3. Native Health Connect integration on Android with resilient fallback for Expo Go.
 * 4. Automatic database synchronization with PostgreSQL backend.
 */

import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { healthConnectService } from './HealthConnectService';
import { realDataService } from '../api-client/RealDataService';

export interface GoogleFitTelemetry {
  steps: number;
  heartRate: number;
  sleepMinutes: number;
  source: 'google_fit' | 'health_connect';
  isConnected: boolean;
  lastUpdated: Date;
  isStreaming: boolean;
  provenance: string;
}

type TelemetryListener = (data: GoogleFitTelemetry) => void;

class GoogleFitService {
  private isConnected = false;
  private isStreaming = false;
  private streamInterval: any = null;
  private listeners: Set<TelemetryListener> = new Set();
  private lastSyncedTelemetry: { steps: number; heartRate: number; sleepMinutes: number } | null = null;

  private currentTelemetry: GoogleFitTelemetry = {
    steps: 0,
    heartRate: 0,
    sleepMinutes: 0,
    source: 'google_fit',
    isConnected: false,
    lastUpdated: new Date(),
    isStreaming: false,
    provenance: 'Not connected'
  };

  private activeSubjectId?: string;

  constructor() {
    this.initFromStorage();
  }

  private async initFromStorage() {
    try {
      const stored = await AsyncStorage.getItem('kinguardian_google_fit_telemetry');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.currentTelemetry = {
          ...this.currentTelemetry,
          steps: parsed.steps || 0,
          heartRate: parsed.heartRate || 0,
          sleepMinutes: parsed.sleepMinutes || 0,
          lastUpdated: new Date()
        };
      }
    } catch {
      // Ignore storage error
    }
  }

  /**
   * Opens the Google Fit app on the user's mobile device.
   */
  async openGoogleFitApp(): Promise<boolean> {
    const urls = [
      'googlefit://',
      'intent:#Intent;package=com.google.android.apps.fitness;end',
      'https://fit.google.com'
    ];

    for (const url of urls) {
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen || url.startsWith('intent:') || url.startsWith('https://')) {
          await Linking.openURL(url);
          return true;
        }
      } catch (e) {
        // Try next fallback
      }
    }

    // Fallback: Open Google Play Store page for Google Fit
    try {
      await Linking.openURL('market://details?id=com.google.android.apps.fitness');
      return true;
    } catch {
      await Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.fitness');
      return true;
    }
  }

  /**
   * Connect to Google Fit and request permissions.
   */
  async connectGoogleFit(subjectId?: string): Promise<boolean> {
    try {
      if (subjectId) {
        this.activeSubjectId = subjectId;
      }

      const isHcAvailable = await healthConnectService.isAvailable();
      if (isHcAvailable) {
        const authorized = await healthConnectService.initializeAndAuthorize();
        if (!authorized) {
          console.warn('Health Connect authorization failed');
          return false;
        }
      } else {
        console.warn('Health Connect not available on this device');
        return false;
      }

      await realDataService.connectWearable('health_connect', this.activeSubjectId);
      await realDataService.completeWearableCallback('health_connect', this.activeSubjectId);
      await this.fetchLatestData(this.activeSubjectId);
      this.startRealTimeStreaming(this.activeSubjectId);
      return true;
    } catch (e) {
      console.warn('Google Fit connection error:', e);
      this.isConnected = false;
      this.currentTelemetry.isConnected = false;
      this.currentTelemetry.provenance = 'Connection failed';
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Disconnect Google Fit.
   */
  async disconnectGoogleFit(_subjectId?: string): Promise<boolean> {
    this.stopRealTimeStreaming();
    this.isConnected = false;
    this.currentTelemetry.isConnected = false;
    this.notifyListeners();
    return true;
  }

  /**
   * Fetches latest telemetry from Health Connect or Google Fit.
   */
  async fetchLatestData(subjectId?: string): Promise<GoogleFitTelemetry> {
    const targetId = subjectId || this.activeSubjectId;
    let steps = this.currentTelemetry.steps;
    let heartRate = this.currentTelemetry.heartRate;
    let sleepMinutes = this.currentTelemetry.sleepMinutes;
    let provenance = 'Not connected';
    let isConnected = false;

    try {
      // Try real on-device Health Connect
      const realData = await healthConnectService.fetchRealTelemetry();
      if (realData && realData.isRealDeviceData && typeof realData.steps === 'number') {
        steps = realData.steps;
        heartRate = realData.heartRate;
        sleepMinutes = realData.sleepMinutes;
        provenance = 'Google Fit (On-Device Health Connect)';
        isConnected = true;
      } else {
        // Fallback: Check if backend database has live synced Google Fit telemetry (e.g. for Coordinator Ram or synced session)
        const summary = await realDataService.getWearableHealthSummary(targetId);
        if (summary && typeof summary.steps === 'number') {
          steps = summary.steps;
          heartRate = summary.heart_rate || heartRate;
          sleepMinutes = summary.sleep_minutes || sleepMinutes;
          provenance = 'Google Fit (Live Synced)';
          isConnected = true;
        } else {
          // Check local AsyncStorage cache
          const stored = await AsyncStorage.getItem('kinguardian_google_fit_telemetry');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed.steps !== undefined) {
                steps = parsed.steps;
                heartRate = parsed.heartRate || heartRate;
                sleepMinutes = parsed.sleepMinutes || sleepMinutes;
                provenance = 'Google Fit (Cached)';
                isConnected = true;
              }
            } catch {}
          }
          if (!isConnected) {
            provenance = 'Waiting for Google Fit data';
            isConnected = false;
          }
        }
      }

      this.currentTelemetry = {
        steps,
        heartRate,
        sleepMinutes,
        source: 'google_fit',
        isConnected,
        lastUpdated: new Date(),
        isStreaming: isConnected,
        provenance
      };

      // Persist locally if we have real on-device data and push to backend if telemetry changed
      if (realData && realData.isRealDeviceData && typeof realData.steps === 'number') {
        AsyncStorage.setItem('kinguardian_google_fit_telemetry', JSON.stringify({
          steps,
          heartRate,
          sleepMinutes,
          lastUpdated: new Date().toISOString()
        })).catch(() => {});

        // Only synchronize in real-time if values changed (prevents flooding PostgreSQL every 3.5s)
        const hasChanged = !this.lastSyncedTelemetry ||
          this.lastSyncedTelemetry.steps !== steps ||
          this.lastSyncedTelemetry.heartRate !== heartRate ||
          this.lastSyncedTelemetry.sleepMinutes !== sleepMinutes;

        if (hasChanged) {
          this.lastSyncedTelemetry = { steps, heartRate, sleepMinutes };
          realDataService.syncHealthConnectTelemetry(targetId, {
            steps,
            heart_rate: heartRate,
            sleep_minutes: sleepMinutes
          }).catch((_e) => {
            // Safe silent sync
          });
        }
      }

      this.notifyListeners();
    } catch (e) {
      console.warn('Google Fit fetch error:', e);
      this.currentTelemetry.provenance = 'Connection error - Please try again';
      this.currentTelemetry.isConnected = false;
      this.currentTelemetry.isStreaming = false;
      this.notifyListeners();
    }

    return this.currentTelemetry;
  }

  /**
   * Directly syncs real live steps (from Google Fit app or user prompt)
   * to local state, AsyncStorage, and PostgreSQL backend.
   */
  async syncLiveGoogleFitSteps(
    steps: number,
    subjectId?: string,
    heartRate?: number,
    sleepMinutes?: number
  ): Promise<boolean> {
    const targetId = subjectId || this.activeSubjectId;
    const finalHr = typeof heartRate === 'number' ? heartRate : (this.currentTelemetry.heartRate || 0);
    const finalSleep = typeof sleepMinutes === 'number' ? sleepMinutes : (this.currentTelemetry.sleepMinutes || 0);

    this.currentTelemetry = {
      steps,
      heartRate: finalHr,
      sleepMinutes: finalSleep,
      source: 'google_fit',
      isConnected: true,
      lastUpdated: new Date(),
      isStreaming: true,
      provenance: 'Google Fit (Live Synced)'
    };
    this.isConnected = true;
    this.isStreaming = true;

    // 1. Save to local AsyncStorage
    try {
      await AsyncStorage.setItem(
        'kinguardian_google_fit_telemetry',
        JSON.stringify({
          steps,
          heartRate: finalHr,
          sleepMinutes: finalSleep,
          lastUpdated: new Date().toISOString()
        })
      );
    } catch {}

    // 2. Notify all UI listeners immediately
    this.notifyListeners();

    // 3. Sync to backend PostgreSQL database
    try {
      this.lastSyncedTelemetry = { steps, heartRate: finalHr, sleepMinutes: finalSleep };
      await realDataService.syncHealthConnectTelemetry(targetId, {
        steps,
        heart_rate: finalHr,
        sleep_minutes: finalSleep
      });
      return true;
    } catch (e) {
      console.warn('Failed to sync live Google Fit steps to backend:', e);
      return false;
    }
  }

  /**
   * Starts automatic real-time streaming every few seconds.
   */
  startRealTimeStreaming(subjectId?: string, intervalMs = 3500) {
    if (subjectId) {
      this.activeSubjectId = subjectId;
    }
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
    }
    this.isStreaming = true;
    this.currentTelemetry.isStreaming = true;
    this.notifyListeners();

    // Immediately fetch once
    this.fetchLatestData(this.activeSubjectId);

    // Poll in real-time
    this.streamInterval = setInterval(() => {
      this.fetchLatestData(this.activeSubjectId);
    }, intervalMs);
  }

  /**
   * Stops real-time streaming.
   */
  stopRealTimeStreaming() {
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = null;
    }
    this.isStreaming = false;
    this.currentTelemetry.isStreaming = false;
    this.notifyListeners();
  }

  /**
   * Subscribe to live real-time telemetry changes.
   */
  subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    listener(this.currentTelemetry);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.currentTelemetry);
      } catch (e) {
        console.error('Error notifying telemetry listener:', e);
      }
    }
  }

  getLatestTelemetry(): GoogleFitTelemetry {
    return this.currentTelemetry;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  getIsStreaming(): boolean {
    return this.isStreaming;
  }
}

export const googleFitService = new GoogleFitService();
