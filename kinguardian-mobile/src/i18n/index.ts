import { en, TranslationType } from './en';

type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

// Stub dictionaries for the requested Indian languages to show architecture preparedness
const ta: RecursivePartial<TranslationType> = {
  parentHome: {
    greeting: 'காலை வணக்கம், அப்பா ❤️',
    syncReassurance: 'லண்டனுடன் அனைத்தும் ஒத்திசைக்கப்பட்டுள்ளது',
    howAreYouFeeling: 'இன்று நீங்கள் எப்படி உணருகிறீர்கள்?',
    feelingGood: 'நன்று',
    feelingOkay: 'பரவாயில்லை',
    feelingNotWell: 'உடல்நிலை சரியில்லை',
    medicinesLabel: 'இன்றைய மருந்துகள்',
    appointmentLabel: 'அடுத்த சந்திப்பு',
    talkToKinGuardian: 'கின்கார்டியனுடன் பேசுங்கள்',
    sendUpdate: 'தகவல் அனுப்பவும்',
    checkInAgain: 'மீண்டும் சரிபார்க்கவும்',
    thanksDad: '“நன்றி அப்பா. அஞ்சலிக்கு தகவல் தெரிவிக்கப்பட்டது.”'
  },
  coordinatorHome: {
    greeting: 'காலை வணக்கம், அஞ்சலி',
    attentionLabel: 'இன்றைய கவனம்',
    noAttentionNeeded: '“தற்போது உங்கள் கவனம் எதுவும் தேவையில்லை.”',
    reassuranceText: '“அம்மா மற்றும் அப்பாவின் சமீபத்திய தகவல்கள் வழக்கமான முறையில் உள்ளன.”',
    connectedDevices: 'இணைக்கப்பட்ட சாதனங்கள் ஒத்திசைக்கப்பட்டன',
    lastUpdated: 'கடைசியாக புதுப்பிக்கப்பட்டது: சற்று முன்பு',
    parentsLabel: 'பெற்றோர்கள்',
    careLabel: 'இன்றைய பராமரிப்பு',
    recentUpdates: 'சமீபத்திய புதுப்பிப்புகள்'
  },
  navigation: {
    home: 'முகப்பு',
    parents: 'பெற்றோர்',
    ask: 'கேட்க',
    care: 'பராமரிப்பு',
    profile: 'சுயவிவரம்'
  },
  common: {
    view: 'பார்வை',
    edit: 'திருத்து',
    delete: 'நீக்கு',
    share: 'பகிர்',
    save: 'சேமி'
  }
};

const hi: RecursivePartial<TranslationType> = {
  parentHome: {
    greeting: 'सुप्रभात, पिताजी ❤️',
    howAreYouFeeling: 'आज आप कैसा महसूस कर रहे हैं?',
    feelingGood: 'अच्छा',
    feelingOkay: 'ठीक',
    feelingNotWell: 'तबीयत ठीक नहीं है',
    medicinesLabel: 'आज की दवाएं',
    appointmentLabel: 'अगला अपॉइंटमेंट'
  }
};

// Registered stubs placeholders for other languages
const te = {}; // Telugu
const kn = {}; // Kannada
const ml = {}; // Malayalam
const mr = {}; // Marathi
const bn = {}; // Bengali
const gu = {}; // Gujarati
const pa = {}; // Punjabi

const dictionaries: Record<string, any> = {
  en,
  ta,
  hi,
  te,
  kn,
  ml,
  mr,
  bn,
  gu,
  pa
};

let currentLanguage = 'en';

export function setLanguage(lang: string) {
  if (dictionaries[lang]) {
    currentLanguage = lang;
  }
}

export function getLanguage(): string {
  return currentLanguage;
}

/**
 * Lightweight resolver function for localized strings
 * Supports dot-notation, e.g. t('parentHome.greeting')
 */
export function t(key: string): string {
  const parts = key.split('.');

  // Resolve key path in current language dictionary
  let currentObj = dictionaries[currentLanguage];
  for (const part of parts) {
    if (currentObj && typeof currentObj === 'object') {
      currentObj = currentObj[part];
    } else {
      currentObj = undefined;
    }
  }

  // Fallback to English dictionary if not found in target language
  if (currentObj === undefined && currentLanguage !== 'en') {
    let fallbackObj = dictionaries['en'];
    for (const part of parts) {
      if (fallbackObj && typeof fallbackObj === 'object') {
        fallbackObj = fallbackObj[part];
      } else {
        fallbackObj = undefined;
      }
    }
    return typeof fallbackObj === 'string' ? fallbackObj : key;
  }

  return typeof currentObj === 'string' ? currentObj : key;
}
