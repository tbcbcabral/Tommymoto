import { View, StyleSheet, ScrollView, Alert, Share } from 'react-native';
import { Text, Card, Title, Paragraph, FAB, useTheme, Button, Chip } from 'react-native-paper';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Updates from 'expo-updates';
import { useVehicles, useAllLogs, useReminders } from '@/hooks/useData';
import { formatNumber } from '../../lib/utils';

export default function DashboardScreen() {
  const theme = useTheme();
  const [fabOpen, setFabOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  
  const vehicles = useVehicles();
  const logs = useAllLogs();
  const allReminders = useReminders();

  useEffect(() => {
    if (vehicles.length > 0 && selectedVehicleId === null) {
      const def = vehicles.find(v => v.is_default);
      setSelectedVehicleId((def || vehicles[0]).id);
    }
  }, [vehicles, selectedVehicleId]);

  const selectedVehicleName = useMemo(() => {
    const v = vehicles.find(v => v.id === selectedVehicleId);
    return v ? (v.alias || `${v.make} ${v.model}`) : 'Vehicle';
  }, [vehicles, selectedVehicleId]);

  // Filter logs for the selected vehicle
  const vehicleLogs = useMemo(() => {
    if (selectedVehicleId === null) return [];
    return logs.filter(l => l.vehicle_id === selectedVehicleId);
  }, [logs, selectedVehicleId]);

  // Analytics Statistics
  const stats = useMemo(() => {
    let totalExpenses = 0;
    let maxOdo = 0;
    let minOdo = Infinity;

    let expenses30d = 0;
    let maxOdo30d = 0;
    let minOdo30d = Infinity;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoMs = thirtyDaysAgo.getTime();
    
    // Accumulate expenses and find min/max odometer
    vehicleLogs.forEach(log => {
      const logDate = new Date(log.date).getTime();
      const isWithin30d = logDate >= thirtyDaysAgoMs;

      if (log.type === 'refuel') {
        totalExpenses += (log.price || 0);
        if (isWithin30d) {
          expenses30d += (log.price || 0);
        }
      }

      if (log.odometer !== undefined && log.odometer !== null && log.odometer > 0) {
        if (log.odometer > maxOdo) maxOdo = log.odometer;
        if (log.odometer < minOdo) minOdo = log.odometer;

        if (isWithin30d) {
          if (log.odometer > maxOdo30d) maxOdo30d = log.odometer;
          if (log.odometer < minOdo30d) minOdo30d = log.odometer;
        }
      }
    });

    const totalDistance = minOdo !== Infinity && maxOdo > minOdo ? maxOdo - minOdo : 0;
    const costPerKm = totalDistance > 0 ? totalExpenses / totalDistance : 0;
    
    const distance30d = minOdo30d !== Infinity && maxOdo30d > minOdo30d ? maxOdo30d - minOdo30d : 0;

    // Calculate Average Consumption from all logs
    const refuelsWithConsumption = vehicleLogs.filter(l => l.type === 'refuel' && l.consumption && l.consumption > 0 && l.consumption < 50);
    const avgFuelConsumption = refuelsWithConsumption.length > 0 
      ? refuelsWithConsumption.reduce((sum, l) => sum + (l.consumption || 0), 0) / refuelsWithConsumption.length 
      : 0;

    return {
      totalDistance,
      totalExpenses,
      costPerKm,
      avgL100km: avgFuelConsumption,
      expenses30d,
      distance30d
    };
  }, [vehicleLogs]);

  // Evaluate reminders for the selected vehicle
  const evaluatedReminders = useMemo(() => {
    if (selectedVehicleId === null) return [];
    
    const vReminders = allReminders.filter(r => r.vehicle_id === selectedVehicleId);
    if (vReminders.length === 0) return [];

    // Find current odometer
    const maxOdo = vehicleLogs.reduce((max, log) => Math.max(max, log.odometer || 0), 0);

    return vReminders.map(r => {
      let msgs: string[] = [];
      let maxStatus = 'ok';

      if (r.interval_months) {
        msgs.push(`⏳ Every ${r.interval_months} months`);
      }
      
      if (r.interval_kms) {
        // Odometer based
        const maintenanceLogs = vehicleLogs.filter(l => l.type === 'maintenance');
        let lastServiceOdo = -1;
        
        for (const log of maintenanceLogs) {
          if (log.raw_event?.service_items?.some((i: any) => i.service_type.toLowerCase().trim() === r.service_type.toLowerCase().trim())) {
            if ((log.odometer || 0) > lastServiceOdo) {
              lastServiceOdo = log.odometer || 0;
            }
          }
        }

        if (lastServiceOdo === -1) {
          maxStatus = 'warning';
          msgs.push(`🛣️ Never performed`);
        } else {
          const targetOdo = lastServiceOdo + (r.interval_kms || 0);
          const warningOdo = targetOdo - (r.notify_before_kms || 0);

          if (maxOdo >= targetOdo) {
            maxStatus = 'overdue';
            msgs.push(`🛣️ OVERDUE by ${maxOdo - targetOdo} km! (Target: ${targetOdo})`);
          } else if (maxOdo >= warningOdo) {
            maxStatus = maxStatus === 'overdue' ? 'overdue' : 'warning';
            msgs.push(`🛣️ Due in ${targetOdo - maxOdo} km (Target: ${targetOdo})`);
          } else {
            msgs.push(`🛣️ ${targetOdo - maxOdo} km remaining`);
          }
        }
      }

      if (msgs.length === 0) {
        msgs.push('No interval set');
      }

      return { ...r, status: maxStatus, message: msgs.join('\n') };
    });
  }, [allReminders, vehicleLogs, selectedVehicleId]);

  const handleBackup = async () => {
    try {
      const Sharing = require('expo-sharing');
      const { Platform } = require('react-native');
      const { IOS_LIBRARY_PATH, ANDROID_DATABASE_PATH } = require('../../lib/sqlitePath');
      
      const potentialPaths = Platform.OS === 'ios' ? [
        `${IOS_LIBRARY_PATH}/LocalDatabase/mototommy_v2.sqlite`,
        `${IOS_LIBRARY_PATH}/mototommy_v2.sqlite`,
        `${Paths.document.uri}SQLite/mototommy_v2.sqlite`,
        `${Paths.document.uri}mototommy_v2.sqlite`
      ] : [
        `${ANDROID_DATABASE_PATH}/mototommy_v2.sqlite`,
        `${ANDROID_DATABASE_PATH}mototommy_v2.sqlite`, // in case it ends with slash
        `${Paths.document.uri}SQLite/mototommy_v2.sqlite`,
        `${Paths.document.uri}mototommy_v2.sqlite`,
        `${Paths.document.uri}../databases/mototommy_v2.sqlite`,
        `file:///data/user/0/com.tbcbcabral.tommymoto/databases/mototommy_v2.sqlite`,
        `/data/user/0/com.tbcbcabral.tommymoto/databases/mototommy_v2.sqlite`
      ];

      const sanitizePath = (p: string) => p.startsWith('file://') ? p : `file://${p}`;

      let dbPath = null;
      for (const p of potentialPaths) {
        if (!p) continue;
        const safeP = sanitizePath(p);
        if (new File(safeP).exists) {
          dbPath = safeP;
          break;
        }
      }
      
      if (!dbPath) {
        Alert.alert("Backup Failed", "Local database file not found.");
        return;
      }
      
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Backup Failed", "Sharing is not available on this device.");
        return;
      }

      const backupPath = new File(Paths.cache, "mototommy_backup.sqlite");
      
      if (backupPath.exists) {
        backupPath.delete();
      }
      
      await new File(dbPath).copy(backupPath);
      
      await Sharing.shareAsync(backupPath.uri, {
        dialogTitle: 'Export Mototommy Database',
        mimeType: 'application/x-sqlite3',
      });
      
    } catch (e: any) {
      console.error(e);
      Alert.alert("Backup Failed", `Error: ${e?.message || String(e)}`);
    }
  };

  const handleUpdateApp = async () => {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert('Update downloaded', 'The app will now restart to apply the update.', [
          { text: 'OK', onPress: () => Updates.reloadAsync() }
        ]);
      } else {
        Alert.alert('No updates', 'You are running the latest version of the app.');
      }
    } catch (e) {
      Alert.alert('Update check failed', 'Could not check for updates. Are you running the app in development mode?');
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

        <Title style={styles.header}>Analytics: {selectedVehicleName}</Title>
        
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content style={{ alignItems: 'center' }}>
              <Text variant="labelMedium">Total Distance</Text>
              <Text variant="titleLarge" style={{ marginTop: 4 }}>{stats.totalDistance > 0 ? formatNumber(stats.totalDistance) : 0} km</Text>
            </Card.Content>
          </Card>
          
          <Card style={styles.statCard}>
            <Card.Content style={{ alignItems: 'center' }}>
              <Text variant="labelMedium">Total Fuel Spent</Text>
              <Text variant="titleLarge" style={{ marginTop: 4 }}>€{formatNumber(Math.round(stats.totalExpenses))}</Text>
            </Card.Content>
          </Card>
        </View>
        <View style={[styles.statsContainer, { marginTop: 12 }]}>
          <Card style={styles.statCard}>
            <Card.Content style={{ alignItems: 'center' }}>
              <Text variant="labelMedium">Avg L/100km</Text>
              <Text variant="titleLarge" style={{ marginTop: 4, color: theme.colors.primary }}>
                {stats.avgL100km > 0 ? stats.avgL100km.toFixed(2) : 'N/A'}
              </Text>
            </Card.Content>
          </Card>
          
          <Card style={styles.statCard}>
            <Card.Content style={{ alignItems: 'center' }}>
              <Text variant="labelMedium">Fuel Cost / km</Text>
              <Text variant="titleLarge" style={{ marginTop: 4, color: theme.colors.error }}>
                {stats.costPerKm > 0 ? `€${stats.costPerKm.toFixed(2)}` : 'N/A'}
              </Text>
            </Card.Content>
          </Card>
        </View>
        
        <View style={[styles.statsContainer, { marginTop: 12 }]}>
          <Card style={styles.statCard}>
            <Card.Content style={{ alignItems: 'center' }}>
              <Text variant="labelMedium">Distance (30d)</Text>
              <Text variant="titleLarge" style={{ marginTop: 4 }}>
                {stats.distance30d > 0 ? formatNumber(stats.distance30d) : 0} km
              </Text>
            </Card.Content>
          </Card>
          
          <Card style={styles.statCard}>
            <Card.Content style={{ alignItems: 'center' }}>
              <Text variant="labelMedium">Fuel Spent (30d)</Text>
              <Text variant="titleLarge" style={{ marginTop: 4 }}>
                €{formatNumber(Math.round(stats.expenses30d))}
              </Text>
            </Card.Content>
          </Card>
        </View>

        <Title style={[styles.header, { marginTop: 24 }]}>Reminders</Title>
        <Card style={styles.reminderCard}>
          <Card.Content>
            {evaluatedReminders.length === 0 ? (
              <Paragraph>No reminders set. Go to the Reminders tab to set some!</Paragraph>
            ) : (
              evaluatedReminders.map(r => (
                <View key={r.id} style={{ marginBottom: 12 }}>
                  <Text variant="titleMedium" style={{ 
                    color: r.status === 'overdue' ? theme.colors.error : 
                           r.status === 'warning' ? '#f59e0b' : theme.colors.onSurface 
                  }}>
                    {r.service_type}
                  </Text>
                  <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
                    {r.message}
                  </Text>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        <Button 
          mode="outlined" 
          icon="database-export" 
          style={{ marginTop: 24 }} 
          onPress={handleBackup}
        >
          Export Cloud Data Backup
        </Button>

        <Button 
          mode="contained-tonal" 
          icon="update" 
          style={{ marginTop: 12, marginBottom: 80 }} 
          onPress={handleUpdateApp}
        >
          Check for App Updates
        </Button>
      </ScrollView>

      <FAB.Group
        open={fabOpen}
        visible
        icon={fabOpen ? 'close' : 'plus'}
        actions={[
          {
            icon: 'gas-station',
            label: 'Add Refuel',
            onPress: () => router.push('/add-refuel'),
          },
          {
            icon: 'wrench',
            label: 'Add Maintenance',
            onPress: () => router.push('/add-maintenance'),
          },
          {
            icon: 'shopping',
            label: 'Add Accessory',
            onPress: () => router.push('/add-accessory'),
          },
          {
            icon: 'cash',
            label: 'Add Expense',
            onPress: () => router.push('/add-expense'),
          },
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
        onPress={() => {
          if (fabOpen) {
            // do something if the speed dial is open
          }
        }}
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
