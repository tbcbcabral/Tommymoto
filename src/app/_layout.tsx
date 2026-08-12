import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { useEffect, useState } from 'react';
import { initDb } from '../db/sqlite';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [dbInitialized, setDbInitialized] = useState(false);
  
  useEffect(() => {
    initDb().then(() => {
      setDbInitialized(true);
      SplashScreen.hideAsync();
    }).catch(err => {
      console.error("DB Init error:", err);
      setDbInitialized(true);
      SplashScreen.hideAsync();
    });
  }, []);

  if (!dbInitialized) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <PaperProvider theme={colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="add-vehicle" options={{ presentation: 'modal', title: 'Add Vehicle' }} />
          <Stack.Screen name="add-refuel" options={{ presentation: 'modal', title: 'Log Refuel' }} />
          <Stack.Screen name="add-maintenance" options={{ presentation: 'modal', title: 'Log Maintenance' }} />
          <Stack.Screen name="add-accessory" options={{ presentation: 'modal', title: 'Add Accessory' }} />
        </Stack>
      </PaperProvider>
    </ThemeProvider>
  );
}
