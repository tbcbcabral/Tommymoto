import { PowerSyncDatabase } from '@powersync/react-native';
import { AppSchema } from './AppSchema';
import { createSupabaseConnector } from './SupabaseConnector';
import { supabase } from '../supabase';

export const powerSync = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'mototommy_v2.sqlite',
  },
  logger: {
    log: (event: any) => {
      const isWarnOrErr = typeof event.level === 'number' ? event.level >= 40 : event.level === 'warn' || event.level === 'error';
      if (isWarnOrErr) {
        console.warn(`PS [${event.level}]: ${event.message}`, event.error || '');
      }
    }
  },
});

export const setupPowerSync = async () => {
  try {
    // 1. Initialize local SQLite database (instant & offline)
    await powerSync.init();
    
    const connector = createSupabaseConnector();
    
    let isConnecting = false;
    const safeConnect = async () => {
      if (isConnecting || powerSync.connected) return;
      isConnecting = true;
      try {
        await powerSync.connect(connector);
      } catch (e: any) {
        console.warn("PowerSync Connect (background):", e.message);
      } finally {
        isConnecting = false;
      }
    };

    // 2. Try to connect in background if session exists
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        safeConnect();
      }
    }).catch(() => {
      // Offline: keep local database accessible
    });

    // 3. Listen to Supabase auth changes without wiping local database
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        safeConnect();
      } else if (event === 'SIGNED_OUT') {
        // Disconnect sync stream on sign-out, but keep local data intact!
        await powerSync.disconnect();
      }
    });

  } catch (error) {
    console.error("Error setting up PowerSync:", error);
  }
};
