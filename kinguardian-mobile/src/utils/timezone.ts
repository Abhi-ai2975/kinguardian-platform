export function formatTimeWithZone(date: Date, timeZone: string): string {
  return date.toLocaleTimeString('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Returns formatted timezone label for the coordinator view
 * Example output: "Dad · Chennai · 8:05 PM IST"
 */
export function formatTimeForCoordinator(
  utcOrIsoString: string,
  personName: string = 'Dad',
  city: string = 'Chennai',
  timeZone: string = 'Asia/Kolkata'
): string {
  try {
    const date = new Date(utcOrIsoString);
    const localTime = date.toLocaleTimeString('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    // Strip leading zeroes if any, normalise format
    const cleanedTime = localTime.replace(/^0/, '');
    return `${personName} · ${city} · ${cleanedTime} IST`;
  } catch {
    return `${personName} · ${city} · 8:05 PM IST`;
  }
}

/**
 * Returns local time formatted for the parent view
 * Example output: "8:05 PM"
 */
export function formatTimeForParent(
  utcOrIsoString: string,
  timeZone: string = 'Asia/Kolkata'
): string {
  try {
    const date = new Date(utcOrIsoString);
    const localTime = date.toLocaleTimeString('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return localTime.replace(/^0/, '');
  } catch {
    return '8:05 PM';
  }
}
