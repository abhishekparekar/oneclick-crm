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

      // If notification payload is present, Android OS already displays it automatically in the system tray.
      // Calling displayNotification again creates a duplicate (2x) notification!
      if (notification) {
        console.log('[FCM Background] System notification payload present, skipping duplicate local notification');
        return;
      }

      // ONLY display a local notification if explicit title or body is supplied in the data payload.
      // NEVER fallback to a default title ('One Click HRMS') when both title and body are empty!
      // This completely prevents empty/silent notifications from displaying when notifications are cleared or synced.
      const explicitTitle = (data?.title && String(data.title).trim()) || '';
      const explicitBody = (data?.body && String(data.body).trim()) || '';

      if (!explicitTitle && !explicitBody) {
        console.log('[FCM Background] Silent data message without title/body, skipping notification display');
        return;
      }

      await notifee.createChannel({
        id: 'oneclick_alerts_v8',
        name: 'HRMS Notifications & Alerts',
        importance: AndroidImportance.HIGH,
        sound: 'mixkit_bell_notification_933',
        vibration: true,
        vibrationPattern: [300, 500],
        lights: true,
        badge: true,
      });

      // Use deterministic notification ID based on notificationId or content so duplicates update existing card
      const notifId = (data?.notificationId && String(data.notificationId).trim())
        ? String(data.notificationId).trim()
        : `hrms_${explicitTitle}_${explicitBody}`.replace(/\s+/g, '_').slice(0, 60);

      await notifee.displayNotification({
        id: notifId,
        title: explicitTitle,
        body: explicitBody,
        data: data || {},
        android: {
          channelId: 'oneclick_alerts_v8',
          importance: AndroidImportance.HIGH,
          sound: 'mixkit_bell_notification_933',
          smallIcon: 'ic_notification',
          color: '#1268D9',
          vibrationPattern: [300, 500],
          pressAction: {
            id: 'default',
          },
        },
      });
    } catch (err) {
      console.warn('[FCM Background] Error displaying notification:', err?.message);
    }
  });
} catch (e) {
  console.log('Messaging background handler error:', e);
}

try {
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    // When a user dismisses a notification from the shade, acknowledge it cleanly without re-triggering display
    if (type === 0 /* EventType.DISMISSED */) {
      console.log('[Notifee Background Event] Notification dismissed by user:', detail?.notification?.id);
      return;
    }
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
