import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = 'https://mubjklmroxoooywwjkel.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KWpP2f43FRCQsoGN6LFHAQ_Lg5X_21v';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ALLOWED_BRANDS = ['CEPSA', 'BP', 'Galp', 'Auchan', 'Repsol'];

const guessBrand = (raw: string): string => {
  if (!raw) return '';
  const lower = raw.toLowerCase();
  
  if (lower.includes('cepsa')) return 'CEPSA';
  if (lower.includes('bp')) return 'BP';
  if (lower.includes('galp')) return 'Galp';
  if (lower.includes('auchan') || lower.includes('jumbo')) return 'Auchan';
  if (lower.includes('repsol')) return 'Repsol';
  
  // Return empty string if we can't guess it
  return '';
};

const run = async () => {
  console.log("Fetching all refueling events...");
  const { data: events, error } = await supabase.from('refueling_events').select('id, petrol_station_brand');
  
  if (error) {
    console.error("Error fetching:", error);
    process.exit(1);
  }

  if (!events) {
    console.log("No events found.");
    return;
  }

  let updatedCount = 0;

  console.log(`Found ${events.length} events. Normalizing brands...`);
  
  for (const event of events) {
    const currentBrand = event.petrol_station_brand || '';
    const newBrand = guessBrand(currentBrand);
    
    // Only update if it actually changed to avoid unnecessary API calls
    if (currentBrand !== newBrand) {
      const { error: updateError } = await supabase
        .from('refueling_events')
        .update({ petrol_station_brand: newBrand })
        .eq('id', event.id);
        
      if (updateError) {
        console.error(`Error updating ID ${event.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`\n✅ Done! Updated ${updatedCount} events with normalized brands.`);
};

run().catch(console.error);
