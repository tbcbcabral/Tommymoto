import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export default function AddMaintenanceScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text>Maintenance log form coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
});
