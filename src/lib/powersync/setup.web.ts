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
    
    powerSync.registerListener({
      errorEvent: (error) => {
        console.error("PowerSync async error:", error);
      },
      statusChanged: (status) => {
        console.log("PowerSync Status changed:", status);
      }
    });

    let connectionPromise: Promise<void> | null = null;
    const safeConnect = async () => {
      if (powerSync.connected || connectionPromise) return;
      console.log("Starting new connection...");
      connectionPromise = powerSync.connect(connector);
      try {
        await connectionPromise;
        console.log("powerSync.connect resolved successfully");
      } catch (e: any) {
        console.error("Connect Error:", e.message);
      } finally {
        connectionPromise = null;
      }
    };

    if (session) {
      safeConnect(); // don't await, let it run in background
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        safeConnect();
      } else {
        connectionPromise = null;
        await powerSync.disconnectAndClear();
      }
    });

  } catch (error: any) {
    console.error("Error setting up PowerSync:", error);
  }
};
