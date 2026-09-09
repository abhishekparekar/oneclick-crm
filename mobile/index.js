import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import './src/services/locationTrackingService';
import App from './App';
import { name as appName } from './app.json';

import notifee, { AndroidImportance } from '@notifee/react-native';

try {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('[FCM Background] Message received in background:', remoteMessage);
    try {
      const { notification, data } = remoteMessage || {};
      const title = notification?.title || data?.title || 'One Click HRMS';
      const body = notification?.body || data?.body || '';

      if (title || body) {
        // Ensure channel exists with custom sound
        await notifee.createChannel({
          id: 'oneclick_alerts_v4',
          name: 'HRMS Notifications & Alerts',
          importance: AndroidImportance.HIGH,
          sound: 'notice11',
          vibration: true,
          vibrationPattern: [300, 500],
          lights: true,
          badge: true,
        });

        await notifee.displayNotification({
          id: data?.notificationId || undefined,
          title,
          body,
          data: data || {},
          android: {
            channelId: 'oneclick_alerts_v4',
            importance: AndroidImportance.HIGH,
            sound: 'notice11',
            smallIcon: 'ic_launcher',
            color: '#1268D9',
            vibrationPattern: [300, 500],
            pressAction: {
              id: 'default',
            },
          },
        });
      }
    } catch (err) {
      console.warn('[FCM Background] Error displaying notification:', err?.message);
    }
  });
} catch (e) {
  console.log('Messaging background handler error:', e);
}

try {
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    console.log('[Notifee Background Event]', type);
  });
} catch (e) {
  console.log('[Notifee] onBackgroundEvent error:', e);
}

// Global error safety net to prevent app crashes from transient background exceptions
if (typeof global !== 'undefined' && global.ErrorUtils) {
  try {
    const originalHandler = global.ErrorUtils.getGlobalHandler && global.ErrorUtils.getGlobalHandler();
    global.ErrorUtils.setGlobalHandler((error, isFatal) => {
      console.warn('[GlobalSafetyNet] Handled exception (preventing crash):', error?.message || error);
      if (!isFatal && originalHandler) {
        try { originalHandler(error, isFatal); } catch (_) {}
      }
    });
  } catch (_) {}
}

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('main', () => App);
AppRegistry.registerComponent('OneClick', () => App);
