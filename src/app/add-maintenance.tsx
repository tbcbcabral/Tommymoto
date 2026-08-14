import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { TextInput, Button, useTheme, Text, SegmentedButtons, Avatar, IconButton, Chip } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { getVehicles, Vehicle, addMaintenanceEvent, getMaintenanceEvent, updateMaintenanceEvent, getUniqueValues } from '../db/queries';
import { formatNumber } from '../lib/utils';
import { scheduleMaintenanceReminder } from '../lib/notifications';

export default function AddMaintenanceScreen() {
  const theme = useTheme();
  const { logId } = useLocalSearchParams();
  const isEditing = !!logId;
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [garage, setGarage] = useState('');
  const [odometer, setOdometer] = useState('');
  const [receiptUri, setReceiptUri] = useState('');
  
  const [garages, setGarages] = useState<string[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  
  // Dynamic list of service items
  const [items, setItems] = useState([{ service_type: '', price: '', note: '' }]);

  const DEFAULT_SERVICES = [
    "Oil change", "Oil filter change", "Battery replacement", "Brake pad change (front)", 
    "Brake pad change (back)", "Air chamber", "CDI replacement", "Chain lubrication", 
    "Chain tension adjustment", "Clutch", "Cooling liquid", "Transmission kit", 
    "Labor", "Headlight", "Tire (front)", "Tire (back)", "Rectifier replacement", 
    "Steering head bearings replacement", "Spark plugs replacement", "Tire pressure"
  ];

  useEffect(() => {
    const load = async () => {
      const data = await getVehicles();
      setVehicles(data);
      
      if (isEditing) {
        try {
          const event = await getMaintenanceEvent(logId.toString().replace('maint-', ''));
          setSelectedVehicleId(event.vehicle_id);
          setDate(event.date);
          setGarage(event.garage || '');
          setOdometer(event.odometer.toString());
          setReceiptUri(event.receipt_image_uri || '');
          if (event.items && event.items.length > 0) {
            setItems(event.items.map((i: any) => ({ service_type: i.service_type, price: i.price.toString(), note: i.note || '' })));
          }
        } catch (e) {
          Alert.alert('Error', 'Failed to load log details.');
          router.back();
        }
      } else if (data.length > 0) {
        const def = data.find(v => v.is_default);
        setSelectedVehicleId((def || data[0]).id);
      }
      getUniqueValues('maintenance_events', 'garage').then(setGarages);
      getUniqueValues('service_items', 'service_type').then(dbServices => {
        // Merge with defaults and remove duplicates
        const merged = Array.from(new Set([...DEFAULT_SERVICES, ...dbServices]));
        setServiceTypes(merged);
      });
    };
    load();
  }, [logId, isEditing]);

  const handleAddItem = () => {
    setItems([...items, { service_type: '', price: '', note: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleUpdateItem = (index: number, field: 'service_type' | 'price' | 'note', value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSave = async () => {
    try {
      if (!selectedVehicleId || !odometer) {
        Alert.alert('Error', 'Please select a vehicle and enter the odometer reading.');
        return;
      }

      // Filter out completely empty items
      const validItems = items.filter(item => item.service_type.trim() !== '' || item.price.trim() !== '');

      const payload = {
        vehicle_id: selectedVehicleId,
        date,
        garage,
        odometer: parseInt(odometer),
        receipt_image_uri: receiptUri,
        items: validItems.map(item => ({
          service_type: item.service_type || 'General Service',
          price: parseFloat(item.price.replace(',', '.')) || 0,
          note: item.note || ''
        }))
      };

      if (isEditing) {
        await updateMaintenanceEvent(logId.toString().replace('maint-', ''), payload);
      } else {
        await addMaintenanceEvent(payload);
      }

      // Handle time-based triggers and cancelling old nags
      const loggedServiceTypes = validItems.map(i => i.service_type);
      import('../lib/reminder-eval').then(m => {
        m.handleMaintenanceLogged(payload.vehicle_id, loggedServiceTypes);
        m.evaluateAndTriggerDistanceReminders(payload.vehicle_id, payload.odometer);
      });
      
      router.back();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Save Error', e.message || 'An error occurred while saving.');
    }
  };

  if (vehicles.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text>Please add a vehicle in your Garage first!</Text>
        <Button onPress={() => router.back()}>Go Back</Button>
      </View>
    );
  }

  const totalPrice = items.reduce((sum, item) => sum + (parseFloat(item.price.replace(',', '.')) || 0), 0);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={styles.label}>Select Vehicle</Text>
      <SegmentedButtons
        value={selectedVehicleId}
        onValueChange={setSelectedVehicleId}
        buttons={vehicles.map(v => ({
          value: v.id.toString(),
          label: v.alias || v.model,
        }))}
        style={styles.input}
      />

      <TextInput label="Date (YYYY-MM-DD) *" value={date} onChangeText={setDate} style={styles.input} />
      <TextInput label="Odometer (km) *" value={odometer} onChangeText={(t) => setOdometer(t.replace(/\D/g, ''))} keyboardType="number-pad" style={styles.input} />
      <TextInput label="Garage name" value={garage} onChangeText={setGarage} style={styles.input} />
      {garages.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {garages.map((g) => (
            <Chip key={g} onPress={() => setGarage(g)} style={styles.chip} compact>{g}</Chip>
          ))}
        </ScrollView>
      )}
      
      <View style={styles.photoContainer}>
        {receiptUri ? (
          <Avatar.Image size={80} source={{ uri: receiptUri }} />
        ) : (
          <Avatar.Icon size={80} icon="receipt" />
        )}
        <Button onPress={() => Alert.alert('Coming Soon', 'Photo upload coming soon')}>Upload Receipt</Button>
      </View>

      <Text style={[styles.label, { marginTop: 16 }]}>Service items & parts</Text>
      {items.map((item, index) => (
        <View key={index} style={styles.itemWrapper}>
          <View style={styles.itemRow}>
            <TextInput 
              label="Item (e.g. oil change)" 
              value={item.service_type} 
              onChangeText={(val) => handleUpdateItem(index, 'service_type', val)} 
              style={[styles.input, { flex: 2, marginBottom: 0 }]} 
            />
          <TextInput 
            label="Price (€)" 
            value={item.price} 
            onChangeText={(val) => handleUpdateItem(index, 'price', val.replace(/,/g, '.').replace(/[^0-9.]/g, ''))} 
            keyboardType="numbers-and-punctuation" 
            style={[styles.input, { flex: 1, marginBottom: 0 }]} 
          />
          {items.length > 1 && (
            <IconButton 
              icon="delete" 
              iconColor={theme.colors.error}
              size={24}
              onPress={() => handleRemoveItem(index)}
              style={{ alignSelf: 'center', margin: 0 }}
            />
          )}
        </View>
        <TextInput 
          label="Note (optional)" 
          value={item.note} 
          onChangeText={(val) => handleUpdateItem(index, 'note', val)} 
          style={[styles.input, { marginBottom: 8 }]} 
        />
        {serviceTypes.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceChipScroll}>
            {serviceTypes.map((t) => (
              <Chip key={t} onPress={() => handleUpdateItem(index, 'service_type', t)} style={styles.chip} compact>{t}</Chip>
            ))}
          </ScrollView>
        )}
      </View>
      ))}

      <Button icon="plus" mode="outlined" onPress={handleAddItem} style={styles.addItemBtn}>
        Add another item
      </Button>

      <View style={styles.totalRow}>
        <Text variant="titleMedium">Total cost:</Text>
        <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
          €{formatNumber(totalPrice)}
        </Text>
      </View>

      <Button mode="contained" onPress={handleSave} style={styles.saveBtn}>
        {isEditing ? 'Save changes' : 'Save maintenance log'}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  input: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 8,
    opacity: 0.7,
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  chipScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  serviceChipScroll: {
    flexDirection: 'row',
    marginTop: 4,
  },
  chip: {
    marginRight: 8,
  },
  itemWrapper: {
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addItemBtn: {
    marginBottom: 24,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#ffffff20',
    marginBottom: 16,
  },
  saveBtn: {
    marginBottom: 40,
    paddingVertical: 6,
  }
});
