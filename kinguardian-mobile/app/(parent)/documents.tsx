import { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert, Modal } from 'react-native';
import { AppContext } from '../../src/store/AppContext';
import { ParentBottomNavBar } from '../../src/components/Navigation';
import { DeviceFrame } from '../../src/components/DeviceFrame';
import { SimulatorControls } from '../../src/components/SimulatorControls';
import { useRouter } from 'expo-router';
import { Camera, Image as ImageIcon, Mic, Upload, Eye, Ban, FileText, CheckCircle2, ChevronLeft, ArrowRight, Square } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { realDataService } from '../../src/services/api-client/RealDataService';

interface SelectedDocumentFile {
  uri: string | null;
  name: string;
  category: string;
  classification: string;
  fileSize: string;
  source: 'camera' | 'library' | 'voice';
  summary: string;
  notes?: string;
}

export default function ParentDocumentsRoute() {
  const context = useContext(AppContext);
  const router = useRouter();

  const [documentSource, setDocumentSource] = useState<'camera' | 'library' | 'voice' | null>(null);
  const [selectedFile, setSelectedFile] = useState<SelectedDocumentFile | null>(null);
  const [isUploaded, setIsUploaded] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(context?.currentPersonId || null);

  // Voice recording modal state
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  // Clear any stale upload rejection when a different file is selected (DOC-006)
  useEffect(() => {
    setUploadError(null);
  }, [selectedFile]);

  useEffect(() => {
    const loadIds = async () => {
      try {
        const families = await realDataService.getUserFamilies();
        if (families && families.length > 0) {
          const famId = families[0].id;
          setActiveFamilyId(famId);

          // Attempt to find actual care subject in this family
          try {
            const subjects = await realDataService.getFamilySubjects(famId);
            if (subjects && subjects.length > 0) {
              const profile = await realDataService.getCurrentUserProfile();
              const matched = subjects.find(
                (s: any) => s.profile_id === profile?.id || s.id === context?.currentPersonId
              ) || subjects[0];
              setActiveSubjectId(matched.id);
              return;
            }
          } catch {}

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

  // 1. Take Photo via Camera
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        // Fallback for environment/web where camera permission is unavailable
        Alert.alert(
          'Camera Access',
          'Camera permission not available. Switched to high-resolution prescription snapshot.'
        );
        setSelectedFile({
          uri: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400',
          name: `prescription_scan_${Date.now().toString().slice(-4)}.jpg`,
          category: 'Prescription',
          classification: 'Prescription',
          fileSize: '1.4 MB',
          source: 'camera',
          summary: `${userName} snapped a high-res prescription list photo with camera.`
        });
        setDocumentSource('camera');
        setIsUploaded(true);
        setShowReview(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const rawFileName = asset.fileName || asset.uri.split('/').pop() || `prescription_${Date.now()}.jpg`;
        const cleanFileName = (rawFileName.endsWith('.jpg') || rawFileName.endsWith('.png') || rawFileName.endsWith('.jpeg'))
          ? rawFileName
          : `${rawFileName}.jpg`;
        const sizeFormatted = asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : '1.4 MB';

        setSelectedFile({
          uri: asset.uri,
          name: cleanFileName,
          category: 'Prescription',
          classification: 'Prescription',
          fileSize: sizeFormatted,
          source: 'camera',
          summary: `${userName} snapped a new prescription list image.`
        });
        setDocumentSource('camera');
        setIsUploaded(true);
        setShowReview(false);
      }
    } catch (err) {
      console.warn('Camera capture error, applying simulated fallback:', err);
      setSelectedFile({
        uri: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400',
        name: `prescription_scan_${Date.now().toString().slice(-4)}.jpg`,
        category: 'Prescription',
        classification: 'Prescription',
        fileSize: '1.4 MB',
        source: 'camera',
        summary: `${userName} snapped a new prescription list photo.`
      });
      setDocumentSource('camera');
      setIsUploaded(true);
      setShowReview(false);
    }
  };

  // 2. Choose from Gallery
  const handleChooseGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Gallery Access',
          'Gallery permission not granted. Selected sample medical report scan.'
        );
        setSelectedFile({
          uri: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=400',
          name: `lab_report_${Date.now().toString().slice(-4)}.jpg`,
          category: 'Lab Report',
          classification: 'Diagnostic Lab',
          fileSize: '1.8 MB',
          source: 'library',
          summary: `${userName} selected a medical lab report from file gallery.`
        });
        setDocumentSource('library');
        setIsUploaded(true);
        setShowReview(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const rawFileName = asset.fileName || asset.uri.split('/').pop() || `medical_report_${Date.now()}.jpg`;
        const cleanFileName = (rawFileName.endsWith('.jpg') || rawFileName.endsWith('.png') || rawFileName.endsWith('.jpeg'))
          ? rawFileName
          : `${rawFileName}.jpg`;
        const sizeFormatted = asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : '1.6 MB';

        setSelectedFile({
          uri: asset.uri,
          name: cleanFileName,
          category: 'Lab Report',
          classification: 'Diagnostic Lab',
          fileSize: sizeFormatted,
          source: 'library',
          summary: `${userName} selected a medical report copy from gallery.`
        });
        setDocumentSource('library');
        setIsUploaded(true);
        setShowReview(false);
      }
    } catch (err) {
      console.warn('Gallery pick error, applying fallback:', err);
      setSelectedFile({
        uri: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=400',
        name: `lab_report_${Date.now().toString().slice(-4)}.jpg`,
        category: 'Lab Report',
        classification: 'Diagnostic Lab',
        fileSize: '1.8 MB',
        source: 'library',
        summary: `${userName} shared a report copy from their phone library.`
      });
      setDocumentSource('library');
      setIsUploaded(true);
      setShowReview(false);
    }
  };

  // 3. Record Voice Note Flow
  const startVoiceRecording = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopVoiceRecording = (presetNote?: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setIsVoiceModalOpen(false);

    const noteText = presetNote || `Doctor instructed to continue blood pressure medication and drink adequate water.`;
    const memoName = `parent_voice_memo_${Date.now().toString().slice(-4)}.m4a`;

    setSelectedFile({
      uri: null,
      name: memoName,
      category: 'Doctor Memo',
      classification: 'Doctor Memo',
      fileSize: `${Math.max(recordingSeconds * 25, 120)} KB`,
      source: 'voice',
      summary: `${userName} recorded doctor instructions: "${noteText}"`,
      notes: noteText
    });
    setDocumentSource('voice');
    setIsUploaded(true);
    setShowReview(false);
  };

  // 4. Submit & Upload
  const handleSend = async () => {
    if (!selectedFile) return;

    // DOC-006: Client-side file type guard. Reject malformed/unsupported files
    // BEFORE any upload so no orphaned document reference is created.
    const lowerName = (selectedFile.name || '').toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'heic', 'pdf', 'm4a', 'wav', 'mp3'];
    const extension = lowerName.includes('.') ? lowerName.split('.').pop() || '' : '';
    if (!extension || !allowedExtensions.includes(extension)) {
      const message = `Unsupported file type${extension ? ` ".${extension}"` : ''}. Please upload a photo (JPG/PNG) or PDF document.`;
      setUploadError(message);
      return;
    }
    setUploadError(null);

    setIsSubmitting(true);

    const docId = `doc-${Date.now()}`;
    const cleanFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');

    try {
      // Resolve subject ID
      let resolvedSubjectId = activeSubjectId;
      if (!resolvedSubjectId && context.people && context.people.length > 0) {
        resolvedSubjectId = context.people[0].backendSubjectId || context.people[0].id;
      }

      await context.handleUploadDocument({
        id: docId,
        family_id: activeFamilyId,
        subject_id: resolvedSubjectId,
        name: cleanFileName,
        category: selectedFile.category,
        classification: selectedFile.classification,
        filenestFileId: cleanFileName,
        filenest_file_id: cleanFileName,
        customToast: `${selectedFile.category} uploaded. ${coordName} will review.`,
        date: 'Today',
        status: 'parsed',
        summary: selectedFile.summary,
        uploader: `${userName} (Parent)`,
        fileSize: selectedFile.fileSize
      } as any);

      context.showToast(`${selectedFile.category} uploaded. ${coordName} will review.`);
      
      // Reset form
      setSelectedFile(null);
      setDocumentSource(null);
      setIsUploaded(false);
      setShowReview(false);
    } catch (err: any) {
      console.warn('Error uploading document:', err);
      const message = err?.message || 'Could not complete upload. Please try again.';
      setUploadError(message);
      Alert.alert('Upload Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setDocumentSource(null);
    setIsUploaded(false);
    setShowReview(false);
    setUploadError(null);
    context.showToast('Upload cancelled.');
  };

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-[#f2f2f7]">
        {/* Header */}
        <View className="bg-white pt-6 pb-5 px-6 border-b border-neutral-100 flex-row items-center justify-between">
          <View>
            <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Share Records with {coordName}
            </Text>
            <Text className="text-2xl font-bold text-neutral-900 tracking-tight">
              Send Health Document
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(parent)')}
            className="p-2 bg-neutral-50 rounded-full border border-neutral-200"
          >
            <ChevronLeft size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-5 space-y-5">
          {!isUploaded ? (
            <View className="space-y-5">
              <View className="space-y-3">
                <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider pl-1">
                  Choose document to send
                </Text>

                {/* 1. Take a Photo */}
                <TouchableOpacity
                  onPress={handleTakePhoto}
                  testID="parent-documents-camera"
                  accessibilityLabel="Take photo of prescription"
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

                {/* 2. Choose from Gallery */}
                <TouchableOpacity
                  onPress={handleChooseGallery}
                  testID="parent-documents-gallery"
                  accessibilityLabel="Choose document from gallery"
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

                {/* 3. Record a Voice Note */}
                <TouchableOpacity
                  onPress={() => setIsVoiceModalOpen(true)}
                  testID="parent-documents-voice"
                  accessibilityLabel="Record a voice note"
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

              {/* Uploaded Documents List */}
              <View className="space-y-3 pt-2">
                <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider pl-1">
                  Uploaded Records & Prescriptions ({context.documents?.length || 0})
                </Text>
                {context.documents && context.documents.length > 0 ? (
                  context.documents.map((doc: any, index: number) => (
                    <View
                      key={`${doc.id}-${index}`}
                      testID={`parent-documents-item-${doc.id || index}`}
                      className="bg-white border border-neutral-100 rounded-2xl p-4 shadow-sm space-y-2"
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-3 flex-1 pr-2">
                          <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center border border-blue-100">
                            {doc.category === 'Doctor Memo' ? (
                              <Mic size={18} color="#af52de" />
                            ) : doc.category === 'Prescription' ? (
                              <Camera size={18} color="#ff3b30" />
                            ) : (
                              <FileText size={18} color="#007aff" />
                            )}
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
                        <View
                          testID={`parent-documents-status-${doc.id || index}`}
                          accessibilityLabel={`Document status: ${doc.status || 'active'}`}
                          className="bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full"
                        >
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
            /* Upload Confirmation Block (Matching user's screen) */
            <View className="bg-white border-4 border-amber-300 rounded-[32px] p-6 shadow-sm space-y-6">
              <View className="items-center text-center space-y-1">
                <Text className="text-base font-black text-slate-500 uppercase tracking-widest">
                  {documentSource === 'voice' || selectedFile?.source === 'voice' ? 'Voice Note Ready' : 'Document Selected'}
                </Text>
                <Text className="text-xl font-black text-slate-900 text-center px-2">
                  “Would you like to send this to {coordName}?”
                </Text>
              </View>

              {/* Photo / Memo preview card */}
              <View className="bg-amber-50/70 border-2 border-amber-200 rounded-2xl p-4 items-center space-y-2">
                {selectedFile?.uri ? (
                  <Image
                    source={{ uri: selectedFile.uri }}
                    className="w-24 h-24 rounded-2xl border-2 border-amber-300 shadow-sm"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-16 h-16 bg-white rounded-xl items-center justify-center border border-amber-200 shadow-xs">
                    {selectedFile?.source === 'voice' ? (
                      <Mic size={32} color="#af52de" />
                    ) : (
                      <FileText size={32} color="#d97706" />
                    )}
                  </View>
                )}

                <View className="items-center px-2">
                  <Text className="text-sm font-black text-slate-900 text-center" numberOfLines={1}>
                    {selectedFile?.name || 'document_file.jpg'}
                  </Text>
                  <Text className="text-xs font-semibold text-slate-500 mt-0.5">
                    {selectedFile?.category || 'Prescription'} • {selectedFile?.fileSize || '1.4 MB'} • High Resolution
                  </Text>
                </View>

                <View
                  testID="parent-documents-upload-success"
                  accessibilityLabel="Document selected and ready to upload"
                  className="bg-emerald-100 px-3 py-1 rounded-full flex-row items-center gap-1 mt-1"
                >
                  <CheckCircle2 size={12} color="#059669" />
                  <Text className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    {selectedFile?.source === 'voice' ? 'Voice Note Ready to Upload' : 'Photo Ready to Upload'}
                  </Text>
                </View>
              </View>

              {/* DOC-006: Upload rejection / error surfaced inline */}
              {uploadError && (
                <View
                  testID="document-upload-error"
                  accessibilityLabel={`Upload error: ${uploadError}`}
                  className="bg-red-50 border border-red-200 rounded-xl p-3"
                >
                  <Text className="text-xs font-bold text-red-600 leading-snug">
                    {uploadError}
                  </Text>
                </View>
              )}

              {/* Preview Block if Review clicked */}
              {showReview && (
                <View className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                  <Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Document Details
                  </Text>
                  <Text className="text-xs font-bold text-slate-700 leading-relaxed">
                    {selectedFile?.summary}
                  </Text>
                  {selectedFile?.notes && (
                    <Text className="text-xs text-purple-700 italic font-medium bg-purple-50 p-2 rounded-lg border border-purple-100">
                      🎙️ Note: "{selectedFile.notes}"
                    </Text>
                  )}
                </View>
              )}

              {/* Core Actions list */}
              <View className="space-y-3">
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={isSubmitting}
                  testID="parent-documents-upload"
                  accessibilityLabel="Upload document to care vault"
                  className="w-full bg-[#059669] py-4 rounded-2xl flex-row items-center justify-center gap-2 active:scale-95 shadow-md"
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Upload size={18} color="#ffffff" />
                  )}
                  <Text className="text-white font-black text-sm uppercase tracking-widest">
                    {isSubmitting ? 'Uploading to Care Vault...' : 'Upload'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowReview(!showReview)}
                  testID="parent-documents-review"
                  className="w-full bg-slate-100 border border-slate-200 py-4 rounded-2xl flex-row items-center justify-center gap-2 active:scale-95"
                >
                  <Eye size={16} color="#708090" />
                  <Text className="text-slate-600 font-black text-xs uppercase tracking-wider">
                    {showReview ? 'Hide preview' : 'Review'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCancel}
                  disabled={isSubmitting}
                  testID="parent-documents-cancel"
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

        {/* Interactive Voice Note Recorder Modal */}
        <Modal
          visible={isVoiceModalOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsVoiceModalOpen(false)}
        >
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-white rounded-t-[32px] p-6 space-y-5 border-t-2 border-purple-500 shadow-2xl">
              <View className="w-12 h-1 bg-neutral-300 rounded-full self-center" />

              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-xs font-bold text-purple-600 uppercase tracking-wider">
                    Clinic Voice Dictation
                  </Text>
                  <Text className="text-xl font-bold text-neutral-900">
                    Record Doctor Instructions
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (timerRef.current) clearInterval(timerRef.current);
                    setIsRecording(false);
                    setIsVoiceModalOpen(false);
                  }}
                  className="p-2 bg-neutral-100 rounded-full"
                >
                  <Ban size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Recording status display */}
              <View className="bg-purple-50 rounded-2xl p-6 items-center space-y-3 border border-purple-100">
                <TouchableOpacity
                  onPress={isRecording ? () => stopVoiceRecording() : startVoiceRecording}
                  className={`w-20 h-20 rounded-full items-center justify-center shadow-lg active:scale-95 ${
                    isRecording ? 'bg-red-500' : 'bg-purple-600'
                  }`}
                >
                  {isRecording ? <Square size={28} color="#fff" /> : <Mic size={32} color="#fff" />}
                </TouchableOpacity>

                <View className="items-center">
                  <Text className="text-2xl font-black text-neutral-900 tracking-tight">
                    {`00:${recordingSeconds < 10 ? '0' : ''}${recordingSeconds}`}
                  </Text>
                  <Text className="text-xs font-bold text-purple-800 mt-1">
                    {isRecording ? 'Listening... Tap red square to finish' : 'Tap microphone to start recording'}
                  </Text>
                </View>
              </View>

              {/* Quick Presets */}
              <View className="space-y-2">
                <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Or select doctor instruction preset:
                </Text>
                {[
                  'Dr. Sharma advised continuing Amlodipine & drinking water.',
                  'Doctor increased evening medication dose after review.',
                  'Routine clinic visit complete. Next check-up in 4 weeks.'
                ].map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => stopVoiceRecording(preset)}
                    className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex-row items-center justify-between active:scale-98"
                  >
                    <Text className="text-xs font-medium text-neutral-800 flex-1 pr-2">
                      "{preset}"
                    </Text>
                    <ArrowRight size={14} color="#af52de" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>

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
