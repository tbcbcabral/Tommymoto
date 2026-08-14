import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Title, FAB, useTheme } from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { getAccessories } from '../../db/queries';
import { formatNumber } from '../../lib/utils';

type AccessoryWithVehicleName = {
  id: number;
  vehicle_id: number;
  name: string;
  price: number;
  shop: string;
  date: string;
  receipt_image_uri: string;
  vehicle_name: string;
};

export default function AccessoriesScreen() {
  const theme = useTheme();
  const [accessories, setAccessories] = useState<AccessoryWithVehicleName[]>([]);

  const loadAccessories = async () => {
    try {
      const data = await getAccessories();
      setAccessories(data);
    } catch (error) {
      console.error('Error loading accessories:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAccessories();
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title style={styles.header}>Accessories</Title>
        
        {accessories.length === 0 ? (
          <Card style={styles.accessoryCard}>
            <Card.Content>
              <Text style={{ textAlign: 'center', opacity: 0.6 }}>No accessories added yet.</Text>
            </Card.Content>
          </Card>
        ) : (
          accessories.map((item) => (
            <Card key={item.id} style={styles.accessoryCard}>
              <Card.Title
                title={item.name}
                subtitle={`${item.vehicle_name} ${item.shop ? `• Purchased at ${item.shop}` : ''}`}
                right={() => (
                  <Text style={[styles.priceText, { color: theme.colors.primary }]}>
                    €{formatNumber(item.price)}
                  </Text>
                )}
              />
              <Card.Content>
                <Text variant="bodySmall" style={{ opacity: 0.5 }}>
                  Date: {item.date}
                </Text>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/add-accessory')}
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
  accessoryCard: {
    marginBottom: 16,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingRight: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
