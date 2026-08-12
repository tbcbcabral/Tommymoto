import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, useTheme, Text, SegmentedButtons, Avatar } from 'react-native-paper';
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

  const handleSave = async () => {
    try {
      if (!selectedVehicleId || !odometer) {
        Alert.alert('Error', 'Please select a vehicle and enter the odometer reading.');
        return;
      }
      
      const eventId = await addMaintenanceEvent({
        vehicle_id: parseInt(selectedVehicleId),
        date,
        garage,
        odometer: parseInt(odometer),
        receipt_image_uri: receiptUri
      });
      
      Alert.alert('Success', 'Maintenance event saved! (Service item logging coming soon)');
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
  saveBtn: {
    marginBottom: 40,
    paddingVertical: 6,
  }
});
