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

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('main', () => App);
AppRegistry.registerComponent('OneClick', () => App);
