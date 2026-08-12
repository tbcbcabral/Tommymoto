import { Tabs } from 'expo-router';
import { LayoutDashboard, Car, Wrench, ClipboardList } from 'lucide-react-native';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.text,
        headerShown: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: 'Garage',
          tabBarIcon: ({ color }) => <Car size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="accessories"
        options={{
          title: 'Accessories',
          tabBarIcon: ({ color }) => <Wrench size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Logs',
          tabBarIcon: ({ color }) => <ClipboardList size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
