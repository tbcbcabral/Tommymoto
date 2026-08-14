import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = 'https://mubjklmroxoooywwjkel.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KWpP2f43FRCQsoGN6LFHAQ_Lg5X_21v';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("Usage: npx tsx import-drivvo.ts <path-to-csv> <vehicle-id>");
  process.exit(1);
}

const filePath = args[0];
const vehicleId = parseInt(args[1], 10);

if (isNaN(vehicleId)) {
  console.error("Vehicle ID must be a number");
  process.exit(1);
}

const parseFloatSafe = (val: string) => {
  if (!val) return 0;
  // Drivvo sometimes exports numbers with dots or commas depending on locale, although provided CSV uses dot
  return parseFloat(val.replace(',', '.')) || 0;
};

const run = async () => {
  console.log(`\nImporting ${filePath} to Vehicle ID: ${vehicleId}...`);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Split content by sections
  const sections = content.split('##').filter(s => s.trim().length > 0);

  for (const section of sections) {
    if (section.startsWith('Refuelling')) {
      console.log("\nParsing Refuelling...");
      const lines = section.split('\n').slice(1).join('\n').trim(); // Skip the 'Refuelling' title line
      if (!lines) continue;

      const linesReplaced = lines.replace(/"Filled tank completely" 2/g, '"Filled tank completely 2"').replace(/"Filled tank completely" 3/g, '"Filled tank completely 3"');

      let linesArray = linesReplaced.split('\n');
      let headerRow = linesArray[0];
      headerRow = headerRow.replace(/"Price \/ L"/, '"Price1"').replace(/"Price \/ L"/, '"Price2"').replace(/"Price \/ L"/, '"Price3"');
      headerRow = headerRow.replace(/"Total cost"/, '"Cost1"').replace(/"Total cost"/, '"Cost2"').replace(/"Total cost"/, '"Cost3"');
      headerRow = headerRow.replace(/"Volume"/, '"Volume1"').replace(/"Volume"/, '"Volume2"').replace(/"Volume"/, '"Volume3"');
      linesArray[0] = headerRow;
      const finalLines = linesArray.join('\n');

      const records = parse(finalLines, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true
      });

      for (const row of (records as any[])) {
        if (!row['Odometer (km)'] || !row['Date']) continue;
        
        let dateVal = row['Date'];
        if (dateVal.includes(' ')) {
          dateVal = dateVal.split(' ')[0]; // Extract YYYY-MM-DD
        }

        const payload = {
          vehicle_id: vehicleId,
          date: dateVal,
          odometer: parseInt(row['Odometer (km)'].replace('.0', ''), 10),
          liters: parseFloatSafe(row['Volume1']),
          fuel_type: row['Fuel'] === 'Gasoline' ? 'Petrol' : (row['Fuel'] || 'Unknown'),
          petrol_station_brand: row['Gas station'] || '',
          total_price: parseFloatSafe(row['Cost1']),
          is_full_tank: row['Filled tank completely'] === 'Yes' ? true : false,
        };

        const { error } = await supabase.from('refueling_events').insert([payload]);
        if (error) {
          console.error("Failed to insert refuel:", row['Date'], error.message);
        }
      }
      console.log(`✅ Inserted ${records.length} refuel logs.`);
    }

    if (section.startsWith('Service')) {
      console.log("\nParsing Service...");
      const lines = section.split('\n').slice(1).join('\n').trim();
      if (!lines) continue;

      const linesReplaced = lines.replace(/"Filled tank completely" 2/g, '"Filled tank completely 2"').replace(/"Filled tank completely" 3/g, '"Filled tank completely 3"');

      const records = parse(linesReplaced, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true
      });

      // Group service items by date + odometer + garage
      const eventsMap: Record<string, any> = {};

      for (const row of (records as any[])) {
        if (!row['Odometer (km)'] || !row['Date']) continue;

        let dateVal = row['Date'];
        if (dateVal.includes(' ')) {
          dateVal = dateVal.split(' ')[0]; 
        }

        const odometer = parseInt(row['Odometer (km)'].replace('.0', ''), 10);
        const garage = row['Local service'] || '';
        const key = `${dateVal}_${odometer}_${garage}`;

        if (!eventsMap[key]) {
          eventsMap[key] = {
            vehicle_id: vehicleId,
            date: dateVal,
            odometer: odometer,
            garage: garage,
            receipt_image_uri: '',
            items: []
          };
        }

        eventsMap[key].items.push({
          service_type: row['Type of service'] || 'General Service',
          price: parseFloatSafe(row['Total cost']),
        });
      }

      const groupedEvents = Object.values(eventsMap);
      
      for (const event of groupedEvents) {
        const { items, ...eventPayload } = event;
        
        const { data, error } = await supabase
          .from('maintenance_events')
          .insert([eventPayload])
          .select('id')
          .single();

        if (error) {
          console.error("Failed to insert maintenance:", eventPayload.date, error.message);
          continue;
        }

        if (items && items.length > 0) {
          const serviceItemsToInsert = items.map((i: any) => ({
            maintenance_event_id: data.id,
            service_type: i.service_type,
            price: i.price
          }));
          const { error: itemsError } = await supabase.from('service_items').insert(serviceItemsToInsert);
          if (itemsError) {
             console.error("Failed to insert service items for:", data.id, itemsError.message);
          }
        }
      }
      
      console.log(`✅ Inserted ${groupedEvents.length} maintenance events containing ${records.length} total items.`);
    }
  }

  console.log("\n🎉 Import complete!");
};

run().catch(console.error);
