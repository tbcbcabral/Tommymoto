import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { TextInput, Button, useTheme, Text, SegmentedButtons, Chip } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getVehicles, Vehicle, addExpense, getExpense, updateExpense } from '../db/queries';

export default function AddExpenseScreen() {
  const theme = useTheme();
  const { logId } = useLocalSearchParams();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseType, setExpenseType] = useState('Insurance');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptUri, setReceiptUri] = useState('');

  const EXPENSE_TYPES = ['Insurance', 'Taxes', 'Tolls', 'Fines', 'Parking', 'Other'];

  useEffect(() => {
    const load = async () => {
      const data = await getVehicles();
      setVehicles(data);
      if (logId) {
        const event = await getExpense(logId.toString().replace('exp-', ''));
        setSelectedVehicleId(event.vehicle_id);
        setDate(event.date);
        setExpenseType(event.expense_type);
        setPrice(event.price.toString());
        setNotes(event.notes || '');
        setReceiptUri(event.receipt_image_uri || '');
      } else if (data.length > 0) {
        const def = data.find(v => v.is_default);
        setSelectedVehicleId((def || data[0]).id);
      }
    };
    load();
  }, [logId]);

  const handleSave = async () => {
    try {
      if (!selectedVehicleId || !price) {
        Alert.alert('Error', 'Please select a vehicle and enter the amount.');
        return;
      }

      const payload = {
        vehicle_id: selectedVehicleId,
        date,
        expense_type: expenseType,
        price: parseFloat(price.replace(',', '.')),
        notes,
        receipt_image_uri: receiptUri
      };

      if (logId) {
        await updateExpense(logId.toString().replace('exp-', ''), payload);
      } else {
        await addExpense(payload);
      }
      
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
      
      <Text style={styles.label}>Expense Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {EXPENSE_TYPES.map((t) => (
          <Chip 
            key={t} 
            onPress={() => setExpenseType(t)} 
            style={[styles.chip, expenseType === t && { backgroundColor: theme.colors.primaryContainer }]} 
            compact
          >
            {t}
          </Chip>
        ))}
      </ScrollView>

      <TextInput 
        label="Amount (€) *" 
        value={price} 
        onChangeText={(val) => setPrice(val.replace(/,/g, '.').replace(/[^0-9.]/g, ''))} 
        keyboardType="numbers-and-punctuation" 
        style={styles.input} 
      />
      <TextInput label="Notes (optional)" value={notes} onChangeText={setNotes} style={styles.input} />

      <Button icon="camera" mode="outlined" onPress={pickImage} style={styles.input}>
        {receiptUri ? 'Change Receipt Photo' : 'Upload Receipt Photo'}
      </Button>

      <Button mode="contained" onPress={handleSave} style={styles.saveBtn}>
        Save expense
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
    marginBottom: 16,
  },
  chip: {
    marginRight: 8,
  },
  saveBtn: {
    marginTop: 20,
    marginBottom: 40,
    paddingVertical: 6,
  }
});
