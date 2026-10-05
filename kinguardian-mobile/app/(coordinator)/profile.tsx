import { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { AppContext } from '../../src/store/AppContext';
import { BottomNavBar } from '../../src/components/Navigation';
import { DeviceFrame } from '../../src/components/DeviceFrame';
import { SimulatorControls } from '../../src/components/SimulatorControls';
import { useRouter } from 'expo-router';
import {
  User,
  Shield,
  Smartphone,
  HeartHandshake,
  Users,
  ChevronRight,
  LogOut,
  X,
  Database,
  RefreshCw,
  CheckCircle2,
  Layers,
  GitBranch,
  Home,
  ArrowLeftRight
} from 'lucide-react-native';
import { authService } from '../../src/services/auth/authService';
import { confirmAction } from '../../src/utils/alert';
import { googleFitService } from '../../src/services/health/GoogleFitService';
import { ApiFamilyService } from '../../src/services';
import { CONFIG } from '../../src/constants/config';

const familySwitcherService = new ApiFamilyService(CONFIG.apiUrl);

const ER_DOMAINS = [
  {
    id: 'identity',
    title: 'Identity & Communication',
    badge: 'Core Identity',
    color: '#007aff',
    bg: '#eff6ff',
    border: '#bfdbfe',
    description: 'User profiles, encrypted family chats, and critical push notifications.',
    tables: [
      { name: 'profiles', desc: 'User accounts, emails, roles, timezones & emergency contacts', fks: 'Primary Identity Anchor' },
      { name: 'conversations', desc: 'Family care chat channels & subject context threads', fks: 'family_id -> families.id' },
      { name: 'messages', desc: 'Real-time text messages in care conversations', fks: 'sender_id -> profiles.id' },
      { name: 'notifications', desc: 'Push alerts, clinical priority levels, read status', fks: 'user_id -> profiles.id' }
    ]
  },
  {
    id: 'iam',
    title: 'Access Control & Consent (IAM)',
    badge: 'Security & Auth',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    description: 'Role-based memberships, time-bound care grants, and explicit elder consent.',
    tables: [
      { name: 'memberships', desc: 'User roles in family units (coordinator, parent, caregiver)', fks: 'user_id, family_id' },
      { name: 'care_grants', desc: 'Time-bound clinical permissions on care subjects', fks: 'care_subject_id, grantee_user_id' },
      { name: 'consents', desc: 'Explicit consent grants/revocations for telemetry access', fks: 'care_subject_id, granter_user_id' }
    ]
  },
  {
    id: 'family_core',
    title: 'Family Core & Operational Logging',
    badge: 'Core Entities',
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    description: 'Family units, care recipients (elders), and tamper-evident audit logs.',
    tables: [
      { name: 'families', desc: 'Family care unit groupings and coordinator owner links', fks: 'created_by -> profiles.id' },
      { name: 'care_subjects', desc: 'Elders receiving care (baseline stats, primary conditions)', fks: 'family_id -> families.id' },
      { name: 'audit_log', desc: 'Append-only tamper-evident security and data access log', fks: 'actor_user_id -> profiles.id' },
      { name: 'outbox_events', desc: 'Reliable event delivery queue for background processing', fks: 'aggregate_id' }
    ]
  },
  {
    id: 'clinical',
    title: 'Clinical Telemetry, Tasks & Documents',
    badge: 'Clinical Data',
    color: '#ea580c',
    bg: '#fff7ed',
    border: '#fed7aa',
    description: 'Caregiver tasks, daily check-ins, medication logs, and clinical records.',
    tables: [
      { name: 'care_tasks', desc: 'Scheduled tasks, medication reminders, caregiver assignments', fks: 'family_id, assigned_to_user_id' },
      { name: 'checkins', desc: 'Elder morning/evening check-in confirmations (Good/Tired/Unwell)', fks: 'care_subject_id -> care_subjects.id' },
      { name: 'medication_adherence', desc: 'Timestamped medication doses taken or missed', fks: 'task_id, recorded_by' },
      { name: 'document_references', desc: 'Prescriptions, lab PDFs, discharge summaries & OCR text', fks: 'care_subject_id, uploaded_by' },
      { name: 'insights', desc: 'Fuzzy logic risk assessments and anomaly detection findings', fks: 'care_subject_id -> care_subjects.id' }
    ]
  }
];

export default function CoordinatorProfileRoute() {
  const context = useContext(AppContext);
  const router = useRouter();
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false);
  const [dbTab, setDbTab] = useState<'architecture' | 'counts' | 'audits'>('architecture');
  const [dbStats, setDbStats] = useState<Record<string, number> | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);

  // FAM-009: Family switcher state
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [families, setFamilies] = useState<any[]>([]);
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);
  const [loadingFamilies, setLoadingFamilies] = useState(false);

  const loadFamilies = async () => {
    setLoadingFamilies(true);
    try {
      const list = await familySwitcherService.client.families.list();
      setFamilies(Array.isArray(list) ? list : []);
      if (list && list.length > 0) {
        setActiveFamilyId((prev) => prev || list[0].id);
      }
    } catch (err) {
      console.warn('Failed to load families for switcher:', err);
    } finally {
      setLoadingFamilies(false);
    }
  };

  const handleSwitchFamily = async (familyId: string, name: string) => {
    setActiveFamilyId(familyId);
    familySwitcherService.resetFamilyCache();
    familySwitcherService.familyId = familyId;
    if (context?.setFamilyName) context.setFamilyName(name);
    setShowFamilyModal(false);
    context?.showToast(`Switched family context to ${name}. Data, permissions and notifications are isolated.`);
    try {
      await context?.syncBackendData?.();
    } catch (err) {
      console.warn('Post-switch sync failed:', err);
    }
  };

  const loadDbData = async () => {
    if (!context) return;
    setLoadingDb(true);
    try {
      const stats = await context.fetchDatabaseStats();
      setDbStats(stats);
      const logs = await context.fetchAuditLog();
      setAuditLogs(logs || []);
    } catch (e) {
      console.warn('Failed to load DB stats in profile:', e);
    } finally {
      setLoadingDb(false);
    }
  };

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

  if (!context) return null;

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-[#f2f2f7]">
        {/* Header */}
        <View className="px-6 py-5 border-b border-neutral-100 bg-white">
          <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Configuration
          </Text>
          <Text className="text-2xl font-bold text-neutral-900 tracking-tight mt-0.5">
            Settings
          </Text>
        </View>

        <ScrollView className="flex-1 px-5 pt-4 space-y-4">
          {/* User Profile Card */}
          <View
            testID="coordinator-profile-session-card"
            className="p-4 rounded-2xl border border-neutral-100 bg-white flex-row items-center gap-4 shadow-sm"
          >
            <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center">
              <User size={22} color="#007aff" />
            </View>
            <View className="flex-1">
              <Text
                testID="coordinator-profile-display-name"
                className="text-base font-bold text-neutral-900 leading-none"
              >
                {context.currentUser?.name || 'KinGuardian Coordinator'}
              </Text>
              <Text
                testID="coordinator-profile-role-badge"
                className="text-[10px] text-blue-600 font-bold tracking-wider mt-1"
              >
                {`${(context.currentUser?.role || 'coordinator')}`.replace(/^\w/, (c) => c.toUpperCase())}
              </Text>
              <Text className="text-xs text-neutral-400 mt-1 font-semibold">
                {context.currentUser?.location || context.currentUser?.email || 'London, United Kingdom (BST)'}
              </Text>
            </View>
          </View>

          {/* Switch Persona Box */}
          <View className="p-5 rounded-2xl border border-neutral-100 bg-white shadow-sm space-y-3.5">
            <View className="flex-row items-center gap-2">
              <HeartHandshake size={18} color="#ff9500" />
              <Text className="text-sm font-bold text-neutral-900">Prototype Persona Switcher</Text>
            </View>
            <Text className="text-xs text-neutral-500 leading-normal">
              Test the two-sided product experiences. Switch to Parent Mode to see {context.people[0]?.name || 'Parent'}'s
              large high-contrast checklist.
            </Text>
            <TouchableOpacity
              onPress={() => {
                context.setAppMode('parent');
                context.showToast(`Switched persona to ${context.people[0]?.name || 'Parent'} (Parent Mode)`);
                router.replace('/(parent)');
              }}
              activeOpacity={0.8}
              className="w-full bg-[#007aff] py-3 rounded-xl items-center justify-center"
            >
              <Text className="text-xs font-bold text-white">Switch to Parent Mode</Text>
            </TouchableOpacity>
          </View>

          {/* Settings Options Group */}
          <View className="border border-neutral-100 bg-white rounded-2xl divide-y divide-neutral-200/80 overflow-hidden shadow-sm">
            <TouchableOpacity
              onPress={() => router.push('/(coordinator)/family')}
              className="p-4 flex-row items-center justify-between active:bg-neutral-50"
            >
              <View className="flex-row items-center gap-3">
                <Users size={16} color="#007aff" />
                <View>
                  <Text className="text-xs font-bold text-neutral-800">Family Coordination</Text>
                  <Text className="text-[10px] text-neutral-400 font-semibold mt-0.5">
                    Map responsibilities & family care assignments
                  </Text>
                </View>
              </View>
              <ChevronRight size={14} color="#8e8e93" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowTrustModal(true)}
              className="p-4 flex-row items-center justify-between active:bg-neutral-50"
            >
              <View className="flex-row items-center gap-3">
                <Shield size={16} color="#34c759" />
                <View>
                  <Text className="text-xs font-bold text-neutral-800">
                    Clinical Ingestion Trust Settings
                  </Text>
                  <Text className="text-[10px] text-neutral-400 font-semibold mt-0.5">
                    Fuzzy logic limits: Spikes flagging configured
                  </Text>
                </View>
              </View>
              <ChevronRight size={14} color="#8e8e93" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowDevicesModal(true)}
              className="p-4 flex-row items-center justify-between active:bg-neutral-50"
            >
              <View className="flex-row items-center gap-3">
                <Smartphone size={16} color="#af52de" />
                <View>
                  <Text className="text-xs font-bold text-neutral-800">Connected Devices</Text>
                  <Text className="text-[10px] text-neutral-400 font-semibold mt-0.5">
                    Dexcom G7, Omron 7000, Apple Watch
                  </Text>
                </View>
              </View>
              <ChevronRight size={14} color="#8e8e93" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowDbModal(true);
                loadDbData();
              }}
              className="p-4 flex-row items-center justify-between active:bg-neutral-50"
            >
              <View className="flex-row items-center gap-3">
                <Database size={16} color="#007aff" />
                <View>
                  <Text className="text-xs font-bold text-neutral-800">
                    Care Activity & System Audit Logs
                  </Text>
                  <Text className="text-[10px] text-neutral-400 font-semibold mt-0.5">
                    Real-time healthcare activity records & governance
                  </Text>
                </View>
              </View>
              <ChevronRight size={14} color="#8e8e93" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            testID="coordinator-profile-logout"
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

          <View className="h-24" />
        </ScrollView>

        <BottomNavBar
          activeTab="profile"
          currentScreen="health_dashboard"
          onTabChange={(tab) => {
            if (tab === 'home') router.push('/(coordinator)');
            else if (tab === 'parents') router.push('/(coordinator)/parents');
            else if (tab === 'ask') context.setAskAIOpen(true);
            else if (tab === 'care') router.push('/(coordinator)/care');
            else if (tab === 'profile') router.push('/(coordinator)/profile');
          }}
          onOpenQuickActions={() => context.setQuickActionsOpen(true)}
          onOpenAskAI={() => context.setAskAIOpen(true)}
        />

        {/* Clinical Ingestion Trust Settings Modal */}
        <Modal
          visible={showTrustModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowTrustModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-[28px] p-6 pt-3 space-y-4 shadow-xl">
              {/* iOS Grabber Handle */}
              <View className="w-10 h-1.5 bg-neutral-200 rounded-full self-center mb-1.5" />

              <View className="flex-row justify-between items-center pb-2 border-b border-neutral-100">
                <View className="flex-row items-center gap-2">
                  <Shield size={18} color="#34c759" />
                  <Text className="text-lg font-bold text-neutral-900 tracking-tight">
                    Clinical Ingestion
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowTrustModal(false)}
                  className="p-1.5 bg-neutral-100 rounded-full"
                >
                  <X size={16} color="#8e8e93" />
                </TouchableOpacity>
              </View>

              <ScrollView className="space-y-4">
                <View className="bg-neutral-50 p-4 rounded-xl space-y-2 border border-neutral-100">
                  <Text className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                    Telemetry Spike Flagging
                  </Text>
                  <Text className="text-xs text-neutral-500 font-semibold leading-relaxed">
                    Fuzzy reasoning rules detect anomalies in blood pressure and steps streams.
                    Spikes trigger proactive alerts for the coordinator.
                  </Text>
                </View>

                <View className="bg-white border border-neutral-100 rounded-xl divide-y divide-neutral-200/80 overflow-hidden shadow-xs">
                  <View className="p-4 flex-row justify-between items-center">
                    <Text className="text-xs font-bold text-neutral-700">BP Spike Trigger</Text>
                    <Text className="text-xs font-bold text-[#ff3b30]">&gt;= 140/90 mmHg</Text>
                  </View>
                  <View className="p-4 flex-row justify-between items-center">
                    <Text className="text-xs font-bold text-neutral-700">Activity Drop Flag</Text>
                    <Text className="text-xs font-bold text-[#ff9500]">&gt;= 30% drop (5d)</Text>
                  </View>
                  <View className="p-4 flex-row justify-between items-center">
                    <Text className="text-xs font-bold text-neutral-700">Fuzzy Logic Ingest</Text>
                    <Text className="text-xs font-semibold text-neutral-500">
                      Active (Moderate)
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setShowTrustModal(false)}
                  className="w-full bg-[#007aff] py-3.5 rounded-xl items-center justify-center mt-2 active:opacity-90"
                >
                  <Text className="text-white text-xs font-bold">Save &amp; Close</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Connected Devices Modal */}
        <Modal
          visible={showDevicesModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDevicesModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-[28px] p-6 pt-3 space-y-4 shadow-xl">
              {/* iOS Grabber Handle */}
              <View className="w-10 h-1.5 bg-neutral-200 rounded-full self-center mb-1.5" />

              <View className="flex-row justify-between items-center pb-2 border-b border-neutral-100">
                <View className="flex-row items-center gap-2">
                  <Smartphone size={18} color="#af52de" />
                  <Text className="text-lg font-bold text-neutral-900 tracking-tight">
                    Connected Devices
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowDevicesModal(false)}
                  className="p-1.5 bg-neutral-100 rounded-full"
                >
                  <X size={16} color="#8e8e93" />
                </TouchableOpacity>
              </View>

              <ScrollView className="space-y-4">
                <View className="bg-neutral-50 p-4 rounded-xl space-y-2 border border-neutral-100">
                  <Text className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                    Device Pairings
                  </Text>
                  <Text className="text-xs text-neutral-500 font-semibold leading-relaxed">
                    Manage external telemetry sensors mapped to family health profiles.
                  </Text>
                </View>

                <View className="bg-white border border-neutral-100 rounded-xl divide-y divide-neutral-200/80 overflow-hidden shadow-xs">
                  <View className="p-4 flex-row justify-between items-center">
                    <View>
                      <Text className="text-xs font-bold text-neutral-800">Omron BP Monitor</Text>
                      <Text className="text-[9px] text-neutral-400 font-semibold mt-0.5">
                        {context.people[0]?.name || 'Primary Subject'} · Bluetooth Hub
                      </Text>
                    </View>
                    <Text className="text-xs font-bold text-[#34c759]">Connected</Text>
                  </View>

                  <View className="p-4 flex-row justify-between items-center">
                    <View>
                      <Text className="text-xs font-bold text-neutral-800">Dexcom G7 CGM</Text>
                      <Text className="text-[9px] text-neutral-400 font-semibold mt-0.5">
                        {context.people[1]?.name || 'Care Subject'} · Cloud Stream
                      </Text>
                    </View>
                    <Text className="text-xs font-bold text-[#34c759]">Connected</Text>
                  </View>

                  <View className="p-4 flex-row justify-between items-center">
                    <View>
                      <Text className="text-xs font-bold text-neutral-800">
                        Google Fit (Real-Time Stream)
                      </Text>
                      <Text className="text-[9px] text-neutral-400 font-semibold mt-0.5">
                        {context.people[0]?.name || 'Care Circle'} · Health Connect Live
                      </Text>
                    </View>
                    <Text className="text-xs font-bold text-[#34c759]">Live Active</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    googleFitService.openGoogleFitApp();
                    setShowDevicesModal(false);
                  }}
                  className="w-full bg-[#007aff] py-3.5 rounded-xl items-center justify-center mt-2 active:opacity-90"
                >
                  <Text className="text-white text-xs font-bold">Open Google Fit App ↗</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Database & Audit Log Inspector Modal */}
        <Modal
          visible={showDbModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDbModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-[28px] p-6 pt-3 max-h-[85%] space-y-4 shadow-xl">
              {/* iOS Grabber Handle */}
              <View className="w-10 h-1.5 bg-neutral-200 rounded-full self-center mb-1.5" />

              <View className="flex-row justify-between items-center pb-2 border-b border-neutral-100">
                <View className="flex-row items-center gap-2">
                  <Database size={18} color="#007aff" />
                  <Text className="text-lg font-bold text-neutral-900 tracking-tight">
                    Database Inspector
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowDbModal(false)}
                  className="p-1.5 bg-neutral-100 rounded-full"
                >
                  <X size={16} color="#8e8e93" />
                </TouchableOpacity>
              </View>

              {/* Tab Selector */}
              <View className="flex-row bg-neutral-100 p-1 rounded-xl">
                <TouchableOpacity
                  onPress={() => setDbTab('architecture')}
                  className={`flex-1 py-1.5 rounded-lg items-center justify-center ${
                    dbTab === 'architecture' ? 'bg-white shadow-xs' : ''
                  }`}
                >
                  <Text
                    className={`text-[11px] font-bold ${
                      dbTab === 'architecture' ? 'text-neutral-900' : 'text-neutral-500'
                    }`}
                  >
                    ER Domains (4)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDbTab('counts')}
                  className={`flex-1 py-1.5 rounded-lg items-center justify-center ${
                    dbTab === 'counts' ? 'bg-white shadow-xs' : ''
                  }`}
                >
                  <Text
                    className={`text-[11px] font-bold ${
                      dbTab === 'counts' ? 'text-neutral-900' : 'text-neutral-500'
                    }`}
                  >
                    Tables ({dbStats ? Object.keys(dbStats).length : 16})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDbTab('audits')}
                  className={`flex-1 py-1.5 rounded-lg items-center justify-center ${
                    dbTab === 'audits' ? 'bg-white shadow-xs' : ''
                  }`}
                >
                  <Text
                    className={`text-[11px] font-bold ${
                      dbTab === 'audits' ? 'text-neutral-900' : 'text-neutral-500'
                    }`}
                  >
                    Audit Logs ({auditLogs.length})
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView className="space-y-4" showsVerticalScrollIndicator={false}>
                {/* Health Badge */}
                <View className="bg-emerald-50 border border-emerald-200/60 p-3.5 rounded-2xl flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2.5">
                    <CheckCircle2 size={18} color="#059669" />
                    <View>
                      <Text className="text-xs font-bold text-emerald-900">
                        PostgreSQL 16 · All 16 Tables Active
                      </Text>
                      <Text className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                        Schema matches ER diagram end-to-end ({dbStats ? Object.values(dbStats).reduce((a, b) => a + b, 0) : 0} total records)
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={loadDbData}
                    disabled={loadingDb}
                    className="p-2 bg-emerald-100/70 rounded-xl"
                  >
                    <RefreshCw size={14} color="#059669" />
                  </TouchableOpacity>
                </View>

                {/* TAB 1: ER DOMAIN ARCHITECTURE */}
                {dbTab === 'architecture' && (
                  <View className="space-y-3.5">
                    <Text className="text-[11px] text-neutral-500 leading-relaxed font-semibold">
                      Enterprise healthcare data architecture. All operational care domains are synchronized in real-time with family profiles:
                    </Text>

                    {ER_DOMAINS.map((domain) => (
                      <View
                        key={domain.id}
                        className="rounded-2xl border p-4 space-y-3"
                        style={{ backgroundColor: domain.bg, borderColor: domain.border }}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2">
                            <Layers size={15} color={domain.color} />
                            <Text className="text-xs font-bold text-neutral-900">
                              {domain.title}
                            </Text>
                          </View>
                          <View
                            className="px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${domain.color}20` }}
                          >
                            <Text
                              className="text-[9px] font-bold tracking-wider uppercase"
                              style={{ color: domain.color }}
                            >
                              {domain.badge}
                            </Text>
                          </View>
                        </View>

                        <Text className="text-[10px] text-neutral-600 font-semibold">
                          {domain.description}
                        </Text>

                        <View className="space-y-2 pt-1">
                          {domain.tables.map((tbl) => (
                            <View
                              key={tbl.name}
                              className="bg-white/90 border border-neutral-200/80 p-2.5 rounded-xl space-y-1 shadow-2xs"
                            >
                              <View className="flex-row justify-between items-center">
                                <Text className="text-xs font-bold text-neutral-900 font-mono">
                                  {tbl.name}
                                </Text>
                                <View className="bg-neutral-100 px-2 py-0.5 rounded-md">
                                  <Text className="text-[10px] font-bold text-neutral-700 font-mono">
                                    {dbStats && dbStats[tbl.name] !== undefined
                                      ? `${dbStats[tbl.name]} rows`
                                      : 'active'}
                                  </Text>
                                </View>
                              </View>
                              <Text className="text-[10px] text-neutral-600 leading-tight">
                                {tbl.desc}
                              </Text>
                              <View className="flex-row items-center gap-1 mt-0.5">
                                <GitBranch size={10} color="#8e8e93" />
                                <Text className="text-[9px] text-neutral-400 font-mono">
                                  {tbl.fks}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* TAB 2: LIVE TABLE COUNTS */}
                {dbTab === 'counts' && (
                  <View className="space-y-2">
                    <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                      PostgreSQL Tables ({dbStats ? Object.keys(dbStats).length : 16})
                    </Text>
                    <View className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-3 divide-y divide-neutral-200/60">
                      {dbStats ? (
                        Object.entries(dbStats).map(([table, count]) => (
                          <View key={table} className="py-2 flex-row justify-between items-center">
                            <Text className="text-xs font-semibold text-neutral-700 font-mono">
                              {table}
                            </Text>
                            <View className="bg-white border border-neutral-200 px-2.5 py-0.5 rounded-full">
                              <Text className="text-[11px] font-bold text-neutral-900 font-mono">
                                {count} rows
                              </Text>
                            </View>
                          </View>
                        ))
                      ) : (
                        <Text className="text-xs text-neutral-400 py-3 text-center">
                          {loadingDb ? 'Loading table counts...' : 'Tap refresh to load table stats'}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* TAB 3: AUDIT TRAILS */}
                {dbTab === 'audits' && (
                  <View className="space-y-2">
                    <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                      Audit Trails (audit_log table)
                    </Text>
                    <View className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-3 space-y-2">
                      {auditLogs && auditLogs.length > 0 ? (
                        auditLogs.slice(0, 10).map((log: any, idx: number) => (
                          <View
                            key={log.id || idx}
                            className="bg-white border border-neutral-200/70 p-2.5 rounded-xl space-y-1"
                          >
                            <View className="flex-row justify-between items-center">
                              <Text className="text-[11px] font-bold text-neutral-800 font-mono">
                                {log.action}
                              </Text>
                              <Text className="text-[9px] text-neutral-400">
                                {log.occurred_at
                                  ? new Date(log.occurred_at).toLocaleTimeString()
                                  : log.created_at
                                  ? new Date(log.created_at).toLocaleTimeString()
                                  : 'Recent'}
                              </Text>
                            </View>
                            <Text className="text-[10px] text-neutral-500" numberOfLines={1}>
                              Actor: {log.actor_id || log.actor_user_id || 'system'}
                            </Text>
                            {(log.details || log.metadata_json) && (
                              <Text className="text-[9px] text-neutral-400 font-mono" numberOfLines={1}>
                                {typeof (log.details || log.metadata_json) === 'string'
                                  ? (log.details || log.metadata_json)
                                  : JSON.stringify(log.details || log.metadata_json)}
                              </Text>
                            )}
                          </View>
                        ))
                      ) : (
                        <Text className="text-xs text-neutral-400 py-2 text-center">
                          {loadingDb ? 'Fetching audit trails...' : 'No audit records available'}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  onPress={loadDbData}
                  disabled={loadingDb}
                  className="w-full bg-[#007aff] py-3.5 rounded-xl items-center justify-center mt-2 active:opacity-90 flex-row gap-2"
                >
                  <RefreshCw size={14} color="#ffffff" />
                  <Text className="text-white text-xs font-bold">
                    {loadingDb ? 'Querying Database...' : 'Refresh Live DB Stats'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Family Switcher Modal (FAM-009) */}
        <Modal
          visible={showFamilyModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowFamilyModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-[28px] p-6 pt-3 max-h-[80%] space-y-4 shadow-xl">
              <View className="w-10 h-1.5 bg-neutral-200 rounded-full self-center mb-1.5" />

              <View className="flex-row justify-between items-center pb-2 border-b border-neutral-100">
                <View className="flex-row items-center gap-2">
                  <Home size={18} color="#059669" />
                  <Text className="text-lg font-bold text-neutral-900 tracking-tight">
                    Switch Family Context
                  </Text>
                </View>
                <TouchableOpacity
                  testID="family-switcher-close"
                  onPress={() => setShowFamilyModal(false)}
                  className="p-1.5 bg-neutral-100 rounded-full"
                >
                  <X size={16} color="#8e8e93" />
                </TouchableOpacity>
              </View>

              <Text className="text-[11px] text-neutral-500 leading-relaxed">
                Data, permissions and notifications are isolated per family. Switching refreshes
                the active scope used by every subsequent API call.
              </Text>

              <ScrollView className="space-y-2" showsVerticalScrollIndicator={false}>
                {loadingFamilies && families.length === 0 ? (
                  <Text className="text-xs text-neutral-400 py-4 text-center">Loading families…</Text>
                ) : families.length === 0 ? (
                  <Text className="text-xs text-neutral-400 py-4 text-center">
                    No additional families found for this user.
                  </Text>
                ) : (
                  families.map((fam: any) => {
                    const active = fam.id === activeFamilyId;
                    return (
                      <TouchableOpacity
                        key={fam.id}
                        testID={`family-switcher-item-${fam.id}`}
                        onPress={() => handleSwitchFamily(fam.id, fam.name || 'Family')}
                        className={`p-4 rounded-2xl border flex-row items-center justify-between ${
                          active
                            ? 'border-emerald-400 bg-emerald-50/70'
                            : 'border-neutral-200 bg-white'
                        }`}
                      >
                        <View className="flex-1 pr-3">
                          <Text
                            testID={`family-switcher-name-${fam.id}`}
                            className={`text-sm font-bold ${
                              active ? 'text-emerald-800' : 'text-neutral-800'
                            }`}
                          >
                            {fam.name || 'Family'}
                          </Text>
                          <Text className="text-[10px] text-neutral-500 font-mono mt-0.5" numberOfLines={1}>
                            {fam.id}
                          </Text>
                        </View>
                        {active ? (
                          <View className="bg-emerald-500 px-2.5 py-1 rounded-full">
                            <Text className="text-[9px] font-bold text-white uppercase">Active</Text>
                          </View>
                        ) : (
                          <ChevronRight size={16} color="#8e8e93" />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              <TouchableOpacity
                testID="family-switcher-refresh"
                onPress={loadFamilies}
                disabled={loadingFamilies}
                className="w-full bg-emerald-600 py-3 rounded-xl flex-row items-center justify-center gap-2"
              >
                <RefreshCw size={14} color="#ffffff" />
                <Text className="text-white text-xs font-bold">
                  {loadingFamilies ? 'Refreshing…' : 'Refresh Family List'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
