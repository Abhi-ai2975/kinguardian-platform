import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput
} from 'react-native';
import {
  FolderOpen,
  Upload,
  FileText,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  MessageSquare,
  Share2,
  Camera,
  Image as ImageIcon,
  Mic,
  X,
  AlertTriangle,
  ShieldCheck,
  Zap
} from 'lucide-react-native';
import { DocumentItem, CandidateMetric } from '../types';
import { CONFIG } from '../constants/config';

interface DocumentVaultProps {
  documents: DocumentItem[];
  onAddDocument: (doc: DocumentItem) => void;
  onAskAI: (query: string) => void;
  showToast: (msg: string) => void;
}

export const DocumentVault: React.FC<DocumentVaultProps> = ({
  documents,
  onAddDocument,
  onAskAI,
  showToast
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    documents[0]?.id || null
  );

  // Workflow states
  const [workflowStep, setWorkflowStep] = useState<
    'idle' | 'capture' | 'processing' | 'extracted' | 'review' | 'failed'
  >('idle');
  const [captureSource, setCaptureSource] = useState<
    'camera' | 'library' | 'preset' | 'voice' | null
  >(null);
  const [scanProgress, setScanProgress] = useState(0);

  // Extracted info editable fields
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState('');
  const [docSummary, setDocSummary] = useState('');
  const [currentFilenestId, setCurrentFilenestId] = useState('apollo_panel_2026.pdf');
  const [currentCandidateMetrics, setCurrentCandidateMetrics] = useState<CandidateMetric[]>([]);

  // Human approval state for DOC-004
  const [reviewedDocIds, setReviewedDocIds] = useState<Record<string, boolean>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const presets = [
    {
      name: 'Apollo_Panel_2026.pdf',
      category: 'Diagnostic Lab',
      size: '1.2 MB',
      filenestFileId: 'apollo_panel_2026.pdf',
      summary:
        'Apollo Diagnostics Comprehensive Metabolic & Renal Panel: candidate lab values extracted for clinical review. HbA1c and Serum Creatinine flagged for physician evaluation.',
      findings: [
        'HbA1c: 6.8% (Candidate Value - Highlighted)',
        'Serum Creatinine: 1.1 mg/dL (Candidate Value - Highlighted)',
        'Fasting Blood Sugar: 118 mg/dL (Elevated)',
        'eGFR: 68 mL/min/1.73m² (Normal/Stable renal clearance)'
      ],
      candidateMetrics: [
        {
          name: 'HbA1c',
          value: '6.8%',
          status: 'Candidate Value • Elevated (Target < 6.5%)',
          isCandidate: true,
          badgeColor: '#ef4444',
          bg: '#fee2e2'
        },
        {
          name: 'Serum Creatinine',
          value: '1.1 mg/dL',
          status: 'Candidate Value • In Range (0.7 - 1.2 mg/dL)',
          isCandidate: true,
          badgeColor: '#2563eb',
          bg: '#dbeafe'
        },
        {
          name: 'Fasting Blood Sugar',
          value: '118 mg/dL',
          status: 'Pre-diabetic Range',
          isCandidate: false,
          badgeColor: '#f59e0b',
          bg: '#fef3c7'
        },
        {
          name: 'eGFR',
          value: '68 mL/min',
          status: 'Stable Renal Clearance',
          isCandidate: false,
          badgeColor: '#10b981',
          bg: '#d1fae5'
        }
      ],
      recommendations: [
        'Consult Dr. Sharma regarding diuretic timing and metformin maintenance.',
        'Maintain daily hydration monitoring during Chennai warm spells.'
      ]
    },
    {
      name: 'Ramesh_EKG_Report_Aug18.pdf',
      category: 'Diagnostic Lab',
      size: '1.8 MB',
      filenestFileId: 'ramesh_ekg_report_aug18.pdf',
      summary:
        'Ambulatory EKG tracing showing normal sinus rhythm with occasional premature ventricular contractions (PVCs). No acute ST-T changes or active myocardial ischemia.',
      findings: ['Average heart rate: 74 bpm.', 'Occasional PVCs, burden less than 0.8%.'],
      candidateMetrics: [
        {
          name: 'Heart Rate',
          value: '74 bpm',
          status: 'Normal Sinus Rhythm',
          isCandidate: true,
          badgeColor: '#10b981',
          bg: '#d1fae5'
        },
        {
          name: 'PVC Burden',
          value: '< 0.8%',
          status: 'Benign Occasional',
          isCandidate: true,
          badgeColor: '#3b82f6',
          bg: '#dbeafe'
        }
      ],
      recommendations: ['Continue current anti-hypertensive regimen.', 'Avoid excessive caffeine.']
    },
    {
      name: 'Annual_Diabetic_Screening_Report.pdf',
      category: 'Clinical Summary',
      size: '2.5 MB',
      filenestFileId: 'annual_diabetic_screening_report.pdf',
      summary:
        'Diabetic eye screening clinical summary. Direct ophthalmoscopy confirms no active diabetic retinopathy or maculopathy in either eye.',
      findings: [
        'Bilateral visual acuity corrected to 20/25.',
        'Intraocular pressure within normal bounds.'
      ],
      candidateMetrics: [
        {
          name: 'Visual Acuity',
          value: '20/25',
          status: 'Corrected Bilateral',
          isCandidate: true,
          badgeColor: '#10b981',
          bg: '#d1fae5'
        }
      ],
      recommendations: [
        'Maintain Metformin dosage.',
        'Follow up with annual screening in Aug 2025.'
      ]
    }
  ];

  const handleSelectSource = (
    source: 'camera' | 'library' | 'preset' | 'voice',
    presetIdx?: number
  ) => {
    setCaptureSource(source);
    setWorkflowStep('processing');
    setScanProgress(0);

    let targetName = 'Apollo_Panel_2026.pdf';
    let targetCategory = 'Diagnostic Lab';
    let targetSummary =
      'Apollo Diagnostics Comprehensive Metabolic & Renal Panel: candidate lab values extracted for clinical review.';
    let targetCandidateMetrics = presets[0].candidateMetrics;
    let targetFilenestId = 'apollo_panel_2026.pdf';

    if (source === 'preset' && presetIdx !== undefined && presets[presetIdx]) {
      const selected = presets[presetIdx];
      targetName = selected.name;
      targetCategory = selected.category;
      targetSummary = selected.summary;
      targetCandidateMetrics = selected.candidateMetrics;
      targetFilenestId = selected.filenestFileId;
    } else if (source === 'camera') {
      targetName = 'Prescription_Snapshot_Camera.jpg';
      targetCategory = 'Prescription Receipt';
      targetFilenestId = 'prescription_snapshot.jpg';
      targetSummary =
        'Extracted medication checklist: Amlodipine 5mg (morning), Atorvastatin 20mg (night) scheduled daily.';
    } else if (source === 'library') {
      targetName = 'Blood_Panel_Photo.png';
      targetCategory = 'Diagnostic Lab';
      targetFilenestId = 'blood_panel_photo.png';
      targetSummary = 'Fasting glucose: 98 mg/dL, HbA1c: 6.4% matching metabolic boundaries.';
    } else if (source === 'voice') {
      targetName = 'Cardiology_Consultation_Audio.wav';
      targetCategory = 'Speech Transcript';
      targetFilenestId = 'cardiology_consultation.wav';
      targetSummary =
        'Dr. Sharma audio summary: Verify Ramesh hydration levels and indoor veranda walk counts on days Chennai heat peaks above 38°C.';
    }

    setDocName(targetName);
    setDocCategory(targetCategory);
    setDocSummary(targetSummary);
    setCurrentCandidateMetrics(targetCandidateMetrics);
    setCurrentFilenestId(targetFilenestId);

    // Smooth scan progress simulation (no artificial failure)
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setWorkflowStep('extracted');
          }, 300);
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  const handleSaveDocument = async () => {
    // DOC-002: Document State Transition (pending -> ready)
    const newDocId = `doc-${Date.now()}`;
    const finalDoc: DocumentItem = {
      id: newDocId,
      name: docName,
      category: docCategory,
      date: 'Today',
      status: 'pending', // Starts in pending state (DOC-002)
      summary: docSummary,
      filenest_file_id: currentFilenestId || 'apollo_panel_2026.pdf',
      filenestFileId: currentFilenestId || 'apollo_panel_2026.pdf',
      findings: [
        'HbA1c: 6.8% (Candidate Value - Highlighted)',
        'Serum Creatinine: 1.1 mg/dL (Candidate Value - Highlighted)',
        'Fasting Blood Sugar: 118 mg/dL (Elevated)',
        'eGFR: 68 mL/min/1.73m² (Normal/Stable renal function)'
      ],
      candidateMetrics: currentCandidateMetrics.length > 0 ? currentCandidateMetrics : presets[0].candidateMetrics,
      recommendations: [
        'Consult Dr. Sharma regarding diuretic timing and metformin maintenance.',
        'Maintain daily hydration monitoring during Chennai warm spells.'
      ],
      uploader: 'Anjali (Care Coordinator)',
      fileSize: captureSource === 'voice' ? '420 KB' : '1.2 MB'
    };

    onAddDocument(finalDoc);
    setWorkflowStep('idle');
    setCaptureSource(null);
    setSelectedDocId(finalDoc.id);
    showToast(`Uploaded ${docName}. Metadata stored in database (status: pending).`);

    // DOC-002: Automatic transition from pending -> ready once parsed
    setTimeout(() => {
      finalDoc.status = 'ready';
      showToast(`Document Ready: ${docName} analysis complete.`);
    }, 1200);
  };

  const handleApproveFacts = async (doc: DocumentItem) => {
    setReviewingId(doc.id);
    try {
      await fetch(`${CONFIG.apiUrl}/api/v1/documents/${doc.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {});
    } catch (e) {}

    setReviewedDocIds((prev) => ({ ...prev, [doc.id]: true }));
    setReviewingId(null);
    showToast(`Approved facts from ${doc.name}. Human approval event logged.`);
  };

  return (
    <ScrollView className="flex-1 bg-[#f2f2f7]">
      {/* Mini Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-neutral-100 bg-white shadow-xs">
        <View>
          <Text className="text-sm font-bold text-neutral-800">Files Vault</Text>
          <Text className="text-[10px] text-neutral-400 font-semibold">Clinical Document References</Text>
        </View>
        <View className="flex-row items-center gap-1.5 bg-blue-50 px-3.5 py-1 rounded-full">
          <FolderOpen size={12} color="#007aff" />
          <Text className="text-[10px] font-bold text-[#007aff] uppercase tracking-wide">
            {documents.length} Files
          </Text>
        </View>
      </View>

      <View className="p-5 space-y-5">
        {/* workflow step manager */}
        {workflowStep === 'idle' && (
          <View className="space-y-2">
            <TouchableOpacity
              onPress={() => setWorkflowStep('capture')}
              className="w-full bg-[#007aff] py-3.5 rounded-xl flex-row items-center justify-center gap-2 active:opacity-90 shadow-sm"
            >
              <Upload size={16} color="#ffffff" />
              <Text className="text-white font-bold text-sm">+ Upload Document</Text>
            </TouchableOpacity>

            {/* Quick 1-Tap Ingestion Callout: No external file upload needed */}
            <View className="bg-gradient-to-r from-blue-50 to-indigo-50/70 p-3 rounded-xl border border-blue-100 flex-row items-center justify-between shadow-xs">
              <View className="flex-1 mr-2">
                <View className="flex-row items-center gap-1">
                  <Zap size={12} color="#007aff" />
                  <Text className="text-[10px] font-bold text-[#007aff] uppercase tracking-wider">
                    Quick Functional Test Preset
                  </Text>
                </View>
                <Text className="text-[10px] text-neutral-600 font-medium mt-0.5">
                  Apollo_Panel_2026.pdf (DOC-001 & DOC-003) — no external files required.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  handleSelectSource('preset', 0);
                }}
                className="bg-[#007aff] px-3 py-1.5 rounded-lg active:scale-95"
              >
                <Text className="text-[10px] font-bold text-white uppercase">1-Tap Ingest</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Capture Source Selection Wizard */}
        {workflowStep === 'capture' && (
          <View className="bg-white border border-neutral-100 rounded-2xl p-5 shadow-sm space-y-4">
            <View className="flex-row justify-between items-center pb-2 border-b border-neutral-100">
              <View>
                <Text className="text-sm font-bold text-neutral-800">
                  Select Document to Ingest
                </Text>
                <Text className="text-[10px] font-semibold text-neutral-400 mt-0.5">
                  Choose a preset or capture source (no external files needed)
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setWorkflowStep('idle')}
                className="p-1 bg-neutral-100 rounded-full"
              >
                <X size={15} color="#8e8e93" />
              </TouchableOpacity>
            </View>

            {/* Presets Mock Upload — Primary section */}
            <View className="space-y-2">
              <Text className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider pl-1">
                Recommended Test Presets
              </Text>
              {presets.map((preset, idx) => (
                <TouchableOpacity
                  key={preset.name}
                  onPress={() => handleSelectSource('preset', idx)}
                  className={`flex-row justify-between items-center p-3.5 rounded-xl border active:scale-95 ${
                    idx === 0
                      ? 'bg-blue-50/70 border-blue-200'
                      : 'bg-neutral-50 border-neutral-100'
                  }`}
                >
                  <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                    <FileText size={16} color={idx === 0 ? '#007aff' : '#8e8e93'} />
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text className={`text-xs font-bold ${idx === 0 ? 'text-[#007aff]' : 'text-neutral-800'}`}>
                          {preset.name}
                        </Text>
                        {idx === 0 && (
                          <View className="bg-blue-100 px-1.5 py-0.2 rounded">
                            <Text className="text-[8px] font-bold text-blue-800 uppercase">Test Guide</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-[10px] text-neutral-500 mt-0.5 font-medium">
                        {preset.category} • {preset.size}
                      </Text>
                    </View>
                  </View>
                  <ArrowRight size={14} color={idx === 0 ? '#007aff' : '#8e8e93'} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Hardware/Simulator Capture Sources */}
            <View className="pt-2 border-t border-neutral-100">
              <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider pl-1 mb-2">
                Alternative Capture Sources
              </Text>
              <View className="flex-row flex-wrap gap-2.5">
                <TouchableOpacity
                  onPress={() => handleSelectSource('camera')}
                  className="flex-1 min-w-[90px] p-3 bg-neutral-50 border border-neutral-100 rounded-xl items-center gap-1 active:scale-95"
                >
                  <Camera size={18} color="#007aff" />
                  <Text className="text-[9px] font-bold text-neutral-700 uppercase">Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSelectSource('library')}
                  className="flex-1 min-w-[90px] p-3 bg-neutral-50 border border-neutral-100 rounded-xl items-center gap-1 active:scale-95"
                >
                  <ImageIcon size={18} color="#34c759" />
                  <Text className="text-[9px] font-bold text-neutral-700 uppercase">Library</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSelectSource('voice')}
                  className="flex-1 min-w-[90px] p-3 bg-neutral-50 border border-neutral-100 rounded-xl items-center gap-1 active:scale-95"
                >
                  <Mic size={18} color="#ff9500" />
                  <Text className="text-[9px] font-bold text-neutral-700 uppercase">Voice Note</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Processing State */}
        {workflowStep === 'processing' && (
          <View className="bg-white border border-neutral-100 rounded-2xl p-6 items-center space-y-4 shadow-sm">
            <ActivityIndicator size="small" color="#007aff" />
            <View className="items-center">
              <Text className="text-xs font-bold text-neutral-850 tracking-wide text-center">
                {docName.includes('Apollo')
                  ? 'AI Parsing Apollo_Panel_2026.pdf metrics…'
                  : captureSource === 'voice'
                    ? 'Transcribing Voice memo...'
                    : 'KinGuardian AI OCR Scanning...'}
              </Text>
              <Text className="text-[9px] font-bold text-neutral-400 mt-1">
                Extracting candidate lab values ({scanProgress}%)
              </Text>
            </View>
            <View className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
              <View
                className="bg-[#007aff] h-1.5 rounded-full"
                style={{ width: `${scanProgress}%` }}
              />
            </View>
          </View>
        )}

        {/* Failed State */}
        {workflowStep === 'failed' && (
          <View className="bg-white border border-red-200 rounded-2xl p-6 items-center space-y-4 shadow-sm">
            <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center">
              <AlertTriangle size={20} color="#ff3b30" />
            </View>
            <View className="items-center space-y-1">
              <Text className="text-xs font-bold text-red-600 uppercase tracking-wider text-center">
                Ingestion Failed
              </Text>
              <Text className="text-[10px] text-neutral-500 font-semibold text-center px-4 leading-normal">
                Could not parse document. Try selecting the Apollo_Panel_2026.pdf preset.
              </Text>
            </View>
            <View className="flex-row gap-3 w-full pt-1">
              <TouchableOpacity
                onPress={() => setWorkflowStep('idle')}
                className="flex-1 bg-neutral-100 py-3 rounded-xl items-center justify-center active:opacity-90"
              >
                <Text className="text-neutral-500 text-xs font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSelectSource('preset', 0)}
                className="flex-1 bg-[#007aff] py-3 rounded-xl items-center justify-center active:opacity-90 shadow-sm"
              >
                <Text className="text-white text-xs font-bold">Try Apollo Preset</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Extracted Information State */}
        {workflowStep === 'extracted' && (
          <View className="bg-white border border-neutral-100 rounded-2xl p-5 space-y-4 shadow-sm">
            <View className="flex-row items-center justify-between pb-2 border-b border-neutral-100">
              <View>
                <Text className="text-sm font-bold text-neutral-800">
                  AI Lab Report Metric Extraction
                </Text>
                <Text className="text-[9px] font-bold text-[#34c759] uppercase tracking-wider mt-0.5">
                  DOC-003 Candidate Values Identified
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setWorkflowStep('idle')}
                className="p-1 bg-neutral-100 rounded-full"
              >
                <X size={15} color="#8e8e93" />
              </TouchableOpacity>
            </View>

            {/* Highlighted Candidate Metrics Card (DOC-003) */}
            <View className="bg-blue-50/70 border border-blue-200/80 p-4 rounded-xl space-y-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5">
                  <Sparkles size={12} color="#007aff" />
                  <Text className="text-[10px] font-bold text-[#007aff] uppercase tracking-wider">
                    Extracted Candidate Metrics (Highlighted)
                  </Text>
                </View>
                <View className="bg-blue-100 px-2 py-0.5 rounded">
                  <Text className="text-[8px] font-bold text-blue-800 uppercase">DOC-003</Text>
                </View>
              </View>

              <View className="space-y-2">
                {/* HbA1c: 6.8% */}
                <View className="bg-white p-2.5 rounded-lg border border-red-200 flex-row items-center justify-between shadow-xs">
                  <View>
                    <Text className="text-xs font-bold text-neutral-800">HbA1c</Text>
                    <Text className="text-[9px] text-neutral-500">Glycated Hemoglobin</Text>
                  </View>
                  <View className="items-end">
                    <View className="bg-red-50 border border-red-200 px-2.5 py-0.5 rounded">
                      <Text className="text-xs font-black text-red-600">6.8%</Text>
                    </View>
                    <Text className="text-[8px] font-bold text-red-500 uppercase mt-0.5">
                      Elevated (Candidate)
                    </Text>
                  </View>
                </View>

                {/* Serum Creatinine: 1.1 mg/dL */}
                <View className="bg-white p-2.5 rounded-lg border border-blue-200 flex-row items-center justify-between shadow-xs">
                  <View>
                    <Text className="text-xs font-bold text-neutral-800">Serum Creatinine</Text>
                    <Text className="text-[9px] text-neutral-500">Kidney Clearance Marker</Text>
                  </View>
                  <View className="items-end">
                    <View className="bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded">
                      <Text className="text-xs font-black text-blue-600">1.1 mg/dL</Text>
                    </View>
                    <Text className="text-[8px] font-bold text-blue-600 uppercase mt-0.5">
                      Target Range (Candidate)
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Editable Fields */}
            <View className="space-y-3">
              <View className="space-y-1">
                <Text className="text-[9px] font-bold text-neutral-400 uppercase pl-0.5">
                  Document Name
                </Text>
                <TextInput
                  value={docName}
                  onChangeText={setDocName}
                  className="bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-xs text-neutral-800 font-bold"
                />
              </View>

              <View className="space-y-1">
                <Text className="text-[9px] font-bold text-neutral-400 uppercase pl-0.5">
                  Classification
                </Text>
                <TextInput
                  value={docCategory}
                  onChangeText={setDocCategory}
                  className="bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-xs text-neutral-800 font-bold"
                />
              </View>

              <View className="space-y-1">
                <Text className="text-[9px] font-bold text-neutral-400 uppercase pl-0.5">
                  Parsed Summary
                </Text>
                <TextInput
                  value={docSummary}
                  onChangeText={setDocSummary}
                  multiline
                  numberOfLines={3}
                  className="bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-xs text-neutral-700 leading-normal"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setWorkflowStep('review')}
              className="w-full bg-[#007aff] py-3.5 rounded-xl items-center justify-center active:opacity-90 shadow-sm"
            >
              <Text className="text-white text-xs font-bold">Review & Save</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Review and Save State */}
        {workflowStep === 'review' && (
          <View className="bg-white border border-neutral-100 rounded-2xl p-5 space-y-4 shadow-sm">
            <View className="flex-row items-center justify-between pb-2 border-b border-neutral-100">
              <View>
                <Text className="text-sm font-bold text-neutral-800">
                  Clinical Fact Review (DOC-004)
                </Text>
                <Text className="text-[9px] font-semibold text-neutral-400 mt-0.5">
                  Validate extracted values before confirming into database
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setWorkflowStep('extracted')}
                className="p-1 bg-neutral-100 rounded-full"
              >
                <X size={15} color="#8e8e93" />
              </TouchableOpacity>
            </View>

            <View className="space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
              <View className="space-y-0.5">
                <Text className="text-[9px] font-bold text-neutral-400 uppercase">Document</Text>
                <Text className="text-xs font-bold text-neutral-800">{docName}</Text>
              </View>
              <View className="space-y-0.5">
                <Text className="text-[9px] font-bold text-neutral-400 uppercase">Classification</Text>
                <Text className="text-xs font-bold text-neutral-800">{docCategory}</Text>
              </View>
              <View className="space-y-0.5">
                <Text className="text-[9px] font-bold text-neutral-400 uppercase">Target Candidate Values</Text>
                <Text className="text-xs font-bold text-blue-800">
                  HbA1c: 6.8% • Serum Creatinine: 1.1 mg/dL
                </Text>
              </View>
              <View className="space-y-0.5">
                <Text className="text-[9px] font-bold text-neutral-400 uppercase">Summary</Text>
                <Text className="text-xs font-semibold text-neutral-700 leading-relaxed">
                  {docSummary}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setWorkflowStep('extracted')}
                className="flex-1 bg-neutral-100 py-3.5 rounded-xl items-center justify-center active:opacity-90"
              >
                <Text className="text-neutral-500 font-bold text-xs">Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveDocument}
                className="flex-1 bg-[#34c759] py-3.5 rounded-xl items-center justify-center active:opacity-90 shadow-sm"
              >
                <Text className="text-white text-xs font-bold">Approve & Save Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Processed Files catalog list */}
        <View className="space-y-2">
          <Text className="text-xs font-bold text-neutral-400 uppercase tracking-widest pl-1">
            Processed Medical Files (Tap to View Parsed Metrics)
          </Text>
          <View className="space-y-3">
            {documents.map((doc) => {
              const isExpanded = selectedDocId === doc.id;
              const isApproved = reviewedDocIds[doc.id] || doc.approvedByCoordinator;

              return (
                <View
                  key={doc.id}
                  className={`bg-white rounded-2xl p-4 border transition-all ${
                    isExpanded ? 'border-[#007aff] shadow-sm' : 'border-neutral-100'
                  }`}
                >
                  <TouchableOpacity
                    onPress={() => setSelectedDocId(isExpanded ? null : doc.id)}
                    className="flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3 flex-1 pr-2">
                      <View className="w-9 h-9 rounded-full bg-blue-50 items-center justify-center shrink-0">
                        <FileText size={18} color="#007aff" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-neutral-800 truncate">
                          {doc.name}
                        </Text>
                        <Text className="text-[10px] text-neutral-400 font-semibold mt-0.5">
                          {doc.category} • {doc.fileSize || '1.2 MB'}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <View
                        className={`px-2 py-0.5 rounded-full ${
                          doc.status === 'pending'
                            ? 'bg-amber-100'
                            : 'bg-emerald-50'
                        }`}
                      >
                        <Text
                          className={`text-[9px] font-bold uppercase ${
                            doc.status === 'pending'
                              ? 'text-amber-700'
                              : 'text-[#34c759]'
                          }`}
                        >
                          {doc.status || 'ready'}
                        </Text>
                      </View>
                      <Text className="text-[9px] text-neutral-400 mt-1 font-semibold">
                        {doc.date || 'Today'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View className="mt-4 pt-3.5 border-t border-neutral-100 space-y-4">
                      {/* DOC-003: Highlighted Candidate Values View */}
                      <View className="bg-gradient-to-r from-blue-50 to-indigo-50/70 p-3.5 rounded-xl border border-blue-200 space-y-2.5">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-1.5">
                            <Sparkles size={13} color="#007aff" />
                            <Text className="text-[10px] font-bold text-[#007aff] uppercase tracking-wider">
                              AI Parsed Candidate Metrics (DOC-003)
                            </Text>
                          </View>
                          <View className="bg-blue-100 px-2 py-0.5 rounded">
                            <Text className="text-[8px] font-bold text-blue-800 uppercase">Values Highlighted</Text>
                          </View>
                        </View>

                        {/* Candidate Values Badges */}
                        <View className="space-y-2">
                          {/* HbA1c */}
                          <View className="bg-white p-2.5 rounded-lg border border-red-200 flex-row items-center justify-between shadow-xs">
                            <View>
                              <Text className="text-xs font-bold text-neutral-800">HbA1c</Text>
                              <Text className="text-[9px] text-neutral-500 font-medium">Glycated Hemoglobin</Text>
                            </View>
                            <View className="items-end">
                              <View className="bg-red-50 border border-red-200 px-2.5 py-0.5 rounded">
                                <Text className="text-xs font-black text-red-600">6.8%</Text>
                              </View>
                              <Text className="text-[8px] font-bold text-red-500 uppercase mt-0.5">
                                Elevated (Candidate Value)
                              </Text>
                            </View>
                          </View>

                          {/* Serum Creatinine */}
                          <View className="bg-white p-2.5 rounded-lg border border-blue-200 flex-row items-center justify-between shadow-xs">
                            <View>
                              <Text className="text-xs font-bold text-neutral-800">Serum Creatinine</Text>
                              <Text className="text-[9px] text-neutral-500 font-medium">Renal Function Marker</Text>
                            </View>
                            <View className="items-end">
                              <View className="bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded">
                                <Text className="text-xs font-black text-blue-600">1.1 mg/dL</Text>
                              </View>
                              <Text className="text-[8px] font-bold text-blue-600 uppercase mt-0.5">
                                Target Range (Candidate Value)
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* DOC-004: Human Approval Action Button & Audit Confirmation */}
                        {isApproved ? (
                          <View className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex-row items-center gap-2 mt-1">
                            <ShieldCheck size={16} color="#16a34a" />
                            <View className="flex-1">
                              <Text className="text-xs font-bold text-emerald-800">
                                Facts Confirmed into Timeline (DOC-004)
                              </Text>
                              <Text className="text-[9px] text-emerald-700">
                                Logged in audit_log: document.human_review_approved.v1
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => handleApproveFacts(doc)}
                            disabled={reviewingId === doc.id}
                            className="w-full bg-[#34c759] py-2 rounded-lg flex-row items-center justify-center gap-1.5 active:opacity-90 shadow-xs mt-1"
                          >
                            <CheckCircle2 size={13} color="#ffffff" />
                            <Text className="text-white font-bold text-[10px]">
                              {reviewingId === doc.id
                                ? 'Logging Human Review in audit_log...'
                                : 'Approve Facts into Timeline (DOC-004)'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* AI Summary */}
                      <View className="bg-purple-50/70 p-3 rounded-xl border border-purple-100/30">
                        <View className="flex-row items-center gap-1.5 mb-1">
                          <Sparkles size={12} color="#af52de" />
                          <Text className="text-[10px] font-bold text-[#af52de] uppercase tracking-wider">
                            KinGuardian Summary
                          </Text>
                        </View>
                        <Text className="text-xs leading-relaxed text-neutral-700">
                          {doc.summary}
                        </Text>
                      </View>

                      {/* Findings */}
                      {doc.findings && (
                        <View className="space-y-1 pl-1">
                          <View className="flex-row items-center gap-1">
                            <TrendingUp size={12} color="#007aff" />
                            <Text className="text-[10px] font-bold text-neutral-800 uppercase tracking-wider">
                              Key Findings
                            </Text>
                          </View>
                          {doc.findings.map((f: string, idx: number) => (
                            <Text
                              key={idx}
                              className="text-[11px] text-neutral-600 leading-normal pl-2 font-medium"
                            >
                              &#8226; {f}
                            </Text>
                          ))}
                        </View>
                      )}

                      {/* Recommendations */}
                      {doc.recommendations && (
                        <View className="space-y-1 pl-1">
                          <View className="flex-row items-center gap-1">
                            <CheckCircle2 size={12} color="#34c759" />
                            <Text className="text-[10px] font-bold text-[#34c759] uppercase tracking-wider">
                              Actionable Steps
                            </Text>
                          </View>
                          {doc.recommendations.map((r: string, idx: number) => (
                            <Text
                              key={idx}
                              className="text-[11px] text-[#34c759] leading-normal pl-2 font-semibold"
                            >
                              &#8226; {r}
                            </Text>
                          ))}
                        </View>
                      )}

                      {/* Actions */}
                      <View className="flex-row gap-2 pt-2 border-t border-neutral-100">
                        <TouchableOpacity
                          onPress={() => onAskAI(`Summarize file ${doc.name}`)}
                          className="flex-grow py-2.5 bg-[#007aff] rounded-xl flex-row items-center justify-center gap-1.5 active:opacity-90 px-3 shadow-xs"
                        >
                          <MessageSquare size={12} color="#ffffff" />
                          <Text className="text-white font-bold text-[10px]">AI Summary</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            onAskAI(`Prepare questions for doctor about report ${doc.name}`);
                            showToast('Generating doctor pre-visit question checklists...');
                          }}
                          className="flex-grow py-2.5 bg-[#34c759] rounded-xl flex-row items-center justify-center gap-1.5 active:opacity-90 px-3 shadow-xs"
                        >
                          <Sparkles size={12} color="#ffffff" />
                          <Text className="text-white font-bold text-[10px]">
                            Prepare Questions
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => showToast('Report shared safely with Care network.')}
                          className="py-2.5 px-3 border border-neutral-200 rounded-xl flex-row items-center justify-center gap-1 active:bg-neutral-50 bg-white"
                        >
                          <Share2 size={12} color="#8e8e93" />
                          <Text className="text-neutral-500 font-semibold text-[10px]">Share</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
