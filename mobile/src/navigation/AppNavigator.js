import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";
import AuthNavigator from "./AuthNavigator";
import { getNavigatorForRole } from "../utils/roleNavigation";
import ChangePasswordScreen from "../screens/auth/ChangePasswordScreen";
import NotificationService from "../services/NotificationService";
import RoleErrorBoundary from "../components/RoleErrorBoundary";

export const navigationRef = createNavigationContainerRef();

const AppNavigator = () => {
  const { isLoading, isAuthenticated, user, logout, refreshUserProfile } = useAuth();
  
  useEffect(() => {
    if (isAuthenticated) {
      let unsubscribeOnMessage = () => {};
      let unsubscribeRefresh = () => {};

      try {
        NotificationService.requestPermissions()
          .then(() => NotificationService.getFCMToken())
          .catch(() => {});
        unsubscribeOnMessage = NotificationService.onMessage() || (() => {});
        unsubscribeRefresh = NotificationService.listenForTokenRefresh() || (() => {});
        NotificationService.setupInteractions(navigationRef);
      } catch (e) {
        console.warn("[AppNavigator] Notification setup notice:", e?.message);
      }
      
      // Auto-refresh profile & permissions whenever app comes to foreground
      let lastSync = Date.now();
      const appStateSub = AppState.addEventListener("change", (nextState) => {
        if (nextState === "active" && Date.now() - lastSync > 3000) {
          lastSync = Date.now();
          if (refreshUserProfile) refreshUserProfile().catch(() => {});
        }
      });

      return () => {
        try { if (unsubscribeOnMessage) unsubscribeOnMessage(); } catch (_) {}
        try { if (unsubscribeRefresh) unsubscribeRefresh(); } catch (_) {}
        try { if (appStateSub && appStateSub.remove) appStateSub.remove(); } catch (_) {}
      };
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <Loader />;
  }

  const renderMainNavigator = () => {
    if (user?.isPasswordResetRequired) {
      return <ChangePasswordScreen />;
    }
    const Navigator = getNavigatorForRole(user?.role);
    if (!Navigator) return <AuthNavigator />;
    return (
      <RoleErrorBoundary role={user?.role} onLogout={logout}>
        <Navigator />
      </RoleErrorBoundary>
    );
  };

  return (
    <NavigationContainer ref={navigationRef}>
      {isAuthenticated ? renderMainNavigator() : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;
