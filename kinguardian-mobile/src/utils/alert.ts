import { Alert, Platform } from 'react-native';

/**
 * Cross-platform action confirmation helper.
 * On Web (React Native Web), Alert.alert is an empty no-op.
 * This utility ensures window.confirm is invoked on Web, while
 * Alert.alert with native buttons is used on iOS / Android.
 */
export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  confirmText: string = 'Confirm',
  cancelText: string = 'Cancel'
): void {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    const confirmed = typeof window !== 'undefined' ? window.confirm(text) : true;
    if (confirmed) {
      Promise.resolve(onConfirm()).catch((err) => {
        console.error('Error executing confirmed action:', err);
      });
    }
  } else {
    Alert.alert(
      title,
      message,
      [
        {
          text: cancelText,
          style: 'cancel'
        },
        {
          text: confirmText,
          style: 'destructive',
          onPress: () => {
            Promise.resolve(onConfirm()).catch((err) => {
              console.error('Error executing confirmed action:', err);
            });
          }
        }
      ]
    );
  }
}
