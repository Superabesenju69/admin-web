require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('restaurant_settings').select('*');
  console.log('Settings rows:', data?.length);
  if (data?.length === 0) {
    console.log('Inserting default row...');
    const res = await supabase.from('restaurant_settings').insert([{ enable_table_service: false, theme_color: 'teal', theme_mode: 'light' }]);
    console.log('Insert result:', res);
  } else {
    console.log('Row exists:', data[0]);
  }
}
run();
