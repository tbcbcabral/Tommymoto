import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from './AppSchema';
import { createSupabaseConnector } from './SupabaseConnector';
import { supabase } from '../supabase';

export const powerSync = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'mototommy_v2.sqlite',
    worker: (typeof __DEV__ !== 'undefined' && __DEV__) ? '/@powersync/worker.js' : '/Tommymoto/@powersync/worker.js'
  },
  logger: {
    log: (event) => console.log(`PS [${event.level}]: ${event.message}`, event.error || '')
  },
  flags: {
    enableMultiTabs: false
  }
});

export const setupPowerSync = async () => {
  try {
    await powerSync.init();
    
    const connector = createSupabaseConnector();
    
    const { data: { session } } = await supabase.auth.getSession();
    
    let isConnecting = false;
    const safeConnect = async () => {
      if (isConnecting || powerSync.connected) return;
      isConnecting = true;
      try {
        await powerSync.connect(connector);
      } catch (e: any) {
        alert("Connect Error: " + e.message);
      } finally {
        isConnecting = false;
      }
    };

    if (session) {
      await safeConnect();
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await safeConnect();
      } else {
        await powerSync.disconnectAndClear();
      }
    });

    powerSync.registerListener({
      errorEvent: (error) => {
        console.error("PowerSync async error:", error);
        alert("PowerSync Async Error: " + error.message);
      },
      statusChanged: (status) => {
        console.log("PowerSync Status:", status);
      }
    });

  } catch (error: any) {
    console.error("Error setting up PowerSync:", error);
    alert("PowerSync Setup Error: " + error.message);
  }
};
