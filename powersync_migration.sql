-- PowerSync Requires UUIDs for Primary Keys.
-- This script will drop existing tables and recreate them with UUIDs.
-- WARNING: THIS WILL DELETE ALL EXISTING APP DATA.

DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS service_items CASCADE;
DROP TABLE IF EXISTS maintenance_events CASCADE;
DROP TABLE IF EXISTS refueling_events CASCADE;
DROP TABLE IF EXISTS accessories CASCADE;
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;

-- 1. Create the vehicles table
CREATE TABLE vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  license_plate TEXT,
  vin TEXT,
  is_default BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  default_fuel_type TEXT,
  alias TEXT,
  profile_photo_uri TEXT
);

-- 2. Create the refueling_events table
CREATE TABLE refueling_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  liters REAL NOT NULL,
  fuel_type TEXT,
  petrol_station_brand TEXT,
  total_price REAL NOT NULL,
  odometer INTEGER NOT NULL,
  is_full_tank BOOLEAN DEFAULT true
);

-- 3. Create the maintenance_events table
CREATE TABLE maintenance_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  garage TEXT,
  odometer INTEGER NOT NULL,
  receipt_image_uri TEXT
);

-- 4. Create the service_items table
CREATE TABLE service_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_event_id UUID REFERENCES maintenance_events(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  price REAL NOT NULL,
  note TEXT
);

-- 5. Create the accessories table
CREATE TABLE accessories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  shop TEXT,
  date TEXT NOT NULL,
  receipt_image_uri TEXT
);

-- 6. Create the expenses table
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  expense_type TEXT NOT NULL,
  price REAL NOT NULL,
  date TEXT NOT NULL,
  notes TEXT
);

-- 7. Create the reminders table
CREATE TABLE reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  interval_kms INTEGER,
  notify_before_kms INTEGER,
  interval_months INTEGER,
  repeat_interval_days INTEGER,
  active_notification_ids TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Enable Row Level Security (RLS) on all tables
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE refueling_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS Policies
-- Users can only see and modify their own vehicles
CREATE POLICY "Users can manage their own vehicles" 
  ON vehicles FOR ALL USING (auth.uid() = user_id);

-- Refueling Events policy (joined through vehicles)
CREATE POLICY "Users can manage their own refueling events" 
  ON refueling_events FOR ALL USING (
    vehicle_id IN (SELECT id FROM vehicles WHERE user_id = auth.uid())
  );

-- Maintenance Events policy
CREATE POLICY "Users can manage their own maintenance events" 
  ON maintenance_events FOR ALL USING (
    vehicle_id IN (SELECT id FROM vehicles WHERE user_id = auth.uid())
  );

-- Service Items policy
CREATE POLICY "Users can manage their own service items" 
  ON service_items FOR ALL USING (
    maintenance_event_id IN (
      SELECT id FROM maintenance_events WHERE vehicle_id IN (
        SELECT id FROM vehicles WHERE user_id = auth.uid()
      )
    )
  );

-- Accessories policy
CREATE POLICY "Users can manage their own accessories" 
  ON accessories FOR ALL USING (
    vehicle_id IN (SELECT id FROM vehicles WHERE user_id = auth.uid())
  );

-- Expenses policy
CREATE POLICY "Users can manage their own expenses" 
  ON expenses FOR ALL USING (
    vehicle_id IN (SELECT id FROM vehicles WHERE user_id = auth.uid())
  );

-- Reminders policy
CREATE POLICY "Users can manage their own reminders" 
  ON reminders FOR ALL USING (
    vehicle_id IN (SELECT id FROM vehicles WHERE user_id = auth.uid())
  );
