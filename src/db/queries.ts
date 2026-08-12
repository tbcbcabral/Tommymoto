import { getDb } from './sqlite';

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  license_plate: string;
  year: number;
  alias: string;
  is_default: number;
  default_fuel_type: string;
  profile_photo_uri: string;
}

export const addVehicle = async (vehicle: Omit<Vehicle, 'id'>) => {
  try {
    console.log("Adding vehicle with data:", vehicle);
    const db = await getDb();
    const result = await db.runAsync(
    'INSERT INTO vehicles (make, model, license_plate, year, alias, is_default, default_fuel_type, profile_photo_uri) VALUES ($make, $model, $license_plate, $year, $alias, $is_default, $default_fuel_type, $profile_photo_uri)',
    {
      $make: vehicle.make || '',
      $model: vehicle.model || '',
      $license_plate: vehicle.license_plate || '',
      $year: vehicle.year,
      $alias: vehicle.alias || '',
      $is_default: vehicle.is_default || 0,
      $default_fuel_type: vehicle.default_fuel_type || '',
      $profile_photo_uri: vehicle.profile_photo_uri || ''
    }
    );
    console.log("✅ Vehicle inserted, row ID:", result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error("❌ Failed to insert vehicle:", error);
    throw error;
  }
};

export const getVehicles = async (): Promise<Vehicle[]> => {
  const db = await getDb();
  return await db.getAllAsync<Vehicle>('SELECT * FROM vehicles ORDER BY id DESC');
};

export const setDefaultVehicle = async (id: number) => {
  const db = await getDb();
  await db.runAsync('UPDATE vehicles SET is_default = 0');
  await db.runAsync('UPDATE vehicles SET is_default = 1 WHERE id = ?', id);
};

export const deleteVehicle = async (id: number) => {
  const db = await getDb();
  await db.runAsync('DELETE FROM vehicles WHERE id = ?', id);
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
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO refueling_events (vehicle_id, date, liters, fuel_type, petrol_station_brand, total_price, odometer, is_full_tank) VALUES ($vehicle_id, $date, $liters, $fuel_type, $petrol_station_brand, $total_price, $odometer, $is_full_tank)',
    {
      $vehicle_id: event.vehicle_id,
      $date: event.date,
      $liters: event.liters,
      $fuel_type: event.fuel_type || '',
      $petrol_station_brand: event.petrol_station_brand || '',
      $total_price: event.total_price,
      $odometer: event.odometer,
      $is_full_tank: event.is_full_tank ?? 1
    }
  );
  return result.lastInsertRowId;
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
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO maintenance_events (vehicle_id, date, garage, odometer, receipt_image_uri) VALUES ($vehicle_id, $date, $garage, $odometer, $receipt_image_uri)',
    {
      $vehicle_id: event.vehicle_id,
      $date: event.date,
      $garage: event.garage || '',
      $odometer: event.odometer,
      $receipt_image_uri: event.receipt_image_uri || ''
    }
  );
  return result.lastInsertRowId;
};
