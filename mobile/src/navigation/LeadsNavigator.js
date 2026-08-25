import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LeadsDashboardScreen from "../screens/leads/LeadsDashboardScreen";
import LeadsListScreen from "../screens/leads/LeadsListScreen";
import LeadDetailsScreen from "../screens/leads/LeadDetailsScreen";
import LeadRemindersScreen from "../screens/leads/LeadRemindersScreen";
import LeadCampaignsScreen from "../screens/leads/LeadCampaignsScreen";
import LeadSettingsScreen from "../screens/leads/LeadSettingsScreen";
import MapLeadFinderScreen from "../screens/leads/MapLeadFinderScreen";

const Stack = createNativeStackNavigator();

export default function LeadsNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="LeadsDashboard"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="LeadsDashboard" component={LeadsDashboardScreen} />
      <Stack.Screen name="LeadsList" component={LeadsListScreen} />
      <Stack.Screen name="MapLeadFinder" component={MapLeadFinderScreen} />
      <Stack.Screen name="LeadDetails" component={LeadDetailsScreen} />
      <Stack.Screen name="LeadReminders" component={LeadRemindersScreen} />
      <Stack.Screen name="LeadCampaigns" component={LeadCampaignsScreen} />
      <Stack.Screen name="LeadSettings" component={LeadSettingsScreen} />
    </Stack.Navigator>
  );
}
