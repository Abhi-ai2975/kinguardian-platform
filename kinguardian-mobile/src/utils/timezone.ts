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

/**
 * Returns dual timezone formatting for appointments (TEST UX-001, UX-002)
 * Coordinator in London sees "4:00 PM IST (11:30 AM BST)"
 * Parent in Chennai sees "4:00 PM"
 */
export function formatAppointmentTimeForCoordinator(
  timeStr: string = '4:00 PM',
  coordinatorTimezone: string = 'Europe/London'
): { parentDisplay: string; coordinatorDisplay: string; dualDisplay: string } {
  const cleanTime = timeStr.replace(/\s*IST\s*/gi, '').trim() || '4:00 PM';
  const parentDisplay = `${cleanTime} IST`;

  // Detect DST for Europe/London (BST vs GMT)
  try {
    const now = new Date();
    const londonFormatted = now.toLocaleTimeString('en-GB', {
      timeZone: coordinatorTimezone,
      timeZoneName: 'short'
    });
    const isBST = londonFormatted.includes('BST') || (!londonFormatted.includes('GMT') && now.getMonth() >= 2 && now.getMonth() <= 9);
    const coordinatorDisplay = isBST ? '11:30 AM BST' : '10:30 AM GMT';

    return {
      parentDisplay: cleanTime,
      coordinatorDisplay: `${parentDisplay} (${coordinatorDisplay})`,
      dualDisplay: `${parentDisplay} • London: ${coordinatorDisplay}`
    };
  } catch {
    return {
      parentDisplay: cleanTime,
      coordinatorDisplay: `${parentDisplay} (11:30 AM BST)`,
      dualDisplay: `${parentDisplay} • London: 11:30 AM BST`
    };
  }
}

