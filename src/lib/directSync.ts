import { supabase } from './supabase';
import { powerSync } from './powersync/setup';

export const syncDirectFromSupabase = async (): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return { success: false, count: 0, error: 'No active session' };
    }

    let totalSynced = 0;

    // Fetch all tables from Supabase in parallel
    const [
      vehiclesRes,
      refuelsRes,
      maintenanceRes,
      serviceItemsRes,
      accessoriesRes,
      expensesRes,
      remindersRes
    ] = await Promise.all([
      supabase.from('vehicles').select('*'),
      supabase.from('refueling_events').select('*'),
      supabase.from('maintenance_events').select('*'),
      supabase.from('service_items').select('*'),
      supabase.from('accessories').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('reminders').select('*'),
    ]);

    const vehicles = vehiclesRes.data || [];
    const refuels = refuelsRes.data || [];
    const maintenance = maintenanceRes.data || [];
    const serviceItems = serviceItemsRes.data || [];
    const accessories = accessoriesRes.data || [];
    const expenses = expensesRes.data || [];
    const reminders = remindersRes.data || [];

    totalSynced = vehicles.length + refuels.length + maintenance.length + serviceItems.length + accessories.length + expenses.length + reminders.length;

    await powerSync.writeTransaction(async (tx) => {
      // 1. Vehicles
      for (const v of vehicles) {
        await tx.execute(
          `INSERT OR REPLACE INTO vehicles (id, user_id, make, model, year, license_plate, vin, is_default, is_archived, default_fuel_type, alias, profile_photo_uri)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            v.id, v.user_id, v.make || '', v.model || '', v.year || new Date().getFullYear(),
            v.license_plate || null, v.vin || null, v.is_default ? 1 : 0, v.is_archived ? 1 : 0,
            v.default_fuel_type || null, v.alias || null, v.profile_photo_uri || null
          ]
        );
      }

      // 2. Refueling Events
      for (const r of refuels) {
        await tx.execute(
          `INSERT OR REPLACE INTO refueling_events (id, vehicle_id, date, liters, fuel_type, petrol_station_brand, total_price, odometer, is_full_tank)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.id, r.vehicle_id, r.date, r.liters || 0, r.fuel_type || null,
            r.petrol_station_brand || null, r.total_price || 0, r.odometer || 0,
            r.is_full_tank ? 1 : 0
          ]
        );
      }

      // 3. Maintenance Events
      for (const m of maintenance) {
        await tx.execute(
          `INSERT OR REPLACE INTO maintenance_events (id, vehicle_id, date, garage, odometer, receipt_image_uri)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            m.id, m.vehicle_id, m.date, m.garage || null, m.odometer || 0,
            m.receipt_image_uri || null
          ]
        );
      }

      // 4. Service Items
      for (const s of serviceItems) {
        await tx.execute(
          `INSERT OR REPLACE INTO service_items (id, maintenance_event_id, service_type, price, note)
           VALUES (?, ?, ?, ?, ?)`,
          [
            s.id, s.maintenance_event_id, s.service_type || '', s.price || 0, s.note || null
          ]
        );
      }

      // 5. Accessories
      for (const a of accessories) {
        await tx.execute(
          `INSERT OR REPLACE INTO accessories (id, vehicle_id, name, price, shop, date, receipt_image_uri)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            a.id, a.vehicle_id, a.name || '', a.price || 0, a.shop || null,
            a.date || '', a.receipt_image_uri || null
          ]
        );
      }

      // 6. Expenses
      for (const e of expenses) {
        await tx.execute(
          `INSERT OR REPLACE INTO expenses (id, vehicle_id, expense_type, price, date, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            e.id, e.vehicle_id, e.expense_type || '', e.price || 0, e.date || '',
            e.notes || null
          ]
        );
      }

      // 7. Reminders
      for (const rm of reminders) {
        await tx.execute(
          `INSERT OR REPLACE INTO reminders (id, vehicle_id, service_type, interval_kms, notify_before_kms, interval_months, repeat_interval_days, active_notification_ids, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            rm.id, rm.vehicle_id, rm.service_type || '', rm.interval_kms || null,
            rm.notify_before_kms || null, rm.interval_months || null,
            rm.repeat_interval_days || null, rm.active_notification_ids || null,
            rm.created_at || new Date().toISOString()
          ]
        );
      }
    });

    console.log(`Direct Supabase sync: successfully synced ${totalSynced} items.`);
    return { success: true, count: totalSynced };
  } catch (err: any) {
    console.warn('Direct Supabase sync error:', err.message);
    return { success: false, count: 0, error: err.message };
  }
};
