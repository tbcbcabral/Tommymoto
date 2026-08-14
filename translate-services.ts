import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mubjklmroxoooywwjkel.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KWpP2f43FRCQsoGN6LFHAQ_Lg5X_21v';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const translationMap: Record<string, string> = {
  "Kit de transmissão": "Transmission kit",
  "Câmara de ar": "Air chamber",
  "Troca de óleo": "Oil change",
  "Filtro de óleo": "Oil filter change",
  "Bateria": "Battery replacement",
  "Pastilha de freio": "Brake pad change",
  "Pastilha de travão": "Brake pad change",
  "Pastilhas de travão": "Brake pad change",
  "Pastilhas de travão (frente)": "Brake pad change (front)",
  "Pastilhas de travão (trás)": "Brake pad change (back)",
  "Líquido de refrigeração": "Cooling liquid",
  "Vela": "Spark plugs replacement",
  "Velas": "Spark plugs replacement",
  "Pneu": "Tire",
  "Pneu (frente)": "Tire (front)",
  "Pneu (trás)": "Tire (back)",
  "Pressão dos pneus": "Tire pressure",
  "Farol": "Headlight",
  "Embreagem": "Clutch",
  "Embraiagem": "Clutch",
  "Corrente": "Chain lubrication",
  "Ajuste da corrente": "Chain tension adjustment",
  "Mão de obra": "Labor",
  "Retificador": "Rectifier replacement",
  "Caixa de direção": "Steering head bearings replacement",
  "Revisão geral": "Labor",
  "Geral": "Labor",
};

const run = async () => {
  console.log("Fetching all service items...");
  const { data: items, error } = await supabase.from('service_items').select('id, service_type');
  
  if (error) {
    console.error("Error fetching:", error);
    process.exit(1);
  }

  if (!items) {
    console.log("No items found.");
    return;
  }

  let updatedCount = 0;
  console.log(`Found ${items.length} service items. Normalizing...`);
  
  for (const item of items) {
    let currentType = item.service_type || '';
    let newType = currentType;
    
    // Exact match lookup
    if (translationMap[currentType]) {
      newType = translationMap[currentType];
    } else {
      // Partial matching for simple cases
      for (const [pt, en] of Object.entries(translationMap)) {
        if (currentType.toLowerCase() === pt.toLowerCase()) {
          newType = en;
          break;
        }
      }
    }
    
    if (currentType !== newType) {
      const { error: updateError } = await supabase
        .from('service_items')
        .update({ service_type: newType })
        .eq('id', item.id);
        
      if (updateError) {
        console.error(`Error updating ID ${item.id}:`, updateError);
      } else {
        console.log(`Translated "${currentType}" -> "${newType}"`);
        updatedCount++;
      }
    }
  }

  console.log(`\n✅ Done! Translated ${updatedCount} service items to English.`);
};

run().catch(console.error);
