import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, useTheme, Switch, Text, SegmentedButtons } from 'react-native-paper';
import { router } from 'expo-router';
import { getVehicles, Vehicle, addRefuelingEvent } from '../db/queries';

export default function AddRefuelScreen() {
  const theme = useTheme();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [liters, setLiters] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [stationBrand, setStationBrand] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [odometer, setOdometer] = useState('');
  const [isFullTank, setIsFullTank] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await getVehicles();
      setVehicles(data);
      if (data.length > 0) {
        const def = data.find(v => v.is_default);
        setSelectedVehicleId((def || data[0]).id.toString());
        setFuelType((def || data[0]).default_fuel_type || '');
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    try {
      if (!selectedVehicleId || !liters || !totalPrice || !odometer) {
        Alert.alert('Error', 'Please fill in all required fields (Liters, Price, Odometer).');
        return;
      }
      
      await addRefuelingEvent({
        vehicle_id: parseInt(selectedVehicleId),
        date,
        liters: parseFloat(liters),
        fuel_type: fuelType,
        petrol_station_brand: stationBrand,
        total_price: parseFloat(totalPrice),
        odometer: parseInt(odometer),
        is_full_tank: isFullTank ? 1 : 0
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
      <TextInput label="Liters *" value={liters} onChangeText={setLiters} keyboardType="numeric" style={styles.input} />
      <TextInput label="Total Price Paid (€) *" value={totalPrice} onChangeText={setTotalPrice} keyboardType="numeric" style={styles.input} />
      <TextInput label="Odometer (km) *" value={odometer} onChangeText={setOdometer} keyboardType="numeric" style={styles.input} />
      
      <TextInput label="Fuel Type" value={fuelType} onChangeText={setFuelType} style={styles.input} />
      <TextInput label="Petrol Station Brand" value={stationBrand} onChangeText={setStationBrand} style={styles.input} />
      
      <View style={styles.switchContainer}>
        <Text>Full Tank?</Text>
        <Switch value={isFullTank} onValueChange={setIsFullTank} />
      </View>
      <Text style={styles.hint}>Used to calculate average fuel consumption.</Text>

      <Button mode="contained" onPress={handleSave} style={styles.saveBtn}>
        Save Refuel Log
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  hint: {
    fontSize: 12,
    opacity: 0.5,
    marginBottom: 24,
  },
  saveBtn: {
    marginBottom: 40,
    paddingVertical: 6,
  }
});
