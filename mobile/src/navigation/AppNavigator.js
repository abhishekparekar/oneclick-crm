import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";
import AuthNavigator from "./AuthNavigator";
import { getNavigatorForRole } from "../utils/roleNavigation";
import ChangePasswordScreen from "../screens/auth/ChangePasswordScreen";
import NotificationService from "../services/NotificationService";

export const navigationRef = createNavigationContainerRef();

const AppNavigator = () => {
  const { isLoading, isAuthenticated, user } = useAuth();
  
  useEffect(() => {
    if (isAuthenticated) {
      const unsubscribeOnMessage = NotificationService.onMessage();
      NotificationService.setupInteractions(navigationRef);
      
      return () => {
        unsubscribeOnMessage();
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
