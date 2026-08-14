import { getReminders, getAllLogs, updateReminderNotifications } from '../db/queries';
import { cancelReminderNotifications, scheduleRepeatingBatch } from './notifications';

export async function evaluateAndTriggerDistanceReminders(vehicleId: number, currentOdo: number) {
  const allReminders = await getReminders();
  const vReminders = allReminders.filter(r => r.vehicle_id === vehicleId && r.interval_kms);
  
  if (vReminders.length === 0) return;

  const logsData = await getAllLogs();
  const vehicleLogs = logsData.filter(l => l.vehicle_id === vehicleId);
  const maintenanceLogs = vehicleLogs.filter(l => l.type === 'maintenance');

  for (const r of vReminders) {
    let lastServiceOdo = -1;
    
    for (const log of maintenanceLogs) {
      if (log.service_items?.some(i => i.service_type.toLowerCase().trim() === r.service_type.toLowerCase().trim())) {
        if ((log.odometer || 0) > lastServiceOdo) {
          lastServiceOdo = log.odometer || 0;
        }
      }
    }

    if (lastServiceOdo === -1) continue; // Never performed, can't measure distance

    const targetOdo = lastServiceOdo + (r.interval_kms || 0);
    const warningOdo = targetOdo - (r.notify_before_kms || 0);

    // If we crossed the warning threshold, AND we haven't already scheduled a batch of notifications for this reminder
    if (currentOdo >= warningOdo && !r.active_notification_ids) {
      // Trigger!
      // Start the batch right now
      const newIds = await scheduleRepeatingBatch(
        r.vehicle_name || 'Vehicle',
        r.service_type,
        new Date(),
        r.repeat_interval_days
      );
      
      // Save the active notification IDs to the DB so we don't trigger it again on every refuel
      await updateReminderNotifications(r.id, newIds);
    }
  }
}

export async function handleMaintenanceLogged(vehicleId: number, serviceTypes: string[]) {
  const allReminders = await getReminders();
  const vReminders = allReminders.filter(r => r.vehicle_id === vehicleId);

  for (const r of vReminders) {
    // If the logged service matches this reminder
    if (serviceTypes.some(t => t.toLowerCase().trim() === r.service_type.toLowerCase().trim())) {
      
      // 1. Cancel any active nagging notifications for this reminder
      if (r.active_notification_ids) {
        await cancelReminderNotifications(r.active_notification_ids);
        await updateReminderNotifications(r.id, null);
      }

      // 2. If it's a TIME-BASED reminder, schedule the NEXT batch starting Y months from now
      if (r.interval_months) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() + r.interval_months);
        
        const newIds = await scheduleRepeatingBatch(
          r.vehicle_name || 'Vehicle',
          r.service_type,
          startDate,
          r.repeat_interval_days
        );
        
        await updateReminderNotifications(r.id, newIds);
      }
    }
  }
}

export async function initializeReminder(reminderId: number) {
  const allReminders = await getReminders();
  const r = allReminders.find(rem => rem.id === reminderId);
  if (!r) return;

  const logsData = await getAllLogs();
  const maintenanceLogs = logsData.filter(l => l.vehicle_id === r.vehicle_id && l.type === 'maintenance');
  
  let lastServiceDate = new Date();
  
  // Find last time it was performed
  for (const log of maintenanceLogs) {
    if (log.service_items?.some(i => i.service_type.toLowerCase().trim() === r.service_type.toLowerCase().trim())) {
      const d = new Date(log.date);
      if (d > lastServiceDate) {
        lastServiceDate = d;
      }
    }
  }

  if (r.interval_months) {
    const startDate = new Date(lastServiceDate);
    startDate.setMonth(startDate.getMonth() + r.interval_months);
    
    // If the date has already passed, start nagging now!
    if (startDate.getTime() < Date.now()) {
      startDate.setTime(Date.now());
    }

    const newIds = await scheduleRepeatingBatch(
      r.vehicle_name || 'Vehicle',
      r.service_type,
      startDate,
      r.repeat_interval_days
    );
    await updateReminderNotifications(r.id, newIds);
  }
}
