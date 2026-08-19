import React from 'react';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/context/AuthContext';
import { AppDataProvider } from './src/context/AppDataContext';
import AppNavigator from './src/navigation/AppNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 30,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppDataProvider>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <AppNavigator />
          </AppDataProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
