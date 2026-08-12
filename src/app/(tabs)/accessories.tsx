import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Title, FAB, useTheme } from 'react-native-paper';
import { router } from 'expo-router';

export default function AccessoriesScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title style={styles.header}>Accessories</Title>
        
        <Card style={styles.accessoryCard}>
          <Card.Content>
            <Text>No accessories added yet.</Text>
          </Card.Content>
        </Card>
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
