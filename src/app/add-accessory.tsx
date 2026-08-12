import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, useTheme, Text, SegmentedButtons } from 'react-native-paper';
import { router } from 'expo-router';
import { addAccessory, getVehicles, Vehicle } from '../db/queries';

export default function AddAccessoryScreen() {
  const theme = useTheme();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [shop, setShop] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    getVehicles().then(data => {
      setVehicles(data);
      const defaultVehicle = data.find(v => v.is_default);
      if (defaultVehicle) {
        setSelectedVehicle(defaultVehicle.id.toString());
      } else if (data.length > 0) {
        setSelectedVehicle(data[0].id.toString());
      }
    });
  }, []);

  const handleSave = async () => {
    try {
      if (!selectedVehicle) {
        Alert.alert('Error', 'Please select a vehicle.');
        return;
      }
      if (!name) {
        Alert.alert('Error', 'Accessory name is required.');
        return;
      }
      if (!price) {
        Alert.alert('Error', 'Price is required.');
        return;
      }

      await addAccessory({
        vehicle_id: parseInt(selectedVehicle),
        name,
        price: parseFloat(price.replace(',', '.')),
        shop,
        date,
        receipt_image_uri: ''
      });
      
      router.back();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Save Error', e.message || 'An error occurred while saving.');
    }
  };

  if (vehicles.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', padding: 16 }]}>
        <Text style={{ marginBottom: 16 }}>Please add a vehicle in your Garage first!</Text>
        <Button mode="contained" onPress={() => router.back()}>Go Back</Button>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.form}>
        <Text style={styles.label}>Select Vehicle</Text>
        <SegmentedButtons
          value={selectedVehicle}
          onValueChange={setSelectedVehicle}
          buttons={vehicles.map(v => ({
            value: v.id.toString(),
            label: v.alias || v.model,
          }))}
          style={styles.input}
        />

        <TextInput label="Date (YYYY-MM-DD) *" value={date} onChangeText={setDate} style={styles.input} />
        <TextInput label="Accessory Name *" value={name} onChangeText={setName} style={styles.input} />
        <TextInput label="Price Paid (€) *" value={price} onChangeText={setPrice} keyboardType="numeric" style={styles.input} />
        <TextInput label="Shop Name" value={shop} onChangeText={setShop} style={styles.input} />
        
        <Button mode="contained" onPress={handleSave} style={styles.saveBtn}>
          Save Accessory
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  input: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 8,
    opacity: 0.7,
  },
  saveBtn: {
    marginTop: 16,
    marginBottom: 40,
    paddingVertical: 6,
  }
});
