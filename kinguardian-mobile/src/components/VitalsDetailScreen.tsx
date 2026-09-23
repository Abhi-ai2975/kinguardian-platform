import React, { useState, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import {
  ArrowLeft,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Pill,
  Sparkles,
  Upload,
  Watch,
  ChevronRight
} from 'lucide-react-native';

import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { AppContext } from '../store/AppContext';


interface VitalsDetailScreenProps {
  personId: string;
  onBack: () => void;
  onLogBP: (vital: { systolic: number; diastolic: number; note: string }) => void;
  onLogGlucose: (value: number, note: string) => void;
  readingsHistory: any[];
}

export const VitalsDetailScreen: React.FC<VitalsDetailScreenProps> = ({
  personId,
  onBack,
  onLogBP,
  onLogGlucose,
  readingsHistory
}) => {
  const context = useContext(AppContext);
  const router = useRouter();
  const [systolicInput, setSystolicInput] = useState('');

  const [diastolicInput, setDiastolicInput] = useState('');
  const [glucoseInput, setGlucoseInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [chartRange, setChartRange] = useState<'7d' | '30d'>('7d');

  if (!context) return null;

  const parent =
    context.people.find((p) => p.id === personId || p.backendSubjectId === personId) ||
    context.familyMembers.find((p) => p.id === personId || p.backendSubjectId === personId) ||
    context.people[0] ||
    context.familyMembers[0];
  if (!parent) return null;

  const isDad = parent.id === 'dad' || parent.relationship?.toLowerCase().includes('father') || personId === 'dad';
  const [selectedVitalTab, setSelectedVitalTab] = useState<'bp' | 'glucose'>(isDad ? 'bp' : 'glucose');

  const matchSubject = (targetId?: string | null) => {
    if (!targetId) return true;
    return (
      targetId === personId ||
      targetId === parent.id ||
      targetId === parent.backendSubjectId ||
      (isDad && targetId === 'dad') ||
      (!isDad && (targetId === 'mom' || targetId === 'mother' || targetId === 'vandana'))
    );
  };

  // Vitals check for alert status
  const bpSystolic = parseInt(context.currentBP.split('/')[0] || '120', 10);
  const isDadSpiked = bpSystolic >= 140;
  const statusText = isDad ? (isDadSpiked ? 'Needs attention' : 'Doing well') : 'Doing well';
  const statusColor =
    statusText === 'Needs attention'
      ? 'text-rose-600 bg-rose-50 border border-rose-100'
      : 'text-emerald-700 bg-emerald-50 border border-emerald-100';

  const handleLogVital = () => {
    if (selectedVitalTab === 'bp') {
      const sys = parseInt(systolicInput);
      const dia = parseInt(diastolicInput);
      if (sys && dia) {
        onLogBP({ systolic: sys, diastolic: dia, note: noteInput });
        setSystolicInput('');
        setDiastolicInput('');
        setNoteInput('');
      }
    } else {
      const glu = parseInt(glucoseInput);
      if (glu) {
        onLogGlucose(glu, noteInput);
        setGlucoseInput('');
        setNoteInput('');
      }
    }
  };

  // Initial data points for rendering SVG charts
  const bpData = [132, 134, 137, 139, 134, 140, 136, 138];
  const glucoseData = [94, 96, 102, 98, 92, 104, 98, 99];
  const currentData = selectedVitalTab === 'bp' ? bpData : glucoseData;

  // SVG Chart Dimensions
  const chartWidth = 360;
  const chartHeight = 120;
  const padding = 20;

  // Calculate points
  const points = currentData.map((val, idx) => {
    const x = padding + (idx * (chartWidth - padding * 2)) / (currentData.length - 1);
    const minVal = isDad ? 120 : 80;
    const maxVal = isDad ? 150 : 120;
    const valRange = maxVal - minVal;
    const y = chartHeight - padding - ((val - minVal) / valRange) * (chartHeight - padding * 2);
    return `${x},${y}`;
  });

  const pathD = points.length > 0 ? `M ${points.map((p) => p).join(' L ')}` : '';
  const areaD =
    points.length > 0 ? `M 20,100 L ${points.map((p) => p).join(' L ')} L 340,100 Z` : '';

  const avgVal = Math.round(currentData.reduce((a, b) => a + b, 0) / currentData.length);

  return (
    <ScrollView className="flex-1 bg-[#fbfaf7]">
      {/* Header Bar */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#e2dfd9] bg-[#fbfaf7]">
        <TouchableOpacity onPress={onBack} className="p-2 bg-slate-100 rounded-full">
          <ArrowLeft size={16} color="#464554" />
        </TouchableOpacity>
        <Text className="text-sm font-black text-[#2a14b4] uppercase tracking-wider">
          Parent Profile
        </Text>
        <View className="w-9 h-9" />
      </View>

      <View className="p-5 space-y-6">
        {/* Parent Header Card */}
        <View className="bg-white rounded-3xl p-5 border border-[#e2dfd9] shadow-sm flex-row items-center justify-between">
          <View className="flex-row items-center gap-4">
            <Image
              source={{
                uri:
                  parent.avatarUrl ||
                  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'
              }}
              className="w-14 h-14 rounded-full border border-slate-100"
            />
            <View className="space-y-0.5">
              <Text className="text-xl font-black text-[#121c2a]">{parent.name}</Text>
              <Text className="text-xs text-slate-500 font-bold">
                {parent.age} · {parent.relationship || (isDad ? 'Father' : 'Mother')}
              </Text>
              <Text className="text-[10px] text-slate-400 font-semibold">{parent.location || `${parent.city || 'Chennai'}, ${parent.country || 'India'}`}</Text>
            </View>
          </View>
          <View className={`px-3 py-1 rounded-full ${statusColor}`}>
            <Text className="text-[9px] font-black uppercase">{statusText}</Text>
          </View>
        </View>

        {/* AI Summary Block */}
        <View className="bg-[#f4effc] border border-[#d9d5ff] rounded-3xl p-4.5 space-y-2 shadow-xs">
          <View className="flex-row items-center gap-2">
            <Sparkles size={16} color="#2a14b4" fill="#2a14b4" />
            <Text className="text-xs font-black text-[#2a14b4] uppercase tracking-wider">
              AI Clinical Summary
            </Text>
          </View>
          <Text className="text-xs text-slate-800 font-medium leading-relaxed">
            {isDad
              ? `“${parent.name}'s blood pressure has been somewhat higher than usual during the afternoon heatwave.”`
              : `“${parent.name}'s health vitals and telemetry have been steady and well monitored.”`}
          </Text>
        </View>

        {/* Health Sources: Connected Wearables Section */}
        <View className="space-y-2">
          <Text className="text-sm font-black text-[#121c2a] uppercase tracking-wider">
            Health Sources
          </Text>
          <TouchableOpacity
            onPress={() => router.push(`/(coordinator)/parent/${personId}/wearables` as any)}
            className="bg-white border border-[#e2dfd9] rounded-3xl p-4.5 shadow-sm space-y-3"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5">
                <View className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 items-center justify-center">
                  <Watch size={20} color="#2a14b4" />
                </View>
                <View>
                  <Text className="text-sm font-black text-slate-900">Connected Wearables</Text>
                  <Text className="text-[11px] text-slate-500 font-medium">
                    Apple Watch & Garmin active
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1">
                <Text className="text-xs font-bold text-[#2a14b4]">Manage</Text>
                <ChevronRight size={14} color="#2a14b4" />
              </View>
            </View>

            {/* Micro status chips */}
            <View className="flex-row items-center gap-2 pt-1 border-t border-slate-100">
              <View className="flex-row items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                <CheckCircle2 size={10} color="#059669" />
                <Text className="text-[9px] font-bold text-emerald-700">Apple Watch (8m ago)</Text>
              </View>
              <View className="flex-row items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                <CheckCircle2 size={10} color="#059669" />
                <Text className="text-[9px] font-bold text-emerald-700">Garmin (Today)</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* SECTION 1: Health Today */}
        <View className="space-y-3">

          <Text className="text-sm font-black text-[#121c2a] uppercase tracking-wider">
            Health today
          </Text>
          <View className="bg-white border border-[#e2dfd9] rounded-3xl p-5 shadow-sm space-y-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isDad ? 'Average Blood Pressure' : 'Average Fasting Glucose'}
                </Text>
                <Text className="text-2xl font-black text-[#121c2a] mt-1">
                  {isDad ? `${avgVal}/85` : `${avgVal}`}{' '}
                  <Text className="text-xs font-semibold text-slate-400">
                    {isDad ? 'mmHg' : 'mg/dL'}
                  </Text>
                </Text>
              </View>
              <View className="items-end">
                <View
                  className={`flex-row items-center gap-1 px-3 py-1 rounded-full ${isDad ? (isDadSpiked ? 'bg-[#ffdad6]' : 'bg-[#d2f4ef]') : 'bg-[#d2f4ef]'}`}
                >
                  {isDad && isDadSpiked ? (
                    <TrendingUp size={12} color="#ba1a1a" />
                  ) : (
                    <CheckCircle2 size={12} color="#006a61" />
                  )}
                  <Text
                    className={`text-[10px] font-black uppercase ${isDad && isDadSpiked ? 'text-[#ba1a1a]' : 'text-[#006a61]'}`}
                  >
                    {isDad && isDadSpiked ? 'Elevated' : 'Optimal'}
                  </Text>
                </View>
                <Text className="text-[9px] text-slate-400 mt-1">
                  Past {chartRange === '7d' ? '7 days' : '30 days'}
                </Text>
              </View>
            </View>

            {/* SVG Trend Chart */}
            <View className="w-full bg-[#fbfaf7] rounded-2xl p-4 border border-[#e2dfd9]">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-[10px] font-black text-slate-500 uppercase">Vital Trend</Text>
                <View className="flex-row bg-[#eff4ff] p-0.5 rounded-full border border-[#dee9fc]">
                  <TouchableOpacity
                    onPress={() => setChartRange('7d')}
                    className={`px-2.5 py-0.5 rounded-full ${chartRange === '7d' ? 'bg-[#4338ca]' : ''}`}
                  >
                    <Text
                      className={`text-[9px] font-black ${chartRange === '7d' ? 'text-white' : 'text-[#464554]'}`}
                    >
                      7D
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setChartRange('30d')}
                    className={`px-2.5 py-0.5 rounded-full ${chartRange === '30d' ? 'bg-[#4338ca]' : ''}`}
                  >
                    <Text
                      className={`text-[9px] font-black ${chartRange === '30d' ? 'text-white' : 'text-[#464554]'}`}
                    >
                      30D
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="h-32">
                <Svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                  <Defs>
                    <LinearGradient id="grad-bp" x1="0%" y1="0%" x2="0%" y2="100%">
                      <Stop offset="0%" stopColor="#ba1a1a" stopOpacity={0.3} />
                      <Stop offset="100%" stopColor="#ffffff" stopOpacity={0.0} />
                    </LinearGradient>
                    <LinearGradient id="grad-gl" x1="0%" y1="0%" x2="0%" y2="100%">
                      <Stop offset="0%" stopColor="#006a61" stopOpacity={0.3} />
                      <Stop offset="100%" stopColor="#ffffff" stopOpacity={0.0} />
                    </LinearGradient>
                  </Defs>
                  <Line x1="20" y1="20" x2="340" y2="20" stroke="#eff4ff" strokeWidth="1" />
                  <Line x1="20" y1="60" x2="340" y2="60" stroke="#eff4ff" strokeWidth="1" />
                  <Line x1="20" y1="100" x2="340" y2="100" stroke="#eff4ff" strokeWidth="1" />
                  {areaD ? (
                    <Path d={areaD} fill={isDad ? 'url(#grad-bp)' : 'url(#grad-gl)'} />
                  ) : null}
                  {pathD ? (
                    <Path
                      d={pathD}
                      fill="none"
                      stroke={isDad ? '#ba1a1a' : '#006a61'}
                      strokeWidth="2.5"
                    />
                  ) : null}
                  {points.map((pt, idx) => {
                    const [x, y] = pt.split(',').map(parseFloat);
                    return (
                      <Circle
                        key={idx}
                        cx={x}
                        cy={y}
                        r="4.5"
                        fill={isDad ? '#ba1a1a' : '#006a61'}
                        stroke="white"
                        strokeWidth="1.5"
                      />
                    );
                  })}
                </Svg>
              </View>
            </View>

            {/* Weight, Sleep and Step cards */}
            {isDad && (
              <View className="flex-row gap-3 pt-2">
                <View className="flex-1 bg-[#fbfaf7] border border-[#e2dfd9] rounded-2xl p-3 items-center">
                  <Text className="text-[8px] font-black text-slate-400 uppercase">Weight</Text>
                  <Text className="text-sm font-black text-slate-800 mt-0.5">72.4 kg</Text>
                </View>
                <View className="flex-1 bg-[#fbfaf7] border border-[#e2dfd9] rounded-2xl p-3 items-center">
                  <Text className="text-[8px] font-black text-slate-400 uppercase">Sleep</Text>
                  <Text className="text-sm font-black text-slate-800 mt-0.5">6.8 hrs</Text>
                </View>
                <View className="flex-1 bg-[#fbfaf7] border border-[#e2dfd9] rounded-2xl p-3 items-center">
                  <Text className="text-[8px] font-black text-slate-400 uppercase">Steps</Text>
                  <Text className="text-sm font-black text-slate-800 mt-0.5">3,420</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* SECTION 2: Medications */}
        <View className="space-y-3">
          <Text className="text-sm font-black text-[#121c2a] uppercase tracking-wider">
            Medications
          </Text>
          <View className="bg-white border border-[#e2dfd9] rounded-3xl p-4.5 shadow-sm space-y-3">
            {context.medications.filter((m) => matchSubject(m.personId)).length > 0 ? (
              context.medications
                .filter((m) => matchSubject(m.personId))
                .map((m) => (
                  <View
                    key={m.id}
                    className="flex-row items-center justify-between py-2 border-b border-slate-50 last:border-0 last:pb-0"
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="w-8 h-8 rounded-full bg-[#f4effc] items-center justify-center">
                        <Pill size={14} color="#2a14b4" />
                      </View>
                      <View>
                        <Text className="text-xs font-black text-slate-800">
                          {m.name} {m.dose}
                        </Text>
                        <Text className="text-[9px] text-slate-400 font-semibold">
                          {m.frequency} • {m.scheduledTime}
                        </Text>
                      </View>
                    </View>
                    <View
                      className={`px-2.5 py-0.5 rounded-full ${m.status === 'taken' ? 'bg-emerald-50' : 'bg-amber-50'}`}
                    >
                      <Text
                        className={`text-[8px] font-black uppercase ${m.status === 'taken' ? 'text-emerald-700' : 'text-amber-700'}`}
                      >
                        {m.status}
                      </Text>
                    </View>
                  </View>
                ))
            ) : (
              <Text className="text-xs text-slate-400 text-center py-2">
                No active medications recorded for {parent.name}.
              </Text>
            )}
          </View>
        </View>

        {/* SECTION 3: Appointments */}
        <View className="space-y-3">
          <Text className="text-sm font-black text-[#121c2a] uppercase tracking-wider">
            Appointments
          </Text>
          <View className="bg-white border border-[#e2dfd9] rounded-3xl p-4.5 shadow-sm space-y-3">
            {context.appointments.filter((a) => matchSubject(a.personId)).length > 0 ? (
              context.appointments
                .filter((a) => matchSubject(a.personId))
                .map((a) => (
                  <View key={a.id} className="flex-row items-start justify-between py-2">
                    <View className="flex-row items-start gap-3">
                      <View className="w-8 h-8 rounded-full bg-rose-50 items-center justify-center shrink-0">
                        <Calendar size={14} color="#ba1a1a" />
                      </View>
                      <View className="space-y-0.5">
                        <Text className="text-xs font-black text-slate-800">{a.specialty} Visit</Text>
                        <Text className="text-[10px] text-slate-400 font-semibold">
                          {a.doctorName} • {a.location}
                        </Text>
                        <Text className="text-[9px] text-[#2a14b4] font-bold">
                          {a.date} at {a.time}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
            ) : (
              <Text className="text-xs text-slate-400 text-center py-2">
                No upcoming visits scheduled for {parent.name}.
              </Text>
            )}
          </View>
        </View>

        {/* SECTION 4: Recent Activity */}
        <View className="space-y-3">
          <Text className="text-sm font-black text-[#121c2a] uppercase tracking-wider">
            Recent activity
          </Text>
          <View className="bg-white border border-[#e2dfd9] rounded-3xl p-4.5 shadow-sm space-y-4">
            {context.healthEvents.filter((r) => matchSubject(r.personId)).length > 0 ? (
              context.healthEvents
                .filter((r) => matchSubject(r.personId))
                .slice(0, 3)
                .map((rec) => (
                  <View key={rec.id} className="flex-row items-start gap-3">
                    <View className="w-2.5 h-2.5 rounded-full bg-[#2a14b4] mt-1.5 shrink-0" />
                    <View className="flex-1 space-y-0.5">
                      <Text className="text-xs font-black text-slate-800">{rec.title}</Text>
                      <Text className="text-[10px] text-slate-400 font-medium">{rec.subtitle}</Text>
                      <Text className="text-[8px] text-slate-400 font-bold">{rec.date}</Text>
                    </View>
                  </View>
                ))
            ) : (
              <Text className="text-xs text-slate-400 text-center py-2">
                All daily activities up to date.
              </Text>
            )}
          </View>
        </View>

        {/* SECTION 5: AI Insights */}
        <View className="space-y-3">
          <Text className="text-sm font-black text-[#121c2a] uppercase tracking-wider">
            AI Insights
          </Text>
          <View className="bg-white border border-[#e2dfd9] rounded-3xl p-4.5 shadow-sm space-y-3">
            {context.aiInsights.filter((i) => matchSubject(i.personId)).length > 0 ? (
              context.aiInsights
                .filter((i) => matchSubject(i.personId))
                .map((insight) => (
                  <View key={insight.id} className="space-y-1.5">
                    <View className="flex-row items-center gap-2">
                      <Sparkles size={14} color="#2a14b4" fill="#2a14b4" />
                      <Text className="text-xs font-black text-slate-800">{insight.title}</Text>
                    </View>
                    <Text className="text-[10px] text-slate-500 font-medium leading-relaxed">
                      {insight.summary}
                    </Text>
                    <View className="flex-row gap-1.5 flex-wrap">
                      {insight.sources.map((src, sIdx) => (
                        <View
                          key={sIdx}
                          className="bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100"
                        >
                          <Text className="text-[8px] font-bold text-slate-400">{src}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))
            ) : (
              <Text className="text-xs text-slate-400 text-center py-2">
                Vitals and step trends within expected clinical bounds.
              </Text>
            )}
          </View>
        </View>

        {/* SECTION 6: Care Team */}
        <View className="space-y-3">
          <Text className="text-sm font-black text-[#121c2a] uppercase tracking-wider">
            Care team
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row gap-3 py-1"
          >
            {(context.people && context.people.length > 0 ? context.people : context.familyMembers).map((member) => (
              <View
                key={member.id}
                className="bg-white rounded-3xl p-4 border border-[#e2dfd9] items-center space-y-1.5 w-24 shrink-0 shadow-sm"
              >
                <Image
                  source={{
                    uri:
                      member.avatarUrl ||
                      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'
                  }}
                  className="w-10 h-10 rounded-full border border-slate-100"
                />
                <View className="items-center">
                  <Text
                    className="text-[10px] font-black text-slate-800 text-center"
                    numberOfLines={1}
                  >
                    {member.name}
                  </Text>
                  <Text className="text-[8px] text-slate-400 font-bold text-center">
                    {member.relationship || (member as any).relation || 'Member'}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* SECTION 7: Recent Documents */}
        <View className="space-y-3">
          <Text className="text-sm font-black text-[#121c2a] uppercase tracking-wider">
            Recent documents
          </Text>
          <View className="bg-white border border-[#e2dfd9] rounded-3xl p-4.5 shadow-sm space-y-3.5">
            {context.documents.filter((d) => matchSubject(d.personId)).length > 0 ? (
              context.documents
                .filter((d) => matchSubject(d.personId))
                .map((doc) => (
                  <View key={doc.id} className="flex-row items-center justify-between py-1">
                    <View className="flex-row items-center gap-3">
                      <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
                        <Upload size={14} color="#708090" />
                      </View>
                      <View>
                        <Text className="text-xs font-black text-slate-800" numberOfLines={1}>
                          {doc.name}
                        </Text>
                        <Text className="text-[9px] text-slate-400 font-semibold">
                          {doc.fileSize || 'Prescription Scanner'} • {doc.date}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
            ) : (
              <Text className="text-xs text-slate-400 text-center py-2">
                No documents uploaded yet for {parent.name}.
              </Text>
            )}
          </View>
        </View>


        {/* Input Logger Form */}
        <View className="bg-white border border-[#e2dfd9] rounded-3xl p-5 shadow-sm space-y-4">
          <View>
            <Text className="text-sm font-black text-slate-900">Log New Measurements</Text>
            <Text className="text-xs font-bold text-slate-400 mt-0.5">
              Proxy log on behalf of your parents
            </Text>
          </View>

          <View className="space-y-4">
            {/* Vital Type Selector */}
            <View className="flex-row bg-slate-100 p-1 rounded-xl">
              <TouchableOpacity
                onPress={() => setSelectedVitalTab('bp')}
                className={`flex-1 py-2 rounded-lg items-center ${selectedVitalTab === 'bp' ? 'bg-white shadow-xs' : ''}`}
              >
                <Text className={`text-xs font-bold ${selectedVitalTab === 'bp' ? 'text-slate-900' : 'text-slate-500'}`}>
                  Blood Pressure
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedVitalTab('glucose')}
                className={`flex-1 py-2 rounded-lg items-center ${selectedVitalTab === 'glucose' ? 'bg-white shadow-xs' : ''}`}
              >
                <Text className={`text-xs font-bold ${selectedVitalTab === 'glucose' ? 'text-slate-900' : 'text-slate-500'}`}>
                  Blood Glucose
                </Text>
              </TouchableOpacity>
            </View>

            {selectedVitalTab === 'bp' ? (
              <View className="flex-row gap-3.5">
                <View className="flex-1 space-y-1.5">
                  <Text className="text-[10px] font-bold text-[#777586] uppercase">Systolic (mmHg)</Text>
                  <TextInput
                    value={systolicInput}
                    onChangeText={setSystolicInput}
                    placeholder="120"
                    keyboardType="numeric"
                    className="w-full bg-[#fbfaf7] border border-slate-100 rounded-xl px-4 py-3.5 text-xs text-slate-800"
                  />
                </View>
                <View className="flex-1 space-y-1.5">
                  <Text className="text-[10px] font-bold text-[#777586] uppercase">Diastolic (mmHg)</Text>
                  <TextInput
                    value={diastolicInput}
                    onChangeText={setDiastolicInput}
                    placeholder="80"
                    keyboardType="numeric"
                    className="w-full bg-[#fbfaf7] border border-slate-100 rounded-xl px-4 py-3.5 text-xs text-slate-800"
                  />
                </View>
              </View>
            ) : (
              <View className="space-y-1.5">
                <Text className="text-[10px] font-bold text-[#777586] uppercase">
                  Fasting Glucose level (mg/dL)
                </Text>
                <TextInput
                  value={glucoseInput}
                  onChangeText={setGlucoseInput}
                  placeholder="95"
                  keyboardType="numeric"
                  className="w-full bg-[#fbfaf7] border border-slate-100 rounded-xl px-4 py-3.5 text-xs text-slate-800"
                />
              </View>
            )}

            <View className="space-y-1.5">
              <Text className="text-[10px] font-bold text-[#777586] uppercase">
                Note / Symptoms (Optional)
              </Text>
              <TextInput
                value={noteInput}
                onChangeText={setNoteInput}
                placeholder="e.g., Logged after afternoon rest"
                className="w-full bg-[#fbfaf7] border border-slate-100 rounded-xl px-4 py-3.5 text-xs text-slate-800"
              />
            </View>

            <TouchableOpacity
              onPress={handleLogVital}
              className={`w-full py-4 rounded-2xl items-center justify-center active:scale-98 ${
                selectedVitalTab === 'bp' ? 'bg-[#ba1a1a]' : 'bg-[#006a61]'
              }`}
            >
              <Text className="text-white font-black text-xs uppercase tracking-wider">
                Confirm and Sync Log
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Readings History Log Table */}
        <View className="bg-white border border-[#e2dfd9] rounded-3xl p-5 shadow-sm space-y-3.5 mb-12">
          <Text className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
            Readings Log History
          </Text>
          <View className="space-y-3 pt-1">
            {readingsHistory && readingsHistory.length > 0 ? (
              readingsHistory.map((r, idx) => (
                <View
                  key={idx}
                  className="flex-row justify-between items-center py-2.5 border-b border-slate-50 last:border-0 last:pb-0"
                >
                  <View className="space-y-1">
                    <Text className="text-xs font-black text-slate-900">
                      {isDad
                        ? `${r.systolic}/${r.diastolic} mmHg`
                        : `${r.glucose || r.systolic} mg/dL`}
                    </Text>
                    {r.note ? (
                      <Text className="text-[10px] text-slate-400 font-semibold">{r.note}</Text>
                    ) : null}
                  </View>
                  <View className="items-end">
                    <Text className="text-[9px] font-bold text-slate-500">
                      {r.date} at {r.time || '10:00 AM'}
                    </Text>
                    <Text className="text-[8px] text-slate-400">
                      {r.source || 'Connected Device'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text className="text-xs text-slate-400 text-center py-4">
                No recent manual entries stored.
              </Text>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
