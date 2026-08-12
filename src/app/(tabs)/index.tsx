import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Title, Paragraph, FAB, useTheme, Button } from 'react-native-paper';
import { useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Alert, Share } from 'react-native';

export default function DashboardScreen() {
  const theme = useTheme();
  const [fabOpen, setFabOpen] = useState(false);

  const handleBackup = async () => {
    try {
      const { data: vehicles } = await supabase.from('vehicles').select('*');
      const { data: refuels } = await supabase.from('refueling_events').select('*');
      const { data: maintenance } = await supabase.from('maintenance_events').select('*');
      
      const backupData = JSON.stringify({
        export_date: new Date().toISOString(),
        vehicles,
        refueling_events: refuels,
        maintenance_events: maintenance
      }, null, 2);

      await Share.share({
        message: backupData,
        title: 'Mototommy Backup Data'
      });
    } catch (e) {
      console.error(e);
      Alert.alert("Backup Failed", "Could not fetch data from Supabase.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title style={styles.header}>Summary (Last Year)</Title>
        
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="labelMedium">Avg L/100km</Text>
              <Text variant="headlineMedium">0.0</Text>
            </Card.Content>
          </Card>
          
          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="labelMedium">Fuel Spent</Text>
              <Text variant="headlineMedium">€0</Text>
            </Card.Content>
          </Card>
          
          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="labelMedium">Services</Text>
              <Text variant="headlineMedium">€0</Text>
            </Card.Content>
          </Card>
        </View>

        <Title style={[styles.header, { marginTop: 24 }]}>Reminders</Title>
        <Card style={styles.reminderCard}>
          <Card.Content>
            <Paragraph>No upcoming maintenance.</Paragraph>
          </Card.Content>
        </Card>

        <Button 
          mode="outlined" 
          icon="database-export" 
          style={{ marginTop: 24, marginBottom: 80 }} 
          onPress={handleBackup}
        >
          Export Cloud Data Backup
        </Button>
      </ScrollView>

      <FAB.Group
        open={fabOpen}
        visible
        icon={fabOpen ? 'close' : 'plus'}
        actions={[
          {
            icon: 'gas-station',
            label: 'Refuel',
            onPress: () => router.push('/add-refuel'),
          },
          {
            icon: 'wrench',
            label: 'Maintenance',
            onPress: () => router.push('/add-maintenance'),
          },
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCard: {
    flex: 1,
  },
  reminderCard: {
    marginBottom: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
