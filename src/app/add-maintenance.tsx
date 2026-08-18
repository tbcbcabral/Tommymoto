import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { TextInput, Button, useTheme, Text, SegmentedButtons, Avatar, IconButton, Chip, Menu } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getVehicles, Vehicle, addMaintenanceEvent, getMaintenanceEvent, updateMaintenanceEvent, getUniqueValues } from '../db/queries';
import { formatNumber, normalizeServiceType } from '../lib/utils';
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
  const [menuVisible, setMenuVisible] = useState<{[key: number]: boolean}>({});
  
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
        const translations: Record<string, string> = {
          'óleo': 'Oil change', 'oleo': 'Oil change', 'mudança de óleo': 'Oil change',
          'filtro de óleo': 'Oil filter change', 'filtro de oleo': 'Oil filter change',
          'bateria': 'Battery replacement', 'pastilhas': 'Brake pad change',
          'pastilhas frente': 'Brake pad change (front)', 'pastilhas trás': 'Brake pad change (back)',
          'corrente': 'Transmission kit', 'kit de transmissão': 'Transmission kit',
          'mão de obra': 'Labor', 'mao de obra': 'Labor',
          'pneu frente': 'Tire (front)', 'pneu trás': 'Tire (back)', 'velas': 'Spark plugs replacement'
        };

        const processed = [...DEFAULT_SERVICES, ...dbServices].map(t => {
          if (!t) return '';
          const norm = t.toLowerCase().trim();
          if (translations[norm]) return translations[norm];
          return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
        }).filter(t => t !== '');

        const uniqueSorted = Array.from(new Set(processed)).sort((a, b) => a.localeCompare(b));
        setServiceTypes(uniqueSorted);
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
          service_type: normalizeServiceType(item.service_type) || 'General Service',
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

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setReceiptUri(result.assets[0].uri);
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
    <KeyboardAwareScrollView 
      style={{ flex: 1, backgroundColor: theme.colors.background }} 
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      enableOnAndroid={true} 
      enableAutomaticScroll={true}
      extraScrollHeight={100} 
      keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Select Vehicle</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {vehicles.map(v => (
          <Chip 
            key={v.id} 
            selected={selectedVehicleId === v.id}
            onPress={() => setSelectedVehicleId(v.id.toString())}
            style={styles.chip}
          >
            {v.alias || v.model}
          </Chip>
        ))}
      </ScrollView>

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
        <Button onPress={pickImage}>{receiptUri ? 'Change Receipt Photo' : 'Upload Receipt Photo'}</Button>
      </View>

      <Text style={[styles.label, { marginTop: 16 }]}>Service items & parts</Text>
      {items.map((item, index) => {
        const filteredServices = serviceTypes
          .filter(t => t.toLowerCase().includes(item.service_type.toLowerCase()) && t !== item.service_type)
          .slice(0, 5);

        return (
          <View key={index} style={styles.itemWrapper}>
            <View style={styles.itemRow}>
              <View style={{ flex: 2 }}>
                <Menu
                  visible={menuVisible[index] && filteredServices.length > 0}
                  onDismiss={() => setMenuVisible({...menuVisible, [index]: false})}
                  anchorPosition="bottom"
                  style={{ marginTop: 50, maxWidth: 250 }}
                  anchor={
                    <TextInput 
                      label="Item (e.g. oil change)" 
                      value={item.service_type} 
                      onChangeText={(val) => {
                        handleUpdateItem(index, 'service_type', val);
                        setMenuVisible({...menuVisible, [index]: true});
                      }}
                      onFocus={() => setMenuVisible({...menuVisible, [index]: true})}
                      style={[styles.input, { marginBottom: 0 }]} 
                    />
                  }
                >
                  {filteredServices.map((t) => (
                    <Menu.Item 
                      key={t} 
                      onPress={() => {
                        handleUpdateItem(index, 'service_type', t);
                        setMenuVisible({...menuVisible, [index]: false});
                      }} 
                      title={t} 
                    />
                  ))}
                </Menu>
              </View>
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
        </View>
        );
      })}

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
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
