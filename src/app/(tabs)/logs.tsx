import { useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, useTheme, SegmentedButtons, Chip } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { getAllLogs, LogEntry } from '../../db/queries';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LogsScreen() {
  const theme = useTheme();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterBrand, setFilterBrand] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadLogs = async () => {
    const data = await getAllLogs();
    setLogs(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [])
  );

  // Extract unique vehicles and brands for the filter chips
  const vehicles = useMemo(() => {
    const unique = Array.from(new Set(logs.map(l => l.vehicle_name)));
    return ['all', ...unique];
  }, [logs]);

  const brands = useMemo(() => {
    const unique = Array.from(new Set(logs.map(l => l.brand).filter((b): b is string => !!b && b.trim() !== '')));
    return ['all', ...unique];
  }, [logs]);

  const filteredLogs = logs.filter(log => {
    const matchType = filterType === 'all' || log.type === filterType;
    const matchVehicle = filterVehicle === 'all' || log.vehicle_name === filterVehicle;
    const matchBrand = filterBrand === 'all' || log.brand === filterBrand;
    return matchType && matchVehicle && matchBrand;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'refuel': return 'gas-station';
      case 'maintenance': return 'wrench';
      case 'accessory': return 'shopping';
      default: return 'file-document';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'refuel': return '#f59e0b';
      case 'maintenance': return '#ef4444';
      case 'accessory': return '#3b82f6';
      default: return theme.colors.primary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={filterType}
          onValueChange={setFilterType}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'refuel', label: 'Fuel' },
            { value: 'maintenance', label: 'Service' },
            { value: 'accessory', label: 'Items' },
          ]}
          style={styles.segmentedButtons}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {vehicles.length > 1 && vehicles.map(v => (
            <Chip 
              key={`veh-${v}`} 
              selected={filterVehicle === v} 
              onPress={() => setFilterVehicle(v)}
              style={styles.chip}
              compact
            >
              {v === 'all' ? 'All Vehicles' : v}
            </Chip>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {brands.length > 1 && brands.map(b => (
            <Chip 
              key={`brd-${b}`} 
              selected={filterBrand === b} 
              onPress={() => setFilterBrand(b)}
              style={styles.chip}
              compact
            >
              {b === 'all' ? 'All Brands' : b}
            </Chip>
          ))}
        </ScrollView>
      </View>
      
      <ScrollView contentContainerStyle={styles.scroll}>
        {filteredLogs.length === 0 ? (
          <Card style={styles.logCard}>
            <Card.Content>
              <Text style={{ textAlign: 'center', opacity: 0.5 }}>No logs found for these filters.</Text>
            </Card.Content>
          </Card>
        ) : (
          filteredLogs.map(log => (
            <Card key={log.id} style={styles.logCard} onPress={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}>
              <Card.Title
                title={log.title}
                subtitle={`${log.date} • ${log.vehicle_name}`}
                left={(props) => (
                  <View style={[styles.iconBox, { backgroundColor: getIconColor(log.type) + '20' }]}>
                    <MaterialCommunityIcons name={getIcon(log.type) as any} size={24} color={getIconColor(log.type)} />
                  </View>
                )}
                right={(props) => (
                  <Text style={[styles.priceText, { paddingRight: 16 }]}>
                    {log.price >= 0 ? `€${log.price.toFixed(2)}` : ''}
                  </Text>
                )}
              />
              <Card.Content>
                <View style={styles.detailsRow}>
                  {!!log.brand && <Text variant="bodySmall" style={styles.detailText}>🏷️ {log.brand}</Text>}
                  {log.odometer !== undefined && <Text variant="bodySmall" style={styles.detailText}>🛣️ {log.odometer.toLocaleString()} km</Text>}
                  {log.liters !== undefined && <Text variant="bodySmall" style={styles.detailText}>⛽ {log.liters} L</Text>}
                  {log.is_full_tank !== undefined && <Text variant="bodySmall" style={styles.detailText}>{log.is_full_tank ? '✅ Full Tank' : '❌ Part Tank'}</Text>}
                </View>

                {expandedLogId === log.id && log.service_items && log.service_items.length > 0 && (
                  <View style={styles.expandedItemsContainer}>
                    <Text variant="titleSmall" style={{ marginTop: 12, marginBottom: 8, opacity: 0.8 }}>Service Items:</Text>
                    {log.service_items.map((item, idx) => (
                      <View key={idx} style={styles.serviceItemRow}>
                        <Text variant="bodyMedium">• {item.service_type}</Text>
                        <Text variant="bodyMedium" style={{ opacity: 0.7 }}>€{(item.price || 0).toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  segmentedButtons: {
    width: '100%',
    marginBottom: 12,
  },
  chipScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  chip: {
    marginRight: 8,
  },
  scroll: {
    padding: 16,
  },
  logCard: {
    marginBottom: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  detailText: {
    opacity: 0.7,
  },
  expandedItemsContainer: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ffffff30',
  },
  serviceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingLeft: 8,
  }
});
