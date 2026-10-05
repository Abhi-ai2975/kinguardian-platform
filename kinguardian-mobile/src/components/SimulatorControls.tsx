import React from 'react';

export type DemoScenario =
  | 'normal'
  | 'medication-missed'
  | 'guardian-moment'
  | 'new-lab-report'
  | 'upcoming-appointment'
  | 'parent-feeling-unwell'
  | 'stale-sync';

interface SimulatorControlsProps {
  onTriggerNotification: (type: 'bp_spike' | 'missed_med' | 'cgm_sync' | 'suresh_log') => void;
  onRefreshData: () => void;
  isSyncing: boolean;

  // Core Loop Walkthrough Props
  currentLoopStep: number;
  onAdvanceLoop: () => void;
  onResetLoop: () => void;
}

export const SimulatorControls: React.FC<SimulatorControlsProps> = () => {
  return null;
};

