import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Title, Button, useTheme, Avatar } from 'react-native-paper';
import { useFocusEffect, router } from 'expo-router';
import { getArchivedVehicles, Vehicle, restoreVehicle, permanentlyDeleteVehicle } from '../db/queries';

export default function ArchivedScreen() {
  const theme = useTheme();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const loadVehicles = async () => {
    const data = await getArchivedVehicles();
    setVehicles(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadVehicles();
    }, [])
  );

  const handleRestore = async (id: string) => {
    await restoreVehicle(id);
    loadVehicles();
  };

  const handlePermanentDelete = (id: string, make: string, model: string) => {
    Alert.alert(
      "PERMANENTLY DELETE?",
      `Are you ABSOLUTELY sure you want to permanently delete ${make} ${model}? This CANNOT be undone and all logs will be permanently destroyed.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "DESTROY FOREVER", 
          style: "destructive",
          onPress: async () => {
            await permanentlyDeleteVehicle(id);
            loadVehicles();
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title style={styles.header}>Archived Vehicles</Title>
        <Text style={styles.warningText}>These vehicles are hidden from your main garage but their data is safely preserved.</Text>
        
        {vehicles.length === 0 ? (
          <Card style={styles.vehicleCard}>
            <Card.Title title="No Archived Vehicles" subtitle="Your archive is empty." />
          </Card>
        ) : (
          vehicles.map((v) => (
            <Card key={v.id} style={styles.vehicleCard}>
              <Card.Title 
                title={`${v.make} ${v.model}`} 
                subtitle={`${v.year} • ${v.license_plate} ${v.alias ? `• "${v.alias}"` : ''}`}
                left={(props) => v.profile_photo_uri ? <Avatar.Image {...props} source={{ uri: v.profile_photo_uri }} /> : <Avatar.Icon {...props} icon="car" />}
              />
              <Card.Actions>
                <Button mode="contained" onPress={() => handleRestore(v.id)}>Restore to Garage</Button>
                <Button mode="outlined" textColor={theme.colors.error} onPress={() => handlePermanentDelete(v.id, v.make, v.model)}>Delete Forever</Button>
              </Card.Actions>
            </Card>
          ))
        )}
        
        <Button mode="outlined" style={{marginTop: 20}} onPress={() => router.back()}>Close Archive</Button>
      </ScrollView>
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
    marginBottom: 4,
  },
  warningText: {
    marginBottom: 20,
    opacity: 0.6,
  },
  vehicleCard: {
    marginBottom: 16,
    opacity: 0.8,
  },
});
