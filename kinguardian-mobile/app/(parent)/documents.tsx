import { useContext, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AppContext } from '../../src/store/AppContext';
import { ParentBottomNavBar } from '../../src/components/Navigation';
import { DeviceFrame } from '../../src/components/DeviceFrame';
import { SimulatorControls } from '../../src/components/SimulatorControls';
import { useRouter } from 'expo-router';
import { Camera, Image as ImageIcon, Mic, Upload, Eye, Ban, FileText, CheckCircle2 } from 'lucide-react-native';
import { realDataService } from '../../src/services/api-client/RealDataService';

export default function ParentDocumentsRoute() {
  const context = useContext(AppContext);
  const router = useRouter();

  const [documentSource, setDocumentSource] = useState<'camera' | 'library' | 'voice' | null>(null);
  const [isUploaded, setIsUploaded] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);

  useEffect(() => {
    const loadIds = async () => {
      try {
        const families = await realDataService.getUserFamilies();
        if (families && families.length > 0) {
          const famId = families[0].id;
          setActiveFamilyId(famId);
          const members = await realDataService.getFamilyMembers(famId);
          const dad = members?.find((m: any) => m.role === 'parent' || m.role === 'care_subject');
          if (dad) {
            setActiveSubjectId((dad as any).backendSubjectId || dad.id);
          }
        }
      } catch (err) {
        console.warn('documents: Error loading families/subjects:', err);
      }
    };
    loadIds();
  }, []);

  if (!context) return null;

  const coordName = context.coordinatorName || 'Coordinator';
  const userName = context.currentUser?.name || 'Parent';

  const handleUpload = (source: 'camera' | 'library' | 'voice') => {
    setDocumentSource(source);
    setIsUploaded(true);
    setShowReview(false);
  };

  const handleSend = async () => {
    setIsSubmitting(true);
    let title = 'parent_rx_scan_01.jpg';
    let summary = 'Prescription document snapshot uploaded by parent.';
    let classification = 'Prescription';
    let filenestId = 'parent_rx_scan_01.jpg';

    if (documentSource === 'camera') {
      title = 'parent_rx_scan_01.jpg';
      summary = `${userName} snapped a new prescription list image.`;
      classification = 'Prescription';
      filenestId = 'parent_rx_scan_01.jpg';
    } else if (documentSource === 'library') {
      title = 'parent_lab_scan_01.jpg';
      summary = `${userName} shared a report copy from their library.`;
      classification = 'Lab Report';
      filenestId = 'parent_lab_scan_01.jpg';
    } else if (documentSource === 'voice') {
      title = 'parent_voice_memo_01.m4a';
      summary = `${userName} recorded doctor instructions voice note.`;
      classification = 'Doctor Memo';
      filenestId = 'parent_voice_memo_01.m4a';
    }

    try {
      // Insert doc to state and persist to backend
      await context.handleUploadDocument({
        id: `doc-${Date.now()}`,
        family_id: activeFamilyId,
        subject_id: activeSubjectId,
        name: title,
        category: classification,
        classification: classification,
        filenestFileId: filenestId,
        filenest_file_id: filenestId,
        customToast: `Prescription uploaded. ${coordName} will review.`,
        date: 'Today',
        status: 'parsed',
        summary: summary,
        uploader: `${userName} (Parent)`,
        fileSize: '1.4 MB'
      } as any);

      context.showToast(`Prescription uploaded. ${coordName} will review.`);
    } catch (err) {
      console.warn('Error uploading document:', err);
    } finally {
      setIsSubmitting(false);
      // Reset state
      setDocumentSource(null);
      setIsUploaded(false);
      setShowReview(false);

      // Redirect to home dashboard
      router.push('/(parent)');
    }
  };

  const handleCancel = () => {
    setDocumentSource(null);
    setIsUploaded(false);
    setShowReview(false);
    context.showToast('Upload cancelled.');
  };

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-[#f2f2f7]">
        {/* Header */}
        <View className="bg-white pt-6 pb-5 px-6 border-b border-neutral-100 space-y-0.5">
          <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Share Records with {coordName}
          </Text>
          <Text className="text-2xl font-bold text-neutral-900 tracking-tight">
            Send Health Document
          </Text>
        </View>

        <ScrollView className="flex-1 p-5 space-y-5">
          {!isUploaded ? (
            <View className="space-y-5">
              <View className="space-y-3">
                <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider pl-1">
                  Choose document to send
                </Text>

                {/* Take a Photo */}
                <TouchableOpacity
                  onPress={() => handleUpload('camera')}
                  className="w-full bg-white border border-neutral-100 rounded-2xl p-5 flex-row items-center gap-4 shadow-sm active:scale-98"
                >
                  <View className="w-12 h-12 bg-rose-50 rounded-2xl items-center justify-center border border-rose-100 shrink-0">
                    <Camera size={24} color="#ff3b30" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-neutral-900">Take Photo of Prescription</Text>
                    <Text className="text-xs text-neutral-400 mt-0.5 leading-snug font-medium">
                      Use camera to snap prescriptions or clinic notes
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Choose a Photo */}
                <TouchableOpacity
                  onPress={() => handleUpload('library')}
                  className="w-full bg-white border border-neutral-100 rounded-2xl p-5 flex-row items-center gap-4 shadow-sm active:scale-98"
                >
                  <View className="w-12 h-12 bg-emerald-50 rounded-2xl items-center justify-center border border-emerald-100 shrink-0">
                    <ImageIcon size={24} color="#34c759" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-neutral-900">Choose from Gallery</Text>
                    <Text className="text-xs text-neutral-400 mt-0.5 leading-snug font-medium">
                      Pick a lab report or document from your phone
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Record a Voice Note */}
                <TouchableOpacity
                  onPress={() => handleUpload('voice')}
                  className="w-full bg-white border border-neutral-100 rounded-2xl p-5 flex-row items-center gap-4 shadow-sm active:scale-98"
                >
                  <View className="w-12 h-12 bg-purple-50 rounded-2xl items-center justify-center border border-purple-100 shrink-0">
                    <Mic size={24} color="#af52de" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-neutral-900">Record a Voice Note</Text>
                    <Text className="text-xs text-neutral-400 mt-0.5 leading-snug font-medium">
                      Speak clearly to describe what the doctor instructed
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Uploaded Documents & Prescriptions List */}
              <View className="space-y-3 pt-1">
                <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider pl-1">
                  Uploaded Records & Prescriptions ({context.documents?.length || 0})
                </Text>
                {context.documents && context.documents.length > 0 ? (
                  context.documents.map((doc: any) => (
                    <View
                      key={doc.id}
                      className="bg-white border border-neutral-100 rounded-2xl p-4 shadow-sm space-y-2"
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-3 flex-1 pr-2">
                          <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center border border-blue-100">
                            <FileText size={18} color="#007aff" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-sm font-bold text-neutral-900" numberOfLines={1}>
                              {doc.name || doc.filenestFileId || doc.filenest_file_id || 'Document'}
                            </Text>
                            <Text className="text-[10px] font-semibold text-neutral-400 mt-0.5">
                              {doc.category || doc.classification || 'Medical Record'} • {doc.date || 'Recent'}
                            </Text>
                          </View>
                        </View>
                        <View className="bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full">
                          <Text className="text-[9px] font-bold text-[#34c759] uppercase">
                            {doc.category === 'Prescription' || doc.classification === 'Prescription'
                              ? `In Review by ${coordName}`
                              : 'Active'}
                          </Text>
                        </View>
                      </View>
                      {doc.summary ? (
                        <Text className="text-xs text-neutral-600 leading-relaxed font-medium bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                          {doc.summary}
                        </Text>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <View className="bg-white border-2 border-dashed border-amber-200 rounded-2xl p-5 items-center">
                    <Text className="text-xs font-bold text-slate-400">
                      No documents uploaded yet. Tap above to snap a prescription.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            /* Uploaded Confirmation Block */
            <View className="bg-white border-4 border-amber-300 rounded-[32px] p-6 shadow-sm space-y-6">
              <View className="items-center text-center space-y-1">
                <Text className="text-base font-black text-slate-500 uppercase tracking-widest">
                  Photo Selected
                </Text>
                <Text className="text-xl font-black text-slate-900 text-center px-2">
                  “Would you like to send this to {coordName}?”
                </Text>
              </View>

              {/* Photo preview card */}
              <View className="bg-amber-50/70 border-2 border-amber-200 rounded-2xl p-4 items-center space-y-2">
                <View className="w-16 h-16 bg-white rounded-xl items-center justify-center border border-amber-200 shadow-xs">
                  <FileText size={32} color="#d97706" />
                </View>
                <View className="items-center">
                  <Text className="text-sm font-black text-slate-900">
                    parent_rx_scan_01.jpg
                  </Text>
                  <Text className="text-xs font-semibold text-slate-500 mt-0.5">
                    Prescription • 1.4 MB • High Resolution
                  </Text>
                </View>
                <View className="bg-emerald-100 px-2.5 py-1 rounded-full flex-row items-center gap-1 mt-1">
                  <CheckCircle2 size={12} color="#059669" />
                  <Text className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    Photo Ready to Upload
                  </Text>
                </View>
              </View>

              {/* Preview Block if Review clicked */}
              {showReview && (
                <View className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                  <Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Preview Ingest
                  </Text>
                  {documentSource === 'voice' ? (
                    <Text className="text-xs font-bold text-slate-700 italic">
                      🎙️ Audio transcription file ready to transmit.
                    </Text>
                  ) : (
                    <Text className="text-xs font-bold text-slate-700 italic">
                      📷 Document snapshot image ready to transmit.
                    </Text>
                  )}
                </View>
              )}

              {/* Core Actions list */}
              <View className="space-y-3">
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={isSubmitting}
                  className="w-full bg-[#059669] py-4 rounded-2xl flex-row items-center justify-center gap-2 active:scale-95 shadow-md"
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Upload size={18} color="#ffffff" />
                  )}
                  <Text className="text-white font-black text-sm uppercase tracking-widest">
                    {isSubmitting ? 'Uploading...' : 'Upload'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowReview(!showReview)}
                  className="w-full bg-slate-100 border border-slate-200 py-4 rounded-2xl flex-row items-center justify-center gap-2 active:scale-95"
                >
                  <Eye size={16} color="#708090" />
                  <Text className="text-slate-600 font-black text-xs uppercase tracking-wider">
                    {showReview ? 'Hide preview' : 'Review'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCancel}
                  className="w-full bg-white border border-rose-200 py-4 rounded-2xl flex-row items-center justify-center gap-2 active:scale-95"
                >
                  <Ban size={16} color="#ba1a1a" />
                  <Text className="text-[#ba1a1a] font-black text-xs uppercase tracking-wider">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <View className="h-28" />
        </ScrollView>

        <ParentBottomNavBar
          activeTab="home"
          onTabChange={(tab) => {
            if (tab === 'home') router.push('/(parent)');
            else if (tab === 'medicines') router.push('/(parent)/medicines');
            else if (tab === 'profile') router.push('/(parent)/profile');
            else if (tab === 'ask') router.push('/(parent)/ask');
          }}
        />
      </View>
      <SimulatorControls
        onTriggerNotification={context.handleTriggerSimulation}
        onRefreshData={context.handleWearableSyncRefresh}
        isSyncing={context.isSyncing}
        currentLoopStep={context.currentLoopStep}
        onAdvanceLoop={context.handleAdvanceLoop}
        onResetLoop={context.handleResetLoop}
      />
    </DeviceFrame>
  );
}
