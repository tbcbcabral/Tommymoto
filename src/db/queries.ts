import { supabase } from '../lib/supabase';
import { powerSync } from '../lib/powersync/setup';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  license_plate: string;
  year: number;
  alias: string;
  is_default: number;
  default_fuel_type: string;
  profile_photo_uri: string;
  is_archived: boolean;
  user_id?: string;
}

const getUserId = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id;
};

export const addVehicle = async (vehicle: Omit<Vehicle, 'id' | 'is_archived' | 'user_id'>) => {
  const id = uuidv4();
  const userId = await getUserId();
  
  await powerSync.execute(
    `INSERT INTO vehicles (id, user_id, make, model, license_plate, year, alias, is_default, default_fuel_type, profile_photo_uri, is_archived) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, userId, vehicle.make || '', vehicle.model || '', vehicle.license_plate || '', 
      vehicle.year, vehicle.alias || '', vehicle.is_default ? 1 : 0, 
      vehicle.default_fuel_type || '', vehicle.profile_photo_uri || '', 0
    ]
  );
  return id;
};

export const getVehicle = async (id: string): Promise<Vehicle> => {
  const data = await powerSync.get<Vehicle>('SELECT * FROM vehicles WHERE id = ?', [id]);
  return { ...data, is_default: data.is_default ? 1 : 0 };
};

export const updateVehicle = async (id: string, vehicle: Partial<Omit<Vehicle, 'id' | 'is_archived'>>) => {
  const updates: string[] = [];
  const params: any[] = [];
  
  for (const [key, value] of Object.entries(vehicle)) {
    updates.push(`${key} = ?`);
    params.push(key === 'is_default' ? (value ? 1 : 0) : value);
  }
  
  if (updates.length === 0) return;
  params.push(id);
  
  await powerSync.execute(`UPDATE vehicles SET ${updates.join(', ')} WHERE id = ?`, params);
};

export const getVehicles = async (): Promise<Vehicle[]> => {
  const data = await powerSync.getAll<Vehicle>('SELECT * FROM vehicles WHERE is_archived = 0 ORDER BY id DESC');
  return data.map(v => ({ ...v, is_default: v.is_default ? 1 : 0 }));
};

export const getArchivedVehicles = async (): Promise<Vehicle[]> => {
  const data = await powerSync.getAll<Vehicle>('SELECT * FROM vehicles WHERE is_archived = 1 ORDER BY id DESC');
  return data.map(v => ({ ...v, is_default: v.is_default ? 1 : 0 }));
};

export const setDefaultVehicle = async (id: string) => {
  await powerSync.writeTransaction(async (tx) => {
    await tx.execute('UPDATE vehicles SET is_default = 0');
    await tx.execute('UPDATE vehicles SET is_default = 1 WHERE id = ?', [id]);
  });
};

export const archiveVehicle = async (id: string) => {
  await powerSync.execute('UPDATE vehicles SET is_archived = 1, is_default = 0 WHERE id = ?', [id]);
};

export const restoreVehicle = async (id: string) => {
  await powerSync.execute('UPDATE vehicles SET is_archived = 0 WHERE id = ?', [id]);
};

export const permanentlyDeleteVehicle = async (id: string) => {
  await powerSync.execute('DELETE FROM vehicles WHERE id = ?', [id]);
};

// --- Refueling ---

export type RefuelingEvent = {
  id: string;
  vehicle_id: string;
  date: string;
  liters: number;
  fuel_type: string;
  petrol_station_brand: string;
  total_price: number;
  odometer: number;
  is_full_tank: number;
};

export const addRefuelingEvent = async (event: Omit<RefuelingEvent, 'id'>) => {
  const id = uuidv4();
  await powerSync.execute(
    `INSERT INTO refueling_events (id, vehicle_id, date, liters, fuel_type, petrol_station_brand, total_price, odometer, is_full_tank) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, event.vehicle_id, event.date, event.liters, event.fuel_type || '', 
      event.petrol_station_brand || '', event.total_price, event.odometer, 
      event.is_full_tank ?? 1
    ]
  );
  return id;
};

export const getRefuelingEvent = async (id: string): Promise<RefuelingEvent> => {
  return await powerSync.get<RefuelingEvent>('SELECT * FROM refueling_events WHERE id = ?', [id]);
};

export const updateRefuelingEvent = async (id: string, event: Omit<RefuelingEvent, 'id'>) => {
  await powerSync.execute(
    `UPDATE refueling_events SET vehicle_id=?, date=?, liters=?, fuel_type=?, petrol_station_brand=?, total_price=?, odometer=?, is_full_tank=? WHERE id=?`,
    [event.vehicle_id, event.date, event.liters, event.fuel_type || '', event.petrol_station_brand || '', event.total_price, event.odometer, event.is_full_tank ?? 1, id]
  );
};

// --- Maintenance ---

export type MaintenanceEvent = {
  id: string;
  vehicle_id: string;
  date: string;
  garage: string;
  odometer: number;
  receipt_image_uri: string;
  items?: { service_type: string; price: number; note?: string }[];
};

export const addMaintenanceEvent = async (event: Omit<MaintenanceEvent, 'id'>) => {
  const id = uuidv4();
  await powerSync.writeTransaction(async (tx) => {
    await tx.execute(
      `INSERT INTO maintenance_events (id, vehicle_id, date, garage, odometer, receipt_image_uri) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, event.vehicle_id, event.date, event.garage || '', event.odometer, event.receipt_image_uri || '']
    );

    if (event.items && event.items.length > 0) {
      for (const item of event.items) {
        await tx.execute(
          `INSERT INTO service_items (id, maintenance_event_id, service_type, price, note) VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), id, item.service_type || 'General Service', item.price || 0, item.note || '']
        );
      }
    }
  });
  return id;
};

export const getMaintenanceEvent = async (id: string): Promise<MaintenanceEvent> => {
  const event = await powerSync.get<MaintenanceEvent>('SELECT * FROM maintenance_events WHERE id = ?', [id]);
  const items = await powerSync.getAll<any>('SELECT * FROM service_items WHERE maintenance_event_id = ?', [id]);
  return { ...event, items };
};

export const updateMaintenanceEvent = async (id: string, event: Omit<MaintenanceEvent, 'id'>) => {
  await powerSync.writeTransaction(async (tx) => {
    await tx.execute(
      `UPDATE maintenance_events SET vehicle_id=?, date=?, garage=?, odometer=?, receipt_image_uri=? WHERE id=?`,
      [event.vehicle_id, event.date, event.garage || '', event.odometer, event.receipt_image_uri || '', id]
    );

    await tx.execute(`DELETE FROM service_items WHERE maintenance_event_id=?`, [id]);
    if (event.items && event.items.length > 0) {
      for (const item of event.items) {
        await tx.execute(
          `INSERT INTO service_items (id, maintenance_event_id, service_type, price, note) VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), id, item.service_type || 'General Service', item.price || 0, item.note || '']
        );
      }
    }
  });
};

// --- Accessory ---

export type Accessory = {
  id: string;
  vehicle_id: string;
  name: string;
  price: number;
  shop: string;
  date: string;
  receipt_image_uri: string;
};

export const addAccessory = async (accessory: Omit<Accessory, 'id'>) => {
  const id = uuidv4();
  await powerSync.execute(
    `INSERT INTO accessories (id, vehicle_id, name, price, shop, date, receipt_image_uri) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, accessory.vehicle_id, accessory.name || '', accessory.price, accessory.shop || '', accessory.date, accessory.receipt_image_uri || '']
  );
  return id;
};

export const getAccessory = async (id: string): Promise<Accessory> => {
  return await powerSync.get<Accessory>('SELECT * FROM accessories WHERE id = ?', [id]);
};

export const updateAccessory = async (id: string, accessory: Omit<Accessory, 'id'>) => {
  await powerSync.execute(
    `UPDATE accessories SET vehicle_id=?, name=?, price=?, shop=?, date=?, receipt_image_uri=? WHERE id=?`,
    [accessory.vehicle_id, accessory.name || '', accessory.price, accessory.shop || '', accessory.date, accessory.receipt_image_uri || '', id]
  );
};

export const getAccessories = async () => {
  return await powerSync.getAll(`
    SELECT a.*, v.alias as vehicle_name 
    FROM accessories a
    LEFT JOIN vehicles v ON a.vehicle_id = v.id
    ORDER BY a.date DESC
  `);
};

// --- Logs & Utility ---

export type LogEntry = {
  id: string;
  type: 'refuel' | 'maintenance' | 'accessory';
  vehicle_id: string;
  vehicle_name: string;
  date: string;
  title: string;
  subtitle: string;
  price: number;
  brand?: string;
  liters?: number;
  odometer?: number;
  is_full_tank?: boolean;
  consumption?: number;
  service_items?: { service_type: string; price: number; note?: string }[];
  raw_event?: any;
};

// getAllLogs is handled reactively by useAllLogs in hooks/useData.ts, keeping a stub if needed
export const getAllLogs = async (): Promise<LogEntry[]> => {
  return []; 
};

export const deleteLog = async (logId: string) => {
  if (logId.startsWith('refuel-')) {
    await powerSync.execute('DELETE FROM refueling_events WHERE id = ?', [logId.replace('refuel-', '')]);
  } else if (logId.startsWith('maint-')) {
    const id = logId.replace('maint-', '');
    await powerSync.writeTransaction(async (tx) => {
      await tx.execute('DELETE FROM service_items WHERE maintenance_event_id = ?', [id]);
      await tx.execute('DELETE FROM maintenance_events WHERE id = ?', [id]);
    });
  } else if (logId.startsWith('acc-')) {
    await powerSync.execute('DELETE FROM accessories WHERE id = ?', [logId.replace('acc-', '')]);
  }
};

export const getUniqueValues = async (table: string, column: string): Promise<string[]> => {
  // Use raw SQL dynamically
  const data = await powerSync.getAll<{val: string}>(`SELECT DISTINCT ${column} as val FROM ${table} WHERE ${column} IS NOT NULL AND ${column} != ''`);
  return data.map(d => d.val).sort((a, b) => a.localeCompare(b));
};

// --- Reminders ---

export type Reminder = {
  id: string;
  vehicle_id: string;
  service_type: string;
  interval_kms: number | null;
  notify_before_kms: number | null;
  interval_months: number | null;
  repeat_interval_days: number | null;
  active_notification_ids?: string | null;
  created_at?: string;
  vehicle_name?: string;
};

export const getReminders = async (): Promise<Reminder[]> => {
  const data = await powerSync.getAll<Reminder>('SELECT * FROM reminders ORDER BY created_at DESC');
  return data;
};

export const addReminder = async (reminder: Omit<Reminder, 'id' | 'created_at' | 'vehicle_name'>) => {
  const id = uuidv4();
  await powerSync.execute(
    `INSERT INTO reminders (id, vehicle_id, service_type, interval_kms, notify_before_kms, interval_months, repeat_interval_days, active_notification_ids) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, reminder.vehicle_id, reminder.service_type, reminder.interval_kms, reminder.notify_before_kms, reminder.interval_months, reminder.repeat_interval_days, reminder.active_notification_ids]
  );
  return id;
};

export const updateReminder = async (id: string, reminder: Partial<Omit<Reminder, 'id' | 'created_at' | 'vehicle_name' | 'active_notification_ids'>>) => {
  const updates: string[] = [];
  const params: any[] = [];
  
  for (const [key, value] of Object.entries(reminder)) {
    updates.push(`${key} = ?`);
    params.push(value);
  }
  
  if (updates.length === 0) return;
  params.push(id);
  
  await powerSync.execute(`UPDATE reminders SET ${updates.join(', ')} WHERE id = ?`, params);
};

export const updateReminderNotifications = async (id: string, active_notification_ids: string | null) => {
  await powerSync.execute('UPDATE reminders SET active_notification_ids = ? WHERE id = ?', [active_notification_ids, id]);
};

export const deleteReminder = async (id: string) => {
  const data = await powerSync.get<Reminder>('SELECT active_notification_ids FROM reminders WHERE id = ?', [id]);
  if (data && data.active_notification_ids) {
    import('../lib/notifications').then(mod => {
      mod.cancelReminderNotifications(data.active_notification_ids!);
    });
  }
  await powerSync.execute('DELETE FROM reminders WHERE id = ?', [id]);
};

// --- Expenses ---

export type Expense = {
  id: string;
  vehicle_id: string;
  expense_type: string;
  price: number;
  date: string;
  notes: string;
};

export const addExpense = async (expense: Omit<Expense, 'id'>) => {
  const id = uuidv4();
  await powerSync.execute(
    `INSERT INTO expenses (id, vehicle_id, expense_type, price, date, notes) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, expense.vehicle_id, expense.expense_type, expense.price, expense.date, expense.notes || '']
  );
  return id;
};

export const getExpense = async (id: string): Promise<Expense> => {
  return await powerSync.get<Expense>('SELECT * FROM expenses WHERE id = ?', [id]);
};

export const updateExpense = async (id: string, expense: Omit<Expense, 'id'>) => {
  await powerSync.execute(
    `UPDATE expenses SET vehicle_id=?, expense_type=?, price=?, date=?, notes=? WHERE id=?`,
    [expense.vehicle_id, expense.expense_type, expense.price, expense.date, expense.notes || '', id]
  );
};

export const getExpenses = async (vehicleId?: string): Promise<Expense[]> => {
  if (vehicleId) {
    return await powerSync.getAll<Expense>('SELECT * FROM expenses WHERE vehicle_id = ? ORDER BY date DESC', [vehicleId]);
  }
  return await powerSync.getAll<Expense>('SELECT * FROM expenses ORDER BY date DESC');
};

export const deleteExpense = async (id: string) => {
  await powerSync.execute('DELETE FROM expenses WHERE id = ?', [id]);
};
