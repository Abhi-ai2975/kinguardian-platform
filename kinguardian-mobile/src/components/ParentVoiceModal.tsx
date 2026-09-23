import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { X, Volume2, ArrowRight } from 'lucide-react-native';
import { AppContext } from '../store/AppContext';

interface ParentVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmTimeline: (msg: string) => void;
}

export const ParentVoiceModal: React.FC<ParentVoiceModalProps> = ({
  isOpen,
  onClose,
  onConfirmTimeline
}) => {
  const context = useContext(AppContext);
  const coordName = context?.coordinatorName || 'Coordinator';
  const userName = context?.currentUser?.name || 'Sir';

  const [stage, setStage] = useState<'idle' | 'listening' | 'processing' | 'answering'>('idle');
  const [spokenQuery, setSpokenQuery] = useState('');
  const [aiReply, setAiReply] = useState('');

  const presetQueries = [
    {
      text: 'When is my next doctor appointment?',
      reply:
        `${userName}, your next appointment with Dr. Sharma at Apollo Chennai is tomorrow morning at 10:30 AM IST.`
    },
    {
      text: 'Did I take my morning medicines today?',
      reply:
        'Yes, you took your Amlodipine 5mg at 8:15 AM IST. Your evening Atorvastatin is scheduled for 8:00 PM IST.'
    },
    {
      text: `Send a note to ${coordName} that I had buttermilk and feel good.`,
      reply:
        `I have shared that message with ${coordName}. They will see it on their dashboard instantly.`
    }
  ];

  const handleTriggerSpeech = (queryText: string) => {
    setSpokenQuery(queryText);
    setStage('listening');

    setTimeout(() => {
      setStage('processing');

      setTimeout(() => {
        const match = presetQueries.find((q) => q.text === queryText);
        setAiReply(
          match
            ? match.reply
            : `I am connected to your doctor records. How can I help you, ${userName}?`
        );
        setStage('answering');

        if (queryText.includes('Send a note to') || queryText.includes(coordName)) {
          onConfirmTimeline(`${userName} logged check-in: Had buttermilk and feels good.`);
        }
      }, 1500);
    }, 2000);
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-[#1e293b] rounded-t-[32px] p-6 space-y-5 items-center border-t-2 border-[#3b82f6]">
          {/* Top Notch bar */}
          <View className="w-12 h-1 bg-slate-700 rounded-full" />

          {/* Close button */}
          <View className="flex-row justify-between items-center w-full">
            <Text className="text-base font-black text-slate-300 uppercase tracking-wide">
              KinGuardian Voice Co-Pilot
            </Text>

            <TouchableOpacity
              onPress={() => {
                setStage('idle');
                setSpokenQuery('');
                setAiReply('');
                onClose();
              }}
              className="p-1.5 bg-slate-800 rounded-full"
            >
              <X size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Dynamic display */}
          <View className="w-full min-h-[140px] items-center justify-center text-center px-4 py-2">
            {stage === 'idle' && (
              <View className="space-y-1 items-center">
                <Text className="text-base font-black text-slate-200 text-center">
                  Tap a question below to speak...
                </Text>
                <Text className="text-[10px] text-slate-400 font-bold text-center uppercase tracking-wider">
                  Elderly voice dictation active
                </Text>
              </View>
            )}

            {stage === 'listening' && (
              <View className="space-y-4 items-center">
                <Text className="text-[10px] font-black text-[#3b82f6] uppercase tracking-widest">
                  Listening...
                </Text>
                <Text className="text-lg font-black text-white italic text-center">
                  "{spokenQuery}"
                </Text>
                {/* Audio wave simulation */}
                <View className="flex-row items-center gap-1">
                  <View className="w-1.5 h-6 bg-[#3b82f6] rounded-full" />
                  <View className="w-1.5 h-10 bg-[#3b82f6] rounded-full animate-pulse" />
                  <View className="w-1.5 h-4 bg-[#3b82f6] rounded-full" />
                </View>
              </View>
            )}

            {stage === 'processing' && (
              <View className="space-y-2 items-center">
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text className="text-xs font-bold text-slate-400">
                  Analyzing clinical record syncs...
                </Text>
              </View>
            )}

            {stage === 'answering' && (
              <View className="w-full bg-slate-800 p-4.5 rounded-2xl border border-slate-700 space-y-2">
                <View className="flex-row items-center gap-1.5">
                  <Volume2 size={14} color="#3b82f6" />
                  <Text className="text-[9px] font-black text-[#3b82f6] uppercase tracking-wider">
                    AI Speech Output
                  </Text>
                </View>
                <Text className="text-sm font-semibold text-slate-100 leading-relaxed">
                  {aiReply}
                </Text>
                <Text className="text-[8px] text-slate-500 font-bold uppercase mt-1">
                  Audio read-out active
                </Text>
              </View>
            )}
          </View>

          {/* Presets */}
          {stage === 'idle' && (
            <View className="w-full space-y-2 pt-2 border-t border-slate-800">
              {presetQueries.map((q) => (
                <TouchableOpacity
                  key={q.text}
                  onPress={() => handleTriggerSpeech(q.text)}
                  className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl flex-row items-center justify-between active:scale-98"
                >
                  <Text className="text-xs font-bold text-slate-200 flex-1 pr-2">"{q.text}"</Text>
                  <ArrowRight size={14} color="#3b82f6" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {stage === 'answering' && (
            <TouchableOpacity
              onPress={() => {
                setStage('idle');
                setSpokenQuery('');
                setAiReply('');
              }}
              className="w-full py-4 bg-[#3b82f6] rounded-2xl items-center justify-center active:scale-95"
            >
              <Text className="text-white font-black text-xs uppercase">Ask Another Question</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};
