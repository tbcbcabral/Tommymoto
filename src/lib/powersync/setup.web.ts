import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from './AppSchema';
import { SupabaseConnector } from './SupabaseConnector';
import { supabase } from '../supabase';

export const powerSync = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'mototommy_v2.sqlite',
    worker: '/Tommymoto/@powersync/worker.js'
  },
  flags: {
    enableMultiTabs: false // Disable multi-tab sync to avoid SharedWorker complexity for now
  }
});

export const setupPowerSync = async () => {
  try {
    await powerSync.init();
    
    // Connect to Supabase
    const connector = new SupabaseConnector();
    
    // Check if we have an active session right now
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await powerSync.connect(connector);
    }

    // Listen to Supabase auth changes to connect/disconnect dynamically
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        if (!powerSync.connected) {
          await powerSync.connect(connector);
        }
      } else {
        await powerSync.disconnectAndClear();
      }
    });

  } catch (error) {
    console.error("Error setting up PowerSync:", error);
  }
};
