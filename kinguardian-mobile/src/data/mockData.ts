import { Person, HealthObservation, HealthRecordItem } from '../types';

export const DAD_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuALvS8om7n8gN1nN9dwPrBv-8lUIiusfbDJ_24xukhktin6SS4Fum03pBDjOv6QZq7FG1zrXkOAvuYXPyd3bNWRiExOfo8jITls7X2v_F_ae2gOUZWhU50WGJItnoRtI9opmF1QBZU6bzSEV02qftPpb92imjH5svG7X7JsNrBwsRS4KyeFQ20zUd6kbGNULu6DnWuaKXcPSFfVBT19aNcq-tWb94VlGR9d-nSgRSdV7ns615jW5_9B';
export const USER_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBjb58pDYmLPOvRb2C93qIwVmN3Z3qZ__ljM1T9ZSdVoVI9ovH8x3UkvVX2km1jcc-lJDB8XKVXGhKX0bZL8qDi2s9jgC8eOKs1TubpaykQObp6xTg11e7t9fDFBiO9G_knt_Iu91RQ6oYuQGrd_EwUBKvQprl0XXO1mrgZ2LripRVXQ9ztlZOQr21ScUbgnP5iva9lVWOYFTQ4E6180FpDmnFn1lhIDcG8awhKsT88RjoTEgkPxtmV';
export const PARENTS_ILLUSTRATION =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCPIugiITm25UazY2VI-2pFTFlpCdsA4usgq-4btIyUPCguH2WGhwQWHZ-VLu9skYGhiNy2S_QSY1iJ1LysxMHRZtiIHM0lgR92SsLOzBF3zQNckaj7APjAwizPMZcAXNE6U4KG4Cc5RZ-sx7pdehL0Q8Cnz0wxY6a3Y6hnzpzcTm9uIHqr4cEeIEcKnJW_JpyUkZg6YPNBwDCWg5moqbM_aJsK9b_fAIecXLS_3FlufTwO9NEo4L70';

export const INITIAL_PEOPLE: Person[] = [
  {
    id: 'dad',
    name: 'Aniruddha',
    relation: 'Father',
    relationship: 'Father',
    avatarUrl: DAD_AVATAR,
    avatar: DAD_AVATAR,
    age: 68,
    city: 'Chennai',
    country: 'India',
    timezone: 'Asia/Kolkata',
    wellbeingStatus: 'attention',
    conditions: ['Hypertension', 'Type 2 Diabetes', 'Post-Cardiac Stent (2022)'],
    currentStatus: 'Activity down 35% in past 5 days',
    lastCheckIn: '2 hours ago'
  },
  {
    id: 'mom',
    name: 'Vandana',
    relation: 'Mother',
    relationship: 'Mother',
    avatarUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=256',
    avatar:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=256',
    age: 64,
    city: 'Chennai',
    country: 'India',
    timezone: 'Asia/Kolkata',
    wellbeingStatus: 'doing-well',
    conditions: ['Osteoporosis', 'Mild Osteoarthritis'],
    currentStatus: 'All vitals steady & medications taken',
    lastCheckIn: 'Yesterday 6:30 PM'
  },
  {
    id: 'ram',
    name: 'Coordinator',
    relation: 'Coordinator',
    relationship: 'Coordinator',
    avatarUrl: USER_AVATAR,
    avatar: USER_AVATAR,
    age: 36,
    city: 'London',
    country: 'UK',
    timezone: 'Europe/London',
    wellbeingStatus: 'doing-well',
    conditions: [],
    currentStatus: 'Active coordinator',
    lastCheckIn: 'Just now'
  },
  {
    id: 'rahul',
    name: 'Family Member',
    relation: 'Brother',
    relationship: 'Brother',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256',
    age: 39,
    city: 'Dubai',
    country: 'UAE',
    timezone: 'Asia/Dubai',
    wellbeingStatus: 'doing-well',
    conditions: [],
    currentStatus: 'Stable contact',
    lastCheckIn: '4 hours ago'
  },
  {
    id: 'priya',
    name: 'Caregiver',
    relation: 'Family Caregiver',
    relationship: 'Family caregiver',
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=256',
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=256',
    age: 32,
    city: 'Bengaluru',
    country: 'India',
    timezone: 'Asia/Kolkata',
    wellbeingStatus: 'doing-well',
    conditions: [],
    currentStatus: 'On-site monitoring',
    lastCheckIn: '1 hour ago'
  }
];


export const INITIAL_OBSERVATIONS: Record<string, HealthObservation> = {
  dad: {
    id: 'obs-dad-activity-bp',
    personId: 'dad',
    badge: 'OBSERVATION',
    title: 'Activity & Blood Pressure Variance',
    primaryStatement:
      "I noticed something different, but I don't have enough information to understand why yet.",
    highlightText: "Dad's daily physical activity has decreased by 35% over the last five days.",
    disclaimer:
      'This is an observation based on available device patterns. It is not a medical diagnosis or emergency alert.',
    possibleFactors: [
      {
        id: 'factor-1',
        icon: 'routine',
        title: 'Changes in daily routine or weather',
        description:
          'Chennai heat wave (39°C) may have limited daily afternoon walks on the veranda.'
      },
      {
        id: 'factor-2',
        icon: 'bedtime',
        title: 'Sleep quality variations',
        description: 'Fewer restful hours of deep sleep detected in overnight Apple Health logs.'
      },
      {
        id: 'factor-3',
        icon: 'sentiment_dissatisfied',
        title: 'Early signs of fatigue or illness',
        description: 'Post-walk recovery lagging or early signs of mild seasonal cold.'
      },
      {
        id: 'factor-4',
        icon: 'watch_off',
        title: 'Wearable not worn consistently',
        description: 'Smartwatch remained on charging stand between 2 PM - 6 PM Chennai time.'
      }
    ],
    dataConsidered: [
      {
        icon: 'directions_run',
        text: '5 days of step activity logs',
        subdued: false,
        color: '#4338ca'
      },
      {
        icon: 'bed',
        text: 'No recent sleep analysis logs',
        subdued: true
      },
      {
        icon: 'forum',
        text: 'Last caregiver check-in: 2 hrs ago',
        subdued: false,
        color: '#006a61'
      }
    ],
    transparency: {
      title: 'Why am I seeing this insight?',
      subtitle: 'Understanding the rationale behind your recent elevated blood pressure alert.',
      clinicalReasoning:
        "KinGuardian AI detected a consistent 12% increase in evening systolic readings over the last 10 days compared to the parent's baseline. This pattern often correlates with evening stress levels or heat exhaustion, prompting a proactive review.",
      highlightMetric: '12% increase',
      confidenceText: 'HIGH CONFIDENCE • DIRECT WEARABLE INGESTION',
      confidenceLevel: 'high',
      dataCountText: '17 Blood Pressure Readings',
      timePeriodText: 'Aug 8 – Aug 17, 2026',
      dataSources: [
        {
          name: 'Omron Monitor',
          icon: 'vital_signs',
          subtext: 'Primary device • 12 readings',
          readingsCount: 12,
          verified: true
        },
        {
          name: 'Apple Health',
          icon: 'health_and_safety',
          subtext: 'Synced integration • 3 readings',
          readingsCount: 3,
          verified: true
        },
        {
          name: 'Manual Entry',
          icon: 'edit_note',
          subtext: 'Caregiver reported • 2 readings',
          readingsCount: 2,
          verified: true
        }
      ],
      readingsHistory: [
        {
          date: 'Aug 17',
          time: '8:45 PM',
          systolic: 138,
          diastolic: 88,
          source: 'Omron Monitor',
          note: 'Post-dinner measurement'
        },
        { date: 'Aug 16', time: '8:30 PM', systolic: 136, diastolic: 86, source: 'Omron Monitor' },
        { date: 'Aug 15', time: '9:10 PM', systolic: 140, diastolic: 90, source: 'Apple Health' },
        { date: 'Aug 14', time: '8:15 PM', systolic: 134, diastolic: 84, source: 'Omron Monitor' },
        { date: 'Aug 13', time: '7:50 PM', systolic: 139, diastolic: 89, source: 'Omron Monitor' },
        {
          date: 'Aug 12',
          time: '9:00 PM',
          systolic: 137,
          diastolic: 87,
          source: 'Manual Entry',
          note: 'Logged by caregiver'
        },
        { date: 'Aug 11', time: '8:20 PM', systolic: 135, diastolic: 85, source: 'Omron Monitor' },
        { date: 'Aug 10', time: '8:40 PM', systolic: 138, diastolic: 88, source: 'Omron Monitor' }
      ]
    }
  },
  mom: {
    id: 'obs-mom-glucose',
    personId: 'mom',
    badge: 'OPTIMAL TREND',
    title: 'Fasting Glucose & Mobility Stability',
    primaryStatement:
      "Mom's fasting glycemic response has stabilized nicely after the recent Metformin timing adjustments.",
    highlightText: 'Morning fasting blood sugar averaged 98 mg/dL over the past 7 days.',
    disclaimer: 'Observation derived from Dexcom G7 sync and logged breakfast timestamps.',
    possibleFactors: [
      {
        id: 'factor-m1',
        icon: 'restaurant',
        title: 'Consistent low-glycemic meals',
        description: "Dinner carb intake managed closely with the caregiver's assistance."
      },
      {
        id: 'factor-m2',
        icon: 'water_drop',
        title: 'Hydration goal achieved (2.1L daily)',
        description:
          'Smart bottle sync confirms steady fluid distribution during hot Chennai afternoons.'
      },
      {
        id: 'factor-m3',
        icon: 'medication',
        title: '100% Metformin adherence',
        description: 'Taken promptly with dinner, verified by the caregiver.'
      }
    ],
    dataConsidered: [
      {
        icon: 'show_chart',
        text: '7 days of continuous CGM readings',
        subdued: false,
        color: '#006a61'
      },
      {
        icon: 'check_circle',
        text: 'Medication logged every evening',
        subdued: false,
        color: '#4338ca'
      },
      {
        icon: 'forum',
        text: 'Last check-in: Yesterday 6:30 PM',
        subdued: false,
        color: '#006a61'
      }
    ],
    transparency: {
      title: 'Why am I seeing this insight?',
      subtitle: 'Understanding the rationale behind Mom’s stable metabolic milestone.',
      clinicalReasoning:
        'KinGuardian observed an 85% time-in-range (70–140 mg/dL) consistently throughout the week, representing a notable improvement from the prior 68% baseline.',
      highlightMetric: '85% in target range',
      confidenceText: 'HIGH CONFIDENCE • DIRECT CGM STREAM',
      confidenceLevel: 'high',
      dataCountText: '28 Continuous Glucose Logs',
      timePeriodText: 'Aug 10 – Aug 17, 2026',
      dataSources: [
        {
          name: 'Dexcom G7 CGM',
          icon: 'sensors',
          subtext: 'Continuous Bluetooth stream • 24 logs',
          readingsCount: 24,
          verified: true
        },
        {
          name: 'Apple Health',
          icon: 'health_and_safety',
          subtext: 'Steps & Hydration • 4 logs',
          readingsCount: 4,
          verified: true
        }
      ]
    }
  }
};

export const INITIAL_HEALTH_RECORDS: HealthRecordItem[] = [
  // People
  {
    id: 'rec-1',
    category: 'people',
    personId: 'dad',
    title: 'Parent',
    subtitle: 'Primary Profile • Age 68 • Connected via Apple Health & Omron',
    status: 'Monitored',
    tag: 'Active',
    icon: 'group',
    iconBgColor: 'bg-[#e6eeff]',
    iconColor: 'text-[#2a14b4]'
  },
  {
    id: 'rec-2',
    category: 'people',
    personId: 'mom',
    title: 'Parent',
    subtitle: 'Primary Profile • Age 64 • Connected via Dexcom G7',
    status: 'Monitored',
    tag: 'Active',
    icon: 'group',
    iconBgColor: 'bg-[#e6eeff]',
    iconColor: 'text-[#2a14b4]'
  },
  {
    id: 'rec-3',
    category: 'people',
    personId: 'all',
    title: 'Family Coordinator',
    subtitle: 'Healthcare Power of Attorney • Remote Care Coordinator in London',
    tag: 'Proxy',
    icon: 'shield_person',
    iconBgColor: 'bg-[#86f2e4]/30',
    iconColor: 'text-[#006a61]'
  },

  // Medications
  {
    id: 'rec-4',
    category: 'medications',
    personId: 'dad',
    title: 'Amlodipine 5mg',
    subtitle: 'Once daily in the morning with water • Blood Pressure control',
    date: 'Prescription renewed: Jul 28',
    status: 'Active • Taken today at 8:15 AM IST',
    tag: 'Dad',
    icon: 'pill',
    iconBgColor: 'bg-[#86f2e4]/30',
    iconColor: 'text-[#006a61]'
  },
  {
    id: 'rec-5',
    category: 'medications',
    personId: 'dad',
    title: 'Atorvastatin 20mg',
    subtitle: 'Once daily before bedtime • Cholesterol management',
    date: 'Prescription renewed: Jun 14',
    status: 'Active • Evening dose scheduled 8:00 PM IST',
    tag: 'Dad',
    icon: 'pill',
    iconBgColor: 'bg-[#86f2e4]/30',
    iconColor: 'text-[#006a61]'
  },
  {
    id: 'rec-6',
    category: 'medications',
    personId: 'mom',
    title: 'Metformin 500mg ER',
    subtitle: 'Twice daily with meals • Type 2 Diabetes',
    date: 'Refill: 18 days remaining',
    status: 'Active • Morning dose taken',
    tag: 'Mom',
    icon: 'pill',
    iconBgColor: 'bg-[#86f2e4]/30',
    iconColor: 'text-[#006a61]'
  },

  // Doctors
  {
    id: 'rec-7',
    category: 'doctors',
    personId: 'dad',
    title: 'Dr. Ramesh Sharma, MD',
    subtitle: 'Chief Cardiologist • Apollo Hospital Greams Road, Chennai',
    details: 'Office: +91 44 2829 0200 • Portal: Apollo Health Connect',
    tag: 'Dad',
    icon: 'stethoscope',
    iconBgColor: 'bg-[#dee9fc]',
    iconColor: 'text-[#121c2a]'
  },
  {
    id: 'rec-8',
    category: 'doctors',
    personId: 'mom',
    title: 'Dr. Sarah Chen, MD',
    subtitle: 'Endocrinology & Primary Care Specialist',
    details: 'Office: +91 44 4220 5000 • Next review: Sept 12',
    tag: 'Mom',
    icon: 'stethoscope',
    iconBgColor: 'bg-[#dee9fc]',
    iconColor: 'text-[#121c2a]'
  },

  // Appointments
  {
    id: 'rec-9',
    category: 'appointments',
    personId: 'dad',
    title: 'Cardiology Follow-Up (Dad)',
    subtitle: 'Review 30-day ambulatory BP log with Dr. Sharma',
    date: 'Aug 26, 2026 at 10:30 AM IST',
    status: 'Confirmed • Telehealth Video portal',
    tag: 'Upcoming',
    icon: 'calendar_month',
    iconBgColor: 'bg-[#fce7f3]/60',
    iconColor: 'text-[#be185d]'
  },
  {
    id: 'rec-10',
    category: 'appointments',
    personId: 'mom',
    title: 'Routine Eye Exam & HbA1c screening',
    subtitle: "Retinopathy check with Dr. Sharma's team",
    date: 'Sept 5, 2026 at 2:00 PM IST',
    status: 'Scheduled • Block F, Apollo Chennai',
    tag: 'Upcoming',
    icon: 'calendar_month',
    iconBgColor: 'bg-[#fce7f3]/60',
    iconColor: 'text-[#be185d]'
  },

  // Labs & Reports
  {
    id: 'rec-11',
    category: 'labs',
    personId: 'dad',
    title: 'Comprehensive Metabolic Panel (CMP)',
    subtitle: 'Apollo Diagnostics • eGFR: 78, Creatinine: 1.1 mg/dL, Potassium: 4.4 mmol/L',
    date: 'Aug 3, 2026',
    status: 'Normal Range • Reviewed by Dr. Sharma',
    tag: 'Dad',
    icon: 'science',
    iconBgColor: 'bg-[#e6eeff]',
    iconColor: 'text-[#2a14b4]'
  },
  {
    id: 'rec-12',
    category: 'labs',
    personId: 'mom',
    title: 'HbA1c & Fasting Lipid Panel',
    subtitle: 'Quest India Diagnostics • HbA1c: 6.4% (Down from 6.8%), LDL: 92 mg/dL',
    date: 'Jul 22, 2026',
    status: 'Stable Glycemic Trend',
    tag: 'Mom',
    icon: 'science',
    iconBgColor: 'bg-[#e6eeff]',
    iconColor: 'text-[#2a14b4]'
  },

  // Documents
  {
    id: 'rec-13',
    category: 'documents',
    personId: 'all',
    title: 'Healthcare Power of Attorney & Advance Directive',
    subtitle: 'Registered Statutory Power of Attorney document • PDF (3.2 MB)',
    date: 'Signed: Jan 15, 2025',
    status: 'Verified on file with Apollo Chennai Hub',
    icon: 'description',
    iconBgColor: 'bg-[#d9e3f6]',
    iconColor: 'text-[#464554]'
  },
  {
    id: 'rec-14',
    category: 'documents',
    personId: 'dad',
    title: 'Hospital Discharge Summary (Cardiac Stent 2022)',
    subtitle: 'Apollo Hospital Chennai • 4 pages summary • PDF',
    date: 'Nov 12, 2022',
    status: 'Archived',
    icon: 'description',
    iconBgColor: 'bg-[#d9e3f6]',
    iconColor: 'text-[#464554]'
  },

  // Symptoms & Events
  {
    id: 'rec-15',
    category: 'symptoms',
    personId: 'dad',
    title: 'Decreased Daily Step Count & Afternoon Fatigue',
    subtitle: 'Step count fell from 4,800 to 3,120 steps/day over 5-day period in Chennai',
    date: 'Aug 13 - Aug 17, 2026',
    status: 'Under Observation',
    tag: 'Alert',
    icon: 'vital_signs',
    iconBgColor: 'bg-[#ffdad6]/60',
    iconColor: 'text-[#ba1a1a]'
  },
  {
    id: 'rec-16',
    category: 'symptoms',
    personId: 'dad',
    title: 'Evening Systolic Blood Pressure Spikes (138-140 mmHg)',
    subtitle: '12% elevated above 122 mmHg baseline during 8:00 - 9:30 PM window',
    date: 'Aug 8 - Aug 17, 2026',
    status: 'Clinical Reason Flagged',
    tag: 'Flagged',
    icon: 'vital_signs',
    iconBgColor: 'bg-[#ffdad6]/60',
    iconColor: 'text-[#ba1a1a]'
  }
];

export const INITIAL_RECENT_SEARCHES = [
  "Dad's Blood Pressure",
  'Coordinator updates',
  'Amlodipine refill date',
  'Cardiology appointment'
];

export const INITIAL_NOTIFICATIONS = [
  // Coordinator Notifications
  {
    id: 'notif-c-1',
    title: 'Adherence Alert: Evening Medication',
    message: "The parent hasn't marked their Atorvastatin as taken yet.",
    type: 'reminder' as const,
    category: 'medication' as const,
    recipient: 'coordinator' as const,
    time: '45m ago',
    read: false,
    actionText: 'Message Caregiver',
    actionScreen: 'care_view' as const
  },
  {
    id: 'notif-c-2',
    title: 'Vitals Update: BP Spiking Alert',
    message: "The parent's systolic blood pressure rose by 12% to 142/90 mmHg.",
    type: 'alert' as const,
    category: 'health_change' as const,
    recipient: 'coordinator' as const,
    time: '2h ago',
    read: false,
    actionText: 'Analyze Vitals',
    actionScreen: 'vitals_detail' as const,
    actionData: 'dad'
  },
  {
    id: 'notif-c-3',
    title: 'Upcoming Cardiology Appointment',
    message: 'Dad has cardiology tomorrow at 4:00 PM IST at Apollo Hospital Chennai.',
    type: 'info' as const,
    category: 'appointment' as const,
    recipient: 'coordinator' as const,
    time: '4h ago',
    read: true,
    actionText: 'Prepare Summary',
    actionScreen: 'care_view' as const
  },
  {
    id: 'notif-c-4',
    title: 'Parent Checked In',
    message: "The parent submitted a daily check-in: Feeling 'Good' at 9:15 AM.",
    type: 'sync' as const,
    category: 'parent_check-in' as const,
    recipient: 'coordinator' as const,
    time: 'Today 9:15 AM',
    read: false
  },
  {
    id: 'notif-c-5',
    title: 'New Clinical Document Uploaded',
    message: 'Apollo Chennai uploaded Cardiac Metabolic Panel. Click to run AI summary.',
    type: 'info' as const,
    category: 'document' as const,
    recipient: 'coordinator' as const,
    time: 'Today 11:30 AM',
    read: false,
    actionText: 'View Vault',
    actionScreen: 'search_records' as const
  },
  {
    id: 'notif-c-6',
    title: 'Care Task Assigned',
    message: 'Verify the morning walking path in Chennai is assigned to the caregiver.',
    type: 'sync' as const,
    category: 'care_task' as const,
    recipient: 'coordinator' as const,
    time: 'Yesterday',
    read: true
  },
  {
    id: 'notif-c-7',
    title: 'New Sibling Chat Update',
    message: "Family member: 'I will check the parent's pharmacy bills.'",
    type: 'info' as const,
    category: 'family_message' as const,
    recipient: 'coordinator' as const,
    time: 'Yesterday',
    read: true,
    actionScreen: 'chat_view' as const
  },
  {
    id: 'notif-c-8',
    title: 'AI Insight: Steps Drift Correlation',
    message: "The parent's steps decreased by 35% over the past 5 days due to hot weather.",
    type: 'alert' as const,
    category: 'ai_insight' as const,
    recipient: 'coordinator' as const,
    time: 'Yesterday',
    read: false,
    actionScreen: 'transparency_insight' as const,
    actionData: 'dad'
  },

  // Parent Notifications
  {
    id: 'notif-p-1',
    title: 'Medicine Time! 💊',
    message: 'Please take Metformin 500mg (scheduled with dinner at 8:00 PM).',
    type: 'reminder' as const,
    category: 'medication_reminder' as const,
    recipient: 'parent' as const,
    time: 'Scheduled now',
    read: false
  },
  {
    id: 'notif-p-2',
    title: 'Next Doctor Visit 🩺',
    message: 'You have a Cardiology Consultation tomorrow at 4:00 PM with Dr. Sharma.',
    type: 'info' as const,
    category: 'appointment_reminder' as const,
    recipient: 'parent' as const,
    time: 'Tomorrow 4:00 PM',
    read: false
  },
  {
    id: 'notif-p-3',
    title: 'Message from Coordinator ❤️',
    message: "Coordinator: 'Did you take your blood pressure medicine today?'",
    type: 'info' as const,
    category: 'message_from_family' as const,
    recipient: 'parent' as const,
    time: '1h ago',
    read: false
  },
  {
    id: 'notif-p-4',
    title: 'Daily Check-in Request 🛡️',
    message: 'Let your coordinator know how you are feeling today. Tap to check-in.',
    type: 'reminder' as const,
    category: 'kinguardian_request' as const,
    recipient: 'parent' as const,
    time: 'Today 9:00 AM',
    read: false
  }
];

export const INITIAL_DOCUMENTS = [
  {
    id: 'doc-apollo-2026',
    name: 'Apollo_Panel_2026.pdf',
    category: 'Diagnostic Lab',
    date: 'Aug 19, 2026',
    status: 'ready' as const,
    filenest_file_id: 'apollo_panel_2026.pdf',
    filenestFileId: 'apollo_panel_2026.pdf',
    summary:
      'Apollo Diagnostics Comprehensive Metabolic & Renal Panel: candidate lab values extracted for clinical review. Highlighted values require physician evaluation.',
    findings: [
      'HbA1c: 6.8% (Candidate Value - Highlighted)',
      'Serum Creatinine: 1.1 mg/dL (Candidate Value - Highlighted)',
      'Fasting Blood Sugar: 118 mg/dL (Elevated)',
      'eGFR: 68 mL/min/1.73m² (Borderline normal renal clearance)'
    ],
    candidateMetrics: [
      { name: 'HbA1c', value: '6.8%', status: 'Candidate Value • Elevated (Ref < 6.5%)', isCandidate: true, badgeColor: '#ef4444', bg: '#fee2e2' },
      { name: 'Serum Creatinine', value: '1.1 mg/dL', status: 'Candidate Value • In Range (0.7 - 1.2 mg/dL)', isCandidate: true, badgeColor: '#2563eb', bg: '#dbeafe' },
      { name: 'Fasting Blood Sugar', value: '118 mg/dL', status: 'Pre-diabetic Range', isCandidate: false, badgeColor: '#f59e0b', bg: '#fef3c7' },
      { name: 'eGFR', value: '68 mL/min', status: 'Stable Clearance', isCandidate: false, badgeColor: '#10b981', bg: '#d1fae5' }
    ],
    recommendations: [
      'Consult Dr. Sharma regarding diuretic timing and metformin maintenance.',
      'Maintain daily hydration monitoring during Chennai warm spells.'
    ],
    uploader: 'Apollo Diagnostics Sync',
    fileSize: '1.2 MB'
  },
  {
    id: 'doc-1',
    name: 'Parent_Discharge_Summary_2022.pdf',
    category: 'Discharge Summary',
    date: 'Nov 12, 2022',
    status: 'parsed' as const,
    summary:
      'Discharge summary following successful post-myocardial infarction cardiac stent placement. Focus on lifestyle adjustment, low-sodium diet, and medication compliance.',
    findings: [
      'Successful drug-eluting stent (DES) placement in left anterior descending (LAD) artery at Apollo Chennai.',
      'LVEF (Left Ventricular Ejection Fraction) at 52% post-procedure.',
      'Prescribed Amlodipine 5mg morning, Atorvastatin 20mg evening.'
    ],
    recommendations: [
      'Check blood pressure twice daily.',
      'Maintain low-sodium diet to prevent edema.',
      'Light physical walking 30 minutes daily on veranda.'
    ],
    uploader: 'Dr. Sharma (System Sync)',
    fileSize: '3.2 MB'
  },
  {
    id: 'doc-2',
    name: 'Parent_Apollo_Metabolic_Aug3.pdf',
    category: 'Lab Report',
    date: 'Aug 3, 2026',
    status: 'parsed' as const,
    summary:
      'Fasting lipid panel and comprehensive metabolic review for the parent. Results show stable glycemic management and normal electrolyte balance.',
    findings: [
      'Fasting blood glucose: 98 mg/dL (optimal control).',
      'HbA1c level: 6.4% (well within target range for type 2 diabetes).',
      'Potassium 4.4 mmol/L (Normal), eGFR 78 mL/min (Stable renal function).'
    ],
    recommendations: [
      'Maintain daily Metformin 500mg ER twice daily.',
      'Consistent hydration goal of 2.1 liters daily in Chennai heat.',
      'Follow up in 6 months for diabetic wellness review.'
    ],
    uploader: 'Apollo Diagnostics Sync',
    fileSize: '1.4 MB'
  }
];

export const INITIAL_SYNC_LOGS = [
  {
    id: 'slog-1',
    time: '15 mins ago',
    device: 'Dexcom G7 CGM',
    status: 'synced' as const,
    value: 'Glucose 98 mg/dL',
    user: 'Parent'
  },
  {
    id: 'slog-2',
    time: '45 mins ago',
    device: 'Apple Watch',
    status: 'synced' as const,
    value: '3,120 steps / 82 bpm',
    user: 'Parent'
  },
  {
    id: 'slog-3',
    time: '2 hours ago',
    device: 'Omron BP Monitor',
    status: 'synced' as const,
    value: '138/88 mmHg',
    user: 'Parent'
  },
  {
    id: 'slog-4',
    time: '3 hours ago',
    device: 'Manual Log',
    status: 'synced' as const,
    value: 'Amlodipine marked taken',
    user: 'Caregiver'
  }
];

export const CARE_NETWORK_TEAM = [
  {
    id: 'c-1',
    name: 'Family Member',
    role: 'Primary Proxy (Daughter)',
    location: 'London, UK (BST)',
    avatar: USER_AVATAR,
    online: true,
    timezoneOffset: 'BST (UTC+1)'
  },
  {
    id: 'c-2',
    name: 'Caregiver',
    role: 'Local Nurse & Caregiver',
    location: 'Chennai, India (IST)',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    online: true,
    timezoneOffset: 'IST (UTC+5.5)'
  },
  {
    id: 'c-3',
    name: 'Dr. Ramesh Sharma',
    role: 'Apollo Hospital Cardiologist',
    location: 'Chennai, India (IST)',
    avatar:
      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150',
    online: false,
    timezoneOffset: 'IST (UTC+5.5)'
  }
];
