import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";
import AuthNavigator from "./AuthNavigator";
import { getNavigatorForRole } from "../utils/roleNavigation";
import ChangePasswordScreen from "../screens/auth/ChangePasswordScreen";
import NotificationService from "../services/NotificationService";

export const navigationRef = createNavigationContainerRef();

const AppNavigator = () => {
  const { isLoading, isAuthenticated, user, refreshUserProfile } = useAuth();
  
  useEffect(() => {
    if (isAuthenticated) {
      const unsubscribeOnMessage = NotificationService.onMessage();
      NotificationService.setupInteractions(navigationRef);
      
      // Auto-refresh profile & permissions whenever app comes to foreground
      let lastSync = Date.now();
      const appStateSub = AppState.addEventListener("change", (nextState) => {
        if (nextState === "active" && Date.now() - lastSync > 3000) {
          lastSync = Date.now();
          if (refreshUserProfile) refreshUserProfile().catch(() => {});
        }
      });

      return () => {
        unsubscribeOnMessage();
        appStateSub.remove();
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
    return Navigator ? <Navigator /> : <AuthNavigator />;
  };


  return (
    <NavigationContainer ref={navigationRef}>
      {isAuthenticated ? renderMainNavigator() : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;
