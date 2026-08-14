import { column, Schema, Table } from '@powersync/react-native';

const vehicles = new Table({
  user_id: column.text,
  make: column.text,
  model: column.text,
  year: column.integer,
  license_plate: column.text,
  vin: column.text,
  is_default: column.integer,
  is_archived: column.integer,
  default_fuel_type: column.text,
  alias: column.text,
  profile_photo_uri: column.text,
});

const refueling_events = new Table({
  vehicle_id: column.text,
  date: column.text,
  liters: column.real,
  fuel_type: column.text,
  petrol_station_brand: column.text,
  total_price: column.real,
  odometer: column.integer,
  is_full_tank: column.integer,
});

const maintenance_events = new Table({
  vehicle_id: column.text,
  date: column.text,
  garage: column.text,
  odometer: column.integer,
  receipt_image_uri: column.text,
});

const service_items = new Table({
  maintenance_event_id: column.text,
  service_type: column.text,
  price: column.real,
  note: column.text,
});

const accessories = new Table({
  vehicle_id: column.text,
  name: column.text,
  price: column.real,
  shop: column.text,
  date: column.text,
  receipt_image_uri: column.text,
});

const expenses = new Table({
  vehicle_id: column.text,
  expense_type: column.text,
  price: column.real,
  date: column.text,
  notes: column.text,
});

const reminders = new Table({
  vehicle_id: column.text,
  service_type: column.text,
  interval_kms: column.integer,
  notify_before_kms: column.integer,
  interval_months: column.integer,
  repeat_interval_days: column.integer,
  active_notification_ids: column.text,
  created_at: column.text,
});

export const AppSchema = new Schema({
  vehicles,
  refueling_events,
  maintenance_events,
  service_items,
  accessories,
  expenses,
  reminders,
});
