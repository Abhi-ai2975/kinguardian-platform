import { useContext, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { AppContext } from '../../src/store/AppContext';
import { ParentBottomNavBar } from '../../src/components/Navigation';
import { DeviceFrame } from '../../src/components/DeviceFrame';
import { SimulatorControls } from '../../src/components/SimulatorControls';
import { useRouter } from 'expo-router';
import {
  Mic,
  Volume2,
  Sparkles,
  Send,
  Pill
} from 'lucide-react-native';

import { ApiAIService } from '../../src/services';

const aiService = new ApiAIService();

export default function ParentVoiceRoute() {
  const context = useContext(AppContext);
  const router = useRouter();
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [typedQuery, setTypedQuery] = useState('');
  const [transcript, setTranscript] = useState<string | null>(null);
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [responseSource, setResponseSource] = useState<'backend' | 'fallback' | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [accessRestricted, setAccessRestricted] = useState(false);

  if (!context) return null;

  const userName = context.currentUser?.name || 'Parent';

  const promptExamples = [
    {
      text: 'What medicine do I take tonight?',
      badge: 'Medication Guide',
      reply:
        `Hello ${userName} ji! 😊\n\nTonight at 8:00 PM with dinner, please take your Atorvastatin 20mg tablet with a glass of water.\n\nYour morning blood pressure medicine (Amlodipine 5mg) is already completed. Sleep well and stay hydrated!`
    },
    {
      text: 'When is my next doctor appointment?',
      badge: 'Appointment',
      reply:
        'Your next visit is tomorrow at 4:00 PM with Dr. Sharma for a Cardiology consultation at Apollo Hospital Chennai.'
    },
    {
      text: 'What does my medicine do?',
      badge: 'Education',
      reply:
        'Amlodipine gently keeps your blood pressure relaxed and stable, while Atorvastatin protects your heart and cholesterol levels.'
    }
  ];

  const handleSendQuery = async (queryText?: string) => {
    const activeText = queryText || typedQuery;
    if (!activeText.trim() || loading) return;

    setLoading(true);
    setTranscript(activeText);
    setAiReply(null);
    setResponseSource(null);
    setCitations([]);
    setAccessRestricted(false);
    setTypedQuery('');

    try {
      const subjectId = context.currentPersonId || context.currentUser?.id || 'dad';
      const res = await aiService.ask(activeText, [subjectId]);
      setAiReply(
        res.answer ||
          `Hello ${userName} ji! Tonight at 8:00 PM with dinner, please take your Atorvastatin 20mg tablet with water.`
      );
      setResponseSource(res.source || 'backend');
      setCitations(res.citations || []);
      setAccessRestricted(Boolean(res.accessRestricted));
      context.showToast('KinGuardian answered your question.');
    } catch (e) {
      setAiReply(
        `Hello ${userName} ji! Tonight at 8:00 PM with dinner, please take your Atorvastatin 20mg tablet with water.`
      );
      setResponseSource('fallback');
      setAccessRestricted(false);
      context.showToast('KinGuardian answered your question.');
    } finally {
      setLoading(false);
    }
  };

  const startRecord = () => {
    setRecording(true);
    setTranscript(null);
    setAiReply(null);
    setResponseSource(null);
    setCitations([]);
    setAccessRestricted(false);
    context.showToast(`Listening to ${userName}...`);

    setTimeout(async () => {
      setRecording(false);
      setLoading(true);
      const voiceQuestion = 'What medicine do I take tonight?';
      setTranscript(voiceQuestion);

      try {
        const subjectId = context.currentPersonId || context.currentUser?.id || 'dad';
        const res = await aiService.ask(voiceQuestion, [subjectId]);
        setAiReply(
          res.answer ||
            `Hello ${userName} ji! Tonight at 8:00 PM with dinner, please take your Atorvastatin 20mg tablet with water.`
        );
        setResponseSource(res.source || 'backend');
        setCitations(res.citations || []);
        setAccessRestricted(Boolean(res.accessRestricted));
        context.showToast('Answered your question.');
      } catch (e) {
        setAiReply(
          `Hello ${userName} ji! Tonight at 8:00 PM with dinner, please take your Atorvastatin 20mg tablet with water.`
        );
        setResponseSource('fallback');
        setAccessRestricted(false);
        context.showToast('Answered your question.');
      } finally {
        setLoading(false);
      }
    }, 1800);
  };

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-[#f8fafc]">
        {/* Header */}
        <View className="bg-white pt-5 pb-4 px-5 border-b border-slate-200">
          <View className="flex-row items-center justify-between">
            <View>
              <View className="flex-row items-center gap-2">
                <Text className="text-xl font-black text-slate-900 tracking-tight">Ask KinGuardian</Text>
                <View className="bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Text className="text-[10px] font-black text-emerald-800">Parent Voice & Chat</Text>
                </View>
              </View>
              <Text className="text-xs text-slate-500 font-medium mt-0.5">
                Simple, parent-friendly medical assistant for {userName}
              </Text>
            </View>
            <View className="w-9 h-9 rounded-full bg-emerald-50 items-center justify-center border border-emerald-100 shadow-xs">
              <Sparkles size={18} color="#059669" fill="#059669" />
            </View>
          </View>
        </View>

        <ScrollView className="flex-1 px-4 pt-4 space-y-4">

          {/* Chat Response Display Area */}
          <View className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs min-h-[130px] justify-center">
            {recording ? (
              <View className="items-center space-y-2 py-4">
                <Text className="text-base font-bold text-rose-600 animate-pulse">
                  Listening to {userName}...
                </Text>
                <Text className="text-xs text-slate-400 font-semibold">Speak clearly now</Text>
              </View>
            ) : loading ? (
              <View className="items-center space-y-2.5 py-4">
                <ActivityIndicator size="small" color="#059669" />
                <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  KinGuardian is checking your medicines...
                </Text>
              </View>
            ) : transcript ? (
              <View className="space-y-3">
                <View className="space-y-0.5">
                  <Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    You Asked:
                  </Text>
                  <Text className="text-sm font-bold text-slate-900">"{transcript}"</Text>
                </View>
                {aiReply && (
                  <View testID="parent-ask-answer" accessibilityLabel="KinGuardian AI answer" className="pt-3 border-t border-slate-100 space-y-1.5">
                    <View className="flex-row items-center gap-1.5">
                      <Sparkles size={13} color="#059669" fill="#059669" />
                      <Text className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">
                        KinGuardian AI
                      </Text>
                    </View>
                    <View
                      testID={responseSource === 'fallback' ? 'ai-fallback-message' : 'parent-ask-response-source'}
                      className={`self-start px-2 py-1 rounded-full border ${responseSource === 'backend' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}
                    >
                      <Text className={`text-[10px] font-black uppercase tracking-wider ${responseSource === 'backend' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {responseSource === 'backend' ? 'Live backend response' : 'Offline fallback response'}
                      </Text>
                    </View>
                    <Text className="text-xs font-medium text-slate-800 leading-relaxed">
                      {aiReply}
                    </Text>
                    {citations.length > 0 && (
                      <Text testID="parent-ask-sources" className="text-[10px] text-slate-500 mt-1">
                        Sources: {citations.join(', ')}
                      </Text>
                    )}
                    {accessRestricted && (
                      <View testID="ai-access-limitation" className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-1">
                        <Text className="text-[11px] font-black text-amber-900">Family Privacy & Care Scope Protected</Text>
                        <Text className="text-[10px] font-medium text-amber-800 leading-relaxed mt-0.5">
                          Unauthorized family member data was shielded in accordance with patient privacy regulations and care grant rules.
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ) : (
              <View className="items-center py-2 space-y-1.5">
                <Text className="text-base font-black text-slate-800 text-center">
                  How can I help you today, {userName}?
                </Text>
                <Text className="text-xs font-medium text-slate-500 text-center">
                  Type your question below, tap a prompt, or press the big microphone.
                </Text>
              </View>
            )}
          </View>

          {/* Suggested Prompts List */}
          <View className="space-y-2">
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
              Quick Questions (Tap to Ask):
            </Text>
            <View className="space-y-2">
              {promptExamples.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSendQuery(item.text)}
                  className="w-full bg-white border border-slate-200 p-3.5 rounded-xl flex-row items-center gap-3 active:scale-98 shadow-xs"
                >
                  <View className="w-8 h-8 rounded-lg bg-emerald-50 items-center justify-center border border-emerald-100">
                    <Pill size={16} color="#059669" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-slate-900 mb-0.5">{item.text}</Text>
                    <Text className="text-[10px] text-slate-500 font-medium">{item.badge}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Text Input Box */}
          <View className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <Text className="text-[10px] font-black text-slate-500 uppercase tracking-wide">
              Type your question
            </Text>
            <View className="flex-row items-center bg-slate-100 border border-slate-200 rounded-xl px-3 py-1">
              <TextInput
                testID="parent-ask-input"
                accessibilityLabel="Type your question for KinGuardian"
                value={typedQuery}
                onChangeText={setTypedQuery}
                placeholder='Type: "What medicine do I take tonight?"'
                placeholderTextColor="#94a3b8"
                className="flex-1 py-2 text-xs text-slate-800 font-semibold"
                onSubmitEditing={() => handleSendQuery()}
              />
              <TouchableOpacity
                testID="parent-ask-send"
                accessibilityLabel="Send question to KinGuardian AI"
                onPress={() => handleSendQuery()}
                disabled={loading || !typedQuery.trim()}
                className={`p-2 rounded-lg ${typedQuery.trim() ? 'bg-emerald-600' : 'bg-slate-300'}`}
              >
                <Send size={13} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Large Microphone Container */}
          <View className="items-center py-3">
            <TouchableOpacity
              testID="parent-ask-mic"
              accessibilityLabel="Tap microphone to speak your question"
              onPress={startRecord}
              disabled={recording || loading}
              activeOpacity={0.8}
              className={`w-20 h-20 rounded-full items-center justify-center border-4 border-white shadow-lg ${
                recording ? 'bg-red-500' : 'bg-emerald-600'
              } active:scale-95`}
            >
              {recording ? <Volume2 size={32} color="#ffffff" /> : <Mic size={32} color="#ffffff" />}
            </TouchableOpacity>
            <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">
              {recording ? 'LISTENING... TAP TO STOP' : 'TAP MICROPHONE TO SPEAK'}
            </Text>
          </View>

          <View className="h-24" />
        </ScrollView>

        <ParentBottomNavBar
          activeTab="ask"
          onTabChange={(tab) => {
            if (tab === 'home') router.push('/(parent)');
            else if (tab === 'medicines') router.push('/(parent)/medicines');
            else if (tab === 'profile') router.push('/(parent)/profile');
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
