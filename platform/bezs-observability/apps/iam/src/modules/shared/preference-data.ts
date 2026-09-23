export const countryOptions = [
  { label: "United States", value: "US" },
  { label: "United Kingdom", value: "GB" },
  { label: "India", value: "IN" },
  { label: "Canada", value: "CA" },
  { label: "Germany", value: "DE" },
  { label: "France", value: "FR" },
  { label: "Australia", value: "AU" },
  { label: "Japan", value: "JP" },
  { label: "Brazil", value: "BR" },
  { label: "China", value: "CN" },
  { label: "United Arab Emirates", value: "AE" },
  { label: "Russia", value: "RU" },
  { label: "South Africa", value: "ZA" },
];

export const timezoneOptions = [
  { label: "UTC", value: "UTC" },
  { label: "America/New_York (EST/EDT)", value: "America/New_York" },
  { label: "America/Los_Angeles (PST/PDT)", value: "America/Los_Angeles" },
  { label: "America/Toronto (EST/EDT)", value: "America/Toronto" },
  { label: "America/Sao_Paulo (BRT)", value: "America/Sao_Paulo" },
  { label: "Europe/London (GMT/BST)", value: "Europe/London" },
  { label: "Europe/Berlin (CET/CEST)", value: "Europe/Berlin" },
  { label: "Europe/Paris (CET/CEST)", value: "Europe/Paris" },
  { label: "Europe/Moscow (MSK)", value: "Europe/Moscow" },
  { label: "Africa/Johannesburg (SAST)", value: "Africa/Johannesburg" },
  { label: "Asia/Dubai (GST)", value: "Asia/Dubai" },
  { label: "Asia/Kolkata (IST)", value: "Asia/Kolkata" },
  { label: "Asia/Shanghai (CST)", value: "Asia/Shanghai" },
  { label: "Asia/Tokyo (JST)", value: "Asia/Tokyo" },
  { label: "Australia/Sydney (AEST/AEDT)", value: "Australia/Sydney" },
];

export const dateFormatOptions = [
  { label: "DD/MM/YYYY (31/12/2025)", value: "DD/MM/YYYY" },
  { label: "MM/DD/YYYY (12/31/2025)", value: "MM/DD/YYYY" },
  { label: "YYYY-MM-DD (2025-12-31)", value: "YYYY-MM-DD" },
  { label: "YYYY/MM/DD (2025/12/31)", value: "YYYY/MM/DD" },
  { label: "DD.MM.YYYY (31.12.2025)", value: "DD.MM.YYYY" },
  { label: "D MMM, YYYY (31 Dec, 2025)", value: "D MMM, YYYY" },
  { label: "D MMMM, YYYY (31 December, 2025)", value: "D MMMM, YYYY" },
  { label: "MMM D, YYYY (Dec 31, 2025)", value: "MMM D, YYYY" },
  { label: "MMMM D, YYYY (December 31, 2025)", value: "MMMM D, YYYY" },
];

export const timeFormatOptions = [
  { label: "12-hour — 7:05 AM", value: "h:mm A" },
  { label: "12-hour — 07:05 AM", value: "hh:mm A" },
  { label: "24-hour — 07:05", value: "HH:mm" },
];

export const currencyOptions = [
  { label: "US Dollar (USD)", value: "USD" },
  { label: "Indian Rupee (INR)", value: "INR" },
  { label: "Euro (EUR)", value: "EUR" },
  { label: "British Pound (GBP)", value: "GBP" },
  { label: "Canadian Dollar (CAD)", value: "CAD" },
  { label: "Australian Dollar (AUD)", value: "AUD" },
  { label: "Japanese Yen (JPY)", value: "JPY" },
  { label: "Chinese Yuan (CNY)", value: "CNY" },
  { label: "Brazilian Real (BRL)", value: "BRL" },
  { label: "UAE Dirham (AED)", value: "AED" },
  { label: "Russian Ruble (RUB)", value: "RUB" },
  { label: "South African Rand (ZAR)", value: "ZAR" },
];

export const numberFormatOptions = [
  { label: "1,234.56 (US/UK)", value: "1,234.56" },
  { label: "1.234,56 (Europe)", value: "1.234,56" },
  { label: "1 234,56 (France/Russia)", value: "1 234,56" },
  { label: "1,23,456.78 (India)", value: "1,23,456.78" },
];

export const weekStartOptions = [
  { label: "Monday", value: "monday" },
  { label: "Sunday", value: "sunday" },
  { label: "Saturday", value: "saturday" },
];

export const scopeOptions = [
  { label: "Global", value: "GLOBAL" },
  { label: "Country Specific", value: "COUNTRY" },
];

/** Keyed by ISO country code — auto-fills all preference fields when country changes */
export const regionalPresets: Record<
  string,
  {
    country: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    currency: string;
    numberFormat: string;
    weekStart: string;
  }
> = {
  US: {
    country: "US",
    timezone: "America/New_York",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "h:mm A",
    currency: "USD",
    numberFormat: "1,234.56",
    weekStart: "sunday",
  },
  GB: {
    country: "GB",
    timezone: "Europe/London",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm",
    currency: "GBP",
    numberFormat: "1,234.56",
    weekStart: "monday",
  },
  IN: {
    country: "IN",
    timezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "hh:mm A",
    currency: "INR",
    numberFormat: "1,23,456.78",
    weekStart: "monday",
  },
  CA: {
    country: "CA",
    timezone: "America/Toronto",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "h:mm A",
    currency: "CAD",
    numberFormat: "1,234.56",
    weekStart: "sunday",
  },
  DE: {
    country: "DE",
    timezone: "Europe/Berlin",
    dateFormat: "DD.MM.YYYY",
    timeFormat: "HH:mm",
    currency: "EUR",
    numberFormat: "1.234,56",
    weekStart: "monday",
  },
  FR: {
    country: "FR",
    timezone: "Europe/Paris",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm",
    currency: "EUR",
    numberFormat: "1 234,56",
    weekStart: "monday",
  },
  AU: {
    country: "AU",
    timezone: "Australia/Sydney",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "h:mm A",
    currency: "AUD",
    numberFormat: "1,234.56",
    weekStart: "monday",
  },
  JP: {
    country: "JP",
    timezone: "Asia/Tokyo",
    dateFormat: "YYYY/MM/DD",
    timeFormat: "HH:mm",
    currency: "JPY",
    numberFormat: "1,234.56",
    weekStart: "sunday",
  },
  BR: {
    country: "BR",
    timezone: "America/Sao_Paulo",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm",
    currency: "BRL",
    numberFormat: "1.234,56",
    weekStart: "sunday",
  },
  AE: {
    country: "AE",
    timezone: "Asia/Dubai",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm",
    currency: "AED",
    numberFormat: "1,234.56",
    weekStart: "sunday",
  },
  CN: {
    country: "CN",
    timezone: "Asia/Shanghai",
    dateFormat: "YYYY/MM/DD",
    timeFormat: "HH:mm",
    currency: "CNY",
    numberFormat: "1,234.56",
    weekStart: "monday",
  },
  RU: {
    country: "RU",
    timezone: "Europe/Moscow",
    dateFormat: "DD.MM.YYYY",
    timeFormat: "HH:mm",
    currency: "RUB",
    numberFormat: "1 234,56",
    weekStart: "monday",
  },
  ZA: {
    country: "ZA",
    timezone: "Africa/Johannesburg",
    dateFormat: "YYYY/MM/DD",
    timeFormat: "HH:mm",
    currency: "ZAR",
    numberFormat: "1,234.56",
    weekStart: "sunday",
  },
};
