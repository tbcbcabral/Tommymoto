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
  flags: {
    enableMultiTabs: false
  }
});

export const setupPowerSync = async () => {
  try {
    await powerSync.init();
    
    const connector = createSupabaseConnector();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      try {
        await powerSync.connect(connector);
      } catch (e: any) {
        alert("Init Connect Error: " + e.message);
      }
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        if (!powerSync.connected) {
          try {
            await powerSync.connect(connector);
          } catch (e: any) {
            alert("Auth Connect Error: " + e.message);
          }
        }
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
