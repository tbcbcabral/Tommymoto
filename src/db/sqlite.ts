import * as SQLite from 'expo-sqlite';

export const getDb = async () => {
  return await SQLite.openDatabaseAsync('mototommy.db');
};

export const initDb = async () => {
  try {
    const db = await getDb();
    
    await db.runAsync('PRAGMA journal_mode = WAL;');
    await db.runAsync('PRAGMA foreign_keys = ON;');

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      license_plate TEXT,
      year INTEGER,
      alias TEXT,
      is_default INTEGER DEFAULT 0,
      default_fuel_type TEXT,
      profile_photo_uri TEXT
    );
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS refueling_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      liters REAL NOT NULL,
      fuel_type TEXT,
      petrol_station_brand TEXT,
      total_price REAL NOT NULL,
      odometer INTEGER NOT NULL,
      is_full_tank INTEGER DEFAULT 1,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE
    );
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS maintenance_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      garage TEXT,
      odometer INTEGER NOT NULL,
      receipt_image_uri TEXT,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE
    );
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS service_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      maintenance_event_id INTEGER NOT NULL,
      service_type TEXT NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (maintenance_event_id) REFERENCES maintenance_events (id) ON DELETE CASCADE
    );
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS accessories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      shop TEXT,
      date TEXT NOT NULL,
      receipt_image_uri TEXT,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE
    );
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS service_intervals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      service_type TEXT NOT NULL,
      km_delta INTEGER NOT NULL,
      last_service_odometer INTEGER NOT NULL,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE
    );
  `);
    console.log("✅ Database initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
    throw error;
  }
};
