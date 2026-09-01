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
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { getApiBaseUrl } from '../api/api';

class NotificationService {
  /**
   * Request permissions and initialize Notifee channels for Android
   */
  static async requestPermissions() {
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
      await notifee.requestPermission();
      // Create high importance notification channel with custom chime sound
      await notifee.createChannel({
        id: 'notice11-sound',
        name: 'HRMS Notifications & Alerts',
        importance: AndroidImportance.HIGH,
        sound: 'notice11',
        vibration: true,
        vibrationPattern: [300, 500],
        lights: true,
        badge: true,
      });

      await notifee.createChannel({
        id: 'hrms_alerts_v2',
        name: 'High Priority Alerts',
        importance: AndroidImportance.HIGH,
        sound: 'notice11',
        vibration: true,
        vibrationPattern: [300, 500],
        lights: true,
        badge: true,
      });
    }
    return true;
  }

  /**
   * Get the FCM token and optionally send it to the backend
   */
  static async getFCMToken(userToken) {
    try {
      const fcmToken = await getToken(getMessaging());
      if (fcmToken) {
        console.log('FCM Token:', fcmToken);
        // If user is authenticated, send to backend
        if (userToken) {
          await this.sendTokenToBackend(fcmToken, userToken);
        }
        return fcmToken;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
    }
    return null;
  }

  /**
   * Listen for FCM token refresh and update backend
   */
  static listenForTokenRefresh(userToken) {
    return onTokenRefresh(getMessaging(), async (fcmToken) => {
      console.log('FCM Token Refreshed:', fcmToken);
      if (userToken) {
        await this.sendTokenToBackend(fcmToken, userToken);
      }
    });
  }

  static async sendTokenToBackend(fcmToken, userToken) {
    if (!fcmToken || !userToken) {
      return;
    }
    try {
      await api.post(
        '/notifications/register-device',
        { fcmToken, platform: Platform.OS },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      console.log('✓ FCM Token registered successfully on backend');
    } catch (error) {
      if (error?.response?.status === 401) {
        // Expected when user logs out or session is expired
        console.log('[NotificationService] Device registration skipped: user is not logged in');
      } else {
        console.error('Error sending FCM token to backend:', error?.response?.data || error.message);
      }
    }
  }

  /**
   * Display a local notification using Notifee (typically used when app is in foreground)
   */
  static async displayNotification(remoteMessage) {
    const { notification, data } = remoteMessage || {};
    
    if (notification || data?.title) {
      const title = notification?.title || data?.title || 'New HRMS Notification';
      const body = notification?.body || data?.body || '';

      await notifee.displayNotification({
        title,
        body,
        data: data || {},
        android: {
          channelId: 'notice11-sound',
          importance: AndroidImportance.HIGH,
          sound: 'notice11', // Distinctive HRMS sound chime
          vibrationPattern: [300, 500],
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'notice11.wav',
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
    // When notification is tapped while app is in background
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        this.handleNotificationTap(detail.notification, navigationRef);
      }
    });

    // When notification is tapped while app is in foreground
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        this.handleNotificationTap(detail.notification, navigationRef);
      }
    });

    // Also handle FCM background message interaction (in case Notifee doesn't catch it)
    onNotificationOpenedApp(getMessaging(), remoteMessage => {
      console.log('Notification caused app to open from background state:', remoteMessage);
      this.handleNotificationTap({ data: remoteMessage.data }, navigationRef);
    });

    // Check if app was opened from a quit state by a notification
    getInitialNotification(getMessaging())
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('Notification caused app to open from quit state:', remoteMessage);
          // Small delay to ensure navigation is ready
          setTimeout(() => {
            this.handleNotificationTap({ data: remoteMessage.data }, navigationRef);
          }, 1000);
        }
      });
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
