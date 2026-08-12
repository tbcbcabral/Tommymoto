import { supabase } from '../lib/supabase';

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  license_plate: string;
  year: number;
  alias: string;
  is_default: number; // Supabase returns boolean for booleans usually, but let's keep it as number to avoid massive UI refactoring, or we can use boolean. In our schema it's boolean. Let's map it.
  default_fuel_type: string;
  profile_photo_uri: string;
  is_archived: boolean;
}

export const addVehicle = async (vehicle: Omit<Vehicle, 'id' | 'is_archived'>) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .insert([
        {
          make: vehicle.make || '',
          model: vehicle.model || '',
          license_plate: vehicle.license_plate || '',
          year: vehicle.year,
          alias: vehicle.alias || '',
          is_default: Boolean(vehicle.is_default),
          default_fuel_type: vehicle.default_fuel_type || '',
          profile_photo_uri: vehicle.profile_photo_uri || '',
          is_archived: false,
        }
      ])
      .select('id')
      .single();

    if (error) throw error;
    console.log("✅ Vehicle inserted via Supabase, row ID:", data.id);
    return data.id;
  } catch (error) {
    console.error("❌ Failed to insert vehicle to Supabase:", error);
    throw error;
  }
};

export const getVehicles = async (): Promise<Vehicle[]> => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('is_archived', false)
    .order('id', { ascending: false });
    
  if (error) throw error;
  
  // Map boolean back to number for UI compatibility
  return (data || []).map(v => ({
    ...v,
    is_default: v.is_default ? 1 : 0
  }));
};

export const getArchivedVehicles = async (): Promise<Vehicle[]> => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('is_archived', true)
    .order('id', { ascending: false });
    
  if (error) throw error;
  
  return (data || []).map(v => ({
    ...v,
    is_default: v.is_default ? 1 : 0
  }));
};

export const setDefaultVehicle = async (id: number) => {
  try {
    // Reset all to 0
    await supabase.from('vehicles').update({ is_default: false }).neq('id', 0);
    // Set target to 1
    const { error } = await supabase.from('vehicles').update({ is_default: true }).eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error("Failed to set default vehicle:", error);
    throw error;
  }
};

export const archiveVehicle = async (id: number) => {
  try {
    const { error } = await supabase.from('vehicles').update({ is_archived: true, is_default: false }).eq('id', id);
    if (error) throw error;
    console.log("✅ Vehicle archived:", id);
  } catch (error) {
    console.error("Failed to archive vehicle:", error);
    throw error;
  }
};

export const restoreVehicle = async (id: number) => {
  try {
    const { error } = await supabase.from('vehicles').update({ is_archived: false }).eq('id', id);
    if (error) throw error;
    console.log("✅ Vehicle restored:", id);
  } catch (error) {
    console.error("Failed to restore vehicle:", error);
    throw error;
  }
};

// Permanently delete a vehicle
export const permanentlyDeleteVehicle = async (id: number) => {
  try {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error("Failed to permanently delete vehicle:", error);
    throw error;
  }
};

export type RefuelingEvent = {
  id: number;
  vehicle_id: number;
  date: string;
  liters: number;
  fuel_type: string;
  petrol_station_brand: string;
  total_price: number;
  odometer: number;
  is_full_tank: number;
};

export const addRefuelingEvent = async (event: Omit<RefuelingEvent, 'id'>) => {
  const { data, error } = await supabase
    .from('refueling_events')
    .insert([
      {
        vehicle_id: event.vehicle_id,
        date: event.date,
        liters: event.liters,
        fuel_type: event.fuel_type || '',
        petrol_station_brand: event.petrol_station_brand || '',
        total_price: event.total_price,
        odometer: event.odometer,
        is_full_tank: Boolean(event.is_full_tank ?? 1)
      }
    ])
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
};

export type MaintenanceEvent = {
  id: number;
  vehicle_id: number;
  date: string;
  garage: string;
  odometer: number;
  receipt_image_uri: string;
  items?: { service_type: string; price: number }[];
};

export const addMaintenanceEvent = async (event: Omit<MaintenanceEvent, 'id'>) => {
  const { data, error } = await supabase
    .from('maintenance_events')
    .insert([
      {
        vehicle_id: event.vehicle_id,
        date: event.date,
        garage: event.garage || '',
        odometer: event.odometer,
        receipt_image_uri: event.receipt_image_uri || ''
      }
    ])
    .select('id')
    .single();

  if (error) throw error;

  if (event.items && event.items.length > 0) {
    const serviceItemsToInsert = event.items.map(item => ({
      maintenance_event_id: data.id,
      service_type: item.service_type || 'General Service',
      price: item.price || 0
    }));
    
    const { error: itemsError } = await supabase.from('service_items').insert(serviceItemsToInsert);
    if (itemsError) throw itemsError;
  }

  return data.id;
};

export type Accessory = {
  id: number;
  vehicle_id: number;
  name: string;
  price: number;
  shop: string;
  date: string;
  receipt_image_uri: string;
};

export const addAccessory = async (accessory: Omit<Accessory, 'id'>) => {
  const { data, error } = await supabase
    .from('accessories')
    .insert([
      {
        vehicle_id: accessory.vehicle_id,
        name: accessory.name || '',
        price: accessory.price,
        shop: accessory.shop || '',
        date: accessory.date,
        receipt_image_uri: accessory.receipt_image_uri || ''
      }
    ])
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
};

export type LogEntry = {
  id: string; // Unique string for React keys (e.g. "refuel-1")
  type: 'refuel' | 'maintenance' | 'accessory';
  vehicle_id: number;
  vehicle_name: string;
  date: string;
  title: string;
  subtitle: string;
  price: number;
  brand?: string;
  liters?: number;
  odometer?: number;
  is_full_tank?: boolean;
  service_items?: { service_type: string; price: number }[];
};

export const getAllLogs = async (): Promise<LogEntry[]> => {
  const { data: refuels } = await supabase.from('refueling_events').select('*');
  const { data: maintenance } = await supabase.from('maintenance_events').select('*');
  const { data: accessories } = await supabase.from('accessories').select('*');
  const { data: serviceItems } = await supabase.from('service_items').select('*');
  const { data: vehiclesData } = await supabase.from('vehicles').select('id, make, model, alias');

  const logs: LogEntry[] = [];
  
  const getVehicleName = (vid: number) => {
    const v = (vehiclesData || []).find(v => v.id === vid);
    if (!v) return 'Unknown Vehicle';
    return v.alias || `${v.make} ${v.model}`;
  };

  (refuels || []).forEach(r => {
    logs.push({
      id: `refuel-${r.id}`,
      type: 'refuel',
      vehicle_id: r.vehicle_id,
      vehicle_name: getVehicleName(r.vehicle_id),
      date: r.date,
      title: `Refuel (${r.liters}L)`,
      subtitle: r.petrol_station_brand || 'Petrol Station',
      price: r.total_price,
      brand: r.petrol_station_brand || '',
      liters: r.liters,
      odometer: r.odometer,
      is_full_tank: r.is_full_tank,
    });
  });

  (maintenance || []).forEach(m => {
    const items = (serviceItems || []).filter(i => i.maintenance_event_id === m.id);
    const totalPrice = items.reduce((sum, i) => sum + Number(i.price), 0);
    const itemsSummary = items.map(i => i.service_type).join(', ');

    logs.push({
      id: `maint-${m.id}`,
      type: 'maintenance',
      vehicle_id: m.vehicle_id,
      vehicle_name: getVehicleName(m.vehicle_id),
      date: m.date,
      title: itemsSummary || `Maintenance`,
      subtitle: m.garage || 'Garage',
      price: totalPrice,
      brand: m.garage || '',
      odometer: m.odometer,
      service_items: items.map(i => ({ service_type: i.service_type, price: Number(i.price) })),
    });
  });

  (accessories || []).forEach(a => {
    logs.push({
      id: `acc-${a.id}`,
      type: 'accessory',
      vehicle_id: a.vehicle_id,
      vehicle_name: getVehicleName(a.vehicle_id),
      date: a.date,
      title: a.name,
      subtitle: a.shop || 'Shop',
      price: a.price,
      brand: a.shop || '',
    });
  });

  // Sort by date descending (newest first)
  return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getAccessories = async (): Promise<(Accessory & { vehicle_name: string })[]> => {
  const { data: accessories, error } = await supabase
    .from('accessories')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;

  const { data: vehicles } = await supabase.from('vehicles').select('id, make, model, alias');
  const getVehicleName = (vid: number) => {
    const v = (vehicles || []).find(v => v.id === vid);
    if (!v) return 'Unknown Vehicle';
    return v.alias || `${v.make} ${v.model}`;
  };

  return (accessories || []).map(a => ({
    ...a,
    vehicle_name: getVehicleName(a.vehicle_id),
  }));
};

