import { en, TranslationType } from './en';

type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

// Stub dictionaries for the requested Indian languages to show architecture preparedness
const ta: RecursivePartial<TranslationType> = {
  parentHome: {
    greeting: 'காலை வணக்கம், அப்பா ❤️',
    howAreYouFeeling: 'இன்று நீங்கள் எப்படி உணருகிறீர்கள்?',
    feelingGood: 'நன்று',
    feelingOkay: 'பரவாயில்லை',
    feelingNotWell: 'உடல்நிலை சரியில்லை',
    medicinesLabel: 'இன்றைய மருந்துகள்',
    appointmentLabel: 'அடுத்த சந்திப்பு'
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
