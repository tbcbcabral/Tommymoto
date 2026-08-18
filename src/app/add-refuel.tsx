import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { TextInput, Button, useTheme, Switch, Text, SegmentedButtons, Chip } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getVehicles, Vehicle, addRefuelingEvent, getRefuelingEvent, updateRefuelingEvent, getUniqueValues } from '../db/queries';
import { formatNumber } from '../lib/utils';

export default function AddRefuelScreen() {
  const theme = useTheme();
  const { logId } = useLocalSearchParams();
  const isEditing = !!logId;
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [liters, setLiters] = useState('');
  const [fuelType, setFuelType] = useState('Petrol');
  const [stationBrand, setStationBrand] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [odometer, setOdometer] = useState('');
  const [isFullTank, setIsFullTank] = useState(true);
  const [photoUri, setPhotoUri] = useState('');
  const [brands, setBrands] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await getVehicles();
      setVehicles(data);
      
      if (isEditing) {
        try {
          const event = await getRefuelingEvent(logId.toString().replace('refuel-', ''));
          setSelectedVehicleId(event.vehicle_id);
          setDate(event.date);
          setLiters(event.liters.toString());
          setFuelType(event.fuel_type || '');
          setStationBrand(event.petrol_station_brand || '');
          setTotalPrice(event.total_price.toString());
          setOdometer(event.odometer.toString());
          setIsFullTank(Boolean(event.is_full_tank));
          setPhotoUri(event.receipt_image_uri || '');
        } catch (e) {
          Alert.alert('Error', 'Failed to load log details.');
          router.back();
        }
      } else if (data.length > 0) {
        const def = data.find(v => v.is_default);
        setSelectedVehicleId((def || data[0]).id);
        setFuelType((def || data[0]).default_fuel_type || '');
      }
      getUniqueValues('refueling_events', 'petrol_station_brand').then(setBrands);
    };
    load();
  }, [logId, isEditing]);

  const handleSave = async () => {
    try {
      if (!selectedVehicleId || !liters || !totalPrice || !odometer) {
        Alert.alert('Error', 'Please fill in all required fields (Liters, Price, Odometer).');
        return;
      }
      
      const payload = {
        vehicle_id: selectedVehicleId,
        date,
        liters: parseFloat(liters),
        fuel_type: fuelType,
        petrol_station_brand: stationBrand,
        total_price: parseFloat(totalPrice),
        odometer: parseInt(odometer),
        is_full_tank: isFullTank ? 1 : 0,
        receipt_image_uri: photoUri,
      };

      if (isEditing) {
        await updateRefuelingEvent(logId.toString().replace('refuel-', ''), payload);
      } else {
        await addRefuelingEvent(payload);
      }
      
      // Trigger distance-based reminders if they cross the threshold
      import('../lib/reminder-eval').then(m => m.evaluateAndTriggerDistanceReminders(payload.vehicle_id, payload.odometer));
      
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
      setPhotoUri(result.assets[0].uri);
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
      <TextInput label="Liters *" value={liters} onChangeText={(t) => setLiters(t.replace(/,/g, '.').replace(/[^0-9.]/g, ''))} keyboardType="numbers-and-punctuation" style={styles.input} />
      <TextInput label="Total price paid (€) *" value={totalPrice} onChangeText={(t) => setTotalPrice(t.replace(/,/g, '.').replace(/[^0-9.]/g, ''))} keyboardType="numbers-and-punctuation" style={styles.input} />
      <TextInput label="Odometer (km) *" value={odometer} onChangeText={(t) => setOdometer(t.replace(/\D/g, ''))} keyboardType="number-pad" style={styles.input} />
      
      <Text style={styles.label}>Fuel type</Text>
      <SegmentedButtons
        value={fuelType}
        onValueChange={setFuelType}
        buttons={[
          { value: 'Petrol', label: 'Petrol' },
          { value: 'Diesel', label: 'Diesel' },
        ]}
        style={styles.input}
      />
      <TextInput label="Petrol station brand" value={stationBrand} onChangeText={setStationBrand} style={styles.input} />
      {brands.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {brands.map((b) => (
            <Chip key={b} onPress={() => setStationBrand(b)} style={styles.chip} compact>{b}</Chip>
          ))}
        </ScrollView>
      )}
      
      <View style={styles.switchContainer}>
        <Text>Full tank?</Text>
        <Switch value={isFullTank} onValueChange={setIsFullTank} />
      </View>
      <Text style={styles.hint}>Used to calculate average fuel consumption.</Text>

      <Button icon="camera" mode="outlined" onPress={pickImage} style={styles.input}>
        {photoUri ? 'Change Receipt Photo' : 'Upload Receipt Photo'}
      </Button>

      <Button mode="contained" onPress={handleSave} style={styles.saveBtn}>
        {isEditing ? 'Save changes' : 'Save refuel log'}
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
  chipScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  chip: {
    marginRight: 8,
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
