import { Tabs } from 'expo-router';
import { LayoutDashboard, Car, Wrench, ClipboardList, Bell, LogOut } from 'lucide-react-native';
import { useColorScheme, Pressable } from 'react-native';
import { Colors } from '@/constants/theme';
import { supabase } from '../../lib/supabase';

export default function TabLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.text,
        headerShown: true,
        headerRight: () => (
          <Pressable 
            onPress={async () => await supabase.auth.signOut()}
            style={{ marginRight: 15, opacity: 0.8 }}
          >
            <LogOut size={24} color={colors.text} />
          </Pressable>
        ),
      }}>
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
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => <LayoutDashboard size={32} color={focused ? '#0ea5e9' : '#64748b'} />,
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Logs',
          tabBarIcon: ({ color }) => <ClipboardList size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: 'Reminders',
          tabBarIcon: ({ color }) => <Bell size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
