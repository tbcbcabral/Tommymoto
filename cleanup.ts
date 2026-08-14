import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mubjklmroxoooywwjkel.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KWpP2f43FRCQsoGN6LFHAQ_Lg5X_21v';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const wipe = async () => {
  console.log("Wiping logs for vehicle 2 and 3...");
  
  // Refuelling
  await supabase.from('refueling_events').delete().in('vehicle_id', [2, 3]);
  
  // Maintenance (this will cascade or we delete service_items first but Supabase usually cascades or we can just fetch and delete)
  const { data: events } = await supabase.from('maintenance_events').select('id').in('vehicle_id', [2, 3]);
  if (events && events.length > 0) {
    const ids = events.map(e => e.id);
    await supabase.from('service_items').delete().in('maintenance_event_id', ids);
    await supabase.from('maintenance_events').delete().in('id', ids);
  }

  console.log("Wiped! Now re-importing...");
};

wipe().catch(console.error);
