import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Switch,
  Modal,
  ScrollView
} from 'react-native';
import {
  ArrowLeft,
  ChevronRight,
  Info,
  Calendar,
  Clock,
  MapPin,
  Mic,
  FileText,
  Shield,
  Bell,
  X,
  AlertTriangle
} from 'lucide-react-native';

// ==========================================
// 1. AppHeader
// ==========================================
export const AppHeader: React.FC<{
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}> = ({ title, subtitle, onBack, rightAction }) => (
  <View
    className="bg-[#2a14b4] pt-8 pb-5 px-6 flex-row items-center justify-between border-b border-[#c3c0ff]/20"
    accessibilityRole="header"
    accessibilityLabel={`${title} Header`}
  >
    <View className="flex-row items-center gap-3.5">
      {onBack && (
        <TouchableOpacity
          onPress={onBack}
          className="p-2 bg-white/10 rounded-full"
          accessibilityLabel="Go back"
          accessibilityRole="button"
          accessibilityHint="Returns to the previous screen"
        >
          <ArrowLeft size={18} color="#ffffff" />
        </TouchableOpacity>
      )}
      <View>
        <Text className="text-lg font-black text-white">{title}</Text>
        {subtitle && (
          <Text className="text-[10px] font-bold text-[#eff4ff] uppercase tracking-wider">
            {subtitle}
          </Text>
        )}
      </View>
    </View>
    {rightAction && <View>{rightAction}</View>}
  </View>
);

// ==========================================
// 2. BottomTabBar
// ==========================================
export const BottomTabBar: React.FC<{
  activeTab: string;
  tabs: { key: string; label: string; icon: any }[];
  onTabChange: (key: string) => void;
}> = ({ activeTab, tabs, onTabChange }) => (
  <View
    className="flex-row bg-white border-t border-slate-150 py-3 px-4 justify-around items-center"
    accessibilityRole="tablist"
    accessibilityLabel="Navigation bar"
  >
    {tabs.map((tab) => {
      const Icon = tab.icon;
      const isActive = activeTab === tab.key;
      return (
        <TouchableOpacity
          key={tab.key}
          onPress={() => onTabChange(tab.key)}
          className="items-center justify-center py-1 flex-1"
          accessibilityRole="tab"
          accessibilityState={{ selected: isActive }}
          accessibilityLabel={`${tab.label} tab`}
          accessibilityHint={`Navigates to ${tab.label}`}
        >
          <Icon size={18} color={isActive ? '#2a14b4' : '#708090'} />
          <Text
            className={`text-[9px] font-black uppercase mt-1 tracking-wider ${
              isActive ? 'text-[#2a14b4]' : 'text-slate-500'
            }`}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ==========================================
// 3. FamilyMemberCard
// ==========================================
export const FamilyMemberCard: React.FC<{
  name: string;
  relation: string;
  location: string;
  avatarUrl?: string;
  onPress?: () => void;
  variant?: 'coordinator' | 'compact';
}> = ({ name, relation, location, avatarUrl, onPress, variant = 'coordinator' }) => {
  const isCompact = variant === 'compact';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      className={`bg-white border border-[#e2dfd9] shadow-sm active:scale-99 ${
        isCompact
          ? 'rounded-2xl p-3 flex-row items-center gap-2.5'
          : 'rounded-3xl p-4 flex-row items-center gap-3.5'
      }`}
      accessibilityRole="button"
      accessibilityLabel={`Family member: ${name}, ${relation}${isCompact ? '' : ` located in ${location}`}`}
      accessibilityHint="Tap to view member details"
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          className={
            isCompact
              ? 'w-8 h-8 rounded-full border border-slate-100'
              : 'w-11 h-11 rounded-full border border-slate-100'
          }
        />
      ) : (
        <View
          className={
            isCompact
              ? 'w-8 h-8 bg-indigo-50 rounded-full items-center justify-center'
              : 'w-11 h-11 bg-indigo-50 rounded-full items-center justify-center'
          }
        >
          <Text className="text-[#2a14b4] text-xs font-black">{name.charAt(0)}</Text>
        </View>
      )}
      <View className="flex-1 space-y-0.5">
        <Text className="text-xs font-black text-slate-800">{name}</Text>
        {!isCompact && (
          <Text className="text-[10px] text-[#2a14b4] font-bold uppercase tracking-wider">
            {relation} · {location}
          </Text>
        )}
      </View>
      {!isCompact && <ChevronRight size={16} color="#708090" />}
    </TouchableOpacity>
  );
};

// ==========================================
// 4. HealthStatusCard
// ==========================================
export const HealthStatusCard: React.FC<{
  title: string;
  status: string;
  description: string;
  type: 'optimal' | 'warning' | 'neutral';
  onPress?: () => void;
}> = ({ title, status, description, type, onPress }) => {
  const borderCol =
    type === 'optimal'
      ? 'border-emerald-600 bg-emerald-50/30'
      : type === 'warning'
        ? 'border-amber-500 bg-amber-50/20'
        : 'border-slate-200 bg-white';
  const textCol =
    type === 'optimal'
      ? 'text-emerald-800'
      : type === 'warning'
        ? 'text-amber-800'
        : 'text-slate-800';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      className={`border-2 rounded-[28px] p-5 shadow-xs ${borderCol}`}
      accessibilityRole="button"
      accessibilityLabel={`Health status card: ${title}, Status: ${status}`}
      accessibilityHint={onPress ? 'Tap to view details' : undefined}
    >
      <View className="flex-row justify-between items-center pb-2.5 border-b border-slate-100/50 mb-2.5">
        <Text className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</Text>
        <View
          className={`px-2.5 py-0.5 rounded-full ${
            type === 'optimal'
              ? 'bg-emerald-100'
              : type === 'warning'
                ? 'bg-amber-100'
                : 'bg-slate-100'
          }`}
        >
          <Text className={`text-[9px] font-black uppercase ${textCol}`}>{status}</Text>
        </View>
      </View>
      <Text className="text-xs text-slate-600 font-bold leading-relaxed">{description}</Text>
    </TouchableOpacity>
  );
};

// ==========================================
// 5. MedicationCard
// ==========================================
export const MedicationCard: React.FC<{
  name: string;
  dosage: string;
  time: string;
  status: 'taken' | 'pending' | 'upcoming';
  onPressAction?: () => void;
  variant?: 'coordinator' | 'parent' | 'compact' | 'detailed';
  loggedBy?: string;
  prescribedBy?: string;
  instructions?: string;
}> = ({
  name,
  dosage,
  time,
  status,
  onPressAction,
  variant = 'parent',
  loggedBy = 'Suresh Kumar',
  prescribedBy = 'Dr. Sharma Cardiology',
  instructions = 'Take with water after dinner'
}) => {
  const isTaken = status === 'taken';

  if (variant === 'compact') {
    return (
      <View
        className={`flex-row justify-between items-center p-3.5 border rounded-2xl ${
          isTaken ? 'bg-emerald-50/20 border-emerald-300' : 'bg-white border-slate-200'
        }`}
        accessibilityLabel={`Medication: ${name}, ${time}, ${isTaken ? 'Taken' : 'Pending'}`}
      >
        <View className="flex-row items-center gap-2">
          <View
            className={`w-2.5 h-2.5 rounded-full ${isTaken ? 'bg-emerald-500' : 'bg-amber-400'}`}
          />
          <Text className="text-xs font-black text-slate-800">{name}</Text>
        </View>
        <Text className="text-[10px] text-slate-400 font-bold uppercase">{time}</Text>
      </View>
    );
  }

  if (variant === 'coordinator') {
    return (
      <View
        className={`border border-[#e2dfd9] bg-white rounded-3xl p-5 shadow-xs space-y-3`}
        accessibilityLabel={`Medication coordinator view: ${name}, dosage: ${dosage}, time: ${time}, status: ${status}`}
      >
        <View className="flex-row justify-between items-center">
          <Text className="text-xs font-black text-slate-500 uppercase tracking-widest">
            {time}
          </Text>
          <View className={`px-2 py-0.5 rounded-full ${isTaken ? 'bg-[#d2f4ef]' : 'bg-slate-100'}`}>
            <Text
              className={`text-[8px] font-black uppercase ${isTaken ? 'text-[#006a61]' : 'text-slate-550'}`}
            >
              {isTaken ? '✓ Taken' : status}
            </Text>
          </View>
        </View>
        <View className="space-y-0.5">
          <Text className="text-sm font-black text-slate-800">
            {name} · {dosage}
          </Text>
          <Text className="text-[10px] text-slate-400 font-bold">
            {isTaken ? `Logged by ${loggedBy}` : 'Awaiting confirmation'}
          </Text>
        </View>
        {onPressAction && !isTaken && (
          <TouchableOpacity
            onPress={onPressAction}
            className="w-full bg-[#eff4ff] border border-[#dee9fc] py-2.5 rounded-xl items-center justify-center active:scale-98"
            accessibilityRole="button"
            accessibilityLabel={`Send medication reminder nudge for ${name}`}
          >
            <Text className="text-[#2a14b4] font-black text-[10px] uppercase">
              Remind Caregiver
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (variant === 'detailed') {
    return (
      <View
        className={`border-2 rounded-[32px] p-5 shadow-sm space-y-4 bg-white ${
          isTaken ? 'border-emerald-600 bg-emerald-50/10' : 'border-violet-300'
        }`}
        accessibilityLabel={`Medication details: ${name}, prescribed by ${prescribedBy}`}
      >
        <View className="flex-row justify-between items-center pb-2 border-b border-slate-50">
          <Text className="text-xs font-black text-slate-500 uppercase tracking-widest">
            {time}
          </Text>
          <Text className="text-[9px] font-black text-violet-700 uppercase">Streak: 12 days</Text>
        </View>
        <View className="space-y-1">
          <Text className="text-xl font-black text-slate-800">{name}</Text>
          <Text className="text-xs font-bold text-slate-400">
            {dosage} · {instructions}
          </Text>
          <Text className="text-[10px] text-slate-450 font-bold mt-1">
            Prescribed by: {prescribedBy}
          </Text>
        </View>
        {onPressAction && !isTaken && (
          <TouchableOpacity
            onPress={onPressAction}
            className="w-full bg-[#7c3aed] py-3.5 rounded-2xl items-center justify-center active:scale-98"
            accessibilityRole="button"
            accessibilityLabel={`Mark detailed ${name} taken`}
          >
            <Text className="text-white font-black text-xs uppercase tracking-wider">
              Log Adherence
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Default: parent
  const themeBorder = isTaken ? 'border-emerald-600 bg-emerald-50/20' : 'border-amber-400 bg-white';
  return (
    <View
      className={`border-4 rounded-[32px] p-5 shadow-xs space-y-4 ${themeBorder}`}
      accessibilityLabel={`Medication: ${name}, Dosage: ${dosage}, Time: ${time}, Status: ${status}`}
    >
      <View className="flex-row justify-between items-center">
        <Text className="text-xs font-black text-slate-500 uppercase tracking-widest">{time}</Text>
        <View
          className={`px-2.5 py-0.5 rounded-full ${isTaken ? 'bg-emerald-600' : 'bg-amber-100'}`}
        >
          <Text
            className={`text-[9px] font-black uppercase ${isTaken ? 'text-white' : 'text-amber-800'}`}
          >
            {isTaken ? '✓ Taken' : status}
          </Text>
        </View>
      </View>
      <View className="space-y-0.5">
        <Text className="text-xl font-black text-slate-800 leading-none">{name}</Text>
        <Text className="text-xs font-bold text-slate-400">{dosage}</Text>
      </View>
      {onPressAction && !isTaken && (
        <TouchableOpacity
          onPress={onPressAction}
          className="w-full bg-[#d97706] py-3.5 rounded-2xl items-center justify-center active:scale-98"
          accessibilityRole="button"
          accessibilityLabel={`Mark ${name} as taken`}
        >
          <Text className="text-white font-black text-xs uppercase tracking-wider">
            Mark as taken
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ==========================================
// 6. AppointmentCard
// ==========================================
export const AppointmentCard: React.FC<{
  specialty: string;
  doctor: string;
  hospital: string;
  date: string;
  time: string;
  onPress?: () => void;
}> = ({ specialty, doctor, hospital, date, time, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    className="bg-white border border-[#e2dfd9] rounded-3xl p-5 shadow-sm space-y-4 active:scale-99"
    accessibilityRole="button"
    accessibilityLabel={`Appointment: ${specialty} with ${doctor} at ${hospital} scheduled for ${date} at ${time}`}
  >
    <View className="space-y-0.5">
      <Text className="text-[9px] font-black text-slate-450 uppercase tracking-widest">
        Appointment
      </Text>
      <Text className="text-base font-black text-slate-800">{specialty}</Text>
      <Text className="text-xs text-slate-500 font-bold">with {doctor}</Text>
    </View>
    <View className="space-y-2 border-t border-slate-100 pt-3">
      <View className="flex-row items-center gap-2">
        <Calendar size={12} color="#ba1a1a" />
        <Text className="text-xs text-slate-650 font-bold">{date}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Clock size={12} color="#2a14b4" />
        <Text className="text-xs text-slate-650 font-bold">{time}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <MapPin size={12} color="#3b82f6" />
        <Text className="text-xs text-slate-650 font-semibold">{hospital}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

// ==========================================
// 7. CareTaskCard
// ==========================================
export const CareTaskCard: React.FC<{
  title: string;
  assignee: string;
  time: string;
  status: 'pending' | 'completed';
  onComplete?: () => void;
  onReassign?: () => void;
}> = ({ title, assignee, time, status, onComplete, onReassign }) => (
  <View
    className="bg-white border border-[#e2dfd9] rounded-3xl p-5 shadow-sm space-y-4"
    accessibilityLabel={`Care task: ${title}, assigned to ${assignee}, time ${time}, status: ${status}`}
  >
    <View className="flex-row justify-between items-start">
      <View className="flex-1 pr-2 space-y-1">
        <Text className="text-xs font-black text-slate-800 leading-snug">{title}</Text>
        <Text className="text-[10px] font-bold text-slate-400">Assigned: {assignee}</Text>
      </View>
      <View className="bg-slate-100 px-2.5 py-0.5 rounded-full shrink-0">
        <Text className="text-[8px] font-black text-slate-500 uppercase">{time}</Text>
      </View>
    </View>
    <View className="flex-row gap-2 pt-2 border-t border-slate-50">
      {status !== 'completed' && onComplete && (
        <TouchableOpacity
          onPress={onComplete}
          className="flex-1 bg-[#059669] py-2 rounded-xl items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Complete task"
        >
          <Text className="text-[9px] font-black text-white uppercase">Complete</Text>
        </TouchableOpacity>
      )}
      {onReassign && (
        <TouchableOpacity
          onPress={onReassign}
          className="flex-1 bg-white border border-slate-200 py-2 rounded-xl items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Reassign task"
        >
          <Text className="text-[9px] font-black text-slate-650 uppercase">Reassign</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// ==========================================
// 8. TimelineItem
// ==========================================
export const TimelineItem: React.FC<{
  title: string;
  time: string;
  description: string;
  isLast?: boolean;
}> = ({ title, time, description, isLast }) => (
  <View className="flex-row" accessibilityLabel={`Event: ${title} logged at ${time}`}>
    <View className="items-center mr-3">
      <View className="w-3.5 h-3.5 rounded-full bg-[#2a14b4] z-10" />
      {!isLast && <View className="w-0.5 flex-grow bg-slate-200 -my-1" />}
    </View>
    <View className="flex-1 pb-6 space-y-0.5">
      <View className="flex-row justify-between items-center">
        <Text className="text-xs font-black text-slate-800">{title}</Text>
        <Text className="text-[9px] font-bold text-slate-400 uppercase">{time}</Text>
      </View>
      <Text className="text-xs text-slate-500 font-semibold leading-relaxed">{description}</Text>
    </View>
  </View>
);

// ==========================================
// 9. AIInsightCard
// ==========================================
export const AIInsightCard: React.FC<{
  title: string;
  statement: string;
  sources: string[];
  onAction?: () => void;
  variant?: 'summary' | 'guardian' | 'detailed';
  statusLabel?: string;
  onConsentToggle?: () => void;
}> = ({
  title,
  statement,
  sources,
  onAction,
  variant = 'detailed',
  statusLabel = 'Optimal Vitals',
  onConsentToggle
}) => {
  if (variant === 'summary') {
    return (
      <View
        className="bg-white border border-[#e2dfd9] rounded-2xl p-4 flex-row items-center gap-3 shadow-xs"
        accessibilityLabel={`AI Summary: ${title}. ${statement}`}
      >
        <View className="w-8 h-8 rounded-full bg-indigo-50 items-center justify-center shrink-0">
          <Shield size={16} color="#2a14b4" />
        </View>
        <View className="flex-1 space-y-0.5">
          <Text className="text-xs font-black text-slate-800">{title}</Text>
          <Text
            className="text-[10px] text-slate-500 font-semibold leading-relaxed"
            numberOfLines={1}
          >
            {statement}
          </Text>
        </View>
      </View>
    );
  }

  if (variant === 'guardian') {
    return (
      <View
        className="bg-white border-2 border-amber-300 rounded-[32px] p-6 shadow-sm space-y-4"
        accessibilityLabel={`Guardian Moment: ${title}, Status: ${statusLabel}`}
      >
        <View className="flex-row justify-between items-center pb-2 border-b border-slate-50">
          <View className="flex-row items-center gap-2">
            <Shield size={16} color="#d97706" />
            <Text className="text-xs font-black text-[#d97706] uppercase tracking-wider">
              {title}
            </Text>
          </View>
          <View className="bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
            <Text className="text-[9px] font-black text-amber-800 uppercase">{statusLabel}</Text>
          </View>
        </View>
        <Text className="text-xs text-slate-650 font-bold leading-relaxed">{statement}</Text>
        <Text className="text-[10px] text-slate-400 font-bold italic">
          Disclaimer: This is based on wearable device telemetry and does not represent clinical
          diagnostics.
        </Text>
        {onConsentToggle && (
          <TouchableOpacity
            onPress={onConsentToggle}
            className="w-full bg-[#d97706] py-3 rounded-xl items-center justify-center mt-1"
            accessibilityRole="button"
            accessibilityLabel="Toggle explicit data sharing consent"
          >
            <Text className="text-white font-black text-xs uppercase">Manage Consent</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Default: detailed
  return (
    <View
      className="bg-white border-2 border-indigo-150 rounded-[32px] p-5 shadow-xs space-y-4"
      accessibilityLabel={`AI Insight: ${title}`}
    >
      <View className="flex-row items-center gap-2">
        <Shield size={16} color="#2a14b4" />
        <Text className="text-xs font-black text-[#2a14b4] uppercase tracking-wider">{title}</Text>
      </View>
      <Text className="text-xs text-slate-700 font-bold leading-relaxed">{statement}</Text>
      <View className="border-t border-slate-100 pt-3 space-y-1.5">
        <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
          Sources Considered
        </Text>
        {sources.map((src, i) => (
          <View key={i} className="flex-row items-center gap-1.5">
            <Info size={10} color="#94a3b8" />
            <Text className="text-[10px] font-bold text-slate-500">{src}</Text>
          </View>
        ))}
      </View>
      {onAction && (
        <TouchableOpacity
          onPress={onAction}
          className="w-full bg-[#eff4ff] border border-[#dee9fc] py-3.5 rounded-xl items-center justify-center mt-1"
          accessibilityRole="button"
          accessibilityLabel="Ask KinGuardian about this insight"
        >
          <Text className="text-[#2a14b4] font-black text-xs uppercase tracking-wider">
            Ask KinGuardian
          </Text>
        </TouchableOpacity>

      )}
    </View>
  );
};

// ==========================================
// 10. GuardianMomentCard
// ==========================================
export const GuardianMomentCard: React.FC<{
  title: string;
  status: string;
  reassurance: string;
  onGrant?: () => void;
}> = ({ title, status, reassurance, onGrant }) => (
  <View
    className="bg-white border border-[#e2dfd9] rounded-[32px] p-6 shadow-sm space-y-4"
    accessibilityLabel={`Guardian Moment: ${title}, status ${status}`}
  >
    <View className="flex-row justify-between items-center">
      <Text className="text-sm font-black text-slate-800">{title}</Text>
      <View className="bg-amber-100 px-3 py-1 rounded-full">
        <Text className="text-[9px] font-black text-amber-800 uppercase">{status}</Text>
      </View>
    </View>
    <Text className="text-xs text-slate-500 font-bold leading-relaxed">{reassurance}</Text>
    {onGrant && (
      <TouchableOpacity
        onPress={onGrant}
        className="w-full bg-[#2a14b4] py-3.5 rounded-xl items-center justify-center mt-1"
        accessibilityRole="button"
        accessibilityLabel="Grant Consent"
      >
        <Text className="text-white font-black text-xs uppercase">Provide Consent</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ==========================================
// 11. AIMessageBubble
// ==========================================
export const AIMessageBubble: React.FC<{
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}> = ({ sender, text, timestamp }) => {
  const isAi = sender === 'ai';
  return (
    <View
      className={`p-4 rounded-3xl max-w-[80%] my-1.5 ${
        isAi
          ? 'bg-white border border-[#e2dfd9] rounded-tl-none self-start'
          : 'bg-[#2a14b4] rounded-tr-none self-end'
      }`}
      accessibilityLabel={`${isAi ? 'AI' : 'User'} message: ${text} sent at ${timestamp}`}
    >
      <Text
        className={`text-xs font-semibold leading-relaxed ${isAi ? 'text-slate-800' : 'text-white'}`}
      >
        {text}
      </Text>
      <Text
        className={`text-[8px] mt-1 font-bold ${isAi ? 'text-slate-400' : 'text-indigo-200'} text-right`}
      >
        {timestamp}
      </Text>
    </View>
  );
};

// ==========================================
// 12. AIInput
// ==========================================
export const AIInput: React.FC<{
  placeholder: string;
  value: string;
  onChangeText: (val: string) => void;
  onSubmit?: () => void;
}> = ({ placeholder, value, onChangeText, onSubmit }) => (
  <View className="flex-row items-center border border-slate-200 rounded-full px-4 py-1.5 bg-slate-50">
    <TextInput
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      className="flex-grow text-xs font-semibold text-slate-800 py-2.5"
      accessibilityLabel="Ask AI input field"
      accessibilityHint="Enter health query here"
    />
    {onSubmit && (
      <TouchableOpacity
        onPress={onSubmit}
        className="p-2 bg-[#2a14b4] rounded-full active:scale-95"
        accessibilityRole="button"
        accessibilityLabel="Send question"
      >
        <ChevronRight size={14} color="#ffffff" />
      </TouchableOpacity>
    )}
  </View>
);

// ==========================================
// 13. VoiceButton
// ==========================================
export const VoiceButton: React.FC<{
  onPress: () => void;
  isListening?: boolean;
}> = ({ onPress, isListening }) => (
  <TouchableOpacity
    onPress={onPress}
    className={`w-18 h-18 rounded-full items-center justify-center shadow-lg border active:scale-95 ${
      isListening ? 'bg-red-500 border-red-600' : 'bg-[#d97706] border-[#b45309]'
    }`}
    accessibilityRole="button"
    accessibilityLabel={isListening ? 'Voice input listening' : 'Start voice input'}
    accessibilityHint="Tap to record voice inquiry"
  >
    <Mic size={24} color="#ffffff" />
  </TouchableOpacity>
);

// ==========================================
// 14. DocumentCard
// ==========================================
export const DocumentCard: React.FC<{
  name: string;
  hospital: string;
  date: string;
  type: string;
  onPress?: () => void;
}> = ({ name, hospital, date, type, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    className="bg-white border border-[#e2dfd9] rounded-3xl p-4 flex-row items-center gap-3.5 shadow-sm active:scale-98"
    accessibilityRole="button"
    accessibilityLabel={`Medical Document: ${name} from ${hospital} dated ${date}`}
  >
    <View className="w-10 h-10 bg-indigo-50 rounded-2xl items-center justify-center shrink-0">
      <FileText size={18} color="#2a14b4" />
    </View>
    <View className="flex-1 space-y-0.5">
      <Text className="text-xs font-black text-slate-800 leading-snug">{name}</Text>
      <Text className="text-[10px] text-slate-400 font-bold uppercase">
        {hospital} · {date} · {type}
      </Text>
    </View>
    <ChevronRight size={16} color="#708090" />
  </TouchableOpacity>
);

// ==========================================
// 15. NotificationItem
// ==========================================
export const NotificationItem: React.FC<{
  title: string;
  message: string;
  time: string;
  unread: boolean;
  onPress?: () => void;
}> = ({ title, message, time, unread, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    className={`p-4 rounded-2xl border flex-row gap-3 items-start ${
      unread ? 'bg-white border-[#c3c0ff]/60 shadow-xs' : 'bg-slate-50/50 border-slate-100'
    }`}
    accessibilityRole="button"
    accessibilityLabel={`Notification: ${title}, ${message}. Received ${time}. ${
      unread ? 'Unread' : 'Read'
    }`}
  >
    <View
      className={`w-8 h-8 rounded-full items-center justify-center ${unread ? 'bg-amber-100' : 'bg-slate-100'}`}
    >
      <Bell size={16} color={unread ? '#b45309' : '#708090'} />
    </View>
    <View className="flex-grow space-y-0.5">
      <View className="flex-row justify-between items-center">
        <Text className={`text-xs font-black ${unread ? 'text-slate-800' : 'text-slate-550'}`}>
          {title}
        </Text>
        <Text className="text-[9px] font-bold text-slate-400">{time}</Text>
      </View>
      <Text className="text-[11px] leading-relaxed text-slate-500">{message}</Text>
    </View>
  </TouchableOpacity>
);

// ==========================================
// 16. PermissionRow
// ==========================================
export const PermissionRow: React.FC<{
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (val: boolean) => void;
}> = ({ label, description, enabled, onToggle }) => (
  <View
    className="border border-violet-100 bg-[#f5f3ff] rounded-3xl p-5 flex-row justify-between items-center"
    accessibilityLabel={`Permission toggle: ${label}. Description: ${description}`}
  >
    <View className="flex-1 pr-4 space-y-0.5">
      <Text className="text-sm font-black text-violet-950">{label}</Text>
      <Text className="text-[10px] text-violet-750 font-bold leading-snug">{description}</Text>
    </View>
    <Switch
      value={enabled}
      onValueChange={onToggle}
      trackColor={{ false: '#cbd5e1', true: '#7c3aed' }}
      thumbColor="#ffffff"
      accessibilityLabel={`Toggle permission ${label}`}
    />
  </View>
);

// ==========================================
// 17. HealthMetric
// ==========================================
export const HealthMetric: React.FC<{
  label: string;
  value: string;
  unit: string;
  status: string;
  color?: string;
}> = ({ label, value, unit, status, color = '#2a14b4' }) => (
  <View
    className="bg-white border border-[#e2dfd9] rounded-3xl p-4.5 items-center justify-center flex-1 space-y-1.5"
    accessibilityLabel={`Health Metric ${label}: ${value} ${unit}, Status: ${status}`}
  >
    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</Text>
    <Text style={{ color }} className="text-2xl font-black">
      {value}
      <Text className="text-xs font-semibold text-slate-400 uppercase"> {unit}</Text>
    </Text>
    <Text className="text-[9px] font-bold text-slate-500 uppercase">{status}</Text>
  </View>
);

// ==========================================
// 18. TrendChart
// ==========================================
export const TrendChart: React.FC<{
  points: number[];
  height?: number;
}> = ({ points, height = 40 }) => (
  <View
    className="flex-row items-end justify-between px-3 w-full bg-slate-50/50 rounded-2xl"
    style={{ height }}
    accessibilityLabel="Activity trend line sparkline graph"
  >
    {points.map((p, i) => (
      <View key={i} className="w-[11%] bg-[#c3c0ff] rounded-t-sm" style={{ height: `${p}%` }} />
    ))}
  </View>
);

// ==========================================
// 19. EmptyState
// ==========================================
export const EmptyState: React.FC<{
  message: string;
}> = ({ message }) => (
  <View
    className="py-12 items-center justify-center space-y-2.5"
    accessibilityLabel={`Empty list state: ${message}`}
  >
    <Info size={30} color="#c3c0ff" />
    <Text className="text-xs font-bold text-slate-400">{message}</Text>
  </View>
);

// ==========================================
// 20. ErrorState
// ==========================================
export const ErrorState: React.FC<{
  message: string;
  onRetry?: () => void;
}> = ({ message, onRetry }) => (
  <View
    className="py-12 items-center justify-center space-y-3.5 p-6 bg-rose-50/30 rounded-[32px] border border-rose-100"
    accessibilityLabel={`Error state alert: ${message}`}
  >
    <AlertTriangle size={32} color="#ba1a1a" />
    <Text className="text-xs font-black text-rose-900 text-center">{message}</Text>
    {onRetry && (
      <TouchableOpacity
        onPress={onRetry}
        className="bg-[#ba1a1a] px-5 py-2.5 rounded-full active:scale-95 shadow-sm"
        accessibilityRole="button"
        accessibilityLabel="Retry failed operation"
      >
        <Text className="text-white text-[10px] font-black uppercase tracking-wider">Retry</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ==========================================
// 21. LoadingState
// ==========================================
export const LoadingState: React.FC<{
  label?: string;
}> = ({ label = 'Loading information...' }) => (
  <View
    className="py-12 items-center justify-center space-y-3"
    accessibilityLabel="Operation loading in progress"
  >
    <ActivityIndicator size="small" color="#2a14b4" />
    <Text className="text-[11px] font-bold text-slate-400">{label}</Text>
  </View>
);

// ==========================================
// 22. SectionHeader
// ==========================================
export const SectionHeader: React.FC<{
  title: string;
}> = ({ title }) => (
  <Text className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1.5">{title}</Text>
);

// ==========================================
// 23. PrimaryButton
// ==========================================
export const PrimaryButton: React.FC<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
}> = ({ label, onPress, disabled }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    className={`w-full py-4.5 rounded-2xl items-center justify-center shadow-md active:scale-98 ${
      disabled ? 'bg-slate-200' : 'bg-[#2a14b4]'
    }`}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled }}
  >
    <Text className="text-white font-black text-sm uppercase tracking-wider">{label}</Text>
  </TouchableOpacity>
);

// ==========================================
// 24. SecondaryButton
// ==========================================
export const SecondaryButton: React.FC<{
  label: string;
  onPress: () => void;
}> = ({ label, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    className="w-full bg-white border border-[#dee9fc] py-4.5 rounded-2xl items-center justify-center active:scale-98"
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Text className="text-slate-650 font-black text-xs uppercase tracking-wider">{label}</Text>
  </TouchableOpacity>
);

// ==========================================
// 25. IconButton
// ==========================================
export const IconButton: React.FC<{
  icon: any;
  onPress: () => void;
  label: string;
}> = ({ icon: Icon, onPress, label }) => (
  <TouchableOpacity
    onPress={onPress}
    className="w-10 h-10 rounded-full bg-[#f4effc] items-center justify-center shadow-xs active:scale-95"
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Icon size={16} color="#2a14b4" />
  </TouchableOpacity>
);

// ==========================================
// 26. BottomSheet
// ==========================================
export const BottomSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => (
  <Modal visible={isOpen} animationType="slide" transparent={true} onRequestClose={onClose}>
    <View className="flex-1 bg-black/60 justify-end">
      <View className="bg-white rounded-t-[32px] max-h-[85%] p-6 space-y-4 shadow-2xl">
        <View className="flex-row justify-between items-center pb-2 border-b border-slate-100">
          <Text className="text-base font-black text-[#121c2a]">{title}</Text>
          <TouchableOpacity onPress={onClose} className="p-1.5 bg-slate-100 rounded-full">
            <X size={14} color="#464554" />
          </TouchableOpacity>
        </View>
        <ScrollView className="space-y-4">{children}</ScrollView>
      </View>
    </View>
  </Modal>
);
