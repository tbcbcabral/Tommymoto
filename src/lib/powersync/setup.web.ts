import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from './AppSchema';
import { createSupabaseConnector } from './SupabaseConnector';
import { supabase } from '../supabase';
import { syncDirectFromSupabase } from '../directSync';

const getWorkerPath = () => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return '/@powersync/worker.js';
  }
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/Tommymoto')) {
    return '/Tommymoto/@powersync/worker.js';
  }
  return '/@powersync/worker.js';
};

export const powerSync = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'mototommy_v2.sqlite',
    worker: getWorkerPath()
  },
  logger: {
    log: (event: any) => {
      const isWarnOrErr = typeof event.level === 'number' ? event.level >= 40 : event.level === 'warn' || event.level === 'error';
      if (isWarnOrErr) {
        console.warn(`PS [${event.level}]: ${event.message}`, event.error || '');
      }
    }
  },
  flags: {
    enableMultiTabs: false
  }
});

export const setupPowerSync = async () => {
  try {
    // 1. Initialize local web SQLite/OPFS/IDB database
    await powerSync.init();
    
    const connector = createSupabaseConnector();

    let connectionPromise: Promise<void> | null = null;
    const safeConnect = async () => {
      if (powerSync.connected || connectionPromise) return;
      connectionPromise = powerSync.connect(connector);
      try {
        await connectionPromise;
      } catch (e: any) {
        console.warn("PowerSync Web Connect (background):", e.message);
      } finally {
        connectionPromise = null;
      }
    };

    // 2. Connect in background and run direct Supabase sync if session exists
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        syncDirectFromSupabase().catch(() => {});
        safeConnect();
      }
    }).catch(() => {
      // Offline mode: local database remains queryable
    });

    // 3. Listen to auth changes without wiping local database
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        syncDirectFromSupabase().catch(() => {});
        safeConnect();
      } else if (event === 'SIGNED_OUT') {
        connectionPromise = null;
        // Disconnect sync stream on sign-out, but keep local data intact!
        await powerSync.disconnect();
      }
    });

  } catch (error: any) {
    console.error("Error setting up PowerSync Web:", error);
  }
};
