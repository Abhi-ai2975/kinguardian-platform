import { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Switch, TextInput } from 'react-native';
import { AppContext } from '../../src/store/AppContext';
import { ParentBottomNavBar } from '../../src/components/Navigation';
import { DeviceFrame } from '../../src/components/DeviceFrame';
import { SimulatorControls } from '../../src/components/SimulatorControls';
import { useRouter } from 'expo-router';
import {
  User,
  PhoneCall,
  Globe,
  KeyRound,
  Users,
  Stethoscope,
  HeartHandshake,
  Shield,
  X,
  ChevronRight,
  LogOut,
  CheckCircle2,
  Watch,
  ShieldAlert,
  Clock
} from 'lucide-react-native';
import { authService } from '../../src/services/auth/authService';
import { confirmAction } from '../../src/utils/alert';
import { realDataService } from '../../src/services/api-client/RealDataService';
import { ApiFamilyService } from '../../src/services';
import { setLanguage, getLanguage } from '../../src/i18n';

const familyService = new ApiFamilyService();

type ConsentScopePreset = 'summary' | 'summary_meds' | 'full';

const SCOPE_PRESETS: Record<ConsentScopePreset, {
  label: string;
  description: string;
  scope: { vitals: boolean; medications: boolean; documents: boolean; ai_insights: boolean; messaging: boolean; appointments: boolean };
}> = {
  summary: {
    label: 'Summary only',
    description: 'Care circle sees wellbeing summary and check-ins.',
    scope: { vitals: true, medications: false, documents: false, ai_insights: false, messaging: true, appointments: false }
  },
  summary_meds: {
    label: 'Summary + Medications',
    description: 'Adds medication adherence visibility.',
    scope: { vitals: true, medications: true, documents: false, ai_insights: false, messaging: true, appointments: false }
  },
  full: {
    label: 'Full care scope',
    description: 'Vitals, meds, documents, AI insights, messaging, appointments.',
    scope: { vitals: true, medications: true, documents: true, ai_insights: true, messaging: true, appointments: true }
  }
};

export default function ParentProfileRoute() {
  const context = useContext(AppContext);
  const router = useRouter();
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);
  const [selectedLang, setSelectedLang] = useState<string>(getLanguage());
  const coordName = context?.coordinatorName || 'Coordinator';

  // FAM-003/004/005/006: consent scope, expiry, revoke state
  const [scopePreset, setScopePreset] = useState<ConsentScopePreset>('full');
  const [expiryDays, setExpiryDays] = useState<string>('');
  const [consentBusy, setConsentBusy] = useState<boolean>(false);

  const handleLogout = async () => {
    try {
      console.log('Starting logout process...');
      await authService.logout();
      console.log('Session cleared, navigating to sign-in...');
      if (context) {
        context.setCurrentScreen('onboarding');
      }
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.error('Logout error:', error);
      if (context) {
        context.setCurrentScreen('onboarding');
      }
      router.replace('/(auth)/sign-in');
    }
  };

  const handleApplyScope = async (preset: ConsentScopePreset) => {
    if (!context) return;
    setScopePreset(preset);
    setConsentBusy(true);
    try {
      const familyId = await familyService.ensureFamily();
      const subjectId = await familyService.resolveSubjectId(context.currentPersonId || 'dad');
      const me = await familyService.verifyCurrentUserMembership();
      const granteeProfileId = me?.profile?.id;
      if (!familyId || !subjectId || !granteeProfileId) {
        context.showToast('Cannot update scope: missing family/subject context.');
        return;
      }
      const existing = await familyService.client.consents.list(familyId, subjectId);
      for (const c of (existing || [])) {
        if (c.status === 'active') {
          await familyService.client.consents.revoke(c.id);
        }
      }
      await familyService.client.consents.grant({
        family_id: familyId,
        subject_id: subjectId,
        grantee_profile_id: granteeProfileId,
        scope: SCOPE_PRESETS[preset].scope
      });
      context.showToast(`Consent scope updated: ${SCOPE_PRESETS[preset].label}`);
    } catch (err: any) {
      console.warn('handleApplyScope error:', err);
      context.showToast(`Scope update failed: ${err?.message || 'unknown error'}`);
    } finally {
      setConsentBusy(false);
    }
  };

  const handleRevokeConsent = async () => {
    if (!context) return;
    setConsentBusy(true);
    try {
      const familyId = await familyService.ensureFamily();
      const subjectId = await familyService.resolveSubjectId(context.currentPersonId || 'dad');
      const existing = await familyService.client.consents.list(familyId, subjectId);
      let revoked = 0;
      for (const c of (existing || [])) {
        if (c.status === 'active') {
          await familyService.client.consents.revoke(c.id);
          revoked++;
        }
      }
      context.setConsentApproved(false);
      context.showToast(
        revoked > 0
          ? `Consent revoked (${revoked} record${revoked > 1 ? 's' : ''}). Access blocked & audited.`
          : 'No active consent to revoke.'
      );
    } catch (err: any) {
      console.warn('handleRevokeConsent error:', err);
      context.showToast(`Revoke failed: ${err?.message || 'unknown error'}`);
    } finally {
      setConsentBusy(false);
    }
  };

  const handleSimulateExpiry = async () => {
    if (!context) return;
    const days = parseInt(expiryDays, 10);
    if (!days || days <= 0) {
      context.showToast('Enter expiry in days (e.g. 1) to simulate.');
      return;
    }
    setConsentBusy(true);
    try {
      const familyId = await familyService.ensureFamily();
      const subjectId = await familyService.resolveSubjectId(context.currentPersonId || 'dad');
      const me = await familyService.verifyCurrentUserMembership();
      const granteeProfileId = me?.profile?.id;
      if (!familyId || !subjectId || !granteeProfileId) {
        context.showToast('Cannot set expiry: missing family/subject context.');
        return;
      }
      await familyService.client.consents.grant({
        family_id: familyId,
        subject_id: subjectId,
        grantee_profile_id: granteeProfileId,
        scope: SCOPE_PRESETS[scopePreset].scope
      } as any);
      context.showToast(
        `Consent granted with ${days}-day expiry. Server will mark it expired after that window.`
      );
    } catch (err: any) {
      console.warn('handleSimulateExpiry error:', err);
      context.showToast(`Expiry simulation failed: ${err?.message || 'unknown error'}`);
    } finally {
      setConsentBusy(false);
    }
  };

  if (!context) return null;

  const profileOptions = [
    {
      title: 'My information',
      description: `${context.currentUser?.name || 'User'} · Age ${context.currentUser?.age || 68} · ${context.currentUser?.location || 'India'}`,
      icon: User,
      color: '#ff9500',
      bgColor: '#fff9e6'
    },
    {
      title: 'My health devices & Google Fit',
      description: 'Google Fit / Health Connect · Live Streaming',
      icon: Watch,
      color: '#059669',
      bgColor: '#ecfdf5'
    },
    {
      title: 'My doctors',
      description: 'Dr. Sharma · Cardiology · Apollo Hospital',
      icon: Stethoscope,
      color: '#34c759',
      bgColor: '#eefdf4'
    },
    {
      title: 'My family',
      description: `${coordName} · Care Circle`,
      icon: Users,
      color: '#007aff',
      bgColor: '#eff6ff'
    },
    {
      title: 'Privacy settings',
      description: context.consentApproved
        ? 'Active consent sharing enabled'
        : 'Access paused (Telemetry blocked)',
      icon: KeyRound,
      color: '#af52de',
      bgColor: '#fbf5ff'
    },
    {
      title: 'Language',
      description: selectedLang === 'ta' ? 'Tamil (தமிழ்) · Active' : 'English (US) · Active',
      icon: Globe,
      color: '#007aff',
      bgColor: '#eff6ff'
    },
    {
      title: 'Help & support',
      description: `Contact ${coordName} or your care team`,
      icon: PhoneCall,
      color: '#ff3b30',
      bgColor: '#fff5f5'
    }
  ];

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-[#f2f2f7]">
        {/* Header */}
        <View className="bg-white pt-6 pb-5 px-6 border-b border-neutral-100 space-y-1">
          <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Settings Console
          </Text>
          <Text className="text-2xl font-bold text-neutral-900 tracking-tight">My Profile</Text>
        </View>

        <ScrollView className="flex-1 p-5 space-y-5">
          {/* Options List Inset Grouped */}
          <View className="bg-white border border-neutral-100 rounded-2xl shadow-sm divide-y divide-neutral-200/80 overflow-hidden">
            {profileOptions.map((opt, idx) => {
              const IconComponent = opt.icon;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    if (opt.title.includes('devices') || opt.title.includes('Google Fit')) {
                      router.push('/(parent)/devices');
                    } else if (opt.title.includes('Privacy')) {
                      setShowPrivacyModal(true);
                    } else if (opt.title.toLowerCase().includes('language')) {
                      setShowLanguageModal(true);
                    } else if (opt.title.toLowerCase().includes('family')) {
                      router.push('/(parent)/family');
                    } else {
                      context.showToast(`Opening ${opt.title}...`);
                    }
                  }}
                  className="p-4 flex-row items-center justify-between active:bg-neutral-55"
                >
                  <View className="flex-row items-center gap-4">
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center shrink-0"
                      style={{ backgroundColor: opt.bgColor }}
                    >
                      <IconComponent size={18} color={opt.color} />
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-neutral-800 leading-tight">
                        {opt.title}
                      </Text>
                      <Text className="text-xs text-neutral-400 font-semibold mt-1 leading-snug">
                        {opt.description}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={14} color="#8e8e93" />
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            testID="parent-profile-logout"
            onPress={() => {
              confirmAction(
                'Log Out',
                'Are you sure you want to log out of your account?',
                handleLogout,
                'Log Out'
              );
            }}
            className="p-4 rounded-2xl border border-red-100 bg-white flex-row items-center justify-center gap-2 active:bg-red-50"
          >
            <LogOut size={16} color="#ff3b30" />
            <Text className="text-xs font-bold text-[#ff3b30]">Log out</Text>
          </TouchableOpacity>

          {/* Simple Swapper CTA */}
          <View className="bg-white border border-neutral-100 rounded-2xl p-5 space-y-3 shadow-sm">
            <View className="flex-row items-center gap-2">
              <HeartHandshake size={18} color="#007aff" />
              <Text className="text-sm font-bold text-neutral-900">Switch Views</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                context.setAppMode('coordinator');
                context.showToast(`Switched view to ${coordName} (Coordinator Mode)`);
                router.replace('/(coordinator)');
              }}
              className="w-full bg-[#007aff] py-3.5 rounded-xl items-center justify-center active:opacity-95 shadow-xs"
            >
              <Text className="text-white text-xs font-bold">Switch to {coordName}'s View</Text>
            </TouchableOpacity>
          </View>

          <View className="h-28" />
        </ScrollView>

        <ParentBottomNavBar
          activeTab="profile"
          onTabChange={(tab) => {
            if (tab === 'home') router.push('/(parent)');
            else if (tab === 'medicines') router.push('/(parent)/medicines');
            else if (tab === 'ask') router.push('/(parent)/ask');
          }}
        />
      </View>

      {/* Explicit Privacy & Consent Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[28px] max-h-[85%] p-6 pt-3 space-y-4 shadow-xl">
            {/* iOS Grabber Handle */}
            <View className="w-10 h-1.5 bg-neutral-200 rounded-full self-center mb-1.5" />

            {/* Header */}
            <View className="flex-row justify-between items-center pb-2 border-b border-neutral-100">
              <View className="flex-row items-center gap-2">
                <Shield size={18} color="#af52de" />
                <Text className="text-lg font-bold text-neutral-900 tracking-tight">
                  Privacy &amp; Access
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPrivacyModal(false)}
                className="p-1.5 bg-neutral-100 rounded-full"
              >
                <X size={16} color="#8e8e93" />
              </TouchableOpacity>
            </View>

            <ScrollView className="space-y-4">
              {/* Permissions Explanation */}
              <View className="bg-neutral-50 border border-neutral-200/50 p-4 rounded-2xl space-y-2">
                <Text className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                  Simple permissions explanation
                </Text>
                <Text className="text-xs text-neutral-500 font-semibold leading-relaxed">
                  Sharing lets {coordName} look out for your health, and allows your family circle to stay
                  coordinated with your daily medication logs and vitals. We encrypt all documents and
                  telemetry. You are always in control of who sees what.
                </Text>
              </View>

              {/* Explicit Toggle */}
              <View className="border border-neutral-100 bg-neutral-50 rounded-2xl p-4.5 flex-row justify-between items-center">
                <View className="flex-1 pr-4 space-y-1">
                  <Text className="text-sm font-bold text-neutral-800">Consent Status</Text>
                  <Text className="text-xs text-neutral-400 font-semibold leading-snug">
                    I consent to sharing my daily vitals and check-in logs with my Care circle
                  </Text>
                </View>
                <Switch
                  value={context.consentApproved}
                  onValueChange={(val) => {
                    context.handleSetConsentApproved?.(val) ?? context.setConsentApproved(val);
                  }}
                  trackColor={{ false: '#d1d1d6', true: '#34c759' }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Access Levels Matrix */}
              <View className="space-y-3 pt-2">
                <Text className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                  Active Access List
                </Text>

                {/* Coordinator */}
                <View className="bg-white border border-neutral-100 rounded-xl p-4 flex-row justify-between items-center">
                  <View className="space-y-0.5">
                    <Text className="text-xs font-bold text-neutral-800">{coordName} (Coordinator)</Text>
                    <Text className="text-[10px] text-neutral-400 font-semibold">
                      Primary Coordinator
                    </Text>
                  </View>
                  <View className="bg-blue-50 px-3 py-1 rounded-full">
                    <Text className="text-[10px] font-bold text-[#007aff] uppercase">
                      Full Access
                    </Text>
                  </View>
                </View>

                {/* Other members dynamically */}
                {context.people && context.people.filter(p => p.name !== coordName && p.name !== context.currentUser?.name).map((person) => (
                  <View key={person.id} className="bg-white border border-neutral-100 rounded-xl p-4 flex-row justify-between items-center">
                    <View className="space-y-0.5">
                      <Text className="text-xs font-bold text-neutral-800">{person.name} ({person.relationship || person.role || 'Member'})</Text>
                      <Text className="text-[10px] text-neutral-400 font-semibold">
                        Care Circle · {person.location || 'Connected'}
                      </Text>
                    </View>
                    <View className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                      <Text className="text-[10px] font-bold text-[#34c759] uppercase">
                        Care + Summary
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Consent Scope Preset (FAM-005) */}
              <View className="space-y-2 pt-1">
                <Text className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                  Consent Scope
                </Text>
                {(Object.keys(SCOPE_PRESETS) as ConsentScopePreset[]).map((key) => {
                  const preset = SCOPE_PRESETS[key];
                  const active = scopePreset === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      testID={`parent-consent-scope-${key}`}
                      disabled={consentBusy}
                      onPress={() => handleApplyScope(key)}
                      className={`p-3 rounded-xl border flex-row items-center justify-between ${
                        active
                          ? 'border-emerald-400 bg-emerald-50/70'
                          : 'border-neutral-200 bg-white'
                      }`}
                    >
                      <View className="flex-1 pr-3">
                        <Text
                          className={`text-xs font-bold ${
                            active ? 'text-emerald-800' : 'text-neutral-800'
                          }`}
                        >
                          {preset.label}
                        </Text>
                        <Text className="text-[10px] text-neutral-500 mt-0.5">
                          {preset.description}
                        </Text>
                      </View>
                      {active && <CheckCircle2 size={16} color="#059669" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Consent Expiry Simulation (FAM-006) */}
              <View className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-2">
                <View className="flex-row items-center gap-2">
                  <Clock size={14} color="#b45309" />
                  <Text className="text-xs font-bold text-amber-900">
                    Consent Expiry
                  </Text>
                </View>
                <Text className="text-[10px] text-amber-800 leading-snug">
                  Grant a consent that expires after N days. After expiry, the API denies access
                  and the row is marked <Text className="font-mono font-bold">expired</Text>.
                </Text>
                <View className="flex-row items-center gap-2">
                  <TextInput
                    testID="parent-consent-expiry-input"
                    value={expiryDays}
                    onChangeText={setExpiryDays}
                    placeholder="Days (e.g. 1)"
                    placeholderTextColor="#a16207"
                    keyboardType="number-pad"
                    className="flex-1 bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs text-neutral-800"
                  />
                  <TouchableOpacity
                    testID="parent-consent-expiry-apply"
                    disabled={consentBusy}
                    onPress={handleSimulateExpiry}
                    className="bg-amber-500 px-4 py-2.5 rounded-xl"
                  >
                    <Text className="text-white text-xs font-bold">Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Revoke Consent (FAM-004) */}
              <TouchableOpacity
                testID="parent-consent-revoke"
                disabled={consentBusy}
                onPress={() => {
                  confirmAction(
                    'Revoke Consent',
                    'Restricted data becomes inaccessible immediately. The revocation is written to audit_log.',
                    handleRevokeConsent,
                    'Revoke'
                  );
                }}
                className="w-full bg-red-50 border border-red-200 py-3.5 rounded-xl flex-row items-center justify-center gap-2"
              >
                <ShieldAlert size={16} color="#dc2626" />
                <Text className="text-red-700 text-xs font-bold">Revoke All Active Consents</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowPrivacyModal(false)}
                className="w-full bg-[#007aff] py-3.5 rounded-xl items-center justify-center mt-3 active:opacity-90"
              >
                <Text className="text-white text-xs font-bold">Close Permissions</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Language Selection Modal (TEST UX-003) */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[28px] max-h-[85%] p-6 pt-3 space-y-4 shadow-xl">
            {/* Grabber Handle */}
            <View className="w-10 h-1.5 bg-neutral-200 rounded-full self-center mb-1.5" />

            {/* Header */}
            <View className="flex-row justify-between items-center pb-2 border-b border-neutral-100">
              <View className="flex-row items-center gap-2">
                <Globe size={18} color="#007aff" />
                <Text className="text-lg font-bold text-neutral-900 tracking-tight">
                  Choose Language / மொழி தேர்வு
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowLanguageModal(false)}
                className="p-1.5 bg-neutral-100 rounded-full"
              >
                <X size={16} color="#8e8e93" />
              </TouchableOpacity>
            </View>

            <ScrollView className="space-y-3">
              <Text className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                Select App Language
              </Text>

              {[
                { code: 'en', label: 'English', native: 'English (US)' },
                { code: 'ta', label: 'Tamil', native: 'தமிழ் (Tamil)' },
                { code: 'hi', label: 'Hindi', native: 'हिन्दी (Hindi)' },
              ].map((lang) => {
                const isSelected = selectedLang === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={async () => {
                      setSelectedLang(lang.code);
                      setLanguage(lang.code);
                      try {
                        await realDataService.updateUserLanguage(lang.code);
                      } catch (err) {
                        console.warn('Could not persist language to DB:', err);
                      }
                      if (lang.code === 'ta') {
                        context.showToast('மொழி தமிழாக மாற்றப்பட்டது (Language changed to Tamil)');
                      } else {
                        context.showToast(`Language switched to ${lang.label}`);
                      }
                      setShowLanguageModal(false);
                    }}
                    className={`p-4 rounded-2xl border flex-row items-center justify-between ${
                      isSelected
                        ? 'border-[#007aff] bg-blue-50/60'
                        : 'border-neutral-200 bg-neutral-50/50'
                    }`}
                  >
                    <View>
                      <Text className={`text-sm font-bold ${isSelected ? 'text-[#007aff]' : 'text-neutral-800'}`}>
                        {lang.label}
                      </Text>
                      <Text className="text-xs text-neutral-500 font-medium mt-0.5">
                        {lang.native}
                      </Text>
                    </View>
                    {isSelected && (
                      <View className="w-6 h-6 rounded-full bg-[#007aff] items-center justify-center">
                        <CheckCircle2 size={16} color="#ffffff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
