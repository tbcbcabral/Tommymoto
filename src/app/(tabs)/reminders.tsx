import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { Text, Card, Title, FAB, Button, useTheme, SegmentedButtons, TextInput, Chip, IconButton } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { deleteReminder, getUniqueValues, Reminder, updateReminder } from '../../db/queries';
import { formatNumber, normalizeServiceType } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useVehicles, useReminders } from '../../hooks/useData';

const DEFAULT_SERVICES = [
  "Oil change", "Oil filter change", "Battery replacement", "Brake pad change (front)", 
  "Brake pad change (rear)", "Brake fluid replacement", "Chain and sprockets", 
  "Tire replacement (front)", "Tire replacement (rear)", "Spark plugs", 
  "Air filter", "Valve clearance check"
];

export default function RemindersScreen() {
  const theme = useTheme();
  const vehicles = useVehicles();
  const reminders = useReminders();
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reminderMode, setReminderMode] = useState<'odo' | 'time' | 'both'>('odo');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState('');
  const [intervalKms, setIntervalKms] = useState('');
  const [notifyBeforeKms, setNotifyBeforeKms] = useState('500');
  const [intervalMonths, setIntervalMonths] = useState('');
  const [repeatIntervalDays, setRepeatIntervalDays] = useState('7');

  useEffect(() => {
    if (vehicles.length > 0 && selectedVehicleId === null) {
      const def = vehicles.find(v => v.is_default);
      setSelectedVehicleId((def || vehicles[0]).id);
    }
  }, [vehicles, selectedVehicleId]);

  const loadData = async () => {
    
    const dbServices = await getUniqueValues('service_items', 'service_type');
    setServiceTypes(Array.from(new Set([...DEFAULT_SERVICES, ...dbServices])));
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleSave = async () => {
    if (!selectedVehicleId || !serviceType) {
      Alert.alert('Error', 'Please select a vehicle and service type.');
      return;
    }
    
    const k = (reminderMode === 'odo' || reminderMode === 'both') ? parseInt(intervalKms) : NaN;
    const m = (reminderMode === 'time' || reminderMode === 'both') ? parseInt(intervalMonths) : NaN;
    
    if (isNaN(k) && isNaN(m)) {
      Alert.alert('Error', 'Please enter at least an odometer interval or a months interval based on your selection.');
      return;
    }

    try {
      const payload = {
        vehicle_id: selectedVehicleId,
        service_type: normalizeServiceType(serviceType),
        interval_kms: isNaN(k) ? null : k,
        notify_before_kms: isNaN(k) ? null : parseInt(notifyBeforeKms) || 0,
        interval_months: isNaN(m) ? null : m,
        repeat_interval_days: parseInt(repeatIntervalDays) || null,
      };
      
      let rId = editingId;
      if (editingId) {
        await updateReminder(editingId, payload);
      } else {
        const { data, error } = await supabase.from('reminders').insert([payload]).select('id').single();
        if (error) throw error;
        rId = data.id;
      }

      import('../../lib/reminder-eval').then(mod => {
        if (rId) mod.initializeReminder(rId);
        if (!isNaN(k)) {
          // Trigger a distance check just in case they are already overdue!
          import('../../db/queries').then(q => {
             q.getAllLogs().then(logs => {
                const vehicleLogs = logs.filter(l => l.vehicle_id === payload.vehicle_id);
                const maxOdo = vehicleLogs.reduce((max, log) => Math.max(max, log.odometer || 0), 0);
                mod.evaluateAndTriggerDistanceReminders(payload.vehicle_id, maxOdo);
             });
          });
        }
      });

      setModalVisible(false);
      loadData();
      
      // Reset form
      setEditingId(null);
      setReminderMode('odo');
      setServiceType('');
      setIntervalKms('');
      setIntervalMonths('');
      setNotifyBeforeKms('500');
      setRepeatIntervalDays('7');
    } catch (e: any) {
      Alert.alert('Error saving', e.message);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Reminder', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteReminder(id);
        loadData();
      }}
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title style={styles.header}>Active Reminders</Title>
        
        {reminders.length === 0 ? (
          <Text style={{ opacity: 0.5 }}>No reminders set yet. Tap + to create one.</Text>
        ) : (
          reminders.map(r => (
            <Card 
              key={r.id} 
              style={styles.card} 
              onPress={() => {
                setEditingId(r.id);
                setSelectedVehicleId(r.vehicle_id);
                setServiceType(r.service_type);

                let mode: 'odo' | 'time' | 'both' = 'odo';
                if (r.interval_kms !== null && r.interval_months !== null) mode = 'both';
                else if (r.interval_months !== null) mode = 'time';
                setReminderMode(mode);

                setIntervalKms(r.interval_kms ? r.interval_kms.toString() : '');
                setNotifyBeforeKms(r.notify_before_kms !== null ? r.notify_before_kms.toString() : '500');
                setIntervalMonths(r.interval_months ? r.interval_months.toString() : '');
                setRepeatIntervalDays(r.repeat_interval_days !== null ? r.repeat_interval_days.toString() : '7');
                setModalVisible(true);
              }}
            >
              <Card.Title 
                title={r.service_type}
                subtitle={r.vehicle_name}
                right={(props) => <IconButton {...props} icon="delete" onPress={() => handleDelete(r.id)} />}
              />
              <Card.Content>
                {r.interval_months !== null && (
                  <Text variant="bodyMedium">⏳ Every {r.interval_months} months</Text>
                )}
                {r.interval_kms !== null && (
                  <Text variant="bodyMedium">
                    🛣️ Every {formatNumber(r.interval_kms)} km 
                    (Alert {r.notify_before_kms} km before)
                  </Text>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <ScrollView>
            <Title style={{ marginBottom: 16 }}>{editingId ? 'Edit Reminder' : 'Create Reminder'}</Title>
            
            <Text style={styles.label}>Vehicle</Text>
            <SegmentedButtons
              value={selectedVehicleId || ''}
              onValueChange={setSelectedVehicleId}
              buttons={vehicles.map(v => ({ value: v.id, label: v.alias || v.model }))}
              style={{ marginBottom: 16 }}
            />

            <TextInput 
              label="Service Type (e.g. Oil change)" 
              value={serviceType} 
              onChangeText={setServiceType} 
              style={{ marginBottom: 8 }} 
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, flexGrow: 0, height: 40 }}>
              {serviceTypes
                .filter(t => t.toLowerCase().startsWith(serviceType.toLowerCase()))
                .map(t => (
                  <Chip key={t} onPress={() => setServiceType(t)} style={{ marginRight: 8 }} compact>{t}</Chip>
                ))}
            </ScrollView>

            <SegmentedButtons
              value={reminderMode}
              onValueChange={(val: any) => setReminderMode(val)}
              buttons={[
                { value: 'odo', label: 'By Odometer' },
                { value: 'time', label: 'By Time' },
                { value: 'both', label: 'Both' },
              ]}
              style={{ marginBottom: 16 }}
            />

            {(reminderMode === 'odo' || reminderMode === 'both') && (
              <>
                <TextInput 
                  label="Odometer Interval (e.g. 12000 kms)" 
                  value={intervalKms ? formatNumber(parseInt(intervalKms.replace(/\D/g, ''))) : ''} 
                  onChangeText={(t) => setIntervalKms(t.replace(/\D/g, ''))} 
                  keyboardType="numeric" 
                  style={{ marginBottom: 16 }} 
                />
                {intervalKms ? (
                  <TextInput 
                    label="Notify me X kms before" 
                    value={notifyBeforeKms} 
                    onChangeText={(t) => setNotifyBeforeKms(t.replace(/\D/g, ''))} 
                    keyboardType="numeric" 
                    style={{ marginBottom: 16 }} 
                  />
                ) : null}
              </>
            )}

            {(reminderMode === 'time' || reminderMode === 'both') && (
              <TextInput 
                label="Time Interval (e.g. 12 months)" 
                value={intervalMonths} 
                onChangeText={(t) => setIntervalMonths(t.replace(/\D/g, ''))} 
                keyboardType="numeric" 
                style={{ marginBottom: 16 }} 
              />
            )}

            <TextInput 
              label="Repeat notification every Z days" 
              value={repeatIntervalDays} 
              onChangeText={(t) => setRepeatIntervalDays(t.replace(/\D/g, ''))} 
              keyboardType="numeric" 
              style={{ marginBottom: 16 }} 
              placeholder="e.g. 7"
            />

            <Button mode="contained" onPress={handleSave} style={{ marginBottom: 16 }}>
              Save Reminder
            </Button>
            <Button onPress={() => {
              setModalVisible(false);
              setEditingId(null);
              setReminderMode('odo');
              setServiceType('');
              setIntervalKms('');
              setIntervalMonths('');
              setNotifyBeforeKms('500');
              setRepeatIntervalDays('7');
            }}>Cancel</Button>
          </ScrollView>
        </View>
      </Modal>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          setEditingId(null);
          setReminderMode('odo');
          setServiceType('');
          setIntervalKms('');
          setIntervalMonths('');
          setNotifyBeforeKms('500');
          setRepeatIntervalDays('7');
          if (vehicles.length > 0) setSelectedVehicleId(vehicles[0].id);
          setModalVisible(true);
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
    paddingBottom: 80,
  },
  header: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
  label: {
    marginBottom: 8,
    opacity: 0.7,
  }
});
