import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ws from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});

async function seedEmployeeRoles() {
  console.log('Seeding employee role accounts...');
  
  const employees = [
    {
      username: 'cajero',
      password: '1234',
      pin: '1111',
      nombre: 'Juan',
      apellido: 'Cajero',
      role: 'cajero',
      active: true,
    },
    {
      username: 'mesero',
      password: '1234',
      pin: '2222',
      nombre: 'Maria',
      apellido: 'Mesero',
      role: 'mesero',
      active: true,
    },
    {
      username: 'cocinero',
      password: '1234',
      pin: '3333',
      nombre: 'Pedro',
      apellido: 'Cocinero',
      role: 'cocinero',
      active: true,
    },
    {
      username: 'estacion',
      password: '1234',
      pin: '8888',
      nombre: 'Estacion',
      apellido: 'KDS',
      role: 'estacion',
      active: true,
    }
  ];

  for (const emp of employees) {
    console.log(`Seeding user ${emp.username} (${emp.role})...`);
    
    // Check if user exists by username
    const { data: existing, error: checkError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('username', emp.username)
      .maybeSingle();

    if (checkError) {
      console.error(`Error checking ${emp.username}:`, checkError.message);
      continue;
    }

    if (existing) {
      console.log(`User ${emp.username} already exists. Updating role and PIN...`);
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ role: emp.role, pin: emp.pin, active: true })
        .eq('id', existing.id);
        
      if (updateError) {
        console.error(`Error updating ${emp.username}:`, updateError.message);
      } else {
        console.log(`✅ ${emp.username} updated successfully!`);
      }
    } else {
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert([emp]);
        
      if (insertError) {
        console.error(`Error inserting ${emp.username}:`, insertError.message);
      } else {
        console.log(`✅ ${emp.username} created successfully!`);
      }
    }
  }
  
  console.log('\nSeed process complete!');
  console.log('Summary of Seeded Credentials:');
  console.log('1. Cajero   - Username: cajero   / PIN: 1111');
  console.log('2. Mesero   - Username: mesero   / PIN: 2222');
  console.log('3. Cocinero - Username: cocinero / PIN: 3333');
  console.log('4. Estacion - Username: estacion / PIN: 8888');
}

seedEmployeeRoles();
