import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { X, Camera, Upload } from 'lucide-react-native';
import { DocumentItem } from '../types';
import { AppContext } from '../store/AppContext';

interface ParentCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadDocument: (doc: DocumentItem) => void;
}

export const ParentCameraModal: React.FC<ParentCameraModalProps> = ({
  isOpen,
  onClose,
  onUploadDocument
}) => {
  const context = useContext(AppContext);
  const coordName = context?.coordinatorName || 'Coordinator';
  const userName = context?.currentUser?.name || 'Parent';

  const [photoTaken, setPhotoTaken] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [shutterFlash, setShutterFlash] = useState(false);

  const mockFile = {
    name: `${userName.replace(/\s+/g, '_')}_Cardiac_Report.pdf`,
    category: 'Diagnostic Lab',
    size: '1.8 MB',
    summary:
      `${userName}'s daily telemetry analysis showing normal resting heart rate averages and stable cardiac dynamics.`,
    findings: [
      'Sinus rhythm at 74 bpm (Stable)',
      'eGFR: 78 mL/min (Optimal kidney clearance)',
      'Occasional benign PVCs under 0.8% load burden.'
    ],
    recommendations: [
      'Continue morning Amlodipine 5mg and evening Atorvastatin.',
      'Refill prescription at local clinic pharmacy.',
      'Maintain adequate hydration during peak daytime heat.'
    ]
  };

  const handleCapture = () => {
    setShutterFlash(true);
    setTimeout(() => {
      setShutterFlash(false);
      setPhotoTaken(true);
    }, 150);
  };

  const handleUpload = () => {
    setIsUploading(true);
    setUploadPercent(0);

    const interval = setInterval(() => {
      setUploadPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            const docItem: DocumentItem = {
              id: `doc-${Date.now()}`,
              name: mockFile.name,
              category: mockFile.category,
              date: 'Today',
              status: 'parsed',
              summary: mockFile.summary,
              findings: mockFile.findings,
              recommendations: mockFile.recommendations,
              uploader: `${userName} (Camera Ingestion)`,
              fileSize: mockFile.size
            };

            onUploadDocument(docItem);
            setIsUploading(false);
            setPhotoTaken(false);
            onClose();
          }, 400);
          return 100;
        }
        return prev + 20;
      });
    }, 250);
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View className="flex-1 bg-black justify-between">
        {/* Shutter white flash */}
        {shutterFlash && <View className="absolute inset-0 bg-white z-50 opacity-100" />}

        {/* Top bar */}
        <View className="flex-row justify-between items-center px-5 py-4 bg-black/60 z-40">
          <Text className="text-xs font-black tracking-widest uppercase text-white">
            KinGuardian DocScanner
          </Text>

          <TouchableOpacity
            onPress={() => {
              setPhotoTaken(false);
              onClose();
            }}
            disabled={isUploading}
            className="p-1.5 bg-white/10 rounded-full"
          >
            <X size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Viewfinder / Preview Screen */}
        <View className="flex-1 bg-neutral-900 justify-center items-center relative border-y border-neutral-800">
          {/* Grid lines */}
          {!photoTaken && (
            <View className="absolute inset-0 opacity-20 pointer-events-none">
              <View className="w-full h-px bg-white absolute top-1/3" />
              <View className="w-full h-px bg-white absolute top-2/3" />
              <View className="h-full w-px bg-white absolute left-1/3" />
              <View className="h-full w-px bg-white absolute left-2/3" />
            </View>
          )}

          {!photoTaken ? (
            <View className="items-center space-y-2.5 p-6">
              <Camera size={36} color="#777586" />
              <Text className="text-xs font-black text-slate-400 text-center">
                Align prescription report inside grid
              </Text>
            </View>
          ) : (
            <View className="w-full items-center justify-center p-6 space-y-4">
              {isUploading ? (
                <View className="w-full max-w-xs bg-[#121c2a] p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3.5 items-center">
                  <Upload size={24} color="#3b82f6" />
                  <Text className="text-xs font-black text-white">
                    Uploading to Care Vault...
                  </Text>
                  <View className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <View className="bg-[#3b82f6] h-1.5" style={{ width: `${uploadPercent}%` }} />
                  </View>
                  <Text className="text-[9px] text-slate-400 font-bold">
                    {uploadPercent}% uploaded
                  </Text>
                </View>
              ) : (
                <View className="space-y-4 items-center">
                  {/* Photo mock card preview */}
                  <View className="bg-white p-4.5 rounded-2xl max-w-[240px] shadow-lg border-t-8 border-[#f59e0b] space-y-2">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-[9px] font-bold text-slate-400">
                        Diagnostic Center
                      </Text>
                      <Text className="text-[9px] font-bold text-slate-400">Today</Text>
                    </View>
                    <Text className="text-xs font-black text-slate-800 truncate">
                      {userName} EKG Review
                    </Text>
                    <Text className="text-[9px] leading-relaxed text-slate-500 font-medium">
                      ECG confirms Sinus rhythm at 74 bpm. Doctor advises continuing daily prescribed regimen.
                    </Text>
                  </View>
                  <Text className="text-xs font-black text-slate-300">
                    Prescription captured successfully!
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Shutter bottom actions */}
        <View className="bg-black/60 py-6 px-5 items-center justify-center z-45">
          {!photoTaken ? (
            <TouchableOpacity
              onPress={handleCapture}
              className="w-16 h-16 rounded-full bg-white border-4 border-slate-400 items-center justify-center active:scale-90"
            >
              <View className="w-12 h-12 rounded-full bg-white border border-slate-800" />
            </TouchableOpacity>
          ) : (
            <View className="flex-row gap-4 w-full max-w-xs justify-center">
              <TouchableOpacity
                onPress={() => setPhotoTaken(false)}
                disabled={isUploading}
                className="flex-1 py-3.5 border border-slate-600 rounded-2xl items-center justify-center active:scale-95 disabled:opacity-50"
              >
                <Text className="text-slate-300 font-black text-xs">Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpload}
                disabled={isUploading}
                className="flex-1 py-3.5 bg-[#f59e0b] rounded-2xl items-center justify-center active:scale-95 disabled:opacity-50 shadow-md"
              >
                <Text className="text-white font-black text-xs">Send to {coordName}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
