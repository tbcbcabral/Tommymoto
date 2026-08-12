import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Title, Button, FAB, useTheme, Avatar, IconButton } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { getVehicles, Vehicle, setDefaultVehicle, deleteVehicle } from '../../db/queries';

export default function GarageScreen() {
  const theme = useTheme();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const loadVehicles = async () => {
    const data = await getVehicles();
    setVehicles(data);
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleSetDefault = async (id: number) => {
    await setDefaultVehicle(id);
    loadVehicles();
  };

  const handleDelete = (id: number, make: string, model: string) => {
    Alert.alert(
      "Delete Vehicle",
      `Are you sure you want to delete ${make} ${model}? This will also delete ALL its refueling and maintenance logs forever!`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            await deleteVehicle(id);
            loadVehicles();
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title style={styles.header}>My Vehicles</Title>
        
        {vehicles.length === 0 ? (
          <Card style={styles.vehicleCard}>
            <Card.Title title="No Vehicles Yet" subtitle="Get started by adding your first vehicle" />
            <Card.Actions>
              <Button mode="contained" onPress={() => router.push('/add-vehicle')}>
                Add Vehicle
              </Button>
            </Card.Actions>
          </Card>
        ) : (
          vehicles.map((v) => (
            <Card key={v.id} style={[styles.vehicleCard, v.is_default ? { borderColor: theme.colors.primary, borderWidth: 2 } : {}]}>
              <Card.Title 
                title={`${v.make} ${v.model}`} 
                subtitle={`${v.year} • ${v.license_plate} ${v.alias ? `• "${v.alias}"` : ''}`}
                left={(props) => v.profile_photo_uri ? <Avatar.Image {...props} source={{ uri: v.profile_photo_uri }} /> : <Avatar.Icon {...props} icon="car" />}
              />
              <Card.Content>
                <Text variant="bodyMedium">Fuel: {v.default_fuel_type || 'Not set'}</Text>
              </Card.Content>
              <Card.Actions>
                {!v.is_default && (
                  <Button onPress={() => handleSetDefault(v.id)}>Set as Default</Button>
                )}
                <Button mode="outlined" onPress={() => Alert.alert('Coming Soon', 'Edit vehicle functionality coming soon!')}>Edit</Button>
                <Button mode="outlined" textColor={theme.colors.error} onPress={() => handleDelete(v.id, v.make, v.model)}>Delete</Button>
              </Card.Actions>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/add-vehicle')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  vehicleCard: {
    marginBottom: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
