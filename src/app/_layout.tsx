import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <PaperProvider theme={colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="add-vehicle" options={{ presentation: 'modal', title: 'Add Vehicle' }} />
          <Stack.Screen name="add-refuel" options={{ presentation: 'modal', title: 'Log Refuel' }} />
          <Stack.Screen name="add-maintenance" options={{ presentation: 'modal', title: 'Log Maintenance' }} />
          <Stack.Screen name="add-accessory" options={{ presentation: 'modal', title: 'Add Accessory' }} />
          <Stack.Screen name="archived" options={{ presentation: 'modal', title: 'Archived Vehicles' }} />
        </Stack>
      </PaperProvider>
    </ThemeProvider>
  );
}
