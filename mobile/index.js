import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import './src/services/locationTrackingService';
import App from './App';
import { name as appName } from './app.json';

try {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Message handled in the background!', remoteMessage);
  });
} catch (e) {
  console.log('Messaging background handler error:', e);
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
