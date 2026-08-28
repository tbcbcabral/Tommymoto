import { PowerSyncBackendConnector, AbstractPowerSyncDatabase, UpdateType } from "@powersync/common";
import { supabase } from "../supabase";

export const createSupabaseConnector = (): PowerSyncBackendConnector => ({
  fetchCredentials: async () => {
    alert("fetchCredentials called!");
    // Get the active session from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      alert("No active session found in fetchCredentials!");
      throw new Error('No active Supabase session found');
    }

    return {
      endpoint: 'https://6a7deeca53f73afec8a95107.powersync.journeyapps.com',
      token: session.access_token
    };
  },

  uploadData: async (database: AbstractPowerSyncDatabase) => {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    try {
      for (const op of transaction.crud) {
        const table = op.table;
        const record = { ...op.opData, id: op.id };
        
        switch (op.op) {
          case UpdateType.PUT:
            const { error: putErr } = await supabase.from(table).upsert(record);
            if (putErr) throw putErr;
            break;
            
          case UpdateType.PATCH:
            const { error: patchErr } = await supabase.from(table).update(op.opData!).eq('id', op.id);
            if (patchErr) throw patchErr;
            break;
            
          case UpdateType.DELETE:
            const { error: delErr } = await supabase.from(table).delete().eq('id', op.id);
            if (delErr) throw delErr;
            break;
        }
      }

      await transaction.complete();
    } catch (e: any) {
      console.error('Error uploading to Supabase:', e.message);
      // We do not complete the transaction here so it can retry later
    }
  }
});
