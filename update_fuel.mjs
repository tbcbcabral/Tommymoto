import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mubjklmroxoooywwjkel.supabase.co';
const supabaseAnonKey = 'sb_publishable_KWpP2f43FRCQsoGN6LFHAQ_Lg5X_21v';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Logging in...');
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'tbcbcabral@hotmail.com',
    password: 'zR1^e@#t5x9HjD'
  });
  
  if (authErr) {
    console.error('Auth error:', authErr);
    process.exit(1);
  }

  console.log('Updating refueling events...');
  
  // Update where fuel_type is not Petrol
  const { data, error } = await supabase
    .from('refueling_events')
    .update({ fuel_type: 'Petrol' })
    .neq('fuel_type', 'Petrol');
    
  if (error) {
    console.error('Update error:', error);
    process.exit(1);
  }

  // Also update where fuel_type is null
  const { data: data2, error: error2 } = await supabase
    .from('refueling_events')
    .update({ fuel_type: 'Petrol' })
    .is('fuel_type', null);
    
  if (error2) {
    console.error('Update error 2:', error2);
    process.exit(1);
  }

  console.log('Successfully updated fuel types!');
}

run();
