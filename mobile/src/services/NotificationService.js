import { 
  getMessaging, 
  getToken, 
  onTokenRefresh, 
  onMessage, 
  onNotificationOpenedApp, 
  getInitialNotification, 
  requestPermission, 
  AuthorizationStatus 
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform, PermissionsAndroid } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { getApiBaseUrl } from '../api/api';

class NotificationService {
  /**
   * Play the custom notification bell chime in the foreground
   */
  static async playBellChime() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../notification/mixkit-bell-notification-933.wav')
      );
      await sound.playAsync();
    } catch (_) {}
  }

  /**
   * Request permissions and initialize Notifee channels for Android
   */
  static async requestPermissions() {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await requestPermission(getMessaging());
        const enabled =
          authStatus === AuthorizationStatus.AUTHORIZED ||
          authStatus === AuthorizationStatus.PROVISIONAL;
        if (!enabled) {
          console.log('FCM permission denied on iOS');
          return false;
        }
      } else if (Platform.OS === 'android') {
        // 1. Android 13+ POST_NOTIFICATIONS runtime permission
        if (Platform.Version >= 33) {
          try {
            const hasPostNotif = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
            if (!hasPostNotif) {
              await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS, {
                title: "Notification Permission",
                message: "One Click needs notification permission to alert you about tasks, attendance, and duty updates.",
                buttonPositive: "Allow",
              });
            }
          } catch (e) {
            console.warn("[NotificationService] POST_NOTIFICATIONS request notice:", e?.message);
          }
        }

        try {
          await notifee.requestPermission();
        } catch (_) {}

        // Create high importance notification channel with custom mixkit bell sound
        try {
          try {
            await notifee.deleteChannel('oneclick_alerts_v7');
            await notifee.deleteChannel('oneclick_alerts_default');
            await notifee.deleteChannel('oneclick_alerts_v6');
            await notifee.deleteChannel('oneclick_alerts_v5');
            await notifee.deleteChannel('oneclick_alerts_v4');
            await notifee.deleteChannel('notice11-sound');
          } catch (_) {}

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
        } catch (chanErr) {
          console.warn("[NotificationService] Channel creation notice:", chanErr?.message);
        }
      }
      return true;
    } catch (err) {
      console.warn("[NotificationService] requestPermissions notice (handled):", err?.message);
      return false;
    }
  }

  /**
   * Get or generate a persistent installation device ID
   */
  static async getInstallationDeviceId() {
    try {
      let devId = await AsyncStorage.getItem("hrms_device_id");
      if (!devId) {
        devId = `dev_${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        await AsyncStorage.setItem("hrms_device_id", devId);
      }
      return devId;
    } catch (_) {
      return `dev_${Platform.OS}_fallback`;
    }
  }

  /**
   * Get the FCM token and optionally send it to the backend
   */
  static async getFCMToken(userToken) {
    try {
      const fcmToken = await getToken(getMessaging());
      if (fcmToken) {
        console.log('[NotificationService] FCM Token obtained:', fcmToken.slice(0, 20) + '...');
        // If user is authenticated or stored token exists, send to backend
        await this.sendTokenToBackend(fcmToken, userToken);
        return fcmToken;
      }
    } catch (error) {
      console.error('[NotificationService] Error getting FCM token:', error?.message || error);
    }
    return null;
  }

  /**
   * Listen for FCM token refresh and update backend
   */
  static listenForTokenRefresh(userToken) {
    return onTokenRefresh(getMessaging(), async (fcmToken) => {
      console.log('[NotificationService] FCM Token Refreshed:', fcmToken ? fcmToken.slice(0, 20) + '...' : 'none');
      await this.sendTokenToBackend(fcmToken, userToken);
    });
  }

  static async sendTokenToBackend(fcmToken, userToken, retries = 3) {
    if (!fcmToken) {
      return;
    }
    let authHeaderToken = userToken;
    if (!authHeaderToken) {
      try {
        authHeaderToken = await AsyncStorage.getItem("hrms_token");
      } catch (_) {}
    }
    if (!authHeaderToken) {
      console.log('[NotificationService] No auth token available, skipping device registration for now');
      return;
    }

    const deviceId = await this.getInstallationDeviceId();

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await api.post(
          '/notifications/register-device',
          { fcmToken, platform: Platform.OS, deviceId },
          { headers: { Authorization: `Bearer ${authHeaderToken}` } }
        );
        console.log('✓ FCM Token registered successfully on backend (deviceId: ' + deviceId + ')');
        break;
      } catch (error) {
        if (error?.response?.status === 401) {
          // Expected when user logs out or session is expired
          console.log('[NotificationService] Device registration skipped: user is not authenticated');
          break;
        }
        console.warn(`[NotificationService] Device registration attempt ${attempt}/${retries} notice:`, error?.response?.data || error.message);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }
  }

  static _recentDisplayIds = new Set();

  /**
   * Display a local notification using Notifee (typically used when app is in foreground)
   */
  static async displayNotification(remoteMessage) {
    const { notification, data } = remoteMessage || {};
    
    if (notification || data?.title || data?.body) {
      const title = notification?.title || data?.title || 'One Click HRMS';
      const body = notification?.body || data?.body || '';

      const notifId = (data?.notificationId && String(data.notificationId).trim()) 
        ? String(data.notificationId).trim() 
        : `hrms_${title.trim()}_${body.trim()}`;

      if (this._recentDisplayIds.has(notifId)) {
        console.log('[NotificationService] Skipping duplicate display for:', notifId);
        return;
      }
      this._recentDisplayIds.add(notifId);
      setTimeout(() => this._recentDisplayIds.delete(notifId), 6000);

      await notifee.displayNotification({
        id: notifId,
        title,
        body,
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
        ios: {
          sound: 'mixkit_bell_notification_933.wav',
        },
      });
    }
  }

  /**
   * Listen for foreground messages
   */
  static onMessage() {
    return onMessage(getMessaging(), async remoteMessage => {
      console.log('A new FCM message arrived in foreground!', JSON.stringify(remoteMessage));
      await this.displayNotification(remoteMessage);
    });
  }

  /**
   * Setup interaction handlers (when user taps on notification)
   */
  static setupInteractions(navigationRef) {
    // When notification is tapped while app is in foreground
    try {
      notifee.onForegroundEvent(({ type, detail }) => {
        if (type === EventType.PRESS) {
          this.handleNotificationTap(detail.notification, navigationRef);
        }
      });
    } catch (_) {}

    // Also handle FCM background message interaction (in case Notifee doesn't catch it)
    try {
      onNotificationOpenedApp(getMessaging(), remoteMessage => {
        console.log('Notification caused app to open from background state:', remoteMessage);
        this.handleNotificationTap({ data: remoteMessage?.data }, navigationRef);
      });
    } catch (_) {}

    // Check if app was opened from a quit state by a notification
    try {
      getInitialNotification(getMessaging())
        .then(remoteMessage => {
          if (remoteMessage) {
            console.log('Notification caused app to open from quit state:', remoteMessage);
            // Small delay to ensure navigation is ready
            setTimeout(() => {
              this.handleNotificationTap({ data: remoteMessage?.data }, navigationRef);
            }, 1000);
          }
        })
        .catch(err => {
          console.log('[NotificationService] getInitialNotification error (handled):', err?.message);
        });
    } catch (_) {}
  }

  /**
   * Handle the logic to navigate based on notification data payload
   */
  static async handleNotificationTap(notification, navigationRef) {
    if (!notification) return;
    
    const nav = navigationRef?.current;
    if (!nav) return;

    let data = notification.data || {};
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) {}
    }

    const type = (data.type || notification.type || '').toLowerCase();
    const taskId = data.taskId || data.id || notification.taskId;
    const leaveId = data.leaveId || data.id || notification.leaveId;
    const projectId = data.projectId || data.id || notification.projectId;
    const payrollId = data.payrollId || data.payslipId || data.id || notification.payrollId;
    const announcementId = data.announcementId || data.id || notification.announcementId;
    const leadId = data.leadId || data.id || notification.leadId;

    try {
      const userStr = await AsyncStorage.getItem("hrms_user");
      let role = "employee"; // default
      if (userStr) {
        const user = JSON.parse(userStr);
        role = user.role?.toLowerCase() || "employee";
      }

      if (type.includes('task') || taskId) {
        if (role === 'employee' || role === 'staff') {
          if (taskId) nav.navigate('EmployeeTaskDetails', { taskId });
          else nav.navigate('Tasks');
        } else if (role === 'manager') {
          if (taskId) nav.navigate('ManagerTaskDetails', { taskId });
          else nav.navigate('ManagerTeamTasks');
        } else if (role === 'hr') {
          if (taskId) nav.navigate('HRTaskDetails', { taskId });
          else nav.navigate('HRTaskBoard');
        } else {
          if (taskId) nav.navigate('CompanyTaskDetails', { taskId });
          else nav.navigate('TaskBoard');
        }
      } else if (type.includes('lead') || leadId) {
        if (role === 'employee' || role === 'staff') {
          if (leadId) nav.navigate('EmployeeLeads', { leadId });
          else nav.navigate('EmployeeLeads');
        } else if (role === 'manager') {
          if (leadId) nav.navigate('LeadDetails', { leadId });
          else nav.navigate('LeadsEngine', { screen: 'LeadsDashboard' });
        } else if (role === 'hr') {
          if (leadId) nav.navigate('HRLeadDetails', { leadId });
          else nav.navigate('HRLeads');
        } else {
          if (leadId) nav.navigate('LeadDetails', { leadId });
          else nav.navigate('LeadsEngine', { screen: 'LeadsDashboard' });
        }
      } else if (type.includes('leave') || leaveId) {
        if (role === 'employee' || role === 'staff') {
          if (leaveId) nav.navigate('EmployeeLeaveDetails', { leaveId });
          else nav.navigate('Leave');
        } else if (role === 'manager') {
          if (leaveId) nav.navigate('ManagerTeamLeaveDetails', { leaveId });
          else nav.navigate('ManagerTeamLeaves');
        } else if (role === 'hr') {
          nav.navigate('HRLeaveRequests');
        } else {
          nav.navigate('LeaveRequests');
        }
      } else if (type.includes('project') || projectId) {
        if (role === 'employee' || role === 'staff') {
          if (projectId) nav.navigate('EmployeeProjectDetails', { projectId });
          else nav.navigate('Projects');
        } else if (role === 'manager') {
          if (projectId) nav.navigate('ManagerProjectDetails', { projectId });
          else nav.navigate('ManagerProjects');
        } else if (role === 'hr') {
          if (projectId) nav.navigate('HRProjectDetails', { projectId });
          else nav.navigate('HRProjectList');
        } else {
          if (projectId) nav.navigate('CompanyProjectDetails', { projectId });
          else nav.navigate('ProjectList');
        }
      } else if (type.includes('payroll') || type.includes('payslip') || payrollId) {
        if (role === 'employee' || role === 'staff') {
          if (payrollId) nav.navigate('EmployeePayslipDetails', { payslipId: payrollId });
          else nav.navigate('Payslips');
        } else if (role === 'hr') {
          nav.navigate('HRPayrollList');
        } else {
          nav.navigate('PayrollList');
        }
      } else if (type.includes('attendance') || type.includes('punch')) {
        if (role === 'employee' || role === 'staff') {
          nav.navigate('MainTabs', { screen: 'Attendance' });
        } else if (role === 'manager') {
          nav.navigate('ManagerTeamAttendance');
        } else if (role === 'hr') {
          nav.navigate('HRManageAttendance');
        } else {
          nav.navigate('CompanyAttendance');
        }
      } else if (type.includes('announcement') || announcementId) {
        if (role === 'employee' || role === 'staff') {
          if (announcementId) nav.navigate('EmployeeAnnouncementDetails', { announcementId });
          else nav.navigate('Announcements');
        } else if (role === 'manager') {
          if (announcementId) nav.navigate('ManagerAnnouncementDetailsScreen', { announcementId });
          else nav.navigate('ManagerAnnouncements');
        } else if (role === 'hr') {
          nav.navigate('HRAnnouncements');
        } else {
          nav.navigate('CompanyAnnouncements');
        }
      } else {
        nav.navigate('Notifications');
      }
    } catch (e) {
      console.log('Error routing notification tap:', e);
    }
  }
}

export default NotificationService;
