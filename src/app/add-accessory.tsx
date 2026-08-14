import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, useTheme, Text, SegmentedButtons, Chip } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { addAccessory, getVehicles, Vehicle, getAccessory, updateAccessory, getUniqueValues } from '../db/queries';

export default function AddAccessoryScreen() {
  const theme = useTheme();
  const { logId } = useLocalSearchParams();
  const isEditing = !!logId;
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [shop, setShop] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shops, setShops] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await getVehicles();
      setVehicles(data);
      
      if (isEditing) {
        try {
          const event = await getAccessory(logId.toString().replace('acc-', ''));
          setSelectedVehicleId(event.vehicle_id);
          setName(event.name);
          setPrice(event.price.toString());
          setShop(event.shop || '');
          setDate(event.date);
        } catch (e) {
          Alert.alert('Error', 'Failed to load log details.');
          router.back();
        }
      } else if (data.length > 0) {
        const def = data.find(v => v.is_default);
        setSelectedVehicleId((def || data[0]).id);
      }
      getUniqueValues('accessories', 'shop').then(setShops);
    };
    load();
  }, [logId, isEditing]);

  const handleSave = async () => {
    try {
      if (!selectedVehicleId) {
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

      const payload = {
        vehicle_id: selectedVehicleId,
        name,
        price: parseFloat(price.replace(',', '.')),
        shop,
        date,
        receipt_image_uri: ''
      };

      if (isEditing) {
        await updateAccessory(logId.toString().replace('acc-', ''), payload);
      } else {
        await addAccessory(payload);
      }
      
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
        <Text style={styles.label}>Select vehicle</Text>
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
        <TextInput label="Accessory name *" value={name} onChangeText={setName} style={styles.input} />
        <TextInput label="Price paid (€) *" value={price} onChangeText={(t) => setPrice(t.replace(/,/g, '.').replace(/[^0-9.]/g, ''))} keyboardType="numbers-and-punctuation" style={styles.input} />
        <TextInput label="Shop name" value={shop} onChangeText={setShop} style={styles.input} />
        {shops.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {shops.map((s) => (
              <Chip key={s} onPress={() => setShop(s)} style={styles.chip} compact>{s}</Chip>
            ))}
          </ScrollView>
        )}
        
        <Button mode="contained" onPress={handleSave} style={styles.saveBtn}>
          {isEditing ? 'Save changes' : 'Save accessory'}
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
  chipScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  chip: {
    marginRight: 8,
  },
  saveBtn: {
    marginTop: 16,
    marginBottom: 40,
    paddingVertical: 6,
  }
});
