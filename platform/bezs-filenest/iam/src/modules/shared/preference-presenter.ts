import moment from "moment-timezone";

export interface PreferenceFormatterInput {
  country?: string | null;
  timezone?: string | null;
  dateFormat?: string | null;
  timeFormat?: string | null;
  currency?: string | null;
  numberFormat?: string | null;
}

/** Parses a number-format sample like "1,234.56" or "1.234,56" into separators */
function parseNumberFormat(format: string): {
  group: string;
  decimal: string;
} {
  const parts = format.match(/1(.+)234(.+)56/);
  if (!parts) return { group: ",", decimal: "." };
  return { group: parts[1], decimal: parts[2] };
}

/**
 * Returns a set of formatter functions bound to the given preference values.
 * Use this on both server and client; all formatting is done in memory.
 */
export function createPreferencePresenter(prefs: PreferenceFormatterInput) {
  const timezone = prefs.timezone || "UTC";
  const dateFormat = prefs.dateFormat || "DD/MM/YYYY";
  const timeFormat = prefs.timeFormat || "HH:mm";
  const currency = prefs.currency || "USD";
  const country = prefs.country || "en";
  const numberFormat = prefs.numberFormat || "1,234.56";

  const { group: groupSep, decimal: decSep } = parseNumberFormat(numberFormat);

  function formatDate(date: Date | string): string {
    try {
      return moment.tz(date, timezone).format(dateFormat);
    } catch {
      return moment(date).utc().format(dateFormat);
    }
  }

  function formatTime(date: Date | string): string {
    try {
      return moment.tz(date, timezone).format(timeFormat);
    } catch {
      return moment(date).utc().format(timeFormat);
    }
  }

  function formatCurrency(amount: number): string {
    try {
      return new Intl.NumberFormat(country.toLowerCase(), {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  function formatNumber(value: number): string {
    const [intPart, fracPart = "00"] = value.toFixed(2).split(".");
    const withGrouping = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupSep);
    return `${withGrouping}${decSep}${fracPart}`;
  }

  return { formatDate, formatTime, formatCurrency, formatNumber };
}
