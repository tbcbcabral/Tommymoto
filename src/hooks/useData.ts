import { useQuery } from '@powersync/react';
import { useMemo } from 'react';
import { Vehicle, RefuelingEvent, MaintenanceEvent, Accessory, Reminder, Expense, LogEntry } from '../db/queries';

export function useVehicles() {
  const { data } = useQuery<Vehicle>('SELECT * FROM vehicles WHERE is_archived = 0 ORDER BY id DESC');
  return data.map(v => ({ ...v, is_default: v.is_default ? 1 : 0 }));
}

export function useArchivedVehicles() {
  const { data } = useQuery<Vehicle>('SELECT * FROM vehicles WHERE is_archived = 1 ORDER BY id DESC');
  return data.map(v => ({ ...v, is_default: v.is_default ? 1 : 0 }));
}

export function useReminders() {
  const { data } = useQuery<Reminder>('SELECT * FROM reminders ORDER BY created_at DESC');
  return data;
}

export function useExpenses(vehicleId?: string) {
  const query = vehicleId 
    ? 'SELECT * FROM expenses WHERE vehicle_id = ? ORDER BY date DESC'
    : 'SELECT * FROM expenses ORDER BY date DESC';
  const args = vehicleId ? [vehicleId] : [];
  const { data } = useQuery<Expense>(query, args);
  return data;
}

export function useAllLogs() {
  const { data: refuels } = useQuery<RefuelingEvent>('SELECT * FROM refueling_events');
  const { data: maintenance } = useQuery<MaintenanceEvent>('SELECT * FROM maintenance_events');
  const { data: accessories } = useQuery<Accessory>('SELECT * FROM accessories');
  const { data: serviceItems } = useQuery<{maintenance_event_id: string, price: number, service_type: string}>('SELECT * FROM service_items');
  const { data: vehicles } = useQuery<{id: string, alias: string, make: string, model: string}>('SELECT id, make, model, alias FROM vehicles WHERE is_archived = 0');

  return useMemo(() => {
    const logs: LogEntry[] = [];
    
    const getVehicleName = (vid: string) => {
      const v = (vehicles || []).find(v => v.id === vid);
      if (!v) return 'Unknown Vehicle';
      return v.alias || `${v.make} ${v.model}`;
    };

    const refuelsByVehicle: Record<string, RefuelingEvent[]> = {};
    (refuels || []).forEach(r => {
      if (!refuelsByVehicle[r.vehicle_id]) refuelsByVehicle[r.vehicle_id] = [];
      refuelsByVehicle[r.vehicle_id].push(r);
    });

    Object.values(refuelsByVehicle).forEach(vehicleRefuels => {
      vehicleRefuels.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || (a.odometer || 0) - (b.odometer || 0));
      
      let lastFullTankOdo: number | null = null;
      let litersSinceLastFullTank = 0;

      vehicleRefuels.forEach(r => {
        let consumption: number | undefined;

        if (r.is_full_tank === 1 && lastFullTankOdo !== null && r.odometer && r.odometer > lastFullTankOdo) {
          const distance = r.odometer - lastFullTankOdo;
          const totalLiters = litersSinceLastFullTank + (r.liters || 0);
          consumption = (totalLiters / distance) * 100;
        }

        if (r.is_full_tank === 1 && r.odometer) {
          lastFullTankOdo = r.odometer;
          litersSinceLastFullTank = 0;
        } else if (r.is_full_tank === 0 || r.is_full_tank === null) {
          litersSinceLastFullTank += (r.liters || 0);
        }

        logs.push({
          id: `refuel-${r.id}`,
          type: 'refuel',
          vehicle_id: r.vehicle_id,
          vehicle_name: getVehicleName(r.vehicle_id),
          date: r.date,
          title: `Refuel: ${r.liters}L`,
          subtitle: `${r.fuel_type || 'Fuel'} ${r.petrol_station_brand ? `at ${r.petrol_station_brand}` : ''}`,
          price: r.total_price,
          odometer: r.odometer,
          liters: r.liters,
          is_full_tank: r.is_full_tank === 1,
          brand: r.petrol_station_brand,
          consumption,
          raw_event: r
        });
      });
    });

    (maintenance || []).forEach(m => {
      const items = (serviceItems || []).filter(i => i.maintenance_event_id === m.id);
      const totalMaintPrice = items.reduce((sum, item) => sum + item.price, 0);
      const serviceTypes = items.map(i => i.service_type).join(', ');

      logs.push({
        id: `maint-${m.id}`,
        type: 'maintenance',
        vehicle_id: m.vehicle_id,
        vehicle_name: getVehicleName(m.vehicle_id),
        date: m.date,
        title: 'Maintenance',
        subtitle: serviceTypes || m.garage || 'Service',
        price: totalMaintPrice,
        odometer: m.odometer,
        raw_event: { ...m, service_items: items }
      });
    });

    (accessories || []).forEach(a => {
      logs.push({
        id: `acc-${a.id}`,
        type: 'accessory',
        vehicle_id: a.vehicle_id,
        vehicle_name: getVehicleName(a.vehicle_id),
        date: a.date,
        title: 'Accessory',
        subtitle: a.name,
        price: a.price,
        raw_event: a
      });
    });

    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [refuels, maintenance, accessories, serviceItems, vehicles]);
}
