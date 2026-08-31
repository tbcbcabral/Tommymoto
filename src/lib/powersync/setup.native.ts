import { PowerSyncDatabase } from '@powersync/react-native';
import { AppSchema } from './AppSchema';
import { createSupabaseConnector } from './SupabaseConnector';
import { supabase } from '../supabase';

export const powerSync = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'mototommy_v2.sqlite'
  }
});

export const setupPowerSync = async () => {
  try {
    await powerSync.init();
    
    // Connect to Supabase
    const connector = createSupabaseConnector();
    
    // Check if we have an active session right now
    const { data: { session } } = await supabase.auth.getSession();
    
    let isConnecting = false;
    const safeConnect = async () => {
      if (isConnecting || powerSync.connected) return;
      isConnecting = true;
      try {
        await powerSync.connect(connector);
      } catch (e: any) {
        console.error("Connect Error:", e.message);
      } finally {
        isConnecting = false;
      }
    };

    if (session) {
      await safeConnect();
    }

    // Listen to Supabase auth changes to connect/disconnect dynamically
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await safeConnect();
      } else {
        await powerSync.disconnectAndClear();
      }
    });

  } catch (error) {
    console.error("Error setting up PowerSync:", error);
  }
};
