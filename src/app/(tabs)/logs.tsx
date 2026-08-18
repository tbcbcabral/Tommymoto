import { useCallback, useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, useTheme, SegmentedButtons, Chip, Button, FAB, Searchbar } from 'react-native-paper';
import { useFocusEffect, router } from 'expo-router';
import { deleteLog, LogEntry } from '../../db/queries';
import { formatNumber } from '../../lib/utils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useVehicles, useAllLogs } from '../../hooks/useData';

export default function LogsScreen() {
  const theme = useTheme();
  const [filterType, setFilterType] = useState('all');
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterBrand, setFilterBrand] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [fabOpen, setFabOpen] = useState(false);

  const vehicles = useVehicles();
  const logs = useAllLogs();

  const handleDelete = (id: string) => {
    Alert.alert('Delete Log', 'Are you sure you want to delete this log?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteLog(id);
          setExpandedLogId(null);
        } catch (e: any) {
          Alert.alert('Error', e.message || 'Failed to delete log.');
        }
      }}
    ]);
  };

  const handleEdit = (log: LogEntry) => {
    if (log.type === 'refuel') {
      router.push({ pathname: '/add-refuel', params: { logId: log.id } });
    } else if (log.type === 'maintenance') {
      router.push({ pathname: '/add-maintenance', params: { logId: log.id } });
    } else if (log.type === 'accessory') {
      router.push({ pathname: '/add-accessory', params: { logId: log.id } });
    }
  };

  // Extract unique vehicles and brands for the filter chips
  const uniqueVehicleNames = useMemo(() => {
    let relevantLogs = logs;
    if (filterType !== 'all') {
      relevantLogs = relevantLogs.filter(l => l.type === filterType);
    }
    const unique = Array.from(new Set(relevantLogs.map(l => l.vehicle_name)));
    return ['all', ...unique];
  }, [logs, filterType]);

  const brands = useMemo(() => {
    let relevantLogs = logs;
    if (filterType !== 'all') {
      relevantLogs = relevantLogs.filter(l => l.type === filterType);
    }
    if (filterVehicle !== 'all') {
      relevantLogs = relevantLogs.filter(l => l.vehicle_name === filterVehicle);
    }
    const unique = Array.from(new Set(relevantLogs.map(l => l.brand).filter((b): b is string => !!b && b.trim() !== '')));
    return ['all', ...unique];
  }, [logs, filterType, filterVehicle]);

  const filteredLogs = logs.filter(log => {
    const matchType = filterType === 'all' || log.type === filterType;
    const matchVehicle = filterVehicle === 'all' || log.vehicle_name === filterVehicle;
    const matchBrand = filterBrand === 'all' || log.brand === filterBrand;
    
    let matchSearch = true;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const titleMatch = log.title?.toLowerCase().includes(q);
      const subMatch = log.subtitle?.toLowerCase().includes(q);
      const brandMatch = log.brand?.toLowerCase().includes(q);
      const typeMatch = log.type?.toLowerCase().includes(q);
      const itemsMatch = log.raw_event?.service_items?.some((i: any) => i.service_type?.toLowerCase().includes(q) || i.note?.toLowerCase().includes(q));
      
      matchSearch = !!(titleMatch || subMatch || brandMatch || typeMatch || itemsMatch);
    }

    return matchType && matchVehicle && matchBrand && matchSearch;
  });

  useEffect(() => {
    if (filterBrand !== 'all' && !brands.includes(filterBrand)) {
      setFilterBrand('all');
    }
  }, [brands, filterBrand]);

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
        <Searchbar
          placeholder="Search logs..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />

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
          {uniqueVehicleNames.length > 1 && uniqueVehicleNames.map(v => (
            <Chip 
              key={`veh-${v}`} 
              selected={filterVehicle === v} 
              onPress={() => setFilterVehicle(v)}
              style={[styles.chip, filterVehicle === v && { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary, borderWidth: 1 }]}
              textStyle={filterVehicle === v ? { color: theme.colors.onPrimaryContainer, fontWeight: 'bold' } : undefined}
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
              style={[styles.chip, filterBrand === b && { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary, borderWidth: 1 }]}
              textStyle={filterBrand === b ? { color: theme.colors.onPrimaryContainer, fontWeight: 'bold' } : undefined}
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
                    {log.price >= 0 ? `€${formatNumber(log.price)}` : ''}
                  </Text>
                )}
              />
              <Card.Content>
                <View style={styles.detailsRow}>
                  {!!log.brand && <Text variant="bodySmall" style={styles.detailText}>🏷️ {log.brand}</Text>}
                  {log.type === 'maintenance' && !!log.raw_event?.garage && <Text variant="bodySmall" style={styles.detailText}>🏢 {log.raw_event.garage}</Text>}
                  {log.odometer !== undefined && <Text variant="bodySmall" style={styles.detailText}>🛣️ {formatNumber(log.odometer)} km</Text>}
                  {log.liters !== undefined && <Text variant="bodySmall" style={styles.detailText}>⛽ {log.liters} L</Text>}
                  {log.consumption !== undefined && <Text variant="bodySmall" style={[styles.detailText, {color: theme.colors.primary, fontWeight: 'bold'}]}>📈 {log.consumption.toFixed(2)} L/100km</Text>}
                  {log.is_full_tank !== undefined && <Text variant="bodySmall" style={styles.detailText}>{log.is_full_tank ? '✅ Full Tank' : '❌ Part Tank'}</Text>}
                </View>

                {expandedLogId === log.id && (
                  <>
                    {log.raw_event?.service_items && log.raw_event.service_items.length > 0 && (
                      <View style={styles.expandedItemsContainer}>
                        <Text variant="titleSmall" style={{ marginTop: 12, marginBottom: 8, opacity: 0.8 }}>Service Items:</Text>
                        {log.raw_event.service_items.map((item: any, idx: number) => (
                          <View key={idx} style={styles.serviceItemRow}>
                            <View style={{ flex: 1 }}>
                              <Text variant="bodyMedium">• {item.service_type}</Text>
                              {!!item.note && <Text variant="bodySmall" style={{ opacity: 0.6, marginLeft: 12, marginTop: -2 }}>{item.note}</Text>}
                            </View>
                            <Text variant="bodyMedium" style={{ opacity: 0.7 }}>€{formatNumber(item.price || 0)}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    <View style={styles.actionButtonsRow}>
                      <Button mode="outlined" icon="pencil" onPress={() => handleEdit(log)} style={{ flex: 1, marginRight: 8 }}>Edit</Button>
                      <Button mode="contained" icon="delete" buttonColor={theme.colors.error} onPress={() => handleDelete(log.id)} style={{ flex: 1 }}>Delete</Button>
                    </View>
                  </>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB.Group
        open={fabOpen}
        visible
        icon={fabOpen ? 'close' : 'plus'}
        actions={[
          {
            icon: 'gas-station',
            label: 'Add Refuel',
            onPress: () => router.push('/add-refuel'),
          },
          {
            icon: 'wrench',
            label: 'Add Maintenance',
            onPress: () => router.push('/add-maintenance'),
          },
          {
            icon: 'shopping',
            label: 'Add Accessory',
            onPress: () => router.push('/add-accessory'),
          },
          {
            icon: 'cash',
            label: 'Add Expense',
            onPress: () => router.push('/add-expense'),
          },
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
        onPress={() => {
          if (fabOpen) {
            // do something if the speed dial is open
          }
        }}
      />
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
  searchbar: {
    marginBottom: 12,
    elevation: 0,
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
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ffffff30',
  }
});
