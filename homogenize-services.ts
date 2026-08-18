import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mubjklmroxoooywwjkel.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KWpP2f43FRCQsoGN6LFHAQ_Lg5X_21v';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const normalizeCase = (str: string) => {
  if (!str) return str;
  const trimmed = str.trim();
  if (trimmed.length === 0) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const run = async () => {
  console.log("Logging in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'tbcbcabral@hotmail.com',
    password: 'zR1^e@#t5x9HjD',
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }
  
  console.log("Logged in. User ID:", authData.user.id);
  
  console.log("Homogenizing service_items...");
  const { data: items, error: itemsError } = await supabase.from('service_items').select('id, service_type');
  
  if (itemsError) {
    console.error("Error fetching service_items:", itemsError);
    return;
  }

  let itemsUpdated = 0;
  for (const item of items || []) {
    const original = item.service_type || '';
    const normalized = normalizeCase(original);
    
    if (original !== normalized) {
      const { error: updateError } = await supabase
        .from('service_items')
        .update({ service_type: normalized })
        .eq('id', item.id);
        
      if (updateError) {
        console.error(`Error updating service_item ID ${item.id}:`, updateError);
      } else {
        console.log(`[service_items] "${original}" -> "${normalized}"`);
        itemsUpdated++;
      }
    }
  }

  console.log(`\nHomogenizing reminders...`);
  const { data: reminders, error: remindersError } = await supabase.from('reminders').select('id, service_type');
  
  if (remindersError) {
    console.error("Error fetching reminders:", remindersError);
    return;
  }

  let remindersUpdated = 0;
  for (const reminder of reminders || []) {
    const original = reminder.service_type || '';
    const normalized = normalizeCase(original);
    
    if (original !== normalized) {
      const { error: updateError } = await supabase
        .from('reminders')
        .update({ service_type: normalized })
        .eq('id', reminder.id);
        
      if (updateError) {
        console.error(`Error updating reminder ID ${reminder.id}:`, updateError);
      } else {
        console.log(`[reminders] "${original}" -> "${normalized}"`);
        remindersUpdated++;
      }
    }
  }

  console.log(`\n✅ Done! Updated ${itemsUpdated} service_items and ${remindersUpdated} reminders.`);
};

run().catch(console.error);
