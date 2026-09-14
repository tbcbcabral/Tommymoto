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
    
    let hasAttemptedConnect = false;
    const safeConnect = async () => {
      if (hasAttemptedConnect || powerSync.connected) return;
      hasAttemptedConnect = true;
      try {
        console.log("Calling powerSync.connect");
        await powerSync.connect(connector);
        console.log("powerSync.connect finished");
      } catch (e: any) {
        console.error("Connect Error: " + e.message);
        hasAttemptedConnect = false; // allow retry if it failed synchronously
      }
    };

    if (session) {
      await safeConnect();
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await safeConnect();
      } else {
        hasAttemptedConnect = false;
        await powerSync.disconnectAndClear();
      }
    });

    powerSync.registerListener({
      errorEvent: (error) => {
        console.error("PowerSync async error:", error);
      },
      statusChanged: (status) => {
        console.log("PowerSync Status:", status);
      }
    });

  } catch (error: any) {
    console.error("Error setting up PowerSync:", error);
  }
};
