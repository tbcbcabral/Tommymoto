import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, useTheme, Avatar } from 'react-native-paper';
import { router } from 'expo-router';
import { addVehicle } from '../db/queries';

export default function AddVehicleScreen() {
  const theme = useTheme();
  
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [year, setYear] = useState('');
  const [alias, setAlias] = useState('');
  const [fuelType, setFuelType] = useState('');
  // We will handle photo upload later, for now it's empty
  const [photoUri, setPhotoUri] = useState('');

  const handleSave = async () => {
    try {
      if (!make || !model) {
        Alert.alert('Error', 'Make and Model are required.');
        return;
      }
      
      await addVehicle({
        make,
        model,
        license_plate: licensePlate,
        year: parseInt(year) || new Date().getFullYear(),
        alias,
        is_default: 0,
        default_fuel_type: fuelType,
        profile_photo_uri: photoUri,
      });
      
      router.back();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Save Error', e.message || 'An error occurred while saving.');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.photoContainer}>
        {photoUri ? (
          <Avatar.Image size={100} source={{ uri: photoUri }} />
        ) : (
          <Avatar.Icon size={100} icon="camera" />
        )}
        <Button style={{ marginTop: 8 }} onPress={() => Alert.alert('Coming Soon', 'Photo upload coming soon')}>Add Photo</Button>
      </View>

      <TextInput label="Make *" value={make} onChangeText={setMake} style={styles.input} />
      <TextInput label="Model *" value={model} onChangeText={setModel} style={styles.input} />
      <TextInput label="License Plate" value={licensePlate} onChangeText={setLicensePlate} style={styles.input} autoCapitalize="characters" />
      <TextInput label="Year" value={year} onChangeText={setYear} keyboardType="numeric" style={styles.input} />
      <TextInput label="Alias (Nickname)" value={alias} onChangeText={setAlias} style={styles.input} />
      <TextInput label="Default Fuel Type" value={fuelType} onChangeText={setFuelType} style={styles.input} />

      <Button mode="contained" onPress={handleSave} style={styles.saveBtn}>
        Save Vehicle
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 12,
  },
  saveBtn: {
    marginTop: 16,
    marginBottom: 40,
    paddingVertical: 6,
  }
});
