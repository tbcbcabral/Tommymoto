import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, Platform, View, Text } from 'react-native';
import { ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import { PowerSyncContext, useStatus } from '@powersync/react';
import { powerSync, setupPowerSync } from '../lib/powersync/setup';

SplashScreen.preventAutoHideAsync();

let globalLogs: string[] = [];
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args) => {
  globalLogs = [...globalLogs, "LOG: " + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" ")].slice(-10);
  originalLog.apply(console, args);
};
console.warn = (...args) => {
  globalLogs = [...globalLogs, "WARN: " + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" ")].slice(-10);
  originalWarn.apply(console, args);
};
console.error = (...args) => {
  globalLogs = [...globalLogs, "ERR: " + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" ")].slice(-10);
  originalError.apply(console, args);
};

function DebugOverlay() {
  const status = useStatus();
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
    const interval = setInterval(() => setLogs([...globalLogs]), 500);
    return () => clearInterval(interval);
  }, []);

  if (Platform.OS !== 'web') return null;
  return (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, zIndex: 9999 }}>
      <Text style={{ color: 'white', fontSize: 10 }}>PowerSync Status: {status.connected ? 'Connected' : 'Disconnected'}</Text>
      <Text style={{ color: 'white', fontSize: 10 }}>Syncing: {status.dataFlowStatus.downloading ? 'Downloading' : 'Idle'} | {status.dataFlowStatus.uploading ? 'Uploading' : 'Idle'}</Text>
      {status.dataFlowStatus.error && <Text style={{ color: 'red', fontSize: 10 }}>Error: {String(status.dataFlowStatus.error)}</Text>}
      <Text style={{ color: 'white', fontSize: 10 }}>Has Synced: {status.hasSynced ? 'Yes' : 'No'}</Text>
      <View style={{ marginTop: 5, borderTopWidth: 1, borderColor: '#333', paddingTop: 5, maxHeight: 150 }}>
        {logs.map((l, i) => (
          <Text key={i} style={{ color: l.startsWith('ERR') ? 'red' : l.startsWith('WARN') ? 'yellow' : 'white', fontSize: 9 }}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { session, setSession, isInitialized, setInitialized } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    registerForPushNotificationsAsync();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setupPowerSync().then(() => {
        setInitialized(true);
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === 'login';

    if (!session && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/login');
    } else if (session && inAuthGroup) {
      // Redirect away from login if authenticated
      router.replace('/');
    }

    SplashScreen.hideAsync();
  }, [session, isInitialized, segments]);

  if (!isInitialized) {
    return null; // Wait for Supabase to restore the session
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
          <DebugOverlay />
        </PowerSyncContext.Provider>
      </PaperProvider>
    </ThemeProvider>
  );
}
