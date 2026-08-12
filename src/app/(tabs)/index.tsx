import { View, StyleSheet, ScrollView, Alert, Share } from 'react-native';
import { Text, Card, Title, Paragraph, FAB, useTheme, Button, Chip } from 'react-native-paper';
import { useState, useCallback, useMemo } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getVehicles, getAllLogs, Vehicle, LogEntry } from '@/db/queries';

export default function DashboardScreen() {
  const theme = useTheme();
  const [fabOpen, setFabOpen] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const loadData = async () => {
    try {
      const vehiclesData = await getVehicles();
      setVehicles(vehiclesData);
      
      const logsData = await getAllLogs();
      setLogs(logsData);

      if (vehiclesData.length > 0 && selectedVehicleId === null) {
        const def = vehiclesData.find(v => v.is_default);
        setSelectedVehicleId((def || vehiclesData[0]).id);
      }
    } catch (e) {
      console.error("Error loading dashboard data:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedVehicleId])
  );

  const selectedVehicleName = useMemo(() => {
    const v = vehicles.find(v => v.id === selectedVehicleId);
    return v ? (v.alias || `${v.make} ${v.model}`) : 'Vehicle';
  }, [vehicles, selectedVehicleId]);

  // Filter logs for the selected vehicle
  const vehicleLogs = useMemo(() => {
    if (selectedVehicleId === null) return [];
    return logs.filter(l => l.vehicle_id === selectedVehicleId);
  }, [logs, selectedVehicleId]);

  // Statistics calculation for the last 365 days (Last Year)
  const stats = useMemo(() => {
    const lastYearDate = new Date();
    lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
    
    const refuels = vehicleLogs.filter(l => l.type === 'refuel');
    const services = vehicleLogs.filter(l => l.type === 'maintenance');
    
    // 1. Fuel Spent (Last Year)
    const fuelSpentLastYear = refuels
      .filter(l => new Date(l.date) >= lastYearDate)
      .reduce((sum, l) => sum + l.price, 0);

    // 2. Services Spent (Last Year)
    const servicesLastYear = services
      .filter(l => new Date(l.date) >= lastYearDate)
      .reduce((sum, l) => sum + l.price, 0);

    // 3. Avg L/100km (Overall/Historical for accuracy of distance)
    let avgFuelConsumption = 0;
    if (refuels.length >= 2) {
      const sortedRefuels = [...refuels].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Calculate total distance between first and last refuel
      const odometerFirst = sortedRefuels[0].odometer || 0;
      const odometerLast = sortedRefuels[sortedRefuels.length - 1].odometer || 0;
      const distance = odometerLast - odometerFirst;
      
      if (distance > 0) {
        // Total liters filled excluding the first refuel (which establishes the initial odometer baseline)
        const totalLiters = sortedRefuels.slice(1).reduce((sum, r) => sum + (r.liters || 0), 0);
        avgFuelConsumption = (totalLiters / distance) * 100;
      }
    }

    return {
      fuelSpent: fuelSpentLastYear,
      services: servicesLastYear,
      avgL100km: avgFuelConsumption
    };
  }, [vehicleLogs]);

  const handleBackup = async () => {
    try {
      const { data: vehiclesData } = await supabase.from('vehicles').select('*');
      const { data: refuels } = await supabase.from('refueling_events').select('*');
      const { data: maintenance } = await supabase.from('maintenance_events').select('*');
      const { data: acc } = await supabase.from('accessories').select('*');
      
      const backupData = JSON.stringify({
        export_date: new Date().toISOString(),
        vehicles: vehiclesData,
        refueling_events: refuels,
        maintenance_events: maintenance,
        accessories: acc
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
        {vehicles.length > 1 && (
          <View style={styles.selectorContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {vehicles.map(v => (
                <Chip 
                  key={v.id} 
                  selected={selectedVehicleId === v.id} 
                  onPress={() => setSelectedVehicleId(v.id)}
                  style={styles.chip}
                >
                  {v.alias || `${v.make} ${v.model}`}
                </Chip>
              ))}
            </ScrollView>
          </View>
        )}

        <Title style={styles.header}>Summary for {selectedVehicleName} (Last Year)</Title>
        
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="labelMedium">Avg L/100km</Text>
              <Text variant="headlineMedium">
                {stats.avgL100km > 0 ? `${stats.avgL100km.toFixed(1)}` : 'N/A'}
              </Text>
            </Card.Content>
          </Card>
          
          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="labelMedium">Fuel Spent</Text>
              <Text variant="headlineMedium">€{stats.fuelSpent.toFixed(0)}</Text>
            </Card.Content>
          </Card>
          
          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="labelMedium">Services</Text>
              <Text variant="headlineMedium">€{stats.services.toFixed(0)}</Text>
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
          {
            icon: 'shopping',
            label: 'Accessory',
            onPress: () => router.push('/add-accessory'),
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
  selectorContainer: {
    marginBottom: 16,
  },
  chipScroll: {
    flexGrow: 0,
  },
  chip: {
    marginRight: 8,
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
