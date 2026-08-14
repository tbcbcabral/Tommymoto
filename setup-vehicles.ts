import { addVehicle, getVehicles } from './src/db/queries';

const run = async () => {
  console.log("Setting up vehicles...");
  
  // Create Honda (Vehicle ID 1)
  const hondaId = await addVehicle({
    make: 'Honda',
    model: '',
    alias: 'Honda',
    year: 2016,
    license_plate: '',
    default_fuel_type: 'Petrol',
    profile_photo_uri: '',
    is_default: 0
  });
  console.log(`Created Honda with ID: ${hondaId}`);

  // Create Transalp (Vehicle ID 2)
  const transalpId = await addVehicle({
    make: 'Honda',
    model: 'Transalp',
    alias: 'Transalp',
    year: 2019,
    license_plate: '',
    default_fuel_type: 'Petrol',
    profile_photo_uri: '',
    is_default: 1
  });
  console.log(`Created Transalp with ID: ${transalpId}`);

  console.log("Done! You can now run the import scripts.");
};

run().catch(console.error);
