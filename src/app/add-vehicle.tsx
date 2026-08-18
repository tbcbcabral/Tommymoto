import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { TextInput, Button, useTheme, Avatar, Text, SegmentedButtons } from 'react-native-paper';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { addVehicle, getVehicle, updateVehicle } from '../db/queries';

export default function AddVehicleScreen() {
  const theme = useTheme();
  const { vehicleId } = useLocalSearchParams();
  const isEditing = !!vehicleId;
  const vId = typeof vehicleId === 'string' ? vehicleId : Array.isArray(vehicleId) ? vehicleId[0] : '';
  
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  
  const handleLicensePlateChange = (text: string) => {
    const cleaned = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    let formatted = '';
    for (let i = 0; i < cleaned.length; i++) {
      if (i > 0 && i % 2 === 0 && i < 6) {
        formatted += '-';
      }
      formatted += cleaned[i];
    }
    setLicensePlate(formatted.slice(0, 8));
  };

  const [year, setYear] = useState('');
  const [alias, setAlias] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [isDefault, setIsDefault] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (isEditing && vId) {
        getVehicle(vId).then(v => {
          setMake(v.make);
          setModel(v.model);
          setLicensePlate(v.license_plate);
          setYear(v.year ? v.year.toString() : '');
          setAlias(v.alias);
          setFuelType(v.default_fuel_type);
          setPhotoUri(v.profile_photo_uri);
          setIsDefault(v.is_default);
        }).catch(e => {
          Alert.alert('Error', 'Failed to load vehicle details');
        });
      }
    }, [isEditing, vId])
  );

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    try {
      if (!make || !model) {
        Alert.alert('Error', 'Make and Model are required.');
        return;
      }
      
      if (licensePlate && !/^[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}$/.test(licensePlate)) {
        Alert.alert('Error', 'License Plate must be in the format XX-XX-XX.');
        return;
      }
      
      const payload = {
        make,
        model,
        license_plate: licensePlate,
        year: parseInt(year) || new Date().getFullYear(),
        alias,
        default_fuel_type: fuelType,
        profile_photo_uri: photoUri,
      };

      if (isEditing && vId) {
        await updateVehicle(vId, payload);
      } else {
        await addVehicle({ ...payload, is_default: 0 });
      }
      
      router.back();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Save Error', e.message || 'An error occurred while saving.');
    }
  };

  return (
    <KeyboardAwareScrollView 
      style={{ flex: 1, backgroundColor: theme.colors.background }} 
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      enableOnAndroid={true} 
      enableAutomaticScroll={true}
      extraScrollHeight={100} 
      keyboardShouldPersistTaps="handled">
      <View style={styles.photoContainer}>
        {photoUri ? (
          <Avatar.Image size={100} source={{ uri: photoUri }} />
        ) : (
          <Avatar.Icon size={100} icon="camera" />
        )}
        <Button style={{ marginTop: 8 }} onPress={pickImage}>Add Photo</Button>
      </View>

      <TextInput label="Make *" value={make} onChangeText={setMake} style={styles.input} />
      <TextInput label="Model *" value={model} onChangeText={setModel} style={styles.input} />
      <TextInput label="License plate (XX-XX-XX)" value={licensePlate} onChangeText={handleLicensePlateChange} style={styles.input} />
      <TextInput label="Year" value={year} onChangeText={setYear} keyboardType="numeric" style={styles.input} />
      <TextInput label="Alias (nickname)" value={alias} onChangeText={setAlias} style={styles.input} />
      
      <Text style={styles.label}>Default fuel type</Text>
      <SegmentedButtons
        value={fuelType}
        onValueChange={setFuelType}
        buttons={[
          { value: 'Petrol', label: 'Petrol' },
          { value: 'Diesel', label: 'Diesel' },
        ]}
        style={styles.input}
      />

      <Button mode="contained" onPress={handleSave} style={styles.saveBtn}>
        {isEditing ? 'Save changes' : 'Save vehicle'}
      </Button>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 24,
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
