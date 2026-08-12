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
  return data.id;
};
