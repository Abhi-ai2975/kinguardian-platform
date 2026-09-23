export interface CandidateMetric {
  name: string;
  value: string;
  status: string;
  isCandidate?: boolean;
  badgeColor?: string;
  bg?: string;
}

export interface HealthDocument {
  id: string;
  name: string;
  status: 'processing' | 'ready' | 'error' | 'parsed' | 'pending';

  personId?: string;
  type?: 'prescription' | 'lab' | 'scan' | 'discharge-summary' | 'bill' | 'other';
  uploadedAt?: string;
  uploadedBy?: string;

  // Compatibility properties for vault UI
  category?: string;
  date?: string;
  uploader?: string;
  summary?: string;
  findings?: string[];
  recommendations?: string[];
  fileSize?: string;
  filenest_file_id?: string;
  filenestFileId?: string;
  candidateMetrics?: CandidateMetric[];
  approvedByCoordinator?: boolean;
}

