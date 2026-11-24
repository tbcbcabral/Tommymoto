import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import { PowerSyncContext } from '@powersync/react';
import { powerSync, setupPowerSync } from '../lib/powersync/setup';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { session, setSession, isInitialized, setInitialized, isOfflineMode } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    registerForPushNotificationsAsync();

    // Initialize local database & check session in parallel
    Promise.all([
      setupPowerSync(),
      supabase.auth.getSession()
        .then(({ data }) => setSession(data?.session || null))
        .catch(() => setSession(null))
    ]).finally(() => {
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === 'login';

    if (!session && !isOfflineMode && !inAuthGroup) {
      // Redirect to login if not authenticated and not in offline mode
      router.replace('/login');
    } else if ((session || isOfflineMode) && inAuthGroup) {
      // Redirect away from login if authenticated or continuing in offline mode
      router.replace('/');
    }

    SplashScreen.hideAsync().catch(() => {});
  }, [session, isInitialized, isOfflineMode, segments]);

  if (!isInitialized) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <PaperProvider theme={colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme}>
        <PowerSyncContext.Provider value={powerSync as any}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="add-vehicle" options={{ presentation: 'modal', title: 'Add Vehicle' }} />
            <Stack.Screen name="add-refuel" options={{ presentation: 'modal', title: 'Log Refuel' }} />
            <Stack.Screen name="add-maintenance" options={{ presentation: 'modal', title: 'Log Maintenance' }} />
            <Stack.Screen name="add-accessory" options={{ presentation: 'modal', title: 'Add Accessory' }} />
            <Stack.Screen name="add-expense" options={{ presentation: 'modal', title: 'Add Expense' }} />
            <Stack.Screen name="archived" options={{ presentation: 'modal', title: 'Archived Vehicles' }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
          </Stack>
        </PowerSyncContext.Provider>
      </PaperProvider>
    </ThemeProvider>
  );
}
