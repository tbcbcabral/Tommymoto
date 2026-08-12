import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { TextInput, Button, useTheme, Text, SegmentedButtons, Avatar, IconButton } from 'react-native-paper';
import { router } from 'expo-router';
import { getVehicles, Vehicle, addMaintenanceEvent } from '../db/queries';

export default function AddMaintenanceScreen() {
  const theme = useTheme();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [garage, setGarage] = useState('');
  const [odometer, setOdometer] = useState('');
  const [receiptUri, setReceiptUri] = useState('');
  
  // Dynamic list of service items
  const [items, setItems] = useState([{ service_type: '', price: '' }]);

  useEffect(() => {
    const load = async () => {
      const data = await getVehicles();
      setVehicles(data);
      if (data.length > 0) {
        const def = data.find(v => v.is_default);
        setSelectedVehicleId((def || data[0]).id.toString());
      }
    };
    load();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { service_type: '', price: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleUpdateItem = (index: number, field: 'service_type' | 'price', value: string) => {
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

      await addMaintenanceEvent({
        vehicle_id: parseInt(selectedVehicleId),
        date,
        garage,
        odometer: parseInt(odometer),
        receipt_image_uri: receiptUri,
        items: validItems.map(item => ({
          service_type: item.service_type || 'General Service',
          price: parseFloat(item.price.replace(',', '.')) || 0
        }))
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
      <TextInput label="Odometer (km) *" value={odometer} onChangeText={setOdometer} keyboardType="numeric" style={styles.input} />
      <TextInput label="Garage Name" value={garage} onChangeText={setGarage} style={styles.input} />
      
      <View style={styles.photoContainer}>
        {receiptUri ? (
          <Avatar.Image size={80} source={{ uri: receiptUri }} />
        ) : (
          <Avatar.Icon size={80} icon="receipt" />
        )}
        <Button onPress={() => Alert.alert('Coming Soon', 'Photo upload coming soon')}>Upload Receipt</Button>
      </View>

      <Text style={[styles.label, { marginTop: 16 }]}>Service Items & Parts</Text>
      {items.map((item, index) => (
        <View key={index} style={styles.itemRow}>
          <TextInput 
            label="Item (e.g. Oil Change)" 
            value={item.service_type} 
            onChangeText={(val) => handleUpdateItem(index, 'service_type', val)} 
            style={[styles.input, { flex: 2, marginBottom: 0 }]} 
          />
          <TextInput 
            label="€ Price" 
            value={item.price} 
            onChangeText={(val) => handleUpdateItem(index, 'price', val)} 
            keyboardType="decimal-pad" 
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
      ))}

      <Button icon="plus" mode="outlined" onPress={handleAddItem} style={styles.addItemBtn}>
        Add Another Item
      </Button>

      <View style={styles.totalRow}>
        <Text variant="titleMedium">Total Cost:</Text>
        <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
          €{totalPrice.toFixed(2)}
        </Text>
      </View>

      <Button mode="contained" onPress={handleSave} style={styles.saveBtn}>
        Save Maintenance Log
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
  itemRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
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
